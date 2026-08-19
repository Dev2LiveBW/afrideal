import type { CustomerPrice, CustomerType, PricingTier, Product } from '@/types';
import { TIERS_BY_CUSTOMER_TYPE, bandRange, canReachTier, priceLadder } from '@/lib/pricing-tiers';

/**
 * The three doors: retail, bulk, wholesale, priced from real bands.
 *
 * The storefront's whole argument is that a product does not have one price, it
 * has a ladder, and the buyer chooses the rung. This turns `customer-prices`
 * into the three entrances that argument needs, against one featured product so
 * the figures are concrete rather than illustrative.
 *
 * §7 does most of the work here, and the distinction it turns on is between
 * being *quoted* a price and being *shown* one. A guest may only be quoted
 * retail; a retail account reaches bulk; wholesale needs a business, reseller
 * or institutional account. But every one of these bands is a published
 * customer price, not a negotiated one, so a rung the visitor cannot yet buy at
 * is still shown at its real figure with the condition to reach it named.
 *
 * Withholding those figures would have been the cautious read, and it would
 * have made a catalogue priced on three rungs look like a catalogue priced on
 * one. What §7 governs is what checkout applies, and checkout still resolves
 * against the account's own type — `resolvePrice` is untouched by anything
 * here.
 *
 * Nothing here touches supplier cost. Bands are published customer-facing
 * prices; §5 confidentiality is unaffected because `CustomerPrice` has no cost
 * field to leak.
 */

export type DoorTier = Extract<PricingTier, 'RETAIL' | 'BULK' | 'WHOLESALE'>;

export interface TierDoor {
  tier: DoorTier;
  /** `Retail`, `Bulk`, `Wholesale`. */
  label: string;
  /** What buying at this rung actually means, in the buyer's terms. */
  blurb: string;
  /** `1–4`, `5–19`, `20+` — from the live band, never hard-coded. */
  range: string | null;
  /** The published unit price at this rung. Shown whether or not it is yet reachable. */
  unitPrice: number | null;
  /** Pula off the retail rung, per unit. Zero on the retail rung itself. */
  savingPerUnit: number;
  savingPct: number;
  /** True when §7 puts this rung out of reach of the current account. */
  locked: boolean;
  /** What the visitor would have to do to reach it. Null when reachable. */
  unlock: { label: string; href: string } | null;
  href: string;
}

const DOOR_TIERS: DoorTier[] = ['RETAIL', 'BULK', 'WHOLESALE'];

const COPY: Record<DoorTier, { label: string; blurb: string }> = {
  RETAIL: { label: 'Retail', blurb: 'A few units, for the house or the shop counter.' },
  BULK: { label: 'Bulk', blurb: 'Restocking a salon, a spaza or a small site.' },
  WHOLESALE: { label: 'Wholesale', blurb: 'Buying to resell, or to supply an institution.' },
};

/**
 * Which account type unlocks a rung the current visitor cannot reach.
 *
 * Read off `TIERS_BY_CUSTOMER_TYPE` rather than written down a second time, so
 * a change to the permission model cannot leave this copy quietly lying.
 */
function unlockFor(tier: DoorTier, customerType: CustomerType): TierDoor['unlock'] {
  if (customerType === 'GUEST') {
    const reachableOnceSignedIn = TIERS_BY_CUSTOMER_TYPE.RETAIL.includes(tier);
    if (reachableOnceSignedIn) return { label: 'Create an account', href: '/signup' };
  }

  return { label: 'Business account', href: '/signup' };
}

/**
 * Price the three doors against one product.
 *
 * The featured product is passed in rather than chosen here: the caller already
 * knows which product it is showing, and pricing the doors against a different
 * one would put figures on screen that the page never explains.
 */
export function tierDoors(
  bands: CustomerPrice[],
  product: Product,
  customerType: CustomerType,
): TierDoor[] {
  // The full retail ladder is the reference the savings are measured against,
  // and it exists whatever the visitor's own tier is.
  const retailLadder = priceLadder(bands, product.id, 'RETAIL');
  const retailBase = retailLadder[0]?.unit_price ?? product.price;

  return DOOR_TIERS.map((tier) => {
    const { label, blurb } = COPY[tier];
    const href = `/browse?tier=${tier}`;

    const reachable = canReachTier(customerType, tier);

    /*
     * The band shown is the cheapest one this account could actually be given
     * at this tier — the rung's best case, which is what a buyer deciding
     * between doors wants to compare.
     */
    const own = priceLadder(bands, product.id, customerType).filter(
      (band) => band.pricing_tier === tier,
    );
    const band = own[own.length - 1] ?? null;

    /*
     * Out of reach: fall back to the published band a full business account
     * would be given, so the rung still carries a real figure and a real
     * quantity range. This is the price the catalogue publishes at that tier,
     * not an estimate, and the rung says plainly what it takes to buy at it.
     */
    const shown =
      band ??
      (() => {
        const reference = priceLadder(bands, product.id, 'BUSINESS').filter(
          (candidate) => candidate.pricing_tier === tier,
        );
        return reference[reference.length - 1] ?? null;
      })();

    if (!shown) {
      return {
        tier,
        label,
        blurb,
        range: null,
        unitPrice: null,
        savingPerUnit: 0,
        savingPct: 0,
        locked: true,
        unlock: unlockFor(tier, customerType),
        href,
      };
    }

    const locked = !reachable || !band;
    const saving = retailBase - shown.unit_price;

    return {
      tier,
      label,
      blurb,
      range: bandRange(shown),
      unitPrice: shown.unit_price,
      savingPerUnit: saving,
      savingPct: retailBase === 0 ? 0 : (saving / retailBase) * 100,
      locked,
      unlock: locked ? unlockFor(tier, customerType) : null,
      href: locked ? (unlockFor(tier, customerType)?.href ?? href) : href,
    };
  });
}

/**
 * The retail-to-cheapest spread for a product, for the "same ladder, every
 * product" proof strip. Returns null when a product has no ladder worth showing,
 * so the strip can skip it rather than render a flat row.
 */
export function ladderSpread(
  bands: CustomerPrice[],
  product: Product,
): { from: number; to: number; pct: number; lowestRange: string } | null {
  // Measured on the business ladder because that is the full published range;
  // the strip is making a claim about the product, not about the viewer.
  const ladder = priceLadder(bands, product.id, 'BUSINESS');
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
 * The next rung down from a given quantity, as the buyer should *see* it.
 *
 * `nextBand` answers from the account's own ladder, which for a guest is one
 * rung long — so a signed-out visitor filling a cart would be told nothing at
 * all about the quantity break sitting just above them. That is the one place
 * the ladder most needs to speak, so this falls back to the retail ladder and
 * marks the result as needing an account, exactly as the doors do.
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

  // Nothing left on this account's own ladder: show what the next tier up
  // publishes, and say plainly that reaching it takes an account.
  const reference = customerType === 'GUEST' ? 'RETAIL' : 'BUSINESS';
  const fallback = priceLadder(bands, productId, reference, variantId).find(
    (band) => band.minimum_quantity > quantity,
  );

  return fallback ? { band: fallback, locked: true } : null;
}
