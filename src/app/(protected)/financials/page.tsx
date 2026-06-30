import { getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AppHeader from "@/components/AppHeader"
import FinancialsClientList from "./FinancialsClientList"

export default async function FinancialsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  if (profile.role === "CLIENT") {
    if (!profile.clientId) redirect("/hub")
    redirect(`/financials/${profile.clientId}/monthly-entry`)
  }

  const isAdmin = profile.role === "ADMIN"
  const canManage = true // clients are already redirected above

  const clients = isAdmin
    ? await prisma.client.findMany({ orderBy: { name: "asc" } })
    : (
        await prisma.clientAssignment.findMany({
          where: { profileId: profile.id },
          include: { client: true },
        })
      ).map((a) => a.client)

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        userName={profile.name}
        userEmail={profile.email}
        userRole={profile.role}
        activePath="financials"
      />
      <div className="p-6 max-w-3xl mx-auto">
        <FinancialsClientList clients={clients} canManage={canManage} />
      </div>
    </div>
  )
}
