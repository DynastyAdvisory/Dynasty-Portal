import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import MonthlyEntryClient from "./MonthlyEntryClient"

export default async function MonthlyEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ fy?: string }>
}) {
  const { clientId } = await params
  const { fy } = await searchParams

  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) notFound()

  // Find fiscal year
  let fiscalYear = fy
    ? await prisma.fiscalYear.findUnique({ where: { id: fy } })
    : await prisma.fiscalYear.findFirst({ where: { clientId, status: "OPEN" }, orderBy: { year: "desc" } })

  if (!fiscalYear) {
    const currentYear = new Date().getFullYear()
    fiscalYear = await prisma.fiscalYear.upsert({
      where: { clientId_year: { clientId, year: currentYear } },
      create: { clientId, year: currentYear },
      update: {},
    })
  }

  const [entries, locks] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.periodLock.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
  ])

  const isAdmin = profile.role === "ADMIN" || profile.role === "ACCOUNTANT" || profile.role === "BOOKKEEPER"

  return (
    <div>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Monthly Entry — FY {fiscalYear.year}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Enter gross (tax-inclusive) amounts. Auto-saves on field exit.</p>
        </div>
      </div>
      <MonthlyEntryClient
        clientId={clientId}
        fiscalYearId={fiscalYear.id}
        taxRate={client.taxRate}
        entries={entries.map((e) => ({ accountCode: e.accountCode, month: e.month, grossAmount: e.grossAmount.toString() }))}
        locks={locks.map((l) => ({ month: l.month, lockedAt: l.lockedAt, unlockedAt: l.unlockedAt }))}
        isAdmin={isAdmin}
      />
    </div>
  )
}
