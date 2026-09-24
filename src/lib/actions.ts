// ─────────────────────────────────────────────────────────────
// Action registry: the single entry point for every state change.
// • each action is a pure op(db, payload, ctx)
// • every dispatched action is appended to an audit trail
// • the list of dispatched actions is persisted (localStorage) and replayed
//   on top of the deterministic demo seed → small, consistent persistence.
// In production this registry maps 1:1 to API endpoints (see integrations.ts).
// ─────────────────────────────────────────────────────────────
import type { DB, Ctx } from './db';
import { audit, byId, fail, nextId } from './db';
import * as op from './ops';
import type { ModuleId, Party, Product, Employee, AlertRule, TaxType, Lead, CrmActivity, DocRecord } from './types';
import { addAccount as addAcc } from './ops';

type Handler = (db: DB, p: any, ctx: Ctx) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
interface Def { module: ModuleId; label: string; run: Handler; record?: (p: any, db: DB, result: any) => string } // eslint-disable-line @typescript-eslint/no-explicit-any

const noLabel = (r: unknown) => (r && typeof r === 'object' && 'no' in (r as object) ? String((r as { no: string }).no) : '');

export const ACTIONS: Record<string, Def> = {
  // Sales
  'so.create': { module: 'sales', label: 'Savdo buyurtmasi yaratildi', run: op.createSalesOrder, record: (_p, _d, r) => noLabel(r) },
  'so.confirm': { module: 'sales', label: 'Taklif buyurtmaga aylantirildi', run: (db, p, c) => op.confirmSalesOrder(db, p.id, c), record: (p, db) => byId(db.salesOrders, p.id)?.no || '' },
  'so.cancel': { module: 'sales', label: 'Buyurtma bekor qilindi', run: (db, p, c) => op.cancelSalesOrder(db, p.id, c), record: (p, db) => byId(db.salesOrders, p.id)?.no || '' },
  'so.deliver': { module: 'warehouse', label: 'Tovar yetkazildi (ombordan chiqim)', run: (db, p, c) => op.deliverSalesOrder(db, p.id, c.date, c), record: (p, db) => byId(db.salesOrders, p.id)?.no || '' },
  'so.invoice': { module: 'finance', label: 'Buyurtma bo‘yicha hisob-faktura', run: (db, p, c) => op.invoiceSalesOrder(db, p.id, c.date, c), record: (_p, _d, r) => noLabel(r) },
  'so.produce': { module: 'manufacturing', label: 'Buyurtma uchun ishlab chiqarish rejalashtirildi', run: (db, p, c) => { const so = byId(db.salesOrders, p.id) || fail('Topilmadi'); return so.lines.filter((l) => l.productId && byId(db.products, l.productId)?.kind === 'finished').map((l) => op.createWorkOrder(db, { productId: l.productId!, qty: l.qty, plannedStart: c.date, plannedEnd: p.end, soId: so.id, companyId: so.companyId, branchId: so.branchId }, c)); }, record: (p, db) => byId(db.salesOrders, p.id)?.no || '' },
  // AR
  'inv.create': { module: 'finance', label: 'Hisob-faktura yaratildi', run: op.createInvoice, record: (_p, _d, r) => noLabel(r) },
  'inv.credit': { module: 'finance', label: 'Kredit-nota yaratildi', run: (db, p, c) => op.createCreditNote(db, p.invoiceId, p.amount, p.reason, c.date, c), record: (_p, _d, r) => noLabel(r) },
  'inv.remind': { module: 'finance', label: 'To‘lov eslatmasi navbatga qo‘yildi', run: (db, p, c) => { for (const id of p.ids as string[]) { const i = byId(db.invoices, id); if (i) i.reminders.push({ date: c.date, channel: p.channel || 'Email (demo — yuborilmagan)', status: 'Navbatga qo‘yildi' }); } }, record: (p) => `${(p.ids as string[]).length} ta hisob-faktura` },
  'pay.receipt': { module: 'finance', label: 'Mijozdan to‘lov qabul qilindi', run: op.recordReceipt, record: (_p, _d, r) => noLabel(r) },
  // AP
  'pay.supplier': { module: 'finance', label: 'Ta’minotchiga to‘lov', run: op.paySupplier, record: (_p, _d, r) => noLabel(r) },
  'bill.create': { module: 'finance', label: 'Ta’minotchi hisob-fakturasi kiritildi', run: op.createExpenseBill, record: (_p, _d, r) => noLabel(r) },
  'expense.create': { module: 'finance', label: 'Xarajat kiritildi', run: op.recordExpense, record: (_p, _d, r) => noLabel(r) },
  'cash.transfer': { module: 'finance', label: 'Ichki pul o‘tkazmasi', run: op.transferCash, record: (_p, _d, r) => noLabel(r) },
  // Purchasing
  'pr.create': { module: 'purchasing', label: 'Xarid so‘rovi yaratildi', run: op.createPurchaseRequest, record: (_p, _d, r) => noLabel(r) },
  'pr.rfq': { module: 'purchasing', label: 'RFQ yuborildi', run: (db, p, c) => op.sendRfq(db, p.id, p.suppliers, c), record: (p, db) => byId(db.purchaseOrders, p.id)?.no || '' },
  'pr.quote': { module: 'purchasing', label: 'Ta’minotchi taklifi kiritildi', run: (db, p, c) => op.recordQuote(db, p.id, p.supplierId, p.prices, p.leadDays, c.date, c), record: (p, db) => byId(db.purchaseOrders, p.id)?.no || '' },
  'pr.select': { module: 'purchasing', label: 'Taklif tanlandi → PO tasdiqlashga', run: (db, p, c) => op.selectQuote(db, p.id, p.supplierId, c), record: (p, db) => byId(db.purchaseOrders, p.id)?.no || '' },
  'po.submit': { module: 'purchasing', label: 'PO tasdiqlashga yuborildi', run: (db, p, c) => { const po = byId(db.purchaseOrders, p.id) || fail('Topilmadi'); if (p.supplierId) { po.supplierId = p.supplierId; } if (p.prices) po.lines = po.lines.map((l, i) => ({ ...l, price: p.prices[i] })); op.submitPO(db, po, c); }, record: (p, db) => byId(db.purchaseOrders, p.id)?.no || '' },
  'po.receive': { module: 'warehouse', label: 'Tovar qabul qilindi (kirim)', run: (db, p, c) => op.receivePO(db, p.id, p.qtys || 'all', c.date, c), record: (p, db) => byId(db.purchaseOrders, p.id)?.no || '' },
  'po.bill': { module: 'finance', label: 'PO bo‘yicha ta’minotchi hisob-fakturasi', run: (db, p, c) => op.billPO(db, p.id, p.ref, c.date, c), record: (_p, _d, r) => noLabel(r) },
  // Inventory
  'stock.transfer': { module: 'warehouse', label: 'Ombordan omborga o‘tkazma', run: op.transferStock, record: (_p, _d, r) => String(r) },
  'stock.adjust': { module: 'warehouse', label: 'Inventarizatsiya tuzatishi', run: op.adjustStock, record: (_p, _d, r) => String(r) },
  'stock.adjust.request': { module: 'warehouse', label: 'Inventarizatsiya farqi tasdiqlashga yuborildi', run: (db, p, c) => op.requestApproval(db, { kind: 'stock_adjustment', title: p.title, description: p.description, amount: p.amount, companyId: p.companyId, requestedBy: c.user, approverRole: 'chief_accountant', deadline: p.deadline, payload: { action: 'adjust_stock', data: p.data } }, c), record: (p) => p.title },
  'product.create': { module: 'inventory', label: 'Mahsulot yaratildi', run: (db, p: Product) => { if (db.products.some((x) => x.sku === p.sku)) fail('Bu SKU mavjud.'); db.products.push({ ...p, id: nextId(db, 'p') }); }, record: (p) => p.sku },
  'product.update': { module: 'inventory', label: 'Mahsulot tahrirlandi', run: (db, p: Partial<Product> & { id: string }) => { const x = byId(db.products, p.id) || fail('Topilmadi'); Object.assign(x, p); }, record: (p, db) => byId(db.products, p.id)?.sku || '' },
  // Manufacturing
  'wo.create': { module: 'manufacturing', label: 'Ish buyurtmasi yaratildi', run: op.createWorkOrder, record: (_p, _d, r) => noLabel(r) },
  'wo.release': { module: 'manufacturing', label: 'Xomashyo berildi, ishlab chiqarish boshlandi', run: (db, p, c) => op.releaseWorkOrder(db, p.id, c.date, c), record: (p, db) => byId(db.workOrders, p.id)?.no || '' },
  'wo.qc': { module: 'manufacturing', label: 'Sifat nazorati', run: (db, p, c) => op.qcWorkOrder(db, p.id, p.good, p.scrap, p.result, p.note, c), record: (p, db) => byId(db.workOrders, p.id)?.no || '' },
  'wo.complete': { module: 'manufacturing', label: 'Tayyor mahsulot omborga kirim qilindi', run: (db, p, c) => op.completeWorkOrder(db, p.id, c.date, c), record: (p, db) => byId(db.workOrders, p.id)?.no || '' },
  'wo.cancel': { module: 'manufacturing', label: 'Ish buyurtmasi bekor qilindi', run: (db, p) => { const w = byId(db.workOrders, p.id) || fail('Topilmadi'); if (w.status !== 'planned') fail('Faqat rejalashtirilgan buyurtma bekor qilinadi.'); w.status = 'cancelled'; }, record: (p, db) => byId(db.workOrders, p.id)?.no || '' },
  'bom.update': { module: 'manufacturing', label: 'BOM (retsept) yangilandi', run: (db, p) => { const b = byId(db.boms, p.id) || fail('Topilmadi'); Object.assign(b, p); }, record: (p, db) => byId(db.products, byId(db.boms, p.id)?.productId)?.name || '' },
  // HR
  'emp.create': { module: 'hr', label: 'Xodim qo‘shildi', run: (db, p: Employee) => { db.employees.push({ ...p, id: nextId(db, 'e') }); }, record: (p) => p.name },
  'emp.update': { module: 'hr', label: 'Xodim ma’lumotlari o‘zgartirildi', run: (db, p: Partial<Employee> & { id: string; reason?: string }, c) => { const e = byId(db.employees, p.id) || fail('Topilmadi'); if (p.salary && p.salary !== e.salary) e.salaryHistory.push({ date: c.date, amount: p.salary, reason: p.reason || 'O‘zgartirish' }); const { reason, ...rest } = p; void reason; Object.assign(e, rest); }, record: (p, db) => byId(db.employees, p.id)?.name || '' },
  'payroll.create': { module: 'hr', label: 'Ish haqi hisoblandi (qoralama)', run: (db, p, c) => op.createPayrollRun(db, p.companyId, p.period, c), record: (p) => p.period },
  'payroll.submit': { module: 'hr', label: 'Ish haqi tasdiqlashga yuborildi', run: (db, p, c) => op.submitPayroll(db, p.id, c), record: (p, db) => byId(db.payrollRuns, p.id)?.period || '' },
  'payroll.pay': { module: 'hr', label: 'Ish haqi to‘landi', run: (db, p, c) => op.payPayroll(db, p.id, c.date, c), record: (p, db) => byId(db.payrollRuns, p.id)?.period || '' },
  'leave.request': { module: 'hr', label: 'Ta’til so‘rovi', run: (db, p, c) => { const lv = { id: nextId(db, 'lv'), employeeId: p.employeeId, from: p.from, to: p.to, kind: p.kind, status: 'pending' as const }; db.leaves.push(lv); const e = byId(db.employees, p.employeeId)!; op.requestApproval(db, { kind: 'leave', title: `Ta’til: ${e.name} (${p.from} – ${p.to})`, description: p.kind, companyId: e.companyId, requestedBy: c.user, approverRole: 'hr_manager', deadline: p.from, payload: { action: 'leave', refId: lv.id } }, c); }, record: (p, db) => byId(db.employees, p.employeeId)?.name || '' },
  // Assets
  'asset.purchase': { module: 'assets', label: 'Asosiy vosita qabul qilindi', run: op.purchaseAsset, record: (_p, _d, r) => (r as { code: string }).code },
  'asset.depreciate': { module: 'assets', label: 'Oylik amortizatsiya hisoblandi', run: (db, p, c) => op.runDepreciation(db, p.companyId, p.month, c), record: (p) => p.month },
  'asset.dispose': { module: 'assets', label: 'Asosiy vosita hisobdan chiqarildi', run: (db, p, c) => op.disposeAsset(db, p.id, c.date, c), record: (p, db) => byId(db.assets, p.id)?.code || '' },
  // Accounting
  'je.manual': { module: 'accounting', label: 'Qo‘lda provodka kiritildi', run: op.manualJournal, record: (_p, _d, r) => noLabel(r) },
  'je.reverse': { module: 'accounting', label: 'Provodka storno qilindi', run: (db, p, c) => op.reverseEntry(db, p.id, c.date, c), record: (_p, _d, r) => noLabel(r) },
  'je.request': { module: 'accounting', label: 'Provodka tasdiqlashga yuborildi', run: (db, p, c) => op.requestApproval(db, { kind: 'journal', title: `Provodka: ${p.data.memo}`, description: `${p.data.lines.length} qator, ${Math.round(p.total).toLocaleString('ru-RU')} so‘m`, amount: p.total, companyId: p.data.companyId, requestedBy: c.user, approverRole: 'chief_accountant', deadline: c.date, payload: { action: 'journal', data: p.data } }, c), record: (p) => p.data.memo },
  'period.close': { module: 'accounting', label: 'Davr yopildi', run: (db, p, c) => op.closePeriod(db, p.companyId, p.period, c), record: (p) => p.period },
  'period.reopen': { module: 'accounting', label: 'Davr qayta ochildi', run: (db, p, c) => op.reopenPeriod(db, p.companyId, p.period, c), record: (p) => p.period },
  'account.create': { module: 'accounting', label: 'Hisob qo‘shildi', run: (db, p) => addAcc(db, p), record: (p) => `${p.code} ${p.name}` },
  // Bank
  'bank.automatch': { module: 'finance', label: 'Bank avto-moslashtirish', run: (db, p, c) => op.autoMatch(db, p.companyId, c), record: () => 'Bank' },
  'bank.confirm': { module: 'finance', label: 'Bank moslashtirish qarori', run: (db, p, c) => op.confirmMatch(db, p.id, p.accept, c), record: (p, db) => byId(db.bankLines, p.id)?.description || '' },
  'bank.book': { module: 'finance', label: 'Bank operatsiyasi provodka qilindi', run: (db, p, c) => op.bookBankLine(db, p.id, p.account, c), record: (p, db) => byId(db.bankLines, p.id)?.description || '' },
  'bank.import': { module: 'finance', label: 'Bank ko‘chirmasi import qilindi', run: (db, p) => { for (const l of p.lines) db.bankLines.push({ ...l, id: nextId(db, 'bl'), status: 'unmatched' }); }, record: (p) => `${p.lines.length} qator` },
  // Tax
  'tax.pay': { module: 'taxes', label: 'Soliq to‘landi', run: (db, p, c) => op.payTax(db, p.id, c.date, c), record: (p, db) => byId(db.taxObligations, p.id)?.period || '' },
  'tax.file': { module: 'taxes', label: 'Soliq hisoboti topshirildi deb belgilandi', run: (db, p) => { const o = byId(db.taxObligations, p.id) || fail('Topilmadi'); o.docStatus = 'ok'; if (o.status === 'open') o.status = 'filed'; }, record: (p, db) => byId(db.taxObligations, p.id)?.period || '' },
  'tax.type': { module: 'taxes', label: 'Soliq turi sozlamasi o‘zgartirildi', run: (db, p: Partial<TaxType> & { id: string }) => { const t = byId(db.taxTypes, p.id) || fail('Topilmadi'); Object.assign(t, p); }, record: (p, db) => byId(db.taxTypes, p.id)?.name || '' },
  // Approvals & docs
  'approval.decide': { module: 'approvals', label: 'Tasdiqlash qarori', run: (db, p, c) => op.decideApproval(db, p.id, p.decision, p.comment || '', c), record: (p, db) => byId(db.approvals, p.id)?.title || '' },
  'approval.request': { module: 'approvals', label: 'Tasdiqlash so‘rovi yaratildi', run: (db, p, c) => op.requestApproval(db, { ...p, requestedBy: c.user }, c), record: (p) => p.title },
  'doc.create': { module: 'documents', label: 'Hujjat yaratildi', run: (db, p: Omit<DocRecord, 'id' | 'no' | 'history'>, c) => op.addDoc(db, p, c), record: (_p, _d, r) => noLabel(r) },
  'doc.transition': { module: 'documents', label: 'Hujjat holati o‘zgartirildi', run: (db, p, c) => op.docTransition(db, p.id, p.to, c, p.note), record: (p, db) => byId(db.documents, p.id)?.no || '' },
  // CRM
  'lead.create': { module: 'crm', label: 'Lid yaratildi', run: (db, p: Lead) => { db.leads.push({ ...p, id: nextId(db, 'l') }); }, record: (p) => p.company },
  'lead.stage': { module: 'crm', label: 'Bitim bosqichi o‘zgartirildi', run: (db, p) => { const l = byId(db.leads, p.id) || fail('Topilmadi'); l.stage = p.stage; l.probability = ({ new: 10, qualified: 25, proposal: 40, negotiation: 65, won: 100, lost: 0 } as Record<string, number>)[p.stage]; if (p.lostReason) l.lostReason = p.lostReason; }, record: (p, db) => byId(db.leads, p.id)?.company || '' },
  'lead.convert': { module: 'crm', label: 'Lid mijozga aylantirildi', run: (db, p, c) => { const l = byId(db.leads, p.id) || fail('Topilmadi'); const id = nextId(db, 'c'); const party: Party = { id, code: `MJ-${String(db.parties.filter((x) => x.kind === 'customer').length + 1).padStart(3, '0')}`, name: l.company, kind: 'customer', companyIds: [l.companyId], branchId: 'tas', stir: p.stir || '—', phone: l.phone, email: p.email || '—', address: '—', terms: 30, creditLimit: Math.round(l.value * 0.5), segment: 'Yangi', behaviour: 'normal' }; db.parties.push(party); l.customerId = id; l.stage = 'won'; l.probability = 100; void c; }, record: (p, db) => byId(db.leads, p.id)?.company || '' },
  'activity.create': { module: 'crm', label: 'Faoliyat qo‘shildi', run: (db, p: CrmActivity) => { db.activities.push({ ...p, id: nextId(db, 'a') }); }, record: (p) => p.subject },
  'activity.toggle': { module: 'crm', label: 'Vazifa holati o‘zgartirildi', run: (db, p) => { const a = byId(db.activities, p.id) || fail('Topilmadi'); a.done = !a.done; }, record: (p, db) => byId(db.activities, p.id)?.subject || '' },
  'party.create': { module: 'crm', label: 'Kontragent qo‘shildi', run: (db, p: Party) => { if (p.stir && p.stir !== '—' && db.parties.some((x) => x.stir === p.stir && x.kind === p.kind)) fail('Bu STIR bilan kontragent mavjud.'); db.parties.push({ ...p, id: nextId(db, p.kind === 'customer' ? 'c' : 's') }); }, record: (p) => p.name },
  'party.update': { module: 'crm', label: 'Kontragent tahrirlandi', run: (db, p: Partial<Party> & { id: string }) => { const x = byId(db.parties, p.id) || fail('Topilmadi'); Object.assign(x, p); }, record: (p, db) => byId(db.parties, p.id)?.name || '' },
  // Settings
  'alert.rule': { module: 'settings', label: 'Ogohlantirish qoidasi o‘zgartirildi', run: (db, p: Partial<AlertRule> & { id: string }) => { const r = byId(db.alertRules, p.id) || fail('Topilmadi'); Object.assign(r, p); }, record: (p, db) => byId(db.alertRules, p.id)?.label || '' },
  'alert.read': { module: 'notifications', label: 'Bildirishnoma o‘qildi', run: (db, p) => { for (const id of p.ids as string[]) if (!db.readAlerts.includes(id)) db.readAlerts.push(id); }, record: (p) => `${(p.ids as string[]).length} ta` },
  'report.schedule': { module: 'reports', label: 'Hisobot jadvalga qo‘yildi', run: (db, p, c) => { db.schedules.push({ ...p, id: nextId(db, 'sc'), createdAt: c.date }); }, record: (p) => p.reportId },
  'report.unschedule': { module: 'reports', label: 'Hisobot jadvali o‘chirildi', run: (db, p) => { db.schedules = db.schedules.filter((s) => s.id !== p.id); }, record: (p) => p.id },
  'session.revoke': { module: 'settings', label: 'Seans tugatildi', run: (db, p) => { db.sessions = db.sessions.filter((s) => s.id !== p.id); }, record: (p) => p.id },
  'company.update': { module: 'settings', label: 'Kompaniya rekvizitlari yangilandi', run: (db, p) => { const co = byId(db.companies, p.id) || fail('Topilmadi'); Object.assign(co, p); }, record: (p, db) => byId(db.companies, p.id)?.name || '' },
  'export.log': { module: 'reports', label: 'Eksport', run: () => null, record: (p) => p.what },
};

const SILENT = new Set(['alert.read']);

export function runAction(db: DB, type: string, payload: unknown, ctx: Ctx) {
  const def = ACTIONS[type] || fail(`Noma’lum amal: ${type}`);
  const result = def.run(db, payload, ctx);
  if (!SILENT.has(type)) audit(db, ctx, def.label, def.module, def.record ? def.record(payload, db, result) : '', undefined);
  return result;
}
