# Findings

- Workspace initially contains only v0.1 requirements, no existing app or Git repository.
- Node/npm, git and Docker CLI are available on Windows.
- User explicitly selected Next.js + Docker self-hosting, overriding Sites scaffold/hosting defaults.
- Design skills requested: anthropics/skills frontend-design and nextlevelbuilder/ui-ux-pro-max-skill.
- Relay homepage reachable intermittently; no API docs verified. Do not infer its protocol.
- Next standalone changes cwd and copies .env outside normal tracing exclusions: use an absolute demo storage root and post-build sanitization. Docker runtime receives env through Compose.
- Docker warning was Ubuntu integration only; Docker Engine 28.0.4 usable. Local cached PG15/Redis6 testing avoids rejected/failed image downloads; production S3/PG16/Redis7 still requires actual deployment verification.

## Image model pricing research — 2026-09-10

### Requirements
- Cover commonly sold proprietary and open-weight image-generation families, with official channels first.
- Include low-cost inference platforms and Chinese-facing relay/reseller offers with public pricing.
- Normalize usage pricing to one image and 1,000 images where the underlying unit makes this valid.
- Distinguish text-to-image API usage from subscriptions, editing, upscaling, video, and hosting/GPU rental.
- Record source URLs and the date observed; label missing or ambiguous public prices instead of guessing.

### Initial coverage target
- OpenAI GPT Image / DALL·E; Google Imagen / Gemini image; Adobe Firefly.
- Black Forest Labs FLUX; Stability AI Stable Image / SD3.x; Ideogram; Recraft.
- Midjourney and other widely used subscription-only products where relevant.
- ByteDance Seedream, Alibaba Qwen Image/Wan image, Tencent Hunyuan Image where a public official price can be verified.
- Reputable model hosts/aggregators: fal.ai, Replicate, Together AI, Fireworks AI, SiliconFlow and comparable providers with public price pages.
- Lower-cost relays: only entries with a directly inspectable public price or documentation page; classify unverifiable sellers separately.

### Research findings
- OpenAI's current model catalog (observed 2026-09-10) marks `gpt-image-1`, `gpt-image-1.5`, and `gpt-image-1-mini` as previous/deprecated models. Current catalog language recommends GPT-Image-2.5 Sunburst, whose exact price still needs a dedicated page lookup.
- OpenAI historical/current-page prices verified: GPT Image 1.5 square low/medium/high = $0.009/$0.034/$0.133; portrait/landscape = $0.013/$0.050/$0.200. GPT Image 1 Mini square = $0.005/$0.011/$0.036. GPT Image 1 square = $0.011/$0.042/$0.167. Prompt and input-image tokens are additional, so these output-image figures are not always the full request total.
- Google Gemini Developer API (page updated 2026-08-28) lists Gemini 3.1 Flash Image: $0.045/$0.067/$0.101/$0.151 per 0.5K/1K/2K/4K image; batch prices $0.022/$0.034/$0.050/$0.076. Gemini 3.1 Flash Lite Image is $0.0336 per 1K, batch $0.0168. Text/image input and thinking/text output are billed separately.
- Google Vertex AI lists Imagen 4 Fast/Imagen 4/Imagen 4 Ultra at $0.02/$0.04/$0.06 per generated image; Imagen 3 Fast $0.02 and Imagen 3 $0.04.
- Black Forest Labs official API uses $0.01 credits and lists FLUX.2 Klein 4B/9B from $0.014/$0.015, Pro from $0.03, Flex from $0.06, Max from $0.07; FLUX.1 Kontext Pro/Max $0.04/$0.08; FLUX1.1 Pro/Ultra/Raw $0.04/$0.06/$0.06. FLUX.2 uses megapixel-sensitive pricing.
- Stability AI official API uses $0.01 credits. Stable Image Core is 3 credits ($0.03) and Ultra 8 credits ($0.08). API reference lists SD3.5 Large/Large Turbo/Medium/Flash at 6.5/4/3.5/2.5 credits ($0.065/$0.04/$0.035/$0.025) per successful generation.
- OpenAI's current flagship models are GPT-Image-2.5 Sunburst and Flare. Both list text input $5/M, image input $8/M, cached image input $2/M, and image output $30/M tokens. Unlike older model pages, the model pages do not publish a fixed per-image table; actual cost depends on image token consumption and quality/resolution. The dated snapshot is 2026-09-08.
- Official OpenAI documentation explicitly says GPT Image 2's calculator does not estimate GPT Image 2.5 token consumption. Therefore no defensible fixed per-image estimate can be published for 2.5 until usage measurements or an updated calculator exist; the report will keep its $30/M output-token rate rather than fabricating a per-image number.
- Recraft official API pricing observed: V4.1 raster $0.035, V4.1 Pro $0.21, V4.1 vector $0.08, V4.1 Pro Vector $0.30; older V4/V3 raster $0.04, V2 raster $0.022. API units are prepaid at $1/1,000 and do not expire. Subscription credits are separate from API units.
- Ideogram API setup documentation confirms prepaid billing, one-time top-ups of $20/$50/$100 or custom minimum $1, a default disabled auto-recharge, and a separate API account from consumer subscriptions. Exact model prices still require the public `ideogram.ai/api-pricing` page.
- Ideogram 4.0 official model page resolves hosted API pricing: Turbo $0.03/image, Default $0.06, Quality $0.10; no subscription is required. API links are ephemeral and must be copied to durable storage. The main pricing page loads parts of the API table dynamically, which is why direct text extraction missed these rows.
- Midjourney is subscription-only rather than a public generation API. Official monthly prices: Basic $10, Standard $30, Pro $60, Mega $120; usage is governed by Fast GPU time and Relax mode, so there is no truthful fixed per-image API price.
- Adobe Firefly consumer subscriptions observed: $9.99/2,000 credits, $19.99/4,000, $49.99/10,000, $199.99/50,000 monthly credits. Paid plans currently include unlimited standard image generations; partner models/premium features consume credits. Adobe's Firefly Services API docs require representative/account onboarding and did not expose a self-service per-image API rate in the pages found, so consumer credits must not be presented as API pricing.
- Alibaba Cloud Model Studio official mainland prices observed: Qwen Image 3.0 Pro 1K/2K output ¥0.25/¥0.50 plus ¥0.02 per input image; Qwen Image 3.0 1K/2K output ¥0.18/¥0.18 plus ¥0.02 input. Qwen Image 2.0/2.0 Pro = ¥0.20/¥0.50 per output. Wan 2.7 Image/Pro = ¥0.20/¥0.50; Wan 2.6 Image = ¥0.20. Wan text-to-image 2.6/2.2 Plus/2.2 Flash = ¥0.20/¥0.20/¥0.14. Regional international prices differ.
- Tencent TokenHub official price table lists HY-Image-V3.0 ¥0.20/image and HY-Image-Lite ¥0.099/image, metered as 20,000/9,900 image tokens at ¥10/M tokens. The older Hunyuan image service is being migrated and should not be the primary new integration target.
- Baidu Qianfan official model pricing lists MuseSteamer Air Image at ¥0.05 per 1024 square image and hosted Qwen Image at ¥0.25; Qwen image edit is ¥0.30. Older Baidu AI 作画 APIs had 2026 discontinuations, so Qianfan's current image endpoint is the relevant product.
- Volcengine search exposed current Seedream 5.0 Lite/4.5/4.0 documentation and a promotional package for Seedream 4.5: ¥90 promo for a one-month ¥200 spend plan, described as about 800 images over two months. This is an activity package rather than a stable list price; exact pay-as-you-go rates still require the official model pricing page.
- Together AI's current image catalog includes: FLUX Schnell $0.0027/MP, SDXL $0.0019/MP, Qwen Image $0.0058/MP, HiDream I1 Full $0.009/MP, FLUX.2 Dev $0.0154/image, FLUX.2 Pro $0.03, Imagen 4 Fast $0.02, Seedream 4.0 $0.03, GPT Image 1.5 medium $0.034, Wan 2.6 Image $0.03, Qwen Image 2.0/Pro $0.04/$0.08, Ideogram 3/4 $0.06, Nano Banana 2 $0.05, Nano Banana Pro $0.134. Page cautions that displayed prices use the lowest resolution/duration.
- Replicate examples list FLUX Schnell $0.003/image, FLUX Dev $0.025, FLUX 1.1 Pro $0.04, Ideogram v3 Quality $0.09, Recraft v3 $0.04. Public models may instead be billed by compute time; official models use predictable output-based billing.
- fal documents prepaid successful-output billing. Public catalog examples: FLUX Schnell $0.003/MP, Seedream 5.0 Lite $0.035/image, Nano Banana 2 $0.08 at 1K (2K 1.5x, 4K 2x), Nano Banana Pro $0.15. Optional web grounding/thinking can add fees.
- SiliconFlow mainland current page lists Z-Image Turbo ¥0.10/image, Z-Image ¥0.30, ERNIE Image Turbo ¥0.11, Qwen Image ¥0.30, Qwen Image Edit ¥0.30, and Kolors free. Its international page (possibly stale) lists FLUX Schnell $0.0014 and FLUX Dev $0.014. Blog pages list FLUX.2 Pro $0.03, Flex $0.06, Kontext Pro/Max $0.04/$0.08.
- WaveSpeedAI exposes a cross-vendor prepaid API. Current examples found: Seedream 4 base $0.027/run, Nano Banana Pro from $0.07/run; final cost changes with size/count/references and is shown before submission. The platform states outputs are retained for seven days.
- Fireworks' public pricing pages currently emphasize token inference and GPU deployments; no clear serverless text-to-image per-output catalog was found in the initial search, so it should not be included as a verified image API price without a model-specific source.
- Sinan Compute provides a useful independent relay-market snapshot with public method/data links. As of 2026-09-08 it indexed 1,741 relay sites (374 exposing price data) and computed effective price after recharge conversion. Its image “reasonable price” floor intentionally excludes extreme/unverifiable entries rather than recommending the absolute cheapest listing.
- Sinan's 2026-W37 image relay floor within its 40%–125% “plausible” band: Nano Banana 2 $0.015/image (ciyuanapis.xyz, aiaizz.com, apilio.ai); Seedream $0.014–$0.015 (token173.com/.net, magic666.top); Qwen Image $0.014–$0.017 (infai.cc, token173.com/.net); FLUX $0.070–$0.073 (kie.ai, toapis.cn); Kling Image $0.015 (apilio.ai). These rows are price plausibility only, not authenticity or business-safety endorsements.
- The GPT Image relay page exposes the key market problem: 183 relays, 387 offers, $0.001–$37.925 per nominal image, median $0.018, but zero “plausible-price” classifications because the page could not ingest OpenAI's 403-protected official price and model labels such as `gpt-image-2`, `-vip`, `-c`, or `-all` do not map cleanly to official quality/resolution/token usage. Such offers cannot be compared as equivalent outputs from name and price alone.
- CometAPI advertises a uniform 20% discount and unified billing. Its page has internally inconsistent units/labels (for example GPT Image rows mix token and per-image wording, and two “FLUX 2 MAX” rows differ by 10×), so only model-specific calculator rows should be used. A model-specific Nano Banana Pro page shows about $0.1072 for 1K/2K and $0.192 for 4K, versus its generic “all” route at $0.096. Treat generic catalog prices as marketing until validated by a real request and usage record.
- Sinan's station page for Apilio (2026-09-09 snapshot) reports 683 listed models, ¥1 paid per $1 nominal credit, email/GitHub login, new registration open, and 100% 24-hour reachability from its US-West probe (45 observations, p50 1,883 ms). It also marks 45 model rows below its cost plausibility floor and has not run key-based consistency/capability probes, so reachability and breadth do not establish authentic upstream routing.
- Apilio image rows illustrate label/unit risk: Nano Banana 2 1K/2K $0.015, 4K $0.020; Nano Banana Pro 1K/2K $0.030, 4K $0.041; Seedream 5 $0.022, Seedream 4 $0.021, Qwen Image $0.037, Qwen Image Plus $0.030, FLUX Schnell $0.001 and FLUX 1.1 Pro $0.015. Several FLUX/Qwen entries are exposed as “$/million output” despite being image models, so only rows explicitly marked per request can be normalized.
- 即刻AI station snapshot: 411 listed models, ¥1 per $1 nominal credit, 100% 24h reachability (45 US-West probes, p50 2,131 ms), but 30 rows below Sinan's plausibility floor and no key-based tests. Explicit per-request image rows include Seedream 4.0 $0.015, 4.5 $0.018, and 5.0 $0.033.
- Kie station snapshot: 72 models, 100% 24h reachability (45 US-West probes, p50 2,659 ms), recharge ratio/login method not exposed, no key-based tests. Clear per-request rows include Nano Banana 2 Lite $0.020, Nano Banana 2 $0.040, Nano Banana Pro $0.120, Qwen Image 3.0/Pro $0.024/$0.032, Seedream 5 Lite/Pro $0.028/$0.035, Seedream 4.5 $0.033, FLUX 2 Pro/Flex $0.025/$0.070, Wan 2.7/Pro $0.024/$0.060, and GPT Image 2 $0.030.
- Independent search also found Byesu advertising Seedream 4.5 at $0.05/image with an OpenAI-style API, and current pages for KKAIAPI and other relays, but prices shown in promotional articles or dynamic dashboards require station-level evidence before inclusion in the verified table.
- Volcengine's official product page resolves Seedream list prices: Doubao Seedream 5.0 Lite ¥0.22/image, Seedream 4.5 ¥0.25/image, Seedream 4.0 ¥0.20/image. Promotional spend plans and Dramart bundles are separate products and should not replace these pay-as-you-go API rates.
- xAI's official Imagine API pricing: Grok Imagine Image 2.0 media input $0.01/image; outputs $0.04 (1K low), $0.06 (2K low or 1K medium), $0.08 (2K medium). Previous `grok-imagine-image` costs $0.002 input + $0.02 output at 1K/2K; the quality variant is $0.01 input + $0.05/$0.07 output at 1K/2K.
- The Sinan FX snapshot used for cross-currency estimates is USD/CNY 6.74 on 2026-09-08. CNY conversions in the final table are approximate comparison aids, not billing quotes.

### Sources captured
- https://developers.openai.com/api/docs/models/gpt-image-1
- https://developers.openai.com/api/docs/models/gpt-image-1.5
- https://developers.openai.com/api/docs/models/gpt-image-1-mini
- https://developers.openai.com/api/docs/models/chatgpt-image-latest
- https://ai.google.dev/gemini-api/docs/pricing
- https://cloud.google.com/vertex-ai/generative-ai/pricing
- https://docs.bfl.ai/quick_start/pricing
- https://platform.stability.ai/pricing
- https://platform.stability.ai/docs/api-reference
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- https://www.recraft.ai/pricing?tab=api
- https://www.recraft.ai/docs/api-reference/pricing
- https://developer.ideogram.ai/ideogram-api/api-setup
- https://ideogram.ai/api-pricing
- https://ideogram.ai/models/4.0
- https://developer.ideogram.ai/api-reference/generate-images/generate-v4
- https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans
- https://www.adobe.com/products/firefly/plans.html
- https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/
- https://help.aliyun.com/zh/model-studio/model-pricing
- https://cloud.tencent.com/document/product/1823/130055
- https://cloud.tencent.com/product/tokenhub
- https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya
- https://cloud.baidu.com/doc/qianfan-api/s/8m7u6un8a
- https://www.volcengine.com/docs/82379/1829186
- https://www.together.ai/pricing
- https://docs.together.ai/docs/serverless/models
- https://replicate.com/pricing
- https://replicate.com/docs/topics/models/official-models
- https://fal.ai/docs/documentation/model-apis/pricing
- https://fal.ai/explore/text-to-image-apis
- https://siliconflow.cn/pricing
- https://www.siliconflow.com/en/pricing
- https://wavespeed.ai/models/bytedance/seedream-v4
- https://wavespeed.ai/nano-banana-pro-api
- https://www.cometapi.com/pricing/
- https://www.cometapi.com/models/google/gemini-3-pro-image/
- https://compute.sinanlab.com/rank/2026-w37
- https://compute.sinanlab.com/s/apilio.ai
- https://compute.sinanlab.com/s/magic666.top
- https://compute.sinanlab.com/s/kie.ai
- https://compute.sinanlab.com/
- https://compute.sinanlab.com/rank
- https://compute.sinanlab.com/method
- https://compute.sinanlab.com/sites
- https://compute.sinanlab.com/media/nano-banana
- https://compute.sinanlab.com/media/gpt-image
- https://docs.byesu.com/models/seedream-4-5
- https://www.volcengine.com/product/ark
- https://docs.x.ai/developers/pricing
- https://docs.x.ai/developers/models/grok-imagine-image
## Subscription products verified (2026-09-10)

- Midjourney is subscription-priced rather than a public per-image API: Basic/Standard/Pro/Mega are $10/$30/$60/$120 monthly, with 3.3/15/30/60 Fast GPU hours; extra Fast GPU time is $4/hour. Standard and above include unlimited image generations in Relax Mode. Annual billing is 20% lower. Source: https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans
- Adobe Firefly consumer plans are $9.99/$19.99/$49.99/$199.99 per month with 2,000/4,000/10,000/50,000 monthly generative credits. All paid plans include unlimited standard image/vector generations; premium features and partner models consume credits, with temporary first-year unlimited offers on selected tiers/models. These consumer plans must not be presented as Adobe Firefly Services API per-image pricing. Source: https://www.adobe.com/products/firefly/plans.html
# Final pricing research update — 2026-09-12

Confirmed user-supplied duoyuanx.com is general API site. Public CNY settings use exchange rate1; gemini group0.8, gc-video0.85 only for enabled models. ToAPIs public pricing and POST /api/sku/quote/batch read-only estimates resolved dynamic loading: NB2 1K/2K/4K $0.025/.03/.04; Pro $.04/.05/.06; GPT2 $.015/.02/.025; VIP1K Low/Medium/High $.0019/.0169/.0675. Seedream5Pro1K/2K $.042857/.085714;4K unmatched. Grok Imagine routes return sku not configured, not free. ToAPIs Chinese display uses USD×7. Final report: research/pricing-comparison-2026-09-12.md. No paid generation or login performed.

## Provider-pool implementation findings — 2026-09-17

- Both user relay keys pass read-only `/v1/models` authentication when Node's environment proxy support is enabled: ToAPIs returns 161 models and 多元探索 returns 88. The account check does not invoke generation.
- Bounded paid probes at concurrency 1/2/4/8 completed 15/15 requests on each provider with no 429, 5xx or retry. This demonstrates at least eight concurrent unfinished requests for the tested account/model/time window, not a contractual maximum. Keep the default application limit at four per account for headroom.
- PGlite socket mode is compatible with Prisma when the local URL uses `pgbouncer=true&statement_cache_size=0`. This enables Docker-free tests while leaving production PostgreSQL unchanged.
- Route eligibility must include the exact model, size, quality and mode plus the account's live model list. This prevents a cheap 1K route from being selected for a 4K request and hides routes missing from the provider account.
- Ambiguous paid submissions are stored for manual review and never retried automatically. Async ToAPIs requests persist the upstream task ID before polling.
- Final verification after Vitest 4.1.11: 18 unit, 11 integration and 4 browser tests pass; TypeScript and production build pass; npm audit reports zero vulnerabilities.
