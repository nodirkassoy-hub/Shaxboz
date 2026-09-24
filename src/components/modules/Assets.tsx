'use client';
import { useMemo, useState } from 'react';
import { Plus, Building, Calculator, Trash2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { byId } from '@/lib/db';
import { assetAccum, assetNBV, monthlyDep, depreciationSchedule } from '@/lib/ops';
import { fmtDate, TODAY, monthKey, monthLabel, addDays } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Button, Badge, Modal, Field, Input, Select, StatusBadge, cx, DemoTag, Drawer, Stat, Progress, Confirm, Explain } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { ChartTooltip, useChartFmt, PALETTE } from '@/components/ui/charts';
import { can } from '@/lib/rbac';
import type { FixedAsset } from '@/lib/types';

const CAT: Record<FixedAsset['category'], string> = { building: 'Bino va inshootlar', machine: 'Mashina va uskunalar', vehicle: 'Transport', equipment: 'Jihozlar', computer: 'Kompyuterlar', other: 'Boshqa' };

export default function Assets() {
  const { db, s, m, mf } = useCtx(); const { dispatch, role } = useApp();
  const [view, setView] = useState<string | null>(null); const [create, setCreate] = useState(false); const [dep, setDep] = useState(false);
  const rows = db.assets.filter((a) => s.companyIds.includes(a.companyId));
  const active = rows.filter((a) => a.status === 'active');
  const cost = active.reduce((a, x) => a + x.cost, 0); const acc = active.reduce((a, x) => a + assetAccum(x), 0);
  const mdep = active.reduce((a, x) => a + (assetNBV(x) > x.salvage ? monthlyDep(x) : 0), 0);
  const cur = monthKey(TODAY); const pending = active.filter((a) => !a.depreciatedMonths.includes(cur) && monthKey(a.purchaseDate) < cur);
  return (
    <div>
      <PageHeader title="Asosiy vositalar" crumbs={['Moliya', 'Asosiy vositalar']} subtitle={<span className="flex items-center gap-2">Binolar, mashinalar, transport, jihozlar va kompyuterlar · to‘g‘ri chiziqli amortizatsiya <DemoTag /></span>}
        actions={can(role, 'assets', 'create') ? <><Button icon={<Calculator className="h-3.5 w-3.5" />} onClick={() => setDep(true)} disabled={!pending.length}>{monthLabel(cur)} amortizatsiyasi ({pending.length})</Button><Button variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreate(true)}>Aktiv qabul qilish</Button></> : undefined} />
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Boshlang‘ich qiymat" value={m(cost)} sub={`${active.length} ta faol aktiv`} /><Stat label="Jamg‘arilgan amortizatsiya" value={m(acc)} /><Stat label="Qoldiq (balans) qiymati" value={m(cost - acc)} explain={['Qoldiq qiymati', 'boshlang‘ich qiymat minus jamg‘arilgan amortizatsiya. Balansda aynan shu summa ko‘rinadi.']} /><Stat label="Oylik amortizatsiya" value={m(mdep)} sub="zavod aktivlari → ishlab chiqarish tannarxiga" /></div>
      <Card>
        <CardHeader title="Aktivlar reestri" icon={<Building className="h-4 w-4" />} actions={<ExportButton module="assets" name="asosiy-vositalar" title="Asosiy vositalar reestri" cols={[{ key: 'c', label: 'Inv №' }, { key: 'n', label: 'Nomi' }, { key: 'k', label: 'Toifa' }, { key: 'd', label: 'Sotib olingan' }, { key: 'cost', label: 'Qiymat', type: 'money' }, { key: 'acc', label: 'Amortizatsiya', type: 'money' }, { key: 'nbv', label: 'Qoldiq', type: 'money' }, { key: 'l', label: 'Joylashuv' }, { key: 'r', label: 'Mas’ul' }]} rows={() => rows.map((a) => ({ c: a.code, n: a.name, k: CAT[a.category], d: fmtDate(a.purchaseDate), cost: a.cost, acc: assetAccum(a), nbv: assetNBV(a), l: a.location, r: a.responsible }))} />} />
        <DataTable rows={rows} rowKey={(a) => a.id} onRow={(a) => setView(a.id)} search={(a) => `${a.code} ${a.name} ${a.location} ${a.responsible}`}
          cols={[{ key: 'n', header: 'Aktiv', primary: true, cell: (a) => <div><p className="font-medium">{a.name}</p><p className="font-mono text-[11px] text-t3">{a.code}</p></div> }, { key: 'k', header: 'Toifa', cell: (a) => <Badge>{CAT[a.category]}</Badge> }, { key: 'd', header: 'Sotib olingan', cell: (a) => fmtDate(a.purchaseDate), sort: (a) => a.purchaseDate }, { key: 'c', header: 'Qiymat', align: 'right', cell: (a) => mf(a.cost), sort: (a) => a.cost }, { key: 'nbv', header: 'Qoldiq qiymati', align: 'right', cell: (a) => <b>{mf(assetNBV(a))}</b>, sort: (a) => assetNBV(a) }, { key: 'w', header: 'Eskirish', cell: (a) => <div className="w-24"><Progress value={(assetAccum(a) / (a.cost - a.salvage)) * 100} height={4} tone="warn" /><span className="text-[10.5px] text-t3">{((assetAccum(a) / (a.cost - a.salvage)) * 100).toFixed(0)}% · {a.lifeMonths / 12} yil</span></div> }, { key: 'l', header: 'Joylashuv / mas’ul', hideMobile: true, cell: (a) => <div className="text-[12px]"><p>{a.location}</p><p className="text-t3">{a.responsible}</p></div> }, { key: 's', header: 'Holat', cell: (a) => <StatusBadge status={a.status} /> }]} />
      </Card>
      {view && <AssetDrawer id={view} onClose={() => setView(null)} />}
      {create && <AssetForm onClose={() => setCreate(false)} />}
      <Confirm open={dep} onClose={() => setDep(false)} title={`${monthLabel(cur)} amortizatsiyasi`} confirmLabel="Hisoblash va provodka qilish" body={<>{pending.length} ta aktiv uchun jami ~{mf(pending.reduce((a, x) => a + monthlyDep(x), 0))}.<br />Provodka: Dt 9425 (ma’muriy) / Dt 2510 (zavod) — Kt 02xx jamg‘arilgan amortizatsiya. Odatda oy oxirida bajariladi.</>} onConfirm={() => { for (const co of [...new Set(pending.map((a) => a.companyId))]) dispatch('asset.depreciate', { companyId: co, month: cur }, { silent: true }); useApp.getState().toast({ kind: 'success', title: 'Amortizatsiya hisoblandi' }); }} />
    </div>
  );
}

function AssetDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, mf } = useCtx(); const { dispatch, role } = useApp(); const f = useChartFmt();
  const [disp, setDisp] = useState(false);
  const a = byId(db.assets, id); if (!a) return null;
  const sched = depreciationSchedule(a, 24);
  const machine = db.machines.find((mm) => mm.assetId === a.id);
  return (
    <Drawer open onClose={onClose} width="max-w-2xl" title={a.name} subtitle={<span className="flex items-center gap-2 font-mono">{a.code} <StatusBadge status={a.status} /></span>} footer={a.status === 'active' && can(role, 'assets', 'delete') ? <Button variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDisp(true)}>Hisobdan chiqarish</Button> : undefined}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Boshlang‘ich', a.cost], ['Tugatish qiymati', a.salvage], ['Jamg‘arilgan', assetAccum(a)], ['Qoldiq', assetNBV(a)]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[13.5px] font-semibold">{mf(v as number)}</p></div>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]"><span className="text-t3">Toifa</span><span>{CAT[a.category]} (hisob {a.account})</span><span className="text-t3">Sotib olingan</span><span>{fmtDate(a.purchaseDate)}</span><span className="text-t3">Foydali muddat</span><span>{a.lifeMonths} oy ({a.lifeMonths / 12} yil)</span><span className="text-t3">Usul</span><span>To‘g‘ri chiziqli · {mf(monthlyDep(a))}/oy</span><span className="text-t3">Xarajat hisobi</span><span>{a.expenseAccount} {a.factory ? '(ishlab chiqarish tannarxiga)' : '(ma’muriy)'}</span><span className="text-t3">Joylashuv</span><span>{a.location}</span><span className="text-t3">Mas’ul xodim</span><span>{a.responsible}</span><span className="text-t3">Kompaniya</span><span>{byId(db.companies, a.companyId)?.name}</span>{machine && <><span className="text-t3">Mashina</span><span>{machine.name} · OEE {(machine.oee * 100).toFixed(0)}%</span></>}</div>
      <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Amortizatsiya jadvali (keyingi 24 oy)</p>
      <div className="h-[160px]"><ResponsiveContainer><AreaChart data={sched.map((r) => ({ m: monthLabel(r.month, true) + r.month.slice(2, 4), nbv: r.nbv }))} margin={{ left: -6 }}><CartesianGrid vertical={false} /><XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} minTickGap={16} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Area dataKey="nbv" name="Qoldiq qiymati" stroke={PALETTE[0]} fill={PALETTE[0]} fillOpacity={0.12} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
      <div className="thin-scroll mt-2 max-h-56 overflow-y-auto"><table className="w-full text-[12px]"><thead className="sticky top-0 bg-surface-solid text-t3"><tr><th className="py-1 text-left">Oy</th><th className="text-right">Amortizatsiya</th><th className="text-right">Jamg‘arilgan</th><th className="text-right">Qoldiq</th></tr></thead><tbody>{([...a.depreciatedMonths.slice(-3).map((mk) => ({ month: mk, posted: true, row: null })), ...sched.slice(0, 12).map((r) => ({ month: r.month, posted: false, row: r }))] as { month: string; posted: boolean; row: { dep: number; accum: number; nbv: number } | null }[]).map((r, i) => { const row = r.row; return <tr key={i} className="border-t border-line"><td className="py-1">{monthLabel(r.month)} {r.posted && <Badge tone="pos">provodka</Badge>}</td><td className="num text-right">{mf(row ? row.dep : monthlyDep(a))}</td><td className="num text-right text-t3">{row ? mf(row.accum) : ''}</td><td className="num text-right">{row ? mf(row.nbv) : ''}</td></tr>; })}</tbody></table></div>
      <Confirm open={disp} onClose={() => setDisp(false)} tone="danger" title="Aktivni hisobdan chiqarish" confirmLabel="Chiqarish" body={<>Qoldiq qiymati {mf(assetNBV(a))} zarar sifatida yoziladi (Dt 9434). Provodka: Dt {a.account.replace('01', '02')} jamg‘arilgan amortizatsiya + Dt 9434 / Kt {a.account}.</>} onConfirm={() => dispatch('asset.dispose', { id }, { success: 'Aktiv hisobdan chiqarildi' })} />
    </Drawer>
  );
}

function AssetForm({ onClose }: { onClose: () => void }) {
  const { db, mf } = useCtx(); const { dispatch, filters } = useApp();
  const [f, setF] = useState({ name: '', category: 'computer' as FixedAsset['category'], companyId: filters.companyId === 'all' ? 'trd' : filters.companyId, cost: 0, vat: 12, lifeMonths: 48, location: '', responsible: '', payAccount: '5110', supplierId: '' });
  const co = byId(db.companies, f.companyId)!;
  return (
    <Modal open onClose={onClose} size="md" title="Asosiy vositani qabul qilish" subtitle="Provodka: Dt 01xx Asosiy vosita + Dt 4410 QQS / Kt 5110 Bank (yoki Kt 6010 ta’minotchi)" footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant="primary" disabled={!f.name || !(f.cost > 0)} onClick={() => { if (dispatch('asset.purchase', { name: f.name, category: f.category, companyId: f.companyId, branchId: co.branchIds[0], purchaseDate: TODAY, cost: f.cost, salvage: Math.round(f.cost * 0.05), lifeMonths: f.lifeMonths, location: f.location, responsible: f.responsible, expenseAccount: co.kind === 'manufacturing' && ['machine', 'building', 'equipment'].includes(f.category) ? '2510' : '9425', factory: co.kind === 'manufacturing' && ['machine', 'building', 'equipment'].includes(f.category), payAccount: f.payAccount, supplierId: f.supplierId || undefined, vat: Math.round(f.cost * f.vat / 100) }, { success: 'Asosiy vosita qabul qilindi' }) !== undefined) onClose(); }}>Qabul qilish</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nomi" required className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Toifa"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as FixedAsset['category'] })}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Kompaniya"><Select value={f.companyId} onChange={(e) => setF({ ...f, companyId: e.target.value })}>{db.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Qiymat (QQSsiz)" required><Input type="number" value={f.cost || ''} onChange={(e) => setF({ ...f, cost: +e.target.value })} /></Field>
        <Field label="Foydali muddat (oy)" hint={f.cost ? `Oylik amortizatsiya ~${mf((f.cost * 0.95) / f.lifeMonths)}` : undefined}><Input type="number" value={f.lifeMonths} onChange={(e) => setF({ ...f, lifeMonths: +e.target.value })} /></Field>
        <Field label="Joylashuv"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
        <Field label="Mas’ul xodim"><Select value={f.responsible} onChange={(e) => setF({ ...f, responsible: e.target.value })}><option value="">—</option>{db.employees.filter((e) => e.companyId === f.companyId).map((e) => <option key={e.id}>{e.name}</option>)}</Select></Field>
        <Field label="To‘lov"><Select value={f.supplierId ? 'ap' : f.payAccount} onChange={(e) => e.target.value === 'ap' ? setF({ ...f, supplierId: db.parties.find((p) => p.kind === 'supplier' && p.companyIds.includes(f.companyId))?.id || '' }) : setF({ ...f, payAccount: e.target.value, supplierId: '' })}><option value="5110">Bankdan darhol</option><option value="ap">Ta’minotchiga qarz (keyin to‘lash)</option></Select></Field>
        {f.supplierId && <Field label="Ta’minotchi"><Select value={f.supplierId} onChange={(e) => setF({ ...f, supplierId: e.target.value })}>{db.parties.filter((p) => p.kind === 'supplier' && p.companyIds.includes(f.companyId)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
      </div>
    </Modal>
  );
}
