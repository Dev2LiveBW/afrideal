'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Power } from 'lucide-react';
import toast from 'react-hot-toast';

import { cn } from '@/lib/utils';

/**
 * The online/offline switch.
 *
 * Full-width and impossible to miss, per the brief: forest green and "You're
 * online" when accepting jobs, inert grey and "You're offline" when not.
 * Optimistic — flips immediately, rolls back if the PATCH fails.
 */
export function OnlineToggle({ runnerId, initialOnline }: { runnerId: string; initialOnline: boolean }) {
  const router = useRouter();
  const [online, setOnline] = useState(initialOnline);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !online;
    setOnline(next);
    setSaving(true);

    try {
      const response = await fetch(`/api/runners/${runnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online: next }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: 'Could not update your status.' }));
        throw new Error(error ?? 'Could not update your status.');
      }

      toast.success(next ? "You're online — job alerts are on" : "You're offline");
      router.refresh();
    } catch (error) {
      setOnline(!next);
      toast.error(error instanceof Error ? error.message : 'Could not update your status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={online}
      className={cn(
        'flex min-h-[76px] w-full items-center justify-between gap-4 rounded-lg px-5 py-5 text-left',
        'transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-85',
        online ? 'bg-forest text-white shadow-lift' : 'bg-inert-wash text-inert-ink',
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            online ? 'bg-white/15' : 'bg-ink/[0.06]',
          )}
        >
          {saving ? (
            <Loader2 size={20} strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Power size={20} strokeWidth={1.5} />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-tight">{online ? "You're online" : "You're offline"}</p>
          <p className={cn('mt-0.5 truncate text-[12.5px]', online ? 'text-white/70' : 'text-inert-ink/70')}>
            {online ? 'Accepting job alerts nearby' : 'Tap to start accepting jobs'}
          </p>
        </div>
      </div>

      <span
        className={cn(
          'flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-300',
          online ? 'justify-end bg-white/25' : 'justify-start bg-ink/10',
        )}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}
