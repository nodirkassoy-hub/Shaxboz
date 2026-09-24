'use client';
import { useMemo, useState } from 'react';
import { LineChart as LineIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { monthlySeries, pnl } from '@/lib/core/ledger';
import { monthsBetween, monthLabel, TODAY, fmtDate } from '@/lib/core/dates';
import { byId } from '@/lib/db';
import { PageHeader, Card, CardHeader, Tabs, cx, DemoTag, Stat, Progress, Badge } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { ChartTooltip, useChartFmt, PALETTE, Legend } from '@/components/ui/charts';

type Tab = 'revenue' | 'profit' | 'expenses' | 'cash' | 'customers' | 'products' | 'branches' | 'warehouses' | 'production' | 'people' | 'suppliers';

export default function Analytics() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'revenue');
  return (
    <div>
      <PageHeader title="Biznes analitikasi" crumbs={['Tahlil']} subtitle={<span className="flex items-center gap-2">Barcha grafiklar bosh kitob va sub-kitoblardan hisoblanadi · yuqoridagi filtrlar (kompaniya, filial, davr, valyuta) qo‘llanadi <DemoTag /></span>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'revenue', label: 'Tushum' }, { id: 'profit', label: 'Rentabellik' }, { id: 'expenses', label: 'Xarajatlar' }, { id: 'cash', label: 'Pul oqimi' }, { id: 'customers', label: 'Mijozlar' }, { id: 'products', label: 'Mahsulotlar' }, { id: 'branches', label: 'Filiallar' }, { id: 'warehouses', label: 'Omborlar' }, { id: 'production', label: 'Ishlab chiqarish' }, { id: 'people', label: 'Xodimlar xarajati' }, { id: 'suppliers', label: 'Ta’minotchilar' }]} />
      {tab === 'revenue' && <Revenue />}{tab === 'profit' && <Profit />}{tab === 'expenses' && <Expenses />}{tab === 'cash' && <Cash />}{tab === 'customers' && <Customers />}{tab === 'products' && <Products />}{tab === 'branches' && <Branches />}{tab === 'warehouses' && <Warehouses />}{tab === 'production' && <Production />}{tab === 'people' && <People />}{tab === 'suppliers' && <Suppliers />}
    </div>
  );
}

const useSeries = () => { const { db, s } = useCtx(); return useMemo(() => monthlySeries(db.entries, s, monthsBetween('2026-01-01', TODAY)).map((r) => ({ ...r, label: monthLabel(r.month, true) })), [db, s]); };

function Revenue() {
  const { db, s, from, to, m } = useCtx(); const f = useChartFmt(); const ser = useSeries();
  const byCo = db.companies.filter((c) => s.companyIds.includes(c.id)).map((c) => ({ c, v: pnl(db.entries, { ...s, companyIds: [c.id] }, from, to).revenue }));
  const p = pnl(db.entries, s, from, to);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader title="Oylik tushum va yalpi foyda (2026)" actions={<ExportButton module="analytics" name="tushum-oylar" title="Tushum oylar bo‘yicha" cols={[{ key: 'label', label: 'Oy' }, { key: 'revenue', label: 'Tushum', type: 'money' }, { key: 'gross', label: 'Yalpi foyda', type: 'money' }, { key: 'net', label: 'Sof foyda', type: 'money' }]} rows={() => ser as never} />} />
        <div className="h-[300px]"><ResponsiveContainer><ComposedChart data={ser} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="revenue" name="Tushum" fill={PALETTE[0]} radius={[6, 6, 0, 0]} /><Line dataKey="gross" name="Yalpi foyda" stroke={PALETTE[1]} strokeWidth={2.2} /></ComposedChart></ResponsiveContainer></div>
      </Card>
      <Card><CardHeader title="Kompaniyalar ulushi" subtitle={`${fmtDate(from)}–${fmtDate(to)}`} />
        <div className="h-[200px]"><ResponsiveContainer><PieChart><Pie data={byCo.map((x) => ({ n: x.c.name, v: x.v }))} dataKey="v" nameKey="n" innerRadius={50} outerRadius={80} paddingAngle={3}>{byCo.map((x) => <Cell key={x.c.id} fill={x.c.color} />)}</Pie><Tooltip content={<ChartTooltip fmt={f.tip} />} /></PieChart></ResponsiveContainer></div>
        <div className="space-y-1.5">{byCo.map((x) => <div key={x.c.id} className="flex justify-between text-[12.5px]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: x.c.color }} />{x.c.name}</span><span className="num">{m(x.v)} · {p.revenue ? ((x.v / p.revenue) * 100).toFixed(0) : 0}%</span></div>)}</div>
      </Card>
    </div>
  );
}

function Profit() {
  const f = useChartFmt(); const ser = useSeries().map((r) => ({ ...r, gm: r.revenue ? (r.gross / r.revenue) * 100 : 0, nm: r.revenue ? (r.net / r.revenue) * 100 : 0 }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Foyda dinamikasi" /><div className="h-[280px]"><ResponsiveContainer><ComposedChart data={ser} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Area dataKey="gross" name="Yalpi foyda" fill={PALETTE[3]} fillOpacity={0.15} stroke={PALETTE[3]} /><Bar dataKey="net" name="Sof foyda" fill={PALETTE[1]} radius={[5, 5, 0, 0]} /></ComposedChart></ResponsiveContainer></div></Card>
      <Card><CardHeader title="Marjalar, %" /><div className="h-[280px]"><ResponsiveContainer><ComposedChart data={ser} margin={{ left: -16 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} unit="%" /><Tooltip content={<ChartTooltip fmt={(v) => `${v.toFixed(1)}%`} />} /><Line dataKey="gm" name="Yalpi marja" stroke={PALETTE[0]} strokeWidth={2.2} /><Line dataKey="nm" name="Sof marja" stroke={PALETTE[1]} strokeWidth={2.2} /></ComposedChart></ResponsiveContainer></div><p className="text-[11.5px] text-t3">Joriy oy qisman (ish haqi va amortizatsiya oy oxirida hisoblanadi) — sof marja vaqtincha yuqoriroq ko‘rinadi.</p></Card>
    </div>
  );
}

function Expenses() {
  const { db, s, from, to, m } = useCtx(); const f = useChartFmt();
  const cats = useMemo(() => A.expenseByCategory(db, s, from, to), [db, s, from, to]);
  const pp = A.prevPeriod(from, to); const prev = useMemo(() => A.expenseByCategory(db, s, pp.from, pp.to), [db, s, pp.from, pp.to]);
  const ser = useSeries();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card><CardHeader title="Xarajatlar tarkibi" subtitle={`${fmtDate(from)}–${fmtDate(to)}`} /><div className="h-[220px]"><ResponsiveContainer><PieChart><Pie data={cats} dataKey="amount" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>{cats.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip content={<ChartTooltip fmt={f.tip} />} /></PieChart></ResponsiveContainer></div>
        <div className="space-y-1">{cats.map((c, i) => <div key={c.id} className="flex justify-between text-[12px]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{c.label}</span><span className="num">{m(c.amount)}</span></div>)}</div></Card>
      <Card className="lg:col-span-2"><CardHeader title="O‘zgarish: joriy vs oldingi davr" subtitle={`${fmtDate(pp.from)}–${fmtDate(pp.to)} bilan`} />
        <DataTable rows={cats.map((c) => { const p = prev.find((x) => x.id === c.id)?.amount || 0; return { ...c, prev: p, d: c.amount - p, pct: p ? ((c.amount - p) / p) * 100 : 100 }; }).sort((a, b) => b.d - a.d)} rowKey={(r) => r.id} dense cols={[{ key: 'l', header: 'Kategoriya', primary: true, cell: (r) => r.label }, { key: 'p', header: 'Oldingi', align: 'right', cell: (r) => m(r.prev) }, { key: 'c', header: 'Joriy', align: 'right', cell: (r) => m(r.amount) }, { key: 'd', header: 'Farq', align: 'right', cell: (r) => <span className={r.d > 0 ? 'text-neg' : 'text-pos'}>{r.d > 0 ? '+' : ''}{m(r.d)} ({r.pct.toFixed(0)}%)</span>, sort: (r) => r.d }]} />
        <div className="mt-4 h-[180px]"><ResponsiveContainer><BarChart data={ser} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="cogs" name="Tannarx" stackId="a" fill={PALETTE[4]} fillOpacity={0.7} /><Bar dataKey="opex" name="Operatsion" stackId="a" fill={PALETTE[2]} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
    </div>
  );
}

function Cash() {
  const f = useChartFmt(); const ser = useSeries().map((r) => ({ ...r, out: -r.cashOut }));
  return (
    <Card><CardHeader title="Oylik pul kirimi, chiqimi va qoldiq" subtitle="Ichki o‘tkazmalar chiqarilgan" />
      <div className="h-[320px]"><ResponsiveContainer><ComposedChart data={ser} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="cashIn" name="Kirim" fill={PALETTE[1]} radius={[5, 5, 0, 0]} /><Bar dataKey="out" name="Chiqim" fill={PALETTE[4]} radius={[0, 0, 5, 5]} /><Line dataKey="cashEnd" name="Oy oxiri qoldig‘i" stroke={PALETTE[0]} strokeWidth={2.4} /></ComposedChart></ResponsiveContainer></div>
      <Legend items={[{ label: 'Kirim', color: PALETTE[1] }, { label: 'Chiqim', color: PALETTE[4] }, { label: 'Qoldiq', color: PALETTE[0] }]} />
    </Card>
  );
}

function Customers() {
  const { db, s, from, to, m } = useCtx(); const f = useChartFmt();
  const rows = useMemo(() => A.customerProfit(db, s, from, to), [db, s, from, to]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Tushum vs marja (pufak = qarz)" subtitle="O‘ng-yuqori — eng qimmatli mijozlar" /><div className="h-[300px]"><ResponsiveContainer><ScatterChart margin={{ left: -4 }}><CartesianGrid /><XAxis type="number" dataKey="revenue" name="Tushum" tickFormatter={f.axis} axisLine={false} tickLine={false} /><YAxis type="number" dataKey="margin" name="Marja" unit="%" axisLine={false} tickLine={false} width={40} /><ZAxis type="number" dataKey="open" range={[60, 600]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => payload?.[0] ? <div className="rounded-xl border border-line bg-surface-solid p-2.5 text-[12px] shadow-pop"><b>{(payload[0].payload as { name: string }).name}</b><br />Tushum {m((payload[0].payload as { revenue: number }).revenue)}<br />Marja {(payload[0].payload as { margin: number }).margin.toFixed(1)}%<br />Qarz {m((payload[0].payload as { open: number }).open)}</div> : null} /><Scatter data={rows} fill={PALETTE[0]} fillOpacity={0.6} /></ScatterChart></ResponsiveContainer></div></Card>
      <Card><CardHeader title="Mijozlar reytingi" actions={<ExportButton module="analytics" name="mijozlar" title="Mijozlar rentabelligi" cols={[{ key: 'name', label: 'Mijoz' }, { key: 'revenue', label: 'Tushum', type: 'money' }, { key: 'gross', label: 'Yalpi foyda', type: 'money' }, { key: 'margin', label: 'Marja', type: 'pct' }, { key: 'open', label: 'Qarz', type: 'money' }]} rows={() => rows as never} />} />
        <DataTable rows={rows} rowKey={(r) => r.id} pageSize={10} dense cols={[{ key: 'n', header: 'Mijoz', primary: true, cell: (r) => r.name }, { key: 'r', header: 'Tushum', align: 'right', cell: (r) => m(r.revenue), sort: (r) => r.revenue }, { key: 'm', header: 'Marja', align: 'right', cell: (r) => `${r.margin.toFixed(1)}%`, sort: (r) => r.margin }, { key: 'o', header: 'Muddati o‘tgan', align: 'right', cell: (r) => (r.overdue ? <span className="text-neg">{m(r.overdue)}</span> : '—'), sort: (r) => r.overdue }]} /></Card>
    </div>
  );
}

function Products() {
  const { db, s, from, to, m } = useCtx(); const f = useChartFmt();
  const rows = useMemo(() => A.productProfit(db, s, from, to), [db, s, from, to]);
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3"><CardHeader title="Mahsulotlar bo‘yicha yalpi foyda" /><div className="h-[340px]"><ResponsiveContainer><BarChart data={rows.slice(0, 12).map((r) => ({ n: r.p.sku.replace(/^(TRD|FG|SRV)-/, ''), g: r.gross, c: r.cogs }))} layout="vertical" margin={{ left: 10 }}><CartesianGrid horizontal={false} /><XAxis type="number" tickFormatter={f.axis} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="n" width={70} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="c" name="Tannarx" stackId="a" fill="var(--text-3)" fillOpacity={0.3} /><Bar dataKey="g" name="Yalpi foyda" stackId="a" fill={PALETTE[1]} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="lg:col-span-2"><CardHeader title="Marja reytingi" /><div className="space-y-2">{[...rows].sort((a, b) => b.margin - a.margin).map((r) => <div key={r.p.id}><div className="flex justify-between text-[12px]"><span className="truncate">{r.p.name}</span><span className={cx('num font-semibold', r.margin < 30 ? 'text-warn' : 'text-t1')}>{r.margin.toFixed(1)}%</span></div><Progress value={r.margin} height={4} tone={r.margin < 30 ? 'warn' : 'pos'} /></div>)}</div></Card>
    </div>
  );
}

function Branches() {
  const { db, s, from, to, m } = useCtx(); const f = useChartFmt();
  const rows = useMemo(() => A.branchProfit(db, s, from, to), [db, s, from, to]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Filiallar: tushum va sof foyda" /><div className="h-[280px]"><ResponsiveContainer><BarChart data={rows.map((r) => ({ n: r.branch.name, r: r.revenue, net: r.net }))} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="n" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="r" name="Tushum" fill={PALETTE[0]} radius={[5, 5, 0, 0]} /><Bar dataKey="net" name="Sof foyda" fill={PALETTE[1]} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card><CardHeader title="Filiallar P&L" /><DataTable rows={rows} rowKey={(r) => r.branch.id} dense cols={[{ key: 'b', header: 'Filial', primary: true, cell: (r) => r.branch.name }, { key: 'r', header: 'Tushum', align: 'right', cell: (r) => m(r.revenue) }, { key: 'g', header: 'Yalpi', align: 'right', cell: (r) => m(r.gross) }, { key: 'o', header: 'Xarajat', align: 'right', cell: (r) => m(r.opex) }, { key: 'n', header: 'Sof', align: 'right', cell: (r) => <b className={r.net >= 0 ? 'text-pos' : 'text-neg'}>{m(r.net)}</b> }, { key: 'm', header: 'Marja', align: 'right', cell: (r) => `${r.margin.toFixed(1)}%` }]} /><p className="mt-2 text-[11.5px] text-t3">Markaziy xarajatlar (ma’muriyat, ish haqi) Toshkent filialida qayd etiladi; taqsimlanmagan.</p></Card>
    </div>
  );
}

function Warehouses() {
  const { db, s, m } = useCtx();
  const rows = db.warehouses.filter((w) => s.companyIds.includes(w.companyId)).map((w) => { const st = A.stockRows(db, s, w.id); const val = st.reduce((a, r) => a + r.value, 0); const out = db.moves.filter((x) => x.warehouseId === w.id && x.qty < 0 && x.date >= '2026-06-25' && (x.kind === 'issue' || x.kind === 'production_out')).reduce((a, x) => a + x.cost, 0); return { w, val, out, turns: val ? (out / val) * 4 : 0, low: st.filter((r) => r.status === 'low' || r.status === 'out').length, over: st.filter((r) => r.status === 'over').length, moves: db.moves.filter((x) => x.warehouseId === w.id && x.date >= '2026-08-24').length }; });
  return (
    <Card><CardHeader title="Omborlar samaradorligi" subtitle="Aylanma = oxirgi 90 kunlik chiqim tannarxi / joriy zaxira × 4 (yillik)" />
      <DataTable rows={rows} rowKey={(r) => r.w.id} cols={[{ key: 'w', header: 'Ombor', primary: true, cell: (r) => r.w.name }, { key: 'v', header: 'Zaxira qiymati', align: 'right', cell: (r) => m(r.val) }, { key: 'o', header: 'Chiqim (90 kun)', align: 'right', cell: (r) => m(r.out) }, { key: 't', header: 'Yillik aylanma', align: 'right', cell: (r) => <b>{r.turns.toFixed(1)}×</b>, sort: (r) => r.turns }, { key: 'd', header: 'Zaxira kunlari', align: 'right', cell: (r) => (r.turns ? `${Math.round(365 / r.turns)} kun` : '—') }, { key: 'l', header: 'Kam', align: 'right', cell: (r) => r.low }, { key: 'ov', header: 'Ortiqcha', align: 'right', cell: (r) => r.over }, { key: 'm', header: 'Harakatlar (30 kun)', align: 'right', cell: (r) => r.moves }]} />
    </Card>
  );
}

function Production() {
  const { db, m } = useCtx(); const f = useChartFmt();
  const months = monthsBetween('2026-01-01', TODAY);
  const data = months.map((mk) => { const st = A.productionStats(db, ['fac'], mk + '-01', mk + '-31'); return { label: monthLabel(mk, true), good: st.good, scrap: st.scrap, pct: st.scrapPct, unit: st.good ? st.cost / st.good : 0, attainment: st.attainment }; });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Ishlab chiqarish hajmi va brak" subtitle="Balans Factory, dona" /><div className="h-[280px]"><ResponsiveContainer><ComposedChart data={data} margin={{ left: -10 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis yAxisId="a" axisLine={false} tickLine={false} /><YAxis yAxisId="b" orientation="right" axisLine={false} tickLine={false} unit="%" /><Tooltip content={<ChartTooltip fmt={(v) => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} />} /><Bar yAxisId="a" dataKey="good" name="Yaroqli" fill={PALETTE[1]} radius={[5, 5, 0, 0]} /><Bar yAxisId="a" dataKey="scrap" name="Brak" fill={PALETTE[4]} radius={[5, 5, 0, 0]} /><Line yAxisId="b" dataKey="pct" name="Brak %" stroke={PALETTE[2]} strokeWidth={2} /></ComposedChart></ResponsiveContainer></div></Card>
      <Card><CardHeader title="Reja bajarilishi, %" /><div className="h-[280px]"><ResponsiveContainer><BarChart data={data} margin={{ left: -16 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} unit="%" /><Tooltip content={<ChartTooltip fmt={(v) => `${v.toFixed(0)}%`} />} /><Bar dataKey="attainment" name="Bajarilish" radius={[5, 5, 0, 0]}>{data.map((d, i) => <Cell key={i} fill={d.attainment >= 90 ? PALETTE[1] : PALETTE[2]} />)}</Bar></BarChart></ResponsiveContainer></div></Card>
    </div>
  );
}

function People() {
  const { db, s, m } = useCtx(); const f = useChartFmt();
  const runs = db.payrollRuns.filter((r) => s.companyIds.includes(r.companyId));
  const months = [...new Set(runs.map((r) => r.period))].sort();
  const data = months.map((p) => { const rs = runs.filter((r) => r.period === p); return { label: monthLabel(p, true), gross: rs.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.gross + l.bonus, 0), 0), social: rs.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.social, 0), 0), n: rs.reduce((a, r) => a + r.lines.length, 0) }; });
  const rev = pnl(db.entries, s, '2026-01-01', TODAY).revenue; const cost = data.reduce((a, d) => a + d.gross + d.social, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3"><Stat label="Mehnat xarajatlari (YTD)" value={m(cost)} sub="ish haqi + ijtimoiy soliq" /><Stat label="Tushumga nisbatan" value={`${rev ? ((cost / rev) * 100).toFixed(1) : 0}%`} /><Stat label="Bir xodimga tushum (YTD)" value={m(rev / Math.max(1, db.employees.filter((e) => s.companyIds.includes(e.companyId)).length))} /></div>
      <Card className="lg:col-span-2"><CardHeader title="Oylik mehnat xarajatlari" /><div className="h-[280px]"><ResponsiveContainer><BarChart data={data} margin={{ left: -4 }}><CartesianGrid vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} /><Tooltip content={<ChartTooltip fmt={f.tip} />} /><Bar dataKey="gross" name="Ish haqi + bonus" stackId="a" fill={PALETTE[0]} /><Bar dataKey="social" name="Ijtimoiy soliq" stackId="a" fill={PALETTE[5]} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </div>
  );
}

function Suppliers() {
  const { db, s, from, to, m } = useCtx();
  const rows = useMemo(() => A.supplierSpend(db, s, '2026-01-01', TODAY), [db, s]);
  const tot = rows.reduce((a, r) => a + r.spend, 0);
  return (
    <Card><CardHeader title="Ta’minotchilar tahlili (YTD)" subtitle="Xarajat ulushi, o‘z vaqtida yetkazish, ochiq qarz" />
      <DataTable rows={rows} rowKey={(r) => r.id} cols={[{ key: 'n', header: 'Ta’minotchi', primary: true, cell: (r) => <div><p>{r.name}</p><p className="text-[11px] text-t3">{r.category}</p></div> }, { key: 's', header: 'Xarid', align: 'right', cell: (r) => m(r.spend), sort: (r) => r.spend }, { key: 'sh', header: 'Ulush', cell: (r) => <div className="w-28"><Progress value={tot ? (r.spend / tot) * 100 : 0} height={4} /><span className="text-[10.5px] text-t3">{tot ? ((r.spend / tot) * 100).toFixed(1) : 0}%</span></div> }, { key: 't', header: 'O‘z vaqtida', align: 'right', cell: (r) => (r.deliveries ? <Badge tone={r.onTime / r.deliveries >= 0.7 ? 'pos' : 'warn'}>{((r.onTime / r.deliveries) * 100).toFixed(0)}%</Badge> : '—') }, { key: 'o', header: 'Ochiq qarz', align: 'right', cell: (r) => m(r.open) }]} />
      <p className="mt-2 text-[11px] text-t3">Joriy filtr davri: {fmtDate(from)}–{fmtDate(to)} (bu jadval yil boshidan)</p>
    </Card>
  );
}
