'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AlertPrefs } from '@/types';

type SwitchKey = 'order_email' | 'order_sms' | 'marketing';

const SWITCHES: { key: SwitchKey; label: string; note: string }[] = [
  { key: 'order_email', label: 'Order updates by email', note: 'Payment, dispatch and delivery news for your orders.' },
  { key: 'order_sms', label: 'Order updates by SMS', note: 'The same news by text, for when you are out.' },
  { key: 'marketing', label: 'Offers and news', note: 'Deals and new arrivals. We only send these if you ask for them.' },
];

/** Spec 0011, AC-17 and AC-18: the three switches, saved one tap at a time. */
export function AlertSettings({ prefs: initial }: { prefs: AlertPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<SwitchKey | null>(null);

  async function toggle(key: SwitchKey) {
    setSaving(key);

    const response = await fetch('/api/account/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: !prefs[key] }),
    }).catch(() => null);

    const reply = await response?.json().catch(() => null);
    setSaving(null);

    if (!response?.ok) {
      toast.error(reply?.error ?? 'That did not save. Please try again.');
      return;
    }

    // What the server stored, so the consent date on screen is the recorded one.
    setPrefs(reply as AlertPrefs);
  }

  return (
    <section
      aria-label="Alert settings"
      className="mt-6 divide-y divide-hairline rounded-md border border-hairline bg-surface-raised"
    >
      {SWITCHES.map(({ key, label, note }) => (
        <div key={key} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-ink">{label}</p>
            <p className="mt-0.5 text-[12.5px] leading-5 text-body">
              {note}
              {key === 'marketing' && prefs.marketing_consent_at && (
                <> You agreed on {shortDate(prefs.marketing_consent_at)}.</>
              )}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs[key]}
            aria-label={label}
            disabled={saving !== null}
            onClick={() => toggle(key)}
            className={cn(
              'press-soft relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60',
              prefs[key] ? 'bg-forest' : 'bg-hairline-strong',
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                prefs[key] && 'translate-x-5',
              )}
            />
          </button>
        </div>
      ))}
    </section>
  );
}
