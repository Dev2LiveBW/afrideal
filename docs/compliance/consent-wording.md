# Consent wording

**Date**: 2026-10-23 · **Status**: proposal for the lawyer's review; **not
legal advice**. Where each box goes in the app is in
[product changes](product-changes.md).

## Rules the wording follows

- **Never pre-ticked.** Opt-out is not consent for electronic marketing in
  South Africa (POPIA Reg 6.4, 2025), and Botswana requires consent the
  controller can prove (s 27(1)).
- **One purpose per box.** A consent bundled with other matters must be
  "clearly distinguishable" (Botswana s 27(2)); marketing never rides on the
  terms checkbox.
- **Terms are not consent.** Running an account and delivering an order rest
  on the contract, not on consent. If AfriDeal made the account depend on
  consent to something the account does not need, Botswana treats that consent
  as invalid (s 27(4)). So the required boxes cover only what the service
  needs.
- **Tell people they can withdraw** before they consent (Botswana s 28(3)),
  and make withdrawing as easy as giving (s 28(2)(b)).
- **Ask for marketing consent once.** If someone declines, do not ask again by
  email, SMS or WhatsApp (POPIA s 69(2)(a)).
- **Record it**: who, what wording (a version number), which channel, when,
  where in the app, and when withdrawn.
- **Translate** each text into Setswana and Sesotho (scope feature 19) with a
  fluent speaker; the English is the reviewed version.

## 1. Sign-up (required)

Shown on `/sign-up` under the email and password fields. The account cannot be
created without both boxes.

> ☐ I am 18 or older, and I agree to AfriDeal's [Terms of Sale](/terms). I
> have read the [Privacy Notice](/privacy), which explains how my information
> is used.

> ☐ I agree that my information is stored and processed in the **United
> States** by AfriDeal's service providers (Neon, Clerk and Vercel), with a
> copy kept in Botswana. I understand that the USA does not have a data
> protection law like Botswana's or South Africa's, so my information there is
> protected by AfriDeal's contracts with those providers rather than by local
> law. Without this, AfriDeal cannot open my account. I can close my account
> at any time.

*Why the second box:* Botswana allows a transfer without an adequacy decision
or approved safeguards when the person "has explicitly consented ... after
having been informed of the possible risks" (s 78(1)(a)). Eswatini (s 33(4)(a)),
South Africa (s 72(1)(b)) and Lesotho (s 52(b)) accept consent too. The
wording names the risk because Botswana requires it. **To confirm** with the
lawyer: whether a consent that is a condition of the account can stand under
s 27(4), given the hosting is necessary to provide it. If not, rely on
contract necessity (s 78(1)(b)) and turn this box into a notice.

*Where it is recorded:* Clerk's legal acceptance records the first box
(`legal_accepted_at` on the Clerk user). The second goes into the `users` row
(see [product changes](product-changes.md#1-sign-up-consents)).

## 2. Marketing (optional)

Asked **once**, on the welcome step straight after sign-up (scope feature 25
has the welcome step), and never again by electronic message if declined. Not
on the checkout page.

> **Offers from AfriDeal** (optional)
>
> Would you like to hear about deals, new suppliers and restocks? Choose how:
>
> ☐ Email ☐ SMS ☐ WhatsApp
>
> We'll only send offers on the channels you tick. You can stop at any time
> from your account or from any message.

*Why per channel:* POPIA's Form 4 asks the person to choose their preferred
channels (Reg 6, 2025), and a WhatsApp number may not be the SMS number.

*The existing-customer route.* POPIA s 69(3) lets AfriDeal market its own
similar products to customers who were given a free opt-out at the time of
sale and in every message. It is lawful in South Africa, but it needs its own
"no offers, please" box at checkout and careful scoping, and it does not help
in Botswana, where the objection right applies anyway. Recommendation: **do
not use it.** Opt-in only, everywhere, is one rule that is lawful in all four
countries.

## 3. Every marketing message

Required by POPIA s 69(4) and Botswana s 48(5) (the objection right shown at
first contact, clearly and separately).

Email footer:

> You're receiving this because you asked AfriDeal for offers by email.
> [Unsubscribe] in one click, or reply STOP. AfriDeal, [company name],
> [address], [privacy@afrideal.co.bw].

The first marketing email to each person also carries, set apart from the
offer:

> You can tell us to stop sending you marketing at any time, free of charge,
> and we will stop. [Unsubscribe]

SMS (fits in one 160-character message with a short offer):

> AfriDeal: [offer]. Reply STOP to opt out.

WhatsApp: the same as SMS; honour "STOP" or "Unsubscribe" replies.

Order, payment and delivery messages (scope features 11 and 12) are
**transactional**: they carry no offers and need no opt-in. If one ever
includes an offer, it becomes marketing.

## 4. Withdrawing

In the account (Account → Privacy):

> **Marketing** · Email ☑ SMS ☐ WhatsApp ☐ · [Save]
>
> Unticking stops offers on that channel straight away.

Confirmation after an unsubscribe link:

> Done. You won't get offers from AfriDeal by [email] any more. Messages
> about your orders will still arrive.

## 5. Runner application (`/drive`, spec 0005)

A notice, not a consent: checking identity is a legitimate interest and a step
before a contract. Shown above the document uploads.

> **Why we need your documents**
>
> Before you deliver for AfriDeal we check who you are and that you may drive.
> Your identity document, licence and vehicle registration are stored in
> private storage that only our operations team can open, through links that
> expire within 5 minutes, and every view is logged. We delete them 90 days
> after a rejection or withdrawal, or 1 year after you stop being a runner.
> See the [Privacy Notice](/privacy).
>
> ☐ The documents are mine and the details are true.

## 6. What to record for each consent

| Field | Example |
|---|---|
| `purpose` | `TRANSFER_ABROAD`, `MARKETING_EMAIL`, `MARKETING_SMS`, `MARKETING_WHATSAPP` |
| `given` | `true` / `false` (a "no" is recorded too, so the person is not asked again) |
| `wording_version` | `2026-10-v1` (the text in this file, kept in the repo) |
| `source` | `sign-up`, `welcome`, `account`, `unsubscribe-link`, `sms-stop` |
| `at` | ISO timestamp |
| `withdrawn_at` | ISO timestamp, or null |

Keep the record while the consent stands and for 3 years after it is
withdrawn, to prove what was agreed.
