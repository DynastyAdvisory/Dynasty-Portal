"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, ChevronLeft } from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
}

interface AppShellProps {
  title: string
  subtitle?: string
  navItems: NavItem[]
  backHref?: string
  backLabel?: string
  userName?: string
  children: React.ReactNode
}

export default function AppShell({ title, subtitle, navItems, backHref, backLabel, userName, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

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
          {backHref && (
            <Link href={backHref} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <span className="text-sm font-semibold text-gray-900">{title}</span>
            {subtitle && <span className="text-xs text-gray-400 ml-2">{subtitle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {userName && <span className="text-xs text-gray-400 hidden sm:block">{userName}</span>}
          <button onClick={signOut} className="text-gray-400 hover:text-gray-600 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <nav className="w-48 bg-white border-r border-gray-200 shrink-0 hidden md:flex flex-col py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
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
          {navItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
