"use client"

import { useState, useTransition, useRef } from "react"
import { saveMonthlyEntry, lockPeriod, unlockPeriod } from "@/app/actions/entries"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS, MONTHS, type AccountRow } from "@/lib/accounts"
import { Lock, Unlock, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react"

interface TaxCodeOption { id: string; name: string; rate: number; isDefault: boolean }
interface AccountConfigOption { accountCode: string; isHidden: boolean; taxCodeId: string | null }
interface CustomAccountOption { code: string; name: string; section: string; subsection?: string }

interface Props {
  clientId: string
  fiscalYearId: string
  defaultTaxRate: number
  entries: { accountCode: string; month: number; grossAmount: string | number; taxCodeId: string | null }[]
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

function parseInput(v: string): number {
  const clean = v.replace(/,/g, "").trim()
  if (!clean) return 0
  if (/[+\-*/()]/.test(clean) && /^[\d\s+\-*/.()]+$/.test(clean)) {
    try {
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${clean})`)()
      if (typeof result === "number" && isFinite(result)) return Math.round(result * 100) / 100
    } catch { /* fall through */ }
  }
  return parseFloat(clean) || 0
}

export default function MonthlyEntryClient({
  clientId, fiscalYearId, defaultTaxRate, entries, locks, taxCodes, accountConfigs, customAccounts, isStaff,
}: Props) {
  const [, startTransition] = useTransition()
  const [hideEmpty, setHideEmpty] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [openTaxCell, setOpenTaxCell] = useState<string | null>(null) // `${code}-${month}`
  const taxSelectRef = useRef<HTMLSelectElement>(null)

  const entryMap: Record<string, number> = {}
  const entryTaxMap: Record<string, string | null> = {}
  for (const e of entries) {
    entryMap[`${e.accountCode}-${e.month}`] = parseFloat(String(e.grossAmount))
    entryTaxMap[`${e.accountCode}-${e.month}`] = e.taxCodeId
  }

  const hiddenSet = new Set(accountConfigs.filter((c) => c.isHidden).map((c) => c.accountCode))
  const taxCodeMap = new Map(accountConfigs.filter((c) => c.taxCodeId).map((c) => [c.accountCode, c.taxCodeId!]))
  const taxCodeById = new Map(taxCodes.map((t) => [t.id, t]))
  const defaultTaxCode = taxCodes.find((t) => t.isDefault)

  function getEffectiveTaxCodeId(code: string, month: number): string | null {
    const cellOverride = entryTaxMap[`${code}-${month}`]
    if (cellOverride !== undefined) return cellOverride
    return taxCodeMap.get(code) ?? defaultTaxCode?.id ?? null
  }

  function getEffectiveTaxName(code: string, month: number): string {
    const tcId = getEffectiveTaxCodeId(code, month)
    if (!tcId) return defaultTaxRate > 0 ? `${(defaultTaxRate * 100).toFixed(0)}%` : "—"
    const tc = taxCodeById.get(tcId)
    if (!tc) return "—"
    return tc.rate > 0 ? tc.name.slice(0, 5) : "Exempt"
  }

  const hasTaxCodes = taxCodes.length > 0
  const colSpan = 14

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

  function handleCellTaxChange(code: string, month: number, taxCodeId: string | null, currentVal: number) {
    startTransition(async () => {
      await saveMonthlyEntry(clientId, fiscalYearId, code, month, currentVal, taxCodeId)
    })
    setOpenTaxCell(null)
  }

  function handleToggleHidden(code: string, isCurrentlyHidden: boolean) {
    import("@/app/actions/accountconfig").then(({ setAccountHidden }) => {
      startTransition(async () => { await setAccountHidden(clientId, code, !isCurrentlyHidden) })
    })
  }

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allSections = [
    { rows: REVENUE_ROWS, key: "REVENUE" },
    { rows: COGS_ROWS, key: "COGS" },
    { rows: EXPENSE_ROWS, key: "EXPENSE" },
  ]

  return (
    <div className="overflow-x-auto">
      {/* Controls bar */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-gray-100 bg-gray-50">
        <button
          onClick={() => setHideEmpty((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            hideEmpty ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}
        >
          {hideEmpty ? "Showing non-empty rows" : "Hide empty rows"}
        </button>
        <span className="text-xs text-gray-400">Click section headers to collapse</span>
      </div>

      <table className="w-full text-xs border-collapse" style={{ minWidth: "900px" }}>
        <thead className="sticky top-0 z-10 bg-white">
          <tr>
            <th className="text-left font-semibold text-gray-700 px-4 py-3 w-52 border-b border-gray-200">Account</th>
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
            const totalIdx = allRows.findIndex((r) => r.type === "TOTAL")
            if (sectionCustom.length > 0 && totalIdx > -1) {
              const customRows: AccountRow[] = sectionCustom.map((ca) => ({ type: "ACCOUNT" as const, label: ca.name, code: ca.code }))
              allRows.splice(totalIdx, 0, ...customRows)
            }

            const isCollapsed = collapsed.has(key)

            return allRows.map((row, idx) => {
              if (row.type === "SECTION") {
                return (
                  <tr key={`${key}-section-${idx}`} className="bg-gray-50 cursor-pointer select-none" onClick={() => toggleCollapse(key)}>
                    <td colSpan={colSpan} className="px-4 py-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        {isCollapsed
                          ? <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{row.label}</span>
                      </div>
                    </td>
                  </tr>
                )
              }

              // When section is collapsed: hide everything except TOTAL rows
              if (isCollapsed && row.type !== "TOTAL") return null

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
                    <td className={`px-4 py-2 text-gray-800 text-xs ${isBold ? "uppercase tracking-wide" : ""}`}>{row.label}</td>
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
              const monthVals = Array.from({ length: 12 }, (_, mi) => entryMap[`${code}-${mi + 1}`] ?? 0)
              const hasData = monthVals.some((v) => v !== 0)
              const isHidden = hiddenSet.has(code)

              // Hide logic: hidden + no data = skip; hidden + has data = show with warning
              if (isHidden && !hasData) return null
              // Empty row filtering
              if (hideEmpty && !hasData && !isHidden) return null

              const rowTotal = monthVals.reduce((a, b) => a + b, 0)

              return (
                <tr key={`${key}-acc-${code}`} className={`border-b border-gray-100 hover:bg-blue-50/30 ${isHidden ? "border-l-2 border-l-amber-400" : ""}`}>
                  <td className="px-4 py-1.5 text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {isStaff && (
                        <button
                          onClick={() => handleToggleHidden(code, isHidden)}
                          className={`shrink-0 transition-colors ${isHidden ? "text-amber-500 hover:text-amber-700" : "text-gray-400 hover:text-gray-600"}`}
                          title={isHidden ? "Account is hidden in reports — click to show" : "Hide this account"}
                        >
                          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                      <span className="text-gray-400 mr-0.5">{code}</span>
                      <span className={isHidden ? "text-amber-600" : ""}>{row.label}</span>
                      {isHidden && <span className="text-[10px] text-amber-500 ml-1">(hidden)</span>}
                    </div>
                  </td>
                  {monthVals.map((val, mi) => {
                    const month = mi + 1
                    const locked = isMonthLocked(locks, month)
                    const cellKey = `${code}-${month}`
                    const taxName = hasTaxCodes && isStaff && val !== 0 ? getEffectiveTaxName(code, month) : null
                    const isTaxOpen = openTaxCell === cellKey

                    return (
                      <td key={mi} className={`px-1 py-1 relative ${locked ? "bg-amber-50" : ""}`}>
                        <input
                          defaultValue={val > 0 ? fmt(val) : ""}
                          onBlur={(e) => handleBlur(code, month, e)}
                          disabled={locked}
                          className={`w-full text-right text-xs px-1.5 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            locked ? "bg-amber-50 text-gray-400 cursor-not-allowed" : "bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-gray-300"
                          }`}
                        />
                        {taxName && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenTaxCell(isTaxOpen ? null : cellKey)}
                              className="w-full text-right text-[9px] text-blue-500 hover:text-blue-700 leading-none px-1.5 pb-0.5 truncate"
                            >
                              {taxName}
                            </button>
                            {isTaxOpen && (
                              <div className="absolute right-0 top-full z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-36">
                                <p className="text-[10px] text-gray-500 mb-1.5 font-medium">Tax for this cell</p>
                                <select
                                  ref={taxSelectRef}
                                  defaultValue={entryTaxMap[cellKey] ?? ""}
                                  autoFocus
                                  onBlur={() => setTimeout(() => setOpenTaxCell(null), 150)}
                                  onChange={(e) => handleCellTaxChange(code, month, e.target.value || null, val)}
                                  className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                >
                                  <option value="">Account default</option>
                                  {taxCodes.map((tc) => (
                                    <option key={tc.id} value={tc.id}>{tc.name} ({(tc.rate * 100).toFixed(0)}%)</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
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
