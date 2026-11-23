/**
 * ─────────────────────────────────────────────────────────────
 * DEMO TO‘PLAMLAR — bitta generatsiya qilingan reyestrdan (Balans Group)
 * ikkita mustaqil, o‘z-o‘ziga to‘liq demo kompaniya yasaladi:
 *
 *   1) factory  — ishlab chiqarish zavodi  (Chirchiq: xomashyo → tayyor mahsulot)
 *   2) trade    — savdo/xizmat kompaniyasi (Toshkent + Samarqand + Buxoro filiallari)
 *
 * Har bir to‘plam: buxgalteriya, soliqlar, HR, ishlab chiqarish (zavod),
 * ombor, sotuv, xarid, CRM, hujjatlar — hammasi o‘z ichida izchil.
 * Faqat boshqa kompaniyaga tegishli yozuvlar olib tashlanadi — summalar
 * va provodkalar tegmaydi, shuning uchun balans transformatsiyadan keyin
 * ham teng bo‘lib qoladi (scripts/verify.ts tekshiradi).
 * ─────────────────────────────────────────────────────────────
 */
import type { DB } from '@/lib/db';
import type { Brand } from './types';

export type DemoKind = Brand;

export interface BrandInfo {
  id: Brand;
  name: string;
  legal: string;
  logo: string;
  city: string;
  slogan: string;
  description: string;
  companies: string[];
}

export const BRANDS: Record<Brand, BrandInfo> = {
  factory: {
    id: 'factory',
    name: 'Zavod',
    legal: '“ELEKTRO QURILMA” MChJ',
    logo: 'EQ',
    city: 'Chirchiq',
    slogan: 'Elektr taqsimlash uskunalari ishlab chiqarish zavodi',
    description: 'Xomashyo → ishlab chiqarish → tannarx → tayyor mahsulot → sotuv. Retseptura, smena, quvvat va brak hisobi bilan.',
    companies: ['fac', 'srv'],
  },
  trade: {
    id: 'trade',
    name: 'Savdo',
    legal: '“NUR ELEKTRO SAVDO” MChJ',
    logo: 'NE',
    city: 'Toshkent',
    slogan: 'Elektr tovarlari ulgurji savdosi va montaj xizmatlari',
    description: 'Uch filial, ulgurji va chakana savdo, kassa, ombor, debitorlik va montaj xizmatlari bitta tizimda.',
    companies: ['trd', 'srv'],
  },
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Boshqa kompaniyaga tegishli yozuvlarni olib tashlaydi. */
function subset(db: DB, keep: string[]): DB {
  const keepSet = new Set(keep);
  const drop = <T extends { companyId: string }>(arr: T[]): T[] => arr.filter((x) => keepSet.has(x.companyId));
  db.companies = db.companies.filter((c) => keepSet.has(c.id));
  const branches = new Set(db.companies.flatMap((c) => c.branchIds));
  db.branches = db.branches.filter((b) => branches.has(b.id));
  db.warehouses = drop(db.warehouses);
  const companySet = keepSet;
  const products = new Set(db.products.filter((p) => companySet.has(p.companyId)).map((p) => p.id));
  db.products = db.products.filter((p) => products.has(p.id));
  for (const pid of Object.keys(db.stock)) if (!products.has(pid)) delete db.stock[pid];
  db.moves = drop(db.moves);
  db.entries = drop(db.entries);
  db.salesOrders = drop(db.salesOrders);
  db.invoices = drop(db.invoices);
  db.bills = drop(db.bills);
  db.payments = drop(db.payments);
  db.purchaseOrders = drop(db.purchaseOrders);
  db.boms = db.boms.filter((b) => products.has(b.productId));
  db.workOrders = drop(db.workOrders);
  db.employees = drop(db.employees);
  db.payrollRuns = drop(db.payrollRuns);
  db.assets = drop(db.assets);
  db.projects = drop(db.projects);
  db.budgets = drop(db.budgets);
  db.taxObligations = drop(db.taxObligations);
  db.documents = drop(db.documents);
  db.approvals = drop(db.approvals);
  db.bankLines = drop(db.bankLines);
  db.leads = drop(db.leads);
  // audit yozuvlari kompaniyaga bog'lanmagan — hammasi qoladi
  db.periods = drop(db.periods);
  // Kontragentlar: kamida bitta qolgan kompaniya bilan ishlaydiganlar
  const partyUsed = new Set<string>();
  for (const x of [...db.invoices.map((i) => i.customerId), ...db.bills.map((b) => b.supplierId), ...db.salesOrders.map((o) => o.customerId), ...db.purchaseOrders.flatMap((p) => [p.supplierId || '', ...p.quotes.map((q) => q.supplierId)]), ...db.payments.map((p) => p.partyId || '')]) partyUsed.add(x);
  db.parties = db.parties
    .map((p) => ({ ...p, companyIds: p.companyIds.filter((c) => companySet.has(c)) }))
    .filter((p) => p.companyIds.length > 0 || partyUsed.has(p.id));
  const partyIds = new Set(db.parties.map((p) => p.id));
  // Yetim havolalar (masalan, olib tashlangan ta'minotchiga tegishli taklif) — tozalanadi
  for (const po of db.purchaseOrders) {
    po.quotes = po.quotes.filter((q) => partyIds.has(q.supplierId));
    if (po.supplierId && !partyIds.has(po.supplierId)) po.supplierId = po.quotes[0]?.supplierId || '';
  }
  db.documents = db.documents.filter((d) => !d.partyId || partyIds.has(d.partyId));
  const empIds = new Set(db.employees.map((e) => e.id));
  db.attendance = db.attendance.filter((a) => empIds.has(a.employeeId));
  db.leaves = db.leaves.filter((l) => empIds.has(l.employeeId));
  db.activities = db.activities.filter((a) => (!a.customerId || partyIds.has(a.customerId)) && (!a.leadId || db.leads.some((l) => l.id === a.leadId)));
  return db;
}

/** Demo to‘plamni yasash (nomlar + kompaniyalar tarkibi). */
export function transformDb(src: DB, kind: DemoKind): DB {
  const db = subset(clone(src), BRANDS[kind].companies);
  if (kind === 'factory') {
    const fac = db.companies.find((c) => c.id === 'fac')!;
    fac.name = BRANDS.factory.name;
    fac.legalName = BRANDS.factory.legal;
    fac.short = 'Zavod';
    fac.kind = 'manufacturing';
    fac.color = '#10b981';
    fac.address = 'Toshkent vil., Chirchiq sh., Sanoat zonasi, 14';
    const wR = db.warehouses.find((w) => w.id === 'wR'); if (wR) wR.name = 'Xomashyo ombori';
    const wF = db.warehouses.find((w) => w.id === 'wF'); if (wF) wF.name = 'Tayyor mahsulot ombori';
  } else {
    const trd = db.companies.find((c) => c.id === 'trd')!;
    trd.name = BRANDS.trade.name;
    trd.legalName = BRANDS.trade.legal;
    trd.short = 'Savdo';
    trd.kind = 'trading';
    trd.color = '#6366f1';
    trd.address = 'Toshkent sh., Yunusobod t., Amir Temur ko‘ch., 107B';
    const names: Record<string, string> = { wA: 'Markaziy ombor — Toshkent', wB: 'Ombor — Samarqand', wC: 'Ombor — Buxoro' };
    for (const w of db.warehouses) if (names[w.id]) w.name = names[w.id];
  }
  const srv = db.companies.find((c) => c.id === 'srv');
  if (srv) {
    srv.name = 'Montaj xizmati';
    srv.short = 'Montaj';
    srv.kind = 'services';
    srv.color = '#0ea5e9';
    srv.legalName = kind === 'factory' ? '“ELEKTRO QURILMA” MChJ montaj bo‘linmasi' : '“NUR ELEKTRO” MChJ xizmat bo‘linmasi';
  }
  // Filial nomlarini demo kontekstiga moslash
  const branchNames: Record<string, string> = { tas: 'Toshkent', sam: 'Samarqand', bux: 'Buxoro', chr: 'Chirchiq zavodi' };
  for (const b of db.branches) b.name = branchNames[b.id] || b.name;
  return db;
}

/** Demo to‘plam statistikasi — landing va demo almashtirgichda ko‘rsatiladi. */
export function demoStats(db: DB) {
  return {
    companies: db.companies.length,
    warehouses: db.warehouses.length,
    products: db.products.filter((p) => p.kind !== 'service').length,
    customers: db.parties.filter((p) => p.kind === 'customer').length,
    suppliers: db.parties.filter((p) => p.kind === 'supplier').length,
    employees: db.employees.length,
    entries: db.entries.length,
    invoices: db.invoices.length,
  };
}
