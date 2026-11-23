'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Check, Minus, Sparkles, Users, Building2, ChevronDown, ShieldCheck, CreditCard, Landmark, Wallet } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { PLANS, COMPARISON, FAQ as FAQS, VAT_RATE, TRIAL_DAYS, EXTRA_USER_PRICE, annualSaving, effectiveMonthly, priceOf, ANNUAL_FREE_MONTHS, splitVat, type Cycle } from '@/lib/config/pricing';
import { cx } from '@/components/ui';

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const groups = [...new Set(COMPARISON.map((r) => r.group))];
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden px-4 pb-8 pt-12 sm:px-6">
          <div className="hero-glow" /><div className="grid-lines" />
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Narxlar</p>
            <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-t1 sm:text-[42px]">Shaffof narxlar, yashirin to‘lovlarsiz</h1>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-t2">
              Birinchi oy bepul ({TRIAL_DAYS} kun). Narxlar {VAT_RATE}% QQS bilan. Yillik to‘lovda {ANNUAL_FREE_MONTHS} oy bepul. Qo‘shimcha foydalanuvchi — {EXTRA_USER_PRICE.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/oy.
            </p>
            <div className="mt-5 inline-flex items-center gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              {(['monthly', 'annual'] as Cycle[]).map((c) => (
                <button key={c} onClick={() => setCycle(c)} aria-pressed={cycle === c} className={cx('rounded-xl px-4 py-2 text-[12.5px] font-semibold transition', cycle === c ? 'bg-surface-solid text-t1 shadow-sm' : 'text-t3 hover:text-t1')}>
                  {c === 'monthly' ? 'Oylik to‘lov' : `Yillik · ${ANNUAL_FREE_MONTHS} oy bepul`}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6">
          <div className="mx-auto grid max-w-6xl gap-3 lg:grid-cols-4">
            {PLANS.map((p) => {
              const price = priceOf(p, cycle);
              const eff = effectiveMonthly(p, cycle);
              const split = price ? splitVat(price) : null;
              return (
                <div key={p.id} className={cx('relative flex flex-col rounded-3xl border p-5', p.popular ? 'border-accent bg-accent-soft/30 shadow-pop lg:-mt-2 lg:mb-2' : 'border-line bg-surface-solid')}>
                  {p.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Eng ommabop</span>}
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent">{p.name}</p>
                    {p.contact && <Building2 className="h-4 w-4 text-t3" />}
                  </div>
                  <p className="mt-1 min-h-[32px] text-[12px] leading-snug text-t3">{p.tagline}</p>
                  <div className="mt-3">
                    {price === null ? (
                      <p className="text-[21px] font-extrabold text-t1">Kelishuv asosida</p>
                    ) : (
                      <>
                        <p className="num text-[26px] font-extrabold leading-none tracking-[-0.02em] text-t1">{price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}</p>
                        <p className="mt-1 text-[11.5px] text-t3">so‘m / {cycle === 'annual' ? 'yil' : 'oy'} · QQS {split!.vat.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m ichida</p>
                        {cycle === 'annual' ? (
                          <p className="mt-1 rounded-lg bg-pos/10 px-2 py-1 text-[11px] font-semibold text-pos">≈ {eff!.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/oy · {annualSaving(p.monthly!).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m tejaladi</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-t3">yillikda {annualSaving(p.monthly!).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m tejash</p>
                        )}
                      </>
                    )}
                  </div>
                  <ul className="mt-4 flex-1 space-y-1.5">
                    {p.includes.map((x) => <li key={x} className="flex items-start gap-1.5 text-[12px] leading-snug text-t2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pos" />{x}</li>)}
                  </ul>
                  <Link href={p.contact ? '/contact?plan=korporativ' : `/checkout?plan=${p.id}`} className={cx('mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition', p.popular ? 'bg-accent text-white hover:brightness-110' : 'border border-line bg-surface-2 text-t1 hover:border-line-strong')}>
                    {p.contact ? 'Bog‘lanish' : <>Tarifni tanlash <ArrowRight className="h-3.5 w-3.5" /></>}
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-t3">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" />Karta talab qilinmaydi</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" />30 kun bepul sinov</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" />Istalgan vaqtda bekor qilish</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" />To‘lov test rejimida</span>
          </div>
        </section>

        <section id="taqqoslash" className="scroll-mt-20 border-t border-line bg-surface-2/30 px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-[24px] font-bold tracking-[-0.02em] text-t1 sm:text-[30px]">Tariflarni taqqoslash</h2>
            <p className="mt-1 text-[13px] text-t2">Barcha tariflarda: demo ma’lumot, eksport, avtomatik yangilanish, xavfsiz saqlash.</p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-surface-solid">
              <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                <thead className="sticky top-0 z-10 bg-surface-2">
                  <tr>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-t3">Imkoniyat</th>
                    {PLANS.map((p) => <th key={p.id} className={cx('px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wide', p.popular ? 'text-accent' : 'text-t2')}>{p.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <>
                      <tr key={g}><td colSpan={5} className="bg-surface-2/70 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-t3">{g}</td></tr>
                      {COMPARISON.filter((r) => r.group === g).map((r) => (
                        <tr key={r.label} className="border-t border-line">
                          <td className="px-3 py-2 text-t2">{r.label}</td>
                          {PLANS.map((p) => {
                            const v = r.value(p);
                            return <td key={p.id} className={cx('px-3 py-2 text-center', p.popular && 'bg-accent-soft/20')}>
                              {v === true ? <Check className="mx-auto h-4 w-4 text-pos" /> : v === false ? <Minus className="mx-auto h-4 w-4 text-t3/50" /> : <span className="font-semibold text-t1">{v}</span>}
                            </td>;
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-t3">* ISHLAB CHIQARISH va KORPORATIV tariflarida AI CFO cheksiz — adolatli foydalanish siyosati amal qiladi (suiiste’mol aniqlansa, menejer bog‘lanadi).</p>
          </div>
        </section>

        <section className="border-t border-line px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-[24px] font-bold tracking-[-0.02em] text-t1 sm:text-[30px]">To‘lov usullari va kafolatlar</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-[13px] leading-relaxed text-t2">Barcha narxlar QQS ({VAT_RATE}%) bilan ko‘rsatilgan. Yuridik shaxslarga hisob-faktura va yopuvchi hujjatlar beriladi.</p>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CreditCard, name: 'Payme', note: 'Karta orqali onlayn to‘lov' },
                { icon: Wallet, name: 'Click', note: 'Click Up yoki bank kartasi' },
                { icon: Sparkles, name: 'Uzum Pay', note: 'Uzum hisobidan to‘lov' },
                { icon: Landmark, name: 'Bank o‘tkazmasi', note: 'Hisob-faktura asosida' },
              ].map((m) => (
                <div key={m.name} className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface-solid/60 p-3.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><m.icon className="h-4 w-4" /></span>
                  <span><span className="block text-[13px] font-semibold text-t1">{m.name}</span><span className="mt-0.5 block text-[11.5px] leading-snug text-t3">{m.note}</span></span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Karta talab qilinmaydi', note: 'Sinov davri uchun to‘lov ma’lumoti so‘ralmaydi.' },
                { icon: Check, title: `Yillik to‘lovda ${ANNUAL_FREE_MONTHS} oy bepul`, note: '12 oy uchun faqat 10 oy narxini to‘laysiz.' },
                { icon: Users, title: 'Qo‘shimcha foydalanuvchi', note: `${EXTRA_USER_PRICE.toLocaleString('ru-RU')} so‘m/oy.` },
              ].map((g) => (
                <div key={g.title} className="rounded-2xl border border-line bg-surface-2/50 p-3.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-t1"><g.icon className="h-3.5 w-3.5 text-pos" />{g.title}</span>
                  <p className="mt-1 text-[11.5px] leading-snug text-t3">{g.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-t3"><ShieldCheck className="h-3.5 w-3.5" /> To‘lovlar test rejimida ishlaydi — haqiqiy pul yechilmaydi. API kalitlari faqat serverda, .env orqali ulanadi.</p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-[24px] font-bold tracking-[-0.02em] text-t1 sm:text-[30px]">Tez-tez beriladigan savollar</h2>
            <div className="mt-4 space-y-2"><FaqList /></div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 rounded-3xl border border-line bg-gradient-to-br from-accent/12 to-accent-2/8 p-8 text-center">
            <Sparkles className="h-6 w-6 text-accent" />
            <h2 className="text-[22px] font-bold text-t1">Qaysi tarif mos kelishini bilmayapsizmi?</h2>
            <p className="max-w-md text-[13px] leading-relaxed text-t2">30 kun bepul sinovda barcha modullarni sinab ko‘ring — keyin qaror qiling. Yoki mutaxassisimiz bilan 15 daqiqalik suhbat o‘tkazing.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/signup" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-white hover:brightness-110">{TRIAL_DAYS} kun bepul boshlash</Link>
              <Link href="/contact" className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-surface-solid px-5 text-[13.5px] font-semibold text-t1 hover:border-line-strong"><Users className="h-4 w-4" /> Mutaxassis bilan gaplashish</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function FaqList() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      {FAQS.map((f, i) => (
        <div key={f.q} className="overflow-hidden rounded-2xl border border-line bg-surface-solid">
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open === i}>
            <span className="flex-1 text-[13.5px] font-semibold text-t1">{f.q}</span>
            <ChevronDown className={cx('h-4 w-4 shrink-0 text-t3 transition', open === i && 'rotate-180')} />
          </button>
          {open === i && <p className="border-t border-line px-4 py-3 text-[12.5px] leading-relaxed text-t2">{f.a}</p>}
        </div>
      ))}
    </>
  );
}
