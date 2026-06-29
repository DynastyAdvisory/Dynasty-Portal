import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { updateClient, toggleClientActive } from "@/app/actions/clients"
import ClientForm from "../ClientForm"

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) notFound()

  const boundUpdate = updateClient.bind(null, clientId)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-gray-900">Edit Client — {client.name}</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ClientForm action={boundUpdate} client={client} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Status</h2>
        <form action={toggleClientActive.bind(null, clientId, !client.active)}>
          <button type="submit"
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              client.active
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}>
            {client.active ? "Deactivate Client" : "Reactivate Client"}
          </button>
        </form>
      </div>
    </div>
  )
}
