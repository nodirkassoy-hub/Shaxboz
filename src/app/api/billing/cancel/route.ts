import { NextResponse } from 'next/server';
import type { Account } from '@/lib/billing';
import { decodeSession, encodeSession, sessionCookie, todayTashkent } from '@/lib/billing/server';

/**
 * POST /api/billing/cancel — obunani bekor qilish.
 * Davr oxirigacha kirish saqlanadi (`status: cancelled`), keyin o‘qish rejimi.
 * POST /api/billing/cancel?resume=1 — qayta faollashtirish.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith('balans_sess='))?.split('=').slice(1).join('=');
  const acc: Account | null = decodeSession(token);
  if (!acc) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 });

  const resume = new URL(req.url).searchParams.get('resume') === '1';
  const today = todayTashkent();

  if (resume) {
    if (acc.subscription.status !== 'cancelled') {
      return NextResponse.json({ ok: false, error: 'Faollashtirish uchun bekor qilingan obuna kerak.' }, { status: 409 });
    }
    acc.subscription = { ...acc.subscription, status: 'active', cancelledAt: undefined };
    return NextResponse.json({ ok: true, subscription: acc.subscription }, { headers: { 'set-cookie': sessionCookie(encodeSession(acc)) } });
  }

  if (acc.subscription.status === 'cancelled') {
    return NextResponse.json({ ok: true, subscription: acc.subscription, alreadyCancelled: true });
  }
  if (acc.subscription.status === 'trial') {
    return NextResponse.json({ ok: false, error: 'Sinov davrida bekor qilish shart emas — to‘lov talab qilinmaydi.' }, { status: 409 });
  }
  acc.subscription = { ...acc.subscription, status: 'cancelled', cancelledAt: today };
  return NextResponse.json(
    { ok: true, subscription: acc.subscription, note: `Obuna bekor qilindi. ${acc.subscription.periodEnd} sanasigacha kirish saqlanadi, keyin o‘qish rejimi.` },
    { headers: { 'set-cookie': sessionCookie(encodeSession(acc)) } },
  );
}
