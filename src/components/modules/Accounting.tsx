'use client';
import { useMemo, useState } from 'react';
import { Plus, BookOpen, Trash2, Scale, Lock, Unlock, CheckCircle2, AlertTriangle, RotateCcw, FileText, ListTree, Landmark } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { CHART, ACC, normalSign } from '@/lib/core/coa';
import { balances, trialBalance, generalLedger, validateLines } from '@/lib/core/ledger';
import { fmtDate, TODAY, monthLabel, monthKey, addDays } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, Explain, DemoTag, Confirm, Drawer } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { can } from '@/lib/rbac';
import type { Account, JournalEntry, JournalLine } from '@/lib/types';
import { byId } from '@/lib/db';
import { Statements } from './Statements';

type Tab = 'coa' | 'journal' | 'ledger' | 'tb' | 'statements' | 'close';

export default function Accounting() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'journal');
  return (
    <div>
      <PageHeader title="Buxgalteriya" crumbs={['Moliya', 'Buxgalteriya']}
        subtitle={<span className="flex items-center gap-2">Ikki yoqlama yozuv asosidagi bosh kitob — barcha modullar shu yerga provodka qiladi <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { id: 'journal', label: 'Jurnal provodkalari', icon: <BookOpen className="h-3.5 w-3.5" /> }, { id: 'coa', label: 'Hisoblar rejasi', icon: <ListTree className="h-3.5 w-3.5" /> },
        { id: 'ledger', label: 'Bosh kitob' }, { id: 'tb', label: 'Aylanma-saldo', icon: <Scale className="h-3.5 w-3.5" /> }, { id: 'statements', label: 'Moliyaviy hisobotlar', icon: <FileText className="h-3.5 w-3.5" /> }, { id: 'close', label: 'Davrni yopish', icon: <Lock className="h-3.5 w-3.5" /> },
      ]} />
      {tab === 'journal' && <Journal />}
      {tab === 'coa' && <ChartOfAccounts />}
      {tab === 'ledger' && <Ledger />}
      {tab === 'tb' && <TrialBalance />}
      {tab === 'statements' && <Statements />}
      {tab === 'close' && <PeriodClose />}
    </div>
  );
}

// ─── Journal ─────────────────────────────────────────────────
const SRC: Record<string, string> = { opening: 'Boshl. qoldiq', manual: 'Qo‘lda', sales_invoice: 'Hisob-faktura', credit_note: 'Kredit-nota', receipt: 'Kirim to‘lov', delivery: 'Yetkazish', bill: 'Ta’minotchi hisobi', supplier_payment: 'To‘lov', goods_receipt: 'Tovar kirimi', payroll: 'Ish haqi', payroll_payment: 'Ish haqi to‘lovi', tax_payment: 'Soliq to‘lovi', vat_settlement: 'QQS hisob-kitobi', tax_accrual: 'Soliq hisoblash', depreciation: 'Amortizatsiya', asset_purchase: 'AV xaridi', wo_issue: 'Xomashyo berish', wo_complete: 'Ishlab chiqarish', overhead_variance: 'Ustama farqi', expense: 'Xarajat', dividend: 'Dividend', transfer: 'O‘tkazma', adjustment: 'Tuzatish', reversal: 'Storno', loan: 'Kredit', allocation: 'Taqsimot', retail: 'Chakana', sales_return: 'Qaytarish' };

function Journal() {
  const { db, s, from, to, mf } = useCtx(); const { nav, role, dispatch } = useApp();
  const [src, setSrc] = useState('all'); const [open, setOpen] = useState(nav.params?.new === '1'); const [view, setView] = useState<JournalEntry | null>(null);
  const [q] = useState(nav.params?.q || '');
  const rows = useMemo(() => db.entries.filter((e) => s.companyIds.includes(e.companyId) && (!s.branchId || e.branchId === s.branchId) && (q ? e.no === q || e.memo.includes(q) : e.date >= from && e.date <= to) && (src === 'all' || e.source.type === src)).slice().reverse(), [db, s, from, to, src, q]);
  const tot = rows.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.debit, 0), 0);
  return (
    <Card>
      <CardHeader title="Jurnal provodkalari" subtitle={<>{rows.length} ta provodka · aylanma {mf(tot)} · {q ? `qidiruv: ${q}` : `${fmtDate(from)}–${fmtDate(to)}`}</>} icon={<BookOpen className="h-4 w-4" />}
        actions={<>{can(role, 'accounting', 'create') && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Yangi provodka</Button>}
          <ExportButton module="accounting" name="jurnal" title="Jurnal provodkalari" cols={[{ key: 'no', label: '№' }, { key: 'date', label: 'Sana' }, { key: 'memo', label: 'Izoh' }, { key: 'account', label: 'Hisob' }, { key: 'debit', label: 'Debet', type: 'money' }, { key: 'credit', label: 'Kredit', type: 'money' }]}
            rows={() => rows.flatMap((e) => e.lines.map((l) => ({ no: e.no, date: fmtDate(e.date), memo: e.memo, account: `${l.account} ${ACC[l.account]?.name}`, debit: l.debit, credit: l.credit })))} /></>} />
      <DataTable rows={rows} rowKey={(e) => e.id} onRow={setView} search={(e) => `${e.no} ${e.memo} ${e.lines.map((l) => l.account).join(' ')}`} searchPlaceholder="№, izoh yoki hisob kodi…"
        toolbar={<Select className="h-9 w-auto text-[12.5px]" value={src} onChange={(e) => setSrc(e.target.value)}><option value="all">Barcha manbalar</option>{Object.entries(SRC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
        cols={[
          { key: 'no', header: '№', cell: (e) => <span className="whitespace-nowrap font-mono text-[11.5px] text-t2">{e.no}</span>, primary: true },
          { key: 'date', header: 'Sana', cell: (e) => fmtDate(e.date), sort: (e) => e.date },
          { key: 'memo', header: 'Izoh', cell: (e) => <span className="line-clamp-1 max-w-[360px]">{e.memo}</span> },
          { key: 'src', header: 'Manba', cell: (e) => <Badge>{SRC[e.source.type] || e.source.type}</Badge> },
          { key: 'acc', header: 'Hisoblar', hideMobile: true, cell: (e) => <span className="font-mono text-[11px] text-t3">{[...new Set(e.lines.map((l) => l.account))].slice(0, 4).join(' · ')}</span> },
          { key: 'amt', header: 'Summa', align: 'right', cell: (e) => mf(e.lines.reduce((a, l) => a + l.debit, 0)), sort: (e) => e.lines.reduce((a, l) => a + l.debit, 0) },
          { key: 'st', header: 'Holat', cell: (e) => <StatusBadge status={e.status} /> },
        ]} />
      <EntryDrawer e={view} onClose={() => setView(null)} onReverse={(id) => { dispatch('je.reverse', { id }, { success: 'Storno provodka yaratildi' }); setView(null); }} />
      {open && <NewEntry onClose={() => setOpen(false)} />}
    </Card>
  );
}

export function EntryDrawer({ e, onClose, onReverse }: { e: JournalEntry | null; onClose: () => void; onReverse?: (id: string) => void }) {
  const { db, mf } = useCtx(); const role = useApp((s) => s.role);
  const [conf, setConf] = useState(false);
  if (!e) return null;
  const d = e.lines.reduce((a, l) => a + l.debit, 0); const c = e.lines.reduce((a, l) => a + l.credit, 0);
  return (
    <Drawer open onClose={onClose} title={`Provodka ${e.no}`} subtitle={<span className="flex items-center gap-2">{fmtDate(e.date)} · {byId(db.companies, e.companyId)?.name} · {byId(db.branches, e.branchId)?.name} <StatusBadge status={e.status} /></span>}
      footer={e.source.type === 'manual' && e.status === 'posted' && onReverse && can(role, 'accounting', 'edit') ? <Button variant="danger" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConf(true)}>Storno qilish</Button> : undefined}>
      <p className="text-[13.5px] text-t1">{e.memo}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-t3"><Badge>{SRC[e.source.type]}</Badge>{e.source.no && <span className="font-mono">{e.source.no}</span>}<span>Yaratdi: {e.createdBy} · {e.createdAt.replace('T', ' ').slice(0, 16)}</span></div>
      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-[12.5px]"><thead className="bg-surface-2"><tr><th className="px-3 py-2 text-left font-semibold text-t3">Hisob</th><th className="px-3 py-2 text-right font-semibold text-t3">Debet</th><th className="px-3 py-2 text-right font-semibold text-t3">Kredit</th></tr></thead>
          <tbody>{e.lines.map((l, i) => <tr key={i} className="border-t border-line"><td className="px-3 py-2"><span className="font-mono text-t2">{l.account}</span> <span className="text-t1">{ACC[l.account]?.name}</span>{(l.costCenter || l.projectId || l.partyId) && <div className="mt-0.5 text-[11px] text-t3">{[l.costCenter, l.projectId && byId(db.projects, l.projectId)?.code, l.partyId && byId(db.parties, l.partyId)?.name, l.productId && byId(db.products, l.productId)?.sku].filter(Boolean).join(' · ')}</div>}</td><td className="num px-3 py-2 text-right">{l.debit ? mf(l.debit) : ''}</td><td className="num px-3 py-2 text-right">{l.credit ? mf(l.credit) : ''}</td></tr>)}</tbody>
          <tfoot className="border-t border-line-strong bg-surface-2 font-semibold"><tr><td className="px-3 py-2">Jami</td><td className="num px-3 py-2 text-right">{mf(d)}</td><td className="num px-3 py-2 text-right">{mf(c)}</td></tr></tfoot></table>
      </div>
      <p className={cx('mt-3 flex items-center gap-1.5 text-[12px]', d === c ? 'text-pos' : 'text-neg')}>{d === c ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{d === c ? 'Balanslangan: Debet = Kredit' : 'Balanslanmagan'}</p>
      {e.source.type !== 'manual' && <p className="mt-2 text-[11.5px] text-t3">Bu provodka manba hujjatdan avtomatik yaratilgan. Tuzatish uchun manba hujjatni (masalan, kredit-nota bilan) o‘zgartiring.</p>}
      <Confirm open={conf} onClose={() => setConf(false)} tone="danger" title="Provodkani storno qilish" confirmLabel="Storno" body={<>Teskari provodka bugungi sana ({fmtDate(TODAY)}) bilan yaratiladi. Asl provodka o‘chirilmaydi — audit izi saqlanadi.</>} onConfirm={() => onReverse?.(e.id)} />
    </Drawer>
  );
}

function NewEntry({ onClose }: { onClose: () => void }) {
  const { db, s, mf } = useCtx(); const { dispatch, filters } = useApp();
  const [date, setDate] = useState(TODAY); const [memo, setMemo] = useState(''); const [ref, setRef] = useState('');
  const [companyId, setCompany] = useState(filters.companyId === 'all' ? 'trd' : filters.companyId);
  const [cur, setCur] = useState<'UZS' | 'USD'>('UZS');
  const co = byId(db.companies, companyId)!;
  const [branchId, setBranch] = useState(co.branchIds[0]);
  const [lines, setLines] = useState<(JournalLine & { k: number })[]>([{ k: 1, account: '9426', debit: 0, credit: 0 }, { k: 2, account: '5110', debit: 0, credit: 0 }]);
  const rate = cur === 'USD' ? 12650 : 1;
  const conv = lines.map((l) => ({ ...l, debit: Math.round((l.debit || 0) * rate), credit: Math.round((l.credit || 0) * rate) }));
  const v = validateLines(conv);
  const touched = lines.some((l) => l.debit || l.credit);
  const set = (k: number, p: Partial<JournalLine>) => setLines((ls) => ls.map((l) => (l.k === k ? { ...l, ...p } : l)));
  const submit = (mode: 'post' | 'approval') => {
    if (!memo.trim()) { useApp.getState().toast({ kind: 'error', title: 'Izoh kiriting' }); return; }
    const data = { date, companyId, branchId, memo: memo + (cur === 'USD' ? ` (USD, kurs ${rate})` : ''), ref, lines: conv.map(({ k, ...l }) => (void k, l)) };
    const r = mode === 'post' ? dispatch('je.manual', data, { success: 'Provodka bosh kitobga yozildi' }) : dispatch('je.request', { data, total: v.debit }, { success: 'Provodka tasdiqlashga yuborildi' });
    if (r !== undefined) onClose();
  };
  return (
    <Modal open onClose={onClose} size="xl" title="Yangi jurnal provodkasi" subtitle="Debet va kredit teng bo‘lmaguncha saqlab bo‘lmaydi. Yopilgan davrga yozish taqiqlangan." icon={<BookOpen className="h-4 w-4" />}
      footer={<><span className={cx('mr-auto flex items-center gap-1.5 text-[12.5px]', v.ok ? 'text-pos' : 'text-t3')}>{v.ok ? <CheckCircle2 className="h-4 w-4" /> : <Scale className="h-4 w-4" />}Debet {mf(v.debit)} · Kredit {mf(v.credit)} · Farq <b className={cx('num', v.diff ? 'text-neg' : 'text-pos')}>{mf(v.diff)}</b></span>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button disabled={!v.ok} onClick={() => submit('approval')}>Tasdiqlashga yuborish</Button><Button variant="primary" disabled={!v.ok} onClick={() => submit('post')}>Provodka qilish</Button></>}>
      <div className="grid gap-3 sm:grid-cols-6">
        <Field label="Sana" className="sm:col-span-1"><Input type="date" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Hujjat №" className="sm:col-span-1"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="MO-001" /></Field>
        <Field label="Kompaniya" className="sm:col-span-2"><Select value={companyId} onChange={(e) => { setCompany(e.target.value); setBranch(byId(db.companies, e.target.value)!.branchIds[0]); }}>{db.companies.filter((c) => s.companyIds.includes(c.id) || filters.companyId === 'all').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Filial" className="sm:col-span-1"><Select value={branchId} onChange={(e) => setBranch(e.target.value)}>{co.branchIds.map((b) => <option key={b} value={b}>{byId(db.branches, b)?.name}</option>)}</Select></Field>
        <Field label="Valyuta" className="sm:col-span-1" hint={cur === 'USD' ? '1 USD = 12 650 so‘m (demo)' : undefined}><Select value={cur} onChange={(e) => setCur(e.target.value as 'UZS')}><option>UZS</option><option>USD</option></Select></Field>
        <Field label="Izoh" required className="sm:col-span-6"><Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Masalan: Oylik ofis xarajatlarini hisobga olish" /></Field>
      </div>
      <div className="thin-scroll mt-4 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead className="bg-surface-2"><tr>{['Hisob', 'Debet', 'Kredit', 'Xarajat markazi', 'Loyiha', 'Izoh', ''].map((h) => <th key={h} className="px-2 py-2 text-left font-semibold text-t3">{h}</th>)}</tr></thead>
          <tbody>{lines.map((l) => (
            <tr key={l.k} className="border-t border-line">
              <td className="w-[260px] px-2 py-1.5"><Select className="h-8 text-[12px]" value={l.account} onChange={(e) => set(l.k, { account: e.target.value })}>{['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => <optgroup key={t} label={{ asset: 'Aktivlar', liability: 'Majburiyatlar', equity: 'Kapital', revenue: 'Daromadlar', expense: 'Xarajatlar' }[t]}>{CHART.filter((a) => a.type === t).map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</optgroup>)}</Select></td>
              <td className="w-32 px-2"><Input className="h-8 text-right text-[12px]" type="number" min={0} value={l.debit || ''} onChange={(e) => set(l.k, { debit: +e.target.value, credit: +e.target.value ? 0 : l.credit })} /></td>
              <td className="w-32 px-2"><Input className="h-8 text-right text-[12px]" type="number" min={0} value={l.credit || ''} onChange={(e) => set(l.k, { credit: +e.target.value, debit: +e.target.value ? 0 : l.debit })} /></td>
              <td className="w-36 px-2"><Select className="h-8 text-[12px]" value={l.costCenter || ''} onChange={(e) => set(l.k, { costCenter: e.target.value || undefined })}><option value="">—</option>{['Ma’muriyat', 'Sotuv', 'Marketing', 'Ishlab chiqarish', 'Ombor', 'Loyihalar'].map((c) => <option key={c}>{c}</option>)}</Select></td>
              <td className="w-32 px-2"><Select className="h-8 text-[12px]" value={l.projectId || ''} onChange={(e) => set(l.k, { projectId: e.target.value || undefined })}><option value="">—</option>{db.projects.filter((p) => p.companyId === companyId).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</Select></td>
              <td className="px-2"><Input className="h-8 text-[12px]" value={l.memo || ''} onChange={(e) => set(l.k, { memo: e.target.value })} /></td>
              <td className="w-9 px-1"><button onClick={() => setLines((ls) => ls.filter((x) => x.k !== l.k))} disabled={lines.length <= 2} className="grid h-8 w-8 place-items-center rounded-lg text-t3 hover:bg-neg/10 hover:text-neg disabled:opacity-30" aria-label="O‘chirish"><Trash2 className="h-3.5 w-3.5" /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="xs" icon={<Plus className="h-3 w-3" />} onClick={() => setLines((ls) => [...ls, { k: Date.now(), account: '9426', debit: 0, credit: 0 }])}>Qator qo‘shish</Button>
        {v.diff !== 0 && touched && <Button size="xs" variant="soft" onClick={() => { const last = lines[lines.length - 1]; const need = -v.diff / rate; set(last.k, need > 0 ? { debit: +(last.debit + need).toFixed(2), credit: 0 } : { credit: +(last.credit - need).toFixed(2), debit: 0 }); }}>Oxirgi qatorda farqni yopish</Button>}
      </div>
      {touched && !v.ok && <div className="mt-3 rounded-xl border border-neg/25 bg-neg/[.06] p-3 text-[12px] text-neg">{v.errors.map((e) => <p key={e}>• {e}</p>)}</div>}
    </Modal>
  );
}

// ─── Chart of accounts ───────────────────────────────────────
function ChartOfAccounts() {
  const { db, s, to, mf } = useCtx(); const { role, dispatch } = useApp();
  const [open, setOpen] = useState(false); const [form, setForm] = useState<Account>({ code: '', name: '', type: 'expense', group: 'Boshqa operatsion xarajatlar' });
  const b = useMemo(() => balances(db.entries, s, undefined, to), [db, s, to]);
  const groups = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
  const L = { asset: 'Aktivlar', liability: 'Majburiyatlar', equity: 'Kapital', revenue: 'Daromadlar', expense: 'Xarajatlar' };
  return (
    <div className="space-y-4">
      <Card className="!p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-3xl text-[12.5px] leading-relaxed text-t2"><b className="text-t1">Hisoblar rejasi</b> O‘zbekiston BHMS 21-son standarti raqamlash tamoyiliga o‘xshash tuzilgan (demo). Tizim hisoblari (🔒) avtomatik provodka qoidalarida ishlatiladi. Haqiqiy joriy etishda malakali buxgalter tomonidan sozlanishi va tekshirilishi shart.</p>
        <div className="flex gap-2">{can(role, 'accounting', 'manage') && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Hisob qo‘shish</Button>}<ExportButton module="accounting" name="hisoblar-rejasi" title="Hisoblar rejasi" cols={[{ key: 'code', label: 'Kod' }, { key: 'name', label: 'Nomi' }, { key: 'type', label: 'Turi' }, { key: 'group', label: 'Guruh' }, { key: 'bal', label: 'Qoldiq', type: 'money' }]} rows={() => CHART.map((a) => ({ code: a.code, name: a.name, type: L[a.type], group: a.group, bal: (b[a.code] || 0) * normalSign(a.code) }))} /></div></div></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map((g) => { const accs = CHART.filter((a) => a.type === g); const tot = accs.reduce((a, x) => a + (b[x.code] || 0) * (g === 'asset' || g === 'expense' ? 1 : -1), 0); return (
          <Card key={g} pad={false}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3"><h3 className="text-[13.5px] font-semibold text-t1">{L[g]}</h3><span className="num text-[13px] font-semibold text-t1">{mf(tot)}</span></div>
            <div className="thin-scroll max-h-[420px] divide-y divide-line overflow-y-auto">{accs.map((a) => { const v = (b[a.code] || 0) * normalSign(a.code); return (
              <div key={a.code} className="flex items-center gap-3 px-4 py-2 text-[12.8px] hover:bg-surface-2"><span className="w-11 font-mono text-t3">{a.code}</span><span className="min-w-0 flex-1 truncate text-t1">{a.name}{a.contra && <Badge className="ml-1.5">kontr</Badge>}{a.custom && <Badge tone="accent" className="ml-1.5">yangi</Badge>}</span><span className="hidden text-[11px] text-t3 sm:block">{a.system ? '🔒' : ''}</span><span className={cx('num w-32 text-right', v < 0 ? 'text-neg' : 'text-t1')}>{v ? mf(v) : '—'}</span></div>
            ); })}</div>
          </Card>
        ); })}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Yangi hisob" size="sm" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('account.create', form, { success: `Hisob ${form.code} qo‘shildi` }) !== undefined) setOpen(false); }}>Saqlash</Button></>}>
        <div className="space-y-3">
          <Field label="Kod (4 raqam)" required><Input value={form.code} maxLength={4} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '') })} placeholder="9429" /></Field>
          <Field label="Nomi" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Xizmat safari xarajatlari" /></Field>
          <Field label="Turi"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Account['type'] })}>{groups.map((g) => <option key={g} value={g}>{L[g]}</option>)}</Select></Field>
          <Field label="Guruh"><Input value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

// ─── General ledger ──────────────────────────────────────────
function Ledger() {
  const { db, s, from, to, mf } = useCtx(); const nav = useApp((x) => x.nav);
  const [acc, setAcc] = useState(nav.params?.account || '5110'); const [view, setView] = useState<JournalEntry | null>(null);
  const gl = useMemo(() => generalLedger(db.entries, s, acc, from, to), [db, s, acc, from, to]);
  return (
    <Card>
      <CardHeader title={`Bosh kitob: ${acc} — ${ACC[acc]?.name}`} subtitle={`${fmtDate(from)}–${fmtDate(to)} · ${gl.rows.length} ta yozuv`} icon={<Landmark className="h-4 w-4" />}
        actions={<><Select className="h-8.5 w-64 text-[12.5px]" value={acc} onChange={(e) => setAcc(e.target.value)}>{CHART.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</Select>
          <ExportButton module="accounting" name={`bosh-kitob-${acc}`} title={`Bosh kitob ${acc} ${ACC[acc]?.name}`} cols={[{ key: 'date', label: 'Sana' }, { key: 'no', label: '№' }, { key: 'memo', label: 'Izoh' }, { key: 'd', label: 'Debet', type: 'money' }, { key: 'c', label: 'Kredit', type: 'money' }, { key: 'b', label: 'Qoldiq', type: 'money' }]} rows={() => gl.rows.map((r) => ({ date: fmtDate(r.date), no: r.no, memo: r.memo, d: r.debit, c: r.credit, b: r.balance }))} /></>} />
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Boshlang‘ich qoldiq', gl.opening], ['Debet aylanma', gl.rows.reduce((a, r) => a + r.debit, 0)], ['Kredit aylanma', gl.rows.reduce((a, r) => a + r.credit, 0)], ['Yakuniy qoldiq', gl.closing]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-3"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[15px] font-semibold text-t1">{mf(v as number)}</p></div>)}
      </div>
      <DataTable rows={[...gl.rows].reverse()} rowKey={(r) => r.entryId + r.account + r.debit + r.credit + r.memo} onRow={(r) => setView(byId(db.entries, r.entryId) || null)} search={(r) => `${r.no} ${r.memo}`} pageSize={15} dense
        cols={[{ key: 'd', header: 'Sana', cell: (r) => fmtDate(r.date) }, { key: 'no', header: '№', cell: (r) => <span className="font-mono text-[11.5px] text-t2">{r.no}</span> }, { key: 'm', header: 'Izoh', primary: true, cell: (r) => <span className="line-clamp-1">{r.memo}</span> }, { key: 'dr', header: 'Debet', align: 'right', cell: (r) => (r.debit ? mf(r.debit) : '') }, { key: 'cr', header: 'Kredit', align: 'right', cell: (r) => (r.credit ? mf(r.credit) : '') }, { key: 'b', header: 'Qoldiq', align: 'right', cell: (r) => <b className="font-semibold">{mf(r.balance)}</b> }]} />
      <EntryDrawer e={view} onClose={() => setView(null)} />
    </Card>
  );
}

// ─── Trial balance ───────────────────────────────────────────
function TrialBalance() {
  const { db, s, from, to, mf } = useCtx();
  const tb = useMemo(() => trialBalance(db.entries, s, from, to), [db, s, from, to]);
  const go = useApp((x) => x.go);
  return (
    <Card>
      <CardHeader title={<span className="flex items-center">Aylanma-saldo vedomosti<Explain term="Aylanma-saldo">har bir hisobning davr boshidagi qoldig‘i, davr ichidagi debet/kredit aylanmasi va davr oxiridagi qoldig‘i. Jami debet har doim jami kreditga teng bo‘lishi kerak.</Explain></span>} subtitle={`${fmtDate(from)}–${fmtDate(to)}`} icon={<Scale className="h-4 w-4" />}
        actions={<><Badge tone={tb.balanced ? 'pos' : 'neg'} dot>{tb.balanced ? 'Balanslangan' : 'Farq bor'}</Badge><ExportButton module="accounting" name="aylanma-saldo" title="Aylanma-saldo vedomosti" cols={[{ key: 'code', label: 'Hisob' }, { key: 'name', label: 'Nomi' }, { key: 'openDr', label: 'Boshl. Dt', type: 'money' }, { key: 'openCr', label: 'Boshl. Kt', type: 'money' }, { key: 'turnDr', label: 'Aylanma Dt', type: 'money' }, { key: 'turnCr', label: 'Aylanma Kt', type: 'money' }, { key: 'closeDr', label: 'Yakun Dt', type: 'money' }, { key: 'closeCr', label: 'Yakun Kt', type: 'money' }]} rows={() => tb.rows as never} /></>} />
      <div className="thin-scroll overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[900px] text-[12.5px]">
          <thead className="bg-surface-2 text-t3"><tr><th rowSpan={2} className="px-3 py-2 text-left font-semibold">Hisob</th><th colSpan={2} className="border-l border-line px-3 py-1.5 font-semibold">Boshlang‘ich qoldiq</th><th colSpan={2} className="border-l border-line px-3 py-1.5 font-semibold">Aylanma</th><th colSpan={2} className="border-l border-line px-3 py-1.5 font-semibold">Yakuniy qoldiq</th></tr>
            <tr>{['Dt', 'Kt', 'Dt', 'Kt', 'Dt', 'Kt'].map((x, i) => <th key={i} className={cx('px-3 py-1.5 text-right font-semibold', i % 2 === 0 && 'border-l border-line')}>{x}</th>)}</tr></thead>
          <tbody>{tb.rows.map((r) => <tr key={r.code} onClick={() => go('accounting', 'ledger', { account: r.code })} className="cursor-pointer border-t border-line hover:bg-surface-2"><td className="px-3 py-1.5"><span className="font-mono text-t3">{r.code}</span> <span className="text-t1">{r.name}</span></td>{[r.openDr, r.openCr, r.turnDr, r.turnCr, r.closeDr, r.closeCr].map((v, i) => <td key={i} className={cx('num px-3 py-1.5 text-right text-t1', i % 2 === 0 && 'border-l border-line')}>{v ? mf(v) : ''}</td>)}</tr>)}</tbody>
          <tfoot className="border-t-2 border-line-strong bg-surface-2 font-semibold"><tr><td className="px-3 py-2">Jami</td>{[tb.totals.openDr, tb.totals.openCr, tb.totals.turnDr, tb.totals.turnCr, tb.totals.closeDr, tb.totals.closeCr].map((v, i) => <td key={i} className={cx('num px-3 py-2 text-right', i % 2 === 0 && 'border-l border-line')}>{mf(v)}</td>)}</tr></tfoot>
        </table>
      </div>
    </Card>
  );
}

// ─── Period close ────────────────────────────────────────────
function PeriodClose() {
  const { db, s, mf } = useCtx(); const { role, dispatch } = useApp();
  const [conf, setConf] = useState<{ co: string; p: string; action: 'close' | 'reopen' } | null>(null);
  const periods = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const checks = (co: string, p: string) => {
    const end = p === monthKey(TODAY) ? TODAY : addDays(p + '-01', 40).slice(0, 7) + '-01';
    const dep = db.assets.filter((a) => a.companyId === co && a.status === 'active').every((a) => a.depreciatedMonths.includes(p) || a.purchaseDate.slice(0, 7) >= p);
    const pay = db.payrollRuns.some((r) => r.companyId === co && r.period === p && r.status !== 'draft');
    const bank = db.bankLines.filter((b) => b.companyId === co && b.date.startsWith(p)).every((b) => b.status === 'matched');
    const tb = trialBalance(db.entries, { companyIds: [co] }, p + '-01', end).balanced;
    const unbilled = db.salesOrders.filter((o) => o.companyId === co && o.status === 'delivered' && o.date.startsWith(p)).length === 0;
    return [{ l: 'Amortizatsiya hisoblangan', ok: dep }, { l: 'Ish haqi hisoblangan', ok: pay }, { l: 'Bank ko‘chirmasi moslashtirilgan', ok: bank }, { l: 'Yetkazilgan buyurtmalarga hisob chiqarilgan', ok: unbilled }, { l: 'Aylanma-saldo balanslangan', ok: tb }];
  };
  return (
    <div className="space-y-4">
      <Card className="!p-4"><p className="text-[12.5px] leading-relaxed text-t2"><Lock className="mr-1.5 inline h-3.5 w-3.5 text-t3" />Yopilgan davrga hech qanday modul (sotuv, xarid, ish haqi, qo‘lda provodka) yozuv kirita olmaydi — ledger darajasida bloklanadi. Davrlar ketma-ket yopiladi va teskari tartibda ochiladi. Har bir amal audit jurnaliga yoziladi.</p></Card>
      {db.companies.filter((c) => s.companyIds.includes(c.id)).map((co) => (
        <Card key={co.id}>
          <CardHeader title={co.name} subtitle="2026 moliyaviy yil davrlari" icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: co.color }} />} />
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-9">
            {periods.map((p) => { const st = db.periods.find((x) => x.companyId === co.id && x.period === p); const closed = st?.status === 'closed'; const ck = closed ? [] : checks(co.id, p); const ready = ck.every((c) => c.ok); return (
              <div key={p} className={cx('rounded-xl border p-3', closed ? 'border-pos/25 bg-pos/[.05]' : 'border-line bg-surface-2')}>
                <div className="flex items-center justify-between"><span className="text-[12.5px] font-semibold text-t1">{monthLabel(p, true)}</span>{closed ? <Lock className="h-3.5 w-3.5 text-pos" /> : <Unlock className="h-3.5 w-3.5 text-warn" />}</div>
                <p className={cx('mt-0.5 text-[11px]', closed ? 'text-pos' : 'text-warn')}>{closed ? `Yopilgan ${st?.closedAt ? fmtDate(st.closedAt) : ''}` : 'Ochiq'}</p>
                {!closed && <ul className="mt-1.5 space-y-0.5">{ck.map((c) => <li key={c.l} className={cx('flex items-start gap-1 text-[10.5px] leading-tight', c.ok ? 'text-t3' : 'text-warn')}>{c.ok ? '✓' : '!'} {c.l}</li>)}</ul>}
                {can(role, 'accounting', 'manage') && (closed ? <Button size="xs" variant="ghost" className="mt-2 w-full" onClick={() => setConf({ co: co.id, p, action: 'reopen' })}>Ochish</Button> : <Button size="xs" variant={ready ? 'primary' : 'secondary'} className="mt-2 w-full" onClick={() => setConf({ co: co.id, p, action: 'close' })}>Yopish</Button>)}
              </div>
            ); })}
          </div>
          <p className="mt-3 text-[11.5px] text-t3">Joriy yil natijasi: {mf(-Object.entries(balances(db.entries, { companyIds: [co.id] }, '2026-01-01', TODAY)).filter(([k]) => ACC[k] && (ACC[k].type === 'revenue' || ACC[k].type === 'expense')).reduce((a, [, v]) => a + v, 0))}</p>
        </Card>
      ))}
      <Confirm open={!!conf} onClose={() => setConf(null)} tone={conf?.action === 'reopen' ? 'danger' : 'primary'} title={conf?.action === 'close' ? `${conf && monthLabel(conf.p)} davrini yopish` : `${conf && monthLabel(conf.p)} davrini qayta ochish`} confirmLabel={conf?.action === 'close' ? 'Yopish' : 'Qayta ochish'}
        body={conf?.action === 'close' ? 'Yopilgandan so‘ng bu davrga hech qanday provodka kiritib bo‘lmaydi. Ogohlantirishlar bo‘lsa ham davom etasizmi?' : 'Davrni qayta ochish hisobotlarga ta’sir qilishi mumkin. Bu amal audit jurnaliga yoziladi.'}
        onConfirm={() => conf && dispatch(conf.action === 'close' ? 'period.close' : 'period.reopen', { companyId: conf.co, period: conf.p }, { success: conf.action === 'close' ? 'Davr yopildi' : 'Davr qayta ochildi' })} />
    </div>
  );
}
