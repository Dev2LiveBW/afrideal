# AfriDeal — working notes for Claude

## The UI benchmark is Alibaba

Standing instruction from the product owner (Tshego), 2026-09-11: the
customer storefront is measured against the **Alibaba buyer app on a phone**.
Same density, same patterns — boxes, category browsing, transitions, sign-up.
AfriDeal's colour, type and copy stay; the layout and density follow Alibaba.

**Before changing any storefront UI, read `docs/design/alibaba-benchmark.md`.**
It holds measured specs from the product owner's screen recordings and a
mapping from each Alibaba pattern to the AfriDeal component that implements
it. If the screen you are touching is listed in its §5 "Not yet observed",
ask for a recording rather than guessing.

**Measure live where you can.** The mobile site (`m.alibaba.com`) renders
the same layouts as the app and its DOM can be measured exactly in the
Browser pane at a 390px viewport — computed font sizes, colours, radii,
pitches. The benchmark's access map says which screens are reachable (home,
categories, RFQ landing) and which sit behind a slider CAPTCHA (search,
product detail, sign-in). **Never attempt to pass the CAPTCHA.** For gated
screens use the product owner's recordings: pull frames with ffmpeg, measure,
extend the file. A live figure beats a video estimate; when they disagree,
update the file and note the source.

`docs/research/alibaba-1688-features.md` explains where AfriDeal's model
deliberately diverges (it is the merchant of record; Alibaba is an
introduction service).

## Which working copy

This repo is checked out twice on the product owner's machine. **This one**
(`Tshego/v2/afrideal/afrideal`, tracking `origin/main`) is the live one.
`Tshego/afrideal` is a stale sibling on an old branch — do not work there.

## Verifying UI

- The dev server is `npm run dev` (`.claude/launch.json` → `afrideal`).
  Stop it before `next build` — a build wipes `.next` from under a running
  dev server and the next request 500s.
- In the browser pane, **reload after every viewport resize** before reading
  computed styles. Measuring straight after a resize has returned stale
  values repeatedly.
- The pane renders too small for screenshots to be legible. Verify with DOM
  measurements; ask the product owner for a screenshot when the question is
  how it *looks*.

## Storefront layout rules already agreed

- Badge and banner strips (hero badges, stats banner, info ribbon) stay on
  **one row** at every width — shrink type and padding, do not wrap.
- Sections that display artwork (categories, deals, listings) reflow
  normally: 1 → 2 → 4 columns.
- The two hero cards sit side by side at every width. Below `lg` each card
  ends in a **band** - a 16:9 row after the copy with the photograph in its
  bottom-right corner (bleeding to the card's edge) and the button in its
  bottom-left, over the photograph's foot. Both cards share the band, so the
  buttons sit on one line. The copy is never layered over a photograph; the
  band is what stops it. Do not go back to a free-floating image - that is
  how the runner ended up on the bullet list.
- "Request a runner" stays on one row at every width. Below `sm` the button
  drops its arrow and runs at 10px to fit the 320px band.
- One pricing explanation on the front page, the three "Choose how you want
  to buy" cards. No prose explainer, no tier badge — the product owner
  removed both.
