import type {
  Company, Branch, Warehouse, Party, Product, StockMap, StockMove, JournalEntry, SalesOrder, Invoice, Bill, Payment,
  PurchaseOrder, Bom, WorkOrder, Machine, Employee, AttendanceDay, LeaveRequest, PayrollRun, FixedAsset, Project,
  BudgetLine, TaxType, TaxObligation, DocRecord, ApprovalItem, BankLine, Lead, CrmActivity, AuditEvent, AlertRule,
  ReportSchedule, PeriodState, JournalLine, SourceType, Currency, RoleId, Account, Session, LoginEvent, DocLine,
} from './types';
import { validateLines } from './core/ledger';
import { monthKey, monthLabel } from './core/dates';

export interface DB {
  version: number;
  companies: Company[];
  branches: Branch[];
  warehouses: Warehouse[];
  parties: Party[];
  products: Product[];
  stock: StockMap;
  moves: StockMove[];
  entries: JournalEntry[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  bills: Bill[];
  payments: Payment[];
  purchaseOrders: PurchaseOrder[];
  boms: Bom[];
  workOrders: WorkOrder[];
  machines: Machine[];
  employees: Employee[];
  attendance: AttendanceDay[];
  leaves: LeaveRequest[];
  payrollRuns: PayrollRun[];
  assets: FixedAsset[];
  projects: Project[];
  budgets: BudgetLine[];
  taxTypes: TaxType[];
  taxObligations: TaxObligation[];
  documents: DocRecord[];
  approvals: ApprovalItem[];
  bankLines: BankLine[];
  leads: Lead[];
  activities: CrmActivity[];
  audit: AuditEvent[];
  alertRules: AlertRule[];
  schedules: ReportSchedule[];
  periods: PeriodState[];
  customAccounts: Account[];
  sessions: Session[];
  logins: LoginEvent[];
  readAlerts: string[];
  seq: Record<string, number>;
}

export interface Ctx { user: string; role: RoleId; date: string; time?: string }

export const nowTime = () => new Date().toTimeString().slice(0, 8);

export class OpError extends Error {}
export const fail = (msg: string): never => { throw new OpError(msg); };

export const nextId = (db: DB, prefix: string) => {
  db.seq[prefix] = (db.seq[prefix] || 0) + 1;
  return `${prefix}${db.seq[prefix]}`;
};

export const nextNo = (db: DB, prefix: string, date: string, pad = 5) => {
  const key = `no:${prefix}:${date.slice(0, 4)}`;
  db.seq[key] = (db.seq[key] || 0) + 1;
  return `${prefix}-${date.slice(0, 4)}-${String(db.seq[key]).padStart(pad, '0')}`;
};

export const isClosed = (db: DB, companyId: string, date: string) =>
  db.periods.some((p) => p.companyId === companyId && p.period === monthKey(date) && p.status === 'closed');

export interface PostArgs {
  date: string; companyId: string; branchId: string; memo: string;
  source: { type: SourceType; id?: string; no?: string }; lines: JournalLine[];
  currency?: Currency; status?: 'posted' | 'draft';
}

/** The ONLY way entries enter the ledger. Validates balance and period lock. */
export function postEntry(db: DB, a: PostArgs, ctx: Ctx): JournalEntry {
  const lines = a.lines
    .map((l) => ({ ...l, debit: Math.round(l.debit || 0), credit: Math.round(l.credit || 0) }))
    .filter((l) => l.debit > 0 || l.credit > 0);
  const v = validateLines(lines);
  if (!v.ok) fail(v.errors.join(' '));
  if (isClosed(db, a.companyId, a.date)) fail(`${monthLabel(monthKey(a.date))} davri yopilgan. Yopilgan davrga provodka kiritib bo‘lmaydi.`);
  const e: JournalEntry = {
    id: nextId(db, 'je'), no: nextNo(db, 'JE', a.date, 6), date: a.date, companyId: a.companyId, branchId: a.branchId,
    memo: a.memo, source: a.source, lines, currency: a.currency || 'UZS', status: a.status || 'posted',
    createdBy: ctx.user, createdAt: `${ctx.date}T${ctx.time || nowTime()}`,
  };
  db.entries.push(e);
  return e;
}

// ─── Document math (integer so'm) ──────────────────────────────
export const lineNet = (l: DocLine) => Math.round(l.qty * l.price * (1 - (l.discount || 0) / 100));
export const lineVat = (l: DocLine) => Math.round(lineNet(l) * (l.vat || 0) / 100);
export const docTotals = (lines: DocLine[]) => {
  const net = lines.reduce((s, l) => s + lineNet(l), 0);
  const vat = lines.reduce((s, l) => s + lineVat(l), 0);
  return { net, vat, total: net + vat };
};

// ─── Lookups ───────────────────────────────────────────────────
export const byId = <T extends { id: string }>(arr: T[], id?: string) => (id ? arr.find((x) => x.id === id) : undefined);
export const productOf = (db: DB, id: string) => byId(db.products, id) || fail(`Mahsulot topilmadi: ${id}`);
export const partyOf = (db: DB, id: string) => byId(db.parties, id) || fail(`Kontragent topilmadi: ${id}`);
export const companyOf = (db: DB, id: string) => byId(db.companies, id) || fail(`Kompaniya topilmadi: ${id}`);

export const INV_ACCOUNT: Record<Product['kind'], string> = { raw: '1010', finished: '2810', goods: '2910', service: '' };
export const REV_ACCOUNT: Record<Product['kind'], string> = { raw: '9390', finished: '9010', goods: '9020', service: '9030' };
export const COGS_ACCOUNT: Record<Product['kind'], string> = { raw: '9433', finished: '9110', goods: '9120', service: '' };
export const ASSET_ACCOUNTS: Record<FixedAsset['category'], [string, string]> = {
  building: ['0120', '0220'], machine: ['0130', '0230'], vehicle: ['0150', '0250'], computer: ['0160', '0260'], equipment: ['0190', '0290'], other: ['0190', '0290'],
};

// ─── Derived statuses ──────────────────────────────────────────
export const invOpen = (i: Invoice) => i.total - i.paid - i.credited;
export function invStatus(i: Invoice, today: string): 'paid' | 'overdue' | 'partial' | 'open' {
  if (i.kind === 'credit_note') return 'paid';
  const open = invOpen(i);
  if (open <= 0) return 'paid';
  if (i.dueDate < today) return 'overdue';
  if (i.paid > 0 || i.credited > 0) return 'partial';
  return 'open';
}
export const billOpen = (b: Bill) => b.total - b.paid;
export function billStatus(b: Bill, today: string): 'paid' | 'overdue' | 'partial' | 'open' {
  const open = billOpen(b);
  if (open <= 0) return 'paid';
  if (b.dueDate < today) return 'overdue';
  if (b.paid > 0) return 'partial';
  return 'open';
}

export const audit = (db: DB, ctx: Ctx, action: string, module: AuditEvent['module'], record: string, detail?: string, at?: string) => {
  db.audit.push({ id: nextId(db, 'au'), at: at || `${ctx.date}T${ctx.time || nowTime()}`, user: ctx.user, role: ctx.role, action, module, record, detail });
};
