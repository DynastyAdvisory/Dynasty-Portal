"use client"

import { useState, useTransition } from "react"
import { setAccountHidden, setAccountTaxCode, createCustomAccount, toggleCustomAccount, deleteCustomAccount } from "@/app/actions/accountconfig"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS, BALANCE_SHEET_ROWS } from "@/lib/accounts"
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react"
import type { TaxCode, ClientAccountConfig, ClientCustomAccount } from "@/generated/prisma/client"

type ConfigWithTaxCode = ClientAccountConfig & { taxCode: TaxCode | null }

interface Props {
  clientId: string
  taxCodes: TaxCode[]
  accountConfigs: ConfigWithTaxCode[]
  customAccounts: ClientCustomAccount[]
}

const ALL_STANDARD_ACCOUNTS = [
  ...REVENUE_ROWS,
  ...COGS_ROWS,
  ...EXPENSE_ROWS,
  ...BALANCE_SHEET_ROWS,
].filter((r) => r.type === "ACCOUNT" && r.code)

const SECTIONS = ["REVENUE", "COGS", "EXPENSE", "BALANCE_SHEET"] as const

export default function COAPanel({ clientId, taxCodes, accountConfigs, customAccounts }: Props) {
  const [search, setSearch] = useState("")
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const configMap = new Map(accountConfigs.map((c) => [c.accountCode, c]))
  const defaultTaxCode = taxCodes.find((t) => t.isDefault)

  const filtered = ALL_STANDARD_ACCOUNTS.filter(
    (r) => !search || r.label.toLowerCase().includes(search.toLowerCase()) || r.code!.includes(search)
  )

  function handleHide(code: string, hidden: boolean) {
    startTransition(() => setAccountHidden(clientId, code, hidden))
  }

  function handleTaxCode(code: string, taxCodeId: string) {
    startTransition(() => setAccountTaxCode(clientId, code, taxCodeId === "" ? null : taxCodeId))
  }

  function handleCreateCustom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createCustomAccount(clientId, fd)
      setShowCustomForm(false)
    })
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Chart of Accounts</h2>
        <p className="text-xs text-gray-400 mt-0.5">Hide irrelevant accounts and assign per-account tax codes</p>
      </div>

      {/* Search + add custom */}
      <div className="px-5 py-3 border-b border-gray-100 flex gap-3 items-center">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts…"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => setShowCustomForm(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-blue-300 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Custom Account
        </button>
      </div>

      {/* Standard accounts table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-2 font-medium text-gray-500 w-20">Code</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500">Account Name</th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-40">Tax Code</th>
              <th className="text-center px-3 py-2 font-medium text-gray-500 w-20">Visible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((row) => {
              const config = configMap.get(row.code!)
              const isHidden = config?.isHidden ?? false
              const taxCodeId = config?.taxCodeId ?? ""
              return (
                <tr key={row.code} className={`hover:bg-gray-50 ${isHidden ? "opacity-40" : ""}`}>
                  <td className="px-5 py-1.5 text-gray-400 font-mono">{row.code}</td>
                  <td className="px-3 py-1.5 text-gray-700">{row.label}</td>
                  <td className="px-3 py-1.5">
                    {taxCodes.length > 0 ? (
                      <select
                        value={taxCodeId}
                        onChange={(e) => handleTaxCode(row.code!, e.target.value)}
                        disabled={isPending}
                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                      >
                        <option value="">{defaultTaxCode ? `Default (${defaultTaxCode.name})` : "— Default —"}</option>
                        {taxCodes.map((tc) => (
                          <option key={tc.id} value={tc.id}>{tc.name} ({(tc.rate * 100).toFixed(1)}%)</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-300 italic">No tax codes</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button onClick={() => handleHide(row.code!, !isHidden)} disabled={isPending}
                      className={`transition-colors ${isHidden ? "text-gray-300 hover:text-gray-500" : "text-blue-500 hover:text-blue-700"}`}
                      title={isHidden ? "Show account" : "Hide account"}>
                      {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Custom accounts */}
      {(customAccounts.length > 0 || showCustomForm) && (
        <div className="border-t border-gray-200">
          <div className="px-5 py-3 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Custom Accounts</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {customAccounts.map((ca) => (
              <div key={ca.id} className={`flex items-center justify-between px-5 py-2.5 ${!ca.isActive ? "opacity-40" : ""}`}>
                <div>
                  <span className="text-xs font-mono text-gray-400 mr-2">{ca.code}</span>
                  <span className="text-sm text-gray-800">{ca.name}</span>
                  <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{ca.section}</span>
                  {ca.subsection && <span className="ml-1 text-xs text-gray-400">{ca.subsection}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startTransition(() => toggleCustomAccount(ca.id, clientId, !ca.isActive))}
                    className={`text-xs font-medium transition-colors ${ca.isActive ? "text-gray-400 hover:text-gray-600" : "text-blue-600 hover:text-blue-800"}`}>
                    {ca.isActive ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => startTransition(() => deleteCustomAccount(ca.id, clientId))}
                    className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom account form */}
      {showCustomForm && (
        <form onSubmit={handleCreateCustom} className="border-t border-gray-200 px-5 py-4 bg-blue-50 space-y-3">
          <p className="text-xs font-semibold text-gray-700">Add Custom Account</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Code *</label>
              <input name="code" required placeholder="e.g. 40999"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name *</label>
              <input name="name" required placeholder="e.g. Custom Revenue"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Section *</label>
              <select name="section" className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {SECTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Subsection (optional)</label>
              <input name="subsection" placeholder="e.g. Other Revenue"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Add Account
            </button>
            <button type="button" onClick={() => setShowCustomForm(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </form>
      )}
    </section>
  )
}
