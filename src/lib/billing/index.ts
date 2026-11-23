/**
 * ─────────────────────────────────────────────────────────────
 * BILLING DOMAIN — obuna, sinov muddati, tarif cheklovlari, hisob-fakturalar.
 * Toza funksiyalar: barchasi deterministik va testlanadi (npm run test:billing).
 * ─────────────────────────────────────────────────────────────
 */
import {
  GRACE_DAYS, PLANS, TRIAL_DAYS, TRIAL_PLAN, annualPrice, planOf, priceOf, splitVat, type Cycle, type Plan, type PlanId,
} from '@/lib/config/pricing';
import { addDays, diffDays, monthKey } from '@/lib/core/dates';
import type { ModuleId } from '@/lib/types';

export type PaymentMethod = 'payme' | 'click' | 'uzum' | 'bank';
export type SubscriptionStatus = 'trial' | 'active' | 'readonly' | 'cancelled';
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'void';

export interface BillingInvoice {
  id: string;
  no: string;
  date: string;
  dueDate: string;
  planId: PlanId;
  cycle: Cycle;
  amount: number;       // QQS bilan
  net: number;
  vat: number;
  method: PaymentMethod;
  status: InvoiceStatus;
  paidAt?: string;
  ref?: string;
  /** Test rejimida yaratilgan to'lov */
  test: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'invited';
}

export interface Subscription {
  planId: PlanId;
  cycle: Cycle;
  status: SubscriptionStatus;
  startedAt: string;
  /** Joriy to‘langan davr oxiri */
  periodEnd: string;
  extraUsers: number;
  cancelledAt?: string;
}

export interface Account {
  id: string;
  company: { name: string; stir: string; phone: string; email: string; address?: string; bank?: string };
  user: { name: string; email: string; phone: string };
  createdAt: string;
  trialEndsAt: string;
  subscription: Subscription;
  invoices: BillingInvoice[];
  team: TeamMember[];
  aiUsage: Record<string, number>;
  vatEnabled: boolean;
  onboarded: boolean;
}

export interface Entitlements {
  plan: Plan;
  /** Tarif darajasi (sinovda — ISHLAB CHIQARISH) */
  planId: PlanId;
  status: SubscriptionStatus;
  readOnly: boolean;
  modules: ModuleId[] | 'all';
  users: number | null;
  warehouses: number | null;
  aiQuestions: number | null;
  aiUsed: number;
  aiLeft: number | null;
  daysLeft: number;
  trialDaysLeft: number;
  graceLeft: number;
  periodEnd: string;
  reason: string;
}

export const PAYMENT_METHODS: { id: PaymentMethod; name: string; note: string }[] = [
  { id: 'payme', name: 'Payme', note: 'Onlayn to‘lov — karta orqali' },
  { id: 'click', name: 'Click', note: 'Onlayn to‘lov — Click Up / karta' },
  { id: 'uzum', name: 'Uzum Pay', note: 'Onlayn to‘lov — Uzum hisobi' },
  { id: 'bank', name: 'Bank o‘tkazmasi', note: 'Yuridik shaxslar uchun hisob-faktura' },
];

let seq = 0;
const invNo = (date: string) => {
  seq = (seq + 1) % 10000;
  return `BA-${date.slice(0, 4)}-${String(seq).padStart(4, '0')}`;
};

/** Yangi sinov hisobini yaratish (karta talab qilinmaydi). */
export function createAccount(input: { company: string; name: string; phone: string; email: string; stir?: string; today: string }): Account {
  const id = `acc_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    company: { name: input.company.trim(), stir: input.stir?.trim() || '', phone: input.phone.trim(), email: input.email.trim().toLowerCase() },
    user: { name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim() },
    createdAt: input.today,
    trialEndsAt: addDays(input.today, TRIAL_DAYS),
    subscription: { planId: TRIAL_PLAN, cycle: 'monthly', status: 'trial', startedAt: input.today, periodEnd: addDays(input.today, TRIAL_DAYS), extraUsers: 0 },
    invoices: [],
    team: [{ id: 'u1', name: input.name.trim(), email: input.email.trim().toLowerCase(), role: 'direktor', status: 'active' }],
    aiUsage: {},
    vatEnabled: true,
    onboarded: false,
  };
}

/** Hisobning joriy holati (sinov / faol / o‘qish rejimi). */
export function accountState(acc: Account, today: string): { status: SubscriptionStatus; daysLeft: number; graceLeft: number; readOnly: boolean } {
  const s = acc.subscription;
  // To‘langan (yoki davr oxirigacha amal qiladigan) obuna — sinov sanasi endi ahamiyatsiz.
  if (s.status === 'active' || s.status === 'cancelled') {
    if (s.periodEnd >= today) {
      const daysLeft = Math.max(0, diffDays(s.periodEnd, today));
      return { status: s.status, daysLeft, graceLeft: 0, readOnly: false };
    }
    // To‘lov muddati o‘tgan — mehr-muruvvat muddati, keyin faqat o‘qish
    const graceLeft = Math.max(0, GRACE_DAYS - diffDays(today, s.periodEnd));
    return { status: 'readonly', daysLeft: 0, graceLeft, readOnly: true };
  }
  // Sinov davri
  if (acc.trialEndsAt >= today) {
    return { status: 'trial', daysLeft: Math.max(0, diffDays(acc.trialEndsAt, today)), graceLeft: 0, readOnly: false };
  }
  const graceLeft = Math.max(0, GRACE_DAYS - diffDays(today, acc.trialEndsAt));
  return { status: 'readonly', daysLeft: 0, graceLeft, readOnly: true };
}

/** Tarif bo‘yicha ruxsatlar (sinovda — ISHLAB CHIQARISH darajasi). */
export function entitlements(acc: Account, today: string): Entitlements {
  const st = accountState(acc, today);
  const effective: PlanId = st.status === 'trial' ? TRIAL_PLAN : acc.subscription.planId;
  const plan = planOf(effective);
  const usageKey = monthKey(today);
  const aiUsed = acc.aiUsage[usageKey] || 0;
  const limit = plan.limit.aiQuestions;
  return {
    plan,
    planId: plan.id,
    status: st.status,
    readOnly: st.readOnly,
    modules: plan.limit.modules,
    users: plan.limit.users === null ? null : plan.limit.users + acc.subscription.extraUsers,
    warehouses: plan.limit.warehouses,
    aiQuestions: limit,
    aiUsed,
    aiLeft: limit === null ? null : Math.max(0, limit - aiUsed),
    daysLeft: st.daysLeft,
    trialDaysLeft: st.status === 'trial' ? st.daysLeft : 0,
    graceLeft: st.graceLeft,
    periodEnd: st.status === 'trial' ? acc.trialEndsAt : acc.subscription.periodEnd,
    reason:
      st.status === 'trial' ? `Sinov davri: ${st.daysLeft} kun qoldi`
        : st.status === 'active' ? `${plan.name} tarifi faol`
          : st.graceLeft > 0 ? `Sinov tugadi — o‘qish rejimi, ${st.graceLeft} kun mehr-muruvvat`
            : 'To‘lov qilinmagan — faqat o‘qish rejimi',
  };
}

export const canUseModule = (e: Entitlements, m: ModuleId) => e.modules === 'all' || e.modules.includes(m);
export const writesAllowed = (e: Entitlements) => !e.readOnly;

/** Yangi hisob-faktura (test rejimida). */
export function createInvoice(acc: Account, planId: PlanId, cycle: Cycle, method: PaymentMethod, today: string, test = true): BillingInvoice {
  const plan = planOf(planId);
  const amount = priceOf(plan, cycle) ?? 0;
  const { net, vat } = splitVat(amount);
  const inv: BillingInvoice = {
    id: `inv_${Math.random().toString(36).slice(2, 10)}`,
    no: invNo(today),
    date: today,
    dueDate: addDays(today, method === 'bank' ? 5 : 1),
    planId,
    cycle,
    amount,
    net,
    vat,
    method,
    status: 'pending',
    test,
  };
  acc.invoices = [inv, ...acc.invoices];
  return inv;
}

/** To‘lovni tasdiqlash (test rejimi) → obunani faollashtirish. */
export function markPaid(acc: Account, invoiceId: string, today: string): { ok: boolean; error?: string; invoice?: BillingInvoice } {
  const inv = acc.invoices.find((i) => i.id === invoiceId);
  if (!inv) return { ok: false, error: 'Hisob-faktura topilmadi.' };
  if (inv.status === 'paid') return { ok: false, error: 'Bu hisob-faktura allaqachon to‘langan.' };
  inv.status = 'paid';
  inv.paidAt = today;
  inv.ref = `TEST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const months = inv.cycle === 'annual' ? 12 : 1;
  const base = acc.subscription.periodEnd >= today && acc.subscription.status === 'active' ? acc.subscription.periodEnd : today;
  acc.subscription = {
    ...acc.subscription,
    planId: inv.planId,
    cycle: inv.cycle,
    status: 'active',
    startedAt: acc.subscription.status === 'active' ? acc.subscription.startedAt : today,
    periodEnd: addMonthsClamped(base, months),
    cancelledAt: undefined,
  };
  return { ok: true, invoice: inv };
}

function addMonthsClamped(date: string, months: number) {
  const d = new Date(date + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

/** Tarifni o‘zgartirish: oshirish darhol, pasaytirish davr oxiridan. */
export function changePlan(acc: Account, planId: PlanId, cycle: Cycle, today: string): { ok: boolean; error?: string; needPayment?: boolean; note: string } {
  const plan = planOf(planId); const cur = planOf(acc.subscription.planId);
  if (plan.contact) return { ok: true, note: 'Korporativ tarif kelishuv asosida: mutaxassisimiz 1 ish kunida bog‘lanadi.' };
  if (planId === acc.subscription.planId && cycle === acc.subscription.cycle && acc.subscription.status === 'active') {
    return { ok: true, note: 'Bu tarif allaqachon faol — o‘zgartirish talab qilinmaydi.' };
  }
  if (acc.subscription.status !== 'active') return { ok: true, needPayment: true, note: 'Tarifni faollashtirish uchun to‘lovni yakunlang.' };
  const up = rank(planId) > rank(acc.subscription.planId);
  if (up) {
    acc.subscription = { ...acc.subscription, planId, cycle, periodEnd: addMonthsClamped(today, cycle === 'annual' ? 12 : 1) };
    return { ok: true, note: `${plan.name} tarifi darhol yoqildi. Yangi davr: ${acc.subscription.periodEnd}.` };
  }
  if (rank(planId) === rank(acc.subscription.planId)) {
    const wasAnnual = acc.subscription.cycle === 'annual';
    acc.subscription = { ...acc.subscription, cycle, periodEnd: cycle === 'annual' && !wasAnnual ? addMonthsClamped(acc.subscription.periodEnd, 12) : acc.subscription.periodEnd };
    return { ok: true, note: `To‘lov davri ${cycle === 'annual' ? 'yillik' : 'oylik'}ga o‘zgartirildi. Yangi davr oxiri: ${acc.subscription.periodEnd}.` };
  }
  acc.subscription = { ...acc.subscription, planId, cycle };
  return { ok: true, note: `${cur.name} → ${plan.name}: pasaytirish amaldagi davr oxiridan (${acc.subscription.periodEnd}) kuchga kiradi.` };
}

const rank = (id: PlanId) => ({ start: 1, biznes: 2, ishlab: 3, korporativ: 4 }[id] || 0);

export function cancelSubscription(acc: Account, today: string) {
  acc.subscription = { ...acc.subscription, status: 'cancelled', cancelledAt: today };
  return acc.subscription;
}

/** AI CFO savolini hisoblash (limitdan oshsa ruxsat bermaydi). */
export function consumeAiQuestion(acc: Account, today: string): { ok: boolean; left: number | null; limit: number | null; error?: string } {
  const e = entitlements(acc, today);
  if (e.readOnly) return { ok: false, left: 0, limit: e.aiQuestions, error: 'Hisob o‘qish rejimida. AI CFO uchun tarifni faollashtiring.' };
  const key = monthKey(today);
  const used = acc.aiUsage[key] || 0;
  if (e.aiQuestions !== null && used >= e.aiQuestions) {
    return { ok: false, left: 0, limit: e.aiQuestions, error: `Bu oy uchun AI CFO savollar limiti tugadi (${e.aiQuestions} ta). Tarifni yangilang.` };
  }
  acc.aiUsage = { ...acc.aiUsage, [key]: used + 1 };
  return { ok: true, left: e.aiQuestions === null ? null : e.aiQuestions - used - 1, limit: e.aiQuestions };
}

/** Sinov eslatmalari: 7, 3, 1 kun qolganda. */
export function trialReminder(e: Entitlements): { show: boolean; tone: 'info' | 'warn' | 'danger'; title: string; body: string } | null {
  if (e.status === 'trial' && [7, 3, 1].includes(e.trialDaysLeft)) {
    return e.trialDaysLeft <= 3
      ? { show: true, tone: 'danger', title: `Sinov davri ${e.trialDaysLeft} kundan keyin tugaydi`, body: 'Tarifni tanlang — aks holda hisob faqat o‘qish rejimiga o‘tadi.' }
      : { show: true, tone: 'warn', title: `Sinov davri ${e.trialDaysLeft} kun qoldi`, body: 'Ma’lumotlaringiz saqlanadi. Tarifni hozir tanlab, uzluksiz ishlashda davom eting.' };
  }
  if (e.status === 'readonly') {
    return {
      show: true, tone: 'danger', title: 'Hisob o‘qish rejimida',
      body: e.plan.name && e.daysLeft === 0 ? 'Yangi yozuv kiritish yopiq. Tarifni tanlang — ma’lumotlar to‘liq tiklanadi.' : 'Tarifni tanlang.',
    };
  }
  return null;
}

/** Yillik tejash matni. */
export const savingText = (plan: Plan) => (plan.monthly === null ? '' : `${annualPrice(plan.monthly).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m / yil · ${(plan.monthly * 2).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m tejaladi`);

export const allPlans = PLANS;
