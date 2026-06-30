"use client"

import { MONTHS } from "@/lib/accounts"

interface TaxCodeRow { id: string; name: string; rate: number; gross: number; tax: number }
interface Quarter { label: string; months: number[] }

interface Props {
  fiscalYear: number
  freq: string
  monthlyCollected: number[]
  monthlyITC: number[]
  monthlyNet: number[]
  totalCollected: number
  totalITC: number
  totalNet: number
  quarters: Quarter[]
  taxCodeSummary: TaxCodeRow[]
}

const fmt = (n: number) => n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function GSTTrackerClient({
  fiscalYear, freq, monthlyCollected, monthlyITC, monthlyNet,
  totalCollected, totalITC, totalNet, quarters, taxCodeSummary,
}: Props) {

  function downloadCSV() {
    const rows: (string | number)[][] = []
    rows.push(["Month", "GST/HST Collected", "Input Tax Credits", "Net Remittance"])
    MONTHS.forEach((m, mi) => rows.push([m, monthlyCollected[mi], monthlyITC[mi], monthlyNet[mi]]))
    rows.push(["Total", totalCollected, totalITC, totalNet])
    rows.push([])
    rows.push([`Filing Summary — ${freq}`])
    rows.push(["Period", "Collected", "ITCs", "Net Owing"])
    for (const q of quarters) {
      const qC = q.months.reduce((s, m) => s + monthlyCollected[m - 1], 0)
      const qI = q.months.reduce((s, m) => s + monthlyITC[m - 1], 0)
      rows.push([q.label, qC, qI, qC - qI])
    }
    if (taxCodeSummary.length > 0) {
      rows.push([])
      rows.push(["Tax Code", "Rate", "Gross Revenue", "Tax Collected"])
      taxCodeSummary.forEach((tc) => rows.push([tc.name, tc.rate, tc.gross, tc.tax]))
    }
    const csv = rows.map((r) => r.map((c) => {
      const s = String(c); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "gst-tracker.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 max-w-4xl space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">GST/HST Tracker — FY {fiscalYear}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Filing: {freq} · Tax rates per account assignment</p>
      </div>

      <div className="flex gap-2 no-print">
        <button onClick={downloadCSV} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors">Export CSV</button>
        <button onClick={() => window.print()} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors">Print / PDF</button>
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
