import type { MetadataRoute } from 'next';

function baseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard', '/trip/', '/rooms', '/explore', '/reset-password', '/verify-email'],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
