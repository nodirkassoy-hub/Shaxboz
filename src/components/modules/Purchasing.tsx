'use client';
import { useMemo, useState } from 'react';
import { Plus, Truck, Send, Scale, CheckCircle2, PackageCheck, Receipt, Wallet, ArrowRight, Star, Users, FileText } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId, docTotals, billOpen } from '@/lib/db';
import { fmtDate, TODAY, addDays } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat, Segmented, Progress } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { LinesEditor, useCompanyPick, SupplierPaymentForm } from './forms';
import { can, roleOf } from '@/lib/rbac';
import type { DocLine, PurchaseOrder } from '@/lib/types';

type Tab = 'orders' | 'requests' | 'suppliers';
const FLOW = [{ id: 'request', l: 'So‘rov' }, { id: 'rfq', l: 'RFQ' }, { id: 'quoted', l: 'Takliflar' }, { id: 'pending_approval', l: 'Tasdiq' }, { id: 'approved', l: 'PO' }, { id: 'received', l: 'Kirim' }, { id: 'billed', l: 'Hisob' }, { id: 'paid', l: 'To‘lov' }];

export default function Purchasing() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'orders');
  return (
    <div>
      <PageHeader title="Xarid" crumbs={['Operatsiyalar', 'Xarid']} subtitle={<span className="flex items-center gap-2">Xarid so‘rovi → RFQ → Taklif → PO (tasdiq) → Tovar kirimi → Ta’minotchi hisobi → To‘lov <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'orders', label: 'Xarid buyurtmalari', icon: <Truck className="h-3.5 w-3.5" /> }, { id: 'requests', label: 'So‘rovlar va RFQ', icon: <Send className="h-3.5 w-3.5" /> }, { id: 'suppliers', label: 'Ta’minotchilar', icon: <Users className="h-3.5 w-3.5" /> }]} />
      {tab === 'orders' && <Orders />}{tab === 'requests' && <Requests />}{tab === 'suppliers' && <Suppliers />}
    </div>
  );
}

function Orders() {
  const { db, s, mf } = useCtx(); const { nav } = useApp();
  const [st, setSt] = useState('active'); const [view, setView] = useState<string | null>(nav.params?.po || null);
  const rows = db.purchaseOrders.filter((p) => A.inScope(s, p.companyId, p.branchId) && !['request', 'rfq', 'quoted'].includes(p.status) && (st === 'all' || (st === 'active' ? !['paid', 'rejected'].includes(p.status) : p.status === st))).slice().reverse();
  const counts = Object.fromEntries(FLOW.map((f) => [f.id, db.purchaseOrders.filter((p) => A.inScope(s, p.companyId, p.branchId) && p.status === f.id).length]));
  return (
    <div className="space-y-4">
      <Card className="!p-3"><div className="no-scrollbar flex items-center gap-1 overflow-x-auto">{FLOW.map((f, i) => <div key={f.id} className="flex items-center gap-1"><button onClick={() => setSt(f.id)} className={cx('flex items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2 text-[12px] font-medium', st === f.id ? 'bg-accent-soft text-accent' : 'text-t2 hover:bg-surface-2')}><span className={cx('num grid h-5 min-w-5 place-items-center rounded-md px-1 text-[11px]', st === f.id ? 'bg-accent text-white' : 'bg-surface-3')}>{counts[f.id]}</span>{f.l}</button>{i < FLOW.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-t3" />}</div>)}</div></Card>
      <Card>
        <CardHeader title="Xarid buyurtmalari (PO)" subtitle={`${rows.length} ta`} icon={<Truck className="h-4 w-4" />} actions={<ExportButton module="purchasing" name="xarid-buyurtmalari" title="Xarid buyurtmalari" cols={[{ key: 'no', label: '№' }, { key: 'd', label: 'Sana' }, { key: 's', label: 'Ta’minotchi' }, { key: 't', label: 'Jami', type: 'money' }, { key: 'st', label: 'Holat' }]} rows={() => rows.map((p) => ({ no: p.no, d: fmtDate(p.date), s: byId(db.parties, p.supplierId)?.name, t: docTotals(p.lines).total, st: p.status }))} />} />
        <DataTable rows={rows} rowKey={(p) => p.id} onRow={(p) => setView(p.id)} search={(p) => `${p.no} ${byId(db.parties, p.supplierId)?.name} ${p.lines.map((l) => l.description).join(' ')}`}
          toolbar={<Segmented size="xs" value={['active', 'all'].includes(st) ? st : 'x'} onChange={setSt} options={[{ id: 'active', label: 'Faol' }, { id: 'all', label: 'Barchasi' }]} />}
          cols={[{ key: 'no', header: '№', primary: true, cell: (p) => <span className="font-mono text-[12px]">{p.no}</span> }, { key: 's', header: 'Ta’minotchi', cell: (p) => <span className="line-clamp-1">{byId(db.parties, p.supplierId)?.name}</span> }, { key: 'i', header: 'Pozitsiyalar', hideMobile: true, cell: (p) => <span className="line-clamp-1 text-[12px] text-t3">{p.lines.map((l) => `${l.description} × ${l.qty.toLocaleString('ru-RU')}`).join(', ')}</span> }, { key: 'd', header: 'Sana', cell: (p) => fmtDate(p.date), sort: (p) => p.date }, { key: 'e', header: 'Kutilmoqda', cell: (p) => <span className={cx(p.expectedDate < TODAY && ['approved', 'partially_received'].includes(p.status) && 'text-neg')}>{fmtDate(p.expectedDate)}</span> }, { key: 't', header: 'Jami', align: 'right', cell: (p) => mf(docTotals(p.lines).total), sort: (p) => docTotals(p.lines).total }, { key: 'st', header: 'Holat', cell: (p) => <StatusBadge status={p.status} /> }]} />
      </Card>
      {view && <PODrawer id={view} onClose={() => setView(null)} />}
    </div>
  );
}

function PODrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, mf } = useCtx(); const { dispatch, role, go } = useApp();
  const [qty, setQty] = useState<number[] | null>(null); const [ref, setRef] = useState(''); const [billOpen_, setBill] = useState(false); const [pay, setPay] = useState(false);
  const po = byId(db.purchaseOrders, id); if (!po) return null;
  const t = docTotals(po.lines); const sup = byId(db.parties, po.supplierId); const bill = byId(db.bills, po.billId);
  const idx = FLOW.findIndex((f) => f.id === (po.status === 'partially_received' ? 'approved' : po.status));
  const edit = can(role, 'purchasing', 'edit') || can(role, 'warehouse', 'edit');
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={`Xarid buyurtmasi ${po.no}`} subtitle={<span className="flex items-center gap-2">{sup?.name || 'ta’minotchi tanlanmagan'} · {byId(db.warehouses, po.warehouseId)?.name} <StatusBadge status={po.status} /></span>}
      footer={edit ? <>
        {po.status === 'pending_approval' && <Button onClick={() => go('approvals')}>Tasdiqlash markazida ko‘rish</Button>}
        {['approved', 'partially_received'].includes(po.status) && <><Button onClick={() => setQty(po.lines.map((l, i) => l.qty - (po.receivedQty[i] || 0)))}>Qisman qabul</Button><Button variant="primary" icon={<PackageCheck className="h-3.5 w-3.5" />} onClick={() => dispatch('po.receive', { id }, { success: 'Tovar qabul qilindi: zaxira oshdi, Dt zaxira / Kt 6090' })}>To‘liq qabul qilish</Button></>}
        {['received', 'partially_received'].includes(po.status) && !po.billId && <Button variant="primary" icon={<Receipt className="h-3.5 w-3.5" />} onClick={() => { setRef(`SF-${Math.floor(Math.random() * 90000 + 10000)}`); setBill(true); }}>Ta’minotchi hisobini kiritish</Button>}
        {po.status === 'billed' && bill && billOpen(bill) > 0 && <Button variant="primary" icon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setPay(true)}>To‘lash</Button>}
      </> : undefined}>
      <div className="mb-4 flex items-center">{FLOW.slice(3).map((f, i, arr) => { const fi = FLOW.findIndex((x) => x.id === f.id); const done = po.status !== 'rejected' && fi <= idx; return <div key={f.id} className="flex flex-1 items-center"><div className="flex flex-col items-center gap-1"><div className={cx('grid h-7 w-7 place-items-center rounded-full border text-[11px]', done ? 'border-accent bg-accent text-white' : 'border-line text-t3')}>{done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}</div><span className="text-[10.5px] text-t2">{f.l}</span></div>{i < arr.length - 1 && <div className={cx('mx-1 mb-4 h-px flex-1', done && fi < idx ? 'bg-accent' : 'bg-line')} />}</div>; })}</div>
      <div className="grid grid-cols-3 gap-2">{[['QQSsiz', t.net], ['QQS', t.vat], ['Jami', t.total]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[14px] font-semibold">{mf(v as number)}</p></div>)}</div>
      <table className="mt-4 w-full text-[12.5px]"><thead className="bg-surface-2 text-t3"><tr><th className="px-2 py-1.5 text-left font-semibold">Mahsulot</th><th className="px-2 py-1.5 text-right font-semibold">Buyurtma</th><th className="px-2 py-1.5 text-right font-semibold">Qabul</th><th className="px-2 py-1.5 text-right font-semibold">Narx</th></tr></thead>
        <tbody>{po.lines.map((l, i) => <tr key={i} className="border-t border-line"><td className="px-2 py-1.5">{l.description}</td><td className="num px-2 text-right">{l.qty.toLocaleString('ru-RU')}</td><td className="px-2 text-right">{qty ? <Input className="ml-auto h-7 w-24 text-right text-[12px]" type="number" value={qty[i]} onChange={(e) => setQty(qty.map((q, j) => (j === i ? +e.target.value : q)))} /> : <span className="num">{(po.receivedQty[i] || 0).toLocaleString('ru-RU')}</span>}</td><td className="num px-2 text-right">{mf(l.price)}</td></tr>)}</tbody></table>
      {qty && <div className="mt-2 flex justify-end gap-2"><Button size="xs" variant="ghost" onClick={() => setQty(null)}>Bekor</Button><Button size="xs" variant="primary" onClick={() => { if (dispatch('po.receive', { id, qtys: qty }, { success: 'Qisman kirim qilindi' }) !== undefined) setQty(null); }}>Qabul qilish</Button></div>}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">So‘ragan</span><span>{po.requestedBy}</span><span className="text-t3">Tasdiqlagan</span><span>{po.approvedBy || '—'}</span><span className="text-t3">Kutilgan sana</span><span>{fmtDate(po.expectedDate)}</span>{po.receivedDate && <><span className="text-t3">Qabul qilingan</span><span>{fmtDate(po.receivedDate)} {po.onTime ? <Badge tone="pos">o‘z vaqtida</Badge> : <Badge tone="warn">kechikkan</Badge>}</span></>}{bill && <><span className="text-t3">Ta’minotchi hisobi</span><span>{bill.supplierRef} · qoldiq {mf(billOpen(bill))}</span></>}</div>
      {po.quotes.length > 0 && <div className="mt-4"><p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-t3">Takliflar</p>{po.quotes.map((q) => <div key={q.supplierId} className={cx('flex items-center justify-between rounded-xl border px-3 py-2 text-[12.5px]', q.selected ? 'border-pos/40 bg-pos/[.06]' : 'border-line')}><span>{byId(db.parties, q.supplierId)?.name}{q.selected && <Badge tone="pos" className="ml-1.5">tanlangan</Badge>}</span><span className="num">{q.prices.length ? mf(q.prices.reduce((a, p, i) => a + p * po.lines[i].qty, 0)) : 'javob yo‘q'}</span></div>)}</div>}
      <div className="mt-4 rounded-xl border border-line p-3 text-[12px] text-t3"><p className="mb-1 font-semibold text-t2">Buxgalteriyaga ta’siri</p><p>Kirim: Dt 1010/2910 Zaxira / Kt 6090 (hisob kelmagan kirim)</p><p>Hisob: Dt 6090 + Dt 4410 QQS / Kt 6010 Kreditorlik</p><p>To‘lov: Dt 6010 / Kt 5110 Bank</p></div>
      <Modal open={billOpen_} onClose={() => setBill(false)} size="sm" title="Ta’minotchi hisob-fakturasi" footer={<><Button variant="ghost" onClick={() => setBill(false)}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('po.bill', { id, ref }, { success: 'Hisob-faktura kiritildi — kreditorlik yozildi' }) !== undefined) setBill(false); }}>Saqlash</Button></>}>
        <Field label="Hisob-faktura №"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field><p className="mt-2 text-[12px] text-t3">Summa qabul qilingan miqdor bo‘yicha: {mf(docTotals(po.lines.map((l, i) => ({ ...l, qty: po.receivedQty[i] || 0 }))).total)}</p>
      </Modal>
      {pay && bill && <SupplierPaymentForm billId={bill.id} onClose={() => setPay(false)} />}
    </Drawer>
  );
}

function Requests() {
  const { db, s, mf } = useCtx(); const { nav, role, dispatch } = useApp();
  const [create, setCreate] = useState(nav.params?.new === '1'); const [rfq, setRfq] = useState<PurchaseOrder | null>(null); const [quote, setQuote] = useState<{ po: PurchaseOrder; sup: string } | null>(null); const [direct, setDirect] = useState<PurchaseOrder | null>(null);
  const rows = db.purchaseOrders.filter((p) => A.inScope(s, p.companyId, p.branchId) && ['request', 'rfq', 'quoted'].includes(p.status)).slice().reverse();
  const edit = can(role, 'purchasing', 'create');
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{edit && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Xarid so‘rovi</Button>}</div>
      {rows.length === 0 && <Card><p className="py-8 text-center text-[13px] text-t3">Ochiq so‘rov yo‘q</p></Card>}
      {rows.map((po) => { const best = po.quotes.filter((q) => q.prices.length).map((q) => ({ q, total: q.prices.reduce((a, p, i) => a + p * po.lines[i].qty, 0) })).sort((a, b) => a.total - b.total); return (
        <Card key={po.id}>
          <CardHeader title={<span className="flex items-center gap-2"><span className="font-mono text-[13px]">{po.no}</span><StatusBadge status={po.status} /></span>} subtitle={`${byId(db.companies, po.companyId)?.name} · ${byId(db.warehouses, po.warehouseId)?.name} · so‘radi ${po.requestedBy} · ${fmtDate(po.date)}`} icon={<FileText className="h-4 w-4" />}
            actions={edit ? <>{po.status === 'request' && <><Button size="sm" onClick={() => setDirect(po)}>To‘g‘ridan-to‘g‘ri PO</Button><Button size="sm" variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setRfq(po)}>RFQ yuborish</Button></>}</> : undefined} />
          <div className="mb-3 flex flex-wrap gap-2">{po.lines.map((l, i) => <Badge key={i}>{l.description} × {l.qty.toLocaleString('ru-RU')} {byId(db.products, l.productId)?.unit}</Badge>)}</div>
          {po.quotes.length > 0 && (
            <div className="thin-scroll overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[620px] text-[12.5px]"><thead className="bg-surface-2 text-t3"><tr><th className="px-3 py-2 text-left font-semibold">Ta’minotchi</th>{po.lines.map((l, i) => <th key={i} className="px-3 py-2 text-right font-semibold">{l.description.slice(0, 18)} (birlik)</th>)}<th className="px-3 py-2 text-right font-semibold">Muddat</th><th className="px-3 py-2 text-right font-semibold">Jami (QQSsiz)</th><th /></tr></thead>
              <tbody>{po.quotes.map((q) => { const tot = q.prices.reduce((a, p, i) => a + p * po.lines[i].qty, 0); const isBest = best[0]?.q.supplierId === q.supplierId; const sup = byId(db.parties, q.supplierId)!; return (
                <tr key={q.supplierId} className={cx('border-t border-line', isBest && 'bg-pos/[.05]')}>
                  <td className="px-3 py-2"><span className="font-medium text-t1">{sup.name}</span><span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-warn"><Star className="h-3 w-3 fill-current" />{sup.rating}</span>{isBest && <Badge tone="pos" className="ml-1.5">eng arzon</Badge>}</td>
                  {po.lines.map((_, i) => <td key={i} className="num px-3 text-right">{q.prices[i] ? mf(q.prices[i]) : <span className="text-t3">—</span>}</td>)}
                  <td className="px-3 text-right text-t2">{q.leadDays ? `${q.leadDays} kun` : '—'}</td>
                  <td className="num px-3 text-right font-semibold">{q.prices.length ? mf(tot) : <span className="font-normal text-t3">javob kutilmoqda</span>}</td>
                  <td className="px-3 text-right">{edit && (q.prices.length ? <Button size="xs" variant={isBest ? 'primary' : 'secondary'} onClick={() => dispatch('pr.select', { id: po.id, supplierId: q.supplierId }, { success: 'Taklif tanlandi — PO tasdiqlashga yuborildi' })}>Tanlash</Button> : <Button size="xs" onClick={() => setQuote({ po, sup: q.supplierId })}>Taklif kiritish</Button>)}</td>
                </tr>
              ); })}</tbody></table></div>
          )}
          {best.length > 1 && <p className="mt-2 text-[11.5px] text-t3">Farq: eng arzon va eng qimmat taklif orasida {mf(best[best.length - 1].total - best[0].total)} ({(((best[best.length - 1].total - best[0].total) / best[0].total) * 100).toFixed(1)}%). Narxdan tashqari yetkazish muddati va reytingni hisobga oling.</p>}
        </Card>
      ); })}
      {create && <PRForm onClose={() => setCreate(false)} />}
      {rfq && <RfqForm po={rfq} onClose={() => setRfq(null)} />}
      {quote && <QuoteForm po={quote.po} supplierId={quote.sup} onClose={() => setQuote(null)} />}
      {direct && <DirectPO po={direct} onClose={() => setDirect(null)} />}
    </div>
  );
}

function PRForm({ onClose }: { onClose: () => void }) {
  const { db } = useCtx(); const { dispatch, role } = useApp();
  const { companyId, branchId, pick } = useCompanyPick();
  const whs = db.warehouses.filter((w) => w.companyId === companyId && w.kind !== 'finished');
  const [wh, setWh] = useState(whs[0]?.id); const [exp, setExp] = useState(addDays(TODAY, 14));
  const [lines, setLines] = useState<DocLine[]>([{ description: '', qty: 1, price: 0, discount: 0, vat: 12 }]);
  return (
    <Modal open onClose={onClose} size="xl" title="Xarid so‘rovi" subtitle="Narxlar ixtiyoriy — RFQ orqali ta’minotchilardan olinadi" icon={<FileText className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!lines.every((l) => l.productId && l.qty > 0)} onClick={() => { if (dispatch('pr.create', { date: TODAY, expectedDate: exp, companyId, branchId, warehouseId: wh, lines, requestedBy: roleOf(role).persona }, { success: 'Xarid so‘rovi yaratildi' }) !== undefined) onClose(); }}>Yaratish</Button></>}>
      <div className="grid gap-3 sm:grid-cols-4">{pick}<Field label="Ombor"><Select value={wh} onChange={(e) => setWh(e.target.value)}>{whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select></Field><Field label="Kerakli sana"><Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></Field></div>
      <div className="mt-4"><LinesEditor lines={lines} setLines={setLines} companyId={companyId} kinds={['raw', 'goods']} priceField="stdCost" /></div>
    </Modal>
  );
}

function RfqForm({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const { db } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const sups = db.parties.filter((p) => p.kind === 'supplier' && p.companyIds.includes(po.companyId));
  const pref = po.lines.flatMap((l) => { const p = byId(db.products, l.productId); return [p?.supplierId, ...(p?.altSupplierIds || [])]; }).filter(Boolean) as string[];
  const [sel, setSel] = useState<string[]>([...new Set(pref)].slice(0, 3));
  return (
    <Modal open onClose={onClose} size="md" title={`RFQ yuborish — ${po.no}`} subtitle="Demo: email/Telegram ulanmagan — RFQ tizimda qayd etiladi, takliflarni qo‘lda kiritasiz" icon={<Send className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!sel.length} onClick={() => { if (dispatch('pr.rfq', { id: po.id, suppliers: sel }, { success: `RFQ ${sel.length} ta ta’minotchiga qayd etildi` }) !== undefined) onClose(); }}>Yuborish ({sel.length})</Button></>}>
      <div className="space-y-1.5">{sups.map((s) => <label key={s.id} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2', sel.includes(s.id) ? 'border-accent bg-accent-soft' : 'border-line')}><input type="checkbox" className="accent-[var(--accent)]" checked={sel.includes(s.id)} onChange={() => setSel(sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id])} /><span className="flex-1 text-[13px] text-t1">{s.name}</span><span className="text-[11.5px] text-t3">{s.segment}</span><span className="flex items-center gap-0.5 text-[11.5px] text-warn"><Star className="h-3 w-3 fill-current" />{s.rating}</span></label>)}</div>
    </Modal>
  );
}

function QuoteForm({ po, supplierId, onClose }: { po: PurchaseOrder; supplierId: string; onClose: () => void }) {
  const { db, mf } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const [prices, setPrices] = useState(po.lines.map((l) => byId(db.products, l.productId)?.stdCost || 0)); const [lead, setLead] = useState(7);
  return (
    <Modal open onClose={onClose} size="sm" title={`Taklif: ${byId(db.parties, supplierId)?.name}`} footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('pr.quote', { id: po.id, supplierId, prices, leadDays: lead }, { success: 'Taklif kiritildi' }) !== undefined) onClose(); }}>Saqlash</Button></>}>
      <div className="space-y-3">{po.lines.map((l, i) => <Field key={i} label={`${l.description} — birlik narxi (QQSsiz)`} hint={`${l.qty.toLocaleString('ru-RU')} × = ${mf(prices[i] * l.qty)}`}><Input type="number" value={prices[i] || ''} onChange={(e) => setPrices(prices.map((p, j) => (j === i ? +e.target.value : p)))} /></Field>)}<Field label="Yetkazish muddati (kun)"><Input type="number" value={lead} onChange={(e) => setLead(+e.target.value)} /></Field></div>
    </Modal>
  );
}

function DirectPO({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const { db } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const sups = db.parties.filter((p) => p.kind === 'supplier' && p.companyIds.includes(po.companyId));
  const [sup, setSup] = useState(byId(db.products, po.lines[0].productId)?.supplierId || sups[0]?.id);
  const [prices, setPrices] = useState(po.lines.map((l) => l.price || byId(db.products, l.productId)?.stdCost || 0));
  return (
    <Modal open onClose={onClose} size="sm" title="To‘g‘ridan-to‘g‘ri PO" subtitle="RFQsiz — doimiy ta’minotchi bilan" footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('po.submit', { id: po.id, supplierId: sup, prices }, { success: 'PO tasdiqlashga yuborildi' }) !== undefined) onClose(); }}>Tasdiqlashga yuborish</Button></>}>
      <div className="space-y-3"><Field label="Ta’minotchi"><Select value={sup} onChange={(e) => setSup(e.target.value)}>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>{po.lines.map((l, i) => <Field key={i} label={`${l.description} — narx`}><Input type="number" value={prices[i] || ''} onChange={(e) => setPrices(prices.map((p, j) => (j === i ? +e.target.value : p)))} /></Field>)}</div>
    </Modal>
  );
}

function Suppliers() {
  const { db, s, m } = useCtx(); const nav = useApp((x) => x.nav);
  const spend = useMemo(() => A.supplierSpend(db, s, '2026-01-01', TODAY), [db, s]);
  const all = db.parties.filter((p) => p.kind === 'supplier' && p.companyIds.some((c) => s.companyIds.includes(c)));
  const rows = all.map((p) => { const x = spend.find((y) => y.id === p.id); return { p, spend: x?.spend || 0, open: db.bills.filter((b) => b.supplierId === p.id).reduce((a, b) => a + billOpen(b), 0), onTime: x?.onTime || 0, deliveries: x?.deliveries || 0, bills: x?.bills || 0 }; }).sort((a, b) => b.spend - a.spend);
  const [view, setView] = useState<string | null>(nav.params?.party || null);
  const tot = rows.reduce((a, r) => a + r.spend, 0);
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Ta’minotchilar" value={String(rows.length)} /><Stat label="Xarid (YTD, QQSsiz)" value={m(tot)} /><Stat label="Ochiq kreditorlik" value={m(rows.reduce((a, r) => a + r.open, 0))} /><Stat label="O‘z vaqtida yetkazish" value={`${(rows.reduce((a, r) => a + r.onTime, 0) / Math.max(1, rows.reduce((a, r) => a + r.deliveries, 0)) * 100).toFixed(0)}%`} /></div>
      <Card>
        <CardHeader title="Ta’minotchilar bazasi va samaradorlik" icon={<Users className="h-4 w-4" />} actions={<ExportButton module="purchasing" name="taminotchilar" title="Ta’minotchilar samaradorligi" cols={[{ key: 'n', label: 'Nomi' }, { key: 'stir', label: 'STIR' }, { key: 's', label: 'Xarid', type: 'money' }, { key: 'o', label: 'Qarz', type: 'money' }, { key: 't', label: 'O‘z vaqtida' }]} rows={() => rows.map((r) => ({ n: r.p.name, stir: r.p.stir, s: r.spend, o: r.open, t: `${r.onTime}/${r.deliveries}` }))} />} />
        <DataTable rows={rows} rowKey={(r) => r.p.id} onRow={(r) => setView(r.p.id)} search={(r) => `${r.p.name} ${r.p.stir} ${r.p.segment}`}
          cols={[{ key: 'n', header: 'Ta’minotchi', primary: true, cell: (r) => <div><p className="font-medium">{r.p.name}</p><p className="text-[11px] text-t3">STIR {r.p.stir}{r.p.mfo ? ` · MFO ${r.p.mfo}` : ''}</p></div> }, { key: 'seg', header: 'Toifa', cell: (r) => <Badge>{r.p.segment}</Badge> }, { key: 'r', header: 'Reyting', cell: (r) => <span className="flex items-center gap-1 text-warn"><Star className="h-3.5 w-3.5 fill-current" />{r.p.rating}</span>, sort: (r) => r.p.rating || 0 }, { key: 's', header: 'Xarid (YTD)', align: 'right', cell: (r) => m(r.spend), sort: (r) => r.spend }, { key: 'sh', header: 'Ulush', align: 'right', hideMobile: true, cell: (r) => `${tot ? ((r.spend / tot) * 100).toFixed(1) : 0}%` }, { key: 'ot', header: 'O‘z vaqtida', cell: (r) => r.deliveries ? <div className="w-24"><Progress value={(r.onTime / r.deliveries) * 100} height={4} tone={r.onTime / r.deliveries >= 0.7 ? 'pos' : 'warn'} /><span className="text-[11px] text-t3">{r.onTime}/{r.deliveries}</span></div> : <span className="text-t3">—</span> }, { key: 'o', header: 'Ochiq qarz', align: 'right', cell: (r) => (r.open ? m(r.open) : '—'), sort: (r) => r.open }, { key: 't', header: 'Muddat', cell: (r) => `${r.p.terms} kun` }]} />
      </Card>
      {view && (() => { const p = byId(db.parties, view)!; const bills = db.bills.filter((b) => b.supplierId === view).slice().reverse(); const pos = db.purchaseOrders.filter((x) => x.supplierId === view).slice().reverse(); const prices = db.moves.filter((mv) => mv.kind === 'receipt' && pos.some((x) => x.no === mv.ref)); return (
        <Drawer open onClose={() => setView(null)} title={p.name} subtitle={`${p.segment} · STIR ${p.stir}`} width="max-w-2xl">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Telefon</span><span>{p.phone}</span><span className="text-t3">Email</span><span>{p.email}</span><span className="text-t3">Manzil</span><span>{p.address}</span><span className="text-t3">To‘lov muddati</span><span>{p.terms} kun</span></div>
          <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Narx tarixi (kirimlar)</p>
          <div className="space-y-1">{prices.slice(-8).reverse().map((mv) => <div key={mv.id} className="flex justify-between text-[12.5px]"><span>{fmtDate(mv.date)} · {byId(db.products, mv.productId)?.name}</span><span className="num">{m(mv.cost / mv.qty)} / {byId(db.products, mv.productId)?.unit}</span></div>)}{!prices.length && <p className="text-[12.5px] text-t3">Tovar kirimi yo‘q (xizmat ta’minotchisi)</p>}</div>
          <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Xarid tarixi</p>
          <div className="space-y-1">{bills.slice(0, 12).map((b) => <div key={b.id} className="flex items-center justify-between gap-2 text-[12.5px]"><span className="truncate">{fmtDate(b.date)} · {b.supplierRef} · {b.memo}</span><span className="num shrink-0">{m(b.total)} {billOpen(b) > 0 && <Badge tone="warn">ochiq</Badge>}</span></div>)}</div>
        </Drawer>
      ); })()}
    </div>
  );
}
