import { getCurrentProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdminShell from "./AdminShell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "ADMIN") redirect("/hub")

  return <AdminShell userName={profile.email}>{children}</AdminShell>
}
