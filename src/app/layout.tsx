import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BALANS AI — AI-powered Business Management',
  description: 'Butun biznesni bitta tizimda boshqaring: buxgalteriya, moliya, sotuv, xarid, ombor, ishlab chiqarish, HR, soliqlar va AI CFO.',
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#070a12' }, { media: '(prefers-color-scheme: light)', color: '#f4f6fb' }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `try{var p=JSON.parse(localStorage.getItem('balans.pref.v3')||'{}');if(p.theme==='light')document.documentElement.classList.remove('dark')}catch(e){}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
