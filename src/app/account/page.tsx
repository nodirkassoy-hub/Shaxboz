'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, CreditCard, Download, FileText, Users, Sparkles, AlertTriangle, Building2, Clock, Trash2, Plus, FlaskConical } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { useBilling, useEntitlements } from '@/lib/billing/store';
import { PAYMENT_METHODS } from '@/lib/billing';
import { PLANS, VAT_RATE, PLAN_LIMITS_TEXT, planOf, priceOf } from '@/lib/config/pricing';
import { EXTRA_USER_PRICE, TRIAL_DAYS, DATA_RETENTION_DAYS } from '@/lib/config/pricing';
import { fmtDate } from '@/lib/core/dates';
import { StatusBadge, cx, Modal, Button, Field, Input, Select } from '@/components/ui';

export default function AccountPage() {
  const ready = useBilling((s) => s.ready);
  const init = useBilling((s) => s.init);
  const account = useBilling((s) => s.account);
  const ent = useEntitlements();
  const [tab, setTab] = useState<'overview' | 'team' | 'invoices' | 'settings'>('overview');
  useEffect(() => { init(); }, [init]);
  if (!ready || !account) return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16"><div className="skeleton h-64 rounded-3xl" /></main>
      <SiteFooter />
    </>
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-t1">Hisob va obuna</h1>
            <p className="mt-1 text-[13px] text-t2">{account.company.name} · {account.user.email}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/app" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110">Panelga o‘tish <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>

        <nav className="mt-5 flex gap-1 border-b border-line" aria-label="Hisob bo‘limlari">
          {([['overview', 'Umumiy'], ['team', `Jamoa (${account.team.length})`], ['invoices', 'To‘lovlar tarixi'], ['settings', 'Sozlamalar']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={cx('-mb-px border-b-2 px-3 py-2 text-[13px] font-semibold transition', tab === id ? 'border-accent text-accent' : 'border-transparent text-t3 hover:text-t1')}>{label}</button>
          ))}
        </nav>

        <div className="mt-5 space-y-4">
          {tab === 'overview' && <Overview />}
          {tab === 'team' && <Team />}
          {tab === 'invoices' && <Invoices />}
          {tab === 'settings' && <Settings />}
        </div>
        {ent.status === 'trial' && (
          <p className="mt-6 text-[11.5px] text-t3">Sinov davri {ent.trialDaysLeft} kun qoldi · {TRIAL_DAYS} kunlik sinov · Ma’lumotlar to‘lovsiz {DATA_RETENTION_DAYS} kun saqlanadi.</p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function Overview() {
  const account = useBilling((s) => s.account)!;
  const ent = useEntitlements();
  const cancel = useBilling((s) => s.cancel);
  const choose = useBilling((s) => s.choosePlan);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const plan = planOf(account.subscription.planId);
  const statusMap: Record<string, string> = { trial: 'Sinov', active: 'Faol', readonly: 'O‘qish rejimi', cancelled: 'Bekor qilingan' };
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface-solid p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-t3">Joriy tarif</p>
          <p className="mt-1 flex items-center gap-2 text-[19px] font-bold text-t1">{ent.plan.name} <span className={cx('rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase', ent.status === 'active' ? 'bg-pos/12 text-pos' : ent.status === 'trial' ? 'bg-accent-soft text-accent' : 'bg-neg/12 text-neg')}>{statusMap[ent.status]}</span></p>
          <p className="mt-1 text-[11.5px] text-t3">{ent.reason}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface-solid p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-t3">{ent.status === 'trial' ? 'Sinov tugaydi' : 'Keyingi to‘lov'}</p>
          <p className="num mt-1 text-[19px] font-bold text-t1">{fmtDate(ent.periodEnd)}</p>
          <p className="mt-1 text-[11.5px] text-t3">{ent.status === 'trial' ? `${ent.trialDaysLeft} kun qoldi` : `${plan.monthly ? priceOf(plan, account.subscription.cycle)!.toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' so‘m' : 'kelishuv'}`}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface-solid p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-t3">AI CFO limiti</p>
          <p className="num mt-1 text-[19px] font-bold text-t1">{ent.aiQuestions === null ? 'Cheksiz' : `${ent.aiUsed} / ${ent.aiQuestions}`}</p>
          <p className="mt-1 text-[11.5px] text-t3">Bu oy ishlatilgan savollar</p>
        </div>
      </section>

      {note && <p className="rounded-xl border border-line bg-surface-2 p-3 text-[12.5px] text-t2">{note}</p>}

      <section className="rounded-2xl border border-line bg-surface-solid p-4">
        <div className="flex items-center justify-between"><h2 className="text-[14.5px] font-semibold text-t1">Tarifni o‘zgartirish</h2><Link href="/pricing" className="text-[12px] font-semibold text-accent hover:underline">Taqqoslash</Link></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => {
            const current = p.id === account.subscription.planId;
            const price = priceOf(p, 'monthly');
            return (
              <div key={p.id} className={cx('rounded-xl border p-3', current ? 'border-accent bg-accent-soft/40' : 'border-line bg-surface-2')}>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-accent">{p.name}</p>
                <p className="num mt-0.5 text-[14px] font-bold text-t1">{price === null ? 'Kelishuv' : `${price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m`}{price && <span className="text-[10px] font-medium text-t3">/oy</span>}</p>
                <p className="mt-1 min-h-[26px] text-[10.5px] leading-snug text-t3">{PLAN_LIMITS_TEXT[p.id]}</p>
                {current ? <span className="mt-1.5 block rounded-lg bg-surface-solid py-1.5 text-center text-[11px] font-semibold text-accent">Joriy tarif</span>
                  : p.contact ? <Link href="/contact?plan=korporativ" className="mt-1.5 block rounded-lg border border-line bg-surface-solid py-1.5 text-center text-[11px] font-semibold text-t1 hover:border-line-strong">Bog‘lanish</Link>
                    : <button onClick={() => { const r = choose(p.id, account.subscription.cycle); setNote(r.note); }} className="mt-1.5 w-full rounded-lg border border-line bg-surface-solid py-1.5 text-[11px] font-semibold text-t1 hover:border-line-strong">Tanlash</button>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/checkout" className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-[12px] font-semibold text-white hover:brightness-110"><CreditCard className="h-3.5 w-3.5" /> To‘lov qilish</Link>
          <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12px] font-semibold text-t1 hover:border-line-strong">Yillik tarif (2 oy bepul)</Link>
          {account.subscription.status === 'active' && <button onClick={() => setConfirmCancel(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-neg hover:bg-neg/8"><Trash2 className="h-3.5 w-3.5" /> Obunani bekor qilish</button>}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface-2/60 p-4">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-t1"><FlaskConical className="h-4 w-4 text-warn" /> Demo boshqaruv (test uchun)</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-t3">Sinov holatini sun’iy o‘zgartirib, eslatmalar va o‘qish rejimini sinab ko‘rish. Haqiqiy foydalanuvchiga bu blok ko‘rinmaydi.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(7 as const, [7, 3, 1]).map((n) => <button key={n} onClick={() => useBilling.getState().setTrialDaysLeft(n)} className="rounded-lg border border-line bg-surface-solid px-2.5 py-1.5 text-[11px] font-semibold text-t1 hover:border-line-strong">Sinov: {n} kun</button>)}
          <button onClick={() => useBilling.getState().expire()} className="rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-[11px] font-semibold text-warn hover:brightness-105">Sinovni tugatish</button>
          <button onClick={() => useBilling.getState().reset()} className="rounded-lg border border-line bg-surface-solid px-2.5 py-1.5 text-[11px] font-semibold text-t1 hover:border-line-strong">Demo hisobni tiklash</button>
        </div>
      </section>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Obunani bekor qilish" size="sm" icon={<AlertTriangle className="h-4 w-4" />}
        footer={<><Button variant="ghost" onClick={() => setConfirmCancel(false)}>Bekor qilish</Button><Button variant="danger" onClick={() => { cancel(); setConfirmCancel(false); }}>Bekor qilish</Button></>}>
        <p className="text-[13px] leading-relaxed text-t2">Bekor qilgandan keyin hisob joriy davr oxirigacha ({account.subscription.periodEnd}) ishlaydi, so‘ng o‘qish rejimiga o‘tadi. Ma’lumotlar {DATA_RETENTION_DAYS} kun saqlanadi va istalgan vaqtda eksport qilinadi. To‘lovdan keyin to‘liq tiklanadi.</p>
      </Modal>
    </>
  );
}

function Team() {
  const account = useBilling((s) => s.account)!;
  const ent = useEntitlements();
  const addMember = useBilling((s) => s.addMember);
  const removeMember = useBilling((s) => s.removeMember);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', role: 'Buxgalter' });
  const [err, setErr] = useState<string | null>(null);
  const atLimit = ent.users !== null && account.team.length >= ent.users;
  return (
    <section className="rounded-2xl border border-line bg-surface-solid p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-1.5 text-[14.5px] font-semibold text-t1"><Users className="h-4 w-4" /> Jamoa</h2>
          <p className="mt-0.5 text-[11.5px] text-t3">{account.team.length} / {ent.users === null ? 'cheksiz' : ent.users} foydalanuvchi · qo‘shimcha: {EXTRA_USER_PRICE.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/oy</p></div>
        <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { if (atLimit) { setErr(`Tarif bo‘yicha ${ent.users} foydalanuvchi. Qo‘shimcha foydalanuvchi — ${EXTRA_USER_PRICE.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/oy.`); } setOpen(true); }}>Xodim qo‘shish</Button>
      </div>
      {atLimit && <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-warn/10 p-2 text-[11.5px] text-warn"><AlertTriangle className="h-3.5 w-3.5" /> Tarif chegarasi to‘ldi. Qo‘shimcha foydalanuvchi — {EXTRA_USER_PRICE.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/oy.</p>}
      <div className="mt-3 divide-y divide-line">
        {account.team.map((t) => (
          <div key={t.id} className="flex items-center gap-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-[11px] font-bold text-accent">{t.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-t1">{t.name}</p><p className="truncate text-[11px] text-t3">{t.email}</p></div>
            <span className="hidden rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-medium text-t2 sm:inline">{t.role}</span>
            <StatusBadge status={t.status === 'active' ? 'active' : 'pending'} />
            {account.team.length > 1 && <button onClick={() => removeMember(t.id)} className="rounded-lg p-1.5 text-t3 hover:bg-neg/10 hover:text-neg" aria-label={`${t.name}ni o‘chirish`}><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Xodim qo‘shish" subtitle="Xodim faqat o‘z roliga tegishli bo‘limlarni ko‘radi." size="sm"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button><Button variant="primary" onClick={() => { const r = addMember(f); if (!r.ok) { setErr(r.error || 'Xatolik'); return; } setOpen(false); setErr(null); setF({ name: '', email: '', role: 'Buxgalter' }); }}>Taklif yuborish</Button></>}>
        <div className="space-y-3">
          <Field label="Ism-familiya"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nilufar Rashidova" /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="nilufar@kompaniya.uz" /></Field>
          <Field label="Rol"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{['Direktor', 'Bosh buxgalter', 'Buxgalter', 'Omborchi', 'Sotuv menejeri', 'HR menejer', 'Ishlab chiqarish boshlig‘i'].map((r) => <option key={r}>{r}</option>)}</Select></Field>
          {err && <p className="text-[11.5px] text-neg">{err}</p>}
          <p className="text-[11px] text-t3">Taklif email orqali yuboriladi (demo rejimda ko‘rsatiladi). Xodim parolni o‘zi o‘rnatadi.</p>
        </div>
      </Modal>
    </section>
  );
}

function Invoices() {
  const account = useBilling((s) => s.account)!;
  const pay = useBilling((s) => s.pay);
  if (!account.invoices.length) {
    return <section className="rounded-2xl border border-line bg-surface-solid p-8 text-center">
      <FileText className="mx-auto h-8 w-8 text-t3" />
      <p className="mt-2 text-[13.5px] font-semibold text-t1">Hozircha to‘lovlar yo‘q</p>
      <p className="mt-1 text-[12px] text-t3">Sinov davridasiz. Tarifni tanlab, birinchi hisob-fakturani yaratishingiz mumkin.</p>
      <Link href="/checkout" className="mt-3 inline-flex h-9 items-center rounded-xl bg-accent px-3.5 text-[12.5px] font-semibold text-white">Tarif tanlash</Link>
    </section>;
  }
  return (
    <section className="rounded-2xl border border-line bg-surface-solid p-4">
      <h2 className="text-[14.5px] font-semibold text-t1">To‘lovlar tarixi</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead><tr className="bg-surface-2 text-left text-[10.5px] uppercase tracking-wide text-t3">{['Hisob-faktura', 'Sana', 'Tarif', 'Davr', 'Summa', 'QQS', 'Usul', 'Holat', ''].map((h) => <th key={h} className="px-2.5 py-2 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {account.invoices.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="px-2.5 py-2 font-mono text-[11px]">{i.no}{i.test && <span className="ml-1 rounded bg-warn/12 px-1 text-[9px] font-bold text-warn">TEST</span>}</td>
                <td className="px-2.5 py-2">{fmtDate(i.date)}</td>
                <td className="px-2.5 py-2">{planOf(i.planId).name}</td>
                <td className="px-2.5 py-2">{i.cycle === 'annual' ? '12 oy' : '1 oy'}</td>
                <td className="num px-2.5 py-2 text-right">{i.amount.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}</td>
                <td className="num px-2.5 py-2 text-right">{i.vat.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}</td>
                <td className="px-2.5 py-2">{PAYMENT_METHODS.find((m) => m.id === i.method)!.name}</td>
                <td className="px-2.5 py-2"><StatusBadge status={i.status === 'paid' ? 'paid' : i.status === 'pending' ? 'pending' : 'rejected'} /></td>
                <td className="px-2.5 py-2 text-right">{i.status === 'pending' ? <button onClick={() => pay(i.id)} className="rounded-lg bg-accent px-2 py-1 text-[10.5px] font-semibold text-white">To‘lash</button> : <span className="text-[10.5px] text-t3">{i.paidAt ? fmtDate(i.paidAt) : '—'}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-t3"><Download className="h-3.5 w-3.5" /> Hisob-fakturalar PDF sifatida yuklab olinadi (chop etish). Narxlar {VAT_RATE}% QQS bilan; QQS alohida qatorda ajratilgan.</p>
    </section>
  );
}

function Settings() {
  const account = useBilling((s) => s.account)!;
  const setProfile = useBilling((s) => s.setProfile);
  const setVat = useBilling((s) => s.setVat);
  const [f, setF] = useState({ name: account.company.name, stir: account.company.stir, phone: account.company.phone, email: account.company.email, userName: account.user.name });
  const [saved, setSaved] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-line bg-surface-solid p-4">
        <h2 className="flex items-center gap-1.5 text-[14.5px] font-semibold text-t1"><Building2 className="h-4 w-4" /> Kompaniya ma’lumotlari</h2>
        <div className="mt-3 grid gap-2.5">
          <Field label="Kompaniya nomi"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="STIR"><Input value={f.stir} onChange={(e) => setF({ ...f, stir: e.target.value })} placeholder="310 227 904" /></Field>
          <Field label="Telefon"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Mas’ul shaxs"><Input value={f.userName} onChange={(e) => setF({ ...f, userName: e.target.value })} /></Field>
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 p-3">
            <div><p className="text-[12.5px] font-semibold text-t1">QQS holati</p><p className="text-[11px] text-t3">Hisob-fakturalarda QQS qatorini ko‘rsatish ({VAT_RATE}%)</p></div>
            <button role="switch" aria-checked={account.vatEnabled} onClick={() => setVat(!account.vatEnabled)} className={cx('relative h-6 w-11 rounded-full transition', account.vatEnabled ? 'bg-accent' : 'bg-surface-3')}>
              <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', account.vatEnabled ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => { setProfile(f); setSaved(true); setTimeout(() => setSaved(false), 2500); }}>Saqlash</Button>
            {saved && <span className="flex items-center gap-1 text-[11.5px] font-medium text-pos"><Check className="h-3.5 w-3.5" />Saqlandi</span>}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface-solid p-4">
          <h2 className="flex items-center gap-1.5 text-[14.5px] font-semibold text-t1"><Sparkles className="h-4 w-4" /> Hisob holati</h2>
          <dl className="mt-2 space-y-1.5 text-[12px]">
            {[['Hisob ID', account.id], ['Yaratilgan', fmtDate(account.createdAt)], ['Sinov tugaydi', fmtDate(account.trialEndsAt)], ['Obuna holati', account.subscription.status], ['Davr oxiri', fmtDate(account.subscription.periodEnd)], ['To‘lov davri', account.subscription.cycle === 'annual' ? 'Yillik' : 'Oylik']].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-t3">{k}</dt><dd className="font-medium text-t1">{v}</dd></div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-line bg-surface-2/60 p-4 text-[11.5px] leading-relaxed text-t3">
          <p className="flex items-center gap-1.5 font-semibold text-t1"><Clock className="h-3.5 w-3.5" /> Ma’lumotlar siyosati</p>
          <p className="mt-1.5">To‘lovsiz hisob ma’lumotlari {DATA_RETENTION_DAYS} kun saqlanadi. Istalgan vaqtda Excel/CSV/PDF eksport qilish mumkin. Hisobni o‘chirish uchun <Link href="/contact" className="text-accent hover:underline">qo‘llab-quvvatlash</Link>ga yozing.</p>
        </div>
      </section>
    </div>
  );
}
