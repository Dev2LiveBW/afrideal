import { Users, Package, ShieldCheck, Truck } from 'lucide-react';

export function StatsBanner() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6">
      {/*
        Four figures on one row at every width. Icons are 20px, stat text is
        10px on mobile scaling to 22px at sm, label is 7.5px / 12px.
        `overflow-hidden` on the row prevents any item from bleeding out.
      */}
      <div className="grid grid-cols-4 items-center gap-1 overflow-hidden rounded-2xl bg-[#111111] px-2 py-3 sm:gap-6 sm:px-8 sm:py-6">
        {[
          { icon: Users, stat: '100+', label: 'Verified Suppliers' },
          { icon: Package, stat: '10,000+', label: 'Products' },
          { icon: ShieldCheck, stat: 'Secure', label: 'Payments' },
          { icon: Truck, stat: 'Fast', label: 'Delivery' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-col items-center gap-0.5 text-center sm:flex-row sm:justify-center sm:gap-3 sm:text-left"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E67E22]/10 sm:h-10 sm:w-10">
              <item.icon className="h-3 w-3 text-[#E67E22] sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold leading-none text-white sm:text-[22px]">{item.stat}</p>
              <p className="truncate text-[7.5px] leading-tight text-white/60 sm:text-[12px]">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/*
 * `PromoCards` used to live here - three poster cards on their own row
 * (new arrivals, top rated, become a supplier). Their copy and routes now
 * turn over in the promo slot of the home feed, which is where the
 * benchmark puts its posters: see `components/storefront/home/promos.ts`
 * and `PromoCarousel.tsx`.
 */

/*
 * `TrustPaymentStrip` used to live here - the large boxed "Multiple Payment
 * Options / Buyer Protection / Easy Order Tracking" panel. It was replaced for
 * TICKET-005 by the compact single-row ribbon in
 * `components/storefront/InfoRibbon.tsx`, which says the same three things in
 * about a third of the height.
 */
