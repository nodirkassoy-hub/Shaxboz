'use client';
import { useMemo, useState } from 'react';
import { Warehouse as WhIcon, PackageCheck, Truck, ArrowLeftRight, ClipboardCheck, MapPin, Plus, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId, docTotals } from '@/lib/db';
import { peek } from '@/lib/core/inventory';
import { fmtDate, TODAY, addDays } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Progress, Stat } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { can } from '@/lib/rbac';
import { MOVE_L } from './Inventory';

type Tab = 'overview' | 'receiving' | 'shipping' | 'transfers' | 'count';

export default function Warehouse() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'overview');
  return (
    <div>
      <PageHeader title="Omborlar" crumbs={['Operatsiyalar', 'Omborlar']} subtitle={<span className="flex items-center gap-2">Ko‘p omborli boshqaruv: joylar/stellajlar, qabul, jo‘natish, o‘tkazma va inventarizatsiya <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Omborlar', icon: <WhIcon className="h-3.5 w-3.5" /> }, { id: 'receiving', label: 'Qabul qilish', icon: <PackageCheck className="h-3.5 w-3.5" /> }, { id: 'shipping', label: 'Jo‘natish', icon: <Truck className="h-3.5 w-3.5" /> }, { id: 'transfers', label: 'O‘tkazmalar', icon: <ArrowLeftRight className="h-3.5 w-3.5" /> }, { id: 'count', label: 'Inventarizatsiya', icon: <ClipboardCheck className="h-3.5 w-3.5" /> }]} />
      {tab === 'overview' && <Overview />}{tab === 'receiving' && <Receiving />}{tab === 'shipping' && <Shipping />}{tab === 'transfers' && <Transfers />}{tab === 'count' && <Count />}
    </div>
  );
}

function Overview() {
  const { db, s, m } = useCtx(); const { setFilters, go } = useApp();
  const whs = db.warehouses.filter((w) => s.companyIds.includes(w.companyId));
  return (
    <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {whs.map((w) => { const rows = A.stockRows(db, s, w.id); const val = rows.reduce((a, r) => a + r.value, 0); const low = rows.filter((r) => r.status === 'low' || r.status === 'out').length; const units = rows.reduce((a, r) => a + (r.p.unit === 'metr' ? r.qty / 50 : r.p.unit === 'kg' ? r.qty / 10 : r.qty / (r.p.kind === 'finished' ? 1 : 8)), 0); const pc = Math.min(100, (units / w.capacity) * 100); const mv = db.moves.filter((x) => x.warehouseId === w.id && x.date >= addDays(TODAY, -6)).length; return (
        <Card key={w.id} hover onClick={() => { setFilters({ warehouseId: w.id }); go('inventory', 'stock'); }}>
          <div className="flex items-start justify-between"><div><Badge>{w.code}</Badge><h3 className="mt-1.5 text-[14px] font-semibold text-t1">{w.name}</h3><p className="flex items-center gap-1 text-[12px] text-t3"><MapPin className="h-3 w-3" />{byId(db.branches, w.branchId)?.city} · {byId(db.companies, w.companyId)?.short} · mudir {w.manager}</p></div><Badge tone={w.kind === 'raw' ? 'warn' : w.kind === 'finished' ? 'accent' : 'neutral'}>{{ goods: 'Tovar', raw: 'Xomashyo', finished: 'Tayyor mahsulot' }[w.kind]}</Badge></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]"><div><p className="text-t3">Qiymat</p><p className="num text-[13.5px] font-semibold text-t1">{m(val)}</p></div><div><p className="text-t3">SKU</p><p className="num text-[13.5px] font-semibold text-t1">{rows.filter((r) => r.qty > 0).length}</p></div><div><p className="text-t3">Kam</p><p className={cx('num text-[13.5px] font-semibold', low ? 'text-warn' : 'text-t1')}>{low}</p></div></div>
          <div className="mt-3"><div className="flex justify-between text-[11px] text-t3"><span>Bandlik (taxminiy)</span><span className="num">{pc.toFixed(0)}%</span></div><Progress value={pc} tone={pc > 85 ? 'neg' : pc > 65 ? 'warn' : 'accent'} height={5} className="mt-1" /></div>
          <div className="mt-3 flex flex-wrap gap-1">{w.bins.map((b) => <span key={b} className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-t2">{b}</span>)}</div>
          <p className="mt-2 text-[11px] text-t3">Oxirgi 7 kunda {mv} ta harakat</p>
        </Card>
      ); })}
    </div>
  );
}

function Receiving() {
  const { db, s, mf } = useCtx(); const { dispatch, role, go } = useApp();
  const pos = db.purchaseOrders.filter((p) => A.inScope(s, p.companyId, p.branchId) && ['approved', 'partially_received'].includes(p.status));
  const recent = db.moves.filter((mv) => s.companyIds.includes(mv.companyId) && (mv.kind === 'receipt' || mv.kind === 'production_in')).slice(-10).reverse();
  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Card><CardHeader title="Qabul qilinishi kutilayotgan" subtitle={`${pos.length} ta tasdiqlangan xarid buyurtmasi`} icon={<PackageCheck className="h-4 w-4" />} />
        <div className="space-y-2">{pos.map((p) => <div key={p.id} className="rounded-xl border border-line p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[13px] font-semibold text-t1"><span className="font-mono">{p.no}</span> · {byId(db.parties, p.supplierId)?.name}</p><p className="text-[11.5px] text-t3">{byId(db.warehouses, p.warehouseId)?.name} · kutilgan {fmtDate(p.expectedDate)} {p.expectedDate < TODAY && <Badge tone="neg">kechikmoqda</Badge>}</p></div>{can(role, 'warehouse', 'edit') && <div className="flex gap-1.5"><Button size="xs" onClick={() => go('purchasing', 'orders', { po: p.id })}>Qisman</Button><Button size="xs" variant="primary" icon={<CheckCircle2 className="h-3 w-3" />} onClick={() => dispatch('po.receive', { id: p.id }, { success: `${p.no} qabul qilindi — zaxira va bosh kitob yangilandi` })}>Qabul qilish</Button></div>}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">{p.lines.map((l, i) => <Badge key={i}>{l.description} · {(l.qty - (p.receivedQty[i] || 0)).toLocaleString('ru-RU')} {byId(db.products, l.productId)?.unit}</Badge>)}</div></div>)}{!pos.length && <p className="py-6 text-center text-[12.5px] text-t3">Kutilayotgan kirim yo‘q</p>}</div>
      </Card>
      <Card><CardHeader title="So‘nggi kirimlar" icon={<CheckCircle2 className="h-4 w-4" />} /><div className="divide-y divide-line">{recent.map((mv) => <div key={mv.id} className="flex items-center gap-2 py-2 text-[12.5px]"><span className="w-12 text-t3">{fmtDate(mv.date).slice(0, 5)}</span><span className="flex-1 truncate">{byId(db.products, mv.productId)?.name}</span><span className="text-t3">{byId(db.warehouses, mv.warehouseId)?.code}</span><span className="num text-pos">+{Math.round(mv.qty).toLocaleString('ru-RU')}</span><span className="num w-20 text-right text-t2">{mf(mv.cost)}</span></div>)}</div></Card>
    </div>
  );
}

function Shipping() {
  const { db, s, mf } = useCtx(); const { dispatch, role, go } = useApp();
  const sos = db.salesOrders.filter((o) => A.inScope(s, o.companyId, o.branchId) && ['confirmed', 'in_production'].includes(o.status)).sort((a, b) => (a.deliveryDate < b.deliveryDate ? -1 : 1));
  return (
    <Card><CardHeader title="Jo‘natish navbati" subtitle="Yetkazish sanasi bo‘yicha · yetkazish ombordan chiqim va tannarx provodkasini yaratadi" icon={<Truck className="h-4 w-4" />} />
      <DataTable rows={sos} rowKey={(o) => o.id} onRow={(o) => go('sales', 'orders', { order: o.id })}
        cols={[{ key: 'no', header: '№', primary: true, cell: (o) => <span className="font-mono text-[12px]">{o.no}</span> }, { key: 'c', header: 'Mijoz', cell: (o) => byId(db.parties, o.customerId)?.name }, { key: 'w', header: 'Ombor', cell: (o) => byId(db.warehouses, o.warehouseId)?.code }, { key: 'd', header: 'Yetkazish', cell: (o) => <span className={cx(o.deliveryDate < TODAY && 'text-neg')}>{fmtDate(o.deliveryDate)}</span> }, { key: 'l', header: 'Tayyorlik', cell: (o) => { const ok = o.lines.every((l) => !l.productId || byId(db.products, l.productId)?.kind === 'service' || peek(db.stock, l.productId, o.warehouseId).qty >= l.qty); return ok ? <Badge tone="pos">Zaxira bor</Badge> : <Badge tone="warn">Yetishmaydi</Badge>; } }, { key: 't', header: 'Summa', align: 'right', cell: (o) => mf(docTotals(o.lines).total) }, { key: 's', header: 'Holat', cell: (o) => <StatusBadge status={o.status} /> }, { key: 'a', header: '', cell: (o) => can(role, 'warehouse', 'edit') && o.status === 'confirmed' ? <Button size="xs" variant="primary" onClick={(e) => { e.stopPropagation(); dispatch('so.deliver', { id: o.id }, { success: `${o.no} jo‘natildi` }); }}>Jo‘natish</Button> : null }]} />
    </Card>
  );
}

function Transfers() {
  const { db, s } = useCtx(); const { dispatch, role, nav } = useApp();
  const [open, setOpen] = useState(nav.params?.new === '1');
  const trs = db.moves.filter((mv) => s.companyIds.includes(mv.companyId) && mv.kind === 'transfer_out').slice().reverse();
  const whs = db.warehouses.filter((w) => s.companyIds.includes(w.companyId));
  const [f, setF] = useState({ from: whs[0]?.id, to: whs[1]?.id, productId: '', qty: 0 });
  const fromWh = byId(db.warehouses, f.from); const prods = db.products.filter((p) => p.companyId === fromWh?.companyId && peek(db.stock, p.id, f.from).qty > 0);
  const have = f.productId ? peek(db.stock, f.productId, f.from).qty : 0;
  return (
    <Card><CardHeader title="Ombordan omborga o‘tkazmalar" subtitle="Tannarx bilan ko‘chiriladi (FIFO qatlami saqlanadi); bosh kitobga ta’sir qilmaydi, sub-kitobda aks etadi" icon={<ArrowLeftRight className="h-4 w-4" />} actions={can(role, 'warehouse', 'create') ? <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Yangi o‘tkazma</Button> : undefined} />
      <DataTable rows={trs} rowKey={(mv) => mv.id} dense cols={[{ key: 'd', header: 'Sana', cell: (mv) => fmtDate(mv.date) }, { key: 'r', header: '№', cell: (mv) => <span className="font-mono text-[11.5px]">{mv.ref}</span> }, { key: 'p', header: 'Mahsulot', primary: true, cell: (mv) => byId(db.products, mv.productId)?.name }, { key: 'f', header: 'Qayerdan → Qayerga', cell: (mv) => { const inn = db.moves.find((x) => x.ref === mv.ref && x.kind === 'transfer_in' && x.productId === mv.productId); return <span>{byId(db.warehouses, mv.warehouseId)?.code} → {byId(db.warehouses, inn?.warehouseId)?.code}</span>; } }, { key: 'q', header: 'Miqdor', align: 'right', cell: (mv) => `${Math.round(-mv.qty).toLocaleString('ru-RU')} ${byId(db.products, mv.productId)?.unit}` }, { key: 'u', header: 'Kim', hideMobile: true, cell: (mv) => <span className="text-[11.5px] text-t3">{mv.user}</span> }]} />
      <Modal open={open} onClose={() => setOpen(false)} title="Ombordan omborga o‘tkazma" size="sm" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button><Button variant="primary" disabled={!f.productId || !(f.qty > 0) || f.qty > have} onClick={() => { if (dispatch('stock.transfer', { date: TODAY, productId: f.productId, from: f.from, to: f.to, qty: f.qty }, { success: 'O‘tkazma bajarildi' }) !== undefined) setOpen(false); }}>O‘tkazish</Button></>}>
        <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><Field label="Qayerdan"><Select value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, productId: '' })}>{whs.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</Select></Field><Field label="Qayerga"><Select value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })}>{whs.filter((w) => w.id !== f.from && w.companyId === fromWh?.companyId).map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</Select></Field></div>
          <Field label="Mahsulot"><Select value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}><option value="">— tanlang —</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.name} ({Math.floor(peek(db.stock, p.id, f.from).qty)} {p.unit})</option>)}</Select></Field>
          <Field label="Miqdor" hint={f.productId ? `Mavjud: ${Math.floor(have)}` : undefined} error={f.qty > have ? 'Qoldiqdan ko‘p' : undefined}><Input type="number" value={f.qty || ''} onChange={(e) => setF({ ...f, qty: +e.target.value })} /></Field></div>
      </Modal>
    </Card>
  );
}

function Count() {
  const { db, s, mf } = useCtx(); const { dispatch, role, filters } = useApp();
  const whs = db.warehouses.filter((w) => s.companyIds.includes(w.companyId));
  const [wh, setWh] = useState(filters.warehouseId !== 'all' ? filters.warehouseId : whs[0]?.id);
  const rows = useMemo(() => A.stockRows(db, s, wh).filter((r) => r.qty > 0), [db, s, wh]);
  const [counted, setCounted] = useState<Record<string, number>>({});
  const diffs = rows.filter((r) => counted[r.p.id] !== undefined && counted[r.p.id] !== Math.round(r.qty * 100) / 100);
  const val = diffs.reduce((a, r) => a + (counted[r.p.id] - r.qty) * r.unitCost, 0);
  const submit = () => {
    const w = byId(db.warehouses, wh)!;
    for (const r of diffs) dispatch('stock.adjust.request', { title: `Inventarizatsiya farqi — ${w.code} (${r.p.name})`, description: `Hisobda ${Math.round(r.qty)} ${r.p.unit}, sanoqda ${counted[r.p.id]} ${r.p.unit}.`, amount: Math.abs(Math.round((counted[r.p.id] - r.qty) * r.unitCost)), companyId: w.companyId, deadline: addDays(TODAY, 3), data: { productId: r.p.id, warehouseId: wh, delta: counted[r.p.id] - r.qty, reason: `Inventarizatsiya ${fmtDate(TODAY)}` } }, { silent: true });
    useApp.getState().toast({ kind: 'success', title: `${diffs.length} ta farq tasdiqlashga yuborildi`, body: 'Bosh buxgalter tasdiqlagach qoldiq va provodka yangilanadi.' }); setCounted({});
  };
  return (
    <Card><CardHeader title="Inventarizatsiya (sanoq)" subtitle="Haqiqiy miqdorni kiriting. Farqlar tasdiqlashga yuboriladi — ombor xodimi qoldiqni to‘g‘ridan-to‘g‘ri o‘zgartira olmaydi." icon={<ClipboardCheck className="h-4 w-4" />}
      actions={<><Select className="h-8.5 w-auto text-[12.5px]" value={wh} onChange={(e) => { setWh(e.target.value); setCounted({}); }}>{whs.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</Select>{can(role, 'warehouse', 'create') && <Button variant="primary" disabled={!diffs.length} onClick={submit}>Farqlarni yuborish ({diffs.length})</Button>}</>} />
      {diffs.length > 0 && <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><Stat label="Farqli pozitsiyalar" value={String(diffs.length)} /><Stat label="Farq qiymati" value={mf(val)} tone={val < 0 ? 'neg' : 'pos'} /></div>}
      <DataTable rows={rows} rowKey={(r) => r.p.id} pageSize={20} dense search={(r) => `${r.p.sku} ${r.p.name}`}
        cols={[{ key: 'n', header: 'Mahsulot', primary: true, cell: (r) => <div><p>{r.p.name}</p><p className="font-mono text-[11px] text-t3">{r.p.sku} · {r.p.defaultBin}</p></div> }, { key: 'q', header: 'Hisobda', align: 'right', cell: (r) => `${(Math.round(r.qty * 100) / 100).toLocaleString('ru-RU')} ${r.p.unit}` }, { key: 'c', header: 'Sanoq', align: 'right', cell: (r) => <Input className="ml-auto h-8 w-28 text-right text-[12px]" type="number" placeholder="—" value={counted[r.p.id] ?? ''} onChange={(e) => setCounted({ ...counted, [r.p.id]: e.target.value === '' ? undefined as never : +e.target.value })} /> }, { key: 'd', header: 'Farq', align: 'right', cell: (r) => { if (counted[r.p.id] === undefined) return '—'; const d = counted[r.p.id] - r.qty; return <span className={cx(Math.abs(d) < 0.01 ? 'text-pos' : d < 0 ? 'text-neg' : 'text-warn')}>{Math.abs(d) < 0.01 ? '✓' : `${d > 0 ? '+' : ''}${(Math.round(d * 100) / 100).toLocaleString('ru-RU')}`}</span>; } }, { key: 'v', header: 'Farq qiymati', align: 'right', cell: (r) => counted[r.p.id] === undefined ? '—' : mf((counted[r.p.id] - r.qty) * r.unitCost) }]} />
    </Card>
  );
}

export { MOVE_L };
