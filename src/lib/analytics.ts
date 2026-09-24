import type { DB } from './db';
import { invOpen, billOpen, invStatus, billStatus, byId, docTotals } from './db';
import type { Scope } from './core/ledger';
import { pnl, balances, sumRaw, monthlySeries, groupBy, cashFlow } from './core/ledger';
import { CASH_ACCOUNTS, INVENTORY_ACCOUNTS, TAX_LIABILITY_ACCOUNTS, ACC, EXPENSE_CATEGORIES, REVENUE_ACCOUNTS, COGS_ACCOUNTS } from './core/coa';
import { addDays, diffDays, monthKey, monthsBetween, TODAY, addMonths, monthEnd, between, fmtDate } from './core/dates';
import { peek } from './core/inventory';
import { reservedQty, incomingQty, woRequirements } from './ops';
import { change } from './core/money';
import type { Filters } from './store';

export const scopeOf = (db: DB, f: Pick<Filters, 'companyId' | 'branchId'>): Scope => ({
  companyIds: f.companyId === 'all' ? db.companies.map((c) => c.id) : [f.companyId],
  branchId: f.branchId === 'all' ? undefined : f.branchId,
});
export const inScope = (s: Scope, companyId: string, branchId?: string) => s.companyIds.includes(companyId) && (!s.branchId || !branchId || branchId === s.branchId);

/** Previous comparable period (same length, immediately before). */
export function prevPeriod(from: string, to: string) {
  const len = diffDays(to, from) + 1;
  // If it's a month-to-date, compare with same days of previous month
  if (from.slice(8) === '01') {
    const pf = addMonths(from, -1); const pt = addMonths(to, -1);
    return { from: pf, to: pt > monthEnd(pf) ? monthEnd(pf) : pt };
  }
  return { from: addDays(from, -len), to: addDays(from, -1) };
}

// ─── KPIs ──────────────────────────────────────────────────────
export interface KPI { id: string; value: number; prev: number; change: number; series: number[]; good: 'up' | 'down' }

export function kpis(db: DB, s: Scope, from: string, to: string) {
  const p = pnl(db.entries, s, from, to);
  const pp = prevPeriod(from, to); const q = pnl(db.entries, s, pp.from, pp.to);
  const bal = balances(db.entries, s, undefined, to); const balPrev = balances(db.entries, s, undefined, pp.to);
  const months = monthsBetween(addMonths(monthKey(to) + '-01', -8), to);
  const ser = monthlySeries(db.entries, s, months);
  const cash = sumRaw(bal, CASH_ACCOUNTS); const cashP = sumRaw(balPrev, CASH_ACCOUNTS);
  const ar = bal['4010'] || 0; const arP = balPrev['4010'] || 0;
  const ap = -(bal['6010'] || 0) - (bal['6090'] || 0); const apP = -(balPrev['6010'] || 0) - (balPrev['6090'] || 0);
  const inv = sumRaw(bal, INVENTORY_ACCOUNTS); const invP = sumRaw(balPrev, INVENTORY_ACCOUNTS);
  const tax = -sumRaw(bal, TAX_LIABILITY_ACCOUNTS) - (bal['4410'] || 0) * 0; const taxP = -sumRaw(balPrev, TAX_LIABILITY_ACCOUNTS);
  // series for balances: month-end values
  const balSeries = (codes: string[], sign = 1) => months.map((m) => sign * sumRaw(balances(db.entries, s, undefined, m === monthKey(to) ? to : monthEnd(m + '-01')), codes));
  const k = (id: string, value: number, prev: number, series: number[], good: 'up' | 'down' = 'up'): KPI => ({ id, value, prev, change: change(value, prev), series, good });
  return {
    pnl: p, prevPnl: q, prev: pp,
    list: [
      k('revenue', p.revenue, q.revenue, ser.map((r) => r.revenue)),
      k('expenses', p.totalExpenses, q.totalExpenses, ser.map((r) => r.cogs + r.opex - Math.min(0, r.other)), 'down'),
      k('gross', p.gross, q.gross, ser.map((r) => r.gross)),
      k('net', p.net, q.net, ser.map((r) => r.net)),
      k('cash', cash, cashP, ser.map((r) => r.cashEnd)),
      k('ar', ar, arP, balSeries(['4010']), 'down'),
      k('ap', ap, apP, balSeries(['6010', '6090'], -1), 'down'),
      k('inventory', inv, invP, balSeries(INVENTORY_ACCOUNTS)),
      k('tax', tax, taxP, balSeries(TAX_LIABILITY_ACCOUNTS, -1), 'down'),
    ],
  };
}

// ─── Receivables ───────────────────────────────────────────────
export const BUCKETS = [
  { id: 'current', label: 'Joriy (muddati kelmagan)', min: -Infinity, max: 0 },
  { id: 'd30', label: '1–30 kun', min: 1, max: 30 },
  { id: 'd60', label: '31–60 kun', min: 31, max: 60 },
  { id: 'd60p', label: '60+ kun', min: 61, max: Infinity },
] as const;
export const bucketOf = (daysOverdue: number) => BUCKETS.find((b) => daysOverdue >= b.min && daysOverdue <= b.max)!.id;

/** Paid/credited per invoice as of a date (documents dated after asOf are ignored). */
function paidAsOf(db: DB, asOf: string) {
  const m = new Map<string, number>();
  for (const p of db.payments) if (p.direction === 'in' && p.date <= asOf) for (const a of p.allocations) m.set(a.docId, (m.get(a.docId) || 0) + a.amount);
  for (const c of db.invoices) if (c.kind === 'credit_note' && c.relatedId && c.date <= asOf) m.set(c.relatedId, (m.get(c.relatedId) || 0) + c.total);
  return m;
}

export function openInvoices(db: DB, s: Scope, asOf = TODAY) {
  const pm = asOf >= TODAY ? null : paidAsOf(db, asOf);
  return db.invoices.filter((i) => i.kind === 'sales' && inScope(s, i.companyId, i.branchId) && i.date <= asOf).map((i) => ({ i, o: pm ? i.total - (pm.get(i.id) || 0) : invOpen(i) })).filter((x) => x.o > 0)
    .map(({ i, o }) => ({ inv: i, open: o, overdue: Math.max(0, diffDays(asOf, i.dueDate)), status: invStatus(i, asOf), customer: byId(db.parties, i.customerId)! }));
}

export function arAging(db: DB, s: Scope, asOf = TODAY) {
  const rows = openInvoices(db, s, asOf);
  const buckets = Object.fromEntries(BUCKETS.map((b) => [b.id, 0])) as Record<string, number>;
  const byCustomer = new Map<string, { customer: string; id: string; total: number; b: Record<string, number>; oldest: number; count: number }>();
  for (const r of rows) {
    const b = bucketOf(diffDays(asOf, r.inv.dueDate)); buckets[b] += r.open;
    const c = byCustomer.get(r.customer.id) || { customer: r.customer.name, id: r.customer.id, total: 0, b: { current: 0, d30: 0, d60: 0, d60p: 0 }, oldest: 0, count: 0 };
    c.total += r.open; c.b[b] += r.open; c.oldest = Math.max(c.oldest, r.overdue); c.count++; byCustomer.set(r.customer.id, c);
  }
  const total = rows.reduce((a, r) => a + r.open, 0);
  return { rows, buckets, total, overdue: total - buckets.current, customers: [...byCustomer.values()].sort((a, b) => b.total - a.total) };
}

/** Days sales outstanding over last 90 days. */
export function dso(db: DB, s: Scope, asOf = TODAY) {
  const p = pnl(db.entries, s, addDays(asOf, -89), asOf);
  const ar = balances(db.entries, s, undefined, asOf)['4010'] || 0;
  return p.revenue > 0 ? (ar / (p.revenue * 1.12)) * 90 : 0;
}

// ─── Payables ──────────────────────────────────────────────────
export function openBills(db: DB, s: Scope, asOf = TODAY) {
  return db.bills.filter((b) => inScope(s, b.companyId, b.branchId) && b.date <= asOf && billOpen(b) > 0)
    .map((b) => ({ bill: b, open: billOpen(b), status: billStatus(b, asOf), days: diffDays(b.dueDate, asOf), supplier: byId(db.parties, b.supplierId)! }))
    .sort((a, b) => (a.bill.dueDate < b.bill.dueDate ? -1 : 1));
}
export function apSchedule(db: DB, s: Scope, asOf = TODAY) {
  const rows = openBills(db, s, asOf);
  const sum = (f: (d: number) => boolean) => rows.filter((r) => f(r.days)).reduce((a, r) => a + r.open, 0);
  return { rows, overdue: sum((d) => d < 0), today: sum((d) => d === 0), week: sum((d) => d > 0 && d <= 7), later: sum((d) => d > 7), total: rows.reduce((a, r) => a + r.open, 0) };
}

// ─── Inventory ─────────────────────────────────────────────────
export function stockRows(db: DB, s: Scope, whId?: string) {
  const whs = db.warehouses.filter((w) => s.companyIds.includes(w.companyId) && (!whId || w.id === whId) && (!s.branchId || w.branchId === s.branchId));
  const whCos = new Set(whs.map((w) => w.companyId));
  return db.products.filter((p) => p.kind !== 'service' && whCos.has(p.companyId) && (!whId || whs.some((w) => (p.kind === 'raw' ? w.kind === 'raw' : p.kind === 'finished' ? w.kind === 'finished' : w.kind === 'goods')))).map((p) => {
    let qty = 0; let value = 0;
    for (const w of whs) { const c = peek(db.stock, p.id, w.id); qty += c.qty; value += c.value; }
    const reserved = whs.reduce((a, w) => a + reservedQty(db, p.id, w.id), 0);
    const incoming = whs.reduce((a, w) => a + incomingQty(db, p.id, w.id), 0);
    const outgoingWo = p.kind === 'raw' ? db.workOrders.filter((w) => w.status === 'planned' && s.companyIds.includes(w.companyId)).reduce((a, wo) => a + (woRequirements(db, wo).find((r) => r.productId === p.id)?.need || 0), 0) : 0;
    const available = qty - reserved - outgoingWo;
    // average daily usage over last 60 days
    const since = addDays(TODAY, -60);
    const out = db.moves.filter((m) => m.productId === p.id && m.qty < 0 && m.date >= since && (m.kind === 'issue' || m.kind === 'production_out') && whs.some((w) => w.id === m.warehouseId)).reduce((a, m) => a - m.qty, 0);
    const daily = out / 60; const cover = daily > 0 ? available / daily : Infinity;
    const status: 'out' | 'low' | 'ok' | 'over' = qty <= 0 ? 'out' : available + incoming < p.reorderPoint * (whId ? 0.4 : 1) ? 'low' : qty > (p.reorderPoint + p.reorderQty) * 2.2 ? 'over' : 'ok';
    return { p, qty, value, unitCost: qty ? value / qty : p.stdCost, reserved, incoming, outgoing: reserved + outgoingWo, available, daily, cover, status };
  });
}

// ─── Cash forecast (ESTIMATE) ──────────────────────────────────
export interface ForecastDay { date: string; inflow: number; outflow: number; balance: number; items: { label: string; amount: number; kind: string }[] }

export function cashForecast(db: DB, s: Scope, days: 30 | 60 | 90 = 90) {
  const bal = balances(db.entries, s, undefined, TODAY);
  let balance = sumRaw(bal, CASH_ACCOUNTS);
  const start = balance;
  const out: ForecastDay[] = [];
  const map = new Map<string, ForecastDay>();
  for (let i = 1; i <= days; i++) { const d = addDays(TODAY, i); const x = { date: d, inflow: 0, outflow: 0, balance: 0, items: [] as ForecastDay['items'] }; map.set(d, x); out.push(x); }
  const add = (date: string, amount: number, label: string, kind: string) => {
    const d = date <= TODAY ? addDays(TODAY, 1) : date; const x = map.get(d); if (!x) return;
    if (amount > 0) x.inflow += amount; else x.outflow -= amount; x.items.push({ label, amount, kind });
  };
  // 1) open receivables — expected on due date adjusted by customer behaviour; overdue collected with probability weighting
  let j = 0;
  for (const r of openInvoices(db, s)) {
    const beh = r.customer.behaviour || 'normal';
    const lag = r.overdue > 0 ? 5 + (j++ % 30) - diffDays(r.inv.dueDate, TODAY) * 0 : beh === 'punctual' ? 0 : beh === 'normal' ? 5 : 21;
    const prob = r.overdue > 60 ? 0.6 : r.overdue > 30 ? 0.8 : 0.95;
    add(addDays(r.inv.dueDate, lag), r.open * prob, `${r.customer.name} (${r.inv.no})`, 'ar');
  }
  // 2) open payables — on due date
  let k = 0;
  for (const r of openBills(db, s)) add(r.bill.dueDate < TODAY ? addDays(TODAY, 1 + (k++ % 14)) : r.bill.dueDate, -r.open, `${r.supplier.name} (${r.bill.supplierRef})`, 'ap');
  // 3) taxes
  for (const o of db.taxObligations.filter((o) => o.status !== 'paid' && s.companyIds.includes(o.companyId))) add(o.dueDate, -o.amount, `${byId(db.taxTypes, o.taxId)?.name} — ${o.period}`, 'tax');
  // 4) payroll (net) on the 5th of each month
  const payroll = db.employees.filter((e) => s.companyIds.includes(e.companyId) && e.status !== 'terminated').reduce((a, e) => a + e.salary * 0.88 * 1.03, 0);
  const pendingPay = db.payrollRuns.filter((r) => s.companyIds.includes(r.companyId) && r.status === 'posted').reduce((a, r) => a + r.lines.reduce((x, l) => x + l.net, 0), 0);
  if (pendingPay) add(addDays(TODAY, 1), -pendingPay, 'Hisoblangan ish haqi (to‘lanmagan)', 'payroll');
  for (let m = 1; m <= 3; m++) add(addMonths(monthKey(TODAY) + '-05', m), -payroll, 'Ish haqi (taxminiy)', 'payroll');
  // 5) run-rate for NEW business (not yet invoiced), collected/paid after DSO/DPO lag
  const last = pnl(db.entries, s, addDays(TODAY, -89), TODAY);
  const newSalesDaily = (last.revenue * 1.12) / 90;
  const lagIn = Math.max(10, Math.round(dso(db, s)));
  const billsDaily = db.bills.filter((b) => s.companyIds.includes(b.companyId) && b.date > addDays(TODAY, -90)).reduce((a, b) => a + b.total, 0) / 90;
  const lagOut = Math.max(10, Math.round(openBills(db, s).reduce((a, r) => a + r.open, 0) / Math.max(1, billsDaily)));
  const hist = cashFlow(db.entries, s, addDays(TODAY, -89), TODAY);
  const directOpex = -(hist.sections[0].lines.find((l) => l.label === 'Operatsion xarajatlar')?.amount || 0) / 90;
  const loans = Math.max(0, -hist.sections[2].total) / 90;
  for (const d of out) {
    const offset = diffDays(d.date, TODAY);
    if (offset > lagIn) { d.inflow += newSalesDaily; d.items.push({ label: 'Yangi sotuvlardan tushum (taxmin)', amount: newSalesDaily, kind: 'runrate' }); }
    if (offset > lagOut) d.outflow += billsDaily;
    d.outflow += directOpex + loans;
  }
  for (const d of out) { balance += d.inflow - d.outflow; d.balance = balance; }
  const at = (n: number) => out[Math.min(n, out.length) - 1];
  const min = out.reduce((m, d) => (d.balance < m.balance ? d : m), out[0]);
  return { start, days: out, d30: at(30), d60: at(Math.min(60, days)), d90: at(days), min };
}

// ─── Budget vs actual ──────────────────────────────────────────
export const MONTH_END_ACCRUED = new Set(['9413', '9421', '9130', '2510']);

export function budgetVsActual(db: DB, s: Scope, year: number, fromMonth: number, toMonth: number) {
  const from = `${year}-${String(fromMonth).padStart(2, '0')}-01`; const to0 = monthEnd(`${year}-${String(toMonth).padStart(2, '0')}-01`);
  const to = to0 > TODAY ? TODAY : to0;
  // Actual = debit turnover per company/account/cost-center (2510 = production overhead incurred, before absorption)
  const turn: Record<string, number> = {};
  for (const e of db.entries) {
    if (!s.companyIds.includes(e.companyId) || e.status === 'draft' || !between(e.date, from, to)) continue;
    if (e.source.type === 'wo_complete' || e.source.type === 'overhead_variance') continue;
    for (const l of e.lines) {
      const v = l.debit - (l.account === '2510' ? 0 : l.credit); if (!v) continue;
      turn[`${e.companyId}|${l.account}`] = (turn[`${e.companyId}|${l.account}`] || 0) + v;
    }
  }
  const rows = new Map<string, { companyId: string; account: string; name: string; costCenter: string; budget: number; actual: number }>();
  for (const b of db.budgets.filter((x) => s.companyIds.includes(x.companyId) && x.year === year && x.month >= fromMonth && x.month <= toMonth)) {
    const k = `${b.companyId}|${b.account}`; const r = rows.get(k) || { companyId: b.companyId, account: b.account, name: ACC[b.account]?.name || b.account, costCenter: b.costCenter, budget: 0, actual: turn[k] || 0 };
    r.budget += b.amount; rows.set(k, r);
  }
  // Current month: accounts accrued at month-end (payroll, factory overhead incl. payroll/depreciation) are not
  // comparable until the month is closed → their current-month budget is excluded. Monthly-billed costs use the full budget.
  const cur = monthKey(TODAY); const curM = +cur.slice(5, 7);
  if (year === +TODAY.slice(0, 4) && curM >= fromMonth && curM <= toMonth) {
    for (const r of rows.values()) {
      if (!MONTH_END_ACCRUED.has(r.account)) continue;
      const mb = db.budgets.filter((b) => b.companyId === r.companyId && b.account === r.account && b.year === year && b.month === curM).reduce((a, b) => a + b.amount, 0);
      r.budget -= mb;
      if (fromMonth === toMonth) rows.delete(`${r.companyId}|${r.account}`);
    }
  }
  return [...rows.values()].map((r) => ({ ...r, variance: r.actual - r.budget, pct: r.budget ? ((r.actual - r.budget) / r.budget) * 100 : 0 })).sort((a, b) => b.pct - a.pct);
}

// ─── Expense category lookup (AI search) ───────────────────────
export function expenseByCategory(db: DB, s: Scope, from: string, to: string) {
  const b = balances(db.entries, s, from, to);
  return EXPENSE_CATEGORIES.map((c) => ({ ...c, amount: c.accounts.reduce((a, code) => a + (b[code] || 0), 0) })).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
}

// ─── Profitability dimensions ──────────────────────────────────
export function productProfit(db: DB, s: Scope, from: string, to: string) {
  const rev = groupBy(db.entries, s, REVENUE_ACCOUNTS.concat(['9390']), 'productId', from, to, -1);
  const cogs = groupBy(db.entries, s, COGS_ACCOUNTS, 'productId', from, to, 1);
  return db.products.filter((p) => s.companyIds.includes(p.companyId) && p.kind !== 'raw').map((p) => {
    const r = rev[p.id] || 0; const c = cogs[p.id] || 0;
    return { p, revenue: r, cogs: c, gross: r - c, margin: r ? ((r - c) / r) * 100 : 0 };
  }).filter((x) => x.revenue > 0).sort((a, b) => b.gross - a.gross);
}

export function customerProfit(db: DB, s: Scope, from: string, to: string) {
  const rev = groupBy(db.entries, s, REVENUE_ACCOUNTS, 'partyId', from, to, -1);
  const cogs = groupBy(db.entries, s, COGS_ACCOUNTS, 'partyId', from, to, 1);
  const ar = arAging(db, s);
  return Object.entries(rev).filter(([id]) => id !== '—').map(([id, r]) => {
    const c = cogs[id] || 0; const party = byId(db.parties, id);
    const a = ar.customers.find((x) => x.id === id);
    return { id, name: party?.name || id, revenue: r, cogs: c, gross: r - c, margin: r ? ((r - c) / r) * 100 : 0, open: a?.total || 0, overdue: a ? a.total - a.b.current : 0 };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function supplierSpend(db: DB, s: Scope, from: string, to: string) {
  const map = new Map<string, { id: string; name: string; spend: number; bills: number; open: number; onTime: number; deliveries: number; category: string }>();
  for (const b of db.bills.filter((x) => inScope(s, x.companyId) && between(x.date, from, to))) {
    const p = byId(db.parties, b.supplierId)!; const r = map.get(p.id) || { id: p.id, name: p.name, spend: 0, bills: 0, open: 0, onTime: 0, deliveries: 0, category: p.segment };
    r.spend += b.net; r.bills++; r.open += billOpen(b); map.set(p.id, r);
  }
  for (const po of db.purchaseOrders.filter((x) => inScope(s, x.companyId) && x.receivedDate && between(x.receivedDate, from, to) && x.supplierId)) {
    const r = map.get(po.supplierId!); if (!r) continue; r.deliveries++; if (po.onTime) r.onTime++;
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend);
}

export function branchProfit(db: DB, s: Scope, from: string, to: string) {
  return db.branches.filter((b) => !s.branchId || s.branchId === b.id).map((b) => {
    const p = pnl(db.entries, { ...s, branchId: b.id }, from, to);
    return { branch: b, revenue: p.revenue, gross: p.gross, opex: p.opex, net: p.net, margin: p.revenue ? (p.net / p.revenue) * 100 : 0 };
  }).filter((x) => x.revenue !== 0 || x.opex !== 0);
}

export function projectFinancials(db: DB, s: Scope) {
  const rev = groupBy(db.entries, s, REVENUE_ACCOUNTS, 'projectId', undefined, TODAY, -1);
  const labor = groupBy(db.entries, s, ['9130'], 'projectId', undefined, TODAY, 1);
  const mat = groupBy(db.entries, s, ['9131'], 'projectId', undefined, TODAY, 1);
  const sub = groupBy(db.entries, s, ['9135'], 'projectId', undefined, TODAY, 1);
  const other = groupBy(db.entries, s, ['9411', '9412', '9426', '9424'], 'projectId', undefined, TODAY, 1);
  return db.projects.filter((p) => s.companyIds.includes(p.companyId)).map((p) => {
    const r = rev[p.id] || 0; const l = labor[p.id] || 0; const m = mat[p.id] || 0; const sc = sub[p.id] || 0; const o = other[p.id] || 0;
    const cost = l + m + sc + o;
    const invoiced = db.invoices.filter((i) => i.projectId === p.id && i.kind === 'sales').reduce((a, i) => a + i.total, 0);
    const collected = db.invoices.filter((i) => i.projectId === p.id && i.kind === 'sales').reduce((a, i) => a + i.paid, 0);
    return { p, revenue: r, labor: l, materials: m, subcontract: sc, other: o, cost, profit: r - cost, margin: r ? ((r - cost) / r) * 100 : 0, budgetUsed: p.budget ? (cost / p.budget) * 100 : 0, invoiced, collected, customer: byId(db.parties, p.customerId) };
  });
}

// ─── Manufacturing analytics ───────────────────────────────────
export function productionStats(db: DB, companyIds: string[], from: string, to: string) {
  const wos = db.workOrders.filter((w) => companyIds.includes(w.companyId));
  const done = wos.filter((w) => w.status === 'completed' && w.actualEnd && between(w.actualEnd, from, to));
  const good = done.reduce((a, w) => a + w.goodQty, 0); const scrap = done.reduce((a, w) => a + w.scrapQty, 0);
  const planned = wos.filter((w) => between(w.plannedEnd, from, to) && w.status !== 'cancelled').reduce((a, w) => a + w.qty, 0);
  const cost = done.reduce((a, w) => a + w.materialCost + w.conversionCost, 0);
  const std = done.reduce((a, w) => { const b = byId(db.boms, w.bomId)!; const p = byId(db.products, w.productId)!; void b; return a + p.stdCost * w.goodQty; }, 0);
  const matCost = done.reduce((a, w) => a + w.materialCost, 0);
  return { done, good, scrap, planned, attainment: planned ? (good / planned) * 100 : 0, scrapPct: good + scrap ? (scrap / (good + scrap)) * 100 : 0, cost, std, variance: cost - std, matCost, active: wos.filter((w) => ['released', 'in_progress', 'qc'].includes(w.status)), planned_: wos.filter((w) => w.status === 'planned') };
}

/** Daily output: each WO's quantity spread evenly over its workdays (start → end). */
export function productionByDay(db: DB, companyIds: string[], from: string, to: string) {
  const days: { date: string; planned: number; actual: number; scrap: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push({ date: d, planned: 0, actual: 0, scrap: 0 });
  const idx = new Map(days.map((x, i) => [x.date, i]));
  const wd = (a: string, b: string) => { const r: string[] = []; for (let d = a; d <= b; d = addDays(d, 1)) { const w = new Date(d + 'T00:00:00Z').getUTCDay(); if (w !== 0) r.push(d); } return r; };
  for (const w of db.workOrders.filter((x) => companyIds.includes(x.companyId) && x.status !== 'cancelled')) {
    const plan = wd(w.plannedStart, w.plannedEnd);
    for (const d of plan) { const i = idx.get(d); if (i !== undefined) days[i].planned += w.qty / plan.length; }
    if (!w.startedDate) continue;
    const end = w.actualEnd || (w.status === 'qc' ? w.plannedEnd : TODAY);
    const act = wd(w.startedDate, end < w.startedDate ? w.startedDate : end);
    const total = w.status === 'completed' || w.status === 'qc' ? w.goodQty : Math.round(w.qty * woProgress(w) / 100);
    const scrap = w.status === 'completed' || w.status === 'qc' ? w.scrapQty : 0;
    for (const d of act) { const i = idx.get(d); if (i !== undefined && d <= TODAY) { days[i].actual += total / act.length; days[i].scrap += scrap / act.length; } }
  }
  return days;
}

export function woProgress(w: { status: string; plannedStart: string; plannedEnd: string; startedDate?: string }) {
  if (w.status === 'completed' || w.status === 'qc') return 100;
  if (w.status !== 'in_progress' || !w.startedDate) return 0;
  const tot = Math.max(1, diffDays(w.plannedEnd, w.startedDate) + 1); const el = diffDays(TODAY, w.startedDate) + 1;
  return Math.max(5, Math.min(95, Math.round((el / tot) * 100)));
}

/** Standard vs actual unit cost per finished product (last N days). */
export function unitCosts(db: DB, companyIds: string[], from: string, to: string) {
  return db.products.filter((p) => p.kind === 'finished' && companyIds.includes(p.companyId)).map((p) => {
    const bom = db.boms.find((b) => b.productId === p.id)!;
    const stdMat = bom.lines.reduce((a, l) => a + l.qty * (byId(db.products, l.productId)?.stdCost || 0), 0) * (1 + bom.scrapPct / 100);
    const std = { material: stdMat, labor: bom.labor, machine: bom.machine, energy: bom.energy, overhead: bom.overhead, total: stdMat + bom.labor + bom.machine + bom.energy + bom.overhead };
    const done = db.workOrders.filter((w) => w.productId === p.id && w.status === 'completed' && w.actualEnd && between(w.actualEnd, from, to));
    const good = done.reduce((a, w) => a + w.goodQty, 0); const scrap = done.reduce((a, w) => a + w.scrapQty, 0);
    const mat = done.reduce((a, w) => a + w.materialCost, 0); const conv = done.reduce((a, w) => a + w.conversionCost, 0);
    const convPer = bom.labor + bom.machine + bom.energy + bom.overhead;
    const scale = good ? (good + scrap) / good : 1;
    const act = good ? { material: mat / good, labor: bom.labor * scale, machine: bom.machine * scale, energy: bom.energy * scale, overhead: bom.overhead * scale, total: (mat + conv) / good } : null;
    void convPer;
    return { p, bom, std, act, good, scrap, scrapPct: good + scrap ? (scrap / (good + scrap)) * 100 : 0, price: p.price, margin: act ? p.price - act.total : p.price - std.total };
  });
}

// ─── Alerts (derived + rule driven) ────────────────────────────
export interface AlertItem { id: string; level: 'red' | 'orange' | 'yellow' | 'blue' | 'green'; kind: string; title: string; body: string; date: string; module: string; tab?: string; params?: Record<string, string>; amount?: number }

export function deriveAlerts(db: DB, s: Scope): AlertItem[] {
  const rules = Object.fromEntries(db.alertRules.map((r) => [r.kind, r]));
  const out: AlertItem[] = [];
  if (rules.overdue?.enabled) {
    const ag = arAging(db, s);
    for (const c of ag.customers.filter((c) => c.total - c.b.current > 0).slice(0, 6)) {
      out.push({ id: `od-${c.id}`, level: 'red', kind: 'overdue', title: `Muddati o‘tgan qarz: ${c.customer}`, body: `${Math.round((c.total - c.b.current) / 1e6).toLocaleString('ru-RU')} mln so‘m, eng eski — ${c.oldest} kun`, date: TODAY, module: 'finance', tab: 'ar', params: { customer: c.id }, amount: c.total - c.b.current });
    }
  }
  if (rules.low_stock?.enabled) {
    for (const r of stockRows(db, s).filter((r) => r.status === 'low' || r.status === 'out').slice(0, 6)) {
      out.push({ id: `ls-${r.p.id}`, level: 'orange', kind: 'low_stock', title: `Kam zaxira: ${r.p.name}`, body: `Mavjud ${Math.round(r.available).toLocaleString('ru-RU')} ${r.p.unit}, buyurtma nuqtasi ${r.p.reorderPoint.toLocaleString('ru-RU')}${Number.isFinite(r.cover) ? `, ~${Math.max(0, Math.round(r.cover))} kunga yetadi` : ''}`, date: TODAY, module: 'inventory', tab: 'stock', params: { product: r.p.id } });
    }
  }
  if (rules.tax?.enabled) {
    for (const o of db.taxObligations.filter((o) => o.status !== 'paid' && s.companyIds.includes(o.companyId))) {
      const days = diffDays(o.dueDate, TODAY); const t = byId(db.taxTypes, o.taxId)!; const co = byId(db.companies, o.companyId)!;
      if (days <= (rules.tax.threshold || 10)) out.push({ id: `tx-${o.id}`, level: 'yellow', kind: 'tax', title: `Soliq muddati yaqinlashmoqda: ${t.name}`, body: `${co.short} · ${o.period} · ${Math.round(o.amount / 1e6).toLocaleString('ru-RU')} mln so‘m · ${days < 0 ? `${-days} kun kechikdi` : `${days} kun qoldi`} (${fmtDate(o.dueDate)})`, date: TODAY, module: 'taxes', amount: o.amount });
      if (o.docStatus === 'attention') out.push({ id: `txd-${o.id}`, level: 'yellow', kind: 'tax', title: 'Soliq hujjati e’tibor talab qiladi', body: `${t.name} · ${co.short} · ${o.period}: hisobot bilan buxgalteriya ma’lumotlari solishtirilishi kerak`, date: TODAY, module: 'taxes' });
    }
  }
  if (rules.unusual_expense?.enabled) {
    for (const a of anomalies(db, s).slice(0, 3)) out.push({ id: `ue-${a.entryId}`, level: 'blue', kind: 'unusual_expense', title: 'G‘ayrioddiy xarajat', body: `${a.memo} — ${Math.round(a.amount / 1e6).toLocaleString('ru-RU')} mln so‘m (odatdagidan ${a.ratio.toFixed(1)}×)`, date: a.date, module: 'accounting', tab: 'journal', params: { q: a.no }, amount: a.amount });
  }
  if (rules.payment_received?.enabled) {
    const thr = (rules.payment_received.threshold || 150) * 1e6;
    for (const p of db.payments.filter((p) => p.direction === 'in' && s.companyIds.includes(p.companyId) && p.date >= addDays(TODAY, -4) && p.amount >= thr).slice(-4)) {
      out.push({ id: `pr-${p.id}`, level: 'green', kind: 'payment_received', title: `To‘lov qabul qilindi: ${byId(db.parties, p.partyId)?.name}`, body: `${Math.round(p.amount / 1e6).toLocaleString('ru-RU')} mln so‘m · ${fmtDate(p.date)}`, date: p.date, module: 'finance', tab: 'payments', amount: p.amount });
    }
  }
  if (rules.cash?.enabled) {
    const f = cashForecast(db, s, 30);
    const thr = (rules.cash.threshold || 500) * 1e6 * (s.companyIds.length / 3);
    if (f.min.balance < thr) out.push({ id: 'cash-min', level: 'orange', kind: 'cash', title: 'Pul oqimi e’tibor talab qiladi (prognoz)', body: `${fmtDate(f.min.date)} atrofida qoldiq ~${Math.round(f.min.balance / 1e6).toLocaleString('ru-RU')} mln so‘mgacha tushishi mumkin (taxmin)`, date: TODAY, module: 'finance', tab: 'treasury' });
  }
  if (rules.budget?.enabled) {
    const m = +TODAY.slice(5, 7);
    for (const b of budgetVsActual(db, s, 2026, m, m).filter((b) => b.pct > (rules.budget.threshold || 5)).slice(0, 3)) out.push({ id: `bu-${b.account}-${b.costCenter}`, level: 'orange', kind: 'budget', title: `Byudjetdan oshdi: ${b.name}`, body: `${b.costCenter}: fakt ${Math.round(b.actual / 1e6)} mln / reja ${Math.round(b.budget / 1e6)} mln (${b.pct > 0 ? '+' : ''}${b.pct.toFixed(0)}%)`, date: TODAY, module: 'finance', tab: 'budget' });
  }
  const order = { red: 0, orange: 1, yellow: 2, blue: 3, green: 4 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/** Expense entries unusually large vs. the account's typical monthly amount. */
export function anomalies(db: DB, s: Scope) {
  const since = addDays(TODAY, -30); const hist = addDays(TODAY, -210);
  const lines: { entryId: string; no: string; date: string; memo: string; account: string; amount: number; ratio: number }[] = [];
  const stats: Record<string, { sum: number; n: number }> = {};
  for (const e of db.entries) {
    if (!s.companyIds.includes(e.companyId) || e.date < hist || e.date >= since || e.status !== 'posted') continue;
    for (const l of e.lines) if (ACC[l.account]?.type === 'expense' && l.debit > 0 && !['payroll', 'depreciation', 'delivery', 'tax_accrual', 'overhead_variance'].includes(e.source.type)) { const x = (stats[l.account] ||= { sum: 0, n: 0 }); x.sum += l.debit; x.n++; }
  }
  for (const e of db.entries) {
    if (!s.companyIds.includes(e.companyId) || e.date < since || e.status !== 'posted' || ['payroll', 'depreciation', 'delivery', 'tax_accrual', 'overhead_variance'].includes(e.source.type)) continue;
    for (const l of e.lines) {
      if (ACC[l.account]?.type !== 'expense' || l.debit <= 0) continue;
      const st = stats[l.account]; const avg = st && st.n >= 3 ? st.sum / st.n : 0;
      const ratio = avg ? l.debit / avg : l.debit > 30e6 ? 5 : 0;
      if (ratio >= 1.6 && l.debit > 15e6) lines.push({ entryId: e.id, no: e.no, date: e.date, memo: e.memo, account: l.account, amount: l.debit, ratio });
    }
  }
  return lines.sort((a, b) => b.ratio - a.ratio);
}

/** Possible duplicate supplier bills (same supplier, same amount, within 10 days). */
export function duplicateBills(db: DB, s: Scope) {
  const bills = db.bills.filter((b) => s.companyIds.includes(b.companyId) && b.date >= addDays(TODAY, -120));
  const res: { a: typeof bills[number]; b: typeof bills[number] }[] = [];
  for (let i = 0; i < bills.length; i++) for (let j = i + 1; j < bills.length; j++) {
    const a = bills[i]; const b = bills[j];
    if (a.supplierId === b.supplierId && Math.abs(a.total - b.total) < 1 && Math.abs(diffDays(a.date, b.date)) <= 10 && a.category === 'expense') res.push({ a, b });
  }
  return res;
}

/** Group health score (0–100) with explainable components. */
export function healthScore(db: DB, s: Scope) {
  const p = pnl(db.entries, s, addDays(TODAY, -89), TODAY);
  const bal = balances(db.entries, s, undefined, TODAY);
  const cash = sumRaw(bal, CASH_ACCOUNTS);
  const monthlyBurn = (p.totalExpenses - p.cogs) / 3 + p.cogs / 3 * 0.6;
  const runway = monthlyBurn > 0 ? cash / monthlyBurn : 12;
  const curA = (bal['4010'] || 0) + cash + sumRaw(bal, INVENTORY_ACCOUNTS);
  const curL = -((bal['6010'] || 0) + (bal['6090'] || 0) + sumRaw(bal, TAX_LIABILITY_ACCOUNTS) + (bal['6710'] || 0) + (bal['6810'] || 0));
  const current = curL > 0 ? curA / curL : 3;
  const ag = arAging(db, s); const overdueShare = ag.total ? ag.overdue / ag.total : 0;
  const comp = [
    { id: 'margin', label: 'Sof foyda marjasi', value: `${p.netMargin.toFixed(1)}%`, score: Math.max(0, Math.min(25, p.netMargin * 1.6)) },
    { id: 'liquidity', label: 'Joriy likvidlik', value: current.toFixed(2), score: Math.max(0, Math.min(25, (current - 0.8) * 16)) },
    { id: 'runway', label: 'Pul zaxirasi (oy)', value: runway.toFixed(1), score: Math.max(0, Math.min(25, runway * 12)) },
    { id: 'collections', label: 'Muddati o‘tgan debitorlik ulushi', value: `${(overdueShare * 100).toFixed(0)}%`, score: Math.max(0, 25 - overdueShare * 50) },
  ];
  return { score: Math.round(comp.reduce((a, c) => a + c.score, 0)), comp, runway, current, overdueShare };
}

export const soTotals = (so: { lines: Parameters<typeof docTotals>[0] }) => docTotals(so.lines);
