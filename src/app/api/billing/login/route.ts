import { NextResponse } from 'next/server';
import { rateLimit, clientIp, encodeSession, sessionCookie } from '@/lib/billing/server';
import { store, audit } from '@/lib/billing/persist';
import { emailError, sanitize } from '@/lib/validation';

/**
 * POST /api/billing/login
 *
 * Email + parol tekshiriladi (scrypt hash serverda). Muvaffaqiyatli bo‘lsa
 * `acc_xxx` identifikatori imzolangan HttpOnly cookie'ga yoziladi.
 * Brute-force himoyasi: 10 urinish / 5 daqiqa / IP + email bo‘yicha 5 urinish.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: `Juda ko‘p urinish. ${rl.retryAfter} soniyadan so‘ng qayta urinib ko‘ring.` }, { status: 429, headers: { 'retry-after': String(rl.retryAfter) } });
  }
  let body: { email?: unknown; password?: unknown } = {};
  try { body = (await req.json()) as typeof body; } catch { /* bo‘sh */ }
  const email = sanitize(body.email, 120).toLowerCase();
  const eErr = emailError(email);
  if (eErr) return NextResponse.json({ ok: false, error: eErr }, { status: 422 });
  if (typeof body.password !== 'string' || body.password.length < 8) {
    return NextResponse.json({ ok: false, error: 'Parol kamida 8 belgi bo‘lishi kerak.' }, { status: 422 });
  }
  // Email bo‘yicha ham limit — tarqoq IP'lardan parol terishning oldini oladi.
  const perEmail = rateLimit(`login:email:${email}`, 5, 5 * 60_000);
  if (!perEmail.ok) {
    return NextResponse.json({ ok: false, error: `Juda ko‘p urinish. ${perEmail.retryAfter} soniyadan so‘ng qayta urinib ko‘ring.` }, { status: 429, headers: { 'retry-after': String(perEmail.retryAfter) } });
  }

  const id = await store.verifyPassword(email, body.password as string);
  if (!id) {
    // Email bormi-yo‘qmi — bir xil javob (hisoblar mavjudligini oshkor qilmaymiz).
    const exists = await store.findByEmail(email);
    await audit({ accountId: exists?.id, actor: email, action: 'auth.login_failed' });
    return NextResponse.json(
      { ok: false, error: exists ? 'Parol noto‘g‘ri.' : 'Email yoki parol noto‘g‘ri. Hisobingiz yo‘q bo‘lsa — 30 kunlik bepul sinovni boshlang.' },
      { status: 401 },
    );
  }
  const acc = await store.get(id);
  if (!acc) return NextResponse.json({ ok: false, error: 'Hisob topilmadi.' }, { status: 404 });
  await audit({ accountId: acc.id, actor: email, action: 'auth.login' });
  return NextResponse.json(
    { ok: true, account: { id: acc.id, company: acc.company.name, email: acc.user.email, trialEndsAt: acc.trialEndsAt } },
    { headers: { 'set-cookie': sessionCookie(encodeSession(acc.id)), 'cache-control': 'no-store' } },
  );
}
