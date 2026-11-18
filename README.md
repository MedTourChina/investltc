# Lifetourchina Invest — foreign investment access in China

**Live:** https://invest.lifetourchina.com

A map of onshore investment channels in China for people who are not Chinese: bank accounts, funds,
A-shares, bonds and the routes money takes to get in. Money in, and RMB earned here.

No ads, no commissions, no advice.

---

## What this repository contains

| Path | What it is |
|---|---|
| `site/` | The Astro site (build target for Cloudflare Pages) |
| `site/data/channels/*.yaml` | One file per channel — the dataset behind the matrix |
| `01-strategy.md` | Scope, the two-door model (current vs capital account), compliance red lines |
| `02-site-blueprint.md` | Information architecture, data model, page templates |
| `03-roadmap.md` | What gets verified first, and in what order |

## Status

Prototype. Nine channels, compiled from public documents. **Nothing has been field-verified at a
branch yet**, and every page says so. The structure — matrix, eligibility check, comparison,
playbooks — is the product; the verification is the work.

## Stack

- [Astro 5](https://astro.build) — static output, zero JS by default
- YAML channel data validated with zod at build time
- Client-side eligibility check and comparison; no backend, no accounts, no trackers
- Deployed on Cloudflare Pages

## Run locally

```bash
cd site
npm install
npm run dev        # http://localhost:4321
npm run build      # → site/dist
npm run preview
```

Node 20+.

## Adding or editing a channel

1. Copy an existing file in `site/data/channels/` and change the `id`.
2. Fill every field — the build fails loudly if `lastVerified`, `verifiedBy` or `sources` is missing.
3. `lastVerified` is the date you actually checked, not the date you wrote the file.
4. Run `npm run build`. Invalid data stops the build with the file name and the field.

Statuses are deliberately limited to four:

| Status | Means |
|---|---|
| `open` | A published route exists for this investor type |
| `conditional` | A route exists, but depends on documents, branch, amount or language |
| `unknown` | We have not verified this combination — **not** the same as "no" |
| `closed` | No general route exists |

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick `investltc`.
3. Build settings:
   - **Framework preset:** Astro (or none)
   - **Root directory:** `site`
   - **Build command:** `npm install && npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 20 or 22
4. Deploy, then **Custom domains → Set up a domain →** `invest.lifetourchina.com`.
   If `lifetourchina.com` is on Cloudflare DNS, the CNAME is created automatically. Otherwise add a
   CNAME at your DNS provider pointing to the `*.pages.dev` hostname.

Every push to `main` rebuilds and deploys; pull requests get preview URLs.

## Data licence

The channel dataset is published under CC BY 4.0 via `/api/channels.json`. Corrections are worth more
than citations.

## Disclaimer

General information only. Not investment, tax or legal advice. We are not a broker, adviser or fund
distributor, and nothing here is personalised.
