export type AccountType = "REVENUE" | "COGS" | "EXPENSE" | "BALANCE_SHEET"
export type RowType = "SECTION" | "SUBSECTION" | "ACCOUNT" | "SUBTOTAL" | "TOTAL"

export interface AccountRow {
  type: RowType
  label: string
  code?: string
  industryFilter?: string[]
  itcEligible?: boolean  // for GST tracker
  taxable?: boolean       // for GST tracker (revenue side)
}

export interface AccountSection {
  type: AccountType
  rows: AccountRow[]
}

// ─── REVENUE ──────────────────────────────────────────────────────────────────

export const REVENUE_ROWS: AccountRow[] = [
  { type: "SECTION", label: "REVENUE" },
  { type: "ACCOUNT", label: "Sales — Services", code: "40000", industryFilter: ["All"], taxable: true },
  { type: "ACCOUNT", label: "Sales — Products / Retail", code: "40100", industryFilter: ["Product/Retail"], taxable: true },
  { type: "ACCOUNT", label: "Sales — Consulting", code: "40200", industryFilter: ["Consultants"], taxable: true },
  { type: "ACCOUNT", label: "Sales — Memberships & Subscriptions", code: "40300", industryFilter: ["Gym/SaaS/Clubs"], taxable: true },
  { type: "ACCOUNT", label: "Sales — Rental Income", code: "40400", industryFilter: ["Rental"], taxable: true },
  { type: "ACCOUNT", label: "Sales — Construction / Labour", code: "40500", industryFilter: ["Trades/Construction"], taxable: true },
  { type: "ACCOUNT", label: "Sales — Parts & Materials Billed", code: "40600", industryFilter: ["Trades"], taxable: true },
  { type: "ACCOUNT", label: "Other Revenue", code: "41000", industryFilter: ["All"], taxable: true },
  { type: "ACCOUNT", label: "Shipping & Delivery Revenue", code: "41100", industryFilter: ["Product/Retail"], taxable: true },
  { type: "ACCOUNT", label: "Gain/(Loss) on Sale of Assets", code: "42000", industryFilter: ["All"], taxable: true },
  { type: "ACCOUNT", label: "Interest Income", code: "43000", industryFilter: ["All"], taxable: false },
  { type: "ACCOUNT", label: "Government Grants & Subsidies", code: "44000", industryFilter: ["All"], taxable: false },
  { type: "TOTAL", label: "TOTAL REVENUE" },
]

// ─── COGS ─────────────────────────────────────────────────────────────────────

export const COGS_ROWS: AccountRow[] = [
  { type: "SECTION", label: "COST OF GOODS SOLD (COGS)" },
  { type: "ACCOUNT", label: "Cost of Goods Sold — General", code: "50000", industryFilter: ["Product/Retail"] },
  { type: "ACCOUNT", label: "Purchases — Inventory", code: "50100", industryFilter: ["Product/Retail"] },
  { type: "ACCOUNT", label: "Freight In — Inventory", code: "50200", industryFilter: ["Product/Retail"] },
  { type: "ACCOUNT", label: "Inventory Adjustments", code: "50300", industryFilter: ["Product/Retail"] },
  { type: "ACCOUNT", label: "Job Materials & Supplies", code: "51000", industryFilter: ["Trades/Construction"] },
  { type: "ACCOUNT", label: "Job Materials — Lumber & Building", code: "51100", industryFilter: ["Construction"] },
  { type: "ACCOUNT", label: "Job Materials — Electrical Supplies", code: "51200", industryFilter: ["Electrical"] },
  { type: "ACCOUNT", label: "Job Materials — Plumbing Supplies", code: "51300", industryFilter: ["Plumbing"] },
  { type: "ACCOUNT", label: "Equipment Rental for Jobs", code: "52000", industryFilter: ["Trades/Construction"] },
  { type: "ACCOUNT", label: "Labour — Direct", code: "53000", industryFilter: ["All"] },
  { type: "ACCOUNT", label: "Labour — WCB Insurance", code: "53010", industryFilter: ["Payroll clients"] },
  { type: "ACCOUNT", label: "Labour — Employee Benefits", code: "53020", industryFilter: ["Payroll clients"] },
  { type: "ACCOUNT", label: "Sub-Contractors", code: "54000", industryFilter: ["Trades/Construction"] },
  { type: "ACCOUNT", label: "Disposal & Waste Removal", code: "55000", industryFilter: ["Trades/Construction"] },
  { type: "ACCOUNT", label: "Direct Project Expenses — Other", code: "56000", industryFilter: ["Service"] },
  { type: "TOTAL", label: "TOTAL COGS" },
  { type: "TOTAL", label: "GROSS PROFIT" },
]

// ─── OPERATING EXPENSES ───────────────────────────────────────────────────────

export const EXPENSE_ROWS: AccountRow[] = [
  { type: "SECTION", label: "OPERATING EXPENSES" },

  { type: "SUBSECTION", label: "Office & Admin" },
  { type: "ACCOUNT", label: "Office Expenses — General", code: "60000", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Office Supplies", code: "60010", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Printing & Reproduction", code: "60020", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Postage & Courier", code: "60030", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Dues & Memberships", code: "60050", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Software & SaaS Subscriptions", code: "60060", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Business Licenses & Permits", code: "60070", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Training & Education", code: "60080", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Donations & Charitable Gifts", code: "60090", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Books & References", code: "60100", industryFilter: ["All"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Office & Admin" },

  { type: "SUBSECTION", label: "Advertising & Marketing" },
  { type: "ACCOUNT", label: "Advertising & Marketing — General", code: "61000", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Digital Advertising", code: "61010", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Print & Media", code: "61020", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Website & SEO", code: "61030", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Promotional Items", code: "61040", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Trade Shows & Events", code: "61050", industryFilter: ["All"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Advertising & Marketing" },

  { type: "SUBSECTION", label: "Rent & Facilities" },
  { type: "ACCOUNT", label: "Rent — General", code: "62000", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Office Rent", code: "62010", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Shop / Warehouse Rent", code: "62020", industryFilter: ["Trades/Retail"], itcEligible: true },
  { type: "ACCOUNT", label: "Storage Unit", code: "62030", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Repairs & Maintenance — Facility", code: "62040", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Utilities — Office", code: "62050", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Janitorial & Cleaning", code: "62060", industryFilter: ["All"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Rent & Facilities" },

  { type: "SUBSECTION", label: "Telecommunications" },
  { type: "ACCOUNT", label: "Phone & Internet — General", code: "62100", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Business Cell Phone", code: "62110", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Office Landline", code: "62120", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Internet Service", code: "62130", industryFilter: ["All"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Telecommunications" },

  { type: "SUBSECTION", label: "Auto Expenses" },
  { type: "ACCOUNT", label: "Auto Expenses — General", code: "63000", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Auto Fuel", code: "63010", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Auto Repairs & Maintenance", code: "63020", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Auto Insurance", code: "63030", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Vehicle Registration & Licensing", code: "63040", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Parking — Business", code: "63050", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Car Wash", code: "63060", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Mileage / CRA Allowance", code: "63070", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Vehicle Lease Payments", code: "63080", industryFilter: ["Leased vehicles"], itcEligible: true },
  { type: "ACCOUNT", label: "Roadside Assistance (BCAA/CAA)", code: "63090", industryFilter: ["All"], itcEligible: false },
  { type: "SUBTOTAL", label: "Subtotal — Auto Expenses" },

  { type: "SUBSECTION", label: "Travel Expenses" },
  { type: "ACCOUNT", label: "Travel Expenses — General", code: "72000", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Flights & Airfare", code: "72010", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Accommodation / Hotel", code: "72020", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Airport Fees, Taxis & Rideshare", code: "72030", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Per Diem & Meals on Travel", code: "72040", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Travel Insurance", code: "72050", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Baggage & Other Travel Fees", code: "72060", industryFilter: ["All"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Travel Expenses" },

  { type: "SUBSECTION", label: "Bank Charges & Interest" },
  { type: "ACCOUNT", label: "Bank Charges — General", code: "64000", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Bank Fees & Credit Card Fees", code: "64010", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Loan Interest", code: "64020", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Late Fees & Penalties", code: "64030", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Payment Processing Fees", code: "64040", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "NSF Fees", code: "64050", industryFilter: ["All"], itcEligible: false },
  { type: "SUBTOTAL", label: "Subtotal — Bank Charges & Interest" },

  { type: "SUBSECTION", label: "Meals & Entertainment" },
  { type: "ACCOUNT", label: "Meals & Entertainment — General", code: "65000", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Business Meals", code: "65010", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Client Entertainment", code: "65020", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Staff Events & Parties", code: "65030", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Gifts to Clients", code: "65040", industryFilter: ["All"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Meals & Entertainment" },

  { type: "SUBSECTION", label: "Payroll Expenses" },
  { type: "ACCOUNT", label: "Payroll Expenses — General", code: "66000", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Gross Wages & Salaries", code: "66010", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Employer CPP Contributions", code: "66020", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Employer EI Premiums", code: "66030", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "WCB Premiums", code: "66040", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Employee Benefits", code: "66050", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Vacation Pay Expense", code: "66060", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Bonuses & Commissions", code: "66070", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Payroll Processing Fees", code: "66080", industryFilter: ["Payroll clients"], itcEligible: false },
  { type: "SUBTOTAL", label: "Subtotal — Payroll Expenses" },

  { type: "SUBSECTION", label: "Insurance" },
  { type: "ACCOUNT", label: "Insurance — General", code: "68000", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Commercial General Liability", code: "68010", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Property Insurance", code: "68020", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Life / Disability Insurance", code: "68030", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Errors & Omissions (E&O)", code: "68040", industryFilter: ["Consultants"], itcEligible: false },
  { type: "SUBTOTAL", label: "Subtotal — Insurance" },

  { type: "SUBSECTION", label: "Professional Fees" },
  { type: "ACCOUNT", label: "Professional Fees — General", code: "69000", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Accounting & Bookkeeping", code: "69010", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Legal Fees", code: "69020", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "Consulting Fees", code: "69030", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "IT & Tech Support", code: "69040", industryFilter: ["All"], itcEligible: true },
  { type: "ACCOUNT", label: "HR & Recruiting", code: "69050", industryFilter: ["Payroll clients"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Professional Fees" },

  { type: "SUBSECTION", label: "Home Office" },
  { type: "ACCOUNT", label: "Home Office — General", code: "76000", industryFilter: ["Home office"], itcEligible: true },
  { type: "ACCOUNT", label: "Home Office — Heat", code: "76010", industryFilter: ["Home office"], itcEligible: true },
  { type: "ACCOUNT", label: "Home Office — Electricity", code: "76020", industryFilter: ["Home office"], itcEligible: true },
  { type: "ACCOUNT", label: "Home Office — Internet (% of home)", code: "76030", industryFilter: ["Home office"], itcEligible: true },
  { type: "ACCOUNT", label: "Home Office — Cell Phone (% of home)", code: "76040", industryFilter: ["Home office"], itcEligible: true },
  { type: "ACCOUNT", label: "Home Office — Mortgage Interest", code: "76050", industryFilter: ["Home office"], itcEligible: false },
  { type: "ACCOUNT", label: "Home Office — Property Taxes", code: "76060", industryFilter: ["Home office"], itcEligible: false },
  { type: "ACCOUNT", label: "Home Office — Rent (% of home)", code: "76070", industryFilter: ["Home office"], itcEligible: true },
  { type: "ACCOUNT", label: "Home Office — Condo Fees", code: "76080", industryFilter: ["Home office"], itcEligible: true },
  { type: "ACCOUNT", label: "Home Office — Home Insurance", code: "76090", industryFilter: ["Home office"], itcEligible: false },
  { type: "ACCOUNT", label: "Home Office — Repairs & Maintenance", code: "76100", industryFilter: ["Home office"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Home Office" },

  { type: "SUBSECTION", label: "Tax Expenses" },
  { type: "ACCOUNT", label: "Tax Expenses — General", code: "67000", industryFilter: ["Corp clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Corporate Income Tax", code: "67010", industryFilter: ["Corp clients"], itcEligible: false },
  { type: "ACCOUNT", label: "Tax Penalties & Interest", code: "67020", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Property Tax — Business", code: "67030", industryFilter: ["Ownership"], itcEligible: false },
  { type: "SUBTOTAL", label: "Subtotal — Tax Expenses" },

  { type: "SUBSECTION", label: "Supplies & Tools" },
  { type: "ACCOUNT", label: "Supplies & Small Tools — General", code: "73000", industryFilter: ["Trades/All"], itcEligible: true },
  { type: "ACCOUNT", label: "Safety Equipment", code: "73010", industryFilter: ["Trades"], itcEligible: true },
  { type: "ACCOUNT", label: "Uniforms & Work Clothing", code: "73020", industryFilter: ["Trades"], itcEligible: true },
  { type: "SUBTOTAL", label: "Subtotal — Supplies & Tools" },

  { type: "SUBSECTION", label: "Other Expenses" },
  { type: "ACCOUNT", label: "Bad Debt Expense", code: "70000", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Misc — Ask My Accountant", code: "71000", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Depreciation & Amortization", code: "74000", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Loss on Disposal of Assets", code: "75000", industryFilter: ["All"], itcEligible: false },
  { type: "ACCOUNT", label: "Charitable Donations", code: "77000", industryFilter: ["All"], itcEligible: false },
  { type: "SUBTOTAL", label: "Subtotal — Other Expenses" },

  { type: "TOTAL", label: "TOTAL OPERATING EXPENSES" },
  { type: "TOTAL", label: "NET INCOME / (LOSS)" },
]

// ─── BALANCE SHEET ────────────────────────────────────────────────────────────

export interface BalanceSheetRow {
  type: RowType
  label: string
  code?: string
  note?: string
  isNegative?: boolean
  isAutoLinked?: boolean
}

export const BALANCE_SHEET_ROWS: BalanceSheetRow[] = [
  { type: "SECTION", label: "CURRENT ASSETS" },
  { type: "ACCOUNT", label: "Cash & Bank Accounts", code: "1000", note: "Chequing + savings balance" },
  { type: "ACCOUNT", label: "Accounts Receivable", code: "1100", note: "Outstanding invoices owed to you" },
  { type: "ACCOUNT", label: "Inventory", code: "1200", note: "Products/goods on hand" },
  { type: "ACCOUNT", label: "Prepaid Expenses", code: "1300", note: "Expenses paid in advance" },
  { type: "ACCOUNT", label: "GST/HST Refund Receivable", code: "1400", note: "If GST refund expected" },
  { type: "ACCOUNT", label: "Other Current Assets", code: "1490" },
  { type: "TOTAL", label: "TOTAL CURRENT ASSETS" },

  { type: "SECTION", label: "FIXED / LONG-TERM ASSETS" },
  { type: "ACCOUNT", label: "Equipment & Machinery", code: "1500", note: "At cost" },
  { type: "ACCOUNT", label: "Computer & Technology", code: "1510", note: "At cost" },
  { type: "ACCOUNT", label: "Vehicles", code: "1520", note: "At cost" },
  { type: "ACCOUNT", label: "Furniture & Fixtures", code: "1530", note: "At cost" },
  { type: "ACCOUNT", label: "Buildings / Real Property", code: "1540", note: "At cost" },
  { type: "ACCOUNT", label: "Less: Accumulated Depreciation", code: "1595", note: "Enter as negative number", isNegative: true },
  { type: "ACCOUNT", label: "Other Long-Term Assets", code: "1590" },
  { type: "TOTAL", label: "TOTAL FIXED ASSETS" },
  { type: "TOTAL", label: "TOTAL ASSETS" },

  { type: "SECTION", label: "CURRENT LIABILITIES" },
  { type: "ACCOUNT", label: "Accounts Payable", code: "2000", note: "Bills owed to suppliers" },
  { type: "ACCOUNT", label: "Credit Cards Payable", code: "2010", note: "Outstanding credit card balance" },
  { type: "ACCOUNT", label: "GST/HST Payable", code: "2020", note: "Auto-linked from GST Tracker", isAutoLinked: true },
  { type: "ACCOUNT", label: "Payroll Liabilities", code: "2030", note: "Source deductions owing" },
  { type: "ACCOUNT", label: "Corporate Tax Payable", code: "2040", note: "Estimated tax owing" },
  { type: "ACCOUNT", label: "Current Portion of Long-Term Debt", code: "2050", note: "Loan payments due within 12 months" },
  { type: "ACCOUNT", label: "Other Current Liabilities", code: "2090" },
  { type: "TOTAL", label: "TOTAL CURRENT LIABILITIES" },

  { type: "SECTION", label: "LONG-TERM LIABILITIES" },
  { type: "ACCOUNT", label: "Bank Loan / Line of Credit", code: "2100", note: "Long-term portion" },
  { type: "ACCOUNT", label: "Vehicle Loan", code: "2110", note: "Long-term portion" },
  { type: "ACCOUNT", label: "Shareholder Loan", code: "2120", note: "Amounts owed to owner" },
  { type: "ACCOUNT", label: "Mortgage Payable", code: "2130", note: "Business property mortgage" },
  { type: "ACCOUNT", label: "Other Long-Term Liabilities", code: "2190" },
  { type: "TOTAL", label: "TOTAL LONG-TERM LIABILITIES" },
  { type: "TOTAL", label: "TOTAL LIABILITIES" },

  { type: "SECTION", label: "OWNER'S EQUITY" },
  { type: "ACCOUNT", label: "Share Capital / Opening Capital", code: "3000", note: "Amount invested by owner(s)" },
  { type: "ACCOUNT", label: "Retained Earnings (Prior Year)", code: "3010", note: "Cumulative earnings from prior years" },
  { type: "ACCOUNT", label: "Owner Drawings", code: "3020", note: "Enter as negative number", isNegative: true },
  { type: "ACCOUNT", label: "Current Year Net Income", code: "3030", note: "Auto-linked from Monthly Entry", isAutoLinked: true },
  { type: "TOTAL", label: "TOTAL EQUITY" },
  { type: "TOTAL", label: "TOTAL LIABILITIES + EQUITY" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const ALL_INCOME_ROWS = [...REVENUE_ROWS, ...COGS_ROWS, ...EXPENSE_ROWS]

export const ACCOUNT_CODES = ALL_INCOME_ROWS
  .filter((r): r is AccountRow & { code: string } => r.type === "ACCOUNT" && !!r.code)
  .map((r) => r.code)

export const BS_ACCOUNT_CODES = BALANCE_SHEET_ROWS
  .filter((r): r is BalanceSheetRow & { code: string } => r.type === "ACCOUNT" && !!r.code)
  .map((r) => r.code)

export function getAccountByCode(code: string): AccountRow | BalanceSheetRow | undefined {
  return (
    ALL_INCOME_ROWS.find((r) => r.code === code) ??
    BALANCE_SHEET_ROWS.find((r) => r.code === code)
  )
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const TAX_TYPES = [
  { value: "GST_5", label: "GST only (5%)", rate: 0.05 },
  { value: "HST_13", label: "HST — Ontario (13%)", rate: 0.13 },
  { value: "HST_15", label: "HST — Atlantic (15%)", rate: 0.15 },
  { value: "GST_PST", label: "GST + PST (separate)", rate: 0.05 },
  { value: "EXEMPT", label: "Tax Exempt", rate: 0 },
]

export const INDUSTRY_FILTERS = [
  "All",
  "Product/Retail",
  "Consultants",
  "Gym/SaaS/Clubs",
  "Rental",
  "Trades/Construction",
  "Construction",
  "Electrical",
  "Plumbing",
  "Trades",
  "Service",
  "Payroll clients",
  "Home office",
  "Corp clients",
  "Ownership",
  "Leased vehicles",
  "Trades/All",
  "Trades/Retail",
]
