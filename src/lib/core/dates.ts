// Date helpers working on ISO date strings (YYYY-MM-DD) in UTC to stay deterministic.
export const TODAY = '2026-09-23';
export const FY_START = '2026-01-01';

const MS = 86400000;
export const toDate = (s: string) => new Date(s + 'T00:00:00Z');
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * MS));
export const diffDays = (a: string, b: string) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / MS);
export const monthKey = (s: string) => s.slice(0, 7);
export const dow = (s: string) => toDate(s).getUTCDay(); // 0 = Sunday
export const isWorkday = (s: string) => { const d = dow(s); return d !== 0 && d !== 6; };
export const monthStart = (s: string) => s.slice(0, 7) + '-01';
export const monthEnd = (s: string) => {
  const d = toDate(monthStart(s)); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return iso(d);
};
export const addMonths = (s: string, n: number) => {
  const d = toDate(s); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return iso(d);
};
export const quarterOf = (s: string) => Math.floor((+s.slice(5, 7) - 1) / 3) + 1;
export const quarterEnd = (s: string) => { const q = quarterOf(s); return monthEnd(`${s.slice(0, 4)}-${String(q * 3).padStart(2, '0')}-01`); };
export const between = (d: string, from?: string, to?: string) => (!from || d >= from) && (!to || d <= to);

export const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
export const monthLabel = (key: string, short = false) => {
  const m = +key.slice(5, 7) - 1; return `${(short ? MONTHS_SHORT : MONTHS_UZ)[m]}${short ? '' : ' ' + key.slice(0, 4)}`;
};
export const fmtDate = (s?: string) => {
  if (!s) return '—'; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}.${m}.${y}`;
};
export const fmtDateTime = (s: string) => `${fmtDate(s.slice(0, 10))} ${s.slice(11, 16)}`;
export const monthsBetween = (from: string, to: string) => {
  const out: string[] = []; let k = monthKey(from); const end = monthKey(to);
  while (k <= end) { out.push(k); k = monthKey(addMonths(k + '-01', 1)); }
  return out;
};
