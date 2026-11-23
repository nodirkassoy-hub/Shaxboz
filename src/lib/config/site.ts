/**
 * Sayt manzili — yagona manba. Sitemap, robots, metadata va JSON-LD shu yerdan oladi,
 * shuning uchun domenlar bir-biriga zid bo‘lib qolmaydi.
 *
 * Tartib: NEXT_PUBLIC_SITE_URL → Vercel preview/production → mahalliy domen.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'https://balans-ai.uz'
).replace(/\/+$/, '');

/** Indekslanmaydigan (autentifikatsiya talab qiladigan yoki o‘tish sahifalari) yo‘llar. */
export const NOINDEX_PATHS = ['/app', '/account', '/checkout', '/subscription', '/api/'];
