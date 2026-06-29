"use client"

import { useState } from "react"
import { updateUserRole, removeUserFromClient, deleteUser } from "@/app/actions/users"
import InviteUserModal from "./InviteUserModal"
import type { Profile, Client, ClientAssignment } from "@/generated/prisma/client"

type ProfileWithRelations = Profile & {
  client: Client | null
  assignments: (ClientAssignment & { client: Client })[]
}

const ROLE_COLORS = {
  ADMIN: "bg-purple-50 text-purple-700",
  ACCOUNTANT: "bg-blue-50 text-blue-700",
  BOOKKEEPER: "bg-teal-50 text-teal-700",
  CLIENT: "bg-gray-100 text-gray-600",
}

export default function UsersClient({ profiles, clients }: { profiles: ProfileWithRelations[]; clients: Client[] }) {
  const [tab, setTab] = useState<"internal" | "clients">("internal")
  const [showInvite, setShowInvite] = useState(false)

  const internalProfiles = profiles.filter((p) => p.role !== "CLIENT")
  const clientProfiles = profiles.filter((p) => p.role === "CLIENT")
  const shown = tab === "internal" ? internalProfiles : clientProfiles

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Users</h1>
          <div className="flex gap-1 mt-2">
            {(["internal", "clients"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors capitalize ${
                  tab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {t === "internal" ? `Internal (${internalProfiles.length})` : `Clients (${clientProfiles.length})`}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Invite User
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No users in this category yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {shown.map((profile) => (
            <div key={profile.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{profile.name ?? profile.email}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile.role]}`}>
                      {profile.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
                  {profile.role === "CLIENT" && profile.client && (
                    <p className="text-xs text-gray-500 mt-1">Client: {profile.client.name}</p>
                  )}
                  {(profile.role === "ACCOUNTANT" || profile.role === "BOOKKEEPER") && profile.assignments.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned: {profile.assignments.map((a) => a.client.name).join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select defaultValue={profile.role}
                    onChange={(e) => updateUserRole(profile.id, e.target.value as Profile["role"])}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                    <option value="ADMIN">Admin</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="BOOKKEEPER">Bookkeeper</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showInvite && (
        <InviteUserModal clients={clients} onClose={() => setShowInvite(false)} />
      )}
    </div>
  )
}
