import { findCollectionPoint, type CollectionPoint } from '@/lib/collection-points';
import { activeCountries } from '@/lib/countries';
import { fromPula, pulaPerUnit, toPula } from '@/lib/currency.mjs';
import { readAll } from '@/lib/db';
import { DEFAULT_DELIVERY_COUNTRY, isCrossBorder } from '@/lib/lanes.mjs';
import { offerLandedCost, priceLine, sellerQuantities } from '@/lib/pricing-tiers';
import { routeLine } from '@/lib/supplier-selection';
import type { Country, CustomerPrice, CustomerType, OrderItem, Product, Supplier, SupplierOffer } from '@/types';

/**
 * Pricing an order, shared by the order route and the promo quote (spec 0011).
 *
 * A discount depends on the routing, the rungs and the customs of every line, so
 * sharing only the discount arithmetic would still let the two disagree, first of
 * all on a locker in another country.
 */

export const DOORSTEP_DELIVERY_FEE = 45;

export type Refused = { ok: false; status: number; error: string };

export interface OrderLane {
  ok: true;
  point: CollectionPoint | null;
  country: Country;
  deliveryCountry: string;
  currency: Country['buyer_currency'];
  /** Pula per unit of the order's currency. */
  rate: number;
  /** In the order's currency. */
  deliveryFee: number;
}

/**
 * The lane runs to the locker's country when one is chosen, else to the buyer's
 * (spec 0009). The fee comes from the one shared list, never from the request.
 */
export async function resolveLane(input: {
  delivery_method: 'DOORSTEP' | 'COLLECTION_POINT';
  collection_point?: string | null;
  delivery_country?: string;
}): Promise<OrderLane | Refused> {
  const point = input.delivery_method === 'COLLECTION_POINT' ? findCollectionPoint(input.collection_point) : null;

  // A collection point order must name a locker on the list.
  if (input.delivery_method === 'COLLECTION_POINT' && !point) {
    return { ok: false, status: 422, error: 'Choose one of the collection points listed at checkout.' };
  }

  const deliveryCountry = point?.country ?? input.delivery_country ?? DEFAULT_DELIVERY_COUNTRY;
  const country = (await activeCountries()).find((entry) => entry.code === deliveryCountry);
  if (!country) return { ok: false, status: 422, error: 'We do not deliver to that country yet.' };

  const currency = country.buyer_currency;
  return {
    ok: true,
    point,
    country,
    deliveryCountry,
    currency,
    rate: pulaPerUnit(currency),
    deliveryFee: fromPula(point ? point.fee : DOORSTEP_DELIVERY_FEE, currency),
  };
}

export interface BuiltLine {
  item: Omit<OrderItem, 'id' | 'order_id'>;
  /** What `confirmPayment()` will book for this line, in pula. */
  bookedGross: number;
  /** Landed cost of the whole line, customs included, in pula. */
  landedCost: number;
}

export interface BuiltLines {
  ok: true;
  lines: BuiltLine[];
  /** In the order's currency. */
  subtotal: number;
  grossPula: number;
  landedPula: number;
}

/**
 * Resolve, route and price every line. Prices are read from the catalogue rather
 * than trusted from the client, so a tampered cart cannot set its own price.
 */
export function buildOrderLines(input: {
  lines: { product_id: string; variant_id: string; qty: number }[];
  products: Product[];
  offers: SupplierOffer[];
  suppliers: Supplier[];
  bands: CustomerPrice[];
  customerType: CustomerType;
  lane: Pick<OrderLane, 'currency' | 'rate' | 'deliveryCountry'>;
}): BuiltLines | Refused {
  const { lines, products, offers, suppliers, bands, customerType, lane } = input;
  const built: BuiltLine[] = [];
  const tierQuantityOf = sellerQuantities(lines, products);

  for (const line of lines) {
    const product = products.find((candidate) => candidate.id === line.product_id);
    if (!product) return { ok: false, status: 422, error: `Product ${line.product_id} is no longer available.` };

    const variant = product.variants.find((candidate) => candidate.id === line.variant_id);
    if (!variant) return { ok: false, status: 422, error: `That option is no longer available for ${product.name}.` };

    const minOrderQty = product.owner_type === 'SUPPLIER' ? Math.max(1, product.moq ?? 1) : 1;
    if (line.qty < minOrderQty) {
      return { ok: false, status: 422, error: `${product.name} requires a minimum order of ${minOrderQty} units.` };
    }

    const route = routeLine(product, offers, suppliers, line.qty);
    if (!route) return { ok: false, status: 409, error: `No verified supplier can currently fulfil ${product.name}.` };

    /**
     * §14 - price the line from the buyer's own tier ladder, at the server.
     * Supplier-owned products use the supplier's set price directly; AfriDeal
     * products use the ladder, on the rung chosen by every unit in this order
     * from the same seller and category (spec 0007, AC-5). `priceLine()` is the
     * function the cart and checkout show, so the charge matches the summary.
     */
    const priced = priceLine(
      bands.filter((band) => band.product_id === product.id),
      product,
      variant.id,
      line.qty,
      customerType,
      tierQuantityOf(product.id),
    );

    if (priced.resolved.requires_rfq) {
      return {
        ok: false,
        status: 409,
        error: `${product.name} at ${line.qty} units is priced by quotation. Submit a quotation request rather than ordering directly.`,
      };
    }

    // Spec 0007, AC-7: what this unit cost us, fixed now so a later rate or
    // cost change never rewrites a placed order or its payable.
    // Spec 0009, AC-3: customs when the routed supplier's goods cross a border.
    const landed = offerLandedCost(route.offer, variant.id, isCrossBorder(route.supplier.country, lane.deliveryCountry));
    const supplierCost =
      route.offer.variant_costs?.find((entry) => entry.variant_id === variant.id)?.cost ?? route.offer.supplier_cost;

    // Priced in pula, charged in the buyer's currency (spec 0009).
    const lineTotal = fromPula(priced.line_total, lane.currency);

    built.push({
      item: {
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        variant_label: variant.label,
        emoji: product.emoji,
        qty: line.qty,
        unit_price: fromPula(priced.unit_price, lane.currency),
        line_total: lineTotal,
        supplier_id: route.supplier.id,
        supplier_cost: supplierCost,
        supplier_cost_currency: route.offer.cost_currency ?? 'BWP',
        fx_rate: supplierCost === 0 ? 1 : landed.cost / supplierCost,
        customs_amount: landed.customs,
      },
      bookedGross: toPula(lineTotal, lane.rate),
      landedCost: landed.landed * line.qty,
    });
  }

  return {
    ok: true,
    lines: built,
    subtotal: built.reduce((sum, line) => sum + line.item.line_total, 0),
    grossPula: built.reduce((sum, line) => sum + line.bookedGross, 0),
    landedPula: built.reduce((sum, line) => sum + line.landedCost, 0),
  };
}

/** `buildOrderLines` over today's catalogue. */
export async function priceOrder(
  lines: { product_id: string; variant_id: string; qty: number }[],
  lane: OrderLane,
  customerType: CustomerType,
): Promise<BuiltLines | Refused> {
  const [products, offers, suppliers, bands] = await Promise.all([
    readAll('products'),
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('customer-prices'),
  ]);
  return buildOrderLines({ lines, products, offers, suppliers, bands, customerType, lane });
}
