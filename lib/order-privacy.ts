import type { Order } from '@/types';

/**
 * What a supplier may not see of an order (spec 0011, AC-9). Who is receiving
 * the parcel, how to reach them and what they told the driver are for the buyer,
 * the team and the runner. Suppliers read orders through the same rows, so the
 * fields come off wherever an order reaches them.
 */
export function orderForSupplier(order: Order): Order {
  const { recipient_name: _name, delivery_phone: _phone, delivery_instructions: _notes, ...rest } = order;
  return rest;
}
