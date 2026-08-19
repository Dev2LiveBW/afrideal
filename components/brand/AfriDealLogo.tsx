import { cn } from '@/lib/utils';

/**
 * The AfriDeal logo.
 *
 * A lockup rather than a mark beside a word: the continent is a thin outline and
 * the "A" of AfriDeal sits inside it, so the two read as one shape. "Afri"
 * carries the green, "Deal" carries the amber.
 *
 * The full lockup draws the continent WITHOUT a letter and lets the wordmark's
 * own "A" fall inside it. The standalone mark draws the letter, because there is
 * no wordmark next to it to supply one. Drawing it in both places is how you end
 * up with two A's.
 *
 * These two colours belong to the logo. They are deliberately not Tailwind
 * tokens — DESIGN.md reserves the logo colours so the mark keeps its charge, and
 * making them utilities is how they become button fills six months later.
 */

export const LOGO_GREEN = '#0B4A2E';
export const LOGO_GOLD = '#E8A317';

/**
 * Africa as a single closed outline, on a 0 0 100 112 field.
 *
 * Four features carry the recognition at 20px and everything else is noise:
 * the broad Mediterranean north, the western bulge, the Gulf of Guinea notch
 * under it, the Horn pushing east, and the taper to the Cape.
 */
const AFRICA_OUTLINE = [
  'M18 23',
  'C30 15 46 11 58 13',
  'C69 15 77 17 79 21',
  'C81 27 82 31 84 35',
  'C88 37 95 41 97 45',
  'C98 48 93 51 88 51',
  'C86 57 82 63 78 71',
  'C74 81 68 93 60 101',
  'C56 106 50 107 47 102',
  'C44 96 43 89 42 81',
  'C40 75 36 71 30 69',
  'C22 67 14 63 10 55',
  'C6 48 6 41 8 35',
  'C10 29 13 25 18 23',
  'Z',
].join(' ');

/** The letter A, sized to sit inside the outline above. */
const LETTER_A =
  'M40 24 L61 90 H49.8 L46.2 78 H33.8 L30.2 90 H19 Z M36 70 H44 L40 49 Z';

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
        strokeWidth={4}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* evenodd so the counter inside the A stays a hole, not a fill. */}
      {withLetter && <path d={LETTER_A} fill={colour} fillRule="evenodd" />}
    </svg>
  );
}

export function AfriDealLogo({
  variant = 'dark',
  size = 'md',
  className,
  showMark = true,
}: {
  /** `dark` = placed on a dark ground. `light` = placed on a light ground. */
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showMark?: boolean;
}) {
  const onDark = variant === 'dark';

  const dimensions = {
    sm: { mark: 24, text: 'text-[17px]', pull: '-ml-[13px]' },
    md: { mark: 32, text: 'text-[23px]', pull: '-ml-[17px]' },
    lg: { mark: 46, text: 'text-[33px]', pull: '-ml-[25px]' },
  }[size];

  return (
    <span className={cn('inline-flex items-center', className)}>
      {/*
        No letter on the mark here: the wordmark is pulled left so its own "A"
        lands inside the continent, which is what makes the two read as one
        shape rather than an icon sitting beside a word.
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
        <span style={{ color: onDark ? '#FFFFFF' : LOGO_GREEN }}>Afri</span>
        <span style={{ color: LOGO_GOLD }}>Deal</span>
      </span>
    </span>
  );
}
