import type { AlertPrefs, User } from '@/types';

/**
 * How a buyer wants to hear from us (spec 0011, AC-17 and AC-18).
 *
 * Order updates are on until turned off, because a buyer who ordered expects
 * them. Offers and news are off until turned on, with the date of that consent
 * kept beside the switch: under the Data Protection Act the date is the record.
 */

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  order_email: true,
  order_sms: true,
  marketing: false,
  marketing_consent_at: null,
};

export type AlertChange = Partial<Pick<AlertPrefs, 'order_email' | 'order_sms' | 'marketing'>>;

/** A buyer's choices, with the defaults for an account that has never set them. */
export function alertPrefsOf(user: Pick<User, 'alert_prefs'> | null | undefined): AlertPrefs {
  return { ...DEFAULT_ALERT_PREFS, ...user?.alert_prefs };
}

/**
 * Apply a change. `consent` says whether offers and news actually moved, so a
 * resent request that changes nothing writes no audit entry and keeps the
 * original consent date.
 */
export function applyAlertChange(
  current: AlertPrefs,
  change: AlertChange,
  now: string,
): { prefs: AlertPrefs; consent: 'ON' | 'OFF' | null } {
  const marketing = change.marketing ?? current.marketing;
  const consent = marketing === current.marketing ? null : marketing ? 'ON' : 'OFF';

  return {
    consent,
    prefs: {
      order_email: change.order_email ?? current.order_email,
      order_sms: change.order_sms ?? current.order_sms,
      marketing,
      marketing_consent_at: consent === 'ON' ? now : consent === 'OFF' ? null : current.marketing_consent_at,
    },
  };
}
