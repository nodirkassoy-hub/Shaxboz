import type { JournalEntry, JournalLine, SourceType } from '../types';
import {
  ACC, CHART, normalSign, isCash, REVENUE_ACCOUNTS, COGS_ACCOUNTS, opexAccounts, otherIncomeAccounts,
  FINANCE_COST_ACCOUNTS, INCOME_TAX_ACCOUNTS, CASH_ACCOUNTS,
} from './coa';
import { between, monthKey, addDays } from './dates';

export interface Scope { companyIds: string[]; branchId?: string }

const EPS = 0.5; // half a so'm tolerance for rounding

// ─── Validation ────────────────────────────────────────────────
export interface ValidationResult { ok: boolean; errors: string[]; debit: number; credit: number; diff: number }

export function validateLines(lines: JournalLine[]): ValidationResult {
  const errors: string[] = [];
  let debit = 0; let credit = 0;
  const used = lines.filter((l) => l.account || l.debit || l.credit);
  if (used.length < 2) errors.push('Provodkada kamida 2 ta qator bo‘lishi kerak.');
  used.forEach((l, i) => {
    if (!ACC[l.account]) errors.push(`${i + 1}-qator: hisob tanlanmagan yoki mavjud emas.`);
    if (l.debit < 0 || l.credit < 0) errors.push(`${i + 1}-qator: manfiy summa kiritib bo‘lmaydi.`);
    if (l.debit > 0 && l.credit > 0) errors.push(`${i + 1}-qator: bir qatorda ham debet, ham kredit bo‘lishi mumkin emas.`);
    if (!(l.debit > 0) && !(l.credit > 0)) errors.push(`${i + 1}-qator: summa kiritilmagan.`);
    debit += l.debit || 0; credit += l.credit || 0;
  });
  const diff = Math.round((debit - credit) * 100) / 100;
  if (Math.abs(diff) > EPS) errors.push(`Provodka balanslanmagan: Debet − Kredit = ${diff.toLocaleString('ru-RU')} so‘m.`);
  return { ok: errors.length === 0, errors, debit, credit, diff };
}

// ─── Flattened index (cached per entries array) ────────────────
export interface FlatLine extends JournalLine { entryId: string; date: string; companyId: string; branchId: string; source: SourceType; memo: string; no: string }
// Incremental cache: entries are append-only during seeding; user actions commit a new array.
const flatCache = new WeakMap<JournalEntry[], { n: number; out: FlatLine[] }>();

export function flatten(entries: JournalEntry[]): FlatLine[] {
  let c = flatCache.get(entries);
  if (!c) { c = { n: 0, out: [] }; flatCache.set(entries, c); }
  if (c.n === entries.length) return c.out;
  for (let i = c.n; i < entries.length; i++) {
    const e = entries[i];
    if (e.status === 'draft') continue;
    for (const l of e.lines) {
      c.out.push({ ...l, entryId: e.id, date: e.date, companyId: e.companyId, branchId: e.branchId, source: e.source.type, memo: l.memo || e.memo, no: e.no });
    }
  }
  c.n = entries.length;
  return c.out;
}

// Running totals per company/account (incremental) — used for fast cash checks in operations.
const totCache = new WeakMap<JournalEntry[], { n: number; t: Record<string, Record<string, number>> }>();
export function runningTotals(entries: JournalEntry[]) {
  const flat = flatten(entries);
  let c = totCache.get(entries);
  if (!c || c.n > flat.length) { c = { n: 0, t: {} }; totCache.set(entries, c); }
  for (let i = c.n; i < flat.length; i++) {
    const l = flat[i]; const co = (c.t[l.companyId] ||= {});
    co[l.account] = (co[l.account] || 0) + l.debit - l.credit;
  }
  c.n = flat.length;
  return c.t;
}
export const accountBalance = (entries: JournalEntry[], companyId: string, account: string) => runningTotals(entries)[companyId]?.[account] || 0;

const inScope = (l: { companyId: string; branchId: string }, s: Scope) =>
  s.companyIds.includes(l.companyId) && (!s.branchId || l.branchId === s.branchId);

const scopeKey = (s: Scope) => s.companyIds.join(',') + '|' + (s.branchId || '*');

// ─── Balances ──────────────────────────────────────────────────
const balCache = new WeakMap<JournalEntry[], { n: number; m: Map<string, Record<string, number>> }>();
function cacheFor<T>(wm: WeakMap<JournalEntry[], { n: number; m: Map<string, T> }>, entries: JournalEntry[]) {
  let c = wm.get(entries);
  if (!c || c.n !== entries.length) { c = { n: entries.length, m: new Map() }; wm.set(entries, c); }
  return c.m;
}

/** Net debit − credit per account in scope & period. */
export function balances(entries: JournalEntry[], scope: Scope, from?: string, to?: string): Record<string, number> {
  const m = cacheFor(balCache, entries);
  const key = `${scopeKey(scope)}|${from || ''}|${to || ''}`;
  const hit = m.get(key); if (hit) return hit;
  const out: Record<string, number> = {};
  for (const l of flatten(entries)) {
    if (!inScope(l, scope) || !between(l.date, from, to)) continue;
    out[l.account] = (out[l.account] || 0) + l.debit - l.credit;
  }
  m.set(key, out);
  return out;
}

/** Balance in the account's natural sign (positive = normal). */
export const natural = (bal: Record<string, number>, code: string) => (bal[code] || 0) * normalSign(code);
export const sumNatural = (bal: Record<string, number>, codes: string[]) => codes.reduce((s, c) => s + natural(bal, c), 0);
/** Raw sum of (debit-credit) for codes — used where sign must be preserved across contra accounts */
export const sumRaw = (bal: Record<string, number>, codes: string[]) => codes.reduce((s, c) => s + (bal[c] || 0), 0);

// ─── Profit & Loss ─────────────────────────────────────────────
export interface PnL {
  revenue: number; revenueLines: { code: string; name: string; amount: number }[];
  cogs: number; cogsLines: { code: string; name: string; amount: number }[];
  gross: number; grossMargin: number;
  opex: number; opexGroups: { group: string; amount: number; lines: { code: string; name: string; amount: number }[] }[];
  operating: number; otherIncome: number; financeCost: number; pbt: number; incomeTax: number; net: number; netMargin: number;
  totalExpenses: number;
}

export function pnl(entries: JournalEntry[], scope: Scope, from?: string, to?: string): PnL {
  const b = balances(entries, scope, from, to);
  // Revenue is credit-normal; contra 9040 reduces it. -(debit-credit) gives the natural amount incl. contra.
  const revenueLines = REVENUE_ACCOUNTS.map((c) => ({ code: c, name: ACC[c].name, amount: -(b[c] || 0) })).filter((x) => x.amount !== 0);
  const revenue = revenueLines.reduce((s, x) => s + x.amount, 0);
  const cogsLines = COGS_ACCOUNTS.map((c) => ({ code: c, name: ACC[c].name, amount: b[c] || 0 })).filter((x) => x.amount !== 0);
  const cogs = cogsLines.reduce((s, x) => s + x.amount, 0);
  const gross = revenue - cogs;
  const groups = new Map<string, { group: string; amount: number; lines: { code: string; name: string; amount: number }[] }>();
  for (const c of opexAccounts()) {
    const amt = b[c] || 0; if (!amt) continue;
    const g = ACC[c].group; const row = groups.get(g) || { group: g, amount: 0, lines: [] };
    row.amount += amt; row.lines.push({ code: c, name: ACC[c].name, amount: amt }); groups.set(g, row);
  }
  const opexGroups = [...groups.values()];
  const opex = opexGroups.reduce((s, g) => s + g.amount, 0);
  const operating = gross - opex;
  const otherIncome = -otherIncomeAccounts().reduce((s, c) => s + (b[c] || 0), 0);
  const financeCost = FINANCE_COST_ACCOUNTS.reduce((s, c) => s + (b[c] || 0), 0);
  const pbt = operating + otherIncome - financeCost;
  const incomeTax = INCOME_TAX_ACCOUNTS.reduce((s, c) => s + (b[c] || 0), 0);
  const net = pbt - incomeTax;
  return {
    revenue, revenueLines, cogs, cogsLines, gross, grossMargin: revenue ? (gross / revenue) * 100 : 0,
    opex, opexGroups, operating, otherIncome, financeCost, pbt, incomeTax, net,
    netMargin: revenue ? (net / revenue) * 100 : 0, totalExpenses: cogs + opex + financeCost + incomeTax,
  };
}

// ─── Balance sheet ─────────────────────────────────────────────
export interface BSGroup { group: string; amount: number; lines: { code: string; name: string; amount: number }[] }
export interface BalanceSheet {
  nonCurrent: BSGroup[]; current: BSGroup[]; totalNonCurrent: number; totalCurrent: number; totalAssets: number;
  liabilities: BSGroup[]; totalLiabilities: number;
  equity: { code: string; name: string; amount: number }[]; currentEarnings: number; totalEquity: number;
  totalLE: number; balanced: boolean;
}

export function balanceSheet(entries: JournalEntry[], scope: Scope, asOf: string): BalanceSheet {
  const b = balances(entries, scope, undefined, asOf);
  const grouped = (filter: (code: string) => boolean, signFlip: number) => {
    const map = new Map<string, BSGroup>();
    for (const a of CHART) {
      if (!filter(a.code)) continue;
      const amt = (b[a.code] || 0) * signFlip; if (Math.abs(amt) < EPS) continue;
      const g = map.get(a.group) || { group: a.group, amount: 0, lines: [] };
      g.amount += amt; g.lines.push({ code: a.code, name: a.name, amount: amt }); map.set(a.group, g);
    }
    return [...map.values()];
  };
  // Assets: raw debit-credit (contra accounts are naturally negative → net book value)
  const nonCurrent = grouped((c) => ACC[c].type === 'asset' && !ACC[c].current, 1);
  const current = grouped((c) => ACC[c].type === 'asset' && !!ACC[c].current, 1);
  const liabilities = grouped((c) => ACC[c].type === 'liability', -1);
  // Prior-year P&L is closed into retained earnings (8710); current-year result shown separately.
  const fyStart = asOf.slice(0, 4) + '-01-01';
  const prior = balances(entries, scope, undefined, addDays(fyStart, -1));
  const pl = (bb: Record<string, number>) => -CHART.filter((a) => a.type === 'revenue' || a.type === 'expense').reduce((s, a) => s + (bb[a.code] || 0), 0);
  const priorEarnings = pl(prior);
  const equity = CHART.filter((a) => a.type === 'equity').map((a) => ({ code: a.code, name: a.name, amount: -(b[a.code] || 0) + (a.code === '8710' ? priorEarnings : 0) })).filter((x) => Math.abs(x.amount) > EPS);
  const currentEarnings = pl(b) - priorEarnings;
  const totalNonCurrent = nonCurrent.reduce((s, g) => s + g.amount, 0);
  const totalCurrent = current.reduce((s, g) => s + g.amount, 0);
  const totalAssets = totalNonCurrent + totalCurrent;
  const totalLiabilities = liabilities.reduce((s, g) => s + g.amount, 0);
  const totalEquity = equity.reduce((s, x) => s + x.amount, 0) + currentEarnings;
  const totalLE = totalLiabilities + totalEquity;
  return { nonCurrent, current, totalNonCurrent, totalCurrent, totalAssets, liabilities, totalLiabilities, equity, currentEarnings, totalEquity, totalLE, balanced: Math.abs(totalAssets - totalLE) < 1 };
}

// ─── Trial balance ─────────────────────────────────────────────
export interface TBRow { code: string; name: string; type: string; openDr: number; openCr: number; turnDr: number; turnCr: number; closeDr: number; closeCr: number }
export function trialBalance(entries: JournalEntry[], scope: Scope, from: string, to: string) {
  const open = balances(entries, scope, undefined, addDays(from, -1));
  const turnDr: Record<string, number> = {}; const turnCr: Record<string, number> = {};
  for (const l of flatten(entries)) {
    if (!inScope(l, scope) || !between(l.date, from, to)) continue;
    turnDr[l.account] = (turnDr[l.account] || 0) + l.debit; turnCr[l.account] = (turnCr[l.account] || 0) + l.credit;
  }
  const rows: TBRow[] = [];
  for (const a of CHART) {
    const o = open[a.code] || 0; const d = turnDr[a.code] || 0; const c = turnCr[a.code] || 0; const cl = o + d - c;
    if (Math.abs(o) < EPS && !d && !c) continue;
    rows.push({ code: a.code, name: a.name, type: a.type, openDr: o > 0 ? o : 0, openCr: o < 0 ? -o : 0, turnDr: d, turnCr: c, closeDr: cl > 0 ? cl : 0, closeCr: cl < 0 ? -cl : 0 });
  }
  const tot = rows.reduce((t, r) => ({ openDr: t.openDr + r.openDr, openCr: t.openCr + r.openCr, turnDr: t.turnDr + r.turnDr, turnCr: t.turnCr + r.turnCr, closeDr: t.closeDr + r.closeDr, closeCr: t.closeCr + r.closeCr }), { openDr: 0, openCr: 0, turnDr: 0, turnCr: 0, closeDr: 0, closeCr: 0 });
  return { rows, totals: tot, balanced: Math.abs(tot.closeDr - tot.closeCr) < 1 && Math.abs(tot.turnDr - tot.turnCr) < 1 };
}

// ─── General ledger ────────────────────────────────────────────
export function generalLedger(entries: JournalEntry[], scope: Scope, account: string, from: string, to: string) {
  const opening = natural(balances(entries, scope, undefined, addDays(from, -1)), account);
  const sign = normalSign(account);
  let run = opening;
  const rows = flatten(entries)
    .filter((l) => l.account === account && inScope(l, scope) && between(l.date, from, to))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.no < b.no ? -1 : 1))
    .map((l) => { run += (l.debit - l.credit) * sign; return { ...l, balance: run }; });
  return { opening, closing: run, rows };
}

// ─── Cash flow (direct method, classified by source document) ──
const CF_CLASS: Partial<Record<SourceType, { cls: 'operating' | 'investing' | 'financing'; label: string }>> = {
  receipt: { cls: 'operating', label: 'Xaridorlardan tushumlar' },
  retail: { cls: 'operating', label: 'Chakana savdo tushumlari' },
  supplier_payment: { cls: 'operating', label: 'Ta’minotchilarga to‘lovlar' },
  expense: { cls: 'operating', label: 'Operatsion xarajatlar' },
  payroll_payment: { cls: 'operating', label: 'Ish haqi to‘lovlari' },
  tax_payment: { cls: 'operating', label: 'Soliq to‘lovlari' },
  asset_purchase: { cls: 'investing', label: 'Asosiy vositalar xaridi' },
  dividend: { cls: 'financing', label: 'Dividendlar' },
  loan: { cls: 'financing', label: 'Kredit va foiz to‘lovlari' },
  allocation: { cls: 'operating', label: 'Boshqa operatsion' },
  manual: { cls: 'operating', label: 'Boshqa operatsion' },
  adjustment: { cls: 'operating', label: 'Boshqa operatsion' },
  reversal: { cls: 'operating', label: 'Boshqa operatsion' },
};

export interface CashFlow { opening: number; closing: number; sections: { cls: string; label: string; total: number; lines: { label: string; amount: number }[] }[]; net: number; inflow: number; outflow: number }

export function cashFlow(entries: JournalEntry[], scope: Scope, from: string, to: string): CashFlow {
  const openBal = balances(entries, scope, undefined, addDays(from, -1));
  const opening = CASH_ACCOUNTS.reduce((s, c) => s + (openBal[c] || 0), 0);
  const buckets: Record<string, Record<string, number>> = { operating: {}, investing: {}, financing: {} };
  let inflow = 0; let outflow = 0;
  const perEntry = new Map<string, { delta: number; source: SourceType; financing: boolean }>();
  for (const l of flatten(entries)) {
    if (!inScope(l, scope) || !between(l.date, from, to)) continue;
    const cur = perEntry.get(l.entryId) || { delta: 0, source: l.source, financing: false };
    if (isCash(l.account)) cur.delta += l.debit - l.credit;
    else if (ACC[l.account]?.cf === 'financing') cur.financing = true;
    perEntry.set(l.entryId, cur);
  }
  for (const v of perEntry.values()) {
    if (Math.abs(v.delta) < EPS || v.source === 'transfer') continue;
    let c = CF_CLASS[v.source] || { cls: 'operating' as const, label: 'Boshqa operatsion' };
    if (v.financing && v.source !== 'dividend') c = { cls: 'financing', label: v.delta > 0 ? 'Kreditlar olish' : 'Kreditlarni qaytarish' };
    buckets[c.cls][c.label] = (buckets[c.cls][c.label] || 0) + v.delta;
    if (v.delta > 0) inflow += v.delta; else outflow -= v.delta;
  }
  const labels: Record<string, string> = { operating: 'Operatsion faoliyat', investing: 'Investitsion faoliyat', financing: 'Moliyaviy faoliyat' };
  const sections = (['operating', 'investing', 'financing'] as const).map((cls) => {
    const lines = Object.entries(buckets[cls]).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
    return { cls, label: labels[cls], total: lines.reduce((s, x) => s + x.amount, 0), lines };
  });
  const net = sections.reduce((s, x) => s + x.total, 0);
  return { opening, closing: opening + net, sections, net, inflow, outflow };
}

// ─── Monthly series (single pass) ──────────────────────────────
export interface MonthRow { month: string; revenue: number; cogs: number; opex: number; other: number; net: number; gross: number; cashIn: number; cashOut: number; cashEnd: number }
const seriesCache = new WeakMap<JournalEntry[], { n: number; m: Map<string, MonthRow[]> }>();

export function monthlySeries(entries: JournalEntry[], scope: Scope, months: string[]): MonthRow[] {
  const m = cacheFor(seriesCache, entries);
  const key = scopeKey(scope) + months.join(','); const hit = m.get(key); if (hit) return hit;
  const idx = new Map(months.map((k, i) => [k, i]));
  const REV = new Set(REVENUE_ACCOUNTS); const COGS = new Set(COGS_ACCOUNTS); const OPEX = new Set(opexAccounts());
  const rows: MonthRow[] = months.map((month) => ({ month, revenue: 0, cogs: 0, opex: 0, other: 0, net: 0, gross: 0, cashIn: 0, cashOut: 0, cashEnd: 0 }));
  const cashDelta = new Map<string, { i: number; d: number; t: SourceType }>();
  let cashBefore = 0;
  const firstMonth = months[0];
  for (const l of flatten(entries)) {
    if (!inScope(l, scope)) continue;
    const mk = monthKey(l.date);
    if (isCash(l.account) && mk < firstMonth) cashBefore += l.debit - l.credit;
    const i = idx.get(mk); if (i === undefined) continue;
    const r = rows[i]; const a = ACC[l.account]; if (!a) continue;
    const v = l.debit - l.credit;
    if (REV.has(l.account)) r.revenue -= v;
    else if (COGS.has(l.account)) r.cogs += v;
    else if (OPEX.has(l.account)) r.opex += v;
    else if (a.type === 'revenue') r.other -= v;
    else if (a.type === 'expense') r.other -= v;
    if (isCash(l.account)) {
      const c = cashDelta.get(l.entryId) || { i, d: 0, t: l.source }; c.d += v; cashDelta.set(l.entryId, c);
    }
  }
  for (const c of cashDelta.values()) {
    if (c.t === 'transfer') continue;
    if (c.d > 0) rows[c.i].cashIn += c.d; else rows[c.i].cashOut -= c.d;
  }
  let run = cashBefore;
  for (const r of rows) {
    r.gross = r.revenue - r.cogs; r.net = r.gross - r.opex + r.other;
    run += r.cashIn - r.cashOut; r.cashEnd = run;
  }
  m.set(key, rows);
  return rows;
}

/** Sum of lines for given accounts, grouped by an arbitrary key (party, product, project, branch, costCenter). */
export function groupBy(entries: JournalEntry[], scope: Scope, accounts: string[], key: 'partyId' | 'productId' | 'projectId' | 'branchId' | 'costCenter' | 'companyId', from?: string, to?: string, sign = 1) {
  const set = new Set(accounts); const out: Record<string, number> = {};
  for (const l of flatten(entries)) {
    if (!set.has(l.account) || !inScope(l, scope) || !between(l.date, from, to)) continue;
    const k = (l as unknown as Record<string, string | undefined>)[key] || '—';
    out[k] = (out[k] || 0) + (l.debit - l.credit) * sign;
  }
  return out;
}

/** Lines for given accounts — used for "View transactions" drill-downs. */
export function linesFor(entries: JournalEntry[], scope: Scope, accounts: string[], from?: string, to?: string) {
  const set = new Set(accounts);
  return flatten(entries).filter((l) => set.has(l.account) && inScope(l, scope) && between(l.date, from, to))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
