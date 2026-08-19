import type {
  ScoreBreakdown,
  ScoredOffer,
  SelectionResult,
  Supplier,
  SupplierOffer,
} from '@/types';

/**
 * Supplier selection engine.
 *
 * The platform does not route to the cheapest offer. It routes to the offer
 * most likely to actually arrive, which is a different question — a supplier
 * who is BWP 40 cheaper but ships in eleven days and is out of stock loses to
 * one who is in stock and ships in two.
 *
 * Composite, per the client spec:
 *
 *   reliability × 0.35
 * + 20 if in stock, else 0
 * + (100 − fulfilment_days × 5) × 0.25
 * + rating × 4 × 0.20
 * + (1000 ÷ supplier_cost) × 0.20
 *
 * `reliability` and `rating` are properties of the supplier, not the offer, so
 * they are read from the supplier record the offer points at.
 */

export const WEIGHTS = {
  reliability: 0.35,
  stockBonus: 20,
  speed: 0.25,
  rating: 0.2,
  cost: 0.2,
} as const;

export function scoreOffer(offer: SupplierOffer, supplier: Supplier): ScoreBreakdown {
  return {
    reliability: supplier.reliability_score * WEIGHTS.reliability,
    stock: offer.stock > 0 ? WEIGHTS.stockBonus : 0,
    speed: (100 - offer.fulfilment_days * 5) * WEIGHTS.speed,
    rating: supplier.rating * 4 * WEIGHTS.rating,
    cost: offer.supplier_cost > 0 ? (1000 / offer.supplier_cost) * WEIGHTS.cost : 0,
  };
}

export function totalScore(breakdown: ScoreBreakdown): number {
  return (
    breakdown.reliability + breakdown.stock + breakdown.speed + breakdown.rating + breakdown.cost
  );
}

/**
 * Plain-language justification for the ranking. This is shown verbatim to
 * operations staff, who need to defend a routing decision to a supplier who
 * asks why they were skipped.
 */
function explain(offer: SupplierOffer, supplier: Supplier, breakdown: ScoreBreakdown, rank: number): string {
  if (offer.stock <= 0) {
    return `Out of stock. Held as fallback only — ${supplier.name} carries a ${supplier.reliability_score}/100 reliability score when supplied.`;
  }

  const strengths: string[] = [];
  if (supplier.reliability_score >= 85) strengths.push(`${supplier.reliability_score}/100 reliability`);
  if (offer.fulfilment_days <= 2) strengths.push(`${offer.fulfilment_days}-day fulfilment`);
  if (supplier.rating >= 4.5) strengths.push(`${supplier.rating.toFixed(1)}★ rating`);
  if (breakdown.cost >= 2) strengths.push('competitive unit cost');

  const lead = rank === 1 ? 'Selected on' : 'Ranked on';
  const body = strengths.length > 0 ? strengths.join(', ') : 'a balanced cost and reliability profile';

  return `${lead} ${body}. In stock (${offer.stock} units), ships in ${offer.fulfilment_days} day${offer.fulfilment_days === 1 ? '' : 's'}.`;
}

function labelFor(rank: number): string {
  return rank === 1 ? 'PRIMARY' : `BACKUP ${rank - 1}`;
}

/**
 * Rank every live offer for a product.
 *
 * Suspended suppliers are excluded outright — they cannot be routed to at any
 * score. Out-of-stock offers stay in the list, deliberately: operations needs
 * to see who *could* supply if stock returns, and the −20 stock penalty already
 * pushes them below anyone who can ship today.
 */
export function rankOffers(
  offers: SupplierOffer[],
  suppliers: Supplier[],
  options: { includeUnverified?: boolean } = {},
): SelectionResult {
  const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  const scored = offers
    .filter((offer) => offer.active)
    .flatMap<ScoredOffer>((offer) => {
      const supplier = byId.get(offer.supplier_id);
      if (!supplier) return [];
      if (supplier.status === 'SUSPENDED' || supplier.status === 'REJECTED') return [];
      if (!options.includeUnverified && supplier.status !== 'VERIFIED') return [];

      const breakdown = scoreOffer(offer, supplier);
      return [
        {
          offer,
          supplier,
          breakdown,
          score: totalScore(breakdown),
          rank: 0,
          label: '',
          reason: '',
        },
      ];
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => {
      const rank = index + 1;
      return {
        ...entry,
        rank,
        label: labelFor(rank),
        reason: explain(entry.offer, entry.supplier, entry.breakdown, rank),
      };
    });

  return {
    primary: scored[0] ?? null,
    backups: scored.slice(1),
    all: scored,
  };
}

/**
 * Choose the supplier to route a line to. Prefers the top-ranked offer that can
 * actually ship; falls back to the top-ranked offer overall so a product is
 * never left unroutable.
 */
export function selectSupplier(
  offers: SupplierOffer[],
  suppliers: Supplier[],
  qty = 1,
): ScoredOffer | null {
  const { all } = rankOffers(offers, suppliers);
  return all.find((entry) => entry.offer.stock >= qty) ?? all[0] ?? null;
}
