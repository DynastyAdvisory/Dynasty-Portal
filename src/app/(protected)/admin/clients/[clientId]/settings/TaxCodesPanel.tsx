"use client"

import { useState, useTransition } from "react"
import { createTaxCode, updateTaxCode, deleteTaxCode, setDefaultTaxCode } from "@/app/actions/taxcodes"
import { Star, Trash2, Plus } from "lucide-react"
import type { TaxCode } from "@/generated/prisma/client"

export default function TaxCodesPanel({ clientId, taxCodes }: { clientId: string; taxCodes: TaxCode[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createTaxCode(clientId, fd)
      setShowAdd(false)
    })
  }

  function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateTaxCode(id, clientId, fd)
      setEditId(null)
    })
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Tax Codes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Define which tax rates apply to this client's accounts</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Tax Code
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {taxCodes.length === 0 && !showAdd && (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No tax codes yet. Add one above.</p>
        )}

        {taxCodes.map((tc) => (
          <div key={tc.id} className="px-5 py-3">
            {editId === tc.id ? (
              <form onSubmit={(e) => handleUpdate(tc.id, e)} className="flex items-center gap-3">
                <input name="name" defaultValue={tc.name} required
                  className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="rate" type="number" step="0.001" min="0" max="1" defaultValue={tc.rate}
                  className="w-24 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" name="isDefault" defaultChecked={tc.isDefault} className="rounded" />
                  Default
                </label>
                <button type="submit" disabled={isPending}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {tc.isDefault && <span title="Default"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" /></span>}
                  <span className="text-sm font-medium text-gray-900">{tc.name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{(tc.rate * 100).toFixed(2).replace(/\.00$/, "")}%</span>
                </div>
                <div className="flex items-center gap-2">
                  {!tc.isDefault && (
                    <button onClick={() => startTransition(() => setDefaultTaxCode(tc.id, clientId))}
                      className="text-xs text-gray-400 hover:text-amber-600 transition-colors" aria-label="Set as default">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setEditId(tc.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                  <button onClick={() => startTransition(() => deleteTaxCode(tc.id, clientId))}
                    className="text-red-400 hover:text-red-600 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAdd && (
          <form onSubmit={handleCreate} className="px-5 py-3 bg-blue-50 flex items-center gap-3 flex-wrap">
            <input name="name" placeholder="e.g. GST 5%" required autoFocus
              className="flex-1 min-w-32 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            <input name="rate" type="number" step="0.001" min="0" max="1" placeholder="0.05"
              className="w-24 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" name="isDefault" className="rounded" />
              Default
            </label>
            <button type="submit" disabled={isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </form>
        )}
      </div>
    </section>
  )
}
