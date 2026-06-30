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

  const [entries, locks, taxCodes, accountConfigs, customAccounts] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.periodLock.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.taxCode.findMany({ where: { clientId }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.clientAccountConfig.findMany({ where: { clientId } }),
    prisma.clientCustomAccount.findMany({ where: { clientId, isActive: true }, orderBy: { sortOrder: "asc" } }),
  ])

  const isStaff = profile.role !== "CLIENT"

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
        defaultTaxRate={client.taxRate}
        entries={entries.map((e) => ({ accountCode: e.accountCode, month: e.month, grossAmount: e.grossAmount.toString() }))}
        locks={locks.map((l) => ({ month: l.month, lockedAt: l.lockedAt, unlockedAt: l.unlockedAt }))}
        taxCodes={taxCodes.map((t) => ({ id: t.id, name: t.name, rate: t.rate, isDefault: t.isDefault }))}
        accountConfigs={accountConfigs.map((c) => ({ accountCode: c.accountCode, isHidden: c.isHidden, taxCodeId: c.taxCodeId }))}
        customAccounts={customAccounts.map((c) => ({ code: c.code, name: c.name, section: c.section, subsection: c.subsection ?? undefined }))}
        isStaff={isStaff}
      />
    </div>
  )
}
