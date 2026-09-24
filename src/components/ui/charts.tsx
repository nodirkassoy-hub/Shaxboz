'use client';
import type { ReactNode } from 'react';
import { useApp } from '@/lib/store';
import { moneyC } from '@/lib/core/money';

export const PALETTE = ['#6d6df5', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#a855f7', '#84cc16', '#ec4899', '#64748b'];

export function useChartFmt() {
  const cur = useApp((s) => s.filters.currency);
  return { axis: (v: number) => moneyC(v, cur, undefined, false), tip: (v: number) => moneyC(v, cur) };
}

export function ChartTooltip({ active, payload, label, fmt, labelFmt }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string; payload?: Record<string, unknown> }[]; label?: string; fmt: (v: number) => string; labelFmt?: (l: string) => ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-xl border border-line bg-surface-solid px-3 py-2 text-[12px] shadow-pop">
      <div className="mb-1 font-semibold text-t1">{labelFmt ? labelFmt(String(label)) : label}</div>
      {payload.filter((p) => p.value !== undefined && p.value !== null).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-t2"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="num font-semibold text-t1">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{items.map((i) => <span key={i.label} className="flex items-center gap-1.5 text-[11.5px] text-t2"><span className="inline-block h-[3px] w-3.5 rounded-full" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 3px, transparent 3px 5px)` : i.color }} />{i.label}</span>)}</div>;
}
