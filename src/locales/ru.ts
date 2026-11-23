/**
 * RU tili lug‘ati (BALANS AI).
 *
 * Qoidalar:
 *  • Kalitlar `namespace.key` ko‘rinishida (masalan `nav.sales`, `errors.load`).
 *  • Barcha tillarda kalitlar to‘plami BIR XIL bo‘lishi shart — `npm test` buni
 *    tekshiradi (scripts/test.ts → i18n parity).
 *  • Yangi matn qo‘shganda avval `uz.ts` ga yozing, keyin ru/en ga tarjima qiling.
 *  • Matnda HTML yoki JS kod bo‘lmasin — faqat ko‘rinadigan matn.
 */
import type { Dict } from './types';

const ru: Dict = {
  'nav.dashboard': 'Панель управления', 'nav.ai': 'AI CFO', 'nav.approvals': 'Согласования', 'nav.accounting': 'Бухгалтерия', 'nav.finance': 'Финансы и казначейство',
  'nav.sales': 'Продажи', 'nav.purchasing': 'Закупки', 'nav.inventory': 'Запасы', 'nav.warehouse': 'Склады', 'nav.manufacturing': 'Производство',
  'nav.crm': 'CRM', 'nav.hr': 'Кадры и зарплата', 'nav.taxes': 'Налоги', 'nav.documents': 'Документы', 'nav.assets': 'Основные средства', 'nav.projects': 'Проекты',
  'nav.reports': 'Отчёты', 'nav.analytics': 'Аналитика', 'nav.notifications': 'Уведомления', 'nav.subscription': 'Подписка', 'nav.settings': 'Настройки',
  'grp.overview': 'Обзор', 'grp.finance': 'Финансы', 'grp.operations': 'Операции', 'grp.people': 'Клиенты и сотрудники', 'grp.control': 'Контроль', 'grp.insights': 'Анализ',
  'top.search': 'Поиск: клиент, счёт, товар, сотрудник…', 'top.allCompanies': 'Вся группа', 'top.allBranches': 'Все филиалы', 'top.role': 'Роль (демо)',
  'common.demo': 'ДЕМО-ДАННЫЕ', 'common.estimate': 'ОЦЕНКА', 'common.fact': 'ФАКТ', 'common.recommendation': 'РЕКОМЕНДАЦИЯ', 'common.export': 'Экспорт', 'common.filter': 'Фильтр',
  'common.save': 'Сохранить', 'common.cancel': 'Отмена', 'common.create': 'Создать', 'common.close': 'Закрыть', 'common.viewAll': 'Все', 'common.search': 'Поиск',
  'common.today': 'Сегодня', 'common.approve': 'Утвердить', 'common.reject': 'Отклонить', 'common.requestChanges': 'Запросить изменения', 'common.noAccess': 'Нет доступа к разделу',
  'ai.greeting': 'Здравствуйте. Я ваш AI CFO ассистент.', 'ai.placeholder': 'Спросите: «Какая прибыль в этом месяце?»',
  // ── Демо-режим
  'demo.badge': 'ДЕМО-РЕЖИМ',
  'demo.title': 'Демо-режим',
  'demo.body': 'Это демонстрационные данные — реальных данных компании они не касаются. Ваши изменения сохраняются только в браузере.',
  'demo.switch': 'Демо-набор',
  'demo.factory': 'Производственный завод',
  'demo.trade': 'Торговля и услуги',
  'demo.startFree': 'Начать бесплатно',
  'demo.exit': 'Выйти из демо',
  'demo.loading': 'Загрузка демо-набора…',
  'demo.hide': 'Скрыть',
  // ── Ошибки
  'errors.title': 'Не удалось загрузить данные',
  'errors.retry': 'Повторить',
  'errors.reload': 'Обновить страницу',
  'errors.network': 'Соединение потеряно. Проверьте интернет и попробуйте снова.',
  'errors.timeout': 'Время загрузки истекло. Соединение медленное — попробуйте снова.',
  'errors.notFound': 'Демо-набор не найден.',
  'errors.server': 'Ошибка на сервере. Повторите попытку через несколько минут.',
  'errors.corrupt': 'Формат данных повреждён. Обновите страницу.',
  'errors.unexpected': 'Непредвиденная ошибка',
  'errors.unexpectedBody': 'Перезагрузите страницу. Если ошибка повторяется — сообщите нам.',
  'errors.help': 'Если проблема сохраняется:',
  'errors.support': 'напишите в поддержку',
  // ── Подписка
  'sub.title': 'Подписка и тариф',
  'sub.trialLeft': 'Бесплатный период: осталось {n} дн.',
  'sub.trialEnded': 'Пробный период завершён',
  'sub.current': 'Текущий тариф',
  'sub.nextPayment': 'Следующий платёж',
  'sub.started': 'Начало',
  'sub.ends': 'Окончание',
  'sub.readOnly': 'Режим чтения',
  'sub.grace': 'Льготный период: {n} дн.',
  'sub.upgrade': 'Обновить тариф',
  'sub.manage': 'Управление подпиской',
};

export default ru;
