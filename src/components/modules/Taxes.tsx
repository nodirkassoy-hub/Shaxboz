'use client';
import { useMemo, useState } from 'react';
import { Receipt, CalendarDays, Settings2, FileText, AlertTriangle, CheckCircle2, Wallet, ShieldAlert, Info } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { byId } from '@/lib/db';
import { vatPosition } from '@/lib/ops';
import { fmtDate, TODAY, diffDays, monthLabel, monthsBetween } from '@/lib/core/dates';
import { accountBalance } from '@/lib/core/ledger';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, StatusBadge, cx, DemoTag, Stat, Confirm } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { can } from '@/lib/rbac';
import type { TaxType } from '@/lib/types';

type Tab = 'obligations' | 'vat' | 'calendar' | 'settings' | 'company';

export default function Taxes() {
  const [tab, setTab] = useState<Tab>('obligations');
  return (
    <div>
      <PageHeader title="Soliq markazi" crumbs={['Moliya', 'Soliqlar']} subtitle={<span className="flex items-center gap-2">Majburiyatlar, davrlar, to‘lovlar, hujjatlar va muddatlar · sozlanadigan soliq turlari <DemoTag /></span>} />
      <Card className="mb-4 !border-warn/30 !bg-warn/[.05] !p-3.5"><p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-t2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" /><span><b className="text-t1">Muhim:</b> soliq stavkalari va qoidalari tizimda <b>sozlanadigan parametrlar</b> sifatida saqlanadi (demo qiymatlar). BALANS AI O‘zbekiston soliq qonunchiligiga muvofiqligi tekshirilgan yoki sertifikatlangan tizim emas. Soliq qo‘mitasi va e-hisob-faktura operatorlari bilan integratsiya ulanmagan. Hisobot topshirishdan oldin malakali buxgalter/soliq maslahatchisi bilan tekshiring.</span></p></Card>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'obligations', label: 'Majburiyatlar', icon: <Receipt className="h-3.5 w-3.5" /> }, { id: 'vat', label: 'QQS hisob-kitobi' }, { id: 'calendar', label: 'Soliq kalendari', icon: <CalendarDays className="h-3.5 w-3.5" /> }, { id: 'settings', label: 'Soliq turlari', icon: <Settings2 className="h-3.5 w-3.5" /> }, { id: 'company', label: 'Rekvizitlar (STIR, MFO)', icon: <FileText className="h-3.5 w-3.5" /> }]} />
      {tab === 'obligations' && <Obligations />}{tab === 'vat' && <Vat />}{tab === 'calendar' && <Calendar />}{tab === 'settings' && <Settings />}{tab === 'company' && <Company />}
    </div>
  );
}

function Obligations() {
  const { db, s, m, mf } = useCtx(); const { dispatch, role } = useApp();
  const [f, setF] = useState<'open' | 'paid' | 'all'>('open'); const [pay, setPay] = useState<string | null>(null);
  const rows = db.taxObligations.filter((o) => s.companyIds.includes(o.companyId) && (f === 'all' || (f === 'open' ? o.status !== 'paid' : o.status === 'paid'))).sort((a, b) => (f === 'paid' ? (a.dueDate < b.dueDate ? 1 : -1) : a.dueDate < b.dueDate ? -1 : 1));
  const open = db.taxObligations.filter((o) => s.companyIds.includes(o.companyId) && o.status !== 'paid');
  const next = open.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
  const paidYtd = db.taxObligations.filter((o) => s.companyIds.includes(o.companyId) && o.status === 'paid').reduce((a, o) => a + o.amount, 0);
  const po = byId(db.taxObligations, pay || undefined);
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Ochiq majburiyatlar" value={m(open.reduce((a, o) => a + o.amount, 0))} sub={`${open.length} ta`} /><Stat label="Eng yaqin muddat" value={next ? fmtDate(next.dueDate) : '—'} sub={next ? `${byId(db.taxTypes, next.taxId)?.name.split(' (')[0]} · ${diffDays(next.dueDate, TODAY)} kun` : ''} tone={next && diffDays(next.dueDate, TODAY) <= 10 ? 'warn' : undefined} /><Stat label="E’tibor talab qiladi" value={String(db.taxObligations.filter((o) => s.companyIds.includes(o.companyId) && o.docStatus === 'attention').length)} tone="warn" sub="hujjatlar" /><Stat label="To‘langan (2026)" value={m(paidYtd)} /></div>
      {open.filter((o) => diffDays(o.dueDate, TODAY) <= 10).length > 0 && <Card className="!p-3.5"><p className="flex items-center gap-2 text-[13px] text-warn"><AlertTriangle className="h-4 w-4" /><b>Soliq muddati yaqinlashmoqda:</b> {open.filter((o) => diffDays(o.dueDate, TODAY) <= 10).map((o) => `${byId(db.taxTypes, o.taxId)?.name.split(' (')[0]} (${byId(db.companies, o.companyId)?.short}) — ${fmtDate(o.dueDate)}`).join('; ')}</p></Card>}
      <Card>
        <CardHeader title="Soliq majburiyatlari" subtitle="Buxgalteriya provodkalaridan avtomatik hisoblanadi" icon={<Receipt className="h-4 w-4" />} actions={<>
          <div className="flex rounded-[11px] border border-line bg-surface-2 p-[2px]">{(['open', 'paid', 'all'] as const).map((x) => <button key={x} onClick={() => setF(x)} className={cx('h-7 rounded-[9px] px-2.5 text-[12px] font-medium', f === x ? 'bg-surface-solid text-t1 shadow-card' : 'text-t3')}>{{ open: 'Ochiq', paid: 'To‘langan', all: 'Barchasi' }[x]}</button>)}</div>
          <ExportButton module="taxes" name="soliq-majburiyatlari" title="Soliq majburiyatlari" cols={[{ key: 't', label: 'Soliq' }, { key: 'c', label: 'Kompaniya' }, { key: 'p', label: 'Davr' }, { key: 'a', label: 'Summa', type: 'money' }, { key: 'd', label: 'Muddat' }, { key: 's', label: 'Holat' }]} rows={() => rows.map((o) => ({ t: byId(db.taxTypes, o.taxId)?.name, c: byId(db.companies, o.companyId)?.name, p: o.period, a: o.amount, d: fmtDate(o.dueDate), s: o.status }))} /></>} />
        <DataTable rows={rows} rowKey={(o) => o.id} pageSize={12}
          cols={[{ key: 't', header: 'Soliq turi', primary: true, cell: (o) => <span>{byId(db.taxTypes, o.taxId)?.name}{o.estimate && <Badge tone="info" className="ml-1.5">taxminiy</Badge>}</span> }, { key: 'c', header: 'Kompaniya', cell: (o) => byId(db.companies, o.companyId)?.short }, { key: 'p', header: 'Davr', cell: (o) => o.period }, { key: 'a', header: 'Summa', align: 'right', cell: (o) => mf(o.amount), sort: (o) => o.amount }, { key: 'd', header: 'Muddat', cell: (o) => { const d = diffDays(o.dueDate, TODAY); return <span className={cx(o.status !== 'paid' && d <= 7 && 'text-neg', o.status !== 'paid' && d > 7 && d <= 14 && 'text-warn')}>{fmtDate(o.dueDate)}{o.status !== 'paid' && <span className="ml-1 text-[11px]">({d >= 0 ? `${d} k` : `${-d} k kechikdi`})</span>}</span>; }, sort: (o) => o.dueDate }, { key: 'doc', header: 'Hujjat', cell: (o) => o.docStatus === 'attention' ? <Badge tone="warn"><AlertTriangle className="h-3 w-3" />e’tibor</Badge> : o.docStatus === 'missing' ? <Badge tone="neg">yo‘q</Badge> : <Badge tone="pos">tayyor</Badge> }, { key: 's', header: 'Holat', cell: (o) => <StatusBadge status={o.status} /> },
            { key: 'a2', header: '', cell: (o) => can(role, 'taxes', 'create') && o.status !== 'paid' ? <span className="flex gap-1">{o.docStatus === 'attention' && <Button size="xs" onClick={() => dispatch('tax.file', { id: o.id }, { success: 'Hujjat tekshirilgan / topshirilgan deb belgilandi' })}>Tekshirildi</Button>}{!o.estimate && <Button size="xs" variant="primary" onClick={() => setPay(o.id)}>To‘lash</Button>}</span> : o.paidDate ? <span className="text-[11px] text-t3">{fmtDate(o.paidDate)}</span> : null }]} />
      </Card>
      <Confirm open={!!po} onClose={() => setPay(null)} title="Soliq to‘lovi" confirmLabel="To‘lash" body={po && <>{byId(db.taxTypes, po.taxId)?.name} · {po.period} · <b>{mf(po.amount)}</b><br />Provodka: Dt {byId(db.taxTypes, po.taxId)?.account} / Kt 5110 Bank. Bank qoldig‘i: {mf(accountBalance(db.entries, po.companyId, '5110'))}.<br /><span className="text-[12px] text-t3">Bank API ulanmagan — to‘lov topshirig‘i bankka yuborilmaydi, faqat buxgalteriyada qayd etiladi.</span></>} onConfirm={() => po && dispatch('tax.pay', { id: po.id }, { success: 'Soliq to‘lovi qayd etildi' })} />
    </div>
  );
}

function Vat() {
  const { db, s, mf } = useCtx();
  const months = monthsBetween('2026-01-01', TODAY);
  const rows = db.companies.filter((c) => s.companyIds.includes(c.id)).flatMap((c) => months.map((mk) => ({ c, mk, ...vatPosition(db, c.id, mk) }))).reverse();
  return (
    <Card>
      <CardHeader title="QQS hisob-kitobi" subtitle="Chiqish QQS (sotuv) − hisobga olinadigan QQS (xarid) = to‘lanadigan. Ortiqcha kiritish QQS keyingi oyga o‘tadi." icon={<Info className="h-4 w-4" />} actions={<ExportButton module="taxes" name="qqs" title="QQS hisob-kitobi" cols={[{ key: 'c', label: 'Kompaniya' }, { key: 'm', label: 'Oy' }, { key: 'o', label: 'Chiqish QQS', type: 'money' }, { key: 'i', label: 'Kiritish QQS', type: 'money' }, { key: 'p', label: 'To‘lanadigan', type: 'money' }]} rows={() => rows.map((r) => ({ c: r.c.short, m: monthLabel(r.mk), o: r.output, i: r.input, p: r.payable }))} />} />
      <DataTable rows={rows} rowKey={(r) => r.c.id + r.mk} pageSize={12} dense cols={[{ key: 'm', header: 'Oy', primary: true, cell: (r) => monthLabel(r.mk) }, { key: 'c', header: 'Kompaniya', cell: (r) => r.c.short }, { key: 'o', header: 'Chiqish QQS (6411)', align: 'right', cell: (r) => mf(r.output) }, { key: 'i', header: 'Kiritish QQS (4410)', align: 'right', cell: (r) => mf(r.input) }, { key: 'off', header: 'Hisobga olingan', align: 'right', cell: (r) => mf(r.offset) }, { key: 'p', header: 'To‘lanadigan', align: 'right', cell: (r) => <b>{mf(r.payable)}</b> }, { key: 'cr', header: 'Keyingi oyga', align: 'right', cell: (r) => (r.carry > 0 ? mf(r.carry) : '—') }]} />
    </Card>
  );
}

function Calendar() {
  const { db, s, m } = useCtx();
  const items = db.taxObligations.filter((o) => s.companyIds.includes(o.companyId) && o.dueDate >= '2026-09-01').sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const groups = [...new Set(items.map((o) => o.dueDate))];
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((d) => { const its = items.filter((o) => o.dueDate === d); const days = diffDays(d, TODAY); return (
        <Card key={d} className="!p-4">
          <div className="flex items-center gap-3"><div className={cx('grid h-12 w-12 place-items-center rounded-2xl text-center leading-none', its.every((o) => o.status === 'paid') ? 'bg-pos/12 text-pos' : days <= 7 ? 'bg-neg/12 text-neg' : days <= 14 ? 'bg-warn/12 text-warn' : 'bg-surface-3 text-t1')}><div><div className="num text-[17px] font-bold">{+d.slice(8)}</div><div className="text-[9.5px] uppercase">{monthLabel(d.slice(0, 7), true)}</div></div></div><div><p className="text-[13px] font-semibold text-t1">{its.every((o) => o.status === 'paid') ? 'To‘langan' : days >= 0 ? `${days} kun qoldi` : `${-days} kun kechikdi`}</p><p className="num text-[12px] text-t3">{m(its.reduce((a, o) => a + o.amount, 0))}</p></div></div>
          <div className="mt-3 space-y-1">{its.map((o) => <div key={o.id} className="flex items-center justify-between gap-2 text-[12px]"><span className="truncate">{byId(db.taxTypes, o.taxId)?.name.split(' (')[0]} · {byId(db.companies, o.companyId)?.short} · {o.period}</span><StatusBadge status={o.status} /></div>)}</div>
        </Card>
      ); })}
    </div>
  );
}

function Settings() {
  const { db } = useCtx(); const { dispatch, role } = useApp();
  const [edit, setEdit] = useState<TaxType | null>(null);
  return (
    <Card>
      <CardHeader title="Soliq turlari (sozlanadi)" subtitle="Stavkalar, muddat va hisoblar — kod ichida qattiq yozilmagan" icon={<Settings2 className="h-4 w-4" />} />
      <DataTable rows={db.taxTypes} rowKey={(t) => t.id} cols={[{ key: 'n', header: 'Soliq', primary: true, cell: (t) => <div><p className="font-medium">{t.name}</p><p className="text-[11px] text-t3">{t.note}</p></div> }, { key: 'c', header: 'Kod', cell: (t) => <span className="font-mono text-[12px]">{t.code}</span> }, { key: 'r', header: 'Stavka', align: 'right', cell: (t) => `${t.rate}%` }, { key: 'b', header: 'Baza', cell: (t) => <span className="text-[12px] text-t2">{t.base}</span> }, { key: 'p', header: 'Davriylik', cell: (t) => ({ monthly: 'Oylik', quarterly: 'Choraklik', annual: 'Yillik' }[t.periodicity]) }, { key: 'd', header: 'Muddat', cell: (t) => `keyingi oyning ${t.dueDay}-sanasi` }, { key: 'a', header: 'Hisob', cell: (t) => <span className="font-mono text-[12px]">{t.account}</span> }, { key: 'e', header: 'Holat', cell: (t) => <Badge tone={t.enabled ? 'pos' : 'neutral'}>{t.enabled ? 'Yoqilgan' : 'O‘chirilgan'}</Badge> }, { key: 'x', header: '', cell: (t) => can(role, 'taxes', 'manage') ? <Button size="xs" onClick={() => setEdit({ ...t })}>Sozlash</Button> : null }]} />
      <p className="mt-3 text-[11.5px] text-t3">Stavka o‘zgarishi kelajakdagi hisob-kitoblarga ta’sir qiladi (masalan, keyingi ish haqi hisob-kitobida JShDS/ijtimoiy soliq). O‘tgan provodkalar o‘zgarmaydi. Har bir o‘zgarish audit jurnaliga yoziladi.</p>
      {edit && <Modal open onClose={() => setEdit(null)} size="sm" title={edit.name} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('tax.type', { id: edit.id, rate: edit.rate, dueDay: edit.dueDay, enabled: edit.enabled }, { success: 'Soliq sozlamasi saqlandi' }) !== undefined) setEdit(null); }}>Saqlash</Button></>}>
        <div className="space-y-3"><Field label="Stavka, %"><Input type="number" step="0.1" value={edit.rate} onChange={(e) => setEdit({ ...edit, rate: +e.target.value })} /></Field><Field label="To‘lov muddati (keyingi oyning kuni)"><Input type="number" min={1} max={28} value={edit.dueDay} onChange={(e) => setEdit({ ...edit, dueDay: +e.target.value })} /></Field><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} className="accent-[var(--accent)]" />Yoqilgan</label></div>
      </Modal>}
    </Card>
  );
}

function Company() {
  const { db, s } = useCtx(); const { dispatch, role } = useApp();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {db.companies.filter((c) => s.companyIds.includes(c.id)).map((c) => <CoCard key={c.id} id={c.id} edit={can(role, 'settings', 'edit')} onSave={(x) => dispatch('company.update', { id: c.id, ...x }, { success: 'Rekvizitlar saqlandi' })} />)}
    </div>
  );
}

function CoCard({ id, edit, onSave }: { id: string; edit: boolean; onSave: (x: Record<string, unknown>) => void }) {
  const { db } = useCtx(); const c = byId(db.companies, id)!;
  const [f, setF] = useState({ legalName: c.legalName, stir: c.stir, mfo: c.mfo, bankAccount: c.bankAccount, director: c.director, address: c.address });
  const stirOk = /^\d{3}\s?\d{3}\s?\d{3}$/.test(f.stir); const mfoOk = /^\d{5}$/.test(f.mfo); const accOk = f.bankAccount.replace(/\s/g, '').length === 20;
  return (
    <Card><CardHeader title={c.name} subtitle={c.vatPayer ? 'QQS to‘lovchi' : 'QQS to‘lovchi emas'} icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />} />
      <div className="space-y-2.5">
        <Field label="Yuridik nomi"><Input disabled={!edit} value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} /></Field>
        <Field label="STIR (INN)" error={!stirOk ? '9 xonali raqam' : undefined}><Input disabled={!edit} value={f.stir} onChange={(e) => setF({ ...f, stir: e.target.value })} /></Field>
        <div className="grid grid-cols-[100px_1fr] gap-2"><Field label="MFO" error={!mfoOk ? '5 raqam' : undefined}><Input disabled={!edit} value={f.mfo} maxLength={5} onChange={(e) => setF({ ...f, mfo: e.target.value })} /></Field><Field label="Hisob raqami (20)" error={!accOk ? '20 raqam' : undefined}><Input disabled={!edit} value={f.bankAccount} onChange={(e) => setF({ ...f, bankAccount: e.target.value })} /></Field></div>
        <Field label="Direktor"><Input disabled={!edit} value={f.director} onChange={(e) => setF({ ...f, director: e.target.value })} /></Field>
        <Field label="Yuridik manzil"><Input disabled={!edit} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        <p className="text-[11px] text-t3">Tannarx usuli: <b>{c.costing === 'FIFO' ? 'FIFO' : 'O‘rtacha tortilgan'}</b> · filiallar: {c.branchIds.map((b) => byId(db.branches, b)?.name).join(', ')}</p>
        {edit && <Button variant="primary" size="sm" disabled={!stirOk || !mfoOk || !accOk} onClick={() => onSave(f)}>Saqlash</Button>}
      </div>
    </Card>
  );
}
