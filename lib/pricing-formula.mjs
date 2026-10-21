/**
 * The AfriDeal price formula, in one place (spec 0007).
 *
 * Plain JS so `scripts/seed.mjs` and the app share the same arithmetic: the
 * seed writes the published bands, the app resolves and charges them, and the
 * two cannot drift if they call the same functions. `lib/pricing-model.ts`
 * re-exports the ladder with types.
 *
 * The rule is the product owner's developer table (2026-10-20), less its 14%
 * customs since 2026-10-21 (see CUSTOMS_RATE):
 *
 *   landed = supplier cost × rate × (1 + customs)   customs 0%, see below
 *   price  = landed × (1 + markup)                   markup by quantity rung
 *
 *                                  default         hair (since 2026-10-21)
 *   1 – 4 units      Retail        landed + 50%    landed + 25%   less 2 / 3 / 5% for 2 / 3 / 4 units
 *   5 – 10 units     Bulk          landed + 33%    landed + 12%
 *   11 – 20 units    Wholesale     landed + 25%    landed + 10%
 *   21 – 99 units    Wholesale+    landed + 18%    landed + 8%
 *   100 units +      Custom        by quotation
 *
 * Arithmetic runs in whole thebe and rounds up to the Pula only at the end.
 * In floating point 319.20 × 1.25 can land a hair above 399 and ceil to 400.
 */

/**
 * Customs VAT on imported goods, as a share of the supplier price. Zero: since
 * 2026-10-21 the courier clears the goods under its own licence and charges
 * for it in the delivery fee, so product prices carry no customs (spec 0007,
 * amendment; spec 0008). Her table used 0.14; the tests still check that
 * arithmetic by passing the rate explicitly.
 */
export const CUSTOMS_RATE = 0;

/**
 * Rand to Pula. The owner's table uses 1:1 "temporary" until she decides when
 * to move to the market rate (spec 0007, open question 2).
 */
export const FX_RATES = { BWP: 1, ZAR: 1 };

/** Where the quantity ladder stops publishing and starts quoting. */
export const QUOTATION_THRESHOLD = 100;

/**
 * The published rungs, cheapest last. `floor` is the minimum share of the
 * selling price that must survive after landed cost and the card fee.
 *
 * @type {{ tier: 'RETAIL' | 'BULK' | 'WHOLESALE' | 'WHOLESALE_PLUS', markup: number, minimum_quantity: number, maximum_quantity: number, floor: number }[]}
 */
export const LADDER_RUNGS = [
  { tier: 'RETAIL', markup: 0.5, minimum_quantity: 1, maximum_quantity: 4, floor: 20 },
  { tier: 'BULK', markup: 0.33, minimum_quantity: 5, maximum_quantity: 10, floor: 15 },
  { tier: 'WHOLESALE', markup: 0.25, minimum_quantity: 11, maximum_quantity: 20, floor: 12 },
  {
    tier: 'WHOLESALE_PLUS',
    markup: 0.18,
    minimum_quantity: 21,
    maximum_quantity: QUOTATION_THRESHOLD - 1,
    floor: 8,
  },
];

/** The hair category, which runs on its own ladder (below). */
export const HAIR_CATEGORY_ID = 'c1';

/**
 * The hair ladder, from the product owner's sheet of 2026-10-21 13:55
 * (`AfriDeal_Retail_Wholesale_Pricing_No_14pct.xlsx`): she priced the wigs as a
 * customer against competitors and cut every markup. Same quantity breaks and
 * the same 2 / 3 / 5% retail multi-buy as the default ladder; only the markups
 * and the floors differ.
 *
 * Floors are the share of the selling price kept after landed cost and the
 * 2.5% card fee, each set just under what its markup leaves: +25% keeps 17.5%
 * (13.3% at the 4-unit multi-buy, which the retail floor must also clear),
 * +12% keeps 8.2%, +10% 6.6%, +8% 4.9%.
 *
 * @type {typeof LADDER_RUNGS}
 */
export const HAIR_LADDER_RUNGS = [
  { tier: 'RETAIL', markup: 0.25, minimum_quantity: 1, maximum_quantity: 4, floor: 13 },
  { tier: 'BULK', markup: 0.12, minimum_quantity: 5, maximum_quantity: 10, floor: 8 },
  { tier: 'WHOLESALE', markup: 0.1, minimum_quantity: 11, maximum_quantity: 20, floor: 6 },
  {
    tier: 'WHOLESALE_PLUS',
    markup: 0.08,
    minimum_quantity: 21,
    maximum_quantity: QUOTATION_THRESHOLD - 1,
    floor: 4,
  },
];

/**
 * The ladder a category is priced on: hair's own, or the default.
 *
 * @param {string} categoryId
 * @returns {typeof LADDER_RUNGS}
 */
export function ladderFor(categoryId) {
  return categoryId === HAIR_CATEGORY_ID ? HAIR_LADDER_RUNGS : LADDER_RUNGS;
}

/**
 * Retail multi-buy: units of one seller and category taken together earn a
 * discount on the retail price. Wholesale rungs get none on top.
 *
 * @type {Record<number, number>}
 */
export const RETAIL_MULTIBUY = { 2: 0.02, 3: 0.03, 4: 0.05 };

/** The card fee AfriDeal carries out of its own margin. */
export const GATEWAY_RATE = 0.025;

/**
 * Supplier cost to landed cost, in whole thebe.
 *
 * @param {{ cost: number, currency?: 'BWP' | 'ZAR', imported: boolean, rate?: number, customsRate?: number }} input
 * @returns {{ cost_thebe: number, customs_thebe: number, landed_thebe: number, fx_rate: number }}
 */
export function landedCost({ cost, currency = 'BWP', imported, rate, customsRate = CUSTOMS_RATE }) {
  const fx = rate ?? FX_RATES[currency] ?? 1;
  const costThebe = Math.round(cost * fx * 100);
  const customsThebe = imported ? Math.round(costThebe * customsRate) : 0;
  return {
    cost_thebe: costThebe,
    customs_thebe: customsThebe,
    landed_thebe: costThebe + customsThebe,
    fx_rate: fx,
  };
}

/**
 * Selling price for one unit, in whole Pula, rounded up.
 *
 * @param {number} landedThebe
 * @param {number} markup  fraction, e.g. 0.5 for 50%
 * @returns {number}
 */
export function unitPrice(landedThebe, markup) {
  return Math.ceil(Math.round(landedThebe * (1 + markup)) / 100);
}

/**
 * The retail multi-buy discount for a quantity, or 0.
 *
 * @param {number} quantity
 * @returns {number}
 */
export function multiBuyDiscount(quantity) {
  return RETAIL_MULTIBUY[quantity] ?? 0;
}

/**
 * A published retail price after the multi-buy discount, in whole Pula.
 *
 * @param {number} retailPrice
 * @param {number} quantity
 * @returns {number}
 */
export function applyMultiBuy(retailPrice, quantity) {
  const discount = multiBuyDiscount(quantity);
  if (discount === 0) return retailPrice;
  return Math.ceil(Math.round(retailPrice * 100 * (1 - discount)) / 100);
}

/**
 * Share of the selling price kept after landed cost and the card fee, in %.
 *
 * @param {number} price  Pula
 * @param {number} landedThebe
 * @param {number} [gatewayRate]
 * @returns {number}
 */
export function marginPct(price, landedThebe, gatewayRate = GATEWAY_RATE) {
  if (price === 0) return 0;
  const kept = price - landedThebe / 100 - price * gatewayRate;
  return (kept / price) * 100;
}
