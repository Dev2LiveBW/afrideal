---
name: AfriDeal
description: An escrow-backed marketplace where every product publishes three prices, drawn as a descending ladder in ink, gold and forest on warm neutrals.
colors:
  ink: "#111111"
  ink-800: "#1a1a1a"
  ink-700: "#2a2a2a"
  ink-text: "#171a18"
  gold: "#D4920A"
  gold-light: "#f0c040"
  gold-dark: "#8B5E0A"
  gold-50: "#FBF0D8"
  gold-100: "#F6E2B4"
  gold-700: "#7A5709"
  forest: "#1A5C2A"
  forest-light: "#2E7D3F"
  forest-dark: "#0F3A1B"
  forest-wash: "#E8F1E9"
  forest-ink: "#12331C"
  danger: "#C0392B"
  danger-wash: "#FBE6E4"
  danger-ink: "#7A140F"
  slateish-wash: "#EDF0F1"
  slateish-ink: "#4A5A61"
  inert-wash: "#EFEEEA"
  inert-ink: "#5A615C"
  surface: "#f5f5f5"
  surface-raised: "#FFFFFF"
  surface-sunk: "#ECEBE7"
  surface-dim: "#E5E4DD"
  body: "#5A615C"
  muted: "#6B726C"
  hairline: "rgba(23, 26, 24, 0.08)"
  hairline-strong: "rgba(23, 26, 24, 0.14)"
typography:
  display:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, Segoe UI, Helvetica Neue, sans-serif"
    fontSize: "32px / 52px @640 / 58px @1024"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Satoshi, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Satoshi, ui-sans-serif, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: "0.75rem"
    letterSpacing: "0.2em"
  money:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "1.4"
    fontFeature: "tnum 1"
rounded:
  xs: "0.375rem"
  sm: "0.625rem"
  md: "0.875rem"
  lg: "1.25rem"
  xl: "2rem"
  pill: "9999px"
spacing:
  gutter: "24px"
  panel: "20px"
  tray: "6px"
  section: "80px"
  section-lg: "96px"
  stack: "24px"
components:
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
    typography: "{typography.body}"
  button-gold-hover:
    backgroundColor: "#e0a11c"
    textColor: "{colors.ink}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-forest:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.pill}"
    height: "44px"
  badge-held:
    backgroundColor: "{colors.gold-50}"
    textColor: "{colors.gold-700}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  badge-released:
    backgroundColor: "{colors.forest-wash}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  badge-inert:
    backgroundColor: "{colors.inert-wash}"
    textColor: "{colors.inert-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card-product:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  panel:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  input-search:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 36px 10px 40px"
  rung-dark:
    backgroundColor: "rgba(255,255,255,0.07)"
    textColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "20px 20px"
  rung-light:
    backgroundColor: "rgba(17,17,17,0.035)"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  rung-active:
    backgroundColor: "rgba(212,146,10,0.14)"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

<!--
  Lineage. `tailwind.config.ts` cites "DESIGN.md v1.0" as its governing
  document. That file was lost before this build and could not be read here;
  nothing in it is quoted or amended. This is a fresh recording of the system
  as it actually stands in the shipped code, taken from the token config, the
  global layer, and the component library. Where the build and the direction
  contract disagree, the build is what is written down.
-->

# Design System: AfriDeal

## Overview

**Creative North Star: "The Posted Rate Board"**

AfriDeal looks like a board on which rates are published rather than a shop
window in which one price is displayed. The surface is a warm off-white ground
with hairline rules, and the objects that carry money are drawn as instruments:
mono figures on tabular rails, ink trays with a gold light in them, green when a
number has settled and amber while it is still in motion. Nothing here glows,
gradients stay on button bodies where they read as material rather than as
decoration, and the loudest thing on any page is a real figure.

The system runs in two modes over one token set, and the difference between them
is temperament, not palette. **Marketplace mode** — the storefront — is allowed
to be image-led and to stage one arrival per page. **Console mode** — `/admin`,
`/supplier`, `/runner` — is tighter and quieter, denser panels, no staged
entrances, every control in the same place every time, because an operator
releasing money should never have to wait for a page to finish composing itself.
A flourish that belongs in the first is a defect in the second.

The signature structure is a descending ladder. Where a marketplace would
normally show three matched cards side by side, this system steps its rungs down
and to the right, widening each one as the unit price falls, so the geometry
argues the same thing the numbers do. That stagger is unconditional — it exists
at 375px as well as at 1440px — because a signature that only appears on desktop
is not a signature.

**Key Characteristics:**

- Warm neutral ground (`#f5f5f5`), never cool grey; every divider is a warm
  translucent hairline rather than a solid line.
- Ink near-black and amber gold as the working pair; forest green kept for
  settled and verified states only.
- Two type voices with no overlap: Satoshi for headings, Geist Sans for text,
  Geist Mono for every number that means something.
- Pill-first geometry for anything you press; concentric radii for anything that
  nests.
- Flat at rest. Depth comes from hairline rings and tonal wash; shadow is a
  response to hover or to a tray being lifted off the page.
- One authored entrance per page, on the object the page is about.

## Colors

A near-black metallic ink and a single amber gold doing all the work, sitting on
warm neutrals that are never allowed to drift cool, with green reserved for
outcomes rather than for emphasis.

### Primary

- **Amber Gold** (`#D4920A`): the primary action colour and the signal for money
  in motion but not yet settled. It fills the primary button, the cart count
  chip, the focus ring, the arrow chip on a reachable rung, and the wash behind
  every table header. On light surfaces the darker **Gold Dark** (`#8B5E0A`)
  carries gold as *text*, since the pure gold does not clear contrast at body
  sizes; **Gold Light** (`#f0c040`) is its dark-ground counterpart and the
  selection highlight.
- **Gold 50 / Gold 700** (`#FBF0D8` / `#7A5709`): the held-money badge pair —
  pale wash, deep text, gold ring at 25% — used for `PENDING`, `HELD`,
  `AWAITING_CONFIRMATION`, `UNDER_REVIEW`.

### Secondary

- **Ink** (`#111111`): the structural dark. Grounds the hero ladder tray, the
  supplier call-to-action panel, the selected pill in the tier switch, and all
  primary heading text. **Ink 800** (`#1a1a1a`) is its hover step. Ink is also
  used at low alpha (`0.018`–`0.08`) as the light-mode wash for rungs, ghost
  hovers, and nav pills, which is why the neutrals never need a separate grey
  scale.

### Tertiary

- **Forest Green** (`#1A5C2A`): verified, released, settled, saved. It draws the
  saving-per-unit figure, the fill on the ladder-spread bars, the supplier
  verification marks, and the `RELEASED` / `DELIVERED` badges over
  **Forest Wash** (`#E8F1E9`) with **Forest Ink** (`#12331C`) text. On the dark
  hero the same role is carried by a lifted green (`#8FD69F`) so it survives on
  ink.
- **Danger** (`#C0392B`) with **Danger Wash** / **Danger Ink**: disputes,
  failures, invalid fields, and the promotion flag. Nothing else is allowed to
  be red.
- **Slate** (`#EDF0F1` / `#4A5A61`) and **Inert** (`#EFEEEA` / `#5A615C`): the
  two neutral status families. Slate is for outcomes that are clean but not
  positive (`REFUNDED`, resolved-for-customer); inert is for states that carry
  no weight at all (`CANCELLED`, `SUSPENDED`, `DRAFT`, `ARCHIVED`).

### Neutral

- **Page ground** (`#f5f5f5`): the default body surface, warm rather than blue.
- **Raised** (`#FFFFFF`): panels, cards, floating nav, and every band that needs
  to sit above the page.
- **Sunk** (`#ECEBE7`) and **Dim** (`#E5E4DD`): image slots before they load,
  skeleton bodies, empty-state medallions.
- **Ink Text** (`#171a18`): the default body text colour, a hair warmer than the
  ink token itself.
- **Body** (`#5A615C`): secondary prose, descriptions, inactive nav labels.
- **Muted** (`#6B726C`): micro-labels, ranges, table meta, `line-through`
  reference prices. It replaced a lighter grey that computed to 2.95:1 on the
  page ground; the current value clears 4.6:1 and keeps the warm cast.
- **Hairline** (`rgba(23,26,24,0.08)`) and **Hairline Strong**
  (`rgba(23,26,24,0.14)`): the default border colour for every element in the
  build, and the stronger step for table rules and ghost-button rings.

### Named Rules

**The Money-In-Motion Rule.** Amber means money that exists but has not settled.
Green means settled or verified. A status may not borrow amber for emphasis, and
green may not be used to make something look important — colour here is a claim
about state, not a volume knob.

**The Warm Neutral Rule.** There is no cool grey in this system. Neutrals are
warm off-whites and warm greys, and every rule, divider and border is a warm
translucent black rather than a flat grey line. A blue-cast grey is a defect.

**The No-Failure-Red Rule.** A refund is a clean outcome, so it is slate. A
cancellation carries no colour at all. Red is spent only on dispute, failure and
invalid input, which is what keeps it legible when it appears.

**The Contrast Floor Rule.** Any text that carries a number, a claim, or a
condition clears 4.5:1 against its own ground, dark trays included. The ladder
panel is measured, not assumed: all eighteen of its text nodes clear the floor,
the lowest at 5.5:1.

## Typography

**Display Font:** Satoshi (variable 300–900, self-hosted, with a grotesque
fallback stack: `ui-sans-serif, system-ui, Segoe UI, Helvetica Neue`)
**Body Font:** Geist Sans (with `ui-sans-serif`)
**Label/Mono Font:** Geist Mono (with `ui-monospace`)

**Character:** A tight, slightly condensed geometric display voice over a neutral
text grotesque, with a mono that does all the counting. Headlines are set with
real negative tracking and balanced wrapping so they read as set type rather than
as flowed text; body copy is quiet and long-lined; numbers are mechanical.

### Hierarchy

- **Display** (Satoshi 700, 32px → 52px at 640 → 58px at 1024, line-height 1.06,
  tracking −0.035em): one per page, the hero statement only. Set responsively in
  discrete steps rather than a clamp, and always `text-wrap: balance`.
- **Headline** (Satoshi 600, 1.875rem/2.25rem, tracking −0.02em): section
  headings on the storefront — the sticky left-hand argument of a two-column
  band.
- **Title** (Satoshi 600, 1.375rem/1.75rem, tracking −0.015em): console page
  titles and dialog headings.
- **Subhead** (Satoshi 600, 15–16px): panel headers, card names, rung labels.
  This is where the display face stops.
- **Body** (Geist Sans 400, 15px/1.6): default text. Long-form prose is capped at
  a 65ch measure; supporting paragraphs run 13.5–16px at line-height 1.6–1.75.
- **Label** (Geist Mono 500, 0.625rem/0.75rem, tracking 0.2em, uppercase): table
  column headers and small structural labels.
- **Money and figures** (Geist Mono 500, tabular, 12px → 26px): every price,
  total, payout, escrow amount, count, percentage and range.

### Named Rules

**The Tabular Money Rule.** Every price, total, payout and escrow figure renders
through one component, in mono with tabular figures, at two decimals always —
including on round numbers, because `BWP 1,200` beside `BWP 1,199.50` reads as a
typo. `BWP` is prefixed unless a column header already carries it. No surface
formats currency by hand.

**The Two Voices Rule.** Satoshi sets headings; Geist Sans sets text. The body
face may never stand in for the display face — that substitution erases the type
contrast the whole system rests on, which is why Satoshi is self-hosted as one
41kb variable file with a grotesque fallback rather than pulled from a CDN with
the text face behind it.

**The Counting Rule.** If a number can change, shift a column, or be compared to
the number above it, it is mono and tabular. Prose numerals inside a sentence
still take mono when they are real data — the hero's product and supplier counts
are set in mono inside running text for exactly this reason.

## Layout

Two container widths and one measure. Marketplace pages centre on a **1400px**
market width; console pages on a **1600px** console width; any block of prose
caps at a **65ch** measure regardless of the column it sits in. The page gutter
is 24px everywhere and does not grow with the viewport.

The storefront's recurring band is a two-column asymmetric grid where the
narrow column holds the argument and sticks (`lg:sticky top-28`) while the wide
column scrolls its evidence past it — roughly `0.72fr / 1.28fr` for proof bands
and `1fr / 1.05fr` for the hero. Below `lg` these collapse to a single column
with a 40–48px gap. Section rhythm is 80px of top padding on the storefront,
96px on the heavier bands, with full-bleed bands marked by a top and bottom
hairline over the raised white rather than by a change of width.

Console mode is denser: a fixed sidebar, a topbar, panels at 20px internal
padding, tables at 12–14px row padding, and no sticky asymmetry. Cards and rails
use a 4-column grid at desktop, 2 at tablet, and horizontal rails that scroll
with hidden scrollbars on mobile.

### Named Rules

**The min-w-0 Rule.** Every grid or flex child that holds a headline, a form, a
table, or a wide row carries `min-w-0`. A grid item defaults to
`min-width: auto`, so one missing declaration lets a headline's min-content width
set the page width — which is exactly how this build once shipped a 420px page on
a 375px screen. Where a long string cannot shrink, it is allowed to wrap below
`sm` instead of being held on one line.

**The Real-Width Signature Rule.** A structural signature is written in
percentages and applied unconditionally, not behind a `lg:` prefix. The ladder's
descent is `mr-[7%] / mr-[3.5%] / mr-0` at all widths, doubling above `sm`, so it
scales with whatever column it lands in and exists on the phone the design was
drawn for.

## Elevation & Depth

Flat at rest. Depth is drawn first by a 1px warm hairline ring, then by tonal
wash (ink at 1.8%–8% alpha on light, white at 4.5%–11% on dark), and only then by
shadow. Three shadows exist and each has one job. Dark trays get a fine
`feTurbulence` grain at 3.5% opacity so the ink reads as a surface rather than as
a hole in the page, with a soft gold radial bloom from the top-right corner.

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 2px rgba(23,26,24,0.04), 0 8px 24px -12px rgba(23,26,24,0.12)`):
  the resting state of a panel, a product card, or the floating nav once it has
  detached from the top.
- **Lift** (`box-shadow: 0 2px 4px rgba(23,26,24,0.05), 0 18px 40px -16px rgba(23,26,24,0.22)`):
  the hover answer to Card, and the resting state of the two ink trays that sit
  visibly above the page.
- **Gold** (`box-shadow: 0 8px 28px -10px rgba(212,146,10,0.55)`): the primary
  button only. It is the one coloured shadow in the system and appears exactly
  once per view.

Inner light is used sparingly and always as a hairline: `inset 0 1px 1px
rgba(255,255,255,0.6)` on the enclosure core, `inset 0 1px 0 rgba(255,255,255,0.10)`
on a dark rung. It reads as the top edge catching light, never as a bevel.

### Named Rules

**The Hairline-First Rule.** Reach for a ring before a shadow. A surface earns a
shadow by being liftable (hover) or by being a tray the page is meant to read as
lying on top of it; everything else separates with `ring-1 ring-hairline` and a
change of ground.

**The Depth-Not-Pallor Rule.** When one item in a set is less available than the
others, separate it by depth and temperature, not by fading it out. A locked
price rung keeps its geometry, its size and its figure, and changes only its
wash and the colour of its condition line.

## Shapes

Two geometries, cleanly divided. **Anything you press is a pill** —
`border-radius: 9999px` on every button, status badge, nav link, tier switch,
category chip, search field, count bubble and icon button. **Anything that
contains is softly rectangular** — 0.875rem (14px) for panels and product cards,
1.25rem (20px) for a ladder rung, 2rem (32px) for the outer tray of a nested
enclosure, 0.625rem (10px) for small inline slots such as thumbnails.

Borders are a single warm hairline; the build sets `border-color` globally to the
hairline token so an undecorated `border` is always right. Rings are used instead
of borders when the edge must not affect layout — `ring-1 ring-inset` on ghost
buttons, status badges and enclosure trays. Product imagery is a 4:3 slot that
clips its own overflow so a photograph can push in on hover without moving the
card.

### Named Rules

**The Concentric Rule.** When a surface nests inside another, the inner radius is
the outer radius minus the padding: a 2rem tray with 0.375rem of padding holds a
`calc(2rem - 0.375rem)` core. Curves stay parallel; a nested box with the same
radius as its parent is wrong.

**The Reserved Enclosure Rule.** The nested tray is for surfaces that carry
weight — a stat cluster, an escrow control, the checkout summary, the hero
ladder. It never appears on anything that repeats more than eight times on a
page; a list of trays is just a list.

## Components

### Buttons

- **Shape:** full pill (`9999px`), fixed heights of 36 / 44 / 52px, horizontal
  padding 16 / 24 / 28px.
- **Primary (gold):** a subtle vertical gradient from gold-light to gold with ink
  text and the gold shadow. Hover lightens both stops; active inverts toward
  gold-dark. One per view.
- **Ink:** solid ink with white text, for the confirming action inside a panel
  where gold would compete with a price.
- **Ghost:** transparent with an inset hairline-strong ring and ink text; hovers
  to a 4% ink wash. This is the default secondary and is also the variant used on
  ink grounds with its ring swapped to `white/20`.
- **Forest / Danger:** state actions only — forest for release and confirm,
  danger as a ring-only outline for destructive controls.
- **The nested arrow chip:** when a button carries direction, the arrow sits in
  its own circle flush against the trailing padding (negative margin pulls it
  into the pill's edge). On hover the *chip* moves up and to the right by a pixel
  and scales 5% while the button body stays put. The tension between the two is
  the interaction; the whole button never slides.
- **States:** all transitions 300ms on the exponential ease-out; `active:scale
  0.98`; disabled drops to 45% opacity and loses pointer events; loading swaps the
  leading icon for a spinner and keeps the label.

### Status Badges

- **Style:** pill, `ring-1 ring-inset`, 11–12px medium text, wash background with
  a deep text colour of the same family.
- **State:** one badge component owns every status in the system, mapped through
  a single table so the same word is never two colours on two screens.
- **Motion:** exactly two statuses move — a soft 2.4s opacity pulse on `PENDING`
  and `AWAITING_CONFIRMATION`, and a 480ms shake on `DISPUTED`. These are the
  states an operator should catch from across a room; nothing else animates.

### Cards

- **Corner Style:** 14px (`rounded-md`).
- **Background:** raised white on the page ground, hairline border, card shadow.
- **Shadow Strategy:** card at rest, lift on hover, 500ms exponential ease-out on
  the shadow alone — the card does not translate.
- **Image slot:** 4:3, clipped. A real photograph pushes in 6% over 900ms on
  hover with a bottom gradient scrim fading in beneath it; where no photograph
  exists the slot falls back to a two-stop gradient built from the product's own
  swatch colours.
- **Internal Padding:** 16–20px, with the price block pinned to the bottom of the
  flex column so cards of unequal title length still align their figures.

### Panels (console)

- **Style:** raised white, 14px radius, hairline border, card shadow, overflow
  hidden.
- **Header:** a `border-b` hairline strip at 20px × 16px padding holding a 15px
  semibold title, an optional 13px body-coloured description, and a right-aligned
  action that never shrinks.
- **Body:** 20px padding. Tables run edge to edge inside the panel instead.

### Tables

- **Header:** mono uppercase label type at 0.2em tracking, gold-dark on a 7% gold
  wash, over a hairline-strong bottom rule. The gold header rule is the console's
  one piece of colour furniture.
- **Rows:** hairline dividers, even rows on a 1.5% ink tint, hover to a 5% gold
  tint over 160ms.
- **Cells:** 16px horizontal, 14px vertical, 13px text, middle aligned, numbers
  right-aligned in mono.

### Inputs

- **Style:** on light grounds, raised white with a hairline-strong border; search
  fields are pills with a 15px muted leading icon, ordinary fields take the 10px
  radius. On the ink auth screens, `white/4` fill with a `white/12` border and
  white text.
- **Focus:** the border shifts to gold at 50–60% and the dark variant's fill
  lifts to `white/6`. There is no glow. Outside inputs, the global focus ring is
  a 2px solid gold outline at 2px offset — visible on every interactive element,
  never removed.
- **Error:** border to danger at 60%, message beneath at 12px; on dark grounds the
  message uses a lifted red (`#F2A9A2`) so it clears contrast on ink.
- **Labels:** always present and always above the field at 13px medium. Icon-only
  controls carry a real `aria-label` naming the object, not the icon.

### Navigation

- **Storefront:** a floating pill that starts fully transparent over the hero and
  animates to `rgba(255,255,255,0.82)` with a hairline border, card shadow and
  `backdrop-blur-xl` once the page scrolls 12px. Links are pill-shaped, 13.5px
  medium, and invert to white-on-transparent while the nav is over the dark hero.
  The cart count is a gold bubble in mono tabular that springs in on change.
- **Console:** a fixed sidebar with a topbar; the active item is an ink-washed
  pill, and the search field is a bordered pill with a transparent input inside
  it.

### The Price Ladder (signature)

The storefront's thesis object, and the reason several of the rules above exist.

- **Structure:** three rungs stacked, each stepping right and widening as the
  unit price falls — the cheapest rung is the widest and heaviest object in the
  set. Type size, vertical padding and money size all climb as price descends
  (15→18px labels, `md`→`xl` money). A row of equal cards would *state* the
  tiers; the stagger *demonstrates* them.
- **Two tones, one component:** `dark` is the hero instrument on ink, with a
  blurb line, a gold arrow chip and white type; `light` is the same ladder
  restated inside the product page's white column, flattened and quieter so it
  cannot outrank the buy button. They are one component precisely so the two
  surfaces cannot drift.
- **Two behaviours:** a rung is a `<a>` when it navigates into the catalogue at
  that tier, and a `<button>` when it acts on the product already on screen. The
  accessible name follows the behaviour, never the styling.
- **Locked rungs:** a price the visitor cannot yet buy at keeps its real
  published figure and its full geometry, and changes only in temperature — the
  money goes muted and the action line becomes the condition for reaching it,
  marked with a 10px lock glyph in gold. Blanking it would make a three-rung
  catalogue look like a one-price one.
- **Active rung** (light tone): 14% gold wash with an inset gold ring at 35%.

### Supporting Ladder Components

- **Ladder proof strip:** a divided list of real products, each with a 56px
  thumbnail, a forest progress bar and the spread as a mono percentage. All bars
  share one scale set by the deepest ladder on show, so a shallow ladder looks
  shallow. A graphic that cannot lose proves nothing.
- **Next-rung nudge:** a sentence with a button, not a badge or a countdown —
  forest wash when the buyer can act, gold wash with a link to signup when the
  rung needs an account.
- **Tier switch:** pill links (not client state) so the chosen rung lives in the
  URL, survives reload, and works before hydration. Selected is solid ink; locked
  options carry the same gold lock glyph as the ladder.

### Motion

- **Easing:** three variables, and exponential ease-out
  (`cubic-bezier(0.16, 1, 0.3, 1)`) is the default — mass that settles, never a
  linear slide. A quint ease-out handles fast state colour changes and a spring
  handles the cart-count pop.
- **Durations:** 160–300ms for state (colour, background, ring), 500–700ms for
  entrances and shadow, 900ms for a photographic push-in, 9s for the single hero
  drift.
- **The One Entrance Rule.** A page gets exactly one authored entrance, on the
  object the page is about. The landing page's ladder reveals; nothing else on it
  does. Fifteen sections sharing one fade-up is not choreography, it is the same
  effect fifteen times, and it makes the thesis object arrive with no more
  ceremony than a footer. Console mode gets none at all.
- **The Same-Shape Rule.** `prefers-reduced-motion` changes durations and drops
  continuous loops; it never changes what is rendered. A reduced-motion branch
  that returns different markup — or a different `initial` style — hydrates
  against the wrong shape and makes React throw the server HTML away. Same
  elements, same start, same end, no perceptible movement.
- **Skeletons:** a moving sheen across a sunk-neutral block, never a static grey
  rectangle.

## Do's and Don'ts

### Do:

- **Do** put every currency figure through the money component: mono, tabular,
  two decimals, `BWP` prefixed unless a column header carries it.
- **Do** resolve every price through the one tier-resolution path shared by
  landing, browse, product, cart and checkout. Two surfaces quoting different
  figures for the same product is the failure this system is built to prevent.
- **Do** show a price the visitor cannot yet buy at, at its real published figure,
  with the condition for reaching it named beside it.
- **Do** put `min-w-0` on any grid or flex child holding a headline, a form, a
  table, or a wide row.
- **Do** separate surfaces with a warm hairline and a change of ground before
  reaching for a shadow.
- **Do** keep the descending-ladder geometry at every width, including 375px.
- **Do** let a comparison graphic lose — shared scales across rows, not
  self-normalised bars.
- **Do** give every icon-only control a real accessible name describing the
  object and the action, and let the name follow the behaviour when a component
  switches between link and button.
- **Do** keep console mode still: same controls, same positions, no staged
  arrivals.

### Don't:

- **Don't** use cool grey anywhere — neutrals are warm, and dividers are warm
  translucent black.
- **Don't** spend amber on emphasis or green on importance. Both are claims about
  state.
- **Don't** blank, hide, or grey out a published price to indicate it is
  unavailable; change temperature, never geometry or figure.
- **Don't** fade an element to express unavailability when the world's own rule
  says weight belongs to the cheaper rung — running the weight rule backwards
  makes the most important rungs the faintest things on the page.
- **Don't** put more than one staged entrance on a page, and don't animate
  anything in the console.
- **Don't** branch markup on `prefers-reduced-motion`; branch only duration.
- **Don't** stack a second gold-filled button beside the primary one, or place a
  filled primary next to the ladder — the rungs are the primary action there.
- **Don't** use gradient text, and don't let gradients do anything other than
  sit inside a button body or a fallback image slot.
- **Don't** build a page section as a row of identical icon-plus-heading-plus-
  paragraph cards. Where a sequence exists, draw it as a sequence with a spine.
- **Don't** put a mono tracked kicker above a heading on a storefront surface;
  fold the word into the heading as its subject instead.
- **Don't** nest a tray with the same radius as its parent, and don't use the
  nested enclosure on anything that repeats more than eight times.
- **Don't** put figures on a page that cannot be computed from the store.
