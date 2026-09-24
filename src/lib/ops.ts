// ─────────────────────────────────────────────────────────────
// Business operations = posting rules.
// Every operation mutates the DB draft (immer) and, when it has a
// financial effect, creates balanced journal entries via postEntry().
// The same functions are used by the demo seed AND by the UI, so demo
// numbers and user actions follow exactly the same accounting logic.
// ─────────────────────────────────────────────────────────────
import type { DocLine, JournalLine, Invoice, SalesOrder, PurchaseOrder, FixedAsset, WorkOrder, Account, ApprovalItem, DocRecord, BankLine } from './types';
export type { NewPR as NewPurchaseRequest };
import {
  type DB, type Ctx, fail, nextId, nextNo, postEntry, docTotals, lineNet, lineVat, productOf, partyOf, companyOf, byId,
  INV_ACCOUNT, REV_ACCOUNT, COGS_ACCOUNT, ASSET_ACCOUNTS, invOpen, billOpen, audit, isClosed,
} from './db';
import { addStock, takeStock, peek } from './core/inventory';
import { addDays, monthKey, monthEnd, monthLabel } from './core/dates';
import { ACC, registerAccount } from './core/coa';
import { validateLines, balances, accountBalance } from './core/ledger';

const whCompany = (db: DB, whId: string) => byId(db.warehouses, whId)?.companyId || fail('Ombor topilmadi');
const methodOf = (db: DB, companyId: string) => companyOf(db, companyId).costing;

function move(db: DB, ctx: Ctx, date: string, productId: string, whId: string, qty: number, cost: number, kind: DB['moves'][number]['kind'], ref: string, batch?: string) {
  db.moves.push({ id: nextId(db, 'mv'), date, productId, warehouseId: whId, qty, cost, kind, ref, companyId: whCompany(db, whId), batch, user: ctx.user });
}

// ═══ SALES ═════════════════════════════════════════════════════

export interface NewSO { date: string; deliveryDate: string; companyId: string; branchId: string; warehouseId: string; customerId: string; lines: DocLine[]; channel?: SalesOrder['channel']; status?: 'quote' | 'confirmed'; dealId?: string }

export function createSalesOrder(db: DB, a: NewSO, ctx: Ctx): SalesOrder {
  if (!a.lines.length) fail('Buyurtmada kamida bitta mahsulot bo‘lishi kerak.');
  a.lines.forEach((l, i) => { if (!(l.qty > 0)) fail(`${i + 1}-qator: miqdor noto‘g‘ri.`); if (!(l.price >= 0)) fail(`${i + 1}-qator: narx noto‘g‘ri.`); });
  partyOf(db, a.customerId);
  const so: SalesOrder = {
    id: nextId(db, 'so'), no: nextNo(db, a.status === 'quote' ? 'QT' : 'SO', a.date), date: a.date, deliveryDate: a.deliveryDate,
    companyId: a.companyId, branchId: a.branchId, warehouseId: a.warehouseId, customerId: a.customerId, lines: a.lines,
    status: a.status || 'confirmed', createdBy: ctx.user, channel: a.channel || 'wholesale', dealId: a.dealId,
  };
  db.salesOrders.push(so);
  return so;
}

export function confirmSalesOrder(db: DB, soId: string, ctx: Ctx) {
  const so = byId(db.salesOrders, soId) || fail('Buyurtma topilmadi');
  if (so.status !== 'quote') fail('Faqat tijorat taklifi tasdiqlanadi.');
  so.status = 'confirmed'; so.no = so.no.replace(/^QT-/, 'SO-');
  audit(db, ctx, 'Tijorat taklifi buyurtmaga aylantirildi', 'sales', so.no);
}
export function cancelSalesOrder(db: DB, soId: string, ctx: Ctx) {
  const so = byId(db.salesOrders, soId) || fail('Buyurtma topilmadi');
  if (!['quote', 'confirmed'].includes(so.status)) fail('Yetkazilgan yoki hisob-faktura chiqarilgan buyurtmani bekor qilib bo‘lmaydi.');
  so.status = 'cancelled';
  audit(db, ctx, 'Buyurtma bekor qilindi', 'sales', so.no);
}

/** Stock reserved by confirmed-but-undelivered sales orders. */
export function reservedQty(db: DB, productId: string, whId?: string) {
  let q = 0;
  for (const so of db.salesOrders) {
    if (!['confirmed', 'in_production'].includes(so.status)) continue;
    if (whId && so.warehouseId !== whId) continue;
    for (const l of so.lines) if (l.productId === productId) q += l.qty;
  }
  return q;
}
export function incomingQty(db: DB, productId: string, whId?: string) {
  let q = 0;
  for (const po of db.purchaseOrders) {
    if (!['approved', 'partially_received'].includes(po.status)) continue;
    if (whId && po.warehouseId !== whId) continue;
    po.lines.forEach((l, i) => { if (l.productId === productId) q += l.qty - (po.receivedQty[i] || 0); });
  }
  for (const wo of db.workOrders) {
    if (wo.productId === productId && ['released', 'in_progress', 'qc'].includes(wo.status)) q += wo.qty;
  }
  return q;
}

/** Deliver: issue stock, Dr COGS / Cr Inventory. */
export function deliverSalesOrder(db: DB, soId: string, date: string, ctx: Ctx) {
  const so = byId(db.salesOrders, soId) || fail('Buyurtma topilmadi');
  if (!['confirmed', 'in_production'].includes(so.status)) fail('Faqat tasdiqlangan buyurtmani yetkazish mumkin.');
  const method = methodOf(db, so.companyId);
  // pre-check stock
  for (const l of so.lines) {
    if (!l.productId) continue; const p = productOf(db, l.productId); if (p.kind === 'service') continue;
    const have = peek(db.stock, p.id, so.warehouseId).qty;
    if (have < l.qty) fail(`${p.name}: omborda ${have} ${p.unit} bor, ${l.qty} kerak. Avval ishlab chiqaring yoki xarid qiling.`);
  }
  const lines: JournalLine[] = [];
  for (const l of so.lines) {
    if (!l.productId) continue; const p = productOf(db, l.productId); if (p.kind === 'service') continue;
    const { value, batches } = takeStock(db.stock, method, p.id, so.warehouseId, l.qty);
    move(db, ctx, date, p.id, so.warehouseId, -l.qty, value, 'issue', so.no, batches[0]);
    lines.push({ account: COGS_ACCOUNT[p.kind], debit: value, credit: 0, productId: p.id, partyId: so.customerId, costCenter: 'Sotuv' });
    lines.push({ account: INV_ACCOUNT[p.kind], debit: 0, credit: value, productId: p.id });
  }
  if (lines.length) postEntry(db, { date, companyId: so.companyId, branchId: so.branchId, memo: `Yetkazib berish ${so.no} — tannarx`, source: { type: 'delivery', id: so.id, no: so.no }, lines }, ctx);
  so.status = 'delivered';
  addDoc(db, { kind: 'waybill', title: `Yuk xati — ${so.no}`, date, companyId: so.companyId, partyId: so.customerId, amount: docTotals(so.lines).total, status: 'signed', linkedId: so.id }, ctx);
  return so;
}

/** Invoice: Dr AR / Cr Revenue, Cr VAT payable. */
export function invoiceSalesOrder(db: DB, soId: string, date: string, ctx: Ctx, projectId?: string): Invoice {
  const so = byId(db.salesOrders, soId) || fail('Buyurtma topilmadi');
  const hasGoods = so.lines.some((l) => l.productId && productOf(db, l.productId).kind !== 'service');
  if (so.status !== 'delivered' && hasGoods) fail('Tovar yetkazilmaguncha hisob-faktura chiqarib bo‘lmaydi.');
  if (so.invoiceId) fail('Bu buyurtma uchun hisob-faktura allaqachon chiqarilgan.');
  const inv = createInvoice(db, { date, companyId: so.companyId, branchId: so.branchId, customerId: so.customerId, lines: so.lines, soId: so.id, projectId }, ctx);
  so.invoiceId = inv.id; so.status = 'invoiced';
  return inv;
}

export interface NewInvoice { date: string; dueDate?: string; companyId: string; branchId: string; customerId: string; lines: DocLine[]; soId?: string; projectId?: string; memo?: string }

export function createInvoice(db: DB, a: NewInvoice, ctx: Ctx): Invoice {
  if (!a.lines.length) fail('Hisob-fakturada kamida bitta qator bo‘lishi kerak.');
  const cust = partyOf(db, a.customerId);
  const t = docTotals(a.lines);
  if (t.total <= 0) fail('Hisob-faktura summasi musbat bo‘lishi kerak.');
  const inv: Invoice = {
    id: nextId(db, 'inv'), no: nextNo(db, 'INV', a.date), kind: 'sales', date: a.date, dueDate: a.dueDate || addDays(a.date, cust.terms),
    companyId: a.companyId, branchId: a.branchId, customerId: a.customerId, lines: a.lines, net: t.net, vat: t.vat, total: t.total,
    paid: 0, credited: 0, soId: a.soId, projectId: a.projectId, reminders: [], memo: a.memo,
  };
  const lines: JournalLine[] = [{ account: '4010', debit: t.total, credit: 0, partyId: cust.id, projectId: a.projectId }];
  for (const l of a.lines) {
    const kind = l.productId ? productOf(db, l.productId).kind : 'service';
    lines.push({ account: REV_ACCOUNT[kind], debit: 0, credit: lineNet(l), productId: l.productId, partyId: cust.id, projectId: a.projectId, memo: l.description });
  }
  if (t.vat) lines.push({ account: '6411', debit: 0, credit: t.vat, partyId: cust.id });
  inv.entryId = postEntry(db, { date: a.date, companyId: a.companyId, branchId: a.branchId, memo: `Hisob-faktura ${inv.no} — ${cust.name}`, source: { type: 'sales_invoice', id: inv.id, no: inv.no }, lines }, ctx).id;
  db.invoices.push(inv);
  addDoc(db, { kind: 'invoice', title: `Hisob-faktura ${inv.no}`, date: a.date, companyId: a.companyId, partyId: cust.id, amount: t.total, status: 'approved', linkedId: inv.id }, ctx);
  return inv;
}

/** Credit note: reverses revenue & VAT for part of an invoice (optionally restocks goods). */
export function createCreditNote(db: DB, invoiceId: string, amountGross: number, reason: string, date: string, ctx: Ctx) {
  const inv = byId(db.invoices, invoiceId) || fail('Hisob-faktura topilmadi');
  if (!(amountGross > 0)) fail('Summani kiriting.');
  if (amountGross > invOpen(inv)) fail(`Kredit-nota summasi ochiq qoldiqdan (${invOpen(inv).toLocaleString('ru-RU')}) oshmasligi kerak.`);
  const ratio = inv.vat ? inv.vat / inv.total : 0;
  const vat = Math.round(amountGross * ratio); const net = amountGross - vat;
  const cn: Invoice = {
    id: nextId(db, 'inv'), no: nextNo(db, 'CN', date), kind: 'credit_note', date, dueDate: date, companyId: inv.companyId, branchId: inv.branchId,
    customerId: inv.customerId, lines: [{ description: reason, qty: 1, price: net, discount: 0, vat: inv.net ? Math.round((inv.vat / inv.net) * 100) : 0 }],
    net, vat, total: amountGross, paid: 0, credited: 0, reminders: [], relatedId: inv.id, projectId: inv.projectId, memo: reason,
  };
  cn.entryId = postEntry(db, {
    date, companyId: inv.companyId, branchId: inv.branchId, memo: `Kredit-nota ${cn.no} (${inv.no}) — ${reason}`, source: { type: 'credit_note', id: cn.id, no: cn.no },
    lines: [
      { account: '9040', debit: net, credit: 0, partyId: inv.customerId, projectId: inv.projectId },
      ...(vat ? [{ account: '6411', debit: vat, credit: 0 }] : []),
      { account: '4010', debit: 0, credit: amountGross, partyId: inv.customerId, projectId: inv.projectId },
    ],
  }, ctx).id;
  inv.credited += amountGross;
  db.invoices.push(cn);
  return cn;
}

// ═══ PAYMENTS ═════════════════════════════════════════════════

export interface NewReceipt { date: string; companyId: string; branchId: string; customerId: string; amount: number; account: string; allocations?: { docId: string; amount: number }[]; memo?: string }

/** Customer receipt: Dr Cash / Cr AR (auto-allocates oldest invoices first). Overpayment → advance 6310. */
export function recordReceipt(db: DB, a: NewReceipt, ctx: Ctx) {
  if (!(a.amount > 0)) fail('To‘lov summasi musbat bo‘lishi kerak.');
  if (!ACC[a.account]?.cash) fail('Pul hisobini tanlang.');
  const cust = partyOf(db, a.customerId);
  let left = Math.round(a.amount);
  const allocations: { docId: string; amount: number }[] = [];
  const targets = a.allocations?.length
    ? a.allocations.map((x) => ({ inv: byId(db.invoices, x.docId) || fail('Hisob-faktura topilmadi'), max: x.amount }))
    : db.invoices.filter((i) => i.kind === 'sales' && i.customerId === cust.id && i.companyId === a.companyId && invOpen(i) > 0)
      .sort((x, y) => (x.dueDate < y.dueDate ? -1 : 1)).map((inv) => ({ inv, max: Infinity }));
  for (const t of targets) {
    if (left <= 0) break;
    const amt = Math.min(left, invOpen(t.inv), t.max); if (amt <= 0) continue;
    t.inv.paid += amt; left -= amt; allocations.push({ docId: t.inv.id, amount: amt });
  }
  const lines: JournalLine[] = [{ account: a.account, debit: a.amount, credit: 0, partyId: cust.id }];
  const applied = a.amount - left;
  if (applied > 0) lines.push({ account: '4010', debit: 0, credit: applied, partyId: cust.id });
  if (left > 0) lines.push({ account: '6310', debit: 0, credit: left, partyId: cust.id, memo: 'Avans' });
  const pay = { id: nextId(db, 'pay'), no: nextNo(db, 'RCT', a.date), date: a.date, direction: 'in' as const, companyId: a.companyId, branchId: a.branchId, partyId: cust.id, amount: Math.round(a.amount), account: a.account, method: a.account === '5010' ? 'cash' as const : 'bank' as const, allocations, memo: a.memo || `To‘lov — ${cust.name}` };
  pay.memo = a.memo || `Kirim — ${cust.name}${allocations.length ? ' (' + allocations.map((x) => db.invoices.find((i) => i.id === x.docId)?.no).join(', ') + ')' : ''}`;
  (pay as { entryId?: string }).entryId = postEntry(db, { date: a.date, companyId: a.companyId, branchId: a.branchId, memo: pay.memo, source: { type: 'receipt', id: pay.id, no: pay.no }, lines }, ctx).id;
  db.payments.push(pay);
  for (const x of allocations) {
    const inv = byId(db.invoices, x.docId)!;
    if (invOpen(inv) <= 0 && inv.soId) { const so = byId(db.salesOrders, inv.soId); if (so) so.status = 'paid'; }
  }
  return pay;
}

export interface NewSupplierPayment { date: string; companyId: string; branchId: string; supplierId: string; amount: number; account: string; billIds?: string[]; memo?: string }

/** Supplier payment: Dr AP / Cr Cash. */
export function paySupplier(db: DB, a: NewSupplierPayment, ctx: Ctx) {
  if (!(a.amount > 0)) fail('To‘lov summasi musbat bo‘lishi kerak.');
  if (!ACC[a.account]?.cash) fail('Pul hisobini tanlang.');
  const sup = partyOf(db, a.supplierId);
  const cash = accountBalance(db.entries, a.companyId, a.account);
  if (cash < a.amount) fail(`${ACC[a.account].name} hisobida yetarli mablag‘ yo‘q (qoldiq: ${Math.round(cash).toLocaleString('ru-RU')} so‘m).`);
  let left = Math.round(a.amount); const allocations: { docId: string; amount: number }[] = [];
  const bills = db.bills.filter((b) => b.supplierId === sup.id && b.companyId === a.companyId && billOpen(b) > 0 && (!a.billIds || a.billIds.includes(b.id)))
    .sort((x, y) => (x.dueDate < y.dueDate ? -1 : 1));
  for (const b of bills) {
    if (left <= 0) break; const amt = Math.min(left, billOpen(b)); b.paid += amt; left -= amt; allocations.push({ docId: b.id, amount: amt });
    if (billOpen(b) <= 0 && b.poId) { const po = byId(db.purchaseOrders, b.poId); if (po) po.status = 'paid'; }
  }
  const applied = a.amount - left;
  const lines: JournalLine[] = [];
  if (applied > 0) lines.push({ account: '6010', debit: applied, credit: 0, partyId: sup.id });
  if (left > 0) lines.push({ account: '4310', debit: left, credit: 0, partyId: sup.id, memo: 'Avans' });
  lines.push({ account: a.account, debit: 0, credit: a.amount, partyId: sup.id });
  const pay = { id: nextId(db, 'pay'), no: nextNo(db, 'PMT', a.date), date: a.date, direction: 'out' as const, companyId: a.companyId, branchId: a.branchId, partyId: sup.id, amount: Math.round(a.amount), account: a.account, method: a.account === '5010' ? 'cash' as const : 'bank' as const, allocations, memo: a.memo || `To‘lov — ${sup.name}`, entryId: '' };
  pay.entryId = postEntry(db, { date: a.date, companyId: a.companyId, branchId: a.branchId, memo: pay.memo, source: { type: 'supplier_payment', id: pay.id, no: pay.no }, lines }, ctx).id;
  db.payments.push(pay);
  return pay;
}

/** Direct expense paid from cash/bank (optionally with a supplier and input VAT). */
export interface NewExpense { date: string; companyId: string; branchId: string; account: string; amount: number; vat?: number; payAccount: string; memo: string; supplierId?: string; costCenter?: string; projectId?: string }
export function recordExpense(db: DB, a: NewExpense, ctx: Ctx) {
  if (!(a.amount > 0)) fail('Summani kiriting.');
  if (ACC[a.account]?.type !== 'expense' && !['1010', '0190', '0160'].includes(a.account)) fail('Xarajat hisobini tanlang.');
  const vat = Math.round(a.vat || 0);
  const lines: JournalLine[] = [
    { account: a.account, debit: a.amount, credit: 0, costCenter: a.costCenter, projectId: a.projectId, partyId: a.supplierId, memo: a.memo },
    ...(vat ? [{ account: '4410', debit: vat, credit: 0, partyId: a.supplierId }] : []),
    { account: a.payAccount, debit: 0, credit: a.amount + vat, partyId: a.supplierId },
  ];
  return postEntry(db, { date: a.date, companyId: a.companyId, branchId: a.branchId, memo: a.memo, source: { type: 'expense' }, lines }, ctx);
}

/** Transfer between cash accounts (not counted as cash flow). */
export function transferCash(db: DB, a: { date: string; companyId: string; branchId: string; from: string; to: string; amount: number; memo?: string }, ctx: Ctx) {
  if (a.from === a.to) fail('Bir xil hisoblar orasida o‘tkazma qilib bo‘lmaydi.');
  if (!(a.amount > 0)) fail('Summani kiriting.');
  const cash = accountBalance(db.entries, a.companyId, a.from);
  if (cash < a.amount) fail('Hisobda yetarli mablag‘ yo‘q.');
  return postEntry(db, { date: a.date, companyId: a.companyId, branchId: a.branchId, memo: a.memo || `Ichki o‘tkazma ${ACC[a.from].name} → ${ACC[a.to].name}`, source: { type: 'transfer' }, lines: [{ account: a.to, debit: a.amount, credit: 0 }, { account: a.from, debit: 0, credit: a.amount }] }, ctx);
}

// ═══ PURCHASING ═══════════════════════════════════════════════

export interface NewPR { date: string; expectedDate: string; companyId: string; branchId: string; warehouseId: string; lines: DocLine[]; supplierId?: string; requestedBy: string }
export function createPurchaseRequest(db: DB, a: NewPR, ctx: Ctx): PurchaseOrder {
  if (!a.lines.length) fail('Kamida bitta mahsulot kiriting.');
  a.lines.forEach((l, i) => { if (!(l.qty > 0)) fail(`${i + 1}-qator: miqdor noto‘g‘ri.`); });
  const po: PurchaseOrder = {
    id: nextId(db, 'po'), no: nextNo(db, 'PR', a.date), date: a.date, expectedDate: a.expectedDate, companyId: a.companyId, branchId: a.branchId,
    warehouseId: a.warehouseId, supplierId: a.supplierId, lines: a.lines, status: 'request', quotes: [], requestedBy: a.requestedBy, receivedQty: a.lines.map(() => 0),
  };
  db.purchaseOrders.push(po);
  audit(db, ctx, 'Xarid so‘rovi yaratildi', 'purchasing', po.no);
  return po;
}

export function sendRfq(db: DB, poId: string, supplierIds: string[], ctx: Ctx) {
  const po = byId(db.purchaseOrders, poId) || fail('Hujjat topilmadi');
  if (po.status !== 'request') fail('RFQ faqat so‘rov bosqichida yuboriladi.');
  if (!supplierIds.length) fail('Kamida bitta ta’minotchini tanlang.');
  po.status = 'rfq';
  po.quotes = supplierIds.map((s) => ({ supplierId: s, prices: [], leadDays: 0, date: '' }));
  audit(db, ctx, `RFQ yuborildi (${supplierIds.length} ta ta’minotchi)`, 'purchasing', po.no);
}

export function recordQuote(db: DB, poId: string, supplierId: string, prices: number[], leadDays: number, date: string, ctx: Ctx) {
  const po = byId(db.purchaseOrders, poId) || fail('Hujjat topilmadi');
  const q = po.quotes.find((x) => x.supplierId === supplierId) || fail('Ta’minotchi RFQ ro‘yxatida yo‘q');
  if (prices.length !== po.lines.length || prices.some((p) => !(p > 0))) fail('Barcha qatorlar uchun narx kiriting.');
  q.prices = prices; q.leadDays = leadDays; q.date = date;
  if (po.quotes.every((x) => x.prices.length)) po.status = 'quoted';
  audit(db, ctx, `Taklif qayd etildi`, 'purchasing', po.no, partyOf(db, supplierId).name);
}

/** Select a quote → becomes PO pending approval (approval threshold) */
export function selectQuote(db: DB, poId: string, supplierId: string, ctx: Ctx) {
  const po = byId(db.purchaseOrders, poId) || fail('Hujjat topilmadi');
  const q = po.quotes.find((x) => x.supplierId === supplierId && x.prices.length) || fail('Taklif topilmadi');
  po.quotes.forEach((x) => (x.selected = x.supplierId === supplierId));
  po.supplierId = supplierId;
  po.lines = po.lines.map((l, i) => ({ ...l, price: q.prices[i] }));
  po.expectedDate = addDays(ctx.date, q.leadDays || 7);
  submitPO(db, po, ctx);
}

export function submitPO(db: DB, po: PurchaseOrder, ctx: Ctx) {
  if (!po.supplierId) fail('Ta’minotchi tanlanmagan.');
  if (po.lines.some((l) => !(l.price > 0))) fail('Barcha qatorlar uchun narx kerak.');
  po.no = po.no.replace(/^PR-/, 'PO-');
  const total = docTotals(po.lines).total;
  po.status = 'pending_approval';
  requestApproval(db, {
    kind: 'purchase_order', title: `${po.no} — ${partyOf(db, po.supplierId!).name}`, description: po.lines.map((l) => `${l.description} × ${l.qty}`).join(', '),
    amount: total, companyId: po.companyId, requestedBy: po.requestedBy, approverRole: total > 100_000_000 ? 'cfo' : 'chief_accountant',
    deadline: addDays(ctx.date, 2), payload: { action: 'approve_po', refId: po.id },
  }, ctx);
}

export function approvePO(db: DB, poId: string, ctx: Ctx) {
  const po = byId(db.purchaseOrders, poId) || fail('Hujjat topilmadi');
  if (po.status !== 'pending_approval') fail('Buyurtma tasdiqlash bosqichida emas.');
  po.status = 'approved'; po.approvedBy = ctx.user;
  addDoc(db, { kind: 'purchase_order', title: `Xarid buyurtmasi ${po.no}`, date: ctx.date, companyId: po.companyId, partyId: po.supplierId, amount: docTotals(po.lines).total, status: 'approved', linkedId: po.id }, ctx);
}

/** Goods receipt: Dr Inventory / Cr GRNI (6090) at PO net price. */
export function receivePO(db: DB, poId: string, qtys: number[] | 'all', date: string, ctx: Ctx) {
  const po = byId(db.purchaseOrders, poId) || fail('Hujjat topilmadi');
  if (!['approved', 'partially_received'].includes(po.status)) fail('Faqat tasdiqlangan buyurtma bo‘yicha kirim qilinadi.');
  const method = methodOf(db, po.companyId);
  const lines: JournalLine[] = []; let total = 0;
  po.lines.forEach((l, i) => {
    const remaining = l.qty - (po.receivedQty[i] || 0);
    const q = qtys === 'all' ? remaining : Math.min(qtys[i] || 0, remaining);
    if (q <= 0 || !l.productId) return;
    const p = productOf(db, l.productId);
    const value = Math.round(q * l.price * (1 - (l.discount || 0) / 100));
    const batch = `${po.no.slice(-5)}-${date.slice(5).replace('-', '')}`;
    addStock(db.stock, method, p.id, po.warehouseId, q, value, date, batch, po.no);
    move(db, ctx, date, p.id, po.warehouseId, q, value, 'receipt', po.no, batch);
    lines.push({ account: INV_ACCOUNT[p.kind] || '1010', debit: value, credit: 0, productId: p.id });
    total += value; po.receivedQty[i] = (po.receivedQty[i] || 0) + q;
  });
  if (!total) fail('Qabul qilinadigan miqdor kiritilmagan.');
  lines.push({ account: '6090', debit: 0, credit: total, partyId: po.supplierId });
  postEntry(db, { date, companyId: po.companyId, branchId: po.branchId, memo: `Tovar kirimi ${po.no} — ${partyOf(db, po.supplierId!).name}`, source: { type: 'goods_receipt', id: po.id, no: po.no }, lines }, ctx);
  const full = po.lines.every((l, i) => (po.receivedQty[i] || 0) >= l.qty);
  po.status = full ? 'received' : 'partially_received';
  if (full) { po.receivedDate = date; po.onTime = date <= po.expectedDate; }
}

/** Supplier bill against PO: Dr GRNI + Dr input VAT / Cr AP. */
export function billPO(db: DB, poId: string, supplierRef: string, date: string, ctx: Ctx) {
  const po = byId(db.purchaseOrders, poId) || fail('Hujjat topilmadi');
  if (po.status !== 'received' && po.status !== 'partially_received') fail('Tovar qabul qilinmaguncha hisob-faktura kiritilmaydi.');
  if (po.billId) fail('Bu buyurtma uchun hisob-faktura allaqachon kiritilgan.');
  const sup = partyOf(db, po.supplierId!);
  const receivedLines = po.lines.map((l, i) => ({ ...l, qty: po.receivedQty[i] || 0 })).filter((l) => l.qty > 0);
  const t = docTotals(receivedLines);
  const bill = {
    id: nextId(db, 'bill'), no: nextNo(db, 'BILL', date), supplierRef, date, dueDate: addDays(date, sup.terms), companyId: po.companyId, branchId: po.branchId,
    supplierId: sup.id, net: t.net, vat: t.vat, total: t.total, paid: 0, poId: po.id, category: 'goods' as const, memo: `${po.no} bo‘yicha`, entryId: '',
  };
  bill.entryId = postEntry(db, {
    date, companyId: po.companyId, branchId: po.branchId, memo: `Ta’minotchi hisob-fakturasi ${supplierRef} — ${sup.name}`, source: { type: 'bill', id: bill.id, no: bill.no },
    lines: [{ account: '6090', debit: t.net, credit: 0, partyId: sup.id }, ...(t.vat ? [{ account: '4410', debit: t.vat, credit: 0, partyId: sup.id }] : []), { account: '6010', debit: 0, credit: t.total, partyId: sup.id }],
  }, ctx).id;
  db.bills.push(bill); po.billId = bill.id; po.status = 'billed';
  return bill;
}

/** Service / expense bill without PO: Dr Expense + VAT / Cr AP. */
export interface NewBill { date: string; dueDate?: string; companyId: string; branchId: string; supplierId: string; supplierRef: string; account: string; net: number; vatRate: number; memo: string; costCenter?: string; projectId?: string }
export function createExpenseBill(db: DB, a: NewBill, ctx: Ctx) {
  const sup = partyOf(db, a.supplierId);
  if (!(a.net > 0)) fail('Summani kiriting.');
  const vat = Math.round(a.net * a.vatRate / 100); const total = Math.round(a.net) + vat;
  const bill = {
    id: nextId(db, 'bill'), no: nextNo(db, 'BILL', a.date), supplierRef: a.supplierRef, date: a.date, dueDate: a.dueDate || addDays(a.date, sup.terms), companyId: a.companyId,
    branchId: a.branchId, supplierId: sup.id, net: Math.round(a.net), vat, total, paid: 0, category: 'expense' as const, expenseAccount: a.account, memo: a.memo, costCenter: a.costCenter, entryId: '',
  };
  bill.entryId = postEntry(db, {
    date: a.date, companyId: a.companyId, branchId: a.branchId, memo: `${a.memo} — ${sup.name}`, source: { type: 'bill', id: bill.id, no: bill.no },
    lines: [{ account: a.account, debit: bill.net, credit: 0, partyId: sup.id, costCenter: a.costCenter, projectId: a.projectId, memo: a.memo }, ...(vat ? [{ account: '4410', debit: vat, credit: 0, partyId: sup.id }] : []), { account: '6010', debit: 0, credit: total, partyId: sup.id }],
  }, ctx).id;
  db.bills.push(bill);
  return bill;
}

// ═══ INVENTORY ════════════════════════════════════════════════

export function transferStock(db: DB, a: { date: string; productId: string; from: string; to: string; qty: number }, ctx: Ctx) {
  if (a.from === a.to) fail('Bir xil omborlar orasida o‘tkazib bo‘lmaydi.');
  const p = productOf(db, a.productId);
  const fromCo = whCompany(db, a.from); const toCo = whCompany(db, a.to);
  if (fromCo !== toCo) fail('Kompaniyalararo o‘tkazma uchun sotuv/xarid hujjati kerak (bu demo faqat bir kompaniya ichida o‘tkazadi).');
  const method = methodOf(db, fromCo);
  const { value, batches } = takeStock(db.stock, method, p.id, a.from, a.qty);
  addStock(db.stock, method, p.id, a.to, a.qty, value, a.date, batches[0] || 'TR', 'TR');
  const ref = nextNo(db, 'TR', a.date);
  move(db, ctx, a.date, p.id, a.from, -a.qty, value, 'transfer_out', ref, batches[0]);
  move(db, ctx, a.date, p.id, a.to, a.qty, value, 'transfer_in', ref, batches[0]);
  audit(db, ctx, `Ombordan omborga o‘tkazma: ${p.name} × ${a.qty}`, 'warehouse', ref);
  return ref;
}

/** Stock adjustment (count difference): Dr/Cr inventory vs 9432 shrinkage / 9390 surplus. */
export function adjustStock(db: DB, a: { date: string; productId: string; warehouseId: string; countedQty: number; reason: string }, ctx: Ctx) {
  const p = productOf(db, a.productId); const co = whCompany(db, a.warehouseId); const method = methodOf(db, co);
  const wh = byId(db.warehouses, a.warehouseId)!;
  const have = peek(db.stock, p.id, a.warehouseId); const diff = a.countedQty - have.qty;
  if (diff === 0) fail('Farq yo‘q — tuzatish kerak emas.');
  const ref = nextNo(db, 'ADJ', a.date);
  if (diff < 0) {
    const { value } = takeStock(db.stock, method, p.id, a.warehouseId, -diff);
    move(db, ctx, a.date, p.id, a.warehouseId, diff, value, 'adjustment', ref);
    postEntry(db, { date: a.date, companyId: co, branchId: wh.branchId, memo: `Inventarizatsiya kamomadi ${ref}: ${p.name} (${a.reason})`, source: { type: 'adjustment', no: ref }, lines: [{ account: '9432', debit: value, credit: 0, productId: p.id, costCenter: 'Ombor' }, { account: INV_ACCOUNT[p.kind], debit: 0, credit: value, productId: p.id }] }, ctx);
  } else {
    const cost = have.qty ? have.value / have.qty : p.stdCost; const value = Math.round(cost * diff);
    addStock(db.stock, method, p.id, a.warehouseId, diff, value, a.date, ref, ref);
    move(db, ctx, a.date, p.id, a.warehouseId, diff, value, 'adjustment', ref);
    postEntry(db, { date: a.date, companyId: co, branchId: wh.branchId, memo: `Inventarizatsiya ortiqchasi ${ref}: ${p.name} (${a.reason})`, source: { type: 'adjustment', no: ref }, lines: [{ account: INV_ACCOUNT[p.kind], debit: value, credit: 0, productId: p.id }, { account: '9390', debit: 0, credit: value, productId: p.id }] }, ctx);
  }
  return ref;
}

// ═══ MANUFACTURING ════════════════════════════════════════════

export function createWorkOrder(db: DB, a: { productId: string; qty: number; plannedStart: string; plannedEnd: string; soId?: string; companyId: string; branchId: string; crew?: string[] }, ctx: Ctx): WorkOrder {
  const bom = db.boms.find((b) => b.productId === a.productId) || fail('Bu mahsulot uchun BOM (retsept) topilmadi.');
  if (!(a.qty > 0)) fail('Miqdorni kiriting.');
  const wo: WorkOrder = {
    id: nextId(db, 'wo'), no: nextNo(db, 'WO', a.plannedStart), productId: a.productId, bomId: bom.id, qty: a.qty, goodQty: 0, scrapQty: 0, status: 'planned',
    plannedStart: a.plannedStart, plannedEnd: a.plannedEnd, machineId: bom.machineId, soId: a.soId, materialCost: 0, conversionCost: 0, crew: a.crew || [],
    companyId: a.companyId, branchId: a.branchId,
  };
  db.workOrders.push(wo);
  if (a.soId) { const so = byId(db.salesOrders, a.soId); if (so) { so.status = 'in_production'; so.workOrderIds = [...(so.workOrderIds || []), wo.id]; } }
  return wo;
}

/** Material requirement for a WO (incl. planned scrap). */
export function woRequirements(db: DB, wo: WorkOrder) {
  const bom = byId(db.boms, wo.bomId)!;
  const rawWh = db.warehouses.find((w) => w.companyId === wo.companyId && w.kind === 'raw')!;
  return bom.lines.map((l) => {
    const need = Math.ceil(l.qty * wo.qty * (1 + bom.scrapPct / 100) * 100) / 100;
    const have = peek(db.stock, l.productId, rawWh.id).qty;
    return { productId: l.productId, need, have, short: Math.max(0, need - have), warehouseId: rawWh.id };
  });
}

/** Release: issue raw materials to WIP. Dr 2010 / Cr 1010 */
export function releaseWorkOrder(db: DB, woId: string, date: string, ctx: Ctx) {
  const wo = byId(db.workOrders, woId) || fail('Ish buyurtmasi topilmadi');
  if (wo.status !== 'planned') fail('Faqat rejalashtirilgan buyurtma ishga tushiriladi.');
  const req = woRequirements(db, wo);
  const short = req.filter((r) => r.short > 0);
  if (short.length) fail('Xomashyo yetarli emas: ' + short.map((s) => `${productOf(db, s.productId).name} (${s.short} yetishmaydi)`).join(', '));
  const method = methodOf(db, wo.companyId); let total = 0; const lines: JournalLine[] = [];
  for (const r of req) {
    const { value, batches } = takeStock(db.stock, method, r.productId, r.warehouseId, r.need);
    move(db, ctx, date, r.productId, r.warehouseId, -r.need, value, 'production_out', wo.no, batches[0]);
    lines.push({ account: '1010', debit: 0, credit: value, productId: r.productId }); total += value;
  }
  lines.unshift({ account: '2010', debit: total, credit: 0, productId: wo.productId, costCenter: 'Ishlab chiqarish' });
  postEntry(db, { date, companyId: wo.companyId, branchId: wo.branchId, memo: `${wo.no}: xomashyo ishlab chiqarishga berildi`, source: { type: 'wo_issue', id: wo.id, no: wo.no }, lines }, ctx);
  wo.materialCost = total; wo.status = 'in_progress'; wo.releasedDate = date; wo.startedDate = date;
}

export function qcWorkOrder(db: DB, woId: string, goodQty: number, scrapQty: number, result: 'pass' | 'fail', note: string, ctx: Ctx) {
  const wo = byId(db.workOrders, woId) || fail('Ish buyurtmasi topilmadi');
  if (!['in_progress', 'qc'].includes(wo.status)) fail('Sifat nazorati faqat jarayondagi buyurtma uchun.');
  if (goodQty < 0 || scrapQty < 0 || goodQty + scrapQty <= 0) fail('Miqdorlarni to‘g‘ri kiriting.');
  wo.goodQty = goodQty; wo.scrapQty = scrapQty; wo.qc = result; wo.qcNote = note; wo.status = 'qc';
  audit(db, ctx, `Sifat nazorati: ${result === 'pass' ? 'o‘tdi' : 'o‘tmadi'} (${goodQty} yaroqli, ${scrapQty} brak)`, 'manufacturing', wo.no, note);
}

/** Complete: absorb conversion cost (labor/machine/energy/overhead via 2510) and move WIP to finished goods. */
export function completeWorkOrder(db: DB, woId: string, date: string, ctx: Ctx) {
  const wo = byId(db.workOrders, woId) || fail('Ish buyurtmasi topilmadi');
  if (wo.status !== 'qc' || wo.qc !== 'pass') fail('Avval sifat nazoratidan o‘tkazing.');
  if (wo.goodQty <= 0) fail('Yaroqli mahsulot miqdori 0.');
  const bom = byId(db.boms, wo.bomId)!; const p = productOf(db, wo.productId);
  const conv = Math.round((bom.labor + bom.machine + bom.energy + bom.overhead) * (wo.goodQty + wo.scrapQty));
  const total = wo.materialCost + conv;
  const fgWh = db.warehouses.find((w) => w.companyId === wo.companyId && w.kind === 'finished')!;
  postEntry(db, { date, companyId: wo.companyId, branchId: wo.branchId, memo: `${wo.no}: konversiya xarajatlari (mehnat, mashina, energiya, ustama)`, source: { type: 'wo_complete', id: wo.id, no: wo.no }, lines: [{ account: '2010', debit: conv, credit: 0, productId: p.id }, { account: '2510', debit: 0, credit: conv, costCenter: 'Ishlab chiqarish' }] }, ctx);
  addStock(db.stock, methodOf(db, wo.companyId), p.id, fgWh.id, wo.goodQty, total, date, wo.no, wo.no);
  move(db, ctx, date, p.id, fgWh.id, wo.goodQty, total, 'production_in', wo.no, wo.no);
  postEntry(db, { date, companyId: wo.companyId, branchId: wo.branchId, memo: `${wo.no}: tayyor mahsulot omborga (${wo.goodQty} ${p.unit}, brak ${wo.scrapQty})`, source: { type: 'wo_complete', id: wo.id, no: wo.no }, lines: [{ account: '2810', debit: total, credit: 0, productId: p.id }, { account: '2010', debit: 0, credit: total, productId: p.id }] }, ctx);
  wo.conversionCost = conv; wo.status = 'completed'; wo.actualEnd = date;
  if (wo.soId) {
    const so = byId(db.salesOrders, wo.soId);
    if (so && so.status === 'in_production' && (so.workOrderIds || []).every((id) => byId(db.workOrders, id)?.status === 'completed')) so.status = 'confirmed';
  }
}

/** Month-end: under/over-absorbed overhead in 2510 → variance 9433. */
export function closeOverhead(db: DB, companyId: string, date: string, ctx: Ctx) {
  const bal = balances(db.entries, { companyIds: [companyId] }, undefined, date)['2510'] || 0;
  if (Math.abs(bal) < 1) return null;
  const branchId = companyOf(db, companyId).branchIds[0];
  return postEntry(db, { date, companyId, branchId, memo: `Umumishlab chiqarish xarajatlari farqi — ${monthLabel(monthKey(date))}`, source: { type: 'overhead_variance' }, lines: bal > 0 ? [{ account: '9433', debit: bal, credit: 0, costCenter: 'Ishlab chiqarish' }, { account: '2510', debit: 0, credit: bal }] : [{ account: '2510', debit: -bal, credit: 0 }, { account: '9433', debit: 0, credit: -bal, costCenter: 'Ishlab chiqarish' }] }, ctx);
}

// ═══ PAYROLL ══════════════════════════════════════════════════

/** Payroll tax rates come from configurable tax types (Taxes → Sozlamalar). */
export const payrollRates = (db: DB) => ({
  pit: db.taxTypes.find((t) => t.code === 'PIT' && t.enabled)?.rate ?? 0,
  social: db.taxTypes.find((t) => t.code === 'SOCIAL' && t.enabled)?.rate ?? 0,
});

export function calcPayroll(db: DB, companyId: string, period: string) {
  const R = payrollRates(db);
  const days = db.attendance.filter((a) => a.date.startsWith(period));
  const emps = db.employees.filter((e) => e.companyId === companyId && e.status !== 'terminated' && e.hired <= monthEnd(period + '-01'));
  return emps.map((e) => {
    const mine = days.filter((d) => d.employeeId === e.id);
    const absent = mine.filter((d) => d.status === 'absent').length;
    const workdays = Math.max(mine.length, 1);
    const gross = Math.round(e.salary * (mine.length ? (workdays - absent) / workdays : 1));
    const bonus = e.department === 'Sotuv' ? Math.round(e.salary * 0.08) : e.department === 'Ishlab chiqarish' ? Math.round(e.salary * 0.05) : 0;
    const base = gross + bonus;
    const pit = Math.round(base * R.pit / 100);
    const deductions = absent ? Math.round(e.salary - gross) : 0;
    return { employeeId: e.id, gross, bonus, deductions, pit, social: Math.round(base * R.social / 100), net: base - pit };
  });
}

const PAYROLL_ACCOUNT: Record<string, string> = { production: '2510', service: '9130', sales: '9413', admin: '9421' };

export function createPayrollRun(db: DB, companyId: string, period: string, ctx: Ctx) {
  if (db.payrollRuns.some((r) => r.companyId === companyId && r.period === period)) fail(`${monthLabel(period)} uchun ish haqi allaqachon hisoblangan.`);
  const run: DB['payrollRuns'][number] = { id: nextId(db, 'pr'), period, companyId, status: 'draft', lines: calcPayroll(db, companyId, period) };
  if (!run.lines.length) fail('Bu kompaniyada faol xodimlar yo‘q.');
  db.payrollRuns.push(run);
  return run;
}

export function submitPayroll(db: DB, runId: string, ctx: Ctx) {
  const run = byId(db.payrollRuns, runId) || fail('Hisob-kitob topilmadi');
  if (run.status !== 'draft') fail('Faqat qoralama yuboriladi.');
  run.status = 'pending_approval';
  const total = run.lines.reduce((s, l) => s + l.gross + l.bonus + l.social, 0);
  requestApproval(db, { kind: 'payroll', title: `Ish haqi — ${monthLabel(run.period)} (${companyOf(db, run.companyId).short})`, description: `${run.lines.length} nafar xodim, sof to‘lov ${Math.round(run.lines.reduce((s, l) => s + l.net, 0) / 1e6)} mln so‘m`, amount: total, companyId: run.companyId, requestedBy: ctx.user, approverRole: 'cfo', deadline: addDays(ctx.date, 3), payload: { action: 'approve_payroll', refId: run.id } }, ctx);
}

/** Post payroll accrual: Dr labor cost accounts / Cr 6710 net, 6413 PIT, 6520 social. */
/** Share of service-staff time per project (used to charge labor to projects). */
export function projectAllocation(db: DB, companyId: string, period: string): Record<string, number> {
  const end = monthEnd(period + '-01'); const start = period + '-01';
  const active = db.projects.filter((p) => p.companyId === companyId && p.start <= end && p.end >= start && p.status !== 'planning');
  if (!active.length) return {};
  const W: Record<string, number> = { pj1: 0.45, pj2: 0.3, pj3: 0.3, pj4: 0.18 };
  const raw = active.map((p) => [p.id, W[p.id] ?? 0.2] as const);
  const sum = raw.reduce((s, [, w]) => s + w, 0); const cap = Math.min(0.88, sum);
  return Object.fromEntries(raw.map(([id, w]) => [id, (w / sum) * cap]));
}

export function postPayroll(db: DB, runId: string, date: string, ctx: Ctx) {
  const run = byId(db.payrollRuns, runId) || fail('Hisob-kitob topilmadi');
  if (!['approved', 'draft'].includes(run.status)) fail('Ish haqi tasdiqlanmagan.');
  const debit: Record<string, number> = {};
  for (const l of run.lines) {
    const e = byId(db.employees, l.employeeId)!; const acc = PAYROLL_ACCOUNT[e.costKind];
    debit[acc + '|' + e.department] = (debit[acc + '|' + e.department] || 0) + l.gross + l.bonus + l.social;
  }
  const net = run.lines.reduce((s, l) => s + l.net, 0); const pit = run.lines.reduce((s, l) => s + l.pit, 0); const social = run.lines.reduce((s, l) => s + l.social, 0);
  const alloc = projectAllocation(db, run.companyId, run.period);
  const lines: JournalLine[] = [];
  for (const [k, v] of Object.entries(debit)) {
    const [account, dept] = k.split('|');
    if (account === '9130' && Object.keys(alloc).length) {
      let left = v;
      for (const [pid, share] of Object.entries(alloc)) { const amt = Math.round(v * share); left -= amt; lines.push({ account, debit: amt, credit: 0, costCenter: dept, projectId: pid }); }
      if (left > 0) lines.push({ account, debit: left, credit: 0, costCenter: dept });
    } else lines.push({ account, debit: v, credit: 0, costCenter: dept });
  }
  lines.push({ account: '6710', debit: 0, credit: net }, { account: '6413', debit: 0, credit: pit }, { account: '6520', debit: 0, credit: social });
  const branchId = companyOf(db, run.companyId).branchIds[0];
  run.entryId = postEntry(db, { date, companyId: run.companyId, branchId, memo: `Ish haqi hisoblandi — ${monthLabel(run.period)}`, source: { type: 'payroll', id: run.id }, lines }, ctx).id;
  run.status = 'posted';
  const tp = db.taxTypes.find((x) => x.code === 'PIT'); const ts = db.taxTypes.find((x) => x.code === 'SOCIAL');
  const pe = monthEnd(run.period + '-01');
  if (tp && pit) addObligation(db, tp.id, run.companyId, monthLabel(run.period), pit, dueFor(tp, pe));
  if (ts && social) addObligation(db, ts.id, run.companyId, monthLabel(run.period), social, dueFor(ts, pe));
}

export function payPayroll(db: DB, runId: string, date: string, ctx: Ctx) {
  const run = byId(db.payrollRuns, runId) || fail('Hisob-kitob topilmadi');
  if (run.status !== 'posted') fail('Avval ish haqini tasdiqlang va provodka qiling.');
  const net = run.lines.reduce((s, l) => s + l.net, 0);
  const cash = accountBalance(db.entries, run.companyId, '5110');
  if (cash < net) fail('Bank hisobida ish haqi uchun yetarli mablag‘ yo‘q.');
  const branchId = companyOf(db, run.companyId).branchIds[0];
  run.paidEntryId = postEntry(db, { date, companyId: run.companyId, branchId, memo: `Ish haqi to‘landi — ${monthLabel(run.period)}`, source: { type: 'payroll_payment', id: run.id }, lines: [{ account: '6710', debit: net, credit: 0 }, { account: '5110', debit: 0, credit: net }] }, ctx).id;
  run.status = 'paid';
}

// ═══ FIXED ASSETS ═════════════════════════════════════════════

export const monthlyDep = (a: FixedAsset) => Math.round((a.cost - a.salvage) / a.lifeMonths);
export const assetAccum = (a: FixedAsset) => a.priorAccum + a.depreciatedMonths.length * monthlyDep(a);
export const assetNBV = (a: FixedAsset) => a.cost - assetAccum(a);

export function depreciationSchedule(a: FixedAsset, months = 12, fromKey?: string) {
  const m = monthlyDep(a); let accum = assetAccum(a); const rows: { month: string; dep: number; accum: number; nbv: number; posted: boolean }[] = [];
  let key = fromKey || monthKey(addDays(monthEnd((a.depreciatedMonths.at(-1) || monthKey(a.purchaseDate)) + '-01'), 1));
  for (let i = 0; i < months; i++) {
    const dep = Math.min(m, Math.max(0, a.cost - a.salvage - accum)); accum += dep;
    rows.push({ month: key, dep, accum, nbv: a.cost - accum, posted: false });
    key = monthKey(addDays(monthEnd(key + '-01'), 1));
  }
  return rows;
}

/** Monthly depreciation run: Dr expense / 2510 (factory) / Cr accumulated depreciation. */
export function runDepreciation(db: DB, companyId: string, month: string, ctx: Ctx) {
  const date = monthEnd(month + '-01');
  const assets = db.assets.filter((a) => a.companyId === companyId && a.status === 'active' && monthKey(a.purchaseDate) < month && !a.depreciatedMonths.includes(month) && assetNBV(a) - a.salvage > 0);
  if (!assets.length) fail(`${monthLabel(month)} uchun amortizatsiya hisoblanadigan aktiv yo‘q (yoki allaqachon hisoblangan).`);
  const lines: JournalLine[] = [];
  for (const a of assets) {
    const dep = Math.min(monthlyDep(a), assetNBV(a) - a.salvage);
    lines.push({ account: a.expenseAccount, debit: dep, credit: 0, costCenter: a.factory ? 'Ishlab chiqarish' : 'Ma’muriyat', memo: a.name });
    lines.push({ account: ASSET_ACCOUNTS[a.category][1], debit: 0, credit: dep, memo: a.name });
    a.depreciatedMonths.push(month);
  }
  return postEntry(db, { date, companyId, branchId: companyOf(db, companyId).branchIds[0], memo: `Amortizatsiya — ${monthLabel(month)} (${assets.length} ta aktiv)`, source: { type: 'depreciation' }, lines }, ctx);
}

export function purchaseAsset(db: DB, a: Omit<FixedAsset, 'id' | 'code' | 'depreciatedMonths' | 'priorAccum' | 'status' | 'account'> & { payAccount: string; supplierId?: string; vat: number }, ctx: Ctx) {
  if (!(a.cost > 0) || !(a.lifeMonths > 0)) fail('Qiymat va foydali muddatni kiriting.');
  const [acc] = ASSET_ACCOUNTS[a.category];
  const fa: FixedAsset = { ...a, id: nextId(db, 'fa'), code: nextNo(db, 'AV', a.purchaseDate, 4), account: acc, depreciatedMonths: [], priorAccum: 0, status: 'active' };
  const lines: JournalLine[] = [{ account: acc, debit: a.cost, credit: 0, memo: a.name }];
  if (a.vat) lines.push({ account: '4410', debit: a.vat, credit: 0 });
  if (a.supplierId) lines.push({ account: '6010', debit: 0, credit: a.cost + a.vat, partyId: a.supplierId });
  else {
    const cash = accountBalance(db.entries, a.companyId, a.payAccount);
    if (cash < a.cost + a.vat) fail('Hisobda yetarli mablag‘ yo‘q.');
    lines.push({ account: a.payAccount, debit: 0, credit: a.cost + a.vat });
  }
  const e = postEntry(db, { date: a.purchaseDate, companyId: a.companyId, branchId: a.branchId, memo: `Asosiy vosita xaridi: ${a.name}`, source: { type: 'asset_purchase', id: fa.id, no: fa.code }, lines }, ctx);
  if (a.supplierId) {
    const sup = partyOf(db, a.supplierId);
    db.bills.push({ id: nextId(db, 'bill'), no: nextNo(db, 'BILL', a.purchaseDate), supplierRef: fa.code, date: a.purchaseDate, dueDate: addDays(a.purchaseDate, sup.terms), companyId: a.companyId, branchId: a.branchId, supplierId: sup.id, net: a.cost, vat: a.vat, total: a.cost + a.vat, paid: 0, category: 'expense', expenseAccount: acc, memo: `Asosiy vosita: ${a.name}`, entryId: e.id });
  }
  db.assets.push(fa);
  return fa;
}

export function disposeAsset(db: DB, assetId: string, date: string, ctx: Ctx) {
  const a = byId(db.assets, assetId) || fail('Aktiv topilmadi');
  if (a.status !== 'active') fail('Aktiv allaqachon chiqarilgan.');
  const accum = assetAccum(a); const nbv = a.cost - accum; const [acc, accDep] = ASSET_ACCOUNTS[a.category];
  postEntry(db, { date, companyId: a.companyId, branchId: a.branchId, memo: `Asosiy vosita chiqimi: ${a.name}`, source: { type: 'adjustment', id: a.id, no: a.code }, lines: [{ account: accDep, debit: accum, credit: 0 }, ...(nbv > 0 ? [{ account: '9434', debit: nbv, credit: 0 }] : []), { account: acc, debit: 0, credit: a.cost }] }, ctx);
  a.status = 'disposed'; a.disposedDate = date;
}

// ═══ TAX ══════════════════════════════════════════════════════

/** VAT settlement for a month: net output (6411) against input (4410). */
/** Output VAT (sales) and input VAT (purchases) generated by documents in a month. */
export function vatPosition(db: DB, companyId: string, month: string) {
  let output = 0; let input = 0;
  for (const e of db.entries) {
    if (e.companyId !== companyId || e.status === 'draft' || !e.date.startsWith(month)) continue;
    if (e.source.type === 'vat_settlement' || e.source.type === 'tax_payment' || e.source.type === 'opening') continue;
    for (const l of e.lines) {
      if (l.account === '6411') output += l.credit - l.debit;
      if (l.account === '4410') input += l.debit - l.credit;
    }
  }
  const available = accountBalanceAt(db, companyId, '4410', monthEnd(month + '-01'));
  const offset = Math.max(0, Math.min(output, available));
  return { output, input, offset, payable: Math.max(0, output - offset), carry: available - offset };
}

const accountBalanceAt = (db: DB, companyId: string, account: string, to: string) => balances(db.entries, { companyIds: [companyId] }, undefined, to)[account] || 0;

/** Month-end VAT settlement: offset input VAT against output VAT and create the obligation. */
export function settleVat(db: DB, companyId: string, month: string, ctx: Ctx) {
  const v = vatPosition(db, companyId, month); const date = monthEnd(month + '-01');
  if (v.offset > 0) postEntry(db, { date, companyId, branchId: companyOf(db, companyId).branchIds[0], memo: `QQS hisob-kitobi — ${monthLabel(month)} (hisobga olinadigan QQS)`, source: { type: 'vat_settlement' }, lines: [{ account: '6411', debit: v.offset, credit: 0 }, { account: '4410', debit: 0, credit: v.offset }] }, ctx);
  const t = db.taxTypes.find((x) => x.code === 'VAT')!;
  if (v.payable > 0) addObligation(db, t.id, companyId, monthLabel(month), v.payable, dueFor(t, date));
  return v;
}

export const dueFor = (t: { dueDay: number; dueMonthOffset: number }, periodEnd: string) => {
  const d = addDays(periodEnd, 1); // first day of next month
  const m = monthKey(d); const target = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + (t.dueMonthOffset - 1), t.dueDay));
  return target.toISOString().slice(0, 10);
};

export function addObligation(db: DB, taxId: string, companyId: string, period: string, amount: number, dueDate: string, docStatus: 'ok' | 'attention' | 'missing' = 'ok') {
  const o = { id: nextId(db, 'tx'), taxId, companyId, period, amount: Math.round(amount), dueDate, status: 'open' as const, docStatus };
  db.taxObligations.push(o); return o;
}

/** Quarter-end income tax accrual (estimate based on quarter profit before tax). */
export function accrueIncomeTax(db: DB, companyId: string, qStart: string, qEnd: string, label: string, ctx: Ctx) {
  const t = db.taxTypes.find((x) => x.code === 'CIT' && x.enabled); if (!t) return null;
  let pbt = 0;
  for (const e of db.entries) {
    if (e.companyId !== companyId || e.status === 'draft' || e.date < qStart || e.date > qEnd) continue;
    for (const l of e.lines) { const a = ACC[l.account]; if (!a || l.account === '9810') continue; if (a.type === 'revenue') pbt += l.credit - l.debit; if (a.type === 'expense') pbt -= l.debit - l.credit; }
  }
  const tax = Math.round(Math.max(0, pbt) * t.rate / 100);
  if (tax <= 0) return null;
  postEntry(db, { date: qEnd, companyId, branchId: companyOf(db, companyId).branchIds[0], memo: `Foyda solig‘i — ${label} (${t.rate}%)`, source: { type: 'tax_accrual' }, lines: [{ account: '9810', debit: tax, credit: 0 }, { account: '6412', debit: 0, credit: tax }] }, ctx);
  return addObligation(db, t.id, companyId, label, tax, dueFor(t, qEnd));
}

export function accruePropertyTax(db: DB, companyId: string, qEnd: string, label: string, ctx: Ctx) {
  const t = db.taxTypes.find((x) => x.code === 'PROP' && x.enabled); if (!t) return null;
  const base = db.assets.filter((a) => a.companyId === companyId && a.category === 'building' && a.status === 'active').reduce((s, a) => s + a.cost, 0);
  const tax = Math.round(base * t.rate / 100 / 4); if (!tax) return null;
  postEntry(db, { date: qEnd, companyId, branchId: companyOf(db, companyId).branchIds[0], memo: `Mol-mulk solig‘i — ${label}`, source: { type: 'tax_accrual' }, lines: [{ account: '9428', debit: tax, credit: 0, costCenter: 'Ma’muriyat' }, { account: '6414', debit: 0, credit: tax }] }, ctx);
  return addObligation(db, t.id, companyId, label, tax, dueFor(t, qEnd));
}

export function payTax(db: DB, obligationId: string, date: string, ctx: Ctx) {
  const o = byId(db.taxObligations, obligationId) || fail('Majburiyat topilmadi');
  if (o.status === 'paid') fail('Bu soliq allaqachon to‘langan.');
  if (o.estimate) fail('Bu taxminiy majburiyat — davr yopilgandan so‘ng aniq summa hisoblanadi.');
  const t = byId(db.taxTypes, o.taxId)!;
  const cash = accountBalance(db.entries, o.companyId, '5110');
  if (cash < o.amount) fail('Bank hisobida yetarli mablag‘ yo‘q.');
  o.paymentEntryId = postEntry(db, { date, companyId: o.companyId, branchId: companyOf(db, o.companyId).branchIds[0], memo: `${t.name} to‘lovi — ${o.period}`, source: { type: 'tax_payment', id: o.id }, lines: [{ account: t.account, debit: o.amount, credit: 0 }, { account: '5110', debit: 0, credit: o.amount }] }, ctx).id;
  o.status = 'paid'; o.paidDate = date;
}

// ═══ MANUAL JOURNAL / REVERSAL / PERIOD CLOSE ═════════════════

export function manualJournal(db: DB, a: { date: string; companyId: string; branchId: string; memo: string; lines: JournalLine[]; ref?: string }, ctx: Ctx) {
  const v = validateLines(a.lines); if (!v.ok) fail(v.errors.join(' '));
  return postEntry(db, { date: a.date, companyId: a.companyId, branchId: a.branchId, memo: a.memo, source: { type: 'manual', no: a.ref }, lines: a.lines }, ctx);
}

export function reverseEntry(db: DB, entryId: string, date: string, ctx: Ctx) {
  const e = byId(db.entries, entryId) || fail('Provodka topilmadi');
  if (e.status === 'reversed') fail('Provodka allaqachon storno qilingan.');
  if (e.source.type !== 'manual') fail('Faqat qo‘lda kiritilgan provodkalar storno qilinadi. Hujjat provodkalarini hujjatning o‘zi orqali tuzating.');
  const r = postEntry(db, { date, companyId: e.companyId, branchId: e.branchId, memo: `STORNO: ${e.memo}`, source: { type: 'reversal', id: e.id, no: e.no }, lines: e.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })) }, ctx);
  r.reversalOf = e.id;
  db.entries = db.entries.map((x) => (x.id === e.id ? { ...x, status: 'reversed' as const } : x));
  return r;
}

export function closePeriod(db: DB, companyId: string, period: string, ctx: Ctx) {
  if (isClosed(db, companyId, period + '-01')) fail('Davr allaqachon yopilgan.');
  const earlierOpen = db.periods.find((p) => p.companyId === companyId && p.period < period && p.status === 'open');
  if (earlierOpen) fail(`Avval ${monthLabel(earlierOpen.period)} davrini yoping.`);
  const p = db.periods.find((x) => x.companyId === companyId && x.period === period);
  if (p) { p.status = 'closed'; p.closedBy = ctx.user; p.closedAt = ctx.date; } else db.periods.push({ companyId, period, status: 'closed', closedBy: ctx.user, closedAt: ctx.date });
}
export function reopenPeriod(db: DB, companyId: string, period: string, ctx: Ctx) {
  const later = db.periods.find((p) => p.companyId === companyId && p.period > period && p.status === 'closed');
  if (later) fail(`Avval ${monthLabel(later.period)} davrini oching.`);
  const p = db.periods.find((x) => x.companyId === companyId && x.period === period) || fail('Davr topilmadi');
  p.status = 'open'; p.closedBy = undefined; p.closedAt = undefined;
}

export function addAccount(db: DB, a: Account) {
  if (!/^\d{4}$/.test(a.code)) fail('Hisob kodi 4 xonali raqam bo‘lishi kerak.');
  if (ACC[a.code]) fail('Bu kod bilan hisob mavjud.');
  if (!a.name.trim()) fail('Hisob nomini kiriting.');
  registerAccount(a); db.customAccounts.push(a);
}

// ═══ APPROVALS / DOCUMENTS / BANK ═════════════════════════════

export function requestApproval(db: DB, a: Omit<ApprovalItem, 'id' | 'status' | 'requestedAt'>, ctx: Ctx) {
  const item: ApprovalItem = { ...a, id: nextId(db, 'ap'), status: 'pending', requestedAt: ctx.date };
  db.approvals.push(item);
  return item;
}

export function addDoc(db: DB, a: Omit<DocRecord, 'id' | 'no' | 'history'> & { no?: string }, ctx: Ctx) {
  const prefix = { invoice: 'D-INV', contract: 'D-CTR', act: 'D-ACT', waybill: 'D-WB', purchase_order: 'D-PO', sales_order: 'D-SO', payment: 'D-PAY', reconciliation: 'D-REC' }[a.kind];
  const d: DocRecord = { ...a, id: nextId(db, 'doc'), no: a.no || nextNo(db, prefix, a.date, 4), history: [{ date: a.date, user: ctx.user, action: 'Yaratildi' }] };
  db.documents.push(d);
  return d;
}

/** Suggest ledger matches for bank lines by amount + date proximity. */
export function autoMatch(db: DB, companyId: string, ctx: Ctx) {
  const used = new Set(db.bankLines.map((b) => b.matchEntryId || b.suggestedEntryId).filter(Boolean));
  let suggested = 0;
  for (const bl of db.bankLines.filter((b) => b.companyId === companyId && b.status === 'unmatched')) {
    const cands = db.entries.filter((e) => e.companyId === companyId && e.status === 'posted' && !used.has(e.id) && Math.abs(new Date(e.date).getTime() - new Date(bl.date).getTime()) <= 5 * 864e5)
      .map((e) => ({ e, d: e.lines.filter((l) => l.account === bl.account).reduce((s, l) => s + l.debit - l.credit, 0) }))
      .filter((x) => Math.abs(x.d - bl.amount) < 1);
    if (cands.length) {
      bl.status = 'suggested'; bl.suggestedEntryId = cands[0].e.id; bl.confidence = cands.length === 1 ? 96 : 72; used.add(cands[0].e.id); suggested++;
    }
  }
  audit(db, ctx, `Avto-moslashtirish: ${suggested} ta taklif`, 'finance', 'Bank rekonsiliatsiyasi');
  return suggested;
}

export function confirmMatch(db: DB, lineId: string, accept: boolean, ctx: Ctx) {
  const bl = byId(db.bankLines, lineId) || fail('Bank qatori topilmadi');
  if (accept) { bl.status = 'matched'; bl.matchEntryId = bl.suggestedEntryId; }
  else { bl.status = 'unmatched'; bl.suggestedEntryId = undefined; bl.confidence = undefined; }
  audit(db, ctx, accept ? 'Moslashtirish tasdiqlandi' : 'Moslashtirish rad etildi', 'finance', bl.description);
}

/** Book an unmatched bank line as a new entry (e.g. bank fee) and match it. */
export function bookBankLine(db: DB, lineId: string, counterAccount: string, ctx: Ctx) {
  const bl: BankLine = byId(db.bankLines, lineId) || fail('Bank qatori topilmadi');
  if (bl.status === 'matched') fail('Qator allaqachon moslashtirilgan.');
  const amt = Math.abs(bl.amount);
  const e = postEntry(db, { date: bl.date, companyId: bl.companyId, branchId: companyOf(db, bl.companyId).branchIds[0], memo: `Bank: ${bl.description}`, source: { type: 'manual', no: 'BANK' }, lines: bl.amount > 0 ? [{ account: bl.account, debit: amt, credit: 0 }, { account: counterAccount, debit: 0, credit: amt }] : [{ account: counterAccount, debit: amt, credit: 0 }, { account: bl.account, debit: 0, credit: amt }] }, ctx);
  bl.status = 'matched'; bl.matchEntryId = e.id;
}

// ═══ APPROVAL DECISIONS ═══════════════════════════════════════
/** Decide an approval. Approving executes the underlying action — never before. */
export function decideApproval(db: DB, id: string, decision: 'approved' | 'rejected' | 'changes_requested', comment: string, ctx: Ctx) {
  const ap = byId(db.approvals, id) || fail('So‘rov topilmadi');
  if (ap.status !== 'pending') fail('Bu so‘rov bo‘yicha qaror allaqachon qabul qilingan.');
  if (decision === 'approved') {
    const p = ap.payload; const d = (p.data || {}) as Record<string, unknown>;
    switch (p.action) {
      case 'approve_po': approvePO(db, p.refId!, ctx); break;
      case 'approve_payroll': { const run = byId(db.payrollRuns, p.refId!)!; run.status = 'approved'; postPayroll(db, run.id, ctx.date, ctx); break; }
      case 'approve_expense': createExpenseBill(db, { date: ctx.date, companyId: ap.companyId, branchId: companyOf(db, ap.companyId).branchIds[0], supplierId: d.supplierId as string, supplierRef: 'Tasdiqlangan so‘rov', account: d.account as string, net: d.net as number, vatRate: 12, memo: d.memo as string, costCenter: d.costCenter as string }, ctx); break;
      case 'pay_supplier': { const open = db.bills.filter((b) => b.supplierId === d.supplierId && b.companyId === d.companyId && billOpen(b) > 0).reduce((s, b) => s + billOpen(b), 0); if (open > 0) paySupplier(db, { date: ctx.date, companyId: d.companyId as string, branchId: companyOf(db, d.companyId as string).branchIds[0], supplierId: d.supplierId as string, amount: open, account: '5110' }, ctx); break; }
      case 'adjust_stock': { const have = peek(db.stock, d.productId as string, d.warehouseId as string).qty; adjustStock(db, { date: ctx.date, productId: d.productId as string, warehouseId: d.warehouseId as string, countedQty: have + (d.delta as number), reason: d.reason as string }, ctx); break; }
      case 'approve_quote': confirmSalesOrder(db, p.refId!, ctx); break;
      case 'journal': manualJournal(db, d as unknown as Parameters<typeof manualJournal>[1], ctx); break;
      case 'ai_reminders': for (const invId of (d.invoiceIds as string[]) || []) { const inv = byId(db.invoices, invId); if (inv) inv.reminders.push({ date: ctx.date, channel: 'Email (demo — navbatda, yuborilmagan)', status: 'Navbatga qo‘yildi' }); } break;
      case 'ai_purchase': { const pr = createPurchaseRequest(db, d as unknown as NewPR, ctx); submitPO(db, pr, ctx); break; }
      case 'ai_recategorize': { const e = byId(db.entries, d.entryId as string) || fail('Provodka topilmadi'); const amt = e.lines.find((l) => l.account === d.from)?.debit || 0; if (amt) manualJournal(db, { date: ctx.date, companyId: e.companyId, branchId: e.branchId, memo: `Qayta tasniflash (AI taklifi, tasdiqlangan): ${e.memo}`, lines: [{ account: d.to as string, debit: amt, credit: 0, costCenter: d.costCenter as string }, { account: d.from as string, debit: 0, credit: amt }] }, ctx); break; }
      case 'leave': { const lv = byId(db.leaves, p.refId!); if (lv) lv.status = 'approved'; break; }
      default: break;
    }
  } else if (ap.payload.action === 'approve_po' && ap.payload.refId) {
    const po = byId(db.purchaseOrders, ap.payload.refId); if (po) po.status = decision === 'rejected' ? 'rejected' : 'request';
  } else if (ap.payload.action === 'approve_payroll' && ap.payload.refId) {
    const run = byId(db.payrollRuns, ap.payload.refId); if (run) run.status = 'draft';
  } else if (ap.payload.action === 'leave' && ap.payload.refId) {
    const lv = byId(db.leaves, ap.payload.refId); if (lv && decision === 'rejected') lv.status = 'rejected';
  }
  ap.status = decision; ap.decidedBy = ctx.user; ap.decidedAt = `${ctx.date}T${ctx.time || '12:00:00'}`; ap.comment = comment;
  audit(db, ctx, decision === 'approved' ? 'Tasdiqlandi' : decision === 'rejected' ? 'Rad etildi' : 'O‘zgartirish so‘raldi', 'approvals', ap.title, comment);
}

export function docTransition(db: DB, id: string, to: DocRecord['status'], ctx: Ctx, note?: string) {
  const d = byId(db.documents, id) || fail('Hujjat topilmadi');
  const allowed: Record<string, DocRecord['status'][]> = { draft: ['pending', 'archived'], pending: ['approved', 'rejected'], approved: ['signed', 'archived'], signed: ['archived'], rejected: ['draft', 'archived'], archived: [] };
  if (!allowed[d.status].includes(to)) fail(`"${d.status}" holatidan "${to}" holatiga o‘tib bo‘lmaydi.`);
  d.status = to;
  const label: Record<string, string> = { pending: 'Tasdiqlashga yuborildi', approved: 'Tasdiqlandi', rejected: 'Rad etildi', signed: 'Imzolandi (demo — ERI integratsiyasi ulanmagan)', archived: 'Arxivlandi', draft: 'Qoralamaga qaytarildi' };
  d.history.push({ date: ctx.date, user: ctx.user, action: label[to] + (note ? ` — ${note}` : '') });
  audit(db, ctx, label[to], 'documents', d.no);
}
