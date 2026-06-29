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

  const entries = await prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } })

  const entryMap: Record<string, number> = {}
  for (const e of entries) {
    entryMap[`${e.accountCode}-${e.month}`] = parseFloat(e.grossAmount.toString())
  }

  const rate = client.taxRate
  const tax = (gross: number) => gross * rate / (1 + rate)
  const net = (gross: number) => gross - tax(gross)

  function sumAccountRows(rows: typeof REVENUE_ROWS, month?: number): number {
    let total = 0
    for (const r of rows) {
      if (r.type !== "ACCOUNT" || !r.code) continue
      if (month !== undefined) {
        total += net(entryMap[`${r.code}-${month}`] ?? 0)
      } else {
        for (let m = 1; m <= 12; m++) {
          total += net(entryMap[`${r.code}-${m}`] ?? 0)
        }
      }
    }
    return total
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const revRows = REVENUE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code)
  const cogsRows = COGS_ROWS.filter((r) => r.type === "ACCOUNT" && r.code)
  const expRows = EXPENSE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code)

  // Monthly totals
  const monthlyRevenue = MONTHS.map((_, mi) => sumAccountRows(REVENUE_ROWS, mi + 1))
  const monthlyCOGS = MONTHS.map((_, mi) => sumAccountRows(COGS_ROWS, mi + 1))
  const monthlyGrossProfit = monthlyRevenue.map((r, i) => r - monthlyCOGS[i])
  const monthlyExpenses = MONTHS.map((_, mi) => sumAccountRows(EXPENSE_ROWS, mi + 1))
  const monthlyNetIncome = monthlyGrossProfit.map((gp, i) => gp - monthlyExpenses[i])

  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0)
  const totalCOGS = monthlyCOGS.reduce((a, b) => a + b, 0)
  const totalGrossProfit = totalRevenue - totalCOGS
  const totalExpenses = monthlyExpenses.reduce((a, b) => a + b, 0)
  const totalNetIncome = totalGrossProfit - totalExpenses

  return (
    <div className="overflow-x-auto">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-900">Profit & Loss — FY {fiscalYear.year}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Net of tax (GST/HST excluded). Read-only — edit in Monthly Entry.</p>
      </div>

      <table className="w-full text-xs border-collapse min-w-[900px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="text-left font-semibold text-gray-700 px-4 py-3 w-52 border-b border-gray-200">Account</th>
            {MONTHS.map((m) => (
              <th key={m} className="text-right font-semibold text-gray-700 px-2 py-3 border-b border-gray-200 min-w-[72px]">{m}</th>
            ))}
            <th className="text-right font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {/* REVENUE */}
          <SectionHeader label="REVENUE" colSpan={14} />
          {revRows.map((row) => {
            const monthNets = MONTHS.map((_, mi) => net(entryMap[`${row.code}-${mi + 1}`] ?? 0))
            const total = monthNets.reduce((a, b) => a + b, 0)
            return (
              <DataRow key={row.code} code={row.code!} label={row.label} monthValues={monthNets} total={total} />
            )
          })}
          <TotalRow label="TOTAL REVENUE" monthValues={monthlyRevenue} total={totalRevenue} bold />

          {/* COGS */}
          <SectionHeader label="COST OF GOODS SOLD" colSpan={14} />
          {cogsRows.map((row) => {
            const monthNets = MONTHS.map((_, mi) => net(entryMap[`${row.code}-${mi + 1}`] ?? 0))
            const total = monthNets.reduce((a, b) => a + b, 0)
            return (
              <DataRow key={row.code} code={row.code!} label={row.label} monthValues={monthNets} total={total} />
            )
          })}
          <TotalRow label="TOTAL COGS" monthValues={monthlyCOGS} total={totalCOGS} />
          <TotalRow label="GROSS PROFIT" monthValues={monthlyGrossProfit} total={totalGrossProfit} bold highlight />

          {/* EXPENSES */}
          <SectionHeader label="OPERATING EXPENSES" colSpan={14} />
          {expRows.map((row) => {
            const monthNets = MONTHS.map((_, mi) => net(entryMap[`${row.code}-${mi + 1}`] ?? 0))
            const total = monthNets.reduce((a, b) => a + b, 0)
            return (
              <DataRow key={row.code} code={row.code!} label={row.label} monthValues={monthNets} total={total} />
            )
          })}
          <TotalRow label="TOTAL EXPENSES" monthValues={monthlyExpenses} total={totalExpenses} />

          {/* NET INCOME */}
          <TotalRow
            label="NET INCOME / (LOSS)"
            monthValues={monthlyNetIncome}
            total={totalNetIncome}
            bold
            highlight
          />
        </tbody>
      </table>
    </div>
  )
}

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={colSpan} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200">
        {label}
      </td>
    </tr>
  )
}

function DataRow({ code, label, monthValues, total }: { code: string; label: string; monthValues: number[]; total: number }) {
  const fmt = (n: number) => n !== 0 ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""
  return (
    <tr className="border-b border-gray-100 hover:bg-blue-50/20">
      <td className="px-4 py-1.5 text-gray-700">
        <span className="text-gray-400 mr-1.5">{code}</span>{label}
      </td>
      {monthValues.map((v, i) => (
        <td key={i} className="px-2 py-1.5 text-right text-gray-800 tabular-nums">{fmt(v)}</td>
      ))}
      <td className="px-4 py-1.5 text-right text-gray-900 font-medium tabular-nums">{fmt(total)}</td>
    </tr>
  )
}

function TotalRow({ label, monthValues, total, bold, highlight }: {
  label: string; monthValues: number[]; total: number; bold?: boolean; highlight?: boolean
}) {
  const fmt = (n: number) => n !== 0 ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""
  const colorClass = total < 0 ? "text-red-700" : "text-gray-900"
  return (
    <tr className={`${highlight ? "bg-blue-50" : "bg-gray-100"} border-t border-gray-300`}>
      <td className={`px-4 py-2 ${bold ? "font-bold uppercase tracking-wide" : "font-semibold"} text-xs text-gray-800`}>{label}</td>
      {monthValues.map((v, i) => (
        <td key={i} className={`px-2 py-2 text-right tabular-nums text-xs ${v < 0 ? "text-red-700" : "text-gray-800"} ${bold ? "font-semibold" : ""}`}>
          {fmt(v)}
        </td>
      ))}
      <td className={`px-4 py-2 text-right tabular-nums text-xs ${colorClass} ${bold ? "font-bold" : "font-semibold"}`}>{fmt(total)}</td>
    </tr>
  )
}
