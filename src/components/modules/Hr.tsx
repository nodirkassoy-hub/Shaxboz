'use client';
import { useMemo, useState } from 'react';
import { Plus, UserRound, Building2, CalendarCheck, Wallet, CalendarClock, Calculator, Send, CheckCircle2, History, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { byId } from '@/lib/db';
import { calcPayroll, payrollRates } from '@/lib/ops';
import { fmtDate, TODAY, monthLabel, monthKey, addDays, MONTHS_UZ } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat, Avatar, Segmented } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { ChartTooltip, useChartFmt, PALETTE } from '@/components/ui/charts';
import { can } from '@/lib/rbac';
import type { Employee } from '@/lib/types';

type Tab = 'employees' | 'departments' | 'attendance' | 'leave' | 'payroll';

export default function Hr() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'employees');
  return (
    <div>
      <PageHeader title="HR va ish haqi" crumbs={['Xodimlar']} subtitle={<span className="flex items-center gap-2">Davomat → Ish haqi hisoblash → Soliq/ushlanmalar → Tasdiqlash → To‘lov <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'employees', label: 'Xodimlar', icon: <UserRound className="h-3.5 w-3.5" /> }, { id: 'departments', label: 'Bo‘limlar', icon: <Building2 className="h-3.5 w-3.5" /> }, { id: 'attendance', label: 'Davomat', icon: <CalendarCheck className="h-3.5 w-3.5" /> }, { id: 'leave', label: 'Ta’tillar', icon: <CalendarClock className="h-3.5 w-3.5" /> }, { id: 'payroll', label: 'Ish haqi', icon: <Wallet className="h-3.5 w-3.5" /> }]} />
      {tab === 'employees' && <Employees />}{tab === 'departments' && <Departments />}{tab === 'attendance' && <Attendance />}{tab === 'leave' && <Leave />}{tab === 'payroll' && <Payroll />}
    </div>
  );
}

function Employees() {
  const { db, s, m, mf } = useCtx(); const { nav, role } = useApp();
  const [view, setView] = useState<string | null>(nav.params?.employee || null); const [create, setCreate] = useState(nav.params?.new === '1');
  const rows = db.employees.filter((e) => s.companyIds.includes(e.companyId) && (!s.branchId || e.branchId === s.branchId));
  const active = rows.filter((e) => e.status !== 'terminated'); const fund = active.reduce((a, e) => a + e.salary, 0);
  const pending = db.payrollRuns.filter((r) => s.companyIds.includes(r.companyId) && ['draft', 'pending_approval', 'posted'].includes(r.status));
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Xodimlar" value={String(active.length)} sub={`${[...new Set(active.map((e) => e.department))].length} ta bo‘lim`} /><Stat label="Oylik ish haqi fondi" value={m(fund)} sub={`+ ijtimoiy soliq ${payrollRates(db).social}% = ${m(fund * (1 + payrollRates(db).social / 100))}`} /><Stat label="O‘rtacha ish haqi" value={m(fund / Math.max(1, active.length))} /><Stat label="To‘lanmagan hisob-kitoblar" value={String(pending.length)} tone={pending.length ? 'warn' : undefined} sub={pending.map((r) => `${byId(db.companies, r.companyId)?.short} ${r.period}`).join(', ') || '—'} /></div>
      <Card>
        <CardHeader title="Xodimlar" icon={<UserRound className="h-4 w-4" />} actions={<>{can(role, 'hr', 'create') && <Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Xodim</Button>}<ExportButton module="hr" name="xodimlar" title="Xodimlar ro‘yxati" cols={[{ key: 'c', label: 'Tabel №' }, { key: 'n', label: 'F.I.Sh.' }, { key: 'p', label: 'PINFL' }, { key: 'd', label: 'Bo‘lim' }, { key: 'pos', label: 'Lavozim' }, { key: 's', label: 'Oklad', type: 'money' }]} rows={() => rows.map((e) => ({ c: e.code, n: e.name, p: e.pinfl, d: e.department, pos: e.position, s: e.salary }))} /></>} />
        <DataTable rows={rows} rowKey={(e) => e.id} onRow={(e) => setView(e.id)} search={(e) => `${e.name} ${e.position} ${e.department} ${e.code}`}
          cols={[{ key: 'n', header: 'Xodim', primary: true, cell: (e) => <div className="flex items-center gap-2.5"><Avatar name={e.name} size={30} /><div><p className="font-medium">{e.name}</p><p className="text-[11px] text-t3">{e.code} · {e.email}</p></div></div> }, { key: 'pos', header: 'Lavozim', cell: (e) => e.position }, { key: 'd', header: 'Bo‘lim', cell: (e) => <Badge>{e.department}</Badge> }, { key: 'co', header: 'Kompaniya', hideMobile: true, cell: (e) => `${byId(db.companies, e.companyId)?.short} · ${byId(db.branches, e.branchId)?.name}` }, { key: 'h', header: 'Ishga kirgan', cell: (e) => fmtDate(e.hired), sort: (e) => e.hired }, { key: 's', header: 'Oklad', align: 'right', cell: (e) => mf(e.salary), sort: (e) => e.salary }, { key: 'st', header: 'Holat', cell: (e) => <StatusBadge status={e.status} /> }]} />
      </Card>
      {view && <EmpDrawer id={view} onClose={() => setView(null)} />}
      {create && <EmpForm onClose={() => setCreate(false)} />}
    </div>
  );
}

function EmpForm({ onClose }: { onClose: () => void }) {
  const { db } = useCtx(); const { dispatch, filters } = useApp();
  const [f, setF] = useState<Partial<Employee>>({ companyId: filters.companyId === 'all' ? 'trd' : filters.companyId, department: 'Sotuv', position: '', salary: 7_000_000, hired: TODAY, status: 'active', costKind: 'sales', pinfl: '' });
  const co = byId(db.companies, f.companyId!)!;
  return (
    <Modal open onClose={onClose} size="md" title="Yangi xodim" footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!f.name || !f.position || (f.pinfl?.length || 0) !== 14} onClick={() => { if (dispatch('emp.create', { ...f, code: `X-${String(db.employees.length + 1).padStart(3, '0')}`, email: `${f.name!.split(' ')[0].toLowerCase()}@balans.uz`, phone: f.phone || '—', branchId: f.branchId || co.branchIds[0], salaryHistory: [{ date: f.hired!, amount: f.salary!, reason: 'Ishga qabul' }] }, { success: 'Xodim qo‘shildi' }) !== undefined) onClose(); }}>Saqlash</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="F.I.Sh." required className="sm:col-span-2"><Input value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="PINFL (14 raqam)" required error={f.pinfl && f.pinfl.length !== 14 ? `${f.pinfl.length}/14` : undefined}><Input value={f.pinfl} maxLength={14} onChange={(e) => setF({ ...f, pinfl: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Telefon"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Kompaniya"><Select value={f.companyId} onChange={(e) => setF({ ...f, companyId: e.target.value, branchId: undefined })}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Filial"><Select value={f.branchId || co.branchIds[0]} onChange={(e) => setF({ ...f, branchId: e.target.value })}>{co.branchIds.map((b) => <option key={b} value={b}>{byId(db.branches, b)?.name}</option>)}</Select></Field>
        <Field label="Bo‘lim"><Select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}>{[...new Set(db.employees.map((e) => e.department))].map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Lavozim" required><Input value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></Field>
        <Field label="Oklad (oylik)"><Input type="number" value={f.salary} onChange={(e) => setF({ ...f, salary: +e.target.value })} /></Field>
        <Field label="Xarajat turi" hint="Ish haqi provodkasi qaysi hisobga tushadi"><Select value={f.costKind} onChange={(e) => setF({ ...f, costKind: e.target.value as Employee['costKind'] })}><option value="admin">Ma’muriy (9421)</option><option value="sales">Sotuv (9413)</option><option value="production">Ishlab chiqarish (2510)</option><option value="service">Xizmat tannarxi (9130)</option></Select></Field>
        <Field label="Ishga qabul sanasi"><Input type="date" value={f.hired} onChange={(e) => setF({ ...f, hired: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function EmpDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, mf } = useCtx(); const { dispatch, role } = useApp();
  const [raise, setRaise] = useState(false); const [sal, setSal] = useState(0); const [reason, setReason] = useState('Lavozim oshishi');
  const e = byId(db.employees, id); if (!e) return null;
  const att = db.attendance.filter((a) => a.employeeId === id && a.date >= addDays(TODAY, -30));
  const cnt = (s: string) => att.filter((a) => a.status === s).length;
  const lines = db.payrollRuns.filter((r) => r.companyId === e.companyId).flatMap((r) => r.lines.filter((l) => l.employeeId === id).map((l) => ({ ...l, period: r.period, status: r.status }))).slice(-6).reverse();
  return (
    <Drawer open onClose={onClose} title={e.name} subtitle={`${e.position} · ${e.department} · ${byId(db.companies, e.companyId)?.short}`} footer={can(role, 'hr', 'edit') ? <><Button onClick={() => dispatch('leave.request', { employeeId: id, from: addDays(TODAY, 14), to: addDays(TODAY, 18), kind: 'Yillik ta’til' }, { success: 'Ta’til so‘rovi yaratildi' })}>Ta’til so‘rovi</Button><Button variant="primary" onClick={() => { setSal(e.salary); setRaise(true); }}>Ish haqini o‘zgartirish</Button></> : undefined}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Tabel №</span><span>{e.code}</span><span className="text-t3">PINFL</span><span className="font-mono">{e.pinfl}</span><span className="text-t3">Telefon</span><span>{e.phone}</span><span className="text-t3">Email</span><span>{e.email}</span><span className="text-t3">Ishga kirgan</span><span>{fmtDate(e.hired)}</span><span className="text-t3">Oklad</span><span className="num font-semibold">{mf(e.salary)}</span></div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Davomat (30 kun)</p>
      <div className="grid grid-cols-4 gap-2 text-center">{[['Keldi', cnt('present'), 'text-pos'], ['Kechikdi', cnt('late'), 'text-warn'], ['Ta’til/masofa', cnt('leave') + cnt('remote'), 'text-sky-500'], ['Kelmadi', cnt('absent'), 'text-neg']].map(([l, v, c]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2"><p className={cx('num text-[16px] font-semibold', c as string)}>{v as number}</p><p className="text-[10.5px] text-t3">{l as string}</p></div>)}</div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Ish haqi tarixi</p>
      <table className="w-full text-[12px]"><thead className="text-t3"><tr><th className="py-1 text-left">Davr</th><th className="text-right">Hisoblangan</th><th className="text-right">Bonus</th><th className="text-right">JShDS</th><th className="text-right">Qo‘lga</th></tr></thead><tbody>{lines.map((l) => <tr key={l.period} className="border-t border-line"><td className="py-1">{monthLabel(l.period, true)} <StatusBadge status={l.status} /></td><td className="num text-right">{mf(l.gross)}</td><td className="num text-right">{l.bonus ? mf(l.bonus) : '—'}</td><td className="num text-right text-neg">−{mf(l.pit)}</td><td className="num text-right font-semibold">{mf(l.net)}</td></tr>)}</tbody></table>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Oklad o‘zgarishlari</p>
      <div className="space-y-1">{e.salaryHistory.map((h, i) => <div key={i} className="flex items-center gap-2 text-[12.5px]"><History className="h-3.5 w-3.5 text-t3" /><span className="w-20 text-t3">{fmtDate(h.date)}</span><span className="flex-1">{h.reason}</span><span className="num">{mf(h.amount)}</span></div>)}</div>
      <Modal open={raise} onClose={() => setRaise(false)} size="sm" title="Oklad o‘zgarishi" footer={<><Button variant="ghost" onClick={() => setRaise(false)}>Bekor qilish</Button><Button variant="primary" onClick={() => { if (dispatch('emp.update', { id, salary: sal, reason }, { success: 'Oklad yangilandi (keyingi hisob-kitobdan)' }) !== undefined) setRaise(false); }}>Saqlash</Button></>}><div className="space-y-3"><Field label="Yangi oklad" hint={`Hozirgi: ${mf(e.salary)} (${e.salary ? (((sal - e.salary) / e.salary) * 100).toFixed(1) : 0}%)`}><Input type="number" value={sal} onChange={(ev) => setSal(+ev.target.value)} /></Field><Field label="Sabab"><Input value={reason} onChange={(ev) => setReason(ev.target.value)} /></Field></div></Modal>
    </Drawer>
  );
}

function Departments() {
  const { db, s, m } = useCtx(); const f = useChartFmt();
  const emps = db.employees.filter((e) => s.companyIds.includes(e.companyId) && e.status !== 'terminated');
  const depts = [...new Set(emps.map((e) => e.department))].map((d) => { const es = emps.filter((e) => e.department === d); return { d, n: es.length, fund: es.reduce((a, e) => a + e.salary, 0), avg: es.reduce((a, e) => a + e.salary, 0) / es.length, positions: [...new Set(es.map((e) => e.position))] }; }).sort((a, b) => b.fund - a.fund);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader title="Bo‘limlar bo‘yicha ish haqi fondi" subtitle="Oylik oklad" />
        <div className="h-[280px]"><ResponsiveContainer><BarChart data={depts.map((d) => ({ n: d.d, v: d.fund }))} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 10.5 }} interval={0} angle={-18} textAnchor="end" height={50} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="v" name="Fond" fill={PALETTE[0]} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
      <Card><CardHeader title="Bo‘limlar" /><div className="space-y-2">{depts.map((d) => <div key={d.d} className="rounded-xl border border-line p-3"><div className="flex justify-between"><span className="text-[13px] font-semibold">{d.d}</span><span className="num text-[12.5px] font-semibold">{m(d.fund)}</span></div><p className="text-[11.5px] text-t3">{d.n} xodim · o‘rtacha {m(d.avg)}</p><p className="mt-1 line-clamp-1 text-[11px] text-t3">{d.positions.join(', ')}</p></div>)}</div></Card>
    </div>
  );
}

function Attendance() {
  const { db, s } = useCtx();
  const emps = db.employees.filter((e) => s.companyIds.includes(e.companyId) && e.status !== 'terminated');
  const days: string[] = []; for (let i = 13; i >= 0; i--) days.push(addDays(TODAY, -i));
  const map = new Map(db.attendance.filter((a) => a.date >= days[0]).map((a) => [a.employeeId + a.date, a]));
  const C: Record<string, string> = { present: 'bg-pos/70', late: 'bg-warn/80', absent: 'bg-neg/80', leave: 'bg-sky-500/70', remote: 'bg-accent/60' };
  const today = db.attendance.filter((a) => a.date === TODAY && emps.some((e) => e.id === a.employeeId));
  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Bugun ishda', today.filter((a) => ['present', 'late', 'remote'].includes(a.status)).length], ['Kechikdi', today.filter((a) => a.status === 'late').length], ['Masofaviy', today.filter((a) => a.status === 'remote').length], ['Ta’tilda', today.filter((a) => a.status === 'leave').length], ['Kelmadi', today.filter((a) => a.status === 'absent').length]].map(([l, v]) => <Stat key={l as string} label={l as string} value={String(v)} />)}</div>
      <Card><CardHeader title="Davomat jadvali — oxirgi 14 kun" subtitle="Demo: turniket/biometrik tizim ulanmagan" icon={<CalendarCheck className="h-4 w-4" />} actions={<ExportButton module="hr" name="davomat" title="Davomat tabeli" cols={[{ key: 'n', label: 'Xodim' }, ...days.map((d) => ({ key: d, label: fmtDate(d).slice(0, 5) }))]} rows={() => emps.map((e) => ({ n: e.name, ...Object.fromEntries(days.map((d) => [d, map.get(e.id + d)?.status || '—'])) }))} />} />
        <div className="thin-scroll overflow-x-auto"><table className="w-full min-w-[760px] text-[11.5px]"><thead><tr><th className="sticky left-0 bg-surface-solid py-1.5 text-left font-semibold text-t3">Xodim</th>{days.map((d) => <th key={d} className={cx('w-8 text-center font-medium', d === TODAY ? 'text-accent' : 'text-t3')}>{+d.slice(8)}</th>)}<th className="pl-2 text-right text-t3">Soat</th></tr></thead>
          <tbody>{emps.map((e) => <tr key={e.id} className="border-t border-line"><td className="sticky left-0 bg-surface-solid py-1 pr-2"><span className="block max-w-[180px] truncate text-t1">{e.name}</span></td>{days.map((d) => { const a = map.get(e.id + d); return <td key={d} className="px-0.5 text-center">{a ? <span title={`${a.status} · ${a.hours} soat`} className={cx('mx-auto block h-5 w-5 rounded', C[a.status])} /> : <span className="mx-auto block h-5 w-5 rounded bg-surface-3" />}</td>; })}<td className="num pl-2 text-right text-t2">{days.reduce((x, d) => x + (map.get(e.id + d)?.hours || 0), 0)}</td></tr>)}</tbody></table></div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-t3">{[['present', 'Keldi'], ['late', 'Kechikdi'], ['remote', 'Masofaviy'], ['leave', 'Ta’til'], ['absent', 'Kelmadi']].map(([k, l]) => <span key={k} className="flex items-center gap-1"><span className={cx('h-3 w-3 rounded', C[k])} />{l}</span>)}<span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-surface-3" />Dam olish</span></div>
      </Card>
    </div>
  );
}

function Leave() {
  const { db } = useCtx(); const { go } = useApp();
  return (
    <Card><CardHeader title="Ta’tillar" icon={<CalendarClock className="h-4 w-4" />} actions={<Button size="sm" onClick={() => go('approvals')}>Tasdiqlash markazi</Button>} />
      <DataTable rows={db.leaves.slice().reverse()} rowKey={(l) => l.id} cols={[{ key: 'e', header: 'Xodim', primary: true, cell: (l) => byId(db.employees, l.employeeId)?.name }, { key: 'k', header: 'Turi', cell: (l) => l.kind }, { key: 'f', header: 'Davr', cell: (l) => `${fmtDate(l.from)} – ${fmtDate(l.to)}` }, { key: 's', header: 'Holat', cell: (l) => <StatusBadge status={l.status} /> }]} />
    </Card>
  );
}

function Payroll() {
  const { db, s, mf, m } = useCtx(); const { dispatch, role, filters } = useApp();
  const [co, setCo] = useState(filters.companyId === 'all' ? 'trd' : filters.companyId);
  const runs = db.payrollRuns.filter((r) => r.companyId === co).sort((a, b) => (a.period < b.period ? 1 : -1));
  const cur = monthKey(TODAY); const curRun = runs.find((r) => r.period === cur);
  const [sel, setSel] = useState<string | null>(null); const run = byId(db.payrollRuns, sel || curRun?.id || runs[0]?.id);
  const preview = !curRun ? calcPayroll(db, co, cur) : null;
  const lines = run?.lines || [];
  const R = payrollRates(db);
  const tot = (arr: typeof lines) => ({ gross: arr.reduce((a, l) => a + l.gross, 0), bonus: arr.reduce((a, l) => a + l.bonus, 0), pit: arr.reduce((a, l) => a + l.pit, 0), social: arr.reduce((a, l) => a + l.social, 0), net: arr.reduce((a, l) => a + l.net, 0) });
  const t = tot(lines);
  const steps = ['draft', 'pending_approval', 'posted', 'paid']; const si = run ? Math.max(steps.indexOf(run.status === 'approved' ? 'posted' : run.status), 0) : -1;
  const edit = can(role, 'hr', 'create');
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Segmented value={co} onChange={(v) => { setCo(v); setSel(null); }} options={db.companies.map((c) => ({ id: c.id, label: c.name }))} /><span className="text-[11.5px] text-t3">Stavkalar (sozlanadi → Soliqlar): JShDS {R.pit}% · Ijtimoiy soliq {R.social}%</span></div>
      {!curRun && preview && (
        <Card className="!border-accent/30"><CardHeader title={`${monthLabel(cur)} — ish haqi hisoblanmagan`} subtitle={`${preview.length} xodim · davomat asosida taxminiy fond ${m(tot(preview).gross + tot(preview).bonus)} · oy oxirida hisoblanadi`} icon={<Calculator className="h-4 w-4" />} actions={edit ? <Button variant="primary" icon={<Calculator className="h-3.5 w-3.5" />} onClick={() => { const r = dispatch<{ id: string }>('payroll.create', { companyId: co, period: cur }, { success: 'Ish haqi hisoblandi (qoralama)' }); if (r) setSel(r.id); }}>Hozir hisoblash</Button> : undefined} /></Card>
      )}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card pad={false} className="h-fit"><p className="border-b border-line px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-t3">Hisob-kitoblar</p><div className="thin-scroll max-h-[520px] overflow-y-auto p-1.5">{runs.map((r) => <button key={r.id} onClick={() => setSel(r.id)} className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12.5px]', run?.id === r.id ? 'bg-accent-soft text-accent' : 'hover:bg-surface-2')}><span>{monthLabel(r.period)}</span><StatusBadge status={r.status} /></button>)}</div></Card>
        {run && (
          <Card>
            <CardHeader title={`Ish haqi — ${monthLabel(run.period)}`} subtitle={`${byId(db.companies, run.companyId)?.name} · ${run.lines.length} xodim`} icon={<Wallet className="h-4 w-4" />}
              actions={<>{edit && run.status === 'draft' && <Button variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => dispatch('payroll.submit', { id: run.id }, { success: 'CFO tasdig‘iga yuborildi' })}>Tasdiqlashga yuborish</Button>}{edit && run.status === 'posted' && <Button variant="primary" icon={<Wallet className="h-3.5 w-3.5" />} onClick={() => dispatch('payroll.pay', { id: run.id }, { success: 'Ish haqi to‘landi — Dt 6710 / Kt 5110' })}>To‘lash ({m(t.net)})</Button>}<ExportButton module="hr" name={`ish-haqi-${run.period}`} title={`Ish haqi vedomosti ${monthLabel(run.period)}`} cols={[{ key: 'n', label: 'Xodim' }, { key: 'g', label: 'Hisoblangan', type: 'money' }, { key: 'b', label: 'Bonus', type: 'money' }, { key: 'd', label: 'Ushlanma (kelmagan kun)', type: 'money' }, { key: 'p', label: 'JShDS', type: 'money' }, { key: 'net', label: 'Qo‘lga', type: 'money' }, { key: 's', label: 'Ijtimoiy soliq', type: 'money' }]} rows={() => run.lines.map((l) => ({ n: byId(db.employees, l.employeeId)?.name, g: l.gross, b: l.bonus, d: l.deductions, p: l.pit, net: l.net, s: l.social }))} /></>} />
            <div className="mb-4 flex items-center">{['Hisoblash', 'Tasdiqlash', 'Provodka', 'To‘lov'].map((l, i, arr) => <div key={l} className="flex flex-1 items-center"><div className="flex items-center gap-1.5"><div className={cx('grid h-6 w-6 place-items-center rounded-full text-[10.5px]', i <= si ? 'bg-accent text-white' : 'border border-line text-t3')}>{i <= si ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}</div><span className={cx('text-[11.5px]', i <= si ? 'text-t1' : 'text-t3')}>{l}</span></div>{i < arr.length - 1 && <ArrowRight className="mx-2 h-3.5 w-3.5 text-t3" />}</div>)}</div>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{[['Hisoblangan', t.gross], ['Bonuslar', t.bonus], [`JShDS ${R.pit}%`, t.pit], ['Qo‘lga', t.net], [`Ijtimoiy soliq ${R.social}%`, t.social]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[13.5px] font-semibold">{m(v as number)}</p></div>)}</div>
            <DataTable rows={lines} rowKey={(l) => l.employeeId} pageSize={15} dense
              cols={[{ key: 'n', header: 'Xodim', primary: true, cell: (l) => <div><p>{byId(db.employees, l.employeeId)?.name}</p><p className="text-[11px] text-t3">{byId(db.employees, l.employeeId)?.position}</p></div> }, { key: 'g', header: 'Hisoblangan', align: 'right', cell: (l) => mf(l.gross) }, { key: 'b', header: 'Bonus', align: 'right', cell: (l) => (l.bonus ? <span className="text-pos">+{mf(l.bonus)}</span> : '—') }, { key: 'd', header: 'Ushlanma', align: 'right', cell: (l) => (l.deductions ? <span className="text-warn">−{mf(l.deductions)}</span> : '—') }, { key: 'p', header: 'JShDS', align: 'right', cell: (l) => <span className="text-neg">−{mf(l.pit)}</span> }, { key: 'net', header: 'Qo‘lga', align: 'right', cell: (l) => <b>{mf(l.net)}</b>, sort: (l) => l.net }, { key: 's', header: 'Ijt. soliq', align: 'right', hideMobile: true, cell: (l) => <span className="text-t3">{mf(l.social)}</span> }]} />
            <p className="mt-3 text-[11.5px] text-t3">Provodka: Dt 9421/9413/2510/9130 (bo‘lim bo‘yicha; xizmat xodimlari loyihalarga taqsimlanadi) / Kt 6710 qo‘lga, Kt 6413 JShDS, Kt 6520 ijtimoiy soliq. Soliq majburiyatlari Soliq markazida avtomatik paydo bo‘ladi. DEMO — stavkalar sozlanadigan, qonunchilikka muvofiqligi tekshirilmagan.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
