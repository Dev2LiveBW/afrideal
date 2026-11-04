import type { Order, SupplierOrder } from '@/types';

/**
 * What a supplier may not see of an order (spec 0011, AC-9). Who is receiving
 * the parcel, how to reach them and what they told the driver are for the buyer,
 * the team and the runner. Suppliers read orders through the same rows, so the
 * fields come off wherever an order reaches them. A promo code is ours too: the
 * supplier is paid the same either way, so what a buyer got off is not theirs.
 */
export function orderForSupplier(order: Order): Order {
  const {
    recipient_name: _name,
    delivery_phone: _phone,
    delivery_instructions: _notes,
    promo_code: _code,
    promo_discount: _discount,
    promo_discount_pula: _discountPula,
    ...rest
  } = order;
  return rest;
}

/** A supplier's own leg, without its share of a promo discount. */
export function legForSupplier<T extends SupplierOrder>(leg: T): Omit<T, 'promo_discount'> {
  const { promo_discount: _share, ...rest } = leg;
  return rest;
}
