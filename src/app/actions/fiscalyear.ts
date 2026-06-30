"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function createFiscalYear(clientId: string, year: number) {
  const profile = await getCurrentProfile()
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized")
  }

  const fy = await prisma.fiscalYear.upsert({
    where: { clientId_year: { clientId, year } },
    create: { clientId, year },
    update: {},
  })

  revalidatePath(`/financials/${clientId}`)
  return fy
}
