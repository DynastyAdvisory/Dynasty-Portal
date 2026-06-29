import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { REVENUE_ROWS, EXPENSE_ROWS, MONTHS } from "@/lib/accounts"

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

  const entries = await prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } })

  const entryMap: Record<string, number> = {}
  for (const e of entries) {
    entryMap[`${e.accountCode}-${e.month}`] = parseFloat(e.grossAmount.toString())
  }

  const rate = client.taxRate
  const extractTax = (gross: number) => gross * rate / (1 + rate)

  // Build monthly GST collected (taxable revenue accounts)
  const taxableRevRows = REVENUE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.taxable)
  const itcExpRows = EXPENSE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.itcEligible)

  const monthlyCollected = MONTHS.map((_, mi) => {
    let sum = 0
    for (const r of taxableRevRows) {
      sum += extractTax(entryMap[`${r.code}-${mi + 1}`] ?? 0)
    }
    return sum
  })

  const monthlyITC = MONTHS.map((_, mi) => {
    let sum = 0
    for (const r of itcExpRows) {
      sum += extractTax(entryMap[`${r.code}-${mi + 1}`] ?? 0)
    }
    return sum
  })

  const monthlyNet = monthlyCollected.map((c, i) => c - monthlyITC[i])

  const totalCollected = monthlyCollected.reduce((a, b) => a + b, 0)
  const totalITC = monthlyITC.reduce((a, b) => a + b, 0)
  const totalNet = totalCollected - totalITC

  const fmt = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Determine filing quarters
  const freq = client.filingFreq
  let quarters: { label: string; months: number[] }[] = []
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

  return (
    <div className="p-4 max-w-4xl">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">GST/HST Tracker — FY {fiscalYear.year}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Tax rate: {(rate * 100).toFixed(0)}% ({client.taxType.replace("_", " ")}) · Filing: {freq}
        </p>
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Month</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">GST Collected</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Input Tax Credits</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Net Remittance</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, mi) => (
              <tr key={m} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700 font-medium">{m}</td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-800">{fmt(monthlyCollected[mi])}</td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-600">({fmt(monthlyITC[mi])})</td>
                <td className={`px-4 py-2 text-right tabular-nums font-medium ${monthlyNet[mi] >= 0 ? "text-gray-900" : "text-green-700"}`}>
                  {monthlyNet[mi] >= 0 ? fmt(monthlyNet[mi]) : `(${fmt(Math.abs(monthlyNet[mi]))})`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-400">
              <td className="px-4 py-2.5 font-bold text-gray-800 text-xs uppercase tracking-wide">Total</td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">{fmt(totalCollected)}</td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-600">({fmt(totalITC)})</td>
              <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${totalNet >= 0 ? "text-gray-900" : "text-green-700"}`}>
                {totalNet >= 0 ? fmt(totalNet) : `(${fmt(Math.abs(totalNet))})`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Filing period summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700">Filing Period Summary ({freq})</h3>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Period</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Collected</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-700">ITCs</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Net Owing</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q) => {
              const qCollected = q.months.reduce((s, m) => s + monthlyCollected[m - 1], 0)
              const qITC = q.months.reduce((s, m) => s + monthlyITC[m - 1], 0)
              const qNet = qCollected - qITC
              return (
                <tr key={q.label} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 font-medium">{q.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{fmt(qCollected)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">({fmt(qITC)})</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${qNet >= 0 ? "text-red-700" : "text-green-700"}`}>
                    {qNet >= 0 ? fmt(qNet) : `Refund: ${fmt(Math.abs(qNet))}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Net amount flows to GST/HST Payable (2020) on the Balance Sheet automatically.
          </p>
        </div>
      </div>

      {/* Revenue breakdown by taxable account */}
      <div className="mt-5 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700">Taxable Revenue — GST Collected Detail</h3>
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 font-semibold text-gray-700">Account</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-700">Gross Revenue</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-700">Tax ({(rate*100).toFixed(0)}%)</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-700">Net Revenue</th>
            </tr>
          </thead>
          <tbody>
            {taxableRevRows.map((r) => {
              let gross = 0
              for (let m = 1; m <= 12; m++) gross += entryMap[`${r.code}-${m}`] ?? 0
              if (gross === 0) return null
              const tax = extractTax(gross)
              return (
                <tr key={r.code} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-700">
                    <span className="text-gray-400 mr-1">{r.code}</span>{r.label}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-800">{fmt(gross)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-blue-700">{fmt(tax)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-900">{fmt(gross - tax)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
