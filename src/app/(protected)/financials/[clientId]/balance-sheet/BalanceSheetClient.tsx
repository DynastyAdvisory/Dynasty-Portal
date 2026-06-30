"use client"

import { useTransition } from "react"
import { saveBalanceSheetEntry } from "@/app/actions/entries"
import { BALANCE_SHEET_ROWS } from "@/lib/accounts"

interface BSEntry {
  accountCode: string
  amount: string | number
  isOpening: boolean
}

interface Props {
  clientId: string
  fiscalYearId: string
  entries: BSEntry[]
  netIncome: number
  gstPayable: number
  isReadOnly: boolean
}

function fmt(n: number) {
  if (n === 0) return ""
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseInput(val: string): number {
  return parseFloat(val.replace(/,/g, "")) || 0
}

export default function BalanceSheetClient({ clientId, fiscalYearId, entries, netIncome, gstPayable, isReadOnly }: Props) {
  const [isPending, startTransition] = useTransition()

  function downloadCSV() {
    const rows: (string | number)[][] = [["Code", "Account", "Opening Balance", "Closing Balance"]]
    for (let idx = 0; idx < BALANCE_SHEET_ROWS.length; idx++) {
      const row = BALANCE_SHEET_ROWS[idx]
      if (row.type === "SECTION") { rows.push([row.label]); continue }
      if (row.type === "ACCOUNT") { rows.push([row.code!, row.label, openMap[row.code!] ?? 0, closeMap[row.code!] ?? 0]); continue }
      if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
        let startI = 0
        for (let j = idx - 1; j >= 0; j--) {
          const t = BALANCE_SHEET_ROWS[j].type
          if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION") { startI = j + 1; break }
        }
        const acc = BALANCE_SHEET_ROWS.slice(startI, idx).filter((r) => r.type === "ACCOUNT" && r.code)
        rows.push(["", row.label, acc.reduce((s, r) => s + (openMap[r.code!] ?? 0), 0), acc.reduce((s, r) => s + (closeMap[r.code!] ?? 0), 0)])
      }
    }
    const csv = rows.map((r) => r.map((c) => { const s = String(c); return s.includes(",") ? `"${s}"` : s }).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "balance-sheet.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const openMap: Record<string, number> = {}
  const closeMap: Record<string, number> = {}
  for (const e of entries) {
    const amount = typeof e.amount === "string" ? parseFloat(e.amount) : e.amount
    if (e.isOpening) openMap[e.accountCode] = amount
    else closeMap[e.accountCode] = amount
  }

  // Auto-linked values
  closeMap["2020"] = gstPayable  // GST Payable from GST tracker
  closeMap["3030"] = netIncome   // Current year net income from P&L

  function handleBlur(code: string, isOpening: boolean, e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInput(e.target.value)
    const prev = (isOpening ? openMap : closeMap)[code] ?? 0
    if (val === prev) return
    startTransition(async () => { await saveBalanceSheetEntry(clientId, fiscalYearId, code, val, isOpening) })
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 px-4 py-2 no-print">
        <button onClick={downloadCSV} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors">Export CSV</button>
        <button onClick={() => window.print()} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors">Print / PDF</button>
      </div>
      <table className="w-full text-xs border-collapse min-w-[600px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="text-left font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 w-64">Account</th>
            <th className="text-right font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 min-w-[130px]">Opening Balance</th>
            <th className="text-right font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 min-w-[130px]">Closing Balance</th>
          </tr>
        </thead>
        <tbody>
          {BALANCE_SHEET_ROWS.map((row, idx) => {
            if (row.type === "SECTION") {
              return (
                <tr key={idx} className="bg-gray-50">
                  <td colSpan={3} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                    {row.label}
                  </td>
                </tr>
              )
            }
            if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
              // Find account rows since last break
              let startIdx = 0
              for (let i = idx - 1; i >= 0; i--) {
                const t = BALANCE_SHEET_ROWS[i].type
                if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION") { startIdx = i + 1; break }
              }
              const accRows = BALANCE_SHEET_ROWS.slice(startIdx, idx).filter((r) => r.type === "ACCOUNT" && r.code)
              const openTotal = accRows.reduce((s, r) => s + (openMap[r.code!] ?? 0), 0)
              const closeTotal = accRows.reduce((s, r) => s + (closeMap[r.code!] ?? 0), 0)
              return (
                <tr key={idx} className={`${row.type === "TOTAL" ? "bg-gray-100 font-bold border-t-2 border-gray-400" : "bg-gray-50 font-semibold border-t border-gray-300"}`}>
                  <td className="px-4 py-2 text-xs text-gray-800 uppercase tracking-wide">{row.label}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-800">{fmt(openTotal)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-800">{fmt(closeTotal)}</td>
                </tr>
              )
            }

            const code = row.code!
            const openVal = openMap[code] ?? 0
            const closeVal = closeMap[code] ?? 0
            const isAutoLinked = row.isAutoLinked

            return (
              <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/20">
                <td className="px-4 py-1.5 text-gray-700">
                  <span className="text-gray-400 mr-1.5">{code}</span>
                  {row.label}
                  {row.note && <span className="text-gray-400 ml-1.5 italic">({row.note})</span>}
                </td>
                <td className="px-2 py-1">
                  {isReadOnly || isAutoLinked ? (
                    <div className="text-right text-xs text-gray-600 px-2">{fmt(openVal)}</div>
                  ) : (
                    <input
                      defaultValue={openVal !== 0 ? fmt(openVal) : ""}
                      onBlur={(e) => handleBlur(code, true, e)}
                      className="w-full text-right text-xs px-2 py-1 rounded bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  )}
                </td>
                <td className={`px-2 py-1 ${isAutoLinked ? "" : ""}`}>
                  {isReadOnly || isAutoLinked ? (
                    <div className={`text-right text-xs px-2 ${isAutoLinked ? "text-blue-600 font-medium" : "text-gray-600"}`}>
                      {fmt(closeVal)}
                      {isAutoLinked && <span className="ml-1 text-blue-400 text-[10px]">auto</span>}
                    </div>
                  ) : (
                    <input
                      defaultValue={closeVal !== 0 ? fmt(closeVal) : ""}
                      onBlur={(e) => handleBlur(code, false, e)}
                      className="w-full text-right text-xs px-2 py-1 rounded bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
