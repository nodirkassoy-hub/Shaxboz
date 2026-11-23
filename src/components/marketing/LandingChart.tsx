'use client';
import { useId } from 'react';

/** Landing uchun yengil SVG grafik — 0 kutubxona, SSR'da ham darhol chiziladi. */
export function LandingChart({ series, height = 140 }: { series: { label: string; revenue: number; net: number }[]; height?: number }) {
  const id = useId().replace(/:/g, '');
  const w = 520; const h = height; const pad = { l: 0, r: 0, t: 8, b: 18 };
  if (!series.length) return null;
  const max = Math.max(...series.map((s) => s.revenue), 1);
  const min = Math.min(...series.map((s) => s.net), 0);
  const x = (i: number) => (i / Math.max(1, series.length - 1)) * w;
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - (v - min) / (max - min || 1));
  const line = (key: 'revenue' | 'net') => series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[key]).toFixed(1)}`).join(' ');
  const area = `${line('revenue')} L${w},${h - pad.b} L0,${h - pad.b} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} role="img" aria-label="Oylik tushum va sof foyda grafigi">
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".35" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path d={line('revenue')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={line('net')} fill="none" stroke="var(--pos)" strokeWidth="1.75" strokeDasharray="4 3" strokeLinejoin="round" />
      {series.map((s, i) => <circle key={s.label + i} cx={x(i)} cy={y(s.revenue)} r="2.4" fill="var(--accent)" />)}
      {series.map((s, i) => <text key={s.label + i} x={x(i)} y={h - 4} textAnchor="middle" fontSize="9.5" fill="var(--chart-text)">{s.label}</text>)}
    </svg>
  );
}

export function LandingSpark({ series, height = 64 }: { series: number[]; height?: number }) {
  const w = 260; const h = height;
  const max = Math.max(...series, 1); const min = Math.min(...series, 0);
  const pts = series.map((v, i) => [(i / Math.max(1, series.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} aria-hidden>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill="var(--pos)" fillOpacity=".12" />
      <path d={path} fill="none" stroke="var(--pos)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
