"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logAudit } from "./audit"

export async function getOrCreateFiscalYear(clientId: string, year: number) {
  return prisma.fiscalYear.upsert({
    where: { clientId_year: { clientId, year } },
    create: { clientId, year },
    update: {},
  })
}

export async function getMonthlyEntries(clientId: string, fiscalYearId: string) {
  return prisma.monthlyEntry.findMany({
    where: { clientId, fiscalYearId },
  })
}

export async function saveMonthlyEntry(
  clientId: string,
  fiscalYearId: string,
  accountCode: string,
  month: number,
  grossAmount: number
) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("Unauthorized")

  const isLocked = await prisma.periodLock.findUnique({
    where: { clientId_fiscalYearId_month: { clientId, fiscalYearId, month } },
  })
  if (isLocked?.unlockedAt === null && isLocked?.lockedAt) {
    throw new Error("This period is locked")
  }

  const existing = await prisma.monthlyEntry.findUnique({
    where: { clientId_fiscalYearId_accountCode_month: { clientId, fiscalYearId, accountCode, month } },
  })

  const entry = await prisma.monthlyEntry.upsert({
    where: { clientId_fiscalYearId_accountCode_month: { clientId, fiscalYearId, accountCode, month } },
    create: { clientId, fiscalYearId, accountCode, month, grossAmount, updatedBy: profile.id },
    update: { grossAmount, updatedBy: profile.id },
  })

  await logAudit({
    clientId,
    profileId: profile.id,
    action: "UPDATE",
    tableName: "monthly_entries",
    recordId: entry.id,
    oldValues: existing ? { grossAmount: existing.grossAmount } : null,
    newValues: { grossAmount, accountCode, month },
  })

  revalidatePath(`/financials/${clientId}/monthly-entry`)
  return entry
}

export async function getBalanceSheetEntries(clientId: string, fiscalYearId: string) {
  return prisma.balanceSheetEntry.findMany({
    where: { clientId, fiscalYearId },
  })
}

export async function saveBalanceSheetEntry(
  clientId: string,
  fiscalYearId: string,
  accountCode: string,
  amount: number,
  isOpening: boolean
) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("Unauthorized")

  const entry = await prisma.balanceSheetEntry.upsert({
    where: { clientId_fiscalYearId_accountCode_isOpening: { clientId, fiscalYearId, accountCode, isOpening } },
    create: { clientId, fiscalYearId, accountCode, amount, isOpening, updatedBy: profile.id },
    update: { amount, updatedBy: profile.id },
  })

  revalidatePath(`/financials/${clientId}/balance-sheet`)
  return entry
}

export async function getPeriodLocks(clientId: string, fiscalYearId: string) {
  return prisma.periodLock.findMany({ where: { clientId, fiscalYearId } })
}

export async function lockPeriod(clientId: string, fiscalYearId: string, month: number) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("Unauthorized")

  const lock = await prisma.periodLock.upsert({
    where: { clientId_fiscalYearId_month: { clientId, fiscalYearId, month } },
    create: { clientId, fiscalYearId, month, lockedBy: profile.id },
    update: { lockedAt: new Date(), lockedBy: profile.id, unlockedAt: null, unlockedBy: null, unlockNote: null },
  })

  await logAudit({ clientId, profileId: profile.id, action: "LOCK", tableName: "period_locks", recordId: lock.id, newValues: { month } })
  revalidatePath(`/financials/${clientId}/monthly-entry`)
}

export async function unlockPeriod(clientId: string, fiscalYearId: string, month: number, note: string) {
  const profile = await getCurrentProfile()
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "ACCOUNTANT" && profile.role !== "BOOKKEEPER")) {
    throw new Error("Unauthorized")
  }

  const lock = await prisma.periodLock.update({
    where: { clientId_fiscalYearId_month: { clientId, fiscalYearId, month } },
    data: { unlockedAt: new Date(), unlockedBy: profile.id, unlockNote: note },
  })

  await logAudit({ clientId, profileId: profile.id, action: "UNLOCK", tableName: "period_locks", recordId: lock.id, newValues: { month, note } })
  revalidatePath(`/financials/${clientId}/monthly-entry`)
}

export async function closeYearAndCarryForward(clientId: string, fiscalYearId: string) {
  const profile = await getCurrentProfile()
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "ACCOUNTANT")) throw new Error("Unauthorized")

  const fiscalYear = await prisma.fiscalYear.findUnique({ where: { id: fiscalYearId } })
  if (!fiscalYear) throw new Error("Fiscal year not found")

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) throw new Error("Client not found")

  const closingEntries = await prisma.balanceSheetEntry.findMany({
    where: { clientId, fiscalYearId, isOpening: false },
  })

  const nextYear = fiscalYear.year + 1
  const nextFiscalYear = await prisma.fiscalYear.upsert({
    where: { clientId_year: { clientId, year: nextYear } },
    create: { clientId, year: nextYear },
    update: {},
  })

  // Carry forward each closing balance as the next year's opening balance
  for (const entry of closingEntries) {
    // Retained earnings (3010) gets net income added automatically via opening BS
    await prisma.balanceSheetEntry.upsert({
      where: { clientId_fiscalYearId_accountCode_isOpening: { clientId, fiscalYearId: nextFiscalYear.id, accountCode: entry.accountCode, isOpening: true } },
      create: { clientId, fiscalYearId: nextFiscalYear.id, accountCode: entry.accountCode, amount: entry.amount, isOpening: true, updatedBy: profile.id },
      update: { amount: entry.amount, updatedBy: profile.id },
    })
  }

  await prisma.fiscalYear.update({ where: { id: fiscalYearId }, data: { status: "CLOSED" } })

  await logAudit({ clientId, profileId: profile.id, action: "YEAR_END", tableName: "fiscal_years", recordId: fiscalYearId, newValues: { closedYear: fiscalYear.year, nextYear } })

  revalidatePath(`/financials/${clientId}`)
  return nextFiscalYear
}
