import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, insert, nextId, readAll, update } from '@/lib/db';
import { audit, notify } from '@/lib/notifications';
import type { RfqResponse } from '@/types';

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

  // §5 — scope what comes back to what the caller is entitled to see.
  if (actor.role === 'CUSTOMER') {
    const submitted = all.filter((entry) => entry.status === 'SUBMITTED');
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

const StaffSchema = z.object({
  action: z.enum(['SET_STATUS', 'SELECT_RESPONSE']),
  status: z.enum(['SOURCING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
  response_id: z.string().optional(),
});

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

  // ── Staff triage and selection ────────────────────────────────────────
  if (!['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(actor.role)) {
    return fail('Your role cannot change a quotation request.', 403);
  }

  const parsed = StaffSchema.safeParse(body);
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

    await update('rfqs', rfq.id, { status: 'QUOTED', updated_at: now });

    await notify({
      userId: rfq.customer_id,
      title: 'Your quotation is ready',
      body: `${rfq.reference} — we have sourced ${rfq.requested_quantity} units of ${rfq.product_name}.`,
      kind: 'ORDER',
    });

    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action: 'RFQ_RESPONSE_SELECTED',
      entity: 'rfq',
      entityId: rfq.id,
      detail: `Selected response ${chosen.id} at BWP ${chosen.unit_price.toFixed(2)} per unit.`,
    });

    return ok(chosen);
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
