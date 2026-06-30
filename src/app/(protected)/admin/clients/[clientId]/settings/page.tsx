import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import TaxCodesPanel from "./TaxCodesPanel"
import COAPanel from "./COAPanel"

export default async function ClientSettingsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params

  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") redirect("/hub")

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
        <h1 className="text-lg font-semibold text-gray-900">{client.name} — Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Tax codes and Chart of Accounts customisation for this client</p>
      </div>

      <TaxCodesPanel clientId={clientId} taxCodes={taxCodes} />
      <COAPanel clientId={clientId} taxCodes={taxCodes} accountConfigs={accountConfigs} customAccounts={customAccounts} />
    </div>
  )
}
