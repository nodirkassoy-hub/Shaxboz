import { NextResponse } from 'next/server';
import { gzipSync } from 'node:zlib';
import { bundledDemo, hasBundledDemo, type BundledDemo } from '@/data/bundle';
import type { Brand } from '@/lib/demo/types';

/**
 * Demo bazani beradi: `/api/db/factory` va `/api/db/trade`.
 *
 * Manba — `@/data/bundle` (JSON import). Shu tufayli serverless muhitda ham
 * `fs` ga bog‘liq emas: fayl tracing muammosi, `src/data` yo‘qligi yoki
 * `.gitignore` sababli 500/404 bo‘lib qolmaydi (bu "Demo" tugmasi xatosining
 * asosiy sababi edi).
 *
 * Siqish: javob bir marta gzip qilinadi va modul darajasida keshlanadi —
 * gzip xarajati faqat birinchi so‘rovda (cold start) bo‘ladi.
 * Bu marshrut dinamik, chunki `accept-encoding` bo‘yicha javob farq qiladi.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KINDS: Brand[] = ['factory', 'trade'];

const jsonCache = new Map<Brand, { body: Buffer; etag: string }>();

function payload(kind: Brand): { body: Buffer; etag: string } {
  const cached = jsonCache.get(kind);
  if (cached) return cached;
  const data: BundledDemo = bundledDemo(kind);
  const body = Buffer.from(JSON.stringify(data), 'utf8');
  const etag = `W/"demo-${kind}-${body.length}-${data.version}"`;
  const entry = { body, etag };
  jsonCache.set(kind, entry);
  return entry;
}

/** `gzip;q=0` — mijoz siqishni rad etgan; `gzip;q=0.x` — qabul qiladi. */
function acceptsGzip(header: string | null): boolean {
  if (!header) return false;
  const h = header.toLowerCase();
  if (!h.includes('gzip') && !h.includes('*')) return false;
  for (const part of h.split(',')) {
    const [enc, ...params] = part.trim().split(';');
    const name = enc.trim();
    if (name !== 'gzip' && name !== '*') continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    if (!q) return true;
    return Number.parseFloat(q.slice(2)) > 0;
  }
  return false;
}

export function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  return params.then(({ kind }) => {
    if (!hasBundledDemo(kind)) {
      return NextResponse.json({ error: `Demo to‘plam topilmadi: ${kind}. Mavjud: factory, trade.` }, { status: 404 });
    }
    let entry: { body: Buffer; etag: string };
    try {
      entry = payload(kind);
    } catch (e) {
      return NextResponse.json(
        { error: 'Demo ma’lumot yuklanmadi. `npm run seed` ni bajarib qayta deploy qiling.', detail: (e as Error)?.message },
        { status: 503 },
      );
    }

    const gz = acceptsGzip(req.headers.get('accept-encoding'));
    const body = gz ? gzipSync(entry.body, { level: 6 }) : entry.body;
    const etag = gz ? `${entry.etag.slice(0, -1)}-gz"` : entry.etag;

    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { etag, vary: 'accept-encoding' } });
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(body.length),
      etag,
      vary: 'accept-encoding',
      // Demo baza o‘zgarmas — uzoq keshlash xavfsiz.
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    };
    if (gz) headers['content-encoding'] = 'gzip';

    return new NextResponse(new Uint8Array(body), { status: 200, headers });
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { allow: 'GET, HEAD, OPTIONS' } });
}

/** Ro‘yxat: qaysi to‘plamlar mavjud (debug va testlar uchun). */
export async function HEAD() {
  return new NextResponse(null, { status: 204, headers: { 'x-demo-kinds': KINDS.join(',') } });
}
