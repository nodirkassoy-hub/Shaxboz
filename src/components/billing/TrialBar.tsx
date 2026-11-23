'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sparkles, AlertTriangle, X, ArrowRight, Clock } from 'lucide-react';
import { useBilling, useEntitlements } from '@/lib/billing/store';
import { trialReminder } from '@/lib/billing';
import { DemoBar } from '@/components/shell/DemoBar';
import { cx } from '@/components/ui';

const DISMISS_KEY = 'balans.trialDismiss';

/**
 * Panel tepasidagi holat chizig‘i:
 *  • sinov hisoblagichi (N kun qoldi)
 *  • 7 / 3 / 1 kun qolganda eslatma
 *  • o‘qish rejimi ogohlantirishi
 */
export function TrialBar() {
  const account = useBilling((s) => s.account);
  const ready = useBilling((s) => s.ready);
  const ent = useEntitlements();
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => { try { setDismissed(localStorage.getItem(DISMISS_KEY)); } catch { /* ignore */ } }, []);
  if (!ready || !account) return null;

  const reminder = trialReminder(ent);
  const key = `${ent.status}-${ent.trialDaysLeft}-${ent.graceLeft}`;
  const hidden = dismissed === key;

  const tone = ent.status === 'trial' ? (ent.trialDaysLeft <= 3 ? 'danger' : ent.trialDaysLeft <= 7 ? 'warn' : 'info')
    : ent.status === 'active' ? 'pos' : 'danger';

  return (
    <div className="mb-4 space-y-2">
      <DemoBar />
      <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border px-3 py-2 text-[12.5px]',
        tone === 'danger' ? 'border-neg/25 bg-neg/8 text-neg' : tone === 'warn' ? 'border-warn/25 bg-warn/8 text-warn' : tone === 'pos' ? 'border-pos/20 bg-pos/8 text-pos' : 'border-accent/20 bg-accent-soft text-accent')}>
        {tone === 'danger' ? <AlertTriangle className="h-4 w-4 shrink-0" /> : ent.status === 'active' ? <Sparkles className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <span className="min-w-0 flex-1 font-medium text-t1">
          {ent.status === 'trial' && <>Sinov davri: <b className="num">{ent.trialDaysLeft}</b> kun qoldi · {ent.plan.name} darajasidagi barcha modullar ochiq</>}
          {ent.status === 'active' && <>{ent.plan.name} tarifi faol · keyingi to‘lov: <b className="num">{ent.periodEnd}</b></>}
          {ent.status === 'readonly' && <>O‘qish rejimi: yangi yozuvlar yopiq{ent.trialDaysLeft === 0 && ent.graceLeft > 0 ? ` · mehr-muruvvat: ${ent.graceLeft} kun` : ''}</>}
          {ent.status === 'cancelled' && <>Obuna bekor qilingan · davr oxiri: <b className="num">{ent.periodEnd}</b></>}
        </span>
        {ent.aiQuestions !== null && <span className="hidden text-[11.5px] text-t3 sm:inline">AI CFO: {ent.aiUsed}/{ent.aiQuestions} savol</span>}
        <Link href={ent.status === 'active' ? '/account' : '/checkout'} className="inline-flex items-center gap-1 rounded-lg bg-surface-solid px-2.5 py-1 text-[12px] font-semibold text-t1 shadow-sm transition hover:brightness-105">
          {ent.status === 'active' ? 'Hisobni boshqarish' : 'Tarifni tanlash'} <ArrowRight className="h-3 w-3" />
        </Link>
        {reminder && !hidden && (
          <button aria-label="Eslatmani yopish" onClick={() => { setDismissed(key); try { localStorage.setItem(DISMISS_KEY, key); } catch { /* ignore */ } }} className="text-t3 hover:text-t1"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>
      {reminder && !hidden && reminder.show && (
        <div className={cx('anim-rise flex items-start gap-2.5 rounded-2xl border p-3', reminder.tone === 'danger' ? 'border-neg/30 bg-neg/8' : reminder.tone === 'warn' ? 'border-warn/30 bg-warn/8' : 'border-line bg-surface-2')}>
          <AlertTriangle className={cx('mt-0.5 h-4 w-4 shrink-0', reminder.tone === 'danger' ? 'text-neg' : reminder.tone === 'warn' ? 'text-warn' : 'text-t2')} />
          <div className="min-w-0 flex-1">
            <p className={cx('text-[13px] font-semibold', reminder.tone === 'danger' ? 'text-neg' : reminder.tone === 'warn' ? 'text-warn' : 'text-t1')}>{reminder.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-t2">{reminder.body}</p>
          </div>
          <Link href="/checkout" className="shrink-0 rounded-lg bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-white hover:brightness-110">Tarif tanlash</Link>
        </div>
      )}
    </div>
  );
}
