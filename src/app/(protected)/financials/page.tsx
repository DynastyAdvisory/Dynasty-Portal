import { getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function FinancialsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  // Client role → redirect directly to their own company
  if (profile.role === "CLIENT") {
    if (!profile.clientId) redirect("/hub")
    redirect(`/financials/${profile.clientId}/monthly-entry`)
  }

  // Staff → show list of accessible clients
  const clients =
    profile.role === "ADMIN"
      ? await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" } })
      : (
          await prisma.clientAssignment.findMany({
            where: { profileId: profile.id },
            include: { client: true },
          })
        ).map((a) => a.client).filter((c) => c.active)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 h-14 px-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Financials</span>
        <Link href="/hub" className="text-xs text-gray-400 hover:text-gray-600">← Hub</Link>
      </header>

      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Select a Client</h1>

        {clients.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No clients assigned yet.</p>
        ) : (
          <div className="grid gap-3">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/financials/${client.id}/monthly-entry`}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{client.industry ?? "—"} · {client.taxType.replace("_", " ")}</p>
                </div>
                <span className="text-gray-300 text-sm">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
