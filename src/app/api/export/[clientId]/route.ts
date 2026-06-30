import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"
import { getCurrentProfile } from "@/lib/auth"
import { REVENUE_ROWS, COGS_ROWS, EXPENSE_ROWS, BALANCE_SHEET_ROWS, MONTHS } from "@/lib/accounts"

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) return new NextResponse("Unauthorized", { status: 401 })

  const { clientId } = await params
  const fyId = req.nextUrl.searchParams.get("fy")

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return new NextResponse("Not found", { status: 404 })

  const fiscalYear = fyId
    ? await prisma.fiscalYear.findUnique({ where: { id: fyId } })
    : await prisma.fiscalYear.findFirst({ where: { clientId, status: "OPEN" }, orderBy: { year: "desc" } })
  if (!fiscalYear) return new NextResponse("No fiscal year", { status: 404 })

  const [entries, bsEntries, taxCodes, accountConfigs, customAccounts, customColumns, customColumnEntries] = await Promise.all([
    prisma.monthlyEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.balanceSheetEntry.findMany({ where: { clientId, fiscalYearId: fiscalYear.id } }),
    prisma.taxCode.findMany({ where: { clientId } }),
    prisma.clientAccountConfig.findMany({ where: { clientId } }),
    prisma.clientCustomAccount.findMany({ where: { clientId, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.customColumn.findMany({ where: { clientId, fiscalYearId: fiscalYear.id }, orderBy: { sortOrder: "asc" } }),
    prisma.customColumnEntry.findMany({ where: { clientId, customColumn: { fiscalYearId: fiscalYear.id } } }),
  ])

  // ── shared lookup maps ──────────────────────────────────────────────────────
  const entryMap: Record<string, number> = {}
  const entryTaxOverride = new Map<string, string>()
  for (const e of entries) {
    entryMap[`${e.accountCode}-${e.month}`] = parseFloat(e.grossAmount.toString())
    if (e.taxCodeId) entryTaxOverride.set(`${e.accountCode}-${e.month}`, e.taxCodeId)
  }

  const ccEntryMap: Record<string, number> = {}
  for (const e of customColumnEntries) {
    ccEntryMap[`${e.customColumnId}-${e.accountCode}`] = parseFloat(e.grossAmount.toString())
  }

  const hiddenSet = new Set(accountConfigs.filter((c) => c.isHidden).map((c) => c.accountCode))
  const taxCodeById = new Map(taxCodes.map((t) => [t.id, t]))
  const acctTaxMap = new Map(accountConfigs.filter((c) => c.taxCodeId).map((c) => [c.accountCode, c.taxCodeId!]))
  const defaultTaxCode = taxCodes.find((t) => t.isDefault)
  const fallbackRate = defaultTaxCode?.rate ?? client.taxRate

  function getRate(code: string, month?: number) {
    if (month !== undefined) {
      const ov = entryTaxOverride.get(`${code}-${month}`)
      if (ov) return taxCodeById.get(ov)?.rate ?? fallbackRate
    }
    const tcId = acctTaxMap.get(code)
    return tcId ? (taxCodeById.get(tcId)?.rate ?? fallbackRate) : fallbackRate
  }

  function netOf(gross: number, code: string, month?: number) {
    const r = getRate(code, month)
    return r > 0 ? gross / (1 + r) : gross
  }

  const customBySection: Record<string, typeof customAccounts> = {}
  for (const ca of customAccounts) {
    if (!customBySection[ca.section]) customBySection[ca.section] = []
    customBySection[ca.section].push(ca)
  }

  const n = (v: number) => Math.round(v * 100) / 100

  // ── Sheet 1: Monthly Entry (Gross) ──────────────────────────────────────────
  const meRows: (string | number)[][] = []
  meRows.push([`${client.name} — Monthly Entry (Gross) — FY ${fiscalYear.year}`])
  meRows.push([])
  meRows.push(["Code", "Account", ...MONTHS, ...customColumns.map((c) => c.name), "Total"])

  const sectionDefs = [
    { rows: REVENUE_ROWS, key: "REVENUE" },
    { rows: COGS_ROWS, key: "COGS" },
    { rows: EXPENSE_ROWS, key: "EXPENSE" },
  ]

  for (const { rows: stdRows, key } of sectionDefs) {
    const allRows = [...stdRows]
    const totalIdx = allRows.findIndex((r) => r.type === "TOTAL")
    const sectionCustom = customBySection[key] ?? []
    if (sectionCustom.length > 0 && totalIdx > -1) {
      allRows.splice(totalIdx, 0, ...sectionCustom.map((ca) => ({ type: "ACCOUNT" as const, label: ca.name, code: ca.code })))
    }

    for (let idx = 0; idx < allRows.length; idx++) {
      const row = allRows[idx]
      if (row.type === "SECTION") { meRows.push([row.label]); continue }
      if (row.type === "SUBSECTION") { meRows.push(["", row.label]); continue }
      if (row.type === "ACCOUNT" && row.code) {
        const code = row.code
        if (hiddenSet.has(code)) continue
        const monthVals = Array.from({ length: 12 }, (_, mi) => n(entryMap[`${code}-${mi + 1}`] ?? 0))
        const ccVals = customColumns.map((cc) => n(ccEntryMap[`${cc.id}-${code}`] ?? 0))
        const total = n(monthVals.reduce((a, b) => a + b, 0) + ccVals.reduce((a, b) => a + b, 0))
        meRows.push([code, row.label, ...monthVals, ...ccVals, total])
      }
      if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
        let startI = 0
        for (let j = idx - 1; j >= 0; j--) {
          const t = allRows[j].type
          if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION" || t === "SUBSECTION") { startI = j + 1; break }
        }
        const accRows = allRows.slice(startI, idx).filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code!))
        const monthTotals = Array.from({ length: 12 }, (_, mi) => n(accRows.reduce((s, r) => s + (entryMap[`${r.code}-${mi + 1}`] ?? 0), 0)))
        const ccTotals = customColumns.map((cc) => n(accRows.reduce((s, r) => s + (ccEntryMap[`${cc.id}-${r.code}`] ?? 0), 0)))
        const grand = n(monthTotals.reduce((a, b) => a + b, 0) + ccTotals.reduce((a, b) => a + b, 0))
        meRows.push(["", row.label, ...monthTotals, ...ccTotals, grand])
      }
    }
    meRows.push([])
  }

  // ── Sheet 2: P&L (Net) ──────────────────────────────────────────────────────
  const plRows: (string | number)[][] = []
  plRows.push([`${client.name} — Profit & Loss (Net of Tax) — FY ${fiscalYear.year}`])
  plRows.push([])
  plRows.push(["Code", "Account", ...MONTHS, "Total"])

  const plSectionTotals: number[][] = []

  for (const { rows: stdRows, key } of sectionDefs) {
    const allRows = [...stdRows]
    const totalIdx = allRows.findIndex((r) => r.type === "TOTAL")
    const sectionCustom = customBySection[key] ?? []
    if (sectionCustom.length > 0 && totalIdx > -1) {
      allRows.splice(totalIdx, 0, ...sectionCustom.map((ca) => ({ type: "ACCOUNT" as const, label: ca.name, code: ca.code })))
    }
    const sectionMonthTotals = Array(12).fill(0)

    for (let idx = 0; idx < allRows.length; idx++) {
      const row = allRows[idx]
      if (row.type === "SECTION") { plRows.push([row.label]); continue }
      if (row.type === "SUBSECTION") { plRows.push(["", row.label]); continue }
      if (row.type === "ACCOUNT" && row.code) {
        const code = row.code
        if (hiddenSet.has(code)) continue
        const monthVals = Array.from({ length: 12 }, (_, mi) => n(netOf(entryMap[`${code}-${mi + 1}`] ?? 0, code, mi + 1)))
        const total = n(monthVals.reduce((a, b) => a + b, 0))
        monthVals.forEach((v, i) => { sectionMonthTotals[i] += v })
        plRows.push([code, row.label, ...monthVals, total])
      }
      if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
        let startI = 0
        for (let j = idx - 1; j >= 0; j--) {
          const t = allRows[j].type
          if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION" || t === "SUBSECTION") { startI = j + 1; break }
        }
        const accRows = allRows.slice(startI, idx).filter((r) => r.type === "ACCOUNT" && r.code && !hiddenSet.has(r.code!))
        const monthTotals = Array.from({ length: 12 }, (_, mi) => n(accRows.reduce((s, r) => s + netOf(entryMap[`${r.code}-${mi + 1}`] ?? 0, r.code!, mi + 1), 0)))
        const grand = n(monthTotals.reduce((a, b) => a + b, 0))
        plRows.push(["", row.label, ...monthTotals, grand])
      }
    }
    plSectionTotals.push(sectionMonthTotals)
    plRows.push([])
  }

  const [revM, cogsM, expM] = plSectionTotals
  const gpM = revM.map((r, i) => n(r - cogsM[i]))
  const niM = gpM.map((gp, i) => n(gp - expM[i]))
  plRows.push(["", "Gross Profit", ...gpM, n(gpM.reduce((a, b) => a + b, 0))])
  plRows.push(["", "Net Income / (Loss)", ...niM, n(niM.reduce((a, b) => a + b, 0))])

  // ── Sheet 3: Balance Sheet ──────────────────────────────────────────────────
  const openMap: Record<string, number> = {}
  const closeMap: Record<string, number> = {}
  for (const e of bsEntries) {
    const amt = typeof e.amount === "object" ? parseFloat(e.amount.toString()) : Number(e.amount)
    if (e.isOpening) openMap[e.accountCode] = amt
    else closeMap[e.accountCode] = amt
  }

  // Auto-linked: GST Payable + Net Income
  const taxableRevCodes = REVENUE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.taxable && !hiddenSet.has(r.code!)).map((r) => r.code!)
  const itcExpCodes = EXPENSE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.itcEligible && !hiddenSet.has(r.code!)).map((r) => r.code!)
  let gstCollected = 0, gstITC = 0
  for (const code of taxableRevCodes) for (let m = 1; m <= 12; m++) { const r = getRate(code, m); gstCollected += (entryMap[`${code}-${m}`] ?? 0) * r / (1 + r) }
  for (const code of itcExpCodes) for (let m = 1; m <= 12; m++) { const r = getRate(code, m); gstITC += (entryMap[`${code}-${m}`] ?? 0) * r / (1 + r) }
  closeMap["2020"] = n(gstCollected - gstITC)
  closeMap["3030"] = n(niM.reduce((a, b) => a + b, 0))

  const bsSheetRows: (string | number)[][] = []
  bsSheetRows.push([`${client.name} — Balance Sheet — FY ${fiscalYear.year}`])
  bsSheetRows.push([])
  bsSheetRows.push(["Code", "Account", "Opening Balance", "Closing Balance"])

  for (let idx = 0; idx < BALANCE_SHEET_ROWS.length; idx++) {
    const row = BALANCE_SHEET_ROWS[idx]
    if (row.type === "SECTION") { bsSheetRows.push([row.label]); continue }
    if (row.type === "ACCOUNT") {
      const code = row.code!
      bsSheetRows.push([code, row.label, n(openMap[code] ?? 0), n(closeMap[code] ?? 0)])
      continue
    }
    if (row.type === "SUBTOTAL" || row.type === "TOTAL") {
      let startI = 0
      for (let j = idx - 1; j >= 0; j--) {
        const t = BALANCE_SHEET_ROWS[j].type
        if (t === "SUBTOTAL" || t === "TOTAL" || t === "SECTION") { startI = j + 1; break }
      }
      const accRows = BALANCE_SHEET_ROWS.slice(startI, idx).filter((r) => r.type === "ACCOUNT" && r.code)
      const openT = n(accRows.reduce((s, r) => s + (openMap[r.code!] ?? 0), 0))
      const closeT = n(accRows.reduce((s, r) => s + (closeMap[r.code!] ?? 0), 0))
      bsSheetRows.push(["", row.label, openT, closeT])
    }
  }

  // ── Sheet 4: GST Tracker ────────────────────────────────────────────────────
  const allTaxableRevCodes = [
    ...REVENUE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.taxable && !hiddenSet.has(r.code!)).map((r) => r.code!),
    ...customAccounts.filter((c) => c.section === "REVENUE").map((c) => c.code),
  ]
  const allItcExpCodes = [
    ...EXPENSE_ROWS.filter((r) => r.type === "ACCOUNT" && r.code && r.itcEligible && !hiddenSet.has(r.code!)).map((r) => r.code!),
    ...customAccounts.filter((c) => c.section === "EXPENSE").map((c) => c.code),
  ]

  function extractTax(gross: number, code: string, month: number) {
    const r = getRate(code, month)
    return r > 0 ? gross * r / (1 + r) : 0
  }

  const monthlyCollected = MONTHS.map((_, mi) => n(allTaxableRevCodes.reduce((s, code) => s + extractTax(entryMap[`${code}-${mi + 1}`] ?? 0, code, mi + 1), 0)))
  const monthlyITC = MONTHS.map((_, mi) => n(allItcExpCodes.reduce((s, code) => s + extractTax(entryMap[`${code}-${mi + 1}`] ?? 0, code, mi + 1), 0)))
  const monthlyNet = monthlyCollected.map((c, i) => n(c - monthlyITC[i]))

  const gstSheetRows: (string | number)[][] = []
  gstSheetRows.push([`${client.name} — GST/HST Tracker — FY ${fiscalYear.year}`])
  gstSheetRows.push([])
  gstSheetRows.push(["Month", "GST/HST Collected", "Input Tax Credits", "Net Remittance"])
  MONTHS.forEach((m, mi) => {
    gstSheetRows.push([m, monthlyCollected[mi], monthlyITC[mi], monthlyNet[mi]])
  })
  gstSheetRows.push(["Total",
    n(monthlyCollected.reduce((a, b) => a + b, 0)),
    n(monthlyITC.reduce((a, b) => a + b, 0)),
    n(monthlyNet.reduce((a, b) => a + b, 0)),
  ])
  gstSheetRows.push([])

  const freq = client.filingFreq
  let quarters: { label: string; months: number[] }[]
  if (freq === "Monthly") quarters = MONTHS.map((m, i) => ({ label: m, months: [i + 1] }))
  else if (freq === "Annual") quarters = [{ label: "Annual", months: [1,2,3,4,5,6,7,8,9,10,11,12] }]
  else quarters = [
    { label: "Q1 (Jan–Mar)", months: [1,2,3] }, { label: "Q2 (Apr–Jun)", months: [4,5,6] },
    { label: "Q3 (Jul–Sep)", months: [7,8,9] }, { label: "Q4 (Oct–Dec)", months: [10,11,12] },
  ]
  gstSheetRows.push([`Filing Summary — ${freq}`])
  gstSheetRows.push(["Period", "Collected", "ITCs", "Net Owing"])
  for (const q of quarters) {
    const qC = n(q.months.reduce((s, m) => s + monthlyCollected[m - 1], 0))
    const qI = n(q.months.reduce((s, m) => s + monthlyITC[m - 1], 0))
    gstSheetRows.push([q.label, qC, qI, n(qC - qI)])
  }

  // ── Build workbook ──────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meRows), "Monthly Entry")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plRows), "P&L")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bsSheetRows), "Balance Sheet")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gstSheetRows), "GST Tracker")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const filename = `${client.name.replace(/[^a-z0-9]/gi, "_")}-FY${fiscalYear.year}.xlsx`

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
