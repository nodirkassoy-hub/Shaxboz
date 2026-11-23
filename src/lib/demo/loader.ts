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

export class DemoLoadError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = 'DemoLoadError';
  }
}

const TIMEOUT_MS = 15_000;

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
      if (!res.ok) throw new DemoLoadError(`Server javobi: ${res.status}`, await res.text().catch(() => ''));
      const data = (await res.json()) as DemoPayload | { error: string };
      if ('error' in data) throw new DemoLoadError('Demo ma’lumot topilmadi', data.error);
      if (!data.db || !Array.isArray(data.db.entries)) throw new DemoLoadError('Demo ma’lumot formati noto‘g‘ri');
      cache.set(kind, data);
      return data;
    } catch (e) {
      if (e instanceof DemoLoadError) throw e;
      if ((e as Error)?.name === 'AbortError') throw new DemoLoadError('Yuklash vaqti tugadi (15 soniya). Internet aloqasini tekshiring.');
      throw new DemoLoadError('Demo ma’lumotlarni yuklab bo‘lmadi. Internet aloqasini tekshiring.', (e as Error)?.message);
    } finally {
      clearTimeout(timer);
      inflight.delete(kind);
    }
  })();
  inflight.set(kind, p);
  return p;
}
