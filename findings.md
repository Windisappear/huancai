# 调研与实现依据

## 原设计
- D:/生图网站/src/components/studio.tsx 与 src/app/globals.css。
- 幻彩 HUANCAI STUDIO，82px 导航轨道、72px 顶栏、340px 参数栏。
- 深色 #141619 / #1c1f23，浅蓝强调 #b9cdf4，框角空画布。
- 原项目包含账户/支付/后端功能；静态版改为 API 设置、浏览器本地图库。

## 官方文档（2026-09-23）
- https://docs.deepwl.cn/duoyuanx/zh/image-models
- https://docs.deepwl.cn/duoyuanx/zh/images/model-matrix
- https://docs.deepwl.cn/duoyuanx/zh/images/gpt-image-2/generation
- https://docs.deepwl.cn/duoyuanx/zh/images/gemini/generation
- https://docs.deepwl.cn/duoyuanx/zh/images/doubao-seedream/generation
- 默认 API 地址 https://duoyuanx.com，Bearer 认证。
- GPT Image / Seedream：POST /v1/images/generations，JSON image 数组，可返回 b64_json 或 url。
- Gemini：POST /v1beta/models/{model}:generateContent，contents parts inlineData，imageConfig aspectRatio/imageSize；返回 inlineData.data 可能是 Base64 或 URL。
- Flash Image 渠道可能忽略分辨率固定约 1K；Pro 提供更高分辨率。
- GPT Image 2 图生图依赖实际渠道，质量 low/medium/high/auto；不提供透明背景。
- Seedream 固定比例映射 2048x2048、2304x1728、1728x2304、2560x1440、1440x2560、2496x1664、1664x2496。
- 纯前端直连依赖中转站 CORS；请求优先 Base64，URL 获取失败须明确区分未本地保存。

## 技术选择
- 原生 HTML/CSS/ES modules，无框架依赖，无后端，无外部 CDN。
- IndexedDB 保存图片 Blob、参考图和任务；localStorage 保存非敏感设置，Key 默认 sessionStorage，可显式记住。
- 一次请求一张，批量串行，避免兼容差异；不自动重试收费请求。

## PocketBay 托管
- 用户指定 https://pocketbay.com/deploy。官方部署页说明 static 类型为包含 index.html 的 HTML/CSS/JS 或预构建输出，由网关直接提供。
- 官方 changelog（2026-07-07、2026-08-30）确认原生静态托管和 ZIP 上传发布。
- 部署 ZIP 根目录为 index.html、favicon.svg、src/ 六个文件；没有 package.json，避免被识别为 Node 服务。
- 网站无平台专属配置、无后端与环境变量。具体发布需用户在 PocketBay 账户上传。
