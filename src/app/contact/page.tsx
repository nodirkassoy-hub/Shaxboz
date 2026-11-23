'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Phone, MapPin, Send, Check, AlertCircle, Clock, MessageSquare, Building2 } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { useApp } from '@/lib/store';
import { PLANS } from '@/lib/config/pricing';
import { cx } from '@/components/ui';

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-16"><div className="skeleton h-80 rounded-3xl" /></div>}>
          <Contact />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

function Contact() {
  const params = useSearchParams();
  const toast = useApp((s) => s.toast);
  const [f, setF] = useState({ name: '', email: '', phone: '', company: '', topic: params.get('plan') === 'korporativ' ? 'korporativ' : 'savol', message: '' });
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 3) return setErr('Ismingizni kiriting.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return setErr('Email noto‘g‘ri.');
    if (f.message.trim().length < 10) return setErr('Xabar kamida 10 belgi bo‘lishi kerak.');
    setErr(null);
    toast({ kind: 'success', title: 'Xabar qabul qilindi (demo)', body: 'Haqiqiy versiyada xabar email orqali yuboriladi va 1 ish kunida javob beriladi.' });
    setF({ ...f, message: '' });
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px]">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Aloqa</p>
        <h1 className="mt-2 text-[28px] font-extrabold tracking-[-0.025em] text-t1 sm:text-[34px]">Savolingiz bormi? Yozing.</h1>
        <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-t2">Tarif tanlash, ma’lumotlarni ko‘chirish yoki integratsiya bo‘yicha yordam beramiz. Javob muddati — 1 ish kuni.</p>
        {f.topic === 'korporativ' && <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-3 text-[12.5px] text-t2">Korporativ tarif uchun so‘rov: cheksiz foydalanuvchi, ko‘p filial, alohida server va integratsiyalar. Mutaxassisimiz 1 ish kunida bog‘lanadi.</div>}
        {err && <p className="mt-3 flex items-center gap-2 rounded-xl border border-neg/30 bg-neg/8 p-2.5 text-[12px] text-neg"><AlertCircle className="h-4 w-4" />{err}</p>}
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
          <label className="block"><span className="mb-1 block text-[12px] font-semibold text-t1">Ismingiz *</span><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ism familiya" /></label>
          <label className="block"><span className="mb-1 block text-[12px] font-semibold text-t1">Email *</span><input className="field" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="siz@kompaniya.uz" /></label>
          <label className="block"><span className="mb-1 block text-[12px] font-semibold text-t1">Telefon</span><input className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+998 90 123 45 67" inputMode="tel" /></label>
          <label className="block"><span className="mb-1 block text-[12px] font-semibold text-t1">Kompaniya</span><input className="field" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Kompaniya nomi" /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-[12px] font-semibold text-t1">Mavzu</span>
            <select className="field" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
              <option value="savol">Umumiy savol</option>
              <option value="demo">Demo va namoyish</option>
              <option value="tarif">Tarif tanlash</option>
              <option value="korporativ">Korporativ tarif</option>
              <option value="integratsiya">Integratsiya (1C, bank, ERI)</option>
              <option value="yordam">Texnik yordam</option>
            </select></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-[12px] font-semibold text-t1">Xabar *</span>
            <textarea className="field min-h-[120px] resize-y" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Qisqacha yozing: qanday biznes, qanday vazifa…" /></label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[13.5px] font-semibold text-white transition hover:brightness-110"><Send className="h-4 w-4" /> Xabar yuborish</button>
            <span className="text-[11px] text-t3">Demo rejim: xabar saqlanadi, lekin yuborilmaydi.</span>
          </div>
        </form>
      </div>
      <aside className="space-y-3">
        <div className="rounded-2xl border border-line bg-surface-solid p-4">
          <h2 className="text-[13px] font-semibold text-t1">Bog‘lanish</h2>
          <ul className="mt-2 space-y-2.5 text-[12.5px]">
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><b className="block text-t1">Email</b><a href="mailto:hello@balans-ai.uz" className="text-t2 hover:text-t1">hello@balans-ai.uz</a></span></li>
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><b className="block text-t1">Telefon</b><a href="tel:+998712000000" className="text-t2 hover:text-t1">+998 71 200 00 00</a></span></li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><b className="block text-t1">Ofis</b><span className="text-t2">Toshkent sh., Yunusobod t., Amir Temur ko‘ch. 107B</span></span></li>
            <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><b className="block text-t1">Ish vaqti</b><span className="text-t2">Dushanba–Juma, 9:00–18:00</span></span></li>
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
          <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-t1"><MessageSquare className="h-3.5 w-3.5" /> Tezroq javob</h2>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-t3">Demo panelni o‘zingiz ochib ko‘ring — barcha modullar ishlaydi va hech narsa so‘ralmaydi.</p>
          <Link href="/app" className="mt-2 inline-flex h-9 items-center rounded-xl bg-surface-solid px-3 text-[12px] font-semibold text-t1 ring-1 ring-line hover:ring-line-strong">Demo panelni ochish</Link>
        </div>
        <div className="rounded-2xl border border-line bg-surface-solid p-4">
          <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-t1"><Building2 className="h-3.5 w-3.5" /> Tariflar</h2>
          <ul className="mt-2 space-y-1">
            {PLANS.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 border-b border-line pb-1 text-[11.5px] last:border-0">
                <span className="text-t2">{p.name}</span>
                <span className={cx('num font-semibold', p.popular ? 'text-accent' : 'text-t1')}>{p.monthly ? `${(p.monthly / 1000).toFixed(0)} 000 so‘m` : 'Kelishuv'}</span>
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="mt-2 inline-block text-[11.5px] font-semibold text-accent hover:underline">Batafsil →</Link>
        </div>
      </aside>
    </div>
  );
}
