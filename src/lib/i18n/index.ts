import type { Lang } from '../types';
import { useApp } from '../store';

// Dictionary-based i18n. Uzbek (Latin) is the source language; RU/EN cover the
// application shell and navigation. Missing keys gracefully fall back to UZ.
type Dict = Record<string, string>;

const uz: Dict = {
  'nav.dashboard': 'Boshqaruv paneli', 'nav.ai': 'AI CFO', 'nav.approvals': 'Tasdiqlashlar', 'nav.accounting': 'Buxgalteriya', 'nav.finance': 'Moliya va g‘aznachilik',
  'nav.sales': 'Sotuv', 'nav.purchasing': 'Xarid', 'nav.inventory': 'Tovar zaxiralari', 'nav.warehouse': 'Omborlar', 'nav.manufacturing': 'Ishlab chiqarish',
  'nav.crm': 'CRM', 'nav.hr': 'HR va ish haqi', 'nav.taxes': 'Soliqlar', 'nav.documents': 'Hujjatlar', 'nav.assets': 'Asosiy vositalar', 'nav.projects': 'Loyihalar',
  'nav.reports': 'Hisobotlar', 'nav.analytics': 'Analitika', 'nav.notifications': 'Bildirishnomalar', 'nav.settings': 'Sozlamalar',
  'grp.overview': 'Umumiy', 'grp.finance': 'Moliya', 'grp.operations': 'Operatsiyalar', 'grp.people': 'Mijozlar va xodimlar', 'grp.control': 'Nazorat', 'grp.insights': 'Tahlil',
  'top.search': 'Qidirish: mijoz, hisob-faktura, mahsulot, xodim…', 'top.allCompanies': 'Butun guruh', 'top.allBranches': 'Barcha filiallar', 'top.role': 'Rol (demo)',
  'common.demo': 'DEMO MA’LUMOT', 'common.estimate': 'TAXMINIY', 'common.fact': 'FAKT', 'common.recommendation': 'TAVSIYA', 'common.export': 'Eksport', 'common.filter': 'Filtr',
  'common.save': 'Saqlash', 'common.cancel': 'Bekor qilish', 'common.create': 'Yaratish', 'common.close': 'Yopish', 'common.viewAll': 'Barchasi', 'common.search': 'Qidirish',
  'common.today': 'Bugun', 'common.approve': 'Tasdiqlash', 'common.reject': 'Rad etish', 'common.requestChanges': 'O‘zgartirish so‘rash', 'common.noAccess': 'Bu bo‘limga kirish huquqingiz yo‘q',
  'ai.greeting': 'Assalomu alaykum. Men sizning AI CFO yordamchingizman.', 'ai.placeholder': 'Savol bering: “Bu oy foydamiz qancha?”',
};
const ru: Dict = {
  'nav.dashboard': 'Панель управления', 'nav.ai': 'AI CFO', 'nav.approvals': 'Согласования', 'nav.accounting': 'Бухгалтерия', 'nav.finance': 'Финансы и казначейство',
  'nav.sales': 'Продажи', 'nav.purchasing': 'Закупки', 'nav.inventory': 'Запасы', 'nav.warehouse': 'Склады', 'nav.manufacturing': 'Производство',
  'nav.crm': 'CRM', 'nav.hr': 'Кадры и зарплата', 'nav.taxes': 'Налоги', 'nav.documents': 'Документы', 'nav.assets': 'Основные средства', 'nav.projects': 'Проекты',
  'nav.reports': 'Отчёты', 'nav.analytics': 'Аналитика', 'nav.notifications': 'Уведомления', 'nav.settings': 'Настройки',
  'grp.overview': 'Обзор', 'grp.finance': 'Финансы', 'grp.operations': 'Операции', 'grp.people': 'Клиенты и сотрудники', 'grp.control': 'Контроль', 'grp.insights': 'Анализ',
  'top.search': 'Поиск: клиент, счёт, товар, сотрудник…', 'top.allCompanies': 'Вся группа', 'top.allBranches': 'Все филиалы', 'top.role': 'Роль (демо)',
  'common.demo': 'ДЕМО-ДАННЫЕ', 'common.estimate': 'ОЦЕНКА', 'common.fact': 'ФАКТ', 'common.recommendation': 'РЕКОМЕНДАЦИЯ', 'common.export': 'Экспорт', 'common.filter': 'Фильтр',
  'common.save': 'Сохранить', 'common.cancel': 'Отмена', 'common.create': 'Создать', 'common.close': 'Закрыть', 'common.viewAll': 'Все', 'common.search': 'Поиск',
  'common.today': 'Сегодня', 'common.approve': 'Утвердить', 'common.reject': 'Отклонить', 'common.requestChanges': 'Запросить изменения', 'common.noAccess': 'Нет доступа к разделу',
  'ai.greeting': 'Здравствуйте. Я ваш AI CFO ассистент.', 'ai.placeholder': 'Спросите: «Какая прибыль в этом месяце?»',
};
const en: Dict = {
  'nav.dashboard': 'Dashboard', 'nav.ai': 'AI CFO', 'nav.approvals': 'Approvals', 'nav.accounting': 'Accounting', 'nav.finance': 'Finance & Treasury',
  'nav.sales': 'Sales', 'nav.purchasing': 'Purchasing', 'nav.inventory': 'Inventory', 'nav.warehouse': 'Warehouses', 'nav.manufacturing': 'Manufacturing',
  'nav.crm': 'CRM', 'nav.hr': 'HR & Payroll', 'nav.taxes': 'Taxes', 'nav.documents': 'Documents', 'nav.assets': 'Fixed Assets', 'nav.projects': 'Projects',
  'nav.reports': 'Reports', 'nav.analytics': 'Analytics', 'nav.notifications': 'Notifications', 'nav.settings': 'Settings',
  'grp.overview': 'Overview', 'grp.finance': 'Finance', 'grp.operations': 'Operations', 'grp.people': 'Customers & people', 'grp.control': 'Control', 'grp.insights': 'Insights',
  'top.search': 'Search customers, invoices, products, people…', 'top.allCompanies': 'Entire group', 'top.allBranches': 'All branches', 'top.role': 'Role (demo)',
  'common.demo': 'DEMO DATA', 'common.estimate': 'ESTIMATE', 'common.fact': 'FACT', 'common.recommendation': 'RECOMMENDATION', 'common.export': 'Export', 'common.filter': 'Filter',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.create': 'Create', 'common.close': 'Close', 'common.viewAll': 'View all', 'common.search': 'Search',
  'common.today': 'Today', 'common.approve': 'Approve', 'common.reject': 'Reject', 'common.requestChanges': 'Request changes', 'common.noAccess': 'You do not have access to this module',
  'ai.greeting': 'Hello. I am your AI CFO assistant.', 'ai.placeholder': 'Ask: “What is our profit this month?”',
};
const DICTS: Record<Lang, Dict> = { uz, ru, en };

export const translate = (lang: Lang, key: string) => DICTS[lang][key] ?? uz[key] ?? key;
export function useT() {
  const lang = useApp((s) => s.lang);
  return (key: string) => translate(lang, key);
}
