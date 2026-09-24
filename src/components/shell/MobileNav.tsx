'use client';
import { LayoutDashboard, Sparkles, CheckCheck, Landmark, Menu } from 'lucide-react';
import { useApp } from '@/lib/store';
import { can } from '@/lib/rbac';
import { cx } from '@/components/ui';
import { useBadges } from './Sidebar';
import type { ModuleId } from '@/lib/types';

// Mobile priority: Dashboard · AI CFO · Approvals · Cash · (more → Sales, Inventory, Notifications …)
export function MobileNav() {
  const { nav, go, role, setMobileMenu } = useApp();
  const badges = useBadges();
  const items: { id: ModuleId; label: string; icon: typeof Menu; tab?: string }[] = [
    { id: 'dashboard', label: 'Asosiy', icon: LayoutDashboard },
    { id: 'approvals', label: 'Tasdiq', icon: CheckCheck },
    { id: 'ai', label: 'AI CFO', icon: Sparkles },
    { id: 'finance', label: 'Pul', icon: Landmark, tab: 'treasury' },
  ];
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 !rounded-none !border-x-0 !border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobil menyu">
      <div className="grid grid-cols-5">
        {items.filter((i) => can(role, i.id)).map((i) => {
          const active = nav.module === i.id; const Icon = i.icon; const b = badges[i.id];
          return (
            <button key={i.id} onClick={() => go(i.id, i.tab)} className={cx('relative flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium', active ? 'text-accent' : 'text-t3')}>
              {i.id === 'ai' ? <span className={cx('-mt-5 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_8px_24px_-6px_var(--accent)]')}><Icon className="h-5 w-5" /></span> : <Icon className="h-5 w-5" />}
              {i.label}
              {b ? <span className="num absolute right-[22%] top-1.5 rounded-full bg-neg px-1 text-[9px] font-bold leading-[14px] text-white">{b}</span> : null}
            </button>
          );
        })}
        <button onClick={() => setMobileMenu(true)} className="relative flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] font-medium text-t3"><Menu className="h-5 w-5" />Ko‘proq{badges.notifications ? <span className="absolute right-[26%] top-2 h-2 w-2 rounded-full bg-neg" /> : null}</button>
      </div>
    </nav>
  );
}
