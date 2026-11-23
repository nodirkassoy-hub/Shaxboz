import type { MetadataRoute } from 'next';

/** Ommaviy sahifalar xaritasi. Yopiq bo‘limlar (app/account/checkout) kirmaydi. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shaxboz-mu.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; priority: number; freq: 'daily' | 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '/', priority: 1, freq: 'weekly' },
    { path: '/pricing', priority: 0.9, freq: 'weekly' },
    { path: '/signup', priority: 0.8, freq: 'monthly' },
    { path: '/login', priority: 0.4, freq: 'yearly' },
    { path: '/contact', priority: 0.6, freq: 'monthly' },
    { path: '/terms', priority: 0.3, freq: 'yearly' },
    { path: '/privacy', priority: 0.3, freq: 'yearly' },
  ];
  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
