/**
 * ─────────────────────────────────────────────────────────────
 * BALANS AI — NARXLAR KONFIGURATSIYASI
 * Barcha narxlar shu faylda. Narxni o'zgartirish uchun faqat
 * shu yerni tahrirlang — sayt, to'lov va hisob sahifasi
 * avtomatik yangilanadi.
 *
 * Narxlar QQS (QQS_RATE) bilan birga ko'rsatilgan (QQS ichida).
 * ─────────────────────────────────────────────────────────────
 */
import type { ModuleId } from '@/lib/types';

/** QQS stavkasi, % (O'zbekiston: 12%). Sozlamalardan holat o'zgartiriladi. */
export const VAT_RATE = 12;

/** Bepul sinov muddati (kun). */
export const TRIAL_DAYS = 30;
/** Sinov tugagach tarif tanlanmasa — faqat o'qish rejimi uchun mehribonlik muddati (kun). */
export const GRACE_DAYS = 7;
/** To'lovsiz hisob ma'lumotlari saqlanadigan muddat (kun). */
export const DATA_RETENTION_DAYS = 90;
/** Yillik to'lovda tekin oylar soni (12 oy narxiga 10 oy). */
export const ANNUAL_FREE_MONTHS = 2;

/** Har bir qo'shimcha foydalanuvchi, so'm/oy (QQS bilan). */
export const EXTRA_USER_PRICE = 29_000;

/** Sinov paytida ochiq bo'lgan tarif darajasi. */
export const TRIAL_PLAN: PlanId = 'ishlab';

export type PlanId = 'start' | 'biznes' | 'ishlab' | 'korporativ';
export type Cycle = 'monthly' | 'annual';

export interface PlanLimit {
  /** Foydalanuvchilar soni; null = cheksiz */
  users: number | null;
  /** Ochiq modullar; 'all' = barcha modullar */
  modules: ModuleId[] | 'all';
  /** Omborlar soni; null = cheksiz */
  warehouses: number | null;
  /** AI CFO savollari / oy; null = cheksiz (adolatli foydalanish) */
  aiQuestions: number | null;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Oylik narx (so'm, QQS bilan). null = kelishuv asosida */
  monthly: number | null;
  popular?: boolean;
  contact?: boolean;
  limit: PlanLimit;
  /** Marketing ro'yxati — nima bor */
  includes: string[];
  /** Taqqoslash jadvalida ko'rinadigan qo'shimcha imkoniyatlar */
  highlights: string[];
  support: string;
}

const STAR_MODULES: ModuleId[] = ['dashboard', 'sales', 'purchasing', 'inventory', 'finance', 'ai', 'notifications', 'reports', 'settings'];
const BIZNES_MODULES: ModuleId[] = [
  'dashboard', 'ai', 'approvals', 'accounting', 'finance', 'sales', 'purchasing', 'inventory', 'warehouse',
  'crm', 'hr', 'taxes', 'documents', 'assets', 'projects', 'reports', 'analytics', 'notifications', 'settings',
];

export const PLANS: Plan[] = [
  {
    id: 'start',
    name: 'START',
    tagline: 'Kichik biznes uchun savdo va ombor nazorati',
    monthly: 199_000,
    limit: { users: 3, modules: STAR_MODULES, warehouses: 1, aiQuestions: 20 },
    includes: [
      '1 kompaniya, 3 foydalanuvchi',
      'Boshqaruv paneli (dashboard)',
      'Sotuv: mijozlar, buyurtmalar, hisob-fakturalar',
      'Xarid: ta’minotchilar va buyurtmalar',
      'Ombor: 1 ta ombor, qoldiq va harakatlar',
      'Kassa va bank: kirim/chiqim, qoldiq',
      'AI CFO: oyiga 20 savol',
    ],
    highlights: ['Asosiy hisobotlar', 'Excel/CSV eksport', 'Email qo‘llab-quvvatlash'],
    support: 'Email (ish kunlari)',
  },
  {
    id: 'biznes',
    name: 'BIZNES',
    tagline: 'Buxgalteriya, soliqlar va HR bilan to‘liq nazorat',
    monthly: 499_000,
    popular: true,
    limit: { users: 10, modules: BIZNES_MODULES, warehouses: null, aiQuestions: 150 },
    includes: [
      '10 foydalanuvchi, ko‘p ombor',
      'START’dagi barcha imkoniyatlar',
      'Buxgalteriya: hisoblar rejasi, jurnal, balans, foyda-zarar',
      'Soliqlar: QQS, foyda, JShDS, ijtimoiy — muddatlar bilan',
      'HR va ish haqi: xodimlar, davomat, ta’til, avans',
      'Rollar va huquqlar (direktor, buxgalter, omborchi, sotuvchi, HR)',
      'CRM, loyihalar, asosiy vositalar, tasdiqlashlar',
      'AI CFO: oyiga 150 savol',
    ],
    highlights: ['Excel va PDF eksport', 'Ko‘p ombor', 'To‘lov eslatmalari', 'Standart qo‘llab-quvvatlash'],
    support: 'Email + Telegram (ish kunlari)',
  },
  {
    id: 'ishlab',
    name: 'ISHLAB CHIQARISH',
    tagline: 'Zavod uchun to‘liq ERP: tannarx, retseptura, quvvat',
    monthly: 999_000,
    limit: { users: 30, modules: 'all', warehouses: null, aiQuestions: null },
    includes: [
      '30 foydalanuvchi, barcha modullar',
      'BIZNES’dagi barcha imkoniyatlar',
      'Ishlab chiqarish: retseptura (BOM), ish buyurtmalari, smena, quvvat',
      'Tannarx: standart vs fakt, brak va chiqindi hisobi',
      'Byudjet va reja-fakt tahlili',
      'API va integratsiyalar (kalit sozlamalarda)',
      'AI CFO: cheksiz (adolatli foydalanish)',
    ],
    highlights: ['Ustuvor yordam', 'API kirish', 'Ko‘p smenali ishlab chiqarish', 'Batafsil analitika'],
    support: 'Ustuvor: chat, Telegram, telefon',
  },
  {
    id: 'korporativ',
    name: 'KORPORATIV',
    tagline: 'Holdinglar va yirik korxonalar uchun',
    monthly: null,
    contact: true,
    limit: { users: null, modules: 'all', warehouses: null, aiQuestions: null },
    includes: [
      'Cheksiz foydalanuvchi va kompaniyalar',
      'Ko‘p filial va konsolidatsiya',
      'Alohida server yoki on-premise o‘rnatish',
      'Integratsiyalar: 1C, bank API, ERI, soliq',
      'Shaxsiy menejer va SLA',
      'Ma’lumotlarni ko‘chirishga yordam',
    ],
    highlights: ['Individual shartnoma', 'SLA va 24/7 yordam', 'SSO / LDAP', 'Audit va maxfiylik'],
    support: '24/7, shaxsiy menejer',
  },
];

export const planOf = (id: PlanId): Plan => PLANS.find((p) => p.id === id) ?? PLANS[0];

/** Yillik to'lov narxi = 10 oylik narx (2 oy bepul). */
export const annualPrice = (monthly: number) => monthly * (12 - ANNUAL_FREE_MONTHS);
/** Yillik tejash summasi. */
export const annualSaving = (monthly: number) => monthly * ANNUAL_FREE_MONTHS;
/** Narx — tanlangan tsikl bo'yicha (QQS bilan). */
export const priceOf = (plan: Plan, cycle: Cycle) => {
  if (plan.monthly === null) return null;
  return cycle === 'annual' ? annualPrice(plan.monthly) : plan.monthly;
};
/** 1 oyga to'g'ri keladigan narx (yillikda). */
export const effectiveMonthly = (plan: Plan, cycle: Cycle) => {
  if (plan.monthly === null) return null;
  return cycle === 'annual' ? Math.round(annualPrice(plan.monthly) / 12) : plan.monthly;
};

/** QQSni narxdan ajratish (narx QQS bilan). */
export function splitVat(gross: number) {
  const net = Math.round((gross * 100) / (100 + VAT_RATE));
  return { net, vat: gross - net, gross };
}

/** Taqqoslash jadvali: qatorlar × tariflar. */
export interface FeatureRow { group: string; label: string; value: (p: Plan) => string | boolean }
export const COMPARISON: FeatureRow[] = [
  { group: 'Asosiy', label: 'Foydalanuvchilar', value: (p) => (p.limit.users === null ? 'Cheksiz' : String(p.limit.users)) },
  { group: 'Asosiy', label: 'Kompaniyalar', value: (p) => (p.id === 'korporativ' ? 'Cheksiz' : p.id === 'ishlab' ? '3 tagacha' : '1') },
  { group: 'Asosiy', label: 'Omborlar', value: (p) => (p.limit.warehouses === null ? 'Cheksiz' : String(p.limit.warehouses)) },
  { group: 'Asosiy', label: 'Rollar va huquqlar', value: (p) => p.id !== 'start' },
  { group: 'Asosiy', label: 'Excel / CSV eksport', value: () => true },
  { group: 'Asosiy', label: 'PDF (chop etish)', value: (p) => p.id !== 'start' },
  { group: 'Modullar', label: 'Dashboard va AI CFO', value: () => true },
  { group: 'Modullar', label: 'Sotuv, xarid, ombor', value: () => true },
  { group: 'Modullar', label: 'Kassa va bank', value: () => true },
  { group: 'Modullar', label: 'Buxgalteriya (jurnal, balans, P&L)', value: (p) => p.id !== 'start' },
  { group: 'Modullar', label: 'Soliqlar va muddatlar', value: (p) => p.id !== 'start' },
  { group: 'Modullar', label: 'HR va ish haqi', value: (p) => p.id !== 'start' },
  { group: 'Modullar', label: 'CRM va loyihalar', value: (p) => p.id !== 'start' },
  { group: 'Modullar', label: 'Ishlab chiqarish va tannarx', value: (p) => p.limit.modules === 'all' },
  { group: 'Modullar', label: 'Byudjet va reja-fakt', value: (p) => p.limit.modules === 'all' },
  { group: 'Modullar', label: 'API va integratsiyalar', value: (p) => p.limit.modules === 'all' },
  { group: 'AI CFO', label: 'Savollar / oy', value: (p) => (p.limit.aiQuestions === null ? 'Cheksiz*' : String(p.limit.aiQuestions)) },
  { group: 'AI CFO', label: '“Nima uchun?” izohi', value: () => true },
  { group: 'AI CFO', label: 'Tayyor savollar va chat', value: () => true },
  { group: 'Xizmat', label: 'Qo‘llab-quvvatlash', value: (p) => p.support },
  { group: 'Xizmat', label: 'Ma’lumot eksporti va ko‘chirish', value: () => true },
  { group: 'Xizmat', label: 'On-premise / alohida server', value: (p) => p.id === 'korporativ' },
];

/** Qisqa cheklov matni (hisob sahifasi va kartalarda). */
export const PLAN_LIMITS_TEXT: Record<PlanId, string> = {
  start: '1 kompaniya · 3 foydalanuvchi · 1 ombor · AI 20 savol',
  biznes: '10 foydalanuvchi · buxgalteriya, soliqlar, HR · AI 150 savol',
  ishlab: '30 foydalanuvchi · barcha modullar · AI cheksiz',
  korporativ: 'Cheksiz foydalanuvchi · ko‘p filial · alohida server',
};

export const FAQ: { q: string; a: string }[] = [
  {
    q: '30 kunlik sinov uchun karta kerakmi?',
    a: 'Yo‘q. Ro‘yxatdan o‘tishda faqat ism, telefon, email, kompaniya nomi va parol kiritiladi. Sinov davrida karta talab qilinmaydi va avtomatik to‘lov olinmaydi.',
  },
  {
    q: 'Sinov davrida qaysi imkoniyatlar ochiq?',
    a: 'Sinov davrida ISHLAB CHIQARISH tarifidagi barcha modullar ochiq: buxgalteriya, soliqlar, HR, ishlab chiqarish, tannarx, byudjet va AI CFO.',
  },
  {
    q: 'Sinov tugasa nima bo‘ladi?',
    a: `Agar tarif tanlanmasa, hisob faqat o‘qish rejimiga o‘tadi va ${GRACE_DAYS} kun mehr-muruvvat muddati beriladi. Ma’lumotlar ${DATA_RETENTION_DAYS} kun saqlanadi; to‘lovdan keyin to‘liq tiklanadi.`,
  },
  {
    q: 'To‘lov qanday amalga oshiriladi?',
    a: 'Payme, Click, Uzum Pay orqali onlayn, yoki yuridik shaxslar uchun bank o‘tkazmasi (hisob-faktura yaratiladi). Hozircha to‘lovlar TEST rejimida ishlaydi — haqiqiy pul yechilmaydi.',
  },
  {
    q: 'Narxga QQS kiritilganmi?',
    a: `Ha, ko‘rsatilgan narxlar ${VAT_RATE}% QQS bilan. Hisob-faktura va to‘lov hujjatlarida QQS alohida qator bilan ajratiladi.`,
  },
  {
    q: 'Yillik to‘lashda qancha tejayman?',
    a: 'Yillik to‘lovda 2 oy bepul: 12 oy uchun faqat 10 oy narxi to‘lanadi. Har bir tarif kartasida tejash summasi ko‘rsatilgan.',
  },
  {
    q: 'Qo‘shimcha foydalanuvchi qancha turadi?',
    a: `${EXTRA_USER_PRICE.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} so‘m/oy. Qo‘shimcha foydalanuvchini hisob sahifasidan yoki tarifni yangilash orqali qo‘shish mumkin.`,
  },
  {
    q: 'Ma’lumotlarim xavfsizmi va kim ko‘radi?',
    a: 'Har bir kompaniya ma’lumoti alohida (multi-tenant) saqlanadi va faqat shu kompaniya foydalanuvchilari ko‘radi. Rollar bo‘yicha kirish cheklanadi. Batafsil: Maxfiylik siyosati.',
  },
  {
    q: 'Tarifni keyin o‘zgartirsam bo‘ladimi?',
    a: 'Ha. Hisob sahifasida tarifni oshirish yoki pasaytirish mumkin. Oshirishda farq mutanosib hisoblanadi; pasaytirish amaldagi to‘lov davri oxiridan kuchga kiradi.',
  },
  {
    q: 'Bekor qilsam ma’lumotlar yo‘qoladimi?',
    a: `Yo‘q. Bekor qilgandan keyin hisob o‘qish rejimiga o‘tadi, ma’lumotlar ${DATA_RETENTION_DAYS} kun saqlanadi va istalgan vaqtda Excel/CSV/PDF ko‘rinishida eksport qilinadi.`,
  },
];
