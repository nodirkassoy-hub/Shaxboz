/**
 * ─────────────────────────────────────────────────────────────
 * TO‘LOV PROVAYDERLARI (ajratilgan modul)
 *
 * Har bir provayder — alohida adapter. Hozir **TEST REJIMI**:
 * haqiqiy pul yechilmaydi, tashqi tarmoqqa so‘rov ketmaydi va
 * foydalanuvchiga bu holat aniq ko‘rsatiladi (UI'da "TEST" belgisi).
 *
 * Haqiqiy kalitlar `.env` orqali ulanadi (kodda hech qachon yozilmaydi):
 *   PAYME_MERCHANT_ID, PAYME_KEY, PAYME_TEST_KEY
 *   CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY
 *   UZUM_MERCHANT_ID, UZUM_SECRET_KEY
 *   BANK_INN, BANK_ACCOUNT, BANK_MFO, BANK_NAME
 *
 * Provayder "live" bo‘lishi uchun `isLive()` true qaytishi va
 * `createPayment()` haqiqiy API chaqiruvini bajarishi kerak.
 * ─────────────────────────────────────────────────────────────
 */
import type { PaymentMethod } from './index';

export interface PaymentIntent {
  /** Provayderdagi to‘lov identifikatori */
  ref: string;
  /** Foydalanuvchini yo‘naltirish manzili (onlayn to‘lovlarda) */
  redirectUrl?: string;
  /** Bank o‘tkazmasi uchun rekvizitlar */
  bank?: { name: string; inn: string; account: string; mfo: string; purpose: string };
  status: 'pending' | 'requires_action';
  /** Test rejimida yaratilgan */
  test: boolean;
  provider: PaymentMethod;
}

export interface ProviderInfo {
  id: PaymentMethod;
  name: string;
  /** Haqiqiy kalitlar o‘rnatilganmi */
  live: boolean;
  /** Test rejimida to‘lov qanday "tasdiqlanadi" */
  note: string;
}

const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined) || '';

export function isLive(method: PaymentMethod): boolean {
  switch (method) {
    case 'payme': return Boolean(env('PAYME_MERCHANT_ID') && (env('PAYME_KEY') || env('PAYME_TEST_KEY')));
    case 'click': return Boolean(env('CLICK_SERVICE_ID') && env('CLICK_SECRET_KEY'));
    case 'uzum': return Boolean(env('UZUM_MERCHANT_ID') && env('UZUM_SECRET_KEY'));
    case 'bank': return Boolean(env('BANK_INN') && env('BANK_ACCOUNT'));
    default: return false;
  }
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'payme', name: 'Payme', live: isLive('payme'), note: 'Karta orqali onlayn to‘lov' },
  { id: 'click', name: 'Click', live: isLive('click'), note: 'Click Up yoki bank kartasi' },
  { id: 'uzum', name: 'Uzum Pay', live: isLive('uzum'), note: 'Uzum hisobi orqali' },
  { id: 'bank', name: 'Bank o‘tkazmasi', live: isLive('bank'), note: 'Yuridik shaxslar uchun hisob-faktura' },
];

/** Umumiy test rejimi indikatori (UI uchun). */
export const TEST_MODE = !PROVIDERS.some((p) => p.live);

const bankDetails = () => ({
  name: env('BANK_NAME') || 'ATB “O‘zbekiston sanoat-qurilish banki” (demo)',
  inn: env('BANK_INN') || '201 122 334',
  account: env('BANK_ACCOUNT') || '2020 8000 1234 5678 9001',
  mfo: env('BANK_MFO') || '00401',
});

/**
 * To‘lovni boshlash. TEST rejimida — soxta muvaffaqiyat YO‘Q: `pending` holati
 * qaytadi, foydalanuvchi "Test to‘lovni tasdiqlash" tugmasini bosishi kerak
 * (bu ham UI'da aniq belgilangan). Shunda demo bilan haqiqiy to‘lov
 * aralashmaydi.
 */
export async function createPayment(method: PaymentMethod, opts: { amount: number; invoiceNo: string; planName: string }): Promise<PaymentIntent> {
  const test = !isLive(method);
  if (method === 'bank') {
    return {
      ref: `bank_${opts.invoiceNo}_${Date.now().toString(36)}`,
      status: 'pending',
      test,
      provider: method,
      bank: { ...bankDetails(), purpose: `${opts.planName} tarifi, hisob-faktura ${opts.invoiceNo}` },
    };
  }
  if (test) {
    return {
      ref: `test_${method}_${opts.invoiceNo}_${Date.now().toString(36)}`,
      status: 'pending',
      test: true,
      provider: method,
    };
  }
  // Haqiqiy provayder integratsiyasi shu yerga qo‘shiladi.
  // Misol: Payme → https://checkout.paycom.uz/<base64(m=...;ac.invoice=...;a=amount;l=uz)>
  throw new Error(`${method} uchun haqiqiy kalitlar hali ulanmagan.`);
}

/** To‘lov holatini tekshirish (webhook/callback orqali). */
export async function checkPayment(method: PaymentMethod, ref: string): Promise<'pending' | 'paid' | 'failed'> {
  if (!isLive(method)) return 'pending';
  void ref;
  return 'pending';
}
