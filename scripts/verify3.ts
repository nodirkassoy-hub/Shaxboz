import { simulate } from '../src/lib/seed/simulate';
import { ask, SUGGESTED, insightCards } from '../src/lib/ai';
const db = simulate();
const s = { companyIds: ['trd', 'fac', 'srv'] };
for (const q of [...SUGGESTED, 'salom', 'Какая прибыль в этом месяце?', 'soliqlar qanday']) {
  const a = ask(db, s, 'UZS', { from: '2026-09-01', to: '2026-09-23' }, q);
  console.log('\n## ' + q + ' → ' + a.intent + ' | ' + a.title);
  for (const b of a.blocks) console.log(`  [${b.kind}] ${b.text.slice(0, 260)}`);
}
console.log(insightCards(db, s, 'UZS', { from: '2026-09-01', to: '2026-09-23' }).map(c => c.title).join(' | '));
