// ─────────────────────────────────────────────────────────────
// Integration points — CONTRACTS ONLY.
// Nothing in this file talks to an external system. Each adapter
// declares the interface a real implementation must satisfy and
// reports status "not_connected". The UI reads `status` and never
// pretends a connection exists.
// ─────────────────────────────────────────────────────────────
import type { BankLine, Invoice, Rates } from './types';

export type IntegrationStatus = 'not_connected' | 'sandbox' | 'connected';

export interface IntegrationInfo {
  id: string; name: string; category: 'bank' | 'tax' | 'einvoice' | 'payments' | 'messaging' | 'ai' | 'erp' | 'files' | 'fx';
  status: IntegrationStatus; description: string; contract: string; notes: string;
}

// Adapter contracts (to be implemented server-side; secrets never in the browser)
export interface BankAdapter { listAccounts(): Promise<{ id: string; iban: string; currency: string }[]>; fetchStatement(accountId: string, from: string, to: string): Promise<Omit<BankLine, 'id' | 'status'>[]>; initiatePayment(p: { account: string; amount: number; beneficiaryStir: string; mfo: string; purpose: string }): Promise<{ reference: string }> }
export interface EInvoiceAdapter { send(invoice: Invoice): Promise<{ externalId: string; status: 'sent' | 'rejected' }>; status(externalId: string): Promise<'sent' | 'accepted' | 'rejected' | 'cancelled'>; incoming(from: string): Promise<unknown[]> }
export interface TaxAdapter { submitReport(kind: string, period: string, payload: unknown): Promise<{ receipt: string }>; checkStir(stir: string): Promise<{ valid: boolean; name?: string; vatPayer?: boolean }> }
export interface PaymentAdapter { createLink(invoiceId: string, amount: number): Promise<{ url: string }>; webhook(payload: unknown): Promise<{ invoiceId: string; amount: number }> }
export interface MessagingAdapter { send(to: string, template: string, vars: Record<string, string>): Promise<{ id: string }> }
export interface LLMAdapter { complete(system: string, messages: { role: 'user' | 'assistant'; content: string }[], tools: unknown[]): Promise<string> }
export interface FxAdapter { rates(date: string): Promise<Rates> }

export const INTEGRATIONS: IntegrationInfo[] = [
  { id: 'bank', name: 'Bank API (Kapitalbank, Xalq banki, Ipoteka bank…)', category: 'bank', status: 'not_connected', description: 'Hisob ko‘chirmalarini avtomatik yuklash va to‘lov topshiriqlari', contract: 'BankAdapter', notes: 'Hozircha ko‘chirma CSV/Excel orqali import qilinadi (Moliya → Bank rekonsiliatsiyasi).' },
  { id: 'einvoice', name: 'Elektron hisob-faktura operatori (Didox, Faktura.uz, Soliq ERI)', category: 'einvoice', status: 'not_connected', description: 'Hisob-faktura, dalolatnoma va shartnomalarni ERI bilan yuborish/qabul qilish', contract: 'EInvoiceAdapter', notes: 'Hujjatlardagi “Imzolash” — faqat ichki holat, haqiqiy ERI imzosi emas.' },
  { id: 'tax', name: 'Soliq qo‘mitasi (my.soliq.uz) hisobotlari', category: 'tax', status: 'not_connected', description: 'Soliq hisobotlarini topshirish, STIR tekshirish', contract: 'TaxAdapter', notes: 'Soliq summalari tizimdagi sozlanadigan stavkalar asosida hisoblanadi; qonunchilikka muvofiqlik tasdiqlanmagan.' },
  { id: 'payments', name: 'To‘lov tizimlari (Payme, Click, Uzum)', category: 'payments', status: 'not_connected', description: 'Hisob-faktura uchun to‘lov havolasi va avtomatik kirim', contract: 'PaymentAdapter', notes: 'To‘lovlar qo‘lda kiritiladi.' },
  { id: 'telegram', name: 'Telegram bot', category: 'messaging', status: 'not_connected', description: 'Ogohlantirishlar va tasdiqlash so‘rovlari Telegramga', contract: 'MessagingAdapter', notes: 'Kanal sozlamasi saqlanadi, ammo xabar yuborilmaydi.' },
  { id: 'email', name: 'Email (SMTP / transactional)', category: 'messaging', status: 'not_connected', description: 'To‘lov eslatmalari, hisobot jo‘natish', contract: 'MessagingAdapter', notes: 'Eslatmalar “navbatga qo‘yildi” holatida qoladi — yuborilmaydi.' },
  { id: 'llm', name: 'AI model API (LLM)', category: 'ai', status: 'not_connected', description: 'Erkin matnli savollarga tabiiy javob', contract: 'LLMAdapter', notes: 'AI CFO hozir brauzerda ishlaydigan qoidaga asoslangan tahlil dvigateli: javoblar faqat tizimdagi DEMO ma’lumotlardan hisoblanadi.' },
  { id: 'fx', name: 'Markaziy bank valyuta kurslari (cbu.uz)', category: 'fx', status: 'not_connected', description: 'Kunlik USD/EUR kurslari', contract: 'FxAdapter', notes: 'Demo kurslar ishlatiladi: 1 USD = 12 650 so‘m, 1 EUR = 14 300 so‘m.' },
  { id: 'excel', name: 'Excel / CSV import-eksport', category: 'files', status: 'connected', description: 'Brauzer ichida: import ustaxonasi, CSV/XLS eksport, PDF (chop etish)', contract: '—', notes: 'Serversiz ishlaydi.' },
  { id: 'erp', name: '1C / boshqa ERP sinxronizatsiyasi', category: 'erp', status: 'not_connected', description: 'Ma’lumotnomalar va provodkalarni almashish', contract: 'REST / OData (reja)', notes: 'actions.ts dagi har bir amal kelajakdagi API endpointga mos keladi.' },
];
