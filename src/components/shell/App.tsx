'use client';
import { useEffect, lazy, Suspense } from 'react';
import { useApp } from '@/lib/store';
import { can } from '@/lib/rbac';
import { useT } from '@/lib/i18n';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { Toaster, Empty, Skeleton, Button, cx } from '@/components/ui';
import { LogoMark } from './Logo';
import { Lock, Sparkles } from 'lucide-react';
import type { ModuleId } from '@/lib/types';

// Lazy-loaded modules (code-splitting per module)
const MODULES: Record<ModuleId, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: lazy(() => import('@/components/dash/Dashboard')),
  ai: lazy(() => import('@/components/ai/AiPage')),
  approvals: lazy(() => import('@/components/modules/Approvals')),
  accounting: lazy(() => import('@/components/modules/Accounting')),
  finance: lazy(() => import('@/components/modules/Finance')),
  sales: lazy(() => import('@/components/modules/Sales')),
  purchasing: lazy(() => import('@/components/modules/Purchasing')),
  inventory: lazy(() => import('@/components/modules/Inventory')),
  warehouse: lazy(() => import('@/components/modules/Warehouse')),
  manufacturing: lazy(() => import('@/components/modules/Manufacturing')),
  crm: lazy(() => import('@/components/modules/Crm')),
  hr: lazy(() => import('@/components/modules/Hr')),
  taxes: lazy(() => import('@/components/modules/Taxes')),
  documents: lazy(() => import('@/components/modules/Documents')),
  assets: lazy(() => import('@/components/modules/Assets')),
  projects: lazy(() => import('@/components/modules/Projects')),
  reports: lazy(() => import('@/components/modules/Reports')),
  analytics: lazy(() => import('@/components/modules/Analytics')),
  notifications: lazy(() => import('@/components/modules/Notifications')),
  settings: lazy(() => import('@/components/modules/Settings')),
};
const AiDrawer = lazy(() => import('@/components/ai/AiDrawer'));

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-72" /><Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-3 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>
    </div>
  );
}

function Boot() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="anim-pop"><LogoMark size={56} /></div>
        <div className="text-[15px] font-semibold text-t1">BALANS AI</div>
        <div className="text-[12.5px] text-t3">Demo kompaniya ma’lumotlari hisoblanmoqda…</div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-3"><div className="skeleton h-full w-full" /></div>
      </div>
    </div>
  );
}

export function App() {
  const { ready, init, nav, role, sidebarCollapsed, aiOpen, openAi, go } = useApp();
  const t = useT();
  useEffect(() => { const id = setTimeout(init, 10); return () => clearTimeout(id); }, [init]);
  useEffect(() => { (window as unknown as { __go: typeof go }).__go = go; }, [go]);
  if (!ready) return <Boot />;
  const Mod = MODULES[nav.module];
  const allowed = can(role, nav.module);
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={cx('transition-[padding] duration-300 md:pl-[76px]', !sidebarCollapsed && 'lg:pl-[256px]')}>
        <Topbar />
        <main className="mx-auto max-w-[1600px] px-3 pb-28 pt-4 sm:px-5 md:pb-10 lg:px-7" key={nav.module + (nav.tab || '')}>
          <Suspense fallback={<PageSkeleton />}>
            {allowed ? <Mod /> : <Empty icon={<Lock className="h-5 w-5" />} title={t('common.noAccess')} body="Joriy rolingiz uchun bu bo‘lim yopiq. Rolni profil menyusidan o‘zgartirishingiz mumkin (demo)." action={<Button onClick={() => go('dashboard')}>Boshqaruv paneliga qaytish</Button>} />}
          </Suspense>
        </main>
      </div>
      <MobileNav />
      <GlobalSearch />
      {aiOpen && <Suspense fallback={null}><AiDrawer /></Suspense>}
      {!aiOpen && nav.module !== 'ai' && can(role, 'ai') && (
        <button onClick={() => openAi()} className="anim-pop fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-2xl bg-gradient-to-br from-accent to-accent-2 py-3 pl-3.5 pr-4 text-[13px] font-semibold text-white shadow-[0_14px_40px_-10px_var(--accent)] transition hover:scale-[1.03] md:flex" aria-label="AI CFO">
          <span className="relative grid h-7 w-7 place-items-center rounded-xl bg-white/15"><Sparkles className="h-4 w-4" /><span className="live-dot absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-300" /></span>AI CFO
        </button>
      )}
      <Toaster />
    </div>
  );
}
