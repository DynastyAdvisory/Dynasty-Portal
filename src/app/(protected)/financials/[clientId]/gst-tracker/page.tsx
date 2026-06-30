import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { REVENUE_ROWS, EXPENSE_ROWS, MONTHS } from "@/lib/accounts"
import GSTTrackerClient from "./GSTTrackerClient"

export default async function GSTTrackerPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ fy?: string }>
}) {
  const { clientId } = await params
  const { fy } = await searchParams

  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) notFound()

  const fiscalYear = fy
    ? await prisma.fiscalYear.findUnique({ where: { id: fy } })
    : await prisma.fiscalYear.findFirst({ where: { clientId, status: "OPEN" }, orderBy: { year: "desc" } })
  if (!fiscalYear) notFound()

  const [entries, taxCodes, accountConfigs, customAccounts] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.taxCode.findMany({ where: { clientId } }),
    prisma.clientAccountConfig.findMany({ where: { clientId } }),
    prisma.clientCustomAccount.findMany({ where: { clientId, isActive: true } }),
  ])

  const entryMap: Record<string, number> = {}
  const entryTaxOverride = new Map<string, string>()
  for (const e of entries) {
    entryMap[`${e.accountCode}-${e.month}`] = parseFloat(e.grossAmount.toString())
    if (e.taxCodeId) entryTaxOverride.set(`${e.accountCode}-${e.month}`, e.taxCodeId)
  }

  const hiddenSet = new Set(accountConfigs.filter((c) => c.isHidden).map((c) => c.accountCode))
  const taxCodeById = new Map(taxCodes.map((t) => [t.id, t]))
  const acctTaxCodeMap = new Map(accountConfigs.filter((c) => c.taxCodeId).map((c) => [c.accountCode, c.taxCodeId!]))
  const defaultTaxCode = taxCodes.find((t) => t.isDefault)
  const fallbackRate = defaultTaxCode?.rate ?? client.taxRate

  function getRate(code: string, month?: number) {
    if (month !== undefined) {
      const cellOverride = entryTaxOverride.get(`${code}-${month}`)
      if (cellOverride) return taxCodeById.get(cellOverride)?.rate ?? fallbackRate
    }
    const tcId = acctTaxCodeMap.get(code)
    if (tcId) return taxCodeById.get(tcId)?.rate ?? fallbackRate
    return fallbackRate
  }

  function extractTax(gross: number, code: string, month: number) {
    const r = getRate(code, month)
    return r > 0 ? gross * r / (1 + r) : 0
  }

  // Taxable revenue: standard rows with taxable=true + custom revenue accounts
  const taxableRevCodes = [
    ...REVENUE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.taxable && !hiddenSet.has(r.code!)).map((r) => r.code!),
    ...customAccounts.filter((c) => c.section === "REVENUE").map((c) => c.code),
  ]

  // ITC eligible expense rows + custom expense accounts (assumed ITC eligible)
  const itcExpCodes = [
    ...EXPENSE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.itcEligible && !hiddenSet.has(r.code!)).map((r) => r.code!),
    ...customAccounts.filter((c) => c.section === "EXPENSE").map((c) => c.code),
  ]

  const monthlyCollected = MONTHS.map((_, mi) =>
    taxableRevCodes.reduce((s, code) => s + extractTax(entryMap[`${code}-${mi + 1}`] ?? 0, code, mi + 1), 0)
  )
  const monthlyITC = MONTHS.map((_, mi) =>
    itcExpCodes.reduce((s, code) => s + extractTax(entryMap[`${code}-${mi + 1}`] ?? 0, code, mi + 1), 0)
  )
  const monthlyNet = monthlyCollected.map((c, i) => c - monthlyITC[i])

  const totalCollected = monthlyCollected.reduce((a, b) => a + b, 0)
  const totalITC = monthlyITC.reduce((a, b) => a + b, 0)
  const totalNet = totalCollected - totalITC

  const freq = client.filingFreq
  let quarters: { label: string; months: number[] }[]
  if (freq === "Monthly") {
    quarters = MONTHS.map((m, i) => ({ label: m, months: [i + 1] }))
  } else if (freq === "Annual") {
    quarters = [{ label: "Annual", months: [1,2,3,4,5,6,7,8,9,10,11,12] }]
  } else {
    quarters = [
      { label: "Q1 (Jan–Mar)", months: [1, 2, 3] },
      { label: "Q2 (Apr–Jun)", months: [4, 5, 6] },
      { label: "Q3 (Jul–Sep)", months: [7, 8, 9] },
      { label: "Q4 (Oct–Dec)", months: [10, 11, 12] },
    ]
  }

  // Tax code breakdown for transparency
  const taxCodeSummary = taxCodes.map((tc) => {
    let gross = 0
    let tax = 0
    for (const code of taxableRevCodes) {
      for (let m = 1; m <= 12; m++) {
        const r = getRate(code, m)
        const g = entryMap[`${code}-${m}`] ?? 0
        const effectiveTcId = entryTaxOverride.get(`${code}-${m}`) ?? acctTaxCodeMap.get(code) ?? defaultTaxCode?.id
        if (effectiveTcId === tc.id) {
          gross += g
          tax += r > 0 ? g * r / (1 + r) : 0
        }
      }
    }
    return { ...tc, gross, tax }
  }).filter((t) => t.gross > 0)

  return (
    <GSTTrackerClient
      fiscalYear={fiscalYear.year}
      freq={freq}
      monthlyCollected={monthlyCollected}
      monthlyITC={monthlyITC}
      monthlyNet={monthlyNet}
      totalCollected={totalCollected}
      totalITC={totalITC}
      totalNet={totalNet}
      quarters={quarters}
      taxCodeSummary={taxCodeSummary}
    />
  )
}
