import { getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import AppHeader from "@/components/AppHeader"

export default async function FinancialsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  if (profile.role === "CLIENT") {
    if (!profile.clientId) redirect("/hub")
    redirect(`/financials/${profile.clientId}/monthly-entry`)
  }

  const clients =
    profile.role === "ADMIN"
      ? await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" } })
      : (
          await prisma.clientAssignment.findMany({
            where: { profileId: profile.id },
            include: { client: true },
          })
        ).map((a) => a.client).filter((c) => c.active)

  const isAdmin = profile.role === "ADMIN"

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        userName={profile.name}
        userEmail={profile.email}
        userRole={profile.role}
        activePath="financials"
      />

      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Select a Client</h1>
          {isAdmin && (
            <Link
              href="/admin/clients/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Client
            </Link>
          )}
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-base text-gray-400 mb-4">No clients yet.</p>
            {isAdmin && (
              <Link href="/admin/clients/new" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Add your first client
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/financials/${client.id}/monthly-entry`}
                className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="text-base font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{client.industry ?? "—"} · {client.taxType.replace("_", " ")}</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
