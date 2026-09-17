# Progress

## 2026-09-12 — Two-provider focused comparison
- User restricted first-stage catalog to Nano Banana / GPT Image / Grok Image / Seedream / Alibaba Wan and requested official comparisons.
- Created research/toapis-duoyuan-2026-09-12.md with verified prices, explicit unknowns, account conversion formula, and GPT Image 2 1K VIP comparison (nominal ~68% below official output estimates).
- Corrected previous report's incomplete treatment of official GPT Image 2 and now-available GPT Image 2.5 calculator.
- Partial delivery only: 多元探索 browser blocked by two auto-review timeouts; ToAPIs other rows failed to load reliably. Need user approval or pricing screenshots to finish account-specific comparison.

## 2026-09-09
- Started implementation of approved v0.2, checked workspace and tools.
- Read planning-with-files and skill-installer instructions.
- Installed frontend-design and ui-ux-pro-max and reviewed their design guidance.
- Implemented Next.js studio plus service modules, Prisma schema, migrations, worker and deployment manifests.
- Production build succeeded; 5 unit and 6 PostgreSQL transaction tests passed.
- Docker engine is running; isolated test PostgreSQL and Redis started using cached images.
- Browser testing in progress against explicit demo mode; no real money or AI calls.
- Latest build and typecheck passed; 7 unit tests and 6 DB tests passed with integrity constraints.
- Financial backup restore passed, no wallet/ledger mismatch, creative rows excluded; temporary restore DB/archive cleaned up.
- Reference browser test exposed standalone changing cwd: local asset paths differed from Worker. Fixed by passing an absolute LOCAL_STORAGE_ROOT; rerunning browser tests.
- Fixed storage path mismatch; all 3 browser scenarios passed, including reference generation, account isolation, expiry cleanup, password rotation and admin refund.
- Queue reconstruction test passed (7 total PostgreSQL tests). Final review added complete parameter/reference reuse; running targeted regression.
- Updated requirements, README, API, operations and validation records. Production and local Compose configuration syntax checks passed.
- Final standalone build and sanitization passed. All 7 unit / 7 database tests and 3 browser scenarios passed. Targeted reference/parameter reuse regression passed after final change.
- Final health check returned ok:true; no bundled .env or .local in standalone. Local preview http://localhost:3000 and Worker are running. No cloud deployment or real transactions performed.

## 2026-09-10 — Image model pricing research
- **Status:** in_progress
- Read the planning-with-files skill and retained the completed implementation history.
- Defined official-vs-relay scope, normalization rules, evidence standard, and initial model/provider coverage.
- Planned deliverables: a sourced Markdown report and machine-readable CSV in the workspace.
- Completed the first two official-source search batches covering OpenAI, Google, Black Forest Labs, Stability AI, and Adobe documentation.
- Captured preliminary verified figures and URLs in findings.md; current OpenAI flagship and Adobe self-service API pricing remain unresolved.
- Verified current OpenAI GPT-Image-2.5 token rates, Recraft API rates, Midjourney plans, Adobe consumer plans, and Ideogram billing mechanics. Adobe Firefly Services API remains sales-led; Ideogram's exact model table remains to extract.
- Completed two official-source search passes for mainland providers. Captured Alibaba Model Studio, Tencent TokenHub, and Baidu Qianfan prices. Seedream pay-as-you-go pricing remains unresolved; only a current promotional package and model docs were found.
- Completed two inference-platform search passes. Captured Together, Replicate, fal, SiliconFlow, and WaveSpeedAI pricing with billing-unit caveats; Fireworks lacks a clear verified image-output rate.
- Began relay-market verification. Captured Sinan Compute's independent price methodology, current reasonable-band leaders for five image-model families, and the wide/unmappable GPT Image relay spread.
- Three guessed Sinan family URLs returned cache misses; switched to indexed result pages and logged the issue.
- Added the Sinan 2026-W37 relay-market comparison and GPT Image anomaly findings. Inspected CometAPI but found enough unit inconsistencies to classify its generic table as “verify before funding.”
- A combined search for Kie/PiAPI/AIML API failed at the network transport layer; queued a smaller-query retry.
- Followed indexed station links for Apilio, 即刻AI, 词元API, and Kie. The 词元 detail click returned an internal error; the other pages loaded. Captured Apilio's site-level billing/reachability metadata and queued model-row extraction.
- Extracted explicit per-request image rows and site metadata for Apilio, 即刻AI, and Kie. Repeated detail clicks for 词元API/token173 still returned internal errors, so their values will be cited only from the weekly rank page.
- Resolved Volcengine's current Seedream list prices and xAI Grok Imagine image pricing from official product/docs pages. Opened Ideogram's redirected API pricing page for detailed extraction.
- Resolved Ideogram 4.0 API prices from its official model page after the dynamic pricing table could not be extracted directly.
- Applied the OpenAI Docs workflow to the newly released GPT Image 2.5 models. Confirmed from the opened official page that token rates are published but the GPT Image 2 calculator explicitly does not estimate 2.5 consumption; fixed per-image prices will remain “not yet derivable.”
- Logged and recovered from two context-mismatch patch failures by re-reading the planning files.
- Verified final Midjourney subscription/GPU-hour details and current Adobe Firefly consumer-plan terms from official pages.
- Delivered `research/image-model-pricing-2026-09-10.md` with 41 source links and `research/image-model-pricing-2026-09-10.csv` with 90 normalized price rows.
- CSV parsing passed: 90 rows, 15 columns, no malformed-width rows. USD/CNY and 1,000-unit arithmetic cross-checks found zero discrepancies.
- **Status:** complete
# Completed public supplier comparison — 2026-09-12

Resolved earlier access/loading issues with public catalog and quote data after user URL confirmation/authorization. Saved both catalogs and detailed estimates; delivered research/pricing-comparison-2026-09-12.md with official baselines, public group calculations, resolution/quality distinctions, and explicit remaining unknowns. Account discounts and output quality were not tested. No payment, credential access, or paid image generation.

## 2026-09-17 — Provider pool and lightweight validation complete
- Added extensible provider accounts, exact-spec model routes, per-task routing snapshots, concurrency reservations, cooldowns, cost guards and secret-isolated admin controls.
- Added ToAPIs, 多元探索, OpenAI, Google, xAI, Volcengine and Alibaba adapters. Seeded 16 practical model offerings across GPT Image, Nano Banana, Seedream, Grok Imagine and Wan, with official routes ready for later keys.
- Added PGlite plus in-process queue mode for local testing. PostgreSQL, Redis and BullMQ remain the production path and can be restored without schema changes.
- Read-only authentication passed: ToAPIs exposed 161 models and 多元探索 exposed 88 models; no image generation was performed by the account check.
- Paid bounded concurrency probe passed at 1/2/4/8 simultaneous requests on both relay keys: 30/30 successful, no 429/5xx and no retries. Verified capacity is at least 8 concurrent unfinished requests per tested key; default pool limit remains 4 for headroom. Estimated spend was ¥1.70.
- Upgraded Vitest to 4.1.11. Final validation passed: TypeScript, 18 unit tests, 11 PGlite integration tests, production build/sanitization and 4 Playwright browser scenarios. npm audit reports zero vulnerabilities.
- Desktop and 390px mobile account-pool screenshots were reviewed; labels, status feedback and controls remain readable with no horizontal overflow.
