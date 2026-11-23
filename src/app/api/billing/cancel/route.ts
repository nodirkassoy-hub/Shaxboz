import { NextResponse } from 'next/server';
import type { Account } from '@/lib/billing';
import { loadAccount, todayTashkent } from '@/lib/billing/server';
import { store, audit } from '@/lib/billing/persist';

/**
 * POST /api/billing/cancel — obunani bekor qilish.
 * Davr oxirigacha kirish saqlanadi (`status: cancelled`), keyin o‘qish rejimi.
 * POST /api/billing/cancel?resume=1 — qayta faollashtirish.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const acc: Account | null = await loadAccount(req);
  if (!acc) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 });

  const resume = new URL(req.url).searchParams.get('resume') === '1';
  const today = todayTashkent();

  if (resume) {
    if (acc.subscription.status !== 'cancelled') {
      return NextResponse.json({ ok: false, error: 'Faollashtirish uchun bekor qilingan obuna kerak.' }, { status: 409 });
    }
    acc.subscription = { ...acc.subscription, status: 'active', cancelledAt: undefined };
    await store.put(acc);
    await audit({ accountId: acc.id, actor: acc.user.email, action: 'subscription.resume' });
    return NextResponse.json({ ok: true, subscription: acc.subscription }, { headers: { 'cache-control': 'no-store' } });
  }

  if (acc.subscription.status === 'cancelled') {
    return NextResponse.json({ ok: true, subscription: acc.subscription, alreadyCancelled: true });
  }
  if (acc.subscription.status === 'trial') {
    return NextResponse.json({ ok: false, error: 'Sinov davrida bekor qilish shart emas — to‘lov talab qilinmaydi.' }, { status: 409 });
  }
  acc.subscription = { ...acc.subscription, status: 'cancelled', cancelledAt: today };
  await store.put(acc);
  await audit({ accountId: acc.id, actor: acc.user.email, action: 'subscription.cancel', detail: { periodEnd: acc.subscription.periodEnd } });
  return NextResponse.json(
    { ok: true, subscription: acc.subscription, note: `Obuna bekor qilindi. ${acc.subscription.periodEnd} sanasigacha kirish saqlanadi, keyin o‘qish rejimi.` },
    { headers: { 'cache-control': 'no-store' } },
  );
}
