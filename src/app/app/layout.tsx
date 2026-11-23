import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Boshqaruv paneli',
  description: 'BALANS AI boshqaruv paneli demo: buxgalteriya, moliya, sotuv, ombor, ishlab chiqarish, HR, soliqlar va AI CFO.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
