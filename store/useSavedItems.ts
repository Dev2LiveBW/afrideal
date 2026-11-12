'use client';

import { create } from 'zustand';

/**
 * Which products this buyer has saved, for the hearts.
 *
 * One list fetched once per signed in buyer, so a grid of cards costs one request
 * instead of one each (spec 0011). Not persisted: the server holds the list, which
 * is what makes it show on any device.
 */
interface SavedItemsState {
  /** Whose list this is, so a different buyer on the same browser starts clean. */
  owner: string | null;
  ids: string[];
  load: (owner: string) => Promise<void>;
  setSaved: (productId: string, saved: boolean) => void;
}

export const useSavedItems = create<SavedItemsState>()((set, get) => ({
  owner: null,
  ids: [],

  load: async (owner) => {
    if (get().owner === owner) return;
    set({ owner, ids: [] });

    const response = await fetch('/api/saved-items').catch(() => null);
    if (!response?.ok) {
      // Let the next heart to mount try again rather than showing nothing for good.
      set({ owner: null });
      return;
    }

    const { product_ids: fetched } = (await response.json()) as { product_ids: string[] };
    // A union, so a tap made while this was loading is not lost.
    set((state) => ({ ids: [...new Set([...fetched, ...state.ids])] }));
  },

  setSaved: (productId, saved) =>
    set((state) => ({
      ids: saved ? [...new Set([...state.ids, productId])] : state.ids.filter((id) => id !== productId),
    })),
}));
