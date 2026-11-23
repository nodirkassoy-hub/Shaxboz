/**
 * `pg` uchun minimal tur deklaratsiyasi — biz faqat `Pool.query(text, values)`
 * ishlatamiz. To‘liq turlar kerak bo‘lsa `npm i -D @types/pg`.
 */
declare module 'pg' {
  export class Pool {
    constructor(config?: { connectionString?: string; max?: number; idleTimeoutMillis?: number; ssl?: false | { rejectUnauthorized?: boolean } });
    query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
    end(): Promise<void>;
  }
}
