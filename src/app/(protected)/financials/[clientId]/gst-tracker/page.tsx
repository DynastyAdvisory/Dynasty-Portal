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

  const fmt = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
    <div className="p-4 max-w-4xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">GST/HST Tracker — FY {fiscalYear.year}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Filing: {freq} · Tax rates per account assignment
        </p>
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Month</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">GST/HST Collected</th>
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
                <td className={`px-4 py-2 text-right tabular-nums font-medium ${monthlyNet[mi] < 0 ? "text-green-700" : "text-gray-900"}`}>
                  {monthlyNet[mi] < 0 ? `(${fmt(Math.abs(monthlyNet[mi]))})` : fmt(monthlyNet[mi])}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-400">
              <td className="px-4 py-2.5 font-bold text-gray-800 uppercase tracking-wide text-xs">Total</td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">{fmt(totalCollected)}</td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-600">({fmt(totalITC)})</td>
              <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${totalNet < 0 ? "text-green-700" : "text-red-700"}`}>
                {totalNet < 0 ? `Refund: ${fmt(Math.abs(totalNet))}` : fmt(totalNet)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Filing period summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700">Filing Period Summary — {freq}</h3>
        </div>
        <table className="w-full text-xs">
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
              const qC = q.months.reduce((s, m) => s + monthlyCollected[m - 1], 0)
              const qI = q.months.reduce((s, m) => s + monthlyITC[m - 1], 0)
              const qN = qC - qI
              return (
                <tr key={q.label} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 font-medium">{q.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-800">{fmt(qC)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">({fmt(qI)})</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${qN < 0 ? "text-green-700" : "text-red-700"}`}>
                    {qN < 0 ? `Refund: ${fmt(Math.abs(qN))}` : fmt(qN)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="px-4 py-2.5 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
          Net GST/HST Payable flows automatically to account 2020 on the Balance Sheet.
        </p>
      </div>

      {/* Tax code breakdown */}
      {taxCodeSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700">By Tax Code</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Tax Code</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">Rate</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">Gross Revenue</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700">Tax Collected</th>
              </tr>
            </thead>
            <tbody>
              {taxCodeSummary.map((tc) => (
                <tr key={tc.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-800 font-medium">{tc.name}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{(tc.rate * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-800">{fmt(tc.gross)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-blue-700 font-medium">{fmt(tc.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
