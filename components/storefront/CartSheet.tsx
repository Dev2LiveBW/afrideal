'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';

import { ActionButton } from '@/components/brand/ActionButton';
import { MoneyText } from '@/components/brand/MoneyText';
import { CartLineThumb } from '@/components/storefront/CartLineThumb';
import { cartCount, useAfriDealStore } from '@/store/useAfriDealStore';
import { cn } from '@/lib/utils';

const DELIVERY_FEE = 45;

/**
 * Slide-up Cart Sheet. Alibaba benchmark §4b & §5.
 *
 * Appears when "View cart" is tapped on the mobile product detail bar, or as
 * a quick-peek drawer. Slides up from the foot of the screen on the benchmark's
 * timing (.22s on cubic-bezier(.22,.61,.36,1)), masked behind a .18s dark wash.
 *
 * Sits at z-[75], comfortably above the sticky buy bar (z-[60]) and mobile
 * bottom nav (z-40).
 */
export function CartSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const cart = useAfriDealStore((state) => state.cart);
  const setQty = useAfriDealStore((state) => state.setQty);
  const removeFromCart = useAfriDealStore((state) => state.removeFromCart);

  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const count = cartCount(cart);
  const subtotal = cart.reduce((sum, line) => sum + line.unit_price * line.qty, 0);
  const total = subtotal + (cart.length > 0 ? DELIVERY_FEE : 0);

  function proceedToCheckout() {
    onClose();
    router.push('/checkout');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Your cart"
          className="fixed inset-0 z-[75] flex items-end justify-center"
        >
          {/* Backdrop mask: .18s fade */}
          <motion.button
            type="button"
            aria-label="Close cart sheet"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }}
            className="fixed inset-0 block h-full w-full bg-black/40 cursor-default outline-none"
          />

          {/* Slide-up panel: .22s cubic-bezier(.22,.61,.36,1) */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { duration: 0.22, ease: [0.22, 0.61, 0.36, 1] } }}
            exit={{ y: '100%', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-[16px] bg-white shadow-2xl will-change-transform"
          >
            {/* Grab handle indicator */}
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#E67E22]" />
                <h2 className="font-display text-[16px] font-bold text-ink">
                  Your cart {count > 0 && `(${count})`}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close cart sheet"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-sunk hover:text-ink transition-colors"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Content: Cart Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-hairline">
              {cart.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[13.5px] font-medium text-ink">Your cart is empty</p>
                  <p className="mt-1 text-[12px] text-muted">Add products to begin checkout.</p>
                </div>
              ) : (
                cart.map((line) => (
                  <div
                    key={`${line.product_id}-${line.variant_id}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <CartLineThumb
                      line={line}
                      className="h-12 w-12 shrink-0 rounded-md"
                      glyphClassName="text-[20px]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{line.name}</p>
                      <p className="text-[11.5px] text-muted">{line.variant_label}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <MoneyText amount={line.unit_price} size="sm" tone="ink" />
                        <span className="text-[11px] text-muted">× {line.qty}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-full border border-hairline-strong bg-surface">
                        <button
                          type="button"
                          onClick={() => {
                            if (line.qty > 1) {
                              setQty(line.product_id, line.variant_id, line.qty - 1);
                            } else {
                              removeFromCart(line.product_id, line.variant_id);
                            }
                          }}
                          aria-label={line.qty === 1 ? 'Remove item' : 'Decrease quantity'}
                          className="flex h-7 w-7 items-center justify-center text-muted hover:text-ink transition-colors"
                        >
                          {line.qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        <span className="w-6 text-center font-mono text-[12px] font-semibold text-ink">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.product_id, line.variant_id, line.qty + 1)}
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center text-muted hover:text-ink transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="w-16 text-right">
                        <MoneyText amount={line.unit_price * line.qty} size="sm" tone="ink" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Checkout CTA */}
            {cart.length > 0 && (
              <div className="border-t border-hairline bg-surface-raised px-4 py-3.5 pb-[calc(14px+env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between text-[13px] text-muted mb-1">
                  <span>Delivery (standard)</span>
                  <span>BWP {DELIVERY_FEE.toFixed(2)}</span>
                </div>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[14px] font-bold text-ink">Total</span>
                  <MoneyText amount={total} size="lg" tone="ink" />
                </div>

                <div className="flex flex-col gap-2">
                  <ActionButton
                    size="lg"
                    className="w-full"
                    onClick={proceedToCheckout}
                    withArrow
                  >
                    Proceed to checkout
                  </ActionButton>
                  <Link
                    href="/cart"
                    onClick={onClose}
                    className="text-center text-[12px] font-medium text-body hover:text-[#E67E22] transition-colors py-1"
                  >
                    View full cart page
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
