# Obligations checklist

**Date**: 2026-10-23 · **Not legal advice**; see the [README](README.md).
Sections are from the Acts as read in
[the research note](../research/data-protection-by-country.md).

"Before launch" means before the first real buyer's data reaches production.
PO = product owner, DPO = data protection officer (the PO until one is named).

## Every country (do once, covers all four)

| # | What | Who | By when |
|---|---|---|---|
| 1 | Name a **data protection officer**, with a dedicated email (`privacy@afrideal.co.bw`) and phone. Publish the contact in the privacy notice | PO | Before launch |
| 2 | Brief a **lawyer** in Botswana (and South Africa) with the research note's "Still open" list; get written sign-off | PO | Before launch |
| 3 | Write the **record of processing**: what data, why, legal basis, who receives it, where it is stored, how long it is kept, security. The tables in the [privacy notice](privacy-notice-draft.md) are the start. Botswana s 60 requires it; it also feeds Eswatini's registration and Lesotho's s 53 notice | DPO | Before launch; review every 6 months |
| 4 | Sign the **data processing agreements** with Neon, Clerk, Vercel, Stripe and Sanity, and data sharing terms with each courier ([list](processing-agreements.md)) | PO | Before launch |
| 5 | Publish the **privacy notice** and link it from sign-up, checkout, the footer and the runner application (scope feature 17) | PO approves, developer builds | Before launch |
| 6 | Add the **sign-up consents** (terms and privacy, hosting abroad, age 18+) and the separate **marketing opt-in** ([wording](consent-wording.md)) | Developer | Before launch |
| 7 | Set up the **Botswana copy**: an encrypted backup of the `afrideal` schema, restore-tested, held on storage physically in Botswana (see Botswana row 2) | Developer, PO picks the host | Before launch |
| 8 | Adopt the [breach runbook](breach-runbook.md); put the regulators' contacts in it; run a 30-minute tabletop exercise | DPO | Before launch, then yearly |
| 9 | Stand up the **requests process**: buyers can download their data and ask for deletion; staff answer any request within **14 days** (Eswatini s 20(5) is the shortest clock) | Developer builds, DPO answers | Before launch |
| 10 | Apply the **retention schedule** in [product changes](product-changes.md#5-retention-periods-and-the-clean-up-job) and switch on the clean-up job | Developer; accountant confirms tax periods | Before launch |
| 11 | Write a short **impact assessment** for runner identity documents (spec 0005) before that feature ships | DPO | Before spec 0005 goes live |
| 12 | Make every staff member, runner and supplier who sees buyer data sign a **confidentiality undertaking** (all four Acts require people acting under AfriDeal's authority to keep data confidential: Botswana s 62(4), POPIA s 20, Lesotho s 21, Eswatini s 15) | PO | Before they get access |
| 13 | Accounts only for people **aged 18 or over** (Botswana s 29; Eswatini treats children's data as sensitive, s 22) | Developer | Before launch |

## Botswana (Data Protection Act 18 of 2024)

| # | What | Who | By when |
|---|---|---|---|
| 1 | No registration is required. If a DPO is designated (row 1 above), tell the Commission their contact details in writing and display them (s 69(2)) | DPO | Within a month of naming the DPO |
| 2 | **Keep a copy in Botswana** of all personal data sent abroad, for as long as it is processed there (s 74 proviso). Recommended: nightly `pg_dump` of the `afrideal` schema plus Clerk's user export, encrypted with a key AfriDeal holds, stored with a hosting provider whose data centre is in Botswana; keep 30 days of copies; test a restore quarterly. **To confirm** with the lawyer that a backup counts as a "copy" | Developer; PO contracts the host | Before launch |
| 3 | **Transfer basis for the USA.** Until the Commission authorises the providers' contracts or adopts standard clauses (s 76), rely on explicit informed consent at sign-up (s 78(1)(a)) and on contract necessity for payment and delivery (s 78(1)(b)–(c)). Record the reasoning (s 78(4)) | PO with lawyer | Before launch |
| 4 | Write to the Commission asking (a) whether it has adopted standard clauses or adequacy decisions, (b) for authorisation of the provider DPAs under s 76(3)(a) | Lawyer | Before launch; the answer may take months |
| 5 | Answer requests within **one month** (s 38(3)); free (s 38(8)); give data in a machine-readable format on request (s 47) | DPO | Ongoing |
| 6 | Breach: notify the Commission within **72 hours** of awareness unless no risk (s 63); tell people if high risk (s 64); log every breach (s 63(6)) | DPO | Ongoing |
| 7 | Show the right to object to marketing at the **first** marketing contact, clearly and separately (s 48(5)) | Developer | Before the first marketing message |
| 8 | Impact assessment for high-risk processing (s 65); the runner identity documents are the case to assess (row 11 above) | DPO | Before spec 0005 goes live |

## South Africa (POPIA, Act 4 of 2013)

| # | What | Who | By when |
|---|---|---|---|
| 1 | **Register the Information Officer** (the DPO) on `eservices.inforegulator.org.za` before they act (s 55(2)). No fee found. **To confirm** POPIA reaches AfriDeal (s 3(1)(b)); if in doubt, register | PO | Before the first South African buyer |
| 2 | Ask the lawyer whether a **PAIA manual** is also needed (it is for South African private bodies; unclear for a foreign one) | Lawyer | Before launch |
| 3 | Transfer basis: signed provider DPAs that bind them to POPIA-level protection and limit onward transfers (s 72(1)(a)); consent at sign-up as backstop (s 72(1)(b)) | PO | Before launch |
| 4 | Every processor must tell AfriDeal of a breach **immediately** (s 21(2)); put it in each DPA | PO | Before launch |
| 5 | Breach: notify the Regulator through the **eServices portal** and **every** person affected, as soon as reasonably possible, whatever the risk (s 22) | DPO | Ongoing |
| 6 | **Marketing opt-in**: electronic marketing only with consent, asked once; opt-out is not consent (s 69, Reg 6.4). Existing customers may get offers on AfriDeal's own similar products if they were given a free opt-out at collection and in every message (s 69(3)) | Developer, PO for campaigns | Before the first marketing message |
| 7 | Answer an objection or correction request and tell the person the outcome within **30 days** (Reg 3.6); accept requests by email, SMS or WhatsApp (Regs 2.3, 3.4) | DPO | Ongoing |

## Lesotho (Data Protection Act, 2011, Act 5 of 2012)

| # | What | Who | By when |
|---|---|---|---|
| 1 | The Commission is **not appointed**, so notification (s 53) cannot be filed. Keep the s 53(2) particulars (the record of processing) ready and file within the first month if a Commission is appointed | DPO | Check every 6 months |
| 2 | Tell buyers at collection what is collected, why, who receives it and their rights (s 25(1)); the privacy notice does it | PO | Before launch |
| 3 | Transfer basis: provider contracts with substantially similar protection and onward-transfer terms, or consent (s 52) | PO | Before launch |
| 4 | Breach: tell the people affected in writing as soon as reasonably possible (s 23); the Commission too, if one exists | DPO | Ongoing |
| 5 | Stop marketing to anyone who asks (s 50) | Developer | Before the first marketing message |

## Eswatini (Data Protection Act 5 of 2022)

| # | What | Who | By when |
|---|---|---|---|
| 1 | **Register as a data controller** on `edpa.org.sz` (s 46; EDPA Notice 1/2024). Mandatory once AfriDeal holds data of more than 10 people, and "a data controller shall process personal information only upon notification" (s 46(8)). Fee: **E500** once-off if annual turnover is up to E500 000; otherwise **E3 000** plus a yearly renewal from **E5 000** (fee table in the research note; **to confirm** which turnover counts) | PO | **Before the first Eswatini buyer signs up** |
| 2 | **Register the DPO** with the EDPA (DPO Guideline 2023, para 16); the registration form asks for them | PO | With row 1 |
| 3 | File the EDPA's **application to transfer personal data outside Eswatini** (form on `edpa.org.sz`), naming Neon, Clerk, Vercel, Stripe and Sanity, the data sent and the safeguards. Rely on consent and contract necessity (s 33(4)) until it is granted | PO | Straight after row 1 |
| 4 | Display the registration certificate; apply to renew **3 months before expiry**; pay the renewal within a month (Notice 1/2024, para 17) | PO | Yearly |
| 5 | Tell the EDPA of any change in the registered particulars within **14 days** (Notice 1/2024, para 16): a new provider, a new data category | DPO | Ongoing |
| 6 | Breach: notify the EDPA (online form, `edpa.org.sz/databreach.php`) within **72 hours** and the people affected (s 17) | DPO | Ongoing |
| 7 | Correct or delete on request, free, and tell the person the outcome within **14 days** (s 20(5)) | DPO | Ongoing |
| 8 | Stop marketing to anyone who asks (s 44) | Developer | Before the first marketing message |

## Calendar

| When | What |
|---|---|
| Now | Name the DPO; brief the lawyer; ask Botswana's Commission about s 76 |
| Before staging takes real buyers | Provider DPAs signed; Botswana copy running; consents and privacy notice live; Eswatini registration and transfer application filed; South African Information Officer registered |
| Before spec 0005 ships | Runner documents impact assessment |
| Before the first marketing message | Opt-in flag, unsubscribe link, consent records |
| Every 6 months | Review the record of processing, this checklist and the providers' sub-processor lists; check Lesotho and Botswana for new rules |
| Every year | Eswatini renewal; breach tabletop exercise |
