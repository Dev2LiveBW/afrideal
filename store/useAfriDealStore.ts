'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CartLine } from '@/types';

interface AfriDealState {
  // ── Cart ──────────────────────────────────────────────────────────────
  cart: CartLine[];
  /** Bumped on every add; the nav badge watches it to fire its bounce. */
  cartPulse: number;
  addToCart: (line: CartLine) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  clearCart: () => void;

  // ── UI ────────────────────────────────────────────────────────────────
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

/*
 * Customer type and commercial model deliberately do NOT live here.
 *
 * Both are commercial facts about an account, not UI preferences. Holding them
 * in persisted client state would let any visitor set themselves to
 * INSTITUTIONAL in localStorage and be quoted wholesale pricing. They are read
 * from the session on the server and passed down as props.
 */

const sameLine = (line: CartLine, productId: string, variantId: string) =>
  line.product_id === productId && line.variant_id === variantId;

export const useAfriDealStore = create<AfriDealState>()(
  persist(
    (set) => ({
      cart: [],
      cartPulse: 0,

      addToCart: (line) =>
        set((state) => {
          const existing = state.cart.find((entry) =>
            sameLine(entry, line.product_id, line.variant_id),
          );

          const cart = existing
            ? state.cart.map((entry) =>
                sameLine(entry, line.product_id, line.variant_id)
                  ? { ...entry, qty: entry.qty + line.qty }
                  : entry,
              )
            : [...state.cart, line];

          return { cart, cartPulse: state.cartPulse + 1 };
        }),

      setQty: (productId, variantId, qty) =>
        set((state) => ({
          cart:
            qty <= 0
              ? state.cart.filter((entry) => !sameLine(entry, productId, variantId))
              : state.cart.map((entry) =>
                  sameLine(entry, productId, variantId) ? { ...entry, qty } : entry,
                ),
        })),

      removeFromCart: (productId, variantId) =>
        set((state) => ({
          cart: state.cart.filter((entry) => !sameLine(entry, productId, variantId)),
        })),

      clearCart: () => set({ cart: [] }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'afrideal-store',
      partialize: (state) => ({
        cart: state.cart,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

export const cartCount = (cart: CartLine[]) => cart.reduce((sum, line) => sum + line.qty, 0);
export const cartSubtotal = (cart: CartLine[]) =>
  cart.reduce((sum, line) => sum + line.unit_price * line.qty, 0);
