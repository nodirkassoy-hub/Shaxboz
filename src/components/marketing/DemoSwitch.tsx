'use client';
import Link from 'next/link';
import { Factory, Store } from 'lucide-react';
import { useApp } from '@/lib/store';
import { BRANDS } from '@/lib/demo/transform';
import { cx } from '@/components/ui';

/** Landing sahifasida ikkita demo to‘plamni tanlash (panelda shu to‘plam ochiladi). */
export function DemoSwitch() {
  const brand = useApp((s) => s.brand);
  const setBrand = useApp((s) => s.setBrand);
  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div className="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface-2 p-1">
        {(['factory', 'trade'] as const).map((k) => {
          const I = k === 'factory' ? Factory : Store;
          const active = brand === k;
          return (
            <button key={k} onClick={() => setBrand(k)} aria-pressed={active}
              className={cx('inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition', active ? 'bg-surface-solid text-t1 shadow-sm' : 'text-t3 hover:text-t1')}>
              <I className="h-3.5 w-3.5" /> {k === 'factory' ? 'Ishlab chiqarish zavodi' : 'Savdo va xizmat'}
            </button>
          );
        })}
        <Link href="/app" className="ml-1 rounded-xl bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110">Demo ochish</Link>
      </div>
      <p className="text-[11px] text-t3">{BRANDS[brand].legal} · {BRANDS[brand].slogan}</p>
    </div>
  );
}
