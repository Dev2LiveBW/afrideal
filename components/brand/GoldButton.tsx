'use client';

import { forwardRef } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The primary CTA.
 *
 * When it carries a directional arrow, the arrow lives inside its own circle
 * flush against the right padding. On hover the circle translates up and right
 * while the button body stays put — the internal tension is the point.
 */

type Variant = 'gold' | 'ink' | 'ghost' | 'danger' | 'forest';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  gold: 'bg-gradient-to-b from-gold-light to-gold text-ink shadow-gold hover:from-[#f5cc5c] hover:to-[#e0a11c] active:from-gold active:to-gold-dark',
  ink: 'bg-ink text-white hover:bg-ink-800 active:bg-ink-900',
  ghost:
    'bg-transparent text-ink ring-1 ring-inset ring-hairline-strong hover:bg-ink/[0.04] active:bg-ink/[0.07]',
  danger:
    'bg-transparent text-danger-ink ring-1 ring-inset ring-danger/30 hover:bg-danger-wash active:bg-danger-wash',
  forest: 'bg-forest text-white hover:bg-forest-light active:bg-forest-dark',
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

export interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders the nested circular arrow at the trailing edge. */
  withArrow?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(function GoldButton(
  {
    variant = 'gold',
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
            variant === 'gold' ? 'bg-ink/[0.14]' : 'bg-white/[0.14]',
            CIRCLE[size],
          )}
        >
          <ArrowUpRight size={size === 'sm' ? 13 : 15} strokeWidth={1.75} />
        </span>
      )}
    </button>
  );
});
