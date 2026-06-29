"use client"

import { useState } from "react"
import { inviteUser } from "@/app/actions/users"
import { X } from "lucide-react"
import type { Client } from "@/generated/prisma/client"

export default function InviteUserModal({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  const [role, setRole] = useState("BOOKKEEPER")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await inviteUser(new FormData(e.currentTarget))
    setPending(false)
    if (result?.error) {
      setError(Object.values(result.error).flat().join(", "))
    } else {
      setSuccess(true)
      setTimeout(onClose, 1500)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Invite User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {success ? (
          <div className="px-6 py-8 text-center text-sm text-green-700">
            Invite sent! They'll receive an email to set their password.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input name="email" type="email" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input name="name" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select name="role" value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ACCOUNTANT">Accountant</option>
                <option value="BOOKKEEPER">Bookkeeper</option>
                <option value="CLIENT">Client</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {(role === "CLIENT" || role === "ACCOUNTANT" || role === "BOOKKEEPER") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {role === "CLIENT" ? "Their Company *" : "Assign to Client"}
                </label>
                <select name="clientId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— None —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="pt-1 text-xs text-gray-400">
              ⚠ Inviting users requires <code>SUPABASE_SERVICE_ROLE_KEY</code> in your .env.local
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={pending}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {pending ? "Sending…" : "Send Invite"}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
