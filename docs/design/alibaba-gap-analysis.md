# Alibaba on a phone vs. AfriDeal — gap analysis

**Date:** 2026-09-14 · **Viewport:** 390×844 (iPhone 14/15 class) · **Scope:** the customer storefront.
**Companion:** `alibaba-benchmark.md` holds the measured specs; this file says where AfriDeal stands against them and what closes each gap. `../research/alibaba-1688-features.md` §1 covers where the *model* differs and a pattern is adapted rather than copied.

> **Status: measured against the mobile *site* (`m.alibaba.com`), app verification pending.** The product owner's benchmark is the Alibaba buyer **app**. The site is the stand-in the benchmark file uses because it renders the same layouts, but four things below were seen only on the site and must be re-checked on the app before they drive work: the sign-in welcome and create-account screens (§3.7), the feed cell's trust row, the categories rail's accent bar and 64px rows, and the tab bar (the app says `Categories` where the site says `Tips`). §6 lists how to capture the app itself.

**Sources.** Alibaba: the live mobile site measured in the Browser pane today (home, feed, categories, sign-in welcome, sign-in form, create-account) plus the two 2026-09-09 recordings of the **app** for the screens the site gates (search results, product detail). AfriDeal: `localhost:3000` on `main` at `a2fa5ff`, every storefront route, signed out and signed in as the seeded customer. Every figure below is a DOM measurement unless marked *video* or *not observed*.

---

## 1. What makes Alibaba feel like Alibaba on a phone

Ten things, in the order a buyer meets them. The benchmark file has the pixel specs; this is the *why*.

| # | principle | what it looks like on the phone |
| --- | --- | --- |
| 1 | **Product first, marketing never** | No hero, no value-prop cards, no badge strip. The first photograph is at **y≈270**, under 50px header + 55px tabs + 45px chips + 68px tool floor. Everything on the home screen is a product or a way to find one. |
| 2 | **One chrome, one page-header** | The storefront chrome is 50px header (logo · search pill · camera · black button) + 56px tab bar. Inner screens (Categories, Sign in, RFQ) drop the storefront header for a **page header**: back chevron, centred 18px title, one icon right. Nothing else. |
| 3 | **Density by discipline** | Type scale 11 / 12 / 13 / 14 / 16 / 18. Ink `#222`/`#111`, greys `#666`/`#888`. 12px margins, 8px gutters. The photograph *is* the card edge: no border, shadow, or ground. 4–5 cards or 4½ rows per screen. |
| 4 | **The feed is the floor of the page** | Home ends in a 2-column feed that loads on scroll for thousands of pixels. There is no footer, no "about us", no how-it-works. |
| 5 | **Trust as micro-badges on every card** | Every feed cell carries a row after the MOQ: a `N YRS` pill (28×16), a gold shield/coin (16×16) and the blue `Verified` wordmark; hot listings get a red `Super` flag (34×16) inline before the title. The trust signal travels with the product. |
| 6 | **Progressive forms** | Sign-in is three screens of one decision each: a welcome (brand hero + three 48px pill options), then *one* field, then the next. The CTA is disabled (50% opacity) until the field is valid. Social sign-in is demoted to icon tiles once you are past the welcome. |
| 7 | **A sticky action bar on the detail page** | `Store` icon · `Chat now` (outlined pill) · `Send inquiry` (filled pill) fixed at the foot. The buy decision is always one thumb away, however far you have scrolled. *(video)* |
| 8 | **Motion is small and instant** | 200ms push between screens; instant swap between bottom tabs; 150ms press wash on anything tappable; a 3px bar sliding under chips; **no entrance animation on any list**. |
| 9 | **Two-pane category browser with a second level** | 100px grey rail, white active row with a black accent bar, 78px discs in the pane, `View all` terminator, then an inspiration feed. Tapping the rail swaps the pane in place — no navigation. |
| 10 | **A single nudge, fixed** | One 48px sign-in banner fixed above the tab bar. No modals, no toasts, no cookie bars. (The web does add an *Open app* pill; not applicable.) |

### Access notes from today (extend the benchmark's access map)

- **Sign-in and create-account are reachable live** via the bottom bar's `Cart` tab (it redirects to `login.alibaba.com/mini_login.htm?…isMobile=true`). The benchmark's §5 listed sign-up as unobserved; it is now measured (§3.7 below and the benchmark's new §3c).
- The categories rail **now** shows a black accent bar on the active row and rows are **64px**, not 48 (benchmark §2 updated).
- Search results, product detail and — today — the RFQ landing sit behind the slider CAPTCHA. **Not attempted.** After a CAPTCHA page the tab is served the desktop layout on every later request; open a fresh phone-sized tab.

---

## 2. Scorecard

Parity is a judgement of *feel* at 390px: 10 = a buyer would not notice they had switched apps; 1 = a desktop page on a phone.

| screen | parity | the gap in one line | fix size |
| --- | :---: | --- | :---: |
| Home | **8** | 700px of hero, badge strip and "how to buy" before the first product; 81px header | S |
| Categories | **8** | storefront header + title band (135px) where a 50px page header belongs; pane runs out | S |
| Suppliers directory | **9** | the row pattern is exact | — |
| RFQ landing | **9** | built to the live spec | — |
| Browse / search results | **5** | 250px of controls above the grid; grid where search wants rows; tier pills wrap | M |
| Sign in | **4** | a marketing page with the form at y=660; no page header; no progressive step | M |
| Create account | **3** | form at y=990, four fields on one screen; Alibaba asks one | M |
| Request a runner | **5** | 112px blank + 900px of explanation before the form | S |
| Product detail | **3** | desktop layout: breadcrumb, thumbnail column, 28px title, 68px tier rows, buy button at y=1,649 and not sticky, 5,389px tall | L |
| Cart | **3** | desktop row squeezed: 4-line title, 7-line nudge, 482px per line; checkout button at y=941, not sticky | M |
| Checkout | **4** | 112px blank; 30px title; `Place order` at y=1,356, not sticky | S |
| Orders | **2** | desktop row squeezed: an 11-line meta column, `Â·` mojibake, 282px per order | M |
| Account | **—** | no screen; the tab links to `/orders` | M |
| Global chrome & motion | **8** | header, tab bar, press states and transitions are to spec; the extra location row is the only miss | S |

**Reading it:** the pages built since 2026-09-11 against the benchmark (home, categories, suppliers, RFQ) are at or near parity. Everything the buyer touches *after* choosing a product — detail, cart, checkout, orders, sign-in — is the older desktop-first layout wearing the storefront's header. That is where the feeling breaks.

---

## 3. Screen by screen

Positions are page y-coordinates at the top of the page, 390px wide.

### 3.1 Home

```
Alibaba                                  AfriDeal
y=0    header 50 (fixed)                 y=0    header 50 + location row 31 = 81 (sticky)
y=50   tabs 55                           y=81   tabs 56
y=105  chips 45                          y=137  chips 46
y=150  tool floor 68                     y=183  tool floor 60
y=218  ▶ floor 1: products (250)         y=243  hero: two cards (352)
y=468  floor 2: products (250)           y=595  badge strip (81)
y=718  feed, 2-col, ~3,570px, infinite   y=676  Popular Categories floor (243)
                                          y=919  ▶ Live Deals floor (243)  ← first product, y=978
                                          y=1162 Verified suppliers floor (243)
                                          y=1405 Choose how you want to buy (426)
                                          y=1830 (spacer) 127
                                          y=1957 Just for you feed (1,532) — 8 of 17 shown, loads on scroll
                                          y=3553 How it works (934)
                                          y=4487 footer (515)
                                          total 6,196
fixed: sign-in banner 48 + tab bar 56    fixed: sign-in nudge 48 + tab bar 57
```

| pattern | Alibaba | AfriDeal | gap |
| --- | --- | --- | --- |
| header | 50px; logo · `#f4f4f4` pill 234×34 · camera · 40×26 black button; fixed on scroll | 50px; logo · pill 242×34 `#f4f4f4` 9999px · black button · **hamburger**; then a **31px second row** (📍 Gaborone · Suppliers · Get a quote · Track order) that collapses on scroll | second row costs 31px at the top of every page; the hamburger duplicates the tab bar |
| tabs | 18/700 active with 2px rule, 16/400 inactive, 55px | identical (18/700 · 16/400 · 2px `#222` rule · 55px) | none |
| chips | 13px, 700 active, 3px sliding bar, `#f8f8f8` | identical | none |
| tool floor | 128×52 white tiles, 32px icon, 11/700 label | 128×52 tiles, tinted icon squares, 11/700 label | none |
| first product | y≈270 | **y=978** | **~700px later** — the hero (352), badge strip (81), categories floor (243) come first |
| product floors | 136×172 cards, 136px image, 13/700 price, 11px MOQ | same geometry; price 13/700 in brand green; rail caption 11px `#666` | none (colour is ours by rule) |
| feed cell | 179px; image 179² 8px radius; title 12/400 `#666` 2 lines; price 14/700 `#111`; `1 piece (MOQ)` 12px `#888`; **trust row** YRS·shield·Verified; `Super` flag | 179px; image 179²; title 12/400; price 14/700 `#111`; `Min. order: 1 unit`; trust row `✓ 2 verified · ★4.9 · Category`; `FEATURED` / `−8%` pills top-left; heart top-right; orange **+** bottom-right | close. Ours carries two overlays and a quick-add the benchmark lacks (deliberate — we are the seller). Alibaba's image-search glyph has no equivalent |
| feed length | infinite | loads 8 at a time until the catalogue's 17 run out | mechanism matches; the catalogue is the limit |
| after the feed | nothing | **How it works (934) + footer (515)** | 1,449px of prose after the last product |
| sign-in nudge | 48px gradient banner, no close | same banner, with a close | none |
| bottom bar | 56px; 26px icons; 12px labels; `rgb(255,102,0)` active | 57px; 26px icons; 12px labels; `#E67E22` active | none |

**Also observed:** the home page throws a React **hydration mismatch** on load (the dev overlay's "1 error" pill; `Hydration failed because the initial UI does not match what was rendered on the server`). In production that is a full client re-render — a visible flash on the first screen a buyer sees. Track down the server/client difference (the rolling placeholder, the sign-in nudge's dismissed state, or the footer's `new Date()` are the usual suspects) before any of the layout work.

**Close it with**

1. On phones, open with a product floor: move `MockupHero` and the badge strip below `LiveDeals` (or collapse the hero to one 136px rail card per path — "Shop" and "Request a runner" — inside the first floor). The two hero cards stay side by side on wide screens as agreed; the rule is about *phones*.
2. Drop `Choose how you want to buy` to a single 68px tool-floor tile (`Buy in bulk`) on phones; the three cards are a desktop explainer.
3. Fold the location row into the search pill's placeholder prefix (`📍 Gaborone · Brazilian Body Wave…`) or into the hamburger sheet; the header returns to 50px.
4. On phones, end the page at the feed's loading arc. `How it works` already has its own route (`/how-it-works`); link it from the tool floor. Reduce the footer to a 3-line legal strip below `md`.
5. Fix the hydration mismatch.

### 3.2 Categories

| pattern | Alibaba | AfriDeal | gap |
| --- | --- | --- | --- |
| top | **page header 50px**: ‹ back · `Categories` 18/700 centred · one icon | storefront header 81px + a **60px grey title band** (`Categories` 18/700, left) = 135px | 85px, and the search pill and location row have no job on this screen |
| rail | 100px, `#f4f4f4`, **64px** rows, 13px `#222`, 700 + white + black accent bar when active; 40 trades; scrolls independently | 100px, 49px rows, 13/600 active on white with an orange bar; 7 trades | rail is 340px tall and ends; the pane below is empty white to y≈1,450 |
| first rail item | `For you` → *Recommendations* grid | the first trade | no "For you" |
| pane | 16/700 heading; 78px discs, 11px `#222` caption, 128px row pitch; sub-categories; `View all`; then **Get product inspiration** 2-col feed | tinted icon + 16px heading; 78px discs; 11px captions; products as tiles; `View all` disc | no second level (data-model, research §2.1); no inspiration feed |

**Close it with:** a `PageHeader` component (back · title · icon) used instead of `StorefrontNav` on categories, RFQ, cart, checkout, orders and auth; a `For you` rail item whose pane is the home feed's first 9 products as discs; the `HomeCatalogue` feed under the tile grid as *More in this trade*; let the rail fill the viewport (`min-h-[calc(100dvh-50px-56px)]`).

### 3.3 Browse and search results

Alibaba's search results *(video, benchmark §1)*: sticky search field carrying the query · segmented `Products | Suppliers | Worldwide` · one row of filter chips (`Super`, `Verified Supplier`, `20-day delivery`) · then **rows** (image 31vw square left, 14px title, 18px price, MOQ, `Verified` + years + country, reorder rate) at ~130px pitch, 4½ per screen.

AfriDeal `/browse` (also the target of the header search, `/browse?q=`):

| y | element | height |
| --- | --- | --- |
| 81 | `Everything on AfriDeal` 18/700 | 40 |
| 133 | tier pills `Retail 1–4 · Bulk 5–19 · Wholesale 20–49 · …` — 56px grey pills whose ranges **wrap to two lines** | 56 |
| 204 | category chips as **outlined 32px pills**, green `All` | 32 |
| 250 | search-icon button · `Sort` select · `17 of 17` | 40 |
| 307 | 2-col card grid (175px cells, 275px pitch) | … |

| gap | note |
| --- | --- |
| **250px of controls** before the first product vs ~150px | the tier pills and the sort row are the cost |
| grid, not rows | the grid is the benchmark's *Recommended* pattern (§1b), right for browsing a trade; **search results want the row** (§1) because a buyer scanning results reads price and MOQ down a column |
| no query in the header | the search pill still rolls its placeholder on the results page; Alibaba pins the query in it with a clear × |
| chips styled as pills | the storefront's chip row (13px text, 3px sliding bar) already exists on the home page; browse uses an older outlined-pill style |
| tier pills | five options × two lines; the tier belongs in the filter chip row (`All · Retail · Bulk · Wholesale`) or in a sort sheet |

**Close it with:** when `q` is present, render `SupplierDirectory`'s row list (it already is the §1 row) with the query pinned in the search pill; keep the grid for category browsing. Replace the tier pills + chip row + sort row with one 45px chip row (`CategoryChips`) and a filter icon that opens the sheet `HomeCatalogue` already has.

### 3.4 Product detail

Alibaba *(video, benchmark §1c)*: back · search field with the query · camera · cart · more; a sticky tab strip `Overview | Details | Recommended`; a full-width square gallery with a counter; 16px title; price range 18/700; MOQ; supplier line; a sticky bottom bar `Store · Chat now · Send inquiry`.

AfriDeal `/products/p014`:

| y | element | note |
| --- | --- | --- |
| 81 | **blank** | `pt-32` — 128px of padding meant for a detached fixed nav that is now sticky and in flow |
| 209 | breadcrumb `Home › Hair, Weaves & Extensions › HD Lace…` | two lines; a desktop pattern |
| 279 | gallery: **72px thumbnail column** + 4:3 main image, `FRONT` caption | desktop layout; on a phone the gallery is a full-width square swipe with dots or `1/4` |
| 641 | `TOP RATED` pill · ★ 4.7 (236 reviews) | fine |
| 673 | title **28/700**, 64px tall | Alibaba's is ~16px; the benchmark's page titles are 18/700 |
| 951 | variant buttons **131×80** (name · price · SKU) | 3 per row, 80px tall |
| 1174 | price ladder: four **68px** tier rows in 20px-radius pills, monospace figures, `Custom / Institutional` row | 370px for what is one number and a `see tiers` link on a phone |
| 1547 | quantity stepper + line total | |
| 1649 | `Add to cart` green 52px pill · `View cart` outlined | **not sticky**; 1,650px from the top |
| 1893 | `Buy more, pay less` ladder table (again) | the ladder appears twice |
| 2678 | tabs `Description · Specifications · Reviews` | not sticky; 2,600px down |
| 3196 | `Who can supply this` 22/600 | |
| 3697 | `Frequently bought together` rail, 14px titles, `Add` buttons | rail titles are 14/500 vs the benchmark's 11–13 |
| 5389 | end | Alibaba's detail is long too, but its buy bar never leaves the screen |

**Close it with** (this is the one page to rebuild rather than trim):

1. Delete the top padding (`pt-3` on phones, as `/browse` already does).
2. Page header: back · search pill with the product's name · cart. Drop the breadcrumb below `md`.
3. Gallery: full-width square (`390×390`), swipe, `1/4` counter bottom-right; thumbnails only from `md`.
4. Title 16/500 `#222`, two lines. Price **18/700** as a range across the ladder (`P873 – P1,144`), then `Min. order: 1 unit`, then the supplier line (`✓ Verified · Naledi Beauty Supplies · Gaborone`). That is the benchmark's card, expanded.
5. The ladder becomes **one 44px strip** (`1–4 P1,144 · 5–19 P1,044 · 20–49 P944 · 50+ P873`, the active rung bold) that opens the full table in a sheet. Variants as 32px chips.
6. Sticky tab strip `Overview | Details | Suppliers | Recommended` under the header from y≈500.
7. **Sticky bottom bar**, 56px above the tab bar's slot: `Quote` (outlined) · `Add to cart` (filled) sharing the width, with the line total in the outlined one's place once quantity > 1. This replaces the tab bar on this page, as Alibaba's enquiry bar does.
8. Related rails use `RailCard` (136×172).

### 3.5 Cart

Alibaba's cart is behind sign-in and **not observed**; the recommendation below is the phone-commerce norm, in the benchmark's density.

AfriDeal `/cart` with one line:

| y | element | note |
| --- | --- | --- |
| 81 | **blank** 112px (`pt-28`) | |
| 193 | `Your cart (1)` 36px | |
| 265 | line card, **482px** tall | a `flex-wrap` desktop row: 80px image · a **70px-wide** text column so the title wraps to **4 lines** and the price sits far right · `BWP 1,144.00 each` · stepper · `Remove` · the next-rung nudge in a **7-line** 85px-wide box |
| 780 | summary card: Subtotal · Delivery · Total | |
| 941 | `Checkout` 52px pill | **not sticky** |

**Close it with:** rows, not cards — 88px image left, title 13/500 two lines, variant 12px `#888`, price 14/700, a 28px stepper on the right, `Remove` as a swipe or a 12px link; the rung nudge as one 12px green line under the price (`Add 4 more → P1,044 each`). A **sticky foot**: `Total P1,144` left · `Checkout (1)` filled pill right.

### 3.6 Checkout

Blank 112px (`pt-28`) · `Confirm and pay` 30/600 · Delivery card (name, two fields) · Payment card (DPO Pay / other, radio cards) · Your order card · `Place order` 52px at **y=1,356, not sticky**; 2,870px tall. The cards themselves are fine on a phone. Close it with the page header, no top padding, 18/700 title, and a sticky foot `Total · Place order` — the same component as the cart's.

### 3.7 Sign in and create account

Alibaba, measured live today:

| screen | what is on it |
| --- | --- |
| **Welcome** | orange `rgb(204,61,0)` hero, 430px: logo, × top-right, 13px eyebrow `Global B2B sourcing with`, **20/700** white h1, 3D illustration. White foot: three **358×48 pills, 999px, 16/600** — `Continue with Google`, `Continue with Facebook` (white, 1px `#222`), `OR` 13px `#767676`, `Continue with email` (white, 1px `rgb(214,64,0)`, orange text). 12px gaps |
| **Sign in** | page header: ‹ · `Sign in` 18/600 · headset icon. Fields **350×48, 1px `#ddd`, 8px radius, 13px placeholder** (`Email address`, `Enter password` with an eye), 12px apart, starting at **y=72**. `Forgot password?` right-aligned, underlined. `Continue` **350×48 pill `rgb(214,64,0)` 16/600 — disabled at ~50% until valid**. `Sign in with a code` 13/600 underlined. `New to Alibaba.com? Create an account`. Google and Facebook as two 50%-width grey tiles |
| **Create account** | page header `Create account`; **one field** (`Email address`) at y=72; `Next` disabled; `Already have an account? Sign in`; Google · Apple · Facebook as three grey tiles. The rest of the profile is asked on later screens |

AfriDeal:

| screen | what is on it |
| --- | --- |
| `/login` | logo · `SIGN IN` eyebrow · **34/700** headline `The price is on the page already.` · a 6-line paragraph · a 3-stat strip · then the form card at **y=660** (Email, Password 48px fields, `Sign in` green 52px) · then eight demo-account cards (dev only). 1,957px |
| `/signup` | same shape: 34/700 headline, paragraph, a feature list, the form at **y=990** with **four fields** (name, email, password, confirm) and `Create account` at y=1,328. 1,629px |

| gap | note |
| --- | --- |
| the form is a screen and a half down | Alibaba's first field is at y=72 |
| four fields at once | Alibaba asks one, and disables the CTA until it is valid |
| no page header / back | the auth layout has no chrome at all |
| no welcome screen | the sign-in nudge and the `Cart` tab both land on a form; Alibaba lands on a branded choice screen first |
| green CTA | the storefront's primary is `#E67E22`; auth uses the console's forest green |

**Close it with:** a `Welcome` screen (brand hero on the storefront orange, 20/700 line, `Continue with email` + `Create an account` pills — social later if ever) that the nudge, the tab bar and every `callbackUrl` land on; then `Sign in` and `Create account` as page-header screens with one or two fields, disabled CTA until valid, 48px fields at 8px radius. Keep the headline copy for the desktop split layout only. The demo cards stay behind `NODE_ENV !== 'production'`.

### 3.8 Request a runner

Blank 112px · `Not listed? Send someone to find it.` 30/700 · paragraph · four explanatory steps · **`Tell us what you need` at y=1,132** · 8 inputs · `Send to our runners` at y=1,955. The RFQ landing (`/rfq`) already does this right: field on screen one, explanation *below*, details as step two. Make `/request-a-runner` the same shape — or make it the RFQ's step two only, since that is what `/rfq/details` already links to.

### 3.9 Suppliers directory

At parity. 136px rows, 111px image, 13.5/500 title, 17/700 price, `Min. order: 20 units`, `✓ Verified Motswedi Building Supplies · Francistown`, `98% fulfilment · Manufacturer`. Four and a half rows per screen. The only note: the page header should be the storefront header *without* the location row, and the `Verified only` chip could take the benchmark's text-and-bar style.

### 3.10 Orders

Blank 112px · `Your orders` 30/600 · a 3-line paragraph · order cards **282px** each: a 44px avatar · a **60px-wide meta column** in which `AFD-24820 · 24 Aug 2026 · 1 item · DPO Pay` wraps to **eleven lines** · status pill · total · `TRACK →`. The separator renders as **`Â·`** — the middle dot is double-encoded in `app/(store)/orders/page.tsx:112-113`.

Alibaba's order list is behind sign-in and *not observed*. Norm for the pattern: status tabs across the top (`All · To pay · To ship · Shipped · Done`), then rows — image left, `AFD-24820 · 24 Aug` 12px `#888`, title 13px, `1 item · P924.00` 14/700, status 12px in colour, one 28px action pill right. ~96px per order.

**Close it with:** the row above; fix the encoding; page header; no top padding; the paragraph goes.

### 3.11 Account

The tab bar's fifth tab is `Account`; it links to `/login`, or `/orders` when signed in. There is no account screen. Alibaba's *My Alibaba* is gated and *not observed*; the norm is a header card (avatar, name, `Verified buyer`), a 4-tile row (`Orders · Quotes · Requests · Saved`), then a list (Addresses, Payment, Help, Sign out). Small to build; `AccountPanels.tsx` already holds most of the pieces.

---

## 4. Global gaps

| system | Alibaba | AfriDeal | gap |
| --- | --- | --- | --- |
| **top padding** | — | `pt-28` / `pt-32` (112–128px) on cart, checkout, orders, order detail, product, request-a-runner, requests | one line each. `/browse` already did it (`pt-3 sm:pt-28`). The comment in `app/(store)/layout.tsx` still says the nav is fixed and detached; it is `sticky` and in flow |
| **page header** | back · title · icon on every inner screen | the full storefront header (81px) on every screen | one `PageHeader` component; use on categories, product, cart, checkout, orders, auth, RFQ, runner |
| **two design systems** | one | the storefront (Alibaba density: 12–16px, `#222`, hairlines, `#E67E22`) and the inner pages (30–34px display headlines, prose, monospace figures, 20px radii, forest-green pills — the console's look) | the inner pages are the desktop design wearing the storefront header. Re-cut them to the storefront's scale below `md`; the desktop layouts can stay from `lg` |
| **sticky action bar** | detail page (video); the norm on cart/checkout | none | one `StickyFoot` component: left figure, right pill, 56px, above the safe area |
| **primary button** | 48px pill, `rgb(214,64,0)` / `rgb(255,102,0)`, 16/600, disabled at 50% | storefront `#E67E22` pills; inner pages 52px forest-green pills | one primary on the storefront: `#E67E22`, 48px, 16/600, with a disabled state |
| **type on inner pages** | titles 18/700; body 12–14 | titles 28–34; body 15–16; prose | scale down below `md` |
| **corners** | 8 / 4 / 999 | storefront 8 / 4 / 9999; inner pages 10 / 20 | align inner pages |
| **feed after the last product** | nothing | `How it works` + footer | phones end at the feed |
| **motion** | push 200ms · instant tab swap · press wash · no list entrances | `PageTransition` 220ms push / instant tab / `.press` — to spec, verified in code (the pane cannot play it) | none |
| **rolling placeholder** | yes | yes | none |
| **defects seen** | — | hydration mismatch on `/`; `Â·` in orders; dev server writes an `.env.local` warning | fix first |

---

## 5. Roadmap to the same feeling

Ordered by how much of the gap each step closes per day of work. Sizes are working days for one engineer against this codebase.

### Phase 1 — a week: the storefront stops breaking at the product page

| # | work | closes | size |
| --- | --- | --- | --- |
| 1 | Remove `pt-28/32` below `md` on the seven pages; fix the layout comment | the blank band on every inner screen | 0.5 |
| 2 | `PageHeader` (back · title · icon) and use it on inner screens; storefront header only on home, browse, suppliers | 85px of chrome on every inner screen; the "same app" feeling | 1 |
| 3 | `StickyFoot` and place it on product (`Quote · Add to cart`), cart (`Total · Checkout`), checkout (`Total · Place order`) | the buy decision is always on screen | 1 |
| 4 | Home on phones: first floor is products; hero and badge strip after `LiveDeals`; `Choose how to buy` → a tool-floor tile; page ends at the feed; footer to a legal strip | first product at y≈270 | 1 |
| 5 | Fix the hydration mismatch on `/`; fix `Â·` | a clean first paint; a clean order list | 0.5 |
| 6 | Orders and cart as rows (the `SupplierDirectory` row, adapted) | the two most broken screens | 1.5 |

### Phase 2 — two weeks: the product page and auth are phone pages

| # | work | size |
| --- | --- | --- |
| 7 | Product detail re-cut (§3.4): square swipe gallery, 16px title, price range, ladder strip + sheet, variant chips, sticky tab strip, related rails | 4 |
| 8 | Auth: `Welcome` screen; `Sign in` and `Create account` as one-field page-header screens with disabled CTAs; demo cards dev-only | 2 |
| 9 | Checkout and request-a-runner in the storefront scale; the runner form's field on screen one | 1.5 |
| 10 | Account screen from `AccountPanels` | 1.5 |

### Phase 3 — as the catalogue grows

| # | work | size |
| --- | --- | --- |
| 11 | Search results as rows with the query pinned; one chip row; filter sheet | 2 |
| 12 | Categories: `For you`, inspiration feed, full-height rail; second level when the hair line gets its sub-types (research §2.1) | 2 + data |
| 13 | Trust micro-badges as marks (years on platform, fulfilment tier) once suppliers have history to show | 1 |

### What not to copy

Kept from `alibaba-1688-features.md` §1 so the roadmap does not drift: no `Chat now` (we are the seller, so the action is *Add to cart*); no seller-authored FAQ tab; no `Super` flag until there is a real programme behind it; no AI toggle; no app-install interstitial; no image search until there is an endpoint.

---

## 6. Method notes for the next pass

### Capturing the app itself, not the site

Three routes, best first. `adb` (platform-tools 36) and the Android emulator with Play Store system images are already installed on the product owner's machine (`%LOCALAPPDATA%\Android\Sdk`); `ffmpeg` is on the PATH.

| route | how | what it yields | cost |
| --- | --- | --- | --- |
| **A. An Android phone over USB** | Settings → Developer options → USB debugging; plug in; accept the RSA prompt. Then `adb exec-out screencap -p` for pixel-exact PNGs and `adb shell uiautomator dump` for the view hierarchy — every element's bounds, text and resource-id, the app's equivalent of the site's DOM. `adb shell wm density` converts px → dp → CSS px. The owner's app is already signed in, so cart, orders, My Alibaba, product detail and search are reachable with no CAPTCHA | exact figures for every screen | 10 min setup |
| **B. The emulator** | create an AVD from a `google_apis_playstore` image (Tiramisu / UpsideDownCake / VanillaIceCream are present), boot it, the owner signs into Google Play *themselves* and installs Alibaba.com; then drive it with `adb shell input tap/swipe` and measure as in A | exact figures; a fresh account with no history; content may geolocate differently | 30–45 min |
| **C. Screen recordings / screenshots** | the method used for the 2026-09-09 recordings; frames pulled with ffmpeg | ±3px estimates, no element bounds; PNG screenshots beat video | whatever the owner sends |

An iPhone has no `adb` equivalent on Windows; route C is the only one.

### Browser-pane notes

- Alibaba's phone layout is served only when the tab's **first** request is phone-sized. Open a fresh tab on another site, set 390×844, then navigate. One CAPTCHA page flips the tab to desktop for good.
- The `Cart` tab is the way into the auth screens without a search.
- The Browser pane's screenshots at 390px were legible at 2× today; measure with the DOM anyway — the pane sometimes paints a stale frame.
- The dev server started by the pane exited (code 0) three times in twenty minutes with no error in its log; restart it with `preview_start` and re-apply the viewport.
