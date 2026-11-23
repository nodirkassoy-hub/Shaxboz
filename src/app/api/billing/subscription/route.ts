import { NextResponse } from 'next/server';
import { decodeSession, todayTashkent, nowTashkent, SESSION_COOKIE } from '@/lib/billing/server';
import { entitlements } from '@/lib/billing';
import { TRIAL_DAYS, GRACE_DAYS, DATA_RETENTION_DAYS } from '@/lib/config/pricing';

/**
 * GET /api/billing/subscription
 *
 * Joriy obuna holati — **serverdagi haqiqiy sanadan** hisoblanadi.
 * Brauzer localStorage'dagi qiymat faqat ko‘rsatish uchun; qarorlar shu javobga
 * asoslanadi.
 */
export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const token = req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.split('=').slice(1).join('=');
  const acc = decodeSession(token);
  const today = todayTashkent();
  if (!acc) {
    return NextResponse.json(
      {
        authenticated: false,
        today,
        serverTime: nowTashkent(),
        timezone: 'Asia/Tashkent',
        trial: { days: TRIAL_DAYS, graceDays: GRACE_DAYS, retentionDays: DATA_RETENTION_DAYS },
      },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    );
  }
  const ent = entitlements(acc, today);
  return NextResponse.json(
    {
      authenticated: true,
      today,
      serverTime: nowTashkent(),
      timezone: 'Asia/Tashkent',
      account: {
        id: acc.id,
        company: acc.company,
        user: acc.user,
        createdAt: acc.createdAt,
        trialEndsAt: acc.trialEndsAt,
        subscription: acc.subscription,
        vatEnabled: acc.vatEnabled,
        onboarded: acc.onboarded,
        team: acc.team,
        aiUsage: acc.aiUsage,
        invoices: acc.invoices,
      },
      entitlements: {
        planId: ent.planId,
        status: ent.status,
        readOnly: ent.readOnly,
        modules: ent.modules,
        users: ent.users,
        warehouses: ent.warehouses,
        aiQuestions: ent.aiQuestions,
        aiUsed: ent.aiUsed,
        aiLeft: ent.aiLeft,
        daysLeft: ent.daysLeft,
        trialDaysLeft: ent.trialDaysLeft,
        graceLeft: ent.graceLeft,
        periodEnd: ent.periodEnd,
        reason: ent.reason,
      },
      policy: { trialDays: TRIAL_DAYS, graceDays: GRACE_DAYS, retentionDays: DATA_RETENTION_DAYS },
    },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}
