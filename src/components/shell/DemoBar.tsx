'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Factory, Store, Loader2, Info, X, Rocket, FlaskConical } from 'lucide-react';
import { useApp } from '@/lib/store';
import { BRANDS } from '@/lib/demo/transform';
import { useT } from '@/lib/i18n';
import { cx } from '@/components/ui';

const KEY = 'balans.demobar.hidden';

/**
 * Demo rejim paneli.
 *
 * Talab: demo ochilganda ro‘yxatdan o‘tish so‘ralmaydi, yuqorida "Demo rejim"
 * belgisi va "Bepul boshlash" tugmasi bo‘ladi, to‘plamni almashtirish mumkin.
 * Panel yashirilsa — holat brauzerda saqlanadi (bezovta qilmasin), lekin
 * "Demo rejimni ko‘rsatish" havolasi doim qoladi.
 */
export function DemoBar() {
  const status = useApp((s) => s.status);
  const brand = useApp((s) => s.brand);
  const setBrand = useApp((s) => s.setBrand);
  const t = useT();
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const [showInfo, setShowInfo] = useState(false);

  const hide = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, '1'); } catch { /* maxfiy rejim */ }
  };
  const show = () => {
    setHidden(false);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  };

  if (status === 'loading') {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-t2" role="status" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin text-accent" /> {t('demo.loading')}
      </div>
    );
  }

  if (hidden) {
    return (
      <button onClick={show} className="mb-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-t3 hover:text-t1">
        <FlaskConical className="h-3.5 w-3.5" /> {t('demo.badge')} — {t('demo.switch')}
      </button>
    );
  }

  const b = BRANDS[brand];
  return (
    <div className="mb-3 rounded-2xl border border-accent/25 bg-gradient-to-r from-accent-soft via-surface-2/60 to-surface-2/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Demo rejim belgisi */}
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white">
          <FlaskConical className="h-3 w-3" /> {t('demo.badge')}
        </span>

        {/* To‘plam almashtirgich */}
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-solid p-0.5" role="group" aria-label={t('demo.switch')}>
          {(['factory', 'trade'] as const).map((k) => {
            const I = k === 'factory' ? Factory : Store;
            const active = brand === k;
            return (
              <button
                key={k}
                onClick={() => setBrand(k)}
                aria-pressed={active}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-[11.5px] font-semibold transition',
                  active ? 'bg-accent text-white shadow-sm' : 'text-t2 hover:bg-surface-2 hover:text-t1',
                )}
              >
                <I className="h-3.5 w-3.5" /> {t(k === 'factory' ? 'demo.factory' : 'demo.trade')}
              </button>
            );
          })}
        </div>

        <span className="hidden min-w-0 flex-1 truncate text-[11.5px] text-t3 lg:block">{b.legal} · {b.slogan}</span>

        {/* Bepul boshlash — asosiy harakat */}
        <Link
          href="/signup"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-xl bg-accent px-3 text-[12px] font-semibold text-white shadow-card transition hover:brightness-110"
        >
          <Rocket className="h-3.5 w-3.5" /> {t('demo.startFree')}
        </Link>

        <button onClick={() => setShowInfo((v) => !v)} className="rounded-lg p-1.5 text-t3 hover:bg-surface-3 hover:text-t1" aria-label={t('demo.title')} aria-expanded={showInfo}>
          <Info className="h-3.5 w-3.5" />
        </button>
        <button onClick={hide} className="rounded-lg p-1.5 text-t3 hover:bg-surface-3 hover:text-t1" aria-label={t('demo.hide')}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {showInfo && (
        <p className="mt-2 rounded-xl bg-surface-solid p-2.5 text-[11.5px] leading-relaxed text-t2">
          {t('demo.body')}
        </p>
      )}
    </div>
  );
}
