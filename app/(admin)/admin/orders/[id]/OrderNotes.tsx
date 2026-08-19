'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { GoldButton } from '@/components/brand/GoldButton';

/** Staff-only note, saved via PATCH /api/orders/:id { action: 'ADD_NOTE' }. */
export function OrderNotes({ orderId, initialNote }: { orderId: string; initialNote: string }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const dirty = note !== initialNote;

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_NOTE', note }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error ?? 'Request failed');
      }
      toast.success('Internal note saved');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={6}
        placeholder="Notes visible to staff only — escalation context, delivery exceptions, customer calls…"
        className="w-full resize-y rounded border border-hairline-strong bg-surface px-3 py-2.5 text-[13px] leading-5 text-ink outline-none focus:border-gold"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted">Staff-only. Never shown to the customer or supplier.</p>
        <GoldButton size="sm" onClick={save} loading={saving} disabled={!dirty} icon={<Save size={14} strokeWidth={1.5} />}>
          Save note
        </GoldButton>
      </div>
    </div>
  );
}
