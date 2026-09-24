import type { Currency, Rates } from '../types';

/** Demo exchange rates (UZS per unit). Central Bank API is NOT connected — see integrations. */
export const DEMO_RATES: Rates = { USD: 12650, EUR: 14300, date: '2026-09-23', source: 'Demo kurs (CBU API ulanmagan)' };

export const convert = (uzs: number, cur: Currency, rates: Rates = DEMO_RATES) =>
  cur === 'UZS' ? uzs : uzs / rates[cur];

const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nfUsd1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export const num = (n: number) => nf0.format(Math.round(n)).replace(/\u00a0/g, ' ');
export const num1 = (n: number) => nf1.format(n).replace(/\u00a0/g, ' ');

const SYM: Record<Currency, string> = { UZS: "so'm", USD: '$', EUR: '€' };
export const curSymbol = (c: Currency) => SYM[c];

/** Full precision money. Input always UZS. */
export function money(uzs: number, cur: Currency = 'UZS', rates: Rates = DEMO_RATES) {
  const v = convert(uzs, cur, rates);
  if (cur === 'UZS') return `${num(v)} so'm`;
  const s = nf2.format(Math.round(Math.abs(v)));
  return `${v < 0 ? '−' : ''}${SYM[cur]}${s}`;
}

/** Compact money: 5,4 mlrd so'm / $428.5K */
export function moneyC(uzs: number, cur: Currency = 'UZS', rates: Rates = DEMO_RATES, withUnit = true) {
  const v = convert(uzs, cur, rates); const a = Math.abs(v); const sign = v < 0 ? '−' : '';
  if (cur === 'UZS') {
    const u = withUnit ? " so'm" : '';
    if (a >= 1e9) return `${sign}${num1(a / 1e9)} mlrd${u}`;
    if (a >= 1e6) return `${sign}${num1(a / 1e6)} mln${u}`;
    if (a >= 1e3) return `${sign}${num(a / 1e3)} ming${u}`;
    return `${sign}${num(a)}${u}`;
  }
  const s = SYM[cur];
  if (a >= 1e6) return `${sign}${s}${nfUsd1.format(a / 1e6)}M`;
  if (a >= 1e5) return `${sign}${s}${nfUsd1.format(a / 1e3)}K`;
  return `${sign}${s}${nf2.format(Math.round(a))}`;
}

export const pct = (v: number, digits = 1) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;
export const change = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : 100) : ((cur - prev) / Math.abs(prev)) * 100);
export const r0 = (n: number) => Math.round(n);
