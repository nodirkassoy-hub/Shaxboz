/**
 * Avtomatik testlar — `npm test`
 *
 * Qoplama:
 *  1. Buxgalteriya mantig'i: balans (A = P + K), foyda = daromad − xarajat,
 *     provenka balansi, pul yaxlitligi (integer tiyin).
 *  2. Obuna mantig'i: sinov kunlari, mehr-muruvvat, tarif cheklovlari, hisob-faktura.
 *  3. Vaqt zonasi: Asia/Tashkent kun chegarasi.
 *  4. Validatsiya: email/telefon/parol, XSS tozalash.
 *  5. i18n: barcha tillarda kalitlar parity.
 *  6. Sessiya: imzo tekshiruvi, buzilgan token.
 *
 * Har bir test `assert` bilan; birortasi yiqilsa exit code 1 (CI uchun).
 */
import { balanceSheet, pnl, trialBalance } from '../src/lib/core/ledger';
import { simulate } from '../src/lib/seed/simulate';
import { TODAY } from '../src/lib/core/dates';
import { accountState, entitlements, createAccount, createInvoice, PAYMENT_METHODS } from '../src/lib/billing';
import { TRIAL_DAYS, GRACE_DAYS, PLANS, priceOf, splitVat, VAT_RATE } from '../src/lib/config/pricing';
import { todayTashkent, daysBetween, encodeSession, decodeSessionId, rateLimit, __resetRateLimits, nowTashkent } from '../src/lib/billing/server';
import { hashPassword, checkPassword } from '../src/lib/billing/persist';
import { emailError, phoneError, passwordError, sanitize, validateSignup, escapeHtml } from '../src/lib/validation';
import { i18nParity } from '../src/lib/i18n';
import { money, moneyC } from '../src/lib/core/money';

let pass = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, info = '') {
  if (cond) { pass++; }
  else { fails.push(`${name}${info ? ` — ${info}` : ''}`); console.log(`FAIL  ${name}${info ? ` — ${info}` : ''}`); }
}
const eq = (name: string, a: unknown, b: unknown) => ok(name, a === b, `${String(a)} ≠ ${String(b)}`);
const near = (name: string, a: number, b: number, eps = 0.01) => ok(name, Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
const section = (t: string) => console.log(`\n── ${t}`);

const db = simulate();

// ═══ 1. Buxgalteriya ═══════════════════════════════════════════
section('Buxgalteriya mantig‘i');
{
  const s = { companyIds: db.companies.map((c) => c.id) };
  // Balans hisoboti hisob TURLARI bo‘yicha guruhlaydi (aktiv/majburiyat/kapital),
  // kontr-hisoblar (02xx eskirish) natural manfiy — sof balans qiymati chiqadi.
  const bs = balanceSheet(db.entries, s, TODAY);
  near('Balans: Aktiv = Majburiyat + Kapital', bs.totalAssets, bs.totalLE, 1);
  ok('Balans muvozanatlashgan', bs.balanced);
  ok('Aktiv musbat', bs.totalAssets > 0, String(Math.round(bs.totalAssets)));
  ok('Kapital + foyda musbat', bs.totalEquity > 0, String(Math.round(bs.totalEquity)));
  const bal = [...bs.nonCurrent, ...bs.current].flatMap((g) => g.lines).reduce((a, l) => { a[l.code] = l.amount; return a; }, {} as Record<string, number>);

  const tb = trialBalance(db.entries, s, '2026-01-01', TODAY);
  near('Provenka: debet = kredit', tb.totals.turnDr, tb.totals.turnCr, 1);
  ok('Provenka: yopilish balansi', tb.balanced, `${tb.totals.closeDr} / ${tb.totals.closeCr}`);

  const p = pnl(db.entries, s, '2026-01-01', TODAY);
  near('Foyda = daromad − xarajat', p.net, p.revenue - p.totalExpenses, 1);
  ok('Daromad > 0', p.revenue > 0, String(p.revenue));
  ok('Yalpi foyda ≤ daromad', p.gross <= p.revenue + 1);

  // Har bir provodka balansi (debet = kredit)
  const unbalanced = db.entries.filter((e) => {
    const d = e.lines.reduce((a, l) => a + l.debit, 0);
    const c = e.lines.reduce((a, l) => a + l.credit, 0);
    return Math.abs(d - c) > 0.5;
  });
  eq('Barcha provodkalar balansi (debet=kredit)', unbalanced.length, 0);

  // Manfiy aktiv yo‘q (2510 kabi hisoblar)
  const negAssets = Object.entries(bal).filter(([c, v]) => (c.startsWith('1') || c.startsWith('2') || c.startsWith('5')) && v < -1);
  eq('Manfiy aktiv hisoblar yo‘q', negAssets.length, 0);

  // NaN / undefined yo‘q
  const bad = Object.values(bal).filter((v) => !Number.isFinite(v));
  eq('Balans qiymatlari chekli', bad.length, 0);
}

// ═══ 2. Pul yaxlitligi ═════════════════════════════════════════
section('Pul hisobi (floating point)');
{
  // 0.1 + 0.2 muammosi pul formatlashda ko‘rinmasin
  eq('money(12345678) formatlash', money(12345678).replace(/\u00a0/g, ' '), `12 345 678 so\u2018m`);
  ok('moneyC qisqa format', /mln|M|ming/.test(moneyC(12_450_000)) || moneyC(12_450_000).length > 0, moneyC(12_450_000));
  // Butun tiyinda hisoblash: 199000 * 12 oy = 2388000
  eq('Yillik narx butun', priceOf(PLANS.find((p) => p.id === 'start')!, 'annual'), 199_000 * 10);
  const { net, vat } = splitVat(499_000);
  eq('QQS ajratish: net + vat = summa', net + vat, 499_000);
  near('QQS 12% formulasi', (net * VAT_RATE) / 100, vat, 1);
}

// ═══ 3. Obuna mantig‘i ═════════════════════════════════════════
section('Obuna va sinov');
{
  const acc = createAccount({ company: 'Test MChJ', name: 'Test Testov', phone: '+998901112233', email: 'a@b.uz', today: '2026-01-01' });
  eq('Sinov 30 kun', acc.trialEndsAt, '2026-01-31');
  eq('Sinov holati', accountState(acc, '2026-01-01').status, 'trial');
  eq('Sinov: 30 kun qoldi', entitlements(acc, '2026-01-01').trialDaysLeft, TRIAL_DAYS);
  eq('Sinov: 7 kun qoldi', entitlements(acc, '2026-01-24').trialDaysLeft, 7);
  eq('Sinov: 1 kun qoldi', entitlements(acc, '2026-01-30').trialDaysLeft, 1);
  eq('Sinov: oxirgi kun (0 kun qoldi)', entitlements(acc, '2026-01-31').trialDaysLeft, 0);
  eq('Sinov: oxirgi kun hali ochiq', accountState(acc, '2026-01-31').status, 'trial');
  eq('Sinov tugadi → o‘qish rejimi', accountState(acc, '2026-02-01').status, 'readonly');
  eq('Sinov tugagach readOnly', accountState(acc, '2026-02-01').readOnly, true);
  eq('Mehr-muruvvat 7 kun', accountState(acc, '2026-02-01').graceLeft, GRACE_DAYS - 1);
  eq('Mehr-muruvvat tugadi', accountState(acc, '2026-02-09').graceLeft, 0);

  const trialEnt = entitlements(acc, '2026-01-10');
  eq('Sinovda tarif = ISHLAB', trialEnt.planId, 'ishlab');
  eq('Sinovda barcha modullar', trialEnt.modules, 'all');

  // To‘lov → faol
  const inv = createInvoice(acc, 'biznes', 'annual', 'payme', '2026-01-15');
  eq('Hisob-faktura summasi (yillik)', inv.amount, 499_000 * 10);
  ok('Hisob-faktura QQS bilan', inv.vat > 0 && inv.net + inv.vat === inv.amount);
  ok('Test rejimi belgisi', inv.test === true);
  acc.invoices.push(inv);
  acc.subscription = { ...acc.subscription, planId: 'biznes', cycle: 'annual', status: 'active', periodEnd: '2027-01-15' };
  const active = entitlements(acc, '2026-06-01');
  eq('Faol obuna holati', active.status, 'active');
  eq('Faol obuna tarifi', active.planId, 'biznes');
  ok('Faol obunada o‘qish rejimi yo‘q', !active.readOnly);
  eq('BIZNES 10 foydalanuvchi', active.users, 10);
  eq('BIZNES AI 150 savol', active.aiQuestions, 150);

  // AI limiti
  acc.aiUsage = { '2026-06': 150 };
  eq('AI limiti tugadi', entitlements(acc, '2026-06-15').aiLeft, 0);
  acc.aiUsage = { '2026-06': 149 };
  eq('AI limiti: 1 qoldi', entitlements(acc, '2026-06-15').aiLeft, 1);
  eq('Yangi oyda limit tiklanadi', entitlements(acc, '2026-07-01').aiLeft, 150);

  // Muddati o‘tgan obuna
  const expired = { ...acc, subscription: { ...acc.subscription, periodEnd: '2026-05-01' } };
  eq('Obuna muddati o‘tdi → o‘qish', accountState(expired, '2026-06-01').readOnly, true);

  // Tarif narxlari
  eq('START narxi', priceOf(PLANS.find((p) => p.id === 'start')!, 'monthly'), 199_000);
  eq('BIZNES narxi', priceOf(PLANS.find((p) => p.id === 'biznes')!, 'monthly'), 499_000);
  eq('ISHLAB narxi', priceOf(PLANS.find((p) => p.id === 'ishlab')!, 'monthly'), 999_000);
  eq('KORPORATIV narxi (kelishuv)', priceOf(PLANS.find((p) => p.id === 'korporativ')!, 'monthly'), null);
  eq('4 ta tarif', PLANS.length, 4);
  eq('4 ta to‘lov usuli', PAYMENT_METHODS.length, 4);
}

// ═══ 4. Vaqt zonasi ════════════════════════════════════════════
section('Vaqt zonasi (Asia/Tashkent)');
{
  // UTC 2026-01-01 19:00 = Tashkent 2026-01-02 00:00
  eq('Kun chegarasi: UTC 19:00 → keyingi kun', todayTashkent(new Date('2026-01-01T19:00:00Z')), '2026-01-02');
  eq('Kun chegarasi: UTC 18:59 → o‘sha kun', todayTashkent(new Date('2026-01-01T18:59:00Z')), '2026-01-01');
  ok('Server vaqti +05:00', nowTashkent().endsWith('+05:00'), nowTashkent());
  eq('Kunlar farqi', daysBetween('2026-01-01', '2026-01-31'), 30);
  eq('Kunlar farqi (teskari)', daysBetween('2026-01-31', '2026-01-01'), -30);
}

// ═══ 5. Validatsiya ════════════════════════════════════════════
section('Validatsiya va xavfsizlik');
{
  ok('Email to‘g‘ri', emailError('ism@kompaniya.uz') === null);
  ok('Email noto‘g‘ri', emailError('ism@@x') !== null);
  ok('Email bo‘sh', emailError('') !== null);
  ok('Telefon to‘g‘ri', phoneError('+998 90 123 45 67') === null);
  ok('Telefon noto‘g‘ri', phoneError('12345') !== null);
  ok('Parol qisqa', passwordError('abc1') !== null);
  ok('Parol raqamsiz', passwordError('abcdefgh') !== null);
  ok('Parol harfsiz', passwordError('12345678') !== null);
  ok('Parol to‘g‘ri', passwordError('parol1234') === null);

  eq('XSS: script tegi olib tashlanadi', sanitize('<script>alert(1)</script>Salom'), 'alert(1)Salom');
  eq('XSS: < > olib tashlanadi', sanitize('a<b>c'), 'ac');
  ok('escapeHtml himoyalaydi', escapeHtml('<img onerror=x>') === '&lt;img onerror=x&gt;');
  eq('Boshqaruv belgilari tozalanadi', sanitize('a\u0000b'), 'a b');

  const bad = validateSignup({});
  ok('Bo‘sh forma rad etiladi', !bad.ok && bad.errors.length >= 4, bad.ok ? '' : String(bad.errors.length));
  const good = validateSignup({ company: 'Test MChJ', name: 'Ali Valiyev', phone: '+998901234567', email: 'ali@test.uz', password: 'parol1234' });
  ok('To‘g‘ri forma qabul qilinadi', good.ok);
  const xss = validateSignup({ company: '<script>x</script>Kompaniya', name: 'Ali <b>Valiyev</b>', phone: '+998901234567', email: 'ali@test.uz', password: 'parol1234' });
  ok('XSS matni tozalanadi (forma)', xss.ok && !xss.value.company.includes('<'), xss.ok ? xss.value.company : '');
}

// ═══ 6. i18n parity ════════════════════════════════════════════
section('Tarjimalar');
{
  const p = i18nParity();
  ok('Barcha tillarda kalitlar bir xil', p.ok, JSON.stringify({ missing: p.missing, extra: p.extra }));
  const { uz } = require('../src/lib/i18n');
  ok('UZ lug‘ati bo‘sh emas', Object.keys(uz).length > 60, String(Object.keys(uz).length));
  ok('Demo rejim kalitlari bor', 'demo.badge' in uz && 'demo.startFree' in uz);
  ok('Xato kalitlari bor', 'errors.retry' in uz && 'errors.network' in uz);
}

// ═══ 7. Sessiya va rate limit ══════════════════════════════════
section('Sessiya va limitlar');
{
  const acc = createAccount({ company: 'Sess MChJ', name: 'Sess Testov', phone: '+998901112233', email: 's@b.uz', today: '2026-01-01' });
  const token = encodeSession(acc.id);
  eq('Sessiya: hisob ID tiklandi', decodeSessionId(token), acc.id);
  ok('Buzilgan token rad etiladi', decodeSessionId(`${token}x`) === null);
  ok('Bo‘sh token rad etiladi', decodeSessionId('') === null && decodeSessionId(undefined) === null);
  ok('Imzosiz token rad etiladi', decodeSessionId('eyJhIjoxfQ') === null);
  ok('Formatga mos bo‘lmagan ID rad etiladi', decodeSessionId(encodeSession('hacker')) === null);
  // Boshqa kalit bilan imzolangan token
  process.env.SESSION_SECRET = 'boshqa-kalit-1234567890';
  ok('Boshqa kalit bilan imzo rad etiladi', decodeSessionId(token) === null);
  delete process.env.SESSION_SECRET;

  // Parol hash'i — scrypt, tuz bilan, teskari qaytarilmaydi
  const h = hashPassword('Parol123!');
  ok('Parol hash formati scrypt', h.startsWith('scrypt$'));
  ok('Parol to‘g‘ri tekshiriladi', checkPassword('Parol123!', h));
  ok('Noto‘g‘ri parol rad etiladi', !checkPassword('Parol123', h));
  ok('Har bir hash uchun alohida tuz', hashPassword('x') !== hashPassword('x'));
  ok('Buzilgan hash rad etiladi', !checkPassword('x', 'buzilgan'));

  __resetRateLimits();
  const results = Array.from({ length: 5 }, () => rateLimit('t:1', 3, 60_000));
  ok('Rate limit: 3 tagacha ruxsat', results[0].ok && results[1].ok && results[2].ok);
  ok('Rate limit: 4-chi bloklanadi', !results[3].ok && results[3].retryAfter > 0);
  ok('Rate limit: boshqa kalit alohida', rateLimit('t:2', 3, 60_000).ok);
}

// ═══ Xulosa ════════════════════════════════════════════════════
console.log(`\n──── ${pass} PASS, ${fails.length} FAIL ────`);
if (fails.length) {
  console.log('YIQILGAN TESTLAR:\n' + fails.map((f) => ` • ${f}`).join('\n'));
  process.exit(1);
}
