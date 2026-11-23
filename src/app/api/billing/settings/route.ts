import { NextResponse } from 'next/server';
import { loadAccount, todayTashkent, rateLimit, clientIp } from '@/lib/billing/server';
import { store, audit } from '@/lib/billing/persist';
import { sanitize, validateProfile } from '@/lib/validation';

/**
 * PATCH /api/billing/settings
 *
 * Kompaniya profili (nom, STIR, manzil, bank, rahbar ismi), QQS holati va
 * faollashtirilgan modul tanlovi. Hamma o‘zgarish **serverda** saqlanadi va
 * audit jurnaliga yoziladi — brauzerdagi localStorage faqat nusxa.
 */
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request) {
  const rl = rateLimit(`settings:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'Juda ko‘p urinish.' }, { status: 429 });

  const acc = await loadAccount(req);
  if (!acc) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 });

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch {
    return NextResponse.json({ ok: false, error: 'So‘rov formati noto‘g‘ri.' }, { status: 400 });
  }

  const changed: string[] = [];

  if ('vatEnabled' in body) {
    if (typeof body.vatEnabled !== 'boolean') {
      return NextResponse.json({ ok: false, errors: [{ field: 'vatEnabled', message: 'Mantiqiy qiymat kerak.' }] }, { status: 422 });
    }
    acc.vatEnabled = body.vatEnabled;
    changed.push('vatEnabled');
  }

  const profileKeys = ['company', 'stir', 'address', 'bank', 'userName'];
  if (profileKeys.some((k) => k in body)) {
    const v = validateProfile(body);
    if (!v.ok) return NextResponse.json({ ok: false, errors: v.errors }, { status: 422 });
    const p = v.value;
    acc.company = {
      ...acc.company,
      ...(p.company ? { name: p.company } : {}),
      ...(p.stir !== undefined ? { stir: p.stir } : {}),
      ...(p.address !== undefined ? { address: p.address } : {}),
      ...(p.bank !== undefined ? { bank: p.bank } : {}),
    };
    if (p.userName) acc.user = { ...acc.user, name: p.userName };
    changed.push('profile');
  }

  if ('onboarded' in body) {
    acc.onboarded = Boolean(body.onboarded);
    changed.push('onboarded');
  }

  if (!changed.length) {
    return NextResponse.json({ ok: false, error: 'O‘zgartirish uchun maydon topilmadi.' }, { status: 400 });
  }

  await store.put(acc);
  await audit({ accountId: acc.id, actor: acc.user.email, action: 'account.settings', detail: { changed } });

  return NextResponse.json(
    { ok: true, company: acc.company, user: acc.user, vatEnabled: acc.vatEnabled, onboarded: acc.onboarded, changed },
    { headers: { 'cache-control': 'no-store' } },
  );
}

/** GET — joriy sozlamalar (boshqa qurilmada ham bir xil bo‘lishi uchun). */
export async function GET(req: Request) {
  const acc = await loadAccount(req);
  if (!acc) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      today: todayTashkent(),
      company: acc.company,
      user: acc.user,
      vatEnabled: acc.vatEnabled,
      onboarded: acc.onboarded,
      team: acc.team,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

/** Sanitizatsiya qilingan maydon (validatsiya moduli bilan bir xil qoidalar). */
export const __sanitize = sanitize;
