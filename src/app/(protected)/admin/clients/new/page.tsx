import { createClient } from "@/app/actions/clients"
import ClientForm from "../ClientForm"

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Add New Client</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ClientForm action={createClient} />
      </div>
    </div>
  )
}
