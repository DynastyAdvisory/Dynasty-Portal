import { prisma } from "@/lib/prisma"
import { getCurrentProfile, canViewAuditLog } from "@/lib/auth"
import { redirect } from "next/navigation"
import AppHeader from "@/components/AppHeader"

export default async function SettingsAuditLogPage() {
  const profile = await getCurrentProfile()
  if (!profile || !canViewAuditLog(profile.role)) redirect("/hub")

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 })

  const profileIds = [...new Set(logs.map((l) => l.profileId))]
  const profiles = await prisma.profile.findMany({ where: { id: { in: profileIds } } })
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.name ?? p.email]))

  const clientIds = [...new Set(logs.map((l) => l.clientId).filter(Boolean))] as string[]
  const clients = await prisma.client.findMany({ where: { id: { in: clientIds } } })
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]))

  const ACTION_COLORS: Record<string, string> = {
    CREATE: "bg-green-50 text-green-700",
    UPDATE: "bg-blue-50 text-blue-700",
    DELETE: "bg-red-50 text-red-700",
    LOCK: "bg-amber-50 text-amber-700",
    UNLOCK: "bg-orange-50 text-orange-700",
    YEAR_END: "bg-purple-50 text-purple-700",
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader
        userName={profile.name}
        userEmail={profile.email}
        userRole={profile.role}
        activePath="audit-log"
      />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Audit Log</h1>
        {logs.length === 0 ? (
          <p className="text-base text-gray-500 text-center py-16">No activity recorded yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4 flex items-start gap-4">
                <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                  {log.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{profileMap[log.profileId] ?? log.profileId}</span>
                    {log.clientId && <span className="text-gray-600"> · {clientMap[log.clientId] ?? log.clientId}</span>}
                    <span className="text-gray-500"> · {log.tableName}</span>
                  </p>
                  {log.note && <p className="text-sm text-gray-600 mt-0.5">{log.note}</p>}
                </div>
                <time className="text-sm text-gray-500 shrink-0">
                  {new Date(log.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
