import type { CustomerPrice, CustomerType, Product } from '@/types';
import { bandRange, priceLadder } from '@/lib/pricing-tiers';
import { LADDER, QUOTATION_THRESHOLD, type PublishedTier } from '@/lib/pricing-model';

/**
 * The five packages: retail, bulk, wholesale, wholesale+, custom - priced from
 * real bands.
 *
 * The storefront's argument is that a product does not have one price. It has a
 * published ladder, and the buyer decides which rung they stand on by deciding
 * how much they take. This turns `customer-prices` into the packages that
 * argument needs, priced against one real product so the figures are concrete
 * rather than illustrative.
 *
 * The first four rungs carry a published figure. The fifth does not, and should
 * not pretend otherwise: past a hundred units the price depends on the volume,
 * the delivery point and the lead time, so it is quoted rather than listed.
 * Naming that plainly is more useful than inventing a number for it.
 *
 * This board is the baseline for every product on the platform. A product does
 * not get its own tier structure, its own quantity breaks or its own hidden
 * rung - it gets these five, resolved through these rules, on every surface
 * that quotes a price.
 *
 * Nothing here touches supplier cost. Bands are published customer-facing
 * prices, and `CustomerPrice` has no cost field to leak.
 */

/**
 * `CUSTOM` is the quotation package. It is a door on the board rather than a
 * price band, so it is not a `PricingTier` - there is no row in
 * `customer-prices` it could ever resolve to, and typing it as one would invite
 * a lookup that always comes back empty.
 */
export type DoorTier = PublishedTier | 'CUSTOM';

/** How a package is drawn wherever the board appears. One accent per rung. */
export type DoorAccent = 'forest' | 'ocean' | 'gold' | 'royal' | 'ink';

export interface TierDoor {
  tier: DoorTier;
  /** `Retail`, `Bulk`, `Wholesale`, `Wholesale+`, `Custom / Institutional`. */
  label: string;
  /** What buying at this rung actually means, in the buyer's terms. */
  blurb: string;
  /** The one-word claim the package makes, or null on the entry rung. */
  badge: string | null;
  accent: DoorAccent;
  /** `1–4`, `5–19`, `100+` - from the live band, never hard-coded. */
  range: string | null;
  /** The published unit price at this rung. Null on the quotation rung. */
  unitPrice: number | null;
  /** Pula off the retail rung, per unit. Zero on the retail rung itself. */
  savingPerUnit: number;
  savingPct: number;
  /** True on the custom rung, which is answered by a quotation. */
  byQuotation: boolean;
  href: string;
}

const DOOR_TIERS: DoorTier[] = [...LADDER.map((rung) => rung.tier), 'CUSTOM'];

/**
 * The package copy, in the buyer's language rather than the platform's.
 *
 * Every line answers "is this me?" before it answers "what does it cost?" - a
 * quantity range on its own tells a salon owner nothing about whether the
 * wholesale rung is meant for her.
 */
const COPY: Record<DoorTier, { label: string; blurb: string; badge: string | null; accent: DoorAccent }> = {
  RETAIL: {
    label: 'Retail',
    blurb: 'Standard everyday prices. Perfect for personal shopping.',
    badge: null,
    accent: 'forest',
  },
  BULK: {
    label: 'Bulk',
    blurb: 'Lower prices when you buy more. Great for families and small resellers.',
    badge: 'Save more',
    accent: 'ocean',
  },
  WHOLESALE: {
    label: 'Wholesale',
    blurb: 'Better prices for your business. Stock more, save more.',
    badge: 'Best value',
    accent: 'gold',
  },
  WHOLESALE_PLUS: {
    label: 'Wholesale+',
    blurb: 'Our best published prices. For serious resellers and businesses.',
    badge: 'Maximum savings',
    accent: 'royal',
  },
  CUSTOM: {
    label: 'Custom / Institutional',
    blurb: 'Tailored pricing for large orders. Talk to our team for the best deal.',
    badge: 'Get a quote',
    accent: 'ink',
  },
};

/** The example quantity each package is priced at when the board shows one. */
export const DOOR_EXAMPLE_QUANTITY: Record<DoorTier, number> = {
  RETAIL: 1,
  BULK: 10,
  WHOLESALE: 20,
  WHOLESALE_PLUS: 50,
  CUSTOM: QUOTATION_THRESHOLD,
};

/**
 * Price the five packages against one product.
 *
 * The featured product is passed in rather than chosen here: the caller already
 * knows which product it is showing, and pricing the packages against a
 * different one would put figures on screen that the page never explains.
 *
 * `customerType` no longer gates which rungs are visible - the published ladder
 * is the same for everyone - but it still selects the buyer's own bands, so an
 * account priced under a negotiated agreement sees its own figures.
 */
export function tierDoors(
  bands: CustomerPrice[],
  product: Product,
  customerType: CustomerType,
): TierDoor[] {
  const ownLadder = priceLadder(bands, product.id, customerType);
  const ladder = ownLadder.length > 0 ? ownLadder : priceLadder(bands, product.id, 'RETAIL');
  const retailBase = ladder[0]?.unit_price ?? product.price;

  return DOOR_TIERS.map((tier) => {
    const { label, blurb, badge, accent } = COPY[tier];

    if (tier === 'CUSTOM') {
      return {
        tier,
        label,
        blurb,
        badge,
        accent,
        range: `${QUOTATION_THRESHOLD}+`,
        unitPrice: null,
        savingPerUnit: 0,
        savingPct: 0,
        byQuotation: true,
        href: '/browse?tier=CUSTOM',
      };
    }

    /*
     * The band shown is the cheapest one this account could be given at this
     * rung - the rung's best case, which is what a buyer comparing packages
     * wants.
     */
    const atTier = ladder.filter((band) => matchesDoor(band, tier));
    const shown = atTier[atTier.length - 1] ?? null;

    if (!shown) {
      return {
        tier,
        label,
        blurb,
        badge,
        accent,
        range: rangeFallback(tier),
        unitPrice: null,
        savingPerUnit: 0,
        savingPct: 0,
        byQuotation: false,
        href: `/browse?tier=${tier}`,
      };
    }

    const saving = retailBase - shown.unit_price;

    return {
      tier,
      label,
      blurb,
      badge,
      accent,
      range: bandRange(shown),
      unitPrice: shown.unit_price,
      savingPerUnit: saving,
      savingPct: retailBase === 0 ? 0 : (saving / retailBase) * 100,
      byQuotation: false,
      href: `/browse?tier=${tier}`,
    };
  });
}

/**
 * A promotional band still belongs to the rung whose quantity range it sits on.
 * Matching on the tier name alone would drop a discounted retail price out of
 * the retail package and leave it showing nothing at all.
 */
function matchesDoor(band: CustomerPrice, tier: PublishedTier): boolean {
  if (band.pricing_tier === tier) return true;
  if (band.pricing_tier !== 'PROMOTIONAL') return false;

  const rung = LADDER.find((entry) => entry.tier === tier);
  return rung != null && band.minimum_quantity >= rung.minimum_quantity &&
    band.minimum_quantity <= rung.maximum_quantity;
}

function rangeFallback(tier: PublishedTier): string | null {
  const rung = LADDER.find((entry) => entry.tier === tier);
  return rung ? `${rung.minimum_quantity}–${rung.maximum_quantity}` : null;
}

/** The package a given quantity stands on, for "you are on the Retail tier". */
export function doorForQuantity(quantity: number): DoorTier {
  const rung = LADDER.find(
    (entry) => quantity >= entry.minimum_quantity && quantity <= entry.maximum_quantity,
  );
  return rung?.tier ?? 'CUSTOM';
}

/**
 * The retail-to-cheapest spread for a product, for the "same ladder, every
 * product" proof strip. Returns null when a product has no ladder worth
 * showing, so the strip can skip it rather than render a flat row.
 */
export function ladderSpread(
  bands: CustomerPrice[],
  product: Product,
): { from: number; to: number; pct: number; lowestRange: string } | null {
  const ladder = priceLadder(bands, product.id, 'RETAIL');
  if (ladder.length < 2) return null;

  const from = ladder[0].unit_price;
  const cheapest = ladder[ladder.length - 1];
  if (cheapest.unit_price >= from) return null;

  return {
    from,
    to: cheapest.unit_price,
    pct: ((from - cheapest.unit_price) / from) * 100,
    lowestRange: bandRange(cheapest),
  };
}

/**
 * One product's package at a named tier, for the catalogue grid.
 *
 * `/browse?tier=BULK` has to mean something, or the ladder on the landing page
 * is a promise the next click breaks. This gives every card the same published
 * figure the ladder quoted, resolved through exactly the same rules - so a
 * price cannot disagree with itself between two surfaces.
 */
export function doorFor(
  bands: CustomerPrice[],
  product: Product,
  tier: DoorTier,
  customerType: CustomerType,
): TierDoor | null {
  return tierDoors(bands, product, customerType).find((door) => door.tier === tier) ?? null;
}

/** Narrow an untrusted `?tier=` value to a real package, or null for the default view. */
export function parseTier(value: string | undefined): DoorTier | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return (DOOR_TIERS as string[]).includes(upper) ? (upper as DoorTier) : null;
}

/**
 * The next rung down from a given quantity, as the buyer should see it.
 *
 * Falls back to the retail ladder so a signed-out visitor filling a cart is
 * still told about the quantity break sitting just above them. That is the one
 * place the ladder most needs to speak.
 */
export function nextRung(
  bands: CustomerPrice[],
  productId: string,
  quantity: number,
  customerType: CustomerType,
  variantId: string | null = null,
): { band: CustomerPrice; locked: boolean } | null {
  const own = priceLadder(bands, productId, customerType, variantId).find(
    (band) => band.minimum_quantity > quantity,
  );
  if (own) return { band: own, locked: false };

  const fallback = priceLadder(bands, productId, 'RETAIL', variantId).find(
    (band) => band.minimum_quantity > quantity,
  );

  return fallback ? { band: fallback, locked: false } : null;
}
