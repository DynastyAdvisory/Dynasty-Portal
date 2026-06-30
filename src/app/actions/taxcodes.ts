"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const TaxCodeSchema = z.object({
  name: z.string().min(1),
  rate: z.coerce.number().min(0).max(1),
  isDefault: z.coerce.boolean().optional(),
})

export async function getTaxCodes(clientId: string) {
  return prisma.taxCode.findMany({
    where: { clientId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  })
}

export async function createTaxCode(clientId: string, formData: FormData) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  const parsed = TaxCodeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { name, rate, isDefault } = parsed.data

  // If this is default, clear other defaults first
  if (isDefault) {
    await prisma.taxCode.updateMany({ where: { clientId }, data: { isDefault: false } })
  }

  await prisma.taxCode.create({ data: { clientId, name, rate, isDefault: isDefault ?? false } })
  revalidatePath(`/admin/clients/${clientId}/settings`)
}

export async function updateTaxCode(id: string, clientId: string, formData: FormData) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  const parsed = TaxCodeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { name, rate, isDefault } = parsed.data

  if (isDefault) {
    await prisma.taxCode.updateMany({ where: { clientId }, data: { isDefault: false } })
  }

  await prisma.taxCode.update({ where: { id }, data: { name, rate, isDefault: isDefault ?? false } })
  revalidatePath(`/admin/clients/${clientId}/settings`)
}

export async function deleteTaxCode(id: string, clientId: string) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  // Remove references from account configs first
  await prisma.clientAccountConfig.updateMany({ where: { taxCodeId: id }, data: { taxCodeId: null } })
  await prisma.taxCode.delete({ where: { id } })
  revalidatePath(`/admin/clients/${clientId}/settings`)
}

export async function setDefaultTaxCode(id: string, clientId: string) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.taxCode.updateMany({ where: { clientId }, data: { isDefault: false } })
  await prisma.taxCode.update({ where: { id }, data: { isDefault: true } })
  revalidatePath(`/admin/clients/${clientId}/settings`)
}
