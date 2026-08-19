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
  SUPPLIER_ORDER_CREATED: 'SUPPLIER_ORDER_CREATED',
  ESCROW_HELD: 'ESCROW_HELD',
  ESCROW_RELEASED: 'ESCROW_RELEASED',
  ESCROW_REFUNDED: 'ESCROW_REFUNDED',
  DISPUTE_OPENED: 'DISPUTE_OPENED',
  SUPPLIER_APPROVED: 'SUPPLIER_APPROVED',
  SUPPLIER_REJECTED: 'SUPPLIER_REJECTED',
  SUPPLIER_OVERRIDDEN: 'SUPPLIER_OVERRIDDEN',
  QUOTE_ANSWERED: 'QUOTE_ANSWERED',
  RUNNER_STATUS_CHANGED: 'RUNNER_STATUS_CHANGED',
  SHIPMENT_DELIVERED: 'SHIPMENT_DELIVERED',
} as const;

export type DomainEvent = (typeof EVENTS)[keyof typeof EVENTS];
