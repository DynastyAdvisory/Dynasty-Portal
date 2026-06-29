import { getCurrentProfile } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import ClientFinancialsShell from "./ClientFinancialsShell"

export default async function ClientFinancialsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) notFound()

  // CLIENT role: can only see their own company
  if (profile.role === "CLIENT" && profile.clientId !== clientId) {
    redirect("/hub")
  }

  // Staff: must be ADMIN or have an assignment
  if (profile.role !== "ADMIN" && profile.role !== "CLIENT") {
    const assignment = await prisma.clientAssignment.findUnique({
      where: { clientId_profileId: { clientId, profileId: profile.id } },
    })
    if (!assignment) redirect("/financials")
  }

  // Load or create current fiscal year
  const currentYear = new Date().getFullYear()
  const fiscalYears = await prisma.fiscalYear.findMany({
    where: { clientId },
    orderBy: { year: "desc" },
  })

  let openYear = fiscalYears.find((y) => y.status === "OPEN")
  if (!openYear) {
    openYear = await prisma.fiscalYear.upsert({
      where: { clientId_year: { clientId, year: currentYear } },
      create: { clientId, year: currentYear },
      update: {},
    })
  }

  return (
    <ClientFinancialsShell
      clientId={clientId}
      clientName={client.name}
      fiscalYears={fiscalYears}
      activeFiscalYearId={openYear.id}
      userName={profile.email}
      isAdmin={profile.role === "ADMIN" || profile.role === "ACCOUNTANT"}
    >
      {children}
    </ClientFinancialsShell>
  )
}
