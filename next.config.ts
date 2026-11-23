import type { NextConfig } from 'next';

/**
 * Xavfsizlik sarlavhalari (OWASP asosiy to‘plami).
 *
 * CSP: `unsafe-inline` — Next.js inline bootstrap skriptlari va Tailwind inline
 * uslublari uchun zarur. `unsafe-eval` faqat dev rejimida (React refresh).
 * Tashqi resurslar yo‘q: shriftlar/system, rasmlar lokal SVG.
 */
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  // HTTPS 2 yil, subdomenlar bilan (Vercel allaqachon HTTPS beradi — HSTS qat’iy qiladi)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Demo API uzoq keshlanadi (kontent o‘zgarmas)
      {
        source: '/api/db/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

export default nextConfig;
