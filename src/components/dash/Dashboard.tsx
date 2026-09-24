'use client';
import { useState, type ReactNode } from 'react';
import { LayoutGrid, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw, Sparkles, Plus, Receipt, ShoppingCart, Factory, PackageCheck, ArrowLeftRight, UserPlus, Wallet } from 'lucide-react';
import { useApp, DEFAULT_WIDGETS, type Widget } from '@/lib/store';
import { roleOf, can, type DashboardKind } from '@/lib/rbac';
import { PageHeader, Button, Modal, cx, DemoTag, Badge } from '@/components/ui';
import { fmtDate, TODAY } from '@/lib/core/dates';
import { GROUP } from '@/lib/seed/master';
import * as W from './widgets';
import { SecondaryDash } from './SecondaryDash';

const REG: Record<string, { label: string; span?: string; render: () => ReactNode; full?: boolean }> = {
  kpis: { label: 'Asosiy ko‘rsatkichlar (9 KPI)', full: true, render: () => <W.KpiGrid ids={['revenue', 'expenses', 'gross', 'net', 'cash', 'ar', 'ap', 'inventory', 'tax']} /> },
  command: { label: 'Business Command Center', full: true, render: () => <W.CommandCenter /> },
  trend: { label: 'Tushum / xarajat / foyda grafigi', span: 'lg:col-span-2', render: () => <W.TrendChart /> },
  cash: { label: 'Pul oqimi va prognoz', render: () => <W.CashWidget /> },
  attention: { label: 'Bugun nima muhim?', render: () => <W.AttentionList /> },
  ai: { label: 'AI insightlar', render: () => <W.AiInsightsWidget /> },
  companies: { label: 'Guruh kompaniyalari', render: () => <W.CompaniesWidget /> },
  forecast: { label: '30/60/90 kunlik prognoz', render: () => <W.ForecastWidget /> },
  health: { label: 'Biznes salomatligi', render: () => <W.HealthWidget /> },
  ar: { label: 'Debitorlik yoshi', render: () => <W.ArWidget /> },
  ap: { label: 'Kreditorlik va to‘lovlar', render: () => <W.ApWidget /> },
  budget: { label: 'Byudjet nazorati', render: () => <W.BudgetWidget /> },
  taxes: { label: 'Soliq kalendari', render: () => <W.TaxWidget /> },
  approvals: { label: 'Tasdiqlash kutmoqda', render: () => <W.ApprovalsWidget /> },
  sales: { label: 'Top mijozlar', render: () => <W.SalesWidget /> },
  payroll: { label: 'Ish haqi', render: () => <W.PayrollWidget /> },
  production: { label: 'Zavod ishlab chiqarish grafigi', span: 'lg:col-span-2', render: () => <W.ProductionChart /> },
  acc_kpis: { label: 'Buxgalter ko‘rsatkichlari', full: true, render: () => <W.AccountantKpis /> },
  tasks: { label: 'Bugungi vazifalar', render: () => <W.AccountantTasks /> },
  recon: { label: 'Bank rekonsiliatsiyasi', render: () => <W.ReconWidget /> },
  journal: { label: 'So‘nggi provodkalar', span: 'lg:col-span-2', render: () => <W.RecentJournal /> },
  period: { label: 'Davrlarni yopish', render: () => <W.PeriodWidget /> },
  fac_kpis: { label: 'Zavod ko‘rsatkichlari', full: true, render: () => <W.FactoryKpis /> },
  machines: { label: 'Mashinalar', render: () => <W.MachinesWidget /> },
  workorders: { label: 'Faol ish buyurtmalari', render: () => <W.WorkOrdersWidget /> },
  materials: { label: 'Xomashyo holati', render: () => <W.MaterialsWidget /> },
  waste: { label: 'Brak / chiqindi', render: () => <W.WasteWidget /> },
  costing: { label: 'Tannarx: standart vs fakt', span: 'lg:col-span-2', render: () => <W.CostingWidget /> },
  wh_kpis: { label: 'Ombor ko‘rsatkichlari', full: true, render: () => <W.WarehouseKpis /> },
  lowstock: { label: 'Kam zaxira', render: () => <W.LowStockWidget /> },
  receiving: { label: 'Kutilayotgan kirim', render: () => <W.ReceivingWidget /> },
  shipping: { label: 'Jo‘natish navbati', render: () => <W.ShippingWidget /> },
  transfers: { label: 'Omborlar bandligi', render: () => <W.TransfersWidget /> },
  movements: { label: 'Ombor harakatlari', span: 'lg:col-span-2', render: () => <W.MovementsWidget /> },
};

const AVAILABLE: Record<string, string[]> = {
  owner: ['kpis', 'command', 'trend', 'cash', 'attention', 'ai', 'companies', 'forecast', 'health', 'ar', 'ap', 'budget', 'taxes', 'approvals', 'sales', 'payroll', 'production'],
  cfo: ['kpis', 'command', 'trend', 'cash', 'ar', 'ap', 'budget', 'ai', 'attention', 'taxes', 'forecast', 'health', 'companies', 'approvals', 'sales', 'payroll', 'production'],
  accountant: ['acc_kpis', 'tasks', 'recon', 'taxes', 'ar', 'ap', 'journal', 'period', 'attention', 'ai', 'approvals', 'budget', 'payroll'],
  factory: ['fac_kpis', 'production', 'machines', 'workorders', 'materials', 'waste', 'costing', 'attention', 'approvals', 'ai'],
  warehouse: ['wh_kpis', 'lowstock', 'receiving', 'shipping', 'transfers', 'movements', 'attention', 'approvals'],
};

const TITLES: Record<string, { title: string; sub: string }> = {
  owner: { title: 'Biznesingizning bugungi holati', sub: 'Foyda, pul, xavflar va prognoz — bir qarashda' },
  cfo: { title: 'Biznesingizning bugungi holati', sub: 'Moliyaviy natijalar, likvidlik va nazorat' },
  accountant: { title: 'Buxgalteriya ish stoli', sub: 'Provodkalar, hisob-fakturalar, soliqlar, rekonsiliatsiya va hisobotlar' },
  factory: { title: 'Zavod boshqaruv paneli', sub: 'Balans Factory — ishlab chiqarish, materiallar, mashinalar, brak va tannarx' },
  warehouse: { title: 'Ombor boshqaruv paneli', sub: 'Qoldiqlar, kirim, jo‘natish va o‘tkazmalar' },
};

const QUICK: Record<string, { label: string; icon: typeof Plus; module: string; tab?: string; params?: Record<string, string> }[]> = {
  owner: [{ label: 'AI xulosa', icon: Sparkles, module: 'ai' }, { label: 'Tasdiqlashlar', icon: Receipt, module: 'approvals' }, { label: 'Pul prognozi', icon: Wallet, module: 'finance', tab: 'treasury' }],
  cfo: [{ label: 'Hisob-faktura', icon: Receipt, module: 'finance', tab: 'ar', params: { new: '1' } }, { label: 'To‘lov', icon: Wallet, module: 'finance', tab: 'ap' }, { label: 'Tasdiqlashlar', icon: Receipt, module: 'approvals' }],
  accountant: [{ label: 'Provodka', icon: Plus, module: 'accounting', tab: 'journal', params: { new: '1' } }, { label: 'Hisob-faktura', icon: Receipt, module: 'finance', tab: 'ar', params: { new: '1' } }, { label: 'Bank', icon: ArrowLeftRight, module: 'finance', tab: 'bank' }],
  factory: [{ label: 'Ish buyurtmasi', icon: Factory, module: 'manufacturing', tab: 'orders', params: { new: '1' } }, { label: 'Xomashyo so‘rovi', icon: ShoppingCart, module: 'purchasing', tab: 'requests', params: { new: '1' } }],
  warehouse: [{ label: 'Qabul qilish', icon: PackageCheck, module: 'warehouse', tab: 'receiving' }, { label: 'O‘tkazma', icon: ArrowLeftRight, module: 'warehouse', tab: 'transfers', params: { new: '1' } }, { label: 'Inventarizatsiya', icon: UserPlus, module: 'warehouse', tab: 'count' }],
};

export default function Dashboard() {
  const { role, widgets, setWidgets, filters, db, go } = useApp();
  const kind = roleOf(role).home as DashboardKind;
  const [edit, setEdit] = useState(false);
  if (!['owner', 'cfo', 'accountant', 'factory', 'warehouse'].includes(kind)) return <SecondaryDash kind={kind} />;
  const list: Widget[] = widgets[kind] || DEFAULT_WIDGETS[kind].map((id) => ({ id, visible: true }));
  const visible = list.filter((w) => w.visible && REG[w.id]);
  const t = TITLES[kind];
  const ctx = filters.companyId === 'all' ? GROUP.name : db.companies.find((c) => c.id === filters.companyId)?.name;

  return (
    <div>
      <PageHeader title={t.title}
        subtitle={<span className="flex flex-wrap items-center gap-2">{t.sub}<span className="hidden text-t3 sm:inline">·</span><span className="hidden text-t3 sm:inline">{ctx} · {fmtDate(filters.from)}–{fmtDate(filters.to)} · bugun {fmtDate(TODAY)}</span><DemoTag /></span>}
        actions={<>
          {QUICK[kind]?.filter((q) => can(role, q.module as never)).slice(0, 2).map((q) => { const I = q.icon; return <Button key={q.label} size="sm" icon={<I className="h-3.5 w-3.5" />} onClick={() => go(q.module as never, q.tab, q.params)} className="hidden sm:inline-flex">{q.label}</Button>; })}
          <Button size="sm" variant="soft" icon={<LayoutGrid className="h-3.5 w-3.5" />} onClick={() => setEdit(true)}>Vidjetlar</Button>
        </>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {visible.map((w) => { const r = REG[w.id]; return <div key={w.id} className={cx('min-w-0', r.full ? 'lg:col-span-3' : r.span)}>{r.render()}</div>; })}
      </div>
      <WidgetEditor open={edit} onClose={() => setEdit(false)} kind={kind} list={list} onChange={(l) => setWidgets(kind, l)} />
    </div>
  );
}

function WidgetEditor({ open, onClose, kind, list, onChange }: { open: boolean; onClose: () => void; kind: string; list: Widget[]; onChange: (l: Widget[]) => void }) {
  const avail = AVAILABLE[kind];
  const full: Widget[] = [...list.filter((w) => REG[w.id]), ...avail.filter((id) => !list.some((w) => w.id === id)).map((id) => ({ id, visible: false }))];
  const move = (i: number, d: number) => { const n = [...full]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <Modal open={open} onClose={onClose} title="Boshqaruv panelini sozlash" subtitle="Vidjetlarni qo‘shing, olib tashlang va tartibini o‘zgartiring. Sozlama brauzerda saqlanadi." icon={<LayoutGrid className="h-4 w-4" />}
      footer={<><Button variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => onChange(DEFAULT_WIDGETS[kind].map((id) => ({ id, visible: true })))}>Standart</Button><Button variant="primary" onClick={onClose}>Tayyor</Button></>}>
      <div className="space-y-1.5">
        {full.map((w, i) => (
          <div key={w.id} className={cx('flex items-center gap-2 rounded-xl border px-3 py-2', w.visible ? 'border-line bg-surface-2' : 'border-dashed border-line opacity-70')}>
            <span className="flex-1 text-[13px] text-t1">{REG[w.id].label}</span>
            {!w.visible && <Badge>yashirin</Badge>}
            <button onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded-lg text-t3 hover:bg-surface-3 hover:text-t1" aria-label="Yuqoriga"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded-lg text-t3 hover:bg-surface-3 hover:text-t1" aria-label="Pastga"><ArrowDown className="h-3.5 w-3.5" /></button>
            <button onClick={() => onChange(full.map((x) => (x.id === w.id ? { ...x, visible: !x.visible } : x)))} className={cx('grid h-7 w-7 place-items-center rounded-lg', w.visible ? 'text-accent hover:bg-accent-soft' : 'text-t3 hover:bg-surface-3')} aria-label={w.visible ? 'Yashirish' : 'Ko‘rsatish'}>{w.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
