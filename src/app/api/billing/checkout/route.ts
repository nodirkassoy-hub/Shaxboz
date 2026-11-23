import { NextResponse } from 'next/server';
import { createInvoice, type PaymentMethod } from '@/lib/billing';
import { planOf } from '@/lib/config/pricing';
import { decodeSession, encodeSession, sessionCookie, todayTashkent, rateLimit, clientIp, SESSION_COOKIE } from '@/lib/billing/server';
import { createPayment } from '@/lib/billing/providers';
import { validateCheckout } from '@/lib/validation';
import type { Account } from '@/lib/billing';
import type { Cycle, PlanId } from '@/lib/config/pricing';

/**
 * POST /api/billing/checkout — hisob-faktura yaratish va to‘lovni boshlash.
 * POST /api/billing/checkout?confirm=<invoiceId> — TEST rejimida tasdiqlash.
 *
 * Haqiqiy provayder kalitlari bo‘lmasa, to‘lov `pending` holatida qoladi va
 * UI "TEST" belgisini ko‘rsatadi. Soxta "to‘landi" javobi qaytarilmaydi.
 */
export const dynamic = 'force-dynamic';

const cookieToken = (req: Request) =>
  req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.split('=').slice(1).join('=');

export async function POST(req: Request) {
  const token = cookieToken(req);
  const acc = decodeSession(token);
  if (!acc) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring (sinov hisobi oching).' }, { status: 401 });

  const url = new URL(req.url);
  const confirmId = url.searchParams.get('confirm');

  // ── Tasdiqlash (faqat test rejimida yoki webhook orqali) ──
  if (confirmId) {
    return confirm(acc, confirmId, req);
  }

  const rl = rateLimit(`checkout:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: `Juda ko‘p urinish. ${rl.retryAfter} soniyadan so‘ng.` }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'So‘rov formati noto‘g‘ri.' }, { status: 400 }); }
  const v = validateCheckout(body);
  if (!v.ok) return NextResponse.json({ ok: false, errors: v.errors }, { status: 422 });

  const planId = v.value.planId as PlanId;
  const cycle = v.value.cycle as Cycle;
  const method = v.value.method as PaymentMethod;
  if (planId === 'korporativ') {
    return NextResponse.json({ ok: false, error: 'KORPORATIV tarif kelishuv asosida — “Bog‘lanish” formasidan foydalaning.', contact: '/contact?plan=korporativ' }, { status: 400 });
  }

  const today = todayTashkent();
  const inv = createInvoice(acc, planId, cycle, method, today, true);
  acc.invoices.unshift(inv);
  const intent = await createPayment(method, { amount: inv.amount, invoiceNo: inv.no, planName: planOf(planId).name });

  return NextResponse.json(
    {
      ok: true,
      invoice: inv,
      payment: intent,
      testMode: intent.test,
      message: intent.test
        ? 'TEST REJIMI: haqiqiy pul yechilmaydi. To‘lovni tasdiqlash uchun “Test to‘lovni tasdiqlash” tugmasini bosing.'
        : 'To‘lov sahifasiga yo‘naltirilasiz.',
    },
    { status: 201, headers: { 'set-cookie': sessionCookie(encodeSession(acc)), 'cache-control': 'no-store' } },
  );
}

/** Test rejimida to‘lovni tasdiqlash — obuna shu yerda faollashadi. */
function confirm(acc: Account, invoiceId: string, req: Request) {
  const rl = rateLimit(`confirm:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'Juda ko‘p urinish.' }, { status: 429 });

  const inv = acc.invoices.find((i) => i.id === invoiceId);
  if (!inv) return NextResponse.json({ ok: false, error: 'Hisob-faktura topilmadi.' }, { status: 404 });
  if (inv.status === 'paid') return NextResponse.json({ ok: true, invoice: inv, alreadyPaid: true });
  if (!inv.test) {
    return NextResponse.json({ ok: false, error: 'Bu hisob-faktura haqiqiy to‘lov uchun — tasdiqlash faqat provayder webhook orqali bo‘ladi.' }, { status: 409 });
  }

  // Faqat test rejimidagi hisob-faktura tasdiqlanadi (test bayrog‘i serverda).
  const today = todayTashkent();
  inv.status = 'paid';
  inv.paidAt = today;
  inv.ref = `test_confirm_${Date.now().toString(36)}`;
  acc.subscription = {
    ...acc.subscription,
    planId: inv.planId,
    cycle: inv.cycle,
    status: 'active',
    startedAt: today,
    periodEnd: addCycle(today, inv.cycle),
    cancelledAt: undefined,
  };
  return NextResponse.json(
    { ok: true, invoice: inv, subscription: acc.subscription, testMode: true },
    { headers: { 'set-cookie': sessionCookie(encodeSession(acc)), 'cache-control': 'no-store' } },
  );
}

function addCycle(from: string, cycle: Cycle): string {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + (cycle === 'annual' ? 12 : 1));
  return d.toISOString().slice(0, 10);
}
