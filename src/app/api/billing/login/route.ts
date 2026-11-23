import { NextResponse } from 'next/server';
import { rateLimit, clientIp, decodeSession, SESSION_COOKIE } from '@/lib/billing/server';
import { emailError, sanitize } from '@/lib/validation';

/**
 * POST /api/billing/login
 *
 * Demo qatlamida autentifikatsiya sessiya cookie'si orqali tiklanadi
 * (parol tekshiruvi PostgreSQL + argon2 ulanganda qo‘shiladi).
 * Brute-force himoyasi: 10 urinish / 5 daqiqa / IP.
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
  // Mavjud sessiya bo‘lsa — uni qaytaramiz (demo rejim)
  const token = req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.split('=').slice(1).join('=');
  const acc = decodeSession(token);
  if (acc && acc.user.email === email) {
    return NextResponse.json({ ok: true, account: { id: acc.id, company: acc.company.name, email: acc.user.email } }, { headers: { 'cache-control': 'no-store' } });
  }
  return NextResponse.json(
    { ok: false, error: 'Bu email bilan hisob topilmadi. Avval 30 kunlik bepul sinovni boshlang.' },
    { status: 404 },
  );
}
