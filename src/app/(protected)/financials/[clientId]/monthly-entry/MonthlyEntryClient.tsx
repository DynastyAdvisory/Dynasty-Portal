"use client"

import { useTransition } from "react"
import { saveMonthlyEntry, lockPeriod, unlockPeriod } from "@/app/actions/entries"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS, MONTHS, type AccountRow } from "@/lib/accounts"
import { Lock, Unlock } from "lucide-react"

interface TaxCodeOption { id: string; name: string; rate: number; isDefault: boolean }
interface AccountConfigOption { accountCode: string; isHidden: boolean; taxCodeId: string | null }
interface CustomAccountOption { code: string; name: string; section: string; subsection?: string }

interface Props {
  clientId: string
  fiscalYearId: string
  defaultTaxRate: number
  entries: { accountCode: string; month: number; grossAmount: string | number }[]
  locks: { month: number; lockedAt: Date; unlockedAt: Date | null }[]
  taxCodes: TaxCodeOption[]
  accountConfigs: AccountConfigOption[]
  customAccounts: CustomAccountOption[]
  isStaff: boolean
}

function isMonthLocked(locks: Props["locks"], month: number) {
  const l = locks.find((x) => x.month === month)
  return !!l && !l.unlockedAt
}

function fmt(n: number) {
  if (n === 0) return ""
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseInput(v: string) { return parseFloat(v.replace(/,/g, "")) || 0 }

export default function MonthlyEntryClient({
  clientId, fiscalYearId, defaultTaxRate, entries, locks, taxCodes, accountConfigs, customAccounts, isStaff,
}: Props) {
  const [, startTransition] = useTransition()

  const entryMap: Record<string, number> = {}
  for (const e of entries) {
    entryMap[`${e.accountCode}-${e.month}`] = parseFloat(String(e.grossAmount))
  }

  const hiddenSet = new Set(accountConfigs.filter((c) => c.isHidden).map((c) => c.accountCode))
  const taxCodeMap = new Map(accountConfigs.filter((c) => c.taxCodeId).map((c) => [c.accountCode, c.taxCodeId!]))
  const taxCodeById = new Map(taxCodes.map((t) => [t.id, t]))
  const defaultTaxCode = taxCodes.find((t) => t.isDefault)

  function getRate(code: string) {
    const tcId = taxCodeMap.get(code)
    if (tcId) return taxCodeById.get(tcId)?.rate ?? defaultTaxRate
    return defaultTaxCode?.rate ?? defaultTaxRate
  }

  function getTaxCodeIdForAccount(code: string) {
    return taxCodeMap.get(code) ?? (defaultTaxCode?.id ?? "")
  }

  // Build full rows: standard (filtered) + custom injected by section
  function buildRows(standardRows: AccountRow[], section: string) {
    const rows: (AccountRow | { type: "ACCOUNT"; code: string; label: string; isCustom: true })[] = []
    for (const row of standardRows) {
      if (row.type === "ACCOUNT" && row.code && hiddenSet.has(row.code)) continue
      rows.push(row)
      // Inject custom accounts after last standard account in their subsection
      if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
        // handled below
      }
    }
    return rows
  }

  const customBySection: Record<string, CustomAccountOption[]> = {}
  for (const ca of customAccounts) {
    if (!customBySection[ca.section]) customBySection[ca.section] = []
    customBySection[ca.section].push(ca)
  }

  function handleBlur(code: string, month: number, e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInput(e.target.value)
    const prev = entryMap[`${code}-${month}`] ?? 0
    if (val === prev) return
    startTransition(async () => { await saveMonthlyEntry(clientId, fiscalYearId, code, month, val) })
  }

  function handleTaxCodeChange(code: string, taxCodeId: string) {
    // Update via accountconfig action — optimistic update not needed, page will revalidate
    import("@/app/actions/accountconfig").then(({ setAccountTaxCode }) => {
      startTransition(async () => { await setAccountTaxCode(clientId, code, taxCodeId || null) })
    })
  }

  const hasTaxCodes = taxCodes.length > 0
  const colSpan = hasTaxCodes ? 15 : 14

  const allSections = [
    { rows: REVENUE_ROWS, key: "REVENUE" },
    { rows: COGS_ROWS, key: "COGS" },
    { rows: EXPENSE_ROWS, key: "EXPENSE" },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth: hasTaxCodes ? "1100px" : "900px" }}>
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="text-left font-semibold text-gray-700 px-4 py-3 w-52 border-b border-gray-200">Account</th>
            {hasTaxCodes && (
              <th className="text-left font-semibold text-gray-700 px-2 py-3 w-36 border-b border-gray-200">Tax</th>
            )}
            {MONTHS.map((m, i) => {
              const locked = isMonthLocked(locks, i + 1)
              return (
                <th key={m} className="text-center font-semibold text-gray-700 px-1.5 py-3 border-b border-gray-200 min-w-[72px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{m}</span>
                    {isStaff && (
                      <button
                        onClick={() => startTransition(async () => {
                          if (locked) {
                            const note = window.prompt("Reason for unlocking:") ?? ""
                            if (note.trim()) await unlockPeriod(clientId, fiscalYearId, i + 1, note)
                          } else {
                            await lockPeriod(clientId, fiscalYearId, i + 1)
                          }
                        })}
                        className={`p-0.5 rounded transition-colors ${locked ? "text-amber-500 hover:text-amber-700" : "text-gray-300 hover:text-gray-500"}`}
                        title={locked ? "Unlock period" : "Lock period"}
                      >
                        {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    )}
                    {!isStaff && locked && <Lock className="w-3 h-3 text-amber-400" />}
                  </div>
                </th>
              )
            })}
            <th className="text-right font-semibold text-gray-700 px-4 py-3 border-b border-gray-200 min-w-[90px]">Total</th>
          </tr>
        </thead>
        <tbody>
          {allSections.map(({ rows, key }) => {
            const sectionCustom = customBySection[key] ?? []
            const allRows = [...rows]
            // Insert custom accounts before the TOTAL row of the section
            const totalIdx = allRows.findIndex((r) => r.type === "TOTAL")
            if (sectionCustom.length > 0 && totalIdx > -1) {
              const customRows: AccountRow[] = sectionCustom.map((ca) => ({
                type: "ACCOUNT" as const,
                label: ca.name,
                code: ca.code,
              }))
              allRows.splice(totalIdx, 0, ...customRows)
            }

            return allRows.map((row, idx) => {
              if (row.type === "SECTION") {
                return (
                  <tr key={`${key}-section-${idx}`} className="bg-gray-50">
                    <td colSpan={colSpan} className="px-4 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                      {row.label}
                    </td>
                  </tr>
                )
              }
              if (row.type === "SUBSECTION") {
                return (
                  <tr key={`${key}-sub-${idx}`} className="bg-gray-50">
                    <td colSpan={colSpan} className="px-4 py-1.5 text-xs font-semibold text-gray-500 italic border-b border-gray-100">
                      {row.label}
                    </td>
                  </tr>
                )
              }
              if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
                // Sum account rows since last break
                let startI = 0
                for (let j = idx - 1; j >= 0; j--) {
                  const t = allRows[j].type
                  if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION" || t === "SUBSECTION") { startI = j + 1; break }
                }
                const accRows = allRows.slice(startI, idx).filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code!))
                const monthTotals = Array.from({ length: 12 }, (_, mi) =>
                  accRows.reduce((s, r) => s + (entryMap[`${r.code}-${mi + 1}`] ?? 0), 0)
                )
                const grandTotal = monthTotals.reduce((a, b) => a + b, 0)
                const isBold = row.type === "TOTAL"
                return (
                  <tr key={`${key}-total-${idx}`} className={`${isBold ? "bg-gray-100 font-bold" : "bg-gray-50 font-semibold"} border-t border-gray-300`}>
                    <td colSpan={hasTaxCodes ? 2 : 1} className={`px-4 py-2 text-gray-800 text-xs ${isBold ? "uppercase tracking-wide" : ""}`}>{row.label}</td>
                    {monthTotals.map((v, mi) => (
                      <td key={mi} className="px-1.5 py-2 text-right text-gray-800 tabular-nums text-xs">
                        {v !== 0 ? fmt(v) : ""}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right text-gray-900 tabular-nums text-xs">{grandTotal !== 0 ? fmt(grandTotal) : ""}</td>
                  </tr>
                )
              }

              // ACCOUNT row
              const code = row.code!
              if (hiddenSet.has(code)) return null

              const monthVals = Array.from({ length: 12 }, (_, mi) => entryMap[`${code}-${mi + 1}`] ?? 0)
              const rowTotal = monthVals.reduce((a, b) => a + b, 0)
              const currentTaxCodeId = getTaxCodeIdForAccount(code)

              return (
                <tr key={`${key}-acc-${code}`} className="hover:bg-blue-50/30 border-b border-gray-100">
                  <td className="px-4 py-1.5 text-gray-700 whitespace-nowrap">
                    <span className="text-gray-400 mr-1.5">{code}</span>
                    {row.label}
                  </td>
                  {hasTaxCodes && (
                    <td className="px-2 py-1">
                      <select
                        value={currentTaxCodeId}
                        onChange={(e) => handleTaxCodeChange(code, e.target.value)}
                        className="w-full text-xs px-1.5 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {taxCodes.map((tc) => (
                          <option key={tc.id} value={tc.id}>
                            {tc.name}{tc.isDefault ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  {monthVals.map((val, mi) => {
                    const locked = isMonthLocked(locks, mi + 1)
                    return (
                      <td key={mi} className={`px-1 py-1 ${locked ? "bg-amber-50" : ""}`}>
                        <input
                          defaultValue={val > 0 ? fmt(val) : ""}
                          onBlur={(e) => handleBlur(code, mi + 1, e)}
                          disabled={locked}
                          className={`w-full text-right text-xs px-1.5 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            locked ? "bg-amber-50 text-gray-400 cursor-not-allowed" : "bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-gray-300"
                          }`}
                        />
                      </td>
                    )
                  })}
                  <td className="px-4 py-1.5 text-right text-gray-900 font-medium tabular-nums">
                    {rowTotal !== 0 ? fmt(rowTotal) : ""}
                  </td>
                </tr>
              )
            })
          })}
        </tbody>
      </table>
    </div>
  )
}
