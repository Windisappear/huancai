# Implementation plan

## Active: provider account pool (2026-09-17)
- User steering: Docker stopped due to resource use. Added isolated PGlite + local queue test mode; PostgreSQL/Redis production path preserved. User explicitly authorized paid concurrency tests on both keys: bounded stages 1/2/4/8, planned <=¥5 total, no generation retries.
- Document findings: ToAPIs async generation, metadata.resolution for Gemini/Seedream, URL upload for refs; Duoyuan current docs linked by /api/status at docs.deepwl.cn. Gemini Flash falls back to1K there. Both keys passed read-only model authentication. GPT2.5 1K live price updated to $0.0225 on9/17.
- Implemented: schema migration, per-task account/endpoint/params snapshots, exact-spec route selection, retail-vs-cost guard, bounded slots and cooldown, async query processing, 16 model presets, admin pool UI, local lightweight launcher.
- Test issue resolved: PGlite socket shares prepared statements; lightweight connection uses pgbouncer=true&statement_cache_size=0. Node proxy inheritance now makes both relay read-only model checks work in the lightweight launcher.
- [complete] Read provider-owned documentation and inspect new credentials without printing them.
- [complete] Add account/route database tables, per-task routing snapshots, bounded account reservations and cooldowns.
- [complete] Implement documented sync/async adapters; seed popular models, official alternatives and suggested retail prices separately from upstream costs.
- [complete] Add admin pool controls, migrate/seed locally and validate through unit, integration, build and browser checks.
- [complete] Deliver working lightweight setup and document provider credentials, routes, prices and switching back to PostgreSQL/Redis. No automatic paid retries.

Goal: implement user-approved v0.2 AI image SaaS on Next.js/Postgres/Redis/S3, self-hosted Docker. No New API. No real sales before verified providers/pricing/payment.

1. [complete] Installed and read both design skills; explicit Next.js stack scaffolded.
2. [complete] Account/session recovery, catalog, uploads, tasks, transactional wallet/outbox and worker implemented with demo adapters.
3. [complete] Studio, history, wallet, account and admin interfaces implemented.
4. [complete] Private storage expiry, test payments/refunds, Docker deployment and operations docs implemented.
5. [complete for local delivery] Final build/typecheck, 7 unit, 7 PostgreSQL and 3 browser scenarios passed; targeted full-parameter/reference reuse regression also passed. Health endpoint OK; standalone contains no .env or .local. Web and Worker retained for local preview.

## Remaining external work (not claimed complete)
- Official-provider activation requires the corresponding official API keys. ToAPIs and 多元探索 are integrated, authenticated and concurrency-tested.
- Real payment verification/query/refund adapters: requires merchant protocol/configuration.
- Production S3 integration, cloud container deployment/TLS and load testing: requires target accounts and server.
- Final retail prices can still be adjusted in the admin panel; seeded prices preserve a positive gross margin against the current provider-cost snapshot.

## Issues and decisions
- Docker Ubuntu integration warning: engine verified running; existing Ubuntu integration unnecessary for Windows workflow.
- Docker Hub EOF, alternate image pull not approved. Reused existing Postgres 15 / Redis 6 image digests in isolated loopback test containers. Production config remains Postgres 16 / Redis 7.
- S3 image not available: implemented local storage ONLY when DEMO_MODE=true for local tests. Production S3 adapter remains default; real S3 integration unverified.
- Initial npm audit found sharp/deepmerge vulnerabilities: upgraded sharp and overrode deepmerge-ts 8.0.0; audit now zero.
- Windows Prisma DLL locked by dev process: stop server before regenerating/building.

Constraints: relay documentation, prices and both relay keys are now available and integrated. Official-provider keys, payment merchant configuration, production object storage and cloud deployment credentials remain external. Paid generation never retries automatically. No agents requested.

---

# Pricing research plan — 2026-09-10

## Account pool implementation — 2026-09-12
1. [complete] Inspect current generation, channel and admin workflows; confirm provider request protocols.
2. [complete] Add extensible provider accounts and model routes with exact-spec costs, credential isolation and task snapshots.
3. [complete] Seed ToAPIs, Duoyuan and official routes; provide account/route management and curated price presets.
4. [complete] Migrate locally with PGlite; test selection, credential isolation, bounded concurrency, ambiguous outcomes and production build.
5. [complete] Deliver selected models/costs and precise key activation instructions without exposing credentials.

## Follow-up — 2026-09-12
- Final update: public comparison completed in research/pricing-comparison-2026-09-12.md. User confirmed duoyuanx.com and authorized access; earlier browser approval blocker is resolved. Public catalogs, group/currency settings and ToAPIs read-only SKU estimates were obtained. Remaining unknowns are account-specific recharge discounts, unconfigured Grok/Wan image offers, and Seedream Pro official dynamic price text; all explicitly labeled in final report. Historical progress bullets below are retained as history.
- Scope: only Nano Banana, GPT Image, Grok Image, Seedream, and Alibaba Wan; compare ToAPIs and user-confirmed 多元探索 (docs.ai666.net / chat.duoyuanx.com) to each model's official API pricing.
- Completed: official Google/OpenAI/xAI/Wan baselines; Seedream official indexed quote; live ToAPIs GPT Image 2 standard and 1K VIP rows; model-capability review of 多元探索 docs; saved sourced partial comparison.
- Remaining: ToAPIs other live pricing rows, both account recharge/group rates, 多元探索 actual prices, final same-spec supplier recommendation.
- Blocker: chat.duoyuanx.com browser auto-review timed out twice (including the one permitted retry). Further access requires explicit user guidance/approval or user-provided pricing material. No workaround used.
- Technical issue: ToAPIs live filter actions repeatedly exceeded browser runtime timeout; some price slots remained Loading. Do not substitute provider-displayed official comparison prices for ToAPIs prices.

Goal: produce a source-linked, date-stamped comparison of mainstream image-generation models sold through official channels and lower-cost API relays, normalized to per-image and per-1,000-image costs for this product's provider/pricing decisions.

1. [complete] Define model/provider coverage and comparison method.
2. [complete] Verify official model prices from first-party pricing or API documentation.
3. [complete] Verify reputable inference platforms and low-cost relay prices, separating transparent providers from gray-market resellers.
4. [complete] Normalize prices, note quality/resolution and hidden constraints, and flag uncertain or non-comparable offers.
5. [complete] Deliver Markdown report plus machine-readable CSV; cross-check citations and calculations.

## Research rules
- Price snapshot date: 2026-09-10, Asia/Shanghai.
- Prefer official pricing/API documentation; a search snippet alone is not final evidence.
- Show USD and approximate CNY using a dated FX source; do not imply the FX rate is fixed.
- Separate subscriptions from API usage and never divide a subscription by an assumed image count unless the platform publishes the included quota.
- For relays, record company/site identity, public price URL, recharge minimum, markup/discount, model-name mapping, and material trust caveats when available.
- Do not recommend putting production credentials or balances into a relay whose ownership, billing terms, or upstream authorization cannot be verified.

## Errors encountered
| Error | Attempt | Resolution |
|---|---:|---|
| None yet | 1 | — |
| Direct open of three guessed Sinan media-family URLs returned cache-miss errors | 1 | Use search-result links and the site's indexed rank/media pages instead of guessing slugs. |
| Four-query search for Kie/PiAPI/AIML API failed at transport layer | 1 | Retry later with fewer, provider-specific queries and use each provider's pricing page directly where indexed. |
| Direct station-detail URLs were rejected as unsafe | 1 | Open the indexed Sinan rank page first, then follow its numbered links. |
| Sinan detail clicks for 词元API and token173 returned empty internal errors twice | 2 | Use the rank-page evidence for those stations and avoid claiming site-level metadata that was not retrieved. |
| Two planning-file patches failed because expected context did not match the current file | 1–2 | Re-read the relevant tails and apply smaller append-only patches. |
| `git diff --check` could not run because the workspace has no active Git repository metadata | 1 | Used direct UTF-8 parsing, CSV schema checks, arithmetic validation, and conflict-marker scans instead. |
