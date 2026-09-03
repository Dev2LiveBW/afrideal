import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

import { Providers } from '@/app/providers';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AfriDeal — Africa’s Marketplace. Your Way.',
    template: '%s · AfriDeal',
  },
  description:
    'A escrow-backed marketplace connecting verified suppliers across Botswana and South Africa with buyers who need the goods to actually arrive.',
  icons: { icon: '/afrideal-mark.svg' },
};

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
  // The storefront pins a tab bar to the bottom of the viewport, so the page
  // has to run under the home indicator and pad itself back out with
  // `env(safe-area-inset-bottom)`. That inset is only non-zero under
  // `viewport-fit=cover`.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-BW" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/*
          Satoshi carries display and headline. Geist is self-hosted through the
          npm package and takes over if Fontshare is unreachable, so the page
          never falls back to a system sans.
        */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,600,500,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
