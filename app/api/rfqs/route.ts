import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, insert, nextId, readAll } from '@/lib/db';
import { audit, notify } from '@/lib/notifications';
import type { Rfq } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * RFQ intake and listing (revised spec §21).
 *
 * A quotation request is what happens when a buyer wants a quantity nobody has
 * published a band for. It is deliberately a separate flow from checkout: no
 * money moves, no escrow opens, and suppliers are asked rather than routed.
 */

const CreateSchema = z.object({
  product_id: z.string(),
  variant_id: z.string().nullable().optional(),
  requested_quantity: z.number().int().min(1, 'Enter how many units you need.'),
  target_price: z.number().positive().nullable().optional(),
  delivery_location: z.string().min(2, 'Tell us where this is going.'),
  required_delivery_date: z.string().nullable().optional(),
  notes: z.string().max(2000).optional(),
});

// ── GET /api/rfqs ────────────────────────────────────────────────────────────

export const GET = handled(async (request: Request) => {
  const { actor, response } = await guard();
  if (response) return response;

  const [rfqs, responses] = await Promise.all([readAll('rfqs'), readAll('rfq-responses')]);
  const status = new URL(request.url).searchParams.get('status');

  let visible = rfqs;

  if (actor.role === 'CUSTOMER') {
    visible = rfqs.filter((rfq) => rfq.customer_id === actor.id);
  } else if (actor.role === 'SUPPLIER_OWNER') {
    // A supplier sees a request only if they were invited to quote on it.
    const invited = new Set(
      responses.filter((entry) => entry.supplier_id === actor.supplierId).map((entry) => entry.rfq_id),
    );
    visible = rfqs.filter((rfq) => invited.has(rfq.id));
  }

  if (status) visible = visible.filter((rfq) => rfq.status === status);

  /**
   * §5 — supplier quotes are confidential. A customer sees that responses
   * exist and what the best landed price would be, never each supplier's
   * individual number. A supplier sees only their own. Staff see everything.
   */
  const decorated = visible
    .map((rfq) => {
      const all = responses.filter((entry) => entry.rfq_id === rfq.id);

      if (actor.role === 'CUSTOMER') {
        const submitted = all.filter((entry) => entry.status === 'SUBMITTED');
        return {
          ...rfq,
          response_count: submitted.length,
          best_lead_time:
            submitted.length === 0 ? null : Math.min(...submitted.map((e) => e.lead_time_days)),
          responses: [],
        };
      }

      if (actor.role === 'SUPPLIER_OWNER') {
        return {
          ...rfq,
          response_count: all.length,
          responses: all.filter((entry) => entry.supplier_id === actor.supplierId),
        };
      }

      return { ...rfq, response_count: all.length, responses: all };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return ok(decorated);
});

// ── POST /api/rfqs ───────────────────────────────────────────────────────────

export const POST = handled(async (request: Request) => {
  const { actor, response } = await guard();
  if (response) return response;

  const parsed = CreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid quotation request.', 422);
  }

  const product = await findById('products', parsed.data.product_id);
  if (!product) return fail('That product is no longer listed.', 404);

  const now = new Date().toISOString();
  const count = (await readAll('rfqs')).length;

  const rfq: Rfq = {
    id: await nextId('rfqs', 'rfq'),
    reference: `RFQ-${2600 + count}`,
    customer_id: actor.id,
    customer_name: actor.name,
    customer_type: actor.customerType,
    product_id: product.id,
    product_name: product.name,
    variant_id: parsed.data.variant_id ?? null,
    requested_quantity: parsed.data.requested_quantity,
    target_price: parsed.data.target_price ?? null,
    delivery_location: parsed.data.delivery_location,
    required_delivery_date: parsed.data.required_delivery_date ?? null,
    notes: parsed.data.notes ?? '',
    status: 'SUBMITTED',
    created_at: now,
    updated_at: now,
  };

  await insert('rfqs', rfq);

  // Invite every verified supplier who actually carries the product.
  const [offers, suppliers, users] = await Promise.all([
    readAll('supplier-offers'),
    readAll('suppliers'),
    readAll('users'),
  ]);

  const eligible = offers
    .filter((offer) => offer.product_id === product.id && offer.active)
    .map((offer) => suppliers.find((supplier) => supplier.id === offer.supplier_id))
    .filter((supplier): supplier is NonNullable<typeof supplier> => supplier?.status === 'VERIFIED');

  for (const supplier of eligible) {
    const owner = users.find((user) => user.supplier_id === supplier.id);
    if (!owner) continue;

    await notify({
      userId: owner.id,
      title: 'Quotation requested',
      body: `${rfq.reference} — ${rfq.requested_quantity} units of ${product.name} to ${rfq.delivery_location}.`,
      kind: 'ORDER',
    });
  }

  const staff = users.filter((user) => ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(user.role));
  for (const member of staff) {
    await notify({
      userId: member.id,
      title: 'New RFQ to source',
      body: `${rfq.reference} from ${actor.name} — ${rfq.requested_quantity} units of ${product.name}.`,
      kind: 'ORDER',
    });
  }

  await audit({
    actorId: actor.id,
    actorName: actor.name,
    action: 'RFQ_SUBMITTED',
    entity: 'rfq',
    entityId: rfq.id,
    detail: `${rfq.reference} — ${rfq.requested_quantity} × ${product.name}, ${eligible.length} supplier(s) invited.`,
  });

  return ok({ rfq, invited: eligible.length }, { status: 201 });
});
