# Epic: Sourcing & delivery

How goods get from a South African supplier to a buyer in Botswana, and how everyone hears about it: suppliers, runners, the admin portal, customs, the collection point, emails and SMS. Back to [index.md](index.md).

## Already built

### J. Runner requests & runner portal · existing
Buyers request a runner to source or carry goods; runners see jobs, sourcing tasks and earnings. code in `app/(store)/request-a-runner/`, `app/(runner)/`, `app/api/runner-requests/`, `lib/runner-requests.ts`

### K. Supplier portal · existing
Suppliers manage products, quotes, orders and earnings; supplier selection and offers feed the pricing engine. code in `app/(supplier)/`, `lib/supplier-selection.ts`, `app/api/supplier-offers/`

### L. Admin portal · existing
Orders, payables, disputes, pricing, sourcing, suppliers, products, runners, analytics and settings for AfriDeal staff. code in `app/(admin)/`, `lib/payables.ts`

## Slice 3: Landed price and delivery

### 9. Customs & duty in the landed price · needs a decision
AfriDeal, as merchant of record, clears goods at the border and pays duty and VAT, so the buyer sees one landed price. The estimate has to be built into pricing, and what was actually paid has to be recorded against each order.
**Done when:** every product price shown includes estimated duty and VAT; checkout shows one landed total; the actual duty paid is recorded per shipment and flows into margin reporting.
- [ ] Design it (spec): `/architect customs & duty in the landed price`

### 10. Collection point delivery · needs a decision
Besides runner delivery, a buyer can choose to collect from a pickup point in Botswana. The order tells them when it has arrived and what to bring.
**Done when:** checkout offers runner delivery or a named collection point, with the delivery cost in the landed total; the order shows "ready for collection"; staff can mark it collected.
- [ ] Design it (spec): `/architect collection point delivery`

## Slice 4: Keeping people informed

### 11. Order & payment emails · needs a decision
Real emails behind the existing in app notifications, from an `@afrideal.co.bw` address: order placed, payment confirmed, supplier order raised, ready for collection or delivered, password reset.
**Done when:** each of those emails arrives on staging from the AfriDeal domain; the in app notification is still written; a failed send is logged, not swallowed.
- [ ] Design it (spec): `/architect order & payment emails`

### 12. SMS alerts · needs a decision
Text messages where email is too slow: runners get a job alert when a sourcing request comes in; buyers get one when an order is paid and when it is delivered or ready to collect.
**Done when:** an SMS from the AfriDeal sender ID reaches a Botswana number for each of those events on staging.
- [ ] Design it (spec): `/architect sms alerts`

## Phase 1 close out

Gaps against the client's Phase 1 feature list that you can build alone. Order and packages: [docs/phase1-closeout-plan.md](../phase1-closeout-plan.md). Emails (11) and SMS (12) are built against test mode first; going live waits on the client's sending domain and sender name.

### 27. Supplier onboarding & self service · needs a decision
A supplier can join without staff doing it for them, and run more of their own account: sign up, upload documents, wait for approval, get a welcome. Inside the portal: decline a quote request, switch a product on or off, edit storefront settings, export earnings as CSV.
**Done when:** a new supplier signs up, uploads documents and lands on "waiting for approval"; admin approval moves them to a welcome screen; a supplier can decline a quote with a reason, switch a product off, and download earnings as CSV.
- [ ] Design it (spec): `/architect supplier onboarding & self service`

### 28. Runner onboarding & profile · needs a decision
A runner can join on their phone (sign up, documents, service area, approval, welcome), has a profile page with ratings and performance, and confirms delivery with a real photo instead of the placeholder.
**Done when:** a new runner signs up with documents and a service area and waits for approval; an approved runner sees their profile figures and reviews; confirming delivery stores a photo against the job.
- [ ] Design it (spec): `/architect runner onboarding & profile`

### 29. Team console gaps · needs a decision
The admin pieces on the Phase 1 list that are missing: customer accounts (list, detail, suspend, message, password reset), runner detail and suspend, an audit log screen, flagging an order, escalating a dispute, overriding the chosen supplier, CSV export from analytics, and an alert feed staff can mark read and filter.
**Done when:** staff can find, view and suspend a customer or runner; the audit log is browsable and filterable; an order can be flagged and a dispute escalated; analytics downloads as CSV; every one of these actions is audit logged.
- [ ] Design it (spec): `/architect team console gaps`

### 30. Team user management · needs a decision
Adding staff and assigning their admin role from the console. Conflicts with the current rule that roles come only from `scripts/sync-users-to-clerk.mjs` and the Sanity people directory, so where roles live must be decided first.
**Done when:** a super admin can add a staff member with a role and deactivate one, and the role source of truth is still single and documented.
- [ ] Design it (spec): `/architect team user management`

### 31. What a supplier sees on an order · needs a decision
Suppliers currently see the customer's price and payment method next to AfriDeal's buying price. As merchant of record, AfriDeal probably shows suppliers only its own purchase order. Confirm with the product owner, then hide the rest.
**Done when:** a supplier's order view shows only AfriDeal's purchase order (items, quantities, AfriDeal's price, dates), with no customer price or payment method.
- [ ] Design it (spec): `/architect what a supplier sees on an order`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Courier to the door**: a cross border courier with tracking · needs a decision
- **Consolidated freight**: many orders grouped into one scheduled shipment · needs a decision
- **Supplier agreements**: a template in `docs/legal/`, owned by the client, not code
