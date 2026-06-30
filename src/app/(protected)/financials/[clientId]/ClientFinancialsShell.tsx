"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState, useTransition, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { LogOut, FileSpreadsheet, TrendingUp, BookOpen, Receipt, ChevronDown, ChevronRight, Plus, Check, X } from "lucide-react"
import { createFiscalYear } from "@/app/actions/fiscalyear"
import type { FiscalYear } from "@/generated/prisma/client"

interface Props {
  clientId: string
  clientName: string
  fiscalYears: FiscalYear[]
  activeFiscalYearId: string
  userName?: string
  isAdmin: boolean
  children: React.ReactNode
}

function ShellInner({ clientId, clientName, fiscalYears: initialFYs, activeFiscalYearId, userName, isAdmin, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const selectedFyId = searchParams.get("fy") ?? activeFiscalYearId
  const [fyList, setFyList] = useState(initialFYs)
  const [addingFY, setAddingFY] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1)

  const navItems = [
    { label: "Monthly Entry", href: `/financials/${clientId}/monthly-entry`, icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "P&L", href: `/financials/${clientId}/pl`, icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Balance Sheet", href: `/financials/${clientId}/balance-sheet`, icon: <BookOpen className="w-4 h-4" /> },
    { label: "GST Tracker", href: `/financials/${clientId}/gst-tracker`, icon: <Receipt className="w-4 h-4" /> },
  ]

  function navHref(base: string) {
    return selectedFyId ? `${base}?fy=${selectedFyId}` : base
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  function handleFyChange(id: string) {
    const base = pathname.split("?")[0]
    router.push(`${base}?fy=${id}`)
  }

  async function handleAddFY() {
    startTransition(async () => {
      const fy = await createFiscalYear(clientId, newYear)
      setFyList((prev) => {
        const exists = prev.find((f) => f.id === fy.id)
        return exists ? prev : [fy, ...prev]
      })
      setAddingFY(false)
      handleFyChange(fy.id)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between shrink-0 z-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm min-w-0">
          <Link href="/hub" className="text-gray-400 hover:text-gray-700 transition-colors shrink-0">Hub</Link>
          <span className="text-gray-200 shrink-0">/</span>
          <Link href="/financials" className="text-gray-400 hover:text-gray-700 transition-colors shrink-0">Financials</Link>
          <span className="text-gray-200 shrink-0">/</span>
          <span className="font-semibold text-gray-900 truncate">{clientName}</span>
        </nav>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* Fiscal year selector */}
          <div className="flex items-center gap-1">
            <select
              value={selectedFyId}
              onChange={(e) => handleFyChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fyList.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  FY {fy.year} {fy.status === "CLOSED" ? "(Closed)" : ""}
                </option>
              ))}
            </select>

            {isAdmin && !addingFY && (
              <button
                onClick={() => setAddingFY(true)}
                className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Add fiscal year"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            {addingFY && (
              <div className="flex items-center gap-1 bg-white border border-blue-300 rounded-lg px-2 py-1 shadow-sm">
                <span className="text-xs text-gray-500">FY</span>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value) || new Date().getFullYear() + 1)}
                  className="w-16 text-xs focus:outline-none"
                  min={2020}
                  max={2040}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddFY(); if (e.key === "Escape") setAddingFY(false) }}
                />
                <button onClick={handleAddFY} className="text-green-600 hover:text-green-800"><Check className="w-3 h-3" /></button>
                <button onClick={() => setAddingFY(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>

          {userName && <span className="text-xs text-gray-400 hidden sm:block">{userName}</span>}
          <Link href="/settings/change-password" className="text-xs text-gray-400 hover:text-gray-600 hidden sm:block transition-colors">
            Settings
          </Link>
          <button onClick={signOut} className="text-gray-400 hover:text-gray-600 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-44 bg-white border-r border-gray-200 shrink-0 hidden md:flex flex-col py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href.split("?")[0])
            return (
              <Link
                key={item.href}
                href={navHref(item.href)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-20">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href.split("?")[0])
            return (
              <Link
                key={item.href}
                href={navHref(item.href)}
                className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {item.icon}
                <span className="mt-1 text-[10px] leading-tight text-center">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function ClientFinancialsShell(props: Props) {
  return (
    <Suspense fallback={null}>
      <ShellInner {...props} />
    </Suspense>
  )
}
