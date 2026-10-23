# Data protection in AfriDeal's launch countries

**Date**: 2026-10-23 · **For**: spec 0009 (open question 3) · **Status**: desk
research from law-firm and regulator summaries, not legal advice. Confirm each
point against the gazetted Act (or a local lawyer) before launch.

AfriDeal is one entity selling to buyers in Botswana, South Africa, Lesotho and
Eswatini (spec 0009). It collects names, phones, addresses, order history and,
for runners, identity documents (spec 0005), and stores them in Neon (USA,
`aws-us-east-2`), Clerk (USA) and Vercel. That makes two questions matter in
every country: **is sending the data abroad allowed**, and **what must happen
after a breach**.

## At a glance

| | Botswana | South Africa | Lesotho | Eswatini |
|---|---|---|---|---|
| Law | Data Protection Act 18 of 2024 (in force 14 Jan 2025; replaced the 2018 Act) | POPIA (Act 4 of 2013) | Data Protection Act, 2011 (Act 5 of 2012) | Data Protection Act 5 of 2022 |
| Regulator | Information and Data Protection Commission | Information Regulator | Data Protection Commission (reportedly not yet constituted) | Eswatini Communications Commission |
| Register / notify the regulator | Check (expected under the 2024 Act) | Register an Information Officer (s 55) | — | Controllers notify the Commission of processing |
| Transfer abroad | Prohibited unless adequacy, safeguards (binding agreement), explicit consent, contract necessity or legitimate interest (ss 74–78) | Allowed with a binding agreement / law giving POPIA-level protection, consent, or contract necessity (s 72) | Easier to SADC states that apply SADC rules; stricter elsewhere | Easier to SADC states (s 32); non-SADC needs adequate protection (s 33) |
| Breach notice | Commission within **72 hours**; affected people without undue delay if high risk (s 64) | Regulator and affected people as soon as reasonably possible (s 22), via the Regulator's portal | Unclear in the Act | Check the Act |
| Marketing | Consent / objection rights | **Opt-in**: one request for consent (Form 4); existing customers may get similar offers with an opt-out (s 69) | Right to object to direct marketing | Right to object |
| Penalties (reported) | Up to BWP 50m by turnover; prison for some offences | Up to ZAR 10m; prison | Through the courts | Up to E 100m reported (unconfirmed) |

## What this means for AfriDeal

1. **One privacy notice that names all four laws**, says what is collected, why,
   where it is stored (USA: Neon, Clerk, Vercel) and how to complain to each
   regulator. Scope feature 17 (legal pages) should carry it.
2. **Cross-border storage needs a basis.** The safest single basis everywhere is
   a signed data processing agreement with each provider (Neon, Clerk, Vercel,
   the card gateway), plus consent at sign-up as a backstop. Botswana's 2024 Act
   is the strictest of the four; meet it and the others mostly follow.
3. **Register where required**: an Information Officer with South Africa's
   Information Regulator; notify Eswatini's Communications Commission; check
   whether Botswana's Commission now requires registration.
4. **A breach runbook with a 72-hour clock** (Botswana's), covering who decides,
   who tells which regulator, and the template to the people affected.
5. **Marketing is opt-in.** Do not email or SMS promotions without consent,
   except offers on similar products to existing customers with an opt-out in
   every message (POPIA s 69); scope feature 12 (SMS) should follow this.
6. **Runner identity documents** (spec 0005) are the most sensitive data held:
   keep spec 0005's private bucket, signed links and deletion schedule.

## Open points to confirm with a lawyer

- Botswana: registration duty and fees under the 2024 Act; the exact
  cross-border conditions for US cloud hosting.
- Lesotho: whether the Commission is now constituted, and the breach rule.
- Eswatini: the notification form and the non-SADC transfer conditions.

## Sources

- Botswana: [MISA](https://misa.org/blog/new-botswana-data-protection-act-progressive-step-to-a-more-secure-digital-environment/), [Techhive Advisory](https://www.techhiveadvisory.africa/insights/understanding-botswanas-new-data-protection-act-key-updates-and-changes), [Michalsons](https://www.michalsons.com/blog/botswanas-data-protection-act-grace-period-extended/60775), [Werksmans](https://werksmans.com/when-the-clock-starts-ticking-why-cross-border-data-breach-response-demands-more-than-good-intentions/)
- South Africa: [Baker McKenzie checklist](https://insightplus.bakermckenzie.com/bm/data-technology/south-africa-popia-checklist), [Information Regulator enforcement notice](https://inforegulator.org.za/wp-content/uploads/2020/07/FT-RAMS-CONSULTING-ENFORCEMENT-NOTICE-210224-1.pdf), [MJK](https://mjkinc.co.za/doing-business-in-south-africa/popia-data-protection)
- Lesotho: [LesothoLII (Act text)](https://lesotholii.org/akn/ls/act/2012/5/eng@2012-02-22), [DLA Piper](https://www.dlapiperdataprotection.com/?c=LS&t=law), [DataGuidance](https://www.dataguidance.com/jurisdiction/lesotho)
- Eswatini: [Act (ESCCOM)](https://www.esccom.org.sz/legislation/DATA%20PROTECTION%20ACT.pdf), [DataGuidance overview](https://www.dataguidance.com/opinion/eswatini-overview-data-protection-act), [Hogan Lovells](https://hlc.com/en/publications/recent-developments-in-african-data-protection-laws-outlook-for-2023)
