import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Obuna va tarif · BALANS AI',
  description:
    'Joriy tarif, sinov davri qolgan kunlari, foydalanilgan limitlar, to‘lov usullari va hisob-fakturalar tarixi. 30 kun bepul, karta talab qilinmaydi.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/subscription' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
