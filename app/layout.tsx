import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { CookieConsentModal } from '@/components/common/CookieConsentModal';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
});

function getMetadataBase() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }

  return new URL('http://localhost:3000');
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'wayflo',
  description: 'Smart travel planning that keeps your routes, timing, and ideas in flow.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'wayflo',
    description: 'Smart travel planning that keeps your routes, timing, and ideas in flow.',
    url: '/',
    siteName: 'wayflo',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'wayflo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'wayflo',
    description: 'Smart travel planning that keeps your routes, timing, and ideas in flow.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakartaSans.className} bg-background text-foreground`}>
        {children}
        <CookieConsentModal />
      </body>
    </html>
  );
}
