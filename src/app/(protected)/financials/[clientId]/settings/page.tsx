import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import TaxCodesPanel from "@/app/(protected)/admin/clients/[clientId]/settings/TaxCodesPanel"
import COAPanel from "@/app/(protected)/admin/clients/[clientId]/settings/COAPanel"

export default async function FinancialsSettingsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params

  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")
  if (profile.role !== "ADMIN" && profile.role !== "ACCOUNTANT") redirect(`/financials/${clientId}/monthly-entry`)

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) notFound()

  const [taxCodes, accountConfigs, customAccounts] = await Promise.all([
    prisma.taxCode.findMany({ where: { clientId }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.clientAccountConfig.findMany({ where: { clientId }, include: { taxCode: true } }),
    prisma.clientCustomAccount.findMany({ where: { clientId }, orderBy: { sortOrder: "asc" } }),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{client.name} — Tax & COA Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Configure tax codes and which accounts appear for this client</p>
      </div>
      <TaxCodesPanel clientId={clientId} taxCodes={taxCodes} />
      <COAPanel clientId={clientId} taxCodes={taxCodes} accountConfigs={accountConfigs} customAccounts={customAccounts} />
    </div>
  )
}
