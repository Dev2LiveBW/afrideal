import { describe, expect, it } from 'vitest';

import { DEFAULT_ALERT_PREFS, alertPrefsOf, applyAlertChange } from '@/lib/alert-prefs';

const NOW = '2026-11-04T08:00:00.000Z';
const CONSENTED = { ...DEFAULT_ALERT_PREFS, marketing: true, marketing_consent_at: '2026-01-01T00:00:00.000Z' };

describe('alertPrefsOf', () => {
  it('gives an account with no choices order updates on and marketing off', () => {
    expect(alertPrefsOf({})).toEqual({ order_email: true, order_sms: true, marketing: false, marketing_consent_at: null });
    expect(alertPrefsOf(null)).toEqual(DEFAULT_ALERT_PREFS);
  });

  it('keeps what a buyer chose', () => {
    expect(alertPrefsOf({ alert_prefs: { ...DEFAULT_ALERT_PREFS, order_sms: false } }).order_sms).toBe(false);
  });
});

describe('applyAlertChange', () => {
  it('records the date when offers and news are turned on', () => {
    const { prefs, consent } = applyAlertChange(DEFAULT_ALERT_PREFS, { marketing: true }, NOW);
    expect(consent).toBe('ON');
    expect(prefs).toMatchObject({ marketing: true, marketing_consent_at: NOW });
  });

  it('clears the date when they are turned off', () => {
    const { prefs, consent } = applyAlertChange(CONSENTED, { marketing: false }, NOW);
    expect(consent).toBe('OFF');
    expect(prefs).toMatchObject({ marketing: false, marketing_consent_at: null });
  });

  it('keeps the original consent date when the switch does not move', () => {
    const { prefs, consent } = applyAlertChange(CONSENTED, { marketing: true }, NOW);
    expect(consent).toBeNull();
    expect(prefs.marketing_consent_at).toBe(CONSENTED.marketing_consent_at);
  });

  it('changing an order switch leaves marketing and its date alone', () => {
    const { prefs, consent } = applyAlertChange(CONSENTED, { order_email: false }, NOW);
    expect(consent).toBeNull();
    expect(prefs).toEqual({ ...CONSENTED, order_email: false });
  });
});
