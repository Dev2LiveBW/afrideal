# Alibaba as the UI benchmark

**Status:** standing instruction from the product owner, 2026-09-11.
**Scope:** the customer storefront. Not the admin, supplier or runner consoles.

> Every change to storefront UI is measured against how the Alibaba buyer app
> does the same thing on a phone. Match its density and its patterns; keep
> AfriDeal's colour, type and copy. Where AfriDeal's model differs (it is the
> merchant, Alibaba is an introduction service) the pattern is adapted, not
> copied - see `docs/research/alibaba-1688-features.md` §1 for the cases.

## How this document is maintained

Two sources, in order of authority:

1. **The live mobile site, measured in the Browser pane.** `m.alibaba.com`
   renders the same layouts as the app and its DOM can be measured exactly -
   computed font sizes, colours, radii, pitches. Where a figure below is
   marked *live* it came from this and supersedes any video estimate. Only
   some screens are reachable, see the access map.
2. **Screen recordings of the app** supplied by the product owner, for the
   screens the site gates. Frames are pulled with ffmpeg and measured;
   figures from these are estimates to within a few pixels.

**This file is the lookup.** When a screen changes or a new recording
arrives, re-measure and extend the relevant section; do not describe from
memory.

### Access map (checked 2026-09-11, 390px viewport)

| screen | live | route | note |
| --- | --- | --- | --- |
| Home | **yes** | `https://m.alibaba.com` | redirects to `www.alibaba.com/?isSpider=true` - flagged as automated, still fully rendered. An app-install interstitial appears on load; its × dismisses it |
| Categories | **yes** | `https://www.alibaba.com/category.html` | the two-pane browser; rail taps swap the pane in place |
| RFQ landing | **yes** | `https://rfq.alibaba.com/rfq/lp_page_retriever.htm` | |
| Search results | no | `/trade/search?SearchText=…` | slider CAPTCHA. **Do not attempt to pass it.** Use the 2:58 recording |
| Product detail | no | `/product-detail/…` | slider CAPTCHA. Use the 2:32 recording for chrome; the physical-good page is unrecorded |
| Sign-in | no | `login.alibaba.com` | redirects to a blank bot-check page. Needs a recording |

Prices on the live site render in **Pula** when browsed from Botswana - the
site geolocates - so `P 670.06` in a measurement is Alibaba's own display,
not ours.

Recordings on file:

| date | length | screens covered |
| --- | --- | --- |
| 2026-09-09 | 2:58 | home, categories, search results, product detail (an agent listing) |
| 2026-09-09 | 2:32 | product detail Details tab (FAQ), **Recommended tab - the catalogue card grid**, sticky enquiry bar |

Figures marked *live* were measured on the mobile site at a 390px viewport
on 2026-09-11. The rest are from the two 2026-09-09 recordings, whose phone
is 384px wide. Both are given as a share of viewport width so they transfer.

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

## 1b. Catalogue cards — the other "boxes"

The second recording is the one the product owner sent with *"see how small
their boxes are, and this is on a phone"*. It shows the **Recommended** tab of
a listing: a two-column grid of product cards. This is the pattern for any
grid of products - the catalogue, related items, a supplier's other lines.

```
┌───────────────┐ ┌───────────────┐
│               │ │               │
│    square     │ │    square     │   ← full card width, ~4px radius,
│    image      │ │    image      │     NO border, NO shadow, NO ground
│               │ │               │
└───────────────┘ └───────────────┘
 Professional Gua…   Trendy Clothing…  ← 2 lines, 13px, ellipsis
 US$0.01             US$0.05-0.20      ← 15px bold
 Min. order: 1 unit  Min. order: 1 unit ← 12px
 Verified 2 yrs · CN 1 yr · CN          ← 11px muted
```

| property | value | source |
| --- | --- | --- |
| columns | 2, at every phone width | live |
| card width | **179px at 390** (46%); columns at x=12 and x=199; **8px gutter, 12px margins** | live |
| image | **square, 179×179, 8px radius** | live |
| card chrome | **none** - `border: 0`, no shadow, transparent background; the photograph is the card's edge | live |
| title | **12px, weight 400, `#666`**, two lines, ellipsis | live |
| price | **14px, weight 700, `#111`**, a range where one exists | live |
| minimum order | **12px, `#888`**, written `1 piece (MOQ)` on the feed, `Min. order: 500 pieces` in search | live / video |
| meta line | 11px muted: `Verified` (bold blue) + years + country | video (search only) |
| card pitch | **285–310px** vertical → 4–5 cards per phone screen | live |
| overlays | a small image-search glyph bottom-left of the photograph; nothing else | video |

The live figures moved three things from the video estimate: the title is a
point smaller and grey rather than ink, the price a point smaller, and the
radius 8px not 4px.

**AfriDeal mapping.** `components/products/ProductCard.tsx`, on the `/browse`
grid. Title → name. Price → `PriceTag`. Minimum order → the rung's minimum
when the grid is filtered to a rung, else `1 unit`. Meta line → `N verified`
+ rating + category. Quick-add is kept as a round button on the photograph's
corner: the benchmark has no cart on its cards because Alibaba is not the
seller, and AfriDeal is. The save-for-later heart sits opposite it.

What was removed to get there: the tinted card ground, border and shadow,
the two-line description, and the footer band with the full-width Add button.

---

## 1c. Product detail — chrome only

The recording scrolls one listing's **Details** tab and its **Recommended**
tab. The **Overview** tab was captured in the first recording (research doc
§2.8). What transfers is the frame, not the content - the listing is an
agent service with a FAQ, not a physical good.

| pattern | value |
| --- | --- |
| top | back, search field (pre-filled with the query), camera, cart, more |
| tabs | `Overview | Details | Recommended`, active underlined, sticky under the search |
| bottom bar | sticky: a `Store` icon, `Chat now` (outlined pill), `Send inquiry` (filled accent pill) - the two pills share the width |
| Details tab | the seller's own long description, then a numbered FAQ (`1. How to start…`, `2. How do you charge…`, payment terms, on-time delivery, quality control) |
| Recommended tab | `Recommended from this supplier` grid (§1b), then `Recommended products` grid |

**AfriDeal mapping.** `Chat now / Send inquiry` → `Add to cart / Request a
quotation` on `app/(store)/products/[id]`. The tab strip and the sticky
bottom bar are the parts worth adopting; the FAQ is seller-authored content
and does not transfer. Not built yet - the physical-good detail page is
still in §5.

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

| property | value | source |
| --- | --- | --- |
| page header | `Categories`, **18px** bold, centred; back arrow left, one icon right | live |
| left rail width | **100px at 390 (26%)** | live |
| left rail ground | **`#f4f4f4`**; active item **white**, no accent bar on the web | live |
| left rail item | **13px, `#222`, 700 when active / 400 otherwise, 48px row pitch**, wraps to two lines, `overflow-y: auto` | live |
| right pane | 290px, transparent over white, 3 columns; heading 16px bold (`Recommendations` on *For you*) | live |
| tile | **78px disc, fully round** (`border-radius: 999px`), image inside | live |
| tile grid | **16px column gap, 128px row pitch**; caption **11px `#222`** below | live |
| interaction | **tapping a rail item swaps the pane in place** - no navigation, URL unchanged, tapped item goes bold on white, tiles replaced with that trade's sub-categories | live |
| set terminator | a `View all` tile with a grid glyph | video |
| below the grid | `Get product inspiration` - a 2-column §1b grid | live |

**AfriDeal mapping.** New route `/categories`, and the `Categories` tab in
the mobile tab bar points at it. Left rail → the seven seeded categories.
Right pane → that category's products as tiles, closing with `View all` →
`/browse?category=`. Alibaba's tiles are sub-categories; we do not have a
second level yet (research doc §2.1), so products stand in until we do.

---

## 3. Home

| pattern | value | source |
| --- | --- | --- |
| segmented tabs | `AI Mode | Products | Manufacturers | Worldwide`: **active 18px 700, inactive 16px 400**, underline in the accent | live |
| category chips | one row, **45px tall**, horizontal scroll, `All` active | live |
| service entry points | one row of tiles: **128×52 each, 11px 700 label, 32px icon at 4px radius**, no radius on the tile. `Source by category` → `/category.html`; `Request for Quotation` → the RFQ landing (§3b) | live |
| horizontal rails | `Top Deals`, `New Arrivals`: section title **13px** with an arrow; cards **136×172, image 136×136 at 4px radius, no chrome; price 13px 700 in `rgb(247,66,30)`, caption 11px `#666`**; the floor is 250px tall | live |
| feed | the page continues into a 2-column §1b grid, ~6,700px of it | live |
| sign-in nudge | a 48px banner above the tab bar: `Sign in for better sourcing experience` + button | live |
| bottom tab bar | **56px**: `Home | Tips | Messenger | Cart | My Alibaba` (the app says `Categories` where the web says `Tips`) | live |

**AfriDeal mapping.** The three service tiles map to `Browse`, `Request a
quotation` (RFQ - exists, entry point unresolved after TICKET-006) and
`Verified suppliers` (`/suppliers`). The rails map to `Live Deals` and the
supplier directory preview. Our one-row badge strip and ribbon already follow
the "strips stay strips on a phone" rule.

---

## 3b. Request for Quotation landing — *live*

`rfq.alibaba.com/rfq/lp_page_retriever.htm`, reached from the home tile.
This is the top-level RFQ entry point that TICKET-006 left AfriDeal without
(research doc, open question 2).

```
┌──────────────────────────────────────┐
│ ‹  [RFQ] Request for Quotation       │  ← page header
│ Get quotes for your custom request   │  ← 18px 700, white on an indigo hero
│ Accurate supplier matching, fast …   │  ← 13px
│ Popular Requests for Quotation       │
│ [Design] [Logo] [Bundling]  ⓘ Learn  │  ← three tiles, horizontal
├──────────────────────────────────────┤
│ Tell us what you need                │  ← 16px 700, on a white card
│ ┌──────────────────────────────────┐ │
│ │ +  Upload an image, or enter     │ │  ← textarea, 64px, with a + for
│ │    keywords. For example, "100pcs│ │     an image attachment
│ │    bear toys, see upload…"       │ │
│ └──────────────────────────────────┘ │
│ ☑ Easily generate an RFQ with AI     │  ← 13px
│ [       Write RFQ details        ]   │  ← 38px, full width, pill,
│                                      │     `rgb(255,102,0)`, 13px 700
│ "RFQ saves me a lot of time…"        │  ← testimonial
└──────────────────────────────────────┘
```

**AfriDeal mapping.** The shape is one free-text field plus an image, and
one button - the whole form is deferred to the next step. Our
`components/procurement/RfqModal.tsx` opens with the full form. If RFQ gets
a top-level home again, this two-step shape (say what you need → then the
details) is the one to copy, and the `/suppliers` directory is the natural
place for the tile.

---

## 4. Global patterns

| pattern | Alibaba | AfriDeal |
| --- | --- | --- |
| accent | **`rgb(255,102,0)`** on buttons, **`rgb(247,66,30)`** on rail prices; the active tab underline. *live* | `#E67E22` on the storefront (already in use) |
| type scale | body **12px `#666` / `#888`**, card price **14px 700 `#111`**, rail price 13px, section titles 13-16px 700, page titles 18px 700, tabs 16/18. *live* | keep the scale, keep our faces |
| corners | **8px** on feed images, **4px** on rail images and icons, **999px** on category discs and buttons. *live* | `rounded-[8px]` / `rounded-sm` / `rounded-full` |
| list chrome | hairline separators, no shadows on lists | `divide-hairline`; save `shadow-card` for true cards |
| top chrome | sticky search field | already so |
| bottom chrome | 5-tab bar, active in the accent | `MobileTabBar`, already so |
| transitions | tab underline slides; chips scroll; content scrolls under the sticky header. Nothing elaborate. | match: no entrance animations on lists |

---

## 5. Not yet observed

These are named in the product owner's brief but are not in any recording on
file. Do not build them from memory - request a recording.

- **Sign-up and onboarding flow** - `login.alibaba.com` sends an automated browser to a blank bot-check page, so this cannot be measured live
- **Product detail page** for a physical good. Both recordings show an
  agent-service listing; its chrome is in §1c, but the price ladder, variant
  picker and gallery of a physical good are not on file.
- **Cart and checkout**
- **Messenger / enquiry thread**
- **Supplier upload flow** - the product owner's phrase was "their style for
  uploading suppliers"; whether that means the supplier-side listing form or
  the buyer-side supplier cards is an open question. §1 answers the second
  reading; the first needs a recording of the seller app.
