"use client"

import { useState } from "react"
import { MONTHS } from "@/lib/accounts"
import { ChevronDown, ChevronRight } from "lucide-react"

export interface CalcRow {
  type: "SECTION" | "SUBSECTION" | "ACCOUNT" | "SUBTOTAL" | "TOTAL"
  label: string
  code?: string
  monthVals: number[]
  rowTotal: number
}

export interface SectionData {
  key: string
  label: string
  rows: CalcRow[]
  monthTotals: number[]
  sectionTotal: number
}

interface Props {
  sections: SectionData[]
  monthlyGrossProfit: number[]
  monthlyNetIncome: number[]
  totalGrossProfit: number
  totalNetIncome: number
}

const fmt = (n: number) => n !== 0 ? n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""

export default function PLClient({ sections, monthlyGrossProfit, monthlyNetIncome, totalGrossProfit, totalNetIncome }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const colSpan = 14

  return (
    <div className="overflow-x-auto">
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
          {sections.map((section, si) => {
            const isCollapsed = collapsed.has(section.key)
            return (
              <>
                {/* Section header (from SECTION row) */}
                <tr key={`${section.key}-header`} className="bg-gray-50 cursor-pointer select-none" onClick={() => toggle(section.key)}>
                  <td colSpan={colSpan} className="px-4 py-2 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      {isCollapsed
                        ? <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{section.label}</span>
                    </div>
                  </td>
                </tr>

                {/* Account + subsection rows (hidden when collapsed) */}
                {!isCollapsed && section.rows.filter((r) => r.type !== "TOTAL").map((row, ri) => {
                  if (row.type === "SUBSECTION") {
                    return (
                      <tr key={`${section.key}-sub-${ri}`} className="bg-gray-50">
                        <td colSpan={colSpan} className="px-4 py-1.5 text-xs font-semibold text-gray-500 italic border-b border-gray-100">
                          {row.label}
                        </td>
                      </tr>
                    )
                  }
                  if (row.type === "SUBTOTAL") {
                    return (
                      <tr key={`${section.key}-subtot-${ri}`} className="bg-gray-50 font-semibold border-t border-gray-300">
                        <td className="px-4 py-2 text-gray-800 text-xs">{row.label}</td>
                        {row.monthVals.map((v, i) => <td key={i} className="px-2 py-2 text-right tabular-nums text-xs text-gray-800">{fmt(v)}</td>)}
                        <td className="px-4 py-2 text-right tabular-nums text-xs font-semibold text-gray-900">{fmt(row.rowTotal)}</td>
                      </tr>
                    )
                  }
                  // ACCOUNT row
                  return (
                    <tr key={`${section.key}-acc-${row.code ?? ri}`} className="border-b border-gray-100 hover:bg-blue-50/20">
                      <td className="px-4 py-1.5 text-gray-700">
                        <span className="text-gray-400 mr-1.5">{row.code}</span>{row.label}
                      </td>
                      {row.monthVals.map((v, i) => <td key={i} className="px-2 py-1.5 text-right text-gray-800 tabular-nums">{fmt(v)}</td>)}
                      <td className="px-4 py-1.5 text-right text-gray-900 font-medium tabular-nums">{fmt(row.rowTotal)}</td>
                    </tr>
                  )
                })}

                {/* Section total (always visible) */}
                <tr key={`${section.key}-sectot`} className="bg-gray-100 font-bold border-t border-gray-300">
                  <td className="px-4 py-2 text-gray-800 text-xs uppercase tracking-wide">
                    Total {section.label}
                  </td>
                  {section.monthTotals.map((v, i) => (
                    <td key={i} className={`px-2 py-2 text-right tabular-nums text-xs ${v < 0 ? "text-red-700" : "text-gray-800"}`}>{fmt(v)}</td>
                  ))}
                  <td className={`px-4 py-2 text-right tabular-nums text-xs font-semibold ${section.sectionTotal < 0 ? "text-red-700" : "text-gray-900"}`}>{fmt(section.sectionTotal)}</td>
                </tr>

                {/* Gross profit after COGS */}
                {section.key === "COGS" && (
                  <tr key="gross-profit" className="bg-blue-50 border-t-2 border-gray-400">
                    <td className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs text-gray-800">Gross Profit</td>
                    {monthlyGrossProfit.map((v, i) => (
                      <td key={i} className={`px-2 py-2.5 text-right tabular-nums text-xs font-bold ${v < 0 ? "text-red-700" : "text-gray-800"}`}>{fmt(v)}</td>
                    ))}
                    <td className={`px-4 py-2.5 text-right tabular-nums text-xs font-bold ${totalGrossProfit < 0 ? "text-red-700" : "text-gray-900"}`}>{fmt(totalGrossProfit)}</td>
                  </tr>
                )}
              </>
            )
          })}

          {/* Net Income row */}
          <tr className="bg-blue-50 border-t-2 border-gray-400">
            <td className="px-4 py-2.5 font-bold uppercase tracking-wide text-xs text-gray-800">Net Income / (Loss)</td>
            {monthlyNetIncome.map((v, i) => (
              <td key={i} className={`px-2 py-2.5 text-right tabular-nums text-xs font-bold ${v < 0 ? "text-red-700" : "text-gray-800"}`}>{fmt(v)}</td>
            ))}
            <td className={`px-4 py-2.5 text-right tabular-nums text-xs font-bold ${totalNetIncome < 0 ? "text-red-700" : "text-gray-900"}`}>{fmt(totalNetIncome)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
