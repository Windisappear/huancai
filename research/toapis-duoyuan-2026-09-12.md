# ToAPIs 与多元探索：五类生图模型核查

> 此文件是调查过程记录，下面的“待补”“阻塞”已部分解决。最终公开报价对比请看 [pricing-comparison-2026-09-12.md](pricing-comparison-2026-09-12.md)：已读取 duoyuanx.com 公开目录、人民币配置以及 ToAPIs 分档估价。账号专属优惠仍未核实。

核查日期：2026-09-12。范围仅为 Nano Banana、GPT Image、Grok Image、Seedream、阿里通义万相（Wan）；暂不扩展 FLUX、其他开源与小模型。

## 可交付对比：已确认与缺失项

当前是部分完成的价格核查，不能据此宣称两家中转已完整比较。多元探索账号价与充值比例尚未取得；ToAPIs 部分动态价格未加载。以下美元只表示供应商显示美元，不自动换成人民币成交成本。

| 模型/档位 | 官网输出价/张 | ToAPIs 报价/张 | 多元探索 |
|---|---:|---:|---|
| Nano Banana 初代（Gemini 2.5 Flash Image）1K | $0.039 | 未取得 | 文档有模型，价格待补 |
| Nano Banana 2 1K | $0.067 | 落地页起价 $0.025，尚未确认对应分辨率 | 文档有模型；称回落至1K；价格待补 |
| Nano Banana 2 2K / 4K | $0.101 / $0.151 | 未取得分档价 | 文档未确认该路由原生2K/4K |
| Nano Banana Pro 1K/2K / 4K | $0.134 / $0.24 | 未取得分档价 | 文档列1K/2K；价格待补 |
| GPT Image 2，1K Low | $0.006 | VIP $0.0019 | 有 GPT Image 2 路由，价格待补 |
| GPT Image 2，1K Medium | $0.053 | VIP $0.0169 | 待补 |
| GPT Image 2，1K High | $0.211 | VIP $0.0675 | 待补 |
| GPT Image 2，普通路由1K/2K/4K | 需固定质量与像素尺寸 | $0.015 / $0.020 / $0.025 | 待补 |
| Grok Imagine Image（旧版）1K/2K | $0.02 | 未取得 | 文档为 grok-4-2-image 别名，映射与价待补 |
| Grok Imagine Image 2.0，1K Low | $0.04 | 未取得 | 未确认2.0版本 |
| Grok Imagine Image 2.0，2K Low或1K Medium / 2K Medium | $0.06 / $0.08 | 未取得 | 未确认2.0版本 |
| Seedream 4.0 / 4.5 / 5.0 Lite | ¥0.20 / ¥0.25 / ¥0.22 | 未取得 | 文档有相应豆包路由，价格待补 |
| 阿里 Wan 2.6 Image / Wan 2.7 Image | ¥0.20 / ¥0.20 | 未取得 | 未确认支持 |
| 阿里 Wan 2.7 Image Pro | ¥0.50 | 未取得 | 未确认支持 |

官网来源：[Google](https://ai.google.dev/gemini-api/docs/pricing)、[OpenAI 图像生成成本表](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs)、[xAI](https://docs.x.ai/developers/pricing)、[火山豆包公开价格](https://www.volcengine.com/product/doubao)、[阿里百炼](https://help.aliyun.com/zh/model-studio/model-pricing)。ToAPIs 来源为 [实时价格页](https://toapis.com/en/pricing) 和 [落地页搜索快照](https://toapis.com/lp/api-marketplace)；多元探索能力来源为 [图像矩阵](https://docs.ai666.net/zh/images/model-matrix/)。

## GPT Image 2：同标示档位的量化对比

| 1024²/1K标示档 | 官网输出成本/1000张 | ToAPIs VIP/1000次 | 名义便宜幅度 |
|---|---:|---:|---:|
| Low | $6 | $1.90 | 68.3% |
| Medium | $53 | $16.90 | 68.1% |
| High | $211 | $67.50 | 68.0% |

这是价格标签对比，尚未验证ToAPIs实际像素、质量参数与官方完全一致。官网另收文本/参考图输入费；ToAPIs 需核实请求数与返回图张数关系。普通路由没有明确相同质量标签，不计算它与官网的折扣率。

## 其他官网千张成本基线

- Nano Banana 2：1K $67；2K $101；4K $151（标准输出；Batch分别约$34/$50/$76）。
- Nano Banana Pro：1K/2K $134；4K $240（标准输出；Batch $67/$120）。
- Grok Imagine Image：$20；2.0的各档 $40/$60/$80。旧版输入图另$0.002/张，2.0输入图另$0.01/张。
- Seedream 4.0/4.5/5.0 Lite：¥200/¥250/¥220。
- Wan 2.6/2.7 Image：¥200；Wan 2.7 Image Pro：¥500（北京地域）。

## 后续范围和必要补充

第一阶段仅保留五个模型族。Nano Banana 2和Pro可作为同族两个版本；GPT Image先按2的明确质量档比价；Grok必须确认别名对应版本；Seedream必须区分4.0/4.5/5.0 Lite；阿里仅收录Wan，不把Qwen Image混为万相。

实际人民币成本 = 页面单次扣除额度 ×（实际充值人民币 ÷ 到账可用额度）。若页面价已包含用户分组折扣，不再重复乘折扣。当前缺少两家账号充值换算及多元探索价格页数据，因此不排名实际成交成本。

2026-09-12修正：上一轮报告未充分覆盖官方GPT Image 2，且GPT Image 2.5指南现已有成本计算器，旧报告“2.5不能估算”的表述不可继续用于本轮。不要把GPT Image 2与2.5混为一个版本。

## 初步证据

- 用户进一步确认API站就是https://duoyuanx.com/。其公开前端明确请求/api/pricing及/api/status，已读取并保存原始JSON。当前报价版本a42d372ccf0b5dd13ecf71203521f9d2，货币CNY，usd_exchange_rate=1，price=1；默认组1，gemini组0.8，gc-video组0.85，GPT-azure组2.5。Nano Banana2基础0.20，Pro基础0.30，GPT Image2基础0.10、all基础0.06，Seedream5 Lite基础0.18；这些为人民币站内标价，不能按真实USD换算。Grok Image与Wan Image未在当次公开目录找到。

- 继续核查官方document.duoyuanx.com公开文档资源knowledge-base.js，发现独立通用API地址https://duoyuanx.com/v1/chat/completions，以及网页站专用/api/codex与/api/cc。正在确认duoyuanx.com是否为模型计费入口。

- 用户明确允许重试后，chat.duoyuanx.com主页成功读取，当前浏览器未登录。首页公告确认网页版套餐与外接API套餐独立；外接API公告列Codex/Claude/CodingPlan，不能据此断言生图API包含在网页会员里。官方说明入口document.duoyuanx.com。浏览器操作仍频繁技术超时；公开ai.ai666.net HTTP请求遇到证书校验失败，未关闭证书验证。

- 本轮更正前次研究口径：OpenAI 确实有独立 `gpt-image-2` 官方型号（2026-04-21 快照），不能仅因其不是 2.5 就判定为不存在的型号；中转后缀、参数映射与上游真实性仍需核验。官网生成指南给出 GPT Image 2 的 1024² 输出估算 Low/Medium/High $0.006/$0.053/$0.211，输入费用另计。

- ToAPIs 已通过实时浏览器核实：`gpt-image-2` 1K/2K/4K = $0.015/$0.020/$0.025，对应 3/4/5 credits；`gpt-image-2-vip` 1K Low/Medium/High = $0.0019/$0.0169/$0.0675，对应 0.38/3.38/13.5 credits。其余槽位持续 Loading；搜索筛选也超时。名义兑换为 1 credit=$0.005，仍未获得用户实际充值优惠。
- Gemini 官网补充：初代 Nano Banana $0.039/张；Nano Banana Pro 1K/2K $0.134，4K $0.24。原生 2.5 Flash Image 页面提示 2026-10-02 关停，初代不宜作为新站主要入口。

- 用户补充实际站点 https://chat.duoyuanx.com/ 。对此站浏览器自动审批连续两次超时拒绝，已用完工具允许的一次重试；不能通过替代浏览器或底层请求绕过。账号价格待用户提供截图或明确允许后重新访问。
- 当前官方价格已复核：Nano Banana 2 标准输出 1K/2K/4K $0.067/$0.101/$0.151；xAI Grok Imagine Image $0.02，2.0 $0.04–0.08，输入图另计；阿里北京 Wan 2.7/2.6 Image ¥0.20，Wan 2.7 Image Pro ¥0.50。
- ToAPIs 页面已成功打开，但价格槽仍 Loading，筛选图像动作超时导致会话重置；公开落地页可核实 GPT Image 2 $0.015、VIP $0.0169、official $0.135，以及 Gemini 3.1 Flash Image Preview $0.025 的宣传起价。不能把页面“Official price”栏直接当作 ToAPIs 成交价。

- 用户确认多元探索文档为 https://docs.ai666.net/ ，其中 API 域名为 https://ai.ai666.net 。其他同名站点不能在未证明关联前视为同一账号价格。
- ToAPIs 公共价格页 https://toapis.com/en/pricing 明确指出实际价格可能受用户分组及促销影响。
- 多元探索图像矩阵 https://docs.ai666.net/zh/images/model-matrix/ 确认 Gemini、GPT Image、Seedream、Grok Image；尚未确认 Wan。
- 多元探索文档称 Gemini 3.1 Flash Image 及 2.5 Flash Image 尺寸会回落至 1K，Gemini 3 Pro Image 支持 1K/2K。不能按其他渠道的 4K 能力假设同等参数。
- 公共搜索找到 zx1.deepwl.net/pricing 同名页，但与用户确认域名的关联尚未证实，不采用其中报价作为多元探索账号价。
- 错误：web 对 ai.ai666.net/pricing 安全打开失败；ToAPIs 浏览器初始化超时；改查供应商索引价格与文档，并继续尝试公开页面。
