# Scope: AfriDeal

An Alibaba style marketplace for buyers in Botswana. AfriDeal sources products from South African suppliers, sells them at one landed price as merchant of record, and brings them across the border by runner or to a collection point.

**Build approach:** Tracer Bullet (prove one real thread through every layer, then thicken it one strand at a time).
**Workflow:** GA (after `/develop`: `/check verify`, `/test`, a fresh model `/check review`, then `/document`). The project default level of rigor, chosen because the product takes card payments, holds personal data under Botswana's Data Protection Act 2018, and crosses a border. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· Beta`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

**Finish line:** a full launch with card payments. The EFT "mark as paid" path is built too, as a fallback, not as a pilot stage. Dates, client dependencies (gateway application, domain, accounts) and the decisions log stay in `Tshego/docs/08-phase-1b-readiness-plan.md`; this scope is the feature list.

## Epics

- [platform.md](platform.md): stack, data, sign in, catalogue admin, environments, CI, monitoring, launch. 4 already built, 6 planned.
- [buying.md](buying.md): storefront, pricing, the buy funnel, payments and money operations. 5 already built, 9 planned.
- [delivery.md](delivery.md): runners, suppliers, customs, collection point, emails and SMS. 3 already built, 4 planned.
- [reach.md](reach.md): SEO, Setswana, legal pages, real catalogue content. 4 planned.

## At a glance

| # | Feature | Epic | Phase | Status |
|---|---------|------|-------|--------|
| A | Stack & scaffold | platform | Foundation | existing |
| B | Transactional store on Postgres | platform | Foundation | existing |
| C | Sign in & roles | platform | Foundation | existing |
| D | Catalogue admin (Sanity Studio) | platform | Foundation | in-progress |
| E | Design system & Alibaba benchmark | buying | Foundation | existing |
| F | Pricing engine & tier ladder | buying | Foundation | existing |
| G | Storefront: home, categories, suppliers, RFQ, browse | buying | Foundation | existing |
| H | Buy flow, desktop first (detail, cart, checkout) | buying | Foundation | existing |
| I | Buyer orders & tracking | buying | Foundation | existing |
| J | Runner requests & runner portal | delivery | Foundation | existing |
| K | Supplier portal | delivery | Foundation | existing |
| L | Admin portal | delivery | Foundation | existing |
| 1 | Coding standards & CI | platform | Foundation | in-progress |
| 2 | Staging & production environments | platform | Foundation | planned |
| 3 | Order payment states | buying | Foundation | planned |
| 4 | Card payment gateway | buying | Slice 1 | planned |
| 5 | Phone checkout | buying | Slice 1 | planned |
| 6 | Product detail at phone parity | buying | Slice 2 | planned |
| 7 | Cart at phone parity | buying | Slice 2 | planned |
| 8 | Sign in safety & phone screens | platform | Slice 2 | planned |
| 9 | Customs & duty in the landed price | delivery | Slice 3 | planned |
| 10 | Collection point delivery | delivery | Slice 3 | planned |
| 11 | Order & payment emails | delivery | Slice 4 | planned |
| 12 | SMS alerts | delivery | Slice 4 | planned |
| 13 | Finance controls: mark as paid, pause checkout | buying | Slice 5 | planned |
| 14 | Refunds | buying | Slice 5 | planned |
| 15 | Payment reconciliation | buying | Slice 5 | planned |
| 16 | Error monitoring & backups | platform | Slice 6 | planned |
| 17 | Legal pages & cookie notice | reach | Slice 6 | planned |
| 18 | SEO basics | reach | Slice 7 | planned |
| 19 | English & Setswana | reach | Slice 7 | planned |
| 20 | Orders list clean up | buying | Slice 7 | planned |
| 21 | Real catalogue & photography | reach | Slice 8 | planned |
| 22 | Launch checks | platform | Slice 8 | planned |
| 23 | Production go live | platform | Slice 8 | planned |

Deferred features are listed at the end of each epic file.

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (built before this workflow) and `dropped` (de scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· Beta`) sets that one feature's rigor above or below the project default; no tag inherits GA. It decides the feature's check boxes and each skill's next suggestion.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
- **Lettered rows** (A to L) were built before this workflow; `/develop` and `/sync` leave them alone. A planned row that rebuilds one (e.g. 6 rebuilds part of H) is new work on top, not a replan of the old row.
