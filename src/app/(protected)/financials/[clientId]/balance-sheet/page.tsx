import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import BalanceSheetClient from "./BalanceSheetClient"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS } from "@/lib/accounts"

export default async function BalanceSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ fy?: string }>
}) {
  const { clientId } = await params
  const { fy } = await searchParams

  const profile = await getCurrentProfile()
  if (!profile) redirect("/login")

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) notFound()

  const fiscalYear = fy
    ? await prisma.fiscalYear.findUnique({ where: { id: fy } })
    : await prisma.fiscalYear.findFirst({ where: { clientId, status: "OPEN" }, orderBy: { year: "desc" } })

  if (!fiscalYear) notFound()

  const [monthlyEntries, bsEntries] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.balanceSheetEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
  ])

  // Calculate net income from monthly entries
  const entryMap: Record<string, number> = {}
  for (const e of monthlyEntries) {
    entryMap[`${e.accountCode}-${e.month}`] = parseFloat(e.grossAmount.toString())
  }
  const rate = client.taxRate
  const netOf = (gross: number) => gross * (1 / (1 + rate))

  let totalRevenue = 0, totalCOGS = 0, totalExpenses = 0
  for (const r of [...REVENUE_ROWS, ...COGS_ROWS, ...EXPENSE_ROWS]) {
    if (r.type !== "ACCOUNT" || !r.code) continue
    let rowTotal = 0
    for (let m = 1; m <= 12; m++) rowTotal += netOf(entryMap[`${r.code}-${m}`] ?? 0)
    if (REVENUE_ROWS.some((x) => x.code === r.code)) totalRevenue += rowTotal
    else if (COGS_ROWS.some((x) => x.code === r.code)) totalCOGS += rowTotal
    else totalExpenses += rowTotal
  }
  const netIncome = totalRevenue - totalCOGS - totalExpenses

  // Calculate GST payable from monthly entries (for auto-link to BS)
  let gstCollected = 0, gstITC = 0
  for (const r of REVENUE_ROWS) {
    if (r.type !== "ACCOUNT" || !r.code || !r.taxable) continue
    for (let m = 1; m <= 12; m++) {
      const gross = entryMap[`${r.code}-${m}`] ?? 0
      gstCollected += gross * rate / (1 + rate)
    }
  }
  const { EXPENSE_ROWS: expRows } = await import("@/lib/accounts")
  for (const r of expRows) {
    if (r.type !== "ACCOUNT" || !r.code || !r.itcEligible) continue
    for (let m = 1; m <= 12; m++) {
      const gross = entryMap[`${r.code}-${m}`] ?? 0
      gstITC += gross * rate / (1 + rate)
    }
  }
  const gstPayable = gstCollected - gstITC

  const isReadOnly = profile.role === "CLIENT"

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-gray-900">Balance Sheet — FY {fiscalYear.year}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Opening = carried forward from prior year. GST Payable and Net Income are auto-calculated.
        </p>
      </div>
      <BalanceSheetClient
        clientId={clientId}
        fiscalYearId={fiscalYear.id}
        entries={bsEntries.map((e) => ({ accountCode: e.accountCode, amount: e.amount.toString(), isOpening: e.isOpening }))}
        netIncome={netIncome}
        gstPayable={gstPayable}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
