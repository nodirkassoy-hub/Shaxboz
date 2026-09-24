// ─────────────────────────────────────────────────────────────
// Deterministic business simulation: 1 Jan 2026 → TODAY.
// Uses the SAME posting operations as the UI, so every demo number
// (P&L, balance sheet, AR aging, stock, production cost, taxes…)
// is derived from real, balanced journal entries.
// ─────────────────────────────────────────────────────────────
import type { DB, Ctx } from '../db';
import { postEntry, docTotals, byId, invOpen, billOpen, productOf, nextId } from '../db';
import type { DocLine, JournalLine, FixedAsset, PurchaseOrder } from '../types';
import * as op from '../ops';
import { makeRng } from '../core/rng';
import { addDays, monthEnd, monthKey, isWorkday, TODAY, FY_START, monthLabel, diffDays, quarterEnd } from '../core/dates';
import { peek, addStock } from '../core/inventory';
import { accountBalance } from '../core/ledger';
import { COMPANIES, BRANCHES, WAREHOUSES, PARTIES, PRODUCTS, MACHINES, BOMS, EMPLOYEES, TAX_TYPES, ALERT_RULES, PROJECTS } from './master';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function emptyDb(): DB {
  return {
    version: 3, companies: clone(COMPANIES), branches: clone(BRANCHES), warehouses: clone(WAREHOUSES), parties: clone(PARTIES), products: clone(PRODUCTS),
    stock: {}, moves: [], entries: [], salesOrders: [], invoices: [], bills: [], payments: [], purchaseOrders: [], boms: clone(BOMS), workOrders: [],
    machines: clone(MACHINES), employees: clone(EMPLOYEES), attendance: [], leaves: [], payrollRuns: [], assets: [], projects: clone(PROJECTS), budgets: [],
    taxTypes: clone(TAX_TYPES), taxObligations: [], documents: [], approvals: [], bankLines: [], leads: [], activities: [], audit: [], alertRules: clone(ALERT_RULES),
    schedules: [], periods: [], customAccounts: [], sessions: [], logins: [], readAlerts: [], seq: {},
  };
}

const SYS: Ctx = { user: 'Tizim (avtomatik)', role: 'chief_accountant', date: FY_START, time: '08:00:00' };
const USERS = { acc: 'Aziza Karimova', acc2: 'Nilufar Rashidova', sales: 'Dilshod Usmonov', buyer: 'Rustam Ergashev', fac: 'Jasur Rahimov', facAcc: 'Shahlo Ergasheva', srvAcc: 'Sevara Mahmudova', wh: 'Alisher Qodirov', cfo: 'Gulnora Abdullayeva' };

// Monthly seasonality (Jan..Dec) — construction/electrical season peaks in summer/autumn
const SEASON = [0.74, 0.78, 0.9, 0.98, 1.04, 1.1, 1.06, 1.14, 1.2, 1.12, 1.0, 0.94];

export function simulate(): DB {
  const db = emptyDb();
  const R = makeRng(20260923);
  const ctx = (user: string, date: string, role: Ctx['role'] = 'accountant'): Ctx => ({ user, role, date, time: `${String(R.int(9, 17)).padStart(2, '0')}:${String(R.int(0, 59)).padStart(2, '0')}:${String(R.int(0, 59)).padStart(2, '0')}` });

  opening(db);

  // ─── day loop ───────────────────────────────────────────────
  const dueReceipts: { date: string; invId: string; amount: number }[] = [];
  const dueBillPays: { date: string; billId: string }[] = [];
  const pendingPOs: { po: PurchaseOrder; receiveOn: string; billLag: number }[] = [];
  // Opening receivables/payables are settled in Jan–Feb
  for (const inv of db.invoices) dueReceipts.push({ date: addDays(inv.dueDate, R.int(3, 30)), invId: inv.id, amount: inv.total });
  for (const b of db.bills) dueBillPays.push({ date: addDays(b.dueDate, R.int(0, 10)), billId: b.id });
  let d = FY_START;
  while (d <= TODAY) {
    const m = +d.slice(5, 7) - 1; const season = SEASON[m]; const work = isWorkday(d);
    const cx = ctx(USERS.acc, d);

    // ── Attendance (every workday)
    if (work) for (const e of db.employees) {
      if (e.hired > d) continue;
      const r = R.next();
      db.attendance.push({ employeeId: e.id, date: d, status: r < 0.9 ? 'present' : r < 0.95 ? 'late' : r < 0.975 ? 'leave' : r < 0.985 ? 'remote' : 'absent', hours: r < 0.9 ? 8 : r < 0.95 ? 7 : r < 0.985 ? 8 : 0 });
    }

    if (work) {
      // ── Trading: wholesale orders
      const nOrders = R.chance(0.94) ? R.int(2, 4) : 1;
      for (let i = 0; i < nOrders; i++) tradingSale(db, R, d, ctx(USERS.sales, d, 'sales_manager'), dueReceipts);
      // ── Trading: daily retail (POS) cash sales in Tashkent
      if (R.chance(0.85)) retailSale(db, R, d, ctx(USERS.sales, d, 'sales_manager'), season);
      // ── Factory: B2B orders (make-to-order + from stock)
      if (R.chance(0.8 * season)) factorySale(db, R, d, ctx('Zafar Tursunov', d, 'sales_manager'), dueReceipts);
      // ── Factory: production planning (make-to-stock when below reorder point)
      factoryPlanning(db, R, d, ctx(USERS.fac, d, 'production_manager'));
      // ── Factory: progress work orders
      factoryProgress(db, R, d, ctx(USERS.fac, d, 'production_manager'));
      // ── Replenishment (trading + factory raw)
      replenish(db, R, d, ctx(USERS.buyer, d, 'purchasing_manager'), pendingPOs);
    }

    // ── Receive POs due today & bill them
    for (const x of pendingPOs.filter((p) => p.receiveOn === d)) {
      try {
        op.receivePO(db, x.po.id, 'all', d, ctx(x.po.companyId === 'fac' ? 'Umid Karimov' : USERS.wh, d, 'warehouse_manager'));
        const billDate = addDays(d, x.billLag);
        if (billDate <= TODAY) {
          const bill = op.billPO(db, x.po.id, `SF-${R.int(10000, 99999)}`, billDate > d ? d : d, ctx(USERS.acc2, d));
          const sup = byId(db.parties, bill.supplierId)!;
          const pd = addDays(bill.date, sup.terms + R.int(-5, 4));
          dueBillPays.push({ date: pd, billId: bill.id });
        }
      } catch { /* skip */ }
    }
    for (let i = pendingPOs.length - 1; i >= 0; i--) if (pendingPOs[i].receiveOn <= d) pendingPOs.splice(i, 1);

    // ── Services: monthly abonement invoices + project milestones on the 1st workday after the 25th
    if (['03', '10', '20', '24'].includes(d.slice(8))) servicesBilling(db, R, d, ctx(USERS.srvAcc, d), dueReceipts);

    // ── Customer receipts due today
    for (const r of dueReceipts.filter((x) => x.date === d)) {
      const inv = byId(db.invoices, r.invId)!; const amt = Math.min(r.amount, invOpen(inv)); if (amt <= 0) continue;
      op.recordReceipt(db, { date: d, companyId: inv.companyId, branchId: inv.branchId, customerId: inv.customerId, amount: amt, account: '5110', allocations: [{ docId: inv.id, amount: amt }] }, ctx(inv.companyId === 'srv' ? USERS.srvAcc : inv.companyId === 'fac' ? USERS.facAcc : USERS.acc2, d));
    }
    // ── Supplier payments due today
    for (const p of dueBillPays.filter((x) => x.date === d)) {
      const b = byId(db.bills, p.billId)!; const amt = billOpen(b); if (amt <= 0) continue;
      const cash = accountBalance(db.entries, b.companyId, '5110');
      if (cash < amt + 40e6) { p.date = addDays(d, 3); continue; } // cash discipline: postpone
      op.paySupplier(db, { date: d, companyId: b.companyId, branchId: b.branchId, supplierId: b.supplierId, amount: amt, account: '5110', billIds: [b.id] }, ctx(USERS.acc, d));
    }

    // ── Recurring operating expenses
    recurring(db, R, d, cx, dueBillPays);

    // ── Month end
    if (d === monthEnd(d) && d <= TODAY) monthClose(db, R, d, ctx(USERS.acc, d, 'chief_accountant'));

    // ── Mid-month: pay taxes & salaries of previous month
    if (d.slice(8) === '05' || (d.slice(8) === '06' && !isWorkday(addDays(d, -1)))) {
      for (const run of db.payrollRuns.filter((r) => r.status === 'posted' && r.period < monthKey(d))) {
        try { op.payPayroll(db, run.id, d, ctx(USERS.acc, d)); } catch { /* insufficient cash */ }
      }
    }
    for (const o of db.taxObligations.filter((o) => o.status === 'open' && !o.estimate && addDays(o.dueDate, -2) === d)) {
      try { op.payTax(db, o.id, d, ctx(USERS.acc, d)); } catch { /* skip */ }
    }
    d = addDays(d, 1);
  }

  postSimulation(db, R);
  return db;
}

// ═══ Opening balances (31.12.2025) ═══════════════════════════════
function opening(db: DB) {
  const date = '2026-01-01';
  const OB = (companyId: string, lines: JournalLine[], memo: string) =>
    postEntry(db, { date, companyId, branchId: db.companies.find((c) => c.id === companyId)!.branchIds[0], memo, source: { type: 'opening' }, lines }, { ...SYS, date });

  // Fixed assets register (with accumulated depreciation brought forward)
  const A = (id: string, code: string, name: string, category: FixedAsset['category'], companyId: string, branchId: string, purchaseDate: string, cost: number, lifeMonths: number, location: string, responsible: string, factory = false, machineId?: string): FixedAsset => {
    const monthsUsed = Math.max(0, diffDays('2025-12-31', purchaseDate) / 30.44 | 0);
    const salvage = Math.round(cost * 0.05);
    const dep = Math.round((cost - salvage) / lifeMonths);
    const expense = factory ? '2510' : '9425';
    return { id, code, name, category, companyId, branchId, purchaseDate, cost, salvage, lifeMonths, location, responsible, account: '', expenseAccount: expense, status: 'active', depreciatedMonths: [], priorAccum: Math.min(cost - salvage, dep * monthsUsed), factory, machineId };
  };
  db.assets = [
    A('fa1', 'AV-2020-0001', 'Zavod ishlab chiqarish binosi (4 200 m²)', 'building', 'fac', 'chr', '2020-03-01', 6_800_000_000, 300, 'Chirchiq, Sanoat zonasi 14', 'Sardor Alimov', true),
    A('fa2', 'AV-2022-0002', 'CNC lazer kesish dastgohi Bodor 3015', 'machine', 'fac', 'chr', '2022-06-15', 1_450_000_000, 120, 'Sex 1', 'Botir Qosimov', true, 'm1'),
    A('fa3', 'AV-2022-0003', 'Listbukish pressi Amada HG', 'machine', 'fac', 'chr', '2022-09-01', 980_000_000, 120, 'Sex 1', 'Botir Qosimov', true, 'm2'),
    A('fa4', 'AV-2023-0004', 'Kukun bo‘yash liniyasi', 'machine', 'fac', 'chr', '2023-02-10', 760_000_000, 120, 'Sex 2', 'Botir Qosimov', true, 'm3'),
    A('fa5', 'AV-2023-0005', 'Termoplast quyish mashinasi Haitian 250', 'machine', 'fac', 'chr', '2023-07-01', 640_000_000, 120, 'Sex 2', 'Botir Qosimov', true, 'm4'),
    A('fa6', 'AV-2022-0006', 'Dizel generator 250 kVA', 'equipment', 'fac', 'chr', '2022-11-01', 310_000_000, 144, 'Zavod hududi', 'Botir Qosimov', true),
    A('fa7', 'AV-2023-0007', 'Yuk mashinasi Isuzu NPR', 'vehicle', 'trd', 'tas', '2023-08-10', 520_000_000, 96, 'Toshkent, Ombor A', 'Alisher Qodirov'),
    A('fa8', 'AV-2024-0008', 'Forklift Toyota 2.5t', 'vehicle', 'trd', 'tas', '2024-03-01', 290_000_000, 96, 'Ombor A', 'Alisher Qodirov'),
    A('fa9', 'AV-2024-0009', 'Server va tarmoq uskunalari', 'computer', 'trd', 'tas', '2024-02-15', 240_000_000, 60, 'Ofis, Toshkent', 'Firdavs Qo‘chqorov'),
    A('fa10', 'AV-2021-0010', 'Ombor stellaj tizimi (Ombor A)', 'equipment', 'trd', 'tas', '2021-05-01', 380_000_000, 120, 'Ombor A', 'Alisher Qodirov'),
    A('fa11', 'AV-2024-0011', 'Chevrolet Tracker (xizmat avtomobili)', 'vehicle', 'srv', 'tas', '2024-05-20', 310_000_000, 96, 'Toshkent', 'Behruz Salimov'),
    A('fa12', 'AV-2023-0012', 'O‘lchov va diagnostika uskunalari (Fluke)', 'equipment', 'srv', 'tas', '2023-10-01', 180_000_000, 84, 'Toshkent', 'Aziz Nurmatov'),
    A('fa13', 'AV-2025-0013', 'Noutbuklar (14 dona)', 'computer', 'srv', 'tas', '2025-01-15', 168_000_000, 48, 'Ofis', 'Kamola Yusupova'),
  ];
  for (const a of db.assets) { const acc: Record<string, string> = { building: '0120', machine: '0130', vehicle: '0150', computer: '0160', equipment: '0190', other: '0190' }; a.account = acc[a.category]; }

  const assetLines = (co: string) => {
    const lines: JournalLine[] = [];
    const accDep: Record<string, string> = { '0120': '0220', '0130': '0230', '0150': '0250', '0160': '0260', '0190': '0290' };
    for (const a of db.assets.filter((x) => x.companyId === co)) { lines.push({ account: a.account, debit: a.cost, credit: 0, memo: a.name }); lines.push({ account: accDep[a.account], debit: 0, credit: a.priorAccum, memo: a.name }); }
    return lines;
  };

  // Opening stock
  const stockLines = (co: string, method: 'FIFO' | 'AVG') => {
    const lines: JournalLine[] = [];
    const initial: Record<string, [string, number][]> = {
      trd: [['g1', 4200], ['g2', 21000], ['g3', 12000], ['g4', 70000], ['g5', 8000], ['g6', 300], ['g7', 2000]],
      fac: [['r1', 30000], ['r2', 2600], ['r3', 5000], ['r4', 3200], ['r5', 1800], ['r6', 2400], ['f1', 150], ['f2', 70], ['f3', 700], ['f4', 1000]],
    };
    for (const [pid, q] of initial[co] || []) {
      const p = PRODUCTS.find((x) => x.id === pid)!;
      const wh = co === 'fac' ? (p.kind === 'raw' ? 'wR' : 'wF') : 'wA';
      const spread: [string, number][] = co === 'trd' ? [['wA', Math.round(q * 0.6)], ['wB', Math.round(q * 0.25)], ['wC', q - Math.round(q * 0.6) - Math.round(q * 0.25)]] : [[wh, q]];
      for (const [w, qq] of spread) {
        const val = Math.round(qq * p.stdCost * 0.985);
        addStock(db.stock, method, pid, w, qq, val, '2025-12-31', 'OB-2025', 'Boshlang‘ich qoldiq');
        db.moves.push({ id: nextId(db, 'mv'), date, productId: pid, warehouseId: w, qty: qq, cost: val, kind: 'opening', ref: 'Boshlang‘ich qoldiq', companyId: co, batch: 'OB-2025', user: SYS.user });
        lines.push({ account: p.kind === 'raw' ? '1010' : p.kind === 'finished' ? '2810' : '2910', debit: val, credit: 0, productId: pid });
      }
    }
    return lines;
  };

  const eq = (co: string, lines: JournalLine[], capital: number) => {
    const dr = lines.reduce((s, l) => s + l.debit - l.credit, 0);
    lines.push({ account: '8330', debit: 0, credit: capital });
    lines.push({ account: '8710', debit: 0, credit: dr - capital });
    return lines;
  };

  // Opening AR/AP (partyless opening invoices are represented as open invoices to keep aging consistent)
  const trd = [...assetLines('trd'), ...stockLines('trd', 'FIFO'),
    { account: '5110', debit: 1_480_000_000, credit: 0 }, { account: '5010', debit: 62_000_000, credit: 0 }, { account: '5210', debit: 412_000_000, credit: 0, memo: '≈ $32 600' },
    { account: '4010', debit: 624_000_000, credit: 0 }, { account: '6010', debit: 0, credit: 438_000_000 }, { account: '6411', debit: 0, credit: 96_000_000 },
    { account: '6412', debit: 0, credit: 112_000_000 }, { account: '6810', debit: 0, credit: 600_000_000, memo: 'Kapitalbank qisqa muddatli kredit' }];
  OB('trd', eq('trd', trd, 1_000_000_000), 'Boshlang‘ich qoldiqlar 01.01.2026');
  const fac = [...assetLines('fac'), ...stockLines('fac', 'AVG'),
    { account: '5110', debit: 980_000_000, credit: 0 }, { account: '5010', debit: 24_000_000, credit: 0 },
    { account: '4010', debit: 410_000_000, credit: 0 }, { account: '6010', debit: 0, credit: 352_000_000 }, { account: '6411', debit: 0, credit: 64_000_000 },
    { account: '6412', debit: 0, credit: 88_000_000 }, { account: '7810', debit: 0, credit: 2_400_000_000, memo: 'Sanoatqurilishbank investitsiya krediti' }];
  OB('fac', eq('fac', fac, 4_000_000_000), 'Boshlang‘ich qoldiqlar 01.01.2026');
  const srv = [...assetLines('srv'), { account: '5110', debit: 540_000_000, credit: 0 }, { account: '5010', debit: 12_000_000, credit: 0 },
    { account: '4010', debit: 236_000_000, credit: 0 }, { account: '6010', debit: 0, credit: 44_000_000 }, { account: '6411', debit: 0, credit: 28_000_000 }, { account: '6412', debit: 0, credit: 36_000_000 }];
  OB('srv', eq('srv', srv, 300_000_000), 'Boshlang‘ich qoldiqlar 01.01.2026');

  // Opening AR as open invoices (so aging & collections are consistent with 4010)
  const obInv = (companyId: string, customerId: string, amount: number, date: string, due: string) => {
    db.invoices.push({ id: nextId(db, 'inv'), no: `OB-${companyId.toUpperCase()}-${customerId.toUpperCase()}`, kind: 'sales', date, dueDate: due, companyId, branchId: db.parties.find((p) => p.id === customerId)!.branchId === 'chr' ? 'chr' : (companyId === 'trd' ? db.parties.find((p) => p.id === customerId)!.branchId : db.companies.find((c) => c.id === companyId)!.branchIds[0]), customerId, lines: [{ description: 'Boshlang‘ich qoldiq (2025)', qty: 1, price: amount, discount: 0, vat: 0 }], net: amount, vat: 0, total: amount, paid: 0, credited: 0, reminders: [], memo: 'Boshlang‘ich qoldiq' });
  };
  [['c1', 180e6, '2025-12-10', '2026-01-09'], ['c2', 96e6, '2025-12-15', '2026-01-14'], ['c3', 214e6, '2025-11-28', '2026-01-12'], ['c6', 134e6, '2025-11-20', '2026-01-19']].forEach(([c, a, d1, d2]) => obInv('trd', c as string, a as number, d1 as string, d2 as string));
  [['c5', 170e6, '2025-12-05', '2026-01-04'], ['c7', 140e6, '2025-12-12', '2026-01-11'], ['c8', 100e6, '2025-12-18', '2026-01-17']].forEach(([c, a, d1, d2]) => obInv('fac', c as string, a as number, d1 as string, d2 as string));
  [['c9', 136e6, '2025-12-20', '2026-01-04'], ['c10', 100e6, '2025-12-22', '2026-01-21']].forEach(([c, a, d1, d2]) => obInv('srv', c as string, a as number, d1 as string, d2 as string));
  // Opening AP as bills
  const obBill = (companyId: string, supplierId: string, amount: number, date: string, due: string) => db.bills.push({ id: nextId(db, 'bill'), no: `OB-${companyId.toUpperCase()}-${supplierId.toUpperCase()}`, supplierRef: 'OB-2025', date, dueDate: due, companyId, branchId: db.companies.find((c) => c.id === companyId)!.branchIds[0], supplierId, net: amount, vat: 0, total: amount, paid: 0, category: 'goods', memo: 'Boshlang‘ich qoldiq' });
  obBill('trd', 's1', 268e6, '2025-12-12', '2026-01-11'); obBill('trd', 's2', 170e6, '2025-12-20', '2026-01-19');
  obBill('fac', 's3', 204e6, '2025-12-15', '2026-01-14'); obBill('fac', 's4', 148e6, '2025-12-22', '2026-01-21');
  obBill('srv', 's15', 44e6, '2025-12-25', '2026-01-09');
  // Opening tax obligations (December 2025)
  db.taxObligations.push(
    { id: 'tx0a', taxId: 't1', companyId: 'trd', period: 'Dekabr 2025', amount: 96_000_000, dueDate: '2026-01-20', status: 'open', docStatus: 'ok' },
    { id: 'tx0b', taxId: 't2', companyId: 'trd', period: '4-chorak 2025', amount: 112_000_000, dueDate: '2026-01-25', status: 'open', docStatus: 'ok' },
    { id: 'tx0c', taxId: 't1', companyId: 'fac', period: 'Dekabr 2025', amount: 64_000_000, dueDate: '2026-01-20', status: 'open', docStatus: 'ok' },
    { id: 'tx0d', taxId: 't2', companyId: 'fac', period: '4-chorak 2025', amount: 88_000_000, dueDate: '2026-01-25', status: 'open', docStatus: 'ok' },
    { id: 'tx0e', taxId: 't1', companyId: 'srv', period: 'Dekabr 2025', amount: 28_000_000, dueDate: '2026-01-20', status: 'open', docStatus: 'ok' },
    { id: 'tx0f', taxId: 't2', companyId: 'srv', period: '4-chorak 2025', amount: 36_000_000, dueDate: '2026-01-25', status: 'open', docStatus: 'ok' },
  );
  // closed December 2025 period marker
  for (const c of COMPANIES) db.periods.push({ companyId: c.id, period: '2025-12', status: 'closed', closedBy: USERS.acc, closedAt: '2026-01-12' });
}

// ═══ Sales ═══════════════════════════════════════════════════════
type DueR = { date: string; invId: string; amount: number }[];

function payPlan(db: DB, R: ReturnType<typeof makeRng>, invId: string, due: DueR) {
  const inv = byId(db.invoices, invId)!; const cust = byId(db.parties, inv.customerId)!;
  const b = cust.behaviour || 'normal';
  const lag = b === 'punctual' ? R.int(-8, 1) : b === 'normal' ? R.int(-4, 8) : (R.chance(0.15) ? R.int(45, 95) : R.int(4, 34));
  const date = addDays(inv.dueDate, lag);
  if (b === 'late' && R.chance(0.35)) {
    const first = Math.round(inv.total * R.pick([0.3, 0.4, 0.5]));
    due.push({ date, invId, amount: first }); due.push({ date: addDays(date, R.int(15, 40)), invId, amount: inv.total - first });
  } else due.push({ date, invId, amount: inv.total });
}

function pickLines(R: ReturnType<typeof makeRng>, pool: string[], scale: number): DocLine[] {
  const n = R.int(1, 3); const used = new Set<string>(); const lines: DocLine[] = [];
  for (let i = 0; i < n; i++) {
    const pid = R.pick(pool); if (used.has(pid)) continue; used.add(pid);
    const p = PRODUCTS.find((x) => x.id === pid)!;
    const base: Record<string, [number, number]> = { g1: [40, 220], g2: [150, 900], g3: [120, 700], g4: [800, 5000], g5: [100, 600], g6: [2, 14], g7: [15, 90], f1: [8, 24], f2: [4, 13], f3: [50, 160], f4: [80, 260] };
    const [a, b] = base[pid] || [1, 5];
    const qty = Math.max(1, Math.round(R.int(a, b) * scale));
    lines.push({ productId: pid, description: p.name, qty, price: p.price, discount: R.pick([0, 0, 0, 2, 3, 5]), vat: p.vat });
  }
  return lines;
}

function tradingSale(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx, due: DueR) {
  const cust = R.pick(['c1', 'c1', 'c2', 'c3', 'c3', 'c4', 'c6', 'c8', 'c10', 'c11']);
  const party = byId(db.parties, cust)!;
  const branch = party.branchId === 'sam' ? 'sam' : party.branchId === 'bux' ? 'bux' : 'tas';
  const wh = branch === 'sam' ? 'wB' : branch === 'bux' ? 'wC' : 'wA';
  const lines = pickLines(R, ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'], (branch === 'tas' ? 1 : 0.6) * SEASON[+d.slice(5, 7) - 1])
    .filter((l) => peek(db.stock, l.productId!, wh).qty >= l.qty);
  if (!lines.length) return;
  const so = op.createSalesOrder(db, { date: d, deliveryDate: addDays(d, R.int(1, 4)), companyId: 'trd', branchId: branch, warehouseId: wh, customerId: cust, lines }, cx);
  op.deliverSalesOrder(db, so.id, d, cx);
  const inv = op.invoiceSalesOrder(db, so.id, d, cx);
  payPlan(db, R, inv.id, due);
}

function retailSale(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx, season: number) {
  const pool = ['g1', 'g2', 'g3', 'g5', 'g7'];
  const lines: DocLine[] = [];
  for (const pid of pool) {
    if (!R.chance(0.6)) continue; const p = PRODUCTS.find((x) => x.id === pid)!;
    const qty = Math.max(1, Math.round(R.int(10, 48) * season * (pid === 'g2' ? 3 : 1)));
    if (peek(db.stock, pid, 'wA').qty < qty) continue;
    lines.push({ productId: pid, description: p.name, qty, price: Math.round(p.price * 1.12), discount: 0, vat: p.vat });
  }
  if (!lines.length) return;
  const so = op.createSalesOrder(db, { date: d, deliveryDate: d, companyId: 'trd', branchId: 'tas', warehouseId: 'wA', customerId: 'c12', lines, channel: 'retail' }, cx);
  op.deliverSalesOrder(db, so.id, d, cx);
  const inv = op.invoiceSalesOrder(db, so.id, d, cx);
  op.recordReceipt(db, { date: d, companyId: 'trd', branchId: 'tas', customerId: 'c12', amount: inv.total, account: '5010', allocations: [{ docId: inv.id, amount: inv.total }], memo: 'Kassa: chakana savdo' }, cx);
}

function factorySale(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx, due: DueR) {
  const cust = R.pick(['c3', 'c5', 'c6', 'c6', 'c7', 'c8']);
  const lines = pickLines(R, ['f1', 'f1', 'f2', 'f3', 'f4'], 1);
  const short = lines.filter((l) => peek(db.stock, l.productId!, 'wF').qty - op.reservedQty(db, l.productId!, 'wF') < l.qty);
  const so = op.createSalesOrder(db, { date: d, deliveryDate: addDays(d, short.length ? R.int(10, 16) : R.int(2, 5)), companyId: 'fac', branchId: 'chr', warehouseId: 'wF', customerId: cust, lines }, cx);
  if (short.length) {
    for (const l of short) {
      const bom = db.boms.find((b) => b.productId === l.productId)!;
      const qty = Math.ceil(l.qty * 1.1);
      op.createWorkOrder(db, { productId: l.productId!, qty, plannedStart: addDays(d, 1), plannedEnd: addDays(d, Math.max(3, Math.ceil(qty / (bom.outputPerHour * 12)))), soId: so.id, companyId: 'fac', branchId: 'chr', crew: ['e17', 'e18', 'e20'] }, cx);
    }
  } else {
    // deliver soon from stock
    (db as unknown as { _deliver: { soId: string; date: string }[] })._deliver ||= [];
    (db as unknown as { _deliver: { soId: string; date: string }[] })._deliver.push({ soId: so.id, date: addDays(d, R.int(1, 3)) });
  }
  (db as unknown as { _dueRef: DueR })._dueRef = due;
}

function factoryPlanning(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx) {
  for (const p of db.products.filter((x) => x.kind === 'finished')) {
    const avail = peek(db.stock, p.id, 'wF').qty - op.reservedQty(db, p.id, 'wF') + op.incomingQty(db, p.id, 'wF');
    if (avail < p.reorderPoint) {
      const bom = db.boms.find((b) => b.productId === p.id)!;
      const batch = Math.round(p.reorderQty / 2);
      const days = Math.max(3, Math.ceil(batch / (bom.outputPerHour * 14)));
      op.createWorkOrder(db, { productId: p.id, qty: batch, plannedStart: addDays(d, 1), plannedEnd: addDays(d, days), companyId: 'fac', branchId: 'chr', crew: ['e17', 'e19', 'e21'] }, cx);
    }
  }
  // deliver make-to-order / from-stock orders
  const q = (db as unknown as { _deliver?: { soId: string; date: string }[] })._deliver || [];
  const due = (db as unknown as { _dueRef?: DueR })._dueRef;
  for (const x of q.filter((y) => y.date <= d)) {
    const so = byId(db.salesOrders, x.soId)!; if (so.status !== 'confirmed') { x.date = '9999'; continue; }
    try {
      op.deliverSalesOrder(db, so.id, d, cx);
      const inv = op.invoiceSalesOrder(db, so.id, d, { ...cx, user: USERS.facAcc });
      if (due) payPlan(db, R, inv.id, due);
      x.date = '9999';
    } catch { x.date = addDays(d, 2); }
  }
  for (let i = q.length - 1; i >= 0; i--) if (q[i].date === '9999') q.splice(i, 1);
}

function factoryProgress(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx) {
  for (const wo of db.workOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled')) {
    try {
      if (wo.status === 'planned' && wo.plannedStart <= d) {
        op.releaseWorkOrder(db, wo.id, d, cx);
      } else if (wo.status === 'in_progress' && wo.plannedEnd <= d && d < TODAY) {
        const bom = byId(db.boms, wo.bomId)!;
        const scrapRate = Math.max(0.005, (bom.scrapPct / 100) * R.around(1, 0.5) * (d >= '2026-08-01' && wo.productId === 'f3' ? 2.2 : 1));
        const scrap = Math.round(wo.qty * scrapRate); const good = wo.qty - scrap;
        op.qcWorkOrder(db, wo.id, good, scrap, 'pass', scrap > wo.qty * 0.05 ? 'Brak normadan yuqori — quyish harorati tekshirilsin' : 'Norma doirasida', { ...cx, user: 'Dilnoza Ahmedova', role: 'production_manager' });
        op.completeWorkOrder(db, wo.id, d, cx);
      }
    } catch { /* shortages: wait for materials */ }
  }
}

function replenish(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx, pending: { po: PurchaseOrder; receiveOn: string; billLag: number }[]) {
  const plan: { companyId: string; wh: string; branch: string; items: string[] }[] = [
    { companyId: 'trd', wh: 'wA', branch: 'tas', items: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'] },
    { companyId: 'fac', wh: 'wR', branch: 'chr', items: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] },
  ];
  for (const pl of plan) {
    for (const pid of pl.items) {
      const p = byId(db.products, pid)!;
      let demand = 0;
      if (pl.companyId === 'fac') {
        for (const wo of db.workOrders.filter((w) => w.status === 'planned')) { const bom = byId(db.boms, wo.bomId)!; const l = bom.lines.find((x) => x.productId === pid); if (l) demand += l.qty * wo.qty * (1 + bom.scrapPct / 100); }
      }
      const whs = pl.companyId === 'trd' ? ['wA', 'wB', 'wC'] : [pl.wh];
      const onHand = whs.reduce((s, w) => s + peek(db.stock, pid, w).qty, 0);
      const pos = onHand + op.incomingQty(db, pid) - demand;
      if (pos >= p.reorderPoint) continue;
      const qty = Math.ceil((p.reorderQty + Math.max(0, demand - onHand)) / 10) * 10;
      const price = Math.round(p.stdCost * R.around(1, 0.03) * (pid === 'r2' && d >= '2026-07-01' ? 1.16 : pid === 'r1' && d >= '2026-08-01' ? 1.07 : 1));
      const sup = p.supplierId!;
      const po = op.createPurchaseRequest(db, { date: d, expectedDate: addDays(d, p.leadDays || 7), companyId: pl.companyId, branchId: pl.branch, warehouseId: pl.wh, lines: [{ productId: pid, description: p.name, qty, price, discount: 0, vat: 12 }], supplierId: sup, requestedBy: cx.user }, cx);
      op.submitPO(db, po, cx);
      const ap = db.approvals[db.approvals.length - 1];
      ap.status = 'approved'; ap.decidedBy = (ap.amount || 0) > 100e6 ? USERS.cfo : USERS.acc; ap.decidedAt = d;
      op.approvePO(db, po.id, { ...cx, user: ap.decidedBy });
      const supRating = byId(db.parties, sup)!.rating || 4;
      const delay = supRating < 4 ? R.int(0, 6) : R.int(-1, 2);
      pending.push({ po, receiveOn: addDays(d, (p.leadDays || 7) + delay), billLag: 0 });
      // trading: rebalance branch stock after receipt via transfers (handled in postSimulation for realism)
    }
  }
  // Trading: weekly transfers from A to branches when below 25% of total
  if (isWorkday(d) && +d.slice(8) % 7 === 1) {
    for (const pid of ['g1', 'g2', 'g3', 'g4', 'g5', 'g7']) {
      for (const [wh, share] of [['wB', 0.22], ['wC', 0.14]] as const) {
        const tot = ['wA', 'wB', 'wC'].reduce((s, w) => s + peek(db.stock, pid, w).qty, 0);
        const cur = peek(db.stock, pid, wh).qty; const target = Math.round(tot * share);
        const q = target - cur; if (q < 20 || peek(db.stock, pid, 'wA').qty < q + 50) continue;
        op.transferStock(db, { date: d, productId: pid, from: 'wA', to: wh, qty: q }, { ...cx, user: USERS.wh, role: 'warehouse_manager' });
      }
    }
  }
}

function servicesBilling(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx, due: DueR) {
  const m = +d.slice(5, 7); const season = SEASON[m - 1]; const day = d.slice(8);
  if (day === '10' || day === '24') {
    const hours = Math.round(R.int(90, 180) * season);
    const inv = op.createInvoice(db, { date: d, companyId: 'srv', branchId: 'tas', customerId: R.pick(['c10', 'c5', 'c7', 'c9']), lines: [{ productId: 'v1', description: `Elektr montaj ishlari — ${hours} soat`, qty: hours, price: 180_000, discount: 0, vat: 12 }, { productId: 'v4', description: 'Muhandislik konsaltingi', qty: R.int(2, 6), price: 2_400_000, discount: 0, vat: 12 }] }, cx);
    payPlan(db, R, inv.id, due);
    return;
  }
  if (day === '20') return projectBilling(db, R, d, cx, due);
  // monthly maintenance contracts (billed in advance)
  for (const [cust, pj] of [['c7', 'pj4'], ['c9', undefined], ['c5', undefined]] as const) {
    const v2 = PRODUCTS.find((p) => p.id === 'v2')!;
    const inv = op.createInvoice(db, { date: d, companyId: 'srv', branchId: 'tas', customerId: cust, lines: [{ productId: 'v2', description: `${v2.name} — ${monthLabel(monthKey(d))}`, qty: 1, price: cust === 'c7' ? 22_000_000 : v2.price, discount: 0, vat: 12 }], projectId: pj }, cx);
    payPlan(db, R, inv.id, due);
  }
}

function projectBilling(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx, due: DueR) {
  const milestones: Record<string, [string, number][]> = {
    pj1: [['2026-04', 0.2], ['2026-05', 0.15], ['2026-06', 0.15], ['2026-07', 0.15], ['2026-08', 0.15]],
    pj2: [['2026-06', 0.2], ['2026-07', 0.2], ['2026-09', 0.2]],
    pj3: [['2026-03', 0.3], ['2026-05', 0.3], ['2026-06', 0.4]],
  };
  const contract: Record<string, number> = { pj1: 820_000_000, pj2: 505_000_000, pj3: 300_000_000 };
  for (const [pj, list] of Object.entries(milestones)) {
    const hit = list.find(([mk]) => mk === monthKey(d)); if (!hit) continue;
    const proj = byId(db.projects, pj)!;
    const inv = op.createInvoice(db, { date: d, companyId: 'srv', branchId: 'tas', customerId: proj.customerId!, lines: [{ productId: 'v3', description: `${proj.name} — bosqich ${list.indexOf(hit) + 1}`, qty: 1, price: Math.round(contract[pj] * hit[1]), discount: 0, vat: 12 }], projectId: pj }, cx);
    payPlan(db, R, inv.id, due);
  }
}

// ═══ Recurring expenses ══════════════════════════════════════════
function recurring(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx, pays: { date: string; billId: string }[]) {
  const day = +d.slice(8); const m = +d.slice(5, 7); const season = SEASON[m - 1];
  const bill = (companyId: string, branchId: string, supplierId: string, account: string, net: number, memo: string, costCenter: string, projectId?: string) => {
    const b = op.createExpenseBill(db, { date: d, companyId, branchId, supplierId, supplierRef: `SF-${R.int(10000, 99999)}`, account, net: Math.round(net), vatRate: 12, memo, costCenter, projectId }, cx);
    const sup = byId(db.parties, supplierId)!; pays.push({ date: addDays(d, sup.terms + R.int(-2, 3)), billId: b.id });
  };
  if (day === 2) {
    bill('trd', 'tas', 's9', '9422', 62_000_000, 'Ofis va ombor ijarasi (Toshkent)', 'Ma’muriyat');
    bill('trd', 'sam', 's9', '9422', 18_000_000, 'Filial ijarasi (Samarqand)', 'Sotuv');
    bill('trd', 'bux', 's9', '9422', 14_000_000, 'Filial ijarasi (Buxoro)', 'Sotuv');
    bill('srv', 'tas', 's9', '9422', 21_000_000, 'Ofis ijarasi', 'Ma’muriyat');
  }
  if (day === 8) {
    bill('trd', 'tas', 's8', '9423', R.around(16_000_000, 0.12), 'Elektr energiya va kommunal', 'Ma’muriyat');
    bill('fac', 'chr', 's8', '2510', R.around(56_000_000 * (m >= 6 ? 1.12 : 1), 0.06), 'Zavod elektr energiyasi', 'Ishlab chiqarish');
    bill('fac', 'chr', 's8', '9423', R.around(9_000_000, 0.1), 'Ma’muriy bino kommunal', 'Ma’muriyat');
    bill('srv', 'tas', 's8', '9423', R.around(4_500_000, 0.1), 'Kommunal xizmatlar', 'Ma’muriyat');
  }
  if (day === 10) {
    bill('trd', 'tas', 's12', '9424', 9_800_000, 'Internet, telefoniya, 1C/ERP litsenziyalar', 'Ma’muriyat');
    bill('fac', 'chr', 's12', '9424', 6_200_000, 'Aloqa va IT xizmatlari', 'Ma’muriyat');
    bill('srv', 'tas', 's12', '9424', 5_400_000, 'Aloqa va IT xizmatlari', 'Ma’muriyat');
  }
  if (day === 12) {
    const mk = m === 9 ? 146_500_000 : m === 8 ? 113_900_000 : R.around(74_000_000 * season, 0.08);
    bill('trd', 'tas', 's10', '9411', mk, `Marketing kampaniyasi — ${monthLabel(monthKey(d))}`, 'Marketing');
    bill('srv', 'tas', 's10', '9411', m >= 8 ? 11_000_000 + 0 * R.next() : R.around(12_000_000, 0.2), 'Reklama va tender materiallari', 'Marketing');
  }
  if (day === 15) {
    bill('trd', 'tas', 's11', '9412', R.around(38_000_000 * season, 0.1), 'Yetkazib berish va logistika', 'Sotuv');
    bill('trd', 'sam', 's14', '9412', R.around(11_000_000 * season, 0.12), 'Filialga tashish', 'Sotuv');
    bill('fac', 'chr', 's11', '9412', R.around(26_000_000 * season, 0.1), 'Mijozlarga yetkazish', 'Sotuv');
    bill('fac', 'chr', 's13', '2510', R.around(15_000_000, 0.15), 'Uskunalarga texnik xizmat', 'Ishlab chiqarish');
  }
  if (day === 18 && m % 3 === 0) {
    bill('trd', 'tas', 's13', '9427', 42_000_000, 'Choraklik audit va yuridik xizmat', 'Ma’muriyat');
    bill('fac', 'chr', 's13', '9427', 28_000_000, 'Choraklik audit', 'Ma’muriyat');
    bill('srv', 'tas', 's13', '9427', 16_000_000, 'Choraklik audit', 'Ma’muriyat');
  }
  if (day === 20) {
    // services: project materials & subcontract
    const mk = monthKey(d);
    const active = db.projects.filter((p) => p.companyId === 'srv' && p.start <= d && p.end >= d);
    for (const p of active) {
      const share = p.id === 'pj1' ? 0.14 : p.id === 'pj2' ? 0.1 : p.id === 'pj3' ? 0.2 : 0.06;
      const months = Math.max(1, diffDays(p.end, p.start) / 30);
      const mat = (p.budgetMaterials / months) * R.around(1, 0.15) * (p.id === 'pj1' && mk >= '2026-07' ? 1.45 : 1);
      bill('srv', 'tas', R.pick(['s4', 's6']), '9131', mat, `Materiallar: ${p.name}`, 'Loyihalar', p.id);
      if (R.chance(0.5)) bill('srv', 'tas', 's15', '9135', mat * share * 3, `Subpudrat: ${p.name}`, 'Loyihalar', p.id);
    }
  }
  if (day === 25) {
    // bank fees & interest
    for (const co of ['trd', 'fac', 'srv']) op.recordExpense(db, { date: d, companyId: co, branchId: co === 'fac' ? 'chr' : 'tas', account: '9431', amount: Math.round(R.around(co === 'trd' ? 3_800_000 : 2_100_000, 0.2)), payAccount: '5110', memo: 'Bank xizmatlari komissiyasi', costCenter: 'Ma’muriyat' }, cx);
    postEntry(db, { date: d, companyId: 'trd', branchId: 'tas', memo: 'Kredit foizi (Kapitalbank)', source: { type: 'loan' }, lines: [{ account: '9610', debit: 11_200_000, credit: 0 }, { account: '5110', debit: 0, credit: 11_200_000 }] }, cx);
    postEntry(db, { date: d, companyId: 'fac', branchId: 'chr', memo: 'Investitsiya krediti foizi va asosiy qarz', source: { type: 'loan' }, lines: [{ account: '9610', debit: 34_000_000, credit: 0 }, { account: '7810', debit: 50_000_000, credit: 0 }, { account: '5110', debit: 0, credit: 84_000_000 }] }, cx);
    if (m === 4) postEntry(db, { date: d, companyId: 'trd', branchId: 'tas', memo: 'Qisqa muddatli kredit qaytarildi', source: { type: 'loan' }, lines: [{ account: '6810', debit: 300_000_000, credit: 0 }, { account: '5110', debit: 0, credit: 300_000_000 }] }, cx);
  }
  if (day === 14 && m % 2 === 0) op.recordExpense(db, { date: d, companyId: 'trd', branchId: 'tas', account: '9426', amount: Math.round(R.around(6_500_000, 0.25)), vat: 0, payAccount: '5010', memo: 'Ofis va xo‘jalik mollari', costCenter: 'Ma’muriyat' }, cx);
  // Cash: move retail cash to bank twice a week
  if (isWorkday(d) && (day % 7 === 3 || day % 7 === 6)) {
    const cash = accountBalance(db.entries, 'trd', '5010');
    if (cash > 60_000_000) op.transferCash(db, { date: d, companyId: 'trd', branchId: 'tas', from: '5010', to: '5110', amount: Math.round((cash - 40_000_000) / 1e6) * 1e6, memo: 'Kassadan bankka inkassatsiya' }, cx);
  }
  // Dividends mid-year
  if (d === '2026-07-15') postEntry(db, { date: d, companyId: 'trd', branchId: 'tas', memo: '2025 yil yakuni bo‘yicha dividend', source: { type: 'dividend' }, lines: [{ account: '8710', debit: 350_000_000, credit: 0 }, { account: '5110', debit: 0, credit: 350_000_000 }] }, cx);
  // One-off unusual expense (for AI anomaly detection)
  if (d === '2026-09-16') op.recordExpense(db, { date: d, companyId: 'trd', branchId: 'tas', account: '9426', amount: 48_600_000, vat: 5_832_000, payAccount: '5110', memo: 'Ofis mebeli va jihozlari (bir martalik)', costCenter: 'Ma’muriyat', supplierId: 's7' }, cx);
}

// ═══ Month close ═════════════════════════════════════════════════
function monthClose(db: DB, R: ReturnType<typeof makeRng>, d: string, cx: Ctx) {
  const mk = monthKey(d);
  for (const co of ['trd', 'fac', 'srv']) {
    // payroll
    const run = op.createPayrollRun(db, co, mk, cx);
    (run as { status: string }).status = 'approved';
    op.postPayroll(db, run.id, d, cx);
    // depreciation
    try { op.runDepreciation(db, co, mk, cx); } catch { /* none */ }
  }
  op.closeOverhead(db, 'fac', d, cx);
  for (const co of ['trd', 'fac', 'srv']) op.settleVat(db, co, mk, cx);
  if (d === quarterEnd(d)) {
    const q = Math.ceil(+d.slice(5, 7) / 3); const qs = `${d.slice(0, 4)}-${String(q * 3 - 2).padStart(2, '0')}-01`;
    for (const co of ['trd', 'fac', 'srv']) { op.accrueIncomeTax(db, co, qs, d, `${q}-chorak ${d.slice(0, 4)}`, cx); op.accruePropertyTax(db, co, d, `${q}-chorak ${d.slice(0, 4)}`, cx); }
  }
  // Close period after 10 days (simulated) — all months up to July are closed
  if (mk <= '2026-07') for (const co of ['trd', 'fac', 'srv']) db.periods.push({ companyId: co, period: mk, status: 'closed', closedBy: USERS.acc, closedAt: addDays(d, 10) });
  void R;
}

// ═══ Post-simulation: open items for "today" (drafts, approvals, CRM, docs, bank) ════
function postSimulation(db: DB, R: ReturnType<typeof makeRng>) {
  const t = TODAY;
  const cx = (user: string, role: Ctx['role'] = 'accountant'): Ctx => ({ user, role, date: t, time: `${String(R.int(8, 11)).padStart(2, '0')}:${String(R.int(0, 59)).padStart(2, '0')}:00` });

  // ── Current production: one WO in progress, one awaiting QC, one planned
  const pc = cx(USERS.fac, 'production_manager');
  const woA = op.createWorkOrder(db, { productId: 'f1', qty: 60, plannedStart: '2026-09-18', plannedEnd: '2026-09-26', companyId: 'fac', branchId: 'chr', crew: ['e17', 'e18', 'e20', 'e21'] }, { ...pc, date: '2026-09-17' });
  op.releaseWorkOrder(db, woA.id, '2026-09-18', { ...pc, date: '2026-09-18' });
  const woB = op.createWorkOrder(db, { productId: 'f3', qty: 400, plannedStart: '2026-09-15', plannedEnd: '2026-09-22', companyId: 'fac', branchId: 'chr', crew: ['e19', 'e25'] }, { ...pc, date: '2026-09-14' });
  op.releaseWorkOrder(db, woB.id, '2026-09-15', { ...pc, date: '2026-09-15' });
  op.qcWorkOrder(db, woB.id, 371, 29, 'pass', 'Brak 7.3% — norma 4%. Quyish qolipi harorati tekshirilsin.', { ...pc, user: 'Dilnoza Ahmedova' });
  op.createWorkOrder(db, { productId: 'f2', qty: 40, plannedStart: '2026-09-28', plannedEnd: '2026-10-08', companyId: 'fac', branchId: 'chr', crew: ['e17', 'e18', 'e19', 'e20'] }, { ...pc, date: '2026-09-22' });

  // ── Machine load for the current month from work orders (routing hours)
  const workdays = 16; // workdays elapsed in September up to today
  for (const m of db.machines) {
    let h = 0;
    for (const wo of db.workOrders) {
      const active = (wo.actualEnd && wo.actualEnd >= '2026-09-01') || ['in_progress', 'qc'].includes(wo.status);
      if (!active) continue;
      const bom = byId(db.boms, wo.bomId)!; const r = bom.routing.find((x) => x.machineId === m.id); if (!r) continue;
      const done = wo.status === 'completed' ? wo.qty : wo.status === 'qc' ? wo.qty : Math.round(wo.qty * 0.55);
      h += r.factor * done;
    }
    const avail = m.capacityHours * workdays / 22;
    m.usedHours = Math.round(h); m.oee = Math.min(0.92, (h / avail) * 0.88);
    if (m.status === 'maintenance') m.oee = Math.min(m.oee, 0.38);
  }
  delete (db as unknown as { _deliver?: unknown })._deliver; delete (db as unknown as { _dueRef?: unknown })._dueRef;

  // September VAT & payroll are not yet settled → estimated obligations
  for (const co of ['trd', 'fac', 'srv']) {
    const v = op.vatPosition(db, co, '2026-09');
    if (v.payable > 0) db.taxObligations.push({ id: nextId(db, 'tx'), taxId: 't1', companyId: co, period: 'Sentyabr 2026', amount: Math.round(v.payable), dueDate: '2026-10-20', status: 'open', docStatus: co === 'trd' ? 'attention' : 'ok', estimate: true });
  }
  // A tax document needing attention
  const aug = db.taxObligations.find((o) => o.companyId === 'fac' && o.period === 'Avgust 2026' && o.taxId === 't1');
  if (aug) aug.docStatus = 'attention';

  // ── Draft & pending operational items (approval center)
  const cr = cx(USERS.buyer, 'purchasing_manager');
  const pr1 = op.createPurchaseRequest(db, { date: '2026-09-21', expectedDate: '2026-10-05', companyId: 'fac', branchId: 'chr', warehouseId: 'wR', lines: [{ productId: 'r2', description: 'Mis sim / shina', qty: 2400, price: 0, discount: 0, vat: 12 }, { productId: 'r4', description: 'Elektr komponentlar to‘plami', qty: 600, price: 0, discount: 0, vat: 12 }], requestedBy: USERS.fac }, cr);
  op.sendRfq(db, pr1.id, ['s4', 's6', 's1'], cr);
  op.recordQuote(db, pr1.id, 's4', [112_500, 147_000], 7, '2026-09-22', cr);
  op.recordQuote(db, pr1.id, 's6', [118_000, 139_500], 12, '2026-09-22', cr);
  const pr2 = op.createPurchaseRequest(db, { date: '2026-09-22', expectedDate: '2026-10-10', companyId: 'trd', branchId: 'tas', warehouseId: 'wA', lines: [{ productId: 'g6', description: 'Kuchlanish stabilizatori 5 kVt', qty: 120, price: 1_655_000, discount: 0, vat: 12 }], supplierId: 's1', requestedBy: USERS.buyer }, cr);
  op.submitPO(db, pr2, cr);
  op.createPurchaseRequest(db, { date: '2026-09-23', expectedDate: '2026-10-15', companyId: 'trd', branchId: 'sam', warehouseId: 'wB', lines: [{ productId: 'g7', description: 'LED projektor 100W', qty: 300, price: 0, discount: 0, vat: 12 }], requestedBy: USERS.buyer }, cr);

  // Big quote for Asia Build (pending discount approval)
  const q = op.createSalesOrder(db, { date: '2026-09-22', deliveryDate: '2026-10-10', companyId: 'fac', branchId: 'chr', warehouseId: 'wF', customerId: 'c6', lines: [{ productId: 'f2', description: 'Elektr taqsimlash shkafi ShR-24', qty: 40, price: 5_200_000, discount: 8, vat: 12 }, { productId: 'f4', description: 'Metall kabel lotogi 2 m', qty: 600, price: 238_000, discount: 8, vat: 12 }], status: 'quote' }, cx('Zafar Tursunov', 'sales_manager'));
  op.requestApproval(db, { kind: 'invoice', title: `${q.no} — Asia Build: 8% maxsus chegirma`, description: 'Standart chegirma limiti 5%. Mijoz qarzdorligi 60+ kun — kredit riski tekshirilsin.', amount: docTotals(q.lines).total, companyId: 'fac', requestedBy: 'Zafar Tursunov', approverRole: 'cfo', deadline: '2026-09-24', payload: { action: 'approve_quote', refId: q.id } }, cx('Zafar Tursunov'));
  // Open trading orders (reserved stock)
  const s1 = op.createSalesOrder(db, { date: '2026-09-22', deliveryDate: '2026-09-25', companyId: 'trd', branchId: 'tas', warehouseId: 'wA', customerId: 'c3', lines: [{ productId: 'g1', description: 'LED panel 60×60 36W', qty: 180, price: 185_000, discount: 3, vat: 12 }, { productId: 'g4', description: 'Kabel VVG 3×2.5 (metr)', qty: 4000, price: 14_500, discount: 3, vat: 12 }] }, cx(USERS.sales, 'sales_manager'));
  op.createSalesOrder(db, { date: '2026-09-23', deliveryDate: '2026-09-26', companyId: 'trd', branchId: 'sam', warehouseId: 'wB', customerId: 'c2', lines: [{ productId: 'g3', description: 'Avtomatik o‘chirgich 16A', qty: 400, price: 38_000, discount: 0, vat: 12 }, { productId: 'g5', description: 'Rozetka ikki o‘rinli', qty: 300, price: 29_000, discount: 0, vat: 12 }] }, cx('Bobur Toshmatov', 'sales_manager'));
  op.createSalesOrder(db, { date: '2026-09-23', deliveryDate: '2026-10-02', companyId: 'trd', branchId: 'tas', warehouseId: 'wA', customerId: 'c8', lines: [{ productId: 'g6', description: 'Kuchlanish stabilizatori 5 kVt', qty: 12, price: 2_450_000, discount: 2, vat: 12 }], status: 'quote' }, cx(USERS.sales, 'sales_manager'));
  void s1;

  // Expense approvals
  op.requestApproval(db, { kind: 'expense', title: 'Marketing — Oktyabr kampaniyasi (Instagram, Google Ads)', description: 'Sentyabrda marketing byudjeti 24% ga oshib ketgan. Oktyabr uchun 95 mln so‘m so‘ralmoqda.', amount: 95_000_000, companyId: 'trd', requestedBy: 'Nodira Sultonova', approverRole: 'ceo', deadline: '2026-09-26', payload: { action: 'approve_expense', data: { account: '9411', supplierId: 's10', net: 95_000_000, costCenter: 'Marketing', memo: 'Marketing kampaniyasi — Oktyabr' } } }, cx('Nodira Sultonova'));
  op.requestApproval(db, { kind: 'payment', title: 'Metall Opt XK — muddatidan oldin to‘lov (2% chegirma)', description: 'Ta’minotchi 5 kun ichida to‘lansa 2% chegirma taklif qilmoqda.', amount: Math.round(db.bills.filter((b) => b.supplierId === 's3' && billOpen(b) > 0).reduce((s, b) => s + billOpen(b), 0)), companyId: 'fac', requestedBy: USERS.facAcc, approverRole: 'cfo', deadline: '2026-09-25', payload: { action: 'pay_supplier', data: { supplierId: 's3', companyId: 'fac' } } }, cx(USERS.facAcc));
  op.requestApproval(db, { kind: 'stock_adjustment', title: 'Inventarizatsiya farqi — Ombor B (LED chiroq T8)', description: 'Sanoqda 36 dona kamomad aniqlandi. Hisobdan chiqarish so‘ralmoqda.', amount: 36 * 24_500, companyId: 'trd', requestedBy: 'Bobur Toshmatov', approverRole: 'chief_accountant', deadline: '2026-09-27', payload: { action: 'adjust_stock', data: { productId: 'g2', warehouseId: 'wB', delta: -36, reason: 'Sanoq farqi (sentyabr)' } } }, cx('Bobur Toshmatov'));
  op.requestApproval(db, { kind: 'production', title: 'Qo‘shimcha smena — ShR-24 buyurtmasi uchun', description: 'Asia Build taklifi tasdiqlansa, 40 dona ShR-24 ni 10 oktyabrgacha ishlab chiqarish uchun shanba smenasi kerak.', amount: 18_400_000, companyId: 'fac', requestedBy: USERS.fac, approverRole: 'production_manager', deadline: '2026-09-28', payload: { action: 'note' } }, cx(USERS.fac));
  op.requestApproval(db, { kind: 'leave', title: 'Ta’til: Nilufar Rashidova (6–17 oktyabr)', description: 'Yillik mehnat ta’tili, 10 ish kuni.', companyId: 'trd', requestedBy: 'Nilufar Rashidova', approverRole: 'hr_manager', deadline: '2026-09-30', payload: { action: 'note' } }, cx('Nilufar Rashidova'));
  db.leaves.push({ id: 'lv1', employeeId: 'e4', from: '2026-10-06', to: '2026-10-17', kind: 'Yillik ta’til', status: 'pending' }, { id: 'lv2', employeeId: 'e19', from: '2026-09-15', to: '2026-09-19', kind: 'Kasallik varaqasi', status: 'approved' }, { id: 'lv3', employeeId: 'e31', from: '2026-08-04', to: '2026-08-18', kind: 'Yillik ta’til', status: 'approved' });

  // ── CRM leads
  const L = (id: string, name: string, company: string, source: string, value: number, stage: DB['leads'][number]['stage'], owner: string, created: string, companyId: string, probability: number, nextStep?: string, extra: Partial<DB['leads'][number]> = {}) => db.leads.push({ id, name, company, phone: `+998 9${R.int(0, 9)} ${R.int(100, 999)} ${R.int(10, 99)} ${R.int(10, 99)}`, source, value, stage, owner, created, companyId, probability, nextStep, ...extra });
  L('l1', 'Anvar Solihov', 'Toshkent Metro Qurilish', 'Tender', 1_850_000_000, 'negotiation', 'Zafar Tursunov', '2026-08-04', 'fac', 60, 'Tijorat taklifini qayta ko‘rib chiqish — 25.09');
  L('l2', 'Lola Qodirova', 'Mega Mall Samarqand', 'Tavsiya', 420_000_000, 'proposal', 'Bobur Toshmatov', '2026-09-02', 'trd', 40, 'Namuna yetkazish — 26.09');
  L('l3', 'Shuhrat Ibragimov', 'Qizilqum Sement', 'Ko‘rgazma', 960_000_000, 'qualified', 'Behruz Salimov', '2026-09-10', 'srv', 25, 'Obyektga tashrif — 30.09');
  L('l4', 'Dilafruz Nosirova', 'Hilton Tashkent City', 'Veb-sayt', 310_000_000, 'new', 'Kamron Ismoilov', '2026-09-21', 'trd', 10, 'Qo‘ng‘iroq qilish');
  L('l5', 'Murod Haydarov', 'Olmaliq KMK', 'Tender', 2_400_000_000, 'proposal', 'Zafar Tursunov', '2026-07-18', 'fac', 35, 'Texnik shartlar bo‘yicha uchrashuv');
  L('l6', 'Nargiza Aliyeva', 'Buxoro Tekstil Klaster', 'Tavsiya', 185_000_000, 'qualified', 'Olim Rajabov', '2026-09-12', 'trd', 30, 'Narx taklifi yuborish');
  L('l7', 'Sherali Jo‘rayev', 'Yangi O‘zbekiston Park', 'Veb-sayt', 540_000_000, 'new', 'Madina Rasulova', '2026-09-22', 'srv', 10, 'Brif olish');
  L('l8', 'Aziza Po‘latova', 'Korzinka (supermarket)', 'Sovuq qo‘ng‘iroq', 690_000_000, 'negotiation', 'Dilshod Usmonov', '2026-08-20', 'trd', 65, 'Shartnoma loyihasini yuborish');
  L('l9', 'Jahongir Aminov', 'Artel Electronics', 'Ko‘rgazma', 1_200_000_000, 'won', 'Zafar Tursunov', '2026-06-10', 'fac', 100, undefined, { customerId: 'c8' });
  L('l10', 'Umida Hasanova', 'Navoiy Kon Servis', 'Tavsiya', 264_000_000, 'won', 'Aziz Nurmatov', '2026-01-05', 'srv', 100, undefined, { customerId: 'c7' });
  L('l11', 'Botir Rahmonov', 'Ipak Yo‘li Bank', 'Tender', 480_000_000, 'lost', 'Behruz Salimov', '2026-05-12', 'srv', 0, undefined, { lostReason: 'Narx raqobatchidan 14% yuqori' });
  L('l12', 'Kamola Ergasheva', 'Anor Bank ATB', 'Tavsiya', 820_000_000, 'won', 'Madina Rasulova', '2026-02-03', 'srv', 100, undefined, { customerId: 'c9' });
  L('l13', 'Ulug‘bek Sattorov', 'UzAuto Motors', 'Tender', 1_100_000_000, 'lost', 'Zafar Tursunov', '2026-04-01', 'fac', 0, undefined, { lostReason: 'Yetkazish muddati mos kelmadi' });
  L('l14', 'Otabek Norqulov', 'Texno Market', 'Mavjud mijoz', 350_000_000, 'won', 'Dilshod Usmonov', '2026-03-14', 'trd', 100, undefined, { customerId: 'c1' });
  L('l15', 'Gavhar Tojiyeva', 'Samarqand Darvoza', 'Mavjud mijoz', 300_000_000, 'won', 'Madina Rasulova', '2026-01-20', 'srv', 100, undefined, { customerId: 'c10' });
  L('l16', 'Sanjar Qurbonov', 'Andijon Elektr Tarmoq', 'Veb-sayt', 215_000_000, 'qualified', 'Kamron Ismoilov', '2026-09-15', 'trd', 25, 'Demo-uchrashuv');
  L('l17', 'Elyor Mansurov', 'Chirchiq Transformator', 'Ko‘rgazma', 380_000_000, 'lost', 'Zafar Tursunov', '2026-06-02', 'fac', 0, undefined, { lostReason: 'Loyiha muzlatildi' });
  const A = (id: string, kind: DB['activities'][number]['kind'], subject: string, due: string, done: boolean, owner: string, leadId?: string, customerId?: string) => db.activities.push({ id, kind, subject, due, done, owner, leadId, customerId });
  A('a1', 'call', 'Premium Distribution — muddati o‘tgan qarz bo‘yicha qo‘ng‘iroq', '2026-09-23', false, 'Dilshod Usmonov', undefined, 'c3');
  A('a2', 'meeting', 'Toshkent Metro Qurilish — narx muzokarasi', '2026-09-25', false, 'Zafar Tursunov', 'l1');
  A('a3', 'follow_up', 'Mega Mall Samarqand — namuna bo‘yicha fikr', '2026-09-26', false, 'Bobur Toshmatov', 'l2');
  A('a4', 'task', 'Qizilqum Sement — texnik topshiriq tayyorlash', '2026-09-24', false, 'Behruz Salimov', 'l3');
  A('a5', 'email', 'Hilton — kompaniya taqdimotini yuborish', '2026-09-23', true, 'Kamron Ismoilov', 'l4');
  A('a6', 'call', 'Asia Build — to‘lov jadvali kelishuvi', '2026-09-24', false, 'Zafar Tursunov', undefined, 'c6');
  A('a7', 'note', 'Korzinka — tender talablari: 3 yillik kafolat', '2026-09-19', true, 'Dilshod Usmonov', 'l8');
  A('a8', 'call', 'O‘zbekiston Textile — solishtirma dalolatnoma', '2026-09-22', true, 'Sevara Mahmudova', undefined, 'c5');
  A('a9', 'meeting', 'Olmaliq KMK — texnik kengash', '2026-09-29', false, 'Zafar Tursunov', 'l5');

  // ── Documents: contracts, acts, reconciliation acts
  const D = (kind: DB['documents'][number]['kind'], title: string, date: string, companyId: string, partyId: string | undefined, amount: number | undefined, status: DB['documents'][number]['status'], user: string, file?: string) => {
    const doc = op.addDoc(db, { kind, title, date, companyId, partyId, amount, status, fileName: file, fileSize: file ? R.int(90, 900) * 1024 : undefined }, { user, role: 'accountant', date, time: '10:00:00' });
    if (status !== 'draft') doc.history.push({ date, user: USERS.cfo, action: status === 'signed' ? 'Imzolandi (demo — ERI ulanmagan)' : status === 'rejected' ? 'Rad etildi' : status === 'archived' ? 'Arxivlandi' : status === 'approved' ? 'Tasdiqlandi' : 'Tasdiqlashga yuborildi' });
  };
  D('contract', 'Yetkazib berish shartnomasi 2026 — Premium Distribution', '2026-01-10', 'trd', 'c3', 5_000_000_000, 'signed', USERS.sales, 'shartnoma_premium_2026.pdf');
  D('contract', 'Ishlab chiqarish buyurtmasi shartnomasi — Asia Build', '2026-02-14', 'fac', 'c6', 3_200_000_000, 'signed', 'Zafar Tursunov', 'shartnoma_asiabuild.pdf');
  D('contract', 'Ma’lumotlar markazi elektr ta’minoti — Anor Bank', '2026-02-26', 'srv', 'c9', 918_400_000, 'signed', 'Kamola Yusupova', 'anorbank_dc_contract.pdf');
  D('contract', 'Mis sim yetkazib berish — UzKabel (2026 II yarim)', '2026-09-20', 'fac', 's4', 1_400_000_000, 'pending', USERS.buyer, 'uzkabel_supply.docx');
  D('act', 'Bajarilgan ishlar dalolatnomasi — Anor Bank (5-bosqich)', '2026-08-26', 'srv', 'c9', 137_760_000, 'signed', USERS.srvAcc, 'akt_anorbank_5.pdf');
  D('act', 'Bajarilgan ishlar dalolatnomasi — O‘zbekiston Textile (3-bosqich)', '2026-09-26' > t ? '2026-09-22' : '2026-09-22', 'srv', 'c5', 113_120_000, 'pending', USERS.srvAcc);
  D('reconciliation', 'Solishtirma dalolatnoma 01.01–31.08.2026 — Premium Distribution', '2026-09-05', 'trd', 'c3', undefined, 'approved', USERS.acc2, 'akt_sverka_premium.xlsx');
  D('reconciliation', 'Solishtirma dalolatnoma — Asia Build', '2026-09-18', 'fac', 'c6', undefined, 'pending', USERS.facAcc);
  D('contract', 'Ijara shartnomasi — Toshkent Biznes Markazi', '2025-12-20', 'trd', 's9', 1_128_000_000, 'archived', USERS.acc, 'ijara_2026.pdf');
  D('act', 'Qabul-topshirish dalolatnomasi — Tez Logistika', '2026-09-15', 'trd', 's11', 42_000_000, 'rejected', USERS.acc2);
  D('contract', 'Marketing xizmatlari shartnomasi — Digital Media Agency', '2026-09-23', 'trd', 's10', 380_000_000, 'draft', 'Nodira Sultonova');

  // ── Bank statement lines (last 10 days of trading + factory) from the ledger, plus 3 unknowns
  for (const co of ['trd', 'fac']) {
    const es = db.entries.filter((e) => e.companyId === co && e.date >= '2026-09-10' && e.lines.some((l) => l.account === '5110'));
    es.forEach((e, i) => {
      const amt = e.lines.filter((l) => l.account === '5110').reduce((s, l) => s + l.debit - l.credit, 0); if (!amt) return;
      const status: 'matched' | 'unmatched' = e.date <= '2026-09-19' || i % 3 === 0 ? 'matched' : 'unmatched';
      db.bankLines.push({ id: nextId(db, 'bl'), date: e.date, companyId: co, account: '5110', description: bankDesc(db, e.memo, amt), amount: amt, status, matchEntryId: status === 'matched' ? e.id : undefined });
    });
  }
  db.bankLines.push(
    { id: nextId(db, 'bl'), date: '2026-09-22', companyId: 'trd', account: '5110', description: 'KOMISSIYA: SMS-xabarnoma xizmati (sentyabr)', amount: -185_000, status: 'unmatched' },
    { id: nextId(db, 'bl'), date: '2026-09-22', companyId: 'trd', account: '5110', description: 'Kirim: to‘lov maqsadi ko‘rsatilmagan, STIR 312 134 560', amount: 7_840_000, status: 'unmatched' },
    { id: nextId(db, 'bl'), date: '2026-09-21', companyId: 'fac', account: '5110', description: 'Bank: depozit bo‘yicha foiz (sentyabr)', amount: 3_260_000, status: 'unmatched' },
  );

  // ── Budgets 2026: derived from 2025-like plan (monthly per account & cost center)
  const plan: [string, string, string, number][] = [
    ['trd', '9411', 'Marketing', 80_000_000], ['trd', '9412', 'Sotuv', 50_000_000], ['trd', '9422', 'Ma’muriyat', 94_000_000], ['trd', '9423', 'Ma’muriyat', 17_000_000],
    ['trd', '9424', 'Ma’muriyat', 10_000_000], ['trd', '9413', 'Sotuv', 150_000_000], ['trd', '9421', 'Ma’muriyat', 185_000_000], ['trd', '9426', 'Ma’muriyat', 7_000_000],
    ['fac', '2510', 'Ishlab chiqarish', 330_000_000], ['fac', '9412', 'Sotuv', 26_000_000], ['fac', '9421', 'Ma’muriyat', 62_000_000], ['fac', '9423', 'Ma’muriyat', 9_000_000],
    ['srv', '9130', 'Loyihalar', 110_000_000], ['srv', '9131', 'Loyihalar', 70_000_000], ['srv', '9411', 'Marketing', 12_000_000], ['srv', '9421', 'Ma’muriyat', 40_000_000],
  ];
  for (const [co, acc, cc, amt] of plan) for (let m = 1; m <= 12; m++) db.budgets.push({ id: nextId(db, 'bu'), companyId: co, year: 2026, month: m, account: acc, costCenter: cc, amount: Math.round(amt * (acc === '9411' || acc === '9412' ? SEASON[m - 1] : 1)) });

  // ── Periods: open for Aug/Sep
  for (const co of ['trd', 'fac', 'srv']) for (const p of ['2026-08', '2026-09']) db.periods.push({ companyId: co, period: p, status: 'open' });

  // Projects progress
  const prog: Record<string, number> = { pj1: 78, pj2: 55, pj3: 100, pj4: 72 };
  for (const p of db.projects) p.progress = prog[p.id] ?? p.progress;

  // ── Reminders on overdue invoices (history)
  for (const inv of db.invoices.filter((i) => i.kind === 'sales' && invOpen(i) > 0 && i.dueDate < t).slice(0, 12)) inv.reminders.push({ date: addDays(inv.dueDate, 3), channel: 'Email (demo)', status: 'Navbatga qo‘yildi' });

  // ── Security demo data
  db.sessions = [
    { id: 'ss1', device: 'Chrome 131 · macOS', ip: '185.139.137.12', location: 'Toshkent, UZ', lastActive: `${t}T09:41:00`, current: true },
    { id: 'ss2', device: 'Safari · iPhone 15', ip: '84.54.72.201', location: 'Toshkent, UZ', lastActive: `${t}T07:58:00` },
    { id: 'ss3', device: 'Edge · Windows 11', ip: '213.230.96.40', location: 'Samarqand, UZ', lastActive: '2026-09-21T18:12:00' },
  ];
  db.logins = [
    { id: 'lg1', at: `${t}T09:40:12`, user: USERS.cfo, ip: '185.139.137.12', device: 'Chrome · macOS', result: 'success' },
    { id: 'lg2', at: `${t}T08:55:31`, user: USERS.acc, ip: '185.139.137.44', device: 'Chrome · Windows', result: 'success' },
    { id: 'lg3', at: `${t}T08:51:07`, user: USERS.acc, ip: '185.139.137.44', device: 'Chrome · Windows', result: '2fa' },
    { id: 'lg4', at: '2026-09-22T23:14:50', user: 'noma’lum (admin@balans.uz)', ip: '91.203.44.19', device: 'curl/8.4', result: 'failed' },
    { id: 'lg5', at: '2026-09-22T23:14:41', user: 'noma’lum (admin@balans.uz)', ip: '91.203.44.19', device: 'curl/8.4', result: 'failed' },
    { id: 'lg6', at: '2026-09-22T17:02:10', user: 'Jasur Rahimov', ip: '95.214.10.8', device: 'Firefox · Linux', result: 'success' },
    { id: 'lg7', at: '2026-09-22T09:12:33', user: 'Dilshod Usmonov', ip: '84.54.72.19', device: 'Safari · iPhone', result: 'success' },
  ];
  db.schedules = [{ id: 'sc1', reportId: 'pnl', frequency: 'monthly', format: 'pdf', recipients: 'rustam@balans.uz, gulnora@balans.uz', createdAt: '2026-03-02' }, { id: 'sc2', reportId: 'ar_aging', frequency: 'weekly', format: 'xls', recipients: 'aziza@balans.uz', createdAt: '2026-05-11' }];

  // ── Audit trail samples (most recent)
  const au = (at: string, user: string, role: Ctx['role'], action: string, module: DB['audit'][number]['module'], record: string, detail?: string) => db.audit.push({ id: nextId(db, 'au'), at, user, role, action, module, record, detail });
  au('2026-09-23T09:02:11', USERS.acc, 'chief_accountant', 'Hisob-faktura yaratildi', 'finance', db.invoices.filter((i) => i.companyId === 'trd').at(-1)!.no);
  au('2026-09-22T17:40:03', USERS.cfo, 'cfo', 'Xarid buyurtmasi tasdiqlandi', 'purchasing', db.purchaseOrders.filter((p) => p.status !== 'request').at(-3)!.no);
  au('2026-09-22T16:21:48', 'Jasur Rahimov', 'production_manager', 'Ish buyurtmasi yakunlandi', 'manufacturing', db.workOrders.filter((w) => w.status === 'completed').at(-1)!.no);
  au('2026-09-22T11:05:30', 'Alisher Qodirov', 'warehouse_manager', 'Tovar kirimi', 'warehouse', db.purchaseOrders.filter((p) => p.status === 'billed' || p.status === 'paid').at(-1)!.no);
  au('2026-09-21T15:12:09', 'Malika Toshmatova', 'hr_manager', 'Xodim ma’lumotlari o‘zgartirildi', 'hr', 'Islom Rahmatov', 'Lavozim: Montajchi-elektrik');
  au('2026-09-20T10:44:17', USERS.acc, 'chief_accountant', 'Davr yopildi', 'accounting', 'Iyul 2026');
  au('2026-09-19T12:00:00', 'Firdavs Qo‘chqorov', 'auditor', 'Hisobot eksport qilindi (PDF)', 'reports', 'Aylanma-saldo vedomosti');
  db.audit.sort((a, b) => (a.at < b.at ? -1 : 1));

  void productOf;
}

function bankDesc(db: DB, memo: string, amt: number) {
  const m = memo.replace(/^Kirim — /, '').replace(/^To‘lov — /, '');
  return (amt > 0 ? 'KIRIM: ' : 'CHIQIM: ') + m.slice(0, 64);
}
