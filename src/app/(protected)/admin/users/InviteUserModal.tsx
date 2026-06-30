"use client"

import { useState } from "react"
import { inviteUser } from "@/app/actions/users"
import { X, Copy, Check } from "lucide-react"
import type { Client } from "@/generated/prisma/client"

interface Props {
  clients: Client[]
  onClose: () => void
  currentUserRole?: string
}

export default function InviteUserModal({ clients, onClose, currentUserRole = "ADMIN" }: Props) {
  const [role, setRole] = useState("BOOKKEEPER")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ tempPassword: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const isStaffInviter = currentUserRole === "ACCOUNTANT" || currentUserRole === "BOOKKEEPER"
  const allowedRoles = isStaffInviter
    ? [{ value: "CLIENT", label: "Client" }]
    : [
        { value: "ACCOUNTANT", label: "Accountant" },
        { value: "BOOKKEEPER", label: "Bookkeeper" },
        { value: "CLIENT", label: "Client" },
        { value: "ADMIN", label: "Admin" },
      ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const res = await inviteUser(new FormData(e.currentTarget))
    setPending(false)
    if (res?.error) {
      setError(Object.values(res.error).flat().join(", "))
    } else if (res?.success && res.tempPassword) {
      setResult({ tempPassword: res.tempPassword, name: res.name ?? "" })
    }
  }

  function copyPassword() {
    if (!result) return
    navigator.clipboard.writeText(result.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Invite User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {result ? (
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">User created successfully</p>
                <p className="text-xs text-gray-500 mt-0.5">{result.name}'s account is ready to use immediately.</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-800">Temporary Password</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white border border-amber-200 rounded-lg px-3 py-2 text-gray-900 tracking-wider">
                  {result.tempPassword}
                </code>
                <button
                  onClick={copyPassword}
                  className="p-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 transition-colors"
                  title="Copy password"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-600" />}
                </button>
              </div>
              <p className="text-xs text-amber-700">Share this with {result.name} — they should change it after first login via Settings → Change Password.</p>
            </div>

            <button onClick={onClose} className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
              Done
            </button>
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
                {allowedRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {role === "CLIENT" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Their Company *</label>
                <select name="clientId"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {(role === "ACCOUNTANT" || role === "BOOKKEEPER") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Clients</label>
                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1 bg-white">
                  {clients.length === 0
                    ? <p className="text-xs text-gray-400 py-2 text-center">No clients yet</p>
                    : clients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded px-1">
                        <input type="checkbox" name="clientIds" value={c.id} className="rounded" />
                        <span className="text-sm text-gray-700">{c.name}</span>
                      </label>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Check all clients this person will work with. You can add more later.</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={pending}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {pending ? "Creating…" : "Create User"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
