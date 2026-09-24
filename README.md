# BALANS AI — AI-powered Business Management Platform

**"BUTUN BIZNESNI BITTA TIZIMDA BOSHQARING."**

A complete, premium, production-ready accounting + ERP + AI business management web application built with Next.js, React, Tailwind CSS, and Zustand.

> ⚠️ **DEMO APPLICATION.** No backend or external integrations are connected. All data is for the fictional company BALANS GROUP. The app is not certified for legal/tax compliance. All AI outputs are informational only.

---

## Features

### 🏗️ Core Modules (20 modules)

| Module | Description |
|---|---|
| **Dashboard** | Role-based executive dashboards with KPIs, Command Center, customizable widgets |
| **AI CFO** | Natural-language business analysis engine — profit, expenses, cash flow, receivables, production costs |
| **Accounting** | Chart of Accounts, General Ledger, Journal Entries, Trial Balance, Balance Sheet, P&L, Cash Flow |
| **Finance** | Accounts Receivable, Accounts Payable, Payments, Treasury, Bank Reconciliation, Budgeting |
| **Sales** | Customer orders → delivery → invoice → payment workflow, quotes, returns |
| **Purchasing** | Purchase requests → RFQ → supplier quotes → PO → goods receipt → bill → payment |
| **Inventory** | Products, stock levels, FIFO/weighted average costing, batches, serial numbers, reorder points |
| **Warehouse** | Multi-warehouse management, bins/shelves, transfers, receiving, shipping, stock counting |
| **Manufacturing** | BOM, Work Orders, Production Planning, QC, Machine tracking, Production Costing |
| **CRM** | Leads, Pipeline (New → Qualified → Proposal → Negotiation → Won/Lost), Activities, Conversion analytics |
| **HR & Payroll** | Employees, Departments, Attendance, Leave, Payroll calculation with tax deductions |
| **Taxes** | Configurable tax types (QQS/VAT, profit tax, income tax, social tax), deadlines, payments |
| **Documents** | Contracts, Acts, Waybills, Reconciliation acts — with approval workflow |
| **Fixed Assets** | Buildings, Machines, Vehicles, Equipment — depreciation schedules, disposal |
| **Projects** | Project accounting with revenue, costs, labor, materials, profitability tracking |
| **Reports** | Financial, Management, and Operational report library with export |
| **Analytics** | Revenue analysis, Profitability, Expense analysis, Customer/Product/Branch analytics |
| **Approvals** | Centralized approval inbox for POs, expenses, payments, invoices, payroll, production |
| **Notifications** | Smart alerts — overdue invoices, low stock, tax deadlines, unusual expenses, cash flow warnings |
| **Settings** | Company info, roles, permissions, security, sessions, audit trail |

### 🤖 AI CFO

The AI CFO is a **rule-based analysis engine** that runs entirely in the browser using your ledger data. It:

- Answers natural-language business questions in Uzbek, Russian, and English
- Labels every statement as **FACT**, **ESTIMATE**, or **RECOMMENDATION**
- Never silently modifies accounting records — all proposals go to the Approval Center
- Provides insight cards: 💡 Insight, ⚠️ Risk, 📈 Opportunity, 📊 Analysis, ✅ Recommendation

Example questions:
- "Bu oy foydamiz qancha?" (What's our profit this month?)
- "Qaysi mijozlardan pul olishimiz kerak?" (Which customers owe us?)
- "Keyingi 30 kun cash flow qanday?" (What's the 30-day cash flow forecast?)
- "Zavodda ishlab chiqarish tannarxi nima uchun oshdi?" (Why did factory production costs increase?)

### 🏭 Manufacturing / Factory Support

Full factory workflow: Sales Order → Production Planning → Work Order → Raw Material Issue → Production → QC → Finished Goods → Warehouse → Delivery → Invoice.

- Bill of Materials (BOM) with raw materials, labor, machine, energy, overhead
- Machine utilization tracking (OEE)
- Production cost analysis (standard vs actual)
- Scrap/waste tracking

### 🏢 Multi-Company / Multi-Branch

- **BALANS GROUP** (consolidated view)
  - Balans Trading LLC (trading — Tashkent, Samarkand, Bukhara branches)
  - Balans Factory (manufacturing — Chirchiq factory)
  - Balans Services (services — Tashkent)
- Multi-currency support (UZS primary, USD, EUR)
- Filter every report by Company, Branch, Warehouse, Date, Currency

### 👥 Role-Based Access (12 roles × 20 modules × 7 permissions)

Owner, CEO, CFO, Chief Accountant, Accountant, Sales Manager, Purchasing Manager, Warehouse Manager, Production Manager, HR Manager, Employee, Auditor

Each role sees only the modules and dashboards they're authorized for.

### 📱 Responsive Design

- **Desktop**: Full ERP interface with collapsible sidebar
- **Tablet**: Compact sidebar, adaptive layout
- **Mobile**: Bottom navigation + hamburger menu, card-based tables

### 🎨 Design System

- **Dark mode** / **Light mode** with smooth transitions
- Glassmorphism + soft UI + premium fintech aesthetic
- Animated KPI counters, sparkline charts, hover states
- Skeleton loading, empty states, confirmation modals
- Inter + JetBrains Mono typography

---

## Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
```

### Build & Production

```bash
npm run build
npm start            # http://localhost:3000
```

### Verification

```bash
npx tsx scripts/verify.ts    # Accounting integrity check
npx tsx scripts/verify2.ts   # Extended verification
npx tsx scripts/verify3.ts   # Additional checks
```

---

## Architecture

### Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, Lucide Icons |
| Charts | Recharts |
| State | Zustand (client-side, localStorage-persisted) |
| Language | TypeScript 5.9 |

### Key Files

| File | Purpose |
|---|---|
| `src/lib/types.ts` | Domain model (266 lines) — all entities |
| `src/lib/db.ts` | Database interface, posting rules, document math |
| `src/lib/core/coa.ts` | Chart of Accounts (Uzbek NAS-style, configurable) |
| `src/lib/core/ledger.ts` | Double-entry engine: validation, P&L, balance sheet, cash flow, trial balance |
| `src/lib/core/inventory.ts` | FIFO and weighted-average costing |
| `src/lib/ops.ts` | All business operations (850 lines) — sales, purchasing, manufacturing, HR, taxes |
| `src/lib/actions.ts` | Action registry with audit trail |
| `src/lib/store.ts` | Zustand store with demo seed replay |
| `src/lib/analytics.ts` | KPIs, AR/AP aging, forecasts, budget, profitability, alerts |
| `src/lib/ai.ts` | AI CFO analysis engine — 384 lines of business intelligence |
| `src/lib/rbac.ts` | Role-based access control matrix |
| `src/lib/seed/simulate.ts` | Deterministic demo simulation (Jan 1 → today, 703 lines) |
| `src/lib/seed/master.ts` | Demo master data — companies, products, employees, machines, BOMs |

### Accounting Integrity

- Every journal entry is balanced (Debit = Credit); unbalanced entries are rejected
- No entries can be posted into a closed period
- AR sub-ledger = account 4010; AP sub-ledger = accounts 6010/6090
- Inventory sub-ledger = accounts 1010/2810/2910 (FIFO/weighted average)
- All demo numbers are generated from real, balanced journal entries

---

## Integration Points (Not Connected)

The app has clear adapter contracts for future integration:

| Integration | Status |
|---|---|
| Bank API | Adapter defined, not connected |
| E-invoicing (Didox, Faktura.uz) | Adapter defined, not connected |
| Tax system (Soliq qo'mitasi) | Adapter defined, not connected |
| Payment providers | Adapter defined, not connected |
| Telegram / Email | Adapter defined, not connected |
| LLM (GPT/Claude) | Adapter defined, not connected |
| FX rates (CBU API) | Adapter defined, not connected |
| Excel import/export | UI ready, file parsing available |

---

## Demo Data

The simulation generates realistic business data from January 1, 2026 to today:

- 3 companies, 4 branches, 5 warehouses
- 12 customers, 15 suppliers
- 25 products (trading goods, raw materials, finished goods, services)
- 34 employees across all companies
- Daily sales, purchasing, production, and financial transactions
- Month-end closings with payroll, depreciation, tax accruals
- CRM leads, activities, documents, audit trail

---

## Language

Primary: **Uzbek (Latin)**
Also available: Russian, English (shell + navigation)

---

## License

Private — fictional demo application.
