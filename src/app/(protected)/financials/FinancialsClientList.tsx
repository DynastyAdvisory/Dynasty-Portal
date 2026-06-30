"use client"

import { useState, useActionState, useTransition } from "react"
import Link from "next/link"
import { saveClientModal, toggleClientActive } from "@/app/actions/clients"
import { TAX_TYPES, INDUSTRY_FILTERS } from "@/lib/accounts"
import { Edit2, Plus, X, Archive, RotateCcw } from "lucide-react"
import type { Client } from "@/generated/prisma/client"

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

type ModalState = { error?: string; clientId?: string } | undefined

function ClientModal({ client, onClose }: { client?: Client; onClose: () => void }) {
  const clientId = client?.id ?? null
  const boundAction = (prev: ModalState, fd: FormData) => saveClientModal(clientId, prev, fd)
  const [state, formAction, pending] = useActionState(boundAction, undefined)

  if (state && !state.error && state.clientId) {
    onClose()
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{client ? `Edit — ${client.name}` : "Add Client"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <form action={formAction} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name *</label>
            <input name="name" defaultValue={client?.name} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Acme Plumbing Ltd." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Industry</label>
              <select name="industry" defaultValue={client?.industry ?? ""}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Select —</option>
                {INDUSTRY_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fiscal Year End</label>
              <select name="fiscalYearEnd" defaultValue={client?.fiscalYearEnd ?? 12}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tax Type</label>
              <select name="taxType" defaultValue={client?.taxType ?? "GST_5"}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TAX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tax Rate</label>
              <input name="taxRate" type="number" step="0.01" min="0" max="1"
                defaultValue={client?.taxRate ?? 0.05}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.05" />
              <p className="text-xs text-gray-600 mt-1">Decimal — 0.05 = 5%</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">GST Filing</label>
              <select name="filingFreq" defaultValue={client?.filingFreq ?? "Quarterly"}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">CRA Business Number</label>
              <input name="craNumber" defaultValue={client?.craNumber ?? ""}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional" />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {pending ? "Saving…" : client ? "Save Changes" : "Create Client"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ArchiveButton({ client }: { client: Client }) {
  const [, startTransition] = useTransition()
  const isActive = client.active
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        startTransition(async () => { await toggleClientActive(client.id, !isActive) })
      }}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-colors ${
        isActive
          ? "text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
          : "text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
      }`}
      title={isActive ? "Archive this client" : "Restore this client"}
    >
      {isActive ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
      {isActive ? "Archive" : "Restore"}
    </button>
  )
}

export default function FinancialsClientList({ clients, isAdmin }: { clients: Client[]; isAdmin: boolean }) {
  const [modal, setModal] = useState<"new" | Client | null>(null)
  const [showArchive, setShowArchive] = useState(false)

  const activeClients = clients.filter((c) => c.active)
  const archivedClients = clients.filter((c) => !c.active)
  const shown = showArchive ? archivedClients : activeClients

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          {isAdmin && archivedClients.length > 0 && (
            <button
              onClick={() => setShowArchive((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                showArchive
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "text-gray-600 border-gray-300 hover:bg-gray-100"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              {showArchive ? "Viewing Archive" : `Archive (${archivedClients.length})`}
            </button>
          )}
        </div>
        {isAdmin && !showArchive && (
          <button
            onClick={() => setModal("new")}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16">
          {showArchive ? (
            <p className="text-base text-gray-500">No archived clients.</p>
          ) : (
            <>
              <p className="text-base text-gray-500 mb-4">No clients yet.</p>
              {isAdmin && (
                <button onClick={() => setModal("new")} className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
                  + Add your first client
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map((client) => (
            <div key={client.id} className="relative">
              <Link
                href={`/financials/${client.id}/monthly-entry`}
                className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{client.industry ?? "—"} · {client.taxType.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {isAdmin && (
                    <>
                      <ArchiveButton client={client} />
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModal(client) }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit client"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <span className="text-gray-400 text-lg">›</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ClientModal
          client={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
