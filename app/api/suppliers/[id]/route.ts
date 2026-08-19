import { z } from 'zod';

import { fail, guard, handled, ok } from '@/lib/api';
import { findById, readAll, update } from '@/lib/db';
import { EVENTS, audit, notify } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export const GET = handled(async (_request: Request, { params }: { params: { id: string } }) => {
  const supplier = await findById('suppliers', params.id);
  if (!supplier) return fail('Supplier not found.', 404);
  return ok(supplier);
});

const PatchSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED', 'PENDING']).optional(),
  /** Approve or reject a single verification document. */
  document: z
    .object({ id: z.string(), status: z.enum(['APPROVED', 'REJECTED', 'PENDING']), note: z.string().optional() })
    .optional(),
});

/** PATCH /api/suppliers/:id — approve, reject, suspend, or rule on one document. */
export const PATCH = handled(async (request: Request, { params }: { params: { id: string } }) => {
  const { actor, response } = await guard(['SUPER_ADMIN', 'OPERATIONS_ADMIN']);
  if (response) return response;

  const parsed = PatchSchema.safeParse(await request.json());
  if (!parsed.success) return fail('Invalid supplier update.', 422);

  const supplier = await findById('suppliers', params.id);
  if (!supplier) return fail('Supplier not found.', 404);

  const patch: Record<string, unknown> = {};

  if (parsed.data.document) {
    const { id, status, note } = parsed.data.document;
    patch.verification_docs = supplier.verification_docs.map((doc) =>
      doc.id === id ? { ...doc, status, ...(note ? { note } : {}) } : doc,
    );
  }

  if (parsed.data.status) {
    patch.status = parsed.data.status;

    // A newly verified supplier needs a baseline score, otherwise the selection
    // engine ranks them last forever and they never win a first order.
    if (parsed.data.status === 'VERIFIED' && supplier.reliability_score === 0) {
      patch.reliability_score = 70;
      patch.rating = 4;
      patch.fulfilment_rate = 85;
      patch.avg_fulfilment_days = 3;
    }
  }

  const updated = await update('suppliers', params.id, patch);

  if (parsed.data.status) {
    const owner = (await readAll('users')).find((user) => user.supplier_id === params.id);
    if (owner) {
      await notify({
        userId: owner.id,
        title:
          parsed.data.status === 'VERIFIED'
            ? 'You are verified'
            : parsed.data.status === 'REJECTED'
              ? 'Verification was not approved'
              : `Account ${parsed.data.status.toLowerCase()}`,
        body:
          parsed.data.status === 'VERIFIED'
            ? 'Your account is live. Your listings are now visible to buyers and can be routed orders.'
            : 'Check your verification documents in the supplier portal for the reason and next steps.',
        kind: 'SUPPLIER',
      });
    }

    await audit({
      actorId: actor.id,
      actorName: actor.name,
      action:
        parsed.data.status === 'VERIFIED' ? EVENTS.SUPPLIER_APPROVED : EVENTS.SUPPLIER_REJECTED,
      entity: 'supplier',
      entityId: params.id,
      detail: `${supplier.name} moved from ${supplier.status} to ${parsed.data.status}.`,
    });
  }

  return ok(updated);
});
