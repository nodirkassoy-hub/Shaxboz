// ─────────────────────────────────────────────────────────────
// BALANS AI — domain model
// All monetary amounts in the ledger are stored in the functional
// currency (UZS). Presentation currency conversion happens in the UI.
// ─────────────────────────────────────────────────────────────

export type Currency = 'UZS' | 'USD' | 'EUR';
export type Lang = 'uz' | 'ru' | 'en';

export type RoleId =
  | 'owner' | 'ceo' | 'cfo' | 'accountant' | 'chief_accountant'
  | 'sales_manager' | 'purchasing_manager' | 'warehouse_manager'
  | 'production_manager' | 'hr_manager' | 'employee' | 'auditor';

export type Perm = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'manage';

export type ModuleId =
  | 'dashboard' | 'ai' | 'approvals' | 'accounting' | 'finance' | 'sales' | 'purchasing'
  | 'inventory' | 'warehouse' | 'manufacturing' | 'crm' | 'hr' | 'taxes'
  | 'documents' | 'assets' | 'projects' | 'reports' | 'analytics' | 'notifications' | 'settings';

export interface Company {
  id: string;
  name: string;
  legalName: string;
  kind: 'trading' | 'manufacturing' | 'services';
  stir: string;          // STIR / INN
  mfo: string;           // bank MFO
  bankAccount: string;
  vatPayer: boolean;
  address: string;
  director: string;
  costing: 'AVG' | 'FIFO';
  branchIds: string[];
  color: string;
  short: string;
}

export interface Branch { id: string; name: string; city: string }

export interface Warehouse {
  id: string; code: string; name: string; companyId: string; branchId: string;
  manager: string; capacity: number; bins: string[]; kind: 'goods' | 'raw' | 'finished';
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  group: string;            // presentation group (e.g. "Pul mablag'lari")
  contra?: boolean;         // contra account (e.g. accumulated depreciation)
  category?: string;        // analytic category used by AI search / budgets
  custom?: boolean;
  cash?: boolean;           // counts as cash & equivalents
  cf?: 'operating' | 'investing' | 'financing';
  current?: boolean;        // current vs non-current (for balance sheet)
  system?: boolean;         // used by posting rules — cannot be deleted
}

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
  memo?: string;
  costCenter?: string;      // department
  projectId?: string;
  partyId?: string;         // customer / supplier / employee
  productId?: string;
}

export type SourceType =
  | 'opening' | 'manual' | 'sales_invoice' | 'credit_note' | 'receipt' | 'delivery' | 'retail'
  | 'bill' | 'supplier_payment' | 'goods_receipt' | 'payroll' | 'payroll_payment' | 'tax_payment'
  | 'vat_settlement' | 'tax_accrual' | 'depreciation' | 'asset_purchase' | 'wo_issue' | 'wo_complete'
  | 'overhead_variance' | 'expense' | 'dividend' | 'transfer' | 'adjustment' | 'reversal' | 'sales_return' | 'loan' | 'allocation';

export interface JournalEntry {
  id: string;
  no: string;
  date: string;             // YYYY-MM-DD
  companyId: string;
  branchId: string;
  memo: string;
  source: { type: SourceType; id?: string; no?: string };
  lines: JournalLine[];
  currency: Currency;
  status: 'posted' | 'draft' | 'reversed';
  createdBy: string;
  createdAt: string;
  reversalOf?: string;
}

export interface Party {
  id: string; code: string; name: string; kind: 'customer' | 'supplier';
  companyIds: string[]; branchId: string; stir: string; mfo?: string; phone: string; email: string;
  address: string; terms: number; creditLimit?: number; segment: string; rating?: number;
  behaviour?: 'punctual' | 'normal' | 'late';
}

export interface Product {
  id: string; sku: string; barcode: string; name: string; companyId: string;
  category: string; unit: string; kind: 'goods' | 'raw' | 'finished' | 'service';
  price: number; stdCost: number; vat: number; reorderPoint: number; reorderQty: number;
  variants?: string[]; trackSerial?: boolean; trackBatch?: boolean; defaultBin?: string;
  supplierId?: string; altSupplierIds?: string[]; leadDays?: number; weight?: number;
}

export interface StockLayer { qty: number; cost: number; date: string; batch: string; ref: string }
export interface StockCell { qty: number; value: number; layers: StockLayer[] }
/** stock[productId][warehouseId] */
export type StockMap = Record<string, Record<string, StockCell>>;

export interface StockMove {
  id: string; date: string; productId: string; warehouseId: string; qty: number; // +in / -out
  cost: number; kind: 'receipt' | 'issue' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'production_in' | 'production_out' | 'opening' | 'return';
  ref: string; companyId: string; batch?: string; user: string;
}

export interface DocLine { productId?: string; description: string; qty: number; price: number; discount: number; vat: number }

export type SOStatus = 'quote' | 'confirmed' | 'in_production' | 'delivered' | 'invoiced' | 'paid' | 'cancelled';
export interface SalesOrder {
  id: string; no: string; date: string; deliveryDate: string; companyId: string; branchId: string; warehouseId: string;
  customerId: string; lines: DocLine[]; status: SOStatus; invoiceId?: string; workOrderIds?: string[];
  dealId?: string; createdBy: string; channel: 'wholesale' | 'retail' | 'project';
}

export type InvoiceStatus = 'draft' | 'open' | 'partial' | 'paid' | 'overdue' | 'void';
export interface Invoice {
  id: string; no: string; kind: 'sales' | 'credit_note'; date: string; dueDate: string;
  companyId: string; branchId: string; customerId: string; lines: DocLine[];
  net: number; vat: number; total: number; paid: number; credited: number; soId?: string; projectId?: string;
  entryId?: string; costEntryId?: string; reminders: { date: string; channel: string; status: string }[]; relatedId?: string; warehouseId?: string; memo?: string;
}

export interface Bill {
  id: string; no: string; supplierRef: string; date: string; dueDate: string; companyId: string; branchId: string;
  supplierId: string; net: number; vat: number; total: number; paid: number; poId?: string;
  category: 'goods' | 'expense'; expenseAccount?: string; memo: string; entryId?: string; costCenter?: string;
}

export interface Payment {
  id: string; no: string; date: string; direction: 'in' | 'out'; companyId: string; branchId: string;
  partyId?: string; amount: number; account: string; method: 'bank' | 'cash' | 'card';
  allocations: { docId: string; amount: number }[]; memo: string; entryId?: string;
}

export type POStatus = 'request' | 'rfq' | 'quoted' | 'pending_approval' | 'approved' | 'partially_received' | 'received' | 'billed' | 'paid' | 'rejected';
export interface SupplierQuote { supplierId: string; prices: number[]; leadDays: number; date: string; selected?: boolean }
export interface PurchaseOrder {
  id: string; no: string; date: string; expectedDate: string; companyId: string; branchId: string; warehouseId: string;
  supplierId?: string; lines: DocLine[]; status: POStatus; quotes: SupplierQuote[]; requestedBy: string;
  approvedBy?: string; receivedQty: number[]; billId?: string; receivedDate?: string; onTime?: boolean;
}

export interface BomLine { productId: string; qty: number }
export interface Bom {
  id: string; productId: string; lines: BomLine[]; labor: number; machine: number; energy: number; overhead: number;
  scrapPct: number; machineId: string; outputPerHour: number; routing: { machineId: string; factor: number }[];
}

export type WOStatus = 'planned' | 'released' | 'in_progress' | 'qc' | 'completed' | 'cancelled';
export interface WorkOrder {
  id: string; no: string; productId: string; bomId: string; qty: number; goodQty: number; scrapQty: number;
  status: WOStatus; plannedStart: string; plannedEnd: string; actualEnd?: string; machineId: string;
  soId?: string; materialCost: number; conversionCost: number; qc?: 'pass' | 'fail' | 'pending'; qcNote?: string;
  crew: string[]; companyId: string; branchId: string; releasedDate?: string; startedDate?: string; hours?: number;
}

export interface Machine {
  id: string; name: string; kind: string; status: 'running' | 'idle' | 'maintenance';
  capacityHours: number; usedHours: number; hourlyCost: number; assetId?: string; oee: number;
}

export interface Employee {
  id: string; code: string; email: string; name: string; pinfl: string; companyId: string; branchId: string; department: string;
  position: string; salary: number; hired: string; status: 'active' | 'leave' | 'terminated';
  phone: string; salaryHistory: { date: string; amount: number; reason: string }[]; costKind: 'admin' | 'production' | 'service' | 'sales';
}

export interface AttendanceDay { employeeId: string; date: string; status: 'present' | 'late' | 'absent' | 'leave' | 'remote'; hours: number }
export interface LeaveRequest { id: string; employeeId: string; from: string; to: string; kind: string; status: 'pending' | 'approved' | 'rejected' }

export interface PayrollLine { employeeId: string; gross: number; bonus: number; deductions: number; pit: number; social: number; net: number }
export interface PayrollRun {
  id: string; period: string; companyId: string; status: 'draft' | 'pending_approval' | 'approved' | 'posted' | 'paid';
  lines: PayrollLine[]; entryId?: string; paidEntryId?: string;
}

export interface FixedAsset {
  id: string; code: string; name: string; category: 'building' | 'machine' | 'vehicle' | 'equipment' | 'computer' | 'other';
  companyId: string; branchId: string; purchaseDate: string; cost: number; salvage: number; lifeMonths: number;
  location: string; responsible: string; account: string; expenseAccount: string; status: 'active' | 'disposed';
  depreciatedMonths: string[]; // YYYY-MM posted in the system
  priorAccum: number;          // accumulated depreciation brought forward (opening balance)
  disposedDate?: string; machineId?: string; factory?: boolean;
}

export interface Project {
  id: string; code: string; name: string; companyId: string; customerId?: string; manager: string;
  start: string; end: string; budget: number; budgetLabor: number; budgetMaterials: number;
  status: 'planning' | 'active' | 'completed' | 'on_hold'; progress: number;
}

export interface BudgetLine { id: string; companyId: string; year: number; month: number; account: string; costCenter: string; amount: number }

export interface TaxType {
  id: string; code: string; name: string; rate: number; base: string; periodicity: 'monthly' | 'quarterly' | 'annual';
  dueDay: number; dueMonthOffset: number; account: string; enabled: boolean; note: string;
}

export interface TaxObligation {
  id: string; taxId: string; companyId: string; period: string; amount: number; dueDate: string;
  status: 'open' | 'filed' | 'paid'; docStatus: 'ok' | 'attention' | 'missing'; paymentEntryId?: string; estimate?: boolean; paidDate?: string;
}

export type DocStatus = 'draft' | 'pending' | 'approved' | 'signed' | 'rejected' | 'archived';
export interface DocRecord {
  id: string; no: string; kind: 'invoice' | 'contract' | 'act' | 'waybill' | 'purchase_order' | 'sales_order' | 'payment' | 'reconciliation';
  title: string; date: string; companyId: string; partyId?: string; amount?: number; status: DocStatus;
  fileName?: string; fileSize?: number; linkedId?: string; history: { date: string; user: string; action: string }[];
}

export type ApprovalKind = 'purchase_order' | 'expense' | 'payment' | 'invoice' | 'payroll' | 'stock_adjustment' | 'production' | 'journal' | 'ai_action' | 'leave';
export interface ApprovalItem {
  id: string; kind: ApprovalKind; title: string; description: string; amount?: number; companyId: string;
  requestedBy: string; requestedAt: string; approverRole: RoleId; deadline: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'; decidedBy?: string; decidedAt?: string; comment?: string;
  payload: { action: string; refId?: string; data?: Record<string, unknown> };
}

export interface BankLine {
  id: string; date: string; companyId: string; account: string; description: string; amount: number; // +in / -out
  status: 'matched' | 'suggested' | 'unmatched'; matchEntryId?: string; suggestedEntryId?: string; confidence?: number;
}

export interface Lead {
  id: string; name: string; company: string; phone: string; source: string; value: number;
  stage: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  owner: string; created: string; companyId: string; customerId?: string; probability: number; nextStep?: string; lostReason?: string;
}

export interface CrmActivity {
  id: string; leadId?: string; customerId?: string; kind: 'call' | 'meeting' | 'task' | 'note' | 'email' | 'follow_up';
  subject: string; due: string; done: boolean; owner: string;
}

export interface AuditEvent {
  id: string; at: string; user: string; role: RoleId; action: string; module: ModuleId; record: string; detail?: string;
}

export interface AlertRule {
  id: string; kind: 'overdue' | 'low_stock' | 'tax' | 'unusual_expense' | 'payment_received' | 'cash' | 'budget';
  label: string; enabled: boolean; threshold?: number; channels: { inApp: boolean; email: boolean; telegram: boolean };
}

export interface ReportSchedule { id: string; reportId: string; frequency: 'daily' | 'weekly' | 'monthly'; format: 'pdf' | 'xls' | 'csv'; recipients: string; createdAt: string }

export interface PeriodState { period: string; companyId: string; status: 'open' | 'closed'; closedBy?: string; closedAt?: string }

export interface Session { id: string; device: string; ip: string; location: string; lastActive: string; current?: boolean }
export interface LoginEvent { id: string; at: string; user: string; ip: string; device: string; result: 'success' | 'failed' | '2fa' }

export interface Rates { USD: number; EUR: number; date: string; source: string }
