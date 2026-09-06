import { cn } from '@/lib/utils';

/**
 * The AfriDeal logo.
 *
 * Forest continent outline + near-black "Afri" wordmark with metallic gold
 * "Deal". The continent is a thin outline and the "A" of AfriDeal sits inside
 * it. The mark carries the green, the wordmark carries the gold, and between
 * them the lockup states both halves of the palette without a third colour.
 *
 * The outline used to be black, which made the mark read as a full stop in
 * front of the word rather than as the continent the business is named for.
 * Green is the same green the verified states and the shop path use, so the
 * logo is inside the system rather than beside it.
 */

export const LOGO_BLACK = '#0A0A0A';
export const LOGO_GOLD = '#C5902E';
export const LOGO_GREEN = '#1A5C2A';

/**
 * Africa as a single closed outline, on a 0 0 100 112 field.
 *
 * Plotted from real coordinates rather than drawn by eye - longitude mapped
 * across x, latitude down y - because a freehand Africa is the kind of thing a
 * viewer cannot name as wrong but can see is wrong. Anchors sit on the points
 * that carry the silhouette: Tangier, Alexandria, the Horn, Maputo, Agulhas,
 * Walvis Bay, the Gulf of Guinea and Dakar.
 *
 * Everything between them is smoothed. It is used at 24px in the storefront
 * header, and coastline finer than that turns to mush on the way down.
 */
const AFRICA_OUTLINE = [
  'M19 16',
  'C28 14 36 13 41 14',
  'C50 16 60 19 68 21',
  'C71 22 73 26 77 36',
  'C80 41 83 44 86 45',
  'C91 44 96 43 96 47',
  'C96 52 91 56 88 59',
  'C84 63 81 65 79 70',
  'C76 80 73 89 71 95',
  'C70 99 66 104 58 106',
  'C54 107 51 106 49 101',
  'C48 96 47 93 47 91',
  'C45 82 42 70 40 62',
  'C37 57 34 53 32 53',
  'C27 53 24 55 22 54',
  'C16 53 12 52 9 50',
  'C5 48 3 46 3 43',
  'C3 39 4 37 5 36',
  'C8 30 13 21 19 16',
  'Z',
].join(' ');

/**
 * The letter A, sized to sit inside the outline above. Used only where the
 * mark stands alone - the wordmark supplies its own A and nests it there.
 */
const LETTER_A =
  'M40 26 L61 92 H49.8 L46.2 80 H33.8 L30.2 92 H19 Z M36 72 H44 L40 51 Z';

export function AfriDealMark({
  size = 32,
  className,
  tone = 'brand',
  /** Draw the A inside the continent. Off when a wordmark supplies its own. */
  withLetter = true,
}: {
  size?: number;
  className?: string;
  tone?: 'brand' | 'light' | 'gold';
  withLetter?: boolean;
}) {
  const colour = tone === 'light' ? '#FFFFFF' : tone === 'gold' ? LOGO_GOLD : LOGO_GREEN;

  return (
    <svg
      width={size}
      height={size * (112 / 100)}
      viewBox="0 0 100 112"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={AFRICA_OUTLINE}
        stroke={colour}
        strokeWidth={4.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* evenodd so the counter inside the A stays a hole, not a fill. */}
      {withLetter && <path d={LETTER_A} fill={colour} fillRule="evenodd" />}
    </svg>
  );
}

/** The line that sits under the wordmark on the full lockup. */
export function AfriDealTagline({
  variant = 'light',
  className,
}: {
  variant?: 'dark' | 'light';
  className?: string;
}) {
  const onDark = variant === 'dark';

  return (
    <p
      className={cn(
        'text-[12.5px] font-medium leading-5 tracking-[0.01em]',
        onDark ? 'text-white/60' : 'text-body',
        className,
      )}
    >
      Your Digital <span className={onDark ? 'text-gold-light' : 'text-gold-dark'}>Procurement</span>{' '}
      Marketplace
    </p>
  );
}

export function AfriDealLogo({
  variant = 'dark',
  size = 'md',
  className,
  showMark = true,
  withTagline = false,
}: {
  /** `dark` = placed on a dark ground. `light` = placed on a light ground. */
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showMark?: boolean;
  /**
   * The full lockup, wordmark over strapline. For the places that introduce the
   * company - the landing hero, a signed-out shell - never for the sticky nav,
   * where a second line of type would push the pill taller than the controls
   * inside it.
   */
  withTagline?: boolean;
}) {
  const onDark = variant === 'dark';

  const dimensions = {
    sm: { mark: 24, text: 'text-[17px]', pull: '-ml-[13px]' },
    md: { mark: 32, text: 'text-[23px]', pull: '-ml-[17px]' },
    lg: { mark: 46, text: 'text-[33px]', pull: '-ml-[25px]' },
  }[size];

  const lockup = (
    <span className="inline-flex items-center">
      {/*
        No letter on the mark here: the wordmark is pulled left so its own "A"
        lands inside the continent outline, exactly matching the logo design.
      */}
      {showMark && (
        <AfriDealMark size={dimensions.mark} tone={onDark ? 'light' : 'brand'} withLetter={false} />
      )}

      <span
        className={cn(
          'font-display font-bold leading-none tracking-[-0.02em]',
          dimensions.text,
          showMark && dimensions.pull,
        )}
      >
        <span style={{ color: onDark ? '#FFFFFF' : LOGO_BLACK }}>Afri</span>
        <span
          className="bg-gradient-to-b from-[#E5BA42] via-[#C5902E] to-[#996915] bg-clip-text text-transparent"
          style={{
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Deal
        </span>
      </span>
    </span>
  );

  if (!withTagline) return <span className={cn('inline-flex items-center', className)}>{lockup}</span>;

  return (
    <span className={cn('inline-flex flex-col items-start gap-1.5', className)}>
      {lockup}
      {/*
        Indented to the wordmark's left edge rather than the mark's, so the
        strapline hangs off the word it qualifies. The pull is the same value
        the wordmark uses to nest its A inside the continent.
      */}
      <AfriDealTagline variant={variant} className={showMark ? 'pl-[7px]' : undefined} />
    </span>
  );
}

