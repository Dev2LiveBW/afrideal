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
| Home | **yes** | `https://m.alibaba.com` | redirects to `www.alibaba.com/?isSpider=true` - flagged as automated, still fully rendered. An app-install interstitial appears on load; its × dismisses it. **Serves the phone layout only when the tab's first request is already phone-sized**: open a fresh tab on any other site, set the 390px viewport, *then* navigate. A tab that has once received the desktop page keeps getting it, and a tab-row tap (`/?tab=supplier`) flips it to desktop too |
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

Summary table; the full grid is §3a, the effects §4b.

| pattern | value | source |
| --- | --- | --- |
| segmented tabs | `AI Mode | Products | Manufacturers | Worldwide`: **active 18px 700, inactive 16px 400**, 2px ink rule under the active one. Each tab is a **page** - the URL changes | live |
| category chips | one row, **45px tall**, horizontal scroll, `All` active; a 3px bar slides under the active chip | live |
| service entry points | one row of tiles: **128×52 each, 11px 700 label, 32px icon at 4px radius**, no radius on the tile. `Source by category` → `/category.html`; `Request for Quotation` → the RFQ landing (§3b) | live |
| horizontal rails | `Fast customization`, `New Arrivals`: section title **16px 700** with a 17px mark and an 11px `#767676` subtitle, 20px arrow; cards **136×172, image 136×136 at 4px radius under a 4% black film, no chrome; price 13px 700, caption 11px `#666`**; the floor is 250px tall | live |
| feed | the page continues into a 2-column §1b grid, ~3,600px of it, with a 179×301 slideshow in the first cell | live |
| sign-in nudge | a 48px banner fixed above the tab bar: `Sign in for better sourcing experience` + button | live |
| bottom tab bar | **56px**: `Home | Tips | Messenger | Cart | My Alibaba` (the app says `Categories` where the web says `Tips`) | live |

**AfriDeal mapping - built (2026-09-11).** The home page is
`app/(store)/page.tsx` in this order; every piece is a component under
`components/storefront/home/` unless named otherwise.

| benchmark | AfriDeal |
| --- | --- |
| header: logo + search pill | `StorefrontNav` row 1 - 50px, `#f4f4f4` pill, rolling placeholder, black pill button; cart moves to the tab bar on phones |
| tabs row | `HomeTabs` - `Products | Suppliers | Runners | Quotes`, links; also on `/suppliers` |
| chips row + sheet | `HomeCatalogue` → `CategoryChips` - swaps the floors for that trade's feed in place |
| tool floor | `ToolFloor` - Browse by category / Request for Quotation / Verified suppliers / Request a runner / Track your order |
| *(no banner on mobile)* | `MockupHero` - the product owner's hero stands as the first floor, its badge strip off |
| floors on rails | `Floor` + `Rail` + `RailCard`; used by `PopularCategories`, `LiveDeals`, `SupplierDirectorySection`, `PathChooser variant="floor"` |
| feed with slideshow cell | `HomeCatalogue` → `Feed` + `PromoCarousel` (the three old `PromoCards`) |
| sign-in nudge | `SignInNudge` - with a close, which the benchmark lacks |
| bottom bar | `MobileTabBar` - `Home | Categories | Cart | Orders | Account` |

---

## 3a. Home — the grid, measured *live*

`www.alibaba.com/?isSpider=true` served as the phone layout, 390×844,
2026-09-11. Every figure below is a DOM measurement. Positions are page
y-coordinates at the top of the page.

```
y=0     ┌──────────────────────────────────────┐
        │ [logo 125px]  (🔍 surron        [●])  │  50   header - FIXED on scroll, 1px shadow
y=50    │ AI Mode  Products  Manufacturers  W…  │  55   tabs - scroll away
        │          ‾‾‾‾‾‾‾‾                     │
y=105   │ All  Health Care  Apparel & …   ▒ ⌄   │  45   chips, #f8f8f8
        │ ‾‾                                    │
y=150   │ [▣ Source by ] [◎ Request for] [ep S…│  68   tool floor, #f8f8f8
        │    category      Quotation            │
y=218   │ ✂ Fast customization               →  │
        │ Low MOQ · 14-day dispatch · True …    │  250  floor 1
        │ [img] [img] [img…                     │
        │ P 777  P 56                           │
y=468   │ New Arrivals                       →  │  250  floor 2
y=718   │ [slideshow] [card]                    │
        │ [card]      [card]   …                │  3570 feed
y=4288  │ Home  Tips  Messenger  Cart  My Ali   │  56   bottom bar - FIXED
        └──────────────────────────────────────┘
          fixed above the bar: 48px sign-in banner
```

### Header (`#__new__header`, 50px)

| item | value |
| --- | --- |
| container | 50px, white; **on scroll: `position: fixed; top: 0; z-index: 999; box-shadow: 0 1px 0 rgba(0,0,0,.12)`**. The tabs and chips under it are not sticky - they scroll away |
| logo | 125×50 at x=14 |
| search form | **234×34 at x=152, y=8; `#f4f4f4`; `border-radius: 999px`; `padding: 0 4px 0 16px`; no border** |
| input | 16px (so iOS does not zoom), 22px tall |
| placeholder | **rolls**: a `queryText` span in `#b8b8b8` 13px inside an `overflow: hidden` 22px box; each new term enters with `slideIn` (.3s ease-in, `translateY(-100%) → 0`) and leaves with `slideOut` (.3s ease-in-out, `0 → translateY(100%)`). Terms observed: `🏍surron`, `⌚watch` |
| camera (image search) | 24×24 at x=308 |
| search button | **40×26 pill at x=342, `#222`**, white magnifier; `:active { opacity: .8 }` |

### Tabs (`.tabs`, 55px)

| item | value |
| --- | --- |
| row | 55px, `padding: 0 12px`, `border-bottom: 1px solid #eee`, `overflow-x: auto` |
| inactive | **16px 400 `#222`**, 55px tall flex item |
| active | **18px 700 `#222`, `border-bottom: 2px solid #000`, `padding-bottom: 4px`** (`.high-light-line`) |
| widths | AI Mode 58 · Products 102 · Manufacturers 122 · Worldwide 98 (label + 24px) |
| behaviour | **a page each**: tapping Manufacturers navigates to `/?tab=supplier&InAS=y` |

### Chips (`.category-nav`, 45px)

| item | value |
| --- | --- |
| row | 45px, **`#f8f8f8`**, `border-bottom: 1px solid #f5f5f5` |
| scroller | 355px wide (the row minus the chevron), `padding: 0 4px`, `overflow-x: scroll`, content 3,237px |
| chip | **13px `#222`, `margin: 0 8px`**, 19px tall; active **700** |
| selected bar | `::after` on the scroller: **3px tall, `#222`, `border-radius: 4px`, `bottom: 0`, `left`/`width` = the active chip's; `transition: left .2s, width .2s`** |
| right edge | a 16px `linear-gradient(90deg, rgba(255,255,255,.5) 0, #f8f8f8 66%)` blur over the row's end, then a **36×44 chevron button**; the chevron `transition: transform .3s ease-in-out` and rotates when open |
| popup | `grid-total-container tab-popup`: `position: fixed` from the chips' foot to the screen's, the mask fades in over .18s and the panel drops in over .22s (§4b) |

### Tool floor (`.tool-floor`, 68px)

| item | value |
| --- | --- |
| band | `#f8f8f8`, `padding: 8px 0 0` |
| row | `flex; gap: 4px; padding: 0 12px; overflow-x: auto` |
| tile | `<a>` **128×52, white, `border-radius: 4px`, `padding: 10px 8px`, `gap: 4px`**, flex |
| icon | **32×32 `<img>`, 4px radius** |
| label | **11px 700 `#222`**, two lines (26px) |
| links | `Source by category` → `/category.html`; `Request for Quotation` → `rfq.alibaba.com/rfq/lp_page_retriever.htm`; `Source in Europe` → a partner site |

### Product floor (`.product-floor`, 250px)

| item | value |
| --- | --- |
| header | an **`<a>`** (the whole header is the "view all"), `padding: 12px 12px 0`, flex |
| title | **16px 700 `#222`**, with a **17×18 icon** before it (`margin-right: 6px`) |
| subtitle | **11px `#767676`, `margin-top: 4px`** (`Low MOQ · 14-day dispatch · True to design`) |
| arrow | 20×20 at the right edge (x=358) |
| rail | `flex; gap: 4px; padding: 8px 12px 12px; overflow-x: auto`; **no scroll-snap** |
| card | `<a>` **136×172** |
| image | **136×136, 4px radius**, under an `.overlay` of **`rgba(0,0,0,.04)`** - the film that evens out white grounds |
| pill | `.center-desc` centred on the image's foot: **`rgba(34,34,34,.6)`, 8px radius, `padding: 3px 6px`, 10px 700 white**, e.g. `Logo/graphic design`, `Care label` |
| line 1 | **13px 700 `#222`**, `margin-top: 4px`, one line (`P 777.27`) |
| line 2 | **11px `#666`**, `margin-top: 2px` (`Min. order: 1 pair`) |

### Feed (`#cdn-pc-recommend_m-home-react__just_for_you`)

| item | value |
| --- | --- |
| container | white, **`padding: 8px 12px`**, flex-wrap; cells **179px** at x=12 and x=199, **`margin-bottom: 8px`** |
| product cell | an `<a>` to `/product-detail/…`, 277px tall: image **179×179, 8px radius, `#f4f4f4` ground** while loading; a 40×40 image-search glyph at the image's bottom-left; title 2 lines (34px); price **14px 700 `#111`**; MOQ **12px `#888`** (`1 piece (MOQ)`); pitch 285 |
| first cell | **a slideshow, 179×301, 8px radius** (`rx-carousel-container`) - see §4b for its motion |
| interstitials | `You may be looking for …` cells, 179×298, every ~8 products |
| foot | a **48px loading row** with a rotating arc (`margin-bottom: 20px`) - the feed loads on scroll |

### Sign-in banner (`.msite-login-banner`)

| item | value |
| --- | --- |
| box | **`position: fixed; bottom: 56px`; 48px; z 9999** |
| ground | **`linear-gradient(89deg, #FFEAD1 -1.66%, #FFD5D1 101.88%)`**, `padding: 8px 12px` |
| mark | 28×28 image at the left |
| title | **11px 700 `#4B1D1F`** |
| button | orange pill at the right; `transition: opacity .2s ease; :active { opacity: .8 }` |

### Bottom bar (`#__new__bottom__bar`)

| item | value |
| --- | --- |
| box | **`position: fixed; bottom: 0`; 56px; white; `border-top: 1px solid #eee`; `padding: 5px 8px 0`; z 998** |
| item | 75px wide, flex column, 50px tall |
| icon | **26px** icon font |
| label | **12px**, 14px line |
| active | **`rgb(255,102,0)`** on icon and label (Home) |

Also fixed: an `Open app` pill, 74×30 at the top right (x=316, y=156), z
9997. Not applicable to us.

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

**AfriDeal mapping — built.** `app/(store)/rfq/page.tsx` is the landing;
`app/(store)/rfq/details/page.tsx` is step two. Measured against the live
page at 360px: tiles 109×94 (theirs 109×94), 12px radius, h1 18px 700,
field 64px with a 13px `#999` placeholder, CTA a 38px pill, steps on 24px
outlined numbers. At 320×690 the whole first step sits above the tab bar.

What differs, and why:

- **Step two is the runner request form.** Our `/api/rfqs` needs a
  `product_id`; the product-agnostic "describe anything" request on this
  storefront is a runner finding and pricing it, and that form already
  captures what a quote needs. It arrives pre-filled with the landing text.
- **Sign-in is asked at step two**, as on Alibaba, with `next` carrying the
  description so nothing typed is lost.
- **No AI toggle** - nothing is behind it, and a checked box that does
  nothing is a lie. **No testimonial carousel** - we have none.
- **No image attach yet** - there is no upload endpoint. The field's
  placeholder still invites a description; add the `+` when uploads exist.
- The three "popular requests" are AfriDeal's real shapes: a bulk order of
  a listing (`/browse?tier=CUSTOM`), something not listed, branded/custom.

Entry points: the hero badge strip (`Request a Quote`, replacing a
placeholder badge), the nav's second row (`Get a quote`), the mobile menu.

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
| transitions | see §4b - a push between screens, an instant swap between tabs, a sliding bar under chips, a rolling placeholder, press states on everything. Nothing on lists. | `PageTransition`, `CategoryChips`, `SearchField`; `.press` / `.press-soft`; no entrance animations on lists |

---

## 4b. Effects and transitions

Two sources: the buyer app recording (2:58, 2026-09-09, pulled at 15fps)
for what happens *between* screens, and the live site's stylesheets
(`producthomeheader.css`, `producthomecontent.css`, `render-header.css`,
`m-home-react.umd.production.css`, fetched 2026-09-11) for what happens
*on* them. Timings from the stylesheets are exact; from the recording they
are to the nearest frame (67ms).

### Between screens (app recording)

| gesture | what happens | timing |
| --- | --- | --- |
| tap a card, a tile, a category disc | the new screen **pushes in from the right** over the old one, which stays put underneath; it then shows an **orange arc spinner** centred on white until its content lands | ~3 frames ≈ **200ms**, ease-out |
| tap a bottom-bar tab | **instant swap** - no slide, at most one frame of fade | ≤ 67ms |
| tap a rail item on the categories page | the pane **blanks at once**, the orange arc spins centred in the pane, then the tiles land - no navigation | spinner ≈ 0.5-0.8s (network) |
| back | the top screen leaves the way it came | not measured |

### On a screen (stylesheets, live)

| what | rule |
| --- | --- |
| **press state, buttons** | `.cdmb-button { transition: opacity .15s ease }`; `.cdmb-button:active::before { opacity: .065 }` (a 6.5% black wash); login banner and search buttons `:active { opacity: .8 }` |
| **press state, cards / slides** | `.slideshow_item:active { opacity: .9 }` |
| **tab / chip bar** | `.selected-bar::after { transition: left .2s, width .2s }` - the bar slides, the labels do not move |
| **chevron** | `transform: rotate(var(--tab-icon-rotate, 0)); transition: transform .3s ease-in-out` |
| **popup mask** | in: `background: transparent → rgba(0,0,0,.36)` over `.18s ease-out`; out: the reverse over `.18s ease-in` |
| **popup sheet** | in: `translate3d(0,100%,0) → 0` over `.22s cubic-bezier(.22,.61,.36,1)`; out: `.18s cubic-bezier(.4,0,1,1)`; `will-change: transform` |
| **search placeholder** | `slideIn`: `translateY(-100%) → 0`, `.3s ease-in`; `slideOut`: `0 → translateY(100%)`, `.3s ease-in-out` |
| **dropdown menus** | `slideDownAndFade`: `opacity 0 → 1, translateY(-2px) → 0`, `.4s cubic-bezier(.16,1,.3,1)`; `slideUpAndFade` the reverse |
| **slideshow** | `.slideshow_item > img { transform: scale(1); transition: transform .3s ease }`, `transition: none` while `.is-touching`; `.indicator-dot { transition: all .3s ease }` |
| **loading arc** | `rotate(0) → rotate(1turn)`, `1s linear infinite` (`.8s` on the small variant) |
| **utility** | `.mcwa-transition-all { transition: all .15s cubic-bezier(.4,0,.2,1) }` - Tailwind's default, which is what our `transition-*` classes already are |
| **photograph film** | `.overlay { background: rgba(0,0,0,.04) }` over every rail image |
| **hover** | almost none - one `:hover` on the image-search button. Phone-first |
| **lists** | no entrance animation anywhere. Cards are simply there |

**AfriDeal mapping - built.** `components/motion/PageTransition.tsx`: on a
phone, a forward navigation pushes in from the right over .22s on the
sheet's easing, a back navigation comes from the left, a tab-bar tap is an
instant swap (the bar calls `markTabNavigation()`), a wide screen gets no
motion at all (the benchmark's web site does a plain load). `.press` and
`.press-soft` in `globals.css` are the press states; `.film` the 4% wash;
the chip bar, chevron, sheet and mask in `HomeCatalogue.tsx` carry the
timings above verbatim; the placeholder rolls in `StorefrontNav.tsx` with
the `ticker-in` keyframe; `PromoCarousel.tsx` is the slideshow; the feed's
foot spins the arc. `ProductCard` lost its fade-and-rise.

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
