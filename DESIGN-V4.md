# Design System: AfriDeal V4 (Spatial Antigravity Marketplace)

## 1. Visual Theme & Atmosphere

AfriDeal V4 is a **Spatial Antigravity Luxury B2B & Retail Marketplace**. The visual experience merges weightless spatial depth (3D card perspective tilt, floating glass layers, deep obsidian canvas) with precise trade mechanics (tabular monetary tickers, tier price ladders, verified supplier routing).

The atmosphere feels like an exclusive, high-tech African trade floor - clinical precision meets tactile luxury textures (hair extensions, bundles, frontals, high-demand procurement).

- **Density**: 6 (Balanced Trade Dashboard & Storefront)
- **Variance**: 8 (Asymmetric splits, multi-layered depth, offset whitespace)
- **Motion**: 8 (Fluid Framer Motion physics, cursor 3D perspective tracking, perpetual glowing micro-states)

---

## 2. Color Palette & Roles

- **Core Canvas** (`#18181B`) - Deep, rich zinc/charcoal background, warmer and less stark than pure obsidian.
- **Frosted Glass Panel** (`rgba(39, 39, 42, 0.6)`) - Floating containers with soft 24px backdrop blur (less digital, more physical frosted glass).
- **Glass Panel Hover** (`rgba(63, 63, 70, 0.7)`) - Interactive surface highlight.
- **AfriDeal Radiant Gold** (`#E5A00D`) - Signature brand accent for primary CTAs, active tier rungs, hero highlights.
- **Subtle Gold Glow** (`rgba(229, 160, 13, 0.08)`) - Greatly reduced intensity for a subtle ambient physical glow rather than a digital neon light.
- **Forest Emerald** (`#10B981`) - Verified supplier badges, stock availability, margin indicators.
- **Primary Text** (`#F4F4F5`) - Softened off-white/zinc for high contrast without being blinding.
- **Secondary Text** (`#A1A1AA`) - Secondary metadata, trade descriptions, terms.
- **Physical Edge Detail** (`rgba(255, 255, 255, 0.04)`) - Barely-there 1px edge light for physical realism (no heavy refractions).
- **Active Border Accent** (`rgba(229, 160, 13, 0.3)`) - Focus and active selection rings.

*Banned Colors*: Pure `#000000`, purple/blue neon glows, generic warm gray / cool gray mixing.

---

## 3. Typography Architecture

- **Display & Headlines**: `Satoshi` & `Playfair Display` or `Outfit` - Track-tight (`letter-spacing: -0.02em`), grounded presence. A touch of serif (like Playfair Display if available, or a softer Sans) can add an organic/premium editorial feel. Features **Inline Image Typography** (micro product photos embedded between headline words as visual punctuation).
- **Body Text**: `Inter` / `Geist Sans` - Clean legibility, max-width 65ch per column, softer colors.
- **Monetary & Trade Figures**: `Geist Mono` - Tabular numbers (`font-variant-numeric: tabular-nums`), BWP prefix, always 2 decimal places. Use mono sparingly, mostly for data, so the app feels less like a terminal and more like a luxury catalogue.
- **Banned Typography**: `Inter` as headline default, non-tabular numbers on price lists.

---

## 4. Component Stylings

- **3D Grounded Floating Cards**: Tilt dynamically relative to mouse cursor using CSS `perspective: 1200px` and `rotateX`/`rotateY` transforms. Reduced tilt multipliers and added physical drop-shadows rather than glowing auras, making them feel like heavy, real physical objects.
- **Buttons**:
  - *Primary*: Radiant Gold fill (`#E5A00D`), dark text (`#18181B`), tactile `-1px` press depth, subtle physical shadow.
  - *Secondary Frosted*: Translucent frosted background (`rgba(255,255,255,0.04)`), soft edge highlight, gold text on hover.
- **Tier Price Ladder Rungs**:
  - Interactive rungs (Retail 1–4, Bulk 5–99, Wholesale 100+). Active rung highlights with soft gold border and subtle indicator.
- **Skeletal Loaders**: Subtle matte shimmers.

---

## 5. Layout & Spatial Grid

- **Asymmetric Hero**: Split 60/40 visual weight. Left: Headline with inline photo punctuation and interactive tier preview CTA. Right: 3D stacked floating cards (Hair extension bundle, pricing tier badge, runner request badge).
- **Responsive Architecture**: Multi-column layouts smoothly stack on mobile (< 768px) into touch-first cards. No horizontal overflow.
- **Max-Width Containment**: Centered `max-w-7xl` with 24px responsive edge padding.

---

## 6. Anti-Patterns (Forbidden AI Tells)

- NO generic purple or blue gradients.
- NO pure black backgrounds (`#000000`).
- NO 3 identical horizontal cards in a row without visual hierarchy or asymmetric weighting.
- NO static flat cards without hover elevation, glass refraction, or spring motion.
- NO AI copywriting cliches ("Seamless", "Unleash", "Game-changer", "Next-Gen").
- NO removal of mandatory legal disclaimers ("AfriDeal is not a payment provider...").
