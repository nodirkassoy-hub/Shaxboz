'use client';
import { Search, Bell, Sun, Moon, Menu as MenuIcon, Building2, GitBranch, Coins, CalendarRange, ChevronDown, UserCog, RotateCcw, Sparkles, Check, LogOut, Shield } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { ROLES, roleOf } from '@/lib/rbac';
import { cx, Menu, MenuItem, IconButton, Kbd, Avatar, Badge } from '@/components/ui';
import { GROUP } from '@/lib/seed/master';
import { TODAY, addDays, fmtDate, monthStart, quarterOf, FY_START } from '@/lib/core/dates';
import type { Currency, Lang } from '@/lib/types';
import { useBadges } from './Sidebar';
import { deriveAlerts, scopeOf } from '@/lib/analytics';
import { useMemo } from 'react';

const PERIODS = [
  { id: 'mtd', label: 'Shu oy (MTD)', from: monthStart(TODAY), to: TODAY },
  { id: 'last30', label: 'Oxirgi 30 kun', from: addDays(TODAY, -29), to: TODAY },
  { id: 'lastm', label: 'O‘tgan oy', from: '2026-08-01', to: '2026-08-31' },
  { id: 'qtd', label: `Shu chorak (${quarterOf(TODAY)}-chorak)`, from: '2026-07-01', to: TODAY },
  { id: 'ytd', label: 'Yil boshidan (YTD)', from: FY_START, to: TODAY },
];

export function Topbar() {
  const { db, filters, setFilters, theme, toggleTheme, lang, setLang, role, setRole, setSearch, openAi, setMobileMenu, go, resetDemo, dispatch } = useApp();
  const t = useT();
  const badges = useBadges();
  const company = db.companies.find((c) => c.id === filters.companyId);
  const branches = company ? db.branches.filter((b) => company.branchIds.includes(b.id)) : db.branches;
  const period = PERIODS.find((p) => p.from === filters.from && p.to === filters.to);
  const alerts = useMemo(() => deriveAlerts(db, scopeOf(db, filters)).filter((a) => !db.readAlerts.includes(a.id)).slice(0, 6), [db, filters]);
  const pill = 'flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5 text-[12.5px] font-medium text-t1 transition hover:border-line-strong';

  return (
    <header className="glass sticky top-0 z-30 !rounded-none !border-x-0 !border-t-0">
      <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
        <IconButton label="Menyu" onClick={() => setMobileMenu(true)} className="md:hidden"><MenuIcon className="h-5 w-5" /></IconButton>

        {/* Company */}
        <Menu align="left" width="w-72" trigger={({ toggle, open }) => (
          <button onClick={toggle} className={cx(pill, 'max-w-[190px] sm:max-w-none')} aria-expanded={open}>
            <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: company ? company.color + '22' : 'var(--accent-soft)', color: company?.color || 'var(--accent)' }}><Building2 className="h-3.5 w-3.5" /></span>
            <span className="truncate">{company ? company.name : GROUP.name}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-t3" />
          </button>
        )}>
          {(close) => (
            <>
              <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-t3">Kompaniya</div>
              <MenuItem active={filters.companyId === 'all'} icon={<Building2 className="h-4 w-4" />} hint="konsolidatsiya" onClick={() => { setFilters({ companyId: 'all', branchId: 'all', warehouseId: 'all' }); close(); }}>{GROUP.name}</MenuItem>
              {db.companies.map((c) => <MenuItem key={c.id} active={filters.companyId === c.id} icon={<span className="block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />} hint={{ trading: 'Savdo', manufacturing: 'Zavod', services: 'Xizmat' }[c.kind]} onClick={() => { setFilters({ companyId: c.id, branchId: 'all', warehouseId: 'all' }); close(); }}>{c.name}</MenuItem>)}
            </>
          )}
        </Menu>

        {/* Branch */}
        <Menu align="left" width="w-56" trigger={({ toggle }) => (
          <button onClick={toggle} className={cx(pill, 'hidden sm:flex')}><GitBranch className="h-3.5 w-3.5 text-t3" /><span>{filters.branchId === 'all' ? t('top.allBranches') : db.branches.find((b) => b.id === filters.branchId)?.name}</span><ChevronDown className="h-3.5 w-3.5 text-t3" /></button>
        )}>
          {(close) => (
            <>
              <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-t3">Filial</div>
              <MenuItem active={filters.branchId === 'all'} onClick={() => { setFilters({ branchId: 'all' }); close(); }}>{t('top.allBranches')}</MenuItem>
              {branches.map((b) => <MenuItem key={b.id} active={filters.branchId === b.id} hint={b.city} onClick={() => { setFilters({ branchId: b.id }); close(); }}>{b.name}</MenuItem>)}
            </>
          )}
        </Menu>

        {/* Period */}
        <Menu align="left" width="w-64" trigger={({ toggle }) => (
          <button onClick={toggle} className={cx(pill, 'hidden lg:flex')}><CalendarRange className="h-3.5 w-3.5 text-t3" /><span>{period?.label || `${fmtDate(filters.from)} – ${fmtDate(filters.to)}`}</span><ChevronDown className="h-3.5 w-3.5 text-t3" /></button>
        )}>
          {(close) => (
            <>
              <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-t3">Davr</div>
              {PERIODS.map((p) => <MenuItem key={p.id} active={period?.id === p.id} onClick={() => { setFilters({ from: p.from, to: p.to }); close(); }} hint={`${fmtDate(p.from).slice(0, 5)}–${fmtDate(p.to).slice(0, 5)}`}>{p.label}</MenuItem>)}
              <div className="mt-1 grid grid-cols-2 gap-1.5 border-t border-line p-2">
                <input type="date" className="field h-8 !px-2 text-[12px]" value={filters.from} max={filters.to} min="2026-01-01" onChange={(e) => e.target.value && setFilters({ from: e.target.value })} aria-label="Boshlanish" />
                <input type="date" className="field h-8 !px-2 text-[12px]" value={filters.to} min={filters.from} max={TODAY} onChange={(e) => e.target.value && setFilters({ to: e.target.value })} aria-label="Tugash" />
              </div>
            </>
          )}
        </Menu>

        {/* Search */}
        <button onClick={() => setSearch(true)} className="ml-1 hidden h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-[12.5px] text-t3 transition hover:border-line-strong md:flex lg:max-w-md">
          <Search className="h-4 w-4 shrink-0" /><span className="truncate">{t('top.search')}</span><span className="ml-auto flex gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
        </button>
        <div className="flex-1 md:hidden" />

        <IconButton label="Qidirish" onClick={() => setSearch(true)} className="md:hidden"><Search className="h-[18px] w-[18px]" /></IconButton>

        <button onClick={() => openAi()} className="hidden h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-3 text-[12.5px] font-semibold text-white shadow-[0_6px_20px_-8px_var(--accent)] transition hover:brightness-110 sm:flex">
          <Sparkles className="h-4 w-4" /> AI CFO
        </button>

        {/* Currency */}
        <Menu width="w-44" trigger={({ toggle }) => <button onClick={toggle} className={cx(pill, 'hidden sm:flex')}><Coins className="h-3.5 w-3.5 text-t3" />{filters.currency}</button>}>
          {(close) => (<>
            <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-t3">Taqdimot valyutasi</div>
            {(['UZS', 'USD', 'EUR'] as Currency[]).map((c) => <MenuItem key={c} active={filters.currency === c} hint={c === 'UZS' ? 'asosiy' : c === 'USD' ? '12 650' : '14 300'} onClick={() => { setFilters({ currency: c }); close(); }}>{c === 'UZS' ? 'So‘m (UZS)' : c}</MenuItem>)}
            <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] leading-snug text-t3">Demo kurs. CBU API ulanmagan.</p>
          </>)}
        </Menu>

        {/* Notifications */}
        <Menu width="w-[340px]" trigger={({ toggle }) => (
          <IconButton label="Bildirishnomalar" onClick={toggle} className="relative"><Bell className="h-[18px] w-[18px]" />{badges.notifications ? <span className="num absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-neg px-1 text-[9.5px] font-bold text-white">{badges.notifications}</span> : null}</IconButton>
        )}>
          {(close) => (
            <div>
              <div className="flex items-center justify-between px-2.5 py-1.5"><span className="text-[13px] font-semibold text-t1">Bildirishnomalar</span>
                {alerts.length > 0 && <button className="text-[11.5px] font-medium text-accent" onClick={() => dispatch('alert.read', { ids: deriveAlerts(db, scopeOf(db, filters)).map((a) => a.id) })}>Hammasini o‘qilgan deb belgilash</button>}</div>
              <div className="thin-scroll max-h-80 overflow-y-auto">
                {alerts.length === 0 && <p className="px-3 py-6 text-center text-[12.5px] text-t3">Yangi bildirishnoma yo‘q</p>}
                {alerts.map((a) => (
                  <button key={a.id} onClick={() => { dispatch('alert.read', { ids: [a.id] }); go(a.module as never, a.tab, a.params); close(); }} className="flex w-full gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-surface-2">
                    <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', { red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-500', blue: 'bg-sky-500', green: 'bg-emerald-500' }[a.level])} />
                    <span className="min-w-0"><span className="block text-[12.5px] font-medium text-t1">{a.title}</span><span className="block text-[11.5px] leading-snug text-t3">{a.body}</span></span>
                  </button>
                ))}
              </div>
              <button onClick={() => { go('notifications'); close(); }} className="mt-1 w-full rounded-xl py-2 text-center text-[12px] font-medium text-accent hover:bg-surface-2">Bildirishnomalar markazi →</button>
            </div>
          )}
        </Menu>

        <IconButton label={theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'} onClick={toggleTheme} className="hidden sm:grid">{theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</IconButton>

        {/* Profile / role / language */}
        <Menu width="w-72" trigger={({ toggle }) => (
          <button onClick={toggle} className="flex items-center gap-2 rounded-xl p-1 pr-1.5 transition hover:bg-surface-2" aria-label="Profil">
            <Avatar name={roleOf(role).persona} size={32} />
            <span className="hidden text-left leading-tight xl:block"><span className="block text-[12.5px] font-semibold text-t1">{roleOf(role).persona}</span><span className="block text-[11px] text-t3">{roleOf(role).label}</span></span>
          </button>
        )}>
          {(close) => (
            <div>
              <div className="flex items-center gap-2.5 px-2.5 py-2"><Avatar name={roleOf(role).persona} size={36} /><div className="min-w-0"><div className="truncate text-[13px] font-semibold text-t1">{roleOf(role).persona}</div><div className="truncate text-[11.5px] text-t3">{roleOf(role).title}</div></div></div>
              <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-t3 flex items-center gap-1.5"><UserCog className="h-3 w-3" /> {t('top.role')} <Badge tone="warn">DEMO</Badge></div>
              <div className="thin-scroll max-h-60 overflow-y-auto">
                {ROLES.map((r) => <MenuItem key={r.id} active={role === r.id} icon={role === r.id ? <Check className="h-3.5 w-3.5" /> : <span className="block w-3.5" />} onClick={() => { setRole(r.id); close(); }}>{r.label}</MenuItem>)}
              </div>
              <div className="mt-1 border-t border-line px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-t3">Til</div>
              <div className="flex gap-1 px-2 pb-2">
                {(['uz', 'ru', 'en'] as Lang[]).map((l) => <button key={l} onClick={() => setLang(l)} className={cx('h-8 flex-1 rounded-lg text-[12px] font-semibold uppercase', lang === l ? 'bg-accent text-white' : 'bg-surface-2 text-t2 hover:text-t1')}>{l}</button>)}
              </div>
              <div className="border-t border-line pt-1">
                <MenuItem icon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} onClick={() => { toggleTheme(); }}>{theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'}</MenuItem>
                <MenuItem icon={<Shield className="h-4 w-4" />} onClick={() => { go('settings', 'security'); close(); }}>Xavfsizlik</MenuItem>
                <MenuItem icon={<RotateCcw className="h-4 w-4" />} onClick={() => { if (confirm('Barcha kiritilgan o‘zgarishlar o‘chiriladi va demo ma’lumotlar qayta tiklanadi. Davom etasizmi?')) { resetDemo(); close(); } }}>Demo ma’lumotlarni tiklash</MenuItem>
                <MenuItem icon={<LogOut className="h-4 w-4" />} onClick={() => { close(); useApp.getState().toast({ kind: 'info', title: 'Demo rejim', body: 'Autentifikatsiya serveri ulanmagan — chiqish imitatsiya qilinmaydi.' }); }}>Chiqish</MenuItem>
              </div>
            </div>
          )}
        </Menu>
      </div>
      {/* Mobile filter row */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2.5 lg:hidden">
        <select aria-label="Davr" className="field h-8 w-auto !py-0 text-[12px]" value={period?.id || ''} onChange={(e) => { const p = PERIODS.find((x) => x.id === e.target.value); if (p) setFilters({ from: p.from, to: p.to }); }}>
          {!period && <option value="">{fmtDate(filters.from)} – {fmtDate(filters.to)}</option>}
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select aria-label="Filial" className="field h-8 w-auto !py-0 text-[12px] sm:hidden" value={filters.branchId} onChange={(e) => setFilters({ branchId: e.target.value })}>
          <option value="all">{t('top.allBranches')}</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select aria-label="Valyuta" className="field h-8 w-auto !py-0 text-[12px] sm:hidden" value={filters.currency} onChange={(e) => setFilters({ currency: e.target.value as Currency })}>
          <option value="UZS">UZS</option><option value="USD">USD</option><option value="EUR">EUR</option>
        </select>
        <button onClick={toggleTheme} className="field grid h-8 w-8 shrink-0 place-items-center !p-0 sm:hidden" aria-label="Mavzu">{theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}</button>
      </div>
    </header>
  );
}
