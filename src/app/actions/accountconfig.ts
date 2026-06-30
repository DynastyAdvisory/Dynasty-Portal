"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function getAccountConfigs(clientId: string) {
  return prisma.clientAccountConfig.findMany({
    where: { clientId },
    include: { taxCode: true },
  })
}

export async function setAccountHidden(clientId: string, accountCode: string, isHidden: boolean) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.clientAccountConfig.upsert({
    where: { clientId_accountCode: { clientId, accountCode } },
    create: { clientId, accountCode, isHidden },
    update: { isHidden },
  })
  revalidatePath(`/admin/clients/${clientId}/settings`)
  revalidatePath(`/financials/${clientId}/monthly-entry`)
}

export async function setAccountTaxCode(clientId: string, accountCode: string, taxCodeId: string | null) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.clientAccountConfig.upsert({
    where: { clientId_accountCode: { clientId, accountCode } },
    create: { clientId, accountCode, taxCodeId },
    update: { taxCodeId },
  })
  revalidatePath(`/admin/clients/${clientId}/settings`)
}

export async function getCustomAccounts(clientId: string) {
  return prisma.clientCustomAccount.findMany({
    where: { clientId },
    orderBy: { sortOrder: "asc" },
  })
}

const CustomAccountSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  section: z.enum(["REVENUE", "COGS", "EXPENSE", "BALANCE_SHEET"]),
  subsection: z.string().optional(),
})

export async function createCustomAccount(clientId: string, formData: FormData) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  const parsed = CustomAccountSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const existing = await prisma.clientCustomAccount.findUnique({
    where: { clientId_code: { clientId, code: parsed.data.code } },
  })
  if (existing) return { error: { code: ["This code is already in use for this client"] } }

  await prisma.clientCustomAccount.create({ data: { clientId, ...parsed.data } })
  revalidatePath(`/admin/clients/${clientId}/settings`)
  revalidatePath(`/financials/${clientId}/monthly-entry`)
}

export async function toggleCustomAccount(id: string, clientId: string, isActive: boolean) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.clientCustomAccount.update({ where: { id }, data: { isActive } })
  revalidatePath(`/admin/clients/${clientId}/settings`)
  revalidatePath(`/financials/${clientId}/monthly-entry`)
}

export async function deleteCustomAccount(id: string, clientId: string) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.clientCustomAccount.delete({ where: { id } })
  revalidatePath(`/admin/clients/${clientId}/settings`)
  revalidatePath(`/financials/${clientId}/monthly-entry`)
}
