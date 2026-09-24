'use client';
import { useMemo } from 'react';
import { ChevronsLeft, ChevronsRight, X, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { can, roleOf } from '@/lib/rbac';
import { cx, Avatar } from '@/components/ui';
import { Logo } from './Logo';
import { NAV } from './nav';
import { scopeOf, deriveAlerts } from '@/lib/analytics';
import { canDecide } from '@/lib/rbac';

export function useBadges() {
  const { db, role, filters } = useApp();
  return useMemo(() => {
    const s = scopeOf(db, filters);
    const approvals = db.approvals.filter((a) => a.status === 'pending' && s.companyIds.includes(a.companyId) && canDecide(role, a.approverRole)).length;
    const alerts = deriveAlerts(db, s).filter((a) => !db.readAlerts.includes(a.id)).length;
    return { approvals, notifications: alerts } as Record<string, number>;
  }, [db, role, filters]);
}

export function Sidebar() {
  const { nav, go, role, sidebarCollapsed: col, toggleSidebar, mobileMenu, setMobileMenu } = useApp();
  const t = useT();
  const badges = useBadges();
  const r = roleOf(role);
  const content = (collapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cx('flex h-16 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'justify-between px-4')}>
        <Logo collapsed={collapsed} />
        <button onClick={() => setMobileMenu(false)} className="grid h-8 w-8 place-items-center rounded-lg text-t3 hover:bg-surface-2 lg:hidden" aria-label="Yopish"><X className="h-4 w-4" /></button>
      </div>
      <nav className="thin-scroll flex-1 overflow-y-auto px-2.5 py-3" aria-label="Asosiy menyu">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(role, i.id));
          if (!items.length) return null;
          return (
            <div key={g.group} className="mb-3">
              {!collapsed && <div className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-t3">{t(g.group)}</div>}
              {collapsed && <div className="mx-3 mb-1.5 h-px bg-line" />}
              {items.map((i) => {
                const active = nav.module === i.id; const Icon = i.icon; const b = badges[i.id];
                return (
                  <button key={i.id} onClick={() => go(i.id)} title={collapsed ? t(`nav.${i.id}`) : undefined}
                    className={cx('group relative mb-0.5 flex w-full items-center gap-2.5 rounded-[11px] text-[13px] font-medium transition-all', collapsed ? 'h-10 justify-center' : 'h-9 px-2.5',
                      active ? 'bg-accent-soft text-accent' : 'text-t2 hover:bg-surface-2 hover:text-t1')}>
                    {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />}
                    <Icon className={cx('h-[17px] w-[17px] shrink-0', i.id === 'ai' && !active && 'text-accent')} strokeWidth={active ? 2.2 : 1.9} />
                    {!collapsed && <span className="flex-1 truncate text-left">{t(`nav.${i.id}`)}</span>}
                    {!collapsed && i.id === 'ai' && <span className="rounded-md bg-gradient-to-r from-accent to-accent-2 px-1.5 text-[9.5px] font-bold leading-4 text-white">AI</span>}
                    {b ? (collapsed ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-neg" /> : <span className="num rounded-md bg-neg/12 px-1.5 text-[10.5px] font-semibold leading-[18px] text-neg">{b}</span>) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-2xl border border-line bg-surface-2 p-3 [@media(max-height:880px)]:hidden">
          <div className="flex items-center gap-2.5">
            <Avatar name={r.persona} size={30} />
            <div className="min-w-0 flex-1"><div className="truncate text-[12.5px] font-semibold text-t1">{r.persona}</div><div className="truncate text-[11px] text-t3">{r.label}</div></div>
          </div>
          <button onClick={() => go('ai')} className="mt-2.5 flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-accent/15 to-accent-2/10 px-2.5 py-2 text-left text-[12px] font-medium text-accent hover:from-accent/25">
            <Sparkles className="h-3.5 w-3.5" /> AI CFO’dan so‘rang
          </button>
        </div>
      )}
      <button onClick={toggleSidebar} className="hidden h-11 items-center justify-center gap-2 border-t border-line text-[12px] text-t3 hover:text-t1 lg:flex" aria-label="Menyuni yig‘ish">
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Yig‘ish</>}
      </button>
    </div>
  );
  return (
    <>
      <aside className={cx('glass fixed inset-y-0 left-0 z-40 hidden !rounded-none !border-y-0 !border-l-0 transition-[width] duration-300 md:block', col ? 'w-[76px]' : 'w-[76px] lg:w-[256px]')}>
        <div className="hidden h-full lg:block">{content(col)}</div>
        <div className="h-full lg:hidden">{content(true)}</div>
      </aside>
      {mobileMenu && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="anim-fade absolute inset-0 bg-black/50" onClick={() => setMobileMenu(false)} />
          <aside className="anim-slide absolute inset-y-0 left-0 w-[284px] border-r border-line bg-surface-solid" style={{ animationName: 'none' }}>{content(false)}</aside>
        </div>
      )}
    </>
  );
}
