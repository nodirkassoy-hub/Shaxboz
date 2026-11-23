import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kirish',
  description: 'BALANS AI hisobingizga kirish. Demo rejimni sinash uchun ro‘yxatdan o‘tish shart emas.',
  alternates: { canonical: '/login' },
  openGraph: { url: '/login', title: 'Kirish · BALANS AI', description: 'Hisobingizga kirib ishni davom ettiring.' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
