/**
 * Landing sahifasidagi "haqiqiy dashboard" ko‘rinishi uchun raqamlar.
 * Build vaqtida demo bazadan hisoblanadi (server komponentida) —
 * shuning uchun birinchi HTML bo‘sh emas va raqamlar real demo bilan bir xil.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { balances, pnl, monthlySeries } from '@/lib/core/ledger';
import { moneyC } from '@/lib/core/money';
import { TODAY, monthStart, monthsBetween, addMonths, monthEnd } from '@/lib/core/dates';
import type { DB } from '@/lib/db';
import { arAging, apSchedule, stockRows } from '@/lib/analytics';
import { CASH_ACCOUNTS } from '@/lib/core/coa';

export interface LandingStats {
  revenue: string; expenses: string; net: string; cash: string; ar: string; ap: string; stock: string; tax: string;
  series: { label: string; revenue: number; net: number }[];
  netRaw: number; revenueRaw: number; marginRaw: number;
  counts: { entries: number; invoices: number; products: number; employees: number; companies: number };
  insights: { tone: 'pos' | 'warn' | 'neg' | 'info'; title: string; body: string }[];
}

let cached: LandingStats | null = null;

export function landingStats(): LandingStats {
  if (cached) return cached;
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'src', 'data', 'demo-factory.json'), 'utf8')) as { db: DB };
  const db = raw.db;
  const s = { companyIds: db.companies.map((c) => c.id) };
  const from = monthStart(TODAY);
  const p = pnl(db.entries, s, from, TODAY);
  const ytd = pnl(db.entries, s, '2026-01-01', TODAY);
  const bal = balances(db.entries, s, undefined, TODAY);
  const cash = CASH_ACCOUNTS.reduce((a, c) => a + (bal[c] || 0), 0);
  const aging = arAging(db, s);
  const ap = apSchedule(db, s);
  const stock = stockRows(db, s).reduce((a, r) => a + r.value, 0);
  const tax = db.taxObligations.filter((o) => o.status === 'open' && s.companyIds.includes(o.companyId)).reduce((a, o) => a + o.amount, 0);
  const months = monthsBetween(addMonths(monthStart(TODAY), -8), monthStart(TODAY));
  const series = monthlySeries(db.entries, s, months).map((m) => ({
    label: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'][+m.month.slice(5, 7) - 1],
    revenue: m.revenue,
    net: m.net,
  }));
  const last = series.at(-1);
  const prev = series.at(-2);
  const growth = prev && prev.revenue ? ((last!.revenue - prev.revenue) / prev.revenue) * 100 : 0;
  const overdue = aging.overdue;
  cached = {
    revenue: moneyC(p.revenue),
    expenses: moneyC(p.totalExpenses),
    net: moneyC(p.net),
    cash: moneyC(cash),
    ar: moneyC(aging.total),
    ap: moneyC(ap.total),
    stock: moneyC(stock),
    tax: moneyC(tax),
    series,
    netRaw: p.net,
    revenueRaw: p.revenue,
    marginRaw: p.netMargin,
    counts: { entries: db.entries.length, invoices: db.invoices.length, products: db.products.length, employees: db.employees.length, companies: db.companies.length },
    insights: [
      { tone: 'pos', title: `Sof foyda ${moneyC(p.net)}`, body: `Sentyabr oyida foyda marjasi ${p.netMargin.toFixed(1)}%. Tushum o‘tgan oyga nisbatan ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%.` },
      { tone: 'warn', title: `Muddati o‘tgan debitorlik ${moneyC(overdue)}`, body: `${aging.customers.filter((c) => c.oldest > 30).length} mijozda 30 kundan oshgan qarz bor. Eng katta: ${aging.customers[0]?.customer ?? '—'} — ${moneyC(aging.customers[0]?.total ?? 0)}.` },
      { tone: 'info', title: `Kreditorlik ${moneyC(ap.total)}`, body: `${ap.rows.filter((r) => r.days < 0).length} hisob muddati o‘tgan, ${moneyC(ap.week)} 7 kun ichida to‘lanishi kerak.` },
      { tone: 'neg', title: `Soliq majburiyati ${moneyC(tax)}`, body: `Keyingi to‘lov muddati: ${moneyC(tax)} — QQS va ijtimoiy soliq. Kalendarda 3 ta vazifa.` },
    ],
  };
  void monthEnd;
  void ytd;
  return cached;
}
