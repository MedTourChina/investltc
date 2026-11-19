---
layout: ../layouts/ProseLayout.astro
title: "Method"
description: "How the channel data is gathered, what the four statuses mean, how friction is scored, and what we do when we are wrong."
kicker: "Method"
updated: 2026-11-19
---

## What this site is

A structured record of which onshore investment channels in China are open to which kind of foreign
investor, what it takes to open them, and how hard they are to exit. It is not a broker, an adviser,
a fund supermarket or a news site.

## Who it is built for

Individuals. Every page is written for a person deciding whether to walk into a branch, not for a
company sourcing a product. The two institutional columns in the matrix are context: they show which
doors exist for funds and companies, which is the reason those doors are not open to an individual.

If you are looking for someone to manage money for you, this is the wrong site â€?and that is
deliberate. We describe access, not allocation.

## Where the data comes from

Each channel record has a `lastVerified` date and a `verifiedBy` field with one of five values:

| Value | Meaning |
|---|---|
| `document` | Compiled from official documents and published terms, not tested in person |
| `official-site` | Checked against the institution's own published terms |
| `phone` | Confirmed with a staff member by phone, including the date |
| `branch` | Confirmed by a visit to a specific branch, with the city recorded |
| `app` | Confirmed by walking through the onboarding flow in the app |

**This build is mostly `document`.** That means the structure is right and the details may be wrong.
The prototype banner exists because of that, and it comes down only when the first field notes land.

## The three questions

Every phone call and branch visit uses the same script, so that answers are comparable:

1. Can a foreign passport holder open this **at this branch**?
2. What documents are required, exactly?
3. Must it be done in person, and how long does it take?

The answers are recorded with the date, the city and â€?where given â€?the staff member's name. When
the phone answer and the branch answer disagree, the branch answer wins and the disagreement is
recorded as a caveat.

## The four statuses

| Status | Test |
|---|---|
| Open | A published route exists for this investor type |
| Conditional | A route exists but depends on documents, branch, amount or language |
| Not available | No general route exists for this investor type |
| Not verified | We have not checked this combination |

â€œNot verifiedâ€?is deliberate. A blank would read as â€œnoâ€? and a guess would read as â€œyesâ€? Neither is
honest.

## The friction score

Friction is a weighted average of five sub-scores, each from 1 to 5:

| Component | Weight | What raises the score |
|---|---|---|
| Documents | 25% | More documents, notarisation, translations |
| In person | 20% | Mandatory branch visits, appointments |
| Language | 20% | Chinese-only forms, apps or counters |
| Minimum size | 20% | Higher minimum subscription |
| Exit | 15% | Lock-ups, settlement delays, branch-only withdrawals |

Higher means harder. **Returns are never scored.** If a channel pays more but is harder to enter, the
score does not move.

## Freshness

- Under 90 days: shown as current.
- 90â€?80 days: marked as possibly out of date.
- Over 180 days: removed from the default matrix until re-checked.

The date on the page is the date of the last check, not the date the page was written.

## Corrections

If something is wrong, tell us. We aim to respond within seven days, and we record the correction in
[Updates](/updates). If an institution disputes a record, we re-verify before changing it â€?we do not
delete a factual observation because it is unwelcome, and we do not keep one that we cannot support.

## Money

There are no ads, no affiliate links, no sponsorship, no referral fees and no paid placement. Nobody
can pay to change a status or a friction score. This is a deliberate constraint: the moment a channel
can pay, the matrix stops being useful.

## Limits

- **Not advice.** Nothing here is investment, tax or legal advice, and nothing is personalised.
- **Not exhaustive.** Eighteen channels is a starting set, not the market.
- **Not uniform.** Branch practice varies by city and by staff member.
- **Not permanent.** Rules change; that is why every page carries a date.

## AI

AI tools are used for drafting and editing. Facts, statuses and dates are checked against documents
by a person, and every claim that matters carries a source and a date. We do not generate channel
records automatically, because a plausible-sounding wrong answer is worse than a blank.

## Reusing the data

The dataset is published as JSON at [`/api/channels.json`](/api/channels.json) under CC BY 4.0. If you
build something with it, a link back is appreciated and a correction is even better.
