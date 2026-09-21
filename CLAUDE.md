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
pitches. It serves the phone layout only if the tab's *first* request is
already phone-sized: open a fresh tab on some other site, set 390px, then
navigate (the access map has the detail). The pane does not run
`requestAnimationFrame` while this session drives it, so framer-motion
animations stall there - verify motion from the CSS and props, not by
watching. The benchmark's access map says which screens are reachable (home,
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

## Where the catalogue lives

Since 2026-09-16 the **Sanity Studio** in `Tshego/studio/` (project
`bly84glb`, dataset `production`) is the product owner's admin for the
catalogue: products and their images, categories, brands, suppliers and
supplier offers. With `CATALOGUE_SOURCE=sanity` in `.env.local` the app reads
those six collections from Sanity through `lib/sanity/catalogue.ts`; every
other collection (orders, payables, inventory, users, runners…) is still the
JSON store. `lib/db.ts` routes by collection name, so pages and route
handlers do not know which store they hit.

- Studio edits are **drafts until published**; the app reads the published
  perspective only.
- The app's own catalogue writes (a supplier's verification status) need
  `SANITY_API_WRITE_TOKEN`; without it they fail with a clear error.
- `npm run verify` targets the JSON store (`CATALOGUE_SOURCE=json`, the
  default) - reseed with `npm run seed`. In Sanity mode it passes except the
  supplier-approval checks when no write token is set.
- Studio schema lives in `Tshego/studio/schemaTypes/`; the seed import is
  `node scripts/seed-from-app.mjs` there (see the file header).

## Where everything else lives

Since 2026-09-20 the transactional store is **Neon Postgres** (`DB_DRIVER=postgres`
in `.env.local`, connection string in `DATABASE_URL`). Every collection Sanity
does not own - orders, order items, supplier orders, payables, settlements,
inventory, users, runners, RFQs, audit log and the rest - is a document table
in the `afrideal` schema: `{ id, seq, data jsonb }`, one table per collection,
`lib/postgres/`. `lib/db.ts` routes by collection name, so pages and route
handlers still call `readAll / findMany / insert / update / mutate` and do not
know which store answered. `DB_DRIVER=json` puts everything back on
`data/*.json` - that is the rollback, not a second code path to maintain.

- `readAll` (and everything built on it) is memoised for the life of one
  request via React `cache()`, so a layout, page and its components share one
  read per collection; a `mutate()` drops the entry so the next read in the
  same request sees the write. Never across requests. Callers get their own
  copy of the array. `mutate()` itself always reads fresh under its lock.
- Ids: `nextId()` / `nextIds(collection, prefix, count)` still scan for the
  highest existing number, but on Postgres they also reserve the block through
  `afrideal.id_counters` in one atomic statement, so two instances cannot both
  mint `o016`. `insert()` refuses an id that already exists rather than
  upserting over it. Checkout reserves its `oi` / `sup` / `pay` series as
  blocks; the order `reference` is derived from the id (`o001` = `AFD-24810`).
  `npm run db:load` (and so `npm run seed`) resets the counters to the data.
- Reads go over Neon's HTTP driver; `mutate()` runs in a WebSocket
  transaction that first takes `pg_advisory_xact_lock` on the collection, so
  the one-writer-per-collection rule holds across server instances. Both
  retry once or twice on a dropped connection.
- Schema changes: edit `lib/postgres/schema.ts`, `npm run db:generate`,
  commit the file it writes under `drizzle/`, `npm run db:migrate`.
- `npm run seed` regenerates `data/` **and** reloads Postgres from it when
  `DB_DRIVER=postgres`. `npm run db:load` does only the second half.
- The Neon project is **afrideal** (`noisy-sky-21749196`, org
  `org-round-wind-61711243`, region `aws-us-east-2`), linked from this
  directory with the Neon CLI (`.neon`, gitignored). `neon link` and
  `neon deploy` **rewrite `DATABASE_URL` and nine other variables in
  `.env.local`** - do not hand-edit those lines; re-run `neon link` instead.
  `neon.ts` declares the project's services (Neon Auth, an `uploads` bucket,
  a `hello.ts` function); the app uses none of them yet - Clerk is auth.
  Still to do before staging: transfer the project to a Company-owned org
  (plan §5 row 4).
- From Botswana a TCP handshake to us-east-2 takes longer than the 250 ms
  Node allows per address when a host has IPv6 and IPv4 records, so Node
  reports `ETIMEDOUT` while `curl` succeeds. `lib/postgres/network.mjs`
  raises that budget. `instrumentation.ts` calls it when the server boots
  (Clerk's API is on the same side of the line), and so do `db-load.mjs`,
  `drizzle.config.ts`, `verify`, `audit` and the Clerk sync script. Any new
  script that opens a connection must too.
- `npm run verify` and `npm run audit` both take the server URL from
  `VERIFY_BASE` / `AUDIT_BASE` (default `http://localhost:3000`). The full
  Postgres run is `CATALOGUE_SOURCE=json DB_DRIVER=postgres`, so all 25
  collections hit Neon; both were green on 2026-09-20 against the afrideal
  project (110/110, 41/41).
- From this machine a round trip to Neon (Ohio) is ~275 ms, and a page can
  do a dozen reads, so local pages feel slow. On Vercel set the function
  region to `cle1` or `iad1` and it is single-digit ms.

## Who signs people in

Clerk, since 2026-09-17 (`@clerk/nextjs` 6.x - the 7.x line needs Next 15).
`lib/auth.ts` still returns the old session shape, so pages and route
handlers read `session.user.role` etc. unchanged. Roles come from the Clerk
user's `publicMetadata`, written only by `node scripts/sync-users-to-clerk.mjs`
from the Sanity people directory - never by hand in the Clerk dashboard.

- Sign-in page is `/sign-in` (Clerk's form plus the eight demo cards);
  `/login` and `/signup` redirect there. `/after-sign-in` lands each role.
- `npm run verify` mints Clerk sessions with `CLERK_SECRET_KEY` from
  `.env.local` and sends bearer tokens; it needs the demo accounts to exist
  (run the sync script once).
- Middleware role gating needs the dashboard's session token to include
  `{"metadata": "{{user.public_metadata}}"}`; without it the portal layouts
  gate one hop later. Do not add `auth.protect()` to `/api` routes - they
  answer JSON 401/403 through `guard()`.

## Verifying UI

- The dev server is `npm run dev` (`.claude/launch.json` → `afrideal`).
  Stop it before `next build` — a build wipes `.next` from under a running
  dev server and the next request 500s.
- In the browser pane, **reload after every viewport resize** before reading
  computed styles. Measuring straight after a resize has returned stale
  values repeatedly.
- A tab left open on `/` in the pane while other routes compile makes Next
  dev log bursts of `Cannot read properties of null (reading 'useContext')`
  with `page: '/'` - HMR refetches of that tab whose abandoned streams fire
  after teardown. Dev-only; real requests are unaffected.
- The pane renders too small for screenshots to be legible. Verify with DOM
  measurements; ask the product owner for a screenshot when the question is
  how it *looks*.

## Storefront layout rules already agreed

- **The home page is the benchmark's grid** (2026-09-11, "copy the homepage
  grid layout from Alibaba as well as transitions, pages and links, even
  effects"): header → ways-to-buy tabs → trade chips → tool floor → floors
  on white → the 2-column feed. Specs in the benchmark §3a, effects in §4b.
  New home-page content goes in as a **floor** (`components/storefront/home/
  Floor.tsx`: linked header + rail of 136px cards) or as feed cells - not as
  a new kind of section.
- Motion follows §4b: press states (`.press`, `.press-soft`) on everything
  tappable, a push between screens on phones and none on wide screens, no
  entrance animation on any list or grid.
- Badge and banner strips (stats banner, info ribbon) stay on **one row** at
  every width - shrink type and padding, do not wrap.
- Sections that display artwork reflow normally on their own pages
  (1 → 2 → 4 columns); on the home page they are rails.
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
