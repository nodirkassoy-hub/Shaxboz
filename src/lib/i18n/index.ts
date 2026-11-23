/**
 * Tarjima qatlami.
 *
 * Matnlar `src/locales/{uz,ru,en}.ts` fayllarida turadi — kod ichida
 * hard-code qilinmaydi, shunda keyinchalik til qo‘shish oson bo‘ladi.
 *
 * Ishlatish:
 *   const t = useT();      // reaktiv (til o‘zgarsa qayta render)
 *   t('nav.sales')         // → "Sotuv"
 *   t('sub.trialLeft', { n: 7 })  // → "Bepul sinov: 7 kun qoldi"
 *
 * Kalit topilmasa: uz → kalitning o‘zi (devda console.warn).
 */
import { useCallback } from 'react';
import { useApp } from '../store';
import type { Lang } from '../types';
import uz from '@/locales/uz';
import ru from '@/locales/ru';
import en from '@/locales/en';
import type { Dict } from '@/locales/types';

export const DICTS: Record<Lang, Dict> = { uz, ru, en };
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'uz', label: 'O‘zbekcha', short: 'UZ' },
  { id: 'ru', label: 'Русский', short: 'RU' },
  { id: 'en', label: 'English', short: 'EN' },
];

export type TVars = Record<string, string | number>;

/** `{n}` kabi joy egalarini to‘ldirish. */
export function interpolate(template: string, vars?: TVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
}

export function translate(lang: Lang, key: string, vars?: TVars): string {
  const value = DICTS[lang]?.[key] ?? uz[key];
  if (value === undefined) {
    if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] kalit topilmadi: ${key}`);
    return key;
  }
  return interpolate(value, vars);
}

export type TFunction = (key: string, vars?: TVars) => string;

/** Reaktiv tarjima funksiyasi (til o‘zgarsa komponent qayta render bo‘ladi). */
export function useT(): TFunction {
  const lang = useApp((s) => s.lang);
  return useCallback((key: string, vars?: TVars) => translate(lang, key, vars), [lang]);
}

/** Testlar uchun: barcha tillarda kalitlar to‘plami bir xilligini tekshirish. */
export function i18nParity(): { ok: boolean; missing: Record<string, string[]>; extra: Record<string, string[]> } {
  const base = new Set(Object.keys(uz));
  const missing: Record<string, string[]> = {};
  const extra: Record<string, string[]> = {};
  for (const lang of ['ru', 'en'] as const) {
    const keys = new Set(Object.keys(DICTS[lang]));
    const m = [...base].filter((k) => !keys.has(k));
    const e = [...keys].filter((k) => !base.has(k));
    if (m.length) missing[lang] = m;
    if (e.length) extra[lang] = e;
  }
  return { ok: !Object.keys(missing).length && !Object.keys(extra).length, missing, extra };
}

export { uz, ru, en };
export type { Dict };
