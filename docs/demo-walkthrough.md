# Demo walkthrough: the payment flow

_13 October 2026. A presenter's script for the client demo. Every step below was
driven in a browser against the demo server, and the screens quoted are what
actually renders._

The story this demo tells: **money arrives first, then suppliers are engaged.**
That is the point of the payment work, and it is what a client needs to see to
trust the system with real orders.

---

## Before you start

**Run the demo server** on the JSON store with the mock gateway:

```bash
DB_DRIVER=json CATALOGUE_SOURCE=json PAYMENTS_PROVIDER=mock npm run dev
```

In Claude Code that is the `afrideal-demo` launch config, which sets those three
and runs on port 3200. Give it a minute — the first page compiles slowly, and you
do not want that happening while the client watches.

**Reseed first**, so the figures are clean and the waiting queue has orders in it:

```bash
DB_DRIVER=json node scripts/seed.mjs
```

### Two things to settle first

**1. Put your real banking details in, or skip the instructions panel.** The
buyer's screen currently reads _"Our banking details will be sent to you
shortly."_ The code refuses to invent an account number, which is correct — a
wrong one sends a buyer's money to a stranger — but it is not what you want on
screen. Set the `eft_bank_details` setting to your real account before presenting.

**2. Do not demo a card payment.** There is no gateway behind the card options
yet, so a buyer cannot self-serve one. Nothing on screen claims otherwise, but do
not click into it. What to say when it comes up is in **Act 5**.

---

## The script

Sign-in is at `/sign-in`, which shows eight demo accounts as cards. Click a card
to sign in as that person — no password. You will switch accounts twice, so keep
that page handy.

### Act 1 — A buyer places an order (as **Thabo Modise**, under Customers)

1. Go to `/products/p001` (Shea Butter Deep Treatment 500ml) and click **Add to
   cart**.
2. Go to `/checkout`. Fill the street address — `Plot 5412, Extension 12` works.
3. Under **Payment method**, choose **Bank transfer**.

> **Say:** "Four payment methods. The three gateways are wired and tested, and go
> live when DPO Pay approves. Bank transfer works today — which means AfriDeal can
> trade before the gateway exists."

Watch the paragraph above the cards change when you pick bank transfer. It stops
claiming a licensed provider handles the money, because for a transfer none does.

4. Click **Place order**.

### Act 2 — The buyer is told the truth

You land on the order tracking page. It says:

> **Waiting for your payment**
> AFD-24835 is held for you. We start sourcing it as soon as your payment is
> confirmed, and no supplier has been asked to prepare anything yet.

Then the reference to quote, and the date the hold expires.

> **Say:** "This screen used to say 'your payment has been processed' the instant
> the order was placed. It now says what is actually true. The order is held, the
> buyer knows what reference to quote, and no supplier has been asked for
> anything."

Point at the timeline: step 1 **Placed** is ticked, step 2 **Paid** is not.

### Act 3 — Finance confirms the transfer (as **Finance Admin**, under Platform)

Sign out, sign back in as Finance Admin, and go to `/admin/payables`.

The top of the page is the money position: outstanding, settled this month, on
hold, average days to settle, overdue. Below it, **Orders waiting on a bank
transfer**, which leads with:

> No supplier has been asked to prepare these goods yet. Confirming one raises its
> supplier order and procurement invoice.

Note the **Outstanding** count before you go on — you will compare it in a moment.

1. Find your order and click **Mark paid**.

The dialog explains itself, and includes the line worth reading aloud:

> Confirms that the transfer has landed. The supplier will be asked to prepare the
> goods and a procurement invoice will be raised. **This is the same path the card
> gateway uses.**

> **Say:** "That last sentence is the important one. Finance confirming a transfer
> and a card gateway calling back run through exactly the same code. When DPO Pay
> switches on, this is already proven."

2. Enter a bank reference — anything, e.g. `FNB-TRF-884201`. It is required, so
   there is always an audit trail back to the bank statement.

Leave the amount blank, and mention what it does: _"If a different amount arrives,
it is recorded and flagged, never silently refused."_

3. Click **Mark paid**.

### Act 4 — The supplier legs appear

Two things happen at once:

- The order **leaves** the waiting queue.
- **Two** supplier invoices appear in the ledger below, one per supplier on the
  order, each timestamped now and marked Pending. Outstanding goes up by two.

> **Say:** "Those two invoices did not exist a second ago. The suppliers were
> engaged the moment the money was confirmed, and not before. That ordering is
> enforced in the database, not just in the screens."

If you want one more beat: unpaid orders are excluded from revenue, and an order
past its hold window reads as cancelled.

### Act 5 — Pause checkout (as **AfriDeal Admin**, under Platform)

Sign in as AfriDeal Admin and go to `/admin/settings`. Pause checkout, then open
the storefront in another tab and try to check out: the buyer is told it is
temporarily unavailable. Resume, and it works again.

> **Say:** "If something goes wrong — a supplier problem, a bank issue — one
> person can stop the platform taking money, without a deploy."

---

## When the client asks about cards

They will. The honest answer is also the strong one:

> "The card path is built and tested against a mock gateway that uses the same
> signed callback DPO Pay will. What is missing is DPO Pay's merchant approval,
> which needs your business registration and ID documents. When that lands, the
> work left is one adapter and a set of credentials — a configuration change, not
> a project. Meanwhile bank transfer means you are not blocked from trading."

Same for text and email alerts: the events already fire, the channels sit behind a
provider interface, and going live needs your sending domain and sender name.

**Do not** promise a date for card payments. It depends on DPO Pay, not on us.

---

## Resetting between runs

```bash
DB_DRIVER=json node scripts/seed.mjs
```

That puts the data back and refills the waiting queue. Worth doing between
rehearsal and the real thing, so the figures look clean and the queue is not full
of orders you confirmed while practising.

---

## What this demo deliberately does not show

Honest framing matters more than coverage, so if asked, these are not ready and
saying so costs nothing:

| Not shown | Why |
|---|---|
| A buyer paying by card | No gateway yet — blocked on DPO Pay approval |
| Real emails or text messages | Blocked on your sending domain and sender name |
| Saved addresses, promo codes, wishlist | Package 3, not built yet |
| Supplier and runner self-sign-up | Package 4, not built yet |
| Real products and photography | Waiting on your catalogue content |
