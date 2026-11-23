import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '30 kun bepul ro‘yxatdan o‘tish',
  description:
    'BALANS AI uchun bepul hisob oching: 30 kun to‘liq funksiyalar, bank kartasi talab qilinmaydi. Ism, kompaniya va telefon raqam kifoya.',
  alternates: { canonical: '/signup' },
  openGraph: { url: '/signup', title: '30 kun bepul · BALANS AI' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
