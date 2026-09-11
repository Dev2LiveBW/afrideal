import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, FileText, Layers, PackageSearch, PenLine } from 'lucide-react';

import { RfqStarter } from './RfqStarter';

/**
 * Request for Quotation - the landing. Alibaba benchmark §3b, measured live
 * on rfq.alibaba.com at 360px.
 *
 * The shape is the point: a coloured hero that says what this is, three
 * tiles for the common shapes of request, one free-text field, one button.
 * Everything else - quantity, budget, address, date - is the next step. A
 * buyer who has to fill seven fields before they know whether this is for
 * them fills none.
 *
 * Alibaba's benchmark numbers at 360px: page margin 12px; h1 18px 700
 * white; sub 13px; three tiles 109×94 at 12px radius on a translucent
 * wash; "Tell us what you need" 16px 700; textarea 64px with a 13px
 * placeholder in #999; CTA a 38px pill. The "How to use" section below is
 * white: 18px heading, 24px outlined step numbers on a connector, 13px
 * copy on a 94px pitch.
 *
 * Two things are deliberately not copied. The AI toggle - we have nothing
 * behind it, and a checked box that does nothing is a lie. The testimonial
 * carousel - we have no testimonials, and inventing one is worse.
 *
 * Royal is the hero's ground: it is the wholesale path's colour on this
 * storefront, and a quotation is the wholesale path.
 */

export const metadata: Metadata = {
  title: 'Request for Quotation',
  description:
    'Tell AfriDeal what you need - listed or not - and get a written quotation from a verified supplier or a runner.',
};

const POPULAR = [
  { icon: Layers, label: 'Bulk order', sub: '100+ units of a listing', href: '/browse?tier=CUSTOM' },
  { icon: PackageSearch, label: 'Not listed yet', sub: 'We find it and price it', href: '/rfq/details' },
  { icon: PenLine, label: 'Branded / custom', sub: 'Your logo, your spec', href: '/rfq/details?item=Branded%20' },
];

const STEPS = [
  {
    title: 'Describe what you need',
    body: 'What it is, roughly how many, and anything that matters - brand, size, colour, a photo if you have one.',
  },
  {
    title: 'We price it',
    body: 'A verified supplier quotes a listed product; a runner finds and prices anything else. You see the figure before anything is bought.',
  },
  {
    title: 'Approve and pay AfriDeal',
    body: 'One invoice, from us. We buy from the supplier, deliver to you, and a wrong order is ours to fix.',
  },
];

export default function RfqLandingPage() {
  return (
    <div className="mx-auto max-w-[480px] pb-24">
      {/* ── Sticky header, on the hero's ground ────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-royal px-3 py-3 text-white">
        <Link href="/" aria-label="Back" className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10">
          <ChevronLeft size={22} strokeWidth={2.25} />
        </Link>
        <span className="rounded bg-[#E67E22] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wide">
          RFQ
        </span>
        <h1 className="text-[18px] font-bold leading-none">Request for Quotation</h1>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="bg-royal px-3 pb-5 pt-4 text-white">
        <h2 className="text-[18px] font-bold leading-tight">Get quotes for what you need</h2>
        <p className="mt-1 text-[13px] leading-5 text-white/85">
          Listed or not. Verified suppliers, runners, one written price.
        </p>

        <p className="mt-4 text-[13px] text-white/90">Popular requests</p>
        <ul className="mt-2 grid grid-cols-3 gap-1">
          {POPULAR.map(({ icon: Icon, label, sub, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="flex h-[94px] flex-col items-center justify-center gap-1.5 rounded-[12px] bg-white/15 px-1.5 text-center transition-colors hover:bg-white/25"
              >
                <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                <span className="text-[11px] font-medium leading-tight">{label}</span>
                <span className="text-[9.5px] leading-tight text-white/70">{sub}</span>
              </Link>
            </li>
          ))}
        </ul>

        <a href="#how-it-works" className="mt-3 inline-flex items-center gap-1 text-[11px] text-white/80 underline underline-offset-2">
          <FileText size={11} strokeWidth={2} aria-hidden="true" />
          How a quotation works
        </a>

        {/* ── Tell us what you need ──────────────────────────────── */}
        <h3 className="mt-5 text-[16px] font-bold">Tell us what you need</h3>
        <RfqStarter className="mt-2" />
      </section>

      {/* ── How to use ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-surface-raised px-5 pb-6 pt-7">
        <h2 className="text-[18px] font-bold text-ink">How to use a quotation</h2>
        <ol className="relative mt-5">
          {/* the connector, behind the numbers */}
          <span aria-hidden="true" className="absolute bottom-6 left-3 top-3 w-px bg-hairline-strong" />
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-3 pb-6 last:pb-0">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink bg-surface-raised font-mono text-[12px] text-ink">
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-bold leading-4 text-ink">{step.title}</p>
                <p className="mt-1 text-[13px] leading-[1.45] text-ink/85">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
