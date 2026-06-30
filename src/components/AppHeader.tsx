"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useRef, useEffect } from "react"
import { Settings, ChevronDown, LogOut, Lock } from "lucide-react"

interface Props {
  userName?: string | null
  userEmail?: string | null
  userRole?: string | null
  activePath?: string
}

export default function AppHeader({ userName, userEmail, userRole, activePath }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isAdmin = userRole === "ADMIN"
  const isStaff = isAdmin || userRole === "ACCOUNTANT" || userRole === "BOOKKEEPER"

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function signOut() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between shrink-0 z-10">
      {/* Left: logo + nav */}
      <div className="flex items-center gap-6">
        <Link href="/hub" className="text-lg font-bold text-gray-900 shrink-0">
          Dynasty Portal
        </Link>

        <nav className="flex items-center gap-0.5">
          <Link
            href="/financials"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePath === "financials"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            Financials
          </Link>

          {isAdmin && (
            <>
              <span className="text-gray-300 px-1 select-none">|</span>
              <Link
                href="/settings/users"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activePath === "users"
                    ? "bg-purple-100 text-purple-800"
                    : "text-purple-700 hover:bg-purple-50 hover:text-purple-900"
                }`}
              >
                Users
              </Link>
              <Link
                href="/settings/audit-log"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activePath === "audit-log"
                    ? "bg-purple-100 text-purple-800"
                    : "text-purple-700 hover:bg-purple-50 hover:text-purple-900"
                }`}
              >
                Audit Log
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Right: user info + settings dropdown */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          {userName && <p className="text-sm font-semibold text-gray-900 leading-tight">{userName}</p>}
          {userEmail && <p className="text-xs text-gray-400 leading-tight">{userEmail}</p>}
        </div>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">Settings</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50">
              <Link
                href="/settings/change-password"
                onClick={() => setOpen(false)}
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
  )
}
