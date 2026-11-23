'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, Check, CreditCard, Download, Landmark, Loader2, RefreshCw, Sparkles, TriangleAlert,
  Wallet, CalendarClock, Users, Bot, Warehouse as WarehouseIcon, ShieldCheck, CircleCheck, CircleX, Receipt,
} from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { useBilling, useEntitlements } from '@/lib/billing/store';
import { PLANS, EXTRA_USER_PRICE, VAT_RATE, ANNUAL_FREE_MONTHS, TRIAL_DAYS, GRACE_DAYS, DATA_RETENTION_DAYS, priceOf, effectiveMonthly, annualSaving, planOf, type Cycle, type PlanId } from '@/lib/config/pricing';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/billing';
import { TEST_MODE } from '@/lib/billing/providers';
import { cx } from '@/components/ui';
import { fmtDate } from '@/lib/core/dates';

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = { payme: CreditCard, click: Wallet, uzum: Sparkles, bank: Landmark };

/** Serverdagi `trial_ends_at` dan qolgan kun (Asia/Tashkent). */
function daysUntil(date: string, from: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export default function SubscriptionPage() {
  const ent = useEntitlements();
  const server = useBilling((s) => s.server);
  const syncServer = useBilling((s) => s.syncServer);
  const choosePlan = useBilling((s) => s.choosePlan);
  const cancel = useBilling((s) => s.cancel);
  const account = useBilling((s) => s.account);
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [method, setMethod] = useState<PaymentMethod>('payme');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => { void syncServer(); }, [syncServer]);

  const today = server?.today ?? '';
  const trialEnds = account?.trialEndsAt ?? '';
  const trialDays = today && trialEnds ? daysUntil(trialEnds, today) : ent.trialDaysLeft;
  const isTrial = ent.status === 'trial';
  const isActive = ent.status === 'active' || ent.status === 'cancelled';
  const isReadOnly = ent.status === 'readonly';

  const startPlan = (planId: PlanId) => {
    if (planId === 'korporativ') { window.location.href = '/contact?plan=korporativ'; return; }
    setBusy(true);
    const r = choosePlan(planId, cycle);
    setNote(r.note || null);
    setBusy(false);
    if (r.needPayment) window.location.href = `/checkout?plan=${planId}&cycle=${cycle}&method=${method}`;
  };

  const aiUsePct = ent.aiQuestions ? Math.min(100, Math.round((ent.aiUsed / ent.aiQuestions) * 100)) : 0;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-t1 sm:text-[32px]">Obuna va tarif</h1>
            <p className="mt-1 text-[13px] text-t2">
              Sinov muddati, tarif cheklovlari va to‘lovlar — hammasi bitta joyda.
              {server?.timezone && <span className="text-t3"> Vaqt zonasi: {server.timezone}</span>}
            </p>
          </div>
          <button onClick={() => void syncServer()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-solid px-3 text-[12.5px] font-medium text-t2 hover:text-t1">
            <RefreshCw className="h-3.5 w-3.5" /> Yangilash
          </button>
        </div>

        {/* ── Katta holat kartasi ───────────────────────────── */}
        <section aria-labelledby="status-title" className="mt-5 overflow-hidden rounded-3xl border border-line bg-surface-solid shadow-card">
          <div className={cx('h-1.5 w-full', isTrial ? 'bg-gradient-to-r from-accent to-accent-2' : isActive ? 'bg-pos' : 'bg-warn')} />
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em]',
                  isTrial ? 'bg-accent-soft text-accent' : isActive ? 'bg-pos/12 text-pos' : 'bg-warn/12 text-warn')}>
                  {isTrial ? <CalendarClock className="h-3 w-3" /> : isActive ? <CircleCheck className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}
                  {isTrial ? 'Bepul sinov' : isActive ? 'Faol obuna' : 'O‘qish rejimi'}
                </span>
                {TEST_MODE && <span className="rounded-lg bg-surface-2 px-2 py-1 text-[10.5px] font-semibold text-t3">TEST REJIMI</span>}
              </div>
              <h2 id="status-title" className="mt-2.5 text-[24px] font-bold leading-tight text-t1 sm:text-[28px]">
                {isTrial ? `Bepul sinov: ${trialDays} kun qoldi` : isActive ? `${ent.plan.name} tarifi` : 'Sinov tugadi'}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-t2">{ent.reason}</p>

              {isTrial && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={TRIAL_DAYS} aria-valuenow={TRIAL_DAYS - trialDays} aria-label="Sinov davri progressi">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${Math.max(2, Math.min(100, ((TRIAL_DAYS - trialDays) / TRIAL_DAYS) * 100))}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-t3">
                    <span>Boshlangan: {account?.createdAt ? fmtDate(account.createdAt) : '—'}</span>
                    <span>Tugaydi: {trialEnds ? fmtDate(trialEnds) : '—'}</span>
                  </div>
                </div>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-2.5 text-[12.5px] sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-surface-2/60 p-2.5">
                  <dt className="text-[11px] text-t3">Joriy tarif</dt>
                  <dd className="mt-0.5 font-semibold text-t1">{ent.plan.name}</dd>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/60 p-2.5">
                  <dt className="text-[11px] text-t3">{isActive ? 'Keyingi to‘lov' : 'Tugash sanasi'}</dt>
                  <dd className="mt-0.5 font-semibold text-t1">{ent.periodEnd ? fmtDate(ent.periodEnd) : '—'}</dd>
                </div>
                <div className="rounded-xl border border-line bg-surface-2/60 p-2.5">
                  <dt className="text-[11px] text-t3">Qolgan kun</dt>
                  <dd className="mt-0.5 font-semibold text-t1">{ent.daysLeft} kun</dd>
                </div>
              </dl>

              {isReadOnly && (
                <div className="mt-3 rounded-xl border border-warn/30 bg-warn/[.07] p-3 text-[12px] leading-relaxed text-t2">
                  <b className="text-warn">O‘qish rejimi.</b> Ma’lumotlaringiz {DATA_RETENTION_DAYS} kun saqlanadi va to‘lovdan keyin to‘liq tiklanadi.
                  {ent.graceLeft > 0 && <> Mehr-muruvvat muddati: <b>{ent.graceLeft} kun</b>.</>}
                </div>
              )}
            </div>

            {/* Foydalanish ko‘rsatkichlari */}
            <div className="rounded-2xl border border-line bg-surface-2/40 p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-t3">Foydalanish</h3>
              <div className="mt-3 space-y-3">
                <Usage icon={Users} label="Foydalanuvchilar" used={account?.team?.length ?? 1} limit={ent.users} />
                <div>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5 text-t2"><Bot className="h-3.5 w-3.5" /> AI CFO savollari</span>
                    <span className="num font-semibold text-t1">{ent.aiUsed}{ent.aiQuestions === null ? ' / cheksiz' : ` / ${ent.aiQuestions}`}</span>
                  </div>
                  {ent.aiQuestions !== null && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                      <div className={cx('h-full rounded-full', aiUsePct > 90 ? 'bg-neg' : aiUsePct > 70 ? 'bg-warn' : 'bg-accent')} style={{ width: `${aiUsePct}%` }} />
                    </div>
                  )}
                </div>
                <Usage icon={WarehouseIcon} label="Omborlar" used={ent.plan.id === 'start' ? 1 : 3} limit={ent.warehouses} />
              </div>
              {ent.plan.id !== 'korporativ' && (
                <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-t3">
                  Qo‘shimcha foydalanuvchi — <b className="text-t2">{EXTRA_USER_PRICE.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/oy</b>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Tariflar ──────────────────────────────────────── */}
        <section className="mt-8" aria-labelledby="plans-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="plans-title" className="text-[19px] font-bold text-t1">Tarifni tanlang</h2>
            <div className="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              {(['monthly', 'annual'] as Cycle[]).map((c) => (
                <button key={c} onClick={() => setCycle(c)} aria-pressed={cycle === c}
                  className={cx('rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition', cycle === c ? 'bg-surface-solid text-t1 shadow-sm' : 'text-t3 hover:text-t1')}>
                  {c === 'monthly' ? 'Oylik' : `Yillik · ${ANNUAL_FREE_MONTHS} oy bepul`}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((p) => {
              const isCurrent = ent.planId === p.id;
              const price = priceOf(p, cycle);
              const monthly = effectiveMonthly(p, cycle);
              const save = p.monthly === null ? 0 : annualSaving(p.monthly);
              return (
                <div key={p.id} className={cx('relative flex flex-col rounded-2xl border p-4 transition',
                  isCurrent ? 'border-accent bg-accent-soft/40 shadow-card' : p.popular ? 'border-accent/40 bg-surface-solid' : 'border-line bg-surface-solid')}>
                  {p.popular && <span className="absolute -top-2 left-4 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Eng ommabop</span>}
                  {isCurrent && <span className="absolute -top-2 right-3 rounded-md bg-pos px-2 py-0.5 text-[10px] font-bold text-white">Joriy</span>}
                  <h3 className="text-[14px] font-bold text-t1">{p.name}</h3>
                  <p className="mt-0.5 min-h-[32px] text-[11.5px] leading-snug text-t3">{p.tagline}</p>
                  <div className="mt-2">
                    {price === null || monthly === null ? (
                      <p className="text-[18px] font-extrabold text-t1">Kelishuv asosida</p>
                    ) : (
                      <>
                        <p className="num text-[20px] font-extrabold leading-none text-t1">
                          {monthly.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}
                          <span className="ml-1 text-[11.5px] font-medium text-t3">so‘m/oy</span>
                        </p>
                        <p className="mt-1 text-[11px] text-t3">
                          {cycle === 'annual' ? `${price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/yil · ${save > 0 ? `${save.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m tejash` : ''}` : `${VAT_RATE}% QQS bilan`}
                        </p>
                      </>
                    )}
                  </div>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {p.includes.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-t2"><Check className="mt-0.5 h-3 w-3 shrink-0 text-pos" />{f}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => startPlan(p.id)}
                    disabled={busy || isCurrent}
                    className={cx('mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-semibold transition',
                      isCurrent ? 'cursor-default bg-surface-2 text-t3' : p.popular ? 'bg-accent text-white hover:brightness-110' : 'border border-line bg-surface-solid text-t1 hover:border-accent/50',
                      busy && 'opacity-60')}
                  >
                    {p.contact ? 'Bog‘lanish' : isCurrent ? 'Joriy tarif' : <>Tanlash <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── To‘lov usuli ─────────────────────────────────── */}
        <section className="mt-8" aria-labelledby="pay-title">
          <h2 id="pay-title" className="text-[19px] font-bold text-t1">To‘lov usuli</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PAYMENT_METHODS.map((m) => {
              const Icon = METHOD_ICON[m.id];
              return (
                <button key={m.id} onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
                  className={cx('flex items-start gap-2.5 rounded-2xl border p-3 text-left transition', method === m.id ? 'border-accent bg-accent-soft/50' : 'border-line bg-surface-solid hover:border-line-strong')}>
                  <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-xl', method === m.id ? 'bg-accent text-white' : 'bg-surface-2 text-t2')}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-t1">{m.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-t3">{m.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 flex items-start gap-1.5 rounded-xl border border-warn/25 bg-warn/[.06] p-2.5 text-[11.5px] leading-relaxed text-t2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
            <span><b className="text-t1">TEST REJIMI.</b> Haqiqiy pul yechilmaydi va provayderga so‘rov ketmaydi. Haqiqiy kalitlar (Payme, Click, Uzum Pay, bank) faqat serverdagi muhit o‘zgaruvchilari orqali ulanadi.</span>
          </p>
        </section>

        {/* ── To‘lovlar tarixi ─────────────────────────────── */}
        <section className="mt-8" aria-labelledby="inv-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="inv-title" className="text-[19px] font-bold text-t1">To‘lovlar tarixi</h2>
            {ent.status !== 'trial' && (
              <button onClick={() => setShowCancel(true)} className="text-[12px] font-medium text-neg hover:underline">
                {account?.subscription.status === 'cancelled' ? 'Obunani qayta faollashtirish' : 'Obunani bekor qilish'}
              </button>
            )}
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface-solid">
            {!account?.invoices?.length ? (
              <div className="px-4 py-10 text-center">
                <Receipt className="mx-auto h-7 w-7 text-t3" />
                <p className="mt-2 text-[13px] font-medium text-t1">Hozircha to‘lov yo‘q</p>
                <p className="mt-1 text-[12px] text-t3">Sinov davri davomida to‘lov talab qilinmaydi. Tarif tanlaganingizda hisob-faktura shu yerda ko‘rinadi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[12.5px]">
                  <thead className="bg-surface-2 text-[11px] uppercase tracking-wide text-t3">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">№</th>
                      <th className="px-3 py-2 text-left font-semibold">Sana</th>
                      <th className="px-3 py-2 text-left font-semibold">Tarif</th>
                      <th className="px-3 py-2 text-right font-semibold">Summa</th>
                      <th className="px-3 py-2 text-left font-semibold">Usul</th>
                      <th className="px-3 py-2 text-left font-semibold">Holat</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {account.invoices.map((i) => (
                      <tr key={i.id} className="border-t border-line">
                        <td className="px-3 py-2 font-mono text-[11.5px] text-t2">{i.no}</td>
                        <td className="px-3 py-2 text-t2">{fmtDate(i.date)}</td>
                        <td className="px-3 py-2 text-t1">{planOf(i.planId).name} <span className="text-t3">· {i.cycle === 'annual' ? 'yillik' : 'oylik'}</span></td>
                        <td className="num px-3 py-2 text-right text-t1">{i.amount.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}</td>
                        <td className="px-3 py-2 text-t2">{PAYMENT_METHODS.find((m) => m.id === i.method)?.name}</td>
                        <td className="px-3 py-2">
                          <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                            i.status === 'paid' ? 'bg-pos/12 text-pos' : i.status === 'pending' ? 'bg-warn/12 text-warn' : 'bg-surface-2 text-t3')}>
                            {i.status === 'paid' ? <CircleCheck className="h-3 w-3" /> : i.status === 'pending' ? <CalendarClock className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}
                            {i.status === 'paid' ? 'To‘langan' : i.status === 'pending' ? 'Kutilmoqda' : 'Bekor'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <a href={`/api/billing/invoice/${i.id}`} download={`hisob-faktura-${i.no}.txt`} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline">
                            <Download className="h-3 w-3" /> Yuklab olish
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── Siyosat ──────────────────────────────────────── */}
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Karta talab qilinmaydi', body: `${TRIAL_DAYS} kun bepul sinov — to‘lov ma’lumoti so‘ralmaydi.` },
            { icon: CalendarClock, title: `${GRACE_DAYS} kun mehr-muruvvat`, body: 'Sinov tugagach hisob o‘qish rejimiga o‘tadi, ma’lumotlar saqlanadi.' },
            { icon: Sparkles, title: 'To‘lovdan keyin tiklanadi', body: `Ma’lumotlar ${DATA_RETENTION_DAYS} kun saqlanadi va to‘liq tiklanadi.` },
          ].map((x) => (
            <div key={x.title} className="rounded-2xl border border-line bg-surface-solid p-3.5">
              <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-t1"><x.icon className="h-3.5 w-3.5 text-accent" />{x.title}</span>
              <p className="mt-1 text-[11.5px] leading-relaxed text-t3">{x.body}</p>
            </div>
          ))}
        </section>

        {note && <p className="mt-4 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-[12.5px] text-t1">{note}</p>}

        <p className="mt-6 text-center text-[11.5px] text-t3">
          Savollar bormi? <Link href="/contact" className="text-accent hover:underline">Aloqa</Link> · <Link href="/terms" className="text-accent hover:underline">Oferta</Link> · <Link href="/privacy" className="text-accent hover:underline">Maxfiylik</Link>
        </p>
      </main>
      <SiteFooter />

      {showCancel && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setShowCancel(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-line bg-surface-solid p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[16px] font-semibold text-t1">Obunani bekor qilish</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-t2">
              Joriy davr oxirigacha ({ent.periodEnd ? fmtDate(ent.periodEnd) : '—'}) kirish saqlanadi. Keyin hisob o‘qish rejimiga o‘tadi, ma’lumotlar {DATA_RETENTION_DAYS} kun saqlanadi.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowCancel(false)} className="h-9 flex-1 rounded-xl border border-line text-[12.5px] font-semibold text-t1">Bekor qilish</button>
              <button
                onClick={() => { setBusy(true); if (account?.subscription.status === 'cancelled') void useBilling.getState().syncServer(); cancel(); setShowCancel(false); setBusy(false); setNote(account?.subscription.status === 'cancelled' ? 'Obuna qayta faollashtirildi.' : 'Obuna bekor qilindi.'); }}
                className="h-9 flex-1 rounded-xl bg-neg text-[12.5px] font-semibold text-white"
              >
                {account?.subscription.status === 'cancelled' ? 'Faollashtirish' : 'Ha, bekor qilish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Usage({ icon: Icon, label, used, limit }: { icon: typeof Users; label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-1.5 text-t2"><Icon className="h-3.5 w-3.5" /> {label}</span>
        <span className="num font-semibold text-t1">{used}{limit === null ? ' / cheksiz' : ` / ${limit}`}</span>
      </div>
      {limit !== null && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div className={cx('h-full rounded-full', pct > 90 ? 'bg-neg' : pct > 70 ? 'bg-warn' : 'bg-pos')} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
