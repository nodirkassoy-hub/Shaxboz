import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://balans-ai.uz'),
  title: {
    default: 'BALANS AI — Biznesni boshqarish tizimi: buxgalteriya, savdo, ombor va AI CFO',
    template: '%s · BALANS AI',
  },
  description:
    'BALANS AI — O‘zbekiston bizneslari uchun AI bilan boshqariladigan yagona tizim: buxgalteriya, moliya, sotuv, xarid, ombor, ishlab chiqarish, HR, soliqlar va AI CFO. 30 kun bepul, bank kartasi talab qilinmaydi.',
  applicationName: 'BALANS AI',
  keywords: ['buxgalteriya', 'ERP', 'AI CFO', 'O‘zbekiston', 'soliqlar', 'QQS', 'ombor', 'ishlab chiqarish', 'biznes boshqaruv', 'moliyaviy tahlil'],
  authors: [{ name: 'BALANS AI' }],
  creator: 'BALANS AI',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg', apple: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    siteName: 'BALANS AI',
    title: 'BALANS AI — butun biznes bitta tizimda',
    description:
      'Buxgalteriya, moliya, sotuv, xarid, ombor, ishlab chiqarish, HR, soliqlar va AI CFO bitta platformada. 30 kun bepul sinov.',
    url: '/',
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: 'BALANS AI — DATA → AI TAHLIL → QAROR → HARAKAT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BALANS AI — butun biznes bitta tizimda',
    description: 'Buxgalteriya, savdo, ombor, ishlab chiqarish va AI CFO bitta tizimda. 30 kun bepul.',
    images: ['/og.svg'],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#070a12' },
    { media: '(prefers-color-scheme: light)', color: '#f4f6fb' },
  ],
};

/**
 * Mavzuni birinchi bo‘yashdan oldin qo‘llaydi (miltillash yo‘q).
 * Tizim shrifti ishlatiladi — tashqi font so‘rovi yo‘q, birinchi ko‘rinish tez.
 */
const THEME_BOOT = `try{var p=JSON.parse(localStorage.getItem('balans.pref.v4')||'{}');var d=p.theme!=='light';document.documentElement.classList.toggle('dark',d);if(p.lang)document.documentElement.lang=p.lang}catch(e){document.documentElement.classList.add('dark')}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
