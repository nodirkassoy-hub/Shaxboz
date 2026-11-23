/**
 * Server-side kiritish validatsiyasi.
 *
 * Har bir API marshrutida ishlatiladi: mijoz tekshiruvi (UI) faqat qulaylik,
 * xavfsizlik esa shu yerda ta'minlanadi. XSS uchun matnlar tozalanadi,
 * SQL in'ektsiya esa ORM/parametrlangan so‘rovlar bilan (bu qatlamda esa
 * faqat ruxsat etilgan belgilar) to‘sib qo‘yiladi.
 */

export type FieldError = { field: string; message: string };
export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

/** HTML teglari va boshqaruv belgilarini olib tashlash. */
export function sanitize(input: unknown, max = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

/** XSS uchun xavfli emas, lekin HTML kontekstiga qo‘yilsa himoyalangan matn. */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
/** O‘zbek telefon raqami: +998 XX XXX XX XX (bo‘shliq/tire ixtiyoriy). */
const PHONE_RE = /^\+?998\d{9}$/;

export const normalizePhone = (p: string) => p.replace(/[\s\-()]/g, '');

export function emailError(v: string): string | null {
  const s = sanitize(v, 120).toLowerCase();
  if (!s) return 'Email manzilini kiriting.';
  if (!EMAIL_RE.test(s)) return 'Email manzili noto‘g‘ri (masalan: ism@kompaniya.uz).';
  return null;
}

export function phoneError(v: string): string | null {
  const s = normalizePhone(v);
  if (!s) return 'Telefon raqamini kiriting.';
  if (!PHONE_RE.test(s)) return 'Telefon formati: +998 90 123 45 67.';
  return null;
}

export function passwordError(v: string): string | null {
  if (!v) return 'Parolni kiriting.';
  if (v.length < 8) return 'Parol kamida 8 belgi bo‘lishi kerak.';
  if (!/[a-zA-Z]/.test(v)) return 'Parolda kamida bitta harf bo‘lishi kerak.';
  if (!/\d/.test(v)) return 'Parolda kamida bitta raqam bo‘lishi kerak.';
  if (v.length > 128) return 'Parol juda uzun.';
  return null;
}

export function requiredError(v: unknown, label: string, min = 2, max = 200): string | null {
  const s = sanitize(v, max);
  if (!s) return `${label} to‘ldirilmagan.`;
  if (s.length < min) return `${label} kamida ${min} belgi bo‘lishi kerak.`;
  return null;
}

export interface SignupInput {
  company: string; name: string; phone: string; email: string; password: string; stir?: string;
}

/** Ro‘yxatdan o‘tish formasi (karta talab qilinmaydi). */
export function validateSignup(body: unknown): Validated<SignupInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const company = sanitize(b.company, 160);
  const name = sanitize(b.name, 120);
  const email = sanitize(b.email, 120).toLowerCase();
  const phone = sanitize(b.phone, 30);
  const password = typeof b.password === 'string' ? b.password : '';
  const stir = sanitize(b.stir, 20);

  const eCompany = requiredError(company, 'Kompaniya nomi');
  if (eCompany) errors.push({ field: 'company', message: eCompany });
  const eName = requiredError(name, 'Ism-familiya', 3);
  if (eName) errors.push({ field: 'name', message: eName });
  const eEmail = emailError(email);
  if (eEmail) errors.push({ field: 'email', message: eEmail });
  const ePhone = phoneError(phone);
  if (ePhone) errors.push({ field: 'phone', message: ePhone });
  const ePass = passwordError(password);
  if (ePass) errors.push({ field: 'password', message: ePass });
  if (stir && !/^\d{9}$/.test(stir.replace(/\s/g, ''))) errors.push({ field: 'stir', message: 'STIR 9 raqamdan iborat bo‘lishi kerak.' });

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { company, name, phone: normalizePhone(phone), email, password, stir: stir || undefined } };
}

/** To‘lov/hisob-faktura so‘rovi. */
export function validateCheckout(body: unknown): Validated<{ planId: string; cycle: 'monthly' | 'annual'; method: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const planId = sanitize(b.planId, 30);
  const cycle = b.cycle === 'annual' ? 'annual' : 'monthly';
  const method = sanitize(b.method, 20);
  if (!['start', 'biznes', 'ishlab', 'korporativ'].includes(planId)) errors.push({ field: 'planId', message: 'Tarif tanlanmagan yoki noto‘g‘ri.' });
  if (!['payme', 'click', 'uzum', 'bank'].includes(method)) errors.push({ field: 'method', message: 'To‘lov usuli noto‘g‘ri.' });
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { planId, cycle, method } };
}

export function validateProfile(body: unknown): Validated<{ company?: string; stir?: string; address?: string; bank?: string; userName?: string }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const out: { company?: string; stir?: string; address?: string; bank?: string; userName?: string } = {};
  if (b.company !== undefined) {
    const v = sanitize(b.company, 160);
    const e = requiredError(v, 'Kompaniya nomi');
    if (e) errors.push({ field: 'company', message: e }); else out.company = v;
  }
  if (b.userName !== undefined) {
    const v = sanitize(b.userName, 120);
    const e = requiredError(v, 'Ism-familiya', 3);
    if (e) errors.push({ field: 'userName', message: e }); else out.userName = v;
  }
  if (b.stir !== undefined) {
    const v = sanitize(b.stir, 20).replace(/\s/g, '');
    if (v && !/^\d{9}$/.test(v)) errors.push({ field: 'stir', message: 'STIR 9 raqamdan iborat.' }); else out.stir = v;
  }
  if (b.address !== undefined) out.address = sanitize(b.address, 240);
  if (b.bank !== undefined) out.bank = sanitize(b.bank, 240);
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: out };
}
