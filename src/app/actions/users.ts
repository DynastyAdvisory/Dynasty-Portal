"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { z } from "zod"

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["ADMIN", "ACCOUNTANT", "BOOKKEEPER", "CLIENT"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function inviteUser(formData: FormData) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("Unauthorized")

  const canInviteStaff = profile.role === "ADMIN"
  const canInviteClient = profile.role === "ADMIN" || profile.role === "ACCOUNTANT" || profile.role === "BOOKKEEPER"
  if (!canInviteClient) throw new Error("Unauthorized")

  const parsed = InviteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { email, name, role, password } = parsed.data

  if (!canInviteStaff && role !== "CLIENT") {
    return { error: { role: ["You can only invite client users"] } }
  }

  const clientIds = formData.getAll("clientIds") as string[]
  const singleClientId = formData.get("clientId") as string | null

  const supabaseAdmin = getAdminClient()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) return { error: { _form: [error.message] } }

  await prisma.profile.create({
    data: {
      id: data.user.id,
      email,
      name,
      role,
      clientId: role === "CLIENT" ? (singleClientId || clientIds[0] || null) : null,
    },
  })

  if ((role === "ACCOUNTANT" || role === "BOOKKEEPER") && clientIds.length > 0) {
    await prisma.clientAssignment.createMany({
      data: clientIds.map((clientId) => ({ clientId, profileId: data.user.id })),
      skipDuplicates: true,
    })
  }

  revalidatePath("/admin/users")
  revalidatePath("/users")
  return { success: true, tempPassword: password, name }
}

export async function updateUserRole(profileId: string, role: "ADMIN" | "ACCOUNTANT" | "BOOKKEEPER" | "CLIENT") {
  const me = await getCurrentProfile()
  if (!me || me.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.profile.update({ where: { id: profileId }, data: { role } })
  revalidatePath("/admin/users")
}

export async function assignUserToClient(profileId: string, clientId: string) {
  const me = await getCurrentProfile()
  if (!me || me.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.clientAssignment.upsert({
    where: { clientId_profileId: { clientId, profileId } },
    create: { clientId, profileId },
    update: {},
  })
  revalidatePath("/admin/users")
}

export async function removeUserFromClient(profileId: string, clientId: string) {
  const me = await getCurrentProfile()
  if (!me || me.role !== "ADMIN") throw new Error("Unauthorized")

  await prisma.clientAssignment.deleteMany({ where: { profileId, clientId } })
  revalidatePath("/admin/users")
}

export async function deleteUser(profileId: string) {
  const me = await getCurrentProfile()
  if (!me || me.role !== "ADMIN") throw new Error("Unauthorized")

  const supabaseAdmin = getAdminClient()
  await supabaseAdmin.auth.admin.deleteUser(profileId)
  await prisma.profile.delete({ where: { id: profileId } })
  revalidatePath("/admin/users")
}
