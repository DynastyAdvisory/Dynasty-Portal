"use client"

import AppShell from "@/components/AppShell"
import { Users, Building2, FileText, LayoutDashboard } from "lucide-react"

export default function AdminShell({ children, userName }: { children: React.ReactNode; userName?: string }) {
  return (
    <AppShell
      title="Dynasty Portal"
      subtitle="Admin"
      backHref="/hub"
      backLabel="Hub"
      userName={userName}
      navItems={[
        { label: "Clients", href: "/admin/clients", icon: <Building2 className="w-4 h-4" /> },
        { label: "Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
        { label: "Audit Log", href: "/admin/audit-log", icon: <FileText className="w-4 h-4" /> },
      ]}
    >
      {children}
    </AppShell>
  )
}
