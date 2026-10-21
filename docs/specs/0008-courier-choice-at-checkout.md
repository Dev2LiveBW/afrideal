# 0008. Picking a courier at checkout, Gorosa listed first

**Date**: 2026-10-21
**Status**: Proposed. Not built. Settled 2026-10-21: Gorosa's fee rule
(cut-off P2,000, fee by destination), the courier fee as a charge separate
from the goods, and AfriDeal's own last mile from Gorosa's depot. Still with
the product owner: when the buyer pays the courier fee (open question 2) and
what the last mile costs (open question 3). Launch subsidy: P200 instead of
P250 (open question 4).

## Summary

Product sales and delivery are kept apart. Product prices no longer carry
customs (spec 0007, amendment of 2026-10-21); the courier does. At checkout the
buyer picks a courier from a short list of **listed courier and clearance
partners**. Gorosa Express Logistics is the first, listed first and selected by
default. A second, everyday courier joins later. The courier fee is a
separate charge, never folded into the goods payment, computed by the server
from the courier's fee rule, never from the browser. The buyer pays it either
at checkout or on arrival. Gorosa stops at its depot; AfriDeal delivers the
last mile in its own car for parcels that fit.

## Context

From the product owner on WhatsApp, 2026-10-20:

- **17:18, voice note (3:40).** Her friend's company, Gorosa, holds import and
  export codes and runs goods from Johannesburg to Botswana **twice a week**,
  insured. It pays its border licence annually, so it charges no VAT per
  shipment on small orders. Fees she quoted:
  - orders **below P2,000**: a transport fee of **P250**; Gorosa will charge
    AfriDeal **P130**, leaving P120 for AfriDeal to keep or to pass on as a
    launch subsidy;
  - orders **above P2,000**: **21% of the order**, split between Gorosa and
    AfriDeal; Gorosa pays 7% VAT at the border on these.
  Gorosa is happy to take consolidated orders. (One sentence in the recording
  says "above 10 000"; she has since settled it at P2,000, below.)
- **17:26, forwarded notice.** How Gorosa customers register an address with
  online shops: name as "First name + Last name + Gorosa", Gorosa's phone
  (+27 73 932 7292), and Gorosa's depot as the delivery address: 2A Kikuyu
  Road, Sunninghill Self-Storage / Gorosa, Sunninghill, Johannesburg, Gauteng
  (postal code cut off in the preview). Business card at 17:30.
- **20:20, decision.** "Let's keep the product sales and the courier separate.
  We will remove VAT from product prices. We will upload Gorosa as a listed
  courier and clearance partner. Customers who chose Gorosa will checkout with
  their address. I will try negotiate with others and see if they will accept
  consolidated orders so that we have at least two listed courier partners of
  which the client decides for themselves which courier to opt for. Will add
  the everyday one."

From the product owner on WhatsApp, 2026-10-21, answering the questions sent
at 08:10:

- **08:48, answer 1:** "The cut-off is P2000."
- **08:48, Gorosa's price poster** (forwarded with the answer). Headed "From
  end of Feb: Zara, Shein, Temu, Amazon courier prices will go up! New courier
  pricing effective!", "Effective for ALL online orders (Zara, Shein, etc.)":

  | Destination | Orders for R2000 or less | Orders for more than 2K |
  |---|---|---|
  | Gaborone | P250 | 16% of the total cost |
  | Francistown | P300 | 21% of the total cost |

  So the fee depends on where the order goes. The 21% in her voice note is
  the Francistown rate; Gaborone is 16%. The poster prints the cut-off as
  "R2000"; **for AfriDeal the cut-off is P2,000, in pula** (her answer,
  confirmed by the developer the same day). It is never converted from rand.
  The flat fees are in pula too. The poster names no other towns.

- **09:06, answer 2:** "You may suggest, but I think my friend she likes
  instant cash. But since we know her calculations, I'll talk to her that we
  reduce making the customer make multiple transactions. Such that at
  checkout, since she already has a formula, we can collect and pay her later,
  either weekly or monthly. Or we can just collect our money and give client
  option to pay for courier services even on arrival of goods cos sometimes
  clients pay on collection. So let's separate them."
  Read as: the courier fee is **its own charge, separate from the goods**.
  Two ways to pay it are on the table: AfriDeal collects it at checkout and
  settles with Gorosa weekly or monthly, or the buyer pays it on arrival.
  Which one (or both) is still open, pending her talk with Gorosa.
- **09:49, answer 3:** "Gorosa goods only end at the depot. I think we will
  deploy my car this side to do last mile delivery for parcels we can carry."
  Read as: Gorosa's leg ends at its depot; **AfriDeal delivers the last mile
  in its own car**, for parcels that fit.

- **10:10, answer 4:** "Let's subsidize to P200 for launch, we will increase
  after a month or two." Read as: at launch the buyer pays **P200** where
  Gorosa's flat fee is P250, and AfriDeal carries the P50. At Gorosa's P130
  cost to AfriDeal, the P200 still leaves P70.

Questions 5 to 8 are not answered yet.

What the code does today:

- Checkout offers **DOORSTEP** (flat P45) or **COLLECTION_POINT** (the point's
  own fee, `lib/collection-points.ts`). Both are constants in
  `CheckoutClient.tsx`, `CartClient.tsx`, `CartSheet.tsx` and
  `app/api/orders/route.ts`; the server repeats them.
- Delivery inside Botswana is a runner job (`lib/shipments.ts`), dropping at
  the buyer's address or a locker.
- Nothing models the cross-border leg. The customs row reads "Cleared by your
  courier" since 2026-10-21, with no courier named.

## Requirements

**User stories**:
- As a buyer, I want to choose who brings my order across the border and see
  what they charge, separately from what the goods cost.
- As the product owner, I want to list courier partners and their fee rules
  without a redeploy, Gorosa first.
- As finance, I want each order to record the courier, the fee charged and
  what the courier is owed, so the P120 or the 21% split can be reconciled.

**Acceptance criteria**:
- **AC-1 Listed couriers.** A `couriers` collection holds each partner: name,
  role (`CROSS_BORDER_CLEARANCE`), `sort_order`, `active`, trips per week,
  insured, depot address, phone, consignee format, and a fee rule. Seeded with
  Gorosa at `sort_order` 1. Only active couriers show at checkout.
- **AC-2 Choice.** Checkout shows a "Courier" section above the delivery
  method. Each active courier is a radio card: name, "Clears customs",
  "Twice a week", "Insured", and its fee for this cart. Gorosa is first and
  pre-selected. With one courier the section still shows, so the buyer sees who
  carries the goods.
- **AC-3 Fee rule.** A threshold rule per destination: when the goods
  subtotal is **at or below** `threshold` the fee is `flat`; **above** it,
  `pct × goods subtotal`, rounded up to the Pula. Gorosa, cut-off
  **P2,000** on the goods subtotal in pula:

  | Destination | ≤ 2,000 | > 2,000 |
  |---|---|---|
  | Gaborone | P250 | 16% |
  | Francistown | P300 | 21% |

  **Launch subsidy (2026-10-21 10:10):** the buyer is charged **P200**
  instead of the P250 Gaborone flat fee "for launch", to rise "after a month
  or two". The rule carries a `launch_flat` override with an end date
  (`launch_until`), so ending the subsidy is a data change; the order
  snapshot records the subsidy (`courier_subsidy`, P50) so margin reports see
  it. Whether the subsidy also covers Francistown's P300 is open question 4.

  The destination comes from the buyer's delivery city. A city with no rule
  for the chosen courier means that courier is not offered for this cart
  (open question 7). The fee is a separate summary line, "Courier (Gorosa)",
  in cart, checkout and the order. Worked: P1,800 of goods to Gaborone pays
  P250 (P200 during the launch subsidy); P2,500 to Gaborone pays P400;
  P2,500 to Francistown pays P525.
- **AC-4 Server decides.** `POST /api/orders` takes `courier_id`, rejects an
  inactive or unknown one (422), and recomputes the fee; a fee sent by the
  browser is ignored.
- **AC-5 Order snapshot.** The order records `courier_id`, `courier_name`,
  `courier_fee`, `courier_fee_basis` (`FLAT` or `PCT`),
  `courier_fee_payment` (`AT_CHECKOUT` or `ON_ARRIVAL`), `courier_fee_paid`
  and `courier_payable` (what AfriDeal owes the courier, per open
  question 8), so a later change to the rule never alters a placed order.
- **AC-6 Consignee.** For Gorosa, the supplier ships to Gorosa's depot with the
  consignee "<buyer first name> <buyer last name> Gorosa". The buyer still
  enters their own Botswana address for the last leg; the admin order page
  shows both.
- **AC-9 Separate charge.** The courier fee is never part of the goods
  amount: not in the product price, the goods subtotal, the margin, or the
  supplier payable. Each courier carries `payment_options`, a subset of
  `AT_CHECKOUT` and `ON_ARRIVAL` (Gorosa's per open question 2). When both
  are offered, the buyer picks one under the courier card.
  - **At checkout:** the fee is its own line and is added to "Total to pay";
    the payment record shows goods and courier separately, so AfriDeal can
    settle with the courier weekly or monthly.
  - **On arrival:** "Total to pay" covers the goods (and the last mile) only.
    The summary shows "Courier fee, pay on arrival: P250", and so do the
    order page and the delivery job. The fee is marked paid when the driver
    or admin confirms it at hand-over.
- **AC-10 Last mile.** From Gorosa's depot, AfriDeal delivers in its own car
  (the existing runner job in `lib/shipments.ts`, with the depot as pick-up).
  Its fee is a separate line from the courier fee (amount per open
  question 3). A parcel too big for the car is flagged on the admin order
  page for a manual arrangement; the first release does not size parcels
  automatically.
- **AC-7 Customs row.** The customs row names the chosen courier: "Cleared by
  Gorosa".
- **AC-8 Checks.** `verify.mjs`: the fee below and above the threshold, an
  unknown courier refused, a browser-sent fee ignored, the snapshot on the
  order, an on-arrival order whose total excludes the courier fee, and a
  payment option the courier does not offer refused. Unit tests for the fee
  rule at the threshold edges.

## Design

- **Data.** `couriers` is a JSON-store / Postgres document collection like
  `settings` (routed by `lib/db.ts`, not Sanity), seeded in `scripts/seed.mjs`.
  Fee rules, one per destination:
  `{ type: 'THRESHOLD', threshold: 2000, rates: { Gaborone: { flat: 250, pct: 0.16 }, Francistown: { flat: 300, pct: 0.21 } }, payable: { flat: 130, pct: null } }`.
  Every amount is pula; the threshold is compared with the pula goods
  subtotal as it stands, never converted. `payable.flat` is the P130 she
  quoted for Gaborone; the rest waits on open question 2.
  `Order` gains the AC-5 fields in `types/index.ts`.
- **Code.** `lib/couriers.ts` (new): `courierFee(rule, subtotal)` and
  `courierPayable(rule, subtotal)`, pure and unit-tested; the cart, checkout
  and order route all call them. The checkout reads active couriers from a
  server component and passes them to `CheckoutClient`.
- **Payment.** `couriers[].payment_options` drives the choice; the order route
  rejects an option the courier does not offer (422). `payments` keeps one
  record per order with `goods_amount` and `courier_amount`, the latter 0 for
  `ON_ARRIVAL`.
- **Last leg.** Gorosa's leg ends at its depot. The leg from the depot to the
  buyer is AfriDeal's own delivery, a runner job whose pick-up is the depot.
  The current DOORSTEP P45 / COLLECTION_POINT fees stay as placeholders until
  open question 3 sets the last-mile fee.
- **Admin.** A couriers list under `/admin` to add, reorder, deactivate and
  edit fee rules, each edit audited. Can follow the first release; until then
  the seed holds the list.

## Open questions

1. **Threshold. Settled (2026-10-21 08:48): "The cut-off is P2000."** Pula,
   on the goods subtotal before delivery. The R2,000 printed on Gorosa's
   poster does not apply to AfriDeal.
2. **When the buyer pays the courier fee. Partly answered (2026-10-21
   09:06):** a separate charge, not part of the goods ("So let's separate
   them"). Still open, pending her talk with Gorosa: offer **at checkout**
   (AfriDeal collects, settles with Gorosa weekly or monthly), **on arrival**
   (the buyer pays when the goods arrive), or both? AC-9 builds both behind
   `payment_options`, so the answer is a data change. If on arrival, who takes
   the money at hand-over: AfriDeal's driver for Gorosa, or Gorosa?
3. **Last-mile fee. Partly answered (2026-10-21 09:49):** Gorosa stops at its
   depot and AfriDeal delivers the last mile in its own car, for parcels that
   fit. Still open: what the buyer pays for that leg (the current P45 doorstep
   and locker fees are placeholders), whether buyers may collect from the
   depot themselves, and what happens to a parcel too big for the car.
4. **Launch subsidy. Answered (2026-10-21 10:10):** P200 for launch, rising
   after a month or two. Still open: does it apply to Francistown (P300) too,
   and if so at what price? And the date it ends, so `launch_until` can be
   set.
5. **The second courier.** "Will add the everyday one": its name and fee rule
   when she has it. AC-2 already lists any number.
6. **Consolidation.** Gorosa accepts consolidated orders. Do buyers get a lower
   fee when their order rides with others on the same trip, or does AfriDeal
   keep the saving? Out of the first release either way.
7. **Other towns.** The poster prices Gaborone and Francistown only. Does
   Gorosa deliver elsewhere (Maun, Palapye, Lobatse...), and at what rate? Until
   then, buyers in other towns are not offered Gorosa.
8. **AfriDeal's share by destination.** The P130 Gorosa charges AfriDeal was
   quoted against the P250 Gaborone fee. What is it for Francistown's P300, and
   for the 16% and 21% rates? Does the 21% include the 7% border VAT? Matters
   only for fees AfriDeal collects at checkout.

## Out of scope

Live tracking from the courier's own system, trip scheduling (which of the two
weekly trips an order makes), couriers for other countries, automatic parcel
sizing for the car, and paying couriers through the payables ledger (the
weekly or monthly settlement follows once open question 2 is answered).
