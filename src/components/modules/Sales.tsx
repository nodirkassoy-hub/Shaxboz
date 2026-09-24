'use client';
import { useMemo, useState } from 'react';
import { Plus, ShoppingCart, Truck, Receipt, Wallet, Factory, CheckCircle2, X, Package, Users, ArrowRight, Tag } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId, docTotals, invOpen, lineNet } from '@/lib/db';
import { peek } from '@/lib/core/inventory';
import { pnl } from '@/lib/core/ledger';
import { fmtDate, TODAY, addDays } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat, Segmented, Confirm } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { ChartTooltip, useChartFmt, PALETTE } from '@/components/ui/charts';
import { LinesEditor, useCompanyPick, ReceiptForm } from './forms';
import { can } from '@/lib/rbac';
import type { SalesOrder, DocLine } from '@/lib/types';

type Tab = 'overview' | 'orders' | 'products' | 'customers';
const FLOW = [
  { id: 'quote', l: 'Taklif' }, { id: 'confirmed', l: 'Buyurtma' }, { id: 'in_production', l: 'Ishlab chiqarish' }, { id: 'delivered', l: 'Yetkazish' }, { id: 'invoiced', l: 'Hisob-faktura' }, { id: 'paid', l: 'To‘lov' },
];

export default function Sales() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || (nav.params?.order ? 'orders' : 'overview'));
  return (
    <div>
      <PageHeader title="Sotuv" crumbs={['Operatsiyalar', 'Sotuv']} subtitle={<span className="flex items-center gap-2">Lid → Taklif → Buyurtma → Yetkazish → Hisob-faktura → To‘lov — har bir bosqich ombor va buxgalteriyaga avtomatik ta’sir qiladi <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Umumiy' }, { id: 'orders', label: 'Buyurtmalar', icon: <ShoppingCart className="h-3.5 w-3.5" /> }, { id: 'products', label: 'Mahsulot va narxlar', icon: <Tag className="h-3.5 w-3.5" /> }, { id: 'customers', label: 'Mijozlar', icon: <Users className="h-3.5 w-3.5" /> }]} />
      {tab === 'overview' && <Overview />}{tab === 'orders' && <Orders />}{tab === 'products' && <Products />}{tab === 'customers' && <Customers />}
    </div>
  );
}

function Overview() {
  const { db, s, from, to, m } = useCtx(); const f = useChartFmt(); const go = useApp((x) => x.go);
  const p = pnl(db.entries, s, from, to); const pp = A.prevPeriod(from, to); const q = pnl(db.entries, s, pp.from, pp.to);
  const orders = db.salesOrders.filter((o) => A.inScope(s, o.companyId, o.branchId) && o.date >= from && o.date <= to && !['quote', 'cancelled'].includes(o.status));
  const aov = orders.length ? orders.reduce((a, o) => a + docTotals(o.lines).net, 0) / orders.length : 0;
  const cust = useMemo(() => A.customerProfit(db, s, from, to).slice(0, 8), [db, s, from, to]);
  const prod = useMemo(() => A.productProfit(db, s, from, to).slice(0, 8), [db, s, from, to]);
  const br = useMemo(() => A.branchProfit(db, s, from, to), [db, s, from, to]);
  const channel = [{ n: 'Ulgurji', v: orders.filter((o) => o.channel === 'wholesale').reduce((a, o) => a + docTotals(o.lines).net, 0) }, { n: 'Chakana (POS)', v: orders.filter((o) => o.channel === 'retail').reduce((a, o) => a + docTotals(o.lines).net, 0) }];
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tushum" value={m(p.revenue)} sub={<span>oldingi davr {m(q.revenue)}</span>} /><Stat label="Buyurtmalar" value={String(orders.length)} sub={`${orders.filter((o) => o.channel === 'retail').length} ta chakana`} /><Stat label="O‘rtacha buyurtma (QQSsiz)" value={m(aov)} /><Stat label="Yalpi marja" value={`${p.grossMargin.toFixed(1)}%`} sub={m(p.gross)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Top mijozlar" subtitle="Tushum va yalpi foyda" actions={<Button size="xs" variant="ghost" onClick={() => go('analytics', 'customers')}>Tahlil</Button>} />
          <div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={cust.map((c) => ({ n: c.name.replace(/ (MChJ|XK|Group)$/, ''), r: c.revenue, g: c.gross }))} layout="vertical" margin={{ left: 20 }}><CartesianGrid horizontal={false} /><XAxis type="number" tickFormatter={f.axis} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="n" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="r" name="Tushum" fill={PALETTE[0]} radius={[0, 5, 5, 0]} /><Bar dataKey="g" name="Yalpi foyda" fill={PALETTE[1]} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card><CardHeader title="Filiallar bo‘yicha sotuv" />
          <div className="space-y-3">{br.map((b, i) => <div key={b.branch.id}><div className="flex justify-between text-[12.5px]"><span className="text-t1">{b.branch.name}</span><span className="num font-semibold">{m(b.revenue)}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${(b.revenue / Math.max(...br.map((x) => x.revenue))) * 100}%`, background: PALETTE[i] }} /></div><p className="mt-0.5 text-[11px] text-t3">Sof foyda {m(b.net)} · marja {b.margin.toFixed(1)}%</p></div>)}</div>
          <div className="mt-4 h-[110px]"><ResponsiveContainer><PieChart><Pie data={channel} dataKey="v" nameKey="n" innerRadius={30} outerRadius={48} paddingAngle={3}>{channel.map((_, i) => <Cell key={i} fill={PALETTE[i + 2]} />)}</Pie><Tooltip content={<ChartTooltip fmt={f.tip} />} /></PieChart></ResponsiveContainer></div>
          <div className="flex justify-center gap-4 text-[11.5px] text-t2">{channel.map((c, i) => <span key={c.n} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i + 2] }} />{c.n}</span>)}</div>
        </Card>
        <Card className="lg:col-span-3"><CardHeader title="Top mahsulotlar" subtitle="Yalpi foyda bo‘yicha" />
          <DataTable rows={prod} rowKey={(r) => r.p.id} pageSize={8} dense cols={[{ key: 'n', header: 'Mahsulot', primary: true, cell: (r) => r.p.name }, { key: 'c', header: 'Kategoriya', cell: (r) => <span className="text-t3">{r.p.category}</span> }, { key: 'r', header: 'Tushum', align: 'right', cell: (r) => m(r.revenue), sort: (r) => r.revenue }, { key: 'g', header: 'Yalpi foyda', align: 'right', cell: (r) => m(r.gross), sort: (r) => r.gross }, { key: 'mg', header: 'Marja', align: 'right', cell: (r) => <span className={cx(r.margin < 30 ? 'text-warn' : 'text-pos')}>{r.margin.toFixed(1)}%</span>, sort: (r) => r.margin }]} />
        </Card>
      </div>
    </div>
  );
}

function Orders() {
  const { db, s, mf } = useCtx(); const { nav, role } = useApp();
  const [st, setSt] = useState<string>('open'); const [create, setCreate] = useState(nav.params?.new === '1');
  const [view, setView] = useState<string | null>(nav.params?.order || null);
  const rows = db.salesOrders.filter((o) => A.inScope(s, o.companyId, o.branchId) && (st === 'all' ? true : st === 'open' ? ['quote', 'confirmed', 'in_production', 'delivered', 'invoiced'].includes(o.status) : o.status === st)).slice().reverse();
  const counts = Object.fromEntries(FLOW.map((f) => [f.id, db.salesOrders.filter((o) => A.inScope(s, o.companyId, o.branchId) && o.status === f.id).length]));
  return (
    <div className="space-y-4">
      <Card className="!p-3"><div className="no-scrollbar flex items-center gap-1 overflow-x-auto">{FLOW.map((f, i) => <div key={f.id} className="flex items-center gap-1"><button onClick={() => setSt(f.id)} className={cx('flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-[12.5px] font-medium transition', st === f.id ? 'bg-accent-soft text-accent' : 'text-t2 hover:bg-surface-2')}><span className={cx('num grid h-5 min-w-5 place-items-center rounded-md px-1 text-[11px]', st === f.id ? 'bg-accent text-white' : 'bg-surface-3 text-t2')}>{counts[f.id]}</span>{f.l}</button>{i < FLOW.length - 1 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-t3" />}</div>)}</div></Card>
      <Card>
        <CardHeader title="Savdo buyurtmalari" subtitle={`${rows.length} ta`} icon={<ShoppingCart className="h-4 w-4" />} actions={<>{can(role, 'sales', 'create') && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Yangi buyurtma</Button>}<ExportButton module="sales" name="buyurtmalar" title="Savdo buyurtmalari" cols={[{ key: 'no', label: '№' }, { key: 'd', label: 'Sana' }, { key: 'c', label: 'Mijoz' }, { key: 't', label: 'Jami', type: 'money' }, { key: 's', label: 'Holat' }]} rows={() => rows.map((o) => ({ no: o.no, d: fmtDate(o.date), c: byId(db.parties, o.customerId)?.name, t: docTotals(o.lines).total, s: o.status }))} /></>} />
        <DataTable rows={rows} rowKey={(o) => o.id} onRow={(o) => setView(o.id)} search={(o) => `${o.no} ${byId(db.parties, o.customerId)?.name}`}
          toolbar={<Segmented size="xs" value={['open', 'all', 'cancelled'].includes(st) ? st : 'x'} onChange={setSt} options={[{ id: 'open', label: 'Faol' }, { id: 'all', label: 'Barchasi' }, { id: 'cancelled', label: 'Bekor' }]} />}
          cols={[{ key: 'no', header: '№', primary: true, cell: (o) => <span className="font-mono text-[12px]">{o.no}</span> }, { key: 'c', header: 'Mijoz', cell: (o) => <span className="line-clamp-1">{byId(db.parties, o.customerId)?.name}</span> }, { key: 'd', header: 'Sana', cell: (o) => fmtDate(o.date), sort: (o) => o.date }, { key: 'dd', header: 'Yetkazish', cell: (o) => fmtDate(o.deliveryDate) }, { key: 'w', header: 'Ombor', hideMobile: true, cell: (o) => <span className="text-t3">{byId(db.warehouses, o.warehouseId)?.code}</span> }, { key: 't', header: 'Jami', align: 'right', cell: (o) => mf(docTotals(o.lines).total), sort: (o) => docTotals(o.lines).total }, { key: 's', header: 'Holat', cell: (o) => <StatusBadge status={o.status} /> }]} />
      </Card>
      {create && <SOForm onClose={() => setCreate(false)} onCreated={(id) => setView(id)} />}
      {view && <SODrawer id={view} onClose={() => setView(null)} />}
    </div>
  );
}

export function SOForm({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const { db, mf } = useCtx(); const dispatch = useApp((x) => x.dispatch);
  const { companyId, branchId, pick } = useCompanyPick();
  const whs = db.warehouses.filter((w) => w.companyId === companyId && w.kind !== 'raw');
  const [wh, setWh] = useState(whs.find((w) => w.branchId === branchId)?.id || whs[0]?.id);
  const custs = db.parties.filter((p) => p.kind === 'customer' && p.companyIds.includes(companyId) && p.id !== 'c12');
  const [customerId, setCustomer] = useState(custs[0]?.id); const [delivery, setDelivery] = useState(addDays(TODAY, 3)); const [status, setStatus] = useState<'quote' | 'confirmed'>('confirmed');
  const [lines, setLines] = useState<DocLine[]>([{ description: '', qty: 1, price: 0, discount: 0, vat: 12 }]);
  const kinds = companyId === 'srv' ? ['service'] : companyId === 'fac' ? ['finished'] : ['goods'];
  const stockWarn = lines.filter((l) => l.productId && byId(db.products, l.productId)?.kind !== 'service' && peek(db.stock, l.productId, wh).qty < l.qty);
  const maxDisc = Math.max(0, ...lines.map((l) => l.discount || 0));
  const valid = customerId && lines.every((l) => l.productId && l.qty > 0);
  return (
    <Modal open onClose={onClose} size="xl" title="Yangi savdo buyurtmasi" subtitle="Tasdiqlangan buyurtma zaxirani rezervlaydi; yetkazilganda ombordan chiqim va tannarx provodkasi yaratiladi" icon={<ShoppingCart className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!valid} onClick={() => { const r = dispatch<SalesOrder>('so.create', { date: TODAY, deliveryDate: delivery, companyId, branchId, warehouseId: wh, customerId, lines, status }, { success: status === 'quote' ? 'Tijorat taklifi yaratildi' : 'Buyurtma yaratildi' }); if (r) { onClose(); onCreated?.(r.id); } }}>{status === 'quote' ? 'Taklif yaratish' : 'Buyurtma yaratish'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {pick}
        <Field label="Ombor"><Select value={wh} onChange={(e) => setWh(e.target.value)}>{whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field>
        <Field label="Mijoz" required><Select value={customerId} onChange={(e) => setCustomer(e.target.value)}>{custs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Yetkazish sanasi"><Input type="date" value={delivery} min={TODAY} onChange={(e) => setDelivery(e.target.value)} /></Field>
        <Field label="Turi"><Select value={status} onChange={(e) => setStatus(e.target.value as 'quote')}><option value="confirmed">Buyurtma (tasdiqlangan)</option><option value="quote">Tijorat taklifi (quote)</option></Select></Field>
      </div>
      <div className="mt-4"><LinesEditor lines={lines} setLines={setLines} companyId={companyId} kinds={kinds} /></div>
      {stockWarn.length > 0 && <p className="mt-3 rounded-xl border border-warn/25 bg-warn/[.06] p-3 text-[12px] text-t2"><b className="text-warn">Zaxira yetarli emas:</b> {stockWarn.map((l) => `${l.description} (omborda ${Math.floor(peek(db.stock, l.productId!, wh).qty)})`).join(', ')}. {companyId === 'fac' ? 'Buyurtmadan keyin “Ishlab chiqarishga yuborish” mumkin.' : 'Xarid so‘rovi yarating yoki boshqa ombordan o‘tkazing.'}</p>}
      {maxDisc > 5 && <p className="mt-2 text-[12px] text-warn">Chegirma {maxDisc}% — standart limit 5%. Katta chegirmalar uchun Tasdiqlash markazidan foydalaning.</p>}
      <p className="mt-2 text-[11.5px] text-t3">Jami: {mf(docTotals(lines).total)}</p>
    </Modal>
  );
}

function SODrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, mf } = useCtx(); const { dispatch, role, go } = useApp();
  const [pay, setPay] = useState(false); const [prod, setProd] = useState(false); const [cancel, setCancel] = useState(false);
  const so = byId(db.salesOrders, id); if (!so) return null;
  const cust = byId(db.parties, so.customerId)!; const t = docTotals(so.lines); const inv = byId(db.invoices, so.invoiceId);
  const idx = FLOW.findIndex((f) => f.id === so.status);
  const shortage = so.lines.filter((l) => l.productId && byId(db.products, l.productId)?.kind !== 'service' && peek(db.stock, l.productId, so.warehouseId).qty < l.qty);
  const isFac = so.companyId === 'fac';
  const wos = (so.workOrderIds || []).map((w) => byId(db.workOrders, w)!).filter(Boolean);
  const edit = can(role, 'sales', 'edit');
  const cogs = db.entries.find((e) => e.source.type === 'delivery' && e.source.id === so.id)?.lines.filter((l) => l.debit).reduce((a, l) => a + l.debit, 0) || 0;
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={`Buyurtma ${so.no}`} subtitle={<span className="flex items-center gap-2">{cust.name} · {byId(db.warehouses, so.warehouseId)?.name} <StatusBadge status={so.status} /></span>}
      footer={edit ? <>
        {['quote', 'confirmed'].includes(so.status) && <Button variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setCancel(true)}>Bekor qilish</Button>}
        {so.status === 'quote' && <Button variant="primary" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => dispatch('so.confirm', { id }, { success: 'Taklif buyurtmaga aylantirildi — zaxira rezervlandi' })}>Buyurtmaga aylantirish</Button>}
        {so.status === 'confirmed' && isFac && shortage.length > 0 && can(role, 'manufacturing', 'create') && <Button icon={<Factory className="h-3.5 w-3.5" />} onClick={() => setProd(true)}>Ishlab chiqarishga yuborish</Button>}
        {so.status === 'confirmed' && <Button variant="primary" disabled={shortage.length > 0} icon={<Truck className="h-3.5 w-3.5" />} onClick={() => dispatch('so.deliver', { id }, { success: 'Yetkazildi: ombordan chiqim va tannarx provodkasi yaratildi' })}>Yetkazish</Button>}
        {so.status === 'delivered' && <Button variant="primary" icon={<Receipt className="h-3.5 w-3.5" />} onClick={() => dispatch('so.invoice', { id }, { success: 'Hisob-faktura chiqarildi — debitorlik va tushum yozildi' })}>Hisob-faktura chiqarish</Button>}
        {so.status === 'invoiced' && inv && invOpen(inv) > 0 && <Button variant="primary" icon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setPay(true)}>To‘lov qabul qilish</Button>}
      </> : undefined}>
      <div className="mb-4 flex items-center">{FLOW.filter((f) => isFac || f.id !== 'in_production').map((f, i, arr) => { const fi = FLOW.findIndex((x) => x.id === f.id); const done = so.status !== 'cancelled' && fi <= idx; return <div key={f.id} className="flex flex-1 items-center"><div className="flex flex-col items-center gap-1"><div className={cx('grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold', done ? 'border-accent bg-accent text-white' : 'border-line text-t3')}>{done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}</div><span className={cx('text-[10.5px]', done ? 'text-t1' : 'text-t3')}>{f.l}</span></div>{i < arr.length - 1 && <div className={cx('mx-1 mb-4 h-px flex-1', done && fi < idx ? 'bg-accent' : 'bg-line')} />}</div>; })}</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['QQSsiz', t.net], ['QQS', t.vat], ['Jami', t.total], ['Qoldiq', inv ? invOpen(inv) : t.total]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[14px] font-semibold text-t1">{mf(v as number)}</p></div>)}</div>
      <table className="mt-4 w-full text-[12.5px]"><thead className="bg-surface-2 text-t3"><tr><th className="px-2 py-1.5 text-left font-semibold">Mahsulot</th><th className="px-2 py-1.5 text-right font-semibold">Miqdor</th><th className="px-2 py-1.5 text-right font-semibold">Omborda</th><th className="px-2 py-1.5 text-right font-semibold">Summa</th></tr></thead>
        <tbody>{so.lines.map((l, i) => { const have = l.productId ? peek(db.stock, l.productId, so.warehouseId).qty : 0; const p = byId(db.products, l.productId); return <tr key={i} className="border-t border-line"><td className="px-2 py-1.5">{l.description}{l.discount ? <span className="text-[11px] text-t3"> (−{l.discount}%)</span> : null}</td><td className="num px-2 text-right">{l.qty.toLocaleString('ru-RU')} {p?.unit}</td><td className={cx('num px-2 text-right', p?.kind !== 'service' && have < l.qty && ['quote', 'confirmed', 'in_production'].includes(so.status) ? 'text-neg' : 'text-t3')}>{p?.kind === 'service' ? '—' : Math.floor(have).toLocaleString('ru-RU')}</td><td className="num px-2 text-right">{mf(lineNet(l))}</td></tr>; })}</tbody></table>
      {shortage.length > 0 && ['confirmed', 'in_production'].includes(so.status) && <p className="mt-3 rounded-xl border border-warn/25 bg-warn/[.06] p-3 text-[12px] text-t2">Yetkazish uchun zaxira yetarli emas: {shortage.map((l) => l.description).join(', ')}.</p>}
      {wos.length > 0 && <div className="mt-4"><p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-t3">Ishlab chiqarish</p>{wos.map((w) => <button key={w.id} onClick={() => go('manufacturing', 'orders')} className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2 text-[12.5px] hover:bg-surface-2"><span><span className="font-mono text-t3">{w.no}</span> {byId(db.products, w.productId)?.name} × {w.qty}</span><StatusBadge status={w.status} /></button>)}</div>}
      <div className="mt-4 rounded-xl border border-line p-3 text-[12px]"><p className="mb-1.5 font-semibold text-t2">Buxgalteriyaga ta’siri</p>
        <ul className="space-y-1 text-t3">
          <li>{['confirmed', 'in_production'].includes(so.status) ? '● ' : '✓ '}Tasdiqlash: zaxira rezervlanadi (provodka yo‘q)</li>
          <li>{idx >= 3 ? '✓' : '○'} Yetkazish: Dt 91xx Tannarx / Kt 28xx-29xx Zaxira {cogs ? `— ${mf(cogs)}` : ''}</li>
          <li>{idx >= 4 ? '✓' : '○'} Hisob-faktura: Dt 4010 / Kt 90xx Tushum {mf(t.net)} + Kt 6411 QQS {mf(t.vat)} {inv ? `— ${inv.no}` : ''}</li>
          <li>{so.status === 'paid' ? '✓' : '○'} To‘lov: Dt 5110 Bank / Kt 4010 Debitorlik</li>
          {cogs > 0 && <li className="pt-1 text-t2">Yalpi foyda: {mf(t.net - cogs)} ({((1 - cogs / t.net) * 100).toFixed(1)}%)</li>}
        </ul>
      </div>
      {pay && inv && <ReceiptForm invoiceId={inv.id} onClose={() => setPay(false)} />}
      <Confirm open={prod} onClose={() => setProd(false)} title="Ishlab chiqarishga yuborish" confirmLabel="Ish buyurtmasi yaratish" body={<>Yetishmayotgan tayyor mahsulot uchun ish buyurtmalari yaratiladi (BOM bo‘yicha). Buyurtma “Ishlab chiqarishda” holatiga o‘tadi; ish buyurtmalari yakunlangach yana yetkazishga tayyor bo‘ladi.</>} onConfirm={() => dispatch('so.produce', { id, end: addDays(TODAY, 7) }, { success: 'Ish buyurtmalari yaratildi' })} />
      <Confirm open={cancel} onClose={() => setCancel(false)} tone="danger" title="Buyurtmani bekor qilish" confirmLabel="Bekor qilish" body="Rezerv bo‘shatiladi. Provodkalar yaratilmagan." onConfirm={() => dispatch('so.cancel', { id }, { success: 'Buyurtma bekor qilindi' })} />
    </Drawer>
  );
}

function Products() {
  const { db, s, mf } = useCtx();
  const rows = db.products.filter((p) => s.companyIds.includes(p.companyId) && p.kind !== 'raw');
  return (
    <Card>
      <CardHeader title="Mahsulotlar va narxlar" subtitle="Narxlar QQSsiz · chakana narx = ulgurji + 12%" icon={<Package className="h-4 w-4" />} actions={<ExportButton module="sales" name="narxlar" title="Narxlar ro‘yxati" cols={[{ key: 'sku', label: 'SKU' }, { key: 'n', label: 'Nomi' }, { key: 'u', label: 'Birlik' }, { key: 'p', label: 'Narx', type: 'money' }, { key: 'r', label: 'Chakana', type: 'money' }]} rows={() => rows.map((p) => ({ sku: p.sku, n: p.name, u: p.unit, p: p.price, r: Math.round(p.price * 1.12) }))} />} />
      <DataTable rows={rows} rowKey={(p) => p.id} search={(p) => `${p.sku} ${p.name} ${p.category}`} cols={[{ key: 'sku', header: 'SKU', cell: (p) => <span className="font-mono text-[12px] text-t2">{p.sku}</span> }, { key: 'n', header: 'Nomi', primary: true, cell: (p) => p.name }, { key: 'c', header: 'Kategoriya', cell: (p) => <Badge>{p.category}</Badge> }, { key: 'u', header: 'Birlik', cell: (p) => p.unit }, { key: 'p', header: 'Ulgurji narx', align: 'right', cell: (p) => mf(p.price), sort: (p) => p.price }, { key: 'r', header: 'Chakana', align: 'right', cell: (p) => (p.kind === 'goods' ? mf(Math.round(p.price * 1.12)) : '—') }, { key: 'sc', header: 'Standart tannarx', align: 'right', cell: (p) => (p.stdCost ? mf(p.stdCost) : '—') }, { key: 'm', header: 'Rejaviy marja', align: 'right', cell: (p) => (p.stdCost ? `${((1 - p.stdCost / p.price) * 100).toFixed(0)}%` : '—') }, { key: 'v', header: 'Variantlar', hideMobile: true, cell: (p) => <span className="text-[11.5px] text-t3">{p.variants?.join(', ') || '—'}</span> }]} />
    </Card>
  );
}

function Customers() {
  const { db, s, from, to, m } = useCtx(); const go = useApp((x) => x.go);
  const rows = useMemo(() => A.customerProfit(db, s, '2026-01-01', to), [db, s, to]);
  return (
    <Card>
      <CardHeader title="Mijozlar" subtitle="Yil boshidan tushum, marja va qarzdorlik" icon={<Users className="h-4 w-4" />} actions={<Button size="sm" onClick={() => go('crm', 'customers')}>CRM kartalari</Button>} />
      <DataTable rows={rows} rowKey={(r) => r.id} onRow={(r) => go('crm', 'customers', { party: r.id })} search={(r) => r.name} cols={[{ key: 'n', header: 'Mijoz', primary: true, cell: (r) => r.name }, { key: 'r', header: 'Tushum (YTD)', align: 'right', cell: (r) => m(r.revenue), sort: (r) => r.revenue }, { key: 'g', header: 'Yalpi foyda', align: 'right', cell: (r) => m(r.gross), sort: (r) => r.gross }, { key: 'mg', header: 'Marja', align: 'right', cell: (r) => `${r.margin.toFixed(1)}%`, sort: (r) => r.margin }, { key: 'o', header: 'Ochiq qarz', align: 'right', cell: (r) => m(r.open), sort: (r) => r.open }, { key: 'od', header: 'Muddati o‘tgan', align: 'right', cell: (r) => <span className={r.overdue ? 'text-neg' : 'text-t3'}>{r.overdue ? m(r.overdue) : '—'}</span>, sort: (r) => r.overdue }]} />
      <p className="mt-2 text-[11px] text-t3">Davr filtri: {fmtDate('2026-01-01')}–{fmtDate(to)} (joriy sahifa filtri {fmtDate(from)} dan) </p>
    </Card>
  );
}
