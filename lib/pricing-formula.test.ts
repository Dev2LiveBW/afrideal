import { describe, expect, it } from 'vitest';

import {
  HAIR_CATEGORY_ID,
  HAIR_LADDER_RUNGS,
  LADDER_RUNGS,
  QUOTATION_THRESHOLD,
  applyMultiBuy,
  ladderFor,
  landedCost,
  marginPct,
  unitPrice,
} from './pricing-formula.mjs';

/**
 * The price formula against the product owner's developer table (spec 0007).
 *
 * `AfriDeal_Developer_Pricing_Table.csv`, sent 2026-10-20 11:45: supplier cost
 * at a temporary 1:1, landed cost incl. 14%, retail at 50% with 2 / 3 / 5% off,
 * wholesale at 33 / 25 / 18%. Her figures run to the thebe; ours round up to the
 * Pula, so every published price is her figure rounded up.
 *
 * Since 2026-10-21 the published prices carry no customs (the courier clears the
 * goods), so her table is checked with the 14% passed explicitly: it proves the
 * arithmetic, and the default rate is checked on its own below.
 */

const HER_CUSTOMS = 0.14;

// [length, cost, landed, retail, 2 pcs, 3 pcs, 4+ pcs, 5–10, 11–20, 21+]
const HER_TABLE: [string, number, number, number, number, number, number, number, number, number][] = [
  ['8 inches', 280, 319.2, 478.8, 469.224, 464.436, 454.86, 424.536, 399.0, 376.656],
  ['10 inches', 450, 513.0, 769.5, 754.11, 746.415, 731.025, 682.29, 641.25, 605.34],
  ['12 inches', 630, 718.2, 1077.3, 1055.754, 1044.981, 1023.435, 955.206, 897.75, 847.476],
  ['14 inches', 830, 946.2, 1419.3, 1390.914, 1376.721, 1348.335, 1258.446, 1182.75, 1116.516],
  ['16 inches', 1060, 1208.4, 1812.6, 1776.348, 1758.222, 1721.97, 1607.172, 1510.5, 1425.912],
];

const markup = (tier: string) => LADDER_RUNGS.find((rung) => rung.tier === tier)!.markup;

describe('landedCost', () => {
  it.each(HER_TABLE)('%s: adds 14%% customs to an imported cost, in whole thebe · covers AC-3', (_, cost, landed) => {
    const result = landedCost({ cost, currency: 'ZAR', imported: true, customsRate: HER_CUSTOMS });
    expect(result.landed_thebe).toBe(Math.round(landed * 100));
    expect(result.customs_thebe).toBe(Math.round(cost * 14));
  });

  it('adds no customs by default: the courier clears imported goods · covers the 2026-10-21 amendment', () => {
    expect(landedCost({ cost: 280, currency: 'ZAR', imported: true })).toMatchObject({
      cost_thebe: 28000,
      customs_thebe: 0,
      landed_thebe: 28000,
    });
  });

  it('adds nothing for goods made in Botswana · covers AC-3', () => {
    expect(landedCost({ cost: 280, imported: false })).toMatchObject({
      cost_thebe: 28000,
      customs_thebe: 0,
      landed_thebe: 28000,
    });
  });

  it('converts at the rate it is given before adding customs · covers AC-2', () => {
    expect(landedCost({ cost: 280, currency: 'ZAR', imported: true, rate: 0.75, customsRate: HER_CUSTOMS })).toMatchObject({
      cost_thebe: 21000,
      customs_thebe: 2940,
      landed_thebe: 23940,
      fx_rate: 0.75,
    });
  });
});

describe('unitPrice on her ladder', () => {
  it.each(HER_TABLE)('%s: every rung is her figure rounded up to the Pula · covers AC-3, AC-4', (
    _,
    cost,
    __,
    retail,
    _2,
    _3,
    _4,
    bulk,
    wholesale,
    wholesalePlus,
  ) => {
    const { landed_thebe } = landedCost({ cost, currency: 'ZAR', imported: true, customsRate: HER_CUSTOMS });

    expect(unitPrice(landed_thebe, markup('RETAIL'))).toBe(Math.ceil(retail - 1e-9));
    expect(unitPrice(landed_thebe, markup('BULK'))).toBe(Math.ceil(bulk - 1e-9));
    expect(unitPrice(landed_thebe, markup('WHOLESALE'))).toBe(Math.ceil(wholesale - 1e-9));
    expect(unitPrice(landed_thebe, markup('WHOLESALE_PLUS'))).toBe(Math.ceil(wholesalePlus - 1e-9));
  });

  it('publishes the 8" at R280 without customs: 420 / 399 for 4 / 373 / 350 / 331 · covers the 2026-10-21 amendment', () => {
    const { landed_thebe } = landedCost({ cost: 280, currency: 'ZAR', imported: true });
    const retail = unitPrice(landed_thebe, markup('RETAIL'));

    expect(retail).toBe(420);
    expect(applyMultiBuy(retail, 4)).toBe(399);
    expect(unitPrice(landed_thebe, markup('BULK'))).toBe(373);
    expect(unitPrice(landed_thebe, markup('WHOLESALE'))).toBe(350);
    expect(unitPrice(landed_thebe, markup('WHOLESALE_PLUS'))).toBe(331);
  });

  it('does not let floating point push a whole price up a Pula · covers AC-3', () => {
    // 319.20 × 1.25 is exactly 399.00; naive float maths can ceil it to 400.
    expect(unitPrice(31920, 0.25)).toBe(399);
  });
});

describe('applyMultiBuy', () => {
  /*
   * Her rules apply the discount to the retail price, and ours is the retail
   * price rounded up to the Pula, so a multi-buy price can sit up to two Pula
   * above her unrounded figure. Never below it.
   */
  it.each(HER_TABLE)('%s: 2, 3 and 4 units sit within two Pula of her figures · covers AC-4', (
    _,
    cost,
    __,
    ___,
    two,
    three,
    four,
  ) => {
    const { landed_thebe } = landedCost({ cost, currency: 'ZAR', imported: true, customsRate: HER_CUSTOMS });
    const retail = unitPrice(landed_thebe, markup('RETAIL'));

    for (const [quantity, hers] of [
      [2, two],
      [3, three],
      [4, four],
    ] as const) {
      const ours = applyMultiBuy(retail, quantity);
      expect(ours).toBeGreaterThanOrEqual(hers);
      expect(ours - hers).toBeLessThan(2);
    }
  });

  it('leaves one unit, and anything past the retail rung, alone · covers AC-5', () => {
    expect(applyMultiBuy(479, 1)).toBe(479);
    expect(applyMultiBuy(479, 5)).toBe(479);
  });
});

describe('the ladder', () => {
  it('runs 1–4, 5–10, 11–20, 21–99 and quotes from 100 · covers AC-4', () => {
    expect(LADDER_RUNGS.map((rung) => [rung.minimum_quantity, rung.maximum_quantity])).toEqual([
      [1, 4],
      [5, 10],
      [11, 20],
      [21, 99],
    ]);
    expect(QUOTATION_THRESHOLD).toBe(100);
  });

  it.each(HER_TABLE)('%s: every rung clears its margin floor on an imported product · covers AC-8', (_, cost) => {
    const { landed_thebe } = landedCost({ cost, currency: 'ZAR', imported: true });

    for (const rung of LADDER_RUNGS) {
      const price = unitPrice(landed_thebe, rung.markup);
      expect(marginPct(price, landed_thebe)).toBeGreaterThanOrEqual(rung.floor);
    }

    // The deepest retail multi-buy still clears the retail floor.
    const retail = unitPrice(landed_thebe, markup('RETAIL'));
    expect(marginPct(applyMultiBuy(retail, 4), landed_thebe)).toBeGreaterThanOrEqual(20);
  });

  it('gets cheaper at every rung, so a bigger order never costs more per unit · covers AC-4', () => {
    const { landed_thebe } = landedCost({ cost: 280, currency: 'ZAR', imported: true });
    const retail = unitPrice(landed_thebe, markup('RETAIL'));
    const prices = [
      retail,
      applyMultiBuy(retail, 4),
      ...LADDER_RUNGS.slice(1).map((rung) => unitPrice(landed_thebe, rung.markup)),
    ];
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeLessThan(prices[i - 1]);
    }
  });
});

/**
 * The hair ladder, against her sheet of 2026-10-21 13:55
 * (`AfriDeal_Retail_Wholesale_Pricing_No_14pct.xlsx`): supplier cost at 1:1, no
 * customs, retail +25% with 2 / 3 / 5% off for 2 / 3 / 4+ pieces, wholesale
 * +12% (5–10), +10% (11–20), +8% (21+). Her cells are formulas; these are their
 * values. Ours round up to the Pula.
 */
// [length, cost, retail, 2 pcs, 3 pcs, 4+ pcs, 5–10, 11–20, 21+]
const HER_HAIR_SHEET: [string, number, number, number, number, number, number, number, number][] = [
  ['8 inches', 280, 350, 343, 339.5, 332.5, 313.6, 308, 302.4],
  ['10 inches', 450, 562.5, 551.25, 545.625, 534.375, 504, 495, 486],
  ['12 inches', 630, 787.5, 771.75, 763.875, 748.125, 705.6, 693, 680.4],
  ['14 inches', 830, 1037.5, 1016.75, 1006.375, 985.625, 929.6, 913, 896.4],
  ['16 inches', 1060, 1325, 1298.5, 1285.25, 1258.75, 1187.2, 1166, 1144.8],
];

const hairMarkup = (tier: string) => HAIR_LADDER_RUNGS.find((rung) => rung.tier === tier)!.markup;

describe('the hair ladder', () => {
  it('applies to hair only; every other category keeps the default ladder', () => {
    expect(ladderFor(HAIR_CATEGORY_ID)).toBe(HAIR_LADDER_RUNGS);
    expect(ladderFor('c7')).toBe(LADDER_RUNGS);
    expect(HAIR_LADDER_RUNGS.map((rung) => rung.markup)).toEqual([0.25, 0.12, 0.1, 0.08]);
  });

  it('keeps the default quantity breaks', () => {
    expect(HAIR_LADDER_RUNGS.map((rung) => [rung.minimum_quantity, rung.maximum_quantity])).toEqual(
      LADDER_RUNGS.map((rung) => [rung.minimum_quantity, rung.maximum_quantity]),
    );
  });

  it.each(HER_HAIR_SHEET)('%s: every price is her figure rounded up to the Pula (multi-buy within two)', (
    _,
    cost,
    retail,
    two,
    three,
    four,
    bulk,
    wholesale,
    wholesalePlus,
  ) => {
    const { landed_thebe } = landedCost({ cost, currency: 'ZAR', imported: true });
    const ours = unitPrice(landed_thebe, hairMarkup('RETAIL'));

    expect(ours).toBe(Math.ceil(retail - 1e-9));
    // The multi-buy comes off the published (rounded-up) retail price, so it
    // can sit up to two Pula above her unrounded figure, never below it.
    for (const [quantity, hers] of [
      [2, two],
      [3, three],
      [4, four],
    ] as const) {
      const multi = applyMultiBuy(ours, quantity);
      expect(multi).toBeGreaterThanOrEqual(hers);
      expect(multi - hers).toBeLessThan(2);
    }
    expect(unitPrice(landed_thebe, hairMarkup('BULK'))).toBe(Math.ceil(bulk - 1e-9));
    expect(unitPrice(landed_thebe, hairMarkup('WHOLESALE'))).toBe(Math.ceil(wholesale - 1e-9));
    expect(unitPrice(landed_thebe, hairMarkup('WHOLESALE_PLUS'))).toBe(Math.ceil(wholesalePlus - 1e-9));
  });

  it.each(HER_HAIR_SHEET)('%s: every rung, and the 4-piece multi-buy, clears its hair floor', (_, cost) => {
    const { landed_thebe } = landedCost({ cost, currency: 'ZAR', imported: true });

    for (const rung of HAIR_LADDER_RUNGS) {
      expect(marginPct(unitPrice(landed_thebe, rung.markup), landed_thebe)).toBeGreaterThanOrEqual(rung.floor);
    }
    const retail = unitPrice(landed_thebe, hairMarkup('RETAIL'));
    expect(marginPct(applyMultiBuy(retail, 4), landed_thebe)).toBeGreaterThanOrEqual(HAIR_LADDER_RUNGS[0].floor);
  });

  it('gets cheaper at every rung', () => {
    const { landed_thebe } = landedCost({ cost: 280, currency: 'ZAR', imported: true });
    const retail = unitPrice(landed_thebe, hairMarkup('RETAIL'));
    const prices = [
      retail,
      applyMultiBuy(retail, 4),
      ...HAIR_LADDER_RUNGS.slice(1).map((rung) => unitPrice(landed_thebe, rung.markup)),
    ];
    for (let i = 1; i < prices.length; i += 1) {
      expect(prices[i]).toBeLessThan(prices[i - 1]);
    }
  });
});
