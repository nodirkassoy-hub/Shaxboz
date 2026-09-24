'use client';
import { useMemo, useState } from 'react';
import { Plus, Receipt, Wallet, Bell, FileMinus, ArrowLeftRight, Landmark, CalendarDays, Target, Wand2, Check, X, Upload, AlertTriangle, TrendingUp, BookPlus, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, BarChart, Cell } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId, invOpen, billOpen, docTotals, lineNet } from '@/lib/db';
import { balances, accountBalance } from '@/lib/core/ledger';
import { ACC, CHART } from '@/lib/core/coa';
import { fmtDate, TODAY, addDays, diffDays, monthLabel, monthKey, monthStart, monthEnd, MONTHS_UZ } from '@/lib/core/dates';
import { DEMO_RATES } from '@/lib/core/money';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, Explain, DemoTag, Drawer, Stat, Segmented, Progress, Textarea } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { ChartTooltip, useChartFmt, PALETTE, Legend } from '@/components/ui/charts';
import { InvoiceForm, ReceiptForm, SupplierPaymentForm, BillForm } from './forms';
import { can } from '@/lib/rbac';
import { invStatus } from '@/lib/db';
import type { Invoice } from '@/lib/types';
import { ImportWizard } from './ImportWizard';

type Tab = 'ar' | 'ap' | 'payments' | 'treasury' | 'bank' | 'budget';

export default function Finance() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'ar');
  return (
    <div>
      <PageHeader title="Moliya va g‘aznachilik" crumbs={['Moliya']} subtitle={<span className="flex items-center gap-2">Debitorlik, kreditorlik, to‘lovlar, pul prognozi, bank va byudjet <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'ar', label: 'Debitorlik', icon: <Receipt className="h-3.5 w-3.5" /> }, { id: 'ap', label: 'Kreditorlik', icon: <CalendarDays className="h-3.5 w-3.5" /> }, { id: 'payments', label: 'To‘lovlar' }, { id: 'treasury', label: 'G‘aznachilik', icon: <Wallet className="h-3.5 w-3.5" /> }, { id: 'bank', label: 'Bank rekonsiliatsiyasi', icon: <ArrowLeftRight className="h-3.5 w-3.5" /> }, { id: 'budget', label: 'Byudjet', icon: <Target className="h-3.5 w-3.5" /> }]} />
      {tab === 'ar' && <Receivables />}{tab === 'ap' && <Payables />}{tab === 'payments' && <Payments />}{tab === 'treasury' && <Treasury />}{tab === 'bank' && <BankRec />}{tab === 'budget' && <Budget />}
    </div>
  );
}

// ─── AR ──────────────────────────────────────────────────────
function Receivables() {
  const { db, s, m, mf } = useCtx(); const { nav, role, dispatch } = useApp();
  const [newInv, setNewInv] = useState(nav.params?.new === '1'); const [pay, setPay] = useState<string | null | undefined>(undefined); const [view, setView] = useState<Invoice | null>(nav.params?.invoice ? byId(db.invoices, nav.params.invoice) || null : null);
  const [filter, setFilter] = useState<'all' | 'open' | 'overdue' | 'paid' | 'cn'>(nav.params?.customer ? 'open' : 'open'); const [sel, setSel] = useState<Set<string>>(new Set());
  const [cust, setCust] = useState(nav.params?.customer || '');
  const ag = useMemo(() => A.arAging(db, s), [db, s]);
  const rows = useMemo(() => db.invoices.filter((i) => A.inScope(s, i.companyId, i.branchId) && (!cust || i.customerId === cust) && (filter === 'all' ? true : filter === 'cn' ? i.kind === 'credit_note' : i.kind === 'sales' && (filter === 'open' ? invOpen(i) > 0 : filter === 'overdue' ? invStatus(i, TODAY) === 'overdue' : invOpen(i) <= 0))).slice().reverse(), [db, s, filter, cust]);
  const data = A.BUCKETS.map((b, i) => ({ name: b.label, v: ag.buckets[b.id], c: ['#10b981', '#f59e0b', '#f97316', '#ef4444'][i] }));
  const f = useChartFmt();
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Jami debitorlik" value={m(ag.total)} sub={`${ag.rows.length} ta ochiq hisob-faktura`} explain={['Debitorlik', 'mijozlar hali to‘lamagan summalar (QQS bilan).']} />
        {A.BUCKETS.map((b, i) => <Stat key={b.id} label={b.label} value={m(ag.buckets[b.id])} tone={i === 0 ? undefined : i === 1 ? 'warn' : 'neg'} sub={`${ag.total ? ((ag.buckets[b.id] / ag.total) * 100).toFixed(0) : 0}%`} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Qarzdorlik yoshi (aging)" subtitle={`DSO: ${A.dso(db, s).toFixed(0)} kun`} />
          <div className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}><CartesianGrid horizontal={false} /><XAxis type="number" tickFormatter={f.axis} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={96} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="v" name="Summa" radius={[0, 6, 6, 0]}>{data.map((d) => <Cell key={d.name} fill={d.c} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="lg:col-span-2"><CardHeader title="Mijozlar kesimida" subtitle="Muddati o‘tgan qarz bo‘yicha saralangan" actions={<ExportButton module="finance" name="debitorlik-aging" title="Debitorlik yoshi (aging)" cols={[{ key: 'c', label: 'Mijoz' }, { key: 'cur', label: 'Joriy', type: 'money' }, { key: 'd30', label: '1–30', type: 'money' }, { key: 'd60', label: '31–60', type: 'money' }, { key: 'd60p', label: '60+', type: 'money' }, { key: 't', label: 'Jami', type: 'money' }]} rows={() => ag.customers.map((c) => ({ c: c.customer, cur: c.b.current, d30: c.b.d30, d60: c.b.d60, d60p: c.b.d60p, t: c.total }))} />} />
          <div className="thin-scroll max-h-[220px] overflow-auto"><table className="w-full min-w-[640px] text-[12.5px] [&_td]:whitespace-nowrap [&_td]:px-1"><thead className="sticky top-0 bg-surface-solid text-[11px] text-t3"><tr><th className="py-1.5 text-left font-semibold">Mijoz</th>{['Joriy', '1–30', '31–60', '60+', 'Jami'].map((h) => <th key={h} className="py-1.5 text-right font-semibold">{h}</th>)}<th /></tr></thead>
            <tbody>{[...ag.customers].sort((a, b) => (b.total - b.b.current) - (a.total - a.b.current)).map((c) => <tr key={c.id} className="border-t border-line hover:bg-surface-2"><td className="py-1.5"><button className="text-left text-t1 hover:text-accent" onClick={() => { setCust(c.id); setFilter('open'); }}>{c.customer}</button></td><td className="num text-right text-t2">{c.b.current ? m(c.b.current) : ''}</td><td className="num text-right text-warn">{c.b.d30 ? m(c.b.d30) : ''}</td><td className="num text-right text-orange-500">{c.b.d60 ? m(c.b.d60) : ''}</td><td className="num text-right text-neg">{c.b.d60p ? m(c.b.d60p) : ''}</td><td className="num text-right font-semibold">{m(c.total)}</td><td className="pl-2 text-right">{c.total - c.b.current > 0 && can(role, 'finance', 'create') && <Button size="xs" variant="ghost" icon={<Bell className="h-3 w-3" />} onClick={() => dispatch('inv.remind', { ids: ag.rows.filter((r) => r.customer.id === c.id && r.overdue > 0).map((r) => r.inv.id) }, { success: `${c.customer}: eslatma navbatga qo‘yildi (email ulanmagan)` })}>Eslatma</Button>}</td></tr>)}</tbody></table></div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Hisob-fakturalar" subtitle={cust ? <span>Filtr: {byId(db.parties, cust)?.name} <button className="ml-1 text-accent" onClick={() => setCust('')}>× tozalash</button></span> : 'Sotuv hisob-fakturalari va kredit-notalar'} icon={<Receipt className="h-4 w-4" />}
          actions={<>{can(role, 'finance', 'create') && <><Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewInv(true)}>Hisob-faktura</Button><Button icon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setPay(null)}>To‘lov qabul qilish</Button></>}
            <ExportButton module="finance" name="hisob-fakturalar" title="Hisob-fakturalar" cols={[{ key: 'no', label: '№' }, { key: 'd', label: 'Sana' }, { key: 'c', label: 'Mijoz' }, { key: 'due', label: 'Muddat' }, { key: 't', label: 'Jami', type: 'money' }, { key: 'o', label: 'Qoldiq', type: 'money' }, { key: 's', label: 'Holat' }]} rows={() => rows.map((i) => ({ no: i.no, d: fmtDate(i.date), c: byId(db.parties, i.customerId)?.name, due: fmtDate(i.dueDate), t: i.total, o: invOpen(i), s: invStatus(i, TODAY) }))} /></>} />
        <DataTable rows={rows} rowKey={(i) => i.id} onRow={setView} search={(i) => `${i.no} ${byId(db.parties, i.customerId)?.name}`} searchPlaceholder="№ yoki mijoz…" selectable={filter === 'overdue' || filter === 'open'} selected={sel} onSelect={setSel}
          toolbar={<><Segmented size="xs" value={filter} onChange={(v) => { setFilter(v); setSel(new Set()); }} options={[{ id: 'open', label: 'Ochiq' }, { id: 'overdue', label: 'Muddati o‘tgan' }, { id: 'paid', label: 'To‘langan' }, { id: 'cn', label: 'Kredit-nota' }, { id: 'all', label: 'Barchasi' }]} />{sel.size > 0 && <Button size="xs" variant="soft" icon={<Bell className="h-3 w-3" />} onClick={() => { dispatch('inv.remind', { ids: [...sel] }, { success: `${sel.size} ta eslatma navbatga qo‘yildi (email integratsiyasi ulanmagan)` }); setSel(new Set()); }}>Eslatma ({sel.size})</Button>}</>}
          cols={[
            { key: 'no', header: '№', primary: true, cell: (i) => <span className="font-mono text-[12px]">{i.no}</span> },
            { key: 'c', header: 'Mijoz', cell: (i) => <span className="line-clamp-1">{byId(db.parties, i.customerId)?.name}</span> },
            { key: 'd', header: 'Sana', cell: (i) => fmtDate(i.date), sort: (i) => i.date },
            { key: 'due', header: 'Muddat', cell: (i) => <span className={cx(invStatus(i, TODAY) === 'overdue' && 'text-neg')}>{fmtDate(i.dueDate)}{invStatus(i, TODAY) === 'overdue' && <span className="ml-1 text-[11px]">({diffDays(TODAY, i.dueDate)} k)</span>}</span>, sort: (i) => i.dueDate },
            { key: 't', header: 'Jami', align: 'right', cell: (i) => mf(i.total), sort: (i) => i.total },
            { key: 'o', header: 'Qoldiq', align: 'right', cell: (i) => (i.kind === 'credit_note' ? '—' : <b className={cx('font-semibold', invOpen(i) > 0 ? 'text-t1' : 'text-t3')}>{mf(invOpen(i))}</b>), sort: (i) => invOpen(i) },
            { key: 's', header: 'Holat', cell: (i) => i.kind === 'credit_note' ? <Badge tone="info">Kredit-nota</Badge> : <StatusBadge status={invStatus(i, TODAY)} /> },
          ]} />
      </Card>
      {newInv && <InvoiceForm onClose={() => setNewInv(false)} customerId={cust || undefined} />}
      {pay !== undefined && <ReceiptForm onClose={() => setPay(undefined)} invoiceId={pay || undefined} />}
      {view && <InvoiceDrawer inv={view} onClose={() => setView(null)} onPay={() => { setPay(view.id); setView(null); }} />}
    </div>
  );
}

function InvoiceDrawer({ inv, onClose, onPay }: { inv: Invoice; onClose: () => void; onPay: () => void }) {
  const { db, mf } = useCtx(); const { role, dispatch, go } = useApp();
  const [cn, setCn] = useState(false); const [amt, setAmt] = useState(0); const [reason, setReason] = useState('Chegirma / qaytarish');
  const i = byId(db.invoices, inv.id) || inv;
  const cust = byId(db.parties, i.customerId)!; const co = byId(db.companies, i.companyId)!;
  const pays = db.payments.filter((p) => p.allocations.some((a) => a.docId === i.id));
  const cns = db.invoices.filter((x) => x.relatedId === i.id);
  const so = byId(db.salesOrders, i.soId);
  const print = () => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<html><head><title>${i.no}</title><style>body{font:13px Inter,Arial;margin:40px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left}.r{text-align:right}.h{display:flex;justify-content:space-between}.demo{color:#b45309;font-size:11px}</style></head><body><div class="h"><div><b style="font-size:18px">HISOB-FAKTURA ${i.no}</b><div>${fmtDate(i.date)}</div></div><div class="demo">DEMO — rasmiy e-hisob-faktura emas (operator ulanmagan)</div></div><p><b>Sotuvchi:</b> ${co.legalName}, STIR ${co.stir}, MFO ${co.mfo}, h/r ${co.bankAccount}<br><b>Xaridor:</b> ${cust.name}, STIR ${cust.stir}</p><table><tr><th>Nomi</th><th class="r">Miqdor</th><th class="r">Narx</th><th class="r">QQSsiz</th><th class="r">QQS</th></tr>${i.lines.map((l) => `<tr><td>${l.description}</td><td class="r">${l.qty}</td><td class="r">${Math.round(l.price).toLocaleString('ru-RU')}</td><td class="r">${lineNet(l).toLocaleString('ru-RU')}</td><td class="r">${l.vat}%</td></tr>`).join('')}</table><p class="r">QQSsiz: ${i.net.toLocaleString('ru-RU')} · QQS: ${i.vat.toLocaleString('ru-RU')} · <b>Jami: ${i.total.toLocaleString('ru-RU')} so‘m</b></p><p>To‘lov muddati: ${fmtDate(i.dueDate)}</p><script>print()</script></body></html>`); w.document.close(); };
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={`${i.kind === 'credit_note' ? 'Kredit-nota' : 'Hisob-faktura'} ${i.no}`} subtitle={<span className="flex items-center gap-2">{cust.name} · {co.short} <StatusBadge status={i.kind === 'credit_note' ? 'paid' : invStatus(i, TODAY)} /></span>}
      footer={<><Button icon={<Printer className="h-3.5 w-3.5" />} onClick={print}>Chop etish</Button>{i.kind === 'sales' && invOpen(i) > 0 && can(role, 'finance', 'create') && <><Button icon={<Bell className="h-3.5 w-3.5" />} onClick={() => dispatch('inv.remind', { ids: [i.id] }, { success: 'Eslatma navbatga qo‘yildi' })}>Eslatma</Button><Button icon={<FileMinus className="h-3.5 w-3.5" />} onClick={() => { setAmt(Math.min(invOpen(i), Math.round(i.total * 0.05))); setCn(true); }}>Kredit-nota</Button><Button variant="primary" icon={<Wallet className="h-3.5 w-3.5" />} onClick={onPay}>To‘lov qabul qilish</Button></>}</>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Jami', i.total], ['To‘langan', i.paid], ['Kredit-nota', i.credited], ['Qoldiq', i.kind === 'sales' ? invOpen(i) : 0]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[14px] font-semibold text-t1">{mf(v as number)}</p></div>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Sana</span><span className="text-t1">{fmtDate(i.date)}</span><span className="text-t3">To‘lov muddati</span><span className="text-t1">{fmtDate(i.dueDate)}</span><span className="text-t3">Mijoz STIR</span><span className="text-t1">{cust.stir}</span>{so && <><span className="text-t3">Buyurtma</span><button className="text-left text-accent" onClick={() => go('sales', 'orders', { order: so.id })}>{so.no}</button></>}{i.projectId && <><span className="text-t3">Loyiha</span><span className="text-t1">{byId(db.projects, i.projectId)?.code}</span></>}</div>
      <table className="mt-4 w-full text-[12.5px]"><thead className="bg-surface-2 text-t3"><tr><th className="px-2 py-1.5 text-left font-semibold">Nomi</th><th className="px-2 py-1.5 text-right font-semibold">Miqdor</th><th className="px-2 py-1.5 text-right font-semibold">Narx</th><th className="px-2 py-1.5 text-right font-semibold">Summa</th></tr></thead><tbody>{i.lines.map((l, k) => <tr key={k} className="border-t border-line"><td className="px-2 py-1.5">{l.description}{l.discount ? <span className="ml-1 text-[11px] text-t3">(−{l.discount}%)</span> : null}</td><td className="num px-2 text-right">{l.qty.toLocaleString('ru-RU')}</td><td className="num px-2 text-right">{mf(l.price)}</td><td className="num px-2 text-right">{mf(lineNet(l))}</td></tr>)}</tbody><tfoot className="text-[12.5px]"><tr><td colSpan={3} className="px-2 pt-2 text-right text-t3">QQS</td><td className="num px-2 pt-2 text-right">{mf(i.vat)}</td></tr><tr className="font-semibold"><td colSpan={3} className="px-2 text-right">Jami</td><td className="num px-2 text-right">{mf(i.total)}</td></tr></tfoot></table>
      <h4 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Tarix</h4>
      <div className="space-y-1.5 text-[12.5px]">
        <div className="flex gap-2"><span className="w-20 text-t3">{fmtDate(i.date)}</span><span>Hisob-faktura yaratildi va provodka qilindi</span></div>
        {pays.map((p) => <div key={p.id} className="flex gap-2"><span className="w-20 text-t3">{fmtDate(p.date)}</span><span className="text-pos">To‘lov {p.no}: {mf(p.allocations.find((a) => a.docId === i.id)!.amount)}</span></div>)}
        {cns.map((c) => <div key={c.id} className="flex gap-2"><span className="w-20 text-t3">{fmtDate(c.date)}</span><span className="text-sky-500">Kredit-nota {c.no}: {mf(c.total)} — {c.memo}</span></div>)}
        {i.reminders.map((r, k) => <div key={k} className="flex gap-2"><span className="w-20 text-t3">{fmtDate(r.date)}</span><span className="text-t2">Eslatma · {r.channel} · {r.status}</span></div>)}
      </div>
      <Modal open={cn} onClose={() => setCn(false)} title="Kredit-nota" subtitle="Provodka: Dt 9040 Qaytarish/chegirma + Dt 6411 QQS / Kt 4010" size="sm" footer={<><Button variant="ghost" onClick={() => setCn(false)}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('inv.credit', { invoiceId: i.id, amount: amt, reason }, { success: 'Kredit-nota yaratildi' }) !== undefined) setCn(false); }}>Yaratish</Button></>}>
        <div className="space-y-3"><Field label="Summa (QQS bilan)" hint={`Maksimum: ${mf(invOpen(i))}`}><Input type="number" value={amt || ''} onChange={(e) => setAmt(+e.target.value)} /></Field><Field label="Sabab"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>
      </Modal>
    </Drawer>
  );
}

// ─── AP ──────────────────────────────────────────────────────
function Payables() {
  const { db, s, m, mf } = useCtx(); const role = useApp((x) => x.role);
  const ap = useMemo(() => A.apSchedule(db, s), [db, s]);
  const [pay, setPay] = useState<string | null | undefined>(undefined); const [bill, setBill] = useState(false);
  const [month, setMonth] = useState(monthKey(TODAY));
  const cal = useMemo(() => { const m0 = month + '-01'; const days: { d: string; items: typeof ap.rows }[] = []; for (let d = m0; d <= monthEnd(m0); d = addDays(d, 1)) days.push({ d, items: ap.rows.filter((r) => r.bill.dueDate === d) }); return days; }, [ap, month]);
  const lead = (new Date(month + '-01T00:00:00Z').getUTCDay() + 6) % 7;
  const dups = useMemo(() => A.duplicateBills(db, s), [db, s]);
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Jami kreditorlik" value={m(ap.total)} sub={`${ap.rows.length} ta ochiq hisob`} />
        <Stat label="Muddati o‘tgan" value={m(ap.overdue)} tone="neg" /><Stat label="Bugun" value={m(ap.today)} tone="warn" /><Stat label="Shu hafta" value={m(ap.week)} /><Stat label="Keyinroq" value={m(ap.later)} />
      </div>
      {dups.length > 0 && <Card className="!p-3.5"><p className="flex items-center gap-2 text-[12.5px] text-warn"><AlertTriangle className="h-4 w-4" />AI: {dups.length} ta ehtimoliy takroriy hisob-faktura juftligi topildi — {dups.map((d) => `${byId(db.parties, d.a.supplierId)?.name} (${d.a.supplierRef} / ${d.b.supplierRef})`).join(', ')}</p></Card>}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader title="To‘lov kalendari" subtitle={monthLabel(month)} icon={<CalendarDays className="h-4 w-4" />} actions={<><Button size="xs" variant="ghost" onClick={() => setMonth(monthKey(addDays(month + '-01', -1)))} aria-label="Oldingi oy"><ChevronLeft className="h-3.5 w-3.5" /></Button><Button size="xs" variant="ghost" onClick={() => setMonth(monthKey(addDays(monthEnd(month + '-01'), 1)))} aria-label="Keyingi oy"><ChevronRight className="h-3.5 w-3.5" /></Button></>} />
          <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-semibold uppercase text-t3">{['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: lead }).map((_, i) => <div key={'e' + i} />)}
            {cal.map((c) => { const tot = c.items.reduce((a, r) => a + r.open, 0); const isToday = c.d === TODAY; const past = c.d < TODAY; return (
              <div key={c.d} title={c.items.map((r) => `${r.supplier.name}: ${mf(r.open)}`).join('\n')} className={cx('min-h-[62px] rounded-lg border p-1.5 text-left', isToday ? 'border-accent bg-accent-soft' : 'border-line', tot && past ? 'bg-neg/[.07]' : tot ? 'bg-surface-2' : '')}>
                <div className={cx('text-[11px] font-semibold', isToday ? 'text-accent' : 'text-t2')}>{+c.d.slice(8)}</div>
                {tot > 0 && <div className={cx('num mt-0.5 text-[10.5px] font-semibold leading-tight', past ? 'text-neg' : 'text-t1')}>{m(tot).replace(" so'm", '')}</div>}
                {c.items.length > 0 && <div className="text-[9.5px] text-t3">{c.items.length} ta</div>}
              </div>
            ); })}
          </div>
          <p className="mt-2 text-[11px] text-t3">Muddati o‘tganlar (qizil) ustuvor. To‘lov sanasi — hisob-faktura muddati.</p>
        </Card>
        <Card>
          <CardHeader title="Ochiq hisob-fakturalar" subtitle="Muddat bo‘yicha" actions={<>{can(role, 'finance', 'create') && <><Button size="sm" onClick={() => setBill(true)} icon={<Plus className="h-3.5 w-3.5" />}>Hisob kiritish</Button><Button size="sm" variant="primary" onClick={() => setPay(null)} icon={<Wallet className="h-3.5 w-3.5" />}>To‘lash</Button></>}<ExportButton module="finance" name="kreditorlik" title="Kreditorlik — to‘lov jadvali" cols={[{ key: 's', label: 'Ta’minotchi' }, { key: 'r', label: 'Hisob №' }, { key: 'due', label: 'Muddat' }, { key: 'o', label: 'Qoldiq', type: 'money' }]} rows={() => ap.rows.map((r) => ({ s: r.supplier.name, r: r.bill.supplierRef, due: fmtDate(r.bill.dueDate), o: r.open }))} /></>} />
          <DataTable rows={ap.rows} rowKey={(r) => r.bill.id} pageSize={9} dense onRow={(r) => can(role, 'finance', 'create') && setPay(r.bill.id)} search={(r) => `${r.supplier.name} ${r.bill.supplierRef}`}
            cols={[{ key: 's', header: 'Ta’minotchi', primary: true, cell: (r) => <span className="line-clamp-1">{r.supplier.name}</span> }, { key: 'r', header: 'Hisob', cell: (r) => <span className="text-[11.5px] text-t3">{r.bill.supplierRef}</span> }, { key: 'd', header: 'Muddat', cell: (r) => <span className={cx(r.days < 0 && 'text-neg', r.days === 0 && 'text-warn')}>{fmtDate(r.bill.dueDate)}</span>, sort: (r) => r.bill.dueDate }, { key: 'o', header: 'Qoldiq', align: 'right', cell: (r) => mf(r.open), sort: (r) => r.open }, { key: 'st', header: '', cell: (r) => <StatusBadge status={r.status} /> }]} />
        </Card>
      </div>
      {pay !== undefined && <SupplierPaymentForm onClose={() => setPay(undefined)} billId={pay || undefined} />}
      {bill && <BillForm onClose={() => setBill(false)} />}
    </div>
  );
}

function Payments() {
  const { db, s, from, to, mf } = useCtx();
  const [dir, setDir] = useState<'all' | 'in' | 'out'>('all');
  const rows = db.payments.filter((p) => A.inScope(s, p.companyId, p.branchId) && p.date >= from && p.date <= to && (dir === 'all' || p.direction === dir)).slice().reverse();
  return (
    <Card>
      <CardHeader title="To‘lovlar" subtitle={`${rows.length} ta · kirim ${mf(rows.filter((p) => p.direction === 'in').reduce((a, p) => a + p.amount, 0))} · chiqim ${mf(rows.filter((p) => p.direction === 'out').reduce((a, p) => a + p.amount, 0))}`} icon={<Wallet className="h-4 w-4" />} actions={<ExportButton module="finance" name="tolovlar" title="To‘lovlar" cols={[{ key: 'no', label: '№' }, { key: 'd', label: 'Sana' }, { key: 'p', label: 'Kontragent' }, { key: 'dir', label: 'Yo‘nalish' }, { key: 'a', label: 'Summa', type: 'money' }]} rows={() => rows.map((p) => ({ no: p.no, d: fmtDate(p.date), p: byId(db.parties, p.partyId)?.name, dir: p.direction === 'in' ? 'Kirim' : 'Chiqim', a: p.amount }))} />} />
      <DataTable rows={rows} rowKey={(p) => p.id} search={(p) => `${p.no} ${byId(db.parties, p.partyId)?.name} ${p.memo}`} toolbar={<Segmented size="xs" value={dir} onChange={setDir} options={[{ id: 'all', label: 'Barchasi' }, { id: 'in', label: 'Kirim' }, { id: 'out', label: 'Chiqim' }]} />}
        cols={[{ key: 'no', header: '№', primary: true, cell: (p) => <span className="font-mono text-[12px]">{p.no}</span> }, { key: 'd', header: 'Sana', cell: (p) => fmtDate(p.date), sort: (p) => p.date }, { key: 'p', header: 'Kontragent', cell: (p) => <span className="line-clamp-1">{byId(db.parties, p.partyId)?.name}</span> }, { key: 'acc', header: 'Hisob', cell: (p) => <span className="text-[11.5px] text-t3">{p.account} {p.method === 'cash' ? 'Kassa' : 'Bank'}</span> }, { key: 'al', header: 'Taqsimot', hideMobile: true, cell: (p) => <span className="text-[11.5px] text-t3">{p.allocations.length} ta hujjat</span> }, { key: 'a', header: 'Summa', align: 'right', cell: (p) => <b className={cx('font-semibold', p.direction === 'in' ? 'text-pos' : 'text-t1')}>{p.direction === 'in' ? '+' : '−'}{mf(p.amount)}</b>, sort: (p) => p.amount }]} />
    </Card>
  );
}

// ─── Treasury ────────────────────────────────────────────────
function Treasury() {
  const { db, s, m, mf } = useCtx(); const f = useChartFmt(); const { role } = useApp();
  const [h, setH] = useState<'30' | '60' | '90'>('30'); const [tr, setTr] = useState(false);
  const fc = useMemo(() => A.cashForecast(db, s, 90), [db, s]);
  const b = balances(db.entries, s, undefined, TODAY);
  const days = fc.days.slice(0, +h);
  const byWeek: { w: string; in: number; out: number; bal: number }[] = [];
  days.forEach((d, i) => { const k = Math.floor(i / 7); byWeek[k] ||= { w: `${fmtDate(d.date).slice(0, 5)}`, in: 0, out: 0, bal: 0 }; byWeek[k].in += d.inflow; byWeek[k].out -= d.outflow; byWeek[k].bal = d.balance; });
  const items = days.flatMap((d) => d.items.filter((x) => x.kind !== 'runrate').map((x) => ({ ...x, date: d.date }))).sort((a, b2) => (a.date < b2.date ? -1 : 1));
  const accounts = db.companies.filter((c) => s.companyIds.includes(c.id)).flatMap((c) => ['5110', '5010', '5210'].map((a) => ({ c, a, v: accountBalance(db.entries, c.id, a) })).filter((x) => x.v));
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pul qoldig‘i (bugun)" value={m(fc.start)} sub="kassa + bank" />
        <Stat label="30 kun (taxmin)" value={m(fc.d30.balance)} sub={<DemoTag kind="estimate" />} /><Stat label="60 kun (taxmin)" value={m(fc.d60.balance)} sub={<DemoTag kind="estimate" />} /><Stat label="90 kun (taxmin)" value={m(fc.d90.balance)} sub={<DemoTag kind="estimate" />} />
      </div>
      <Card>
        <CardHeader title={<span className="flex items-center">Pul oqimi prognozi<Explain term="Prognoz">TAXMINIY hisob: ochiq debitorlik (mijozning to‘lov odati va kechikish ehtimoli bilan), kreditorlik muddatlari, soliqlar, ish haqi va oxirgi 90 kunlik sur’at asosida. Kafolat emas.</Explain></span>} subtitle={`Haftalik kirim/chiqim va qoldiq · eng past nuqta ${m(fc.min.balance)} (${fmtDate(fc.min.date)})`} icon={<TrendingUp className="h-4 w-4" />} actions={<><Segmented size="xs" value={h} onChange={setH} options={[{ id: '30', label: '30 kun' }, { id: '60', label: '60 kun' }, { id: '90', label: '90 kun' }]} /><DemoTag kind="estimate" /></>} />
        <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={byWeek} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="w" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} labelFmt={(l) => `Hafta: ${l} dan`} />} /><ReferenceLine y={0} stroke="var(--border-strong)" /><Bar dataKey="in" name="Kirim" fill={PALETTE[1]} radius={[5, 5, 0, 0]} /><Bar dataKey="out" name="Chiqim" fill={PALETTE[4]} radius={[0, 0, 5, 5]} /><Area dataKey="bal" name="Qoldiq" type="monotone" stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.08} strokeWidth={2.2} /></ComposedChart></ResponsiveContainer></div>
        <Legend items={[{ label: 'Kutilayotgan kirim', color: PALETTE[1] }, { label: 'Kutilayotgan chiqim', color: PALETTE[4] }, { label: 'Qoldiq (taxmin)', color: PALETTE[0] }]} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Bank hisoblari va kassa" icon={<Landmark className="h-4 w-4" />} actions={can(role, 'finance', 'create') ? <Button size="xs" onClick={() => setTr(true)} icon={<ArrowLeftRight className="h-3 w-3" />}>O‘tkazma</Button> : undefined} />
          <div className="space-y-2">{accounts.map((x) => <div key={x.c.id + x.a} className="rounded-xl border border-line p-3"><div className="flex items-center justify-between"><span className="text-[12.5px] font-medium text-t1">{ACC[x.a].name}</span><span className="num text-[13px] font-semibold">{mf(x.v)}</span></div><p className="mt-0.5 text-[11px] text-t3">{x.c.name}{x.a === '5110' ? ` · MFO ${x.c.mfo} · ${x.c.bankAccount.slice(-9)}` : ''}{x.a === '5210' ? ` · ≈ $${Math.round(x.v / DEMO_RATES.USD).toLocaleString('en-US')}` : ''}</p></div>)}</div>
          <p className="mt-2 text-[11px] text-t3">Bank API ulanmagan — qoldiqlar bosh kitobdan. USD hisob demo kursda.</p>
        </Card>
        <Card className="lg:col-span-2"><CardHeader title="Kutilayotgan tushumlar va to‘lovlar" subtitle={`Keyingi ${h} kun`} icon={<CalendarDays className="h-4 w-4" />} />
          <DataTable rows={items} rowKey={(r) => r.date + r.label + r.amount} pageSize={10} dense cols={[{ key: 'd', header: 'Sana', cell: (r) => fmtDate(r.date) }, { key: 'l', header: 'Modda', primary: true, cell: (r) => <span className="line-clamp-1">{r.label}</span> }, { key: 'k', header: 'Tur', cell: (r) => <Badge tone={r.kind === 'ar' ? 'pos' : r.kind === 'tax' ? 'warn' : 'neutral'}>{{ ar: 'Debitorlik', ap: 'Kreditorlik', tax: 'Soliq', payroll: 'Ish haqi' }[r.kind] || r.kind}</Badge> }, { key: 'a', header: 'Summa', align: 'right', cell: (r) => <span className={r.amount > 0 ? 'text-pos' : 'text-t1'}>{r.amount > 0 ? '+' : '−'}{mf(Math.abs(r.amount))}</span> }]} />
        </Card>
      </div>
      {tr && <TransferForm onClose={() => setTr(false)} />}
    </div>
  );
}

function TransferForm({ onClose }: { onClose: () => void }) {
  const { db } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const [f, setF] = useState({ companyId: 'trd', from: '5010', to: '5110', amount: 0 });
  return (
    <Modal open onClose={onClose} size="sm" title="Ichki pul o‘tkazmasi" subtitle="Pul oqimi hisobotida hisoblanmaydi" footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('cash.transfer', { ...f, date: TODAY, branchId: byId(db.companies, f.companyId)!.branchIds[0] }, { success: 'O‘tkazma bajarildi' }) !== undefined) onClose(); }}>O‘tkazish</Button></>}>
      <div className="space-y-3"><Field label="Kompaniya"><Select value={f.companyId} onChange={(e) => setF({ ...f, companyId: e.target.value })}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Qayerdan" hint={`${Math.round(accountBalance(db.entries, f.companyId, f.from) / 1e6)} mln`}><Select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })}><option value="5010">Kassa</option><option value="5110">Bank</option></Select></Field><Field label="Qayerga"><Select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}><option value="5110">Bank</option><option value="5010">Kassa</option></Select></Field></div>
        <Field label="Summa"><Input type="number" value={f.amount || ''} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field></div>
    </Modal>
  );
}

// ─── Bank reconciliation ─────────────────────────────────────
function BankRec() {
  const { db, s, mf } = useCtx(); const { dispatch, role, filters } = useApp();
  const [co, setCo] = useState(filters.companyId === 'all' ? 'trd' : filters.companyId);
  const [book, setBook] = useState<string | null>(null); const [acc, setAcc] = useState('9431'); const [imp, setImp] = useState(false);
  const lines = db.bankLines.filter((b) => b.companyId === co).sort((a, b) => (a.date < b.date ? 1 : -1));
  const c = { m: lines.filter((l) => l.status === 'matched').length, s: lines.filter((l) => l.status === 'suggested').length, u: lines.filter((l) => l.status === 'unmatched').length };
  const stmtBal = accountBalance(db.entries, co, '5110');
  const unrec = lines.filter((l) => l.status !== 'matched').reduce((a, l) => a + l.amount, 0);
  const edit = can(role, 'finance', 'edit');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={co} onChange={setCo} options={db.companies.filter((x) => db.bankLines.some((b) => b.companyId === x.id)).map((x) => ({ id: x.id, label: x.name }))} />
        <div className="flex-1" />
        {edit && <><Button icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImp(true)}>Ko‘chirmani import qilish</Button><Button variant="primary" icon={<Wand2 className="h-3.5 w-3.5" />} onClick={() => { const n = dispatch<number>('bank.automatch', { companyId: co }); if (n !== undefined) useApp.getState().toast({ kind: n ? 'success' : 'info', title: n ? `${n} ta moslik taklif qilindi` : 'Yangi moslik topilmadi', body: n ? 'Takliflarni ko‘rib chiqib tasdiqlang.' : 'Qolganlarini qo‘lda provodka qiling.' }); }}>Auto-match</Button></>}
      </div>
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bosh kitob qoldig‘i (5110)" value={mf(stmtBal)} /><Stat label="Moslashtirilgan" value={String(c.m)} tone="pos" sub={`${lines.length} qatordan`} /><Stat label="Taklif (tasdiq kerak)" value={String(c.s)} tone="warn" /><Stat label="Moslanmagan" value={String(c.u)} tone="neg" sub={`sof ${mf(unrec)}`} />
      </div>
      <Card>
        <CardHeader title="Bank ko‘chirmasi ↔ tizim operatsiyalari" subtitle="Bank API ulanmagan: ko‘chirma demo sifatida yuklangan / CSV import orqali" icon={<ArrowLeftRight className="h-4 w-4" />} />
        <DataTable rows={lines} rowKey={(l) => l.id} pageSize={12} search={(l) => l.description}
          cols={[
            { key: 'd', header: 'Sana', cell: (l) => fmtDate(l.date), sort: (l) => l.date },
            { key: 'desc', header: 'Bank operatsiyasi', primary: true, cell: (l) => <span className="line-clamp-1">{l.description}</span> },
            { key: 'a', header: 'Summa', align: 'right', cell: (l) => <span className={l.amount > 0 ? 'text-pos' : 'text-t1'}>{l.amount > 0 ? '+' : '−'}{mf(Math.abs(l.amount))}</span> },
            { key: 'sys', header: 'Tizim operatsiyasi', cell: (l) => { const e = byId(db.entries, l.matchEntryId || l.suggestedEntryId); return e ? <span className="line-clamp-1 text-[12px] text-t2"><span className="font-mono text-t3">{e.no}</span> {e.memo}</span> : <span className="text-t3">—</span>; } },
            { key: 'st', header: 'Holat', cell: (l) => <span className="flex items-center gap-1.5"><StatusBadge status={l.status} />{l.confidence && l.status === 'suggested' ? <span className="text-[10.5px] text-t3">{l.confidence}%</span> : null}</span> },
            { key: 'act', header: '', cell: (l) => !edit ? null : l.status === 'suggested' ? <span className="flex gap-1"><Button size="xs" variant="success" icon={<Check className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); dispatch('bank.confirm', { id: l.id, accept: true }, { success: 'Moslik tasdiqlandi' }); }}>Tasdiqlash</Button><Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); dispatch('bank.confirm', { id: l.id, accept: false }); }} aria-label="Rad etish"><X className="h-3 w-3" /></Button></span> : l.status === 'unmatched' ? <Button size="xs" icon={<BookPlus className="h-3 w-3" />} onClick={(e) => { e.stopPropagation(); setAcc(l.amount > 0 ? '9560' : '9431'); setBook(l.id); }}>Provodka</Button> : null },
          ]} />
      </Card>
      {book && (() => { const l = byId(db.bankLines, book)!; return (
        <Modal open onClose={() => setBook(null)} size="sm" title="Bank operatsiyasini provodka qilish" footer={<><Button variant="ghost" onClick={() => setBook(null)}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('bank.book', { id: l.id, account: acc }, { success: 'Provodka yaratildi va moslashtirildi' }) !== undefined) setBook(null); }}>Provodka qilish</Button></>}>
          <p className="text-[13px] text-t1">{l.description}</p><p className="num mt-1 text-[15px] font-semibold">{mf(l.amount)}</p>
          <Field label="Qarshi hisob" className="mt-3"><Select value={acc} onChange={(e) => setAcc(e.target.value)}>{CHART.filter((a) => ['revenue', 'expense'].includes(a.type) || ['4010', '6010', '4890', '6310'].includes(a.code)).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</Select></Field>
          <p className="mt-2 text-[11.5px] text-t3">{l.amount > 0 ? `Dt 5110 / Kt ${acc}` : `Dt ${acc} / Kt 5110`}</p>
        </Modal>
      ); })()}
      {imp && <ImportWizard kind="bank" companyId={co} onClose={() => setImp(false)} />}
    </div>
  );
}

// ─── Budget ──────────────────────────────────────────────────
function Budget() {
  const { db, s, m } = useCtx();
  const [range, setRange] = useState<'month' | 'ytd'>('month');
  const cm = +TODAY.slice(5, 7);
  const rows = useMemo(() => A.budgetVsActual(db, s, 2026, range === 'month' ? cm : 1, cm), [db, s, range, cm]);
  const tb = rows.reduce((a, r) => a + r.budget, 0); const ta = rows.reduce((a, r) => a + r.actual, 0);
  const over = rows.filter((r) => r.pct > 5);
  const f = useChartFmt();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Segmented value={range} onChange={setRange} options={[{ id: 'month', label: `${MONTHS_UZ[cm - 1]} (joriy oy)` }, { id: 'ytd', label: 'Yil boshidan' }]} /><span className="text-[11.5px] text-t3">Joriy oyda oy oxirida hisoblanadigan moddalar (ish haqi, ishlab chiqarish ustamasi) chiqarib tashlanadi</span></div>
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Byudjet" value={m(tb)} /><Stat label="Fakt" value={m(ta)} /><Stat label="Farq" value={m(ta - tb)} tone={ta > tb ? 'neg' : 'pos'} sub={`${tb ? (((ta - tb) / tb) * 100).toFixed(1) : 0}%`} /><Stat label="Oshib ketgan moddalar" value={String(over.length)} tone={over.length ? 'neg' : 'pos'} /></div>
      {over.length > 0 && <Card className="!border-neg/30 !bg-neg/[.05] !p-4"><p className="flex items-start gap-2 text-[13px] text-t1"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neg" /><span><b>Ogohlantirish:</b> {over.map((r) => `${r.name} (${byId(db.companies, r.companyId)?.short}) +${r.pct.toFixed(0)}%`).join(', ')} — xarajatlar byudjetdan oshdi.</span></p></Card>}
      <Card><CardHeader title="Byudjet vs fakt" subtitle={range === 'month' ? monthLabel(monthKey(TODAY)) : `Yanvar – ${MONTHS_UZ[cm - 1]} 2026`} icon={<Target className="h-4 w-4" />} actions={<ExportButton module="finance" name="byudjet" title="Byudjet vs fakt" cols={[{ key: 'n', label: 'Modda' }, { key: 'co', label: 'Kompaniya' }, { key: 'cc', label: 'Markaz' }, { key: 'b', label: 'Byudjet', type: 'money' }, { key: 'a', label: 'Fakt', type: 'money' }, { key: 'v', label: 'Farq', type: 'money' }, { key: 'p', label: '%', type: 'pct' }]} rows={() => rows.map((r) => ({ n: r.name, co: byId(db.companies, r.companyId)?.short, cc: r.costCenter, b: r.budget, a: r.actual, v: r.variance, p: r.pct }))} />} />
        <div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows.slice(0, 10).map((r) => ({ n: `${r.name.split(' ')[0]} · ${byId(db.companies, r.companyId)?.short}`, b: r.budget, a: r.actual, over: r.pct > 5 }))} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={0} angle={-20} height={50} textAnchor="end" /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="b" name="Byudjet" fill="var(--text-3)" fillOpacity={0.3} radius={[4, 4, 0, 0]} /><Bar dataKey="a" name="Fakt" radius={[4, 4, 0, 0]}>{rows.slice(0, 10).map((r, i) => <Cell key={i} fill={r.pct > 5 ? PALETTE[4] : PALETTE[0]} />)}</Bar></BarChart></ResponsiveContainer></div>
        <div className="mt-3 space-y-2">{rows.map((r) => <div key={r.companyId + r.account} className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[220px_1fr_auto]"><div className="min-w-0"><p className="truncate text-[12.8px] text-t1">{r.name}</p><p className="text-[11px] text-t3">{byId(db.companies, r.companyId)?.short} · {r.costCenter}</p></div><Progress value={r.budget ? (r.actual / r.budget) * 100 : 0} tone={r.pct > 5 ? 'neg' : r.pct > -5 ? 'warn' : 'pos'} className="hidden sm:block" /><span className="num text-right text-[12.5px]"><b className={cx(r.pct > 5 ? 'text-neg' : 'text-t1')}>{m(r.actual)}</b> <span className="text-t3">/ {m(r.budget)}</span> <span className={cx('ml-1 text-[11px]', r.pct > 5 ? 'text-neg' : 'text-t3')}>{r.pct > 0 ? '+' : ''}{r.pct.toFixed(0)}%</span></span></div>)}</div>
      </Card>
    </div>
  );
}
