import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import BalanceSheetClient from "./BalanceSheetClient"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS } from "@/lib/accounts"

export default async function BalanceSheetPage({
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

  const [monthlyEntries, bsEntries, taxCodes, accountConfigs, customAccounts] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.balanceSheetEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.taxCode.findMany({ where: { clientId } }),
    prisma.clientAccountConfig.findMany({ where: { clientId } }),
    prisma.clientCustomAccount.findMany({ where: { clientId, isActive: true } }),
  ])

  const entryMap: Record<string, number> = {}
  for (const e of monthlyEntries) entryMap[`${e.accountCode}-${e.month}`] = parseFloat(e.grossAmount.toString())

  const hiddenSet = new Set(accountConfigs.filter((c) => c.isHidden).map((c) => c.accountCode))
  const taxCodeById = new Map(taxCodes.map((t) => [t.id, t]))
  const acctTaxMap = new Map(accountConfigs.filter((c) => c.taxCodeId).map((c) => [c.accountCode, c.taxCodeId!]))
  const defaultTaxCode = taxCodes.find((t) => t.isDefault)
  const fallbackRate = defaultTaxCode?.rate ?? client.taxRate

  function getRate(code: string) {
    const tcId = acctTaxMap.get(code)
    return tcId ? (taxCodeById.get(tcId)?.rate ?? fallbackRate) : fallbackRate
  }

  // Net income from P&L
  const allIncomeCodes = [
    ...REVENUE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code!)),
    ...COGS_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code!)),
    ...EXPENSE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code!)),
    ...customAccounts.filter((c) => ["REVENUE","COGS","EXPENSE"].includes(c.section)),
  ]
  let totalRevenue = 0, totalCOGS = 0, totalExpenses = 0
  for (const r of allIncomeCodes) {
    const code = "code" in r ? r.code! : (r as any).code
    let rowTotal = 0
    const rate = getRate(code)
    for (let m = 1; m <= 12; m++) {
      const gross = entryMap[`${code}-${m}`] ?? 0
      rowTotal += rate > 0 ? gross / (1 + rate) : gross
    }
    const section = "section" in r ? (r as any).section : (
      REVENUE_ROWS.some((x) => x.code === code) ? "REVENUE" :
      COGS_ROWS.some((x) => x.code === code) ? "COGS" : "EXPENSE"
    )
    if (section === "REVENUE") totalRevenue += rowTotal
    else if (section === "COGS") totalCOGS += rowTotal
    else totalExpenses += rowTotal
  }
  const netIncome = totalRevenue - totalCOGS - totalExpenses

  // GST payable from revenue and expense accounts using per-account rates
  const taxableRevCodes = [
    ...REVENUE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.taxable && !hiddenSet.has(r.code!)).map((r) => r.code!),
    ...customAccounts.filter((c) => c.section === "REVENUE").map((c) => c.code),
  ]
  const itcExpCodes = [
    ...EXPENSE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.itcEligible && !hiddenSet.has(r.code!)).map((r) => r.code!),
    ...customAccounts.filter((c) => c.section === "EXPENSE").map((c) => c.code),
  ]
  let gstCollected = 0, gstITC = 0
  for (const code of taxableRevCodes) {
    const r = getRate(code)
    for (let m = 1; m <= 12; m++) gstCollected += (entryMap[`${code}-${m}`] ?? 0) * r / (1 + r)
  }
  for (const code of itcExpCodes) {
    const r = getRate(code)
    for (let m = 1; m <= 12; m++) gstITC += (entryMap[`${code}-${m}`] ?? 0) * r / (1 + r)
  }
  const gstPayable = gstCollected - gstITC

  // Clients are read-only; staff can edit opening balances
  const isReadOnly = profile.role === "CLIENT"

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-900">Balance Sheet — FY {fiscalYear.year}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Opening balances entered by staff. GST Payable and Net Income are auto-calculated.
          {isReadOnly && " (Read-only)"}
        </p>
      </div>
      <BalanceSheetClient
        clientId={clientId}
        fiscalYearId={fiscalYear.id}
        entries={bsEntries.map((e) => ({ accountCode: e.accountCode, amount: e.amount.toString(), isOpening: e.isOpening }))}
        netIncome={netIncome}
        gstPayable={gstPayable}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
