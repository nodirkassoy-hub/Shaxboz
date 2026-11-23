import { NextResponse } from 'next/server';
import { createAccount } from '@/lib/billing';
import { todayTashkent, encodeSession, sessionCookie, rateLimit, clientIp, newId } from '@/lib/billing/server';
import { validateSignup } from '@/lib/validation';

/**
 * POST /api/billing/signup
 *
 * Sinov hisobini yaratadi — **bank kartasi talab qilinmaydi**.
 * Sinov muddati (30 kun) va tarif darajasi serverda yoziladi.
 * Rate limit: bir IP'dan 5 ta hisob / 10 daqiqa (spam himoyasi).
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`signup:${ip}`, 5, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, errors: [{ field: 'form', message: `Juda ko‘p urinish. ${rl.retryAfter} soniyadan so‘ng qayta urinib ko‘ring.` }] }, { status: 429, headers: { 'retry-after': String(rl.retryAfter) } });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, errors: [{ field: 'form', message: 'So‘rov formati noto‘g‘ri.' }] }, { status: 400 });
  }

  const v = validateSignup(body);
  if (!v.ok) return NextResponse.json({ ok: false, errors: v.errors }, { status: 422 });

  const today = todayTashkent();
  const acc = createAccount({
    company: v.value.company,
    name: v.value.name,
    phone: v.value.phone,
    email: v.value.email,
    stir: v.value.stir,
    today,
  });
  acc.id = newId('acc');
  // Parol hash'i hech qachon qaytarilmaydi va saqlanmaydi (demo qatlam).
  // PostgreSQL ulanganda: argon2id hash → users.password_hash.

  const token = encodeSession(acc);
  return NextResponse.json(
    {
      ok: true,
      account: { id: acc.id, company: acc.company.name, email: acc.user.email, trialEndsAt: acc.trialEndsAt },
      trial: { days: 30, endsAt: acc.trialEndsAt, cardRequired: false },
      testMode: true,
    },
    { status: 201, headers: { 'set-cookie': sessionCookie(token), 'cache-control': 'no-store' } },
  );
}
