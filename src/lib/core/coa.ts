import type { Account } from '../types';

// Chart of accounts — structure inspired by the Uzbek NAS No.21 numbering
// (4-digit codes). This is a DEMO chart; a real deployment must be configured
// and verified by a qualified accountant.
export const CHART: Account[] = [
  // ── Non-current assets
  { code: '0120', name: 'Binolar va inshootlar', type: 'asset', group: 'Asosiy vositalar', cf: 'investing', system: true },
  { code: '0130', name: 'Mashina va uskunalar', type: 'asset', group: 'Asosiy vositalar', cf: 'investing', system: true },
  { code: '0150', name: 'Transport vositalari', type: 'asset', group: 'Asosiy vositalar', cf: 'investing', system: true },
  { code: '0160', name: 'Kompyuter va ofis jihozlari', type: 'asset', group: 'Asosiy vositalar', cf: 'investing', system: true },
  { code: '0190', name: 'Boshqa asosiy vositalar', type: 'asset', group: 'Asosiy vositalar', cf: 'investing', system: true },
  { code: '0220', name: 'Binolar amortizatsiyasi', type: 'asset', group: 'Jamg‘arilgan amortizatsiya', contra: true, system: true },
  { code: '0230', name: 'Uskunalar amortizatsiyasi', type: 'asset', group: 'Jamg‘arilgan amortizatsiya', contra: true, system: true },
  { code: '0250', name: 'Transport amortizatsiyasi', type: 'asset', group: 'Jamg‘arilgan amortizatsiya', contra: true, system: true },
  { code: '0260', name: 'Kompyuterlar amortizatsiyasi', type: 'asset', group: 'Jamg‘arilgan amortizatsiya', contra: true, system: true },
  { code: '0290', name: 'Boshqa AV amortizatsiyasi', type: 'asset', group: 'Jamg‘arilgan amortizatsiya', contra: true, system: true },
  // ── Inventories
  { code: '1010', name: 'Xomashyo va materiallar', type: 'asset', group: 'Tovar-moddiy zaxiralar', current: true, system: true },
  { code: '2010', name: 'Tugallanmagan ishlab chiqarish', type: 'asset', group: 'Tovar-moddiy zaxiralar', current: true, system: true },
  { code: '2510', name: 'Umumishlab chiqarish xarajatlari', type: 'asset', group: 'Tovar-moddiy zaxiralar', current: true, system: true },
  { code: '2810', name: 'Tayyor mahsulot', type: 'asset', group: 'Tovar-moddiy zaxiralar', current: true, system: true },
  { code: '2910', name: 'Tovarlar (qayta sotish uchun)', type: 'asset', group: 'Tovar-moddiy zaxiralar', current: true, system: true },
  // ── Receivables
  { code: '4010', name: 'Xaridorlar va buyurtmachilar qarzi', type: 'asset', group: 'Debitorlik qarzlari', current: true, system: true },
  { code: '4310', name: 'Ta’minotchilarga berilgan avanslar', type: 'asset', group: 'Debitorlik qarzlari', current: true },
  { code: '4410', name: 'QQS bo‘yicha hisobga olinadigan soliq', type: 'asset', group: 'Debitorlik qarzlari', current: true, system: true },
  { code: '4890', name: 'Boshqa debitorlar', type: 'asset', group: 'Debitorlik qarzlari', current: true },
  // ── Cash
  { code: '5010', name: 'Kassa (so‘m)', type: 'asset', group: 'Pul mablag‘lari', cash: true, current: true, system: true },
  { code: '5110', name: 'Hisob-kitob schyoti (so‘m)', type: 'asset', group: 'Pul mablag‘lari', cash: true, current: true, system: true },
  { code: '5210', name: 'Valyuta schyoti (USD)', type: 'asset', group: 'Pul mablag‘lari', cash: true, current: true, system: true },
  // ── Liabilities
  { code: '6010', name: 'Mol yetkazib beruvchilarga qarz', type: 'liability', group: 'Kreditorlik qarzlari', current: true, system: true },
  { code: '6090', name: 'Qabul qilingan, hisob-faktura kelmagan', type: 'liability', group: 'Kreditorlik qarzlari', current: true, system: true },
  { code: '6310', name: 'Xaridorlardan olingan avanslar', type: 'liability', group: 'Kreditorlik qarzlari', current: true },
  { code: '6411', name: 'QQS bo‘yicha byudjetga qarz', type: 'liability', group: 'Soliq majburiyatlari', current: true, category: 'tax', system: true },
  { code: '6412', name: 'Foyda solig‘i bo‘yicha qarz', type: 'liability', group: 'Soliq majburiyatlari', current: true, category: 'tax', system: true },
  { code: '6413', name: 'JShDS (daromad solig‘i) bo‘yicha qarz', type: 'liability', group: 'Soliq majburiyatlari', current: true, category: 'tax', system: true },
  { code: '6414', name: 'Mol-mulk solig‘i bo‘yicha qarz', type: 'liability', group: 'Soliq majburiyatlari', current: true, category: 'tax', system: true },
  { code: '6520', name: 'Ijtimoiy soliq bo‘yicha qarz', type: 'liability', group: 'Soliq majburiyatlari', current: true, category: 'tax', system: true },
  { code: '6710', name: 'Mehnatga haq to‘lash bo‘yicha qarz', type: 'liability', group: 'Kreditorlik qarzlari', current: true, system: true },
  { code: '6810', name: 'Qisqa muddatli bank kreditlari', type: 'liability', group: 'Kreditlar', current: true, cf: 'financing', system: true },
  { code: '7810', name: 'Uzoq muddatli bank kreditlari', type: 'liability', group: 'Kreditlar', cf: 'financing', system: true },
  // ── Equity
  { code: '8330', name: 'Ustav kapitali', type: 'equity', group: 'Kapital', cf: 'financing', system: true },
  { code: '8710', name: 'Taqsimlanmagan foyda', type: 'equity', group: 'Kapital', cf: 'financing', system: true },
  // ── Revenue
  { code: '9010', name: 'Tayyor mahsulot sotishdan tushum', type: 'revenue', group: 'Sotishdan tushum', category: 'revenue', system: true },
  { code: '9020', name: 'Tovarlar sotishdan tushum', type: 'revenue', group: 'Sotishdan tushum', category: 'revenue', system: true },
  { code: '9030', name: 'Xizmatlar ko‘rsatishdan tushum', type: 'revenue', group: 'Sotishdan tushum', category: 'revenue', system: true },
  { code: '9040', name: 'Qaytarilgan tovarlar va chegirmalar', type: 'revenue', group: 'Sotishdan tushum', contra: true, category: 'revenue', system: true },
  // ── Cost of sales
  { code: '9110', name: 'Sotilgan tayyor mahsulot tannarxi', type: 'expense', group: 'Sotish tannarxi', category: 'cogs', system: true },
  { code: '9120', name: 'Sotilgan tovarlar tannarxi', type: 'expense', group: 'Sotish tannarxi', category: 'cogs', system: true },
  { code: '9130', name: 'Xizmat ko‘rsatish xodimlari mehnati', type: 'expense', group: 'Sotish tannarxi', category: 'cogs', system: true },
  { code: '9131', name: 'Xizmatlar uchun materiallar', type: 'expense', group: 'Sotish tannarxi', category: 'cogs' },
  { code: '9135', name: 'Subpudratchilar xizmatlari', type: 'expense', group: 'Sotish tannarxi', category: 'cogs' },
  // ── Operating expenses
  { code: '9411', name: 'Marketing va reklama', type: 'expense', group: 'Sotish xarajatlari', category: 'marketing' },
  { code: '9412', name: 'Transport va logistika', type: 'expense', group: 'Sotish xarajatlari', category: 'transport' },
  { code: '9413', name: 'Sotuv xodimlari ish haqi', type: 'expense', group: 'Sotish xarajatlari', category: 'salary', system: true },
  { code: '9421', name: 'Ma’muriy xodimlar ish haqi', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'salary', system: true },
  { code: '9422', name: 'Ijara', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'rent' },
  { code: '9423', name: 'Kommunal xizmatlar', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'utilities' },
  { code: '9424', name: 'Aloqa va IT xizmatlari', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'it' },
  { code: '9425', name: 'Amortizatsiya (ma’muriy)', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'depreciation', system: true },
  { code: '9426', name: 'Ofis va xo‘jalik xarajatlari', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'office' },
  { code: '9427', name: 'Professional xizmatlar (audit, yurist)', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'professional' },
  { code: '9428', name: 'Soliqlar (mol-mulk va boshqa)', type: 'expense', group: 'Ma’muriy xarajatlar', category: 'tax' },
  { code: '9431', name: 'Bank xizmatlari', type: 'expense', group: 'Boshqa operatsion xarajatlar', category: 'bank' },
  { code: '9432', name: 'Kamomad va inventarizatsiya farqlari', type: 'expense', group: 'Boshqa operatsion xarajatlar', category: 'shrinkage', system: true },
  { code: '9434', name: 'Asosiy vositalar chiqimidan zarar', type: 'expense', group: 'Boshqa operatsion xarajatlar', category: 'other' },
  { code: '9433', name: 'Ishlab chiqarish xarajatlari farqi', type: 'expense', group: 'Sotish tannarxi', category: 'cogs', system: true },
  // ── Other income / finance
  { code: '9390', name: 'Boshqa operatsion daromadlar', type: 'revenue', group: 'Boshqa daromadlar', category: 'other_income' },
  { code: '9560', name: 'Foiz daromadlari', type: 'revenue', group: 'Boshqa daromadlar', category: 'other_income' },
  { code: '9610', name: 'Foiz xarajatlari', type: 'expense', group: 'Moliyaviy xarajatlar', category: 'interest' },
  { code: '9810', name: 'Foyda solig‘i xarajati', type: 'expense', group: 'Foyda solig‘i', category: 'income_tax', system: true },
];

export const ACC: Record<string, Account> = Object.fromEntries(CHART.map((a) => [a.code, a]));
export const accName = (code: string) => ACC[code]?.name ?? code;

/** Register a user-defined account (idempotent). Used by Chart of Accounts CRUD + replay. */
export function registerAccount(a: Account) {
  if (ACC[a.code]) { Object.assign(ACC[a.code], a); return; }
  const acc = { ...a, custom: true };
  CHART.push(acc); CHART.sort((x, y) => x.code.localeCompare(y.code)); ACC[a.code] = acc;
}

/** Remove user-defined accounts (used when the demo is reset / rebuilt). */
export function resetCustomAccounts() {
  for (let i = CHART.length - 1; i >= 0; i--) if (CHART[i].custom) { delete ACC[CHART[i].code]; CHART.splice(i, 1); }
}

/** Normal side: +1 means debit-normal. Contra accounts flip. */
export const normalSign = (code: string) => {
  const a = ACC[code]; if (!a) return 1;
  const debitNormal = a.type === 'asset' || a.type === 'expense';
  return (debitNormal ? 1 : -1) * (a.contra ? -1 : 1);
};

export const isCash = (code: string) => !!ACC[code]?.cash;
export const CASH_ACCOUNTS = ['5010', '5110', '5210'];
export const REVENUE_ACCOUNTS = ['9010', '9020', '9030', '9040'];
export const COGS_ACCOUNTS = ['9110', '9120', '9130', '9131', '9135', '9433'];
export const OTHER_INCOME_ACCOUNTS = ['9390', '9560'];
export const FINANCE_COST_ACCOUNTS = ['9610'];
export const INCOME_TAX_ACCOUNTS = ['9810'];
export const INVENTORY_ACCOUNTS = ['1010', '2010', '2510', '2810', '2910'];
export const TAX_LIABILITY_ACCOUNTS = ['6411', '6412', '6413', '6414', '6520'];
const NON_OPEX = new Set([...COGS_ACCOUNTS, ...FINANCE_COST_ACCOUNTS, ...INCOME_TAX_ACCOUNTS]);
/** Operating expense accounts — computed so user-added expense accounts are included. */
export const opexAccounts = () => CHART.filter((a) => a.type === 'expense' && !NON_OPEX.has(a.code)).map((a) => a.code);
export const otherIncomeAccounts = () => CHART.filter((a) => a.type === 'revenue' && !REVENUE_ACCOUNTS.includes(a.code)).map((a) => a.code);
export const expenseAccounts = () => CHART.filter((a) => a.type === 'expense').map((a) => a.code);

/** Human categories for AI / analytics (Uzbek label + account codes). */
export const EXPENSE_CATEGORIES: { id: string; label: string; keywords: string[]; accounts: string[] }[] = [
  { id: 'marketing', label: 'Marketing va reklama', keywords: ['marketing', 'reklama', 'reklam', 'маркетинг', 'реклам', 'advert'], accounts: ['9411'] },
  { id: 'salary', label: 'Ish haqi', keywords: ['ish haqi', 'maosh', 'oylik', 'зарплат', 'salary', 'payroll'], accounts: ['9413', '9421'] },
  { id: 'rent', label: 'Ijara', keywords: ['ijara', 'аренд', 'rent'], accounts: ['9422'] },
  { id: 'utilities', label: 'Kommunal xizmatlar', keywords: ['kommunal', 'elektr', 'gaz', 'suv', 'коммунал', 'utilit'], accounts: ['9423'] },
  { id: 'it', label: 'Aloqa va IT', keywords: ['aloqa', 'internet', ' it ', 'dastur', 'связь', 'software'], accounts: ['9424'] },
  { id: 'transport', label: 'Transport va logistika', keywords: ['transport', 'logistika', 'yoqilg', 'benzin', 'транспорт', 'logistic'], accounts: ['9412'] },
  { id: 'office', label: 'Ofis xarajatlari', keywords: ['ofis', 'xo‘jalik', 'xojalik', 'офис', 'office'], accounts: ['9426'] },
  { id: 'professional', label: 'Professional xizmatlar', keywords: ['audit', 'yurist', 'konsalt', 'юрист', 'legal'], accounts: ['9427'] },
  { id: 'bank', label: 'Bank xizmatlari', keywords: ['bank xizmat', 'komissiya', 'комисс'], accounts: ['9431'] },
  { id: 'depreciation', label: 'Amortizatsiya', keywords: ['amortizatsiya', 'амортиз', 'depreciation'], accounts: ['9425'] },
  { id: 'cogs', label: 'Sotish tannarxi', keywords: ['tannarx', 'себестоим', 'cogs', 'cost of sales'], accounts: ['9110', '9120', '9130', '9131', '9135', '9433'] },
  { id: 'interest', label: 'Foiz xarajatlari', keywords: ['foiz', 'kredit foiz', 'процент', 'interest'], accounts: ['9610'] },
];
