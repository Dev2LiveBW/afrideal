# lib

## Overview

The lib directory holds core domain logic, data store routing, authentication helpers, and pricing rules. It sits between route handlers and data storage. Every database query, price calculation, and payable state move passes through here.

## Key files

| File | Owns |
|---|---|
| lib/db.ts | Data store router between Sanity, Neon Postgres, and local JSON files |
| lib/pricing-model.ts | Four rung price ladder and volume quotation threshold |
| lib/pricing-tiers.ts | Margin and markup arithmetic plus buyer price resolution |
| lib/payables.ts | Supplier trade creditors ledger and state transition rules |
| lib/auth.ts | Session resolution and profile mapping from Clerk accounts |
| lib/roles.ts | Role definitions and portal access route permissions |
| lib/api.ts | Route handler guards and standard JSON responses |

## Conventions

* In margin arithmetic, markup is `cost * (1 + v)` while margin is `cost / (1 - v)`. Never swap them.
* All database updates must call `mutate()`, which serializes writes and manages collection locks.
* Reads use `readAll()`, memoized per request with React `cache()`.
* Route handlers call `guard()` from `lib/api.ts` to enforce authentication and role limits.
* Prices publish across four quantity tiers (Retail, Bulk, Wholesale, Wholesale Plus). Orders of 100 units or more require quotation.
* Supplier payables follow strict lifecycle states (PENDING, ON_HOLD, SETTLED, CANCELLED). Only PENDING and ON_HOLD may change.

## Gotchas

* Getting markup and margin reversed distorts profit reporting across the entire app.
* An illegal transition on supplier payables throws `PayableTransitionError` instead of failing quietly.
* `mutate()` invalidates cached reads within the active request, but never across separate requests.
* Neon Postgres connections from slow network routes require raised socket timeouts set in `lib/postgres/network.mjs`.

## Related specs

* [0001-coding-standards-ci.md](../docs/specs/0001-coding-standards-ci.md)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
