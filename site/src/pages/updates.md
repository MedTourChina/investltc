---
layout: ../layouts/ProseLayout.astro
title: "Updates"
description: "What changed on this site, when, and why. Corrections are logged here, not quietly edited."
kicker: "Changelog"
updated: 2026-11-22
---

## 2026-11-22 — Paths and the check now agree

- The [eligibility check](/check) shows your path above the results: what the next three steps are
  for a student, a work permit, permanent residence or a dependant. The path is derived from the
  visa answer, so it never contradicts the channels below it.
- Each [path page](/paths) now links into the check with its visa pre-filled, so the tool and the
  written page cannot drift apart on which answer they assume.
- The link checker in the build now resolves query strings, and the data validator resolves every
  Markdown layout path, because a wrong relative depth only fails at build time.

## 2026-11-22 — Four paths

- New section: [Four paths through this](/paths) — student, work permit, permanent residence and
  dependant, each with what it can skip and where it gets stuck.
- The [first thirty days](/start) page now points at it, because the sequence depends on your status.

## 2026-11-22 — A sequenced way in

- New page: [First thirty days](/start) — the order in which things can actually be opened, from the
  SIM card to the brokerage account, and why the investment account comes last.
- The homepage now leads with it, and the navigation has a Start entry.

## 2026-11-22 — Banks, e-CNY and the tax year

- New explainers on [choosing a Chinese or foreign bank](/explainers/foreign-vs-chinese-bank),
  [what e-CNY is not](/explainers/ecny), and the
  [allowances-versus-deductions choice](/explainers/foreign-tax-allowances) most foreigners miss.
- New [annual tax reconciliation playbook](/playbooks/annual-tax-settlement): the March–June window,
  the app registration that needs one trip to a tax office, and the three things that block a refund.

## 2026-11-22 — Payroll deductions, two renminbis and the exit

- New channel: [housing provident fund](/channels/housing-fund) — matched employer contributions, a
  fixed rate, and a purpose test before you can touch it.
- New [leaving China playbook](/playbooks/leaving-china): the order of operations, the tax clearance,
  and the phone number you should cancel last.
- New explainers on [housing fund and social insurance](/explainers/housing-fund-and-social-insurance),
  [CNY versus CNH](/explainers/cny-vs-cnh), and
  [where the map stops at QDII](/explainers/qdii-boundary).

## 2026-11-21 — Employee equity

- New channel: [employee equity](/channels/employee-equity) — RSUs and options, and the three things
  that decide whether the award is worth what the offer letter implies.
- New [ESOP playbook](/playbooks/esop-and-rsu): five questions before signing, the vest date, and how
  the proceeds leave the country.
- New explainer on the [three taxable moments](/explainers/equity-compensation) — grant, vest, sale.

## 2026-11-20 — Glossary and treaty relief

- New [glossary](/glossary): fifty-five terms with pinyin, filterable, grouped by where you meet them —
  accounts, products, fund mechanics, tax, cross-border.
- New explainer on [claiming a treaty rate](/explainers/treaty-relief): the certificate of tax
  residency, the order of operations, and the four places it goes wrong.

## 2026-11-19 — Four more channels, two explainers and an ETF playbook

- Added money-market funds, exchange-traded funds, exchange reverse repos and large-denomination CDs.
  The map is now nineteen channels.
- New [ETF playbook](/playbooks/etf-and-index): index first, fund second, premium third.
- New explainers on [R1–R5 risk grades](/explainers/risk-grades) and on
  [A-class versus C-class fund shares](/explainers/fund-share-classes).

## 2026-11-19 — Five more channels and a bonds playbook

- Added exchange-traded bonds, public REITs, private funds, gold accumulation plans and ETFs, and
  savings-type insurance. The map is now fourteen channels.
- Each access entry now carries structured requirements, so the eligibility check reasons from data
  rather than from prose.
- New `securities account` requirement and a new question on the check page: exchange-traded products
  are blocked until you have a brokerage account.
- New [bonds and deposits playbook](/playbooks/bonds-and-deposits) and a
  [deposit insurance explainer](/explainers/deposit-insurance).
- Positioning made explicit: this is a consumer guide for individuals. The two institutional columns
  in the matrix are labelled as context, and no page offers institutional services or advice.
- Fixed the check page opening on a different profile from the one it described.

## 2026-11-18 — Prototype published

Live at [invest.lifetourchina.com](https://invest.lifetourchina.com).

- Nine channels documented: bank account, deposits, bank wealth products, public funds, A-shares,
  savings bonds, Northbound Stock Connect, QFII, personal inbound remittance.
- Access matrix, eligibility check, comparison and four playbooks built.
- All channel records marked `document`: compiled from public sources, **not field-verified**.
- Friction scoring published, including weights, so it can be argued with.
- Deployment: Cloudflare Pages builds from the `main` branch; `/api/channels.json` is published from
  the same data files.

## What is next

1. First branch visits in Shanghai: Bank of China, China Merchants Bank, CITIC Securities.
2. Phone verification of the remaining channels, with dates and staff answers recorded.
3. First field notes published with city, branch and outcome.
4. Correction channel opened and tested with one real dispute.

## How corrections appear here

Every change to a status, a date or a caveat gets a line here. We do not silently edit a record,
because the value of the site is the ability to see what was believed, when, and on what basis.
