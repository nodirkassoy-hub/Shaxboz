'use client';
import { create } from 'zustand';
import type { DB, Ctx } from './db';
import { OpError, nowTime } from './db';
import { runAction } from './actions';
import type { Currency, Lang, RoleId, ModuleId } from './types';
import { TODAY } from './core/dates';
import { roleOf } from './rbac';
import { registerAccount } from './core/coa';
import { loadDemo, getCached, DemoLoadError, type DemoErrorCode, type DemoPayload } from './demo/loader';
import type { Brand } from './demo/types';

export interface LoggedAction { type: string; payload: unknown; ctx: Ctx }

export type Toast = { id: number; kind: 'success' | 'error' | 'info'; title: string; body?: string };

export interface Filters { companyId: string | 'all'; branchId: string | 'all'; warehouseId: string | 'all'; currency: Currency; from: string; to: string }

export interface NavState { module: ModuleId; tab?: string; params?: Record<string, string> }

export interface Widget { id: string; visible: boolean }

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface Store {
  status: LoadStatus;
  ready: boolean;
  error: string | null;
  errorDetail: string | null;
  errorCode: DemoErrorCode | null;
  db: DB;
  log: LoggedAction[];
  brand: Brand;
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
  /** Tarif cheklovi sababli ochilgan "Tarifni yangilang" oynasi */
  gate: ModuleId | null;
  /** O‘qish rejimi (yozish yopiq) */
  readOnly: boolean;
  init: () => Promise<void>;
  initBrand: (b: Brand) => Promise<void>;
  retry: () => Promise<void>;
  setBrand: (b: Brand) => void;
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
  setReadOnly: (v: boolean) => void;
  openGate: (m: ModuleId) => void;
  closeGate: () => void;
}

const LS_LOG = 'balans.log.v4';
const LS_PREF = 'balans.pref.v4';

/** Replay qilingan amallar uchun baza nusxasi (JSON klon — toza va tez). */
/** Xatoni yagona joyda state'ga yozish (kod + xabar + diagnostika). */
function errorState(e: unknown): { status: 'error'; ready: false; error: string; errorDetail: string | null; errorCode: DemoErrorCode } {
  const err = e as DemoLoadError;
  return {
    status: 'error', ready: false,
    error: err?.message || 'Demo ma’lumotlarni yuklab bo‘lmadi.',
    errorDetail: err?.detail || null,
    errorCode: err instanceof DemoLoadError ? err.code : 'server',
  };
}

function fromPayload(p: DemoPayload): DB {
  return JSON.parse(JSON.stringify(p.db)) as DB;
}

function replay(db: DB, log: LoggedAction[]): { db: DB; log: LoggedAction[] } {
  const ok: LoggedAction[] = [];
  for (const a of log) {
    try { runAction(db, a.type, a.payload, a.ctx); ok.push(a); } catch { /* baza o‘zgargan bo‘lsa, amal tashlab yuboriladi */ }
  }
  for (const acc of db.customAccounts) registerAccount(acc);
  return { db, log: ok };
}

const defaultFilters = (): Filters => ({ companyId: 'all', branchId: 'all', warehouseId: 'all', currency: 'UZS', from: '2026-09-01', to: TODAY });

export const DEFAULT_WIDGETS: Record<string, string[]> = {
  owner: ['kpis', 'command', 'trend', 'cash', 'attention', 'ai', 'companies', 'forecast'],
  cfo: ['kpis', 'command', 'trend', 'cash', 'ar', 'ap', 'budget', 'ai', 'attention', 'taxes'],
  accountant: ['acc_kpis', 'tasks', 'recon', 'taxes', 'ar', 'ap', 'journal', 'period'],
  factory: ['fac_kpis', 'production', 'machines', 'workorders', 'materials', 'waste', 'costing'],
  warehouse: ['wh_kpis', 'lowstock', 'receiving', 'shipping', 'transfers', 'movements'],
};

export const useApp = create<Store>((set, get) => ({
  status: 'idle',
  ready: false,
  error: null,
  errorDetail: null,
  errorCode: null,
  db: null as unknown as DB,
  log: [],
  brand: 'factory',
  role: 'cfo',
  lang: 'uz',
  theme: 'dark',
  filters: defaultFilters(),
  nav: { module: 'dashboard' },
  sidebarCollapsed: false,
  mobileMenu: false,
  aiOpen: false,
  searchOpen: false,
  toasts: [],
  gate: null,
  readOnly: false,
  widgets: Object.fromEntries(Object.entries(DEFAULT_WIDGETS).map(([k, v]) => [k, v.map((id) => ({ id, visible: true }))])),

  init: async () => {
    if (get().status === 'loading' || get().status === 'ready') return;
    let pref: Record<string, unknown> = {};
    try { pref = JSON.parse(localStorage.getItem(LS_PREF) || '{}'); } catch { /* buzilgan sozlama */ }
    const brand: Brand = pref.brand === 'trade' ? 'trade' : 'factory';
    const theme = (pref.theme as 'dark' | 'light') || 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = (pref.lang as string) || 'uz';
    set({ status: 'loading', brand, theme, lang: (pref.lang as Lang) || 'uz', role: (pref.role as RoleId) || 'cfo', error: null, errorDetail: null, errorCode: null });
    try {
      const payload = await loadDemo(brand);
      let log: LoggedAction[] = [];
      try { log = JSON.parse(localStorage.getItem(LS_LOG) || '[]'); } catch { /* buzilgan log */ }
      const r = replay(fromPayload(payload), log);
      set({
        status: 'ready', ready: true, db: r.db, log: r.log,
        widgets: (pref.widgets as Record<string, Widget[]>) || get().widgets,
        filters: { ...defaultFilters(), ...((pref.filters as Partial<Filters>) || {}) },
      });
    } catch (e) {
      set(errorState(e));
    }
  },

  retry: async () => {
    const brand = get().brand;
    set({ status: 'loading', error: null, errorDetail: null, errorCode: null });
    try {
      const payload = await loadDemo(brand, { force: !getCached(brand) });
      set({ status: 'ready', ready: true, db: fromPayload(payload), log: [] });
    } catch (e) {
      set(errorState(e));
    }
  },

  setBrand: (brand) => {
    if (brand === get().brand && get().status === 'ready') return;
    const cached = getCached(brand);
    if (cached) {
      const r = replay(fromPayload(cached), get().log);
      set({ brand, db: r.db, log: r.log, status: 'ready', ready: true, nav: { module: 'dashboard' }, filters: defaultFilters() });
      persistPref(get());
      return;
    }
    set({ brand, status: 'loading', ready: false, error: null, errorDetail: null, errorCode: null });
    void get().initBrand(brand);
  },

  initBrand: async (brand: Brand) => {
    try {
      const payload = await loadDemo(brand);
      set({ status: 'ready', ready: true, db: fromPayload(payload), log: [], nav: { module: 'dashboard' }, filters: defaultFilters() });
      persistPref(get());
    } catch (e) {
      set(errorState(e));
    }
  },

  dispatch: (type, payload, opts) => {
    const { db, role, log, readOnly } = get();
    if (!db) return undefined;
    if (readOnly) {
      set({ gate: get().nav.module });
      return undefined;
    }
    const ctx: Ctx = { user: roleOf(role).persona, role, date: TODAY, time: nowTime() };
    const draft: DB = structuredClone(db);
    try {
      const result = runAction(draft, type, payload, ctx);
      draft.entries = [...draft.entries];
      const nextLog = type === 'alert.read' ? log : [...log, { type, payload, ctx }];
      set({ db: draft, log: nextLog });
      try { localStorage.setItem(LS_LOG, JSON.stringify(nextLog)); } catch { /* kvota to‘lgan — jurnal xotirada qoladi */ }
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
  resetDemo: () => {
    try { localStorage.removeItem(LS_LOG); } catch { /* ignore */ }
    const cached = getCached(get().brand);
    if (cached) set({ db: fromPayload(cached), log: [] });
    get().toast({ kind: 'info', title: 'Demo ma’lumotlar qayta tiklandi' });
  },
  setReadOnly: (v) => set({ readOnly: v }),
  openGate: (m) => set({ gate: m }),
  closeGate: () => set({ gate: null }),
}));

function persistPref(s: Store) {
  try {
    localStorage.setItem(LS_PREF, JSON.stringify({ brand: s.brand, role: s.role, lang: s.lang, theme: s.theme, filters: s.filters, widgets: s.widgets }));
  } catch { /* ignore */ }
}
