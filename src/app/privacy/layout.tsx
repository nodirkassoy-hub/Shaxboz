import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Maxfiylik siyosati',
  description:
    'BALANS AI qanday ma’lumot yig‘adi, qanday saqlaydi va kim bilan bo‘lishadi. Ma’lumotlar O‘zbekiston hududida saqlanadi, uchinchi tomonga sotilmaydi.',
  alternates: { canonical: '/privacy' },
  openGraph: { url: '/privacy', title: 'Maxfiylik siyosati · BALANS AI' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
