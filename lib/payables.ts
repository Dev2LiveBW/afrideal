import type { PayableStatus, PayableTransition, SupplierPayable } from '@/types';

/**
 * Supplier payables - the platform's own trade creditors ledger.
 *
 * AfriDeal is the merchant of record. The customer buys from AfriDeal and pays
 * AfriDeal through a licensed payment provider; AfriDeal buys the goods from
 * the supplier and owes that supplier an invoice. This ledger tracks those
 * invoices. It is accounts payable, not money held on anyone else's behalf.
 *
 *   PENDING ──▶ SETTLED     supplier invoice paid
 *           ──▶ CANCELLED   the leg did not ship, so nothing is owed
 *           ──▶ ON_HOLD     the customer raised a claim; settlement pauses
 *
 *   ON_HOLD ──▶ SETTLED     resolved in the supplier's favour
 *           ──▶ CANCELLED   resolved in the customer's favour
 *
 * SETTLED and CANCELLED are terminal. An invoice that has been paid is not
 * unpaid by a later event - that would be a credit note, which is a new
 * document rather than a transition on this one.
 */

export const PAYABLE_TRANSITIONS: Record<PayableStatus, PayableStatus[]> = {
  PENDING: ['SETTLED', 'CANCELLED', 'ON_HOLD'],
  ON_HOLD: ['SETTLED', 'CANCELLED'],
  SETTLED: [],
  CANCELLED: [],
};

export function canTransition(from: PayableStatus, to: PayableStatus): boolean {
  return PAYABLE_TRANSITIONS[from]?.includes(to) ?? false;
}

export class PayableTransitionError extends Error {
  constructor(
    readonly from: PayableStatus,
    readonly to: PayableStatus,
  ) {
    super(
      `Cannot move a supplier payable from ${from} to ${to}. Allowed from ${from}: ${
        PAYABLE_TRANSITIONS[from]?.join(', ') || 'nothing - this is a terminal state'
      }.`,
    );
    this.name = 'PayableTransitionError';
  }
}

/**
 * Apply a transition, returning the updated record. Throws rather than silently
 * no-op'ing: an invalid move on the creditors ledger is a bug worth surfacing,
 * not a warning to swallow.
 */
export function applyTransition(
  record: SupplierPayable,
  to: PayableStatus,
  actor: string,
  note: string,
): SupplierPayable {
  if (!canTransition(record.status, to)) {
    throw new PayableTransitionError(record.status, to);
  }

  const at = new Date().toISOString();
  const entry: PayableTransition = { from: record.status, to, at, actor, note };

  return {
    ...record,
    status: to,
    settled_at: to === 'SETTLED' ? at : record.settled_at,
    cancelled_at: to === 'CANCELLED' ? at : record.cancelled_at,
    history: [...record.history, entry],
  };
}

/** Invoices past their agreed payment terms - the payables queue's "Overdue" tab. */
export function isOverdue(record: SupplierPayable, now: Date = new Date()): boolean {
  if (record.status !== 'PENDING') return false;
  const ageDays = (now.getTime() - new Date(record.raised_at).getTime()) / 86_400_000;
  return ageDays > record.terms_days;
}

/** Days from invoice raised to settled, or to now while it is still open. */
export function openDays(record: SupplierPayable, now: Date = new Date()): number {
  const end = record.settled_at ?? record.cancelled_at ?? now.toISOString();
  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(record.raised_at).getTime()) / 86_400_000),
  );
}

export interface PayableSummary {
  totalPending: number;
  pendingCount: number;
  settledMtd: number;
  settledMtdCount: number;
  onHold: number;
  onHoldCount: number;
  overdueCount: number;
  avgDaysToSettle: number;
}

export function summarise(records: SupplierPayable[], now: Date = new Date()): PayableSummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const pending = records.filter((r) => r.status === 'PENDING');
  const onHold = records.filter((r) => r.status === 'ON_HOLD');
  const settled = records.filter((r) => r.status === 'SETTLED');
  const settledMtd = settled.filter(
    (r) => r.settled_at != null && new Date(r.settled_at) >= monthStart,
  );

  const closed = records.filter((r) => r.settled_at != null || r.cancelled_at != null);
  const avgDaysToSettle =
    closed.length === 0
      ? 0
      : closed.reduce((sum, r) => sum + openDays(r, now), 0) / closed.length;

  return {
    totalPending: pending.reduce((sum, r) => sum + r.amount, 0),
    pendingCount: pending.length,
    settledMtd: settledMtd.reduce((sum, r) => sum + r.amount, 0),
    settledMtdCount: settledMtd.length,
    onHold: onHold.reduce((sum, r) => sum + r.amount, 0),
    onHoldCount: onHold.length,
    overdueCount: records.filter((r) => isOverdue(r, now)).length,
    avgDaysToSettle,
  };
}
