'use client';

import { cn } from '@/lib/utils';
import { humanise } from '@/lib/format';

/**
 * One badge for every status in the system.
 *
 * Colour carries meaning here, never emphasis. Amber means money in motion but
 * not yet settled. Green means settled or verified. Refunded is deliberately
 * slate rather than red — a refund is a clean outcome, not a failure. Suspended
 * and cancelled are inert grey and carry no colour weight at all.
 */

type Tone = 'amber' | 'green' | 'slate' | 'red' | 'inert' | 'ink';

const TONES: Record<Tone, string> = {
  amber: 'bg-gold-50 text-gold-700 ring-gold/25',
  green: 'bg-forest-wash text-forest-ink ring-forest/20',
  slate: 'bg-slateish-wash text-slateish-ink ring-slateish-ink/15',
  red: 'bg-danger-wash text-danger-ink ring-danger/20',
  inert: 'bg-inert-wash text-inert-ink ring-hairline-strong',
  ink: 'bg-ink/[0.06] text-ink ring-hairline-strong',
};

const STATUS_TONES: Record<string, Tone> = {
  // Orders
  PENDING: 'amber',
  PROCESSING: 'amber',
  IN_TRANSIT: 'ink',
  DELIVERED: 'green',
  DISPUTED: 'red',
  CANCELLED: 'inert',

  // Escrow
  HELD: 'amber',
  RELEASED: 'green',
  REFUNDED: 'slate',

  // Suppliers
  VERIFIED: 'green',
  SUSPENDED: 'inert',
  REJECTED: 'inert',
  ACTIVE: 'green',

  // Supplier orders
  AWAITING_CONFIRMATION: 'amber',
  CONFIRMED: 'green',
  PREPARING: 'amber',
  READY_FOR_COLLECTION: 'ink',
  COLLECTED: 'ink',

  // Documents, disputes, shipments
  APPROVED: 'green',
  OPEN: 'red',
  UNDER_REVIEW: 'amber',
  RESOLVED_CUSTOMER: 'slate',
  RESOLVED_SUPPLIER: 'green',
  UNASSIGNED: 'inert',
  ASSIGNED: 'amber',
  PICKED_UP: 'ink',
  FAILED: 'red',
  PAID: 'green',
  DRAFT: 'inert',
  PENDING_APPROVAL: 'amber',
  ARCHIVED: 'inert',
};

export function StatusBadge({
  status,
  className,
  size = 'md',
}: {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const tone = STATUS_TONES[status] ?? 'ink';

  // The two states that should catch an operator's eye across a room.
  const motion =
    status === 'PENDING' || status === 'AWAITING_CONFIRMATION'
      ? 'animate-pulse-soft'
      : status === 'DISPUTED'
        ? 'animate-shake'
        : '';

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
        TONES[tone],
        motion,
        className,
      )}
    >
      {humanise(status)}
    </span>
  );
}
