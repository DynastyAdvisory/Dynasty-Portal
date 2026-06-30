"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"

function path(clientId: string) {
  revalidatePath(`/financials/${clientId}/monthly-entry`)
}

export async function addCustomColumn(clientId: string, fiscalYearId: string, name: string) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role === "CLIENT") throw new Error("Unauthorized")

  const last = await prisma.customColumn.findFirst({
    where: { clientId, fiscalYearId },
    orderBy: { sortOrder: "desc" },
  })

  const col = await prisma.customColumn.create({
    data: { clientId, fiscalYearId, name: name.trim(), sortOrder: (last?.sortOrder ?? 0) + 1 },
  })
  path(clientId)
  return col
}

export async function renameCustomColumn(clientId: string, columnId: string, name: string) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role === "CLIENT") throw new Error("Unauthorized")

  await prisma.customColumn.update({ where: { id: columnId }, data: { name: name.trim() } })
  path(clientId)
}

export async function deleteCustomColumn(clientId: string, columnId: string) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role === "CLIENT") throw new Error("Unauthorized")

  await prisma.customColumn.delete({ where: { id: columnId } })
  path(clientId)
}

export async function saveCustomColumnEntry(
  clientId: string,
  columnId: string,
  accountCode: string,
  grossAmount: number
) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role === "CLIENT") throw new Error("Unauthorized")

  await prisma.customColumnEntry.upsert({
    where: { customColumnId_accountCode: { customColumnId: columnId, accountCode } },
    create: { customColumnId: columnId, clientId, accountCode, grossAmount },
    update: { grossAmount },
  })
  path(clientId)
}
