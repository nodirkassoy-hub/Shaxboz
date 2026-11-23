import { NextResponse } from 'next/server';
import type { Account, TeamMember } from '@/lib/billing';
import { entitlements } from '@/lib/billing';
import { loadAccount, todayTashkent, rateLimit, clientIp } from '@/lib/billing/server';
import { store, audit } from '@/lib/billing/persist';
import { sanitize, emailError, requiredError } from '@/lib/validation';
import { MODULE_IDS } from '@/lib/rbac';
import type { ModuleId } from '@/lib/types';

/**
 * POST /api/billing/team — jamoaga a'zo qo‘shish (server tomonda limit tekshiriladi)
 * DELETE /api/billing/team?userId=uX — a'zoni o‘chirish (faqat o‘zi/director emas)
 *
 * Tarif limiti **serverda** tekshiriladi: START 3, BIZNES 10, ISHLAB 30.
 * Limitdan oshsa 402 va `code: 'limit'` — UI "Tarifni yangilang" modalini ochadi.
 */
export const dynamic = 'force-dynamic';

const ROLES = ['direktor', 'buxgalter', 'omborchi', 'sotuvchi', 'hr', 'xarid', 'ishlab'] as const;
type TeamRole = (typeof ROLES)[number];

export async function POST(req: Request) {
  const rl = rateLimit(`team:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: 'Juda ko‘p urinish.' }, { status: 429 });

  const acc = await loadAccount(req);
  if (!acc) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 });

  const today = todayTashkent();
  const ent = entitlements(acc, today);
  if (ent.readOnly) {
    return NextResponse.json({ ok: false, code: 'readonly', error: 'Hisob o‘qish rejimida — yangi foydalanuvchi qo‘shib bo‘lmaydi.' }, { status: 402 });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* bo‘sh */ }

  const name = sanitize(body.name, 120);
  const email = sanitize(body.email, 120).toLowerCase();
  const role = sanitize(body.role, 20) as TeamRole;

  const errors: { field: string; message: string }[] = [];
  const eName = requiredError(name, 'Ism-familiya', 3);
  if (eName) errors.push({ field: 'name', message: eName });
  const eEmail = emailError(email);
  if (eEmail) errors.push({ field: 'email', message: eEmail });
  if (!ROLES.includes(role)) errors.push({ field: 'role', message: 'Rol tanlanmagan yoki noto‘g‘ri.' });
  if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  // Takroriy email
  if (acc.team.some((m) => m.email.toLowerCase() === email)) {
    return NextResponse.json({ ok: false, errors: [{ field: 'email', message: 'Bu email jamoada allaqachon bor.' }] }, { status: 409 });
  }

  // ── Tarif limiti (server) ──
  const seats = ent.users; // null = cheksiz
  if (seats !== null && acc.team.length >= seats) {
    return NextResponse.json(
      {
        ok: false,
        code: 'limit',
        error: `${ent.plan.name} tarifida ${seats} ta foydalanuvchi mumkin. Qo‘shimcha o‘rin: 29 000 so‘m/oy yoki tarifni yangilang.`,
        limit: seats,
        used: acc.team.length,
        upgrade: '/subscription',
      },
      { status: 402 },
    );
  }

  const member: TeamMember = { id: `u${Date.now().toString(36)}`, name, email, role, status: 'invited' };
  acc.team = [...acc.team, member];
  await store.put(acc);
  await audit({ accountId: acc.id, actor: acc.user.email, action: 'team.invite', target: email, detail: { role, seats } });

  return NextResponse.json({ ok: true, member, used: acc.team.length, limit: seats }, { status: 201, headers: { 'cache-control': 'no-store' } });
}

export async function DELETE(req: Request) {
  const acc = await loadAccount(req);
  if (!acc) return NextResponse.json({ ok: false, error: 'Avval tizimga kiring.' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('userId') || '';
  if (!id) return NextResponse.json({ ok: false, error: 'userId kerak.' }, { status: 400 });
  if (acc.team.length <= 1) return NextResponse.json({ ok: false, error: 'Hisob egasini o‘chirib bo‘lmaydi.' }, { status: 409 });

  const before = acc.team.length;
  acc.team = acc.team.filter((m) => m.id !== id);
  if (acc.team.length === before) return NextResponse.json({ ok: false, error: 'Bunday foydalanuvchi topilmadi.' }, { status: 404 });

  await store.put(acc);
  await audit({ accountId: acc.id, actor: acc.user.email, action: 'team.remove', target: id });
  return NextResponse.json({ ok: true, used: acc.team.length }, { headers: { 'cache-control': 'no-store' } });
}

/** GET — qaysi modullar tarifga kirgan (UI'da lock ikonkalari uchun). */
export async function GET(req: Request) {
  const acc: Account | null = await loadAccount(req);
  if (!acc) return NextResponse.json({ authenticated: false, modules: [] as ModuleId[] }, { headers: { 'cache-control': 'no-store' } });
  const ent = entitlements(acc, todayTashkent());
  return NextResponse.json(
    {
      authenticated: true,
      modules: ent.modules === 'all' ? MODULE_IDS : ent.modules,
      roles: ROLES,
      seats: { used: acc.team.length, limit: ent.users },
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
