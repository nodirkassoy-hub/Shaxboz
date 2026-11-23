'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Play, Check, ShieldCheck, Sparkles, Zap, Boxes, Factory, Users, Receipt, Wallet, TrendingUp, ChevronDown, Star, Quote } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import type { LandingStats } from '@/lib/marketing/stats';
import { PLANS, planOf, priceOf, annualSaving, COMPARISON, FAQ, TRIAL_DAYS, VAT_RATE } from '@/lib/config/pricing';
import { DemoSwitch } from '@/components/marketing/DemoSwitch';
import { LandingChart, LandingSpark } from '@/components/marketing/LandingChart';
import { cx } from '@/components/ui';

const MODULES = [
  { icon: TrendingUp, title: 'Boshqaruv paneli', body: 'Daromad, xarajat, sof foyda, pul qoldig‘i, debitor/kreditor, ombor qiymati va KPI — bir ekranda.' },
  { icon: Receipt, title: 'Buxgalteriya', body: 'Hisoblar rejasi, jurnal, balans, foyda va zarar. Har bir provodka balanslangan.' },
  { icon: Wallet, title: 'Moliya', body: 'Pul oqimi, kassa va bank, to‘lov kalendari, byudjet va reja-fakt.' },
  { icon: Boxes, title: 'Sotuv va xarid', body: 'Mijozlar, buyurtmalar, hisob-fakturalar, voronka, qarzdorlar; ta’minotchilar va narx tarixi.' },
  { icon: Factory, title: 'Ombor va ishlab chiqarish', body: 'Qoldiqlar, kirim/chiqim, inventarizatsiya, retseptura, tannarx, brak va smena.' },
  { icon: Users, title: 'HR va soliqlar', body: 'Xodimlar, ish haqi, avans, ta’til, davomat; QQS, foyda, JShDS, ijtimoiy — muddatlar bilan.' },
];

const PROMISES = [
  { q: 'Buxgalteriyadan savdogacha bitta tizimda', a: 'Alohida Excel fayllar va jadvallar o‘rniga — yagona, izchil ma’lumot. Sotuv jami = dashboard daromadi, ombor qoldig‘i = kirim − chiqim, aktiv = majburiyat + kapital.' },
  { q: 'AI CFO raqamlarni tushuntiradi', a: '“Foyda nima uchun tushdi?” — savoliga sabab, ta’sir summasi va amaliy tavsiya bilan javob beradi. Har bir xulosa FAKT, TAXMINIY yoki TAVSIYA deb belgilanadi.' },
  { q: 'O‘zbek biznes amaliyoti uchun', a: 'So‘m (UZS), kun.oy.yil sanalari, o‘zbekcha hujjat va hisobot nomlari, QQS 12%, JShDS, ijtimoiy soliq va to‘lov muddatlari hisobga olingan.' },
];

const TRUST = [
  { icon: ShieldCheck, title: 'Ma’lumot izolyatsiyasi', body: 'Har bir kompaniya ma’lumoti alohida saqlanadi va faqat o‘z foydalanuvchilariga ko‘rinadi.' },
  { icon: Zap, title: 'Rollar bo‘yicha kirish', body: 'Direktor, buxgalter, omborchi, sotuvchi, HR — har biri faqat o‘z bo‘limini ko‘radi.' },
  { icon: Check, title: 'Eksport har doim ochiq', body: 'Barcha hisobotlar Excel, CSV va PDF ko‘rinishida — ma’lumot sizga tegishli.' },
];

const TESTIMONIALS = [
  { name: 'Sardor Alimov', role: 'Direktor, elektr uskunalari zavodi', text: 'Avval tannarxni oy oxirida Excelda hisoblardik. Endi har bir ish buyurtmasi bo‘yicha fakt tannarx darhol ko‘rinadi. AI CFO “nega marja tushdi” degan savolga aniq javob berdi.', metric: 'Tannarx hisobi: 3 kun → 20 daqiqa' },
  { name: 'Nilufar Rashidova', role: 'Bosh buxgalter, savdo kompaniyasi', text: 'QQS va ijtimoiy soliq muddatlari endi kalendarda. Balans va aylanma-saldo har doim teng — yopish paytida farqlarni qidirmayman.', metric: 'Oy yopish: 4 kun → 1 kun' },
  { name: 'Alisher Qodirov', role: 'Ombor mudiri, uch filial', text: 'Uch ombor qoldig‘i bir joyda. Minimal qoldiq ogohlantirishi kelganda xarid so‘rovini bir tugma bilan yuboraman.', metric: 'Tugagan tovar: −42%' },
];

export function LandingPage({ stats }: { stats: LandingStats }) {
  const s = stats;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero stats={s} />
        <TrustStrip stats={s} />
        <Problem />
        <Modules />
        <Flow />
        <DashboardPreview stats={s} />
        <Pricing />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero({ stats }: { stats: LandingStats }) {
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
      <div className="hero-glow" /><div className="grid-lines" />
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-t2">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> O‘zbekiston biznesi uchun AI platforma
          </p>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] text-t1 sm:text-[46px] lg:text-[56px]">
            Butun biznesni <span className="gradient-text">bitta tizimda</span> boshqaring
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14.5px] leading-relaxed text-t2 sm:text-[16.5px]">
            Buxgalteriya, moliya, sotuv, xarid, ombor, ishlab chiqarish, HR, soliqlar va <b className="text-t1">AI CFO</b> — bitta
            tizimda. Ma’lumot kiriting, AI tahlil qiladi, siz qaror qabul qilasiz.
          </p>
          <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-t3">DATA → AI TAHLIL → QAROR → HARAKAT</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Link href="/signup" className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-accent to-[color-mix(in_oklab,var(--accent),black_12%)] px-6 text-[14.5px] font-semibold text-white shadow-[0_16px_40px_-14px_var(--accent)] transition hover:brightness-110 sm:w-auto">
              {TRIAL_DAYS} kun bepul sinab ko‘ring <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href="/app" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 px-5 text-[14px] font-semibold text-t1 transition hover:border-line-strong sm:w-auto">
              <Play className="h-4 w-4 text-accent" /> Demo panelni ochish
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-t3">Bank kartasi talab qilinmaydi · {TRIAL_DAYS} kun barcha modullar · Istalgan vaqtda bekor qilish</p>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          <HeroDashboard stats={stats} />
        </div>
        <div className="mt-6 flex justify-center"><DemoSwitch /></div>
      </div>
    </section>
  );
}

function HeroDashboard({ stats }: { stats: LandingStats }) {
  const kpis = [
    { label: 'Tushum (oy)', value: stats.revenue, tone: 'pos' },
    { label: 'Sof foyda', value: stats.net, tone: 'pos' },
    { label: 'Pul qoldig‘i', value: stats.cash, tone: 'neutral' },
    { label: 'Debitorlik', value: stats.ar, tone: 'warn' },
    { label: 'Kreditorlik', value: stats.ap, tone: 'warn' },
    { label: 'Ombor qiymati', value: stats.stock, tone: 'neutral' },
  ] as const;
  return (
    <div className="ring-glow overflow-hidden rounded-[24px] border border-line bg-surface-solid">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 sm:px-4">
        <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-neg/60" /><i className="h-2.5 w-2.5 rounded-full bg-warn/60" /><i className="h-2.5 w-2.5 rounded-full bg-pos/60" /></span>
        <span className="ml-2 truncate text-[11.5px] font-medium text-t3">BALANS AI · Zavod demo · Boshqaruv paneli</span>
        <span className="ml-auto hidden items-center gap-1 rounded-md bg-pos/10 px-1.5 py-0.5 text-[10px] font-semibold text-pos sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-pos" /> LIVE DEMO</span>
      </div>
      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-line bg-surface-2 px-2.5 py-2">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-t3">{k.label}</p>
                <p className={cx('num mt-0.5 truncate text-[13px] font-semibold sm:text-[14.5px]', k.tone === 'pos' ? 'text-pos' : k.tone === 'warn' ? 'text-warn' : 'text-t1')}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-[11.5px] font-semibold text-t1">Tushum va sof foyda</span><span className="text-[10.5px] text-t3">9 oy · so‘m</span></div>
            <LandingChart series={stats.series} height={132} />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-gradient-to-b from-accent-soft to-transparent p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-accent"><Sparkles className="h-3.5 w-3.5" /> AI CFO xulosalari</p>
          <div className="mt-2 space-y-2">
            {stats.insights.slice(0, 3).map((i) => (
              <div key={i.title} className="rounded-lg border border-line bg-surface-solid/70 p-2">
                <p className="flex items-start gap-1.5 text-[11.5px] font-semibold leading-snug text-t1">
                  <span className={cx('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', i.tone === 'pos' ? 'bg-pos' : i.tone === 'warn' ? 'bg-warn' : i.tone === 'neg' ? 'bg-neg' : 'bg-sky-500')} />
                  {i.title}
                </p>
                <p className="mt-0.5 line-clamp-2 pl-3 text-[10.5px] leading-snug text-t3">{i.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustStrip({ stats }: { stats: LandingStats }) {
  const items = [
    `${stats.counts.companies} kompaniya`, `${stats.counts.entries.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} provodka`,
    `${stats.counts.invoices} hisob-faktura`, `${stats.counts.products} mahsulot`, `${stats.counts.employees} xodim`,
    'Balans har doim teng', 'QQS 12% hisobga olingan', '9 oylik demo tarix',
  ];
  return (
    <section aria-label="Demo ko‘rsatkichlari" className="border-y border-line bg-surface-2/40 py-3">
      <div className="no-scrollbar overflow-x-auto">
        <div className="marquee">
          {[...items, ...items].map((t, i) => <span key={i} className="whitespace-nowrap text-[12px] font-medium text-t3"><span className="mr-2 text-accent">◆</span>{t}</span>)}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="px-4 py-16 sm:px-6" id="nima-uchun">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Nima uchun</p>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-t1 sm:text-[34px]">Excel, 1C va Telegram orasida yo‘qolgan raqamlar</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-t2">Biznes egasi oddiy savolga bir kunda javob topa olmaydi: “Pul qayerda va nima uchun foyda tushdi?”.</p>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {PROMISES.map((p, i) => (
            <div key={p.q} className="rounded-3xl border border-line bg-surface-solid p-5">
              <span className="num text-[11px] font-bold text-accent">0{i + 1}</span>
              <h3 className="mt-2 text-[15px] font-semibold leading-snug text-t1">{p.q}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-t2">{p.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {TRUST.map((t) => { const I = t.icon; return (
            <div key={t.title} className="flex gap-3 rounded-2xl border border-line bg-surface-2/60 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pos/10 text-pos"><I className="h-4.5 w-4.5" /></span>
              <div><p className="text-[13px] font-semibold text-t1">{t.title}</p><p className="mt-0.5 text-[12px] leading-relaxed text-t3">{t.body}</p></div>
            </div>
          ); })}
        </div>
      </div>
    </section>
  );
}

function Modules() {
  return (
    <section id="imkoniyatlar" className="scroll-mt-20 border-t border-line bg-surface-2/30 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Imkoniyatlar</p>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-t1 sm:text-[34px]">Har bo‘lim o‘z ishini to‘liq bajaradi</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-t2">Bo‘sh sahifa yoki “tez kunda” yo‘q — har bir modul real demo ma’lumot bilan ishlaydi.</p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => { const I = m.icon; return (
            <div key={m.title} className="group rounded-2xl border border-line bg-surface-solid p-5 transition hover:border-line-strong hover:shadow-pop">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><I className="h-5 w-5" /></span>
              <h3 className="mt-3 text-[14.5px] font-semibold text-t1">{m.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-t2">{m.body}</p>
            </div>
          ); })}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[12px] text-t3">
          {['Tasdiqlashlar', 'Loyihalar', 'Asosiy vositalar', 'Hujjatlar', 'Analitika', 'Hisobotlar', 'Bildirishnomalar', 'Sozlamalar'].map((x) => (
            <span key={x} className="rounded-full border border-line bg-surface-solid px-3 py-1">{x}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    { n: '01', t: 'Ma’lumot', b: 'Sotuv, xarid, kassa, ombor, ish haqi — barcha operatsiyalar bitta jurnalda qayd etiladi.' },
    { n: '02', t: 'AI tahlil', b: 'AI CFO raqamlarni tekshiradi: marja, qarzdorlik, pul oqimi, tannarx, soliq muddatlari.' },
    { n: '03', t: 'Qaror', b: 'Nima bo‘lyapti, nima uchun va nima qilish kerak — aniq, asoslangan variantlar bilan.' },
    { n: '04', t: 'Harakat', b: 'Hisob-faktura, to‘lov, xarid so‘rovi yoki ish buyurtmasi — bir tugma bilan bajariladi.' },
  ];
  return (
    <section id="qanday" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Qanday ishlaydi</p>
            <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-t1 sm:text-[34px]">DATA → AI TAHLIL → QAROR → HARAKAT</h2>
          </div>
          <Link href="/app" className="text-[13px] font-semibold text-accent hover:underline">Demo panelda sinab ko‘rish →</Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl border border-line bg-surface-solid p-5">
              <span className="num text-[22px] font-extrabold text-accent/40">{s.n}</span>
              <h3 className="mt-1 text-[15px] font-semibold text-t1">{s.t}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-t2">{s.b}</p>
              {i < steps.length - 1 && <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-t3 lg:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview({ stats }: { stats: LandingStats }) {
  return (
    <section className="border-y border-line bg-surface-2/30 px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Ichida nima bor</p>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-t1 sm:text-[34px]">Raqamlar bir-biriga mos — har doim</h2>
          <ul className="mt-4 space-y-2.5">
            {[
              'Sotuv jami = dashboard daromadi',
              'Ombor qoldig‘i = kirim − chiqim',
              'Aktiv = majburiyat + kapital',
              'Foyda = daromad − xarajat',
              'Debitorlik = hisob-fakturalar qoldig‘i',
            ].map((x) => (
              <li key={x} className="flex items-start gap-2.5 text-[13.5px] text-t1"><Check className="mt-0.5 h-4 w-4 shrink-0 text-pos" />{x}</li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl border border-line bg-surface-solid p-3 text-[12.5px] leading-relaxed text-t2">
            Demo bazada {stats.counts.entries.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ta haqiqiy, balanslangan provodka bor. Har bir hisobot shu
            jurnaldan hisoblanadi — sun’iy “chiroyli” raqamlar yo‘q.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/app" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110">Demo panelni ochish <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link href="/pricing" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-solid px-4 text-[13px] font-semibold text-t1 hover:border-line-strong">Narxlarni ko‘rish</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-surface-solid p-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Foyda marjasi', `${stats.marginRaw.toFixed(1)}%`, 'pos'],
              ['Oylik tushum', stats.revenue, 'neutral'],
              ['Sof foyda', stats.net, 'pos'],
              ['Soliq majburiyati', stats.tax, 'warn'],
            ].map(([l, v, tone]) => (
              <div key={l} className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <p className="text-[10.5px] uppercase tracking-wide text-t3">{l}</p>
                <p className={cx('num mt-0.5 text-[15px] font-semibold', tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-warn' : 'text-t1')}>{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
            <p className="mb-2 text-[11.5px] font-semibold text-t1">Sof foyda dinamikasi</p>
            <LandingSpark series={stats.series.map((x) => x.net)} />
          </div>
          <div className="mt-3 space-y-2">
            {stats.insights.slice(0, 2).map((i) => (
              <div key={i.title} className="flex gap-2 rounded-xl border border-line bg-surface-2 p-2.5">
                <span className={cx('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', i.tone === 'pos' ? 'bg-pos' : i.tone === 'warn' ? 'bg-warn' : 'bg-neg')} />
                <div><p className="text-[12px] font-semibold text-t1">{i.title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-t3">{i.body}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="narxlar" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Narxlar</p>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-t1 sm:text-[34px]">Birinchi oy bepul, keyin o‘zingizga mos tarif</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-t2">Narxlar {VAT_RATE}% QQS bilan. Yillik to‘lovda 2 oy bepul. Qo‘shimcha foydalanuvchi — 29 000 so‘m/oy.</p>
        </div>
        <div className="mt-8 grid gap-3 lg:grid-cols-4">
          {PLANS.map((p) => {
            const price = priceOf(p, 'monthly');
            return (
              <div key={p.id} className={cx('relative flex flex-col rounded-3xl border p-5', p.popular ? 'border-accent bg-accent-soft/40 shadow-pop' : 'border-line bg-surface-solid')}>
                {p.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Eng ommabop</span>}
                <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-accent">{p.name}</p>
                <p className="mt-1 min-h-[34px] text-[12px] leading-snug text-t3">{p.tagline}</p>
                <div className="mt-3">
                  {price === null ? <p className="text-[22px] font-bold text-t1">Kelishuv asosida</p> : (
                    <>
                      <p className="num text-[24px] font-extrabold tracking-[-0.02em] text-t1">{price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} <span className="text-[12px] font-semibold text-t3">so‘m/oy</span></p>
                      <p className="mt-0.5 text-[11px] text-t3">yillikda 2 oy bepul · {annualSaving(p.monthly!).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m tejash</p>
                    </>
                  )}
                </div>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {p.includes.slice(0, 6).map((x) => <li key={x} className="flex items-start gap-1.5 text-[12px] leading-snug text-t2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pos" />{x}</li>)}
                </ul>
                <Link href={p.contact ? '/contact' : `/signup?plan=${p.id}`} className={cx('mt-4 inline-flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold transition', p.popular ? 'bg-accent text-white hover:brightness-110' : 'border border-line bg-surface-2 text-t1 hover:border-line-strong')}>
                  {p.contact ? 'Bog‘lanish' : `${TRIAL_DAYS} kun bepul`}
                </Link>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-t3">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" />Karta talab qilinmaydi</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" />Istalgan vaqtda bekor qilish</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" />Ma’lumot eksporti doim ochiq</span>
          <Link href="/pricing" className="font-semibold text-accent hover:underline">Batafsil taqqoslash →</Link>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="border-y border-line bg-surface-2/30 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Ishonch</p>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-t1 sm:text-[34px]">Kompaniyalar nima uchun tanlaydi</h2>
          <p className="mt-2 text-[12px] text-t3">Quyidagi sharhlar — demo stsenariy uchun yozilgan namunalar (haqiqiy mijoz emas).</p>
        </div>
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-2xl border border-line bg-surface-solid p-5">
              <Quote className="h-5 w-5 text-accent/50" />
              <blockquote className="mt-2 flex-1 text-[13px] leading-relaxed text-t2">{t.text}</blockquote>
              <div className="mt-3 flex items-center gap-1 text-warn">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</div>
              <figcaption className="mt-2 border-t border-line pt-2.5"><p className="text-[12.5px] font-semibold text-t1">{t.name}</p><p className="text-[11px] text-t3">{t.role}</p><p className="mt-1 text-[11px] font-semibold text-pos">{t.metric}</p></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const featured = [
    { group: 'Asosiy', label: 'Foydalanuvchilar', value: (p: (typeof PLANS)[number]) => (p.limit.users === null ? 'Cheksiz' : String(p.limit.users)) },
    { group: 'Asosiy', label: 'Buxgalteriya va soliqlar', value: (p: (typeof PLANS)[number]) => (p.id !== 'start' ? true : false) },
    { group: 'Asosiy', label: 'Ishlab chiqarish va tannarx', value: (p: (typeof PLANS)[number]) => p.limit.modules === 'all' },
    { group: 'Asosiy', label: 'AI CFO savollar / oy', value: (p: (typeof PLANS)[number]) => (p.limit.aiQuestions === null ? 'Cheksiz' : String(p.limit.aiQuestions)) },
  ];
  return (
    <section id="savollar" className="scroll-mt-20 px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Savol-javob</p>
          <h2 className="mt-2 text-[26px] font-bold tracking-[-0.02em] text-t1 sm:text-[34px]">Ko‘p beriladigan savollar</h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-t2">Javob topilmadimi? <Link href="/contact" className="font-semibold text-accent hover:underline">Bizga yozing</Link> — 1 ish kunida javob beramiz.</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-line">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr className="bg-surface-2 text-left text-[10.5px] uppercase tracking-wide text-t3"><th className="px-2.5 py-2 font-semibold"> </th>{PLANS.map((p) => <th key={p.id} className="px-2.5 py-2 text-center font-semibold">{p.name}</th>)}</tr></thead>
              <tbody>
                {featured.map((r) => (
                  <tr key={r.label} className="border-t border-line">
                    <td className="px-2.5 py-1.5 text-t2">{r.label}</td>
                    {PLANS.map((p) => { const v = r.value(p); return <td key={p.id} className="px-2.5 py-1.5 text-center font-semibold text-t1">{v === true ? <Check className="mx-auto h-3.5 w-3.5 text-pos" /> : v === false ? <span className="text-t3">—</span> : v}</td>; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/pricing#taqqoslash" className="mt-2 inline-block text-[12px] font-semibold text-accent hover:underline">To‘liq taqqoslash jadvali →</Link>
        </div>
        <div className="space-y-2">
          {FAQ.slice(0, 8).map((f, i) => (
            <div key={f.q} className="overflow-hidden rounded-2xl border border-line bg-surface-solid">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open === i}>
                <span className="flex-1 text-[13.5px] font-semibold text-t1">{f.q}</span>
                <ChevronDown className={cx('h-4 w-4 shrink-0 text-t3 transition', open === i && 'rotate-180')} />
              </button>
              {open === i && <p className="border-t border-line px-4 py-3 text-[12.5px] leading-relaxed text-t2">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-16 sm:px-6">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-accent/15 via-surface-solid to-accent-2/10 p-8 text-center sm:p-12">
        <div className="hero-glow" />
        <h2 className="text-[26px] font-extrabold tracking-[-0.02em] text-t1 sm:text-[36px]">{TRIAL_DAYS} kun bepul. Kartasiz.</h2>
        <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-t2">Bugun ro‘yxatdan o‘ting, demo ma’lumotlar bilan tanishing yoki o‘z kompaniyangizni ulang. Sinov davrida ISHLAB CHIQARISH tarifidagi barcha modullar ochiq.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Link href="/signup" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[14.5px] font-semibold text-white shadow-[0_16px_40px_-14px_var(--accent)] transition hover:brightness-110 sm:w-auto">Hisob ochish <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/pricing" className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-line bg-surface-solid px-5 text-[14px] font-semibold text-t1 transition hover:border-line-strong sm:w-auto">Tariflarni ko‘rish</Link>
        </div>
        <p className="mt-3 text-[11.5px] text-t3">Demo rejim: to‘lovlar test rejimida bajariladi. Ma’lumotlar saqlanadi va eksport qilinadi.</p>
      </div>
    </section>
  );
}
