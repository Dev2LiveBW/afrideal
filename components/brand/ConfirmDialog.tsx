'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

import { GoldButton } from '@/components/brand/GoldButton';
import { cn } from '@/lib/utils';

/**
 * Confirmation before anything that moves money or changes a supplier's
 * standing. Traps focus, closes on Escape, and states the consequence in the
 * body rather than asking "Are you sure?".
 */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'gold',
  loading = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'gold' | 'danger' | 'forest';
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
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
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md overflow-hidden rounded-lg bg-surface-raised shadow-lift outline-none"
          >
            <div className="flex items-start gap-4 p-6">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  tone === 'danger'
                    ? 'bg-danger-wash text-danger-ink'
                    : tone === 'forest'
                      ? 'bg-forest-wash text-forest'
                      : 'bg-gold-50 text-gold-dark',
                )}
              >
                <AlertTriangle size={19} strokeWidth={1.5} />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
                {description && <p className="mt-1.5 text-[13.5px] leading-6 text-body">{description}</p>}
                {children && <div className="mt-4">{children}</div>}
              </div>

              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-hairline bg-surface px-6 py-4">
              <GoldButton variant="ghost" size="sm" onClick={onClose} disabled={loading}>
                {cancelLabel}
              </GoldButton>
              <GoldButton
                variant={tone === 'danger' ? 'danger' : tone === 'forest' ? 'forest' : 'gold'}
                size="sm"
                onClick={onConfirm}
                loading={loading}
              >
                {confirmLabel}
              </GoldButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
