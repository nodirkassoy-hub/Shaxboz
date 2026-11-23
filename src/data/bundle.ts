/**
 * Demo bazani BUILD vaqtida kod ichiga "bundle" qiladi.
 *
 * Nega fayl tizimi emas? Vercel/serverless muhitida `src/data/demo-*.json`
 * fayllariga `fs` orqali murojaat qilish ishonchli emas: output tracing faylni
 * qo‘shib qo‘ymasa yoki fayl .gitignore bilan tushib qolsa, `/api/db/*` 500/404
 * qaytaradi va "Demo" tugmasi xato beradi. Import esa har doim bundle ichida.
 *
 * Import qilingan obyekt MUTATSIYA QILINMAYDI — har chaqiruvda klon qaytariladi.
 */
import factory from './demo-factory.json';
import trade from './demo-trade.json';
import type { Brand } from '@/lib/demo/types';

export interface BundledDemo {
  version: number;
  generatedAt: string;
  today: string;
  kind: Brand;
  db: Record<string, unknown>;
}

const BUNDLED: Record<Brand, BundledDemo> = {
  factory: factory as unknown as BundledDemo,
  trade: trade as unknown as BundledDemo,
};

export const hasBundledDemo = (kind: string): kind is Brand => kind === 'factory' || kind === 'trade';

/** Har chaqiruvda toza nusxa (mutatsiyadan himoya). */
export function bundledDemo(kind: Brand): BundledDemo {
  return JSON.parse(JSON.stringify(BUNDLED[kind])) as BundledDemo;
}
