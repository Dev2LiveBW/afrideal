import type { OrderDetail } from '@/lib/queries';
import type { Order, SupplierOrder } from '@/types';

/**
 * What a supplier may not see of an order (spec 0011, AC-9). Who is receiving
 * the parcel, how to reach them and what they told the driver are for the buyer,
 * the team and the runner. Suppliers read orders through the same rows, so the
 * fields come off wherever an order reaches them.
 *
 * A promo code is ours too: the supplier is paid the same either way, so what a
 * buyer got off is not theirs. That takes more than removing the promo fields,
 * because any figure that moved with the discount gives it away. The total is
 * shown as it would have been, and a leg loses its margin, which only staff read.
 */
export function orderForSupplier(order: Order): Order {
  const {
    recipient_name: _name,
    delivery_phone: _phone,
    delivery_instructions: _notes,
    promo_code: code,
    promo_discount: _discount,
    promo_discount_pula: _discountPula,
    ...rest
  } = order;
  if (!code) return rest;
  return { ...rest, total: Math.round((order.subtotal + order.delivery_fee) * 100) / 100 };
}

/** A supplier's own leg, without our margin or its share of a promo discount. */
export function legForSupplier<T extends SupplierOrder>(leg: T): Omit<T, 'promo_discount' | 'platform_margin'> {
  const { promo_discount: _share, platform_margin: _margin, ...rest } = leg;
  return rest;
}

/**
 * An order as one supplier may read it: their own leg, lines and payable. Another
 * supplier's cost is confidential, and a payment shows what the buyer really paid.
 */
export function orderDetailForSupplier(detail: OrderDetail, supplierId: string | null) {
  return {
    ...detail,
    order: orderForSupplier(detail.order),
    items: detail.items.filter((item) => item.supplier_id === supplierId),
    payables: detail.payables.filter((record) => record.supplier_id === supplierId),
    payments: [],
    legs: detail.legs.filter((leg) => leg.supplier_id === supplierId).map(legForSupplier),
  };
}
