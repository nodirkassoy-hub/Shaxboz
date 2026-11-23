/**
 * ─────────────────────────────────────────────────────────────
 * SERVER-SIDE OBUNA QATLAMI
 *
 * Tamoyil: **sinov muddati va tarif serverda saqlanadi**, brauzerda emas.
 * Foydalanuvchi localStorage'ni o‘chirib sinovni qayta boshlamaydi; limitlar
 * har so‘rovda serverda tekshiriladi.
 *
 * Saqlash: hozircha imzolangan cookie (HMAC-SHA256). Ma'lumot bazasi
 * (PostgreSQL) ulanganda `AccountStore` interfeysi amalga oshiriladi —
 * qolgan kod (API, UI, hisob-kitob) o‘zgarmaydi.
 *
 * Vaqt zonasi: barcha sanalar **Asia/Tashkent (UTC+5)** bo‘yicha, kun
 * chegarasi mahalliy yarim tun. Server UTC'da ishlaydi, shuning uchun
 * `todayTashkent()` ishlatiladi.
 * ─────────────────────────────────────────────────────────────
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import type { Account } from './index';

export const TZ = 'Asia/Tashkent';
export const TZ_OFFSET_MIN = 5 * 60;

/** Bugungi sana (YYYY-MM-DD) Asia/Tashkent bo‘yicha. */
export function todayTashkent(now: Date = new Date()): string {
  const t = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  return t.toISOString().slice(0, 10);
}

/** Hozirgi vaqt ISO (Tashkent ko‘rinishida, +05:00 bilan). */
export function nowTashkent(now: Date = new Date()): string {
  const t = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  return `${t.toISOString().slice(0, 19)}+05:00`;
}

/** Kunlar farqi: `to - from` (musbat bo‘lsa `to` keyinroq). */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

// ─── Sessiya cookie (imzolangan) ────────────────────────────────

const COOKIE = 'balans_sess';
const MAX_AGE = 60 * 60 * 24 * 180; // 180 kun

function secret(): string {
  // Ishlab chiqarishda majburiy: SESSION_SECRET (.env)
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    // Vercel'da maxfiy kalit bo‘lmasa — barqaror bo‘lmagan kalit bilan
    // imzolash sessiyani har deployda buzadi. Bu holatda aniq ogohlantiramiz.
    console.warn('[session] SESSION_SECRET o‘rnatilmagan — vaqtinchalik kalit ishlatilmoqda.');
  }
  return process.env.SESSION_SECRET || 'balans-dev-only-secret-not-for-production';
}

const b64u = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const unb64u = (s: string) => Buffer.from(s, 'base64url');

function sign(payload: string): string {
  return b64u(createHmac('sha256', secret()).update(payload).digest());
}

/** Sessiya tokenini yasash: `base64(payload).hmac` */
export function encodeSession(acc: Account): string {
  const body = b64u(JSON.stringify(acc));
  return `${body}.${sign(body)}`;
}

/** Tokenni tekshirish va hisobni qaytarish (buzilgan bo‘lsa null). */
export function decodeSession(token: string | undefined | null): Account | null {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const acc = JSON.parse(unb64u(body).toString('utf8')) as Account;
    if (!acc?.id || !acc?.trialEndsAt || !acc?.subscription) return null;
    return acc;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;

/** Cookie sarlavhasi (HttpOnly, Secure, SameSite=Lax). */
export function sessionCookie(token: string, secure = process.env.NODE_ENV === 'production'): string {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${MAX_AGE}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Demo/token identifikatori (log va audit uchun). */
export const newId = (prefix: string) => `${prefix}_${randomBytes(8).toString('hex')}`;

// ─── Rate limiting (xotirada; Redis bilan almashtiriladi) ───────

interface Bucket { count: number; reset: number }
const buckets = new Map<string, Bucket>();

export interface RateResult { ok: boolean; remaining: number; retryAfter: number }

/**
 * Oddiy "sliding window" limit. Serverless'da instansiya qayta ishga tushsa
 * hisob nolga tushadi — bu himoyani zaiflashtiradi, lekin brute-force'ni
 * sekinlashtirish uchun yetarli. Ishlab chiqarishda Redis/Upstash tavsiya etiladi.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateResult {
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/** Testlar uchun limitlarni tozalash. */
export function __resetRateLimits() { buckets.clear(); }

/** Mijoz IP'si (Vercel: x-forwarded-for birinchi qiymat). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
