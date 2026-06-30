import { getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AppHeader from "@/components/AppHeader"
import UsersClient from "@/app/(protected)/admin/users/UsersClient"

export default async function SettingsUsersPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.role === "CLIENT") redirect("/hub")

  const [profiles, clients] = await Promise.all([
    prisma.profile.findMany({
      include: { client: true, assignments: { include: { client: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ])

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader
        userName={profile.name}
        userEmail={profile.email}
        userRole={profile.role}
        activePath="users"
      />
      <UsersClient profiles={profiles} clients={clients} currentUserRole={profile.role} />
    </div>
  )
}
