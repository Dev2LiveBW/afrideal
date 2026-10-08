import 'server-only';

import { findById, insert, update } from '@/lib/db';
import type { Setting } from '@/types';

/**
 * Platform switches a human can flip without a deploy (spec 0003, AC-8).
 *
 * The first one is the checkout pause: a way to stop taking money during an
 * incident. `admin/settings` has had a form for a while that persisted nothing;
 * this is the first switch that actually lands in the store.
 */

const CHECKOUT_PAUSED = 'checkout_paused';

/**
 * Whether checkout is paused.
 *
 * Fails open on purpose. A missing row, a malformed value, or a read that throws
 * all mean "not paused", because a settings outage must never be able to stop the
 * business trading. The switch exists to stop payments deliberately, and a
 * deliberate pause is always a written row.
 */
export async function checkoutIsPaused(): Promise<boolean> {
  try {
    const row = await findById('settings', CHECKOUT_PAUSED);
    return row?.value?.paused === true;
  } catch {
    return false;
  }
}

/**
 * Turn the pause on or off, recording who did it.
 *
 * Creates the row the first time, because a fresh database has no settings and the
 * first person to pause checkout should not have to seed one by hand.
 */
export async function setCheckoutPaused(paused: boolean, actorName: string): Promise<Setting> {
  const now = new Date().toISOString();
  const existing = await findById('settings', CHECKOUT_PAUSED);

  if (!existing) {
    return insert('settings', {
      id: CHECKOUT_PAUSED,
      value: { paused },
      updated_at: now,
      updated_by: actorName,
    });
  }

  const saved = await update('settings', CHECKOUT_PAUSED, {
    value: { paused },
    updated_at: now,
    updated_by: actorName,
  });

  // `update` returns null only if the row vanished between the read and the write.
  // Reporting the state we just asked for is honest enough for a switch.
  return saved ?? { id: CHECKOUT_PAUSED, value: { paused }, updated_at: now, updated_by: actorName };
}
