'use client';
import { create } from 'zustand';
import type { DB, Ctx } from './db';
import { OpError, nowTime } from './db';
import { simulate } from './seed/simulate';
import { runAction } from './actions';
import type { Currency, Lang, RoleId, ModuleId } from './types';
import { TODAY } from './core/dates';
import { roleOf } from './rbac';
import { registerAccount, resetCustomAccounts } from './core/coa';

export interface LoggedAction { type: string; payload: unknown; ctx: Ctx }

export type Toast = { id: number; kind: 'success' | 'error' | 'info'; title: string; body?: string };

export interface Filters { companyId: string | 'all'; branchId: string | 'all'; warehouseId: string | 'all'; currency: Currency; from: string; to: string }

export interface NavState { module: ModuleId; tab?: string; params?: Record<string, string> }

export interface Widget { id: string; visible: boolean }

interface Store {
  ready: boolean;
  db: DB;
  log: LoggedAction[];
  role: RoleId;
  lang: Lang;
  theme: 'dark' | 'light';
  filters: Filters;
  nav: NavState;
  sidebarCollapsed: boolean;
  mobileMenu: boolean;
  aiOpen: boolean;
  aiPrompt?: string;
  searchOpen: boolean;
  toasts: Toast[];
  widgets: Record<string, Widget[]>;
  init: () => void;
  dispatch: <T = unknown>(type: string, payload: unknown, opts?: { success?: string; silent?: boolean }) => T | undefined;
  setRole: (r: RoleId) => void;
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
  setFilters: (f: Partial<Filters>) => void;
  go: (module: ModuleId, tab?: string, params?: Record<string, string>) => void;
  toggleSidebar: () => void;
  setMobileMenu: (v: boolean) => void;
  openAi: (prompt?: string) => void;
  closeAi: () => void;
  setSearch: (v: boolean) => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
  setWidgets: (dash: string, w: Widget[]) => void;
  resetDemo: () => void;
}

const LS_LOG = 'balans.log.v3';
const LS_PREF = 'balans.pref.v3';

let seedCache: string | null = null;
function freshDb(): DB {
  // Build once, then deep-clone from JSON (fast) for resets
  if (!seedCache) { resetCustomAccounts(); seedCache = JSON.stringify(simulate()); }
  resetCustomAccounts();
  return JSON.parse(seedCache);
}

function replay(db: DB, log: LoggedAction[]): { db: DB; log: LoggedAction[] } {
  const ok: LoggedAction[] = [];
  for (const a of log) {
    try { runAction(db, a.type, a.payload, a.ctx); ok.push(a); } catch { /* drop actions that no longer apply */ }
  }
  for (const acc of db.customAccounts) registerAccount(acc);
  return { db, log: ok };
}

const defaultFilters: Filters = { companyId: 'all', branchId: 'all', warehouseId: 'all', currency: 'UZS', from: '2026-09-01', to: TODAY };

export const DEFAULT_WIDGETS: Record<string, string[]> = {
  owner: ['kpis', 'command', 'trend', 'cash', 'attention', 'ai', 'companies', 'forecast'],
  cfo: ['kpis', 'command', 'trend', 'cash', 'ar', 'ap', 'budget', 'ai', 'attention', 'taxes'],
  accountant: ['acc_kpis', 'tasks', 'recon', 'taxes', 'ar', 'ap', 'journal', 'period'],
  factory: ['fac_kpis', 'production', 'machines', 'workorders', 'materials', 'waste', 'costing'],
  warehouse: ['wh_kpis', 'lowstock', 'receiving', 'shipping', 'transfers', 'movements'],
};

export const useApp = create<Store>((set, get) => ({
  ready: false,
  db: null as unknown as DB,
  log: [],
  role: 'cfo',
  lang: 'uz',
  theme: 'dark',
  filters: defaultFilters,
  nav: { module: 'dashboard' },
  sidebarCollapsed: false,
  mobileMenu: false,
  aiOpen: false,
  searchOpen: false,
  toasts: [],
  widgets: Object.fromEntries(Object.entries(DEFAULT_WIDGETS).map(([k, v]) => [k, v.map((id) => ({ id, visible: true }))])),

  init: () => {
    if (get().ready) return;
    let log: LoggedAction[] = [];
    let pref: Partial<Store> = {};
    try { log = JSON.parse(localStorage.getItem(LS_LOG) || '[]'); pref = JSON.parse(localStorage.getItem(LS_PREF) || '{}'); } catch { /* ignore */ }
    const r = replay(freshDb(), log);
    const theme = (pref.theme as 'dark' | 'light') || 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ ready: true, db: r.db, log: r.log, role: pref.role || 'cfo', lang: pref.lang || 'uz', theme, widgets: pref.widgets || get().widgets, filters: { ...defaultFilters, ...(pref.filters || {}), from: pref.filters?.from || defaultFilters.from, to: pref.filters?.to || defaultFilters.to } });
  },

  dispatch: (type, payload, opts) => {
    const { db, role, log } = get();
    const ctx: Ctx = { user: roleOf(role).persona, role, date: TODAY, time: nowTime() };
    // copy-on-write at the top level; operations mutate nested records in the draft
    const draft: DB = structuredClone(db);
    try {
      const result = runAction(draft, type, payload, ctx);
      draft.entries = [...draft.entries]; // new array identity → ledger caches invalidate
      const nextLog = type === 'alert.read' ? log : [...log, { type, payload, ctx }];
      set({ db: draft, log: nextLog });
      try { localStorage.setItem(LS_LOG, JSON.stringify(nextLog)); } catch { /* quota */ }
      if (opts?.success && !opts.silent) get().toast({ kind: 'success', title: opts.success });
      return result as never;
    } catch (e) {
      const msg = e instanceof OpError || e instanceof Error ? e.message : String(e);
      get().toast({ kind: 'error', title: 'Amal bajarilmadi', body: msg });
      return undefined;
    }
  },

  setRole: (r) => { set({ role: r, nav: { module: 'dashboard' } }); persistPref(get()); },
  setLang: (l) => { set({ lang: l }); document.documentElement.lang = l; persistPref(get()); },
  toggleTheme: () => { const theme = get().theme === 'dark' ? 'light' : 'dark'; document.documentElement.classList.toggle('dark', theme === 'dark'); set({ theme }); persistPref(get()); },
  setFilters: (f) => { set({ filters: { ...get().filters, ...f } }); persistPref(get()); },
  go: (module, tab, params) => { set({ nav: { module, tab, params }, mobileMenu: false, searchOpen: false }); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }); },
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  setMobileMenu: (v) => set({ mobileMenu: v }),
  openAi: (prompt) => set({ aiOpen: true, aiPrompt: prompt }),
  closeAi: () => set({ aiOpen: false, aiPrompt: undefined }),
  setSearch: (v) => set({ searchOpen: v }),
  toast: (t) => { const id = Date.now() + Math.random(); set({ toasts: [...get().toasts, { ...t, id }] }); setTimeout(() => get().dismiss(id), t.kind === 'error' ? 7000 : 4200); },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  setWidgets: (dash, w) => { set({ widgets: { ...get().widgets, [dash]: w } }); persistPref(get()); },
  resetDemo: () => { localStorage.removeItem(LS_LOG); set({ db: freshDb(), log: [] }); get().toast({ kind: 'info', title: 'Demo ma’lumotlar qayta tiklandi' }); },
}));

function persistPref(s: Store) {
  try { localStorage.setItem(LS_PREF, JSON.stringify({ role: s.role, lang: s.lang, theme: s.theme, filters: s.filters, widgets: s.widgets })); } catch { /* ignore */ }
}
