'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { useBilling } from '@/lib/billing/store';
import { PLANS, TRIAL_DAYS, VAT_RATE, priceOf } from '@/lib/config/pricing';
import { cx } from '@/components/ui';

export default function SignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16"><div className="skeleton h-96 rounded-3xl" /></div>}>
          <SignupForm />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get('plan') || '';
  const plan = PLANS.find((p) => p.id === planId) ?? null;
  const register = useBilling((s) => s.register);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', stir: '', password: '', confirm: '', agree: false });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [top, setTop] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string | boolean) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); setTop(null); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = 'Ism-familiyani to‘liq kiriting.';
    if (!/^\+?[\d\s()-]{9,20}$/.test(form.phone.trim())) e.phone = 'Telefon: +998 90 123 45 67 ko‘rinishida.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Email manzili noto‘g‘ri.';
    if (form.company.trim().length < 2) e.company = 'Kompaniya nomini kiriting.';
    if (form.stir && !/^\d{3}\s?\d{3}\s?\d{3}$/.test(form.stir.trim())) e.stir = 'STIR 9 xonali raqam bo‘lishi kerak.';
    if (form.password.length < 8) e.password = 'Kamida 8 belgi.';
    else if (!/\d/.test(form.password) || !/[a-zA-Zа-яА-Я]/.test(form.password)) e.password = 'Harf va raqam aralash bo‘lishi kerak.';
    if (form.confirm !== form.password) e.confirm = 'Parollar mos kelmadi.';
    if (!form.agree) e.agree = 'Shartlarga rozilik bildiring.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) { setTop('Formada xatolar bor — belgilangan maydonlarni to‘g‘rilang.'); return; }
    setBusy(true);
    setTimeout(() => {
      const r = register({ company: form.company, name: form.name, phone: form.phone, email: form.email, stir: form.stir, password: form.password });
      setBusy(false);
      if (!r.ok) { setTop(r.error || 'Ro‘yxatdan o‘tishda xatolik.'); return; }
      router.push(planId ? `/checkout?plan=${planId}&new=1` : '/app');
    }, 450);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_400px] lg:py-14">
      <div className="order-2 lg:order-1">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Ro‘yxatdan o‘tish</p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-[-0.025em] text-t1 sm:text-[34px]">{TRIAL_DAYS} kun bepul sinov</h1>
        <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-t2">
          Bank kartasi talab qilinmaydi. Sinov davrida ISHLAB CHIQARISH tarifidagi barcha modullar ochiladi. Istalgan vaqtda tarif tanlashingiz yoki hisobni to‘xtatishingiz mumkin.
        </p>

        {top && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-neg/30 bg-neg/8 p-3 text-[12.5px] text-neg">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {top}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 grid gap-3.5 sm:grid-cols-2" noValidate>
          <Field label="Ism va familiya" error={errors.name} required>
            <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Gulnora Abdullayeva" autoComplete="name" />
          </Field>
          <Field label="Telefon" error={errors.phone} required>
            <input className="field" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" autoComplete="tel" />
          </Field>
          <Field label="Email" error={errors.email} required className="sm:col-span-2">
            <input className="field" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="siz@kompaniya.uz" type="email" autoComplete="email" />
          </Field>
          <Field label="Kompaniya nomi" error={errors.company} required>
            <input className="field" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="“Nur Elektro” MChJ" autoComplete="organization" />
          </Field>
          <Field label="STIR (ixtiyoriy)" error={errors.stir} hint="Hisob-fakturalar uchun">
            <input className="field" value={form.stir} onChange={(e) => set('stir', e.target.value)} placeholder="310 227 904" inputMode="numeric" />
          </Field>
          <Field label="Parol" error={errors.password} required hint="Kamida 8 belgi, harf va raqam">
            <div className="relative">
              <input className="field pr-10" value={form.password} onChange={(e) => set('password', e.target.value)} type={show ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-t3 hover:text-t1" aria-label={show ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Parolni takrorlang" error={errors.confirm} required>
            <input className="field" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} type={show ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <label className={cx('flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 sm:col-span-2', errors.agree ? 'border-neg/40 bg-neg/5' : 'border-line bg-surface-2')}>
            <input type="checkbox" checked={form.agree} onChange={(e) => set('agree', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span className="text-[12px] leading-relaxed text-t2">
              Men <Link href="/terms" className="font-medium text-accent hover:underline">Foydalanish shartlari (oferta)</Link> va <Link href="/privacy" className="font-medium text-accent hover:underline">Maxfiylik siyosati</Link>ga roziman.
            </span>
          </label>
          {errors.agree && <p className="-mt-2 text-[11.5px] font-medium text-neg sm:col-span-2">{errors.agree}</p>}
          <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent to-[color-mix(in_oklab,var(--accent),black_10%)] px-4 text-[14px] font-semibold text-white shadow-[0_12px_30px_-12px_var(--accent)] transition hover:brightness-110 disabled:opacity-60 sm:col-span-2">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Hisob yaratilmoqda…</> : <>Hisob ochish va boshlash <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="text-center text-[11.5px] text-t3 sm:col-span-2">Allaqachon hisobingiz bormi? <Link href="/login" className="font-semibold text-accent hover:underline">Kirish</Link></p>
        </form>
      </div>

      <aside className="order-1 space-y-3 lg:order-2">
        <div className="rounded-3xl border border-line bg-surface-solid p-5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-accent"><Sparkles className="h-3.5 w-3.5" /> Sinovda nima ochiq</p>
          <ul className="mt-3 space-y-2">
            {['Barcha modullar: buxgalteriya, soliqlar, HR, ishlab chiqarish', '30 ta foydalanuvchi va cheksiz ombor', 'AI CFO: cheksiz (adolatli foydalanish)', 'Ikkita demo to‘plam: zavod va savdo', 'Excel/CSV/PDF eksport'].map((x) => (
              <li key={x} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-t2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pos" />{x}</li>
            ))}
          </ul>
        </div>
        {plan && (
          <div className="rounded-3xl border border-accent/30 bg-accent-soft/40 p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-accent">Tanlangan tarif</p>
            <p className="mt-1 text-[16px] font-bold text-t1">{plan.name}</p>
            <p className="num mt-1 text-[18px] font-extrabold text-t1">{priceOf(plan, 'monthly')?.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} <span className="text-[11px] font-medium text-t3">so‘m/oy</span></p>
            <p className="mt-1 text-[11.5px] text-t3">Ro‘yxatdan o‘tgach to‘lov sahifasiga o‘tasiz. To‘lov ixtiyoriy — {TRIAL_DAYS} kun bepul.</p>
          </div>
        )}
        <div className="rounded-3xl border border-line bg-surface-2/60 p-5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-t1"><ShieldCheck className="h-4 w-4 text-pos" /> Ma’lumotlar xavfsizligi</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-t3">Kompaniya ma’lumotlari boshqa hisoblardan ajratilgan. Narxlar {VAT_RATE}% QQS bilan. Demo rejimda to‘lov test orqali bajariladi — haqiqiy pul yechilmaydi.</p>
        </div>
        <p className="px-1 text-[11px] text-t3">Demo hisob bilan avval tanishmoqchimisiz? <Link href="/app" className="font-semibold text-accent hover:underline">Demo panelni ochish</Link></p>
      </aside>
    </div>
  );
}

function Field({ label, children, error, hint, required, className }: { label: string; children: React.ReactNode; error?: string; hint?: string; required?: boolean; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-t1">{label}{required && <span className="text-neg">*</span>}{hint && <span className="ml-auto text-[10.5px] font-normal text-t3">{hint}</span>}</span>
      {children}
      {error && <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-neg"><AlertCircle className="h-3 w-3" />{error}</span>}
    </label>
  );
}

