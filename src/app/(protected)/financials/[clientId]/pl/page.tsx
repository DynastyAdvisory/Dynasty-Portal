import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS, MONTHS } from "@/lib/accounts"

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
  for (const e of entries) entryMap[`${e.accountCode}-${e.month}`] = parseFloat(e.grossAmount.toString())

  const hiddenSet = new Set(accountConfigs.filter((c) => c.isHidden).map((c) => c.accountCode))
  const taxCodeById = new Map(taxCodes.map((t) => [t.id, t]))
  const acctTaxCodeMap = new Map(accountConfigs.filter((c) => c.taxCodeId).map((c) => [c.accountCode, c.taxCodeId!]))
  const defaultTaxCode = taxCodes.find((t) => t.isDefault)
  const fallbackRate = defaultTaxCode?.rate ?? client.taxRate

  function getRate(code: string) {
    const tcId = acctTaxCodeMap.get(code)
    if (tcId) return taxCodeById.get(tcId)?.rate ?? fallbackRate
    return fallbackRate
  }

  function netOf(gross: number, code: string) {
    const r = getRate(code)
    return r > 0 ? gross / (1 + r) : gross
  }

  const fmt = (n: number) => n !== 0 ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""

  // Build rows with custom accounts injected
  function buildAccountRows(stdRows: typeof REVENUE_ROWS, sectionKey: string) {
    const custom = customAccounts.filter((c) => c.section === sectionKey)
    const rows = stdRows.filter((r) => r.type !== "ACCOUNT" || !r.code || !hiddenSet.has(r.code))
    const totalIdx = rows.findLastIndex((r) => r.type === "TOTAL")
    if (totalIdx > -1 && custom.length) {
      const customRows = custom.map((c) => ({ type: "ACCOUNT" as const, label: c.name, code: c.code }))
      rows.splice(totalIdx, 0, ...customRows)
    }
    return rows
  }

  function sumAccounts(rows: typeof REVENUE_ROWS, sectionKey: string, month?: number) {
    const custom = customAccounts.filter((c) => c.section === sectionKey)
    const allCodes = [
      ...rows.filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code)).map((r) => r.code!),
      ...custom.map((c) => c.code),
    ]
    let total = 0
    for (const code of allCodes) {
      if (month !== undefined) {
        total += netOf(entryMap[`${code}-${month}`] ?? 0, code)
      } else {
        for (let m = 1; m <= 12; m++) total += netOf(entryMap[`${code}-${m}`] ?? 0, code)
      }
    }
    return total
  }

  const monthlyRevenue = MONTHS.map((_, mi) => sumAccounts(REVENUE_ROWS, "REVENUE", mi + 1))
  const monthlyCOGS = MONTHS.map((_, mi) => sumAccounts(COGS_ROWS, "COGS", mi + 1))
  const monthlyGrossProfit = monthlyRevenue.map((r, i) => r - monthlyCOGS[i])
  const monthlyExpenses = MONTHS.map((_, mi) => sumAccounts(EXPENSE_ROWS, "EXPENSE", mi + 1))
  const monthlyNetIncome = monthlyGrossProfit.map((gp, i) => gp - monthlyExpenses[i])

  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0)
  const totalCOGS = monthlyCOGS.reduce((a, b) => a + b, 0)
  const totalGrossProfit = totalRevenue - totalCOGS
  const totalExpenses = monthlyExpenses.reduce((a, b) => a + b, 0)
  const totalNetIncome = totalGrossProfit - totalExpenses

  const revRows = buildAccountRows(REVENUE_ROWS, "REVENUE")
  const cogsRows = buildAccountRows(COGS_ROWS, "COGS")
  const expRows = buildAccountRows(EXPENSE_ROWS, "EXPENSE")

  return (
    <div className="overflow-x-auto">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-900">Profit & Loss — FY {fiscalYear.year}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Net of tax per account's assigned tax code. Read-only.</p>
      </div>
      <table className="w-full text-xs border-collapse min-w-[900px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="text-left font-semibold text-gray-700 px-4 py-3 w-60 border-b border-gray-200">Account</th>
            {MONTHS.map((m) => (
              <th key={m} className="text-right font-semibold text-gray-700 px-2 py-3 border-b border-gray-200 min-w-[68px]">{m}</th>
            ))}
            <th className="text-right font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody>
          <PLSection label="REVENUE" rows={revRows} entryMap={entryMap} hiddenSet={hiddenSet} netOf={netOf} monthTotals={monthlyRevenue} grandTotal={totalRevenue} bold />
          <PLSection label="COST OF GOODS SOLD" rows={cogsRows} entryMap={entryMap} hiddenSet={hiddenSet} netOf={netOf} monthTotals={monthlyCOGS} grandTotal={totalCOGS} />
          <TotalRow label="GROSS PROFIT" monthValues={monthlyGrossProfit} total={totalGrossProfit} bold highlight />
          <PLSection label="OPERATING EXPENSES" rows={expRows} entryMap={entryMap} hiddenSet={hiddenSet} netOf={netOf} monthTotals={monthlyExpenses} grandTotal={totalExpenses} />
          <TotalRow label="NET INCOME / (LOSS)" monthValues={monthlyNetIncome} total={totalNetIncome} bold highlight />
        </tbody>
      </table>
    </div>
  )
}

function PLSection({ label, rows, entryMap, hiddenSet, netOf, monthTotals, grandTotal, bold }: {
  label: string; rows: any[]; entryMap: Record<string, number>; hiddenSet: Set<string>
  netOf: (g: number, code: string) => number; monthTotals: number[]; grandTotal: number; bold?: boolean
}) {
  const fmt = (n: number) => n !== 0 ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""
  return (
    <>
      <tr className="bg-gray-50">
        <td colSpan={14} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200">{label}</td>
      </tr>
      {rows.map((row, idx) => {
        if (row.type === "SECTION") return null
        if (row.type === "SUBSECTION") return (
          <tr key={idx} className="bg-gray-50">
            <td colSpan={14} className="px-4 py-1.5 text-xs font-semibold text-gray-500 italic">{row.label}</td>
          </tr>
        )
        if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
          let startI = 0
          for (let j = idx - 1; j >= 0; j--) {
            const t = rows[j].type
            if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION" || t === "SUBSECTION") { startI = j + 1; break }
          }
          const accs = rows.slice(startI, idx).filter((r: any) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code))
          const mTotals = Array.from({ length: 12 }, (_, mi) => accs.reduce((s: number, r: any) => s + netOf(entryMap[`${r.code}-${mi + 1}`] ?? 0, r.code), 0))
          const gt = mTotals.reduce((a, b) => a + b, 0)
          const isBold = row.type === "TOTAL" && bold
          return (
            <tr key={idx} className={`${isBold ? "bg-gray-100 font-bold" : "bg-gray-50 font-semibold"} border-t border-gray-300`}>
              <td className="px-4 py-2 text-gray-800 text-xs uppercase tracking-wide">{row.label}</td>
              {mTotals.map((v, i) => <td key={i} className="px-2 py-2 text-right tabular-nums text-xs text-gray-800">{fmt(v)}</td>)}
              <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold text-gray-900">{fmt(gt)}</td>
            </tr>
          )
        }
        if (!row.code || hiddenSet.has(row.code)) return null
        const mVals = Array.from({ length: 12 }, (_, mi) => netOf(entryMap[`${row.code}-${mi + 1}`] ?? 0, row.code))
        const total = mVals.reduce((a, b) => a + b, 0)
        return (
          <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/20">
            <td className="px-4 py-1.5 text-gray-700">
              <span className="text-gray-400 mr-1.5">{row.code}</span>{row.label}
            </td>
            {mVals.map((v, i) => <td key={i} className="px-2 py-1.5 text-right text-gray-800 tabular-nums">{fmt(v)}</td>)}
            <td className="px-4 py-1.5 text-right text-gray-900 font-medium tabular-nums">{fmt(total)}</td>
          </tr>
        )
      })}
      <TotalRow label={`TOTAL ${label}`} monthValues={monthTotals} total={grandTotal} />
    </>
  )
}

function TotalRow({ label, monthValues, total, bold, highlight }: {
  label: string; monthValues: number[]; total: number; bold?: boolean; highlight?: boolean
}) {
  const fmt = (n: number) => n !== 0 ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""
  return (
    <tr className={`${highlight ? "bg-blue-50" : "bg-gray-100"} border-t-2 border-gray-400`}>
      <td className={`px-4 py-2.5 ${bold ? "font-bold uppercase tracking-wide" : "font-semibold"} text-xs text-gray-800`}>{label}</td>
      {monthValues.map((v, i) => (
        <td key={i} className={`px-2 py-2.5 text-right tabular-nums text-xs ${v < 0 ? "text-red-700" : "text-gray-800"} ${bold ? "font-bold" : "font-semibold"}`}>{fmt(v)}</td>
      ))}
      <td className={`px-4 py-2.5 text-right tabular-nums text-xs ${total < 0 ? "text-red-700" : "text-gray-900"} ${bold ? "font-bold" : "font-semibold"}`}>{fmt(total)}</td>
    </tr>
  )
}
