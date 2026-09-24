'use client';
import { useMemo, useState } from 'react';
import { FolderKanban, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { byId, invOpen } from '@/lib/db';
import { linesFor } from '@/lib/core/ledger';
import { fmtDate, TODAY, diffDays } from '@/lib/core/dates';
import { ACC } from '@/lib/core/coa';
import { PageHeader, Card, CardHeader, Badge, StatusBadge, cx, DemoTag, Drawer, Stat, Progress, Empty } from '@/components/ui';
import { ExportButton } from '@/components/ui/Export';
import { ChartTooltip, useChartFmt, PALETTE, Legend } from '@/components/ui/charts';

export default function Projects() {
  const { db, s, m, mf } = useCtx(); const f = useChartFmt();
  const rows = useMemo(() => A.projectFinancials(db, s), [db, s]);
  const [view, setView] = useState<string | null>(null);
  if (!rows.length) return <div><PageHeader title="Loyihalar" /><Card><Empty title="Tanlangan kompaniyada loyihalar yo‘q" body="Loyiha hisobi Balans Services uchun yuritiladi." /></Card></div>;
  const tot = { rev: rows.reduce((a, r) => a + r.revenue, 0), cost: rows.reduce((a, r) => a + r.cost, 0), budget: rows.reduce((a, r) => a + r.p.budget, 0) };
  return (
    <div>
      <PageHeader title="Loyihalar hisobi" crumbs={['Loyihalar']} subtitle={<span className="flex items-center gap-2">Har bir loyiha bo‘yicha tushum, mehnat, materiallar, subpudrat, byudjet va rentabellik — provodkalardagi loyiha tahlilidan <DemoTag /></span>}
        actions={<ExportButton module="projects" name="loyihalar" title="Loyihalar rentabelligi" cols={[{ key: 'c', label: 'Kod' }, { key: 'n', label: 'Loyiha' }, { key: 'b', label: 'Byudjet', type: 'money' }, { key: 'r', label: 'Tushum', type: 'money' }, { key: 'l', label: 'Mehnat', type: 'money' }, { key: 'mt', label: 'Materiallar', type: 'money' }, { key: 'co', label: 'Jami xarajat', type: 'money' }, { key: 'p', label: 'Foyda', type: 'money' }, { key: 'mg', label: 'Marja %', type: 'pct' }]} rows={() => rows.map((r) => ({ c: r.p.code, n: r.p.name, b: r.p.budget, r: r.revenue, l: r.labor, mt: r.materials + r.subcontract, co: r.cost, p: r.profit, mg: r.margin }))} />} />
      <div className="stagger mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Loyihalar" value={String(rows.length)} sub={`${rows.filter((r) => r.p.status === 'active').length} ta faol`} /><Stat label="Tushum" value={m(tot.rev)} /><Stat label="Haqiqiy xarajat" value={m(tot.cost)} sub={`byudjet ${m(tot.budget)}`} /><Stat label="Foyda" value={m(tot.rev - tot.cost)} tone={tot.rev > tot.cost ? 'pos' : 'neg'} sub={`${tot.rev ? (((tot.rev - tot.cost) / tot.rev) * 100).toFixed(1) : 0}% marja`} /></div>
      <Card className="mb-4"><CardHeader title="Rentabellik" subtitle="Tushum vs xarajat tarkibi" />
        <div className="h-[240px]"><ResponsiveContainer><BarChart data={rows.map((r) => ({ n: r.p.code, rev: r.revenue, labor: r.labor, mat: r.materials, sub: r.subcontract }))} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="n" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="rev" name="Tushum" fill={PALETTE[0]} radius={[5, 5, 0, 0]} /><Bar dataKey="labor" name="Mehnat" stackId="c" fill={PALETTE[2]} /><Bar dataKey="mat" name="Materiallar" stackId="c" fill={PALETTE[3]} /><Bar dataKey="sub" name="Subpudrat" stackId="c" fill={PALETTE[5]} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
        <Legend items={[{ label: 'Tushum', color: PALETTE[0] }, { label: 'Mehnat', color: PALETTE[2] }, { label: 'Materiallar', color: PALETTE[3] }, { label: 'Subpudrat', color: PALETTE[5] }]} />
      </Card>
      <div className="stagger grid gap-4 md:grid-cols-2">
        {rows.map((r) => { const over = r.budgetUsed > r.p.progress + 12; return (
          <Card key={r.p.id} hover onClick={() => setView(r.p.id)}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-mono text-[11.5px] text-t3">{r.p.code}</p><h3 className="text-[14px] font-semibold leading-snug text-t1">{r.p.name}</h3><p className="text-[12px] text-t3">{r.customer?.name} · {r.p.manager} · {fmtDate(r.p.start)}–{fmtDate(r.p.end)}</p></div><StatusBadge status={r.p.status} /></div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]"><div><p className="text-t3">Tushum</p><p className="num text-[13px] font-semibold">{m(r.revenue)}</p></div><div><p className="text-t3">Xarajat</p><p className="num text-[13px] font-semibold">{m(r.cost)}</p></div><div><p className="text-t3">Foyda</p><p className={cx('num text-[13px] font-semibold', r.profit >= 0 ? 'text-pos' : 'text-neg')}>{m(r.profit)}</p></div><div><p className="text-t3">Marja</p><p className="num text-[13px] font-semibold">{r.margin.toFixed(1)}%</p></div></div>
            <div className="mt-3 space-y-2"><div><div className="flex justify-between text-[11px] text-t3"><span>Bajarilish</span><span className="num">{r.p.progress}%</span></div><Progress value={r.p.progress} height={5} tone="pos" /></div><div><div className="flex justify-between text-[11px] text-t3"><span>Byudjet sarfi ({m(r.p.budget)})</span><span className={cx('num', over && 'text-neg')}>{r.budgetUsed.toFixed(0)}%</span></div><Progress value={r.budgetUsed} height={5} tone={over ? 'neg' : 'accent'} /></div></div>
            {over && <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-neg"><AlertTriangle className="h-3.5 w-3.5" />Byudjet sarfi bajarilishdan {(r.budgetUsed - r.p.progress).toFixed(0)} p.p. oldinda</p>}
          </Card>
        ); })}
      </div>
      {view && (() => { const r = rows.find((x) => x.p.id === view)!; const lines = linesFor(db.entries, s, ['9130', '9131', '9135', '9030', '9040'], undefined, TODAY).filter((l) => l.projectId === view); const invs = db.invoices.filter((i) => i.projectId === view); return (
        <Drawer open onClose={() => setView(null)} width="max-w-2xl" title={r.p.name} subtitle={`${r.p.code} · ${r.customer?.name}`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Byudjet', r.p.budget], ['Mehnat (fakt/reja)', r.labor], ['Materiallar+subpudrat', r.materials + r.subcontract], ['Foyda', r.profit]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className="num text-[13.5px] font-semibold">{mf(v as number)}</p></div>)}</div>
          <table className="mt-4 w-full text-[12.5px]"><thead className="text-t3"><tr><th className="py-1 text-left">Modda</th><th className="text-right">Byudjet</th><th className="text-right">Fakt</th><th className="text-right">Farq</th></tr></thead><tbody>{[['Mehnat', r.p.budgetLabor, r.labor], ['Materiallar va subpudrat', r.p.budgetMaterials, r.materials + r.subcontract], ['Boshqa', r.p.budget - r.p.budgetLabor - r.p.budgetMaterials, r.other]].map(([l, b, a]) => <tr key={l as string} className="border-t border-line"><td className="py-1.5">{l as string}</td><td className="num text-right">{mf(b as number)}</td><td className="num text-right">{mf(a as number)}</td><td className={cx('num text-right', (a as number) > (b as number) ? 'text-neg' : 'text-pos')}>{mf((a as number) - (b as number))}</td></tr>)}</tbody></table>
          <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Hisob-fakturalar</p>
          <div className="space-y-1">{invs.map((i) => <div key={i.id} className="flex justify-between text-[12.5px]"><span><span className="font-mono">{i.no}</span> <span className="text-t3">· {fmtDate(i.date)}</span></span><span className="num">{mf(i.total)} {invOpen(i) > 0 && <Badge tone="warn">qoldiq {mf(invOpen(i))}</Badge>}</span></div>)}</div>
          <p className="mb-1.5 mt-5 text-[12px] font-semibold uppercase tracking-wide text-t3">Loyiha provodkalari ({lines.length})</p>
          <div className="thin-scroll max-h-72 divide-y divide-line overflow-y-auto">{lines.slice(0, 40).map((l, i) => <div key={i} className="flex items-center gap-2 py-1.5 text-[12px]"><span className="w-16 text-t3">{fmtDate(l.date).slice(0, 5)}</span><span className="font-mono text-t3">{l.account}</span><span className="flex-1 truncate">{ACC[l.account]?.name} — {l.memo}</span><span className="num">{mf(l.debit || l.credit)}</span></div>)}</div>
          <p className="mt-3 text-[11.5px] text-t3">Mehnat xarajatlari ish haqi hisob-kitobida xizmat xodimlarining vaqt taqsimoti bo‘yicha loyihalarga yuklanadi (demo taqsimot koeffitsientlari).</p>
        </Drawer>
      ); })()}
    </div>
  );
}
