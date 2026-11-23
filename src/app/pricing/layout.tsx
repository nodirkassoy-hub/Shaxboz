import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Narxlar va tariflar — 30 kun bepul',
  description: 'BALANS AI tariflari: START 199 000, BIZNES 499 000, ISHLAB CHIQARISH 999 000 so‘m/oy, KORPORATIV — kelishuv. Yillik to‘lovda 2 oy bepul.',
  alternates: { canonical: '/pricing' },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
