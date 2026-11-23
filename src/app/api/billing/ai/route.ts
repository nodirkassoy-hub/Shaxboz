import { NextResponse } from 'next/server';
import { decodeSession, encodeSession, sessionCookie, todayTashkent, rateLimit, clientIp } from '@/lib/billing/server';
import { entitlements } from '@/lib/billing';
import { monthKey } from '@/lib/core/dates';
import { sanitize } from '@/lib/validation';

/**
 * POST /api/billing/ai — AI CFO savol limitini SERVERDA tekshirish va hisoblash.
 *
 * Mijoz faqat savol matnini yuboradi; javob (tahlil) serverda hisoblanadi
 * (haqiqiy LLM ulanganda API kalit faqat serverda qoladi).
 * Limit tugagan bo‘lsa 402 qaytadi — UI "Tarifni yangilang" oynasini ochadi.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith('balans_sess='))?.split('=').slice(1).join('=');
  const rl = rateLimit(`ai:${clientIp(req)}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'Juda ko‘p so‘rov. Biroz kutib turing.' }, { status: 429, headers: { 'retry-after': String(rl.retryAfter) } });

  const acc = decodeSession(token);
  if (!acc) {
    // Demo (hisobsiz) — savol limiti yo‘q, lekin so‘rov tezligi cheklangan.
    return NextResponse.json({ ok: true, mode: 'demo', limit: null, used: null, left: null }, { headers: { 'cache-control': 'no-store' } });
  }

  const today = todayTashkent();
  const ent = entitlements(acc, today);
  if (ent.readOnly) {
    return NextResponse.json({ ok: false, code: 'readonly', error: 'Hisob o‘qish rejimida. AI CFO savollari uchun tarifni yangilang.' }, { status: 402 });
  }
  if (ent.aiLeft !== null && ent.aiLeft <= 0) {
    return NextResponse.json(
      { ok: false, code: 'quota', error: `Bu oy uchun AI CFO savollar limiti tugadi (${ent.aiQuestions} ta). Tarifni yangilang.`, limit: ent.aiQuestions, used: ent.aiUsed },
      { status: 402 },
    );
  }

  let body: { question?: unknown } = {};
  try { body = (await req.json()) as typeof body; } catch { /* ixtiyoriy */ }
  const question = sanitize(body.question, 600);

  const key = monthKey(today);
  acc.aiUsage[key] = (acc.aiUsage[key] || 0) + 1;
  const next = entitlements(acc, today);

  return NextResponse.json(
    {
      ok: true,
      question,
      limit: next.aiQuestions,
      used: next.aiUsed,
      left: next.aiLeft,
      tz: 'Asia/Tashkent',
    },
    { headers: { 'set-cookie': sessionCookie(encodeSession(acc)), 'cache-control': 'no-store' } },
  );
}
