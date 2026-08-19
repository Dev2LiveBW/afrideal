import type { Config } from 'tailwindcss';

/**
 * AfriDeal design tokens.
 *
 * Palette follows the build command: black metallic ground, Amber Gold as the
 * primary action colour, Forest Green demoted to "verified / success".
 * Craft rules follow DESIGN.md v1.0: warm neutrals over cool grey, hairline
 * structure, tabular figures on every number that means something, and amber
 * reserved for "money in motion but not yet settled".
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
        // ── Amber Gold: the primary action colour ─────────────────────
        gold: {
          DEFAULT: '#D4920A',
          light: '#f0c040',
          dark: '#8B5E0A',
          50: '#FBF0D8',
          100: '#F6E2B4',
          700: '#7A5709',
        },
        // ── Forest Green: verified, released, success ─────────────────
        forest: {
          DEFAULT: '#1A5C2A',
          light: '#2E7D3F',
          dark: '#0F3A1B',
          wash: '#E8F1E9',
          ink: '#12331C',
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
         * Was #8A918B, which computes to 2.95:1 on the #f5f5f5 page ground —
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
        gold: '0 8px 28px -10px rgba(212,146,10,0.55)',
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
