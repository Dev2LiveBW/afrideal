---
name: AfriDeal
version: 3.0
supersedes: DESIGN.md (v2 - "The Posted Rate Board")
status: direction for client review - not yet the shipped record
description: A hair house that publishes its trade rates in the open. Editorial photography for the goods, instrument typography for the money, and never the two materials in the same square inch.
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
  editorial:
    fontFamily: "Fraunces, ui-serif, serif"
    fontOpticalSizing: "auto"
    fontWeight: 400
    fontSize: "clamp(1.75rem, 3.4vw, 3rem)"
    lineHeight: 1.12
    letterSpacing: "-0.02em"
    scope: "storefront editorial leads only - never console, never money, never below 24px"
  display:
    fontFamily: "Satoshi, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5.2vw, 3.625rem)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, sans-serif"
    fontSize: "15px"
    lineHeight: 1.6
  money:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontWeight: 500
    fontFeature: "tnum 1"
density: 5
variance: 8
motion: 6
---

# Design System: AfriDeal v3

## 0. What v3 changes, and what it deliberately does not

This is an evolution of the shipped v2 system, not a reset. A client who
approves v3 is approving the same company.

**Unchanged - the brand equity:**
ink / gold / forest on warm neutrals; Satoshi display and Geist body; Geist Mono
on every figure that means money; the descending price ladder as the signature
object; the four-portal architecture; BWP to two decimals, always.

**What v3 adds - five moves, in order of how much the client will feel them:**

1. **The goods get photographed like a luxury house.** v2 drew a rate board and
   let product imagery sit in card slots. v3 gives the catalogue full-bleed,
   art-directed photographic zones with real depth of field. The business sells
   hair - bundles, frontals, closures, wigs. That is a texture-led category and
   v2 under-sold it.
2. **Inline image typography in the hero.** Small, rounded, type-height product
   photographs set *between the words* of the headline, acting as visual
   punctuation. This is the signature v3 technique and the single most
   distinctive thing on the page.
3. **One editorial serif, tightly scoped.** `Fraunces` for storefront editorial
   leads only. This is the one new typeface in v3 and the one decision the
   client should be asked about directly (see §10).
4. **Asymmetry becomes the rule, not the exception.** Centred hero blocks and
   centred closing CTAs are removed. Every full-width section commits to a
   split, an offset, or a deliberate whitespace imbalance.
5. **Choreographed entrance, still one per page.** v2's One Entrance Rule holds.
   v3 upgrades that single entrance from a fade-up to a staggered cascade with
   spring physics, so the thesis object arrives with weight.

**Deliberately not changed:** the console portals stay still, quiet, dense and
serif-free. Nothing in §1–§9 applies motion or editorial type to admin,
supplier, or runner surfaces.

---

## 1. Visual Theme & Atmosphere

**Creative North Star: "Showroom on a Rate Board."**

Two materials, never blended. The **showroom** is photographic, warm, deep,
generously spaced - hair shot on ink and on bone with real light falling across
it, the way a beauty house photographs its own stock. The **rate board** is an
instrument: warm off-white ground, hairline rules, mono figures on tabular
rails, ink trays with a gold light inside them, forest when a number has
settled and amber while it is still in motion.

The tension between the two *is* the design. A neighbouring marketplace either
photographs well and hides its wholesale price behind a sales call, or publishes
rates and looks like a spreadsheet. AfriDeal does both on one page, and the
visual system's job is to keep them legible as two separate claims: **this is
what you are buying**, and **this is what it costs at one unit and at fifty.**

They occupy separate spatial zones. Photography never sits behind a figure; a
figure never sits on top of a photograph. Where they meet, a hairline and a
change of ground makes the seam explicit.

- **Density 5 of 10** - Daily App Balanced on the storefront. Consoles run at 8.
- **Variance 8 of 10** - Offset, asymmetric, confident. Centred layouts banned.
- **Motion 6 of 10** - Fluid, weighty, spring-physics. One authored entrance per
  page; perpetual micro-loops only where a live state genuinely changes.

The atmosphere to aim for: *a well-lit trading room in a building that also
happens to have excellent taste.* Clinical about the numbers, warm about
everything else.

---

## 2. Color Palette & Roles

One accent. Gold. Forest, danger and inert are **state semantics**, not accents -
they are never spent on emphasis, decoration, or hierarchy.

### Ground and structure

- **Warm Page Ground** (`#f5f5f5`) - the default body surface. Never cool grey.
- **Raised Surface** (`#FFFFFF`) - cards, panels, the product column.
- **Sunk Surface** (`#ECEBE7`) - wells, skeleton blocks, inset trays.
- **Dim Surface** (`#E5E4DD`) - the quietest recess; disabled fields.
- **Black Metallic Ink** (`#111111`) - the instrument ground, hero panels, the
  dark ladder, the closing block. Never pure `#000000`.
- **Warm Hairline** (`rgba(23,26,24,0.08)`) - the 1px structural rule that does
  most of v3's separation work, before any shadow is considered.
- **Strong Hairline** (`rgba(23,26,24,0.14)`) - table headers, section seams.

### Type colours

- **Ink Text** (`#171a18`) - primary reading colour on light ground.
- **Body** (`#5A615C`) - secondary text, descriptions, supporting copy.
- **Muted** (`#6B726C`) - metadata, timestamps, captions. Clears 4.6:1 on the
  page ground; do not lighten it.

### The single accent

- **Amber Gold** (`#D4920A`) - primary action, focus rings, the active rung, the
  arrow chip, money in motion but not yet settled.
- **Gold Dark** (`#8B5E0A`) and **Gold 100** (`#F6E2B4`) - the large-area forms.

  **Saturation rule.** `#D4920A` measures roughly 91% saturation, above the 80%
  ceiling this system otherwise enforces. It is kept because at small scale it
  reads as struck metal rather than as candy, and it is the brand's action
  colour. The discipline is therefore areal, not chromatic: **`#D4920A` may fill
  no more than about a quarter of any viewport.** Above that, step down to
  `gold-dark` for fills or `gold-100` for washes. Never a gold gradient, never a
  gold glow, never gold behind body text.

### State semantics - claims, not decoration

- **Forest** (`#1A5C2A`), wash `#E8F1E9`, ink `#12331C` - verified, released,
  delivered, settled.
- **Danger** (`#C0392B`), wash `#FBE6E4`, ink `#7A140F` - claims, disputes,
  failures, margin-floor breaches.
- **Inert** (`#EFEEEA` / `#5A615C`) - draft, closed, archived, not-yet-started.

**Banned outright:** any purple or violet; neon anything; blue-tinted "AI"
gradients; cool greys anywhere in the product; pure black; gradient text; two
accents on one screen.

---

## 3. Typography Rules

Four roles. Each one owns a job and does not stray into another's.

### 3.1 Display - `Satoshi` (self-hosted variable)

Headlines and page titles. Track-tight at `-0.035em`, weight 700, line-height
`1.06`. Scale via `clamp(2rem, 5.2vw, 3.625rem)`. Hierarchy comes from weight
and colour, not from size escalation - a headline never shouts to be found.

### 3.2 Body - `Geist Sans`

15px, line-height 1.6, capped at `65ch`. Body copy is `#5A615C`, never full ink,
so that the ink weight stays available to headings and figures.

### 3.3 Money and metadata - `Geist Mono`

Every currency figure, every quantity, every percentage, every timestamp, every
reference code. Tabular figures on (`tnum`), two decimals always, `BWP` prefixed
unless a column header already carries the unit. Column-aligned numbers must
land on the same optical rail down a table - this is the rule that makes the
platform look like an instrument rather than a shop.

### 3.4 Editorial - `Fraunces` *(the one new face in v3)*

Variable, Google Fonts, optical sizing auto, weight 400, `-0.02em`.

**Scope, enforced:**

- Storefront only. Never in admin, supplier, or runner consoles.
- Section leads, pull-quotes, and the sourcing-path narrative only.
- Never on a number, a price, a label, a button, or a form control.
- Never below `24px` - below that it reads as a mistake, not a decision.
- Never more than **two** Fraunces elements visible in one viewport.

If the client rejects this face, delete §3.4, promote Satoshi at weight 600 into
those slots, and nothing else in this document changes.

### Banned typography

`Inter` in any role. `Times New Roman`, `Georgia`, `Garamond`, `Palatino`, or
any system serif. Any serif at all inside the four consoles. Letter-spaced mono
kickers stacked above storefront headings - fold the word into the heading as
its subject instead. Gradient fills on type.

---

## 4. Component Stylings

### Buttons

Pill radius, 44px minimum height, 24px horizontal padding. Primary is gold fill
on ink text; secondary is ink fill on white text; tertiary is a ghost with a
hairline border. Active state translates `1px` down for tactile push feedback.
Focus is a 2px gold ring at 2px offset. **No outer glow, no drop shadow on a
button body, no custom cursor.** Exactly one gold-filled button per view - and
never one placed beside the price ladder, because the rungs are the primary
action there.

### The Price Ladder *(signature - unchanged in mechanism, upgraded in material)*

Three rungs stacked, each stepping right and widening as the unit price falls,
so the cheapest rung is the widest and heaviest object in the set. Type size,
padding and money size all climb as the price descends. A row of equal cards
would *state* the tiers; the stagger *demonstrates* them.

- **Dark tone** - the hero instrument on ink, with a blurb line, a gold arrow
  chip, white type. v3 adds a barely-there vertical hairline spine connecting
  the three rungs, so the descent reads as one movement.
- **Light tone** - the same component restated in the product column, flattened
  and quieter so it cannot outrank the buy button.
- **Locked rungs** keep their real published figure and full geometry, and
  change only in temperature: money goes muted, the action line becomes the
  condition for reaching it, marked with a 10px gold lock glyph. Never blank,
  never grey out, never collapse the geometry.
- **Active rung** - 14% gold wash with an inset gold ring at 35%.

### Cards

Used only where elevation communicates hierarchy. Radius `0.875rem` (product
cards) up to `2rem` (hero-scale panels). Shadow is warm-tinted and diffuse:
`0 1px 2px rgba(23,26,24,0.04), 0 8px 24px -12px rgba(23,26,24,0.12)`. In dense
console tables, cards are **replaced** by border-top dividers and negative
space. Never nest a tray at the same radius as its parent.

### Photography zones *(new in v3)*

Full-bleed or column-bleed. `4:5` portrait for a single hero good, `16:9` for a
category band. Real depth of field with the focal plane on the product texture.
Warm colour grade matched to the `#f5f5f5` ground - never a cool or blue-shifted
image. A photographic zone carries **no text over it**; captions and figures sit
in an adjacent zone separated by a hairline. Fallback for a missing image is a
warm neutral block with the product initial in Satoshi, never a broken frame.
Placeholder sources: `picsum.photos` or local SVG. Never a hotlinked Unsplash URL.

### Inputs and forms

Label above the field, helper text optional below it, error text below that in
danger ink with a 12px inline glyph. Pill radius on search, `0.625rem` on
everything else. Focus ring in gold. No floating labels, no placeholder-as-label.

### Status badges

Pill, `4px 10px`, wash background with matching ink text. Gold wash = held or in
motion. Forest wash = released or settled. Inert wash = draft or closed. Danger
wash = claim or dispute. A badge states a machine state; it never decorates.

### Loading and empty states

Skeletons are a moving sheen across a sunk-neutral block at the exact dimensions
of the content they replace - never a circular spinner, never a static grey box.
Empty states are composed: a small drawn arrangement, one sentence naming what
would appear here, and one action that populates it. Never the words "No data".

---

## 5. Layout Principles

- **CSS Grid first.** No `calc()` percentage arithmetic, no flexbox width maths.
- **Containment.** `max-w-market` 1400px for storefront, `max-w-console` 1600px
  for portals, `max-w-measure` 65ch for prose.
- **No overlapping elements.** Every element occupies its own clean spatial
  zone. No absolutely-positioned content stacked over other content, no text
  over photography, no cards straddling a section seam.
- **Asymmetry is mandatory above variance 4.** Centred hero blocks are banned.
  Use a 7/5 or 8/4 split, a left-aligned column with deliberate right-hand
  whitespace, or an offset grid. The v2 closing CTA block, which is centred, is
  re-cut as a left-weighted split in v3.
- **The three-equal-cards feature row is banned.** Where a sequence exists, draw
  it as a sequence with a visible spine. Where a comparison exists, draw it as a
  two-column zig-zag or a horizontally scrolling rail with a shared scale.
- **Comparison graphics must be able to lose.** Bars across rows share one scale
  set by the deepest value on show, so a shallow ladder looks shallow. A graphic
  that cannot lose proves nothing.
- **Full-height sections use `min-h-[100dvh]`**, never `h-screen`.
- **`min-w-0` on any grid or flex child** holding a headline, a form, a table,
  or a wide row.
- **Separate surfaces with a hairline and a change of ground** before reaching
  for a shadow.

---

## 6. Motion & Interaction

- **Default easing:** exponential ease-out `cubic-bezier(0.16, 1, 0.3, 1)` -
  mass that settles. Never linear.
- **Spring physics** for interactive feedback: `stiffness: 100, damping: 20`.
- **Durations:** 160–300ms for state changes (colour, ring, background);
  500–700ms for entrances; 900ms for a photographic push-in; 9s for the single
  ambient hero drift.
- **The One Entrance Rule holds.** A page gets exactly one authored entrance, on
  the object the page is about. In v3 that entrance is a *staggered cascade* -
  the ladder's rungs arrive in sequence, cheapest last and heaviest, with 60–80ms
  between them. Fifteen sections sharing one fade-up is not choreography; it is
  the same effect fifteen times.
- **Perpetual micro-loops, sparingly.** Only where a live state genuinely
  changes: an amber "in motion" badge breathes; a skeleton sheen travels. A
  static object does not loop.
- **Consoles do not animate.** Same controls, same positions, no staged arrivals.
- **Performance:** animate `transform` and `opacity` only. Never `top`, `left`,
  `width`, or `height`. Grain and noise on fixed pseudo-elements only. Isolate
  animation-heavy work in client components so the server tree stays static.
- **The Same-Shape Rule.** `prefers-reduced-motion` changes durations and drops
  loops; it never changes what is rendered. Branching markup on the media query
  hydrates against the wrong shape and throws the server HTML away.

---

## 7. Responsive Rules

Mobile is the common case here, not the adaptation.

- **Below 768px every multi-column layout collapses to one column.** No
  exceptions, including the console tables - those become stacked record cards.
- **Horizontal overflow on mobile is a critical failure.** Rails scroll inside
  their own container; the page body never does.
- **Inline hero photographs stack below the headline on mobile** rather than
  shrinking to illegibility inside the line.
- **The descending-ladder geometry is preserved at every width, including
  375px.** The rungs narrow; they do not reflow into equal blocks.
- **Type scales via `clamp()`.** Body never below `1rem`. Money never below
  `14px`.
- **44px minimum tap target** on every interactive element.
- **Section rhythm** `clamp(3rem, 8vw, 6rem)` vertical.
- Desktop horizontal nav collapses to a single clean mobile sheet - not a
  full-screen takeover with animated hamburger theatrics.

---

## 8. Anti-Patterns (Banned)

- No emojis, anywhere, in any surface or any copy.
- No `Inter`. No generic system serifs. No serif in a console.
- No pure black `#000000`.
- No purple, violet, neon, or outer-glow shadows.
- No gradient text; gradients live inside a button body or an image fallback.
- No two accent colours on one screen. No gold spent on emphasis, no forest
  spent on importance - both are claims about state.
- No custom mouse cursors.
- No overlapping elements; no text laid over photography.
- No three-equal-cards feature row; no icon-plus-heading-plus-paragraph triptych.
- No centred hero; no centred closing CTA.
- No second gold-filled button beside the primary; none beside the ladder.
- No blanking, hiding, or greying a published price to signal unavailability -
  change temperature, never geometry or figure.
- No circular spinners; no static grey skeleton blocks; no "No data" empty state.
- No filler UI text: "Scroll to explore", "Swipe down", scroll arrows, bouncing
  chevrons.
- No AI copywriting: "Elevate", "Seamless", "Unleash", "Next-Gen", "Empower",
  "Revolutionise".
- No generic placeholder names - no "John Doe", "Acme", "Nexus". Use real
  catalogue rows and Botswana-plausible names.
- No fake round numbers - no "99.99%", no "50% cheaper". Every figure on screen
  comes from the live JSON store.
- No hotlinked Unsplash URLs.
- **No supplier cost, and no individual supplier quote, on any storefront
  surface.** Supplier comparison on the storefront is about *fulfilment* - who
  has stock, how fast, how reliably - never about price. This is a hard
  commercial constraint, not a style rule.
- **No estimated price on a sourcing request a runner has not yet priced.**

---

## 9. Screen Briefs

Each brief below is written to be pasted into Stitch as a single prompt,
prefixed with §1–§8 of this document as the system context.

### 9.1 Landing - the thesis page

> An asymmetric landing page for a Botswana procurement marketplace selling hair
> extensions and weaves. Warm off-white `#f5f5f5` ground.
>
> **Hero:** a black metallic `#111111` panel occupying the left seven columns of
> a twelve-column grid. Inside it, a headline in Satoshi, weight 700, tracking
> `-0.035em`, white, `clamp(2rem, 5.2vw, 3.625rem)`, with two small rounded
> product photographs set inline between the words at type height, acting as
> visual punctuation - one of a hair bundle, one of a lace frontal. The
> photographs sit *within* the line of text, never behind it. Below the headline
> one line of supporting copy in Geist Sans at 15px, colour
> `rgba(255,255,255,0.7)`, maximum 65 characters wide. No kicker above the
> headline. No scroll indicator.
>
> **Right five columns:** the price ladder. Three stacked rungs, each stepping
> right and widening as the unit price falls, connected by a faint vertical
> hairline spine. Rung one: "1–4 units, Retail, BWP 1,144.00". Rung two: "5–99
> units, Bulk, BWP 1,030.00". Rung three: "100+ units, By quotation". Money in
> Geist Mono, tabular figures, two decimals, size increasing as price descends.
> Each rung carries a small amber `#D4920A` arrow chip at its right edge. The
> third rung is the widest and heaviest object on the page.
>
> **Below the hero, closing the hero block rather than opening a new section:**
> two paths side by side, unequal in width - "Buy from the catalogue" at 8
> columns and "Send a runner to find it" at 4 columns, separated by a hairline.
>
> **Then:** a proof strip of four real catalogue rows, each with a 56px
> thumbnail, the product name, a forest-green progress bar showing the spread
> between the retail and bulk rung, and that spread as a mono percentage. All
> four bars share one scale.
>
> **Then:** a horizontally scrolling rail of hair products, and a category grid
> that is deliberately not three equal columns.
>
> **Closing block:** ink `#111111`, left-weighted, not centred - headline on the
> left five columns, single gold call-to-action button, right half left as
> deliberate whitespace.
>
> No emojis. No purple. No glow. No gradient text. No centred layouts.

### 9.2 Product detail - the buy decision

> Two-column asymmetric product page on warm off-white. Left seven columns: a
> `4:5` portrait product photograph with real depth of field, warm graded, plus
> a row of four thumbnail selectors beneath it and a colour swatch row. No text
> over the image.
>
> Right five columns, a white raised panel with `0.875rem` radius and a warm
> diffuse shadow: product name in Satoshi 600 at 22px; a verified-supplier badge
> in forest wash `#E8F1E9` with ink `#12331C`; the price ladder restated in its
> light tone - flattened, quieter, the currently active rung carrying a 14% gold
> wash and an inset gold ring; a quantity stepper; and one gold `#D4920A` pill
> button, 44px tall, as the only filled button in the column.
>
> Below the panel, a next-rung nudge written as a sentence with an inline
> button - "Take 5 and the unit price drops to BWP 1,030.00" - in forest wash.
> Not a badge, not a countdown.
>
> Below that, a fulfilment comparison table across verified suppliers showing
> stock, lead time, and reliability score. **No prices in this table** - supplier
> comparison is about fulfilment only. Geist Mono on every figure,
> column-aligned.

### 9.3 Browse / catalogue

> A dense but airy catalogue grid on warm off-white. Left rail filters at 3
> columns: category, price band, supplier reliability, availability - each a
> compact hairline-separated group, no card chrome. Right 9 columns: product
> cards at `0.875rem` radius, white, warm diffuse shadow, each showing a `4:5`
> image, name in Satoshi 600, the retail unit price in Geist Mono, and a single
> muted line reading "5+ from BWP 1,030.00". A tier switch above the grid,
> rendered as pill links - selected is solid ink `#111111`, locked options carry
> a 10px gold lock glyph. Skeleton loading state is a travelling sheen across
> sunk `#ECEBE7` blocks at exact card dimensions.

### 9.4 Request a runner - the second path

> A single-column form on warm off-white, maximum 65 characters of prose width,
> left-aligned within an offset grid rather than centred. An editorial lead in
> Fraunces at `clamp(1.75rem, 3.4vw, 3rem)`, weight 400 - the only serif on the
> page. Beneath it a seven-step progress spine drawn vertically with a hairline
> and small state dots: Requested, Assigned, Sourcing, Quoted, Approved, Bought,
> Confirmed. The current step is gold; completed steps are forest; future steps
> are inert `#EFEEEA`.
>
> The form: what you need, quantity, budget ceiling, delivery town. Labels above
> fields, helper text below, `0.625rem` radius, gold focus ring. One gold submit
> button.
>
> **Critically: no estimated price appears anywhere on this screen.** The price
> is the runner's figure and does not exist until the runner has looked at the
> goods.

### 9.5 Admin console - sourcing queue

> A dense operations console at 1600px maximum width. Warm off-white ground,
> `#111111` left sidebar with muted labels and a gold active indicator. Density
> 8: no cards, no shadows, no animation, no serif. Records are separated by
> border-top hairlines and negative space only.
>
> A table of runner sourcing requests: reference code, buyer, item, quantity,
> town, state badge, age. Every figure and code in Geist Mono with tabular
> figures, column-aligned. State badges are pill-shaped washes - gold for in
> motion, forest for confirmed, inert for closed, danger for claimed. Sticky
> table header with a strong hairline `rgba(23,26,24,0.14)`.
>
> Row actions are ghost buttons revealed on row focus, each with a real
> accessible name describing the object and the action. No staged entrance, no
> hover lift, no colour beyond the state semantics.

---

## 10. Decisions for the client

Three questions worth putting to them directly, because each changes the work:

1. **Fraunces, yes or no?** It is the one new typeface and the strongest single
   lever on "does this feel expensive". Scoped to storefront editorial leads
   only. If it is a no, §3.4 is deleted and Satoshi 600 takes those slots.
2. **How far does the photography budget go?** The inline-image hero and the
   full-bleed showroom zones assume art-directed product photography. With
   supplier-provided images only, v3 still works but loses its top note - the
   fallback is tighter crops on a controlled warm ground.
3. **Does the closing block lose its centre?** v2's final CTA is centred and it
   is the one place where the asymmetry rule costs something familiar. v3 says
   re-cut it left-weighted; the client may reasonably disagree.

---

## 11. Constraints this document may not override

These come from `PRODUCT.md` and are commercial and legal positions, not taste:

- The storefront payload carries no `supplier_cost` field, and no storefront
  surface shows an individual supplier quote.
- Customer type is resolved server-side from the account, never chosen in the
  browser.
- Margin floors hold; no tier band prices below them.
- A buyer may not move their own sourcing request to QUOTED.
- **"AfriDeal is not a payment provider"** appears in the footer of every page.
  That sentence may be relocated. It may not be softened or removed.
