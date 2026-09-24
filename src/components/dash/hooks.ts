'use client';
import { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { scopeOf } from '@/lib/analytics';
import { moneyC, money } from '@/lib/core/money';

export function useCtx() {
  const db = useApp((s) => s.db); const filters = useApp((s) => s.filters);
  const s = useMemo(() => scopeOf(db, filters), [db, filters]);
  const cur = filters.currency;
  return { db, filters, s, cur, from: filters.from, to: filters.to, m: (v: number) => moneyC(v, cur), mf: (v: number) => money(v, cur) };
}
