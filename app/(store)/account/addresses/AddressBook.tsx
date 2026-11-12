'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AlertCircle, MapPin, Plus } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { EmptyState } from '@/components/brand/Panel';
import { MAX_ADDRESSES } from '@/lib/addresses';
import type { Address, Country } from '@/types';

const FIELD =
  'w-full rounded border border-hairline-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-muted focus:border-gold/60';

type Draft = Pick<Address, 'label' | 'recipient_name' | 'phone' | 'country' | 'town' | 'street'>;

const blank = (country: string): Draft => ({
  label: '',
  recipient_name: '',
  phone: '',
  country,
  town: '',
  street: '',
});

export function AddressBook({ addresses, countries }: { addresses: Address[]; countries: Country[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const countryName = (code: string) => countries.find((country) => country.code === code)?.name;

  async function send(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const response = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const reply = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      setError(reply?.error ?? 'That did not save. Please try again.');
      return false;
    }
    router.refresh();
    return true;
  }

  async function save(draft: Draft) {
    const saved =
      editing === 'new'
        ? await send('/api/addresses', 'POST', draft)
        : await send(`/api/addresses/${(editing as Address).id}`, 'PATCH', draft);
    if (saved) setEditing(null);
  }

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-wash px-4 py-3">
          <AlertCircle size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger-ink" />
          <p className="text-[13px] leading-5 text-danger-ink">{error}</p>
        </div>
      )}

      {addresses.length === 0 && editing === null && (
        <EmptyState
          icon={<MapPin size={22} strokeWidth={1.5} />}
          title="No saved addresses yet"
          description="Add one here, or tick Save this address at checkout."
          className="rounded-md border border-hairline bg-surface-raised"
        />
      )}

      {addresses.map((address) =>
        editing !== 'new' && editing?.id === address.id ? (
          <AddressForm
            key={address.id}
            title="Edit address"
            start={address}
            countries={countries}
            busy={busy}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <article
            key={address.id}
            aria-label={address.label}
            className="rounded-md border border-hairline bg-surface-raised p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[14px] font-semibold text-ink">{address.label}</h2>
              {address.is_default && (
                <span className="rounded bg-gold-50 px-1.5 py-0.5 text-[11px] font-medium text-gold-700">Default</span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-5 text-body">
              {address.recipient_name} · {address.phone}
              <br />
              {address.street}, {address.town}, {countryName(address.country) ?? address.country}
            </p>
            {!countryName(address.country) && (
              <p className="mt-1.5 text-[12px] text-danger-ink">
                We do not deliver to this country right now, so it cannot be picked at checkout.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-[13px] font-medium">
              <button type="button" className="press-soft text-forest hover:underline" onClick={() => setEditing(address)}>
                Edit
              </button>
              {!address.is_default && (
                <button
                  type="button"
                  disabled={busy}
                  className="press-soft text-forest hover:underline"
                  onClick={() => send(`/api/addresses/${address.id}`, 'PATCH', { is_default: true })}
                >
                  Make default
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                aria-label={`Delete ${address.label}`}
                className="press-soft text-danger-ink hover:underline"
                onClick={() => {
                  if (window.confirm(`Delete ${address.label}?`)) void send(`/api/addresses/${address.id}`, 'DELETE');
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ),
      )}

      {editing === 'new' ? (
        <AddressForm
          title="Add an address"
          start={blank(countries[0]?.code ?? '')}
          countries={countries}
          busy={busy}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : addresses.length >= MAX_ADDRESSES ? (
        <p className="text-[13px] text-body">
          You have saved {MAX_ADDRESSES} addresses, the most you can keep. Delete one to add another.
        </p>
      ) : (
        <ActionButton type="button" size="md" variant="ghost" onClick={() => setEditing('new')}>
          <Plus size={15} strokeWidth={1.5} />
          Add an address
        </ActionButton>
      )}
    </div>
  );
}

function AddressForm({
  title,
  start,
  countries,
  busy,
  onSave,
  onCancel,
}: {
  title: string;
  start: Draft;
  countries: Country[];
  busy: boolean;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    label: start.label,
    recipient_name: start.recipient_name,
    phone: start.phone,
    country: start.country,
    town: start.town,
    street: start.street,
  });
  const set = (field: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }));

  const towns = countries.find((country) => country.code === draft.country)?.towns ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border border-hairline bg-surface-raised p-4">
      <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] font-medium text-ink">
          Label
          <input required maxLength={40} value={draft.label} onChange={set('label')} placeholder="Home" className={`mt-1.5 font-normal ${FIELD}`} />
        </label>
        <label className="block text-[13px] font-medium text-ink">
          Recipient
          <input required maxLength={120} value={draft.recipient_name} onChange={set('recipient_name')} autoComplete="name" className={`mt-1.5 font-normal ${FIELD}`} />
        </label>
        <label className="block text-[13px] font-medium text-ink">
          Phone
          <input required type="tel" maxLength={30} value={draft.phone} onChange={set('phone')} autoComplete="tel" className={`mt-1.5 font-normal ${FIELD}`} />
        </label>
        <label className="block text-[13px] font-medium text-ink">
          Country
          <select value={draft.country} onChange={set('country')} className={`mt-1.5 font-normal ${FIELD}`}>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[13px] font-medium text-ink">
          City or town
          <input required maxLength={120} list="address-towns" value={draft.town} onChange={set('town')} autoComplete="address-level2" className={`mt-1.5 font-normal ${FIELD}`} />
          <datalist id="address-towns">
            {towns.map((town) => (
              <option key={town} value={town} />
            ))}
          </datalist>
        </label>
        <label className="block text-[13px] font-medium text-ink">
          Street address or plot number
          <input required maxLength={200} value={draft.street} onChange={set('street')} autoComplete="street-address" className={`mt-1.5 font-normal ${FIELD}`} />
        </label>
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <ActionButton type="submit" size="md" loading={busy}>
          Save address
        </ActionButton>
        <ActionButton type="button" size="md" variant="ghost" onClick={onCancel}>
          Cancel
        </ActionButton>
      </div>
    </form>
  );
}
