import { createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

/**
 * Demo bazani siqilgan holda beradi.
 * Fayl build vaqtida `npm run seed` (scripts/gen-data.ts) tomonidan yaratiladi —
 * serverda simulyatsiya ishlamaydi, birinchi javob millisekundlarda.
 * `.json.gz` oldindan tayyorlanadi (eng yaxshi siqish), brauzer gzip qo‘llasa
 * o‘sha fayl yuboriladi — CPU sarfsiz.
 *
 * Diqqat: marshrut ATAYIN dinamik. Statik prerender paytida `accept-encoding`
 * mavjud bo‘lmaydi va javob siqilmagan holda keshlanib qoladi (2.7 MB → 0.25 MB
 * farqi yo‘qoladi). Shu sababli har so‘rovda sarlavhalar tekshiriladi.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KINDS = new Set(['factory', 'trade']);

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.has(kind)) return NextResponse.json({ error: 'Demo to‘plam topilmadi' }, { status: 404 });

  const dir = join(process.cwd(), 'src', 'data');
  const accept = (req.headers.get('accept-encoding') || '').toLowerCase();
  // `gzip;q=0` — mijoz siqishni rad etgan
  const gzOk = /(^|,)\s*gzip\s*(;q=(?!0(\.0*)?\s*(,|$))[0-9.]+)?\s*(,|$)/.test(accept) || accept === 'gzip';

  type Target = { file: string; stat: { size: number; mtimeMs: number } };
  const pick = (withGzip: boolean): Target => {
    const file = join(dir, `demo-${kind}.json${withGzip ? '.gz' : ''}`);
    const st = statSync(/*turbopackIgnore: true*/ file);
    return { file, stat: { size: st.size, mtimeMs: st.mtimeMs } };
  };

  let target: Target;
  let gz = false;
  try {
    if (gzOk) { target = pick(true); gz = true; } else target = pick(false);
  } catch {
    // `.gz` yo‘q bo‘lsa — siqilmagan fayl
    try { target = pick(false); gz = false; } catch {
      return NextResponse.json({ error: 'Demo ma’lumot hali yaratilmagan. `npm run seed` bajaring.' }, { status: 503 });
    }
  }

  // Kuchsiz ETag: fayl hajmi + o‘zgartirilgan vaqti (kontent o‘zgarsa almashadi)
  const etag = `W/"${kind}-${target.stat.size}-${Math.round(target.stat.mtimeMs)}"`;
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { etag, vary: 'accept-encoding' } });
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(target.stat.size),
    etag,
    vary: 'accept-encoding',
    // Demo baza — o‘zgarmas; brauzer va CDN keshlashi mumkin.
    'cache-control': 'public, max-age=600, stale-while-revalidate=86400',
  };
  if (gz) headers['content-encoding'] = 'gzip';

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const rs = createReadStream(/*turbopackIgnore: true*/ target.file);
      rs.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
      rs.on('end', () => controller.close());
      rs.on('error', (e) => controller.error(e));
    },
    cancel() { /* mijoz uzdi — stream yopiladi */ },
  });

  return new NextResponse(body, { headers });
}
