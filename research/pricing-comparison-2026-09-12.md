# ToAPIs、多元探索与官方生图 API 价格对比

核查日期：2026-09-12。仅包含 Nano Banana、GPT Image、Grok Image、Seedream、阿里万相 Wan。当前多元探索 API 站由用户确认为 https://duoyuanx.com/。

## 阅读口径

- ToAPIs 为公开美元报价；人民币按其中文价格页使用的 1 美元=7 元显示比例折算。官网美元也按此比例方便比较，**这不是实时汇率或用户实际充值汇率**。
- 多元探索公开设置为 CNY、兑换率 1；按该站页面逻辑计算人民币标价，不能把其 model_price 再乘 7。
- 中转站按次报价，以下预算默认一次成功返回一张。多图请求、失败重试、参考图和账号充值优惠可能改变实际成本。
- 官方 Google/OpenAI 表中为标准在线输出价，输入费另计，不是含所有费用的账单总价。
- 已读取两家的公开模型目录及 ToAPIs 公开估价接口。未登录用户账户、未充值、未调用付费生成；不能保证账号专属价格、实测画质、成功率与标示模型一致。

## 核心比较表

所有人民币为每张/单图请求的预算值。

| 模型与规格 | 官网价格 | ToAPIs | 多元探索 | 可比性说明 |
|---|---:|---:|---:|---|
| Nano Banana 初代 1K | $0.039 ≈ ¥0.273 | $0.012 ≈ ¥0.084 | 当前目录未找到 | ToAPIs preview 路由 |
| Nano Banana 2，1K | $0.067 ≈ ¥0.469 | $0.025 ≈ ¥0.175 | 默认 ¥0.20；gemini 组 ¥0.16 | 多元未在价格数据中分辨率分档 |
| Nano Banana 2，2K | $0.101 ≈ ¥0.707 | $0.030 ≈ ¥0.210 | 不单独填价 | 多元旧文档曾提示回落1K，尚不能当原生2K比较 |
| Nano Banana 2，4K | $0.151 ≈ ¥1.057 | $0.040 ≈ ¥0.280 | 不单独填价 | 多元未确认4K实际输出 |
| Nano Banana Pro，1K | $0.134 ≈ ¥0.938 | $0.040 ≈ ¥0.280 | 默认 ¥0.30；gemini 组 ¥0.24 | 多元有明确 -1K 路由 |
| Nano Banana Pro，2K | $0.134 ≈ ¥0.938 | $0.050 ≈ ¥0.350 | 默认 ¥0.30；gemini 组 ¥0.24 | 多元有明确 -2K 路由 |
| Nano Banana Pro，4K | $0.240 ≈ ¥1.680 | $0.060 ≈ ¥0.420 | 默认 ¥0.30；gemini 组 ¥0.24 | 多元有明确 -4K 路由，未实测像素 |
| GPT Image 2，普通路由 1K/2K/4K | 须固定质量、尺寸计算 | $0.015/$0.020/$0.025 ≈ ¥0.105/0.140/0.175 | gpt-image-2 默认 ¥0.10/次 | 多元无同等质量分档，不能计算同质折扣 |
| GPT Image 2，1024² Low | $0.006 ≈ ¥0.042 | VIP 1K：$0.0019 ≈ ¥0.0133 | 无明确同档价 | 仅按相同 Low 标签对比 |
| GPT Image 2，1024² Medium | $0.053 ≈ ¥0.371 | VIP 1K：$0.0169 ≈ ¥0.1183 | 无明确同档价 | 同上 |
| GPT Image 2，1024² High | $0.211 ≈ ¥1.477 | VIP 1K：$0.0675 ≈ ¥0.4725 | 无明确同档价 | 同上 |
| Seedream 4.0 | ¥0.20 | $0.0285 ≈ ¥0.1995 | 当前目录未找到 | ToAPIs目录基价 |
| Seedream 4.5 | ¥0.25 | $0.0357 ≈ ¥0.2499 | 当前目录未找到 | ToAPIs目录基价 |
| Seedream 5.0 Lite | ¥0.22 | $0.0315 ≈ ¥0.2205 | 默认 ¥0.18；gc-video 组 ¥0.153 | 分组名虽为 video，但该模型确实在支持列表中 |
| Seedream 5.0 Pro，1K/2K | 官网动态价格正文未读取成功，暂留空 | $0.042857/$0.085714 ≈ ¥0.30/0.60 | ¥0.70/次，规格未分档 | ToAPIs 4K估价无匹配规则；不填4K价 |
| Grok Imagine Image，旧版1K/2K | $0.020 ≈ ¥0.140 | 有条目但未配置报价 | 当前目录未找到明确生图条目 | 不把聊天/视频价当生图价 |
| Grok Imagine Image 2.0，1K Low | $0.040 ≈ ¥0.280 | 未取得 | 未取得 | 官网上线版本与中转别名不可混同 |
| Grok Imagine Image 2.0，2K Low或1K Medium / 2K Medium | $0.060/$0.080 ≈ ¥0.420/0.560 | 未取得 | 未取得 | 输入图另计 |
| Wan 2.6 Image / Wan 2.7 Image | ¥0.20/¥0.20 | 当前未找到生图报价 | 当前未找到生图报价 | 阿里北京地域；不包括 Qwen Image |
| Wan 2.7 Image Pro | ¥0.50 | 当前未找到生图报价 | 当前未找到生图报价 | 同上 |

供应商来源：[ToAPIs价格页](https://toapis.cn/pricing)、[公开目录](https://toapis.cn/api/pricing)、价格页实际调用的 `/api/sku/quote/batch` 只读估价接口；[多元探索价格页](https://duoyuanx.com/pricing)、[公开目录](https://duoyuanx.com/api/pricing)、[公开货币配置](https://duoyuanx.com/api/status)。

官网来源：[Google](https://ai.google.dev/gemini-api/docs/pricing)、[OpenAI图像成本表](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs)、[xAI](https://docs.x.ai/developers/pricing)、[火山方舟产品价格](https://www.volcengine.com/product/ark)、[阿里百炼](https://help.aliyun.com/zh/model-studio/model-pricing)。火山产品页 Seedream 4/4.5/5 Lite 价格来自官网搜索索引；直接页面为动态加载，证据强度低于完整实时正文。Seedream Pro 的[官方计费文档](https://www.volcengine.com/docs/82379/1544106)未能提取正文，因此没有把第三方转述写成已核实官网价。

## 分组与线路：同名模型也可能差很多

多元探索公开的默认分组倍率为1；gemini为0.8；gemini-优质为2；gc-video为0.85；GPT-azure为2.5。只有模型 enable_groups 明确允许的分组，才按其倍率计算。auto 不保证选到最低价。

| 多元探索实际模型ID | 基价 | 可核实分组价 | 备注 |
|---|---:|---|---|
| gemini-3.1-flash-image-preview | ¥0.20 | 默认¥0.20；gemini ¥0.16 | Nano Banana 2 |
| gemini-3.1-flash-image | ¥0.20 | 仅gemini-优质：¥0.40 | 不能误写为¥0.16 |
| gemini-3-pro-image-preview | ¥0.30 | 默认¥0.30；gemini ¥0.24 | Nano Banana Pro |
| gemini-3-pro-image-preview-1K / -2K / -4K | 均¥0.30 | 默认¥0.30；gemini ¥0.24 | 后缀路由支持 gemini/openai 接口 |
| gemini-3-pro-image | ¥0.30 | 仅gemini-优质：¥0.60 | 与preview分开 |
| gpt-image-2 | ¥0.10 | 默认¥0.10；GPT-azure ¥0.25 | vip组倍率未公开，不估算 |
| gpt-image-2-all | ¥0.06 | 默认¥0.06 | 说明明确仅1K；未标官方质量档 |
| gpt-image-2.5-sunburst / gpt-image-2.5-flare | ¥0.15 | 默认¥0.15；GPT-azure ¥0.375 | 目录端点为openai聊天式调用，接入前核对文档 |
| doubao-seedream-5-0-260128 | ¥0.18 | 默认¥0.18；gc-video ¥0.153 | 5.0 Lite |
| doubao-seedream-5-0-pro-260628 | ¥0.70 | 默认¥0.70 | 目录为openai端点 |

ToAPIs 的 `-vip`、`-official` 是不同模型路由名称，不等于用户 vip 分组。公开目录 default/vip/svip 倍率均为1，不能自行加会员折扣。`-official` 为供应商标签，不是本次对其上游渠道的独立认证。

补充：ToAPIs 的 GPT Image 2.5 Flare/Sunburst 在1K估价均为 $0.015≈¥0.105；多元默认¥0.15，但双方没有对齐质量，不据此做同质排名。OpenAI 2.5 官方按输入/输出token收费，图像输入$8/百万token、缓存$2、输出$30；文本输入$5、缓存$1.25。官方现有计算器，需固定尺寸和质量后估算，不把 GPT Image 2 的每张价格直接套给2.5。

## 哪家更适合先试

1. **Nano Banana Pro：多元探索 gemini 组价格有优势。** 1K/2K/4K标价都是¥0.24，ToAPIs分别¥0.28/0.35/0.42。若只能使用多元默认组，1K反而是ToAPIs ¥0.28低于多元¥0.30。
2. **Nano Banana 2：1K多元gemini组略便宜；高分辨率ToAPIs报价更清楚。** 多元¥0.16与ToAPIs¥0.175相差¥0.015；若多元默认组则¥0.20，贵于ToAPIs。多元2K/4K能力与计价仍需核实。
3. **GPT Image：先按质量选线路。** ToAPIs VIP Low仅¥0.0133，而Medium/High为¥0.1183/0.4725；多元all ¥0.06和普通¥0.10没有对应质量说明。不能说¥0.06一定比¥0.4725更划算。
4. **Seedream 5 Lite：多元公开组价便宜。** 默认¥0.18相对官方¥0.22约便宜18.2%；gc-video ¥0.153约便宜30.5%。ToAPIs 4.0/4.5/5Lite基本贴近官网价。Pro的ToAPIs1K/2K标价也低于多元¥0.70，但规格与输入计费未完全对齐。
5. **Grok与Wan先保留官方价格基线。** ToAPIs Grok Imagine两条生图路由估价返回`sku not configured`；多元未找到明确生图目录。两家Wan条目主要是视频，不据此推算生图价格。

按1000次单图请求预算：多元Pro gemini组¥240；ToAPIs Pro 1K/2K/4K ¥280/350/420。Seedream5Lite多元gc-video组¥153、默认¥180、官网¥220、ToAPIs约¥220.5。以上仍是公开名义价，未计账号充值优惠及重试。

官网补充：Google Batch另有更低费率（Nano Banana2 1K/2K/4K约$0.034/0.050/0.076，Pro 1K/2K $0.067、4K $0.12），不与实时单次响应混为同一种服务。Grok旧版参考图输入$0.002/张，2.0输入$0.01/张。

## 原始证据与复核

- `toapis-public-pricing-2026-09-12.json`：完整公开模型目录。
- `toapis-public-quotes-2026-09-12.json`：按模型、分辨率、质量分档的估价结果。
- `toapis-public-extra-quotes-2026-09-12.json`：GPT2.5、初代Banana与Grok未配置结果。
- `duoyuan-public-pricing-2026-09-12.json`：完整公开价格、分组及端点，版本a42d372ccf0b5dd13ecf71203521f9d2。
- `duoyuan-public-billing-2026-09-12.json`：货币与充值相关公开配置摘录。

后续实际成本可按“页面扣除额度 × 实际充值人民币 ÷ 到账可用额度”核算；页面若已包含分组倍率则不能重复打折。账号专属充值比例、实际像素与质量、失败是否扣费是尚未实测的三项，不影响本报告作为公开报价快照使用。
