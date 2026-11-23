'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { ArrowRight, Check, CreditCard, Building2, ShieldCheck, Loader2, AlertCircle, Lock, Sparkles } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { useBilling, useEntitlements } from '@/lib/billing/store';
import { PAYMENT_METHODS, type BillingInvoice, type PaymentMethod } from '@/lib/billing';
import { PLANS, VAT_RATE, TRIAL_DAYS, planOf, priceOf, annualPrice, annualSaving, splitVat, type Cycle } from '@/lib/config/pricing';
import { fmtDate } from '@/lib/core/dates';
import { cx } from '@/components/ui';

export default function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-16"><div className="skeleton h-96 rounded-3xl" /></div>}>
          <Checkout />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

function Checkout() {
  const router = useRouter();
  const params = useSearchParams();
  const account = useBilling((s) => s.account);
  const ent = useEntitlements();
  const startCheckout = useBilling((s) => s.startCheckout);
  const pay = useBilling((s) => s.pay);
  const choosePlan = useBilling((s) => s.choosePlan);

  const initial = (params.get('plan') as (typeof PLANS)[number]['id']) || (ent.planId === 'start' ? 'biznes' : ent.planId);
  const [planId, setPlanId] = useState(initial);
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [method, setMethod] = useState<PaymentMethod>('payme');
  const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
  const [stage, setStage] = useState<'plan' | 'pay' | 'done'>('plan');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });

  const plan = useMemo(() => planOf(planId), [planId]);
  const amount = priceOf(plan, cycle);
  const split = amount ? splitVat(amount) : null;
  const trial = ent.status === 'trial' && !account?.invoices.some((i) => i.status === 'paid');

  const create = () => {
    if (plan.contact) { router.push('/contact?plan=korporativ'); return; }
    setError(null);
    const inv = startCheckout(planId, cycle, method);
    setInvoice(inv);
    setStage('pay');
  };

  const confirm = () => {
    if (!invoice) return;
    setError(null);
    if (method !== 'bank') {
      if (card.number.replace(/\D/g, '').length < 16) return setError('Karta raqami 16 xonali bo‘lishi kerak (test: 8600 0000 0000 0000).');
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return setError('Amal qilish muddati OO/YY ko‘rinishida.');
      if (card.cvc.replace(/\D/g, '').length < 3) return setError('CVC 3 xonali.');
    }
    setBusy(true);
    setTimeout(() => {
      const r = pay(invoice.id);
      setBusy(false);
      if (!r.ok) { setError(r.error || 'To‘lovda xatolik.'); return; }
      setStage('done');
    }, 900);
  };

  if (stage === 'done' && invoice) {
    return (
      <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-pos/30 bg-pos/5 p-6 text-center sm:p-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pos/15 text-pos"><Check className="h-7 w-7" /></div>
          <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.02em] text-t1">To‘lov muvaffaqiyatli (TEST)</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-t2">
            {plan.name} tarifi faollashtirildi. Haqiqiy pul yechilmadi — bu <b className="text-warn">TEST REJIMI</b>. Hisob-faktura: <span className="font-mono text-t1">{invoice.no}</span>.
          </p>
          <dl className="mt-5 grid gap-2 rounded-2xl border border-line bg-surface-solid p-4 text-left text-[12.5px]">
            {[['Tarif', `${plan.name} · ${cycle === 'annual' ? 'yillik' : 'oylik'}`], ['Summa (QQS bilan)', `${invoice.amount.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`], ['QQS (12%)', `${invoice.vat.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`], ['To‘lov usuli', PAYMENT_METHODS.find((m) => m.id === invoice.method)!.name], ['Tranzaksiya', invoice.ref || '—'], ['Keyingi to‘lov', account?.subscription.periodEnd || '—']].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-t3">{k}</dt><dd className="num text-right font-semibold text-t1">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/app" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-white hover:brightness-110">Panelga o‘tish <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/account" className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface-solid px-5 text-[13.5px] font-semibold text-t1 hover:border-line-strong">Hisob va to‘lovlar</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="mb-4 flex items-center gap-2 text-[11.5px] text-t3" aria-label="Bosqichlar">
        {['Tarif', 'To‘lov', 'Tasdiqlash'].map((s, i) => {
          const idx = stage === 'plan' ? 0 : stage === 'pay' ? 1 : 2;
          return <span key={s} className={cx('flex items-center gap-1.5', i <= idx && 'text-t1')}>{i > 0 && <span className="text-t3">›</span>}<span className={cx('grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold', i <= idx ? 'bg-accent text-white' : 'bg-surface-3 text-t3')}>{i + 1}</span>{s}</span>;
        })}
        <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-warn/12 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warn"><Lock className="h-3 w-3" /> Test rejimi</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {stage === 'plan' && (
            <>
              <section className="rounded-3xl border border-line bg-surface-solid p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h1 className="text-[18px] font-semibold text-t1">Tarifni tanlang</h1>
                  <div className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5">
                    {(['monthly', 'annual'] as Cycle[]).map((c) => (
                      <button key={c} onClick={() => setCycle(c)} className={cx('rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition', cycle === c ? 'bg-surface-solid text-t1 shadow-sm' : 'text-t3 hover:text-t1')}>
                        {c === 'monthly' ? 'Oylik' : 'Yillik · 2 oy bepul'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {PLANS.map((p) => {
                    const price = priceOf(p, cycle);
                    const active = planId === p.id;
                    return (
                      <button key={p.id} onClick={() => setPlanId(p.id)} className={cx('rounded-2xl border p-3.5 text-left transition', active ? 'border-accent bg-accent-soft/40 ring-2 ring-accent/25' : 'border-line bg-surface-2 hover:border-line-strong')} aria-pressed={active}>
                        <span className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-accent">{p.name}</span>{p.popular && <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">ommabop</span>}{active && <Check className="h-4 w-4 text-accent" />}</span>
                        <span className="mt-1 block min-h-[30px] text-[11.5px] leading-snug text-t3">{p.tagline}</span>
                        <span className="num mt-1.5 block text-[17px] font-extrabold text-t1">{price === null ? 'Kelishuv' : `${price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`}<span className="text-[10.5px] font-medium text-t3">/{cycle === 'annual' ? 'yil' : 'oy'}</span></span>
                        {cycle === 'annual' && p.monthly && <span className="mt-0.5 block text-[10.5px] font-semibold text-pos">{annualSaving(p.monthly).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m tejash</span>}
                        <span className="mt-1 block text-[10.5px] text-t3">{p.limit.users === null ? 'Cheksiz foydalanuvchi' : `${p.limit.users} foydalanuvchi`} · AI: {p.limit.aiQuestions === null ? 'cheksiz' : `${p.limit.aiQuestions}/oy`}</span>
                      </button>
                    );
                  })}
                </div>
                {trial && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-2.5 text-[11.5px] leading-relaxed text-t2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    Sizda {ent.trialDaysLeft} kunlik bepul sinov davom etmoqda. Hoziroq to‘lasangiz tarif darhol faollashadi va sinov muddati hisobga olinmaydi.
                  </p>
                )}
              </section>

              <section className="rounded-3xl border border-line bg-surface-solid p-5">
                <h2 className="text-[15px] font-semibold text-t1">To‘lov usuli</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m.id} onClick={() => setMethod(m.id)} aria-pressed={method === m.id} className={cx('flex items-start gap-2.5 rounded-2xl border p-3 text-left transition', method === m.id ? 'border-accent bg-accent-soft/30 ring-2 ring-accent/20' : 'border-line bg-surface-2 hover:border-line-strong')}>
                      <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', method === m.id ? 'bg-accent text-white' : 'bg-surface-3 text-t2')}>{m.id === 'bank' ? <Building2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}</span>
                      <span className="min-w-0"><span className="block text-[12.5px] font-semibold text-t1">{m.name}</span><span className="block text-[10.5px] leading-snug text-t3">{m.note}</span></span>
                    </button>
                  ))}
                </div>
                {method !== 'bank' && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_90px_80px]">
                    <label className="block"><span className="mb-1 block text-[11px] font-semibold text-t1">Karta raqami</span>
                      <input className="field num" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, '').slice(0, 19) })} placeholder="8600 0000 0000 0000" inputMode="numeric" /></label>
                    <label className="block"><span className="mb-1 block text-[11px] font-semibold text-t1">Muddat</span>
                      <input className="field num" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value.replace(/[^\d/]/g, '').slice(0, 5) })} placeholder="12/28" inputMode="numeric" /></label>
                    <label className="block"><span className="mb-1 block text-[11px] font-semibold text-t1">CVC</span>
                      <input className="field num" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="123" inputMode="numeric" /></label>
                  </div>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-warn">Test rejimi: karta ma’lumotlari saqlanmaydi va haqiqiy to‘lov bajarilmaydi. Istalgan 16 xonali raqam qabul qilinadi.</p>
              </section>
              {error && <p className="flex items-center gap-2 rounded-xl border border-neg/30 bg-neg/8 p-2.5 text-[12px] text-neg"><AlertCircle className="h-4 w-4" />{error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={create} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-white transition hover:brightness-110">
                  Hisob-faktura yaratish <ArrowRight className="h-4 w-4" />
                </button>
                <Link href="/app" className="inline-flex h-11 items-center rounded-xl px-3 text-[12.5px] font-medium text-t3 hover:text-t1">Sinovda davom etish</Link>
              </div>
            </>
          )}

          {stage === 'pay' && invoice && (
            <section className="rounded-3xl border border-line bg-surface-solid p-5">
              <h1 className="text-[18px] font-semibold text-t1">To‘lovni tasdiqlang</h1>
              <p className="mt-1 text-[12.5px] text-t2">Hisob-faktura <span className="font-mono">{invoice.no}</span> · {fmtDate(invoice.date)} · to‘lov muddati {fmtDate(invoice.dueDate)}</p>
              <dl className="mt-4 grid gap-2 rounded-2xl border border-line bg-surface-2 p-4 text-[12.5px]">
                {[['Tarif', plan.name], ['Davr', cycle === 'annual' ? '12 oy (10 oy narxi)' : '1 oy'], ['Summa (QQS bilan)', `${invoice.amount.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`], ['QQS 12%', `${invoice.vat.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`], ['QQSsiz', `${invoice.net.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`], ['Usul', PAYMENT_METHODS.find((m) => m.id === method)!.name]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3"><dt className="text-t3">{k}</dt><dd className="num text-right font-semibold text-t1">{v}</dd></div>
                ))}
              </dl>
              {method === 'bank' && (
                <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3 text-[11.5px] leading-relaxed text-t2">
                  <b className="text-t1">Bank o‘tkazmasi uchun rekvizitlar:</b><br />
                  Qabul qiluvchi: BALANS AI MChJ · STIR 309 999 888 · MFO 00873 · X/r 2020 8000 1234 5678 9001<br />
                  To‘lov maqsadi: {invoice.no} — {plan.name} tarifi. To‘lov tushgach tarif avtomatik faollashadi (test rejimida darhol).
                </div>
              )}
              {error && <p className="mt-3 flex items-center gap-2 rounded-xl border border-neg/30 bg-neg/8 p-2.5 text-[12px] text-neg"><AlertCircle className="h-4 w-4" />{error}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={confirm} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Bajarilmoqda…</> : <>To‘lash (test) · {invoice.amount.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m</>}
                </button>
                <button onClick={() => { setStage('plan'); setError(null); }} className="inline-flex h-11 items-center rounded-xl border border-line bg-surface-2 px-4 text-[13px] font-semibold text-t1 hover:border-line-strong">Orqaga</button>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-3xl border border-line bg-surface-solid p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-t3">Buyurtma</p>
            <p className="mt-1.5 text-[15px] font-semibold text-t1">{plan.name}</p>
            <p className="text-[11.5px] text-t3">{cycle === 'annual' ? 'Yillik to‘lov' : 'Oylik to‘lov'} · {VAT_RATE}% QQS bilan</p>
            <div className="mt-3 border-t border-line pt-3">
              {amount !== null ? (
                <>
                  <div className="flex items-baseline justify-between"><span className="text-[12px] text-t2">Jami</span><span className="num text-[20px] font-extrabold text-t1">{amount.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}</span></div>
                  <p className="text-right text-[10.5px] text-t3">so‘m · QQS {split!.vat.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m</p>
                  {cycle === 'annual' && <p className="mt-1 rounded-lg bg-pos/10 px-2 py-1 text-center text-[11px] font-semibold text-pos">{annualSaving(plan.monthly!).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m tejadingiz (2 oy bepul)</p>}
                </>
              ) : <p className="text-[13px] font-semibold text-t1">Kelishuv asosida — menejer bog‘lanadi</p>}
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-surface-2/60 p-4 text-[11.5px] leading-relaxed text-t3">
            <p className="flex items-center gap-1.5 font-semibold text-t1"><ShieldCheck className="h-3.5 w-3.5 text-pos" /> Kafolat</p>
            <ul className="mt-2 space-y-1.5">
              <li>• {TRIAL_DAYS} kun bepul — karta talab qilinmaydi</li>
              <li>• Istalgan vaqtda bekor qilish</li>
              <li>• Ma’lumotlar 90 kun saqlanadi</li>
              <li>• Eksport (Excel/CSV/PDF) doim ochiq</li>
              <li>• Hisob-faktura QQS bilan rasmiylashtiriladi</li>
            </ul>
          </div>
          {ent.status === 'active' && (
            <div className="rounded-3xl border border-line bg-surface-solid p-4">
              <p className="text-[11.5px] font-semibold text-t1">Tarifni o‘zgartirish</p>
              <p className="mt-1 text-[11px] text-t3">Joriy: {ent.plan.name} · {ent.periodEnd} gacha</p>
              <button onClick={() => { const r = choosePlan('korporativ', 'monthly'); setError(null); router.push(r.ok ? '/contact?plan=korporativ' : '/contact'); }} className="mt-2 w-full rounded-lg border border-line bg-surface-2 py-1.5 text-[11.5px] font-semibold text-t1 hover:border-line-strong">Korporativ — bog‘lanish</button>
            </div>
          )}
          <p className="px-1 text-[10.5px] leading-relaxed text-t3">To‘lovlar hozircha test rejimida bajariladi. Haqiqiy Payme/Click/Uzum kalitlari .env orqali ulanadi (server tomonida).</p>
        </aside>
      </div>
    </div>
  );
}
