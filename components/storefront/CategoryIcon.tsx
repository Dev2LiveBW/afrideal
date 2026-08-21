import {
  Cpu,
  HardHat,
  Package,
  Paperclip,
  Scissors,
  Shirt,
  Sparkles,
  Wheat,
} from 'lucide-react';

/**
 * One drawn glyph per category, at one stroke weight.
 *
 * The catalogue used to render each category's emoji. Emoji are not an icon
 * set: they arrive at whatever weight, colour and shape the reader's operating
 * system decides, so seven of them side by side never look like one family, and
 * they cannot take the category's own colour. These are drawn, monochrome, and
 * inherit `currentColor`.
 *
 * The emoji field stays in the data. It is still the right fallback in a place
 * that has no room for an icon component, such as a cart line copied into
 * localStorage.
 */
const ICONS: Record<string, typeof Package> = {
  c1: Scissors, // Hair, weaves and extensions
  c7: Sparkles, // Beauty and personal care
  c2: Cpu, // Electronics
  c6: Shirt, // Clothing and uniforms
  c4: Wheat, // Food and agriculture
  c3: HardHat, // Building materials
  c5: Paperclip, // Office supplies
};

export function CategoryIcon({
  categoryId,
  size = 18,
  className,
}: {
  categoryId: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[categoryId] ?? Package;
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
}
