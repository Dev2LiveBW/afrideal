import type { OrderDetail } from '@/lib/queries';
import type { Order, OrderItem, OrderTimelineEntry, Payment, SupplierOrder } from '@/types';

/**
 * Who may read what of an order.
 *
 * An order row carries the buyer's details, what they paid, our margin, every
 * supplier's cost and the team's notes. Each reader gets an allow list of the
 * fields their job needs, never the row with a few fields taken off: a field
 * added to the row later then stays private until someone decides otherwise.
 */

function pick<T extends object, K extends keyof T>(row: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) if (key in row) out[key] = row[key];
  return out;
}

// ── Suppliers ────────────────────────────────────────────────────────────────

/**
 * What a supplier reads of an order: which order it is, where it is going and
 * how far it has got. Not what the buyer paid, how, or with which code (spec
 * 0011, AC-9; scope feature 31), not who receives it or how to reach them, and
 * not the team's notes.
 *
 * The buyer's name and street address stay for now because the supplier portal
 * shows them; whether a supplier should see either is the product owner's open
 * decision (docs/completion-plan.md, decision 2).
 */
const SUPPLIER_ORDER_FIELDS = [
  'id',
  'reference',
  'customer_name',
  'status',
  'delivery_address',
  'delivery_city',
  'delivery_country',
  'delivery_method',
  'collection_point',
  'placed_at',
  'updated_at',
] as const satisfies readonly (keyof Order)[];

export type SupplierOrderView = Pick<Order, (typeof SUPPLIER_ORDER_FIELDS)[number]> & {
  /** Steps without their notes: a collection point drop off writes the locker PIN into one. */
  timeline: Pick<OrderTimelineEntry, 'status' | 'label' | 'at'>[];
};

export function orderForSupplier(order: Order): SupplierOrderView {
  return {
    ...pick(order, SUPPLIER_ORDER_FIELDS),
    timeline: order.timeline.map(({ status, label, at }) => ({ status, label, at })),
  };
}

/** A supplier's own leg, without our margin or its share of a promo discount. */
export function legForSupplier<T extends SupplierOrder>(leg: T): Omit<T, 'promo_discount' | 'platform_margin'> {
  const { promo_discount: _share, platform_margin: _margin, ...rest } = leg;
  return rest;
}

/** A supplier's own line: what they supply and at their cost, not what the buyer was charged. */
export function itemForSupplier(item: OrderItem): Omit<OrderItem, 'unit_price' | 'line_total'> {
  const { unit_price: _price, line_total: _total, ...rest } = item;
  return rest;
}

/**
 * An order as one supplier may read it: their own leg, lines and payable. Another
 * supplier's cost is confidential, and a payment shows what the buyer really paid.
 */
export function orderDetailForSupplier(detail: OrderDetail, supplierId: string | null) {
  return {
    order: orderForSupplier(detail.order),
    items: detail.items.filter((item) => item.supplier_id === supplierId).map(itemForSupplier),
    payables: detail.payables.filter((record) => record.supplier_id === supplierId),
    payments: [] as never[],
    legs: detail.legs
      .filter((leg) => leg.supplier_id === supplierId)
      .map((leg) => ({ ...legForSupplier(leg), items: leg.items.map(itemForSupplier) })),
  };
}

// ── Buyers ───────────────────────────────────────────────────────────────────

/** A buyer's own order, without the team's notes about it. */
export function orderForCustomer(order: Order): Omit<Order, 'internal_notes'> {
  const { internal_notes: _notes, ...rest } = order;
  return rest;
}

/** A buyer's line: what they bought and paid, not who supplies it or at what cost. */
export function itemForCustomer(item: OrderItem) {
  const {
    supplier_id: _supplier,
    supplier_cost: _cost,
    supplier_cost_currency: _currency,
    fx_rate: _rate,
    ...rest
  } = item;
  return rest;
}

/** A payment attempt as the buyer sees it: not finance's own words or its reconciliation flag. */
export function paymentForCustomer(payment: Payment) {
  const { note: _note, amount_matches: _matches, ...rest } = payment;
  return rest;
}

/**
 * An order as its buyer may read it. AfriDeal is the merchant of record: the
 * buyer deals with us, so which supplier holds the goods, what they charge us
 * and what we keep are ours. A leg is reduced to how far that part has got.
 */
export function orderDetailForCustomer(detail: OrderDetail) {
  return {
    order: orderForCustomer(detail.order),
    items: detail.items.map(itemForCustomer),
    payables: [] as never[],
    payments: detail.payments.map(paymentForCustomer),
    legs: detail.legs.map((leg) => ({ id: leg.id, status: leg.status, item_ids: leg.item_ids })),
  };
}
