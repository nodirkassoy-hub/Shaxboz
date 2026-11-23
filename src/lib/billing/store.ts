'use client';
/**
 * Obuna / tarif holati (brauzerda saqlanadi).
 * Haqiqiy loyihada bu qatlam server API'siga ulanadi (src/lib/billing/index.ts
 * funksiyalari 1:1 endpoint bo‘lib xizmat qiladi) — hozircha demo rejimida
 * localStorage'da saqlanadi va to‘lovlar TEST rejimida bajariladi.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { TODAY } from '@/lib/core/dates';
import {
  accountState, cancelSubscription, changePlan, consumeAiQuestion, createAccount, createInvoice, entitlements,
  markPaid, type Account, type BillingInvoice, type Entitlements, type PaymentMethod, type TeamMember,
} from '@/lib/billing';
import { planOf, type Cycle, type PlanId } from '@/lib/config/pricing';
import { useApp } from '@/lib/store';
import type { ModuleId } from '@/lib/types';

const LS = 'balans.billing.v3';

/** Serverdan kelgan obuna holati (haqiqiy manba). */
export interface ServerSubscription {
  authenticated: boolean;
  today: string;
  serverTime: string;
  timezone: string;
  account?: Account;
  entitlements?: {
    planId: PlanId; status: Entitlements['status']; readOnly: boolean;
    modules: ModuleId[] | 'all'; users: number | null; warehouses: number | null;
    aiQuestions: number | null; aiUsed: number; aiLeft: number | null;
    daysLeft: number; trialDaysLeft: number; graceLeft: number; periodEnd: string; reason: string;
  };
  policy?: { trialDays: number; graceDays: number; retentionDays: number };
}

interface BillingStore {
  ready: boolean;
  account: Account | null;
  /** Serverdagi holat (sinov kunlari SHU yerdan olinadi). */
  server: ServerSubscription | null;
  serverError: string | null;
  /** Serverdan holatni yangilash. */
  syncServer: () => Promise<void>;
  /** Demo: sinov sanasini siljitish (test uchun) */
  init: () => void;
  reset: () => void;
  ent: () => Entitlements;
  canUse: (m: ModuleId) => boolean;
  register: (input: { company: string; name: string; phone: string; email: string; stir?: string; password: string }) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  startCheckout: (planId: PlanId, cycle: Cycle, method: PaymentMethod) => BillingInvoice;
  pay: (invoiceId: string) => { ok: boolean; error?: string };
  choosePlan: (planId: PlanId, cycle: Cycle) => { ok: boolean; note: string; needPayment?: boolean };
  cancel: () => void;
  addMember: (m: Omit<TeamMember, 'id' | 'status'>) => { ok: boolean; error?: string };
  removeMember: (id: string) => void;
  askAi: () => { ok: boolean; error?: string; left: number | null };
  setProfile: (p: Partial<Account['company']> & { userName?: string }) => void;
  setVat: (v: boolean) => void;
  setTrialDaysLeft: (n: number) => void;
  expire: () => void;
  finishOnboarding: () => void;
}

function save(acc: Account | null) {
  try {
    if (acc) localStorage.setItem(LS, JSON.stringify(acc));
    else localStorage.removeItem(LS);
  } catch { /* kvota */ }
}

/** Demo hisob: sinov 9 kun oldin boshlangan (21 kun qoldi) — panelda hisoblagich ko‘rinadi. */
function demoAccount(): Account {
  const acc = createAccount({
    company: '“ELEKTRO QURILMA” MChJ', name: 'Gulnora Abdullayeva', phone: '+998 90 123 45 67', email: 'demo@balans.uz', stir: '310 227 904', today: TODAY,
  });
  acc.createdAt = shift(TODAY, -9);
  acc.trialEndsAt = shift(TODAY, 21);
  acc.subscription.startedAt = acc.createdAt;
  acc.subscription.periodEnd = acc.trialEndsAt;
  acc.onboarded = true;
  acc.team = [
    { id: 'u1', name: 'Gulnora Abdullayeva', email: 'demo@balans.uz', role: 'Moliya direktori', status: 'active' },
    { id: 'u2', name: 'Aziza Karimova', email: 'aziza@elektroqurilma.uz', role: 'Bosh buxgalter', status: 'active' },
    { id: 'u3', name: 'Alisher Qodirov', email: 'alisher@elektroqurilma.uz', role: 'Ombor mudiri', status: 'active' },
    { id: 'u4', name: 'Dilshod Usmonov', email: 'dilshod@elektroqurilma.uz', role: 'Sotuv menejeri', status: 'active' },
  ];
  acc.aiUsage = {};
  return acc;
}

function shift(date: string, days: number) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** O‘qish rejimini asosiy store'ga uzatish. */
function syncReadOnly(acc: Account | null) {
  const ro = acc ? accountState(acc, TODAY).readOnly : false;
  if (useApp.getState().readOnly !== ro) useApp.getState().setReadOnly(ro);
}

export const useBilling = create<BillingStore>((set, get) => ({
  ready: false,
  account: null,
  server: null,
  serverError: null,

  /**
   * Serverdan obuna holatini olish.
   *
   * MUHIM: sinov kunlari **serverdagi** `trial_ends_at` dan hisoblanadi.
   * localStorage faqat oflayn ko‘rsatish uchun zaxira; foydalanuvchi uni
   * o‘chirib sinovni qayta boshlamaydi.
   */
  syncServer: async () => {
    try {
      const res = await fetch('/api/billing/subscription', { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ServerSubscription;
      set({ server: data, serverError: null });
      // Serverdagi hisob brauzerdagidan ustun
      if (data.authenticated && data.account) {
        save(data.account);
        set({ account: data.account });
        syncReadOnly(data.account);
      }
    } catch (e) {
      set({ serverError: (e as Error).message || 'Serverga ulanmadi' });
    }
  },

  init: () => {
    if (get().ready) return;
    let acc: Account | null = null;
    try { acc = JSON.parse(localStorage.getItem(LS) || 'null'); } catch { acc = null; }
    if (!acc || !acc.subscription) acc = demoAccount();
    save(acc);
    set({ ready: true, account: acc });
    syncReadOnly(acc);
    // Server holatini fonda yangilaymiz (sinov kunlari serverdan)
    void get().syncServer();
  },

  reset: () => {
    const acc = demoAccount();
    save(acc); set({ account: acc }); syncReadOnly(acc);
    useApp.getState().toast({ kind: 'info', title: 'Demo hisob qayta yaratildi', body: 'Sinov davri 21 kun qoldi.' });
  },

  ent: () => {
    const acc = get().account;
    if (!acc) return entitlements(demoAccount(), TODAY);
    const local = entitlements(acc, TODAY);
    const srv = get().server;
    // Server javobi bo‘lsa — u haqiqiy manba (sinov kunlari, read-only, limitlar)
    if (srv?.authenticated && srv.entitlements) {
      const e = srv.entitlements;
      const plan = planOf(e.planId);
      return {
        ...local,
        plan, planId: e.planId, status: e.status, readOnly: e.readOnly,
        modules: e.modules, users: e.users, warehouses: e.warehouses,
        aiQuestions: e.aiQuestions, aiUsed: e.aiUsed, aiLeft: e.aiLeft,
        daysLeft: e.daysLeft, trialDaysLeft: e.trialDaysLeft, graceLeft: e.graceLeft,
        periodEnd: e.periodEnd, reason: e.reason,
      };
    }
    return local;
  },

  canUse: (m) => {
    const e = get().ent();
    return e.modules === 'all' || e.modules.includes(m);
  },

  register: (input) => {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'Email manzili noto‘g‘ri.' };
    if (!/^\+?[\d\s()-]{9,20}$/.test(input.phone.trim())) return { ok: false, error: 'Telefon raqamini to‘g‘ri kiriting (+998 XX XXX XX XX).' };
    if (input.name.trim().length < 3) return { ok: false, error: 'Ism-familiyani kiriting.' };
    if (input.company.trim().length < 2) return { ok: false, error: 'Kompaniya nomini kiriting.' };
    if (input.password.length < 8) return { ok: false, error: 'Parol kamida 8 belgidan iborat bo‘lishi kerak.' };
    if (!/\d/.test(input.password) || !/[a-zA-Zа-яА-Я]/.test(input.password)) return { ok: false, error: 'Parolda harf va raqam bo‘lishi kerak.' };
    const acc = createAccount({ company: input.company, name: input.name, phone: input.phone, email, stir: input.stir, today: TODAY });
    acc.team = [{ id: 'u1', name: input.name.trim(), email, role: 'Egasi (direktor)', status: 'active' }];
    save(acc); set({ account: acc }); syncReadOnly(acc);
    return { ok: true };
  },

  login: (email, password) => {
    const acc = get().account;
    if (!acc) return { ok: false, error: 'Hisob topilmadi. Ro‘yxatdan o‘ting.' };
    if (acc.user.email !== email.trim().toLowerCase()) return { ok: false, error: 'Bu email bilan hisob topilmadi.' };
    if (password.length < 8) return { ok: false, error: 'Parol kamida 8 belgi.' };
    return { ok: true };
  },

  logout: () => { save(null); set({ account: null }); syncReadOnly(null); },

  startCheckout: (planId, cycle, method) => {
    const acc = get().account ?? demoAccount();
    const inv = createInvoice(acc, planId, cycle, method, TODAY, true);
    save(acc); set({ account: { ...acc } });
    return inv;
  },

  pay: (invoiceId) => {
    const acc = get().account; if (!acc) return { ok: false, error: 'Hisob topilmadi.' };
    const r = markPaid(acc, invoiceId, TODAY);
    if (!r.ok) return { ok: false, error: r.error };
    save(acc); set({ account: { ...acc } }); syncReadOnly(acc);
    return { ok: true };
  },

  choosePlan: (planId, cycle) => {
    const acc = get().account; if (!acc) return { ok: false, note: 'Hisob topilmadi.' };
    const r = changePlan(acc, planId, cycle, TODAY);
    save(acc); set({ account: { ...acc } }); syncReadOnly(acc);
    return r;
  },

  cancel: () => {
    const acc = get().account; if (!acc) return;
    cancelSubscription(acc, TODAY);
    save(acc); set({ account: { ...acc } }); syncReadOnly(acc);
    useApp.getState().toast({ kind: 'info', title: 'Obuna bekor qilindi', body: `Ma’lumotlar saqlanadi. Joriy davr oxiri: ${acc.subscription.periodEnd}.` });
  },

  addMember: (m) => {
    const acc = get().account; if (!acc) return { ok: false, error: 'Hisob topilmadi.' };
    const e = get().ent();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m.email)) return { ok: false, error: 'Email noto‘g‘ri.' };
    if (acc.team.some((t) => t.email === m.email.trim().toLowerCase())) return { ok: false, error: 'Bu email allaqachon qo‘shilgan.' };
    if (e.users !== null && acc.team.length >= e.users) return { ok: false, error: `Tarif bo‘yicha ${e.users} foydalanuvchi. Qo‘shimcha foydalanuvchi — 29 000 so‘m/oy.` };
    acc.team = [...acc.team, { id: `u${Date.now()}`, name: m.name, email: m.email.trim().toLowerCase(), role: m.role, status: 'invited' }];
    save(acc); set({ account: { ...acc } });
    // Server ham tekshiradi va saqlaydi (limit serverda ham majburiy).
    void (async () => {
      try {
        const res = await fetch('/api/billing/team', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: m.name, email: m.email, role: m.role }),
        });
        if (res.status === 401) return; // hisobsiz demo rejim — faqat lokal
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          // Server rad etdi — lokal o‘zgarishni qaytaramiz
          const cur = get().account;
          if (cur) { cur.team = cur.team.filter((t) => t.email !== m.email.trim().toLowerCase()); save(cur); set({ account: { ...cur } }); }
          set({ serverError: d.error || 'Foydalanuvchi qo‘shilmadi.' });
          return;
        }
        await get().syncServer();
      } catch { /* tarmoq yo‘q — lokal holat saqlanadi */ }
    })();
    return { ok: true };
  },

  removeMember: (id) => {
    const acc = get().account; if (!acc || acc.team.length <= 1) return;
    acc.team = acc.team.filter((t) => t.id !== id);
    save(acc); set({ account: { ...acc } });
    void fetch(`/api/billing/team?userId=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
  },

  askAi: () => {
    const acc = get().account; if (!acc) return { ok: false, error: 'Hisob topilmadi.', left: 0 };
    const r = consumeAiQuestion(acc, TODAY);
    if (r.ok) { save(acc); set({ account: { ...acc } }); }
    return r;
  },

  setProfile: (p) => {
    const acc = get().account; if (!acc) return;
    const { userName, ...company } = p;
    acc.company = { ...acc.company, ...company };
    if (userName) acc.user = { ...acc.user, name: userName };
    save(acc); set({ account: { ...acc } });
    void fetch('/api/billing/settings', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p),
    }).catch(() => undefined);
  },

  setVat: (v) => {
    const acc = get().account; if (!acc) return;
    acc.vatEnabled = v; save(acc); set({ account: { ...acc } });
    void fetch('/api/billing/settings', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vatEnabled: v }),
    }).catch(() => undefined);
  },

  /** Demo: sinovdan qolgan kunlarni o‘zgartirish (7/3/1 kun eslatmalarini sinash uchun). */
  setTrialDaysLeft: (n) => {
    const acc = get().account; if (!acc) return;
    acc.trialEndsAt = shift(TODAY, n);
    acc.subscription.periodEnd = acc.trialEndsAt;
    acc.subscription.status = 'trial';
    save(acc); set({ account: { ...acc } }); syncReadOnly(acc);
  },

  expire: () => {
    const acc = get().account; if (!acc) return;
    acc.trialEndsAt = shift(TODAY, -1);
    acc.subscription.periodEnd = acc.trialEndsAt;
    acc.subscription.status = 'trial';
    save(acc); set({ account: { ...acc } }); syncReadOnly(acc);
  },

  finishOnboarding: () => {
    const acc = get().account; if (!acc) return;
    acc.onboarded = true; save(acc); set({ account: { ...acc } });
  },
}));

/**
 * Komponentlarda ruxsatlarni olish uchun xavfsiz hook.
 * MUHIM: `useBilling((s) => s.ent())` har renderda yangi obyekt qaytaradi va
 * cheksiz render halqasiga olib keladi. Shuning uchun faqat barqaror
 * ma’lumot (account) obuna bo‘linadi, entitlements esa memo bilan hisoblanadi.
 */
export function useEntitlements(): Entitlements {
  const account = useBilling((s) => s.account);
  return useMemo(() => (account ? entitlements(account, TODAY) : entitlements(demoAccount(), TODAY)), [account]);
}

/** Ro‘yxatdan o‘tgan foydalanuvchi uchun tarif nomi. */
export const planName = (id: PlanId) => planOf(id).name;
