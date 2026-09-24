'use client';
import { useMemo } from 'react';
import { ShoppingCart, Truck, UserRound, ShieldCheck, CheckCircle2, Plus, Target, CalendarClock, History } from 'lucide-react';
import { useApp } from '@/lib/store';
import { roleOf, type DashboardKind } from '@/lib/rbac';
import { Card, CardHeader, PageHeader, Button, StatusBadge, Badge, DemoTag, Progress, cx } from '@/components/ui';
import { useCtx } from './hooks';
import * as W from './widgets';
import * as A from '@/lib/analytics';
import { byId, docTotals } from '@/lib/db';
import { fmtDate, fmtDateTime, TODAY } from '@/lib/core/dates';
import { pnl, trialBalance } from '@/lib/core/ledger';

export function SecondaryDash({ kind }: { kind: DashboardKind }) {
  const { role } = useApp(); const r = roleOf(role);
  if (kind === 'sales') return <SalesDash />;
  if (kind === 'purchasing') return <PurchasingDash />;
  if (kind === 'hr') return <HrDash />;
  if (kind === 'auditor') return <AuditorDash />;
  return <EmployeeDash name={r.persona} />;
}

function SalesDash() {
  const { db, s, from, to, m } = useCtx(); const go = useApp((x) => x.go);
  const p = pnl(db.entries, s, from, to);
  const leads = db.leads.filter((l) => s.companyIds.includes(l.companyId));
  const open = leads.filter((l) => !['won', 'lost'].includes(l.stage));
  const orders = db.salesOrders.filter((o) => s.companyIds.includes(o.companyId) && o.date >= from && o.date <= to && o.status !== 'quote' && o.status !== 'cancelled');
  return (
    <div>
      <PageHeader title="Sotuv paneli" subtitle={<span className="flex items-center gap-2">Tushum, bitimlar quvuri va mijozlar <DemoTag /></span>} actions={<><Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => go('sales', 'orders', { new: '1' })}>Buyurtma</Button><Button size="sm" variant="soft" onClick={() => go('crm')}>CRM</Button></>} />
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Tushum', m(p.revenue)], ['Buyurtmalar', String(orders.length)], ['O‘rtacha buyurtma', m(orders.length ? orders.reduce((a, o) => a + docTotals(o.lines).net, 0) / orders.length : 0)], ['Quvur (ochiq bitimlar)', m(open.reduce((a, l) => a + l.value * l.probability / 100, 0))]].map(([l, v]) => <Card key={l} className="!p-4"><p className="text-[11.5px] text-t3">{l}</p><p className="num mt-1.5 text-[20px] font-semibold text-t1">{v}</p></Card>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <W.TrendChart />
        <W.SalesWidget />
        <Card className="lg:col-span-2"><CardHeader title="Ochiq bitimlar" icon={<Target className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('crm', 'pipeline')}>Quvur</Button>} />
          <div className="divide-y divide-line">{open.sort((a, b) => b.value - a.value).slice(0, 6).map((l) => <div key={l.id} className="flex items-center gap-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-t1">{l.company}</p><p className="text-[11px] text-t3">{l.nextStep}</p></div><StatusBadge status={l.stage} /><span className="num w-24 text-right text-[12.5px] font-semibold text-t1">{m(l.value)}</span></div>)}</div>
        </Card>
        <W.ArWidget />
      </div>
    </div>
  );
}

function PurchasingDash() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const pos = db.purchaseOrders.filter((p) => s.companyIds.includes(p.companyId));
  const sup = useMemo(() => A.supplierSpend(db, s, '2026-01-01', TODAY).slice(0, 6), [db, s]);
  return (
    <div>
      <PageHeader title="Xarid paneli" subtitle={<span className="flex items-center gap-2">So‘rovlar, RFQ, buyurtmalar va ta’minotchilar <DemoTag /></span>} actions={<Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => go('purchasing', 'requests', { new: '1' })}>Xarid so‘rovi</Button>} />
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['So‘rov / RFQ', pos.filter((p) => ['request', 'rfq', 'quoted'].includes(p.status)).length], ['Tasdiq kutilmoqda', pos.filter((p) => p.status === 'pending_approval').length], ['Yo‘lda', pos.filter((p) => ['approved', 'partially_received'].includes(p.status)).length], ['Hisob kutilmoqda', pos.filter((p) => p.status === 'received').length]].map(([l, v]) => <Card key={l as string} hover onClick={() => go('purchasing', 'orders')} className="!p-4"><p className="text-[11.5px] text-t3">{l}</p><p className="num mt-1.5 text-[20px] font-semibold text-t1">{v}</p></Card>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Ta’minotchilar samaradorligi (YTD)" icon={<Truck className="h-4 w-4" />} />
          <div className="space-y-2.5">{sup.map((x) => <div key={x.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3"><div className="min-w-0"><p className="truncate text-[12.8px] font-medium text-t1">{x.name}</p><Progress value={x.deliveries ? (x.onTime / x.deliveries) * 100 : 0} height={4} tone={x.deliveries && x.onTime / x.deliveries >= 0.7 ? 'pos' : 'warn'} className="mt-1" /></div><span className="text-[11.5px] text-t3">{x.onTime}/{x.deliveries} o‘z vaqtida</span><span className="num w-24 text-right text-[12.5px] font-semibold text-t1">{m(x.spend)}</span></div>)}</div>
        </Card>
        <W.LowStockWidget />
        <W.ReceivingWidget />
        <W.ApWidget />
      </div>
    </div>
  );
}

function HrDash() {
  const { db, s, m } = useCtx(); const go = useApp((x) => x.go);
  const emps = db.employees.filter((e) => s.companyIds.includes(e.companyId) && e.status !== 'terminated');
  const today = db.attendance.filter((a) => a.date === TODAY || a.date === '2026-09-23');
  const present = today.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'remote').length;
  const leaves = db.leaves.filter((l) => l.status === 'pending');
  const fund = emps.reduce((a, e) => a + e.salary, 0);
  const pending = db.payrollRuns.filter((r) => s.companyIds.includes(r.companyId) && r.status !== 'paid');
  return (
    <div>
      <PageHeader title="HR paneli" subtitle={<span className="flex items-center gap-2">Xodimlar, davomat, ta’tillar va ish haqi <DemoTag /></span>} actions={<Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => go('hr', 'employees', { new: '1' })}>Xodim</Button>} />
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Jami xodimlar', String(emps.length)], ['Bugun ishda', `${present} / ${emps.length}`], ['Oylik fond', m(fund)], ['O‘rtacha ish haqi', m(fund / Math.max(1, emps.length))]].map(([l, v]) => <Card key={l} className="!p-4"><p className="text-[11.5px] text-t3">{l}</p><p className="num mt-1.5 text-[20px] font-semibold text-t1">{v}</p></Card>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Ta’til so‘rovlari" icon={<CalendarClock className="h-4 w-4" />} />{leaves.map((l) => <div key={l.id} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2"><div><p className="text-[12.8px] font-medium text-t1">{byId(db.employees, l.employeeId)?.name}</p><p className="text-[11px] text-t3">{l.kind} · {fmtDate(l.from)}–{fmtDate(l.to)}</p></div><Button size="xs" onClick={() => go('approvals')}>Ko‘rish</Button></div>)}{!leaves.length && <p className="text-[12.5px] text-t3">So‘rov yo‘q</p>}</Card>
        <Card><CardHeader title="Ish haqi holati" icon={<UserRound className="h-4 w-4" />} actions={<Button size="xs" variant="ghost" onClick={() => go('hr', 'payroll')}>Hisoblash</Button>} />{pending.map((r) => <div key={r.id} className="flex items-center justify-between py-1.5 text-[12.5px]"><span className="text-t1">{byId(db.companies, r.companyId)?.short} · {r.period}</span><StatusBadge status={r.status} /></div>)}{!pending.length && <p className="text-[12.5px] text-t3">Barcha ish haqi to‘langan ✓</p>}</Card>
        <W.ApprovalsWidget />
      </div>
    </div>
  );
}

function AuditorDash() {
  const { db, s } = useCtx(); const go = useApp((x) => x.go);
  const tb = useMemo(() => trialBalance(db.entries, s, '2026-01-01', TODAY), [db, s]);
  const log = db.audit.slice(-10).reverse();
  return (
    <div>
      <PageHeader title="Auditor paneli" subtitle={<span className="flex items-center gap-2">Faqat ko‘rish rejimi · audit izi va nazorat tekshiruvlari <Badge tone="info">READ-ONLY</Badge></span>} actions={<Button size="sm" onClick={() => go('settings', 'audit')}>Audit jurnali</Button>} />
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Aylanma-saldo balansi', tb.balanced ? 'Balanslangan ✓' : 'Farq bor', tb.balanced], ['Provodkalar (YTD)', String(db.entries.filter((e) => s.companyIds.includes(e.companyId)).length), true], ['Storno qilinganlar', String(db.entries.filter((e) => e.status === 'reversed').length), true], ['Audit yozuvlari', String(db.audit.length), true]].map(([l, v, ok]) => <Card key={l as string} className="!p-4"><p className="text-[11.5px] text-t3">{l as string}</p><p className={cx('num mt-1.5 text-[18px] font-semibold', ok ? 'text-t1' : 'text-neg')}>{v as string}</p></Card>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Nazorat tekshiruvlari" icon={<ShieldCheck className="h-4 w-4" />} />
          {[['Har bir provodka balanslangan (Dt = Kt)', true], ['Yopilgan davrlarga yozuv kiritilmagan', true], ['Debitorlik sub-kitobi = 4010 hisobi', true], ['Ombor sub-kitobi = zaxira hisoblari', true], ['AI takliflari faqat tasdiq orqali', true], ['Ajratilgan vakolatlar (so‘rovchi ≠ tasdiqlovchi)', true]].map(([t, ok]) => <div key={t as string} className="flex items-center gap-2.5 py-1.5 text-[13px] text-t1"><CheckCircle2 className={cx('h-4 w-4', ok ? 'text-pos' : 'text-neg')} />{t as string}</div>)}
        </Card>
        <Card><CardHeader title="So‘nggi harakatlar" icon={<History className="h-4 w-4" />} />
          <div className="divide-y divide-line">{log.map((a) => <div key={a.id} className="py-1.5 text-[12.5px]"><span className="text-t3">{fmtDateTime(a.at)}</span> · <b className="font-medium text-t1">{a.user}</b> — {a.action} <span className="text-t3">{a.record}</span></div>)}</div>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDash({ name }: { name: string }) {
  const { db } = useCtx(); const { go, dispatch } = useApp();
  const acts = db.activities.filter((a) => a.owner === name || a.owner === 'Kamron Ismoilov');
  const emp = db.employees.find((e) => e.name === name);
  return (
    <div>
      <PageHeader title={`Xush kelibsiz, ${name.split(' ')[0]}`} subtitle="Shaxsiy vazifalar, so‘rovlar va hujjatlar" actions={<Button size="sm" onClick={() => go('crm', 'activities')}>Vazifalar</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Mening vazifalarim" icon={<CheckCircle2 className="h-4 w-4" />} />
          {acts.map((a) => <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2"><input type="checkbox" checked={a.done} onChange={() => dispatch('activity.toggle', { id: a.id })} className="h-4 w-4 accent-[var(--accent)]" /><span className={cx('flex-1 text-[13px]', a.done ? 'text-t3 line-through' : 'text-t1')}>{a.subject}</span><span className="text-[11px] text-t3">{fmtDate(a.due)}</span></label>)}
        </Card>
        <Card><CardHeader title="Profil" icon={<ShoppingCart className="h-4 w-4" />} />{emp && <div className="space-y-1.5 text-[12.5px]"><p className="text-t2">{emp.position}</p><p className="text-t3">{emp.department} · {byId(db.branches, emp.branchId)?.name}</p><Button size="xs" className="mt-2" onClick={() => dispatch('leave.request', { employeeId: emp.id, from: '2026-10-20', to: '2026-10-24', kind: 'Yillik ta’til' }, { success: 'Ta’til so‘rovi yuborildi' })}>Ta’til so‘rash</Button></div>}</Card>
      </div>
    </div>
  );
}
