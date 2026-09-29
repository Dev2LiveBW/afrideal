# Alibaba buyer app — capture checklist (iPhone)

Drop screenshots and recordings from the **Alibaba.com app** in this folder. They
are the source for `../../alibaba-benchmark.md` and `../../alibaba-gap-analysis.md`,
which are currently measured against the mobile *site* and need re-verifying against
the app.

## Why screenshots, not only video

An iPhone screenshot is a pixel-exact PNG at 3× (an iPhone 15 gives 1179×2556 for a
393×852-point screen). Measured in Python that is ±⅓ of a CSS pixel — better than
the ±3px a video frame gives. Use **screenshots for layout** and **recordings for
motion** (transitions, sheets, the sliding chip bar).

## How to take them

- **Screenshot:** side button + volume up. Do not crop or annotate; the status bar is
  fine, it is trimmed in measurement.
- **Recording:** Control Centre → Screen Recording. Keep it under a minute per
  screen; one screen per recording is easier to measure than one long tour.
- **Send:** AirDrop is not available to this PC, so email the files to yourself or
  use iCloud Drive / WhatsApp *as a document* (WhatsApp *photo* re-compresses; *document*
  does not). Save them here with the names below.
- Tell me the **phone model** (Settings → General → About → *Model Name*) once; the
  screenshot size also identifies it.

## The screens — in the order a buyer meets them

Name the file `NN-screen.png`; add `-2`, `-3` for further scrolls of the same screen.
The starred ones are the screens the site gates and the earlier recordings did not
cover — they are the ones the gap analysis is waiting on.

| # | file | what to capture |
| --- | --- | --- |
| 01 | `01-home.png` | top of the home tab, before any scroll |
| 02 | `02-home-2.png` … | two or three further scrolls until the feed cards are on screen |
| 03 | `03-categories.png` | the Categories tab, first trade selected |
| 04 | `04-categories-beauty.png` | after tapping *Beauty* (or *Hair*) in the rail |
| 05 | `05-search-typing.png` | the search screen with `hair bundles` typed, suggestions showing |
| 06 | `06-search-results.png` ★ | results for `hair bundles`, top |
| 07 | `07-search-results-2.png` ★ | one scroll down |
| 08 | `08-search-filters.png` ★ | after tapping the filter icon |
| 09 | `09-product.png` ★ | a **physical** product (a hair bundle), top |
| 10 | `10-product-2.png`, `-3`, `-4` ★ | scrolls: price tiers, variants, supplier block, details, recommended |
| 11 | `11-product-variants.png` ★ | after tapping *Select variants* / a colour or length |
| 12 | `12-product-quantity.png` ★ | the quantity / start-order sheet |
| 13 | `13-cart.png` ★ | the Cart tab with at least one item |
| 14 | `14-checkout.png` ★ | after *Proceed to checkout* — address / payment step; **stop before paying** |
| 15 | `15-my-alibaba.png` ★ | the My Alibaba tab, top |
| 16 | `16-orders.png` ★ | the order list |
| 17 | `17-order-detail.png` ★ | one order opened |
| 18 | `18-messenger.png` | the Messenger tab |
| 19 | `19-signed-out-home.png` ★ | home after signing out (the nudge banner) |
| 20 | `20-sign-in.png` ★ | the sign-in screen |
| 21 | `21-create-account.png` ★ | the create-account screen — **do not submit** |

Recordings, one each: `r1-home-to-product.mp4` (tap a card, wait for it to land, go
back), `r2-tab-bar.mp4` (tap through the five tabs), `r3-categories-rail.mp4` (tap
three rail items), `r4-product-sheets.mp4` (open the variant and quantity sheets and
close them), `r5-search.mp4` (tap the search field, type, submit).

## What happens next

Each PNG is measured in Python (element bounds, font heights, colours, radii) and the
figures replace the site's in the benchmark, marked *app*. The gap analysis is then
re-scored against the app, and its roadmap adjusted where the app differs from the
site.
