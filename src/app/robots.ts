import type { MetadataRoute } from 'next';
import { SITE_URL, NOINDEX_PATHS } from '@/lib/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Yopiq (autentifikatsiya talab qiladigan) bo‘limlar indekslanmasin
        disallow: NOINDEX_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
