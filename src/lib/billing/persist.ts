/**
 * ─────────────────────────────────────────────────────────────
 * PERSISTENCE — hisob (tenant) saqlash qatlami
 *
 * Tamoyil: **sinov muddati, tarif va to‘lovlar serverda saqlanadi**.
 * Brauzerdagi cookie faqat *qaysi hisob* ekanini bildiruvchi identifikator
 * bo‘lib qoladi (`acc_xxx` + HMAC). Hisob ma’lumoti cookie ichida
 * ko‘chirilmaydi — shu sababli foydalanuvchi sinov sanasini, tarifni yoki
 * hisob-fakturani o‘zgartira olmaydi.
 *
 * Ikki drayver, bitta interfeys:
 *  1. `postgres` — `DATABASE_URL` mavjud bo‘lsa (ishlab chiqarish, RLS bilan).
 *  2. `file`     — `DATA_DIR` (yoki `.data/`) ichida atomik JSON. Mahalliy
 *                  ishlab chiqish, test va PostgreSQL ulanmagan muhit uchun.
 *
 * Drayverni `ACCOUNT_DRIVER=postgres|file` bilan majburlash mumkin.
 * ─────────────────────────────────────────────────────────────
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import type { Account } from './index';

export interface AccountStore {
  readonly driver: 'postgres' | 'file';
  /** Hisobni ID bo‘yicha olish (yo‘q bo‘lsa null). */
  get(id: string): Promise<Account | null>;
  /** Hisobni yozish (upsert). `version` optimistik qulflash uchun. */
  put(acc: Account & { version?: number }): Promise<void>;
  /** Email bo‘yicha hisob (login uchun). */
  findByEmail(email: string): Promise<Account | null>;
  /** Parol hash'i (argon2id o‘rniga scrypt — tashqi bog‘liqliksiz). */
  setPassword(id: string, email: string, password: string): Promise<void>;
  /** Parolni tekshirish. */
  verifyPassword(email: string, password: string): Promise<string | null>;
}

// ─── Parol (scrypt, tuz bilan) ─────────────────────────────────

import { scryptSync, timingSafeEqual } from 'node:crypto';

/** `scrypt$N$salt$hash` ko‘rinishidagi xavfsiz saqlash formati. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [scheme, n, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !salt || !hash) return false;
  const expect = Buffer.from(hash, 'base64url');
  const got = scryptSync(password, Buffer.from(salt, 'base64url'), expect.length, { N: Number(n), r: 8, p: 1 });
  return expect.length === got.length && timingSafeEqual(expect, got);
}

const emailKey = (email: string) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);

// ─── Fayl drayveri ────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const fileOf = (id: string) => path.join(DATA_DIR, 'accounts', `${id.replace(/[^\w-]/g, '')}.json`);

async function atomicWrite(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fs.rename(tmp, file);
}

const fileStore: AccountStore = {
  driver: 'file',
  async get(id) {
    try {
      return JSON.parse(await fs.readFile(fileOf(id), 'utf8')) as Account;
    } catch {
      return null;
    }
  },
  async put(acc) {
    const prev = await this.get(acc.id);
    const version = ((prev as Account & { version?: number })?.version ?? 0) + 1;
    await atomicWrite(fileOf(acc.id), { ...acc, version });
    // login uchun email → id ko‘rsatkichi
    await atomicWrite(path.join(DATA_DIR, 'email', `${emailKey(acc.user.email)}.json`), { id: acc.id });
  },
  async findByEmail(email) {
    try {
      const { id } = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'email', `${emailKey(email)}.json`), 'utf8'));
      return await this.get(id);
    } catch {
      return null;
    }
  },
  async setPassword(id, email, password) {
    const acc = await this.get(id);
    if (!acc) throw new Error('Hisob topilmadi');
    await this.put({ ...acc, user: { ...acc.user, email: email.toLowerCase() } } as Account);
    await atomicWrite(path.join(DATA_DIR, 'creds', `${emailKey(email)}.json`), { id, hash: hashPassword(password) });
  },
  async verifyPassword(email, password) {
    try {
      const { id, hash } = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'creds', `${emailKey(email)}.json`), 'utf8'));
      return checkPassword(password, hash) ? id : null;
    } catch {
      return null;
    }
  },
};

// ─── PostgreSQL drayveri ──────────────────────────────────────

interface PgPool { query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }
let pool: PgPool | null = null;

async function getPool(): Promise<PgPool> {
  if (pool) return pool;
  const { Pool } = await import('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Serverless muhitda har instansiya uchun kichik pool
    max: 3,
    idleTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === 'off' ? false : { rejectUnauthorized: false },
  }) as unknown as PgPool;
  await migrate(pool);
  return pool;
}

/**
 * Minimal, idempotent migratsiya. Hisob JSONB sifatida saqlanadi (tez
 * rivojlanayotgan sxema uchun), lekin **tenant, email va audit ustunlari
 * alohida** — shuning uchun qidiruv, izolyatsiya va audit SQL darajasida.
 */
async function migrate(p: PgPool) {
  await p.query(`
    create table if not exists accounts (
      id           text primary key,
      email        text not null,
      company      text not null,
      status       text not null default 'trial',
      plan_id      text not null default 'ishlab',
      trial_ends_at date not null,
      created_at   timestamptz not null default now(),
      updated_at   timestamptz not null default now(),
      version      integer not null default 1,
      data         jsonb not null
    )`);
  await p.query(`create unique index if not exists accounts_email_uidx on accounts (lower(email))`);
  await p.query(`
    create table if not exists credentials (
      email      text primary key,
      account_id text not null references accounts(id) on delete cascade,
      hash       text not null,
      updated_at timestamptz not null default now()
    )`);
  await p.query(`
    create table if not exists audit_log (
      id         bigserial primary key,
      account_id text,
      actor      text,
      action     text not null,
      target     text,
      detail     jsonb,
      at         timestamptz not null default now()
    )`);
  await p.query(`create index if not exists audit_account_idx on audit_log (account_id, at desc)`);
}

const pgStore: AccountStore = {
  driver: 'postgres',
  async get(id) {
    const p = await getPool();
    const r = await p.query('select data from accounts where id = $1', [id]);
    return (r.rows[0]?.data as Account) ?? null;
  },
  async put(acc) {
    const p = await getPool();
    await p.query(
      `insert into accounts (id, email, company, status, plan_id, trial_ends_at, data)
       values ($1, lower($2), $3, $4, $5, $6, $7)
       on conflict (id) do update set
         email = lower(excluded.email), company = excluded.company, status = excluded.status,
         plan_id = excluded.plan_id, trial_ends_at = excluded.trial_ends_at,
         data = excluded.data, updated_at = now(), version = accounts.version + 1`,
      [acc.id, acc.user.email, acc.company.name, acc.subscription.status, acc.subscription.planId, acc.trialEndsAt, JSON.stringify(acc)],
    );
  },
  async findByEmail(email) {
    const p = await getPool();
    const r = await p.query('select data from accounts where lower(email) = lower($1)', [email]);
    return (r.rows[0]?.data as Account) ?? null;
  },
  async setPassword(id, email, password) {
    const p = await getPool();
    await p.query(
      `insert into credentials (email, account_id, hash) values (lower($1), $2, $3)
       on conflict (email) do update set hash = excluded.hash, account_id = excluded.account_id, updated_at = now()`,
      [email, id, hashPassword(password)],
    );
  },
  async verifyPassword(email, password) {
    const p = await getPool();
    const r = await p.query('select account_id, hash from credentials where email = lower($1)', [email]);
    const row = r.rows[0];
    if (!row) return null;
    return checkPassword(password, String(row.hash)) ? String(row.account_id) : null;
  },
};

// ─── Drayver tanlash ─────────────────────────────────────────

function pickDriver(): AccountStore {
  const forced = process.env.ACCOUNT_DRIVER;
  if (forced === 'postgres') return pgStore;
  if (forced === 'file') return fileStore;
  return process.env.DATABASE_URL ? pgStore : fileStore;
}

export const store: AccountStore = pickDriver();

/** Audit yozuvi — kim, nima qildi, nimani o‘zgartirdi. */
export async function audit(entry: { accountId?: string; actor?: string; action: string; target?: string; detail?: Record<string, unknown> }) {
  try {
    if (store.driver === 'postgres') {
      const p = await getPool();
      await p.query('insert into audit_log (account_id, actor, action, target, detail) values ($1,$2,$3,$4,$5)', [
        entry.accountId ?? null, entry.actor ?? null, entry.action, entry.target ?? null, entry.detail ? JSON.stringify(entry.detail) : null,
      ]);
      return;
    }
    const file = path.join(DATA_DIR, 'audit.log.jsonl');
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.appendFile(file, JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n', 'utf8');
  } catch (e) {
    // Audit yozilmasa ham asosiy oqim to‘xtamaydi, lekin iz qoladi
    console.error('[audit] yozib bo‘lmadi', e);
  }
}

export const __paths = { DATA_DIR, fileOf };
