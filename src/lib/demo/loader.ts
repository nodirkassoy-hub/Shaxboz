'use client';
/**
 * Demo ma’lumotlarini yuklash.
 *
 * Ilgari demo baza brauzerda har safar qaytadan simulyatsiya qilinardi
 * (~300 ms bloklangan main thread + 5 MB klon) — shu sabab sahifa
 * "Demo kompaniya ma’lumotlari hisoblanmoqda…" holatida qotib qolardi.
 * Endi baza build vaqtida tayyorlanadi (scripts/gen-data.ts) va /api/db
 * orqali siqilgan holda keladi. Bir marta yuklangach xotirada saqlanadi.
 */
import type { DB } from '@/lib/db';
import type { Brand } from '@/lib/demo/types';

export interface DemoPayload {
  version: number;
  generatedAt: string;
  today: string;
  kind: Brand;
  db: DB;
}

const cache = new Map<Brand, DemoPayload>();
const inflight = new Map<Brand, Promise<DemoPayload>>();

/**
 * Yuklash xatosi. `code` — UI tarjima qiladigan barqaror identifikator;
 * `detail` — faqat ichki diagnostika (foydalanuvchiga ko‘rsatilmaydi, chunki
 * server javobi maxfiy bo‘lishi mumkin).
 */
export type DemoErrorCode = 'network' | 'timeout' | 'notFound' | 'server' | 'corrupt';

export class DemoLoadError extends Error {
  constructor(readonly code: DemoErrorCode, message: string, readonly detail?: string, readonly status?: number) {
    super(message);
    this.name = 'DemoLoadError';
  }
}

/** Xato kodini foydalanuvchi tilidagi kalitga bog‘lash. */
export const DEMO_ERROR_KEY: Record<DemoErrorCode, string> = {
  network: 'errors.network',
  timeout: 'errors.timeout',
  notFound: 'errors.notFound',
  server: 'errors.server',
  corrupt: 'errors.corrupt',
};

const TIMEOUT_MS = 15_000;

/** Testlar uchun keshni tozalash (ishlab chiqarishda ishlatilmaydi). */
export function __resetCache() {
  cache.clear();
  inflight.clear();
}

export function getCached(kind: Brand) {
  return cache.get(kind);
}

export async function loadDemo(kind: Brand, opts: { force?: boolean } = {}): Promise<DemoPayload> {
  if (!opts.force) {
    const hit = cache.get(kind);
    if (hit) return hit;
    const running = inflight.get(kind);
    if (running) return running;
  }
  const p = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`/api/db/${kind}`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      if (!res.ok) {
        // Javob tanasini foydalanuvchiga ko‘rsatmaymiz (server ichki ma’lumoti
        // bo‘lishi mumkin) — faqat status kodi diagnostika uchun qoladi.
        const code: DemoErrorCode = res.status === 404 ? 'notFound' : 'server';
        throw new DemoLoadError(code, `Server javobi: ${res.status}`, `HTTP ${res.status} ${res.statusText || ''}`.trim(), res.status);
      }
      // Vercel'da rewrite noto‘g‘ri bo‘lsa API HTML qaytaradi — aniq xabar beramiz
      const ctype = res.headers.get('content-type') || '';
      if (!ctype.includes('json')) {
        throw new DemoLoadError('corrupt', `Kutilmagan javob turi: ${ctype || 'noma’lum'}`, `content-type: ${ctype || 'yo‘q'} (JSON kutilgan)`);
      }
      let data: DemoPayload | { error: string };
      try {
        data = (await res.json()) as DemoPayload | { error: string };
      } catch (e) {
        throw new DemoLoadError('corrupt', 'Javobni o‘qib bo‘lmadi', 'JSON.parse xatosi');
      }
      if ('error' in data) throw new DemoLoadError('notFound', 'Demo ma’lumot topilmadi', data.error);
      if (!data.db || !Array.isArray(data.db.entries)) throw new DemoLoadError('corrupt', 'Demo ma’lumot formati noto‘g‘ri');
      cache.set(kind, data);
      return data;
    } catch (e) {
      if (e instanceof DemoLoadError) throw e;
      if ((e as Error)?.name === 'AbortError') throw new DemoLoadError('timeout', 'Yuklash vaqti tugadi', `${TIMEOUT_MS} ms ichida javob kelmadi`);
      throw new DemoLoadError('network', 'Tarmoq xatosi', 'fetch() bajarilmadi — oflayn yoki DNS muammosi');
    } finally {
      clearTimeout(timer);
      inflight.delete(kind);
    }
  })();
  inflight.set(kind, p);
  return p;
}
