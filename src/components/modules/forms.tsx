'use client';
// Shared business forms used across modules (invoice, payment, bill, expense)
import { useMemo, useState } from 'react';
import { Plus, Trash2, Receipt, Wallet, FileText } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { Modal, Field, Input, Select, Button, cx, Badge } from '@/components/ui';
import { docTotals, lineNet, byId, invOpen, billOpen } from '@/lib/db';
import { CHART, ACC } from '@/lib/core/coa';
import { TODAY, addDays, fmtDate } from '@/lib/core/dates';
import { accountBalance } from '@/lib/core/ledger';
import type { DocLine } from '@/lib/types';

export function useCompanyPick() {
  const { db, filters } = useApp();
  const [companyId, setCompanyId] = useState(filters.companyId === 'all' ? 'trd' : filters.companyId);
  const co = byId(db.companies, companyId)!;
  const [branchId, setBranchId] = useState(filters.branchId !== 'all' && co.branchIds.includes(filters.branchId) ? filters.branchId : co.branchIds[0]);
  const pick = (
    <>
      <Field label="Kompaniya"><Select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setBranchId(byId(db.companies, e.target.value)!.branchIds[0]); }}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      <Field label="Filial"><Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>{co.branchIds.map((b) => <option key={b} value={b}>{byId(db.branches, b)?.name}</option>)}</Select></Field>
    </>
  );
  return { companyId, branchId, pick, co };
}

export function LinesEditor({ lines, setLines, companyId, kinds, priceField = 'price' }: { lines: DocLine[]; setLines: (l: DocLine[]) => void; companyId: string; kinds: string[]; priceField?: 'price' | 'stdCost' }) {
  const { db, mf } = useCtx();
  const prods = db.products.filter((p) => p.companyId === companyId && kinds.includes(p.kind));
  const set = (i: number, p: Partial<DocLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const t = docTotals(lines);
  return (
    <div>
      <div className="thin-scroll overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[680px] text-[12.5px]">
          <thead className="bg-surface-2"><tr>{['Mahsulot / xizmat', 'Miqdor', 'Narx (QQSsiz)', 'Chegirma %', 'QQS %', 'Summa', ''].map((h) => <th key={h} className="px-2 py-2 text-left font-semibold text-t3">{h}</th>)}</tr></thead>
          <tbody>{lines.map((l, i) => (
            <tr key={i} className="border-t border-line">
              <td className="px-2 py-1.5"><Select className="h-8 text-[12px]" value={l.productId || ''} onChange={(e) => { const p = byId(db.products, e.target.value); if (p) set(i, { productId: p.id, description: p.name, price: priceField === 'price' ? p.price : p.stdCost, vat: p.vat }); }}><option value="">— tanlang —</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</Select></td>
              <td className="w-24 px-2"><Input className="h-8 text-right text-[12px]" type="number" min={0} value={l.qty || ''} onChange={(e) => set(i, { qty: +e.target.value })} /></td>
              <td className="w-32 px-2"><Input className="h-8 text-right text-[12px]" type="number" min={0} value={l.price || ''} onChange={(e) => set(i, { price: +e.target.value })} /></td>
              <td className="w-24 px-2"><Input className="h-8 text-right text-[12px]" type="number" min={0} max={100} value={l.discount || ''} onChange={(e) => set(i, { discount: +e.target.value })} /></td>
              <td className="w-20 px-2"><Input className="h-8 text-right text-[12px]" type="number" min={0} value={l.vat} onChange={(e) => set(i, { vat: +e.target.value })} /></td>
              <td className="num w-32 px-2 text-right text-t1">{mf(lineNet(l))}</td>
              <td className="w-9 px-1"><button onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length <= 1} className="grid h-8 w-8 place-items-center rounded-lg text-t3 hover:bg-neg/10 hover:text-neg disabled:opacity-30" aria-label="O‘chirish"><Trash2 className="h-3.5 w-3.5" /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <Button size="xs" icon={<Plus className="h-3 w-3" />} onClick={() => setLines([...lines, { description: '', qty: 1, price: 0, discount: 0, vat: 12 }])}>Qator</Button>
        <div className="min-w-[220px] space-y-0.5 text-[12.5px]"><div className="flex justify-between"><span className="text-t3">QQSsiz</span><span className="num text-t1">{mf(t.net)}</span></div><div className="flex justify-between"><span className="text-t3">QQS</span><span className="num text-t1">{mf(t.vat)}</span></div><div className="flex justify-between border-t border-line pt-1 font-semibold"><span>Jami</span><span className="num">{mf(t.total)}</span></div></div>
      </div>
    </div>
  );
}

export function InvoiceForm({ onClose, customerId: c0 }: { onClose: () => void; customerId?: string }) {
  const { db } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const { companyId, branchId, pick } = useCompanyPick();
  const custs = db.parties.filter((p) => p.kind === 'customer' && p.companyIds.includes(companyId) && p.id !== 'c12');
  const [customerId, setCustomer] = useState(c0 && custs.some((c) => c.id === c0) ? c0 : custs[0]?.id);
  const cust = byId(db.parties, customerId);
  const [date, setDate] = useState(TODAY); const [due, setDue] = useState(addDays(TODAY, cust?.terms || 30));
  const [projectId, setProject] = useState('');
  const svc = companyId === 'srv';
  const [lines, setLines] = useState<DocLine[]>([{ description: '', qty: 1, price: 0, discount: 0, vat: 12 }]);
  const valid = lines.every((l) => l.productId && l.qty > 0 && l.price >= 0) && customerId;
  const hasGoods = lines.some((l) => l.productId && byId(db.products, l.productId)?.kind !== 'service');
  return (
    <Modal open onClose={onClose} size="xl" title="Yangi hisob-faktura" subtitle="Provodka: Dt 4010 Debitorlik / Kt 90xx Tushum, Kt 6411 QQS" icon={<Receipt className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!valid} onClick={() => { if (dispatch('inv.create', { date, dueDate: due, companyId, branchId, customerId, lines, projectId: projectId || undefined }, { success: 'Hisob-faktura yaratildi va provodka qilindi' }) !== undefined) onClose(); }}>Yaratish va provodka qilish</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        {pick}
        <Field label="Mijoz" required><Select value={customerId} onChange={(e) => { setCustomer(e.target.value); setDue(addDays(date, byId(db.parties, e.target.value)?.terms || 30)); }}>{custs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Sana"><Input type="date" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="To‘lov muddati" hint={cust ? `Shartnoma: ${cust.terms} kun` : undefined}><Input type="date" value={due} min={date} onChange={(e) => setDue(e.target.value)} /></Field>
        <Field label="Loyiha (ixtiyoriy)"><Select value={projectId} onChange={(e) => setProject(e.target.value)}><option value="">—</option>{db.projects.filter((p) => p.companyId === companyId).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name.slice(0, 30)}</option>)}</Select></Field>
      </div>
      {cust?.creditLimit && <p className="mt-2 text-[11.5px] text-t3">Kredit limiti: {fmtMoney(cust.creditLimit)} · ochiq qarz: {fmtMoney(db.invoices.filter((i) => i.customerId === cust.id).reduce((a, i) => a + invOpen(i), 0))}</p>}
      <div className="mt-4"><LinesEditor lines={lines} setLines={setLines} companyId={companyId} kinds={svc ? ['service'] : ['service', 'goods', 'finished']} /></div>
      {hasGoods && <p className="mt-3 rounded-xl border border-warn/25 bg-warn/[.06] p-3 text-[12px] text-t2"><b className="text-warn">Eslatma:</b> tovarlar uchun to‘g‘ri yo‘l — Sotuv → Buyurtma → Yetkazish → Hisob-faktura (tannarx va ombor avtomatik yangilanadi). To‘g‘ridan-to‘g‘ri hisob-faktura faqat tushumni yozadi, ombordan chiqim qilmaydi.</p>}
    </Modal>
  );
}
const fmtMoney = (v: number) => `${Math.round(v / 1e6).toLocaleString('ru-RU')} mln so‘m`;

export function ReceiptForm({ onClose, invoiceId }: { onClose: () => void; invoiceId?: string }) {
  const { db, mf } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const inv0 = byId(db.invoices, invoiceId);
  const [companyId, setCompany] = useState(inv0?.companyId || (useApp.getState().filters.companyId === 'all' ? 'trd' : useApp.getState().filters.companyId));
  const custs = db.parties.filter((p) => p.kind === 'customer' && p.companyIds.includes(companyId));
  const [customerId, setCustomer] = useState(inv0?.customerId || custs[0]?.id);
  const open = db.invoices.filter((i) => i.kind === 'sales' && i.customerId === customerId && i.companyId === companyId && invOpen(i) > 0).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const [sel, setSel] = useState<string[]>(inv0 ? [inv0.id] : []);
  const selTotal = open.filter((i) => sel.includes(i.id)).reduce((a, i) => a + invOpen(i), 0);
  const [amount, setAmount] = useState(inv0 ? invOpen(inv0) : 0);
  const [account, setAccount] = useState('5110'); const [date, setDate] = useState(TODAY);
  const allocs = () => { let left = amount; return open.filter((i) => sel.includes(i.id)).map((i) => { const a = Math.min(left, invOpen(i)); left -= a; return { docId: i.id, amount: a }; }).filter((x) => x.amount > 0); };
  return (
    <Modal open onClose={onClose} size="lg" title="Mijozdan to‘lov qabul qilish" subtitle="Provodka: Dt 5110/5010 Pul / Kt 4010 Debitorlik (ortiqcha summa → 6310 avans)" icon={<Wallet className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!(amount > 0)} onClick={() => { const b = byId(db.companies, companyId)!.branchIds[0]; if (dispatch('pay.receipt', { date, companyId, branchId: inv0?.branchId || b, customerId, amount, account, allocations: sel.length ? allocs() : undefined }, { success: `To‘lov qabul qilindi: ${mf(amount)}` }) !== undefined) onClose(); }}>Qabul qilish</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kompaniya"><Select value={companyId} onChange={(e) => { setCompany(e.target.value); setSel([]); }}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Mijoz"><Select value={customerId} onChange={(e) => { setCustomer(e.target.value); setSel([]); setAmount(0); }}>{custs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Summa (so‘m)" required hint={sel.length ? `Tanlangan hisob-fakturalar: ${mf(selTotal)} · qisman to‘lov mumkin` : 'Hisob-faktura tanlanmasa — eng eskisidan boshlab taqsimlanadi'}><Input type="number" min={0} value={amount || ''} onChange={(e) => setAmount(+e.target.value)} /></Field>
        <Field label="Hisob"><Select value={account} onChange={(e) => setAccount(e.target.value)}><option value="5110">5110 — Bank (so‘m)</option><option value="5010">5010 — Kassa</option></Select></Field>
        <Field label="Sana"><Input type="date" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      <p className="mb-2 mt-4 text-[12px] font-semibold text-t2">Ochiq hisob-fakturalar ({open.length})</p>
      <div className="thin-scroll max-h-60 space-y-1 overflow-y-auto">{open.map((i) => (
        <label key={i.id} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2', sel.includes(i.id) ? 'border-accent bg-accent-soft' : 'border-line')}>
          <input type="checkbox" className="accent-[var(--accent)]" checked={sel.includes(i.id)} onChange={() => { const n = sel.includes(i.id) ? sel.filter((x) => x !== i.id) : [...sel, i.id]; setSel(n); setAmount(open.filter((x) => n.includes(x.id)).reduce((a, x) => a + invOpen(x), 0)); }} />
          <span className="font-mono text-[12px] text-t2">{i.no}</span><span className="text-[12px] text-t3">muddat {fmtDate(i.dueDate)}</span>{i.dueDate < TODAY && <Badge tone="neg">muddati o‘tgan</Badge>}<span className="num ml-auto text-[12.5px] font-semibold text-t1">{mf(invOpen(i))}</span>
        </label>
      ))}{!open.length && <p className="text-[12.5px] text-t3">Ochiq hisob-faktura yo‘q — to‘lov avans sifatida yoziladi.</p>}</div>
    </Modal>
  );
}

export function SupplierPaymentForm({ onClose, billId, supplierId: s0 }: { onClose: () => void; billId?: string; supplierId?: string }) {
  const { db, mf } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const b0 = byId(db.bills, billId);
  const [companyId, setCompany] = useState(b0?.companyId || (useApp.getState().filters.companyId === 'all' ? 'trd' : useApp.getState().filters.companyId));
  const sups = db.parties.filter((p) => p.kind === 'supplier' && db.bills.some((b) => b.supplierId === p.id && b.companyId === companyId && billOpen(b) > 0));
  const [supplierId, setSupplier] = useState(b0?.supplierId || s0 || sups[0]?.id);
  const open = db.bills.filter((b) => b.supplierId === supplierId && b.companyId === companyId && billOpen(b) > 0);
  const [sel, setSel] = useState<string[]>(b0 ? [b0.id] : open.map((b) => b.id));
  const [amount, setAmount] = useState(b0 ? billOpen(b0) : open.reduce((a, b) => a + billOpen(b), 0));
  const [account, setAccount] = useState('5110');
  const cash = accountBalance(db.entries, companyId, account);
  return (
    <Modal open onClose={onClose} size="lg" title="Ta’minotchiga to‘lov" subtitle="Provodka: Dt 6010 Kreditorlik / Kt 5110 Bank" icon={<Wallet className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!(amount > 0) || amount > cash} onClick={() => { if (dispatch('pay.supplier', { date: TODAY, companyId, branchId: b0?.branchId || byId(db.companies, companyId)!.branchIds[0], supplierId, amount, account, billIds: sel }, { success: `To‘lov amalga oshirildi: ${mf(amount)}` }) !== undefined) onClose(); }}>To‘lash</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kompaniya"><Select value={companyId} onChange={(e) => setCompany(e.target.value)}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Ta’minotchi"><Select value={supplierId} onChange={(e) => { setSupplier(e.target.value); const o = db.bills.filter((b) => b.supplierId === e.target.value && b.companyId === companyId && billOpen(b) > 0); setSel(o.map((b) => b.id)); setAmount(o.reduce((a, b) => a + billOpen(b), 0)); }}>{sups.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Summa" hint="Qisman to‘lash mumkin"><Input type="number" value={amount || ''} onChange={(e) => setAmount(+e.target.value)} /></Field>
        <Field label="Hisob" hint={`Qoldiq: ${mf(cash)}`} error={amount > cash ? 'Hisobda yetarli mablag‘ yo‘q' : undefined}><Select value={account} onChange={(e) => setAccount(e.target.value)}><option value="5110">5110 — Bank (so‘m)</option><option value="5010">5010 — Kassa</option></Select></Field>
      </div>
      <div className="mt-4 space-y-1">{open.map((b) => <label key={b.id} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2', sel.includes(b.id) ? 'border-accent bg-accent-soft' : 'border-line')}><input type="checkbox" className="accent-[var(--accent)]" checked={sel.includes(b.id)} onChange={() => { const n = sel.includes(b.id) ? sel.filter((x) => x !== b.id) : [...sel, b.id]; setSel(n); setAmount(open.filter((x) => n.includes(x.id)).reduce((a, x) => a + billOpen(x), 0)); }} /><span className="text-[12.5px] text-t1">{b.supplierRef}</span><span className="text-[12px] text-t3">{b.memo}</span><span className="text-[11.5px] text-t3">· {fmtDate(b.dueDate)}</span><span className="num ml-auto text-[12.5px] font-semibold">{mf(billOpen(b))}</span></label>)}</div>
    </Modal>
  );
}

export function BillForm({ onClose }: { onClose: () => void }) {
  const { db, mf } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  const { companyId, branchId, pick } = useCompanyPick();
  const sups = db.parties.filter((p) => p.kind === 'supplier' && p.companyIds.includes(companyId));
  const [f, setF] = useState({ supplierId: sups[0]?.id, supplierRef: '', account: '9426', net: 0, vatRate: 12, memo: '', costCenter: 'Ma’muriyat', date: TODAY });
  const exp = useMemo(() => CHART.filter((a) => a.type === 'expense' || a.code === '2510'), []);
  return (
    <Modal open onClose={onClose} size="lg" title="Ta’minotchi hisob-fakturasi (xizmat / xarajat)" subtitle="Tovar xaridi uchun Xarid → PO → Kirim → Hisob yo‘lidan foydalaning" icon={<FileText className="h-4 w-4" />}
      footer={<><span className="mr-auto text-[12.5px] text-t3">Jami: <b className="num text-t1">{mf(Math.round(f.net * (1 + f.vatRate / 100)))}</b></span><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!(f.net > 0) || !f.memo} onClick={() => { if (dispatch('bill.create', { ...f, companyId, branchId }, { success: 'Hisob-faktura kiritildi' }) !== undefined) onClose(); }}>Saqlash va provodka</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {pick}
        <Field label="Ta’minotchi"><Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Hisob-faktura №"><Input value={f.supplierRef} onChange={(e) => setF({ ...f, supplierRef: e.target.value })} placeholder="SF-12345" /></Field>
        <Field label="Xarajat hisobi"><Select value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })}>{exp.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</Select></Field>
        <Field label="Xarajat markazi"><Select value={f.costCenter} onChange={(e) => setF({ ...f, costCenter: e.target.value })}>{['Ma’muriyat', 'Sotuv', 'Marketing', 'Ishlab chiqarish', 'Ombor', 'Loyihalar'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Summa (QQSsiz)" required><Input type="number" value={f.net || ''} onChange={(e) => setF({ ...f, net: +e.target.value })} /></Field>
        <Field label="QQS %"><Input type="number" value={f.vatRate} onChange={(e) => setF({ ...f, vatRate: +e.target.value })} /></Field>
        <Field label="Izoh" required className="sm:col-span-2"><Input value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} placeholder="Masalan: Ofis tozalash xizmati — sentyabr" /></Field>
      </div>
      <p className="mt-3 text-[11.5px] text-t3">Provodka: Dt {f.account} {ACC[f.account]?.name} + Dt 4410 QQS / Kt 6010 Kreditorlik</p>
    </Modal>
  );
}
