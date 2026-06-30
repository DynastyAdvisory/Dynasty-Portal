import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import UsersSimpleClient from "./UsersSimpleClient"

export default async function TeamPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  if (profile.role === "CLIENT") redirect("/hub")

  // Staff see only their assigned clients' users; Admin sees all
  let clients
  if (profile.role === "ADMIN") {
    clients = await prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  } else {
    const assignments = await prisma.clientAssignment.findMany({
      where: { profileId: profile.id },
      include: { client: true },
    })
    clients = assignments.map((a) => a.client).filter((c) => c.active)
  }

  const clientIds = clients.map((c) => c.id)

  const clientUsers = await prisma.profile.findMany({
    where: { role: "CLIENT", clientId: { in: clientIds } },
    include: { client: true },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 h-14 px-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Team — Client Users</span>
        <a href="/hub" className="text-xs text-gray-400 hover:text-gray-600">← Hub</a>
      </header>
      <div className="p-6 max-w-3xl mx-auto">
        <UsersSimpleClient
          users={clientUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            clientName: u.client?.name ?? null,
          }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          currentUserRole={profile.role}
        />
      </div>
    </div>
  )
}
