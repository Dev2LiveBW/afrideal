'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, FileText, X } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { cn } from '@/lib/utils';
import type { CustomerType } from '@/types';

/**
 * Request for quotation (§21).
 *
 * Deliberately not a checkout. No money moves and no escrow opens: submitting
 * asks every verified supplier carrying the product to quote privately, and
 * operations comes back with one landed price. What each supplier quotes is
 * confidential and never surfaces here.
 */
export function RfqModal({
  isOpen,
  onClose,
  productId,
  productName,
  initialQty,
  customerType,
}: {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  initialQty: number;
  customerType: CustomerType;
}) {
  const router = useRouter();

  const [qty, setQty] = useState(initialQty);
  const [target, setTarget] = useState('');
  const [location, setLocation] = useState('Gaborone');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQty(initialQty);
      setError(null);
      setReference(null);
    }
  }, [isOpen, initialQty]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  async function submit() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          requested_quantity: qty,
          target_price: target ? Number(target) : null,
          delivery_location: location,
          notes,
        }),
      });

      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        setError('Sign in first so we can send the quotation back to your account.');
        return;
      }
      if (!response.ok) throw new Error(body?.error ?? 'We could not submit that request.');

      setReference(body.rfq.reference);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = cn(
    'w-full rounded border border-hairline-strong bg-surface px-3.5 py-2.5',
    'text-[14px] text-ink outline-none transition-colors',
    'placeholder:text-muted focus:border-gold/60',
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Request a quotation"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-lg bg-surface-raised shadow-lift"
          >
            {reference ? (
              <div className="p-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-wash text-forest">
                  <CheckCircle2 size={22} strokeWidth={1.5} />
                </span>
                <h2 className="mt-5 text-[18px] font-semibold text-ink">Quotation requested</h2>
                <p className="measure mx-auto mt-2 text-[13.5px] leading-6 text-body">
                  Reference{' '}
                  <span className="font-mono font-medium tabular-nums text-ink">{reference}</span>.
                  We are sourcing {qty.toLocaleString('en-GB')} units across verified suppliers and
                  will come back with a landed price, usually within two working days.
                </p>
                <GoldButton variant="gold" size="md" className="mt-6" onClick={onClose}>
                  Done
                </GoldButton>
              </div>
            ) : (
              <>
                <header className="flex items-start gap-4 border-b border-hairline p-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-dark">
                    <FileText size={18} strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-semibold text-ink">Request a quotation</h2>
                    <p className="mt-1 truncate text-[13px] text-body">{productName}</p>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-1 -mt-1 rounded-full p-1.5 text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </header>

                <div className="space-y-4 p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="rfq-qty" className="mb-1.5 block text-[13px] font-medium text-ink">
                        Quantity
                      </label>
                      <input
                        id="rfq-qty"
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="rfq-target" className="mb-1.5 block text-[13px] font-medium text-ink">
                        Target unit price <span className="text-muted">(optional)</span>
                      </label>
                      <input
                        id="rfq-target"
                        type="number"
                        min={0}
                        value={target}
                        onChange={(event) => setTarget(event.target.value)}
                        placeholder="BWP"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="rfq-location" className="mb-1.5 block text-[13px] font-medium text-ink">
                      Delivery location
                    </label>
                    <input
                      id="rfq-location"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Gaborone"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="rfq-notes" className="mb-1.5 block text-[13px] font-medium text-ink">
                      Anything the suppliers should know{' '}
                      <span className="text-muted">(optional)</span>
                    </label>
                    <textarea
                      id="rfq-notes"
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Delivery must land before the January term. Palletised, to site."
                      className={cn(inputClass, 'resize-none')}
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded border border-danger/30 bg-danger-wash px-3.5 py-3">
                      <AlertCircle size={15} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger-ink" />
                      <p className="text-[13px] leading-5 text-danger-ink">{error}</p>
                    </div>
                  )}

                  <p className="text-[12px] leading-5 text-muted">
                    Quoted as a {customerType.toLowerCase()} account. Submitting does not place an
                    order and takes no payment.
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t border-hairline bg-surface px-6 py-4">
                  <GoldButton variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                    Cancel
                  </GoldButton>
                  <GoldButton variant="gold" size="sm" onClick={submit} loading={saving}>
                    Send request
                  </GoldButton>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
