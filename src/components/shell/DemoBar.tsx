'use client';
import { useState } from 'react';
import { Factory, Store, Loader2, Info, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { BRANDS } from '@/lib/demo/transform';
import { DemoTag, cx } from '@/components/ui';

const KEY = 'balans.demobar';

/** Panel tepasidagi demo to‘plam almashtirgich (zavod ⇄ savdo). */
export function DemoBar() {
  const status = useApp((s) => s.status);
  const brand = useApp((s) => s.brand);
  const setBrand = useApp((s) => s.setBrand);
  const [hidden, setHidden] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-t2">
        <Loader2 className="h-4 w-4 animate-spin text-accent" /> Demo to‘plam yuklanmoqda…
      </div>
    );
  }
  if (hidden) {
    return (
      <button onClick={() => setHidden(false)} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-t3 hover:text-t1">
        <Info className="h-3.5 w-3.5" /> Demo to‘plamni ko‘rsatish
      </button>
    );
  }
  const b = BRANDS[brand];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface-2/70 px-2.5 py-2">
      <span className="flex items-center gap-1.5 pl-1 text-[11.5px] font-semibold uppercase tracking-wide text-t3">
        Demo to‘plam <DemoTag />
      </span>
      <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-solid p-0.5">
        {(['factory', 'trade'] as const).map((k) => {
          const I = k === 'factory' ? Factory : Store;
          const active = brand === k;
          return (
            <button key={k} onClick={() => setBrand(k)} aria-pressed={active}
              className={cx('inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[12px] font-semibold transition', active ? 'bg-accent text-white shadow-sm' : 'text-t2 hover:bg-surface-2 hover:text-t1')}>
              <I className="h-3.5 w-3.5" /> {k === 'factory' ? 'Ishlab chiqarish zavodi' : 'Savdo va xizmat'}
            </button>
          );
        })}
      </div>
      <span className="hidden min-w-0 flex-1 truncate text-[11.5px] text-t3 sm:block">{b.legal} · {b.slogan}</span>
      <button onClick={() => setShowInfo((v) => !v)} className="rounded-lg p-1 text-t3 hover:bg-surface-3 hover:text-t1" aria-label="Demo haqida">
        <Info className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => setHidden(true)} className="rounded-lg p-1 text-t3 hover:bg-surface-3 hover:text-t1" aria-label="Yashirish">
        <X className="h-3.5 w-3.5" />
      </button>
      {showInfo && (
        <p className="w-full rounded-xl bg-surface-solid p-2.5 text-[11.5px] leading-relaxed text-t2">
          Bu demo ma’lumot. Har ikkala to‘plam o‘z ichida izchil: sotuv jami = dashboard daromadi, ombor qoldig‘i = kirim − chiqim,
          aktiv = majburiyat + kapital, foyda = daromad − xarajat. Kiritgan o‘zgarishlaringiz brauzerda saqlanadi.
        </p>
      )}
    </div>
  );
}
