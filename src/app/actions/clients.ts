"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const ClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().optional(),
  taxType: z.string(),
  taxRate: z.coerce.number().min(0).max(1),
  filingFreq: z.enum(["Monthly", "Quarterly", "Annual"]),
  craNumber: z.string().optional(),
  fiscalYearEnd: z.coerce.number().min(1).max(12),
})

type FormState = { error?: Record<string, string[]> } | undefined

export async function createClient(_prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  const parsed = ClientSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { name, industry, taxType, taxRate, filingFreq, craNumber, fiscalYearEnd } = parsed.data

  const client = await prisma.client.create({
    data: { name, industry, taxType, taxRate, filingFreq, craNumber: craNumber || null, fiscalYearEnd },
  })

  const currentYear = new Date().getFullYear()
  await prisma.fiscalYear.create({
    data: { clientId: client.id, year: currentYear },
  })

  revalidatePath("/admin/clients")
  redirect(`/admin/clients`)
}

export async function updateClient(clientId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  const parsed = ClientSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.client.update({
    where: { id: clientId },
    data: { ...parsed.data, craNumber: parsed.data.craNumber || null },
  })

  revalidatePath("/admin/clients")
  revalidatePath(`/admin/clients/${clientId}`)
}

export async function toggleClientActive(clientId: string, active: boolean) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.client.update({ where: { id: clientId }, data: { active } })
  revalidatePath("/admin/clients")
  revalidatePath("/financials")
}

// Modal-safe: no redirect, returns result
export async function saveClientModal(
  clientId: string | null,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; clientId?: string }> {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") return { error: "Unauthorized" }

  const parsed = ClientSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    return { error: first ?? "Invalid input" }
  }

  const data = { ...parsed.data, craNumber: parsed.data.craNumber || null }

  if (!clientId) {
    const client = await prisma.client.create({ data })
    const currentYear = new Date().getFullYear()
    await prisma.fiscalYear.create({ data: { clientId: client.id, year: currentYear } })
    revalidatePath("/financials")
    return { clientId: client.id }
  } else {
    await prisma.client.update({ where: { id: clientId }, data })
    revalidatePath("/financials")
    revalidatePath(`/admin/clients/${clientId}`)
    return { clientId }
  }
}

export async function getClientsForStaff() {
  const profile = await getCurrentProfile()
  if (!profile) return []

  if (profile.role === "ADMIN") {
    return prisma.client.findMany({ where: { active: true }, orderBy: { name: "asc" } })
  }

  const assignments = await prisma.clientAssignment.findMany({
    where: { profileId: profile.id },
    include: { client: true },
  })
  return assignments.map((a) => a.client).filter((c) => c.active)
}
