import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS, MONTHS } from "@/lib/accounts"
import PLClient, { type CalcRow, type SectionData } from "./PLClient"

export default async function PLPage({
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
    prisma.clientCustomAccount.findMany({ where: { clientId, isActive: true, section: { in: ["REVENUE", "COGS", "EXPENSE"] } } }),
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

  function netOf(gross: number, code: string, month?: number) {
    const r = getRate(code, month)
    return r > 0 ? gross / (1 + r) : gross
  }

  function buildSectionCalcRows(stdRows: typeof REVENUE_ROWS, sectionKey: string): CalcRow[] {
    const custom = customAccounts.filter((c) => c.section === sectionKey)
    const filtered = stdRows.filter((r) => r.type !== "ACCOUNT" || !r.code || !hiddenSet.has(r.code))
    // Insert custom accounts before TOTAL
    const totalIdx = filtered.map((r) => r.type).lastIndexOf("TOTAL")
    const rows = [...filtered]
    if (totalIdx > -1 && custom.length) {
      rows.splice(totalIdx, 0, ...custom.map((c) => ({ type: "ACCOUNT" as const, label: c.name, code: c.code })))
    }

    const calcRows: CalcRow[] = []
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]
      if (row.type === "SECTION") {
        calcRows.push({ type: "SECTION", label: row.label, monthVals: [], rowTotal: 0 })
        continue
      }
      if (row.type === "SUBSECTION") {
        calcRows.push({ type: "SUBSECTION", label: row.label, monthVals: [], rowTotal: 0 })
        continue
      }
      if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
        let startI = 0
        for (let j = idx - 1; j >= 0; j--) {
          const t = rows[j].type
          if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION" || t === "SUBSECTION") { startI = j + 1; break }
        }
        const accs = rows.slice(startI, idx).filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code!))
        const monthVals = Array.from({ length: 12 }, (_, mi) =>
          accs.reduce((s, r) => s + netOf(entryMap[`${r.code}-${mi + 1}`] ?? 0, r.code!, mi + 1), 0)
        )
        calcRows.push({ type: row.type, label: row.label, monthVals, rowTotal: monthVals.reduce((a, b) => a + b, 0) })
        continue
      }
      // ACCOUNT
      const code = row.code!
      const monthVals = Array.from({ length: 12 }, (_, mi) => netOf(entryMap[`${code}-${mi + 1}`] ?? 0, code, mi + 1))
      calcRows.push({ type: "ACCOUNT", label: row.label, code, monthVals, rowTotal: monthVals.reduce((a, b) => a + b, 0) })
    }
    return calcRows
  }

  function sectionTotals(calcRows: CalcRow[]) {
    const accs = calcRows.filter((r) => r.type === "ACCOUNT")
    const monthTotals = Array.from({ length: 12 }, (_, mi) => accs.reduce((s, r) => s + (r.monthVals[mi] ?? 0), 0))
    return { monthTotals, sectionTotal: monthTotals.reduce((a, b) => a + b, 0) }
  }

  const sectionDefs = [
    { key: "REVENUE", label: "Revenue", rows: REVENUE_ROWS },
    { key: "COGS", label: "Cost of Goods Sold", rows: COGS_ROWS },
    { key: "EXPENSE", label: "Operating Expenses", rows: EXPENSE_ROWS },
  ]

  const sections: SectionData[] = sectionDefs.map(({ key, label, rows }) => {
    const calcRows = buildSectionCalcRows(rows, key)
    const { monthTotals, sectionTotal } = sectionTotals(calcRows)
    return { key, label, rows: calcRows, monthTotals, sectionTotal }
  })

  const revTotals = sections[0].monthTotals
  const cogsTotals = sections[1].monthTotals
  const expTotals = sections[2].monthTotals
  const monthlyGrossProfit = revTotals.map((r, i) => r - cogsTotals[i])
  const monthlyNetIncome = monthlyGrossProfit.map((gp, i) => gp - expTotals[i])
  const totalGrossProfit = monthlyGrossProfit.reduce((a, b) => a + b, 0)
  const totalNetIncome = monthlyNetIncome.reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-900">Profit & Loss — FY {fiscalYear.year}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Net of tax per account's assigned tax code. Click section headers to collapse. Read-only.</p>
      </div>
      <PLClient
        sections={sections}
        monthlyGrossProfit={monthlyGrossProfit}
        monthlyNetIncome={monthlyNetIncome}
        totalGrossProfit={totalGrossProfit}
        totalNetIncome={totalNetIncome}
      />
    </div>
  )
}
