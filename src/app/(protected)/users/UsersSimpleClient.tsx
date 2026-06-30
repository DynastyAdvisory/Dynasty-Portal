"use client"

import { useState } from "react"
import InviteUserModal from "@/app/(protected)/admin/users/InviteUserModal"
import type { Client } from "@/generated/prisma/client"

interface SimpleUser {
  id: string
  name: string | null
  email: string
  clientName: string | null
}

interface SimpleClient {
  id: string
  name: string
}

interface Props {
  users: SimpleUser[]
  clients: SimpleClient[]
  currentUserRole: string
}

export default function UsersSimpleClient({ users, clients, currentUserRole }: Props) {
  const [showInvite, setShowInvite] = useState(false)

  const mockClients = clients as unknown as Client[]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{users.length} client user{users.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowInvite(true)}
          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Invite Client
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No client users yet. Invite one to get started.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name ?? u.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                  {u.clientName && (
                    <p className="text-xs text-gray-500 mt-0.5">Company: {u.clientName}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">CLIENT</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteUserModal
          clients={mockClients}
          onClose={() => setShowInvite(false)}
          currentUserRole={currentUserRole}
        />
      )}
    </>
  )
}
