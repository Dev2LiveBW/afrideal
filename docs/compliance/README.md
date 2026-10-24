# Data protection compliance

**Date**: 2026-10-23 · **Owner**: the product owner until a data protection
officer is named · **Status**: draft for legal review

> **This is not legal advice.** It is a working plan written from the Acts
> themselves. A lawyer admitted in Botswana should sign it off before launch,
> and ideally one in South Africa too (who can cover Lesotho and Eswatini, or
> refer). Items marked **To confirm** are the ones to put to them first.

AfriDeal sells to buyers in Botswana, South Africa, Lesotho and Eswatini
(spec 0009) and hosts their data in the USA. Four data protection laws apply.
The verified comparison, with section numbers, is in
[docs/research/data-protection-by-country.md](../research/data-protection-by-country.md).

## The five things that matter most

1. **Keep a copy of the data in Botswana.** Botswana's Act 18 of 2024, s 74,
   allows data to go abroad only if "a copy ... remains in Botswana". Hosting
   on Neon, Clerk and Vercel in the USA needs a backup held in Botswana.
2. **Register in Eswatini, and in South Africa.** Eswatini's regulator
   requires every controller handling Eswatini residents' data to register and
   pay a fee before processing. South Africa requires an Information Officer
   to be registered.
3. **Ask for consent to the USA hosting at sign-up, and sign each provider's
   data processing agreement.** Botswana does not yet recognise provider
   contracts without its Commission's approval, so consent is the bridge.
4. **72 hours.** Any breach goes to the Botswana Commission (and Eswatini's
   regulator) within 72 hours, and to South Africa's Regulator as soon as
   reasonably possible.
5. **Marketing is opt-in.** No promotional email, SMS or WhatsApp without a
   ticked box, everywhere.

## The documents

| Document | Use it to |
|---|---|
| [Obligations checklist](obligations-checklist.md) | See every duty per country, who does it, and by when |
| [Privacy notice (draft)](privacy-notice-draft.md) | Publish at `/privacy` (scope feature 17) after the lawyer's review |
| [Consent wording](consent-wording.md) | Word the sign-up, transfer and marketing checkboxes |
| [Breach response runbook](breach-runbook.md) | Act on a suspected breach, hour by hour |
| [Processing agreements](processing-agreements.md) | Sign the right contract with each provider and courier |
| [Product changes](product-changes.md) | Brief the developer on what the app must change |

## Roles used in these documents

- **Product owner (PO)**: Tshego. Decides, signs contracts, files registrations.
- **Data protection officer (DPO)**: the one person who answers buyers'
  requests and leads a breach response. South Africa calls this the
  Information Officer. Until someone is appointed, it is the product owner.
- **Developer**: builds the product changes.
- **Lawyer**: signs off; the "To confirm" items are theirs.
- **Accountant**: confirms how long tax and company law require records.

## Keeping this current

Review every six months, and whenever AfriDeal adds a country, a provider
(email, SMS, DPO payments) or a new kind of data. Watch for: Lesotho appointing
its Commission; Botswana publishing standard contractual clauses or adequacy
decisions; Eswatini changing its fee schedule.
