/**
 * UZ tili lug‘ati (BALANS AI).
 *
 * Qoidalar:
 *  • Kalitlar `namespace.key` ko‘rinishida (masalan `nav.sales`, `errors.load`).
 *  • Barcha tillarda kalitlar to‘plami BIR XIL bo‘lishi shart — `npm test` buni
 *    tekshiradi (scripts/test.ts → i18n parity).
 *  • Yangi matn qo‘shganda avval `uz.ts` ga yozing, keyin ru/en ga tarjima qiling.
 *  • Matnda HTML yoki JS kod bo‘lmasin — faqat ko‘rinadigan matn.
 */
import type { Dict } from './types';

const uz: Dict = {
  'nav.dashboard': 'Boshqaruv paneli', 'nav.ai': 'AI CFO', 'nav.approvals': 'Tasdiqlashlar', 'nav.accounting': 'Buxgalteriya', 'nav.finance': 'Moliya va g‘aznachilik',
  'nav.sales': 'Sotuv', 'nav.purchasing': 'Xarid', 'nav.inventory': 'Tovar zaxiralari', 'nav.warehouse': 'Omborlar', 'nav.manufacturing': 'Ishlab chiqarish',
  'nav.crm': 'CRM', 'nav.hr': 'HR va ish haqi', 'nav.taxes': 'Soliqlar', 'nav.documents': 'Hujjatlar', 'nav.assets': 'Asosiy vositalar', 'nav.projects': 'Loyihalar',
  'nav.reports': 'Hisobotlar', 'nav.analytics': 'Analitika', 'nav.notifications': 'Bildirishnomalar', 'nav.subscription': 'Obuna', 'nav.settings': 'Sozlamalar',
  'grp.overview': 'Umumiy', 'grp.finance': 'Moliya', 'grp.operations': 'Operatsiyalar', 'grp.people': 'Mijozlar va xodimlar', 'grp.control': 'Nazorat', 'grp.insights': 'Tahlil',
  'top.search': 'Qidirish: mijoz, hisob-faktura, mahsulot, xodim…', 'top.allCompanies': 'Butun guruh', 'top.allBranches': 'Barcha filiallar', 'top.role': 'Rol (demo)',
  'common.demo': 'DEMO MA’LUMOT', 'common.estimate': 'TAXMINIY', 'common.fact': 'FAKT', 'common.recommendation': 'TAVSIYA', 'common.export': 'Eksport', 'common.filter': 'Filtr',
  'common.save': 'Saqlash', 'common.cancel': 'Bekor qilish', 'common.create': 'Yaratish', 'common.close': 'Yopish', 'common.viewAll': 'Barchasi', 'common.search': 'Qidirish',
  'common.today': 'Bugun', 'common.approve': 'Tasdiqlash', 'common.reject': 'Rad etish', 'common.requestChanges': 'O‘zgartirish so‘rash', 'common.noAccess': 'Bu bo‘limga kirish huquqingiz yo‘q',
  'ai.greeting': 'Assalomu alaykum. Men sizning AI CFO yordamchingizman.', 'ai.placeholder': 'Savol bering: “Bu oy foydamiz qancha?”',
  // ── Demo rejim
  'demo.badge': 'DEMO REJIM',
  'demo.title': 'Demo rejim',
  'demo.body': 'Bu namunaviy ma’lumot — haqiqiy kompaniya ma’lumotiga tegmaydi. Kiritgan o‘zgarishlaringiz faqat brauzeringizda saqlanadi.',
  'demo.switch': 'Demo to‘plam',
  'demo.factory': 'Ishlab chiqarish zavodi',
  'demo.trade': 'Savdo va xizmat',
  'demo.startFree': 'Bepul boshlash',
  'demo.exit': 'Demodan chiqish',
  'demo.loading': 'Demo to‘plam yuklanmoqda…',
  'demo.hide': 'Yashirish',
  // ── Xatolar
  'errors.title': 'Ma’lumotlarni yuklab bo‘lmadi',
  'errors.retry': 'Qayta urinish',
  'errors.reload': 'Sahifani yangilash',
  'errors.network': 'Internet aloqasi uzildi. Aloqani tekshirib, qayta urinib ko‘ring.',
  'errors.timeout': 'Yuklash vaqti tugadi. Aloqa sekin — qayta urinib ko‘ring.',
  'errors.notFound': 'Demo to‘plam topilmadi.',
  'errors.server': 'Serverda xatolik yuz berdi. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.',
  'errors.corrupt': 'Ma’lumot formati buzilgan. Sahifani yangilang.',
  'errors.unexpected': 'Kutilmagan xatolik',
  'errors.unexpectedBody': 'Sahifani qayta yuklab ko‘ring. Muammo takrorlansa, bizga xabar bering.',
  'errors.help': 'Muammo davom etsa:',
  'errors.support': 'qo‘llab-quvvatlashga yozing',
  // ── Obuna
  'sub.title': 'Obuna va tarif',
  'sub.trialLeft': 'Bepul sinov: {n} kun qoldi',
  'sub.trialEnded': 'Sinov tugadi',
  'sub.current': 'Joriy tarif',
  'sub.nextPayment': 'Keyingi to‘lov',
  'sub.started': 'Boshlangan',
  'sub.ends': 'Tugaydi',
  'sub.readOnly': 'O‘qish rejimi',
  'sub.grace': 'Mehr-muruvvat muddati: {n} kun',
  'sub.upgrade': 'Tarifni yangilash',
  'sub.manage': 'Obunani boshqarish',
};

export default uz;
