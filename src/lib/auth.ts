import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import type { Role } from "@/generated/prisma/enums"

export async function getCurrentProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  return prisma.profile.findUnique({
    where: { id: user.id },
    include: { client: true },
  })
}

export function canViewAuditLog(role: Role): boolean {
  return role === "ADMIN" || role === "ACCOUNTANT"
}

export function isStaff(role: Role): boolean {
  return role === "ADMIN" || role === "ACCOUNTANT" || role === "BOOKKEEPER"
}

export function isAdmin(role: Role): boolean {
  return role === "ADMIN"
}

export function isClient(role: Role): boolean {
  return role === "CLIENT"
}
