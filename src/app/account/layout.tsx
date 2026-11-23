import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Hisob va obuna', description: 'Joriy tarif, to‘lovlar tarixi, jamoa va sozlamalar.', robots: { index: false, follow: false }, alternates: { canonical: '/account' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
