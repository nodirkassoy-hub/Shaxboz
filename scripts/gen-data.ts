/**
 * Pre-renders the deterministic demo database into src/data/demo.json.
 *
 * The demo used to be simulated in the browser on every page load (~300 ms of
 * blocked main thread plus a 5 MB JSON clone), which is what made the app sit on
 * "Demo kompaniya ma'lumotlari hisoblanmoqda…". Now it is generated once at build
 * time and streamed to the client by /api/db — first paint is no longer blocked.
 *
 * Run: npm run seed
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { simulate } from '../src/lib/seed/simulate';
import { addDays, TODAY } from '../src/lib/core/dates';
import { transformDb, BRANDS } from '../src/lib/demo/transform';
import type { DB } from '../src/lib/db';
import type { Brand } from '../src/lib/demo/types';

const OUT_DIR = join(process.cwd(), 'src', 'data');

export const DATA_VERSION = 5;

/** Strip payload that is only useful for history drill-down, keep the demo rich. */
function prune(db: DB): DB {
  const keepFrom = addDays(TODAY, -45);
  db.attendance = db.attendance.filter((a) => a.date >= keepFrom);
  if (db.audit.length > 140) db.audit = db.audit.slice(-140);
  if (db.moves.length > 2600) db.moves = db.moves.slice(-2600);
  // Very old paid invoices/bills are already reflected in the ledger; the UI only
  // needs the current fiscal year for documents and 90 days for payment history.
  const invFrom = addDays(TODAY, -200);
  db.invoices = db.invoices.filter((i) => i.date >= invFrom || i.total - i.paid - i.credited > 0.5);
  db.bills = db.bills.filter((b) => b.date >= invFrom || b.total - b.paid > 0.5);
  db.payments = db.payments.filter((p) => p.date >= invFrom);
  // Sotuv buyurtmalari: oxirgi 200 kun (eski, yopilgan buyurtmalar hisobotlarda
  // allaqachon hisob-faktura/provodka ko‘rinishida mavjud).
  db.salesOrders = db.salesOrders.filter((o) => o.date >= invFrom || o.status === 'quote' || o.status === 'confirmed' || o.status === 'in_production');
  db.moves = db.moves.filter((m) => m.date >= addDays(TODAY, -150) || m.kind === 'opening');
  return db;
}

function main() {
  const t0 = Date.now();
  const base = prune(simulate());
  mkdirSync(OUT_DIR, { recursive: true });
  const mb = (n: number) => (n / 1e6).toFixed(2) + ' MB';
  const kinds: Brand[] = ['factory', 'trade'];
  for (const kind of kinds) {
    const db = transformDb(base, kind);
    const payload = { version: DATA_VERSION, generatedAt: new Date().toISOString(), today: TODAY, kind, db };
    const json = JSON.stringify(payload);
    writeFileSync(join(OUT_DIR, `demo-${kind}.json`), json);
    writeFileSync(join(OUT_DIR, `demo-${kind}.json.gz`), gzipSync(json, { level: 9 }));
    console.log(
      `${`demo-${kind}.json`.padEnd(18)} ${mb(json.length).padStart(9)} (${mb(gzipSync(json, { level: 9 }).length)} gz) · companies ${db.companies.length} · entries ${db.entries.length} · ` +
        `invoices ${db.invoices.length} · products ${db.products.length} · employees ${db.employees.length} · ${BRANDS[kind].legal}`,
    );
  }
  console.log(`done in ${Date.now() - t0} ms`);
}

main();
