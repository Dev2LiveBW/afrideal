import type { CustomerPrice, CustomerType, PricingTier, Product } from '@/types';
import { bandRange, priceLadder } from '@/lib/pricing-tiers';
import { LADDER, QUOTATION_THRESHOLD } from '@/lib/pricing-model';

/**
 * The three doors: retail, bulk, wholesale — priced from real bands.
 *
 * The storefront's argument is that a product does not have one price. It has a
 * published ladder, and the buyer decides which rung they stand on by deciding
 * how much they take. This turns `customer-prices` into the three entrances
 * that argument needs, priced against one real product so the figures are
 * concrete rather than illustrative.
 *
 * The first two rungs carry a published figure. The third does not, and should
 * not pretend otherwise: past a hundred units the price depends on the volume,
 * the delivery point and the lead time, so it is quoted rather than listed.
 * Naming that plainly is more useful than inventing a number for it.
 *
 * Nothing here touches supplier cost. Bands are published customer-facing
 * prices, and `CustomerPrice` has no cost field to leak.
 */

export type DoorTier = Extract<PricingTier, 'RETAIL' | 'BULK' | 'WHOLESALE'>;

export interface TierDoor {
  tier: DoorTier;
  /** `Retail`, `Bulk`, `Wholesale`. */
  label: string;
  /** What buying at this rung actually means, in the buyer's terms. */
  blurb: string;
  /** `1–4`, `5–99`, `100+` — from the live band, never hard-coded. */
  range: string | null;
  /** The published unit price at this rung. Null on the quotation rung. */
  unitPrice: number | null;
  /** Pula off the retail rung, per unit. Zero on the retail rung itself. */
  savingPerUnit: number;
  savingPct: number;
  /** True on the wholesale rung, which is answered by a quotation. */
  byQuotation: boolean;
  href: string;
}

const DOOR_TIERS: DoorTier[] = ['RETAIL', 'BULK', 'WHOLESALE'];

const COPY: Record<DoorTier, { label: string; blurb: string }> = {
  RETAIL: {
    label: 'Retail',
    blurb: 'One or a few units, for the household or the shop counter.',
  },
  BULK: {
    label: 'Bulk',
    blurb: 'Restocking a salon, a spaza or a small site.',
  },
  WHOLESALE: {
    label: 'Wholesale',
    blurb: 'Volume orders, quoted against your delivery point and lead time.',
  },
};

/**
 * Price the three doors against one product.
 *
 * The featured product is passed in rather than chosen here: the caller already
 * knows which product it is showing, and pricing the doors against a different
 * one would put figures on screen that the page never explains.
 *
 * `customerType` no longer gates which rungs are visible — the published ladder
 * is the same for everyone — but it still selects the buyer's own bands, so an
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
    const { label, blurb } = COPY[tier];

    if (tier === 'WHOLESALE') {
      return {
        tier,
        label,
        blurb,
        range: `${QUOTATION_THRESHOLD}+`,
        unitPrice: null,
        savingPerUnit: 0,
        savingPct: 0,
        byQuotation: true,
        href: '/browse?tier=WHOLESALE',
      };
    }

    /*
     * The band shown is the cheapest one this account could be given at this
     * rung — the rung's best case, which is what a buyer comparing doors wants.
     */
    const atTier = ladder.filter((band) => matchesDoor(band, tier));
    const shown = atTier[atTier.length - 1] ?? null;

    if (!shown) {
      return {
        tier,
        label,
        blurb,
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
 * the retail door and leave it showing nothing at all.
 */
function matchesDoor(band: CustomerPrice, tier: Exclude<DoorTier, 'WHOLESALE'>): boolean {
  if (band.pricing_tier === tier) return true;
  if (band.pricing_tier !== 'PROMOTIONAL') return false;

  const rung = LADDER.find((entry) => entry.tier === tier);
  return rung != null && band.minimum_quantity >= rung.minimum_quantity &&
    band.minimum_quantity <= rung.maximum_quantity;
}

function rangeFallback(tier: Exclude<DoorTier, 'WHOLESALE'>): string | null {
  const rung = LADDER.find((entry) => entry.tier === tier);
  return rung ? `${rung.minimum_quantity}–${rung.maximum_quantity}` : null;
}

/**
 * The retail-to-bulk spread for a product, for the "same ladder, every product"
 * proof strip. Returns null when a product has no ladder worth showing, so the
 * strip can skip it rather than render a flat row.
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
 * One product's door at a named tier, for the catalogue grid.
 *
 * `/browse?tier=BULK` has to mean something, or the ladder on the landing page
 * is a promise the next click breaks. This gives every card the same published
 * figure the ladder quoted, resolved through exactly the same rules — so a
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

/** Narrow an untrusted `?tier=` value to a real door, or null for the default view. */
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
