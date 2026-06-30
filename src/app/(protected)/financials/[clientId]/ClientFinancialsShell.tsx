"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState, useTransition, useRef, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { FileSpreadsheet, TrendingUp, BookOpen, Receipt, Plus, Check, X, Settings, Home, Lock, LogOut, ChevronDown, Download } from "lucide-react"
import { createFiscalYear } from "@/app/actions/fiscalyear"
import type { FiscalYear } from "@/generated/prisma/client"

interface Props {
  clientId: string
  clientName: string
  fiscalYears: FiscalYear[]
  activeFiscalYearId: string
  userName?: string
  userEmail?: string
  isAdmin: boolean
  children: React.ReactNode
}

function ShellInner({ clientId, clientName, fiscalYears: initialFYs, activeFiscalYearId, userName, userEmail, isAdmin, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selectedFyId = searchParams.get("fy") ?? activeFiscalYearId
  const [fyList, setFyList] = useState(initialFYs)
  const [addingFY, setAddingFY] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1)

  const navItems = [
    { label: "Monthly Entry", href: `/financials/${clientId}/monthly-entry`, icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "P&L", href: `/financials/${clientId}/pl`, icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Balance Sheet", href: `/financials/${clientId}/balance-sheet`, icon: <BookOpen className="w-4 h-4" /> },
    { label: "GST Tracker", href: `/financials/${clientId}/gst-tracker`, icon: <Receipt className="w-4 h-4" /> },
    ...(isAdmin ? [{ label: "Settings", href: `/financials/${clientId}/settings`, icon: <Settings className="w-4 h-4" /> }] : []),
  ]

  function navHref(base: string) {
    return selectedFyId ? `${base}?fy=${selectedFyId}` : base
  }

  async function signOut() {
    setMenuOpen(false)
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
      <header className="bg-white border-b border-gray-200 h-16 px-4 flex items-center justify-between shrink-0 z-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 min-w-0">
          <Link href="/hub" className="text-gray-400 hover:text-gray-700 transition-colors shrink-0" title="Dashboard">
            <Home className="w-4 h-4" />
          </Link>
          <span className="text-gray-300 shrink-0">/</span>
          <Link href="/financials" className="text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0">Financials</Link>
          <span className="text-gray-300 shrink-0">/</span>
          <span className="text-sm font-semibold text-gray-900 truncate">{clientName}</span>
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

          <div className="hidden sm:block text-right">
            {userName && <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>}
            {userEmail && <p className="text-xs text-gray-400 leading-tight">{userEmail}</p>}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Settings</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50">
                <Link
                  href="/settings/change-password"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                  Change Password
                </Link>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-52 bg-white border-r border-gray-200 shrink-0 hidden md:flex flex-col py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href.split("?")[0])
            return (
              <Link
                key={item.href}
                href={navHref(item.href)}
                className={`flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ${
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

          {/* Full report download — just below nav items */}
          <div className="px-3 pt-6 pb-2">
            <a
              href={`/api/export/${clientId}${selectedFyId ? `?fy=${selectedFyId}` : ""}`}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors w-full"
            >
              <Download className="w-4 h-4 shrink-0" />
              Full Report (Excel)
            </a>
          </div>
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
