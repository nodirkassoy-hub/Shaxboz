'use client';
import { useMemo, useState } from 'react';
import { Sparkles, ScanText, Tags, Copy, AlertOctagon, Wallet, PackageSearch, BellRing, FileBarChart, ShieldCheck, Upload, CheckCircle2, ArrowRight, Wand2 } from 'lucide-react';
import { useApp } from '@/lib/store';
import { scopeOf, anomalies, duplicateBills, stockRows, arAging, cashForecast } from '@/lib/analytics';
import { insightCards } from '@/lib/ai';
import { Card, CardHeader, PageHeader, Badge, Button, Modal, Field, Input, Select, cx, Tabs, DemoTag, Money } from '@/components/ui';
import { Chat, INSIGHT_META } from './Chat';
import { ACC, CHART } from '@/lib/core/coa';
import { fmtDate, TODAY, addDays } from '@/lib/core/dates';
import { moneyC } from '@/lib/core/money';
import { byId } from '@/lib/db';

export default function AiPage() {
  const { db, filters, openAi } = useApp();
  const [tab, setTab] = useState<'chat' | 'insights' | 'automation'>('chat');
  const s = useMemo(() => scopeOf(db, filters), [db, filters]);
  const cards = useMemo(() => insightCards(db, s, filters.currency, { from: filters.from, to: filters.to }), [db, s, filters]);
  const [prompt, setPrompt] = useState<string | undefined>();

  return (
    <div>
      <PageHeader title={<span className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white"><Sparkles className="h-5 w-5" /></span>AI CFO</span>}
        subtitle="Kompaniya ma’lumotlarini tushunadigan moliyaviy tahlilchi. Fakt, taxmin va tavsiya har doim ajratiladi."
        actions={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'chat', label: 'Suhbat' }, { id: 'insights', label: 'Insightlar', count: cards.length }, { id: 'automation', label: 'Avtomatlashtirish' }]} />} />

      {tab === 'chat' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <Card pad={false} className="h-[calc(100vh-230px)] min-h-[560px] overflow-hidden"><Chat key={prompt} initialPrompt={prompt} /></Card>
          <div className="space-y-3">
            <p className="px-1 text-[11.5px] font-semibold uppercase tracking-wider text-t3">Bugungi insightlar</p>
            {cards.slice(0, 5).map((c, i) => <InsightCard key={i} c={c} onAsk={() => setPrompt(c.prompt + ' ')} />)}
          </div>
        </div>
      )}
      {tab === 'insights' && <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map((c, i) => <InsightCard key={i} c={c} onAsk={() => openAi(c.prompt)} />)}</div>}
      {tab === 'automation' && <Automation />}
    </div>
  );
}

function InsightCard({ c, onAsk }: { c: ReturnType<typeof insightCards>[number]; onAsk: () => void }) {
  const meta = INSIGHT_META[c.type];
  return (
    <Card hover onClick={onAsk} className="!p-4">
      <div className="mb-2 flex items-center justify-between"><span className={cx('rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold', meta.tone)}>{meta.label}</span><DemoTag kind={c.kind === 'fact' ? 'fact' : c.kind === 'estimate' ? 'estimate' : 'rec'} /></div>
      <p className="text-[13.5px] font-semibold leading-snug text-t1">{c.title}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-t2">{c.body}</p>
      <p className="mt-2.5 flex items-center gap-1 text-[12px] font-medium text-accent">Batafsil so‘rash <ArrowRight className="h-3.5 w-3.5" /></p>
    </Card>
  );
}

// ─── AI Automation center ─────────────────────────────────────
function Automation() {
  const { db, filters, dispatch, go } = useApp();
  const s = useMemo(() => scopeOf(db, filters), [db, filters]);
  const an = useMemo(() => anomalies(db, s).slice(0, 5), [db, s]);
  const dups = useMemo(() => duplicateBills(db, s), [db, s]);
  const low = useMemo(() => stockRows(db, s).filter((r) => r.status === 'low' || (Number.isFinite(r.cover) && r.cover < 21)), [db, s]);
  const ag = useMemo(() => arAging(db, s), [db, s]);
  const f = useMemo(() => cashForecast(db, s, 30), [db, s]);
  const [extract, setExtract] = useState(false);
  const [cat, setCat] = useState<string | null>(null);

  // Transaction categorization: entries booked to generic office account with keywords suggesting another category
  const recat = useMemo(() => {
    const rules: [RegExp, string][] = [[/mebel|jihoz/i, '0190'], [/reklama|marketing/i, '9411'], [/internet|aloqa/i, '9424'], [/yoqilg|benzin|tashish/i, '9412']];
    return db.entries.filter((e) => s.companyIds.includes(e.companyId) && e.status === 'posted' && e.date >= addDays(TODAY, -45) && e.lines.some((l) => l.account === '9426' && l.debit > 0))
      .map((e) => { const r = rules.find(([re]) => re.test(e.memo)); return r ? { e, to: r[1], from: '9426', amount: e.lines.find((l) => l.account === '9426')!.debit } : null; }).filter(Boolean) as { e: typeof db.entries[number]; to: string; from: string; amount: number }[];
  }, [db, s]);

  const propose = (title: string, description: string, action: string, data: Record<string, unknown>, amount?: number, approverRole: 'cfo' | 'chief_accountant' | 'purchasing_manager' = 'chief_accountant', companyId = 'trd') => {
    dispatch('approval.request', { kind: 'ai_action', title: `AI taklifi: ${title}`, description, amount, companyId, approverRole, deadline: addDays(TODAY, 3), payload: { action, data } }, { success: 'Tasdiqlash markaziga yuborildi' });
  };

  const tiles = [
    { icon: ScanText, title: 'Hisob-faktura ma’lumotlarini ajratish', status: 'Demo (OCR ulanmagan)', body: 'Yuklangan hisob-faktura faylidan ta’minotchi, STIR, summa, QQS maydonlarini ajratib, qoralama hujjat tayyorlash.', action: <Button size="xs" icon={<Upload className="h-3 w-3" />} onClick={() => setExtract(true)}>Faylni sinash</Button> },
    { icon: Tags, title: 'Tranzaksiyalarni tasniflash', status: `${recat.length} ta taklif`, body: 'Umumiy “Ofis xarajatlari” hisobiga yozilgan, lekin izohiga ko‘ra boshqa kategoriyaga tegishli operatsiyalar.', action: recat.length ? <Button size="xs" onClick={() => setCat(recat[0].e.id)}>Ko‘rib chiqish</Button> : <Badge tone="pos">Hammasi to‘g‘ri</Badge> },
    { icon: Copy, title: 'Takroriy hisob-fakturalarni aniqlash', status: dups.length ? `${dups.length} ta shubhali juftlik` : 'Topilmadi', body: 'Bir ta’minotchidan 10 kun ichida bir xil summadagi hisob-fakturalar.', action: dups.length ? <Button size="xs" onClick={() => go('finance', 'ap')}>Ko‘rish</Button> : <Badge tone="pos">Toza</Badge> },
    { icon: AlertOctagon, title: 'G‘ayrioddiy xarajatlarni aniqlash', status: `${an.length} ta signal`, body: an[0] ? `${an[0].memo} — ${moneyC(an[0].amount)} (odatiydan ${an[0].ratio.toFixed(1)}×)` : 'Signal yo‘q', action: <Button size="xs" onClick={() => go('accounting', 'journal', { q: an[0]?.no || '' })}>Provodkani ochish</Button> },
    { icon: Wallet, title: 'Pul oqimi ogohlantirishlari', status: 'Taxminiy', body: `30 kunlik eng past nuqta: ${moneyC(f.min.balance)} (${fmtDate(f.min.date)}).`, action: <Button size="xs" onClick={() => go('finance', 'treasury')}>Prognoz</Button> },
    { icon: PackageSearch, title: 'Kam zaxirani bashorat qilish', status: `${low.length} ta pozitsiya`, body: low.slice(0, 3).map((r) => `${r.p.name} (~${Math.max(0, Math.round(r.cover))} kun)`).join(', ') || 'Xavf yo‘q', action: low[0] ? <Button size="xs" onClick={() => { const r = low[0]; const wh = db.warehouses.find((w) => w.companyId === r.p.companyId && (r.p.kind === 'raw' ? w.kind === 'raw' : w.kind === 'goods'))!; propose(`Xarid so‘rovi: ${r.p.name}`, `Kunlik sarf ~${r.daily.toFixed(0)} ${r.p.unit}, mavjud ${Math.round(r.available)}.`, 'ai_purchase', { date: TODAY, expectedDate: addDays(TODAY, r.p.leadDays || 7), companyId: r.p.companyId, branchId: wh.branchId, warehouseId: wh.id, supplierId: r.p.supplierId, lines: [{ productId: r.p.id, description: r.p.name, qty: r.p.reorderQty, price: r.p.stdCost, discount: 0, vat: 12 }], requestedBy: 'AI CFO' }, r.p.reorderQty * r.p.stdCost * 1.12, 'purchasing_manager', r.p.companyId); }}>Xarid taklif qilish</Button> : null },
    { icon: BellRing, title: 'To‘lov eslatmalari', status: `${ag.rows.filter((r) => r.overdue > 0).length} ta muddati o‘tgan`, body: `Muddati o‘tgan debitorlik: ${moneyC(ag.overdue)}. Eslatmalar tasdiqlangach navbatga qo‘yiladi (email ulanmagan).`, action: <Button size="xs" onClick={() => { const ids = ag.rows.filter((r) => r.overdue > 0).map((r) => r.inv.id); propose(`${ids.length} ta to‘lov eslatmasi`, 'Muddati o‘tgan hisob-fakturalar bo‘yicha eslatmalar.', 'ai_reminders', { invoiceIds: ids }, ag.overdue, 'chief_accountant', filters.companyId === 'all' ? 'trd' : filters.companyId); }}>Eslatmalarni taklif qilish</Button> },
    { icon: FileBarChart, title: 'Hisobot va moliyaviy xulosa', status: 'Tayyor', body: 'Davr uchun avtomatik moliyaviy xulosa: foyda, pul, xavflar.', action: <Button size="xs" onClick={() => useApp.getState().openAi('Biznesning umumiy holati qanday?')}>Xulosa olish</Button> },
  ];

  return (
    <div className="space-y-4">
      <Card className="!p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-pos" /><div><p className="text-[13.5px] font-semibold text-t1">Inson nazorati kafolati</p><p className="mt-0.5 text-[12.5px] leading-relaxed text-t2">AI hech qachon buxgalteriya yozuvlarini o‘zi o‘zgartirmaydi. Moliyaviy ta’siri bor har qanday taklif avval <button className="font-medium text-accent" onClick={() => go('approvals')}>Tasdiqlash markaziga</button> tushadi va faqat vakolatli shaxs tasdiqlagandan keyin provodka yaratiladi. Har bir qaror audit jurnaliga yoziladi.</p></div></div></Card>
      <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => { const I = t.icon; return (
          <Card key={t.title} className="flex flex-col !p-4">
            <div className="mb-3 flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><I className="h-4.5 w-4.5" /></span><Badge tone="neutral">{t.status}</Badge></div>
            <p className="text-[13.5px] font-semibold text-t1">{t.title}</p>
            <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-t2">{t.body}</p>
            <div className="mt-3">{t.action}</div>
          </Card>
        ); })}
      </div>
      <ExtractModal open={extract} onClose={() => setExtract(false)} />
      {cat && (() => { const r = recat.find((x) => x.e.id === cat)!; return (
        <Modal open onClose={() => setCat(null)} title="Qayta tasniflash taklifi" icon={<Wand2 className="h-4 w-4" />}
          footer={<><Button variant="ghost" onClick={() => setCat(null)}>Bekor qilish</Button><Button variant="primary" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => { propose(`Qayta tasniflash: ${r.e.no}`, `${ACC[r.from].name} → ${ACC[r.to].name}: ${r.e.memo}`, 'ai_recategorize', { entryId: r.e.id, from: r.from, to: r.to, costCenter: 'Ma’muriyat' }, r.amount, 'chief_accountant', r.e.companyId); setCat(null); }}>Tasdiqlashga yuborish</Button></>}>
          <div className="space-y-3 text-[13px]">
            <div className="rounded-xl border border-line bg-surface-2 p-3"><p className="text-t3">{r.e.no} · {fmtDate(r.e.date)}</p><p className="mt-0.5 font-medium text-t1">{r.e.memo}</p><p className="num mt-1 text-t1"><Money v={r.amount} compact={false} /></p></div>
            <div className="flex items-center gap-2"><Badge tone="neg">{r.from} {ACC[r.from].name}</Badge><ArrowRight className="h-4 w-4 text-t3" /><Badge tone="pos">{r.to} {ACC[r.to].name}</Badge></div>
            <p className="rounded-xl border border-accent/25 bg-accent-soft p-3 text-[12.5px] text-t2"><b className="text-accent">TAVSIYA:</b> izohda “mebel/jihoz” so‘zi bor. Summasi sezilarli bo‘lsa, bu asosiy vosita sifatida kapitallashtirilishi mumkin. Qaror buxgalter tomonidan qabul qilinadi.</p>
            <p className="text-[11.5px] text-t3">Tasdiqlansa: tuzatuvchi provodka (Dt {r.to} / Kt {r.from}) joriy sanada yaratiladi. Asl provodka o‘zgarmaydi.</p>
          </div>
        </Modal>
      ); })()}
    </div>
  );
}

function ExtractModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, dispatch } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const sup = db.parties.find((p) => p.id === 's12')!;
  const [form, setForm] = useState({ supplierId: sup.id, ref: 'SF-48812', net: 9_800_000, vat: 12, account: '9424', memo: 'Internet va telefoniya — oktyabr' });
  const reset = () => { setFile(null); setStep('upload'); onClose(); };
  return (
    <Modal open={open} onClose={reset} title="Hisob-fakturadan ma’lumot ajratish" subtitle="Demo: haqiqiy OCR/AI modeli ulanmagan — maydonlar namunaviy tarzda to‘ldiriladi va siz tekshirasiz." icon={<ScanText className="h-4 w-4" />} size="md"
      footer={step === 'review' ? <><Button variant="ghost" onClick={() => setStep('upload')}>Orqaga</Button><Button variant="primary" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => { const s = byId(db.parties, form.supplierId)!; dispatch('approval.request', { kind: 'expense', title: `AI ajratgan hisob-faktura: ${s.name} ${form.ref}`, description: `${form.memo}. Fayl: ${file?.name}`, amount: Math.round(form.net * (1 + form.vat / 100)), companyId: 'trd', approverRole: 'chief_accountant', deadline: addDays(TODAY, 2), payload: { action: 'approve_expense', data: { account: form.account, supplierId: form.supplierId, net: form.net, costCenter: 'Ma’muriyat', memo: form.memo } } }, { success: 'Qoralama tasdiqlashga yuborildi' }); reset(); }}>Tasdiqlashga yuborish</Button></> : undefined}>
      {step === 'upload' ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-2 px-6 py-12 text-center hover:border-accent">
          <Upload className="mb-3 h-8 w-8 text-t3" /><span className="text-[13.5px] font-semibold text-t1">PDF, JPG yoki PNG faylni tanlang</span><span className="mt-1 text-[12px] text-t3">Fayl brauzerdan tashqariga yuborilmaydi</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setTimeout(() => setStep('review'), 700); } }} />
          {file && <span className="mt-3 flex items-center gap-2 text-[12.5px] text-accent"><span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />“{file.name}” tahlil qilinmoqda…</span>}
        </label>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-pos/25 bg-pos/[.06] px-3 py-2 text-[12.5px] text-t1"><CheckCircle2 className="h-4 w-4 text-pos" /> {file?.name} — 6 ta maydon aniqlandi (ishonch: namunaviy)</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ta’minotchi"><Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>{db.parties.filter((p) => p.kind === 'supplier').map((p) => <option key={p.id} value={p.id}>{p.name} · {p.stir}</option>)}</Select></Field>
            <Field label="Hisob-faktura №"><Input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} /></Field>
            <Field label="Summa (QQSsiz)"><Input type="number" value={form.net} onChange={(e) => setForm({ ...form, net: +e.target.value })} /></Field>
            <Field label="QQS stavkasi, %"><Input type="number" value={form.vat} onChange={(e) => setForm({ ...form, vat: +e.target.value })} /></Field>
            <Field label="Xarajat hisobi (AI taklifi)" className="sm:col-span-2"><Select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>{CHART.filter((a) => a.type === 'expense').map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</Select></Field>
            <Field label="Izoh" className="sm:col-span-2"><Input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} /></Field>
          </div>
          <p className="text-[11.5px] text-t3">Jami: <b className="num text-t1">{moneyC(Math.round(form.net * (1 + form.vat / 100)))}</b>. Tasdiqlangandan so‘ng: Dt {form.account} + Dt 4410 (QQS) / Kt 6010.</p>
        </div>
      )}
    </Modal>
  );
}
