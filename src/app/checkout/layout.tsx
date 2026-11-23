import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tarifni tanlash va to‘lov',
  description: 'Tarifni tanlang va to‘lovni amalga oshiring. Hozircha to‘lov oqimi test rejimida — haqiqiy pul yechilmaydi.',
  robots: { index: false, follow: false },
  openGraph: { url: '/checkout', title: 'Tarifni tanlash va to‘lov · BALANS AI' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
