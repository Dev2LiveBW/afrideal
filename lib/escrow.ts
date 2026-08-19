import type { EscrowRecord, EscrowStatus, EscrowTransition } from '@/types';

/**
 * Escrow state machine.
 *
 *   HELD ──▶ RELEASED     supplier paid out
 *        ──▶ REFUNDED     customer made whole
 *        ──▶ DISPUTED     customer raised a claim; funds frozen
 *
 *   DISPUTED ──▶ RELEASED   resolved in the supplier's favour
 *            ──▶ REFUNDED   resolved in the customer's favour
 *
 * RELEASED and REFUNDED are terminal. Money that has left the account does not
 * come back through this machine — that is a new payment, not a transition.
 */

export const ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  HELD: ['RELEASED', 'REFUNDED', 'DISPUTED'],
  DISPUTED: ['RELEASED', 'REFUNDED'],
  RELEASED: [],
  REFUNDED: [],
};

export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return ESCROW_TRANSITIONS[from]?.includes(to) ?? false;
}

export class EscrowTransitionError extends Error {
  constructor(
    readonly from: EscrowStatus,
    readonly to: EscrowStatus,
  ) {
    super(
      `Cannot move escrow from ${from} to ${to}. Allowed from ${from}: ${
        ESCROW_TRANSITIONS[from]?.join(', ') || 'nothing — this is a terminal state'
      }.`,
    );
    this.name = 'EscrowTransitionError';
  }
}

/**
 * Apply a transition, returning the updated record. Throws rather than silently
 * no-op'ing: an invalid escrow move is a bug worth surfacing, not a warning to
 * swallow.
 */
export function applyTransition(
  record: EscrowRecord,
  to: EscrowStatus,
  actor: string,
  note: string,
): EscrowRecord {
  if (!canTransition(record.status, to)) {
    throw new EscrowTransitionError(record.status, to);
  }

  const at = new Date().toISOString();
  const entry: EscrowTransition = { from: record.status, to, at, actor, note };

  return {
    ...record,
    status: to,
    released_at: to === 'RELEASED' ? at : record.released_at,
    refunded_at: to === 'REFUNDED' ? at : record.refunded_at,
    history: [...record.history, entry],
  };
}

/** Funds sitting past their hold window — the escrow queue's "Overdue" tab. */
export function isOverdue(record: EscrowRecord, now: Date = new Date()): boolean {
  if (record.status !== 'HELD') return false;
  const ageDays = (now.getTime() - new Date(record.held_at).getTime()) / 86_400_000;
  return ageDays > record.hold_window_days;
}

export function heldDays(record: EscrowRecord, now: Date = new Date()): number {
  const end = record.released_at ?? record.refunded_at ?? now.toISOString();
  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(record.held_at).getTime()) / 86_400_000),
  );
}

export interface EscrowSummary {
  totalHeld: number;
  heldCount: number;
  releasedMtd: number;
  releasedMtdCount: number;
  disputed: number;
  disputedCount: number;
  overdueCount: number;
  avgHoldDays: number;
}

export function summarise(records: EscrowRecord[], now: Date = new Date()): EscrowSummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const held = records.filter((r) => r.status === 'HELD');
  const disputed = records.filter((r) => r.status === 'DISPUTED');
  const released = records.filter((r) => r.status === 'RELEASED');
  const releasedMtd = released.filter(
    (r) => r.released_at != null && new Date(r.released_at) >= monthStart,
  );

  const settled = records.filter((r) => r.released_at != null || r.refunded_at != null);
  const avgHoldDays =
    settled.length === 0
      ? 0
      : settled.reduce((sum, r) => sum + heldDays(r, now), 0) / settled.length;

  return {
    totalHeld: held.reduce((sum, r) => sum + r.amount, 0),
    heldCount: held.length,
    releasedMtd: releasedMtd.reduce((sum, r) => sum + r.amount, 0),
    releasedMtdCount: releasedMtd.length,
    disputed: disputed.reduce((sum, r) => sum + r.amount, 0),
    disputedCount: disputed.length,
    overdueCount: records.filter((r) => isOverdue(r, now)).length,
    avgHoldDays,
  };
}
