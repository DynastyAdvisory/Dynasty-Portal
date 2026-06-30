import { getCurrentProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Users, Lock, ChevronRight } from "lucide-react"
import Link from "next/link"
import AppHeader from "@/components/AppHeader"

export default async function SettingsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const isStaff = profile.role === "ADMIN" || profile.role === "ACCOUNTANT" || profile.role === "BOOKKEEPER"

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader
        userName={profile.name}
        userEmail={profile.email}
        userRole={profile.role}
      />

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-3">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

        {isStaff && (
          <Link
            href="/settings/users"
            className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-5 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">Users</p>
                <p className="text-sm text-gray-400 mt-0.5">Invite and manage team members and clients</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
          </Link>
        )}

        <Link
          href="/settings/change-password"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-5 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">Change Password</p>
              <p className="text-sm text-gray-400 mt-0.5">Update your account password</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
        </Link>
      </main>
    </div>
  )
}
