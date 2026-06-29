import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Clients</h1>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No clients yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{client.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {client.industry ?? "No industry"} · {client.taxType.replace("_", " ")} · FY ends month {client.fiscalYearEnd}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${client.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {client.active ? "Active" : "Inactive"}
                </span>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit
                </Link>
                <Link
                  href={`/financials/${client.id}/monthly-entry`}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Open →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
