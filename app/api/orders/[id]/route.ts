import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, insert, mutate, nextId, readAll, update } from '@/lib/db';
import { applyTransition } from '@/lib/payables';
import { EVENTS, audit, notify } from '@/lib/notifications';
import { providerFor } from '@/lib/payments/adapters';
import { confirmPayment } from '@/lib/payments/confirm';
import { getOrderDetail } from '@/lib/queries';
import type { Dispute, Order } from '@/types';

export const dynamic = 'force-dynamic';

export const GET = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const detail = await getOrderDetail(params.id);
  if (!detail) return fail('Order not found.', 404);

  if (actor.role === 'CUSTOMER' && detail.order.customer_id !== actor.id) {
    return fail('Not your order.', 403);
  }

  if (actor.role === 'SUPPLIER_OWNER') {
    const mine = detail.legs.some((leg) => leg.supplier_id === actor.supplierId);
    if (!mine) return fail('That order does not include your goods.', 403);

    // A supplier sees only their own leg of a split order.
    return ok({ ...detail, legs: detail.legs.filter((leg) => leg.supplier_id === actor.supplierId) });
  }

  return ok(detail);
});

const PatchSchema = z.object({
  action: z.enum(['CONFIRM_DELIVERY', 'RAISE_DISPUTE', 'CANCEL', 'ADD_NOTE', 'MARK_PAID']),
  reason: z.string().max(120).optional(),
  detail: z.string().max(1000).optional(),
  note: z.string().max(2000).optional(),
  /** MARK_PAID: the bank's reference for the transfer. Required, and how finance traces it. */
  reference: z.string().min(1).max(120).optional(),
  /**
   * MARK_PAID: what actually landed. Optional because it usually equals the
   * total; when it does not, AC-11 flags the order rather than silently
   * accepting an underpayment.
   */
  amount: z.number().nonnegative().optional(),
  /**
   * MARK_PAID: the admin's own words. Separate from `note`, which is the
   * internal-notes field ADD_NOTE writes and means something else.
   */
  paid_note: z.string().max(2000).optional(),
});

export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard();
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid order action.', 422);

  const order = await findById('orders', params.id);
  if (!order) return fail('Order not found.', 404);

  const isOwner = order.customer_id === actor.id;
  const isStaff = ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'].includes(actor.role);
  if (!isOwner && !isStaff) return fail('Not your order.', 403);

  const now = new Date().toISOString();
  const legs = (await readAll('supplier-payables')).filter((record) => record.order_id === params.id);

  switch (parsed.data.action) {
    // ── Customer confirms receipt → every held leg releases ──────────────
    case 'CONFIRM_DELIVERY': {
      for (const leg of legs) {
        if (leg.status !== 'PENDING') continue;
        await update(
          'supplier-payables',
          leg.id,
          applyTransition(leg, 'SETTLED', actor.name, 'Customer confirmed delivery.'),
        );
      }

      const updated = await update('orders', params.id, {
        status: 'DELIVERED',
        updated_at: now,
        timeline: [
          ...order.timeline,
          { status: 'DELIVERED', label: 'Delivery confirmed by customer', at: now, actor: actor.name },
          { status: 'SETTLED', label: 'Supplier invoice settled', at: now },
        ],
      });

      await audit({
        actorId: actor.id,
        actorName: actor.name,
        action: EVENTS.PAYABLE_SETTLED,
        entity: 'order',
        entityId: params.id,
        detail: `${order.reference} confirmed delivered; ${legs.length} supplier invoice(s) settled.`,
      });

      return ok(updated);
    }

    // ── Customer raises a dispute → legs freeze ──────────────────────────
    case 'RAISE_DISPUTE': {
      if (!parsed.data.reason) return fail('Tell us what went wrong.', 422);

      const frozen = [];
      for (const leg of legs) {
        if (leg.status !== 'PENDING') continue;
        await update(
          'supplier-payables',
          leg.id,
          applyTransition(leg, 'ON_HOLD', actor.name, parsed.data.reason),
        );
        frozen.push(leg);
      }

      if (frozen.length === 0) return fail('There is nothing left open on this order to claim against.', 409);

      const dispute: Dispute = {
        id: await nextId('disputes', 'dp'),
        order_id: params.id,
        payable_id: frozen[0].id,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        supplier_id: frozen[0].supplier_id,
        reason: parsed.data.reason,
        detail: parsed.data.detail ?? '',
        status: 'OPEN',
        opened_at: now,
        sla_due_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        resolved_at: null,
        resolution_note: null,
      };

      await insert('disputes', dispute);

      await update('orders', params.id, {
        status: 'DISPUTED',
        updated_at: now,
        timeline: [
          ...order.timeline,
          { status: 'DISPUTED', label: 'Claim raised - under review', at: now, actor: actor.name },
        ],
      });

      const staff = (await readAll('users')).filter((user) =>
        ['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(user.role),
      );
      for (const member of staff) {
        await notify({
          userId: member.id,
          title: 'New dispute raised',
          body: `${order.reference} - ${parsed.data.reason}. Five-day SLA clock started.`,
          kind: 'DISPUTE',
        });
      }

      return ok(dispute, { status: 201 });
    }

    case 'CANCEL': {
      // Money that has arrived is never cancelled away here. A confirmation that
      // was interrupted part way leaves a CONFIRMED payment on an order still
      // AWAITING_PAYMENT; cancelling it would strand the buyer's money, cancel the
      // payables and make confirmPayment() refuse the order for good.
      const paid = (await readAll('payments')).some(
        (row) => row.order_id === params.id && row.status === 'CONFIRMED',
      );
      if (paid) {
        return fail('That order is already paid for, so it cannot be cancelled here. Contact us about a refund.', 409);
      }

      // The order write is conditional on the status it finds under the lock, so
      // a confirmation that finished a moment ago is not overwritten. A claim that
      // lands between the payment check above and this write is caught on the
      // other side: confirmPayment() sees the deliberate cancellation and flags it
      // for finance instead of quietly reopening it.
      //
      // The reason is what stops a late payment silently reopening this order.
      // confirmPayment() reopens an EXPIRED cancellation and refuses a deliberate
      // one, so recording who decided is load bearing, not bookkeeping.
      const updated = await mutate<'orders', Order | null>('orders', (rows) => {
        const index = rows.findIndex((row) => row.id === params.id);
        const current = index === -1 ? null : rows[index];
        if (!current || (current.status !== 'AWAITING_PAYMENT' && current.status !== 'PENDING')) {
          return { rows, result: null };
        }

        const next: Order = {
          ...current,
          status: 'CANCELLED',
          cancel_reason: isStaff ? 'STAFF' : 'CUSTOMER',
          updated_at: now,
          timeline: [...current.timeline, { status: 'CANCELLED', label: 'Cancelled', at: now, actor: actor.name }],
        };
        const copy = [...rows];
        copy[index] = next;
        return { rows: copy, result: next };
      });

      // Spec 0003: an unpaid order is AWAITING_PAYMENT, not PENDING. Without the
      // first a buyer could no longer cancel their own unpaid order at all.
      if (!updated) return fail('Only an unpaid order can be cancelled here.', 409);

      for (const leg of legs) {
        if (leg.status !== 'PENDING') continue;
        await update('supplier-payables', leg.id, applyTransition(leg, 'CANCELLED', actor.name, 'Order cancelled.'));
      }

      return ok(updated);
    }

    // ── Finance confirms a bank transfer by hand (spec 0003, AC-6) ────────
    case 'MARK_PAID': {
      // Deliberately narrower than `isStaff`, which includes operations. Finance
      // surfaces are theirs alone, and OPS_DENIED_PREFIXES only gates page paths,
      // not API routes, so this check is the real guard.
      if (!['FINANCE_ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
        return fail('Only finance can mark an order paid.', 403);
      }

      if (!parsed.data.reference) {
        return fail('A payment reference is required to mark an order paid.', 422);
      }

      const existing = (await readAll('payments')).find(
        (row) => row.order_id === params.id && row.status === 'CONFIRMED',
      );

      // A confirmed payment on an order that never reached PROCESSING is a
      // confirmation that was interrupted part way. For a bank transfer there is
      // no gateway to retry it, only this button, so it resumes the run with the
      // payment already on file instead of refusing. That finishes the supplier
      // legs and the order; the reference typed this time is not needed.
      const unfinished =
        order.status === 'AWAITING_PAYMENT' ||
        (order.status === 'CANCELLED' && order.cancel_reason === 'EXPIRED');

      if (existing && !unfinished) return fail('That order is already paid for.', 409);

      const result = await confirmPayment(
        existing
          ? {
              orderId: params.id,
              provider: existing.provider,
              providerReference: existing.provider_reference ?? parsed.data.reference,
              amount: existing.amount,
              actor: { id: actor.id, name: actor.name },
              note: existing.note,
            }
          : {
              orderId: params.id,
              provider: providerFor(order.payment_method),
              providerReference: parsed.data.reference,
              // Defaults to the total. A different figure is recorded and flagged,
              // not rejected: the money has already arrived, so refusing it helps
              // nobody.
              amount: parsed.data.amount ?? order.total,
              actor: { id: actor.id, name: actor.name },
              note: parsed.data.paid_note ?? null,
            },
      );

      if (!result.ok) {
        if (result.reason === 'NOT_FOUND') return fail('Order not found.', 404);
        if (result.reason === 'CANCELLED_BY_PERSON') {
          return fail('That order was cancelled on purpose and will not reopen on a payment.', 409);
        }
        if (result.reason === 'REFERENCE_USED_ELSEWHERE') {
          // The likeliest way a human hits this: reusing a bank reference they
          // already entered against another order. Say so plainly.
          return fail(
            'That reference is already settled against another order. Check the statement and use the right one.',
            409,
          );
        }
        return fail('That order already has a different confirmed payment.', 409);
      }

      return ok({
        order: result.order,
        payment: result.payment,
        late: result.late,
        // False means the figure did not match the total, so finance needs to chase it.
        amount_matches: result.payment.amount_matches,
      });
    }

    case 'ADD_NOTE': {
      if (!isStaff) return fail('Internal notes are staff-only.', 403);
      return ok(await update('orders', params.id, { internal_notes: parsed.data.note ?? '' }));
    }
  }
});
