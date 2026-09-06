/**
 * One colour per trade.
 *
 * The storefront had drifted to white cards on a warm-white page: measured on
 * the landing page, white was painted 26 times and the brand's own gold and
 * forest 3 and 4 times between them. The loudest colour on the page was the red
 * discount badge, which is the opposite of "the loudest thing on any page is a
 * real figure".
 *
 * Colour here identifies the trade, which is content, not decoration - a hair
 * bundle should not look like a bag of cement before you have read either
 * label. That is what earns it under DESIGN.md's rule that colour is a claim
 * rather than a volume knob.
 *
 * Two hues are deliberately absent from this set. Amber (#D4920A) means money
 * in motion and forest (#1A5C2A) means settled or verified; a category wearing
 * either would make a claim about state it cannot back. Olive sits nearest
 * forest, so it is used as a wash and a label but never as a filled badge,
 * where it could be read as a status.
 *
 * `hue` carries text and icons and is dark enough to clear 4.5:1 on both its
 * own wash and the page ground. `wash` is the card body: pale enough that
 * photography and money still outrank it. Verified in `verify.mjs`.
 */

export type CategoryPalette = {
  /** Full-strength: icons, category labels, hover rings. */
  hue: string;
  /** Card and tile ground. */
  wash: string;
  /** Hairline over the wash - the hue at low alpha, never a grey. */
  edge: string;
};

const FALLBACK: CategoryPalette = {
  hue: '#55503F',
  wash: '#F4F2EC',
  edge: 'rgba(85, 80, 63, 0.16)',
};

const PALETTE: Record<string, CategoryPalette> = {
  // Hair, weaves and extensions - the flagship trade, given the deepest hue.
  c1: { hue: '#6D2B4E', wash: '#FAF2F6', edge: 'rgba(109, 43, 78, 0.16)' },
  // Beauty and personal care.
  c7: { hue: '#9C3355', wash: '#FDF0F4', edge: 'rgba(156, 51, 85, 0.16)' },
  // Electronics.
  c2: { hue: '#1F4E5E', wash: '#EDF4F6', edge: 'rgba(31, 78, 94, 0.16)' },
  // Clothing and uniforms.
  c6: { hue: '#33447F', wash: '#EFF1FA', edge: 'rgba(51, 68, 127, 0.16)' },
  // Food and agriculture.
  c4: { hue: '#55631F', wash: '#F3F5E8', edge: 'rgba(85, 99, 31, 0.16)' },
  // Building materials.
  c3: { hue: '#8A4522', wash: '#FBF0E9', edge: 'rgba(138, 69, 34, 0.16)' },
  // Office supplies.
  c5: FALLBACK,
};

export function categoryPalette(categoryId: string | undefined): CategoryPalette {
  return (categoryId && PALETTE[categoryId]) || FALLBACK;
}

/** Every palette entry, for the seed's contrast check. */
export const ALL_CATEGORY_PALETTES = PALETTE;
