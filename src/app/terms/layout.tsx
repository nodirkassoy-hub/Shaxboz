import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Foydalanish shartlari (oferta)',
  description:
    'BALANS AI xizmatidan foydalanish shartlari: obuna, 30 kunlik sinov, tarif limitlari, to‘lov, qaytarish, ma’lumotlarni saqlash va tomonlarning javobgarligi.',
  alternates: { canonical: '/terms' },
  openGraph: { url: '/terms', title: 'Foydalanish shartlari · BALANS AI' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
