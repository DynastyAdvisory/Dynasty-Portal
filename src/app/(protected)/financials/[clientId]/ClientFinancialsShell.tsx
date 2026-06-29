"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, LogOut, FileSpreadsheet, TrendingUp, BookOpen, Receipt } from "lucide-react"
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

export default function ClientFinancialsShell({ clientId, clientName, fiscalYears, activeFiscalYearId, userName, isAdmin, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems = [
    { label: "Monthly Entry", href: `/financials/${clientId}/monthly-entry`, icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: "P&L", href: `/financials/${clientId}/pl`, icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Balance Sheet", href: `/financials/${clientId}/balance-sheet`, icon: <BookOpen className="w-4 h-4" /> },
    { label: "GST Tracker", href: `/financials/${clientId}/gst-tracker`, icon: <Receipt className="w-4 h-4" /> },
  ]

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/financials" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-sm font-semibold text-gray-900">{clientName}</span>
            <span className="text-xs text-gray-400 ml-2">Financials</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Fiscal year selector */}
          <select
            defaultValue={activeFiscalYearId}
            onChange={(e) => router.push(`?fy=${e.target.value}`)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                FY {fy.year} {fy.status === "CLOSED" ? "(Closed)" : ""}
              </option>
            ))}
          </select>
          {userName && <span className="text-xs text-gray-400 hidden sm:block">{userName}</span>}
          <button onClick={signOut} className="text-gray-400 hover:text-gray-600 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-44 bg-white border-r border-gray-200 shrink-0 hidden md:flex flex-col py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
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
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
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
