'use client';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useApp } from '@/lib/store';
import { can } from '@/lib/rbac';
import { useT } from '@/lib/i18n';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { GlobalSearch } from './GlobalSearch';
import { Toaster, Empty, Skeleton, Button, cx } from '@/components/ui';
import { LogoMark } from './Logo';
import { Lock, Sparkles, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import type { ModuleId } from '@/lib/types';
import { useBilling } from '@/lib/billing/store';
import { UpgradeGate } from '@/components/billing/UpgradeGate';
import { TrialBar } from '@/components/billing/TrialBar';

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

/** Yuklanish holati — 300 ms dan keyin progress ko‘rsatiladi, skeleton 1 s ichida almashadi. */
function Boot({ slow }: { slow: boolean }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto anim-pop"><LogoMark size={52} /></div>
        <div className="mt-4 text-[15px] font-semibold text-t1">BALANS AI</div>
        <div className="mt-1 text-[12.5px] text-t3">{slow ? 'Demo ma’lumotlar yuklanmoqda…' : 'Ish stoli tayyorlanmoqda…'}</div>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-3"><div className="skeleton h-full w-2/3" /></div>
        <div className="mt-6 space-y-2 opacity-60">
          <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}

function LoadError({ message, detail, onRetry }: { message: string; detail?: string | null; onRetry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface-solid p-6 text-center shadow-pop">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-neg/10 text-neg"><WifiOff className="h-6 w-6" /></div>
        <h1 className="mt-4 text-[17px] font-semibold text-t1">Ma’lumotlarni yuklab bo‘lmadi</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-t2">{message}</p>
        {detail && <p className="mt-2 break-words rounded-xl bg-surface-2 p-2 font-mono text-[11px] text-t3">{detail}</p>}
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="primary" size="md" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>Qayta urinish</Button>
          <Button size="md" onClick={() => window.location.reload()}>Sahifani yangilash</Button>
        </div>
        <p className="mt-4 text-[11.5px] leading-relaxed text-t3">Muammo davom etsa: internet aloqasini tekshiring yoki <a href="/contact" className="text-accent hover:underline">qo‘llab-quvvatlashga</a> yozing.</p>
      </div>
    </div>
  );
}

export function App() {
  const { status, error, errorDetail, init, retry, nav, role, sidebarCollapsed, aiOpen, openAi, go, readOnly } = useApp();
  const t = useT();
  const initBilling = useBilling((s) => s.init);
  const [slow, setSlow] = useState(false);

  useEffect(() => { void initBilling(); }, [initBilling]);
  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    if (status !== 'loading') { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 350);
    return () => clearTimeout(id);
  }, [status]);

  useEffect(() => { (window as unknown as { __go: typeof go }).__go = go; }, [go]);

  if (status === 'error') return <LoadError message={error || 'Noma’lum xatolik'} detail={errorDetail} onRetry={() => void retry()} />;
  if (status !== 'ready') return <Boot slow={slow} />;

  const Mod = MODULES[nav.module];
  const roleAllowed = can(role, nav.module);
  const planAllowed = useBilling.getState().canUse(nav.module);
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className={cx('transition-[padding] duration-300 md:pl-[76px]', !sidebarCollapsed && 'lg:pl-[256px]')}>
        <Topbar />
        <main className="mx-auto max-w-[1600px] px-3 pb-28 pt-4 sm:px-5 md:pb-10 lg:px-7" key={nav.module + (nav.tab || '') + (readOnly ? '-ro' : '')}>
          <TrialBar />
          <Suspense fallback={<PageSkeleton />}>
            {!roleAllowed ? (
              <Empty icon={<Lock className="h-5 w-5" />} title={t('common.noAccess')} body="Joriy rolingiz uchun bu bo‘lim yopiq. Rolni profil menyusidan o‘zgartirishingiz mumkin (demo)." action={<Button onClick={() => go('dashboard')}>Boshqaruv paneliga qaytish</Button>} />
            ) : !planAllowed ? (
              <UpgradeGate module={nav.module} />
            ) : (
              <Mod />
            )}
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
      <UpgradeGate.Modal />
      <Toaster />
    </div>
  );
}

/** Ichki xato uchun zaxira UI (error boundary) — sahifa oq bo‘lib qolmasin. */
export function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface-solid p-6 text-center shadow-pop">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-warn/10 text-warn"><AlertTriangle className="h-6 w-6" /></div>
        <h1 className="mt-4 text-[17px] font-semibold text-t1">Kutilmagan xatolik</h1>
        <p className="mt-1.5 text-[13px] text-t2">Sahifani qayta yuklab ko‘ring. Muammo takrorlansa, bizga xabar bering.</p>
        <p className="mt-2 break-words rounded-xl bg-surface-2 p-2 font-mono text-[11px] text-t3">{error.message}</p>
        <div className="mt-5"><Button variant="primary" size="md" icon={<RefreshCw className="h-4 w-4" />} onClick={reset}>Qayta urinish</Button></div>
      </div>
    </div>
  );
}
