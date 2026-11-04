import 'server-only';

import { insert, nextId } from '@/lib/db';
import type { AppNotification, AuditEntry } from '@/types';

/**
 * Notification and audit dispatch.
 *
 * In production these fan out to FCM, email and SMS. Here they land in
 * /data/notifications.json and /data/audit-log.json, which is enough to prove
 * the events fire at the right moments and to render a believable bell menu.
 */

export async function notify(input: {
  userId: string;
  title: string;
  body: string;
  kind: AppNotification['kind'];
}): Promise<AppNotification> {
  const notification: AppNotification = {
    id: await nextId('notifications', 'n'),
    user_id: input.userId,
    title: input.title,
    body: input.body,
    kind: input.kind,
    read: false,
    at: new Date().toISOString(),
  };

  return insert('notifications', notification);
}

export async function notifyMany(
  userIds: string[],
  input: { title: string; body: string; kind: AppNotification['kind'] },
): Promise<void> {
  for (const userId of userIds) {
    await notify({ userId, ...input });
  }
}

export async function audit(input: {
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
}): Promise<AuditEntry> {
  const entry: AuditEntry = {
    id: await nextId('audit-log', 'a'),
    at: new Date().toISOString(),
    actor_id: input.actorId,
    actor_name: input.actorName,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId,
    detail: input.detail,
  };

  return insert('audit-log', entry);
}

/** Domain events emitted by the order pipeline, kept as a closed set. */
export const EVENTS = {
  ORDER_CREATED: 'ORDER_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  /** Money that arrived but could not be applied. Needs a human: refund or decide. */
  PAYMENT_REFUSED: 'PAYMENT_REFUSED',
  /** A card payment the buyer's bank is clawing back (spec 0010). Needs finance before Stripe's deadline. */
  PAYMENT_CHARGEBACK: 'PAYMENT_CHARGEBACK',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  SUPPLIER_ORDER_CREATED: 'SUPPLIER_ORDER_CREATED',
  PAYABLE_RAISED: 'PAYABLE_RAISED',
  PAYABLE_SETTLED: 'PAYABLE_SETTLED',
  PAYABLE_CANCELLED: 'PAYABLE_CANCELLED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  SUPPLIER_APPROVED: 'SUPPLIER_APPROVED',
  SUPPLIER_REJECTED: 'SUPPLIER_REJECTED',
  SUPPLIER_OVERRIDDEN: 'SUPPLIER_OVERRIDDEN',
  QUOTE_ANSWERED: 'QUOTE_ANSWERED',
  SOURCING_REQUESTED: 'SOURCING_REQUESTED',
  SOURCING_ACCEPTED: 'SOURCING_ACCEPTED',
  SOURCING_QUOTED: 'SOURCING_QUOTED',
  SOURCING_ADVANCED: 'SOURCING_ADVANCED',
  RUNNER_STATUS_CHANGED: 'RUNNER_STATUS_CHANGED',
  SHIPMENT_CREATED: 'SHIPMENT_CREATED',
  SHIPMENT_DELIVERED: 'SHIPMENT_DELIVERED',
  REFUND_ISSUED: 'REFUND_ISSUED',
  /** Spec 0011, AC-18: the record of a buyer opting in to or out of offers and news. */
  MARKETING_CONSENT_ON: 'MARKETING_CONSENT_ON',
  MARKETING_CONSENT_OFF: 'MARKETING_CONSENT_OFF',
  PROMO_CREATED: 'PROMO_CREATED',
  PROMO_CHANGED: 'PROMO_CHANGED',
  /** A code that stopped standing between the quote and the order. */
  PROMO_STALE_REFUSED: 'PROMO_STALE_REFUSED',
  /** A late payment reopened an order on a code the buyer had since used again. */
  PROMO_LATE_REUSE: 'PROMO_LATE_REUSE',
} as const;

export type DomainEvent = (typeof EVENTS)[keyof typeof EVENTS];
