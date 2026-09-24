'use client';
import { useState } from 'react';
import { Plus, FileText, Upload, Send, Check, X, PenLine, Archive, History, FileSignature, Paperclip } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { byId } from '@/lib/db';
import { fmtDate, TODAY } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { can } from '@/lib/rbac';
import type { DocRecord } from '@/lib/types';

const KL: Record<DocRecord['kind'], string> = { invoice: 'Hisob-faktura', contract: 'Shartnoma', act: 'Dalolatnoma (akt)', waybill: 'Yuk xati', purchase_order: 'Xarid buyurtmasi', sales_order: 'Savdo buyurtmasi', payment: 'To‘lov hujjati', reconciliation: 'Solishtirma dalolatnoma' };

export default function Documents() {
  const { db, s, m } = useCtx(); const { dispatch, role } = useApp();
  const [kind, setKind] = useState('all'); const [st, setSt] = useState('all'); const [view, setView] = useState<string | null>(null); const [create, setCreate] = useState(false);
  const rows = db.documents.filter((d) => s.companyIds.includes(d.companyId) && (kind === 'all' || d.kind === kind) && (st === 'all' || d.status === st)).slice().reverse();
  const all = db.documents.filter((d) => s.companyIds.includes(d.companyId));
  return (
    <div>
      <PageHeader title="Hujjatlar" crumbs={['Hujjat aylanishi']} subtitle={<span className="flex items-center gap-2">Shartnomalar, hisob-fakturalar, dalolatnomalar, yuk xatlari va solishtirma dalolatnomalar · tasdiqlash oqimi <DemoTag /></span>} actions={can(role, 'documents', 'create') ? <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Hujjat</Button> : undefined} />
      <Card className="mb-4 !p-3"><p className="flex items-center gap-2 text-[12px] text-t2"><FileSignature className="h-4 w-4 text-t3" />Elektron raqamli imzo (ERI) va e-hujjat operatorlari (Didox, Faktura.uz) <b className="text-t1">ulanmagan</b>. “Imzolash” — tizim ichidagi holat va audit yozuvi; yuridik kuchga ega ERI imzosi emas.</p></Card>
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{(['draft', 'pending', 'approved', 'signed', 'archived'] as const).map((x) => <Stat key={x} label={{ draft: 'Qoralama', pending: 'Tasdiq kutilmoqda', approved: 'Tasdiqlangan', signed: 'Imzolangan', archived: 'Arxiv' }[x]} value={String(all.filter((d) => d.status === x).length)} onClick={() => setSt(x)} tone={x === 'pending' ? 'warn' : undefined} />)}</div>
      <Card>
        <CardHeader title="Hujjatlar reestri" subtitle={`${rows.length} ta`} icon={<FileText className="h-4 w-4" />} actions={<ExportButton module="documents" name="hujjatlar" title="Hujjatlar reestri" cols={[{ key: 'no', label: '№' }, { key: 'k', label: 'Turi' }, { key: 't', label: 'Nomi' }, { key: 'd', label: 'Sana' }, { key: 'p', label: 'Kontragent' }, { key: 'a', label: 'Summa', type: 'money' }, { key: 's', label: 'Holat' }]} rows={() => rows.map((d) => ({ no: d.no, k: KL[d.kind], t: d.title, d: fmtDate(d.date), p: byId(db.parties, d.partyId)?.name, a: d.amount ?? '', s: d.status }))} />} />
        <DataTable rows={rows} rowKey={(d) => d.id} onRow={(d) => setView(d.id)} search={(d) => `${d.no} ${d.title} ${byId(db.parties, d.partyId)?.name || ''}`} searchPlaceholder="№, nom yoki kontragent…"
          toolbar={<><Select className="h-9 w-auto text-[12.5px]" value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">Barcha turlar</option>{Object.entries(KL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select><Select className="h-9 w-auto text-[12.5px]" value={st} onChange={(e) => setSt(e.target.value)}><option value="all">Barcha holatlar</option>{['draft', 'pending', 'approved', 'signed', 'rejected', 'archived'].map((x) => <option key={x} value={x}>{x}</option>)}</Select></>}
          cols={[{ key: 'no', header: '№', cell: (d) => <span className="font-mono text-[11.5px] text-t2">{d.no}</span> }, { key: 't', header: 'Hujjat', primary: true, cell: (d) => <div className="flex items-center gap-2">{d.fileName && <Paperclip className="h-3.5 w-3.5 shrink-0 text-t3" />}<span className="line-clamp-1">{d.title}</span></div> }, { key: 'k', header: 'Turi', cell: (d) => <Badge>{KL[d.kind]}</Badge> }, { key: 'p', header: 'Kontragent', hideMobile: true, cell: (d) => <span className="line-clamp-1 text-t2">{byId(db.parties, d.partyId)?.name || '—'}</span> }, { key: 'd', header: 'Sana', cell: (d) => fmtDate(d.date), sort: (d) => d.date }, { key: 'a', header: 'Summa', align: 'right', cell: (d) => (d.amount ? m(d.amount) : '—') }, { key: 's', header: 'Holat', cell: (d) => <StatusBadge status={d.status} /> }]} />
      </Card>
      {view && <DocDrawer id={view} onClose={() => setView(null)} />}
      {create && <DocForm onClose={() => setCreate(false)} />}
    </div>
  );
}

function DocDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, mf } = useCtx(); const { dispatch, role } = useApp();
  const d = byId(db.documents, id); if (!d) return null;
  const t = (to: DocRecord['status'], msg: string) => dispatch('doc.transition', { id, to }, { success: msg });
  const canAp = can(role, 'documents', 'approve'); const canEd = can(role, 'documents', 'edit');
  return (
    <Drawer open onClose={onClose} title={d.title} subtitle={<span className="flex items-center gap-2 font-mono">{d.no} <StatusBadge status={d.status} /></span>}
      footer={<>
        {d.status === 'draft' && canEd && <Button variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => t('pending', 'Tasdiqlashga yuborildi')}>Tasdiqlashga yuborish</Button>}
        {d.status === 'pending' && canAp && <><Button variant="danger" icon={<X className="h-3.5 w-3.5" />} onClick={() => t('rejected', 'Rad etildi')}>Rad etish</Button><Button variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => t('approved', 'Tasdiqlandi')}>Tasdiqlash</Button></>}
        {d.status === 'approved' && canAp && <Button variant="primary" icon={<PenLine className="h-3.5 w-3.5" />} onClick={() => t('signed', 'Imzolandi (ichki holat — ERI ulanmagan)')}>Imzolash</Button>}
        {d.status === 'rejected' && canEd && <Button onClick={() => t('draft', 'Qoralamaga qaytarildi')}>Qoralamaga qaytarish</Button>}
        {['signed', 'approved', 'draft', 'rejected'].includes(d.status) && canEd && <Button variant="ghost" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => t('archived', 'Arxivlandi')}>Arxivlash</Button>}
      </>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Turi</span><span>{KL[d.kind]}</span><span className="text-t3">Sana</span><span>{fmtDate(d.date)}</span><span className="text-t3">Kompaniya</span><span>{byId(db.companies, d.companyId)?.name}</span><span className="text-t3">Kontragent</span><span>{byId(db.parties, d.partyId)?.name || '—'}</span>{d.amount ? <><span className="text-t3">Summa</span><span className="num font-semibold">{mf(d.amount)}</span></> : null}</div>
      {d.fileName && <div className="mt-4 flex items-center gap-3 rounded-xl border border-line p-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{d.fileName}</p><p className="text-[11.5px] text-t3">{d.fileSize ? `${Math.round(d.fileSize / 1024)} KB` : ''} · demo fayl (saqlash serveri ulanmagan)</p></div></div>}
      <p className="mb-2 mt-5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-t3"><History className="h-3.5 w-3.5" />Hujjat tarixi</p>
      <ol className="relative ml-2 space-y-3 border-l border-line pl-4">{d.history.map((h, i) => <li key={i} className="text-[12.5px]"><span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface-solid bg-accent" /><p className="text-t1">{h.action}</p><p className="text-[11px] text-t3">{fmtDate(h.date)} · {h.user}</p></li>)}</ol>
    </Drawer>
  );
}

function DocForm({ onClose }: { onClose: () => void }) {
  const { db } = useCtx(); const { dispatch, filters } = useApp();
  const [f, setF] = useState<{ kind: DocRecord['kind']; title: string; companyId: string; partyId: string; amount: number; file?: File }>({ kind: 'contract', title: '', companyId: filters.companyId === 'all' ? 'trd' : filters.companyId, partyId: '', amount: 0 });
  return (
    <Modal open onClose={onClose} size="md" title="Yangi hujjat" icon={<Upload className="h-4 w-4" />} footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!f.title} onClick={() => { if (dispatch('doc.create', { kind: f.kind, title: f.title, date: TODAY, companyId: f.companyId, partyId: f.partyId || undefined, amount: f.amount || undefined, status: 'draft', fileName: f.file?.name, fileSize: f.file?.size }, { success: 'Hujjat qoralama sifatida yaratildi' }) !== undefined) onClose(); }}>Yaratish</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Turi"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as DocRecord['kind'] })}>{Object.entries(KL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Kompaniya"><Select value={f.companyId} onChange={(e) => setF({ ...f, companyId: e.target.value })}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Nomi" required className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Masalan: Yetkazib berish shartnomasi 2027" /></Field>
        <Field label="Kontragent"><Select value={f.partyId} onChange={(e) => setF({ ...f, partyId: e.target.value })}><option value="">—</option>{db.parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Summa"><Input type="number" value={f.amount || ''} onChange={(e) => setF({ ...f, amount: +e.target.value })} /></Field>
        <Field label="Fayl (ixtiyoriy)" className="sm:col-span-2" hint="Fayl nomi va hajmi qayd etiladi; tarkib serverga yuklanmaydi (demo)"><input type="file" className="field !py-1.5 text-[12.5px] file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-accent" onChange={(e) => setF({ ...f, file: e.target.files?.[0] })} /></Field>
      </div>
    </Modal>
  );
}
