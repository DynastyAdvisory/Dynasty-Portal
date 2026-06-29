"use client"

import { TAX_TYPES, INDUSTRY_FILTERS } from "@/lib/accounts"
import { useActionState } from "react"
import type { Client } from "@/generated/prisma/client"

interface ClientFormProps {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>
  client?: Client
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

export default function ClientForm({ action, client }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
          <input name="name" defaultValue={client?.name} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Acme Plumbing Ltd." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry / Type</label>
          <select name="industry" defaultValue={client?.industry ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">— Select —</option>
            {INDUSTRY_FILTERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year End</label>
          <select name="fiscalYearEnd" defaultValue={client?.fiscalYearEnd ?? 12}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
          <select name="taxType" defaultValue={client?.taxType ?? "GST_5"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {TAX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate</label>
          <input name="taxRate" type="number" step="0.01" min="0" max="1"
            defaultValue={client?.taxRate ?? 0.05}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.05" />
          <p className="text-xs text-gray-400 mt-1">Decimal (e.g. 0.05 = 5%)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GST Filing Frequency</label>
          <select name="filingFreq" defaultValue={client?.filingFreq ?? "Quarterly"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option>Monthly</option>
            <option>Quarterly</option>
            <option>Annual</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CRA Business Number</label>
          <input name="craNumber" defaultValue={client?.craNumber ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional" />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Please fix the errors above.
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {pending ? "Saving…" : client ? "Save Changes" : "Create Client"}
        </button>
        <a href="/admin/clients" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Cancel
        </a>
      </div>
    </form>
  )
}
