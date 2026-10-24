import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, insert, nextId, nextIds, readAll, update } from '@/lib/db';
import { audit, notify } from '@/lib/notifications';
import { startPayment } from '@/lib/payments/adapters';
import { paymentExpiresAt } from '@/lib/payments/policy';
import type {
  Order,
  OrderItem,
  OrderTimelineEntry,
  Payment,
  PaymentMethod,
  Rfq,
  RfqResponse,
} from '@/types';

export const dynamic = 'force-dynamic';

/**
 * One quotation request (§21/§22).
 *
 * Suppliers answer with their own confidential price. Staff compare the
 * responses and select one. The customer never sees the individual supplier
 * numbers, only the landed price AfriDeal quotes back.
 */

export const GET = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const rfq = await findById('rfqs', params.id);
  if (!rfq) return fail('Quotation request not found.', 404);

  if (actor.role === 'CUSTOMER' && rfq.customer_id !== actor.id) {
    return fail('Not your request.', 403);
  }

  const all = (await readAll('rfq-responses')).filter((entry) => entry.rfq_id === rfq.id);
  const suppliers = await readAll('suppliers');

  // §5 - scope what comes back to what the caller is entitled to see.
  if (actor.role === 'CUSTOMER') {
    const submitted = all.filter((entry) => entry.status === 'SUBMITTED' || entry.status === 'SELECTED');
    return ok({
      rfq,
      response_count: submitted.length,
      best_lead_time:
        submitted.length === 0 ? null : Math.min(...submitted.map((e) => e.lead_time_days)),
      responses: [],
    });
  }

  const scoped =
    actor.role === 'SUPPLIER_OWNER'
      ? all.filter((entry) => entry.supplier_id === actor.supplierId)
      : all;

  return ok({
    rfq,
    response_count: all.length,
    responses: scoped.map((entry) => ({
      ...entry,
      supplier_name: suppliers.find((s) => s.id === entry.supplier_id)?.name ?? 'Unknown supplier',
    })),
  });
});

const RespondSchema = z.object({
  action: z.literal('RESPOND'),
  unit_price: z.number().positive('Enter a unit price above zero.'),
  quantity: z.number().int().min(1),
  lead_time_days: z.number().int().min(0).max(365),
  minimum_order_quantity: z.number().int().min(1),
  shipping_terms: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  valid_days: z.number().int().min(1).max(120).optional(),
});

const UpdateSchema = z.object({
  action: z.enum(['SET_STATUS', 'SELECT_RESPONSE', 'ACCEPT_QUOTE']),
  status: z.enum(['SOURCING', 'QUOTED', 'ORDERED', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
  response_id: z.string().optional(),
  customer_unit_price: z.number().positive().optional(),
  payment_method: z.enum(['CARD', 'ORANGE_MONEY', 'PAYGATE', 'EFT']).optional(),
});

async function createOrderFromRfqQuote({
  rfq,
  chosen,
  actor,
  customerUnitPriceOverride,
  paymentMethod = 'EFT',
}: {
  rfq: Rfq;
  chosen: RfqResponse;
  actor: { id: string; name: string };
  customerUnitPriceOverride?: number;
  paymentMethod?: PaymentMethod;
}): Promise<{ order: Order; rfq: Rfq }> {
  const now = new Date().toISOString();
  const customerUnitPrice = customerUnitPriceOverride ?? Math.ceil(chosen.unit_price * 1.22);
  const qty = rfq.requested_quantity;
  const subtotal = customerUnitPrice * qty;
  const delivery_fee = 45;
  const total = subtotal + delivery_fee;

  const product = await findById('products', rfq.product_id);
  const variant = product?.variants?.find((v) => v.id === rfq.variant_id) ?? product?.variants?.[0];

  const orderId = await nextId('orders', 'o');
  const [itemId] = await nextIds('order-items', 'oi', 1);
  const [paymentId] = await nextIds('payments', 'pmt', 1);

  const numericPart = Number.parseInt(orderId.replace(/\D/g, ''), 10);
  const reference = Number.isNaN(numericPart) ? `AFD-${orderId}` : `AFD-${24809 + numericPart}`;

  const timeline: OrderTimelineEntry[] = [
    {
      status: 'AWAITING_PAYMENT',
      label: 'Order created from quotation, waiting for payment',
      at: now,
    },
  ];

  const order: Order = {
    id: orderId,
    reference,
    customer_id: rfq.customer_id,
    customer_name: rfq.customer_name,
    status: 'AWAITING_PAYMENT',
    subtotal,
    delivery_fee,
    total,
    payment_method: paymentMethod,
    payment_reference: null,
    payment_expires_at: paymentExpiresAt(now, paymentMethod),
    cancel_reason: null,
    delivery_address: rfq.delivery_location,
    delivery_city: rfq.delivery_location,
    delivery_method: 'DOORSTEP',
    collection_point: null,
    placed_at: now,
    updated_at: now,
    timeline,
    internal_notes: `Quotation order from ${rfq.reference} (quote ${chosen.id})`,
  };

  const item: OrderItem = {
    id: itemId,
    order_id: orderId,
    product_id: rfq.product_id,
    variant_id: variant?.id ?? rfq.variant_id ?? 'default',
    product_name: product?.name ?? rfq.product_name,
    variant_label: variant?.label ?? 'Standard',
    emoji: product?.emoji ?? '📦',
    qty,
    unit_price: customerUnitPrice,
    line_total: subtotal,
    supplier_id: chosen.supplier_id,
    supplier_cost: chosen.unit_price,
  };

  await insert('orders', order);
  await insert('order-items', item);

  const started = await startPayment(order);
  const payment: Payment = {
    id: paymentId,
    order_id: orderId,
    provider: started.provider,
    provider_reference: started.providerReference,
    status: 'STARTED',
    amount: order.total,
    amount_matches: false,
    created_at: now,
    confirmed_at: null,
    failure_reason: null,
    note: null,
  };
  await insert('payments', payment);

  const updatedRfq = await update('rfqs', rfq.id, {
    status: 'ORDERED',
    order_id: order.id,
    quoted_unit_price: customerUnitPrice,
    updated_at: now,
  });

  await notify({
    userId: rfq.customer_id,
    title: 'Your quotation order is ready',
    body: `${rfq.reference} - order ${order.reference} created for ${rfq.requested_quantity} units at BWP ${customerUnitPrice.toFixed(2)}/unit.`,
    kind: 'ORDER',
  });

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: 'RFQ_RESPONSE_SELECTED',
    entity: 'rfq',
    entityId: rfq.id,
    detail: `Selected response ${chosen.id}; created order ${order.reference} (${order.id}) at BWP ${customerUnitPrice.toFixed(2)} per unit.`,
  });

  return { order, rfq: updatedRfq ?? rfq };
}

export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const rfq = await findById('rfqs', params.id);
  if (!rfq) return fail('Quotation request not found.', 404);

  const body = await request.json();

  // ── Supplier answers ──────────────────────────────────────────────────
  if (body?.action === 'RESPOND') {
    if (actor.role !== 'SUPPLIER_OWNER') return fail('Only suppliers can quote.', 403);
    if (!actor.supplierId) return fail('Your account is not linked to a supplier.', 403);

    const parsed = RespondSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid quote.', 422);

    const existing = (await readAll('rfq-responses')).find(
      (entry) => entry.rfq_id === rfq.id && entry.supplier_id === actor.supplierId,
    );

    const patch = {
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unit_price,
      lead_time_days: parsed.data.lead_time_days,
      minimum_order_quantity: parsed.data.minimum_order_quantity,
      shipping_terms: parsed.data.shipping_terms ?? 'Ex-works',
      notes: parsed.data.notes ?? '',
      valid_until: new Date(
        Date.now() + (parsed.data.valid_days ?? 14) * 86_400_000,
      ).toISOString(),
      status: 'SUBMITTED' as const,
    };

    const saved = existing
      ? await update('rfq-responses', existing.id, patch)
      : await insert('rfq-responses', {
          id: await nextId('rfq-responses', 'rr'),
          rfq_id: rfq.id,
          supplier_id: actor.supplierId,
          currency: 'BWP',
          created_at: new Date().toISOString(),
          ...patch,
        } as RfqResponse);

    // First response moves the request out of the intake state.
    if (rfq.status === 'SUBMITTED') {
      await update('rfqs', rfq.id, { status: 'SOURCING', updated_at: new Date().toISOString() });
    }

    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action: 'RFQ_QUOTED',
      entity: 'rfq',
      entityId: rfq.id,
      detail: `${actor.name} quoted ${parsed.data.quantity} units at BWP ${parsed.data.unit_price.toFixed(2)}.`,
    });

    return ok(saved);
  }

  // ── Authorisation for triage, selection, and quote acceptance ─────────
  const isCustomer = actor.role === 'CUSTOMER' && rfq.customer_id === actor.id;
  const isStaff = ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(actor.role);

  if (body?.action === 'ACCEPT_QUOTE') {
    if (!isCustomer && !isStaff) {
      return fail('Your role cannot accept a quotation.', 403);
    }
  } else if (!isStaff) {
    return fail('Your role cannot change a quotation request.', 403);
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return fail('Invalid quotation update.', 422);

  const now = new Date().toISOString();

  if (parsed.data.action === 'SELECT_RESPONSE') {
    if (!parsed.data.response_id) return fail('Name the response to select.', 422);

    const responses = (await readAll('rfq-responses')).filter((entry) => entry.rfq_id === rfq.id);
    const chosen = responses.find((entry) => entry.id === parsed.data.response_id);
    if (!chosen) return fail('That response is not on this request.', 404);

    for (const entry of responses) {
      await update('rfq-responses', entry.id, {
        status: entry.id === chosen.id ? 'SELECTED' : 'REJECTED',
      });
    }

    if (rfq.order_id) {
      const existingOrder = await findById('orders', rfq.order_id);
      if (existingOrder) {
        return ok({ ...chosen, order: existingOrder, rfq });
      }
    }

    const { order, rfq: updatedRfq } = await createOrderFromRfqQuote({
      rfq,
      chosen,
      actor,
      customerUnitPriceOverride: parsed.data.customer_unit_price,
      paymentMethod: parsed.data.payment_method,
    });

    return ok({ ...chosen, order, rfq: updatedRfq });
  }

  if (parsed.data.action === 'ACCEPT_QUOTE') {
    const responses = (await readAll('rfq-responses')).filter((entry) => entry.rfq_id === rfq.id);
    const chosen =
      responses.find((entry) => entry.status === 'SELECTED') ??
      responses.find((entry) => entry.status === 'SUBMITTED');

    if (rfq.order_id) {
      const existingOrder = await findById('orders', rfq.order_id);
      if (existingOrder) {
        return ok({ ...(chosen ?? {}), order: existingOrder, rfq });
      }
    }

    if (!chosen) return fail('No quotation response is available to accept.', 400);

    for (const entry of responses) {
      await update('rfq-responses', entry.id, {
        status: entry.id === chosen.id ? 'SELECTED' : 'REJECTED',
      });
    }

    const { order, rfq: updatedRfq } = await createOrderFromRfqQuote({
      rfq,
      chosen,
      actor,
      customerUnitPriceOverride: parsed.data.customer_unit_price,
      paymentMethod: parsed.data.payment_method,
    });

    return ok({ ...chosen, order, rfq: updatedRfq });
  }

  if (!parsed.data.status) return fail('Nothing to update.', 422);

  const updated = await update('rfqs', rfq.id, { status: parsed.data.status, updated_at: now });

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: 'RFQ_STATUS_CHANGED',
    entity: 'rfq',
    entityId: rfq.id,
    detail: `${rfq.status} → ${parsed.data.status}.`,
  });

  return ok(updated);
});
