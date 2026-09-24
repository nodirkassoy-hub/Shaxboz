'use client';
import { useMemo, useState } from 'react';
import { Plus, Boxes, Package, History, Layers, Barcode, AlertTriangle, ShoppingCart, Upload } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId } from '@/lib/db';
import { fmtDate, TODAY } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat, Segmented, Explain } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { can } from '@/lib/rbac';
import type { Product } from '@/lib/types';
import { ImportWizard } from './ImportWizard';

type Tab = 'stock' | 'products' | 'movements' | 'batches';
export const MOVE_L: Record<string, string> = { receipt: 'Kirim', issue: 'Sotuv chiqimi', transfer_in: 'O‘tkazma (+)', transfer_out: 'O‘tkazma (−)', adjustment: 'Inventarizatsiya', production_in: 'Ishlab chiqarishdan', production_out: 'Ishlab chiqarishga', opening: 'Boshlang‘ich qoldiq', return: 'Qaytarish' };

export default function Inventory() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'stock');
  return (
    <div>
      <PageHeader title="Tovar zaxiralari" crumbs={['Operatsiyalar', 'Zaxiralar']} subtitle={<span className="flex items-center gap-2">Qoldiqlar, rezerv, yo‘ldagi, harakatlar va partiyalar · FIFO (Trading) / o‘rtacha tannarx (Factory, Services) <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'stock', label: 'Qoldiqlar', icon: <Boxes className="h-3.5 w-3.5" /> }, { id: 'products', label: 'Mahsulotlar', icon: <Package className="h-3.5 w-3.5" /> }, { id: 'movements', label: 'Harakatlar', icon: <History className="h-3.5 w-3.5" /> }, { id: 'batches', label: 'Partiyalar (FIFO)', icon: <Layers className="h-3.5 w-3.5" /> }]} />
      {tab === 'stock' && <Stock />}{tab === 'products' && <Products />}{tab === 'movements' && <Movements />}{tab === 'batches' && <Batches />}
    </div>
  );
}

function Stock() {
  const { db, s, m, mf } = useCtx(); const { go, nav, filters, setFilters } = useApp();
  const [kind, setKind] = useState<'all' | 'goods' | 'raw' | 'finished'>('all'); const [only, setOnly] = useState(false);
  const [view, setView] = useState<string | null>(nav.params?.product || null);
  const wh = filters.warehouseId === 'all' ? undefined : filters.warehouseId;
  const rows = useMemo(() => A.stockRows(db, s, wh).filter((r) => (kind === 'all' || r.p.kind === kind) && (!only || r.status === 'low' || r.status === 'out')), [db, s, wh, kind, only]);
  const whs = db.warehouses.filter((w) => s.companyIds.includes(w.companyId));
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Zaxira qiymati" value={m(rows.reduce((a, r) => a + r.value, 0))} sub="tannarx bo‘yicha" explain={['Zaxira qiymati', 'omborlardagi tovarlarning FIFO yoki o‘rtacha tannarx bo‘yicha qiymati; bosh kitobdagi 1010/2810/2910 hisoblariga teng.']} />
        <Stat label="Rezervlangan" value={m(rows.reduce((a, r) => a + r.reserved * r.unitCost, 0))} sub="tasdiqlangan buyurtmalar" />
        <Stat label="Yo‘lda (kiruvchi)" value={m(rows.reduce((a, r) => a + r.incoming * r.unitCost, 0))} sub="PO va ish buyurtmalari" />
        <Stat label="Kam / tugagan" value={String(rows.filter((r) => r.status === 'low' || r.status === 'out').length)} tone="warn" />
        <Stat label="Ortiqcha zaxira" value={String(rows.filter((r) => r.status === 'over').length)} sub="aylanma sekin" />
      </div>
      <Card>
        <CardHeader title="Qoldiqlar" subtitle={wh ? byId(db.warehouses, wh)?.name : 'Barcha omborlar'} icon={<Boxes className="h-4 w-4" />}
          actions={<ExportButton module="inventory" name="qoldiqlar" title="Ombor qoldiqlari" cols={[{ key: 'sku', label: 'SKU' }, { key: 'n', label: 'Nomi' }, { key: 'q', label: 'Qoldiq', type: 'number' }, { key: 'r', label: 'Rezerv', type: 'number' }, { key: 'a', label: 'Mavjud', type: 'number' }, { key: 'i', label: 'Yo‘lda', type: 'number' }, { key: 'v', label: 'Qiymat', type: 'money' }]} rows={() => rows.map((r) => ({ sku: r.p.sku, n: r.p.name, q: r.qty, r: r.reserved, a: r.available, i: r.incoming, v: r.value }))} />} />
        <DataTable rows={rows} rowKey={(r) => r.p.id} onRow={(r) => setView(r.p.id)} search={(r) => `${r.p.sku} ${r.p.name} ${r.p.barcode}`} searchPlaceholder="SKU, nom yoki shtrix-kod…"
          toolbar={<><Select className="h-9 w-auto text-[12.5px]" value={filters.warehouseId} onChange={(e) => setFilters({ warehouseId: e.target.value })}><option value="all">Barcha omborlar</option>{whs.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</Select><Segmented size="xs" value={kind} onChange={setKind} options={[{ id: 'all', label: 'Barchasi' }, { id: 'goods', label: 'Tovar' }, { id: 'raw', label: 'Xomashyo' }, { id: 'finished', label: 'Tayyor' }]} /><label className="flex items-center gap-1.5 text-[12px] text-t2"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="accent-[var(--accent)]" />Faqat kam</label></>}
          cols={[
            { key: 'n', header: 'Mahsulot', primary: true, cell: (r) => <div><p className="font-medium">{r.p.name}</p><p className="font-mono text-[11px] text-t3">{r.p.sku}</p></div> },
            { key: 'q', header: 'Qoldiq', align: 'right', cell: (r) => `${Math.round(r.qty).toLocaleString('ru-RU')} ${r.p.unit}`, sort: (r) => r.qty },
            { key: 'r', header: <span className="inline-flex items-center">Rezerv<Explain term="Rezerv">tasdiqlangan, lekin hali yetkazilmagan savdo buyurtmalari va rejalashtirilgan ishlab chiqarish uchun band qilingan miqdor.</Explain></span>, align: 'right', cell: (r) => (r.outgoing ? Math.round(r.outgoing).toLocaleString('ru-RU') : '—') },
            { key: 'a', header: 'Mavjud', align: 'right', cell: (r) => <b className={cx('font-semibold', r.available < 0 && 'text-neg')}>{Math.round(r.available).toLocaleString('ru-RU')}</b>, sort: (r) => r.available },
            { key: 'i', header: 'Yo‘lda', align: 'right', cell: (r) => (r.incoming ? <span className="text-pos">+{Math.round(r.incoming).toLocaleString('ru-RU')}</span> : '—') },
            { key: 'rp', header: 'Buyurtma nuqtasi', align: 'right', hideMobile: true, cell: (r) => r.p.reorderPoint.toLocaleString('ru-RU') },
            { key: 'c', header: 'Yetadi', align: 'right', cell: (r) => (Number.isFinite(r.cover) ? `~${Math.max(0, Math.round(r.cover))} kun` : '—'), sort: (r) => (Number.isFinite(r.cover) ? r.cover : 9999) },
            { key: 'v', header: 'Qiymat', align: 'right', cell: (r) => mf(r.value), sort: (r) => r.value },
            { key: 's', header: 'Holat', cell: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </Card>
      {view && <ProductDrawer id={view} onClose={() => setView(null)} />}
    </div>
  );
}

export function ProductDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, s, mf } = useCtx(); const { go, role } = useApp();
  const p = byId(db.products, id); if (!p) return null;
  const whs = db.warehouses.filter((w) => w.companyId === p.companyId);
  const moves = db.moves.filter((mv) => mv.productId === id).slice(-15).reverse();
  const bom = db.boms.find((b) => b.productId === id);
  const usedIn = db.boms.filter((b) => b.lines.some((l) => l.productId === id));
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={p.name} subtitle={<span className="flex items-center gap-2 font-mono">{p.sku} <Barcode className="h-3.5 w-3.5" /> {p.barcode} <Badge>{p.category}</Badge></span>}
      footer={can(role, 'purchasing', 'create') && p.kind !== 'finished' && p.kind !== 'service' ? <Button variant="primary" icon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => { onClose(); go('purchasing', 'requests', { new: '1' }); }}>Xarid so‘rovi</Button> : undefined}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Narx', p.price ? mf(p.price) : '—'], ['Standart tannarx', mf(p.stdCost)], ['Buyurtma nuqtasi', `${p.reorderPoint} ${p.unit}`], ['Buyurtma miqdori', `${p.reorderQty} ${p.unit}`]].map(([l, v]) => <div key={l} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l}</p><p className="num text-[13.5px] font-semibold">{v}</p></div>)}</div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">{p.trackBatch && <Badge tone="info">Partiya hisobi</Badge>}{p.trackSerial && <Badge tone="info">Seriya raqami</Badge>}{p.variants && <Badge>Variantlar: {p.variants.join(', ')}</Badge>}<Badge>Birlik: {p.unit}</Badge><Badge>QQS {p.vat}%</Badge>{p.defaultBin && <Badge>Joy: {p.defaultBin}</Badge>}</div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Omborlar bo‘yicha</p>
      <div className="space-y-1.5">{whs.map((w) => { const r = A.stockRows(db, { companyIds: [p.companyId] }, w.id).find((x) => x.p.id === id); if (!r) return null; return <div key={w.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-line px-3 py-2 text-[12.5px]"><span>{w.name}</span><span className="num text-t2">{Math.round(r.qty).toLocaleString('ru-RU')} {p.unit}</span><span className="num text-t3">rezerv {Math.round(r.reserved)}</span><span className="num font-medium">{mf(r.value)}</span></div>; })}</div>
      {bom && <><p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Retsept (BOM)</p><div className="space-y-1">{bom.lines.map((l) => <div key={l.productId} className="flex justify-between text-[12.5px]"><span>{byId(db.products, l.productId)?.name}</span><span className="num text-t2">{l.qty} {byId(db.products, l.productId)?.unit}</span></div>)}</div></>}
      {usedIn.length > 0 && <p className="mt-4 text-[12px] text-t3">Ishlatiladi: {usedIn.map((b) => byId(db.products, b.productId)?.name).join(', ')}</p>}
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">So‘nggi harakatlar</p>
      <div className="divide-y divide-line">{moves.map((mv) => <div key={mv.id} className="flex items-center gap-2 py-1.5 text-[12px]"><span className="w-12 text-t3">{fmtDate(mv.date).slice(0, 5)}</span><Badge tone={mv.qty > 0 ? 'pos' : 'neg'}>{MOVE_L[mv.kind]}</Badge><span className="text-t3">{byId(db.warehouses, mv.warehouseId)?.code}</span><span className="flex-1 truncate text-t3">{mv.ref}</span><span className={cx('num font-medium', mv.qty > 0 ? 'text-pos' : 'text-neg')}>{mv.qty > 0 ? '+' : ''}{Math.round(mv.qty).toLocaleString('ru-RU')}</span><span className="num w-24 text-right text-t2">{mf(mv.cost)}</span></div>)}</div>
    </Drawer>
  );
}

function Products() {
  const { db, s, mf } = useCtx(); const { role, dispatch } = useApp();
  const [create, setCreate] = useState(false); const [imp, setImp] = useState(false); const [view, setView] = useState<string | null>(null);
  const rows = db.products.filter((p) => s.companyIds.includes(p.companyId));
  const [f, setF] = useState<Partial<Product>>({ companyId: 'trd', kind: 'goods', unit: 'dona', vat: 12, category: 'Elektr jihozlar', reorderPoint: 100, reorderQty: 500 });
  const KL: Record<string, string> = { goods: 'Tovar', raw: 'Xomashyo', finished: 'Tayyor mahsulot', service: 'Xizmat' };
  return (
    <Card>
      <CardHeader title="Mahsulotlar katalogi" subtitle={`${rows.length} ta SKU`} icon={<Package className="h-4 w-4" />} actions={<>{can(role, 'inventory', 'create') && <><Button icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImp(true)}>Import</Button><Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Mahsulot</Button></>}<ExportButton module="inventory" name="mahsulotlar" title="Mahsulotlar katalogi" cols={[{ key: 'sku', label: 'SKU' }, { key: 'b', label: 'Shtrix-kod' }, { key: 'n', label: 'Nomi' }, { key: 'k', label: 'Turi' }, { key: 'u', label: 'Birlik' }, { key: 'p', label: 'Narx', type: 'money' }, { key: 'c', label: 'Tannarx', type: 'money' }]} rows={() => rows.map((p) => ({ sku: p.sku, b: p.barcode, n: p.name, k: KL[p.kind], u: p.unit, p: p.price, c: p.stdCost }))} /></>} />
      <DataTable rows={rows} rowKey={(p) => p.id} onRow={(p) => setView(p.id)} search={(p) => `${p.sku} ${p.name} ${p.barcode} ${p.category}`}
        cols={[{ key: 'sku', header: 'SKU', cell: (p) => <span className="font-mono text-[12px] text-t2">{p.sku}</span> }, { key: 'n', header: 'Nomi', primary: true, cell: (p) => p.name }, { key: 'k', header: 'Turi', cell: (p) => <Badge tone={p.kind === 'raw' ? 'warn' : p.kind === 'finished' ? 'accent' : p.kind === 'service' ? 'info' : 'neutral'}>{KL[p.kind]}</Badge> }, { key: 'c', header: 'Kategoriya', cell: (p) => p.category }, { key: 'co', header: 'Kompaniya', hideMobile: true, cell: (p) => byId(db.companies, p.companyId)?.short }, { key: 'u', header: 'Birlik', cell: (p) => p.unit }, { key: 'p', header: 'Narx', align: 'right', cell: (p) => (p.price ? mf(p.price) : '—') }, { key: 'sc', header: 'Tannarx', align: 'right', cell: (p) => (p.stdCost ? mf(p.stdCost) : '—') }, { key: 'b', header: 'Shtrix-kod', hideMobile: true, cell: (p) => <span className="font-mono text-[11px] text-t3">{p.barcode}</span> }]} />
      {view && <ProductDrawer id={view} onClose={() => setView(null)} />}
      {imp && <ImportWizard kind="products" onClose={() => setImp(false)} />}
      <Modal open={create} onClose={() => setCreate(false)} title="Yangi mahsulot" size="md" footer={<><Button variant="ghost" onClick={() => setCreate(false)}>Bekor qilish</Button><Button variant="primary" disabled={!f.sku || !f.name} onClick={() => { if (dispatch('product.create', { ...f, barcode: f.barcode || `478${Date.now().toString().slice(-10)}`, price: f.price || 0, stdCost: f.stdCost || 0 }, { success: 'Mahsulot qo‘shildi' }) !== undefined) setCreate(false); }}>Saqlash</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="SKU" required><Input value={f.sku || ''} onChange={(e) => setF({ ...f, sku: e.target.value.toUpperCase() })} placeholder="TRD-XXX-01" /></Field>
          <Field label="Shtrix-kod"><Input value={f.barcode || ''} onChange={(e) => setF({ ...f, barcode: e.target.value })} placeholder="avtomatik" /></Field>
          <Field label="Nomi" required className="sm:col-span-2"><Input value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Kompaniya"><Select value={f.companyId} onChange={(e) => setF({ ...f, companyId: e.target.value })}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Turi"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Product['kind'] })}>{Object.entries(KL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Kategoriya"><Input value={f.category || ''} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
          <Field label="Birlik"><Select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{['dona', 'kg', 'metr', 'litr', 'to‘plam', 'soat', 'kun'].map((u) => <option key={u}>{u}</option>)}</Select></Field>
          <Field label="Sotuv narxi (QQSsiz)"><Input type="number" value={f.price || ''} onChange={(e) => setF({ ...f, price: +e.target.value })} /></Field>
          <Field label="Standart tannarx"><Input type="number" value={f.stdCost || ''} onChange={(e) => setF({ ...f, stdCost: +e.target.value })} /></Field>
          <Field label="Buyurtma nuqtasi"><Input type="number" value={f.reorderPoint || ''} onChange={(e) => setF({ ...f, reorderPoint: +e.target.value })} /></Field>
          <Field label="Buyurtma miqdori"><Input type="number" value={f.reorderQty || ''} onChange={(e) => setF({ ...f, reorderQty: +e.target.value })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

function Movements() {
  const { db, s, from, to, mf } = useCtx();
  const [k, setK] = useState('all');
  const rows = db.moves.filter((mv) => s.companyIds.includes(mv.companyId) && mv.date >= from && mv.date <= to && (k === 'all' || mv.kind === k)).slice().reverse();
  return (
    <Card>
      <CardHeader title="Ombor harakatlari tarixi" subtitle={`${rows.length} ta · ${fmtDate(from)}–${fmtDate(to)}`} icon={<History className="h-4 w-4" />} actions={<ExportButton module="inventory" name="harakatlar" title="Ombor harakatlari" cols={[{ key: 'd', label: 'Sana' }, { key: 'k', label: 'Turi' }, { key: 'p', label: 'Mahsulot' }, { key: 'w', label: 'Ombor' }, { key: 'q', label: 'Miqdor', type: 'number' }, { key: 'c', label: 'Qiymat', type: 'money' }, { key: 'r', label: 'Hujjat' }, { key: 'u', label: 'Foydalanuvchi' }]} rows={() => rows.map((mv) => ({ d: fmtDate(mv.date), k: MOVE_L[mv.kind], p: byId(db.products, mv.productId)?.name, w: byId(db.warehouses, mv.warehouseId)?.code, q: mv.qty, c: mv.cost, r: mv.ref, u: mv.user }))} />} />
      <DataTable rows={rows} rowKey={(mv) => mv.id} pageSize={15} dense search={(mv) => `${mv.ref} ${byId(db.products, mv.productId)?.name} ${mv.batch || ''}`}
        toolbar={<Select className="h-9 w-auto text-[12.5px]" value={k} onChange={(e) => setK(e.target.value)}><option value="all">Barcha turlar</option>{Object.entries(MOVE_L).map(([a, b]) => <option key={a} value={a}>{b}</option>)}</Select>}
        cols={[{ key: 'd', header: 'Sana', cell: (mv) => fmtDate(mv.date), sort: (mv) => mv.date }, { key: 'k', header: 'Turi', cell: (mv) => <Badge tone={mv.qty > 0 ? 'pos' : 'neg'}>{MOVE_L[mv.kind]}</Badge> }, { key: 'p', header: 'Mahsulot', primary: true, cell: (mv) => byId(db.products, mv.productId)?.name }, { key: 'w', header: 'Ombor', cell: (mv) => byId(db.warehouses, mv.warehouseId)?.code }, { key: 'q', header: 'Miqdor', align: 'right', cell: (mv) => <span className={mv.qty > 0 ? 'text-pos' : 'text-neg'}>{mv.qty > 0 ? '+' : ''}{Math.round(mv.qty).toLocaleString('ru-RU')}</span> }, { key: 'c', header: 'Qiymat', align: 'right', cell: (mv) => mf(mv.cost) }, { key: 'r', header: 'Hujjat', cell: (mv) => <span className="font-mono text-[11.5px] text-t3">{mv.ref}</span> }, { key: 'b', header: 'Partiya', hideMobile: true, cell: (mv) => <span className="font-mono text-[11px] text-t3">{mv.batch || '—'}</span> }, { key: 'u', header: 'Kim', hideMobile: true, cell: (mv) => <span className="text-[11.5px] text-t3">{mv.user}</span> }]} />
    </Card>
  );
}

function Batches() {
  const { db, s, mf } = useCtx();
  const rows = db.products.filter((p) => s.companyIds.includes(p.companyId) && p.kind !== 'service').flatMap((p) => Object.entries(db.stock[p.id] || {}).flatMap(([wh, c]) => c.layers.filter((l) => l.qty > 0.001).map((l, i) => ({ id: `${p.id}${wh}${i}`, p, wh, l, method: byId(db.companies, p.companyId)!.costing }))));
  return (
    <Card>
      <CardHeader title="Partiyalar va tannarx qatlamlari" subtitle="FIFO: har bir kirim alohida qatlam, chiqimda eng eskisi birinchi yechiladi · O‘rtacha: bitta o‘rtachalangan qatlam" icon={<Layers className="h-4 w-4" />} />
      <DataTable rows={rows} rowKey={(r) => r.id} pageSize={15} dense search={(r) => `${r.p.name} ${r.l.batch} ${r.p.sku}`}
        cols={[{ key: 'p', header: 'Mahsulot', primary: true, cell: (r) => r.p.name }, { key: 'w', header: 'Ombor', cell: (r) => byId(db.warehouses, r.wh)?.code }, { key: 'm', header: 'Usul', cell: (r) => <Badge tone={r.method === 'FIFO' ? 'accent' : 'neutral'}>{r.method === 'FIFO' ? 'FIFO' : 'O‘rtacha'}</Badge> }, { key: 'b', header: 'Partiya', cell: (r) => <span className="font-mono text-[11.5px]">{r.l.batch}</span> }, { key: 'd', header: 'Kirim sanasi', cell: (r) => fmtDate(r.l.date), sort: (r) => r.l.date }, { key: 'q', header: 'Qoldiq', align: 'right', cell: (r) => `${Math.round(r.l.qty).toLocaleString('ru-RU')} ${r.p.unit}` }, { key: 'c', header: 'Birlik tannarxi', align: 'right', cell: (r) => mf(r.l.cost) }, { key: 'v', header: 'Qiymat', align: 'right', cell: (r) => mf(r.l.qty * r.l.cost), sort: (r) => r.l.qty * r.l.cost }]} />
    </Card>
  );
}
