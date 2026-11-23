import type { MetadataRoute } from 'next';
import { SITE_URL } from './sitemap';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Yopiq (autentifikatsiya talab qiladigan) bo‘limlar indekslanmasin
        disallow: ['/app', '/account', '/checkout', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
