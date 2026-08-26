'use client';

import { forwardRef } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The action button.
 *
 * `forest` is the default because forest is what an affirmative action looks
 * like in this system. It used to default to amber, which meant the accent
 * reserved for money-in-motion was sitting on every confirm, submit and
 * checkout button on the platform - and a colour that appears on every button
 * is not an accent, it is the background.
 *
 * Choose the variant by what the action does, never by what will stand out:
 *
 *   forest   affirmative and primary. Buy, confirm, submit, approve, continue.
 *   gold     the action is about money that has not settled yet - request a
 *            quotation, approve a runner's price, release a payment.
 *   ink      a neutral primary on a surface where forest would be a second
 *            brand moment competing with one already on screen.
 *   ghost    secondary, beside a primary.
 *   danger   destructive or a refusal.
 *   royal    the wholesale path, and nothing else.
 *
 * When it carries a directional arrow, the arrow lives inside its own circle
 * flush against the right padding. On hover the circle translates up and right
 * while the button body stays put - the internal tension is the point.
 */

type Variant = 'forest' | 'gold' | 'ink' | 'ghost' | 'danger' | 'royal';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  /*
   * A shallow top-down gradient rather than a flat fill: it gives the button a
   * lit upper edge and a grounded lower one, which is what makes a solid shape
   * read as a physical control instead of a coloured rectangle. Hover lifts to
   * Field Green, press drops to Deep Canopy - the two states DESIGN.md already
   * names, so the button is not inventing its own greens.
   */
  forest:
    'bg-gradient-to-b from-forest-light to-forest text-white shadow-forest hover:from-[#3a8f4c] hover:to-forest-light active:from-forest active:to-forest-dark active:shadow-none',
  gold: 'bg-gradient-to-b from-[#d9a232] to-gold text-ink shadow-gold hover:from-[#e2ae42] hover:to-[#cf972a] active:from-gold active:to-gold-dark active:shadow-none',
  ink: 'bg-ink text-white hover:bg-ink-800 active:bg-ink-900',
  ghost:
    'bg-transparent text-ink ring-1 ring-inset ring-hairline-strong hover:bg-forest/[0.06] hover:ring-forest/25 active:bg-forest/[0.09]',
  danger:
    'bg-transparent text-danger-ink ring-1 ring-inset ring-danger/30 hover:bg-danger-wash active:bg-danger-wash',
  // The wholesale door, and only that. Nothing else on the storefront is royal.
  royal: 'bg-royal text-white hover:bg-royal-light active:bg-royal-dark',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-6 text-[14px] gap-2',
  lg: 'h-[52px] px-7 text-[15px] gap-2.5',
};

const CIRCLE: Record<Size, string> = {
  sm: 'h-6 w-6 -mr-2',
  md: 'h-7 w-7 -mr-3',
  lg: 'h-8 w-8 -mr-3.5',
};

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders the nested circular arrow at the trailing edge. */
  withArrow?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  {
    variant = 'forest',
    size = 'md',
    withArrow = false,
    loading = false,
    icon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex items-center justify-center rounded-full font-medium',
        'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}

      <span className="truncate">{children}</span>

      {withArrow && !loading && (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full',
            'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            'group-hover:translate-x-[1px] group-hover:-translate-y-[1px] group-hover:scale-105',
            // The circle tints from the button's own foreground, so it stays
            // legible on an amber face without being a second colour.
            variant === 'gold' ? 'bg-ink/[0.14]' : 'bg-white/[0.16]',
            CIRCLE[size],
          )}
        >
          <ArrowUpRight size={size === 'sm' ? 13 : 15} strokeWidth={1.75} />
        </span>
      )}
    </button>
  );
});
