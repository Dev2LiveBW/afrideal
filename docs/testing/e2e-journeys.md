# AfriDeal user journeys: end to end test cases

Drafted 2026-10-05. This file is the one source for three things:

1. **The Playwright suite.** Every journey with an `E2E` mark becomes one spec file under `e2e/`, named after its ID (`e2e/b02-checkout.spec.ts`).
2. **The client walkthrough.** Tshego (or anyone on the client side) can follow the steps by hand, in a browser, and tick each expected result. No technical knowledge needed.
3. **The demo videos.** Every journey with a `Video` mark gets one short recording that follows the same steps, in the same order.

So the three never drift apart: change a journey here first, then the spec, then the video.

## Running the suite

```bash
npm run e2e
```

Each run makes a fresh Neon branch called `e2e-<timestamp>`, loads `data/*.json` into it, starts its own dev server on port 3300 against that branch, signs the eight demo people in through their cards, runs every journey, and deletes the branch. The live data and Sanity are never written to. It can run while your own `npm run dev` is up. A full run takes 20 to 40 minutes, most of it the first compile of each route.

- One folder or one journey: `npm run e2e -- e2e/flows` or `npm run e2e -- --grep B02`.
- Only the P1 journeys: `npm run e2e -- --grep @p1`.
- Keep the branch to look at the data afterwards: `npm run e2e -- --keep` (the next run deletes it).
- The last run's report, with a video and a trace of every failure: `npm run e2e:report`.
- Demo recordings: `npm run e2e:demo` records every journey marked Video (slowed down, a caption bar along the top of each screen naming the person, the journey and the step), then `npm run e2e:videos` turns them into `demo-videos/<journey>-<size>[-<person>].mp4` at their recorded pace. Pass a folder or `--grep` to record only some (`npm run e2e:demo -- --grep D01`). Captions come from each journey's title and its `caption()` calls (`e2e/support/fixtures.ts`).

The spec for each journey lives in `e2e/` (storefront, supplier, runner, console, access, flows). Bugs the suite found are kept as tests marked `test.fail()` in `e2e/access/known-issues.spec.ts`: they pass while the bug is there and report "unexpectedly passed" once it is fixed, which is the cue to delete the marker.

## Before you start

**Accounts.** Sign in at `/sign-in` and use the demo cards ("Or sign in as"). One click signs in any of the eight seeded people. You never need to type a password.

| Person | Role | Use them for |
|---|---|---|
| Thabo Modise | Customer | Buying, tracking, disputes |
| Kefilwe Dithebe | Customer | A second buyer, for privacy checks |
| Naledi Beauty Supplies | Supplier | The main supplier |
| GlowUp Distributors | Supplier | A rival supplier, for privacy checks |
| Kagiso Sithole | Runner | Deliveries and sourcing requests |
| AfriDeal Admin | Super admin | Everything in the team console |
| Keabetswe Molapo | Operations admin | Day to day console work |
| Finance Admin | Finance admin | Supplier payables and analytics |

**Fresh data.** Journeys change real records (orders, invoices, requests). Start every full run from a known state; see "Decisions needed" at the end for how.

**Phone and desktop.** The storefront is built to match the Alibaba app on a phone, so storefront journeys run twice: at phone width (390 px) and at desktop width (1440 px). The team console runs at desktop width. The runner portal runs at phone width.

**Payment is simulated today.** Checkout lets you pick DPO Pay, Orange Money or PayGate, but no money moves and no gateway page opens. The order is created straight away. Journeys say so where it matters. Real card payment is scope feature 4.

**Priority.** P1 must pass before any demo to the client. P2 should pass before a release. P3 is a nice to have.

## Journey map

| ID | Journey | Who | Priority | E2E | Video |
|---|---|---|---|---|---|
| **A** | **Browsing (no account)** | | | | |
| A01 | Home page loads and every floor links somewhere | Visitor | P1 | yes | yes |
| A02 | Browse by category | Visitor | P1 | yes | yes |
| A03 | Find a product and read its detail page | Visitor | P1 | yes | yes |
| A04 | See the price drop as quantity grows (tier ladder) | Visitor | P1 | yes | yes |
| A05 | Browse suppliers | Visitor | P2 | yes | no |
| A06 | Read "How it works" | Visitor | P3 | yes | no |
| **B** | **Buying and tracking** | | | | |
| B01 | Sign in as a customer | Customer | P1 | yes | yes |
| B02 | Add to cart, check out, get an order reference | Customer | P1 | yes | yes |
| B03 | Order from two suppliers in one checkout | Customer | P2 | yes | no |
| B04 | Track an order on its timeline | Customer | P1 | yes | yes |
| B05 | Confirm an order arrived | Customer | P1 | yes | yes |
| B06 | Open a dispute on an order | Customer | P2 | yes | yes |
| B07 | A very large quantity is sent to a quotation instead | Customer | P2 | yes | no |
| B08 | An empty cart cannot be checked out | Customer | P3 | yes | no |
| **C** | **Request for quotation (RFQ)** | | | | |
| C01 | Buyer sends an RFQ | Customer | P1 | yes | yes |
| C02 | Invited supplier sends a quote | Supplier | P1 | no screen yet | no |
| C03 | Team picks the winning quote | Operations | P1 | no screen yet | no |
| C04 | Buyer approves the chosen quote | Customer | P2 | no screen yet | no |
| **D** | **Request a runner (personal sourcing)** | | | | |
| D01 | Buyer describes an item and requests a runner | Customer | P1 | yes | yes |
| D02 | Runner takes the request and goes looking | Runner | P1 | yes | yes |
| D03 | Runner sends back a price | Runner | P1 | yes | yes |
| D04 | Buyer approves the price | Customer | P1 | yes | yes |
| D05 | Runner delivers, buyer confirms | Runner, Customer | P1 | yes | yes |
| **E** | **Supplier portal** | | | | |
| E01 | Supplier dashboard shows their own numbers | Supplier | P1 | yes | yes |
| E02 | Confirm, prepare, and mark an order ready for collection | Supplier | P1 | yes | yes |
| E03 | Submit a product for review | Supplier | P2 | yes | yes |
| E04 | Read earnings and settlements | Supplier | P2 | yes | yes |
| **F** | **Runner deliveries** | | | | |
| F01 | Go online and offline | Runner | P1 | yes | yes |
| F02 | Accept a job, pick up, deliver | Runner | P1 | yes | yes |
| F03 | Read earnings | Runner | P3 | yes | no |
| **G** | **Team console** | | | | |
| G01 | Dashboard and orders list | Operations | P1 | yes | yes |
| G02 | Open an order and add a note | Operations | P2 | yes | yes |
| G03 | Approve a pending supplier, document by document | Operations | P1 | yes | yes |
| G04 | Reject or suspend a supplier | Operations | P2 | yes | no |
| G05 | Work a dispute to a resolution | Operations | P1 | yes | yes |
| G06 | Settle supplier invoices | Finance | P1 | yes | yes |
| G07 | Read analytics and the APR revenue share | Finance | P2 | yes | yes |
| G08 | Change a pricing rule and use the calculator | Super admin | P2 | yes | yes |
| G09 | Change platform settings | Super admin | P3 | yes | no |
| G10 | Runner roster | Operations | P3 | yes | no |
| **H** | **Who can see what** | | | | |
| H01 | Signed out visitors are sent to sign in | Visitor | P1 | yes | no |
| H02 | Each role lands on its own home after sign in | All | P1 | yes | yes |
| H03 | A customer cannot open the team console | Customer | P1 | yes | no |
| H04 | Finance sees only payables and analytics | Finance | P1 | yes | no |
| H05 | Operations cannot open settings | Operations | P1 | yes | no |
| H06 | One supplier never sees another's orders or quotes | Supplier | P1 | yes | no |
| H07 | One customer never sees another's orders | Customer | P1 | yes | no |
| H08 | Supplier cost never reaches the storefront | Visitor | P1 | yes | no |
| **Z** | **The golden thread** | | | | |
| Z01 | One order, from cart to supplier paid, across five people | All | P1 | yes | yes |

That is 49 journeys. 46 have a screen to test (C02 to C04 do not yet, see Findings) and 30 get a demo video (Z01 is the long one, the rest run 1 to 3 minutes).

---

## A. Browsing (no account)

### A01 Home page loads and every floor links somewhere

**Start:** signed out, `/`.

1. Open the home page.
2. Look at, in order: the header, the "ways to buy" tabs, the trade chips, the tool floor (Request a quote, Request a runner), the floors, and the two column product feed.
3. Tap the header of each floor.
4. Tap one card in each floor.

**Expect:**
- The page shows in that order, with no empty floor and no broken image.
- Every floor header and every card opens a real page (no 404, no error screen).
- On a phone, the hero cards sit side by side and "Request a runner" stays on one row.
- Every tappable thing visibly reacts when pressed.

### A02 Browse by category

**Start:** signed out, `/categories`.

1. Pick a top level category.
2. Pick a sub category.
3. Open one product from the results.

**Expect:**
- The list narrows to that category; the count matches what is shown.
- On a phone, the category sheet opens, the focus moves into it, and it can be closed.
- The product opened belongs to the category chosen.

### A03 Find a product and read its detail page

**Start:** signed out, `/browse`.

1. Open any product.
2. Read the photos, the price, the supplier name, and the tier table.

**Expect:**
- One landed price in Pula (BWP), the price the buyer actually pays to AfriDeal.
- The supplier's own cost is not shown anywhere on the page (see H08).
- "Add to cart" is visible without scrolling on a phone.

### A04 See the price drop as quantity grows

**Start:** signed out, product `p001` detail page.

1. Set quantity to 1, note the unit price.
2. Set it to 5, then 20, then 50.
3. Set it to 100.

**Expect:**
- 1 is the retail price. 5 is cheaper (bulk). 20 is cheaper again (wholesale). 50 is cheapest (wholesale plus).
- 19 costs the same per unit as 5; 49 the same as 20 (the step happens exactly at 5, 20 and 50).
- 100 does not let you add to cart; it offers a quotation instead.

### A05 Browse suppliers

**Start:** signed out, `/suppliers`.

1. Scroll the list. Open one supplier.

**Expect:** only verified suppliers are listed; suspended or pending ones never appear.

### A06 Read "How it works"

**Start:** signed out, `/how-it-works`. **Expect:** the page loads and every link on it works.

---

## B. Buying and tracking

### B01 Sign in as a customer

**Start:** signed out, `/sign-in`.

1. Tap the Thabo Modise card.

**Expect:**
- You land on the storefront, signed in as Thabo (his initials show in the header).
- Going to `/login` redirects to `/sign-in`, and `/signup` to `/sign-up`.

### B02 Add to cart, check out, get an order reference

**Start:** signed in as Thabo.

1. Open a product, set quantity 2, tap "Add to cart".
2. Open the cart. Check the line and the total.
3. Tap through to checkout.
4. Enter a delivery address (for example "Plot 5412, Extension 12", "Gaborone").
5. Choose a payment method: bank transfer (until a card gateway is live it is the only one offered; spec 0003).
6. Place the order.

**Expect:**
- The cart total equals quantity times the unit price.
- At checkout: total equals subtotal plus delivery fee.
- After placing: "Waiting for your payment", a reference like `AFD-24851`, and the bank transfer box asking Thabo to quote that reference. No supplier is asked to prepare anything until the money arrives.
- The order appears at the top of `/orders`.
- The cart is empty afterwards.
- Finance marking the transfer paid moves it on (Z01, step 2).

### B03 Order from two suppliers in one checkout

**Start:** signed in as Kefilwe.

1. Add one product carried by Naledi and one carried by GlowUp.
2. Check out.

**Expect:**
- The buyer sees one order with two lines, one reference.
- Behind the scenes it splits: Naledi sees only her line, GlowUp sees only theirs (check by signing in as each, see E02).

### B04 Track an order on its timeline

**Start:** signed in as Thabo, `/orders`.

1. Open an order that is in transit.

**Expect:** the timeline shows each step done so far with a date, the current step highlighted, and the next steps still to come.

### B05 Confirm an order arrived

**Start:** signed in as Thabo, an order that has been delivered by the runner (Z01 creates one).

1. Open the order. Tap "Confirm delivery". Tap "Yes, it arrived" in the dialog.

**Expect:** the order moves to Delivered; the confirm button disappears; the timeline gains a final step.

### B06 Open a dispute on an order

**Start:** signed in as Thabo, an order eligible for a dispute.

1. Open the order. Tap "Report a problem". Describe it, then tap "Report the problem".

**Expect:**
- The order shows Disputed.
- The dispute appears in the team console's dispute queue (G05) with the buyer's words.

### B07 A very large quantity goes to a quotation

**Start:** signed in as Thabo, product `p001`.

1. Set quantity 100.

**Expect:** the cart button turns into a greyed out "Quotation required", and "Request a quotation" opens the quotation dialog with 100 filled in (C01).

### B08 An empty cart cannot be checked out

**Start:** signed in, empty cart, go to `/checkout`.

**Expect:** a "There is nothing to check out" message and a way back to shopping. No order is created.

---

## C. Request for quotation (RFQ)

### C01 Buyer sends an RFQ

**Start:** signed in as Thabo, the product page for `p001`.

1. Set the quantity to 150 (or tap "Request a quotation" at any quantity).
2. In the "Request a quotation" dialog, check the quantity, fill in the delivery location, tap "Send request".

**Expect:** "Quotation requested" with a reference, and a promise of a landed price within two working days.

Note: the `/rfq` page's "Write request details" leads to the runner request form (D01), not to this dialog. Worth deciding whether that is what the page should do.

### C02 to C04 Supplier quotes, team picks, buyer approves: no screen yet

Checked 2026-10-05. The API does all three (`npm run verify` section 15 proves it), but no screen does:

- **C02.** The supplier "Quote inbox" (`/supplier/quotes`) lists orders awaiting confirmation plus sample "Direct enquiry" rows. Sending a quote on a sample row only shows "Quote captured for this preview. Full RFQ persistence lands in Phase 2." The RFQs buyers send in C01 do not appear there.
- **C03.** The team console has no RFQ screen (`/admin/sourcing` is the runner request overview).
- **C04.** The buyer has no screen listing their RFQs or the quote chosen for them.

When these screens land, write their journeys here, then the specs.

---

## D. Request a runner (personal sourcing)

Run D01 to D05 in order; each picks up the request the last one left.

### D01 Buyer requests a runner

**Start:** signed in as Thabo, `/request-a-runner`.

1. Describe the item (what, where it might be found, a budget). Send.

**Expect:** the request shows on `/requests` as Requested, with no price yet ("You see the price first").

### D02 Runner takes the request and goes looking

**Start:** signed in as Kagiso (phone width), `/runner/sourcing`.

1. Find Thabo's request in the pool. Accept it.
2. Mark yourself as out looking.

**Expect:** the request now carries Kagiso's name; Thabo sees it move to Sourcing.

### D03 Runner sends back a price

1. As Kagiso, enter the price of the goods. Send the quote.

**Expect:**
- The buyer sees goods, a sourcing fee of 12 percent of the goods, and a total of the two.
- Sending without a price is refused with a clear message.

### D04 Buyer approves the price

1. As Thabo, on `/requests`, tap approve, confirm "Approve this purchase?".

**Expect:** status moves to Approved. Approving before a price exists is impossible (the button is not there).

### D05 Runner delivers, buyer confirms

1. As Kagiso, mark the request as on the way.
2. As Thabo, confirm "Confirm this arrived?".

**Expect:** status ends at Confirmed; it cannot be reopened afterwards.

---

## E. Supplier portal

### E01 Supplier dashboard shows their own numbers

**Start:** sign in as Naledi. **Expect:** you land on `/supplier/dashboard`; the orders waiting, earnings and reliability shown are Naledi's own (92 out of 100 reliability).

### E02 Confirm, prepare, mark ready

**Start:** signed in as Naledi, `/supplier/orders`, an order awaiting confirmation (B02 makes one).

1. Tap "Confirm order". 2. Tap "Start preparing". 3. Tap "Mark ready for collection".

**Expect:** after each tap a message "Order moved to …" and the status steps through Confirmed, Preparing, Ready for collection. The buyer's own order shows Processing.

### E03 Submit a product for review

**Start:** signed in as Naledi, `/supplier/products`.

1. Add a product (name, category, cost, stock). Tap "Submit for review".

**Expect:** it appears with status Pending approval and does not appear on the storefront until approved.

### E04 Read earnings and settlements

**Start:** signed in as Naledi, `/supplier/earnings`. **Expect:** pending and settled invoices are listed separately and the totals add up.

---

## F. Runner deliveries

### F01 Go online and offline

**Start:** signed in as Kagiso (phone width), `/runner/dashboard`.

1. Switch the toggle off, then on.

**Expect:** "Accepting job alerts nearby" shows only while online; the state survives a page reload.

### F02 Deliver a job

**Start:** signed in as Kagiso, `/runner/jobs`. He has two seeded jobs on the way: Naledi to Thabo (AFD-24814) and Motswedi to Kefilwe (AFD-24815).

1. On the job to Kefilwe, tap "Confirm delivered".

**Expect:** "Delivery confirmed - nice work"; the job leaves his list; Kefilwe can now confirm the order arrived (B05).

A fresh job (accept from the alert or the list, "Mark picked up", "Start delivery") is covered by Z01, step 3.

### F03 Read earnings

**Start:** signed in as Kagiso, `/runner/earnings`. **Expect:** the job from F02 appears with its fee.

---

## G. Team console

### G01 Dashboard and orders list

**Start:** sign in as Keabetswe. **Expect:** lands on `/admin/dashboard`; `/admin/orders` lists orders, filters by status, and the newest order from B02 is there.

### G02 Open an order and add a note

1. Open any order. Read lines, supplier split, runner, timeline. Type in "Internal notes" and tap "Save note".

**Expect:** "Internal note saved", and the note is still in the box after a reload. (It is one note per order, edited in place, with no author or time; a running log with names would be a feature request.)

### G03 Approve a pending supplier, document by document

**Start:** signed in as Keabetswe, `/admin/suppliers`, a supplier in Pending.

1. Open the supplier. Approve each document. Tap "Approve supplier". Confirm.

**Expect:** the status becomes Verified and stays Verified after reload; the supplier now appears on `/suppliers` (A05).
**Note:** with the catalogue in Sanity this needs `SANITY_API_WRITE_TOKEN`; without it you get a clear error, not a silent failure.

### G04 Reject or suspend a supplier

1. Reject a pending supplier's application; suspend a verified one.

**Expect:** both statuses stick; a suspended supplier disappears from the storefront and from order routing.

### G05 Work a dispute to a resolution

**Start:** signed in as Keabetswe, `/admin/disputes`, the dispute from B06.

1. Tap "Mark under review". 2. Tap "Resolve dispute", pick in favour of the customer or the supplier, write a reason.

**Expect:** the dispute moves Open, Under review, Resolved; the buyer's order shows the outcome.

### G06 Settle supplier invoices

**Start:** sign in as Finance Admin, `/admin/payables`.

1. Tick one or more pending invoices. Tap "Settle invoices". Confirm.

**Expect:** they move to Settled; "Settled MTD" grows by their total; Naledi sees them as settled in E04.

### G07 Read analytics and the APR revenue share

**Start:** signed in as Finance Admin, `/admin/analytics` (Finance lands here).

**Expect:** a 30 day trend, period and lifetime GMV shown separately, the APR share at 5 percent with its exclusions listed.

### G08 Change a pricing rule and use the calculator

**Start:** signed in as AfriDeal Admin, `/admin/pricing`.

1. Run the calculator on a supplier cost. 2. Edit one rule, save. 3. Put it back.

**Expect:** the calculator shows cost, markup and price that add up; a negative cost is refused; a saved rule changes new prices on the storefront.

### G09 Change platform settings

**Start:** AfriDeal Admin, `/admin/settings`. **Expect:** a change saves and survives reload. Put it back afterwards.

### G10 Runner roster

**Start:** Keabetswe, `/admin/runners`. **Expect:** Kagiso is listed with online status matching F01.

---

## H. Who can see what

These have no video: they are safety checks, not things to show off.

| ID | Do this | Expect |
|---|---|---|
| H01 | Signed out, open `/orders`, `/supplier/dashboard`, `/runner/jobs`, `/admin/dashboard` | Each sends you to `/sign-in`, then back to the page after signing in |
| H02 | Sign in as each of the eight demo cards | Customer lands on the storefront, supplier on `/supplier/dashboard`, runner on `/runner/dashboard`, super admin and operations on `/admin/dashboard`, finance on `/admin/analytics` |
| H03 | As Thabo, open `/admin/dashboard`, `/supplier/dashboard`, `/runner/jobs` | Refused or redirected every time; no team data shows |
| H04 | As Finance, open `/admin/orders`, `/admin/suppliers`, `/admin/settings` | Refused; only analytics and payables open |
| H05 | As Keabetswe, open `/admin/settings` | Refused |
| H06 | As GlowUp, look at `/supplier/orders` and `/supplier/quotes` | Only GlowUp's own; nothing of Naledi's, not even by typing an ID in the address bar |
| H07 | As Kefilwe, open one of Thabo's order IDs directly | Not found or refused |
| H08 | Signed out, open several product pages and view the page source | No supplier cost anywhere in the page or its data |

---

## Z01 The golden thread

One order, start to finish, five people. This is the demo that shows the whole system. Run it after a fresh reset.

Runs end to end since 2026-10-06 (Findings, 1). Kagiso's job pays BWP 45.00: every delivery pays the full delivery fee.

| Step | Who | Does | System shows |
|---|---|---|---|
| 1 | Thabo | Buys 2 of a Naledi product by bank transfer (B02) | Order `AFD-…`, Waiting for your payment |
| 2 | Finance | Payables, "Waiting for payment", Mark paid with the bank reference | Thabo's order: Payment confirmed; Naledi is asked to confirm |
| 3 | Naledi | Confirms, prepares, marks ready (E02) | Thabo's order: Processing |
| 4 | Kagiso | Accepts the job, picks up, delivers (F02) | Thabo's order: In transit, then delivered |
| 5 | Thabo | Confirms arrival (B05) | Order: Delivered |
| 6 | Keabetswe | Opens the order in the console (G02) | Full timeline, supplier and runner named |
| 7 | Finance | Opens Payables, All | Naledi's invoice already Settled: Thabo's confirmation in step 5 released it |
| 8 | Naledi | Opens Orders | The order shows Delivered and her invoice Settled |

**Expect at the end:** the amounts agree everywhere: what Thabo paid equals subtotal plus delivery; Naledi's invoice equals her line; the console order, the buyer's order and the supplier's invoice all carry the same reference.

---

## Not covered yet (waiting on planned features)

These have no journeys until they are built; add them here when they land.

- Real card payment and failed payments (scope 3 and 4)
- Pausing checkout, refunds, reconciliation (14, 15); mark as paid is in Z01 step 2
- Customs and duty in the price; collection point delivery (9, 10)
- Order emails and SMS (11, 12)
- A chosen quote becoming an order (24, see C04)
- Supplier and runner self sign up (27, 28); team user management (30)
- Setswana, legal pages, cookie notice (17, 19)

## Findings (2026-10-05)

What the first runs turned up. Bugs are kept as tests marked `test.fail()` (see "Running the suite").

1. **Fixed 2026-10-06: a new order never reached a runner.** Marking an order "Ready for collection" only sent a notification; nothing created a shipment, so no runner job appeared and every runner job came from the seed. Now `lib/shipments.ts` opens the job when a supplier marks their part ready (`openJobForLeg`), and marks the part collected and the order in transit when the runner picks it up (`markCollected`). Each delivery has its own fee: every runner job pays the full delivery fee, so an order split across two suppliers pays two jobs of BWP 45 (product owner's decision, 2026-10-07, replacing the first rule that split one fee across the pickups). Distance is not measured yet and the runner screens hide it. Test: Z01, end to end.
2. **Fixed 2026-10-06: garbled text.** The order list and the runner request list printed "Â·" where a middle dot belongs (the dots were stored double-encoded in `app/(store)/orders/page.tsx`, `app/(store)/requests/page.tsx` and the legacy v4 footer). Guards: K01 and K02 in `e2e/access/known-issues.spec.ts`.
3. **The RFQ chain has no screens** past the buyer's request (C02 to C04 above).
4. **Fixed 2026-10-06: when Clerk could not be reached, the page crashed.** `auth()` now builds the session from the signed session token's `metadata` claim and the profile already linked to the Clerk account, with no call to Clerk's API; `currentUser()` (now with three retries) is only needed on a first sign-in or a token without the claim. It was: every signed-in page called Clerk's API (`currentUser()` in `lib/auth.ts`). From this machine that call fails now and then ("fetch failed"). `lib/auth.ts` retries twice, but in one 25 minute run it still failed 5 times, and each time the buyer saw the full "We could not finish loading this" screen (for example `/requests`, digest 2291417529). A gentler fallback (a longer backoff, or rendering the page signed out with a "reconnecting" notice) would hide most of these. The suite's one retry absorbs them and reports the test as flaky.
5. **Fixed 2026-10-06: on a phone, the pinned buy bar was not pinned.** The transition now keeps `will-change` only while it slides, and never wraps a server render (which counted every request as a navigation). It was: the phone page transition (`components/motion/PageTransition.tsx`) left `will-change: transform` on the page wrapper. That makes every `position: fixed` element inside a page pin to the wrapper instead of the screen, so "Add to cart" sits about 3,600 px down the product page instead of at the bottom of the screen, and the cart's Total and Checkout bar floats in the middle of the screen over the cart line. Anything else fixed inside a storefront page (dialogs, bars) is exposed to the same thing. Test: A03 on phone.
6. **Fixed 2026-10-06: on a phone, the quotation dialog sat under the buy bar.** The bar is `z-[60]`; the "Request a quotation" dialog is now `z-[70]`. Test: C01 on phone.
7. **Saves are slow from Botswana.** Measured with two test workers at once: median **8.3 s** to **18.9 s** depending on the run (worst single saves 23 s to 34 s; placing an order was the slowest, 33.7 s in one run). Each save is several locked transactions (the record, the audit log, notifications), and each transaction reads its whole collection; one such transaction alone takes about 1.2 s of round trips to Ohio from here. The report lists every save's time on its test. On Vercel next to the database (`iad1`) this should fall to well under a second, but it is what anyone testing from Botswana against the US database will feel, the client included, and the whole-collection read inside every write grows with the data.
8. **Fixed 2026-10-06: sign in could land staff on the storefront.** `/after-sign-in` sent anyone to `/` if resolving their session threw, with no message (AfriDeal Admin landed on the storefront once that way in the first run). It now logs the error and shows "We could not finish signing you in" with Try again and Go to the shop.

## Questions for the product owner

1. **Operations and the payables ledger.** Keabetswe's demo card says "everything except settings and the ledger", but the route guard (`middleware.ts`, `OPS_DENIED`) does not block `/admin/payables`, and Operations can open it. Which is right? H05 tests only settings until this is decided.
2. **Finance and pricing.** `/admin/pricing` gives Finance edit rights, but Finance is turned away from the page (`FINANCE_ALLOWED`). Should Finance manage pricing?
3. **What the supplier invoice is for.** On AFD-24851 (2 tubs at BWP 146.00), Naledi's card shows "Your subtotal BWP 164.00" (her cost) and, under it, "Supplier invoice, amount owed BWP 292.00" (what Thabo paid). The payables ledger also raises the invoice at BWP 292.00, and `npm run verify` asserts that invoices equal the order subtotal. If AfriDeal pays suppliers their cost, the invoice should be 164.00; either way, the supplier now sees AfriDeal's selling price. Scope feature 31 ("what a supplier sees on an order") is the natural home.

## Decisions taken (2026-10-05)

1. **Data:** a fresh Neon branch per run, thrown away after (`scripts/e2e.mjs`).
2. **Where:** a local dev server on that branch for now; staging later, through `E2E_BASE`.
3. **Sign in:** by clicking the demo cards, exactly as a person does (`e2e/auth.setup.ts`).
4. **Videos:** recorded from the same specs with `npm run e2e:demo`, slowed down, phone size for storefront and runner screens.
