import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { DATA_RETENTION_DAYS } from '@/lib/config/pricing';

export const metadata: Metadata = {
  title: 'Maxfiylik siyosati',
  description: 'BALANS AI qanday ma’lumot yig‘adi, qanday saqlaydi va himoya qiladi.',
};

const SECTIONS = [
  { t: '1. Qanday ma’lumot yig‘amiz', p: [
    'Ro‘yxatdan o‘tish ma’lumotlari: ism, telefon, email, kompaniya nomi, STIR (ixtiyoriy), parol (faqat shifrlangan ko‘rinishda saqlanadi).',
    'Biznes ma’lumotlari: kontragentlar, mahsulotlar, hisob-fakturalar, operatsiyalar, xodimlar, ombor harakatlari va boshqa Foydalanuvchi kiritgan yozuvlar.',
    'Texnik ma’lumotlar: brauzer turi, qurilma, sessiya vaqti, xatolik jurnallari — xizmat sifatini ta’minlash uchun.',
  ] },
  { t: '2. Ma’lumotlardan foydalanish', p: [
    'Xizmatni ko‘rsatish, hisobot va tahlillarni shakllantirish, AI CFO javoblarini hisoblash.',
    'Hisob-faktura va to‘lov hujjatlarini rasmiylashtirish, qo‘llab-quvvatlash so‘rovlariga javob berish.',
    'Xizmat xavfsizligini ta’minlash va suiiste’mollikni aniqlash.',
    'Ma’lumotlar reklama maqsadida uchinchi shaxslarga sotilmaydi.',
  ] },
  { t: '3. Ma’lumotlar izolyatsiyasi (multi-tenant)', p: [
    'Har bir kompaniya ma’lumoti alohida ajratilgan (tenant). Kompaniya foydalanuvchilari faqat o‘z kompaniyasi ma’lumotlarini ko‘radi.',
    'Rollar bo‘yicha kirish cheklanadi: xodim faqat o‘z rolidagi modullarni ko‘radi.',
    'Barcha kirish va o‘zgarishlar audit jurnalida qayd etiladi.',
  ] },
  { t: '4. Saqlash muddati', p: [
    `Faol hisob ma’lumotlari obuna davomida saqlanadi. To‘lovsiz yoki bekor qilingan hisob ma’lumotlari ${DATA_RETENTION_DAYS} kun saqlanadi, so‘ng o‘chiriladi.`,
    'Foydalanuvchi istalgan vaqtda ma’lumotlarini Excel/CSV/PDF ko‘rinishida eksport qilishi mumkin.',
    'Hisobni butunlay o‘chirish so‘rovi qo‘llab-quvvatlash orqali yuboriladi va 30 kun ichida bajariladi.',
  ] },
  { t: '5. Xavfsizlik', p: [
    'Parollar bir tomonlama shifrlash (hashing) bilan saqlanadi va hech qachon ochiq matnda ko‘rinmaydi.',
    'Ma’lumot uzatish TLS (HTTPS) orqali amalga oshiriladi.',
    'Tashqi integratsiya kalitlari faqat server muhit o‘zgaruvchilarida saqlanadi va brauzerga chiqarilmaydi.',
  ] },
  { t: '6. Uchinchi tomonlar', p: [
    'To‘lov provayderlari (Payme, Click, Uzum Pay) — faqat to‘lovni amalga oshirish uchun zarur ma’lumot.',
    'Bulutli infratuzilma provayderi — ma’lumotlarni saqlash va hisoblash uchun.',
    'Hozirgi demo versiyada tashqi tizimlar ulanmagan; kiritilgan ma’lumotlar faqat demo bazada qayta ishlanadi.',
  ] },
  { t: '7. Foydalanuvchi huquqlari', p: [
    'O‘z ma’lumotlarini ko‘rish, tuzatish va eksport qilish huquqi.',
    'Ma’lumotlarni o‘chirishni so‘rash huquqi.',
    'Reklamaviy xabarnomalardan voz kechish huquqi (xizmat uchun zarur xabarlar bundan mustasno).',
  ] },
  { t: '8. Cookie va lokal saqlash', p: [
    'Sessiya va sozlamalar (til, mavzu, filtrlar) uchun brauzerning lokal saqlash (localStorage) ishlatiladi.',
    'Tahliliy cookie fayllar hozirgi versiyada ishlatilmaydi.',
  ] },
  { t: '9. Aloqa', p: ['Maxfiylik bo‘yicha savollar: privacy@balans-ai.uz. Javob muddati — 5 ish kuni.'] },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Huquqiy hujjat</p>
        <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.025em] text-t1">Maxfiylik siyosati</h1>
        <p className="mt-2 text-[12.5px] text-t3">Tahrir sanasi: 2026-yil 1-sentyabr</p>
        <div className="mt-6 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.t}>
              <h2 className="text-[15.5px] font-semibold text-t1">{s.t}</h2>
              <div className="mt-2 space-y-2">{s.p.map((x, i) => <p key={i} className="text-[13px] leading-relaxed text-t2">{x}</p>)}</div>
            </section>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-surface-2 p-4 text-[12.5px] leading-relaxed text-t2">
          Foydalanish shartlari bilan tanishib chiqing: <Link href="/terms" className="font-semibold text-accent hover:underline">Oferta</Link>. Savollar: <Link href="/contact" className="font-semibold text-accent hover:underline">Aloqa</Link>.
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
