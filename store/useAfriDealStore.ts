'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_DELIVER_TO, DELIVER_TO_COOKIE, encodeDeliverTo, type DeliverTo } from '@/lib/deliver-to';
import { DEFAULT_DELIVERY_COUNTRY } from '@/lib/lanes.mjs';
import type { CartLine } from '@/types';

export { DEFAULT_DELIVER_TO, type DeliverTo };

/** Mirror "Deliver to" into a cookie so the server's first paint uses it too. */
function rememberDeliverTo(deliverTo: DeliverTo) {
  if (typeof document === 'undefined') return;
  document.cookie = `${DELIVER_TO_COOKIE}=${encodeDeliverTo(deliverTo)}; path=/; max-age=31536000; samesite=lax`;
}

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

  /**
   * Where the shopper wants things delivered.
   *
   * Safe to persist, unlike anything commercial: it changes which suppliers
   * read as local, what the header says and which lane checkout starts on,
   * never what a buyer is charged (the server prices every order itself).
   */
  deliverTo: DeliverTo;
  setDeliverTo: (deliverTo: DeliverTo) => void;
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
      deliverTo: DEFAULT_DELIVER_TO,

      setDeliverTo: (deliverTo) => {
        rememberDeliverTo(deliverTo);
        set({ deliverTo });
      },

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
      /*
       * Version 1 (2026-10-22, spec 0009): `deliverTo` became a country and a
       * town. Every town saved before then was a Botswana one.
       */
      version: 1,
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version < 1 && typeof state.deliverTo === 'string') {
          state.deliverTo = { country: DEFAULT_DELIVERY_COUNTRY, city: state.deliverTo };
        }
        return state as unknown as AfriDealState;
      },
      // A choice saved before the cookie existed reaches the server from the next page on.
      onRehydrateStorage: () => (state) => {
        if (state) rememberDeliverTo(state.deliverTo);
      },
      partialize: (state) => ({
        cart: state.cart,
        sidebarCollapsed: state.sidebarCollapsed,
        deliverTo: state.deliverTo,
      }),
    },
  ),
);

export const cartCount = (cart: CartLine[]) => cart.reduce((sum, line) => sum + line.qty, 0);
export const cartSubtotal = (cart: CartLine[]) =>
  cart.reduce((sum, line) => sum + line.unit_price * line.qty, 0);
