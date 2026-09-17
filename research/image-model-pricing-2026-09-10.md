# 常用生图模型价格全景（官方、聚合平台与低价中转）

> 2026-09-12 更新：本报告为历史快照。GPT Image 2有独立官方型号，官方指南列1024² Low/Medium/High输出估算$0.006/$0.053/$0.211；GPT Image 2.5指南现已有成本计算器，下面“不能估算”的旧结论不再适用。后续范围收敛为Nano Banana、GPT Image、Grok、Seedream、Wan，详见 [两家中转专项核查](toapis-duoyuan-2026-09-12.md)。

> 价格快照：2026-09-10（Asia/Shanghai）  
> 换算汇率：1 USD ≈ ¥6.74，仅用于横向估算；实际账单受支付渠道、税费、汇率和充值折扣影响。  
> 本报告对“同模型、同版本、同分辨率、同质量档”才做直接比较。`/MP` 表示每百万像素；token 计费不能稳定折算成每张。

## 先看结论

如果目标是给生图 SaaS 接入稳定、可开票、可追责的供应商，优先级建议是：

1. **中国大陆主线路**：阿里云百炼 Qwen/Wan、火山引擎 Seedream、腾讯混元作为多供应商组合。公开单价大致在 **¥0.099–¥0.50/张**。
2. **海外主线路**：Google Imagen/Gemini、BFL FLUX、Ideogram、xAI 官方；需要更多模型时再接 Together、Replicate 或 fal。常用档大致在 **$0.014–$0.10/张**，旗舰高质量档可到 $0.20–$0.30。
3. **低价开源模型**：Together、Replicate、fal、SiliconFlow 上的 FLUX Schnell、SDXL 等可低至 **$0.0014–$0.003/MP 或张**，但画质、文字能力、编辑能力和旗舰闭源模型不是同一档。
4. **低价中转站**：市场观察价可比官方低 40%–80%，例如 Nano Banana 2 约 **$0.015/张**、Seedream/Qwen 约 **$0.014–$0.015/张**。这些报价只能作为测试线或备用线，必须核验模型映射、限流、退款、日志保留和上游授权。

按 1,000 张粗算，几个有代表性的平价路线是：

| 路线 | 公开价 | 1,000 张/MP 粗算 | 适合场景 |
|---|---:|---:|---|
| SiliconFlow FLUX.1 Schnell（国际页） | $0.0014/张 | $1.40 / ¥9.44 | 低成本草图；该国际页可能更新较慢，充值前复核 |
| Together SDXL | $0.0019/MP | $1.90 / ¥12.81 | 开源基线、批量草图 |
| Together FLUX.1 Schnell | $0.0027/MP | $2.70 / ¥18.20 | 开源快速生成 |
| 百度 MuseSteamer Air Image | ¥0.05/张 | ¥50 / $7.42 | 大陆低成本官方线 |
| 腾讯 HY-Image-Lite | ¥0.099/张 | ¥99 / $14.69 | 大陆低成本官方线 |
| Google Imagen 4 Fast | $0.02/张 | $20 / ¥134.80 | 海外稳定商业接口 |
| BFL FLUX.2 Pro | $0.03 起/张 | $30 / ¥202.20 | 新版 FLUX 商业质量 |
| Ideogram 4 Turbo | $0.03/张 | $30 / ¥202.20 | 排版、文字、海报类 |
| 火山 Seedream 5.0 Lite | ¥0.22/张 | ¥220 / $32.64 | 大陆高质量通用图 |

这些数字不包含失败重试、提示词/参考图 token、异步任务轮询、存储、审核、支付税费和上游最低充值。

## 官方 API 价格

### OpenAI GPT Image                                                                                       

OpenAI 当前 GPT Image 2.5 Sunburst 与 Flare 按 token 计费：文本输入 $5/M、缓存文本输入 $1.25/M、图片输入 $8/M、缓存图片输入 $2/M、图片输出 $30/M。官方页面明确说明旧版 GPT Image 2 计算器不能估算 2.5 的 token 消耗，因此目前不应给 2.5 编造固定“每张价”。旧版型号仍有官方每张估算。来源：[GPT Image 2.5 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)、[GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)、[GPT Image 1.5](https://developers.openai.com/api/docs/models/gpt-image-1.5)、[GPT Image 1 Mini](https://developers.openai.com/api/docs/models/gpt-image-1-mini)。

| 模型 | 正方形低/中/高 | 横竖图低/中/高 | 备注 |
|---|---:|---:|---|
| GPT Image 2.5 Sunburst / Flare | token 计费 | token 计费 | 图片输出 $30/M token，输入另计 |
| GPT Image 1.5 | $0.009 / $0.034 / $0.133 | $0.013 / $0.050 / $0.200 | 输入 token 另计 |
| GPT Image 1 Mini | $0.005 / $0.011 / $0.036 | $0.006 / $0.015 / $0.052 | 输入 token 另计 |
| GPT Image 1 | $0.011 / $0.042 / $0.167 | $0.016 / $0.063 / $0.250 | 旧版；输入 token 另计 |

### Google Gemini Image 与 Imagen

Gemini 3.1 Flash Image（Nano Banana 2）按输出分辨率收费；文本、图片输入和思考/文本输出另计。批处理价约为标准价的一半。Imagen 4 仍是结构简单的按张计费。来源：[Gemini API 定价](https://ai.google.dev/gemini-api/docs/pricing)、[Vertex AI 生成式 AI 定价](https://cloud.google.com/vertex-ai/generative-ai/pricing)。

| 模型 | 官方标准价 | 批处理价 | 1,000 张标准价 |
|---|---:|---:|---:|
| Gemini 3.1 Flash Image，0.5K | $0.045 | $0.022 | $45 |
| Gemini 3.1 Flash Image，1K | $0.067 | $0.034 | $67 |
| Gemini 3.1 Flash Image，2K | $0.101 | $0.050 | $101 |
| Gemini 3.1 Flash Image，4K | $0.151 | $0.076 | $151 |
| Gemini 3.1 Flash Lite Image，1K | $0.0336 | $0.0168 | $33.60 |
| Imagen 4 Fast | $0.02/张 | — | $20 |
| Imagen 4 | $0.04/张 | — | $40 |
| Imagen 4 Ultra | $0.06/张 | — | $60 |

### BFL FLUX

BFL 官方 1 credit = $0.01。部分 FLUX.2 型号按百万像素变化，表内是起价；编辑任务还要看输入图数量和尺寸。来源：[BFL API Pricing](https://docs.bfl.ai/quick_start/pricing)。

| 模型 | 官方价 | 1,000 张起价 |
|---|---:|---:|
| FLUX.2 Klein 4B | $0.014 起 | $14 |
| FLUX.2 Klein 9B | $0.015 起 | $15 |
| FLUX.2 Pro | $0.03 起 | $30 |
| FLUX.2 Flex | $0.06 起 | $60 |
| FLUX.2 Max | $0.07 起 | $70 |
| FLUX.1 Kontext Pro / Max | $0.04 / $0.08 | $40 / $80 |
| FLUX1.1 Pro / Ultra / Raw | $0.04 / $0.06 / $0.06 | $40 / $60 / $60 |

### Stability AI

Stability 官方 1 credit = $0.01，成功生成才按对应服务扣费。来源：[Stability Platform Pricing](https://platform.stability.ai/pricing)、[API Reference](https://platform.stability.ai/docs/api-reference)。

| 模型 | 官方价/张 | 1,000 张 |
|---|---:|---:|
| Stable Image Core | $0.03 | $30 |
| Stable Image Ultra | $0.08 | $80 |
| SD 3.5 Flash | $0.025 | $25 |
| SD 3.5 Medium | $0.035 | $35 |
| SD 3.5 Large Turbo | $0.04 | $40 |
| SD 3.5 Large | $0.065 | $65 |

### Ideogram、Recraft、xAI

Ideogram 4 不要求订阅即可使用 API，Turbo/Default/Quality 分别是 $0.03/$0.06/$0.10；API 预付余额与网页订阅额度分离。Recraft API unit 也是独立预付余额。xAI 新版 Grok Imagine 把输入图和输出图分别计费。来源：[Ideogram 4](https://ideogram.ai/models/4.0)、[Ideogram API Setup](https://developer.ideogram.ai/ideogram-api/api-setup)、[Recraft API Pricing](https://www.recraft.ai/pricing?tab=api)、[xAI Pricing](https://docs.x.ai/developers/pricing)。

| 厂商/模型 | 官方价 | 备注 |
|---|---:|---|
| Ideogram 4 Turbo / Default / Quality | $0.03 / $0.06 / $0.10 | 每张；生成链接为临时链接，需及时转存 |
| Recraft V4.1 Raster / Pro | $0.035 / $0.21 | 每张；V4.1 当前价格快照 |
| Recraft V4.1 Vector / Pro Vector | $0.08 / $0.30 | 每张矢量输出 |
| Recraft V2 Raster | $0.022 | 旧版低价路线 |
| Grok Imagine Image 2.0 | $0.04–$0.08 输出 | 1K low $0.04；2K low 或 1K medium $0.06；2K medium $0.08；输入图 $0.01 |
| 旧 Grok Imagine Image | $0.02 输出 | 1K/2K；输入图 $0.002 |
| Grok Imagine Quality | $0.05/$0.07 输出 | 1K/2K；输入图 $0.01 |

### 中国大陆官方平台

大陆云厂商的价格和地域、模型版本绑定，国际区价格通常不同。以下均是公开按量价，不含促销资源包。来源：[火山方舟](https://www.volcengine.com/product/ark)、[阿里云百炼价格](https://help.aliyun.com/zh/model-studio/model-pricing)、[腾讯 TokenHub](https://cloud.tencent.com/document/product/1823/130055)、[百度千帆价格](https://cloud.baidu.com/doc/qianfan/s/wmh4sv6ya)、[SiliconFlow 中国区价格](https://siliconflow.cn/pricing)。

| 平台 | 模型 | 官方价/张 | 1,000 张 |
|---|---|---:|---:|
| 火山引擎 | Seedream 5.0 Lite | ¥0.22 | ¥220 |
| 火山引擎 | Seedream 4.5 | ¥0.25 | ¥250 |
| 火山引擎 | Seedream 4.0 | ¥0.20 | ¥200 |
| 阿里云百炼 | Qwen Image 3.0 Pro，1K / 2K | ¥0.25 / ¥0.50 | ¥250 / ¥500；输入图另 ¥0.02 |
| 阿里云百炼 | Qwen Image 3.0，1K / 2K | ¥0.18 / ¥0.18 | ¥180；输入图另 ¥0.02 |
| 阿里云百炼 | Qwen Image 2.0 / Pro | ¥0.20 / ¥0.50 | ¥200 / ¥500 |
| 阿里云百炼 | Wan 2.7 Image / Pro | ¥0.20 / ¥0.50 | ¥200 / ¥500 |
| 阿里云百炼 | Wan 2.2 Flash | ¥0.14 | ¥140 |
| 阿里云百炼 | Kling v3，1K/2K；Omni 4K | ¥0.20；¥0.40 | ¥200；¥400 |
| 腾讯 TokenHub | HY-Image-V3.0 | ¥0.20 | ¥200 |
| 腾讯 TokenHub | HY-Image-Lite | ¥0.099 | ¥99 |
| 百度千帆 | MuseSteamer Air Image，1024² | ¥0.05 | ¥50 |
| 百度千帆 | 托管 Qwen Image / Image Edit | ¥0.25 / ¥0.30 | ¥250 / ¥300 |
| SiliconFlow | Z-Image Turbo / Z-Image | ¥0.10 / ¥0.30 | ¥100 / ¥300 |
| SiliconFlow | ERNIE Image Turbo | ¥0.11 | ¥110 |
| SiliconFlow | Qwen Image / Edit | ¥0.30 / ¥0.30 | ¥300 |

## 主流聚合与推理平台

这类平台通常比单一官方接口更容易接入多模型，模型名和计费规则也相对透明。优势是统一 API 和预付余额；代价是多一层供应链，部分模型价格高于官方。

| 平台 | 模型 | 公开价 | 与官方关系/备注 |
|---|---|---:|---|
| Together | SDXL | $0.0019/MP | 开源模型低价基线 |
| Together | FLUX.1 Schnell | $0.0027/MP | 分辨率影响账单 |
| Together | Qwen Image | $0.0058/MP | 按 MP |
| Together | HiDream I1 Full | $0.009/MP | 按 MP |
| Together | FLUX.2 Dev / Pro | $0.0154 / $0.03 | 页面展示最低尺寸价 |
| Together | Imagen 4 Fast | $0.02 | 与 Google 官方相同量级 |
| Together | Seedream 4.0 | $0.03 | 海外聚合价 |
| Together | GPT Image 1.5 Medium | $0.034 | 与 OpenAI 官方方形中档一致 |
| Together | Qwen Image 2.0 / Pro | $0.04 / $0.08 | 页面展示最低尺寸价 |
| Together | Ideogram 4 | $0.06 | 与 Ideogram Default 一致 |
| Together | Nano Banana 2 | $0.05 | 分辨率/输入成本需再看调用页 |
| Together | Nano Banana Pro | $0.134 | 页面展示最低尺寸价 |
| Replicate | FLUX Schnell / Dev / 1.1 Pro | $0.003 / $0.025 / $0.04 | 官方模型按输出计价；社区模型可能按算力计费 |
| Replicate | Ideogram v3 Quality | $0.09 | 每张 |
| Replicate | Recraft v3 | $0.04 | 每张 |
| fal | FLUX Schnell | $0.003/MP | 成功输出计费 |
| fal | Seedream 5 Lite | $0.035 | 每张 |
| fal | Nano Banana 2 | $0.08（1K） | 2K 约 1.5×，4K 约 2×；grounding/thinking 可能另收费 |
| fal | Nano Banana Pro | $0.15 | 每张起 |
| WaveSpeedAI | Seedream 4 | $0.027 起 | 参数影响最终价格，输出保留 7 天 |
| WaveSpeedAI | Nano Banana Pro | $0.07 起 | 参数影响最终价格 |

来源：[Together Pricing](https://www.together.ai/pricing)、[Together Serverless Models](https://docs.together.ai/docs/serverless/models)、[Replicate Pricing](https://replicate.com/pricing)、[Replicate Official Models](https://replicate.com/docs/topics/models/official-models)、[fal Pricing](https://fal.ai/docs/documentation/model-apis/pricing)、[fal Image APIs](https://fal.ai/explore/text-to-image-apis)、[WaveSpeed Seedream](https://wavespeed.ai/models/bytedance/seedream-v4)、[WaveSpeed Nano Banana Pro](https://wavespeed.ai/nano-banana-pro-api)。

SiliconFlow 国际页面还显示 FLUX Schnell $0.0014、FLUX Dev $0.014；由于中英文价格页更新节奏不一致，建议在充值页再次确认。来源：[SiliconFlow International Pricing](https://www.siliconflow.com/en/pricing)。

CometAPI 宣称整体约有 20% 折扣，但其通用价格表存在单位和重复条目不一致，不能直接进入自动成本表。型号专页显示 Nano Banana Pro 约 $0.1072（1K/2K）、$0.192（4K），通用路由约 $0.096；充值前应以实际请求预估和小额账单为准。来源：[CometAPI Pricing](https://www.cometapi.com/pricing/)、[Nano Banana Pro 型号页](https://www.cometapi.com/models/google/gemini-3-pro-image/)。

## 低价中转站市场观察

低价中转数据采用第三方监测站 Sinan Compute 的 2026-W37 快照。该站当周索引约 1,700 多个中转站，其中约 370 个暴露价格；其“合理价”会把有效充值倍率计入，并用公开参考价的 40%–125% 做异常过滤。这个方法能筛掉一部分明显错误报价，但**不能证明模型真实、授权合规、余额安全或长期可用**。来源：[周榜](https://compute.sinanlab.com/rank/2026-w37)、[方法说明](https://compute.sinanlab.com/method)、[站点索引](https://compute.sinanlab.com/sites)。

### 当周合理低价

| 模型族 | 观察低价 | 示例站点 | 相对参考价 | 核验状态 |
|---|---:|---|---:|---|
| Nano Banana 2 | $0.015/张 | ciyuanapis.xyz、aiaizz.com、apilio.ai | 约 44% | 仅公开报价；未做 API key 能力验证 |
| Seedream | $0.014–$0.015/张 | token173.com/.net、magic666.top | 依版本而异 | 需确认是 4.0、4.5 还是 5.x 及分辨率 |
| Qwen Image | $0.014–$0.017/张 | infai.cc、token173.com/.net | 依版本而异 | 需确认 Qwen 版本和编辑/生成模式 |
| FLUX | $0.070–$0.073/张 | kie.ai、toapis.cn | 参考价 $0.10 的约 70% | 该榜基准偏高阶 FLUX，不能与 Schnell 混比 |
| Kling Image | $0.015/张 | apilio.ai | 榜单合理区间 | 仅公开报价 |

[Nano Banana 监测页](https://compute.sinanlab.com/media/nano-banana)显示 75 个中转站、298 个报价，范围约 $0.003–$2.227，中位数 $0.028，参考价 $0.034。过低报价常见原因包括首充倍率、旧版模型、低分辨率、单位标错、限时补贴或并非原模型。

### 有较多公开数据的站点样本

| 站点 | 公开报价样本 | 监测信息 | 风险判断 |
|---|---|---|---|
| Apilio | NB2 1K/2K $0.015、4K $0.020；NB Pro 1K/2K $0.030、4K $0.041；Seedream 5 $0.022；Seedream 4 $0.021；FLUX Schnell $0.001；FLUX1.1 Pro $0.015 | 683 模型；¥1 兑换 $1 名义额度；45 次探测 100% 可达，p50 约 1.88s | 45 个模型低于合理价下限；部分计费单位文本异常；只能小额测试 |
| 即刻AI / magic666.top | Seedream 4.0 $0.015、4.5 $0.018、5.0 $0.033 | 411 模型；¥1 兑换 $1 名义额度；45 次探测 100% 可达，p50 约 2.13s | 30 个模型低于合理价下限；未做密钥能力探测 |
| Kie | NB2 Lite $0.020、NB2 $0.040、NB Pro $0.120；Qwen Image 3.0/Pro $0.024/$0.032；Seedream 5 Lite/Pro $0.028/$0.035；FLUX2 Pro/Flex $0.025/$0.070；Wan 2.7/Pro $0.024/$0.060；GPT Image 2 $0.030 | 72 模型；45 次探测 100% 可达，p50 约 2.66s | 充值倍率和登录规则未公开；“GPT Image 2”映射未证实 |
| Byesu | Seedream 4.5 $0.05 | 自称官方直连、OpenAI 兼容接口 | 高于低价榜，但仍需验证上游、并发和退款 |

站点详情来源：[Apilio](https://compute.sinanlab.com/s/apilio.ai)、[即刻AI](https://compute.sinanlab.com/s/magic666.top)、[Kie](https://compute.sinanlab.com/s/kie.ai)、[Byesu Seedream 文档](https://docs.byesu.com/models/seedream-4-5)。

Sinan 的跨模型价格优势中位数中，magic666.top 约为参考价的 42%（67 个可比报价）、Apilio 62%（40 个）、DaoXE 64%（28 个）、KFC V50 67%（28 个）、Run API 76%（8 个）、ToAPIs 79%（26 个）、Kie 79%（22 个）、infai.cc 80%（5 个）。这反映公开报价，并不等于质量或可靠性排名。

### “GPT Image 2”中转报价为什么不能直接采用

[GPT Image 中转监测页](https://compute.sinanlab.com/media/gpt-image)收录 183 个站点、387 个报价，名义范围 $0.001–$37.925，中位数 $0.018，但没有一条能按官方参考价归为可比报价。站点常用 `gpt-image-2`、`gpt-image-2-vip`、`gpt-image-2-c`、`gpt-image-all` 等自定义别名，而 OpenAI 当前 GPT Image 2.5 是 token 计费且没有官方固定每张估算。因此 $0.003–$0.03 的中转报价不能被描述为“官方 2.5 的某个折扣”。

## 订阅型产品：适合人工创作，不适合直接当后端 API 成本

Midjourney Basic/Standard/Pro/Mega 月付 $10/$30/$60/$120，含 3.3/15/30/60 小时 Fast GPU；额外 Fast GPU $4/小时；Standard 及以上有无限 Relax 图片。Midjourney 没有公开按张 API 价，不能用订阅费除以假设张数得出后端成本。来源：[Midjourney Plans](https://docs.midjourney.com/hc/en-us/articles/27870484040333-Comparing-Midjourney-Plans)。

Adobe Firefly Standard/Pro/Pro Plus/Premium 月付 $9.99/$19.99/$49.99/$199.99，含 2,000/4,000/10,000/50,000 月度生成积分；付费计划的标准图像和矢量生成功能不限量，合作方模型和高级功能使用积分。Firefly Services API 是企业接入流程，未找到可直接购买的公开每张 API 价格，所以不能把消费者积分价格当作 API 报价。来源：[Adobe Firefly Plans](https://www.adobe.com/products/firefly/plans.html)、[Firefly Services API Getting Started](https://developer.adobe.com/firefly-services/docs/firefly-api/getting-started/)。

## 给生图网站的采购组合

建议把供应商分成三层，每个模型族维护明确的 `provider_model_id + version + resolution + quality + pricing_unit`，禁止只存营销名称。

| 层级 | 推荐组合 | 用法 |
|---|---|---|
| 大陆生产主线 | 阿里百炼 Qwen/Wan + 火山 Seedream + 腾讯 HY Lite | 面向国内网络和支付；至少两家可自动切换 |
| 海外生产主线 | BFL/Google/Ideogram/xAI 官方 + Together/Replicate/fal | 闭源旗舰走官方，开源或长尾模型走透明聚合平台 |
| 测试与备用 | 选择 1–2 家中转，预付余额设硬上限 | 仅用于价格实验、临时补位；不保存平台主密钥，不作为唯一供应商 |

正式接入前，对每条线路用相同提示词和参考图做 50–100 次小样本验证，记录：成功率、P50/P95 延迟、实际扣费、图片分辨率、文字准确率、内容审核差异、重复图率、响应 URL 有效期和退款行为。价格表至少每周抓取一次；当 `实际单张成本 > 目录价 × 1.15` 或模型哈希/输出特征异常时自动停用该路由。

## 中转站小额验收清单

- 首次充值控制在 **¥20–¥100 或 $5–$15**，不因为首充倍率一次压大额余额。
- 核对实际扣费单位：每张、每 MP、每秒、输入/输出 token、成功任务或全部请求。
- 用固定种子、固定尺寸和参考图测试，确认不是旧版、蒸馏版、低分辨率或二次压缩结果。
- 确认并发、排队、超时、失败退款、余额退款、发票主体、服务条款和数据保留周期。
- 不上传未发布产品图、身份证件、客户素材或其他敏感内容，直到数据处理条款可验证。
- 生产系统至少保留一个官方直连，并将中转单站余额、日消费和并发设置硬限制。

## 口径与限制

- 表内“每张价”只适用于页面指定的版本、质量与尺寸。实际提示词、参考图、批处理、高清修复和编辑可能加价。
- USD/CNY 换算使用 2026-W37 市场监测快照的 6.74，仅用于比较，不是支付承诺。
- 厂商会频繁调整价格、免费额度和模型版本；采购前应再次打开对应官方链接核验。
- 中转站的站名、域名、充值倍率和模型映射可能随时变化。本报告记录的是可公开观察的市场报价，不构成其真实性、合规性或持续运营背书。

完整可筛选数据见同目录 `image-model-pricing-2026-09-10.csv`。
