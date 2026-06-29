"use client"

import { useCallback, useOptimistic, useTransition } from "react"
import { saveMonthlyEntry, lockPeriod, unlockPeriod } from "@/app/actions/entries"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS, MONTHS, type AccountRow } from "@/lib/accounts"
import { Lock, Unlock } from "lucide-react"

interface Entry {
  accountCode: string
  month: number
  grossAmount: string | number
}

interface PeriodLock {
  month: number
  unlockedAt: Date | null
  lockedAt: Date
}

interface Props {
  clientId: string
  fiscalYearId: string
  taxRate: number
  entries: Entry[]
  locks: PeriodLock[]
  isAdmin: boolean
}

function isLocked(locks: PeriodLock[], month: number): boolean {
  const lock = locks.find((l) => l.month === month)
  return !!lock && !lock.unlockedAt
}

function formatNumber(val: string | number | undefined): string {
  if (!val || val === 0 || val === "0") return ""
  const num = typeof val === "string" ? parseFloat(val) : val
  if (isNaN(num) || num === 0) return ""
  return num.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseInput(val: string): number {
  return parseFloat(val.replace(/,/g, "")) || 0
}

export default function MonthlyEntryClient({ clientId, fiscalYearId, taxRate, entries, locks, isAdmin }: Props) {
  const entryMap: Record<string, number> = {}
  for (const e of entries) {
    entryMap[`${e.accountCode}-${e.month}`] = typeof e.grossAmount === "string" ? parseFloat(e.grossAmount) : e.grossAmount
  }

  const [isPending, startTransition] = useTransition()

  function handleBlur(accountCode: string, month: number, e: React.FocusEvent<HTMLInputElement>) {
    const raw = parseInput(e.target.value)
    const prev = entryMap[`${accountCode}-${month}`] ?? 0
    if (raw === prev) return
    startTransition(async () => {
      await saveMonthlyEntry(clientId, fiscalYearId, accountCode, month, raw)
    })
  }

  function handleLock(month: number) {
    startTransition(async () => {
      await lockPeriod(clientId, fiscalYearId, month)
    })
  }

  function handleUnlock(month: number) {
    const note = window.prompt("Reason for unlocking this period (required):") ?? ""
    if (!note.trim()) return
    startTransition(async () => {
      await unlockPeriod(clientId, fiscalYearId, month, note)
    })
  }

  const allRows = [...REVENUE_ROWS, ...COGS_ROWS, ...EXPENSE_ROWS]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[900px]">
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="text-left font-semibold text-gray-700 px-4 py-3 w-52 border-b border-gray-200">Account</th>
            {MONTHS.map((m, i) => {
              const locked = isLocked(locks, i + 1)
              return (
                <th key={m} className="text-center font-semibold text-gray-700 px-1.5 py-3 border-b border-gray-200 min-w-[80px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{m}</span>
                    {isAdmin && (
                      <button
                        onClick={() => locked ? handleUnlock(i + 1) : handleLock(i + 1)}
                        className={`p-0.5 rounded transition-colors ${locked ? "text-amber-500 hover:text-amber-700" : "text-gray-300 hover:text-gray-500"}`}
                        title={locked ? "Click to unlock" : "Lock period"}
                      >
                        {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    )}
                    {!isAdmin && locked && <Lock className="w-3 h-3 text-amber-400" />}
                  </div>
                </th>
              )
            })}
            <th className="text-right font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, idx) => {
            if (row.type === "SECTION") {
              return (
                <tr key={idx} className="bg-gray-50">
                  <td colSpan={14} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                    {row.label}
                  </td>
                </tr>
              )
            }
            if (row.type === "SUBSECTION") {
              return (
                <tr key={idx} className="bg-gray-50">
                  <td colSpan={14} className="px-4 py-1.5 text-xs font-semibold text-gray-500 italic border-b border-gray-100">
                    {row.label}
                  </td>
                </tr>
              )
            }
            if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
              // Calculate subtotal/total for the rows above
              return (
                <TotalsRow key={idx} label={row.label} type={row.type} allRows={allRows.slice(0, idx)} entryMap={entryMap} taxRate={taxRate} />
              )
            }

            // ACCOUNT row
            const code = row.code!
            let rowTotal = 0
            const monthValues: number[] = []
            for (let m = 1; m <= 12; m++) {
              const v = entryMap[`${code}-${m}`] ?? 0
              monthValues.push(v)
              rowTotal += v
            }

            return (
              <tr key={idx} className="hover:bg-blue-50/30 group border-b border-gray-100">
                <td className="px-4 py-1.5 text-gray-700 whitespace-nowrap">
                  <span className="text-gray-400 mr-1.5">{code}</span>
                  {row.label}
                </td>
                {monthValues.map((val, mi) => {
                  const locked = isLocked(locks, mi + 1)
                  return (
                    <td key={mi} className={`px-1 py-1 ${locked ? "bg-amber-50" : ""}`}>
                      <input
                        defaultValue={val > 0 ? formatNumber(val) : ""}
                        onBlur={(e) => handleBlur(code, mi + 1, e)}
                        disabled={locked}
                        className={`w-full text-right text-xs px-1.5 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          locked ? "bg-amber-50 text-gray-400 cursor-not-allowed" : "bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-gray-300"
                        }`}
                        placeholder=""
                      />
                    </td>
                  )
                })}
                <td className="px-4 py-1.5 text-right text-gray-900 font-medium tabular-nums">
                  {rowTotal !== 0 ? formatNumber(rowTotal) : ""}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Totals row ──────────────────────────────────────────────────────────────

function TotalsRow({ label, type, allRows, entryMap, taxRate }: {
  label: string
  type: "SUBTOTAL" | "TOTAL"
  allRows: AccountRow[]
  entryMap: Record<string, number>
  taxRate: number
}) {
  // Sum account rows since the last subtotal/total/section/subsection
  let startIdx = allRows.length - 1
  for (let i = allRows.length - 1; i >= 0; i--) {
    if (allRows[i].type === "SUBTOTAL" || allRows[i].type === "TOTAL" || allRows[i].type === "SECTION" || allRows[i].type === "SUBSECTION") {
      startIdx = i + 1
      break
    }
    if (i === 0) startIdx = 0
  }
  const accountRows = allRows.slice(startIdx).filter((r) => r.type === "ACCOUNT" && r.code)

  const monthTotals: number[] = Array(12).fill(0)
  for (const r of accountRows) {
    for (let m = 1; m <= 12; m++) {
      monthTotals[m - 1] += entryMap[`${r.code}-${m}`] ?? 0
    }
  }
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0)

  const isGrandTotal = type === "TOTAL"

  return (
    <tr className={`${isGrandTotal ? "bg-gray-100 font-bold" : "bg-gray-50 font-semibold"} border-t border-gray-300`}>
      <td className={`px-4 py-2 text-gray-800 text-xs ${isGrandTotal ? "uppercase tracking-wide" : ""}`}>{label}</td>
      {monthTotals.map((v, mi) => (
        <td key={mi} className="px-1.5 py-2 text-right text-gray-800 tabular-nums text-xs">
          {v !== 0 ? v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
        </td>
      ))}
      <td className="px-4 py-2 text-right text-gray-900 tabular-nums text-xs">
        {grandTotal !== 0 ? grandTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
      </td>
    </tr>
  )
}
