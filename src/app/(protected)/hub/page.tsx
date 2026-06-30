import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BarChart2 } from "lucide-react"
import Link from "next/link"
import AppHeader from "@/components/AppHeader"

export default async function HubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await getCurrentProfile()
  const displayName = profile?.name ?? user.user_metadata?.name ?? user.email

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader
        userName={displayName}
        userEmail={user.email}
        userRole={profile?.role}
      />

      <main className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">Dashboard</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <Link
            href="/financials"
            className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center gap-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <BarChart2 className="w-8 h-8 text-blue-600" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-bold text-gray-600 tracking-widest uppercase">Financials</span>
            <span className="text-sm text-gray-400 text-center leading-relaxed">P&L, Balance Sheet & Tax Tracker</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
