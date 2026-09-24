import { simulate } from '../src/lib/seed/simulate';
import { pnl, balanceSheet, trialBalance, cashFlow, balances } from '../src/lib/core/ledger';
import { invOpen, billOpen } from '../src/lib/db';
import { peek } from '../src/lib/core/inventory';
const t0 = Date.now();
const db = simulate();
const t1 = Date.now();
console.log('simulate ms', t1 - t0, 'entries', db.entries.length, 'invoices', db.invoices.length, 'WOs', db.workOrders.length, 'POs', db.purchaseOrders.length, 'moves', db.moves.length, 'attendance', db.attendance.length);
const all = { companyIds: ['trd', 'fac', 'srv'] };
for (const s of [all, { companyIds: ['trd'] }, { companyIds: ['fac'] }, { companyIds: ['srv'] }]) {
  const p = pnl(db.entries, s, '2026-01-01', '2026-09-23');
  const sep = pnl(db.entries, s, '2026-09-01', '2026-09-23');
  const aug = pnl(db.entries, s, '2026-08-01', '2026-08-31');
  const bs = balanceSheet(db.entries, s, '2026-09-23');
  const tb = trialBalance(db.entries, s, '2026-01-01', '2026-09-23');
  const cf = cashFlow(db.entries, s, '2026-01-01', '2026-09-23');
  const f = (n: number) => (n / 1e6).toFixed(1) + 'M';
  console.log(s.companyIds.join(','), 'YTD rev', f(p.revenue), 'gross', f(p.gross), p.grossMargin.toFixed(1) + '%', 'net', f(p.net), p.netMargin.toFixed(1) + '%',
    '| Sep rev', f(sep.revenue), 'net', f(sep.net), '| Aug rev', f(aug.revenue), 'net', f(aug.net),
    '| BS A', f(bs.totalAssets), 'L+E', f(bs.totalLE), bs.balanced, '| TB', tb.balanced, '| cash', f(cf.opening), '->', f(cf.closing));
}
const b = balances(db.entries, all);
const ar = db.invoices.filter(i => i.kind === 'sales').reduce((s, i) => s + invOpen(i), 0);
const ap = db.bills.reduce((s, x) => s + billOpen(x), 0);
console.log('AR subledger', ar/1e6, 'GL 4010', (b['4010']||0)/1e6, '| AP subledger', ap/1e6, 'GL 6010', -(b['6010']||0)/1e6, 'GRNI', -(b['6090']||0)/1e6);
let inv = 0; for (const pid of Object.keys(db.stock)) inv += peek(db.stock, pid).value;
console.log('Stock subledger', inv/1e6, 'GL inv', ((b['1010']||0)+(b['2810']||0)+(b['2910']||0))/1e6, 'WIP', (b['2010']||0)/1e6, '2510', (b['2510']||0)/1e6);
for (const c of ['5010','5110','5210']) console.log(c, (b[c]||0)/1e6);
for (const co of ['trd','fac','srv']) { const bb = balances(db.entries, {companyIds:[co]}); console.log(co, 'bank', ((bb['5110']||0)/1e6).toFixed(0), 'VAT6411', (-(bb['6411']||0)/1e6).toFixed(1), '4410', ((bb['4410']||0)/1e6).toFixed(1), '6710', (-(bb['6710']||0)/1e6).toFixed(1), '6412', (-(bb['6412']||0)/1e6).toFixed(1)); }
console.log('WO status', db.workOrders.reduce((m: Record<string, number>, w) => (m[w.status] = (m[w.status]||0)+1, m), {}));
console.log('overdue inv', db.invoices.filter(i => i.kind==='sales' && invOpen(i)>0 && i.dueDate < '2026-09-23').length);
console.log('stock', Object.entries(db.stock).map(([p, w]) => p + ':' + Object.values(w).reduce((s, c) => s + c.qty, 0).toFixed(0)).join(' '));
console.log('tax open', db.taxObligations.filter(o => o.status === 'open').map(o => `${o.companyId}/${o.taxId}/${o.period}/${(o.amount/1e6).toFixed(1)}/${o.dueDate}`).join(' '));
console.log('machines', db.machines.map(m => m.name.slice(0,10)+':'+m.usedHours+':'+(m.oee*100).toFixed(0)).join(' '));
console.log('JSON size', (JSON.stringify(db).length/1e6).toFixed(2), 'MB');
import { monthlySeries } from '../src/lib/core/ledger';
for (const co of ['trd','fac','srv']) {
  const rows = monthlySeries(db.entries, { companyIds: [co] }, ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09']);
  console.log(co, rows.map(r => `${r.month.slice(5)} R${(r.revenue/1e6).toFixed(0)} G${(r.gross/1e6).toFixed(0)} N${(r.net/1e6).toFixed(0)} C${(r.cashEnd/1e6).toFixed(0)}`).join(' | '));
}
