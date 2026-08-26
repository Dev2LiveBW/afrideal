import type { Config } from 'tailwindcss';

/**
 * AfriDeal design tokens.
 *
 * Palette per DESIGN.md §2, which this file spent a while contradicting. The
 * roles, stated once so they stop drifting:
 *
 *   Forest Green   the brand, and every affirmative action. Primary buttons,
 *                  active nav, focus rings, verified badges, confirmed states.
 *   Deep Canopy    pressed primary, and the console sidebar ground.
 *   Field Green    hover lift on primary, first chart series.
 *   Sage Wash      soft fill behind anything verified, selected or settled.
 *   Pula Amber     the single accent. It means money in motion but not yet
 *                  settled - pending approval, a quote awaiting an answer, a
 *                  price a runner has found but nobody has agreed to. It never
 *                  decorates, because the moment it does it stops meaning that.
 *   Logo Gold      the mark and the logotype only. Never a fill, never a
 *                  border, never a background - it is held out of the interface
 *                  so the mark keeps its charge. It lives in AfriDealLogo.tsx
 *                  and deliberately has no utility class here.
 *   Royal / Ocean  one package rung each, and nothing else.
 *
 * The implementation used to run amber as the primary action colour with forest
 * demoted to "success", which put the accent on every button on the platform
 * and left the brand colour doing nothing. Everything affirmative is forest
 * now; amber is back to meaning one thing.
 *
 * Craft rules also follow DESIGN.md v1.0: warm neutrals over cool grey,
 * hairline structure, and tabular figures on every number that means something.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Black metallic ────────────────────────────────────────────
        ink: {
          DEFAULT: '#111111',
          900: '#111111',
          800: '#1a1a1a',
          700: '#2a2a2a',
          600: '#3a3a3a',
          500: '#4d4d4d',
        },
        /*
         * ── Pula Amber: the single accent ─────────────────────────────
         *
         * DEFAULT was #D4920A, which is Logo Gold. Using the logotype's own
         * colour as an interface fill is what stopped the mark reading as a
         * mark. #C08A1E is the same hue held at 73% saturation for interface
         * use, per DESIGN.md; on white it is a fill colour, not a text colour,
         * and `gold-dark` / `gold-700` carry amber type at AA.
         */
        gold: {
          DEFAULT: '#C08A1E',
          light: '#f0c040',
          dark: '#8B5E0A',
          50: '#FBF0D8',
          100: '#F6E2B4',
          700: '#7A5709',
        },
        // ── Forest Green: the brand, and every affirmative action ─────
        forest: {
          DEFAULT: '#1A5C2A',
          light: '#2E7D3F',
          dark: '#0F3A1B',
          wash: '#E8F1E9',
          ink: '#12331C',
          /* The closing trust band: forest taken down far enough to hold white
             body copy at AA without becoming the ink used by the consoles. */
          deep: '#16351F',
          /*
           * Primary, inverted for a dark ground. Forest itself is only a shade
           * off Deep Canopy, so an active nav item drawn in it on the console
           * sidebar would be invisible; this is the same brand hue lifted until
           * it clears 8:1 on that ground.
           */
          inverse: '#8FD69F',
        },
        /*
         * Royal — the wholesale path.
         *
         * The hero puts three doors on the page (shop, procure, wholesale) and
         * two of them were already spoken for by the brand pair. A third door
         * drawn in gold or forest would have read as a variant of one of the
         * first two rather than as its own transaction, so wholesale gets a
         * cool accent that neither of them can be mistaken for.
         */
        royal: {
          DEFAULT: '#4C3F91',
          light: '#6B5CB8',
          dark: '#3A2F71',
          wash: '#F1F0FA',
          ink: '#2E2557',
        },
        /*
         * Ocean — the bulk rung, and nothing else.
         *
         * The published ladder now has four priced rungs and each one needs to
         * be told apart at a glance on the packages board. Forest, gold and
         * royal carry three of them; this carries the second.
         */
        ocean: {
          DEFAULT: '#1F5FA8',
          light: '#3D7AC0',
          wash: '#EAF1FA',
          ink: '#123A68',
        },
        // ── Semantic ──────────────────────────────────────────────────
        danger: {
          DEFAULT: '#C0392B',
          wash: '#FBE6E4',
          ink: '#7A140F',
        },
        slateish: {
          wash: '#EDF0F1',
          ink: '#4A5A61',
        },
        inert: {
          wash: '#EFEEEA',
          ink: '#5A615C',
        },
        // ── Neutrals: warm, never cool grey ───────────────────────────
        surface: {
          DEFAULT: '#f5f5f5',
          raised: '#FFFFFF',
          sunk: '#ECEBE7',
          dim: '#E5E4DD',
        },
        body: '#5A615C',
        /*
         * Was #8A918B, which computes to 2.95:1 on the #f5f5f5 page ground -
         * under the 4.5:1 floor at every body size, and it was carrying the
         * hero's only real-numbers claim. #6B726C clears 4.6:1 and keeps the
         * warm-neutral cast that separates this palette from cool grey.
         */
        muted: '#6B726C',
        hairline: 'rgba(23, 26, 24, 0.08)',
        'hairline-strong': 'rgba(23, 26, 24, 0.14)',
      },
      fontFamily: {
        display: ['var(--font-satoshi)', 'ui-sans-serif', 'sans-serif'],
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        eyebrow: ['0.625rem', { lineHeight: '0.75rem', letterSpacing: '0.2em' }],
        'display-xl': ['4rem', { lineHeight: '4rem', letterSpacing: '-0.035em' }],
        'display-lg': ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.03em' }],
        'headline-lg': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        'headline-md': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.625rem',
        md: '0.875rem',
        lg: '1.25rem',
        xl: '2rem',
      },
      maxWidth: {
        market: '1400px',
        console: '1600px',
        measure: '65ch',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,26,24,0.04), 0 8px 24px -12px rgba(23,26,24,0.12)',
        lift: '0 2px 4px rgba(23,26,24,0.05), 0 18px 40px -16px rgba(23,26,24,0.22)',
        /* The primary button's own shadow: forest, thrown down and softened,
           so the lift reads as the button's weight rather than as a halo. */
        forest: '0 2px 4px rgba(15,58,27,0.18), 0 10px 28px -12px rgba(15,58,27,0.55)',
        gold: '0 2px 4px rgba(122,87,9,0.16), 0 10px 28px -12px rgba(192,138,30,0.5)',
      },
      keyframes: {
        'count-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-2px)' },
          '40%, 80%': { transform: 'translateX(2px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'count-in': 'count-in 320ms cubic-bezier(0.22,1,0.36,1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        shake: 'shake 480ms ease-in-out',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
