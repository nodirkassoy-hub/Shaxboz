'use client';
import { useMemo, useState } from 'react';
import { Plus, Users, Target, Phone, Mail, CalendarClock, StickyNote, CheckSquare, TrendingUp, ArrowRight, UserPlus, Upload, Handshake } from 'lucide-react';
import { ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip, Cell } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId, invOpen, docTotals } from '@/lib/db';
import { fmtDate, TODAY, addDays, diffDays } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat, Avatar, Textarea } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { PALETTE } from '@/components/ui/charts';
import { can, roleOf } from '@/lib/rbac';
import type { Lead, CrmActivity } from '@/lib/types';
import { ImportWizard } from './ImportWizard';
import { InvoiceForm } from './forms';

type Tab = 'pipeline' | 'customers' | 'activities' | 'analytics';
const STAGES: { id: Lead['stage']; l: string; c: string }[] = [{ id: 'new', l: 'Yangi lid', c: '#64748b' }, { id: 'qualified', l: 'Malakali', c: '#0ea5e9' }, { id: 'proposal', l: 'Taklif', c: '#6d6df5' }, { id: 'negotiation', l: 'Muzokara', c: '#f59e0b' }, { id: 'won', l: 'Yutildi', c: '#10b981' }, { id: 'lost', l: 'Yo‘qotildi', c: '#ef4444' }];
const ACT_ICON: Record<string, typeof Phone> = { call: Phone, meeting: Handshake, task: CheckSquare, note: StickyNote, email: Mail, follow_up: CalendarClock };
const ACT_L: Record<string, string> = { call: 'Qo‘ng‘iroq', meeting: 'Uchrashuv', task: 'Vazifa', note: 'Eslatma', email: 'Email', follow_up: 'Kuzatuv' };

export default function Crm() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || (nav.params?.party ? 'customers' : 'pipeline'));
  return (
    <div>
      <PageHeader title="CRM" crumbs={['Mijozlar']} subtitle={<span className="flex items-center gap-2">Lidlar, bitimlar quvuri, mijozlar, faoliyatlar va konversiya <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'pipeline', label: 'Bitimlar quvuri', icon: <Target className="h-3.5 w-3.5" /> }, { id: 'customers', label: 'Mijozlar', icon: <Users className="h-3.5 w-3.5" /> }, { id: 'activities', label: 'Faoliyatlar', icon: <CalendarClock className="h-3.5 w-3.5" /> }, { id: 'analytics', label: 'Konversiya', icon: <TrendingUp className="h-3.5 w-3.5" /> }]} />
      {tab === 'pipeline' && <Pipeline />}{tab === 'customers' && <Customers />}{tab === 'activities' && <Activities />}{tab === 'analytics' && <Conversion />}
    </div>
  );
}

function Pipeline() {
  const { db, s, m } = useCtx(); const { dispatch, role } = useApp();
  const leads = db.leads.filter((l) => s.companyIds.includes(l.companyId));
  const [create, setCreate] = useState(false); const [view, setView] = useState<string | null>(null); const [drag, setDrag] = useState<string | null>(null);
  const open = leads.filter((l) => !['won', 'lost'].includes(l.stage));
  const edit = can(role, 'crm', 'edit');
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Ochiq bitimlar" value={String(open.length)} sub={m(open.reduce((a, l) => a + l.value, 0))} /><Stat label="Vaznli quvur" value={m(open.reduce((a, l) => a + (l.value * l.probability) / 100, 0))} sub="summa × ehtimollik" /><Stat label="Yutilgan (YTD)" value={m(leads.filter((l) => l.stage === 'won').reduce((a, l) => a + l.value, 0))} tone="pos" /><Stat label="Konversiya" value={`${((leads.filter((l) => l.stage === 'won').length / Math.max(1, leads.filter((l) => ['won', 'lost'].includes(l.stage)).length)) * 100).toFixed(0)}%`} sub="yutilgan / yopilgan" /></div>
      <div className="flex justify-end">{can(role, 'crm', 'create') && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Yangi lid</Button>}</div>
      <div className="thin-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {STAGES.map((st) => { const items = leads.filter((l) => l.stage === st.id); return (
          <div key={st.id} onDragOver={(e) => edit && e.preventDefault()} onDrop={() => { if (drag && edit) { dispatch('lead.stage', { id: drag, stage: st.id }, { success: `Bosqich: ${st.l}` }); setDrag(null); } }} className="w-[270px] shrink-0 rounded-2xl border border-line bg-surface-2 p-2.5">
            <div className="mb-2 flex items-center justify-between px-1"><span className="flex items-center gap-2 text-[12.5px] font-semibold text-t1"><span className="h-2 w-2 rounded-full" style={{ background: st.c }} />{st.l}<span className="num text-t3">{items.length}</span></span><span className="num text-[11px] text-t3">{m(items.reduce((a, l) => a + l.value, 0))}</span></div>
            <div className="space-y-2">{items.map((l) => (
              <div key={l.id} draggable={edit} onDragStart={() => setDrag(l.id)} onClick={() => setView(l.id)} className="cursor-pointer rounded-xl border border-line bg-surface-solid p-3 shadow-card transition hover:border-line-strong">
                <p className="text-[13px] font-semibold leading-snug text-t1">{l.company}</p><p className="text-[11.5px] text-t3">{l.name} · {l.source}</p>
                <div className="mt-2 flex items-center justify-between"><span className="num text-[12.5px] font-semibold text-t1">{m(l.value)}</span><Badge>{l.probability}%</Badge></div>
                {l.nextStep && <p className="mt-1.5 flex items-center gap-1 text-[11px] text-accent"><ArrowRight className="h-3 w-3" />{l.nextStep}</p>}
                {l.lostReason && <p className="mt-1.5 text-[11px] text-neg">{l.lostReason}</p>}
                <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-t3"><Avatar name={l.owner} size={16} />{l.owner} · {byId(db.companies, l.companyId)?.short}</div>
              </div>
            ))}</div>
          </div>
        ); })}
      </div>
      <p className="text-[11.5px] text-t3">Kartalarni sudrab bosqichni o‘zgartiring yoki kartani oching.</p>
      {create && <LeadForm onClose={() => setCreate(false)} />}
      {view && <LeadDrawer id={view} onClose={() => setView(null)} />}
    </div>
  );
}

function LeadForm({ onClose }: { onClose: () => void }) {
  const { db } = useCtx(); const { dispatch, role, filters } = useApp();
  const [f, setF] = useState<Partial<Lead>>({ stage: 'new', probability: 10, source: 'Veb-sayt', companyId: filters.companyId === 'all' ? 'trd' : filters.companyId, owner: roleOf(role).persona, created: TODAY, value: 0 });
  return (
    <Modal open onClose={onClose} title="Yangi lid" size="md" icon={<UserPlus className="h-4 w-4" />} footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!f.company || !f.name} onClick={() => { if (dispatch('lead.create', f, { success: 'Lid qo‘shildi' }) !== undefined) onClose(); }}>Saqlash</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kompaniya" required><Input value={f.company || ''} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field><Field label="Aloqa shaxsi" required><Input value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Telefon"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+998" /></Field><Field label="Taxminiy summa"><Input type="number" value={f.value || ''} onChange={(e) => setF({ ...f, value: +e.target.value })} /></Field>
        <Field label="Manba"><Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{['Veb-sayt', 'Tavsiya', 'Tender', 'Ko‘rgazma', 'Sovuq qo‘ng‘iroq', 'Mavjud mijoz'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Guruh kompaniyasi"><Select value={f.companyId} onChange={(e) => setF({ ...f, companyId: e.target.value })}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Keyingi qadam" className="sm:col-span-2"><Input value={f.nextStep || ''} onChange={(e) => setF({ ...f, nextStep: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function LeadDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, m } = useCtx(); const { dispatch, role, go } = useApp();
  const [lost, setLost] = useState(false); const [reason, setReason] = useState(''); const [act, setAct] = useState(false);
  const l = byId(db.leads, id); if (!l) return null;
  const acts = db.activities.filter((a) => a.leadId === id);
  const idx = STAGES.findIndex((s) => s.id === l.stage); const edit = can(role, 'crm', 'edit');
  return (
    <Drawer open onClose={onClose} title={l.company} subtitle={<span className="flex items-center gap-2">{l.name} · {l.phone} <StatusBadge status={l.stage} /></span>}
      footer={edit && !['won', 'lost'].includes(l.stage) ? <><Button variant="ghost" onClick={() => setLost(true)}>Yo‘qotildi</Button>{idx < 3 && <Button onClick={() => dispatch('lead.stage', { id, stage: STAGES[idx + 1].id }, { success: `Keyingi bosqich: ${STAGES[idx + 1].l}` })}>→ {STAGES[idx + 1].l}</Button>}<Button variant="primary" onClick={() => dispatch('lead.convert', { id }, { success: 'Bitim yutildi — mijoz kartasi yaratildi' })}>Yutildi → mijoz</Button></> : l.customerId ? <Button variant="primary" onClick={() => { onClose(); go('sales', 'orders', { new: '1' }); }}>Buyurtma yaratish</Button> : undefined}>
      <div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">Summa</p><p className="num text-[14px] font-semibold">{m(l.value)}</p></div><div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">Ehtimollik</p><p className="num text-[14px] font-semibold">{l.probability}%</p></div><div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">Vaznli</p><p className="num text-[14px] font-semibold">{m(l.value * l.probability / 100)}</p></div></div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Manba</span><span>{l.source}</span><span className="text-t3">Mas’ul</span><span>{l.owner}</span><span className="text-t3">Yaratilgan</span><span>{fmtDate(l.created)}</span><span className="text-t3">Kompaniya</span><span>{byId(db.companies, l.companyId)?.name}</span>{l.nextStep && <><span className="text-t3">Keyingi qadam</span><span>{l.nextStep}</span></>}</div>
      <div className="mb-2 mt-5 flex items-center justify-between"><p className="text-[12px] font-semibold uppercase tracking-wide text-t3">Faoliyatlar</p>{can(role, 'crm', 'create') && <Button size="xs" icon={<Plus className="h-3 w-3" />} onClick={() => setAct(true)}>Qo‘shish</Button>}</div>
      <ActList items={acts} />
      <Modal open={lost} onClose={() => setLost(false)} size="sm" title="Bitim yo‘qotildi" footer={<><Button variant="ghost" onClick={() => setLost(false)}>Bekor qilish</Button><Button variant="danger" disabled={!reason} onClick={() => { dispatch('lead.stage', { id, stage: 'lost', lostReason: reason }, { success: 'Yo‘qotilgan deb belgilandi' }); setLost(false); }}>Saqlash</Button></>}><Field label="Sabab"><Select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">— tanlang —</option>{['Narx yuqori', 'Raqobatchi tanlandi', 'Yetkazish muddati', 'Byudjet yo‘q', 'Loyiha bekor qilindi'].map((x) => <option key={x}>{x}</option>)}</Select></Field></Modal>
      {act && <ActForm leadId={id} onClose={() => setAct(false)} />}
    </Drawer>
  );
}

function ActList({ items }: { items: CrmActivity[] }) {
  const dispatch = useApp((s) => s.dispatch);
  return <div className="space-y-1.5">{items.map((a) => { const I = ACT_ICON[a.kind]; return <label key={a.id} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line px-3 py-2"><input type="checkbox" checked={a.done} onChange={() => dispatch('activity.toggle', { id: a.id })} className="mt-0.5 accent-[var(--accent)]" /><I className="mt-0.5 h-3.5 w-3.5 shrink-0 text-t3" /><span className="min-w-0 flex-1"><span className={cx('block text-[12.8px]', a.done ? 'text-t3 line-through' : 'text-t1')}>{a.subject}</span><span className="text-[11px] text-t3">{ACT_L[a.kind]} · {fmtDate(a.due)} · {a.owner}</span></span>{!a.done && a.due < TODAY && <Badge tone="neg">kechikdi</Badge>}</label>; })}{!items.length && <p className="text-[12.5px] text-t3">Faoliyat yo‘q</p>}</div>;
}

function ActForm({ leadId, customerId, onClose }: { leadId?: string; customerId?: string; onClose: () => void }) {
  const { dispatch, role } = useApp();
  const [f, setF] = useState<Partial<CrmActivity>>({ kind: 'call', due: TODAY, done: false, owner: roleOf(role).persona, leadId, customerId, subject: '' });
  return (
    <Modal open onClose={onClose} size="sm" title="Yangi faoliyat" footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!f.subject} onClick={() => { if (dispatch('activity.create', f, { success: 'Faoliyat qo‘shildi' }) !== undefined) onClose(); }}>Saqlash</Button></>}>
      <div className="space-y-3"><Field label="Turi"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CrmActivity['kind'] })}>{Object.entries(ACT_L).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field><Field label="Mavzu"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field><Field label="Sana"><Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field></div>
    </Modal>
  );
}

function Customers() {
  const { db, s, m } = useCtx(); const { nav, role } = useApp();
  const [view, setView] = useState<string | null>(nav.params?.party || null); const [imp, setImp] = useState(false); const [create, setCreate] = useState(false);
  const ag = useMemo(() => A.arAging(db, s), [db, s]);
  const rev = useMemo(() => A.customerProfit(db, s, '2026-01-01', TODAY), [db, s]);
  const rows = db.parties.filter((p) => p.kind === 'customer' && p.companyIds.some((c) => s.companyIds.includes(c))).map((p) => ({ p, rev: rev.find((r) => r.id === p.id)?.revenue || 0, ar: ag.customers.find((c) => c.id === p.id) }));
  return (
    <Card>
      <CardHeader title="Mijozlar bazasi" subtitle={`${rows.length} ta mijoz`} icon={<Users className="h-4 w-4" />} actions={<>{can(role, 'crm', 'create') && <><Button icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImp(true)}>Import</Button><Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Mijoz</Button></>}<ExportButton module="crm" name="mijozlar" title="Mijozlar" cols={[{ key: 'c', label: 'Kod' }, { key: 'n', label: 'Nomi' }, { key: 's', label: 'STIR' }, { key: 'ph', label: 'Telefon' }, { key: 'r', label: 'Tushum YTD', type: 'money' }, { key: 'a', label: 'Qarz', type: 'money' }]} rows={() => rows.map((r) => ({ c: r.p.code, n: r.p.name, s: r.p.stir, ph: r.p.phone, r: r.rev, a: r.ar?.total || 0 }))} /></>} />
      <DataTable rows={rows} rowKey={(r) => r.p.id} onRow={(r) => setView(r.p.id)} search={(r) => `${r.p.name} ${r.p.stir} ${r.p.code} ${r.p.phone}`}
        cols={[{ key: 'n', header: 'Mijoz', primary: true, cell: (r) => <div className="flex items-center gap-2.5"><Avatar name={r.p.name} size={30} /><div><p className="font-medium">{r.p.name}</p><p className="text-[11px] text-t3">{r.p.code} · STIR {r.p.stir}</p></div></div> }, { key: 'seg', header: 'Segment', cell: (r) => <Badge>{r.p.segment}</Badge> }, { key: 'ph', header: 'Aloqa', hideMobile: true, cell: (r) => <span className="text-[12px] text-t2">{r.p.phone}</span> }, { key: 'r', header: 'Tushum (YTD)', align: 'right', cell: (r) => m(r.rev), sort: (r) => r.rev }, { key: 'a', header: 'Qarz', align: 'right', cell: (r) => (r.ar ? m(r.ar.total) : '—'), sort: (r) => r.ar?.total || 0 }, { key: 'o', header: 'Muddati o‘tgan', align: 'right', cell: (r) => { const o = r.ar ? r.ar.total - r.ar.b.current : 0; return o ? <span className="text-neg">{m(o)}</span> : '—'; }, sort: (r) => (r.ar ? r.ar.total - r.ar.b.current : 0) }, { key: 't', header: 'Muddat', cell: (r) => `${r.p.terms} kun` }]} />
      {view && <CustomerDrawer id={view} onClose={() => setView(null)} />}
      {imp && <ImportWizard kind="customers" onClose={() => setImp(false)} />}
      {create && <PartyForm onClose={() => setCreate(false)} />}
    </Card>
  );
}

function PartyForm({ onClose }: { onClose: () => void }) {
  const { db } = useCtx(); const { dispatch, filters } = useApp();
  const [f, setF] = useState({ name: '', stir: '', mfo: '', phone: '', email: '', address: '', terms: 30, creditLimit: 100_000_000, segment: 'Ulgurji', companyId: filters.companyId === 'all' ? 'trd' : filters.companyId });
  const stirOk = /^\d{3}\s?\d{3}\s?\d{3}$/.test(f.stir.trim());
  return (
    <Modal open onClose={onClose} size="md" title="Yangi mijoz" subtitle="STIR tekshiruvi: soliq tizimi API ulanmagan — faqat format tekshiriladi" footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!f.name || !stirOk} onClick={() => { if (dispatch('party.create', { code: `MJ-${String(db.parties.filter((p) => p.kind === 'customer').length + 1).padStart(3, '0')}`, name: f.name, kind: 'customer', companyIds: [f.companyId], branchId: 'tas', stir: f.stir, mfo: f.mfo, phone: f.phone, email: f.email, address: f.address, terms: f.terms, creditLimit: f.creditLimit, segment: f.segment, behaviour: 'normal' }, { success: 'Mijoz qo‘shildi' }) !== undefined) onClose(); }}>Saqlash</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nomi" required className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="“…” MChJ" /></Field>
        <Field label="STIR (INN)" required error={f.stir && !stirOk ? '9 xonali raqam' : undefined}><Input value={f.stir} onChange={(e) => setF({ ...f, stir: e.target.value })} placeholder="301 234 567" /></Field>
        <Field label="Bank MFO"><Input value={f.mfo} onChange={(e) => setF({ ...f, mfo: e.target.value })} placeholder="00873" maxLength={5} /></Field>
        <Field label="Telefon"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="To‘lov muddati (kun)"><Input type="number" value={f.terms} onChange={(e) => setF({ ...f, terms: +e.target.value })} /></Field><Field label="Kredit limiti"><Input type="number" value={f.creditLimit} onChange={(e) => setF({ ...f, creditLimit: +e.target.value })} /></Field>
        <Field label="Guruh kompaniyasi"><Select value={f.companyId} onChange={(e) => setF({ ...f, companyId: e.target.value })}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Segment"><Input value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })} /></Field>
        <Field label="Manzil" className="sm:col-span-2"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function CustomerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, mf, m } = useCtx(); const { go, role } = useApp();
  const [act, setAct] = useState(false); const [inv, setInv] = useState(false);
  const p = byId(db.parties, id); if (!p) return null;
  const invs = db.invoices.filter((i) => i.customerId === id).slice().reverse();
  const open = invs.filter((i) => i.kind === 'sales' && invOpen(i) > 0);
  const orders = db.salesOrders.filter((o) => o.customerId === id).slice().reverse();
  const acts = db.activities.filter((a) => a.customerId === id);
  const pays = db.payments.filter((x) => x.partyId === id).slice(-6).reverse();
  const tot = open.reduce((a, i) => a + invOpen(i), 0);
  const printStatement = () => { const w = window.open('', '_blank'); if (!w) return; w.document.write(`<html><head><title>Hisob holati — ${p.name}</title><style>body{font:13px Inter,Arial;margin:40px}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #e2e8f0;text-align:left}.r{text-align:right}</style></head><body><h2>Mijoz hisob holati (Customer statement)</h2><p>${p.name} · STIR ${p.stir}<br>Sana: ${fmtDate(TODAY)} · DEMO</p><table><tr><th>Hujjat</th><th>Sana</th><th>Muddat</th><th class="r">Summa</th><th class="r">Qoldiq</th></tr>${open.map((i) => `<tr><td>${i.no}</td><td>${fmtDate(i.date)}</td><td>${fmtDate(i.dueDate)}</td><td class="r">${i.total.toLocaleString('ru-RU')}</td><td class="r">${invOpen(i).toLocaleString('ru-RU')}</td></tr>`).join('')}</table><p class="r"><b>Jami qarz: ${tot.toLocaleString('ru-RU')} so‘m</b></p><script>print()</script></body></html>`); w.document.close(); };
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={p.name} subtitle={`${p.code} · STIR ${p.stir} · ${p.segment}`} footer={<><Button onClick={printStatement}>Hisob holati (statement)</Button>{can(role, 'finance', 'create') && <Button onClick={() => setInv(true)}>Hisob-faktura</Button>}{can(role, 'sales', 'create') && <Button variant="primary" onClick={() => { onClose(); go('sales', 'orders', { new: '1' }); }}>Buyurtma</Button>}</>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Ochiq qarz', m(tot)], ['Muddati o‘tgan', m(open.filter((i) => i.dueDate < TODAY).reduce((a, i) => a + invOpen(i), 0))], ['Kredit limiti', p.creditLimit ? m(p.creditLimit) : '—'], ['To‘lov muddati', `${p.terms} kun`]].map(([l, v]) => <div key={l} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l}</p><p className="num text-[13.5px] font-semibold">{v}</p></div>)}</div>
      {p.creditLimit && tot > p.creditLimit * 0.85 && <p className="mt-2 rounded-lg bg-warn/10 px-3 py-1.5 text-[12px] text-warn">Kredit limitining {((tot / p.creditLimit) * 100).toFixed(0)}% ishlatilgan</p>}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Telefon</span><span>{p.phone}</span><span className="text-t3">Email</span><span>{p.email}</span><span className="text-t3">Manzil</span><span>{p.address}</span>{p.mfo && <><span className="text-t3">Bank MFO</span><span>{p.mfo}</span></>}<span className="text-t3">To‘lov odati</span><span>{{ punctual: 'O‘z vaqtida', normal: 'Odatiy', late: 'Kechiktiradi' }[p.behaviour || 'normal']}</span></div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Ochiq hisob-fakturalar</p>
      <div className="space-y-1">{open.slice(0, 8).map((i) => <div key={i.id} className="flex items-center justify-between gap-2 text-[12.5px]"><span><span className="font-mono">{i.no}</span> <span className="text-t3">· {fmtDate(i.dueDate)}</span> {i.dueDate < TODAY && <Badge tone="neg">{diffDays(TODAY, i.dueDate)} kun</Badge>}</span><span className="num font-medium">{mf(invOpen(i))}</span></div>)}{!open.length && <p className="text-[12.5px] text-t3">Qarz yo‘q ✓</p>}</div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">So‘nggi to‘lovlar</p>
      <div className="space-y-1">{pays.map((x) => <div key={x.id} className="flex justify-between text-[12.5px]"><span>{fmtDate(x.date)} · {x.no}</span><span className="num text-pos">+{mf(x.amount)}</span></div>)}</div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Buyurtmalar ({orders.length})</p>
      <div className="space-y-1">{orders.slice(0, 6).map((o) => <button key={o.id} onClick={() => go('sales', 'orders', { order: o.id })} className="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-[12.5px] hover:bg-surface-2"><span><span className="font-mono">{o.no}</span> <span className="text-t3">· {fmtDate(o.date)}</span></span><span className="flex items-center gap-2"><span className="num">{mf(docTotals(o.lines).total)}</span><StatusBadge status={o.status} /></span></button>)}</div>
      <div className="mb-1.5 mt-5 flex items-center justify-between"><p className="text-[12px] font-semibold uppercase tracking-wide text-t3">Faoliyatlar va eslatmalar</p>{can(role, 'crm', 'create') && <Button size="xs" icon={<Plus className="h-3 w-3" />} onClick={() => setAct(true)}>Qo‘shish</Button>}</div>
      <ActList items={acts} />
      {act && <ActForm customerId={id} onClose={() => setAct(false)} />}
      {inv && <InvoiceForm customerId={id} onClose={() => setInv(false)} />}
    </Drawer>
  );
}

function Activities() {
  const { db } = useCtx(); const { role } = useApp();
  const [create, setCreate] = useState(false);
  const acts = db.activities.slice().sort((a, b) => (a.done === b.done ? (a.due < b.due ? -1 : 1) : a.done ? 1 : -1));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card><CardHeader title="Faoliyatlar, qo‘ng‘iroqlar va vazifalar" subtitle={`${acts.filter((a) => !a.done).length} ta ochiq · ${acts.filter((a) => !a.done && a.due < TODAY).length} ta kechikkan`} icon={<CalendarClock className="h-4 w-4" />} actions={can(role, 'crm', 'create') ? <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Faoliyat</Button> : undefined} />
        <div className="space-y-1.5">{acts.map((a) => { const I = ACT_ICON[a.kind]; const who = a.leadId ? byId(db.leads, a.leadId)?.company : byId(db.parties, a.customerId)?.name; return <div key={a.id}><ActList items={[a]} />{who && <p className="-mt-1 mb-1 ml-9 text-[11px] text-t3"><I className="mr-1 inline h-3 w-3" />{who}</p>}</div>; })}</div>
      </Card>
      <Card><CardHeader title="Bugun" /><div className="space-y-2">{acts.filter((a) => !a.done && a.due <= TODAY).map((a) => <div key={a.id} className="rounded-xl bg-surface-2 p-2.5 text-[12.5px]"><p className="font-medium text-t1">{a.subject}</p><p className="text-[11px] text-t3">{ACT_L[a.kind]} · {a.owner}</p></div>)}</div></Card>
      {create && <ActForm onClose={() => setCreate(false)} />}
    </div>
  );
}

function Conversion() {
  const { db, s, m } = useCtx();
  const leads = db.leads.filter((l) => s.companyIds.includes(l.companyId));
  const order = ['new', 'qualified', 'proposal', 'negotiation', 'won'];
  const reached = order.map((st, i) => ({ name: STAGES[i].l, value: leads.filter((l) => order.indexOf(l.stage) >= i || (l.stage === 'lost' && i <= 2)).length, fill: STAGES[i].c }));
  const bySource = [...new Set(leads.map((l) => l.source))].map((src) => { const ls = leads.filter((l) => l.source === src); const won = ls.filter((l) => l.stage === 'won').length; const closed = ls.filter((l) => ['won', 'lost'].includes(l.stage)).length; return { src, n: ls.length, won, rate: closed ? (won / closed) * 100 : 0, value: ls.filter((l) => l.stage === 'won').reduce((a, l) => a + l.value, 0) }; });
  const byOwner = [...new Set(leads.map((l) => l.owner))].map((o) => { const ls = leads.filter((l) => l.owner === o); return { o, open: ls.filter((l) => !['won', 'lost'].includes(l.stage)).reduce((a, l) => a + l.value, 0), won: ls.filter((l) => l.stage === 'won').reduce((a, l) => a + l.value, 0) }; }).sort((a, b) => b.won - a.won);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Konversiya voronkasi" subtitle="Har bir bosqichga yetib kelgan bitimlar" />
        <div className="h-[280px]"><ResponsiveContainer><FunnelChart><Tooltip /><Funnel dataKey="value" data={reached} isAnimationActive>{reached.map((r, i) => <Cell key={i} fill={r.fill} />)}<LabelList position="right" fill="var(--text-2)" stroke="none" dataKey="name" fontSize={12} /><LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={13} /></Funnel></FunnelChart></ResponsiveContainer></div>
      </Card>
      <Card><CardHeader title="Manba bo‘yicha samaradorlik" />
        <DataTable rows={bySource} rowKey={(r) => r.src} dense cols={[{ key: 's', header: 'Manba', primary: true, cell: (r) => r.src }, { key: 'n', header: 'Lidlar', align: 'right', cell: (r) => r.n }, { key: 'w', header: 'Yutilgan', align: 'right', cell: (r) => r.won }, { key: 'r', header: 'Konversiya', align: 'right', cell: (r) => `${r.rate.toFixed(0)}%` }, { key: 'v', header: 'Yutilgan summa', align: 'right', cell: (r) => m(r.value) }]} />
        <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Menejerlar</p>
        {byOwner.map((o, i) => <div key={o.o} className="flex items-center gap-2 py-1 text-[12.5px]"><Avatar name={o.o} size={22} /><span className="flex-1">{o.o}</span><span className="num text-pos">{m(o.won)}</span><span className="num w-24 text-right text-t3">{m(o.open)} ochiq</span></div>)}
      </Card>
    </div>
  );
}
