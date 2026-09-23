# 幻彩 · 纯前端 AI 生图工作台

参考 `D:\生图网站` 的幻彩工作台设计，使用原生 HTML、CSS 和 JavaScript 实现。**没有后端、数据库服务、登录系统、Serverless Function，也没有运行时第三方依赖。**

## 部署到 PocketBay

交付内容为通用静态站点，用于部署到 PocketBay 等静态托管平台，不包含任何平台专属配置。

可直接使用项目根目录的 **`幻彩静态网站.zip`**，或上传 **`dist` 里面的全部文件**。压缩包根目录就是 `index.html`，不是再套一层 `dist` 文件夹。

| 设置 | 值 |
| --- | --- |
| 网站类型 | 纯静态 HTML / CSS / JavaScript |
| 入口文件 | `index.html` |
| 上传内容 | `dist` 中所有文件，或交付的 ZIP |
| 如果平台从源码构建 | `npm run build`，输出目录 `dist` |
| 安装依赖 | 不需要 |
| 后端 / 环境变量 | 不需要 |

每位使用者在网页的 **API 设置** 中填入自己的 Key，部署包中没有密钥。网站使用哈希导航（`#studio`、`#history`），无需额外配置单页应用路由重写。

打开 [PocketBay 部署页](https://pocketbay.com/deploy)，登录后使用 ZIP 上传入口，选择 **`幻彩静态网站.zip`**。PocketBay 官方部署说明将包含 `index.html` 的 HTML/CSS/JS 产物归类为 `static`，由网关直接提供；官方更新记录说明支持 ZIP 上传发布。本包没有 `package.json` 或 Node 启动入口，适合识别为纯静态站点。

平台仅需托管静态文件，生图请求从用户浏览器直接发往中转站。预览域名、正式域名和自定义域名属于不同浏览器存储空间；建议固定使用正式域名。

参考：[PocketBay 部署指南](https://pocketbay.com/deploy)、[ZIP 上传与静态托管支持](https://pocketbay.com/zh-CN/changelog)。本次已准备并校验部署包，尚未上传到你的 PocketBay 账户。

## 本地打开

需要 Node.js 20 或更高版本，无需运行 `npm install`。

```powershell
cd D:\生图网站静态版
npm run dev
```

浏览器打开 **http://127.0.0.1:4173**。Windows 也可双击 `启动网站.cmd`。此命令只启动本地静态文件预览服务，不处理 API Key、不转发生图请求，也不是网站的后端。

请通过 HTTP/HTTPS 访问，直接双击 HTML 的 `file://` 模式可能被浏览器阻止加载 JavaScript 模块。

## 使用

1. 点击右上角 **配置 API Key**，默认接口地址 `https://duoyuanx.com`，填入自己的 Key。
2. 可点 **检查连接** 获取模型列表，不产生生图费用。连接成功只说明模型列表可访问，实际生图权限以中转渠道为准。
3. 选择 GPT Image、Nano Banana 或 Seedream，并选择具体版本。
4. 文生图输入描述；图生图上传、拖入或粘贴参考图片，再描述希望修改的内容。
5. 选择比例、质量/清晰度和数量，点击生成。一次最多 4 张，逐张请求，避免批量参数在不同渠道的兼容差异。
6. 在画布或图库中查看大图、下载原图、复用参数与参考图，或用已有作品继续图生图。

## 已接入型号

- GPT Image：`gpt-image-2`、`gpt-image-2-c`。
- Nano Banana：`gemini-2.5-flash-image`、`gemini-3-pro-image-preview`（Pro）、`gemini-3.1-flash-image-preview`（Nano Banana 2）。
- Seedream：4.0、4.5、5.0、5.0 Pro 的文档型号。

没有加入其他模型系列。实际可用性由中转站和 API Key 所属分组决定。

- GPT Image / Seedream 使用 `/v1/images/generations`，参考图使用 JSON `image` 数组。
- Nano Banana 使用 `/v1beta/models/{model}:generateContent`，参考图使用 `inlineData`。
- GPT Image 的 16:9 使用 `1536x864`，9:16 使用 `864x1536`，以满足该模型宽高必须为 16 倍数的限制。
- Seedream 使用文档给出的约 2K 比例尺寸映射。
- Nano Banana Pro 可选 1K / 2K / 4K；Flash Image 渠道固定约 1K，实际分辨率以返回图片为准。
- 界面限制每次最多 6 张参考图，每张 10 MB、总计 20 MB。上游渠道可能有更严格限制。

文档：[模型清单](https://docs.deepwl.cn/duoyuanx/zh/image-models)、[GPT Image](https://docs.deepwl.cn/duoyuanx/zh/images/gpt-image-2/generation)、[模型矩阵](https://docs.deepwl.cn/duoyuanx/zh/images/model-matrix)、[Seedream](https://docs.deepwl.cn/duoyuanx/zh/images/doubao-seedream/generation)。

## 本地数据与直连限制

- **图片本体、参考图与创作参数保存在 IndexedDB**，刷新后可继续查看，存储容量由浏览器决定。
- API Key 默认保存在 sessionStorage，只在当前标签页会话使用；主动勾选“记住”后才明文保存在 localStorage。支持一键清除。
- 提示词、比例等草稿保存在 localStorage。没有第三方统计、远程字体或图片示例请求。
- 下载远程结果图时，不携带 API Key 或登录凭证。
- 清除网站数据、使用隐私窗口、切换浏览器/设备/域名，可能导致原图库不可访问。重要作品应下载备份。
- 中转站必须允许网站来源的 **CORS**，并允许 `Authorization`、`Content-Type` 和 POST。静态托管无法替第三方接口绕过 CORS；若中转站有来源白名单，加入部署后的网站域名。
- 优先请求 Base64。如果上游只返回图片链接，网站会尝试下载并保存 Blob；若图片 CDN 不允许跨域读取，明确标记“待保存”，支持重新保存或打开原图下载，不会把临时链接误报为已保存。
- 生成中请保持页面打开。关闭、刷新、超时或停止等待不能保证上游不计费；网站不会自动重发收费请求。
- 若存储空间不足，已收到的图片会留在当前页面并提示下载；剩余批量请求停止。释放空间后可重新保存。

## 构建与验证

```powershell
npm run build
npm test
```

`dist` 可放到静态托管服务。构建只复制公开静态资源，不包含测试、配置说明、密钥或服务端代码。

`tests/browser.mjs` 是浏览器集成测试，使用模拟中转站响应，不调用收费模型。需要 Playwright 和本机 Edge：

本次验证：8 项接口适配测试、14 项浏览器集成检查通过；中转站图片生成接口的真实 CORS 预检返回 204，允许跨域来源及 POST 请求。尚未使用真实 API Key 发起收费出图。

```powershell
npm install --no-save @playwright/test
node tests/browser.mjs
```

运行前先启动 `npm run dev`。也可以通过 `PLAYWRIGHT_PACKAGE` 环境变量指定现有 Playwright 的 `index.mjs`。部署和普通使用不需要 Playwright。

## 目录

```text
index.html            页面
src/styles.css        幻彩深色工作台样式
src/app.js            交互、生成流程、图库
src/api.js            中转接口适配及响应解析
src/models.js         三类模型与参数
src/storage.js        IndexedDB 和浏览器配置
src/icons.js          本地图标
scripts/serve.mjs     仅用于本地静态预览
scripts/build.mjs     输出 dist
幻彩静态网站.zip      可直接交付托管平台的静态文件包
tests/                接口与浏览器测试
```
