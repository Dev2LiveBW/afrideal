# Alibaba as the UI benchmark

**Status:** standing instruction from the product owner, 2026-09-11.
**Scope:** the customer storefront. Not the admin, supplier or runner consoles.

> Every change to storefront UI is measured against how the Alibaba buyer app
> does the same thing on a phone. Match its density and its patterns; keep
> AfriDeal's colour, type and copy. Where AfriDeal's model differs (it is the
> merchant, Alibaba is an introduction service) the pattern is adapted, not
> copied - see `docs/research/alibaba-1688-features.md` §1 for the cases.

## How this document is maintained

The source is screen recordings of the Alibaba app supplied by the product
owner. Frames are pulled with ffmpeg, measured, and written up here. The app
is not a web page, so it cannot be fetched live - **this file is the lookup**.
When a new recording arrives, extract the screens it adds and extend the
relevant section; do not describe from memory.

Recordings on file:

| date | length | screens covered |
| --- | --- | --- |
| 2026-09-09 | 2:58 | home, categories, search results, product detail (an agent listing) |
| 2026-09-11 | 2:32 | *not yet on disk - product owner to supply the file* |

Measurements below are from the 2026-09-09 recording. The phone in it is
384px wide; figures are given as a share of viewport width so they transfer.

---

## 1. Listing rows — the "boxes"

This is the pattern the product owner asked for by name: *"see how small
their boxes are, and this is on a phone."*

Alibaba does not use cards for search results on a phone. It uses **rows**:
full width, horizontal, a hairline between them, no shadow, no border.

```
┌──────────┬────────────────────────────────────┐
│          │ Super                              │  ← optional badge, 10px pill
│  image   │ Guangzhou Purchasing Agent for Cl… │  ← 1 line, ~14px, ellipsis
│  square  │ US$0.75-0.99                       │  ← ~18px bold
│  ~31vw   │ Min. order: 50 sets                │  ← ~12px
│          │ Verified  2 yrs · CN               │  ← "Verified" bold blue
│          │ ✓ Reorder rate 49%                 │  ← ~12px
└──────────┴────────────────────────────────────┘
```

| property | value |
| --- | --- |
| row height | ~130px |
| image | square, ~31% of viewport width (~120px at 390), radius ~6px, left |
| image → text gap | ~10px |
| row padding | ~8px vertical |
| separator | 1px hairline, no card chrome |
| title | one line, ~14px, medium weight, truncated with ellipsis |
| price | ~18px bold, a range where one exists |
| minimum order | one line, ~12px, plain: `Min. order: 50 sets` |
| trust line | `Verified` in bold blue with a check glyph, then years and country |
| performance line | `✓ Reorder rate 49%` |
| density | **~4½ rows per 848px screen** after the sticky header |

Above the rows, in order: sticky search field; segmented tabs
(`Products | Suppliers | Worldwide`, active underlined in the accent);
a horizontally scrolling row of filter chips (filter icon, `Super`,
`Verified Supplier`, `20-day delivery`).

**AfriDeal mapping.** `components/storefront/SupplierDirectory.tsx`. Title →
product name. Price → published customer price via `PriceTag`. Minimum order →
`MOQ`. Trust line → `Verified` + supplier name + city. Performance line →
fulfilment rate, which we hold and Alibaba's reorder rate stands in for. The
verified badge and the supplier's company name are the two fields that must
survive at any density; they are what a trade buyer scans for.

---

## 2. Categories — two-pane browser

```
┌─────────┬──────────────────────────────────────┐
│ For you │   ◯         ◯         ◯              │
│ Featured│ caption   caption   caption          │
│ Deals   │                                      │
│ Apparel │   ◯         ◯         ◯              │
│ Home &  │ caption   caption   caption          │
│ Garden  │                                      │
│ ...     │   ◯         ◯       [View all]       │
│         │──────────────────────────────────────│
│         │ Get product inspiration              │
└─────────┴──────────────────────────────────────┘
```

| property | value |
| --- | --- |
| page header | `Categories`, ~18px bold, left; one icon right |
| left rail width | ~25% of viewport (~96px at 390) |
| left rail ground | light grey; active item white with a left accent bar |
| left rail item | ~11px, wraps to two lines, ~48px row pitch, scrolls independently |
| right pane | white, 3 columns |
| tile | circle, ~78px, light grey disc, image or word inside |
| tile pitch | ~113px per row, caption ~11px below, two lines max |
| set terminator | a `View all` tile with a grid glyph |
| below the grid | a content section (`Get product inspiration`) |

**AfriDeal mapping.** New route `/categories`, and the `Categories` tab in
the mobile tab bar points at it. Left rail → the seven seeded categories.
Right pane → that category's products as tiles, closing with `View all` →
`/browse?category=`. Alibaba's tiles are sub-categories; we do not have a
second level yet (research doc §2.1), so products stand in until we do.

---

## 3. Home

| pattern | value |
| --- | --- |
| service entry points | three tiles in one row under the search field: `Source by category`, `Request for Quotation`, `Verified Pro Supplier`. ~44px tall, icon left, two-line ~12px label |
| horizontal rails | `Factory matches for recent views`, `Get samples`, `Top-ranking manufacturers` - each a 4-up rail of ~90px square tiles with a caption and a `From US$x` line, section title ~16px bold with an arrow |
| segmented tabs | `AI Mode | Products | Manufacturers | Worldwide` above the search field |
| category chips | horizontal scroll under the search field, `All` active |

**AfriDeal mapping.** The three service tiles map to `Browse`, `Request a
quotation` (RFQ - exists, entry point unresolved after TICKET-006) and
`Verified suppliers` (`/suppliers`). The rails map to `Live Deals` and the
supplier directory preview. Our one-row badge strip and ribbon already follow
the "strips stay strips on a phone" rule.

---

## 4. Global patterns

| pattern | Alibaba | AfriDeal |
| --- | --- | --- |
| accent | one orange, on the active tab underline, primary button, badges | `#E67E22` on the storefront (already in use) |
| type scale | body 12-13px, titles 14px, prices 18px bold - dense | keep the scale, keep our faces |
| corners | ~6-8px on images and tiles, full pills on chips | `rounded-md` / `rounded-full` |
| list chrome | hairline separators, no shadows on lists | `divide-hairline`; save `shadow-card` for true cards |
| top chrome | sticky search field | already so |
| bottom chrome | 5-tab bar, active in the accent | `MobileTabBar`, already so |
| transitions | tab underline slides; chips scroll; content scrolls under the sticky header. Nothing elaborate. | match: no entrance animations on lists |

---

## 5. Not yet observed

These are named in the product owner's brief but are not in any recording on
file. Do not build them from memory - request a recording.

- **Sign-up and onboarding flow**
- **Product detail page** for a physical good (the recording shows an
  agent-service listing, which is a different template)
- **Cart and checkout**
- **Messenger / enquiry thread**
- **Supplier upload flow** - the product owner's phrase was "their style for
  uploading suppliers"; whether that means the supplier-side listing form or
  the buyer-side supplier cards is an open question. §1 answers the second
  reading; the first needs a recording of the seller app.
