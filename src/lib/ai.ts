// ─────────────────────────────────────────────────────────────
// AI CFO — deterministic analysis engine (runs in the browser).
// It does NOT call an external LLM (see integrations.ts → llm).
// Every number is computed from ledger/sub-ledger data, and every
// statement is tagged FACT / ESTIMATE / RECOMMENDATION.
// The same "tool" functions are what a real LLM would be given.
// ─────────────────────────────────────────────────────────────
import type { DB } from './db';
import { byId } from './db';
import type { Scope } from './core/ledger';
import { pnl, balances, sumRaw, linesFor } from './core/ledger';
import { CASH_ACCOUNTS, EXPENSE_CATEGORIES, ACC } from './core/coa';
import { TODAY, monthStart, addMonths, monthEnd, monthLabel, MONTHS_UZ, fmtDate, addDays, monthKey } from './core/dates';
import { moneyC, change } from './core/money';
import * as A from './analytics';
import type { ModuleId, Currency } from './types';

export type Kind = 'fact' | 'estimate' | 'recommendation';
export type Insight = 'insight' | 'risk' | 'opportunity' | 'analysis' | 'recommendation';

export interface Block { kind: Kind; text: string }
export interface Metric { label: string; value: string; delta?: number; good?: 'up' | 'down' }
export interface AiAction { label: string; type: 'nav' | 'explain' | 'ask' | 'propose'; module?: ModuleId; tab?: string; params?: Record<string, string>; prompt?: string; proposal?: Proposal }
export interface Proposal { title: string; description: string; action: string; data: Record<string, unknown>; amount?: number; approverRole: 'cfo' | 'chief_accountant' | 'purchasing_manager' }
export interface AiAnswer { title: string; insight: Insight; metrics?: Metric[]; blocks: Block[]; table?: { cols: string[]; rows: (string | number)[][] }; actions: AiAction[]; sources: string[]; explain?: string }

// ─── Period parsing ───────────────────────────────────────────
const MONTH_KEYS: [RegExp, number][] = [
  [/yanvar|январ|january|\bjan\b/i, 1], [/fevral|феврал|february|\bfeb\b/i, 2], [/mart\b|март|march/i, 3], [/aprel|апрел|april/i, 4], [/\bmay\b|май|мая/i, 5], [/iyun|июн|june/i, 6],
  [/iyul|июл|july/i, 7], [/avgust|август|august/i, 8], [/sentyabr|сентябр|september/i, 9], [/oktyabr|октябр|october/i, 10], [/noyabr|ноябр|november/i, 11], [/dekabr|декабр|december/i, 12],
];

export function parsePeriod(q: string, fallback: { from: string; to: string }) {
  const y = (q.match(/20\d\d/) || [TODAY.slice(0, 4)])[0];
  for (const [re, m] of MONTH_KEYS) if (re.test(q)) { const from = `${y}-${String(m).padStart(2, '0')}-01`; const to = monthEnd(from) > TODAY ? TODAY : monthEnd(from); return { from, to, label: `${MONTHS_UZ[m - 1]} ${y}`, explicit: true }; }
  if (/o.?tgan oy|прошл\w* месяц|last month/i.test(q)) { const from = addMonths(monthStart(TODAY), -1); return { from, to: monthEnd(from), label: monthLabel(monthKey(from)), explicit: true }; }
  if (/bu oy|shu oy|joriy oy|этот месяц|в этом месяце|this month/i.test(q)) return { from: monthStart(TODAY), to: TODAY, label: `${monthLabel(monthKey(TODAY))} (${fmtDate(TODAY)} gacha)`, explicit: true };
  if (/yil boshidan|bu yil|shu yil|с начала года|this year|ytd/i.test(q)) return { from: `${TODAY.slice(0, 4)}-01-01`, to: TODAY, label: `${TODAY.slice(0, 4)} yil boshidan`, explicit: true };
  if (/chorak|квартал|quarter/i.test(q)) return { from: '2026-07-01', to: TODAY, label: '3-chorak 2026', explicit: true };
  return { ...fallback, label: `${fmtDate(fallback.from)} – ${fmtDate(fallback.to)}`, explicit: false };
}

const prevOf = (from: string, to: string) => A.prevPeriod(from, to);

// ─── Intents ──────────────────────────────────────────────────
type Ctx = { db: DB; s: Scope; cur: Currency; period: { from: string; to: string } };
type Handler = (q: string, c: Ctx) => AiAnswer;
const P = (x: Record<string, string>) => x;

const M = (c: Ctx) => (v: number) => moneyC(v, c.cur);

const profit: Handler = (q, c) => {
  const p = parsePeriod(q, c.period); const pp = prevOf(p.from, p.to);
  const a = pnl(c.db.entries, c.s, p.from, p.to); const b = pnl(c.db.entries, c.s, pp.from, pp.to); const m = M(c);
  const drivers = [
    { k: 'Tushum', d: a.revenue - b.revenue }, { k: 'Sotish tannarxi', d: -(a.cogs - b.cogs) }, { k: 'Operatsion xarajatlar', d: -(a.opex - b.opex) },
    { k: 'Boshqa daromad/xarajat', d: (a.otherIncome - a.financeCost - a.incomeTax) - (b.otherIncome - b.financeCost - b.incomeTax) },
  ].sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  return {
    title: `Sof foyda — ${p.label}`, insight: 'analysis',
    metrics: [{ label: 'Sof foyda', value: m(a.net), delta: change(a.net, b.net) }, { label: 'Tushum', value: m(a.revenue), delta: change(a.revenue, b.revenue) }, { label: 'Yalpi marja', value: `${a.grossMargin.toFixed(1)}%` }, { label: 'Sof marja', value: `${a.netMargin.toFixed(1)}%` }],
    blocks: [
      { kind: 'fact', text: `${p.label} davrida tushum ${m(a.revenue)}, sotish tannarxi ${m(a.cogs)}, operatsion xarajatlar ${m(a.opex)}. Sof foyda ${m(a.net)} (marja ${a.netMargin.toFixed(1)}%).` },
      { kind: 'fact', text: `Solishtirma davr (${fmtDate(pp.from)}–${fmtDate(pp.to)}): sof foyda ${m(b.net)}. Farq: ${a.net >= b.net ? '+' : ''}${m(a.net - b.net)} (${change(a.net, b.net).toFixed(1)}%).` },
      { kind: 'fact', text: `Asosiy omil: ${drivers[0].k} (${drivers[0].d >= 0 ? '+' : ''}${m(drivers[0].d)} foydaga ta’sir), keyin — ${drivers[1].k} (${drivers[1].d >= 0 ? '+' : ''}${m(drivers[1].d)}).` },
      ...(p.to === TODAY && p.from.slice(8) === '01' ? [{ kind: 'estimate' as Kind, text: `Oy oxirigacha joriy sur’at saqlansa, oylik sof foyda taxminan ${m(a.net / +TODAY.slice(8) * +monthEnd(TODAY).slice(8))} bo‘lishi mumkin. Bu chiziqli ekstrapolyatsiya — mavsumiylik va oy oxiridagi hisoblashlar (ish haqi, amortizatsiya) hisobga olinmagan.` }] : []),
    ],
    actions: [{ label: 'Foyda va zarar hisobotini ochish', type: 'nav', module: 'reports', params: P({ report: 'pnl' }) }, { label: 'Provodkalarni ko‘rish', type: 'nav', module: 'accounting', tab: 'journal' }, { label: 'Xarajatlar qayerda oshdi?', type: 'ask', prompt: 'Xarajatlar qayerda oshgan?' }],
    sources: ['Bosh kitob: 90xx tushum, 91xx tannarx, 94xx xarajat hisoblari', `Davr: ${fmtDate(p.from)}–${fmtDate(p.to)}`],
    explain: 'Sof foyda = Tushum − Sotish tannarxi − Operatsion xarajatlar ± Boshqa daromad/xarajatlar − Foyda solig‘i. Barcha summalar QQSsiz.',
  };
};

const expenseCategory: Handler = (q, c) => {
  const cat = EXPENSE_CATEGORIES.find((x) => x.keywords.some((k) => q.toLowerCase().includes(k)))!;
  const p = parsePeriod(q, c.period); const pp = prevOf(p.from, p.to); const m = M(c);
  // For month queries compare full previous month
  const prev = p.from.slice(8) === '01' && p.explicit ? { from: addMonths(p.from, -1), to: monthEnd(addMonths(p.from, -1)) } : pp;
  const b = balances(c.db.entries, c.s, p.from, p.to); const bp = balances(c.db.entries, c.s, prev.from, prev.to);
  const cur = cat.accounts.reduce((a, x) => a + (b[x] || 0), 0); const pr = cat.accounts.reduce((a, x) => a + (bp[x] || 0), 0);
  const lines = linesFor(c.db.entries, c.s, cat.accounts, p.from, p.to).filter((l) => l.debit > 0);
  const top = lines.sort((x, y) => y.debit - x.debit).slice(0, 5);
  const budget = A.budgetVsActual(c.db, c.s, +p.from.slice(0, 4), +p.from.slice(5, 7), +p.to.slice(5, 7)).filter((r) => cat.accounts.includes(r.account));
  const bud = budget.reduce((a, r) => a + r.budget, 0);
  return {
    title: `${cat.label} — ${p.label}`, insight: cur > pr * 1.15 ? 'risk' : 'analysis',
    metrics: [{ label: p.label, value: m(cur) }, { label: `O‘tgan davr`, value: m(pr) }, { label: 'Farq', value: `${cur >= pr ? '+' : ''}${change(cur, pr).toFixed(1)}%`, delta: change(cur, pr), good: 'down' }, ...(bud ? [{ label: 'Byudjet', value: m(bud) }] : [])],
    blocks: [
      { kind: 'fact', text: `${cat.label} xarajatlari: ${m(cur)}. O‘tgan davr (${fmtDate(prev.from)}–${fmtDate(prev.to)}): ${m(pr)}. Farq: ${cur >= pr ? '+' : ''}${change(cur, pr).toFixed(1)}%.` },
      ...(top.length ? [{ kind: 'fact' as Kind, text: `Eng katta operatsiyalar: ${top.slice(0, 3).map((l) => `${fmtDate(l.date)} — ${l.memo.replace(/ — .*$/, '')} (${m(l.debit)})`).join('; ')}.` }] : []),
      ...(bud && cur > bud ? [{ kind: 'fact' as Kind, text: `Byudjet ${m(bud)} dan ${m(cur - bud)} (${(((cur - bud) / bud) * 100).toFixed(0)}%) ga oshib ketgan.` }] : []),
      ...(cur > pr * 1.15 ? [{ kind: 'recommendation' as Kind, text: `Oshish sababini tekshiring: kampaniya natijalari (lidlar soni, konversiya) bilan solishtiring. Keyingi oy uchun tasdiqlash chegarasini belgilash mumkin.` }] : []),
    ],
    table: { cols: ['Sana', 'Izoh', 'Summa'], rows: top.map((l) => [fmtDate(l.date), l.memo, m(l.debit)]) },
    actions: [{ label: 'Tranzaksiyalarni ko‘rish', type: 'nav', module: 'accounting', tab: 'ledger', params: P({ account: cat.accounts[0] }) }, { label: 'Hisobotni ochish', type: 'nav', module: 'reports', params: P({ report: 'expenses' }) }, { label: 'Tushuntirish', type: 'explain' }],
    sources: [`Hisob(lar): ${cat.accounts.map((a) => `${a} ${ACC[a]?.name}`).join(', ')}`, `${lines.length} ta provodka qatori`],
    explain: `Summa ${cat.accounts.join(', ')} hisoblarining debet aylanmasidan (QQSsiz) olingan. Solishtirma davr — oldingi to‘liq oy (yoki teng uzunlikdagi oldingi davr).`,
  };
};

const biggestExpense: Handler = (q, c) => {
  const p = parsePeriod(q, c.period); const m = M(c);
  const cats = A.expenseByCategory(c.db, c.s, p.from, p.to).filter((x) => x.id !== 'cogs');
  const cogs = A.expenseByCategory(c.db, c.s, p.from, p.to).find((x) => x.id === 'cogs');
  const tot = cats.reduce((a, x) => a + x.amount, 0);
  const sup = A.supplierSpend(c.db, c.s, p.from, p.to).slice(0, 3);
  return {
    title: `Eng katta xarajatlar — ${p.label}`, insight: 'analysis',
    metrics: cats.slice(0, 3).map((x) => ({ label: x.label, value: m(x.amount) })),
    blocks: [
      { kind: 'fact', text: `Operatsion xarajatlar ichida eng kattasi — ${cats[0]?.label} (${m(cats[0]?.amount || 0)}, ${tot ? ((cats[0].amount / tot) * 100).toFixed(0) : 0}%). Keyingilari: ${cats.slice(1, 4).map((x) => `${x.label} ${m(x.amount)}`).join(', ')}.` },
      ...(cogs ? [{ kind: 'fact' as Kind, text: `Sotish tannarxi (tovar/xomashyo/ishlab chiqarish) alohida: ${m(cogs.amount)} — bu umumiy xarajatlarning eng katta qismi, lekin u sotuv hajmiga bog‘liq.` }] : []),
      ...(sup.length ? [{ kind: 'fact' as Kind, text: `Ta’minotchilar bo‘yicha eng ko‘p xarid: ${sup.map((s) => `${s.name} (${m(s.spend)})`).join(', ')}.` }] : []),
    ],
    table: { cols: ['Kategoriya', 'Summa', 'Ulush'], rows: cats.map((x) => [x.label, m(x.amount), `${tot ? ((x.amount / tot) * 100).toFixed(1) : 0}%`]) },
    actions: [{ label: 'Xarajatlar tahlili', type: 'nav', module: 'analytics', tab: 'expenses' }, { label: 'Byudjet vs fakt', type: 'nav', module: 'finance', tab: 'budget' }],
    sources: ['94xx xarajat hisoblari, 91xx tannarx', `Davr: ${fmtDate(p.from)}–${fmtDate(p.to)}`],
  };
};

const expenseGrowth: Handler = (q, c) => {
  const p = parsePeriod(q, c.period); const pp = prevOf(p.from, p.to); const m = M(c);
  const a = A.expenseByCategory(c.db, c.s, p.from, p.to); const b = A.expenseByCategory(c.db, c.s, pp.from, pp.to);
  const rows = a.map((x) => { const y = b.find((z) => z.id === x.id)?.amount || 0; return { ...x, prev: y, d: x.amount - y, pct: change(x.amount, y) }; }).filter((x) => x.id !== 'cogs' && x.id !== 'salary' && x.id !== 'depreciation').sort((x, y) => y.d - x.d);
  const up = rows.filter((r) => r.d > 0).slice(0, 3);
  const anom = A.anomalies(c.db, c.s).slice(0, 2);
  const bud = A.budgetVsActual(c.db, c.s, 2026, +TODAY.slice(5, 7), +TODAY.slice(5, 7)).filter((r) => r.pct > 5).slice(0, 3);
  return {
    title: 'Xarajatlar qayerda oshdi?', insight: up.length ? 'risk' : 'insight',
    metrics: up.map((r) => ({ label: r.label, value: `${r.d >= 0 ? '+' : ''}${m(r.d)}`, delta: r.pct, good: 'down' })),
    blocks: [
      { kind: 'fact', text: up.length ? `${p.label} vs oldingi teng davr: eng ko‘p oshgan — ${up.map((r) => `${r.label} (${m(r.prev)} → ${m(r.amount)}, ${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(0)}%)`).join('; ')}.` : 'Operatsion xarajatlar oldingi davrga nisbatan oshmagan.' },
      ...(anom.length ? [{ kind: 'fact' as Kind, text: `G‘ayrioddiy operatsiyalar: ${anom.map((x) => `${x.memo} — ${m(x.amount)} (odatiydan ${x.ratio.toFixed(1)}× katta)`).join('; ')}.` }] : []),
      ...(bud.length ? [{ kind: 'fact' as Kind, text: `Joriy oy byudjetidan oshganlar: ${bud.map((r) => `${r.name} (${r.pct > 0 ? '+' : ''}${r.pct.toFixed(0)}%)`).join(', ')}.` }] : []),
      { kind: 'recommendation', text: 'Bir martalik xarajatlarni (masalan, mebel) alohida belgilang va takrorlanuvchi xarajatlar uchun oylik limitlar qo‘ying. Marketing xarajatini lid/konversiya ko‘rsatkichlari bilan bog‘lab baholang.' },
    ],
    table: { cols: ['Kategoriya', 'Oldingi', 'Joriy', 'Farq'], rows: rows.slice(0, 8).map((r) => [r.label, m(r.prev), m(r.amount), `${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(0)}%`]) },
    actions: [{ label: 'Byudjet nazorati', type: 'nav', module: 'finance', tab: 'budget' }, { label: 'Xarajatlar analitikasi', type: 'nav', module: 'analytics', tab: 'expenses' }],
    sources: ['94xx hisoblar aylanmasi', 'Byudjet 2026', 'Anomaliya: oxirgi 30 kun vs 6 oylik o‘rtacha'],
  };
};

const receivables: Handler = (_q, c) => {
  const ag = A.arAging(c.db, c.s); const m = M(c); const dso = A.dso(c.db, c.s);
  const top = ag.customers.filter((x) => x.total - x.b.current > 0).sort((a, b) => (b.total - b.b.current) - (a.total - a.b.current)).slice(0, 5);
  const overdueInv = ag.rows.filter((r) => r.overdue > 0).sort((a, b) => b.open - a.open).slice(0, 12).map((r) => r.inv.id);
  return {
    title: 'Qaysi mijozlardan pul olishimiz kerak?', insight: 'risk',
    metrics: [{ label: 'Jami debitorlik', value: m(ag.total) }, { label: 'Muddati o‘tgan', value: m(ag.overdue) }, { label: '60+ kun', value: m(ag.buckets.d60p) }, { label: 'DSO', value: `${dso.toFixed(0)} kun` }],
    blocks: [
      { kind: 'fact', text: `Ochiq debitorlik ${m(ag.total)}, shundan muddati o‘tgani ${m(ag.overdue)} (${ag.total ? ((ag.overdue / ag.total) * 100).toFixed(0) : 0}%). 1–30 kun: ${m(ag.buckets.d30)}, 31–60: ${m(ag.buckets.d60)}, 60+: ${m(ag.buckets.d60p)}.` },
      { kind: 'fact', text: `Eng katta muddati o‘tgan qarzdorlar: ${top.map((x) => `${x.customer} — ${m(x.total - x.b.current)} (eng eskisi ${x.oldest} kun)`).join('; ')}.` },
      { kind: 'recommendation', text: `Top-5 qarzdor bilan bugun bog‘laning; 30+ kunlik qarzi bo‘lgan mijozlarga yangi yetkazib berishni oldindan to‘lov sharti bilan cheklashni ko‘rib chiqing. Eslatmalarni yuborish tasdiqlashingizdan keyin navbatga qo‘yiladi.` },
    ],
    table: { cols: ['Mijoz', 'Muddati o‘tgan', 'Jami ochiq', 'Eng eski'], rows: top.map((x) => [x.customer, m(x.total - x.b.current), m(x.total), `${x.oldest} kun`]) },
    actions: [
      { label: 'Qarzdorlik yoshi (aging)', type: 'nav', module: 'finance', tab: 'ar' },
      { label: `${overdueInv.length} ta eslatma tayyorlash`, type: 'propose', proposal: { title: `To‘lov eslatmalari: ${overdueInv.length} ta muddati o‘tgan hisob-faktura`, description: 'AI tayyorlagan eslatmalar. Tasdiqlangach “navbatga qo‘yiladi” (email integratsiyasi ulanmagan — haqiqiy yuborilmaydi).', action: 'ai_reminders', data: { invoiceIds: overdueInv }, approverRole: 'chief_accountant' } },
      { label: 'CRM’da qo‘ng‘iroq rejalash', type: 'nav', module: 'crm', tab: 'activities' },
    ],
    sources: ['Debitorlik sub-kitobi (ochiq hisob-fakturalar)', `Holat sanasi: ${fmtDate(TODAY)}`, '4010 hisobi bilan solishtirilgan'],
    explain: 'Debitorlik — mijozlar hali to‘lamagan, lekin sotuv amalga oshgan summalar. DSO (Days Sales Outstanding) — o‘rtacha necha kunda pul yig‘ilishi.',
  };
};

const cashflow: Handler = (q, c) => {
  const days = /90/.test(q) ? 90 : /60/.test(q) ? 60 : 30;
  const f = A.cashForecast(c.db, c.s, 90); const m = M(c); const end = days === 90 ? f.d90 : days === 60 ? f.d60 : f.d30;
  const win = f.days.slice(0, days);
  const inflow = win.reduce((a, d) => a + d.inflow, 0); const outflow = win.reduce((a, d) => a + d.outflow, 0);
  const min = win.reduce((a, d) => (d.balance < a.balance ? d : a), win[0]);
  const bigOut = win.flatMap((d) => d.items.filter((i) => i.amount < 0 && i.kind !== 'runrate').map((i) => ({ ...i, date: d.date }))).sort((a, b) => a.amount - b.amount).slice(0, 4);
  return {
    title: `Keyingi ${days} kunlik pul oqimi (prognoz)`, insight: min.balance < f.start * 0.5 ? 'risk' : 'opportunity',
    metrics: [{ label: 'Bugungi qoldiq', value: m(f.start) }, { label: `Kutilayotgan kirim`, value: m(inflow) }, { label: 'Kutilayotgan chiqim', value: m(outflow) }, { label: `${days}-kun oxiri`, value: m(end.balance) }],
    blocks: [
      { kind: 'fact', text: `Bugungi pul qoldig‘i (kassa + bank): ${m(f.start)}.` },
      { kind: 'estimate', text: `Prognoz: ${days} kunda kirim ~${m(inflow)}, chiqim ~${m(outflow)}; davr oxiridagi qoldiq ~${m(end.balance)}. Eng past nuqta ~${m(min.balance)} (${fmtDate(min.date)} atrofida).` },
      { kind: 'fact', text: `Asosiy rejalashtirilgan to‘lovlar: ${bigOut.map((i) => `${fmtDate(i.date)} — ${i.label} (${m(-i.amount)})`).join('; ')}.` },
      { kind: 'recommendation', text: min.balance < f.start * 0.5 ? `Eng past nuqtadan oldin muddati o‘tgan debitorlikni yig‘ishni tezlashtiring va ta’minotchilarga to‘lovlarni muddatiga qarab ketma-ket rejalashtiring.` : 'Qoldiq barqaror. Ortiqcha mablag‘ni qisqa muddatli depozitga joylashtirishni ko‘rib chiqish mumkin (bank shartlari bilan).' },
    ],
    actions: [{ label: 'G‘aznachilik va prognoz', type: 'nav', module: 'finance', tab: 'treasury' }, { label: 'To‘lov kalendari', type: 'nav', module: 'finance', tab: 'ap' }, { label: 'Tushuntirish', type: 'explain' }],
    sources: ['Ochiq debitorlik (mijoz to‘lov odati bilan)', 'Ochiq kreditorlik (muddati bo‘yicha)', 'Soliq majburiyatlari', 'Ish haqi', 'Oxirgi 90 kunlik sur’at'],
    explain: 'Cash flow — biznesga kirayotgan va chiqayotgan real pul oqimi. Prognoz TAXMINIY: mijozlar to‘lov odati, ochiq hujjatlar va oxirgi 90 kunlik sur’atga asoslanadi; kafolat emas.',
  };
};

const productProfit: Handler = (q, c) => {
  const p = parsePeriod(q, { from: '2026-01-01', to: TODAY }); const m = M(c);
  const rows = A.productProfit(c.db, c.s, p.from, p.to).filter((r) => r.p.kind !== 'service');
  const low = /past|kam marj|низк|low/i.test(q);
  const sorted = low ? [...rows].sort((a, b) => a.margin - b.margin) : rows;
  const t = sorted.slice(0, 5);
  return {
    title: low ? `Marjasi eng past mahsulotlar — ${p.label}` : `Eng ko‘p foyda keltiradigan mahsulotlar — ${p.label}`, insight: low ? 'risk' : 'opportunity',
    metrics: t.slice(0, 3).map((r) => ({ label: r.p.name.slice(0, 28), value: low ? `${r.margin.toFixed(1)}%` : m(r.gross) })),
    blocks: [
      { kind: 'fact', text: low ? `Eng past yalpi marja: ${t.map((r) => `${r.p.name} — ${r.margin.toFixed(1)}% (tushum ${m(r.revenue)})`).join('; ')}.` : `Yalpi foyda bo‘yicha yetakchilar: ${t.map((r) => `${r.p.name} — ${m(r.gross)} (marja ${r.margin.toFixed(1)}%)`).join('; ')}.` },
      ...(low ? [{ kind: 'recommendation' as Kind, text: `${t[0]?.p.name} uchun: tannarx tarkibini (Ishlab chiqarish → Tannarx) va chegirmalarni tekshiring; narxni qayta ko‘rib chiqish yoki kam marjali mijozlar uchun chegirmani cheklash mumkin.` }] : [{ kind: 'recommendation' as Kind, text: `Yuqori marjali mahsulotlar zaxirasini ta’minlang va sotuv jamoasi uchun ularni ustuvor qiling.` }]),
    ],
    table: { cols: ['Mahsulot', 'Tushum', 'Tannarx', 'Yalpi foyda', 'Marja'], rows: sorted.slice(0, 10).map((r) => [r.p.name, m(r.revenue), m(r.cogs), m(r.gross), `${r.margin.toFixed(1)}%`]) },
    actions: [{ label: 'Mahsulot rentabelligi', type: 'nav', module: 'analytics', tab: 'products' }, { label: 'Ishlab chiqarish tannarxi', type: 'nav', module: 'manufacturing', tab: 'costing' }],
    sources: ['Tushum va tannarx provodkalari (mahsulot kesimida)', 'QQSsiz summalar'],
  };
};

const lowStock: Handler = (_q, c) => {
  const rows = A.stockRows(c.db, c.s).filter((r) => r.status === 'low' || r.status === 'out' || (Number.isFinite(r.cover) && r.cover < 21)).sort((a, b) => a.cover - b.cover);
  const byWh = c.db.warehouses.filter((w) => c.s.companyIds.includes(w.companyId)).map((w) => ({ w, rows: A.stockRows(c.db, c.s, w.id).filter((r) => r.status === 'low' || r.status === 'out') })).filter((x) => x.rows.length);
  const first = rows[0];
  const proposal: Proposal | undefined = first ? { title: `Xarid so‘rovi: ${first.p.name} (${first.p.reorderQty} ${first.p.unit})`, description: `AI taklifi: mavjud ${Math.round(first.available)} ${first.p.unit}, kunlik sarf ~${first.daily.toFixed(0)}, buyurtma nuqtasi ${first.p.reorderPoint}. Tasdiqlangach xarid so‘rovi yaratiladi va PO tasdiqlashga yuboriladi.`, action: 'ai_purchase', amount: first.p.reorderQty * first.p.stdCost * 1.12, approverRole: 'purchasing_manager', data: { date: TODAY, expectedDate: addDays(TODAY, first.p.leadDays || 7), companyId: first.p.companyId, branchId: c.db.warehouses.find((w) => w.companyId === first.p.companyId && (w.kind === 'raw' || w.kind === 'goods'))!.branchId, warehouseId: c.db.warehouses.find((w) => w.companyId === first.p.companyId && (first.p.kind === 'raw' ? w.kind === 'raw' : w.kind === 'goods'))!.id, supplierId: first.p.supplierId, lines: [{ productId: first.p.id, description: first.p.name, qty: first.p.reorderQty, price: first.p.stdCost, discount: 0, vat: 12 }], requestedBy: 'AI CFO (tasdiqlangan)' } } : undefined;
  return {
    title: 'Qaysi omborda mahsulot kam?', insight: rows.length ? 'risk' : 'insight',
    metrics: [{ label: 'Kam / tugagan', value: String(rows.filter((r) => r.status !== 'ok').length) }, { label: '3 haftadan kam yetadi', value: String(rows.filter((r) => r.cover < 21).length) }],
    blocks: [
      { kind: 'fact', text: byWh.length ? byWh.map((x) => `${x.w.name}: ${x.rows.map((r) => `${r.p.name} (${Math.round(r.qty)} ${r.p.unit})`).join(', ')}`).join('. ') + '.' : 'Hech bir omborda qoldiq buyurtma nuqtasidan past emas.' },
      ...(rows.length ? [{ kind: 'estimate' as Kind, text: `Oxirgi 60 kunlik sarf bo‘yicha: ${rows.slice(0, 4).map((r) => `${r.p.name} ~${Math.max(0, Math.round(r.cover))} kunga yetadi`).join(', ')}.` }] : []),
      ...(first ? [{ kind: 'recommendation' as Kind, text: `${first.p.name} uchun ${first.p.reorderQty.toLocaleString('ru-RU')} ${first.p.unit} xarid so‘rovini yaratish tavsiya etiladi (yetkazish muddati ~${first.p.leadDays} kun).` }] : []),
    ],
    table: { cols: ['Mahsulot', 'Qoldiq', 'Mavjud', 'Yo‘lda', 'Yetadi (kun)'], rows: rows.slice(0, 8).map((r) => [r.p.name, `${Math.round(r.qty)} ${r.p.unit}`, Math.round(r.available), Math.round(r.incoming), Number.isFinite(r.cover) ? Math.max(0, Math.round(r.cover)) : '∞']) },
    actions: [{ label: 'Zaxiralar', type: 'nav', module: 'inventory', tab: 'stock' }, ...(proposal ? [{ label: 'Xarid so‘rovini taklif qilish', type: 'propose' as const, proposal }] : [])],
    sources: ['Ombor sub-kitobi (FIFO/o‘rtacha tannarx)', 'Rezerv: tasdiqlangan buyurtmalar', 'Yo‘lda: tasdiqlangan PO va ish buyurtmalari'],
  };
};

const supplierCost: Handler = (q, c) => {
  const p = parsePeriod(q, { from: '2026-01-01', to: TODAY }); const m = M(c);
  const rows = A.supplierSpend(c.db, c.s, p.from, p.to); const tot = rows.reduce((a, r) => a + r.spend, 0);
  return {
    title: `Qaysi ta’minotchiga eng ko‘p xarajat — ${p.label}`, insight: 'analysis',
    metrics: rows.slice(0, 3).map((r) => ({ label: r.name, value: m(r.spend) })),
    blocks: [
      { kind: 'fact', text: `${rows[0]?.name} — ${m(rows[0]?.spend || 0)} (${tot ? ((rows[0].spend / tot) * 100).toFixed(0) : 0}% jami xaridlarning). Keyin: ${rows.slice(1, 4).map((r) => `${r.name} ${m(r.spend)}`).join(', ')}.` },
      { kind: 'fact', text: `O‘z vaqtida yetkazish: ${rows.filter((r) => r.deliveries).slice(0, 4).map((r) => `${r.name} ${r.onTime}/${r.deliveries}`).join(', ')}.` },
      { kind: 'recommendation', text: `Top-3 ta’minotchi ulushi ${tot ? ((rows.slice(0, 3).reduce((a, r) => a + r.spend, 0) / tot) * 100).toFixed(0) : 0}%. Yirik pozitsiyalar uchun muqobil takliflar (RFQ) so‘rab, narx va muddatni solishtirish tavsiya etiladi.` },
    ],
    table: { cols: ['Ta’minotchi', 'Xarid (QQSsiz)', 'Ochiq qarz', 'O‘z vaqtida'], rows: rows.slice(0, 8).map((r) => [r.name, m(r.spend), m(r.open), r.deliveries ? `${r.onTime}/${r.deliveries}` : '—']) },
    actions: [{ label: 'Ta’minotchilar analitikasi', type: 'nav', module: 'purchasing', tab: 'suppliers' }],
    sources: ['Ta’minotchi hisob-fakturalari', 'Tovar kirimi sanalari vs kutilgan sana'],
  };
};

const productionCost: Handler = (_q, c) => {
  const cos = c.s.companyIds.includes('fac') ? ['fac'] : [];
  if (!cos.length) return notApplicable('Ishlab chiqarish tannarxi', 'Tanlangan kompaniyada ishlab chiqarish yo‘q. Balans Factory yoki butun guruhni tanlang.');
  const m = M(c);
  const now = A.unitCosts(c.db, cos, '2026-07-01', TODAY); const before = A.unitCosts(c.db, cos, '2026-01-01', '2026-06-30');
  const rows = now.map((u) => { const b = before.find((x) => x.p.id === u.p.id); return { u, b, d: u.act && b?.act ? change(u.act.total, b.act.total) : 0 }; }).sort((a, b) => b.d - a.d);
  const r = rows[0];
  const cu = c.db.products.find((p) => p.id === 'r2')!; const steel = c.db.products.find((p) => p.id === 'r1')!;
  const priceChange = (pid: string) => {
    const moves = c.db.moves.filter((x) => x.productId === pid && x.kind === 'receipt');
    const avg = (ms: typeof moves) => { const q = ms.reduce((a, x) => a + x.qty, 0); return q ? ms.reduce((a, x) => a + x.cost, 0) / q : 0; };
    return { h1: avg(moves.filter((x) => x.date < '2026-07-01')), h2: avg(moves.filter((x) => x.date >= '2026-07-01')) };
  };
  const pc = priceChange('r2'); const ps = priceChange('r1');
  return {
    title: 'Zavodda ishlab chiqarish tannarxi nima uchun oshdi?', insight: 'analysis',
    metrics: rows.slice(0, 3).map((x) => ({ label: x.u.p.name.replace('Elektr taqsimlash ', ''), value: x.u.act ? m(x.u.act.total) : '—', delta: x.d, good: 'down' as const })),
    blocks: [
      { kind: 'fact', text: `3-chorakda birlik tannarxi 1-yarim yillikka nisbatan: ${rows.filter((x) => x.b?.act).map((x) => `${x.u.p.name} ${m(x.b!.act!.total)} → ${m(x.u.act!.total)} (${x.d >= 0 ? '+' : ''}${x.d.toFixed(1)}%)`).join('; ')}.` },
      { kind: 'fact', text: `Xomashyo narxlari (kirim bo‘yicha o‘rtacha): ${cu.name} ${m(pc.h1)} → ${m(pc.h2)} /kg (${change(pc.h2, pc.h1).toFixed(1)}%), ${steel.name} ${m(ps.h1)} → ${m(ps.h2)} /kg (${change(ps.h2, ps.h1).toFixed(1)}%).` },
      { kind: 'fact', text: `Brak darajasi: ${now.map((u) => `${u.p.name} ${u.scrapPct.toFixed(1)}% (norma ${u.bom.scrapPct}%)`).join('; ')}.` },
      { kind: 'estimate', text: `Asosiy sabab — material komponenti: ${r.u.p.name} uchun material ${m(r.b?.act?.material || 0)} → ${m(r.u.act?.material || 0)}. Konversiya xarajatlari (mehnat, mashina, energiya, ustama) standart stavkada hisoblanadi; ularning o‘zgarishi asosan brak ulushi orqali.` },
      { kind: 'recommendation', text: `Mis bo‘yicha muqobil ta’minotchidan RFQ oling (joriy so‘rov: Xarid → RFQ), hisoblagich qutisi quyish jarayonida brak sababini (qolip harorati) aniqlang va standart tannarxni yangilashni ko‘rib chiqing.` },
    ],
    table: { cols: ['Mahsulot', 'Standart', 'Fakt (Q3)', 'Material std/fakt', 'Brak'], rows: now.map((u) => [u.p.name, m(u.std.total), u.act ? m(u.act.total) : '—', `${m(u.std.material)} / ${u.act ? m(u.act.material) : '—'}`, `${u.scrapPct.toFixed(1)}%`]) },
    actions: [{ label: 'Tannarx tahlili', type: 'nav', module: 'manufacturing', tab: 'costing' }, { label: 'Mis bo‘yicha RFQ', type: 'nav', module: 'purchasing', tab: 'requests' }],
    sources: ['Ish buyurtmalari (material + konversiya)', 'Xomashyo kirimlari', 'BOM standartlari'],
    explain: 'Standart tannarx — BOM va normativ stavkalar bo‘yicha rejaviy tannarx. Fakt — ish buyurtmasiga haqiqatda berilgan xomashyo (o‘rtacha tannarx usuli) + yutilgan konversiya xarajatlari, yaroqli mahsulot soniga bo‘lingan.',
  };
};

const revenue: Handler = (q, c) => {
  const p = parsePeriod(q, c.period); const pp = prevOf(p.from, p.to); const m = M(c);
  const a = pnl(c.db.entries, c.s, p.from, p.to); const b = pnl(c.db.entries, c.s, pp.from, pp.to);
  const br = A.branchProfit(c.db, c.s, p.from, p.to); const cu = A.customerProfit(c.db, c.s, p.from, p.to).slice(0, 3);
  return {
    title: `Tushum — ${p.label}`, insight: 'analysis', metrics: [{ label: 'Tushum', value: m(a.revenue), delta: change(a.revenue, b.revenue) }, { label: 'Yalpi foyda', value: m(a.gross), delta: change(a.gross, b.gross) }],
    blocks: [
      { kind: 'fact', text: `Tushum ${m(a.revenue)} (oldingi davr ${m(b.revenue)}, ${change(a.revenue, b.revenue).toFixed(1)}%).` },
      { kind: 'fact', text: `Filiallar: ${br.map((x) => `${x.branch.name} ${m(x.revenue)}`).join(', ')}. Top mijozlar: ${cu.map((x) => `${x.name} ${m(x.revenue)}`).join(', ')}.` },
    ],
    actions: [{ label: 'Sotuv analitikasi', type: 'nav', module: 'analytics', tab: 'revenue' }], sources: ['90xx tushum hisoblari'],
  };
};

const cashNow: Handler = (_q, c) => {
  const b = balances(c.db.entries, c.s, undefined, TODAY); const m = M(c);
  const rows = CASH_ACCOUNTS.map((a) => ({ a, v: b[a] || 0 }));
  const h = A.healthScore(c.db, c.s);
  return {
    title: 'Pul qoldig‘i', insight: 'insight', metrics: [{ label: 'Jami', value: m(sumRaw(b, CASH_ACCOUNTS)) }, ...rows.map((r) => ({ label: ACC[r.a].name, value: m(r.v) }))],
    blocks: [{ kind: 'fact', text: `Bugungi pul qoldig‘i ${m(sumRaw(b, CASH_ACCOUNTS))}: ${rows.map((r) => `${ACC[r.a].name} ${m(r.v)}`).join(', ')}.` }, { kind: 'estimate', text: `Joriy xarajat sur’atida pul zaxirasi ~${h.runway.toFixed(1)} oyga yetadi (yangi tushumlarsiz, taxmin).` }],
    actions: [{ label: 'G‘aznachilik', type: 'nav', module: 'finance', tab: 'treasury' }], sources: ['5010, 5110, 5210 hisoblari'],
  };
};

const taxes: Handler = (_q, c) => {
  const m = M(c);
  const open = c.db.taxObligations.filter((o) => o.status !== 'paid' && c.s.companyIds.includes(o.companyId)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  return {
    title: 'Soliq majburiyatlari', insight: 'risk', metrics: [{ label: 'Ochiq majburiyatlar', value: m(open.reduce((a, o) => a + o.amount, 0)) }, { label: 'Eng yaqin muddat', value: open[0] ? fmtDate(open[0].dueDate) : '—' }],
    blocks: [
      { kind: 'fact', text: open.length ? open.slice(0, 5).map((o) => `${byId(c.db.taxTypes, o.taxId)?.name} (${byId(c.db.companies, o.companyId)?.short}, ${o.period}) — ${m(o.amount)}, muddat ${fmtDate(o.dueDate)}${o.estimate ? ' [taxminiy]' : ''}`).join('; ') + '.' : 'Ochiq soliq majburiyati yo‘q.' },
      { kind: 'recommendation', text: 'Soliq summalari tizimdagi sozlanadigan stavkalar asosida hisoblangan. Topshirishdan oldin buxgalter/soliq maslahatchisi bilan tekshiring — bu rasmiy soliq maslahati emas.' },
    ],
    actions: [{ label: 'Soliq markazi', type: 'nav', module: 'taxes' }], sources: ['Soliq majburiyatlari reestri', '64xx, 65xx hisoblari'],
  };
};

const overview: Handler = (_q, c) => {
  const k = A.kpis(c.db, c.s, c.period.from, c.period.to); const m = M(c); const h = A.healthScore(c.db, c.s);
  const al = A.deriveAlerts(c.db, c.s);
  const get = (id: string) => k.list.find((x) => x.id === id)!;
  return {
    title: 'Biznesning qisqacha holati', insight: 'insight',
    metrics: [{ label: 'Tushum', value: m(get('revenue').value), delta: get('revenue').change }, { label: 'Sof foyda', value: m(get('net').value), delta: get('net').change }, { label: 'Pul', value: m(get('cash').value), delta: get('cash').change }, { label: 'Salomatlik', value: `${h.score}/100` }],
    blocks: [
      { kind: 'fact', text: `Davr: ${fmtDate(c.period.from)}–${fmtDate(c.period.to)}. Tushum ${m(get('revenue').value)} (${get('revenue').change.toFixed(1)}%), sof foyda ${m(get('net').value)}, pul ${m(get('cash').value)}, debitorlik ${m(get('ar').value)}.` },
      { kind: 'fact', text: `E’tibor talab qiladi: ${al.filter((a) => a.level === 'red').length} ta muddati o‘tgan qarz, ${al.filter((a) => a.kind === 'low_stock').length} ta kam zaxira, ${al.filter((a) => a.kind === 'tax').length} ta soliq eslatmasi.` },
      { kind: 'estimate', text: `Salomatlik ko‘rsatkichi ${h.score}/100 — ${h.comp.map((x) => `${x.label}: ${x.value}`).join(', ')}. Bu ichki model, reyting emas.` },
    ],
    actions: [{ label: 'Command Center', type: 'nav', module: 'dashboard' }, { label: 'Qaysi mijozlardan pul olishimiz kerak?', type: 'ask', prompt: 'Qaysi mijozlardan pul olishimiz kerak?' }], sources: ['Bosh kitob', 'Sub-kitoblar', 'Ogohlantirish qoidalari'],
  };
};

function notApplicable(title: string, text: string): AiAnswer { return { title, insight: 'insight', blocks: [{ kind: 'fact', text }], actions: [], sources: [] }; }

const INTENTS: { re: RegExp; h: Handler; id: string }[] = [
  { id: 'production', re: /tannarx.*(osh|nega|nima uchun|sabab)|ishlab chiqarish tannarx|себестоим|production cost/i, h: productionCost },
  { id: 'low_margin', re: /marja.*past|past marja|kam marja|низк\w* марж|low margin/i, h: productProfit },
  { id: 'product', re: /mahsulot.*foyda|foyda.*mahsulot|eng ko.?p foyda|rentabel.*mahsulot|прибыльн\w* товар|most profitable product/i, h: productProfit },
  { id: 'growth', re: /xarajat.*(osh|ko.?pay|qayerda)|где вырос|расход\w* вырос|expenses? (grow|increase)/i, h: expenseGrowth },
  { id: 'category', re: new RegExp(EXPENSE_CATEGORIES.filter((c) => c.id !== 'cogs').flatMap((c) => c.keywords).map((k) => k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i'), h: expenseCategory },
  { id: 'biggest', re: /eng katta xarajat|asosiy xarajat|крупн\w* расход|biggest expense|largest expense/i, h: biggestExpense },
  { id: 'receivable', re: /mijoz.*(pul|qarz|to.?la)|debitor|qarzdor|pul olish|дебитор|receivable|who owes/i, h: receivables },
  { id: 'cashflow', re: /cash ?flow|pul oqimi|денежн\w* поток|keyingi \d+ kun|прогноз|forecast/i, h: cashflow },
  { id: 'stock', re: /ombor.*kam|kam.*(qol|zaxira)|zaxira|остат|stock|склад/i, h: lowStock },
  { id: 'supplier', re: /supplier|ta.?minotchi|поставщик/i, h: supplierCost },
  { id: 'tax', re: /soliq|qqs|налог|ндс|\btax|vat\b/i, h: taxes },
  { id: 'cash', re: /pul qoldi|kassa|bankda|qancha pul bor|остаток денег|cash balance/i, h: cashNow },
  { id: 'profit', re: /foyda|прибыл|profit|zarar|убыт/i, h: profit },
  { id: 'revenue', re: /tushum|sotuv|выручк|продаж|revenue|sales/i, h: revenue },
  { id: 'overview', re: /holat|umumiy|xulosa|summary|обзор|сводк|nima muhim/i, h: overview },
];

export function ask(db: DB, s: Scope, cur: Currency, period: { from: string; to: string }, question: string): AiAnswer & { intent: string } {
  const c: Ctx = { db, s, cur, period };
  const hit = INTENTS.find((i) => i.re.test(question));
  if (!hit) {
    return {
      intent: 'unknown', title: 'Savolni aniqlashtiring', insight: 'insight',
      blocks: [{ kind: 'fact', text: 'Men BALANS AI’dagi buxgalteriya va operatsion ma’lumotlarni tahlil qilaman: foyda, tushum, xarajatlar (kategoriya bo‘yicha), debitorlik, pul oqimi prognozi, mahsulot marjasi, ombor qoldiqlari, ta’minotchilar, ishlab chiqarish tannarxi va soliqlar.' }, { kind: 'recommendation', text: 'Masalan: “Sentyabrda marketingga qancha sarfladik?”, “Keyingi 60 kun cash flow qanday?”, “Qaysi mahsulotning marjasi past?”' }],
      actions: [{ label: 'Bu oy foydamiz qancha?', type: 'ask', prompt: 'Bu oy foydamiz qancha?' }, { label: 'Qaysi omborda mahsulot kam?', type: 'ask', prompt: 'Qaysi omborda mahsulot kam?' }], sources: [],
    };
  }
  return { ...hit.h(question, c), intent: hit.id };
}

export const SUGGESTED = [
  'Bu oy foydamiz qancha?', 'Eng katta xarajatimiz nima?', 'Qaysi mijozlardan pul olishimiz kerak?', 'Keyingi 30 kun cash flow qanday?', 'Qaysi mahsulot eng ko‘p foyda keltiryapti?',
  'Xarajatlar qayerda oshgan?', 'Qaysi omborda mahsulot kam?', 'Qaysi supplier eng ko‘p xarajat keltiryapti?', 'Zavodda ishlab chiqarish tannarxi nima uchun oshdi?', 'Qaysi mahsulotning marjasi past?',
  '2026 yil sentyabr oyida marketingga qancha pul sarfladik?',
];

/** Proactive insight cards for dashboards / AI page. */
export function insightCards(db: DB, s: Scope, cur: Currency, period: { from: string; to: string }) {
  const m = (v: number) => moneyC(v, cur);
  const k = A.kpis(db, s, period.from, period.to); const get = (id: string) => k.list.find((x) => x.id === id)!;
  const ag = A.arAging(db, s); const f = A.cashForecast(db, s, 30); const an = A.anomalies(db, s)[0];
  const prod = A.productProfit(db, s, '2026-01-01', TODAY).filter((x) => x.p.kind !== 'service');
  const low = [...prod].sort((a, b) => a.margin - b.margin)[0]; const best = prod[0];
  const bud = A.budgetVsActual(db, s, 2026, +TODAY.slice(5, 7), +TODAY.slice(5, 7)).filter((r) => r.pct > 5)[0];
  const cards: { type: Insight; kind: Kind; title: string; body: string; prompt: string }[] = [];
  cards.push({ type: 'analysis', kind: 'fact', title: `Tushum ${get('revenue').change >= 0 ? 'o‘sdi' : 'kamaydi'}: ${get('revenue').change >= 0 ? '+' : ''}${get('revenue').change.toFixed(1)}%`, body: `${m(get('revenue').value)} — oldingi davrda ${m(get('revenue').prev)}. Sof foyda ${m(get('net').value)}.`, prompt: 'Bu oy foydamiz qancha?' });
  if (ag.overdue > 0) cards.push({ type: 'risk', kind: 'fact', title: `Muddati o‘tgan debitorlik: ${m(ag.overdue)}`, body: `${ag.customers.filter((c) => c.total - c.b.current > 0).length} ta mijoz. 30 kundan ortig‘i: ${m(ag.buckets.d60 + ag.buckets.d60p)}.`, prompt: 'Qaysi mijozlardan pul olishimiz kerak?' });
  cards.push({ type: f.min.balance < f.start * 0.6 ? 'risk' : 'opportunity', kind: 'estimate', title: `30 kunlik pul prognozi: ${m(f.d30.balance)}`, body: `Eng past nuqta ~${m(f.min.balance)} (${fmtDate(f.min.date)}). Taxminiy hisob.`, prompt: 'Keyingi 30 kun cash flow qanday?' });
  if (an) cards.push({ type: 'insight', kind: 'fact', title: 'G‘ayrioddiy xarajat aniqlandi', body: `${an.memo} — ${m(an.amount)}, odatiydan ${an.ratio.toFixed(1)}× katta.`, prompt: 'Xarajatlar qayerda oshgan?' });
  if (bud) cards.push({ type: 'risk', kind: 'fact', title: `Byudjetdan oshish: ${bud.name}`, body: `Fakt ${m(bud.actual)} / reja ${m(bud.budget)} (${bud.pct > 0 ? '+' : ''}${bud.pct.toFixed(0)}%).`, prompt: 'Xarajatlar qayerda oshgan?' });
  if (low) cards.push({ type: 'recommendation', kind: 'recommendation', title: `Past marja: ${low.p.name}`, body: `Yalpi marja ${low.margin.toFixed(1)}%. Narx yoki tannarxni qayta ko‘rib chiqish tavsiya etiladi.`, prompt: 'Qaysi mahsulotning marjasi past?' });
  if (best) cards.push({ type: 'opportunity', kind: 'fact', title: `Eng foydali: ${best.p.name}`, body: `YTD yalpi foyda ${m(best.gross)}, marja ${best.margin.toFixed(1)}%.`, prompt: 'Qaysi mahsulot eng ko‘p foyda keltiryapti?' });
  return cards;
}
