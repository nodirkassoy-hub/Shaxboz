'use client';
import { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, PieChart, Pie, Cell, ReferenceLine, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Factory, Boxes, Receipt, Sparkles, ArrowRight, CheckCheck, Landmark, Clock, Gauge, Truck, PackageCheck, ArrowLeftRight, Lock, Building2, ChevronRight, Percent, Target, Activity } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from './hooks';
import * as A from '@/lib/analytics';
import { insightCards } from '@/lib/ai';
import { monthlySeries, pnl, balances } from '@/lib/core/ledger';
import { monthsBetween, monthLabel, TODAY, fmtDate, diffDays, addDays, monthKey, monthStart } from '@/lib/core/dates';
import { Card, CardHeader, Badge, Button, Delta, Spark, CountUp, Progress, StatusBadge, cx, Explain, Segmented, DemoTag, Avatar } from '@/components/ui';
import { ChartTooltip, Legend, useChartFmt, PALETTE } from '@/components/ui/charts';
import { canDecide } from '@/lib/rbac';
import { byId, docTotals, invOpen } from '@/lib/db';
import { INSIGHT_META } from '@/components/ai/Chat';
import { woRequirements, reservedQty } from '@/lib/ops';

// ─── KPI grid ─────────────────────────────────────────────────
const KPI_META: Record<string, { label: string; icon: typeof Wallet; explain: string; color: string; module: string; tab?: string }> = {
  revenue: { label: 'Tushum', icon: TrendingUp, explain: 'Sotilgan tovar va xizmatlar summasi (QQSsiz), hisob-faktura sanasi bo‘yicha.', color: '#6d6df5', module: 'analytics', tab: 'revenue' },
  expenses: { label: 'Xarajatlar', icon: TrendingDown, explain: 'Sotish tannarxi + operatsion + moliyaviy xarajatlar + foyda solig‘i.', color: '#ef4444', module: 'analytics', tab: 'expenses' },
  gross: { label: 'Yalpi foyda', icon: Percent, explain: 'Tushum minus sotilgan mahsulot tannarxi. Mahsulotning o‘zi qancha foyda berishini ko‘rsatadi.', color: '#06b6d4', module: 'reports' },
  net: { label: 'Sof foyda', icon: Target, explain: 'Barcha xarajatlar va soliqlardan keyin qolgan foyda.', color: '#10b981', module: 'reports' },
  cash: { label: 'Pul qoldig‘i', icon: Wallet, explain: 'Kassa va bank hisoblaridagi real pul (davr oxiriga).', color: '#0ea5e9', module: 'finance', tab: 'treasury' },
  ar: { label: 'Debitorlik', icon: Receipt, explain: 'Mijozlar hali to‘lamagan summalar (QQS bilan).', color: '#f59e0b', module: 'finance', tab: 'ar' },
  ap: { label: 'Kreditorlik', icon: Truck, explain: 'Ta’minotchilarga to‘lanishi kerak bo‘lgan summalar (QQS bilan).', color: '#a855f7', module: 'finance', tab: 'ap' },
  inventory: { label: 'Zaxira qiymati', icon: Boxes, explain: 'Omborlardagi tovar, xomashyo va tayyor mahsulotning tannarx bo‘yicha qiymati.', color: '#84cc16', module: 'inventory' },
  tax: { label: 'Soliq majburiyati', icon: Landmark, explain: 'Byudjetga to‘lanishi kerak bo‘lgan hisoblangan soliqlar (QQS, JShDS, ijtimoiy, foyda).', color: '#ec4899', module: 'taxes' },
};

export function KpiGrid({ ids }: { ids: string[] }) {
  const { db, s, from, to, m } = useCtx(); const go = useApp((x) => x.go);
  const k = useMemo(() => A.kpis(db, s, from, to), [db, s, from, to]);
  const items = ids.map((id) => k.list.find((x) => x.id === id)!).filter(Boolean);
  const prevLabel = `${fmtDate(k.prev.from).slice(0, 5)}–${fmtDate(k.prev.to).slice(0, 5)}`;
  return (
    <div className={cx('stagger grid grid-cols-2 gap-3', ids.length > 6 ? 'md:grid-cols-3 min-[1900px]:grid-cols-9' : ids.length === 4 ? 'lg:grid-cols-4' : 'md:grid-cols-3 xl:grid-cols-6')}>
      {items.map((x) => {
        const meta = KPI_META[x.id]; const Icon = meta.icon; const good = x.good === 'up' ? x.change >= 0 : x.change <= 0;
        const status = Math.abs(x.change) < 3 ? 'Barqaror' : good ? 'Yaxshi' : 'E’tibor';
        return (
          <Card key={x.id} hover onClick={() => go(meta.module as never, meta.tab)} className="group !p-4">
            <div className="flex items-center justify-between">
              <span className="flex min-w-0 items-center truncate text-[12px] font-medium text-t3"><Icon className="mr-1.5 h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />{meta.label}<span className="hidden sm:inline"><Explain term={meta.label}>{meta.explain}</Explain></span></span>
              <span className={cx('hidden rounded-md px-1.5 text-[10px] font-semibold leading-[18px] sm:inline', status === 'Barqaror' ? 'bg-surface-3 text-t3' : good ? 'bg-pos/10 text-pos' : 'bg-neg/10 text-neg')}>{status}</span>
            </div>
            <div className="mt-2 whitespace-nowrap text-[17px] font-semibold tracking-[-0.025em] text-t1 sm:text-[21px]"><CountUp value={x.value} format={m} /></div>
            <div className="mt-0.5 flex items-center gap-2"><Delta v={x.change} good={x.good} /><span className="hidden truncate text-[11px] text-t3 sm:inline">vs {m(x.prev)} ({prevLabel})</span></div>
            <div className="mt-2 -mb-1 opacity-80 transition group-hover:opacity-100"><Spark data={x.series} color={meta.color} height={30} /></div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Command center (What's happening / Attention / Next) ─────
export function CommandCenter() {
  const { db, s, from, to, m, filters } = useCtx(); const { go, role, openAi } = useApp();
  const k = useMemo(() => A.kpis(db, s, from, to), [db, s, from, to]);
  const alerts = useMemo(() => A.deriveAlerts(db, s), [db, s]);
  const prod = useMemo(() => A.productionStats(db, s.companyIds, monthStart(TODAY), TODAY), [db, s]);
  const g = (id: string) => k.list.find((x) => x.id === id)!;
  const nextTax = db.taxObligations.filter((o) => o.status !== 'paid' && s.companyIds.includes(o.companyId)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0];
  const approvals = db.approvals.filter((a) => a.status === 'pending' && s.companyIds.includes(a.companyId) && canDecide(role, a.approverRole));
  const ag = useMemo(() => A.arAging(db, s), [db, s]);
  const agPrev = useMemo(() => A.arAging(db, s, addDays(TODAY, -30)), [db, s]);
  const over30 = ag.buckets.d60 + ag.buckets.d60p; const over30p = agPrev.buckets.d60 + agPrev.buckets.d60p;
  const lowRaw = A.stockRows(db, s).filter((r) => r.status === 'low' || r.status === 'out');
  const happening = [
    { label: 'Tushum', v: g('revenue').change, good: 'up' as const, sub: m(g('revenue').value) },
    { label: 'Sof foyda', v: g('net').change, good: 'up' as const, sub: m(g('net').value) },
    { label: 'Pul', v: g('cash').change, good: 'up' as const, sub: m(g('cash').value) },
    ...(s.companyIds.includes('fac') ? [{ label: 'Ishlab chiqarish rejasi', v: prod.attainment - 100, good: 'up' as const, sub: `${prod.attainment.toFixed(0)}% bajarildi`, raw: true }] : []),
  ];
  const attention = [
    ...(ag.overdue > 0 ? [{ c: 'red', text: `${ag.rows.filter((r) => r.overdue > 0).length} ta muddati o‘tgan hisob-faktura · ${m(ag.overdue)}`, go: () => go('finance', 'ar') }] : []),
    ...(lowRaw.length ? [{ c: 'orange', text: `${lowRaw.length} ta pozitsiyada zaxira kam: ${lowRaw.slice(0, 2).map((r) => r.p.name).join(', ')}`, go: () => go('inventory', 'stock') }] : []),
    ...(nextTax ? [{ c: 'yellow', text: `${byId(db.taxTypes, nextTax.taxId)?.name.split(' (')[0]} to‘lovi ${diffDays(nextTax.dueDate, TODAY)} kundan keyin · ${m(nextTax.amount)}`, go: () => go('taxes') }] : []),
    ...(approvals.length ? [{ c: 'blue', text: `${approvals.length} ta so‘rov sizning tasdig‘ingizni kutmoqda`, go: () => go('approvals') }] : []),
    ...alerts.filter((a) => a.kind === 'budget' || a.kind === 'cash').slice(0, 2).map((a) => ({ c: 'orange', text: a.title, go: () => go(a.module as never, a.tab) })),
  ];
  const rec = over30 > over30p
    ? { text: `30 kundan ortiq muddati o‘tgan debitorlik bu oy ${m(over30p)} dan ${m(over30)} gacha oshdi. Eng katta 5 ta qarzdorni ko‘rib chiqing.`, prompt: 'Qaysi mijozlardan pul olishimiz kerak?' }
    : { text: `Muddati o‘tgan debitorlik ${m(ag.overdue)}. Yig‘ish rejasini tuzing va xarajatlar oshgan joylarni tekshiring.`, prompt: 'Xarajatlar qayerda oshgan?' };
  const dotC: Record<string, string> = { red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-500', blue: 'bg-sky-500' };
  return (
    <Card className="overflow-hidden !p-0">
      <div className="grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="p-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-t3"><Activity className="h-3.5 w-3.5 text-accent" />Nima bo‘lyapti?</p>
          <div className="space-y-2.5">
            {happening.map((h) => (
              <div key={h.label} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-t2">{h.label}</span>
                <span className="flex items-center gap-2"><span className="num text-[12px] text-t3">{h.sub}</span>{'raw' in h ? <Badge tone={h.v >= -8 ? 'pos' : 'warn'}>{(h.v + 100).toFixed(0)}%</Badge> : <Delta v={h.v} good={h.good} className="text-[13px]" />}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-t3"><AlertTriangle className="h-3.5 w-3.5 text-warn" />Nimaga e’tibor kerak?</p>
          <div className="space-y-1">
            {attention.slice(0, 5).map((a, i) => (
              <button key={i} onClick={a.go} className="group flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-surface-2">
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotC[a.c])} /><span className="flex-1 text-[12.8px] leading-snug text-t1">{a.text}</span><ChevronRight className="mt-0.5 h-3.5 w-3.5 text-t3 opacity-0 group-hover:opacity-100" />
              </button>
            ))}
            {!attention.length && <p className="text-[12.5px] text-t3">Hammasi joyida ✓</p>}
          </div>
        </div>
        <div className="bg-gradient-to-br from-accent/[.07] to-transparent p-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-t3"><Sparkles className="h-3.5 w-3.5 text-accent" />Keyin nima qilish kerak?</p>
          <div className="rounded-2xl border border-accent/20 bg-surface-solid/60 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5"><Badge tone="accent">AI TAVSIYA</Badge><DemoTag /></div>
            <p className="text-[13px] leading-relaxed text-t1">{rec.text}</p>
            <div className="mt-3 flex flex-wrap gap-1.5"><Button size="xs" variant="primary" onClick={() => openAi(rec.prompt)}>Tahlilni ko‘rish</Button><Button size="xs" onClick={() => go('finance', 'ar')}>Debitorlik</Button>{approvals.length > 0 && <Button size="xs" onClick={() => go('approvals')}>Tasdiqlash ({approvals.length})</Button>}</div>
          </div>
          <p className="mt-2 text-[10.5px] text-t3">Kontekst: {filters.companyId === 'all' ? 'BALANS GROUP' : byId(db.companies, filters.companyId)?.name}</p>
        </div>
      </div>
    </Card>
  );
}

// ─── Revenue / expense / profit trend ─────────────────────────
export function TrendChart() {
  const { db, s } = useCtx(); const f = useChartFmt();
  const [mode, setMode] = useState<'rev' | 'exp' | 'profit'>('rev');
  const months = monthsBetween('2026-01-01', TODAY);
  const rows = useMemo(() => monthlySeries(db.entries, s, months).map((r) => ({ ...r, label: monthLabel(r.month, true), exp: r.cogs + r.opex, partial: r.month === monthKey(TODAY) })), [db, s]); // eslint-disable-line react-hooks/exhaustive-deps
  const budget = useMemo(() => months.map((mk) => db.budgets.filter((b) => s.companyIds.includes(b.companyId) && b.year === 2026 && b.month === +mk.slice(5)).reduce((a, b) => a + b.amount, 0)), [db, s]); // eslint-disable-line react-hooks/exhaustive-deps
  const data = rows.map((r, i) => ({ ...r, budgetOpex: budget[i] }));
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Moliyaviy dinamika" subtitle={`2026 yil, oylar kesimida · ${monthLabel(monthKey(TODAY))} — ${fmtDate(TODAY)} gacha`} icon={<TrendingUp className="h-4 w-4" />}
        actions={<Segmented size="xs" value={mode} onChange={setMode} options={[{ id: 'rev', label: 'Tushum' }, { id: 'exp', label: 'Xarajat' }, { id: 'profit', label: 'Foyda' }]} />} />
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: -8, right: 6, top: 6 }}>
            <defs>
              <linearGradient id="gRev" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={PALETTE[0]} stopOpacity=".35" /><stop offset="1" stopColor={PALETTE[0]} stopOpacity="0" /></linearGradient>
              <linearGradient id="gNet" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={PALETTE[1]} stopOpacity=".3" /><stop offset="1" stopColor={PALETTE[1]} stopOpacity="0" /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<ChartTooltip fmt={f.tip} />} cursor={{ stroke: 'var(--border-strong)' }} />
            {mode === 'rev' && <Area type="monotone" dataKey="revenue" name="Tushum" stroke={PALETTE[0]} strokeWidth={2.4} fill="url(#gRev)" animationDuration={700} />}
            {mode === 'rev' && <Line type="monotone" dataKey="gross" name="Yalpi foyda" stroke={PALETTE[3]} strokeWidth={1.8} dot={false} />}
            {mode === 'exp' && <Bar dataKey="cogs" name="Sotish tannarxi" stackId="e" fill={PALETTE[4]} fillOpacity={0.75} />}
            {mode === 'exp' && <Bar dataKey="opex" name="Operatsion" stackId="e" fill={PALETTE[2]} radius={[6, 6, 0, 0]} />}
            {mode === 'exp' && <Line dataKey="budgetOpex" name="Byudjet (operatsion)" stroke="var(--text-3)" strokeDasharray="4 4" dot={false} />}
            {mode === 'profit' && <Area type="monotone" dataKey="net" name="Sof foyda" stroke={PALETTE[1]} strokeWidth={2.4} fill="url(#gNet)" />}
            {mode === 'profit' && <ReferenceLine y={0} stroke="var(--border-strong)" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between"><Legend items={mode === 'rev' ? [{ label: 'Tushum', color: PALETTE[0] }, { label: 'Yalpi foyda', color: PALETTE[3] }] : mode === 'exp' ? [{ label: 'Tannarx', color: PALETTE[4] }, { label: 'Operatsion', color: PALETTE[2] }, { label: 'Byudjet', color: 'var(--text-3)', dashed: true }] : [{ label: 'Sof foyda', color: PALETTE[1] }]} /><DemoTag /></div>
    </Card>
  );
}

// ─── Cash flow chart + forecast ───────────────────────────────
export function CashWidget() {
  const { db, s, m } = useCtx(); const f = useChartFmt(); const go = useApp((x) => x.go);
  const [h, setH] = useState<30 | 60 | 90>(30);
  const fc = useMemo(() => A.cashForecast(db, s, 90), [db, s]);
  const hist = useMemo(() => { const out: { date: string; actual?: number; forecast?: number }[] = []; for (let i = 45; i >= 0; i -= 3) { const d = addDays(TODAY, -i); const b = balances(db.entries, s, undefined, d); out.push({ date: d, actual: (b['5010'] || 0) + (b['5110'] || 0) + (b['5210'] || 0) }); } return out; }, [db, s]);
  const data: { date: string; actual?: number; forecast?: number }[] = [...hist, ...fc.days.slice(0, h).filter((_, i) => i % 2 === 1).map((d) => ({ date: d.date, forecast: d.balance }))];
  data[hist.length - 1] = { ...data[hist.length - 1], forecast: data[hist.length - 1].actual };
  const end = h === 30 ? fc.d30 : h === 60 ? fc.d60 : fc.d90;
  return (
    <Card>
      <CardHeader title={<span className="flex items-center">Pul oqimi va prognoz<Explain term="Cash Flow">biznesga kirayotgan va chiqayotgan real pul oqimi. Prognoz — ochiq hisob-fakturalar, to‘lov muddatlari va oxirgi 90 kun sur’atiga asoslangan taxmin.</Explain></span>} subtitle="Kassa + bank qoldig‘i" icon={<Wallet className="h-4 w-4" />}
        actions={<Segmented size="xs" value={String(h) as '30'} onChange={(v) => setH(+v as 30)} options={[{ id: '30', label: '30k' }, { id: '60', label: '60k' }, { id: '90', label: '90k' }]} />} />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">Bugun <DemoTag kind="fact" className="ml-1" /></p><p className="num text-[16px] font-semibold text-t1">{m(fc.start)}</p></div>
        <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{h} kundan keyin <DemoTag kind="estimate" className="ml-1" /></p><p className="num text-[16px] font-semibold text-t1">{m(end.balance)}</p></div>
      </div>
      <div className="h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -8, right: 4 }}>
            <defs><linearGradient id="gCash" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0ea5e9" stopOpacity=".35" /><stop offset="1" stopColor="#0ea5e9" stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d).slice(0, 5)} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={f.axis} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<ChartTooltip fmt={f.tip} labelFmt={(l) => fmtDate(l)} />} />
            <ReferenceLine x={TODAY} stroke="var(--border-strong)" label={{ value: 'bugun', position: 'insideTopRight', fontSize: 10, fill: 'var(--text-3)' }} />
            <Area dataKey="actual" name="Fakt" stroke="#0ea5e9" strokeWidth={2.2} fill="url(#gCash)" connectNulls />
            <Area dataKey="forecast" name="Prognoz (taxmin)" stroke="#0ea5e9" strokeDasharray="5 4" strokeWidth={1.8} fill="transparent" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <button onClick={() => go('finance', 'treasury')} className="mt-2 flex items-center gap-1 text-[12px] font-medium text-accent">G‘aznachilik va to‘lov kalendari <ArrowRight className="h-3.5 w-3.5" /></button>
    </Card>
  );
}

// ─── "Bugun nima muhim?" ─────────────────────────────────────
export function AttentionList({ limit = 7 }: { limit?: number }) {
  const { db, s } = useCtx(); const { go, dispatch } = useApp();
  const alerts = useMemo(() => A.deriveAlerts(db, s), [db, s]);
  const lvl: Record<string, string> = { red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-500', blue: 'bg-sky-500', green: 'bg-emerald-500' };
  return (
    <Card>
      <CardHeader title="Bugun nima muhim?" subtitle={`${alerts.length} ta signal · ogohlantirish qoidalari asosida`} icon={<AlertTriangle className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('notifications')}>Barchasi</Button>} />
      <div className="space-y-1">
        {alerts.slice(0, limit).map((a) => (
          <button key={a.id} onClick={() => { dispatch('alert.read', { ids: [a.id] }); go(a.module as never, a.tab, a.params); }} className={cx('group flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2', db.readAlerts.includes(a.id) && 'opacity-60')}>
            <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', lvl[a.level])} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-t1">{a.title}</span><span className="block truncate text-[11.8px] text-t3">{a.body}</span></span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-t3 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </Card>
  );
}

export function AiInsightsWidget() {
  const { db, s, filters } = useCtx(); const openAi = useApp((x) => x.openAi);
  const cards = useMemo(() => insightCards(db, s, filters.currency, { from: filters.from, to: filters.to }).slice(0, 4), [db, s, filters]);
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
      <CardHeader title="AI CFO insightlari" subtitle="Demo ma’lumotlardan avtomatik" icon={<Sparkles className="h-4 w-4" />} actions={<Button size="xs" variant="soft" onClick={() => openAi()}>So‘rash</Button>} />
      <div className="space-y-2">
        {cards.map((c, i) => { const meta = INSIGHT_META[c.type]; return (
          <button key={i} onClick={() => openAi(c.prompt)} className="w-full rounded-xl border border-line bg-surface-2 p-3 text-left transition hover:border-accent/30">
            <div className="mb-1 flex items-center gap-1.5"><span className={cx('rounded-md border px-1.5 text-[10px] font-semibold leading-4', meta.tone)}>{meta.label}</span><DemoTag kind={c.kind === 'fact' ? 'fact' : c.kind === 'estimate' ? 'estimate' : 'rec'} /></div>
            <p className="text-[12.8px] font-medium leading-snug text-t1">{c.title}</p><p className="mt-0.5 line-clamp-2 text-[11.8px] text-t3">{c.body}</p>
          </button>
        ); })}
      </div>
    </Card>
  );
}

export function CompaniesWidget() {
  const { db, from, to, m } = useCtx(); const { setFilters } = useApp();
  const rows = db.companies.map((c) => { const p = pnl(db.entries, { companyIds: [c.id] }, from, to); const b = balances(db.entries, { companyIds: [c.id] }, undefined, to); return { c, p, cash: (b['5010'] || 0) + (b['5110'] || 0) + (b['5210'] || 0) }; });
  const total = rows.reduce((a, r) => a + r.p.revenue, 0);
  return (
    <Card>
      <CardHeader title="Guruh kompaniyalari" subtitle="Tanlangan davr · bosing — kompaniyaga o‘tish" icon={<Building2 className="h-4 w-4" />} />
      <div className="space-y-2.5">
        {rows.map((r) => (
          <button key={r.c.id} onClick={() => setFilters({ companyId: r.c.id, branchId: 'all' })} className="w-full rounded-xl border border-line p-3 text-left transition hover:bg-surface-2">
            <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[13px] font-semibold text-t1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.c.color }} />{r.c.name}</span><span className="num text-[12.5px] font-semibold text-t1">{m(r.p.revenue)}</span></div>
            <Progress value={total ? (r.p.revenue / total) * 100 : 0} className="mt-2" height={4} />
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]"><span className="text-t3">Sof foyda <b className={cx('num block text-[12px]', r.p.net >= 0 ? 'text-pos' : 'text-neg')}>{m(r.p.net)}</b></span><span className="text-t3">Marja <b className="num block text-[12px] text-t1">{r.p.netMargin.toFixed(1)}%</b></span><span className="text-t3">Pul <b className="num block text-[12px] text-t1">{m(r.cash)}</b></span></div>
          </button>
        ))}
      </div>
    </Card>
  );
}

export function HealthWidget() {
  const { db, s } = useCtx();
  const h = useMemo(() => A.healthScore(db, s), [db, s]);
  const c = h.score >= 75 ? 'var(--pos)' : h.score >= 55 ? 'var(--warn)' : 'var(--neg)';
  return (
    <Card>
      <CardHeader title={<span className="flex items-center">Biznes salomatligi<Explain term="Salomatlik indeksi">marja, likvidlik, pul zaxirasi va debitorlik sifatidan hisoblanadigan ichki ko‘rsatkich (0–100). Rasmiy reyting emas.</Explain></span>} subtitle="Ichki model · taxminiy" icon={<Gauge className="h-4 w-4" />} />
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" strokeWidth="10" /><circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${h.score * 2.64} 264`} style={{ transition: 'stroke-dasharray .8s' }} /></svg>
          <div className="absolute inset-0 grid place-items-center text-center"><div><div className="num text-[26px] font-bold text-t1">{h.score}</div><div className="text-[10px] text-t3">/ 100</div></div></div>
        </div>
        <div className="flex-1 space-y-2">{h.comp.map((x) => <div key={x.id}><div className="flex justify-between text-[11.5px]"><span className="text-t2">{x.label}</span><span className="num font-semibold text-t1">{x.value}</span></div><Progress value={(x.score / 25) * 100} height={4} tone={x.score > 17 ? 'pos' : x.score > 10 ? 'warn' : 'neg'} /></div>)}</div>
      </div>
    </Card>
  );
}

export function ForecastWidget() {
  const { db, s, m } = useCtx();
  const fc = useMemo(() => A.cashForecast(db, s, 90), [db, s]);
  return (
    <Card>
      <CardHeader title="Pul prognozi" subtitle="Taxminiy · kafolat emas" icon={<TrendingUp className="h-4 w-4" />} actions={<DemoTag kind="estimate" />} />
      <div className="grid grid-cols-3 gap-2">{[[30, fc.d30], [60, fc.d60], [90, fc.d90]].map(([d, x]) => { const v = (x as typeof fc.d30).balance; return <div key={d as number} className="rounded-xl bg-surface-2 p-3 text-center"><p className="text-[11px] text-t3">{d as number} kun</p><p className="num mt-1 text-[15px] font-semibold text-t1">{m(v)}</p><Delta v={((v - fc.start) / fc.start) * 100} /></div>; })}</div>
      <p className="mt-3 text-[11.5px] leading-snug text-t3">Eng past nuqta: <b className="text-t1">{m(fc.min.balance)}</b> ({fmtDate(fc.min.date)}). Asos: ochiq debitorlik (mijoz to‘lov odati bilan), kreditorlik muddatlari, soliqlar, ish haqi va 90 kunlik sur’at.</p>
    </Card>
  );
}

export function ArWidget() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const ag = useMemo(() => A.arAging(db, s), [db, s]);
  const data = A.BUCKETS.map((b, i) => ({ name: b.label.split(' (')[0], v: ag.buckets[b.id], c: ['#10b981', '#f59e0b', '#f97316', '#ef4444'][i] }));
  return (
    <Card>
      <CardHeader title="Debitorlik yoshi" subtitle={`Jami ${m(ag.total)} · DSO ${A.dso(db, s).toFixed(0)} kun`} icon={<Receipt className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('finance', 'ar')}>Ochish</Button>} />
      <div className="mb-3 flex h-3 overflow-hidden rounded-full">{data.map((d) => <div key={d.name} style={{ width: `${ag.total ? (d.v / ag.total) * 100 : 0}%`, background: d.c }} title={`${d.name}: ${m(d.v)}`} />)}</div>
      <div className="grid grid-cols-2 gap-2">{data.map((d) => <div key={d.name} className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5"><span className="flex items-center gap-1.5 text-[11.5px] text-t2"><span className="h-2 w-2 rounded-full" style={{ background: d.c }} />{d.name}</span><span className="num text-[12px] font-semibold text-t1">{m(d.v)}</span></div>)}</div>
      <div className="mt-3 space-y-1">{ag.customers.filter((c) => c.total - c.b.current > 0).slice(0, 3).map((c) => <div key={c.id} className="flex items-center justify-between text-[12px]"><span className="truncate text-t2">{c.customer}</span><span className="num font-medium text-neg">{m(c.total - c.b.current)}</span></div>)}</div>
    </Card>
  );
}

export function ApWidget() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const ap = useMemo(() => A.apSchedule(db, s), [db, s]);
  return (
    <Card>
      <CardHeader title="Kreditorlik va to‘lovlar" subtitle={`Jami ${m(ap.total)}`} icon={<Truck className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('finance', 'ap')}>Kalendar</Button>} />
      <div className="grid grid-cols-2 gap-2">{[['Muddati o‘tgan', ap.overdue, 'text-neg'], ['Bugun', ap.today, 'text-warn'], ['Shu hafta', ap.week, 'text-t1'], ['Keyinroq', ap.later, 'text-t2']].map(([l, v, c]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">{l as string}</p><p className={cx('num text-[15px] font-semibold', c as string)}>{m(v as number)}</p></div>)}</div>
      <div className="mt-3 space-y-1.5">{ap.rows.slice(0, 4).map((r) => <div key={r.bill.id} className="flex items-center justify-between gap-2 text-[12px]"><span className="truncate text-t2">{r.supplier.name}</span><span className="flex items-center gap-2"><span className={cx('text-[11px]', r.days < 0 ? 'text-neg' : 'text-t3')}>{fmtDate(r.bill.dueDate).slice(0, 5)}</span><span className="num font-medium text-t1">{m(r.open)}</span></span></div>)}</div>
    </Card>
  );
}

export function BudgetWidget() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const rows = useMemo(() => A.budgetVsActual(db, s, 2026, +TODAY.slice(5, 7), +TODAY.slice(5, 7)), [db, s]);
  return (
    <Card>
      <CardHeader title="Byudjet nazorati" subtitle={`${monthLabel(monthKey(TODAY))} · oy oxirida hisoblanadigan moddalar chiqarilgan`} icon={<Target className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('finance', 'budget')}>Batafsil</Button>} />
      <div className="space-y-2.5">{rows.slice(0, 5).map((r) => <div key={r.companyId + r.account}><div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]"><span className="min-w-0 truncate text-t2">{r.name} <span className="text-t3">· {byId(db.companies, r.companyId)?.short}</span></span><span className={cx('num shrink-0 font-semibold', r.pct > 5 ? 'text-neg' : 'text-t1')}>{r.pct > 0 ? '+' : ''}{r.pct.toFixed(0)}%</span></div><div className="mb-1 flex justify-between text-[11px] text-t3"><span>fakt {m(r.actual)}</span><span>reja {m(r.budget)}</span></div><Progress value={r.budget ? (r.actual / r.budget) * 100 : 0} tone={r.pct > 5 ? 'neg' : r.pct > -10 ? 'warn' : 'pos'} height={5} /></div>)}</div>
      {rows.some((r) => r.pct > 5) && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-neg/10 px-2.5 py-1.5 text-[11.5px] text-neg"><AlertTriangle className="h-3.5 w-3.5" />{rows.filter((r) => r.pct > 5).length} ta modda byudjetdan oshdi</p>}
    </Card>
  );
}

export function TaxWidget() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const open = db.taxObligations.filter((o) => o.status !== 'paid' && s.companyIds.includes(o.companyId)).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  return (
    <Card>
      <CardHeader title="Soliq kalendari" subtitle={`${open.length} ta ochiq majburiyat · ${m(open.reduce((a, o) => a + o.amount, 0))}`} icon={<Landmark className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('taxes')}>Soliq markazi</Button>} />
      <div className="space-y-1.5">{open.slice(0, 5).map((o) => { const d = diffDays(o.dueDate, TODAY); return (
        <div key={o.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
          <div className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-center leading-none', d <= 7 ? 'bg-neg/12 text-neg' : d <= 14 ? 'bg-warn/12 text-warn' : 'bg-surface-3 text-t2')}><span className="num text-[13px] font-bold">{fmtDate(o.dueDate).slice(0, 2)}</span></div>
          <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-medium text-t1">{byId(db.taxTypes, o.taxId)?.name.split(' (')[0]} · {byId(db.companies, o.companyId)?.short}</p><p className="text-[11px] text-t3">{o.period} · {d >= 0 ? `${d} kun qoldi` : `${-d} kun kechikdi`}{o.estimate ? ' · taxminiy' : ''}</p></div>
          <span className="num text-[12.5px] font-semibold text-t1">{m(o.amount)}</span>
        </div>
      ); })}</div>
    </Card>
  );
}

// ─── Accountant widgets ───────────────────────────────────────
export function AccountantKpis() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const drafts = db.invoices.filter((i) => s.companyIds.includes(i.companyId) && i.date === TODAY).length;
  const unmatched = db.bankLines.filter((b) => s.companyIds.includes(b.companyId) && b.status !== 'matched').length;
  const open = db.periods.filter((p) => s.companyIds.includes(p.companyId) && p.status === 'open').map((p) => p.period).sort()[0];
  const today = db.entries.filter((e) => s.companyIds.includes(e.companyId) && e.date >= addDays(TODAY, -6)).length;
  const toInvoice = db.salesOrders.filter((o) => s.companyIds.includes(o.companyId) && o.status === 'delivered').length;
  const toBill = db.purchaseOrders.filter((p) => s.companyIds.includes(p.companyId) && (p.status === 'received' || p.status === 'partially_received')).length;
  const items = [
    { label: 'Oxirgi 7 kun provodkalari', v: String(today), sub: 'avtomatik + qo‘lda', go: () => go('accounting', 'journal') },
    { label: 'Bank: moslanmagan', v: String(unmatched), sub: 'rekonsiliatsiya kutmoqda', go: () => go('finance', 'bank'), tone: unmatched ? 'warn' : undefined },
    { label: 'Hisob-faktura chiqarilmagan', v: String(toInvoice), sub: 'yetkazilgan buyurtmalar', go: () => go('sales', 'orders'), tone: toInvoice ? 'warn' : undefined },
    { label: 'Ta’minotchi hisobi kutilmoqda', v: String(toBill), sub: 'qabul qilingan PO', go: () => go('purchasing', 'orders') },
    { label: 'Ochiq davr', v: open ? monthLabel(open) : '—', sub: 'yopish kerak', go: () => go('accounting', 'close') },
    { label: 'Bugun yaratilgan hisob-faktura', v: String(drafts), sub: m(db.invoices.filter((i) => s.companyIds.includes(i.companyId) && i.date === TODAY).reduce((a, i) => a + i.total, 0)), go: () => go('finance', 'ar') },
  ];
  return <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{items.map((i) => <Card key={i.label} hover onClick={i.go} className="!p-4"><p className="text-[11.5px] text-t3">{i.label}</p><p className={cx('num mt-1.5 text-[20px] font-semibold', i.tone === 'warn' ? 'text-warn' : 'text-t1')}>{i.v}</p><p className="text-[11px] text-t3">{i.sub}</p></Card>)}</div>;
}

export function AccountantTasks() {
  const { db, s } = useCtx(); const go = useApp((x) => x.go);
  const tasks = [
    { t: 'Bank ko‘chirmasini moslashtirish', n: db.bankLines.filter((b) => s.companyIds.includes(b.companyId) && b.status !== 'matched').length, go: () => go('finance', 'bank') },
    { t: 'Yetkazilgan buyurtmalarga hisob-faktura', n: db.salesOrders.filter((o) => s.companyIds.includes(o.companyId) && o.status === 'delivered').length, go: () => go('sales', 'orders') },
    { t: 'Qabul qilingan PO bo‘yicha ta’minotchi hisobi', n: db.purchaseOrders.filter((p) => s.companyIds.includes(p.companyId) && (p.status === 'received' || p.status === 'partially_received')).length, go: () => go('purchasing', 'orders') },
    { t: 'E’tibor talab qiladigan soliq hujjatlari', n: db.taxObligations.filter((o) => s.companyIds.includes(o.companyId) && o.docStatus === 'attention').length, go: () => go('taxes') },
    { t: 'Tasdiq kutayotgan hujjatlar', n: db.documents.filter((d) => s.companyIds.includes(d.companyId) && d.status === 'pending').length, go: () => go('documents') },
    { t: 'Avgust davrini yopish', n: db.periods.some((p) => s.companyIds.includes(p.companyId) && p.period === '2026-08' && p.status === 'open') ? 1 : 0, go: () => go('accounting', 'close') },
  ];
  return (
    <Card>
      <CardHeader title="Bugungi vazifalar" subtitle="Buxgalteriya navbati" icon={<CheckCheck className="h-4 w-4" />} />
      <div className="space-y-1">{tasks.map((x) => <button key={x.t} onClick={x.go} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2"><span className={cx('grid h-6 w-6 place-items-center rounded-full border text-[11px] font-semibold', x.n ? 'border-warn/40 bg-warn/10 text-warn' : 'border-pos/40 bg-pos/10 text-pos')}>{x.n || '✓'}</span><span className="flex-1 text-[13px] text-t1">{x.t}</span><ChevronRight className="h-4 w-4 text-t3" /></button>)}</div>
    </Card>
  );
}

export function RecentJournal() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const rows = db.entries.filter((e) => s.companyIds.includes(e.companyId)).slice(-8).reverse();
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="So‘nggi provodkalar" subtitle="Hujjatlardan avtomatik yaratilgan" icon={<Receipt className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('accounting', 'journal')}>Jurnal</Button>} />
      <div className="divide-y divide-line">{rows.map((e) => { const amt = e.lines.reduce((a, l) => a + l.debit, 0); return (
        <div key={e.id} className="flex items-center gap-3 py-2"><span className="num w-24 shrink-0 font-mono text-[11px] text-t3">{e.no}</span><span className="min-w-0 flex-1 truncate text-[12.8px] text-t1">{e.memo}</span><span className="hidden text-[11px] text-t3 sm:block">{e.lines.map((l) => l.account).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(' · ')}</span><span className="num w-24 text-right text-[12.5px] font-medium text-t1">{m(amt)}</span></div>
      ); })}</div>
    </Card>
  );
}

export function PeriodWidget() {
  const { db, s } = useCtx(); const go = useApp((x) => x.go);
  const ps = ['2026-06', '2026-07', '2026-08', '2026-09'];
  return (
    <Card>
      <CardHeader title="Davrlarni yopish" subtitle="Yopilgan davrga provodka kiritib bo‘lmaydi" icon={<Lock className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('accounting', 'close')}>Boshqarish</Button>} />
      <div className="grid grid-cols-4 gap-2">{ps.map((p) => { const closed = s.companyIds.every((c) => db.periods.some((x) => x.companyId === c && x.period === p && x.status === 'closed')); return <div key={p} className={cx('rounded-xl border p-2.5 text-center', closed ? 'border-pos/25 bg-pos/[.06]' : 'border-warn/25 bg-warn/[.06]')}><p className="text-[11.5px] font-semibold text-t1">{monthLabel(p, true)}</p><p className={cx('mt-0.5 text-[10.5px]', closed ? 'text-pos' : 'text-warn')}>{closed ? 'Yopilgan' : 'Ochiq'}</p></div>; })}</div>
    </Card>
  );
}

export function ReconWidget() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const bl = db.bankLines.filter((b) => s.companyIds.includes(b.companyId));
  const c = { matched: bl.filter((b) => b.status === 'matched').length, suggested: bl.filter((b) => b.status === 'suggested').length, unmatched: bl.filter((b) => b.status === 'unmatched').length };
  return (
    <Card>
      <CardHeader title="Bank rekonsiliatsiyasi" subtitle={`${bl.length} ta ko‘chirma qatori`} icon={<ArrowLeftRight className="h-4 w-4" />} actions={<Button size="xs" variant="soft" onClick={() => go('finance', 'bank')}>Moslashtirish</Button>} />
      <div className="grid grid-cols-3 gap-2 text-center">{[['Moslashgan', c.matched, 'text-pos'], ['Taklif', c.suggested, 'text-warn'], ['Moslanmagan', c.unmatched, 'text-neg']].map(([l, v, cl]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className={cx('num text-[18px] font-semibold', cl as string)}>{v as number}</p><p className="text-[11px] text-t3">{l as string}</p></div>)}</div>
      <Progress value={bl.length ? (c.matched / bl.length) * 100 : 0} tone="pos" className="mt-3" />
      <p className="mt-2 text-[11.5px] text-t3">Moslanmagan summa: {m(bl.filter((b) => b.status !== 'matched').reduce((a, b) => a + Math.abs(b.amount), 0))}</p>
    </Card>
  );
}

// ─── Factory widgets ──────────────────────────────────────────
export function FactoryKpis() {
  const { db, m } = useCtx();
  const today = useMemo(() => A.productionByDay(db, ['fac'], addDays(TODAY, -1), TODAY), [db]);
  const month = useMemo(() => A.productionStats(db, ['fac'], monthStart(TODAY), TODAY), [db]);
  const machines = db.machines; const util = machines.reduce((a, x) => a + x.oee, 0) / machines.length;
  const matCons = month.matCost;
  const fg = A.stockRows(db, { companyIds: ['fac'] }).filter((r) => r.p.kind === 'finished').reduce((a, r) => a + r.value, 0);
  const items = [
    { l: 'Bugungi ishlab chiqarish', v: `${Math.round(today.at(-1)!.actual)} dona`, s: `reja ${Math.round(today.at(-1)!.planned)} dona` },
    { l: 'Oylik ishlab chiqarish', v: `${month.good.toLocaleString('ru-RU')} dona`, s: `reja ${month.planned.toLocaleString('ru-RU')}` },
    { l: 'Reja bajarilishi', v: `${month.attainment.toFixed(0)}%`, s: 'yaroqli / rejalashtirilgan', tone: month.attainment >= 90 ? 'pos' : 'warn' },
    { l: 'Brak (chiqindi)', v: `${month.scrapPct.toFixed(1)}%`, s: `${month.scrap} dona`, tone: month.scrapPct > 4 ? 'neg' : 'pos' },
    { l: 'Ishlab chiqarish tannarxi', v: m(month.cost), s: `standartdan ${month.variance >= 0 ? '+' : ''}${m(month.variance)}`, tone: month.variance > 0 ? 'warn' : 'pos' },
    { l: 'Mashinalar yuklanishi', v: `${(util * 100).toFixed(0)}%`, s: 'o‘rtacha OEE (taxminiy)' },
    { l: 'Xomashyo sarfi', v: m(matCons), s: 'shu oy' },
    { l: 'Tayyor mahsulot', v: m(fg), s: 'omborda (tannarx)' },
  ];
  return <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">{items.map((i) => <Card key={i.l} className="!p-4"><p className="text-[11.5px] text-t3">{i.l}</p><p className={cx('num mt-1.5 text-[19px] font-semibold', i.tone === 'pos' ? 'text-pos' : i.tone === 'neg' ? 'text-neg' : i.tone === 'warn' ? 'text-warn' : 'text-t1')}>{i.v}</p><p className="text-[11px] text-t3">{i.s}</p></Card>)}</div>;
}

export function ProductionChart() {
  const { db } = useCtx();
  const data = useMemo(() => A.productionByDay(db, ['fac'], addDays(TODAY, -29), addDays(TODAY, 7)).map((d) => ({ ...d, label: fmtDate(d.date).slice(0, 5), actual: d.date <= TODAY ? Math.round(d.actual) : undefined, planned: Math.round(d.planned), scrap: Math.round(d.scrap) })), [db]);
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Zavod ishlab chiqarish grafigi" subtitle="Kunlik: reja vs fakt vs brak (dona) · keyingi 7 kun — reja" icon={<Factory className="h-4 w-4" />} />
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: -4, right: 6 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltip fmt={(v) => `${Math.round(v)} dona`} />} />
            <ReferenceLine x={fmtDate(TODAY).slice(0, 5)} stroke="var(--border-strong)" />
            <Bar dataKey="actual" name="Fakt (yaroqli)" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="scrap" name="Brak" fill={PALETTE[4]} radius={[4, 4, 0, 0]} />
            <Line dataKey="planned" name="Reja" stroke={PALETTE[0]} strokeWidth={2} dot={false} type="monotone" strokeDasharray="5 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ label: 'Fakt', color: PALETTE[1] }, { label: 'Brak', color: PALETTE[4] }, { label: 'Reja', color: PALETTE[0], dashed: true }]} />
    </Card>
  );
}

export function MachinesWidget() {
  const { db } = useCtx();
  return (
    <Card>
      <CardHeader title="Mashinalar" subtitle="Shu oy yuklanishi (OEE taxminiy)" icon={<Gauge className="h-4 w-4" />} />
      <div className="space-y-3">{db.machines.map((x) => <div key={x.id}><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate text-[12.5px] text-t1">{x.name}</span><span className="flex items-center gap-2"><StatusBadge status={x.status} /><span className="num text-[12px] font-semibold text-t1">{(x.oee * 100).toFixed(0)}%</span></span></div><Progress value={x.oee * 100} tone={x.status === 'maintenance' ? 'warn' : x.oee > 0.75 ? 'pos' : 'accent'} height={5} /><p className="mt-0.5 text-[10.5px] text-t3">{x.usedHours} / {x.capacityHours} soat · {(x.hourlyCost / 1000).toFixed(0)} ming so‘m/soat</p></div>)}</div>
    </Card>
  );
}

export function WorkOrdersWidget() {
  const { db } = useCtx(); const go = useApp((x) => x.go);
  const wos = db.workOrders.filter((w) => ['planned', 'released', 'in_progress', 'qc'].includes(w.status));
  return (
    <Card>
      <CardHeader title="Faol ish buyurtmalari" subtitle={`${wos.length} ta`} icon={<Factory className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('manufacturing', 'orders')}>Barchasi</Button>} />
      <div className="space-y-2">{wos.map((w) => { const p = byId(db.products, w.productId)!; const pr = A.woProgress(w); return (
        <button key={w.id} onClick={() => go('manufacturing', 'orders')} className="w-full rounded-xl border border-line p-3 text-left hover:bg-surface-2">
          <div className="flex items-center justify-between gap-2"><span className="font-mono text-[11px] text-t3">{w.no}</span><StatusBadge status={w.status} /></div>
          <p className="mt-1 truncate text-[12.8px] font-medium text-t1">{p.name} × {w.qty}</p>
          <Progress value={pr} className="mt-2" height={4} /><p className="mt-1 text-[10.5px] text-t3">{fmtDate(w.plannedStart)} → {fmtDate(w.plannedEnd)} · {pr}%</p>
        </button>
      ); })}</div>
    </Card>
  );
}

export function MaterialsWidget() {
  const { db, m } = useCtx(); const go = useApp((x) => x.go);
  const rows = A.stockRows(db, { companyIds: ['fac'] }, 'wR');
  const planned = db.workOrders.filter((w) => w.status === 'planned');
  return (
    <Card>
      <CardHeader title="Xomashyo holati" subtitle="Xomashyo ombori · rejalashtirilgan ehtiyoj bilan" icon={<Boxes className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('inventory', 'stock')}>Ombor</Button>} />
      <div className="space-y-2">{rows.map((r) => { const need = planned.reduce((a, w) => a + (woRequirements(db, w).find((x) => x.productId === r.p.id)?.need || 0), 0); return (
        <div key={r.p.id} className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="flex justify-between text-[12px]"><span className="truncate text-t1">{r.p.name}</span><span className="num text-t2">{Math.round(r.qty).toLocaleString('ru-RU')} {r.p.unit}</span></div><Progress value={Math.min(100, (r.qty / ((r.p.reorderPoint + r.p.reorderQty) || 1)) * 100)} tone={r.status === 'low' || r.status === 'out' ? 'neg' : 'accent'} height={4} className="mt-1" />{need > 0 && <p className="mt-0.5 text-[10.5px] text-t3">Rejadagi ehtiyoj: {Math.round(need).toLocaleString('ru-RU')} {r.p.unit}</p>}</div><StatusBadge status={r.status} /></div>
      ); })}</div>
      <p className="mt-3 text-[11px] text-t3">Xomashyo qiymati: {m(rows.reduce((a, r) => a + r.value, 0))}</p>
    </Card>
  );
}

export function CostingWidget() {
  const { db, m } = useCtx(); const go = useApp((x) => x.go);
  const u = useMemo(() => A.unitCosts(db, ['fac'], '2026-07-01', TODAY), [db]);
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Tannarx: standart vs fakt" subtitle="3-chorak 2026 · birlik uchun" icon={<Percent className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('manufacturing', 'costing')}>Tahlil</Button>} />
      <div className="grid gap-2 sm:grid-cols-2">{u.map((x) => { const v = x.act ? x.act.total - x.std.total : 0; return (
        <div key={x.p.id} className="rounded-xl border border-line p-3"><p className="truncate text-[12.8px] font-medium text-t1">{x.p.name}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]"><span className="text-t3">Standart<b className="num block text-[12.5px] text-t1">{m(x.std.total)}</b></span><span className="text-t3">Fakt<b className={cx('num block text-[12.5px]', v > 0 ? 'text-neg' : 'text-pos')}>{x.act ? m(x.act.total) : '—'}</b></span><span className="text-t3">Marja<b className="num block text-[12.5px] text-t1">{x.act ? `${((1 - x.act.total / x.price) * 100).toFixed(1)}%` : '—'}</b></span></div>
        </div>
      ); })}</div>
    </Card>
  );
}

export function WasteWidget() {
  const { db } = useCtx();
  const u = useMemo(() => A.unitCosts(db, ['fac'], '2026-07-01', TODAY), [db]);
  return (
    <Card>
      <CardHeader title="Brak / chiqindi" subtitle="Norma vs fakt (3-chorak)" icon={<AlertTriangle className="h-4 w-4" />} />
      <div className="h-[180px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={u.map((x) => ({ name: x.p.sku.replace('FG-', ''), fakt: +x.scrapPct.toFixed(1), norma: x.bom.scrapPct }))} margin={{ left: -20 }}><CartesianGrid vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} unit="%" /><Tooltip content={<ChartTooltip fmt={(v) => `${v}%`} />} /><Bar dataKey="norma" name="Norma" fill="var(--text-3)" fillOpacity={0.35} radius={[4, 4, 0, 0]} /><Bar dataKey="fakt" name="Fakt" radius={[4, 4, 0, 0]}>{u.map((x, i) => <Cell key={i} fill={x.scrapPct > x.bom.scrapPct * 1.3 ? PALETTE[4] : PALETTE[1]} />)}</Bar></BarChart></ResponsiveContainer></div>
    </Card>
  );
}

// ─── Warehouse widgets ────────────────────────────────────────
export function WarehouseKpis() {
  const { db, s, m } = useCtx();
  const rows = A.stockRows(db, s);
  const mv = db.moves.filter((x) => s.companyIds.includes(x.companyId) && x.date >= addDays(TODAY, -6));
  const items = [
    { l: 'Zaxira qiymati', v: m(rows.reduce((a, r) => a + r.value, 0)), s: `${rows.length} ta SKU` },
    { l: 'Kam / tugagan', v: String(rows.filter((r) => r.status === 'low' || r.status === 'out').length), s: 'buyurtma nuqtasidan past', tone: 'warn' },
    { l: 'Kutilayotgan kirim', v: String(db.purchaseOrders.filter((p) => s.companyIds.includes(p.companyId) && ['approved', 'partially_received'].includes(p.status)).length), s: 'tasdiqlangan PO' },
    { l: 'Jo‘natishga tayyor', v: String(db.salesOrders.filter((o) => s.companyIds.includes(o.companyId) && o.status === 'confirmed').length), s: 'tasdiqlangan buyurtmalar' },
    { l: 'Harakatlar (7 kun)', v: String(mv.length), s: `${mv.filter((x) => x.kind.startsWith('transfer')).length / 2} ta o‘tkazma` },
    { l: 'Rezervlangan', v: m(rows.reduce((a, r) => a + r.reserved * r.unitCost, 0)), s: 'buyurtmalar uchun' },
  ];
  return <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{items.map((i) => <Card key={i.l} className="!p-4"><p className="text-[11.5px] text-t3">{i.l}</p><p className={cx('num mt-1.5 text-[19px] font-semibold', i.tone === 'warn' ? 'text-warn' : 'text-t1')}>{i.v}</p><p className="text-[11px] text-t3">{i.s}</p></Card>)}</div>;
}

export function LowStockWidget() {
  const { db, s } = useCtx(); const go = useApp((x) => x.go);
  const rows = A.stockRows(db, s).filter((r) => r.status === 'low' || r.status === 'out' || r.cover < 25).sort((a, b) => a.cover - b.cover);
  return (
    <Card>
      <CardHeader title="Kam zaxira" subtitle="Mavjud (rezervsiz) + yo‘ldagi vs buyurtma nuqtasi" icon={<AlertTriangle className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('inventory', 'stock')}>Ombor</Button>} />
      <div className="space-y-2">{rows.slice(0, 6).map((r) => <div key={r.p.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-[12.8px] font-medium text-t1">{r.p.name}</p><p className="text-[11px] text-t3">{Math.round(r.available).toLocaleString('ru-RU')} {r.p.unit} mavjud · {Math.round(r.incoming).toLocaleString('ru-RU')} yo‘lda · ~{Number.isFinite(r.cover) ? Math.max(0, Math.round(r.cover)) : '∞'} kun</p></div><StatusBadge status={r.status} /></div>)}{!rows.length && <p className="text-[12.5px] text-t3">Barcha pozitsiyalar yetarli ✓</p>}</div>
    </Card>
  );
}

export function ReceivingWidget() {
  const { db, s } = useCtx(); const go = useApp((x) => x.go);
  const pos = db.purchaseOrders.filter((p) => s.companyIds.includes(p.companyId) && ['approved', 'partially_received'].includes(p.status));
  return (
    <Card>
      <CardHeader title="Kutilayotgan kirim" subtitle="Tasdiqlangan xarid buyurtmalari" icon={<PackageCheck className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('warehouse', 'receiving')}>Qabul qilish</Button>} />
      <div className="space-y-2">{pos.slice(0, 5).map((p) => <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2"><div className="min-w-0"><p className="truncate text-[12.8px] font-medium text-t1">{p.no} · {byId(db.parties, p.supplierId)?.name}</p><p className="truncate text-[11px] text-t3">{p.lines.map((l) => `${l.description} × ${l.qty}`).join(', ')}</p></div><span className={cx('text-[11px]', p.expectedDate < TODAY ? 'text-neg' : 'text-t3')}>{fmtDate(p.expectedDate)}</span></div>)}{!pos.length && <p className="text-[12.5px] text-t3">Kutilayotgan kirim yo‘q</p>}</div>
    </Card>
  );
}

export function ShippingWidget() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const sos = db.salesOrders.filter((o) => s.companyIds.includes(o.companyId) && ['confirmed', 'in_production'].includes(o.status));
  return (
    <Card>
      <CardHeader title="Jo‘natish navbati" subtitle="Tasdiqlangan, yetkazilmagan buyurtmalar" icon={<Truck className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('warehouse', 'shipping')}>Jo‘natish</Button>} />
      <div className="space-y-2">{sos.slice(0, 5).map((o) => <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2"><div className="min-w-0"><p className="truncate text-[12.8px] font-medium text-t1">{o.no} · {byId(db.parties, o.customerId)?.name}</p><p className="text-[11px] text-t3">{byId(db.warehouses, o.warehouseId)?.code} · {fmtDate(o.deliveryDate)} · {m(docTotals(o.lines).total)}</p></div><StatusBadge status={o.status} /></div>)}{!sos.length && <p className="text-[12.5px] text-t3">Navbat bo‘sh</p>}</div>
    </Card>
  );
}

export function MovementsWidget() {
  const { db, s } = useCtx();
  const mv = db.moves.filter((x) => s.companyIds.includes(x.companyId)).slice(-10).reverse();
  const L: Record<string, string> = { receipt: 'Kirim', issue: 'Chiqim', transfer_in: 'O‘tkazma (+)', transfer_out: 'O‘tkazma (−)', adjustment: 'Tuzatish', production_in: 'Ishlab chiqarishdan', production_out: 'Ishlab chiqarishga', opening: 'Boshl. qoldiq', return: 'Qaytarish' };
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Ombor harakatlari" subtitle="So‘nggi operatsiyalar" icon={<ArrowLeftRight className="h-4 w-4" />} />
      <div className="divide-y divide-line">{mv.map((x) => <div key={x.id} className="flex items-center gap-3 py-2 text-[12.5px]"><span className="w-12 shrink-0 text-t3">{fmtDate(x.date).slice(0, 5)}</span><Badge tone={x.qty > 0 ? 'pos' : 'neg'}>{L[x.kind]}</Badge><span className="min-w-0 flex-1 truncate text-t1">{byId(db.products, x.productId)?.name}</span><span className="text-t3">{byId(db.warehouses, x.warehouseId)?.code}</span><span className={cx('num w-20 text-right font-medium', x.qty > 0 ? 'text-pos' : 'text-neg')}>{x.qty > 0 ? '+' : ''}{Math.round(x.qty).toLocaleString('ru-RU')}</span></div>)}</div>
    </Card>
  );
}

export function TransfersWidget() {
  const { db, s } = useCtx(); const go = useApp((x) => x.go);
  const whs = db.warehouses.filter((w) => s.companyIds.includes(w.companyId));
  return (
    <Card>
      <CardHeader title="Omborlar bandligi" subtitle="Hajm bo‘yicha (taxminiy birlik)" icon={<Boxes className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('warehouse', 'transfers')}>O‘tkazma</Button>} />
      <div className="space-y-3">{whs.map((w) => { const q = A.stockRows(db, s, w.id).reduce((a, r) => a + (r.p.unit === 'metr' ? r.qty / 50 : r.p.unit === 'kg' ? r.qty / 10 : r.qty / (r.p.kind === 'finished' ? 1 : 8)), 0); const pc = Math.min(100, (q / w.capacity) * 100); return <div key={w.id}><div className="mb-1 flex justify-between text-[12px]"><span className="text-t1">{w.name}</span><span className="num text-t2">{pc.toFixed(0)}%</span></div><Progress value={pc} tone={pc > 85 ? 'neg' : pc > 65 ? 'warn' : 'accent'} height={5} /></div>; })}</div>
    </Card>
  );
}

export function ApprovalsWidget() {
  const { db, s, m } = useCtx(); const { role, go, dispatch } = useApp();
  const items = db.approvals.filter((a) => a.status === 'pending' && s.companyIds.includes(a.companyId));
  return (
    <Card>
      <CardHeader title="Tasdiqlash kutmoqda" subtitle={`${items.length} ta so‘rov`} icon={<CheckCheck className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('approvals')}>Markaz</Button>} />
      <div className="space-y-2">{items.slice(0, 4).map((a) => { const can = canDecide(role, a.approverRole); return (
        <div key={a.id} className="rounded-xl border border-line p-3"><div className="flex items-start justify-between gap-2"><p className="text-[12.8px] font-medium leading-snug text-t1">{a.title}</p>{a.amount ? <span className="num shrink-0 text-[12px] font-semibold text-t1">{m(a.amount)}</span> : null}</div><p className="mt-0.5 text-[11px] text-t3">{a.requestedBy} · muddat {fmtDate(a.deadline)}</p>
          {can ? <div className="mt-2 flex gap-1.5"><Button size="xs" variant="success" onClick={() => dispatch('approval.decide', { id: a.id, decision: 'approved' }, { success: 'Tasdiqlandi' })}>Tasdiqlash</Button><Button size="xs" variant="ghost" onClick={() => go('approvals')}>Ko‘rish</Button></div> : <p className="mt-1.5 text-[10.5px] text-t3">Tasdiqlovchi: {a.approverRole}</p>}
        </div>
      ); })}{!items.length && <p className="text-[12.5px] text-t3">Hammasi ko‘rib chiqilgan ✓</p>}</div>
    </Card>
  );
}

export function SalesWidget() {
  const { db, s, from, to, m } = useCtx(); const go = useApp((x) => x.go);
  const cust = useMemo(() => A.customerProfit(db, s, from, to).slice(0, 5), [db, s, from, to]);
  const max = cust[0]?.revenue || 1;
  return (
    <Card>
      <CardHeader title="Top mijozlar" subtitle="Tanlangan davr tushumi" icon={<Avatar name="TM" size={20} />} actions={<Button size="xs" variant="ghost" onClick={() => go('sales')}>Sotuv</Button>} />
      <div className="space-y-2.5">{cust.map((c, i) => <div key={c.id}><div className="mb-1 flex justify-between text-[12px]"><span className="truncate text-t1">{i + 1}. {c.name}</span><span className="num font-semibold text-t1">{m(c.revenue)}</span></div><Progress value={(c.revenue / max) * 100} height={4} /></div>)}</div>
    </Card>
  );
}

export function PayrollWidget() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const emps = db.employees.filter((e) => s.companyIds.includes(e.companyId) && e.status !== 'terminated');
  const fund = emps.reduce((a, e) => a + e.salary, 0);
  const lastRun = db.payrollRuns.filter((r) => s.companyIds.includes(r.companyId)).sort((a, b) => (a.period < b.period ? 1 : -1))[0];
  return (
    <Card>
      <CardHeader title="Ish haqi" subtitle={`${emps.length} xodim`} icon={<Clock className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('hr', 'payroll')}>HR</Button>} />
      <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">Oylik fond</p><p className="num text-[15px] font-semibold text-t1">{m(fund)}</p></div><div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[11px] text-t3">O‘rtacha</p><p className="num text-[15px] font-semibold text-t1">{m(fund / Math.max(1, emps.length))}</p></div></div>
      {lastRun && <p className="mt-2 text-[11.5px] text-t3">So‘nggi hisob-kitob: {monthLabel(lastRun.period)} · <StatusBadge status={lastRun.status} /></p>}
    </Card>
  );
}

export { reservedQty, invOpen };
