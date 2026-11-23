import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aloqa',
  description: 'BALANS AI bilan bog‘lanish: savol, demo o‘tkazish, KORPORATIV tarif taklifi. Toshkent, Amir Temur shoh ko‘chasi.',
  alternates: { canonical: '/contact' },
  openGraph: { url: '/contact', title: 'Aloqa · BALANS AI' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
