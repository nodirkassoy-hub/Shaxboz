'use client';
import { useMemo, useState } from 'react';
import { Factory, Plus, Play, ShieldCheck, PackageCheck, ListTree, Calculator, Gauge, CalendarRange, CheckCircle2, AlertTriangle, ArrowRight, Users, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId, docTotals } from '@/lib/db';
import { woRequirements } from '@/lib/ops';
import { peek } from '@/lib/core/inventory';
import { fmtDate, TODAY, addDays, diffDays, monthStart } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat, Progress, Textarea, Explain, Segmented } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { ChartTooltip, PALETTE, useChartFmt } from '@/components/ui/charts';
import * as W from '@/components/dash/widgets';
import { can } from '@/lib/rbac';

type Tab = 'dashboard' | 'orders' | 'planning' | 'bom' | 'costing' | 'machines';
const WF = [{ id: 'so', l: 'Savdo buyurtmasi' }, { id: 'plan', l: 'Rejalashtirish' }, { id: 'wo', l: 'Ish buyurtmasi' }, { id: 'issue', l: 'Xomashyo berish' }, { id: 'prod', l: 'Ishlab chiqarish' }, { id: 'qc', l: 'Sifat nazorati' }, { id: 'fg', l: 'Tayyor mahsulot' }, { id: 'wh', l: 'Ombor' }, { id: 'dl', l: 'Yetkazish' }, { id: 'inv', l: 'Hisob-faktura' }];

export default function Manufacturing() {
  const nav = useApp((s) => s.nav); const { db, s } = useCtx();
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'dashboard');
  if (!s.companyIds.includes('fac')) return <div><PageHeader title="Ishlab chiqarish" /><Card><p className="py-10 text-center text-[13px] text-t2">Tanlangan kompaniyada ishlab chiqarish yo‘q. <button className="font-medium text-accent" onClick={() => useApp.getState().setFilters({ companyId: 'fac', branchId: 'all' })}>Balans Factory’ga o‘tish</button></p></Card></div>;
  void db;
  return (
    <div>
      <PageHeader title="Ishlab chiqarish — Balans Factory" crumbs={['Operatsiyalar', 'Ishlab chiqarish']} subtitle={<span className="flex items-center gap-2">BOM, ish buyurtmalari, xomashyo, sifat nazorati, mashinalar va tannarx — ombor va buxgalteriya bilan bog‘langan <DemoTag /></span>} />
      <Card className="mb-4 !p-3"><div className="no-scrollbar flex items-center gap-1 overflow-x-auto text-[11.5px]">{WF.map((w, i) => <div key={w.id} className="flex shrink-0 items-center gap-1"><span className="rounded-lg bg-surface-2 px-2 py-1 font-medium text-t2">{w.l}</span>{i < WF.length - 1 && <ArrowRight className="h-3 w-3 text-t3" />}</div>)}</div></Card>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'dashboard', label: 'Zavod paneli', icon: <Gauge className="h-3.5 w-3.5" /> }, { id: 'orders', label: 'Ish buyurtmalari', icon: <Factory className="h-3.5 w-3.5" /> }, { id: 'planning', label: 'Rejalashtirish (MRP)', icon: <CalendarRange className="h-3.5 w-3.5" /> }, { id: 'bom', label: 'BOM / retseptlar', icon: <ListTree className="h-3.5 w-3.5" /> }, { id: 'costing', label: 'Tannarx', icon: <Calculator className="h-3.5 w-3.5" /> }, { id: 'machines', label: 'Mashinalar', icon: <Gauge className="h-3.5 w-3.5" /> }]} />
      {tab === 'dashboard' && <Dash />}{tab === 'orders' && <Orders />}{tab === 'planning' && <Planning />}{tab === 'bom' && <Boms />}{tab === 'costing' && <Costing />}{tab === 'machines' && <Machines />}
    </div>
  );
}

function Dash() {
  return <div className="space-y-4"><W.FactoryKpis /><div className="grid gap-4 lg:grid-cols-3"><W.ProductionChart /><W.MachinesWidget /><W.WorkOrdersWidget /><W.MaterialsWidget /><W.WasteWidget /><W.CostingWidget /></div></div>;
}

function Orders() {
  const { db, mf } = useCtx(); const { nav, role } = useApp();
  const [st, setSt] = useState<'active' | 'completed' | 'all'>('active'); const [create, setCreate] = useState(nav.params?.new === '1'); const [view, setView] = useState<string | null>(null);
  const rows = db.workOrders.filter((w) => st === 'all' || (st === 'active' ? !['completed', 'cancelled'].includes(w.status) : w.status === 'completed')).slice().reverse();
  return (
    <Card>
      <CardHeader title="Ish buyurtmalari" subtitle={`${rows.length} ta`} icon={<Factory className="h-4 w-4" />} actions={<>{can(role, 'manufacturing', 'create') && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Ish buyurtmasi</Button>}<ExportButton module="manufacturing" name="ish-buyurtmalari" title="Ish buyurtmalari" cols={[{ key: 'no', label: '№' }, { key: 'p', label: 'Mahsulot' }, { key: 'q', label: 'Miqdor', type: 'number' }, { key: 'g', label: 'Yaroqli', type: 'number' }, { key: 's', label: 'Brak', type: 'number' }, { key: 'c', label: 'Tannarx', type: 'money' }, { key: 'st', label: 'Holat' }]} rows={() => rows.map((w) => ({ no: w.no, p: byId(db.products, w.productId)?.name, q: w.qty, g: w.goodQty, s: w.scrapQty, c: w.materialCost + w.conversionCost, st: w.status }))} /></>} />
      <DataTable rows={rows} rowKey={(w) => w.id} onRow={(w) => setView(w.id)} search={(w) => `${w.no} ${byId(db.products, w.productId)?.name}`}
        toolbar={<Segmented size="xs" value={st} onChange={setSt} options={[{ id: 'active', label: 'Faol' }, { id: 'completed', label: 'Yakunlangan' }, { id: 'all', label: 'Barchasi' }]} />}
        cols={[{ key: 'no', header: '№', primary: true, cell: (w) => <span className="font-mono text-[12px]">{w.no}</span> }, { key: 'p', header: 'Mahsulot', cell: (w) => byId(db.products, w.productId)?.name }, { key: 'q', header: 'Reja / yaroqli', align: 'right', cell: (w) => <span>{w.qty}{w.goodQty ? <span className="text-t3"> / {w.goodQty}</span> : ''}</span> }, { key: 'sc', header: 'Brak', align: 'right', cell: (w) => (w.scrapQty ? <span className={cx(w.scrapQty / (w.goodQty + w.scrapQty) > 0.05 ? 'text-neg' : 'text-t2')}>{w.scrapQty} ({((w.scrapQty / (w.goodQty + w.scrapQty)) * 100).toFixed(1)}%)</span> : '—') }, { key: 'd', header: 'Muddat', cell: (w) => `${fmtDate(w.plannedStart).slice(0, 5)} → ${fmtDate(w.plannedEnd).slice(0, 5)}` }, { key: 'so', header: 'Buyurtma', hideMobile: true, cell: (w) => (w.soId ? <Badge tone="accent">{byId(db.salesOrders, w.soId)?.no}</Badge> : <span className="text-[11.5px] text-t3">zaxiraga</span>) }, { key: 'c', header: 'Tannarx', align: 'right', cell: (w) => (w.materialCost ? mf(w.materialCost + w.conversionCost) : '—') }, { key: 'pr', header: 'Jarayon', cell: (w) => <div className="w-20"><Progress value={A.woProgress(w)} height={4} /></div> }, { key: 's', header: 'Holat', cell: (w) => <StatusBadge status={w.status} /> }]} />
      {create && <WOForm onClose={() => setCreate(false)} onCreated={setView} />}
      {view && <WODrawer id={view} onClose={() => setView(null)} />}
    </Card>
  );
}

function WOForm({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const { db } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const fin = db.products.filter((p) => p.kind === 'finished');
  const [f, setF] = useState({ productId: fin[0].id, qty: 50, start: addDays(TODAY, 1), end: addDays(TODAY, 6), soId: '' });
  const req = woRequirements(db, { productId: f.productId, qty: f.qty, bomId: db.boms.find((b) => b.productId === f.productId)!.id, companyId: 'fac' } as never);
  const bom = db.boms.find((b) => b.productId === f.productId)!;
  const openSO = db.salesOrders.filter((o) => o.companyId === 'fac' && ['confirmed', 'in_production'].includes(o.status) && o.lines.some((l) => l.productId === f.productId));
  return (
    <Modal open onClose={onClose} size="lg" title="Yangi ish buyurtmasi" subtitle="BOM bo‘yicha xomashyo ehtiyoji avtomatik hisoblanadi" icon={<Factory className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!(f.qty > 0)} onClick={() => { const r = dispatch<{ id: string }>('wo.create', { productId: f.productId, qty: f.qty, plannedStart: f.start, plannedEnd: f.end, soId: f.soId || undefined, companyId: 'fac', branchId: 'chr', crew: ['e17', 'e18', 'e20'] }, { success: 'Ish buyurtmasi yaratildi' }); if (r) { onClose(); onCreated?.(r.id); } }}>Yaratish</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mahsulot"><Select value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value, soId: '' })}>{fin.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Miqdor"><Input type="number" value={f.qty || ''} onChange={(e) => setF({ ...f, qty: +e.target.value })} /></Field>
        <Field label="Boshlash"><Input type="date" value={f.start} min={TODAY} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Tugash" hint={`Quvvat: ~${bom.outputPerHour} dona/soat`}><Input type="date" value={f.end} min={f.start} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
        <Field label="Savdo buyurtmasi (ixtiyoriy)" className="sm:col-span-2"><Select value={f.soId} onChange={(e) => setF({ ...f, soId: e.target.value })}><option value="">— zaxiraga ishlab chiqarish —</option>{openSO.map((o) => <option key={o.id} value={o.id}>{o.no} · {byId(db.parties, o.customerId)?.name}</option>)}</Select></Field>
      </div>
      <p className="mb-1.5 mt-4 text-[12px] font-semibold text-t2">Xomashyo ehtiyoji (brak normasi {bom.scrapPct}% bilan)</p>
      <div className="space-y-1">{req.map((r) => { const p = byId(db.products, r.productId)!; return <div key={r.productId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-surface-2 px-3 py-1.5 text-[12.5px]"><span>{p.name}</span><span className="num text-t2">kerak {r.need.toLocaleString('ru-RU')} {p.unit}</span>{r.short ? <Badge tone="neg">−{r.short.toLocaleString('ru-RU')}</Badge> : <Badge tone="pos">bor ({Math.floor(r.have).toLocaleString('ru-RU')})</Badge>}</div>; })}</div>
    </Modal>
  );
}

function WODrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, mf } = useCtx(); const { dispatch, role, go } = useApp();
  const [qc, setQc] = useState(false); const [good, setGood] = useState(0); const [scrap, setScrap] = useState(0); const [note, setNote] = useState(''); const [res, setRes] = useState<'pass' | 'fail'>('pass');
  const w = byId(db.workOrders, id); if (!w) return null;
  const p = byId(db.products, w.productId)!; const bom = byId(db.boms, w.bomId)!; const req = woRequirements(db, w);
  const conv = bom.labor + bom.machine + bom.energy + bom.overhead; const edit = can(role, 'manufacturing', 'edit');
  const steps = ['planned', 'in_progress', 'qc', 'completed']; const si = steps.indexOf(w.status === 'released' ? 'in_progress' : w.status);
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={`${w.no} — ${p.name}`} subtitle={<span className="flex items-center gap-2">{w.qty} {p.unit} · {fmtDate(w.plannedStart)} → {fmtDate(w.plannedEnd)} <StatusBadge status={w.status} /></span>}
      footer={edit ? <>
        {w.status === 'planned' && <><Button variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => dispatch('wo.cancel', { id }, { success: 'Bekor qilindi' })}>Bekor qilish</Button><Button variant="primary" icon={<Play className="h-3.5 w-3.5" />} disabled={req.some((r) => r.short > 0)} onClick={() => dispatch('wo.release', { id }, { success: 'Xomashyo berildi — Dt 2010 TICh / Kt 1010' })}>Ishga tushirish (xomashyo berish)</Button></>}
        {w.status === 'in_progress' && <Button variant="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => { setGood(Math.round(w.qty * (1 - bom.scrapPct / 100))); setScrap(w.qty - Math.round(w.qty * (1 - bom.scrapPct / 100))); setNote(''); setRes('pass'); setQc(true); }}>Sifat nazorati</Button>}
        {w.status === 'qc' && <><Button icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => { setGood(w.goodQty); setScrap(w.scrapQty); setNote(w.qcNote || ''); setRes(w.qc === 'fail' ? 'fail' : 'pass'); setQc(true); }}>QC ni tahrirlash</Button><Button variant="primary" icon={<PackageCheck className="h-3.5 w-3.5" />} disabled={w.qc !== 'pass'} onClick={() => dispatch('wo.complete', { id }, { success: 'Tayyor mahsulot omborga kirim qilindi' })}>Yakunlash → omborga</Button></>}
      </> : undefined}>
      <div className="mb-4 flex items-center">{['Rejalashtirilgan', 'Jarayonda', 'Sifat nazorati', 'Omborga'].map((l, i, arr) => <div key={l} className="flex flex-1 items-center"><div className="flex flex-col items-center gap-1"><div className={cx('grid h-7 w-7 place-items-center rounded-full border text-[11px]', i <= si ? 'border-accent bg-accent text-white' : 'border-line text-t3')}>{i <= si ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-[10.5px] text-t2">{l}</span></div>{i < arr.length - 1 && <div className={cx('mx-1 mb-4 h-px flex-1', i < si ? 'bg-accent' : 'bg-line')} />}</div>)}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Material', w.materialCost], ['Konversiya', w.conversionCost || conv * w.qty], ['Jami tannarx', w.materialCost + (w.conversionCost || 0)], ['Birlik', w.goodQty ? (w.materialCost + w.conversionCost) / w.goodQty : 0]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[13.5px] font-semibold">{v ? mf(v as number) : '—'}</p></div>)}</div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Xomashyo (BOM × {w.qty} + {bom.scrapPct}% brak normasi)</p>
      <div className="space-y-1">{req.map((r) => { const rp = byId(db.products, r.productId)!; const issued = w.status !== 'planned'; return <div key={r.productId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-surface-2 px-3 py-1.5 text-[12.5px]"><span>{rp.name}</span><span className="num text-t2">{r.need.toLocaleString('ru-RU')} {rp.unit}</span>{issued ? <Badge tone="pos">berilgan</Badge> : r.short ? <Badge tone="neg">yetishmaydi {r.short.toLocaleString('ru-RU')}</Badge> : <Badge tone="info">omborda bor</Badge>}</div>; })}</div>
      {w.status === 'planned' && req.some((r) => r.short > 0) && <Button size="xs" className="mt-2" onClick={() => go('purchasing', 'requests', { new: '1' })}>Xomashyo xarid so‘rovi</Button>}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Mashina</span><span>{byId(db.machines, w.machineId)?.name}</span><span className="text-t3">Brigada</span><span>{w.crew.map((c) => byId(db.employees, c)?.name.split(' ')[0]).join(', ') || '—'}</span>{w.soId && <><span className="text-t3">Savdo buyurtmasi</span><button className="text-left text-accent" onClick={() => go('sales', 'orders', { order: w.soId! })}>{byId(db.salesOrders, w.soId)?.no} · {byId(db.parties, byId(db.salesOrders, w.soId)?.customerId)?.name}</button></>}{w.qc && <><span className="text-t3">Sifat nazorati</span><span>{w.qc === 'pass' ? '✓ o‘tdi' : '✗ o‘tmadi'} · {w.goodQty} yaroqli, {w.scrapQty} brak{w.qcNote ? ` — ${w.qcNote}` : ''}</span></>}</div>
      <div className="mt-4 rounded-xl border border-line p-3 text-[12px] text-t3"><p className="mb-1 font-semibold text-t2">Buxgalteriya</p><p>Xomashyo berish: Dt 2010 Tugallanmagan ishlab chiqarish / Kt 1010 Xomashyo</p><p>Konversiya: Dt 2010 / Kt 2510 Umumishlab chiqarish (mehnat {mf(bom.labor)}, mashina {mf(bom.machine)}, energiya {mf(bom.energy)}, ustama {mf(bom.overhead)} — birlik uchun)</p><p>Yakunlash: Dt 2810 Tayyor mahsulot / Kt 2010 (brak tannarxi yaroqli mahsulotga yuklanadi)</p></div>
      <Modal open={qc} onClose={() => setQc(false)} size="sm" title="Sifat nazorati" subtitle={`${w.no} · reja ${w.qty} ${p.unit}`} footer={<><Button variant="ghost" onClick={() => setQc(false)}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('wo.qc', { id, good, scrap, result: res, note }, { success: 'Sifat nazorati natijasi saqlandi' }) !== undefined) setQc(false); }}>Saqlash</Button></>}>
        <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Yaroqli"><Input type="number" value={good} onChange={(e) => setGood(+e.target.value)} /></Field><Field label="Brak" hint={good + scrap ? `${((scrap / (good + scrap)) * 100).toFixed(1)}% (norma ${bom.scrapPct}%)` : undefined}><Input type="number" value={scrap} onChange={(e) => setScrap(+e.target.value)} /></Field></div><Field label="Natija"><Segmented value={res} onChange={setRes} options={[{ id: 'pass', label: '✓ O‘tdi' }, { id: 'fail', label: '✗ O‘tmadi' }]} /></Field><Field label="Izoh"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nuqsonlar, sabablar…" /></Field></div>
      </Modal>
    </Drawer>
  );
}

function Planning() {
  const { db, m } = useCtx(); const { dispatch, role } = useApp();
  const fin = db.products.filter((p) => p.kind === 'finished');
  const plan = fin.map((p) => { const onHand = peek(db.stock, p.id, 'wF').qty; const res = db.salesOrders.filter((o) => o.companyId === 'fac' && ['confirmed', 'in_production', 'quote'].includes(o.status)).reduce((a, o) => a + o.lines.filter((l) => l.productId === p.id).reduce((x, l) => x + l.qty, 0), 0); const wip = db.workOrders.filter((w) => w.productId === p.id && ['planned', 'released', 'in_progress', 'qc'].includes(w.status)).reduce((a, w) => a + w.qty, 0); const net = onHand + wip - res - p.reorderPoint; return { p, onHand, res, wip, net, suggest: net < 0 ? Math.ceil(-net / 10) * 10 + p.reorderQty / 2 : 0 }; });
  const raw = db.products.filter((p) => p.kind === 'raw').map((p) => { const need = db.workOrders.filter((w) => w.status === 'planned').reduce((a, w) => a + (woRequirements(db, w).find((r) => r.productId === p.id)?.need || 0), 0) + plan.reduce((a, x) => { const b = db.boms.find((bb) => bb.productId === x.p.id)!; const l = b.lines.find((ll) => ll.productId === p.id); return a + (l ? l.qty * x.suggest * (1 + b.scrapPct / 100) : 0); }, 0); const have = peek(db.stock, p.id, 'wR').qty; const inc = db.purchaseOrders.filter((po) => ['approved', 'partially_received'].includes(po.status)).reduce((a, po) => a + po.lines.reduce((x, l, i) => x + (l.productId === p.id ? l.qty - (po.receivedQty[i] || 0) : 0), 0), 0); return { p, need, have, inc, short: Math.max(0, need - have - inc) }; });
  const wos = db.workOrders.filter((w) => w.status !== 'cancelled' && w.plannedEnd >= addDays(TODAY, -10));
  const start = addDays(TODAY, -10); const days = 30;
  return (
    <div className="space-y-4">
      <Card><CardHeader title={<span className="flex items-center">Ishlab chiqarish rejasi (MRP)<Explain term="MRP">Material Requirements Planning — buyurtmalar, qoldiq va jarayondagi ishlar asosida qancha ishlab chiqarish va qancha xomashyo kerakligini hisoblash.</Explain></span>} subtitle="Tayyor mahsulot: qoldiq + jarayonda − buyurtmalar − xavfsizlik zaxirasi" icon={<CalendarRange className="h-4 w-4" />} />
        <DataTable rows={plan} rowKey={(r) => r.p.id} dense cols={[{ key: 'p', header: 'Mahsulot', primary: true, cell: (r) => r.p.name }, { key: 'h', header: 'Omborda', align: 'right', cell: (r) => Math.round(r.onHand) }, { key: 'w', header: 'Jarayonda', align: 'right', cell: (r) => r.wip }, { key: 'r', header: 'Buyurtmalar (taklif bilan)', align: 'right', cell: (r) => r.res }, { key: 'sf', header: 'Xavfsizlik zaxirasi', align: 'right', cell: (r) => r.p.reorderPoint }, { key: 'n', header: 'Sof holat', align: 'right', cell: (r) => <span className={r.net < 0 ? 'text-neg' : 'text-pos'}>{Math.round(r.net)}</span> }, { key: 's', header: 'Tavsiya', align: 'right', cell: (r) => (r.suggest ? <b>{r.suggest}</b> : '—') }, { key: 'a', header: '', cell: (r) => r.suggest && can(role, 'manufacturing', 'create') ? <Button size="xs" variant="primary" onClick={() => dispatch('wo.create', { productId: r.p.id, qty: r.suggest, plannedStart: addDays(TODAY, 1), plannedEnd: addDays(TODAY, 8), companyId: 'fac', branchId: 'chr' }, { success: 'Ish buyurtmasi rejalashtirildi' })}>Rejalash</Button> : null }]} />
      </Card>
      <Card><CardHeader title="Xomashyo ehtiyoji" subtitle="Rejadagi ish buyurtmalari va tavsiyalar bo‘yicha" icon={<ListTree className="h-4 w-4" />} />
        <DataTable rows={raw} rowKey={(r) => r.p.id} dense cols={[{ key: 'p', header: 'Xomashyo', primary: true, cell: (r) => r.p.name }, { key: 'n', header: 'Ehtiyoj', align: 'right', cell: (r) => `${Math.round(r.need).toLocaleString('ru-RU')} ${r.p.unit}` }, { key: 'h', header: 'Omborda', align: 'right', cell: (r) => Math.round(r.have).toLocaleString('ru-RU') }, { key: 'i', header: 'Yo‘lda', align: 'right', cell: (r) => (r.inc ? `+${Math.round(r.inc).toLocaleString('ru-RU')}` : '—') }, { key: 's', header: 'Yetishmovchilik', align: 'right', cell: (r) => (r.short ? <span className="font-semibold text-neg">{Math.round(r.short).toLocaleString('ru-RU')}</span> : <span className="text-pos">✓</span>) }, { key: 'v', header: 'Qiymat', align: 'right', cell: (r) => (r.short ? m(r.short * r.p.stdCost) : '—') }]} />
      </Card>
      <Card><CardHeader title="Gantt: ish buyurtmalari" subtitle={`${fmtDate(start)} – ${fmtDate(addDays(start, days))}`} icon={<CalendarRange className="h-4 w-4" />} />
        <div className="thin-scroll overflow-x-auto"><div className="min-w-[760px]">
          <div className="ml-44 grid text-[10px] text-t3" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>{Array.from({ length: days }).map((_, i) => { const d = addDays(start, i); return <div key={i} className={cx('border-l border-line py-1 text-center', d === TODAY && 'bg-accent-soft font-semibold text-accent')}>{+d.slice(8)}</div>; })}</div>
          {wos.map((w) => { const a = Math.max(0, diffDays(w.plannedStart, start)); const b = Math.min(days, diffDays(w.plannedEnd, start) + 1); if (b <= 0 || a >= days) return null; const tone = { completed: 'bg-pos/70', qc: 'bg-warn/80', in_progress: 'bg-accent', released: 'bg-accent/70', planned: 'bg-t3/40', cancelled: '' }[w.status]; return (
            <div key={w.id} className="flex items-center border-t border-line py-1.5"><div className="w-44 shrink-0 truncate pr-2 text-[11.5px]"><span className="font-mono text-t3">{w.no.slice(-5)}</span> {byId(db.products, w.productId)?.name.replace('Elektr taqsimlash ', '')}</div>
              <div className="relative h-5 flex-1"><div className={cx('absolute top-0 h-5 rounded-md px-1.5 text-[10px] leading-5 text-white', tone)} style={{ left: `${(a / days) * 100}%`, width: `${((b - a) / days) * 100}%` }}>{w.qty}</div></div></div>
          ); })}
        </div></div>
        <div className="mt-2 flex gap-3 text-[11px] text-t3">{[['bg-t3/40', 'Rejada'], ['bg-accent', 'Jarayonda'], ['bg-warn/80', 'QC'], ['bg-pos/70', 'Yakunlangan']].map(([c, l]) => <span key={l} className="flex items-center gap-1"><span className={cx('h-2.5 w-4 rounded', c)} />{l}</span>)}</div>
      </Card>
    </div>
  );
}

function Boms() {
  const { db, mf } = useCtx(); const { role, dispatch } = useApp();
  const [edit, setEdit] = useState<string | null>(null);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {db.boms.map((b) => { const p = byId(db.products, b.productId)!; const mat = b.lines.reduce((a, l) => a + l.qty * (byId(db.products, l.productId)?.stdCost || 0), 0) * (1 + b.scrapPct / 100); const tot = mat + b.labor + b.machine + b.energy + b.overhead; return (
        <Card key={b.id}>
          <CardHeader title={p.name} subtitle={`${p.sku} · quvvat ~${b.outputPerHour} dona/soat · brak normasi ${b.scrapPct}%`} icon={<ListTree className="h-4 w-4" />} actions={can(role, 'manufacturing', 'edit') ? <Button size="xs" onClick={() => setEdit(b.id)}>Tahrirlash</Button> : undefined} />
          <table className="w-full text-[12.5px]"><thead className="text-[11px] text-t3"><tr><th className="py-1 text-left font-semibold">Komponent</th><th className="py-1 text-right font-semibold">Miqdor</th><th className="py-1 text-right font-semibold">Std narx</th><th className="py-1 text-right font-semibold">Summa</th></tr></thead>
            <tbody>{b.lines.map((l) => { const rp = byId(db.products, l.productId)!; return <tr key={l.productId} className="border-t border-line"><td className="py-1.5">{rp.name}</td><td className="num text-right">{l.qty} {rp.unit}</td><td className="num text-right text-t3">{mf(rp.stdCost)}</td><td className="num text-right">{mf(l.qty * rp.stdCost)}</td></tr>; })}
              <tr className="border-t border-line text-t3"><td className="py-1.5">+ brak normasi {b.scrapPct}%</td><td /><td /><td className="num text-right">{mf(mat - mat / (1 + b.scrapPct / 100))}</td></tr>
              {[['Mehnat', b.labor], ['Mashina vaqti', b.machine], ['Energiya', b.energy], ['Umumishlab chiqarish ustamasi', b.overhead]].map(([l, v]) => <tr key={l as string} className="border-t border-line"><td className="py-1.5 text-t2">{l as string}</td><td /><td /><td className="num text-right">{mf(v as number)}</td></tr>)}</tbody>
            <tfoot className="border-t-2 border-line-strong font-semibold"><tr><td className="py-1.5">Standart tannarx</td><td /><td /><td className="num text-right">{mf(tot)}</td></tr><tr className="text-[12px] font-normal text-t2"><td className="py-0.5">Sotuv narxi / marja</td><td /><td /><td className="num text-right">{mf(p.price)} · <b className="text-pos">{((1 - tot / p.price) * 100).toFixed(1)}%</b></td></tr></tfoot></table>
          <p className="mt-2 text-[11px] text-t3">Marshrut: {b.routing.map((r) => `${byId(db.machines, r.machineId)?.name.split(' (')[0]} ${r.factor} soat`).join(' → ')}</p>
        </Card>
      ); })}
      {edit && (() => { const b = byId(db.boms, edit)!; return <BomEdit key={edit} bomId={edit} onClose={() => setEdit(null)} onSave={(x) => { if (dispatch('bom.update', { id: b.id, ...x }, { success: 'BOM yangilandi — keyingi ish buyurtmalariga qo‘llanadi' }) !== undefined) setEdit(null); }} />; })()}
    </div>
  );
}

function BomEdit({ bomId, onClose, onSave }: { bomId: string; onClose: () => void; onSave: (x: Record<string, unknown>) => void }) {
  const { db } = useCtx(); const b = byId(db.boms, bomId)!;
  const [lines, setLines] = useState(b.lines.map((l) => ({ ...l }))); const [c, setC] = useState({ labor: b.labor, machine: b.machine, energy: b.energy, overhead: b.overhead, scrapPct: b.scrapPct });
  return (
    <Modal open onClose={onClose} size="md" title={`BOM: ${byId(db.products, b.productId)?.name}`} footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" onClick={() => onSave({ lines, ...c })}>Saqlash</Button></>}>
      <div className="space-y-2">{lines.map((l, i) => <div key={l.productId} className="grid grid-cols-[1fr_120px] items-center gap-2"><span className="text-[12.5px]">{byId(db.products, l.productId)?.name}</span><Input type="number" className="h-8 text-right" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: +e.target.value } : x)))} /></div>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">{(['labor', 'machine', 'energy', 'overhead', 'scrapPct'] as const).map((k) => <Field key={k} label={{ labor: 'Mehnat (birlik)', machine: 'Mashina (birlik)', energy: 'Energiya (birlik)', overhead: 'Ustama (birlik)', scrapPct: 'Brak normasi %' }[k]}><Input type="number" value={c[k]} onChange={(e) => setC({ ...c, [k]: +e.target.value })} /></Field>)}</div>
    </Modal>
  );
}

function Costing() {
  const { db, mf, m } = useCtx(); const f = useChartFmt();
  const [period, setPeriod] = useState<'q3' | 'h1' | 'ytd'>('q3');
  const pr = { q3: ['2026-07-01', TODAY], h1: ['2026-01-01', '2026-06-30'], ytd: ['2026-01-01', TODAY] }[period];
  const u = useMemo(() => A.unitCosts(db, ['fac'], pr[0], pr[1]), [db, pr]);
  const ps = useMemo(() => A.productionStats(db, ['fac'], pr[0], pr[1]), [db, pr]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Segmented value={period} onChange={setPeriod} options={[{ id: 'q3', label: '3-chorak' }, { id: 'h1', label: '1-yarim yillik' }, { id: 'ytd', label: 'Yil boshidan' }]} /><DemoTag /></div>
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Ishlab chiqarildi (yaroqli)" value={`${ps.good.toLocaleString('ru-RU')} dona`} /><Stat label="Haqiqiy tannarx" value={m(ps.cost)} /><Stat label="Standart bo‘yicha" value={m(ps.std)} /><Stat label={<span className="flex items-center">Farq<Explain term="Tannarx farqi">haqiqiy − standart. Musbat bo‘lsa — rejadan qimmatga tushgan (xomashyo narxi oshishi, ortiqcha brak).</Explain></span>} value={m(ps.variance)} tone={ps.variance > 0 ? 'neg' : 'pos'} sub={`${ps.std ? ((ps.variance / ps.std) * 100).toFixed(1) : 0}%`} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {u.map((x) => { const comp = [{ k: 'Xomashyo', s: x.std.material, a: x.act?.material }, { k: 'Mehnat', s: x.std.labor, a: x.act?.labor }, { k: 'Mashina', s: x.std.machine, a: x.act?.machine }, { k: 'Energiya', s: x.std.energy, a: x.act?.energy }, { k: 'Ustama', s: x.std.overhead, a: x.act?.overhead }]; const act = x.act?.total || 0; return (
          <Card key={x.p.id}>
            <CardHeader title={x.p.name} subtitle={`${x.good} dona ishlab chiqarilgan · brak ${x.scrapPct.toFixed(1)}% (norma ${x.bom.scrapPct}%)`} icon={<Calculator className="h-4 w-4" />} />
            <div className="h-[150px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={comp.map((c) => ({ k: c.k, Standart: c.s, Fakt: c.a || 0 }))} margin={{ left: -6 }}><CartesianGrid vertical={false} /><XAxis dataKey="k" axisLine={false} tickLine={false} tick={{ fontSize: 10.5 }} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={50} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="Standart" fill="var(--text-3)" fillOpacity={0.35} radius={[4, 4, 0, 0]} /><Bar dataKey="Fakt" radius={[4, 4, 0, 0]}>{comp.map((c, i) => <Cell key={i} fill={(c.a || 0) > c.s * 1.02 ? PALETTE[4] : PALETTE[0]} />)}</Bar></BarChart></ResponsiveContainer></div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]"><div className="rounded-lg bg-surface-2 p-2"><p className="text-t3">Standart</p><p className="num text-[12.5px] font-semibold">{mf(x.std.total)}</p></div><div className="rounded-lg bg-surface-2 p-2"><p className="text-t3">Fakt</p><p className={cx('num text-[12.5px] font-semibold', act > x.std.total ? 'text-neg' : 'text-pos')}>{act ? mf(act) : '—'}</p></div><div className="rounded-lg bg-surface-2 p-2"><p className="text-t3">Narx</p><p className="num text-[12.5px] font-semibold">{mf(x.price)}</p></div><div className="rounded-lg bg-surface-2 p-2"><p className="text-t3">Yalpi marja</p><p className="num text-[12.5px] font-semibold text-pos">{act ? `${mf(x.price - act)} · ${((1 - act / x.price) * 100).toFixed(1)}%` : '—'}</p></div></div>
          </Card>
        ); })}
      </div>
      <Card><CardHeader title="Tannarx tarkibi — misol (DEMO)" subtitle="Elektr taqsimlash shkafi ShR-12, standart bo‘yicha" />
        {(() => { const x = u.find((y) => y.p.id === 'f1')!; const rows = [['Xomashyo', x.std.material], ['Mehnat', x.std.labor], ['Mashina', x.std.machine], ['Energiya', x.std.energy], ['Ustama', x.std.overhead]] as [string, number][]; return (
          <div className="grid items-center gap-4 sm:grid-cols-[1fr_280px]"><div className="flex h-8 overflow-hidden rounded-xl">{rows.map(([k, v], i) => <div key={k} style={{ width: `${(v / x.price) * 100}%`, background: PALETTE[i] }} className="grid place-items-center text-[10px] font-semibold text-white" title={`${k}: ${mf(v)}`}>{(v / x.price) * 100 > 6 ? k : ''}</div>)}<div style={{ width: `${(1 - x.std.total / x.price) * 100}%` }} className="grid place-items-center bg-pos/25 text-[10px] font-semibold text-pos">Marja</div></div>
            <div className="space-y-0.5 text-[12.5px]">{rows.map(([k, v], i) => <div key={k} className="flex justify-between"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i] }} />{k}</span><span className="num">{mf(v)}</span></div>)}<div className="flex justify-between border-t border-line pt-1 font-semibold"><span>Jami tannarx</span><span className="num">{mf(x.std.total)}</span></div><div className="flex justify-between"><span>Sotuv narxi</span><span className="num">{mf(x.price)}</span></div><div className="flex justify-between font-semibold text-pos"><span>Marja</span><span className="num">{mf(x.price - x.std.total)}</span></div></div></div>
        ); })()}
      </Card>
    </div>
  );
}

function Machines() {
  const { db, mf } = useCtx();
  return (
    <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {db.machines.map((x) => { const asset = byId(db.assets, x.assetId); const wos = db.workOrders.filter((w) => byId(db.boms, w.bomId)?.routing.some((r) => r.machineId === x.id) && ['in_progress', 'qc'].includes(w.status)); return (
        <Card key={x.id}>
          <div className="flex items-start justify-between"><div><h3 className="text-[14px] font-semibold text-t1">{x.name}</h3><p className="text-[12px] text-t3">{x.kind} · {mf(x.hourlyCost)}/soat</p></div><StatusBadge status={x.status} /></div>
          <div className="mt-4 flex items-center gap-4"><div className="relative h-20 w-20"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--surface-3)" strokeWidth="11" /><circle cx="50" cy="50" r="40" fill="none" stroke={x.status === 'maintenance' ? 'var(--warn)' : 'var(--accent)'} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${x.oee * 251} 251`} /></svg><div className="absolute inset-0 grid place-items-center text-[15px] font-bold">{(x.oee * 100).toFixed(0)}%</div></div>
            <div className="flex-1 space-y-1 text-[12px]"><div className="flex justify-between"><span className="text-t3">Ishlagan (sentyabr)</span><span className="num">{x.usedHours} soat</span></div><div className="flex justify-between"><span className="text-t3">Quvvat</span><span className="num">{x.capacityHours} soat/oy</span></div><div className="flex justify-between"><span className="text-t3">Faol buyurtmalar</span><span className="num">{wos.length}</span></div></div></div>
          {asset && <p className="mt-3 border-t border-line pt-2 text-[11.5px] text-t3">Asosiy vosita {asset.code} · boshlang‘ich qiymat {mf(asset.cost)}</p>}
          {x.status === 'maintenance' && <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-warn"><AlertTriangle className="h-3.5 w-3.5" />Rejali ta’mir — hisoblagich qutisi ishlab chiqarishi sekinlashgan</p>}
          <p className="mt-2 text-[10.5px] text-t3">OEE — taxminiy (IoT/sensorlar ulanmagan; ish buyurtmalari marshrutidan hisoblangan)</p>
        </Card>
      ); })}
    </div>
  );
}
