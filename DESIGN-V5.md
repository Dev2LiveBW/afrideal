# Design System: AfriDeal V5 (Editorial Brutalism)

## 1. Visual Theme & Atmosphere
"Gallery-Airy Editorial Trade - Physical, Tactile, and Brutalist."
AfriDeal V5 pivots entirely from tech-dashboard glassmorphism to a stark, high-contrast, physical environment. Imagine a high-end fashion magazine crossed with a brutalist stock exchange terminal. The design relies on massive, expressive serif typography, unyielding 1px solid ink borders, and harsh offset shadows that compress on interaction.

- **Density**: 3 (Gallery-Airy, lots of negative space)
- **Variance**: 9 (Extreme asymmetry, offset layouts, unpredictable grid structures)
- **Motion**: 7 (Spring-based physical snappiness, fluid text reveals, zero soft fades)

---

## 2. Color Palette & Roles
- **Canvas Grey** (`#F4F4F5`): The absolute baseline surface. No pure `#FFFFFF` except inside specific inputs.
- **Charcoal Ink** (`#111111`): Used for all primary typography, strict 1px borders, and solid offset shadows.
- **Electric Cobalt** (`#0044FF`): The singular, high-tension accent color for active states, CTA backgrounds, and data highlights.
- **Muted Steel** (`#71717A`): Secondary text, timestamps, and subtle metadata.
- **Inert Wash** (`#F4F4F5`): Hover states for list items or table rows.

*Banned*: Glassmorphism (no backdrop-filter), soft drop shadows (no blur radius on box-shadow), pure black (`#000000`), multiple accents, gradient fills.

---

## 3. Typography Rules
- **Display / Headlines**: `Fraunces` or a system fallback stack (`ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`). Massive scale, extremely tight tracking (`-0.04em`), varying weights within the same sentence (e.g., mixing italic and bold).
- **Data / Figures / Money**: `Geist Mono` or `ui-monospace`. Used for the price ladder, supplier scores, timestamps, and currency (BWP). Always tabular.
- **Body / Labels**: `Geist Sans` or `ui-sans-serif`. Used strictly for functional UI text, small uppercase tracking (`+0.05em`) for overlines.

*Banned*: `Inter` as a headline font, centered center-aligned paragraphs.

---

## 4. Component Stylings
- **Containers & Cards**: Strict 1px solid `#111111` borders. Hard, un-blurred offset shadows (e.g., `box-shadow: 4px 4px 0px 0px #111111`).
- **Buttons**:
  - *Primary*: Solid `#111111` or `#0044FF` background, `#FAFAFA` text, sharp corners (no border-radius or max 2px). On hover/active, the offset shadow compresses and the button translates down and right (`translate-x-[2px] translate-y-[2px] shadow-[2px_2px_0px_0px_#111111]`).
- **The "Receipt" Ladder**: Pricing tiers are presented like a physical, printed receipt or terminal output. Monospaced, dotted leaders (`.....`), stark black-and-white contrast.
- **Inline Image Typography**: Small, perfectly rectangular (not rounded!) product images inserted directly into massive serif headlines.

---

## 5. Layout Principles
- **No Overlapping Chaos**: Elements have distinct boundaries defined by borders.
- **Asymmetric Hero**: Left side heavy with massive typography. Right side functional/terminal data.
- **Visible Grid Lines**: Use actual 1px borders between columns and rows to emulate a ledger or spreadsheet.
- **Spacing**: Extreme padding. Sections are separated by massive vertical gaps (`py-32`) or solid 1px horizontal rules spanning the entire viewport.

---

## 6. Anti-Patterns (Banned)
- NO emojis.
- NO soft shadows or glow effects.
- NO rounded corners beyond 2px-4px (strictly sharp or slightly eased edges).
- NO 3-column equal cards. Use 2-column zig-zag or asymmetric spans (e.g., col-span-8 and col-span-4).
- NO centered text alignment on major blocks.
- NO generic placeholder names or tech jargon.
