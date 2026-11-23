/**
 * EN tili lug‘ati (BALANS AI).
 *
 * Qoidalar:
 *  • Kalitlar `namespace.key` ko‘rinishida (masalan `nav.sales`, `errors.load`).
 *  • Barcha tillarda kalitlar to‘plami BIR XIL bo‘lishi shart — `npm test` buni
 *    tekshiradi (scripts/test.ts → i18n parity).
 *  • Yangi matn qo‘shganda avval `uz.ts` ga yozing, keyin ru/en ga tarjima qiling.
 *  • Matnda HTML yoki JS kod bo‘lmasin — faqat ko‘rinadigan matn.
 */
import type { Dict } from './types';

const en: Dict = {
  'nav.dashboard': 'Dashboard', 'nav.ai': 'AI CFO', 'nav.approvals': 'Approvals', 'nav.accounting': 'Accounting', 'nav.finance': 'Finance & Treasury',
  'nav.sales': 'Sales', 'nav.purchasing': 'Purchasing', 'nav.inventory': 'Inventory', 'nav.warehouse': 'Warehouses', 'nav.manufacturing': 'Manufacturing',
  'nav.crm': 'CRM', 'nav.hr': 'HR & Payroll', 'nav.taxes': 'Taxes', 'nav.documents': 'Documents', 'nav.assets': 'Fixed Assets', 'nav.projects': 'Projects',
  'nav.reports': 'Reports', 'nav.analytics': 'Analytics', 'nav.notifications': 'Notifications', 'nav.subscription': 'Subscription', 'nav.settings': 'Settings',
  'grp.overview': 'Overview', 'grp.finance': 'Finance', 'grp.operations': 'Operations', 'grp.people': 'Customers & people', 'grp.control': 'Control', 'grp.insights': 'Insights',
  'top.search': 'Search customers, invoices, products, people…', 'top.allCompanies': 'Entire group', 'top.allBranches': 'All branches', 'top.role': 'Role (demo)',
  'common.demo': 'DEMO DATA', 'common.estimate': 'ESTIMATE', 'common.fact': 'FACT', 'common.recommendation': 'RECOMMENDATION', 'common.export': 'Export', 'common.filter': 'Filter',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.create': 'Create', 'common.close': 'Close', 'common.viewAll': 'View all', 'common.search': 'Search',
  'common.today': 'Today', 'common.approve': 'Approve', 'common.reject': 'Reject', 'common.requestChanges': 'Request changes', 'common.noAccess': 'You do not have access to this module',
  'ai.greeting': 'Hello. I am your AI CFO assistant.', 'ai.placeholder': 'Ask: “What is our profit this month?”',
  // ── Demo mode
  'demo.badge': 'DEMO MODE',
  'demo.title': 'Demo mode',
  'demo.body': 'This is sample data — it never touches real company records. Your changes are stored only in this browser.',
  'demo.switch': 'Demo dataset',
  'demo.factory': 'Manufacturing plant',
  'demo.trade': 'Trade & services',
  'demo.startFree': 'Start free',
  'demo.exit': 'Exit demo',
  'demo.loading': 'Loading demo dataset…',
  'demo.hide': 'Hide',
  // ── Errors
  'errors.title': 'Could not load data',
  'errors.retry': 'Retry',
  'errors.reload': 'Reload page',
  'errors.network': 'Connection lost. Check your internet and try again.',
  'errors.timeout': 'Loading timed out. Connection is slow — please retry.',
  'errors.notFound': 'Demo dataset not found.',
  'errors.server': 'Server error. Please retry in a few minutes.',
  'errors.corrupt': 'Data format is corrupted. Reload the page.',
  'errors.unexpected': 'Unexpected error',
  'errors.unexpectedBody': 'Try reloading the page. If it keeps happening, let us know.',
  'errors.help': 'If the problem persists:',
  'errors.support': 'contact support',
  // ── Subscription
  'sub.title': 'Subscription & plan',
  'sub.trialLeft': 'Free trial: {n} days left',
  'sub.trialEnded': 'Trial ended',
  'sub.current': 'Current plan',
  'sub.nextPayment': 'Next payment',
  'sub.started': 'Started',
  'sub.ends': 'Ends',
  'sub.readOnly': 'Read-only mode',
  'sub.grace': 'Grace period: {n} days',
  'sub.upgrade': 'Upgrade plan',
  'sub.manage': 'Manage subscription',
};

export default en;
