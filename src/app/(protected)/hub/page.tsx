import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BarChart2, Users, Settings } from "lucide-react"
import Link from "next/link"

export default async function HubPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await getCurrentProfile()
  const isAdmin = profile?.role === "ADMIN"
  const isStaff = profile?.role === "ADMIN" || profile?.role === "ACCOUNTANT" || profile?.role === "BOOKKEEPER"
  const displayName = profile?.name ?? user.user_metadata?.name ?? user.email

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 h-14 px-6 flex items-center justify-between">
        <span className="text-base font-semibold text-gray-900 tracking-tight">Dynasty Portal</span>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link href="/admin/clients" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors">
              <Settings className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
          <Link href="/settings/change-password" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Settings
          </Link>
          <span className="text-sm text-gray-500">{displayName}</span>
        </div>
      </header>

      {/* Hub grid */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">Select a Module</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Link
            href="/financials"
            className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <BarChart2 className="w-7 h-7 text-blue-600" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-semibold text-gray-600 tracking-widest">FINANCIALS</span>
            <span className="text-xs text-gray-400 text-center leading-relaxed">P&L, Balance Sheet & Tax Tracker</span>
          </Link>

          {isStaff && (
            <Link
              href="/users"
              className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <Users className="w-7 h-7 text-purple-600" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-semibold text-gray-600 tracking-widest">TEAM</span>
              <span className="text-xs text-gray-400 text-center leading-relaxed">Invite & manage client users</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
