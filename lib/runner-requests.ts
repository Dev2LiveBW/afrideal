import type { RunnerRequest, RunnerRequestStatus } from '@/types';

/**
 * Sourcing-request state machine.
 *
 * A buyer describes something the catalogue does not carry; a verified runner
 * takes it, finds it, says what it costs, and buys it once the buyer agrees.
 *
 *   REQUESTED  ──▶ ACCEPTED    a runner takes the job
 *   ACCEPTED   ──▶ SOURCING    the runner is out looking
 *   SOURCING   ──▶ QUOTED      found it; price and condition sent back
 *   QUOTED     ──▶ APPROVED    the buyer agrees to the price
 *   APPROVED   ──▶ DELIVERING  bought, and on its way
 *   DELIVERING ──▶ CONFIRMED   the buyer has it
 *
 * Every state before CONFIRMED may be cancelled. That is deliberate: the buyer
 * has not committed to a figure until they approve one, so letting them out
 * cheaply is what makes it reasonable to ask in the first place.
 */

export const REQUEST_TRANSITIONS: Record<RunnerRequestStatus, RunnerRequestStatus[]> = {
  REQUESTED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['SOURCING', 'CANCELLED'],
  SOURCING: ['QUOTED', 'CANCELLED'],
  QUOTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: [],
  CANCELLED: [],
};

export function canAdvance(from: RunnerRequestStatus, to: RunnerRequestStatus): boolean {
  return REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

export class RequestTransitionError extends Error {
  constructor(
    readonly from: RunnerRequestStatus,
    readonly to: RunnerRequestStatus,
  ) {
    super(
      `Cannot move a sourcing request from ${from} to ${to}. Allowed from ${from}: ${
        REQUEST_TRANSITIONS[from]?.join(', ') || 'nothing — this is a final state'
      }.`,
    );
    this.name = 'RequestTransitionError';
  }
}

export const REQUEST_LABELS: Record<RunnerRequestStatus, string> = {
  REQUESTED: 'Waiting for a runner',
  ACCEPTED: 'Runner assigned',
  SOURCING: 'Out looking',
  QUOTED: 'Price found, needs your approval',
  APPROVED: 'Approved, buying now',
  DELIVERING: 'On the way to you',
  CONFIRMED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/** The short form used inside the timeline, written from the actor's side. */
const EVENT_LABELS: Record<RunnerRequestStatus, string> = {
  REQUESTED: 'Request submitted',
  ACCEPTED: 'Runner accepted the job',
  SOURCING: 'Runner is out looking',
  QUOTED: 'Found it, price sent for approval',
  APPROVED: 'Customer approved the purchase',
  DELIVERING: 'Bought and on the way',
  CONFIRMED: 'Delivered and confirmed by customer',
  CANCELLED: 'Request cancelled',
};

/** Ordered for the stepper. CANCELLED is an exit, not a rung, so it is absent. */
export const REQUEST_STEPS: RunnerRequestStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'SOURCING',
  'QUOTED',
  'APPROVED',
  'DELIVERING',
  'CONFIRMED',
];

export function stepIndex(status: RunnerRequestStatus): number {
  return REQUEST_STEPS.indexOf(status);
}

/**
 * Apply a transition, returning the updated request. Throws on an illegal move
 * rather than silently doing nothing, which the API turns into a 409 naming
 * what was allowed.
 */
export function advance(
  request: RunnerRequest,
  to: RunnerRequestStatus,
  actor: string,
  patch: Partial<Pick<RunnerRequest, 'runner_id' | 'runner_name' | 'quote'>> = {},
  note?: string,
): RunnerRequest {
  if (!canAdvance(request.status, to)) {
    throw new RequestTransitionError(request.status, to);
  }

  const at = new Date().toISOString();

  return {
    ...request,
    ...patch,
    status: to,
    updated_at: at,
    timeline: [...request.timeline, { status: to, label: EVENT_LABELS[to], at, actor, note }],
  };
}

/** What the buyer will pay if they approve: the goods plus the runner's fee. */
export const SOURCING_FEE_RATE = 0.12;

export function quoteTotal(unitPrice: number, quantity: number) {
  const goods = unitPrice * quantity;
  const serviceFee = Math.ceil(goods * SOURCING_FEE_RATE);
  return { goods, serviceFee, total: goods + serviceFee };
}
