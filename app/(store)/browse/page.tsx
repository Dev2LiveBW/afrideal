import type { Metadata } from 'next';

import { auth } from '@/lib/auth';
import { readAll } from '@/lib/db';
import { getCatalogue } from '@/lib/queries';
import { rankOffers } from '@/lib/supplier-selection';
import { doorFor, parseTier, tierDoors } from '@/lib/tier-doors';

import { BrowseClient } from './BrowseClient';

export const metadata: Metadata = { title: 'Browse' };
export const dynamic = 'force-dynamic';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; tier?: string };
}) {
  const [{ categories, products }, images, offers, suppliers, bands, session] = await Promise.all([
    getCatalogue(),
    readAll('product-images'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('customer-prices'),
    auth(),
  ]);

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const customerType = session?.user?.customer_type ?? 'GUEST';

  /*
   * The rung comes off the URL, so the three doors on the landing page land
   * somewhere that actually honours them. An unrecognised value falls back to
   * the default view rather than 404-ing a browse route.
   */
  const tier = parseTier(searchParams.tier);

  // Resolve the routed supplier here so quick-add books against a real one.
  const enriched = products.map((product) => {
    const door = tier ? doorFor(bands, product, tier, customerType) : null;

    return {
      ...product,
      categoryName: categoryName.get(product.category_id),
      primarySupplierId:
        rankOffers(
          offers.filter((offer) => offer.product_id === product.id),
          suppliers,
        ).primary?.supplier.id ?? '',
      // Only attached when a rung is selected; the default grid keeps showing
      // the product's own list price.
      tierPrice: door?.unitPrice ?? null,
      tierSavingPct: door?.savingPct ?? 0,
      tierLocked: door?.locked ?? false,
      // Parsed off the band range ("5–19" → 5) so quick-add can take the
      // quantity that actually earns the price the card is showing.
      tierMinQty: door?.range ? Number.parseInt(door.range, 10) : undefined,
    };
  });

  /*
   * The switch is described by whichever product the ladder is deepest on, so
   * the quantity ranges shown on the control are real rather than invented.
   * Ranges are consistent across the catalogue in the seeded data; picking one
   * product keeps this honest if that ever stops being true.
   */
  const shape = tierDoors(bands, products[0], customerType);

  const params = (next: string | null) => {
    const search = new URLSearchParams();
    if (searchParams.category) search.set('category', searchParams.category);
    if (searchParams.q) search.set('q', searchParams.q);
    if (next) search.set('tier', next);
    const query = search.toString();
    return query ? `/browse?${query}` : '/browse';
  };

  const tierOptions = shape.map((door) => ({
    tier: door.tier,
    label: door.label,
    range: door.range ? `${door.range}` : null,
    locked: door.locked,
    // Selecting the active rung again clears it, so the control is also the way
    // back to the default view.
    href: params(tier === door.tier ? null : door.tier),
  }));

  return (
    <div className="mx-auto max-w-market px-6 pb-24 pt-28">
      <BrowseClient
        categories={categories}
        products={enriched}
        images={images}
        initialCategory={searchParams.category ?? 'all'}
        initialQuery={searchParams.q ?? ''}
        tier={tier}
        tierOptions={tierOptions}
      />
    </div>
  );
}
