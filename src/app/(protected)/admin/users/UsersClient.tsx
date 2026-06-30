"use client"

import { useState, useTransition } from "react"
import { updateUserRole, assignUserToClient, removeUserFromClient, resetUserPassword } from "@/app/actions/users"
import InviteUserModal from "./InviteUserModal"
import { ChevronDown, ChevronRight, X, Plus, KeyRound, Eye, EyeOff, Check } from "lucide-react"
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

function ResetPasswordPopover({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [pw, setPw] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleReset() {
    if (pw.length < 8) { setErr("Min. 8 characters"); return }
    startTransition(async () => {
      try {
        await resetUserPassword(profileId, pw)
        setDone(true)
        setTimeout(onClose, 1500)
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Error resetting password")
      }
    })
  }

  return (
    <div
      className="absolute right-0 top-full z-40 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-64 mt-1"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-semibold text-gray-800 mb-3">Reset Password</p>
      {done ? (
        <div className="flex items-center gap-2 text-green-700 text-sm py-1">
          <Check className="w-4 h-4" /> Password updated
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(null) }}
              placeholder="New password (min. 8 chars)"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-400"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleReset(); if (e.key === "Escape") onClose() }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Set Password
            </button>
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function UserRow({
  profile,
  clients,
  isAdmin,
}: {
  profile: ProfileWithRelations
  clients: Client[]
  isAdmin: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [, startTransition] = useTransition()
  const [addClientId, setAddClientId] = useState("")
  const [showReset, setShowReset] = useState(false)

  const assignedIds = new Set(profile.assignments.map((a) => a.clientId))
  const unassignedClients = clients.filter((c) => !assignedIds.has(c.id))
  const canExpand = isAdmin && (profile.role === "ACCOUNTANT" || profile.role === "BOOKKEEPER")

  function handleAssign() {
    if (!addClientId) return
    startTransition(async () => { await assignUserToClient(profile.id, addClientId) })
    setAddClientId("")
  }

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {canExpand ? (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1.5 text-base font-medium text-gray-900 hover:text-blue-700 transition-colors"
                >
                  {expanded
                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                    : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  {profile.name ?? profile.email}
                </button>
              ) : (
                <span className="text-base font-medium text-gray-900">{profile.name ?? profile.email}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[profile.role]}`}>
                {profile.role}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5 ml-5">{profile.email}</p>

            {!expanded && (profile.role === "ACCOUNTANT" || profile.role === "BOOKKEEPER") && (
              <div className="ml-5 mt-1.5 flex flex-wrap gap-1">
                {profile.assignments.length === 0
                  ? <span className="text-sm text-gray-400">No clients assigned</span>
                  : profile.assignments.map((a) => (
                    <span key={a.clientId} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {a.client.name}
                    </span>
                  ))}
              </div>
            )}
            {profile.role === "CLIENT" && profile.client && (
              <p className="text-sm text-gray-500 mt-0.5 ml-5">Company: {profile.client.name}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowReset((v) => !v)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Reset password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                {showReset && (
                  <ResetPasswordPopover profileId={profile.id} onClose={() => setShowReset(false)} />
                )}
              </div>
            )}
            {isAdmin && (
              <select
                defaultValue={profile.role}
                onChange={(e) => startTransition(() => updateUserRole(profile.id, e.target.value as Profile["role"]))}
                className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="ADMIN">Admin</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="BOOKKEEPER">Bookkeeper</option>
                <option value="CLIENT">Client</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {expanded && (profile.role === "ACCOUNTANT" || profile.role === "BOOKKEEPER") && (
        <div className="mx-5 mb-4 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Client Assignments</p>
          <div className="space-y-1.5">
            {profile.assignments.length === 0
              ? <p className="text-sm text-gray-400">No clients assigned yet.</p>
              : profile.assignments.map((a) => (
                <div key={a.clientId} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-800">{a.client.name}</span>
                  <button
                    onClick={() => startTransition(async () => { await removeUserFromClient(profile.id, a.clientId) })}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    title="Remove from client"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
          {unassignedClients.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={addClientId}
                onChange={(e) => setAddClientId(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">— Add a client —</option>
                {unassignedClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!addClientId}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          {unassignedClients.length === 0 && profile.assignments.length > 0 && (
            <p className="text-sm text-gray-400">All clients are assigned.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function UsersClient({
  profiles,
  clients,
  currentUserRole = "ADMIN",
}: {
  profiles: ProfileWithRelations[]
  clients: Client[]
  currentUserRole?: string
}) {
  const isAdmin = currentUserRole === "ADMIN"
  const [tab, setTab] = useState<"internal" | "clients">(isAdmin ? "internal" : "clients")
  const [showInvite, setShowInvite] = useState(false)

  const internalProfiles = profiles.filter((p) => p.role !== "CLIENT")
  const clientProfiles = profiles.filter((p) => p.role === "CLIENT")
  const shown = tab === "internal" ? internalProfiles : clientProfiles

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1.5">
          {isAdmin && (
            <button
              onClick={() => setTab("internal")}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                tab === "internal" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Internal ({internalProfiles.length})
            </button>
          )}
          <button
            onClick={() => setTab("clients")}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              tab === "clients" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Clients ({clientProfiles.length})
          </button>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Invite User
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-base text-gray-400 text-center py-16">No users in this category yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          {shown.map((profile) => (
            <UserRow key={profile.id} profile={profile} clients={clients} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {showInvite && (
        <InviteUserModal clients={clients} onClose={() => setShowInvite(false)} currentUserRole={currentUserRole} />
      )}
    </div>
  )
}
