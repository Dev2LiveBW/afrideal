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

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Courier to the door**: a cross border courier with tracking · needs a decision
- **Consolidated freight**: many orders grouped into one scheduled shipment · needs a decision
- **Supplier agreements**: a template in `docs/legal/`, owned by the client, not code
