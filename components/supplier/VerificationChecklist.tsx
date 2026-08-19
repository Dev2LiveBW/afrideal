'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { ConfirmDialog } from '@/components/brand/ConfirmDialog';
import { GoldButton } from '@/components/brand/GoldButton';
import { StatusBadge } from '@/components/brand/StatusBadge';
import { dateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SupplierStatus, VerificationDoc } from '@/types';

/**
 * Per-document review plus the overall verification decision.
 *
 * Both write to the same endpoint (`PATCH /api/suppliers/:id`) with a
 * different body shape — `{ document }` for one file, `{ status }` for the
 * supplier as a whole — so the two actions can never leave the record in a
 * state the API itself would reject.
 */

export function VerificationChecklist({
  supplierId,
  supplierName,
  documents,
  currentStatus,
  canDecide = true,
}: {
  supplierId: string;
  supplierName: string;
  documents: VerificationDoc[];
  currentStatus: SupplierStatus;
  canDecide?: boolean;
}) {
  const router = useRouter();
  const [docAction, setDocAction] = useState<{ doc: VerificationDoc; status: 'APPROVED' | 'REJECTED' } | null>(
    null,
  );
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<SupplierStatus | null>(null);
  const [saving, setSaving] = useState(false);

  async function patchSupplier(body: Record<string, unknown>) {
    const response = await fetch(`/api/suppliers/${supplierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const { error } = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error ?? 'Request failed');
    }
    return response.json();
  }

  function closeDocDialog() {
    setDocAction(null);
    setNote('');
  }

  async function confirmDoc() {
    if (!docAction) return;
    setSaving(true);
    try {
      await patchSupplier({
        document: { id: docAction.doc.id, status: docAction.status, ...(note ? { note } : {}) },
      });
      toast.success(`${docAction.doc.label} ${docAction.status === 'APPROVED' ? 'approved' : 'rejected'}`);
      closeDocDialog();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update that document');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDecision() {
    if (!decision) return;
    setSaving(true);
    try {
      await patchSupplier({ status: decision });
      toast.success(
        decision === 'VERIFIED'
          ? `${supplierName} is verified and live`
          : decision === 'REJECTED'
            ? `${supplierName}'s application was rejected`
            : `${supplierName} was suspended`,
      );
      setDecision(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update this supplier');
    } finally {
      setSaving(false);
    }
  }

  const anyRejected = documents.some((doc) => doc.status === 'REJECTED');
  const anyPending = documents.some((doc) => doc.status === 'PENDING');

  return (
    <div>
      <ul className="divide-y divide-hairline">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  doc.status === 'APPROVED'
                    ? 'bg-forest-wash text-forest'
                    : doc.status === 'REJECTED'
                      ? 'bg-danger-wash text-danger-ink'
                      : 'bg-gold-50 text-gold-dark',
                )}
              >
                <FileText size={15} strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink">{doc.label}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {doc.uploaded_at ? `Uploaded ${dateTime(doc.uploaded_at)}` : 'Not yet uploaded'}
                </p>
                {doc.note && <p className="mt-1 text-[12px] text-danger-ink">{doc.note}</p>}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={doc.status} size="sm" />
              {canDecide && doc.status !== 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => setDocAction({ doc, status: 'APPROVED' })}
                  className="rounded-full p-1.5 text-forest transition-colors hover:bg-forest-wash"
                  title="Approve document"
                  aria-label={`Approve ${doc.label}`}
                >
                  <Check size={14} strokeWidth={2} />
                </button>
              )}
              {canDecide && doc.status !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => setDocAction({ doc, status: 'REJECTED' })}
                  className="rounded-full p-1.5 text-danger-ink transition-colors hover:bg-danger-wash"
                  title="Reject document"
                  aria-label={`Reject ${doc.label}`}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canDecide && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <p className="text-[12px] text-muted">
            {anyRejected
              ? 'At least one document was rejected — the supplier can re-upload it.'
              : anyPending
                ? 'Some documents are still awaiting review.'
                : 'Every document is approved and ready for a decision.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {currentStatus === 'PENDING' && (
              <>
                <GoldButton size="sm" variant="forest" onClick={() => setDecision('VERIFIED')}>
                  Approve supplier
                </GoldButton>
                <GoldButton size="sm" variant="danger" onClick={() => setDecision('REJECTED')}>
                  Reject application
                </GoldButton>
              </>
            )}
            {currentStatus === 'VERIFIED' && (
              <GoldButton size="sm" variant="danger" onClick={() => setDecision('SUSPENDED')}>
                Suspend supplier
              </GoldButton>
            )}
            {(currentStatus === 'SUSPENDED' || currentStatus === 'REJECTED') && (
              <GoldButton size="sm" variant="forest" onClick={() => setDecision('VERIFIED')}>
                {currentStatus === 'SUSPENDED' ? 'Reinstate supplier' : 'Re-approve supplier'}
              </GoldButton>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={docAction !== null}
        onClose={closeDocDialog}
        onConfirm={confirmDoc}
        loading={saving}
        tone={docAction?.status === 'APPROVED' ? 'forest' : 'danger'}
        title={docAction ? `${docAction.status === 'APPROVED' ? 'Approve' : 'Reject'} ${docAction.doc.label}?` : ''}
        description={
          docAction?.status === 'REJECTED'
            ? 'The supplier will see this document marked rejected in their portal and can re-upload it.'
            : 'This marks the document as reviewed and approved.'
        }
        confirmLabel={docAction?.status === 'APPROVED' ? 'Approve document' : 'Reject document'}
      >
        {docAction?.status === 'REJECTED' && (
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Reason for rejection, visible to the supplier…"
            rows={3}
            className="w-full rounded border border-hairline-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-gold"
          />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={decision !== null}
        onClose={() => setDecision(null)}
        onConfirm={confirmDecision}
        loading={saving}
        tone={decision === 'VERIFIED' ? 'forest' : 'danger'}
        title={
          decision
            ? `${decision === 'VERIFIED' ? 'Approve' : decision === 'REJECTED' ? 'Reject' : 'Suspend'} ${supplierName}?`
            : ''
        }
        description={
          decision === 'VERIFIED'
            ? 'This verifies the supplier, makes their listings live to buyers, and allows them to be routed orders immediately.'
            : decision === 'REJECTED'
              ? 'The supplier will be notified. They will not be able to list products or receive orders until resubmitted and approved.'
              : 'Suspending removes this supplier from routing immediately. Their existing orders are not affected.'
        }
        confirmLabel={
          decision === 'VERIFIED'
            ? currentStatus === 'SUSPENDED' || currentStatus === 'REJECTED'
              ? 'Confirm'
              : 'Approve supplier'
            : decision === 'REJECTED'
              ? 'Reject application'
              : 'Suspend supplier'
        }
      />
    </div>
  );
}
