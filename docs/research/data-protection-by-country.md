# Data protection in AfriDeal's launch countries

**Date**: 2026-10-23 · **For**: spec 0009 (answer 9, open questions 1 and 2) ·
**Status**: checked against the gazetted text of all four Acts and the
regulators' own sites on 2026-10-23. **Not legal advice**: a lawyer admitted
in each country should sign off before launch. The practical guidance built
on this note is in [docs/compliance/](../compliance/README.md).

AfriDeal is one entity selling to buyers in Botswana, South Africa, Lesotho and
Eswatini (spec 0009). It collects names, emails, phones, delivery addresses and
order history, and, for runners, identity documents (spec 0005). It stores them
with Neon (Postgres, AWS `us-east-2`, USA), Clerk (USA) and Vercel, with Sanity
for the catalogue and people directory and Stripe for cards (spec 0010).

This note assumes AfriDeal is a company **established in Botswana** (the
`afrideal.co.bw` domain points that way). If the selling entity is registered
elsewhere, sections 4 and 54 of Botswana's Act and the "does it reach
AfriDeal" row below change; tell the lawyer which entity it is.

## At a glance (verified)

| | Botswana | South Africa | Lesotho | Eswatini |
|---|---|---|---|---|
| Law | Data Protection Act, 2024 (Act No. 18 of 2024), Gazette Extraordinary No. 144, 29 Oct 2024; assented 24 Oct 2024; in force **14 Jan 2025** (S.I. 4 of 2025, per the e-Laws index). Repealed the 2018 Act (s 100) | Protection of Personal Information Act 4 of 2013 (POPIA); Regulations 2018 as amended by the Regulator (signed 21 Jan 2025, gazetted 17 Apr 2025) | Data Protection Act, 2011 (Act No. 5 of 2012), Gazette No. 19, 22 Feb 2012 | Data Protection Act, 2022 (Act No. 5 of 2022), Gazette Extraordinary No. 41, 4 Mar 2022 |
| Regulator | Information and Data Protection Commission (continued by s 6) | Information Regulator | Data Protection Commission (s 6), **never appointed** | Eswatini Communications Commission, acting as the Eswatini Data Protection Authority (EDPA) |
| Does it reach AfriDeal? | Yes: a controller established in Botswana (s 4(1)); also any controller offering goods to people in Botswana (s 4(2)(b)) | Probably: a responsible party not domiciled in SA is covered if it "makes use of automated or non-automated means in the Republic" (s 3(1)(b)(ii)). SA suppliers, runners and couriers working through AfriDeal's app point that way. **To confirm** | Probably, on the same test as SA (s 3(b)) | Yes: s 3(a) covers controllers "whether or not domiciled" in Eswatini, and the EDPA says controllers outside Eswatini processing data of people in Eswatini must register (Notice 1/2024, para 6(3)) |
| Register / notify | **No general registration duty** in the 2024 Act. Keep a record of processing (s 60). A data protection officer is required only in s 69(1)'s cases; if one is designated voluntarily, inform the Commission in writing (s 69(2)). No fee found | Register an **Information Officer** with the Regulator before they act (s 55(2)), on the eServices portal. No fee found | Notify the Commission before processing (ss 25(5), 53). Impossible while the Commission does not exist; keep the s 53(2) particulars ready | **Register as a data controller** before processing (s 46(8); EDPA Notice 1/2024). Fee by annual turnover (below). Register the DPO too (EDPA DPO Guideline 2023, para 16) |
| Sending data abroad (USA hosting) | Allowed only under Part XIV (ss 74–78) **and** "a copy of the personal data being transferred remains in Botswana for the period of processing" (s 74 proviso). No adequacy decision for the USA is known. Contract clauses need the Commission's specific authorisation (s 76(3)(a)) unless the Commission has adopted standard clauses (s 76(2)(c)). Derogations include explicit informed consent and contract necessity (s 78(1)(a)–(c)) | Allowed if the recipient is bound by a law, binding corporate rules or binding agreement giving substantially similar protection, including onward transfer (s 72(1)(a)); or with consent, contract necessity, or benefit of the data subject (s 72(1)(b)–(e)) | Same structure as POPIA: a law, code of conduct or contract with substantially similar principles and onward-transfer terms, or consent, or contract necessity (s 52) | Outside SADC only with an adequate level of protection (s 33(1)–(2)), or a derogation such as unambiguous consent or contract necessity (s 33(4)), or Commission authorisation with contractual safeguards (s 33(5)). The EDPA runs an **application to transfer** form for this |
| Breach notice | Commission **without undue delay and where feasible within 72 hours** of becoming aware, unless unlikely to risk people's rights (s 63(1)); reasons if later (s 63(2)); may be phased (s 63(5)); every breach documented (s 63(6)). People affected without undue delay **if high risk** (s 64) | Regulator **and** the people affected "as soon as reasonably possible" (s 22(1)–(2)), every compromise, no risk threshold. Operators tell AfriDeal "immediately" (s 21(2)). Reported through the Regulator's **eServices portal** since 1 Apr 2025 (law-firm reports; the Regulator's forms page still lists Form SCN1) | Commission and the people affected "as soon as reasonably possible" (s 23). With no Commission, notify the people affected | Commission and the people affected "as soon as reasonably possible" (s 17). The EDPA's site says breaches must be reported **within 72 hours** and takes reports online |
| Direct marketing | Right to object at any time, after which marketing stops (s 48(3)–(4)); the right must be shown at first contact, clearly and separately (s 48(5)). Consent, when relied on, must be distinguishable, plain and withdrawable (ss 27–28) | Electronic marketing (email, SMS, WhatsApp, calls) **only with opt-in consent**, asked **once** (s 69(1)–(2)); **opt-out is not consent** (Reg 6.4, 2025). Existing customers: own similar products only, with a free opt-out at collection and in every message (s 69(3)). Every message names the sender and how to stop (s 69(4)) | Right to require a controller to stop or not begin direct marketing (s 50) | Same as Lesotho (s 44); the Commission may regulate unsolicited electronic messages (s 44(4)) |
| Answering people's requests | Within **one month**, extendable by two with the Commission's approval (s 38(3)–(4)); free unless manifestly excessive (s 38(8)). Rights: access (s 42), rectification (s 43), erasure (s 44), restriction (s 45), portability in a machine-readable format (s 47), objection (s 48) | Access (s 23), correction and deletion (s 24), objection (s 11(3)); outcome of a correction or deletion request within **30 days** (Reg 3.6) | Access (s 26), correction (s 27) | Access (s 19), correction or deletion free of charge (s 20), outcome within **14 days** (s 20(5)) |
| Penalties | Administrative fines up to P10m or 2% of worldwide turnover (s 83(2)), and up to **P50m or 4%** for breaches of the principles, rights or transfer rules (s 83(3)); P500 000 or 9 years for security failures (s 84(1)) | Administrative fine up to **R10m** (s 109(2)(c)); prison up to 10 years for some offences (s 107) | Fine up to **M50 000** or 5 years (s 55); the Commission cannot fine | Administrative fine up to E5m or 2% of turnover (s 6(3)(b)); on conviction up to **E100m or 5% of turnover** or 10 years (s 53) |

## Corrections to the first draft of this note

The first draft (same day) was written from law-firm summaries. Checked
against the Acts:

1. **Botswana breach sections.** Notice to the Commission is **s 63**; s 64 is
   the notice to people affected. The draft cited s 64 for both.
2. **Botswana transfers** are ss 74–78 as the draft said, but it missed the
   **s 74 proviso**: a copy of transferred data must stay in Botswana while it
   is processed. It was added between the Bill (26 Jul 2024) and the Act; the
   Bill has no such proviso. It applies to every transfer, adequate country or
   not, and it is the biggest change for a USA-hosted app.
3. **Botswana's "legitimate interest" transfer** is narrower than the draft
   said: s 78(1)(h) needs *compelling* legitimate interests, and only when no
   adequacy decision, safeguard or binding corporate rules apply. Provider
   contracts are not a no-authorisation route: under s 76(3)(a) they need the
   Commission's specific authorisation.
4. **Botswana registration.** The 2024 Act has no registration or licensing
   duty for controllers. One secondary source says the Commission "licences"
   controllers; nothing in the Act supports that.
5. **Botswana penalties**: P50m is the ceiling of the higher fine tier, or 4%
   of worldwide turnover if higher (s 83(3)), not a turnover-scaled figure.
6. **Lesotho transfers.** The draft's "easier to SADC states" rule comes from
   a **2013 draft** that circulates online (ICT Policy Africa), not from the
   gazetted 2011 Act. The Act in force has one transfer section, s 52, built
   like POPIA s 72.
7. **Lesotho breach rule** is not unclear: s 23 requires notice to the
   Commission and the people affected as soon as reasonably possible.
8. **Lesotho's Commission** has still not been appointed. No source found
   reports an appointment or an amendment bill (searched 2026-10-23; the
   latest commentary, Mayet & Associates, says the same).
9. **Eswatini breach**: s 17, "as soon as reasonably possible" in the Act,
   **72 hours** in the EDPA's published practice.
10. **Eswatini penalties**: E100m (or 5% of turnover) is the criminal ceiling
    on conviction (s 53); administrative fines are up to E5m or 2% (s 6(3)).
11. **Eswatini registration** is real and fee-bearing (EDPA Notice 1/2024),
    and the Act's two-year transition (s 55) ended in March 2024.
12. **South Africa marketing**: Form 4 is no longer mandatory in its exact
    form; consent may be asked by any free, accessible means, including email,
    SMS or WhatsApp, and phone requests must be recorded (Reg 6.1–6.3, 2025).

## The points the draft left open, settled

### Registration and fees

| Country | Duty | Fee | Source |
|---|---|---|---|
| Botswana | None to register. Keep a record of processing (s 60); tell the Commission the DPO's contact details if one is designated (s 69(2)) | None found | Act 18 of 2024 |
| South Africa | Register the Information Officer (by default the head of the business) on `eservices.inforegulator.org.za` | None found on the Regulator's site | POPIA s 55(2); inforegulator.org.za |
| Lesotho | Notify the Commission (s 53) | None (no Commission) | Act 5 of 2012 |
| Eswatini | Register as a data controller at `edpa.org.sz` before processing; register a DPO; renew yearly; tell the EDPA of changes within 14 days | Once-off registration **E500** if annual turnover is up to E500 000 (no renewal fee); otherwise **E3 000** once-off plus a yearly renewal of **E5 000** (turnover to E1m), **E6 000** (to E25m), **E10 000** (to E50m), **E15 000** (to E75m), **E20 000** (to E100m), **E30 000** (above) | EDPA Notice 1/2024, paras 8–17. The fee table's PDF has merged cells; that E3 000 applies to every band from B to G is our reading. **To confirm** with the EDPA |

Whether "annual turnover" for the Eswatini band means AfriDeal's turnover in
Eswatini or overall is not defined ("total income made by an Entity over a
year"). **To confirm.**

### Sending data to the USA

The answer differs by country, and Botswana decides the design.

- **Botswana** (strictest). Three things together:
  1. **Keep a copy in Botswana** (s 74 proviso): a regular encrypted backup of
     the personal data, held in Botswana, for as long as the data is processed
     abroad.
  2. **A transfer basis.** No adequacy decision covers the USA. A
     Werksmans-drafted privacy notice (Sept 2025) states the Commissioner has
     declared South Africa, Switzerland and the UK adequate; we found no
     Commission publication to confirm it. The providers' contracts (DPAs with
     standard clauses) count only once the Commission authorises them
     (s 76(3)(a)), unless the Commission has adopted standard clauses of its
     own (s 76(2)(c)); none found. Until then, the bases available are
     **explicit consent after being told the risks** (s 78(1)(a)) and
     **contract necessity** (s 78(1)(b)–(c)), documented as s 78(4) requires.
  3. **Ask the Commission** for authorisation of the provider contracts, or
     whether standard clauses are coming. **Lawyer.**
- **South Africa and Lesotho**: a signed DPA with each provider whose terms
  match POPIA's conditions and limit onward transfers (s 72(1)(a); Lesotho
  s 52(a)), with consent as a backstop. Standard-clause DPAs built for the GDPR
  are commonly treated as meeting this; **to confirm**.
- **Eswatini**: register first (the EDPA's transfer form says an unregistered
  controller "cannot transfer personal data"), then file the EDPA's
  "Authorisation to transfer personal data outside of the Kingdom of Eswatini"
  form, naming Neon, Clerk, Vercel, Stripe and Sanity and their safeguards.
  Consent and contract necessity (s 33(4)) cover the gap until it is granted.

Moving hosting to South Africa would not remove the Botswana copy rule: s 74's
proviso applies to every transfer, adequate or not.

### Breach deadlines and who to tell

One clock for all four: **72 hours from awareness** (Botswana's s 63, and the
EDPA's practice). South Africa and Lesotho's "as soon as reasonably possible"
is met inside it.

| Country | Tell | How |
|---|---|---|
| Botswana | Commission; people affected if high risk | Commission contact **to confirm**: a 2025 privacy notice lists `privacy@bocra.org.bw`, +267 395 7755, Plot 50671 Independence Avenue, Gaborone (BOCRA's address). The Commission's own site was not reachable on 2026-10-23 |
| South Africa | Regulator **and** every person affected, whatever the risk | eServices portal (`eservices.inforegulator.org.za`); people affected in writing by email, post, the website or news media (s 22(4)) |
| Lesotho | Commission (none exists) and every person affected | People affected in writing (s 23(4)) |
| Eswatini | EDPA and every person affected | Online form at `edpa.org.sz/databreach.php`; `dataprotection@esccom.org.sz`, +268 2406 7000 |

### Direct marketing

Use South Africa's rule everywhere: **opt-in, asked once, never pre-ticked**,
separate from the terms; transactional messages (order placed, paid, out for
delivery) are not marketing and need no opt-in. Every marketing message names
AfriDeal and carries a working opt-out. This also satisfies Botswana's
objection right (s 48) and Lesotho and Eswatini's stop rights (ss 50, 44).

### Lesotho's Commission

Not appointed (Act 5 of 2012 s 6; Data Protection Africa, DataGuidance,
Mayet & Associates). The Act's duties still apply and are enforceable through
the courts (civil remedies, s 49; offences, s 55). Keep the s 53 notification
particulars on file and file them if a Commission is appointed.

## Other findings that matter for AfriDeal

- **Children.** Botswana requires a parent's consent below 16 for online
  services (s 29); Eswatini treats all "data related to children" as sensitive
  (s 2) and bans processing it unless an exemption applies (s 22). Simplest
  rule: accounts are for people aged 18 or over.
- **Identity documents** (runners, spec 0005) are not "sensitive" or "special"
  data in any of the four Acts unless processed as biometrics. A photo on an ID
  card is not biometric data unless it is put through facial matching. Do not
  add face matching without a fresh look (Botswana s 30, POPIA s 26, Eswatini
  s 22). They still need strong security and a short life, which spec 0005
  already sets.
- **Processor contracts are mandatory**: Botswana s 56 (with a list of terms),
  POPIA s 21, Lesotho s 22, Eswatini s 16. See
  [processing agreements](../compliance/processing-agreements.md).
- **Impact assessment.** Botswana requires one for high-risk processing (s 65);
  holding identity documents for runners is the candidate. A short written
  assessment before spec 0005 ships is cheap insurance.
- **The 2018 Act is gone.** Scope feature 17, spec 0005 and `docs/scope/
  index.md` still cite "Botswana's Data Protection Act 2018"; they should say
  Act 18 of 2024.

## Still open (for the lawyer)

1. Whether POPIA and Lesotho's Act reach a Botswana company selling into
   South Africa and Lesotho (s 3(1)(b) and s 3(b)), and so whether a South
   African Information Officer registration and PAIA manual are needed.
2. The Botswana Commission's current contact details, whether it has adopted
   standard contractual clauses or adequacy decisions, and how to apply for
   s 76(3) authorisation.
3. What counts as a "copy" in Botswana under s 74 (a nightly encrypted backup,
   or a live replica) and whether one copy serves the data of buyers in all
   four countries.
4. Whether provider DPAs that use the EU standard clauses meet POPIA s 72(1)(a)
   and Lesotho s 52(a).
5. Eswatini: the turnover basis for the fee band, and whether the transfer
   application is needed per provider.
6. Whether couriers are AfriDeal's processors or independent controllers (see
   [processing agreements](../compliance/processing-agreements.md)).
7. Record-keeping periods under each country's tax and company law (they set
   the floor for keeping orders).

## Sources

Primary texts (read in full for the sections cited):

- Botswana: [Data Protection Act, 2024, Gazette Extraordinary No. 144, 29 Oct 2024](https://www.dpo-india.com/Resources/privacy_laws_in_africa_nations/Botswana's-Data-Protection-Act,2024.pdf) (copy of the gazette); [Data Protection Bill, 2024 (Bill No. 19 of 2024)](https://www.michalsons.com/wp-content/uploads/2025/02/Botswana-Data-Protection-Bill-2024.pdf), used to find what changed; [e-Laws index, Act 18 of 2024](https://e-laws.botswanalaws.com/?p=2905) for the commencement date
- South Africa: [POPIA, Government Gazette No. 37067, 26 Nov 2013](https://www.gov.za/sites/default/files/gcis_document/201409/3706726-11act4of2013protectionofpersonalinforcorrect.pdf); [Amendment of the POPIA Regulations, signed 21 Jan 2025](https://inforegulator.org.za/wp-content/uploads/2025/04/POPIA-2021-Regulations-FINAL-21-Jan-2025.pdf); [Information Regulator](https://inforegulator.org.za/) (Information Officer portal, contacts)
- Lesotho: [Data Protection Act, 2011, Gazette No. 19, 22 Feb 2012](https://dataprotection.africa/wp-content/uploads/2022/09/Lesotho_DPA.pdf) (scan of the gazette; LesothoLII's copy sits behind a bot check); the [2013 draft](https://ictpolicyafrica.org/api/documents/download?_id=5d9432b89b93fa001b80406f) that the first draft of this note relied on
- Eswatini: [Data Protection Act, 2022, Gazette Extraordinary No. 41, 4 Mar 2022](https://esccom.org.sz/wp-content/uploads/2026/02/DATA-PROTECTION-ACT.pdf); [EDPA](https://www.edpa.org.sz/) (registration, breach reporting, transfer form); [EDPA Notice 1/2024, registration and fees](https://edpa.org.sz/assets/documents/EDPA%20NOTICE%201%202024%20-%20FINAL%20DECISION%20ON%20THE%20REGISTRATION%20OF%20DATA%20CONTROLLERS%20AND%20DATA%20PROCESSORS.pdf); [EDPA registration guide](https://edpa.org.sz/assets/documents/ESWATINI%20DATA%20PROTECTION%20AUTHORITY_%20REGISTRATION%20GUIDE%20.pdf); [EDPA DPO guideline, 2023](https://www.edpa.org.sz/assets/documents/Notice%207.pdf); [EDPA transfer application form](https://www.edpa.org.sz/assets/documents/APPLICATION%20FORM_%20TRANSFER.pdf)

Secondary (used only where marked):

- [Werksmans-drafted Astron Energy Botswana privacy addendum, Sept 2025](https://astronenergy.co.za/media/vh2bjfz2/astron-energy-botswana-addendum-to-external-privacy-notice-exec-01072025-92669121.pdf) (reported adequacy decisions and Commission contacts)
- [Michalsons on the Regulator's breach portal](https://www.michalsons.com/blog/guideline-notification-of-security-compromises-to-the-information-regulator/58993); [MJK on the 2025 regulation changes](https://mjkinc.co.za/popia/regulations-2025-amendments)
- [Data Protection Africa: Lesotho](https://dataprotection.africa/lesotho/); [Mayet & Associates on Lesotho's Act](https://zmayetlaw.co.ls/lesothos-outdated-data-protection-act-no-commissioner-no-teeth-what-should-change-next/); [CIPIT on Botswana's 2018 and 2024 Acts](https://cipit.strathmore.edu/understanding-botswanas-2018-and-2024-data-protection-acts/)
