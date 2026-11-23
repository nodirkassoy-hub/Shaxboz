import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { VAT_RATE, TRIAL_DAYS, DATA_RETENTION_DAYS, GRACE_DAYS, PLANS } from '@/lib/config/pricing';

export const metadata: Metadata = {
  title: 'Foydalanish shartlari (oferta)',
  description: 'BALANS AI xizmatidan foydalanish shartlari: sinov davri, to‘lov, obuna, ma’lumotlar va javobgarlik.',
};

const SECTIONS = [
  { t: '1. Umumiy qoidalar', p: [
    'Ushbu shartlar (keyingi o‘rinlarda — “Shartlar”) “BALANS AI” MChJ (keyingi o‘rinlarda — “Xizmat ko‘rsatuvchi”) tomonidan taqdim etiladigan BALANS AI dasturiy ta’minot xizmatidan (SaaS) foydalanish tartibini belgilaydi.',
    'Xizmatdan foydalanishni boshlash (ro‘yxatdan o‘tish yoki demo panelni ochish) bilan Foydalanuvchi ushbu Shartlarga to‘liq rozilik bildirgan hisoblanadi.',
    'Shartlar o‘zbek tilida tuzilgan. Tarjimalar faqat ma’lumot uchun; ziddiyat bo‘lsa, o‘zbek tilidagi matn ustuvor.',
  ] },
  { t: '2. Xizmat tavsifi', p: [
    'Xizmat biznes boshqaruvi tizimi: buxgalteriya, moliya, sotuv, xarid, ombor, ishlab chiqarish, HR, soliqlar va AI CFO modullari.',
    'Hozirgi versiya DEMO holatida: ma’lumotlar namunaviy, tashqi tizimlar (bank, soliq, ERI, to‘lov provayderlari) ulanmagan, to‘lovlar TEST rejimida bajariladi va haqiqiy pul yechilmaydi.',
    'Xizmat buxgalteriya yoki soliq hisobotlarini yuritishning huquqiy jihatdan tasdiqlangan vositasi hisoblanmaydi. Hisobotlar va AI xulosalari faqat axborot maqsadida; yakuniy qaror va hisobot uchun javobgarlik Foydalanuvchida.',
  ] },
  { t: '3. Sinov davri', p: [
    `Yangi hisob uchun ${TRIAL_DAYS} kunlik bepul sinov davri beriladi. Sinov uchun bank kartasi talab qilinmaydi va avtomatik to‘lov olinmaydi.`,
    'Sinov davrida ISHLAB CHIQARISH tarifidagi barcha modullar ochiq.',
    `Sinov tugagach tarif tanlanmasa, hisob faqat o‘qish rejimiga o‘tadi (${GRACE_DAYS} kun mehr-muruvvat muddati). Ma’lumotlar ${DATA_RETENTION_DAYS} kun saqlanadi va to‘lovdan keyin to‘liq tiklanadi.`,
    'Bir kompaniya uchun sinov davri bir marta beriladi.',
  ] },
  { t: '4. Tariflar va to‘lov', p: [
    `Tariflar: ${PLANS.map((p) => `${p.name} — ${p.monthly ? p.monthly.toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' so‘m/oy' : 'kelishuv asosida'}`).join('; ')}. Narxlar ${VAT_RATE}% QQS bilan ko‘rsatilgan.`,
    'Yillik to‘lovda 12 oy uchun 10 oy narxi to‘lanadi (2 oy bepul). Qo‘shimcha foydalanuvchi — 29 000 so‘m/oy.',
    'To‘lov usullari: Payme, Click, Uzum Pay yoki yuridik shaxslar uchun bank o‘tkazmasi. Hisob-faktura to‘lov sanasida shakllantiriladi.',
    'Tarifni oshirishda farq mutanosib hisoblanadi; pasaytirish amaldagi to‘lov davri oxiridan kuchga kiradi.',
    'Hozircha to‘lovlar TEST rejimida: muvaffaqiyatli to‘lov haqiqiy pul harakati hisoblanmaydi va bu holat interfeysda aniq ko‘rsatiladi.',
  ] },
  { t: '5. Bekor qilish va qaytarish', p: [
    'Obunani istalgan vaqtda bekor qilish mumkin. Bekor qilgandan keyin xizmat joriy to‘lov davri oxirigacha ishlaydi.',
    `Bekor qilingandan keyin hisob o‘qish rejimiga o‘tadi; ma’lumotlar ${DATA_RETENTION_DAYS} kun saqlanadi va eksport qilish imkoniyati ochiq qoladi.`,
    'Xizmat ko‘rsatilmagan to‘liq oylar uchun qaytarish Foydalanuvchining yozma so‘rovi asosida 10 ish kuni ichida ko‘rib chiqiladi.',
  ] },
  { t: '6. Foydalanuvchi majburiyatlari', p: [
    'Foydalanuvchi hisob ma’lumotlari (parol, kirish) maxfiyligini ta’minlaydi va uchinchi shaxslarga bermaydi.',
    'Foydalanuvchi kiritgan ma’lumotlarning to‘g‘riligi va qonuniyligi uchun javobgar.',
    'Xizmatdan boshqa shaxslarning huquqlarini buzish, noqonuniy faoliyat yoki tizimga zarar yetkazish maqsadida foydalanish taqiqlanadi.',
  ] },
  { t: '7. Intellektual mulk', p: [
    'Dasturiy ta’minot, dizayn, matn va boshqa materiallar Xizmat ko‘rsatuvchiga tegishli. Foydalanuvchi faqat xizmatdan foydalanish huquqini oladi.',
    'Foydalanuvchi kiritgan biznes ma’lumotlari Foydalanuvchiga tegishli. Xizmat ko‘rsatuvchi ularni faqat xizmatni ko‘rsatish maqsadida qayta ishlaydi.',
  ] },
  { t: '8. Javobgarlik cheklovi', p: [
    'Xizmat “bor holatida” taqdim etiladi. Uzluksiz yoki xatosiz ishlashga kafolat berilmaydi.',
    'Bilvosita zararlar, foyda yo‘qotilishi yoki ma’lumotlarni yo‘qotish uchun javobgarlik soni o‘tgan 12 oyda to‘langan obuna summasi bilan cheklanadi.',
    'Reja bo‘yicha texnik xizmat ishlari oldindan e’lon qilinadi.',
  ] },
  { t: '9. Shartlarga o‘zgartirish', p: [
    'Shartlar yangilanishi mumkin. Muhim o‘zgarishlar haqida kamida 10 kun oldin email orqali xabar beriladi.',
    'O‘zgarishlardan keyin xizmatdan foydalanishni davom ettirish yangi tahrirga rozilik hisoblanadi.',
  ] },
  { t: '10. Qo‘llaniladigan huquq', p: [
    'Shartlar O‘zbekiston Respublikasi qonunchiligiga muvofiq tartibga solinadi.',
    'Nizolar muzokara yo‘li bilan hal qilinadi; kelishuv bo‘lmasa — Toshkent shahar sudlarida ko‘rib chiqiladi.',
  ] },
];

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Huquqiy hujjat</p>
        <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.025em] text-t1">Foydalanish shartlari (oferta)</h1>
        <p className="mt-2 text-[12.5px] text-t3">Tahrir sanasi: 2026-yil 1-sentyabr · Kuchga kirish: ro‘yxatdan o‘tish paytidan</p>
        <div className="mt-6 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.t}>
              <h2 className="text-[15.5px] font-semibold text-t1">{s.t}</h2>
              <div className="mt-2 space-y-2">{s.p.map((x, i) => <p key={i} className="text-[13px] leading-relaxed text-t2">{x}</p>)}</div>
            </section>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-surface-2 p-4 text-[12.5px] leading-relaxed text-t2">
          Savollar bo‘yicha: <Link href="/contact" className="font-semibold text-accent hover:underline">Aloqa sahifasi</Link> yoki legal@balans-ai.uz.
          Maxfiylik masalalari: <Link href="/privacy" className="font-semibold text-accent hover:underline">Maxfiylik siyosati</Link>.
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
