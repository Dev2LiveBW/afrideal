# Processing agreements

**Date**: 2026-10-23 · **Status**: draft; **not legal advice**. Provider
terms change; read each one's current DPA before signing.

All four Acts require a **written contract** with anyone who processes
personal data on AfriDeal's behalf: Botswana s 56 and s 58, POPIA s 21(1),
Lesotho s 22(2), Eswatini s 16(2). The big providers publish a standard data
processing agreement (DPA); AfriDeal's job is to accept it in the company's
name, check it against the list below, and keep a signed copy.

**Sign every DPA in the company's name**, not a personal account. The Neon
project still sits in a personal organisation (AGENTS.md: "transfer the
project to a Company-owned org"); do that first, then accept Neon's DPA.

## What every processor agreement must contain

Botswana's list (s 56) is the most complete; meeting it meets the other three.

| # | Term | Law |
|---|---|---|
| 1 | Subject matter, duration, nature and purpose of the processing; types of data; categories of people | Botswana s 56(1) |
| 2 | The processor acts **only on AfriDeal's documented instructions**, including on transfers abroad | Botswana s 56(2)(a); POPIA s 20(a); Lesotho s 21; Eswatini s 15(a) |
| 3 | Everyone at the processor who touches the data is bound to **confidentiality** | Botswana s 56(2)(b); POPIA s 20(b); Eswatini s 15(b) |
| 4 | **Security** measures appropriate to the risk (encryption, resilience, restore, regular testing) | Botswana ss 56(2)(d), 62; POPIA s 19; Lesotho s 22(1); Eswatini s 16(1) |
| 5 | **Sub-processors** only with AfriDeal's written authorisation; notice of changes with a chance to object; the same obligations passed down; the processor stays liable | Botswana ss 55(2)–(3), 57 |
| 6 | Helps AfriDeal answer people's **requests** (access, correction, deletion, portability) | Botswana s 56(2)(e) |
| 7 | Helps with security, **breach** notices and impact assessments | Botswana s 56(2)(f) |
| 8 | Tells AfriDeal of a breach **immediately** / without undue delay | POPIA s 21(2); Botswana s 63(3) |
| 9 | At the end, **deletes or returns** all data, including copies | Botswana s 56(2)(g) |
| 10 | Gives AfriDeal the information to show compliance and allows **audits** (a SOC 2 or ISO 27001 report usually satisfies this) | Botswana s 56(2)(h) |
| 11 | Tells AfriDeal if an instruction would break the law | Botswana s 56(3) |
| 12 | **Transfer terms**: protection substantially similar to the African Acts, and the same limits on onward transfers to other countries (the standard contractual clauses in most providers' DPAs) | POPIA s 72(1)(a); Lesotho s 52(a); Botswana s 76; Eswatini s 33 |
| 13 | A processor outside the country complies with its own country's data protection law | Lesotho s 22(3); Eswatini s 16(3) |

A provider DPA written for the EU GDPR normally covers 1 to 11 and uses the
EU standard contractual clauses for 12. Two gaps to know about:

- **Botswana does not yet recognise those clauses on their own.** Contract
  clauses need the Commission's specific authorisation (s 76(3)(a)) unless
  the Commission has adopted its own standard clauses (s 76(2)(c)). Until
  then, the sign-up consent carries the transfer (see
  [consent wording](consent-wording.md)). **To confirm** with the lawyer.
- **Whether EU-style clauses meet POPIA s 72** is the common view, but **to
  confirm**.

## Provider by provider

| Provider | What it holds | Where | Role | Agreement | Check before signing |
|---|---|---|---|---|---|
| **Neon** | The whole transactional store: users, orders, addresses, phones, payables, runners, audit log; runner documents in the `uploads` bucket once spec 0005 ships; every `e2e-*` test branch copies production | AWS `us-east-2` (Ohio), USA | Processor | DPA at `neon.com/dpa` (last modified 20 Aug 2025), part of the Terms of Service; sub-processor list at `neon.com/subprocessors` with email alerts | Accept it from the company-owned organisation; subscribe to sub-processor notices; record the history-retention (point-in-time restore) window, since deleted rows survive there until it passes |
| **Clerk** | Sign-in: names, emails, phones, passwords (hashed), sessions, device and IP data, `publicMetadata` roles, legal acceptance | USA | Processor | DPA at `clerk.com/legal/dpa`, with the EU clauses (Modules 2 and 3); sub-processors at `clerk.com/legal/subprocessors`, 15 days' notice of changes | Confirm the DPA applies on the plan in use; subscribe to sub-processor notices |
| **Vercel** | Runs the app, so every request passes through it; runtime and access logs (IP addresses, URLs) | USA, plus its edge network; functions in the region set (AGENTS.md suggests `cle1` or `iad1`) | Processor | Vercel publishes a DPA; one review says it is tied to paid plans | **Use a paid (Pro) plan** for production and confirm the DPA covers it; set log retention as short as the plan allows |
| **Stripe** | Card payments: card details (AfriDeal never sees them), payer name, email, billing address, payment metadata AfriDeal sends | USA and other regions | **Partly controller**: Stripe processes some data for its own legal duties (fraud, anti-money-laundering) | Stripe's DPA is part of the Stripe Services Agreement; accepted when the account is activated | Send Stripe only what payment needs (order reference, amount, email), not delivery addresses or phone numbers; name Stripe as a recipient in the privacy notice |
| **Sanity** | Catalogue, suppliers and their contact people, supplier offers, and the people directory that roles sync from (`scripts/sync-users-to-clerk.mjs`) | **To confirm** (region set per project) | Processor | Sanity publishes a DPA (**to confirm** its current address and plan) | Check the region of project `bly84glb`; keep buyers' data out of Sanity |
| **Couriers** (Gorosa and others, spec 0008) | A buyer's name, phone, delivery address and parcel contents, for one delivery; cross-border couriers pass them to customs | The courier's country, often across a border | **To confirm**: if the courier contracts with the buyer and is paid by them (spec 0009: the courier fee is paid to the courier), it is an **independent controller**; if AfriDeal books and pays it, a **processor** | A short **data sharing agreement** with each courier either way | Below |
| **Runners** | Pickup and drop-off addresses, buyer phone numbers, for their jobs | Their own phones | Act under AfriDeal's authority | The runner terms, accepted at approval (spec 0005) | A confidentiality clause: use buyer details only for the job, delete them from their phone after delivery, never contact a buyer for anything else |
| **Suppliers** | The orders placed with them and, where they ship, the delivery details | Their own systems | Independent controllers for their own records | The supplier terms (scope feature 27) | A data clause: use buyer details only to fulfil the order; no marketing to AfriDeal's buyers; report any breach to AfriDeal within 24 hours |

## The courier data sharing agreement

Whichever role the lawyer settles on, each courier signs a short agreement
that covers:

1. **Purpose**: the buyer's details are for that delivery, customs clearance
   and delivery support only. No marketing, no resale, no other use.
2. **Minimum data**: name, phone, delivery address, parcel description and
   value for customs. Nothing more.
3. **Security and confidentiality**: access limited to staff who need it;
   reasonable technical measures.
4. **Breach**: tell AfriDeal within **24 hours** of becoming aware, so
   AfriDeal can meet its 72 hours.
5. **Retention**: delete the buyer's details when the delivery and any claim
   are closed, except what customs or tax law makes the courier keep.
6. **Cross-border**: where the courier passes data to customs or a partner in
   another country, only as the delivery requires.
7. **Requests**: pass any request from a buyer about their data to AfriDeal
   within 5 days.
8. **If a processor**: also the Botswana s 56 terms in the table above.

## Future providers

Add a row here, and to the privacy notice, before switching any of these on:

- the **email** provider for order emails (scope feature 11);
- the **SMS** and **WhatsApp** provider for alerts (scope feature 12);
- **DPO** (the payment gateway) when its application is approved (spec 0009
  answer 8);
- the **Botswana host** for the backup copy (checklist, Botswana row 2): this
  one is a processor too, and needs the same terms;
- an **error monitoring** service (scope feature 16): set it to scrub request
  bodies and personal fields before they leave the app.

For each: what data it receives, where it is stored, its DPA, its
sub-processors, and whether the Eswatini registration needs updating (changes
within 14 days, EDPA Notice 1/2024 para 16).
