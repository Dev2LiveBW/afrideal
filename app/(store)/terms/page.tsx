import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of sale (draft)' };

/**
 * The draft terms checkout links to (spec 0011, AC-10), taken from the wording
 * checkout already shows. Feature 17 replaces this with the client's legal pages
 * and changes `TERMS_VERSION` in lib/terms.ts.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-market px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <h1 className="font-display text-headline-lg font-semibold text-ink">Terms of sale</h1>
      <p className="mt-3 inline-block rounded bg-gold-50 px-2.5 py-1 text-[12.5px] font-medium text-gold-700">
        Draft, until our full legal pages are published
      </p>

      <div className="measure mt-6 space-y-4 text-[14px] leading-6 text-body">
        <p>
          Placing an order buys the goods from AfriDeal. We procure them from a verified supplier
          and hand them to your courier, who clears customs at the border and delivers them to you.
        </p>
        <p>
          We start sourcing once your payment is confirmed. No supplier is asked to prepare anything
          before then.
        </p>
        <p>
          We cover each order under our returns and refunds policy until seven days after delivery.
          If an order arrives late, short or not as described, tell us and we will replace it or
          refund you.
        </p>
      </div>
    </div>
  );
}
