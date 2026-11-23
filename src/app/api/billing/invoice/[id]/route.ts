import { NextResponse } from 'next/server';
import { decodeSession, SESSION_COOKIE } from '@/lib/billing/server';
import { planOf } from '@/lib/config/pricing';
import { PAYMENT_METHODS } from '@/lib/billing';

/**
 * GET /api/billing/invoice/:id
 *
 * Hisob-fakturani yuklab olish. `?format=html` — chop etishga tayyor hujjat
 * (brauzerda "PDF sifatida saqlash" mumkin), standart — matn (`.txt`).
 *
 * Faqat sessiya egasining hisob-fakturasi beriladi (tenant izolyatsiyasi).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.split('=').slice(1).join('=');
  const acc = decodeSession(token);
  if (!acc) return NextResponse.json({ error: 'Avval tizimga kiring.' }, { status: 401 });

  const inv = acc.invoices.find((i) => i.id === id);
  if (!inv) return NextResponse.json({ error: 'Hisob-faktura topilmadi.' }, { status: 404 });

  const plan = planOf(inv.planId);
  const method = PAYMENT_METHODS.find((m) => m.id === inv.method)?.name ?? inv.method;
  const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
  const isHtml = new URL(req.url).searchParams.get('format') === 'html';

  if (isHtml) {
    const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Hisob-faktura ${inv.no}</title>
<style>
 body{font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:760px;margin:32px auto;padding:0 20px}
 h1{font-size:20px;margin:0 0 4px} .muted{color:#666} table{width:100%;border-collapse:collapse;margin-top:18px}
 th,td{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left} td.r,th.r{text-align:right}
 .tot{background:#f6f7f9;font-weight:600} .test{margin-top:18px;padding:10px;border:1px dashed #c88;color:#a33;font-size:12px}
 @media print{body{margin:0}.no-print{display:none}}
</style></head><body>
<h1>Hisob-faktura ${inv.no}</h1>
<p class="muted">Sana: ${inv.date} · To‘lov muddati: ${inv.dueDate} · Holat: ${inv.status === 'paid' ? 'TO‘LANGAN' : 'KUTILMOQDA'}</p>
<p><b>To‘lovchi:</b> ${acc.company.name}${acc.company.stir ? ` · STIR ${acc.company.stir}` : ''}<br>
<b>Qabul qiluvchi:</b> BALANS AI · hisob-faktura, oferta asosida</p>
<table>
 <thead><tr><th>№</th><th>Tavsif</th><th class="r">Miqdor</th><th class="r">Summa</th></tr></thead>
 <tbody>
  <tr><td>1</td><td>${plan.name} tarifi · ${inv.cycle === 'annual' ? 'yillik (12 oy)' : 'oylik'} obuna</td><td class="r">1</td><td class="r">${fmt(inv.net)}</td></tr>
  <tr><td>2</td><td>QQS 12%</td><td class="r">—</td><td class="r">${fmt(inv.vat)}</td></tr>
  <tr class="tot"><td colspan="3">JAMI (QQS bilan)</td><td class="r">${fmt(inv.amount)} so‘m</td></tr>
 </tbody>
</table>
<p><b>To‘lov usuli:</b> ${method}${inv.ref ? ` · Ref: ${inv.ref}` : ''}</p>
${inv.test ? '<p class="test">TEST REJIMI — bu hujjat namunaviy. Haqiqiy pul o‘tkazilmagan. Hisob-faktura oferta asosida tuzilgan.</p>' : ''}
<p class="no-print muted" style="margin-top:24px">Chop etish yoki PDF sifatida saqlash uchun Ctrl+P (⌘P).</p>
</body></html>`;
    return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  }

  const lines = [
    '════════════════════════════════════════',
    ` HISOB-FAKTURA ${inv.no}`,
    '════════════════════════════════════════',
    `Sana:            ${inv.date}`,
    `To‘lov muddati:  ${inv.dueDate}`,
    `Holat:           ${inv.status === 'paid' ? "TO'LANGAN" : "KUTILMOQDA"}`,
    '',
    `To‘lovchi:       ${acc.company.name}`,
    acc.company.stir ? `STIR:            ${acc.company.stir}` : '',
    `Email:           ${acc.user.email}`,
    '',
    'Tarkib:',
    `  1. ${plan.name} tarifi · ${inv.cycle === 'annual' ? 'yillik (12 oy)' : 'oylik'} obuna`,
    `     Summa (QQSsiz): ${fmt(inv.net)} so'm`,
    `     QQS 12%:        ${fmt(inv.vat)} so'm`,
    `     JAMI:           ${fmt(inv.amount)} so'm`,
    '',
    `To‘lov usuli:    ${method}`,
    inv.ref ? `Tranzaksiya:     ${inv.ref}` : '',
    inv.paidAt ? `To‘langan sana:  ${inv.paidAt}` : '',
    '',
    inv.test ? '*** TEST REJIMI — haqiqiy pul o‘tkazilmagan ***' : '',
    'Hujjat oferta asosida shakllantirilgan: /terms',
    '════════════════════════════════════════',
  ].filter((l) => l !== '');
  return new NextResponse(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'content-disposition': `attachment; filename="hisob-faktura-${inv.no}.txt"`,
      'cache-control': 'no-store',
    },
  });
}
