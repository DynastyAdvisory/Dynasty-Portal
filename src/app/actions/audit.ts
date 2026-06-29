"use server"

import { prisma } from "@/lib/prisma"

interface AuditParams {
  clientId?: string
  profileId: string
  action: string
  tableName: string
  recordId: string
  oldValues?: object | null
  newValues?: object | null
  note?: string
}

export async function logAudit(params: AuditParams) {
  await prisma.auditLog.create({
    data: {
      clientId: params.clientId ?? null,
      profileId: params.profileId,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId,
      oldValues: params.oldValues ?? undefined,
      newValues: params.newValues ?? undefined,
      note: params.note ?? null,
    },
  })
}

export async function getAuditLogs(clientId?: string, limit = 100) {
  return prisma.auditLog.findMany({
    where: clientId ? { clientId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}
