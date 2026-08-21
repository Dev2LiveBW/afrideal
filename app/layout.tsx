import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

import { Providers } from '@/app/providers';

import './globals.css';

/**
 * Satoshi, self-hosted.
 *
 * It used to arrive from Fontshare as a render-blocking third-party stylesheet,
 * with `--font-satoshi` falling back to Geist — the body face. Any hiccup at
 * that CDN and the display voice silently became the text voice, which erases
 * the type contrast the whole visual system is built on. One 41kb variable file
 * covering 300–900 removes both the dependency and the fallback that hid it.
 */
const satoshi = localFont({
  src: '../public/fonts/Satoshi-Variable.woff2',
  weight: '300 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-satoshi',
  // A display face wants a display fallback. Georgia is wrong for this world,
  // so the stack stays grotesque and simply accepts the metric shift.
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
});

export const metadata: Metadata = {
  title: {
    default: 'AfriDeal — Africa’s Marketplace. Your Way.',
    template: '%s · AfriDeal',
  },
  description:
    'A procurement marketplace for Botswana and South Africa. Published prices at every quantity, verified suppliers, and delivery you can follow.',
  icons: { icon: '/afrideal-mark.svg' },
};

export const viewport: Viewport = {
  themeColor: '#111111',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-BW"
      className={`${GeistSans.variable} ${GeistMono.variable} ${satoshi.variable}`}
    >
      <body>
        {/*
          The direction contract, emitted as a real HTML comment.

          A JSX comment would be the obvious way to write this and is exactly
          wrong: React treats it as a JavaScript comment and the compiler drops
          it, so the contract vanishes from the built output and nobody can
          audit the shipped page against the decision that produced it.
        */}
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `<!--
  THESIS: The buyer can compare the price before committing. A product here
    publishes what it costs at one unit and at fifty, with no account and no
    enquiry in between. Refuses the marketplace default of a single price plus
    a hidden "contact us for wholesale".
  OWN-WORLD: AfriDeal ink/gold/forest on warm neutrals, Satoshi display, mono
    tabular money. Structure is a descending ladder: rungs step down and to the
    right, cheaper rungs carry more weight.
  STORY: The buyer sees one hair line — the category the business actually
    sells — at its real published rungs, learns the price is a function of
    quantity alone, and enters the catalogue through the rung that matches how
    they buy.
  FIRST VIEWPORT: Left, the comparison stated in one line. Right, one real
    product on its ladder with live BWP figures: two published rungs and a
    third answered by quotation. The rungs are the primary action; each opens
    the catalogue at that tier.
  FORM: Three-door split, candidate 2 of 7, user-pinned over assigned candidate
    7. Seed key 9326abdf.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
    finish review, the verdict, and DESIGN.md
-->`,
          }}
        />

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
