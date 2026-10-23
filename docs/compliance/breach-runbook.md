# Breach response runbook

**Date**: 2026-10-23 · **Status**: draft; **not legal advice**. Print the
"First hour" box and the contacts table and keep them where the team can find
them offline.

## The one rule

**The regulators must hear from us within 72 hours of the moment anyone at
AfriDeal becomes aware of a breach.** That is Botswana's deadline (Act 18 of
2024, s 63(1)) and the Eswatini regulator's stated practice. South Africa and
Lesotho ("as soon as reasonably possible": POPIA s 22, Lesotho s 23) are met
inside it. A late notice must give the reasons for the delay (Botswana
s 63(2)). Not knowing everything yet is no reason to wait: notify what is
known and send the rest in phases (s 63(5)).

## What counts as a breach

Any time personal information is, or may have been, lost, destroyed, changed,
seen or taken by someone who should not have it. For example:

- a database connection string, API key or admin password leaks (in a commit,
  a screenshot, a chat);
- someone signs in to another person's account, or a staff account is taken
  over;
- an identity document link is shared outside the operations team;
- a supplier, runner or courier sends a buyer's details to the wrong person;
- a laptop or phone with access is lost or stolen;
- a provider (Neon, Clerk, Vercel, Stripe, Sanity, a courier) tells us of a
  breach on their side;
- an export or backup (including the Botswana copy, or an `e2e-*` Neon branch
  left behind) ends up somewhere public.

When in doubt, treat it as a breach and start the clock. A false alarm costs
an hour; a missed one can cost a fine.

## Who does what

| Role | Who | Does |
|---|---|---|
| Incident lead | The DPO (the product owner until one is named) | Owns the clock, decides, signs every notice |
| Technical lead | The developer on call | Contains, investigates, preserves evidence |
| Lawyer | [name, phone] | Reviews notices before they go, if reachable in time; a notice is not held for them past hour 60 |

## First hour

1. **Write down the time** someone first knew. The 72 hours start there.
2. **Open a breach log entry** (template below). Everything goes in it.
3. **Contain**, without destroying evidence:
   - Leaked database credentials: rotate the Neon role password, then re-run
     `neon link` so `.env.local` is rewritten (never hand-edit those lines,
     see AGENTS.md), and update the Vercel environment.
   - Leaked keys: roll `CLERK_SECRET_KEY`, the Stripe keys,
     `SANITY_API_WRITE_TOKEN` and `CRON_SECRET` in each provider's dashboard
     and in Vercel; redeploy.
   - Account takeover: revoke the user's sessions and reset their sign-in in
     Clerk; suspend the user in the app.
   - Exposed document link: the link expires within 5 minutes (spec 0005);
     check the audit log for `RUNNER_DOCUMENT_VIEWED`.
   - Lost device: sign it out of Clerk, Vercel, Neon, Sanity, Stripe and
     GitHub.
4. **Preserve evidence**: take a Neon branch or snapshot of the state before
   cleaning up; export Vercel logs and the app's audit log for the window.
5. **Tell the incident lead** if they are not already involved.

## Hours 1 to 24: understand it

Answer, and write the answers in the log:

- What data? Names, emails, phones, addresses, orders, identity documents,
  payment references? (Card numbers never reach AfriDeal: Stripe holds them.)
- Whose, and how many? Count by country: Botswana, South Africa, Lesotho,
  Eswatini, elsewhere.
- Is it contained? Is it still happening?
- How likely is harm, and how bad? Identity documents, or an address with a
  phone number, are **high risk** (fraud, impersonation, a stranger at the
  door). Encrypted data whose key was not exposed is low risk.
- Which processor or courier is involved, and have they told us? (Every DPA
  must require them to tell us immediately: POPIA s 21(2), Botswana s 63(3).)

## Hours 24 to 48: decide and draft

| Country of the people affected | Tell the regulator? | Tell the people? |
|---|---|---|
| Botswana | Yes, unless the breach is unlikely to risk anyone's rights (s 63(1)). If you decide not to, record why (s 63(6)) | Yes if **high risk** (s 64(1)), unless the data was encrypted and the key safe, the risk has been removed, or it would take disproportionate effort (then a public notice) (s 64(3)) |
| South Africa | **Always** (s 22(1)) | **Always**, unless their identity cannot be established (s 22(1)(b)) |
| Lesotho | The Commission does not exist; record the decision | **Always** (s 23(1)) |
| Eswatini | **Always** (s 17(1)) | **Always**, unless identity cannot be established (s 17(1)(b)) |

Delay telling the people affected only if the police or the regulator say a
notice would hinder a criminal investigation (POPIA s 22(3), Lesotho s 23(3),
Eswatini s 17(3)). Record who said so and when.

Draft the notices from the templates below.

## By hour 72: notify

1. **Regulators** (all at once, the same facts):

   | Country | How |
   |---|---|
   | Botswana | Information and Data Protection Commission: [**confirm**: privacy@bocra.org.bw, +267 395 7755] |
   | South Africa | Information Regulator, **eServices portal** (`eservices.inforegulator.org.za`); create the account before any breach. Email is no longer accepted (law-firm reports, 2025) |
   | Eswatini | EDPA online form, `edpa.org.sz/databreach.php`; copy to `dataprotection@esccom.org.sz` |
   | Lesotho | No regulator to tell |

2. **People affected**: in writing, by email to their last known address; if
   that fails, an SMS pointing to a notice on the website; for a large breach,
   a prominent notice on `afrideal.co.bw` as well (POPIA s 22(4), Lesotho
   s 23(4), Eswatini s 17(4)).
3. **Processors and couriers** involved: tell them what to do.
4. Record in the log exactly what went to whom and when.

## After

- Fix the cause; check the fix works.
- Answer the regulators' follow-up questions.
- Within two weeks, write a short post-incident review (`/document
  postmortem`): what happened, why, what changed.
- Update this runbook and the provider list if needed.

## Template: notice to a regulator

Covers Botswana s 63(4) and the Information Regulator's portal fields.

> **Personal data breach notification: [company name] (AfriDeal)**
>
> 1. **Who we are**: [company name], [registration number], [address].
>    Data protection officer: [name], [email], [phone].
> 2. **What happened**: [plain description]. Discovered [date, time] by
>    [how]. It started [date, time, or "not yet known"].
> 3. **Data and people**: [categories of data]. About [number] people
>    ([number] in [this country]), about [number] records.
> 4. **Likely consequences**: [for example, risk of phishing or identity
>    fraud].
> 5. **What we have done and will do**: [containment, fixes, support offered
>    to the people affected].
> 6. **Notice to the people affected**: [sent on date / will be sent on date /
>    not sent, because ...].
> 7. **If later than 72 hours**: the reason is [...].
> 8. This notice is [complete / the first of several; we will update by
>    date].

## Template: notice to the people affected

Covers POPIA s 22(5) and Botswana s 64(2).

> **Subject: Important: your AfriDeal information**
>
> Dear [name],
>
> On [date] we found that [plain description of what happened]. Your [list of
> data, for example name, phone number and delivery address] [was / may have
> been] [seen / taken] by [someone who should not have it / identity, if
> known].
>
> **What this could mean for you:** [for example, you may receive messages
> pretending to be from AfriDeal].
>
> **What we have done:** [steps].
>
> **What you can do:** [specific steps: be wary of calls asking for payment;
> AfriDeal never asks for your card number by phone or WhatsApp; change your
> password].
>
> Questions: [privacy@afrideal.co.bw], [phone]. You also have the right to
> complain to [the regulator for their country, with contacts].
>
> We are sorry. [Name], Data Protection Officer, AfriDeal

## Breach log template

Keep every entry, including false alarms and breaches not notified (Botswana
s 63(6) requires the record).

| Field | |
|---|---|
| Reference | `BR-2026-001` |
| Aware at | ISO timestamp, who |
| Reported by | |
| What happened | |
| Data and people affected | categories; counts by country |
| Risk assessment | low / risk / high, and why |
| Containment steps | timestamped list |
| Regulators notified | per country: when, how, reference number, or why not |
| People notified | when, how, how many, or why not |
| Processor or courier involved | name, when they told us |
| Root cause and fix | |
| Closed | date, by whom |

## Contacts

| | |
|---|---|
| DPO | [name, phone, email] |
| Developer on call | [name, phone] |
| Lawyer (Botswana) | [name, phone] |
| Lawyer (South Africa) | [name, phone] |
| Neon support | console.neon.tech, support ticket |
| Clerk support | dashboard.clerk.com, support |
| Vercel support | vercel.com/help |
| Stripe support | dashboard.stripe.com/support |
| Sanity support | sanity.io/contact/support |
| Couriers | [each courier's contact] |
