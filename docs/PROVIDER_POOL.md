# 账号池与轻量测试

更新时间：2026-09-17。配置基于两家供应商现行文档与公开价格；不使用 FLUX、开源小模型。所有成本是上游估算，网站售价是独立的可修改记录。

## 不用 Docker 启动

```powershell
npm run db:generate
npm run build
npm run preview:light
```

打开 http://localhost:3000。修改源代码时可用 `npm run dev:light`，自动编译但会比构建后预览占用更多内存。启动后保持终端运行，Ctrl+C 同时停止本次启动的测试数据库、网页和 Worker。

- 测试数据库：PGlite，数据在 `.local/pglite-dev`，只监听127.0.0.1:55433。没有 Docker、独立 PostgreSQL 或 Redis 进程。
- 测试任务：通过数据库轮询；进程内限流只适用于本机测试。生产继续使用 BullMQ/Redis。
- `.env`、原 PostgreSQL 数据和 `prisma/schema.prisma` 的 PostgreSQL provider 未改成 SQLite。启动脚本只给自己的子进程覆盖连接串。
- `npm run test:light` 使用内存中的独立 PGlite 测试库，端口55434，结束自动销毁。`npm run test:e2e:light` 需要先构建，启动独立测试库、网页和 Worker；UI测试明确只生成免费流程测试图。
- PGlite 通过单连接复用兼容 PostgreSQL 协议，不能替代上线前真实 PostgreSQL/Redis 的多进程锁、宕机及性能测试。

第一次启动是独立测试数据库，需要重新注册网站账号；并未迁移或删除旧数据库账号。要管理号池，在轻量环境中运行的网页注册后，用下面命令提升该测试库中的账号（把 YOUR_NAME 替换成注册名）：

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55433/postgres?connection_limit=1&pgbouncer=true&statement_cache_size=0'
npm run admin -- YOUR_NAME
Remove-Item Env:DATABASE_URL
```

## 当前预选模型

| 模型 | 推荐线路/预计成本（元/张） | 初始测试售价（元/张） |
|---|---|---|
| GPT Image 2 Low / Medium / High，1K | ToAPIs VIP：0.0133 / 0.1183 / 0.4725 | 0.03 / 0.20 / 0.70 |
| GPT Image 2 日常，1K / 2K / 4K档 | 多元1K 0.10；ToAPIs 0.105 / 0.14 / 0.175 | 0.20 / 0.25 / 0.35 |
| GPT Image 2.5 Flare / Sunburst，1K High | ToAPIs：0.1575（9/17新价） | 0.30 |
| Nano Banana 2，1K / 2K / 4K | ToAPIs：0.175 / 0.21 / 0.28；多元1K默认0.20，Gemini组0.16 | 0.30 / 0.40 / 0.50 |
| Nano Banana Pro，1K / 2K / 4K | ToAPIs：0.28 / 0.35 / 0.42；多元1K/2K默认0.30，Gemini组0.24 | 0.50 / 0.60 / 0.80 |
| Seedream 5 Lite，2K / 3K | 多元2K默认0.18，gc-video组0.153；ToAPIs0.2205 | 0.35 / 0.40 |
| Seedream 4.5，2K / 4K | ToAPIs：0.2499 | 0.40 / 0.45 |
| Seedream 5 Pro，1K / 2K | ToAPIs：0.30 / 0.60 | 0.50 / 0.90 |

还配置了7个独立官方入口：GPT Image2、Banana2/Pro、Seedream5Lite、Grok Imagine、万相2.7及Pro。官方密钥未提供，因此显示待接入。官方条目有单独售价，不会把高成本官方线路隐式切到低售价订单中。

初始规格以正方形、单张输出、最多一张参考图为主，避免不同模型的多图计费与输入费用混淆。Grok官方当前预设只开放文生图。ToAPIs GPT2 的“4K档”方图按供应商文档实际为2880×2880，界面显示像素，不伪装为4096×4096。输出保存的宽高读取实际图片。

**分组折扣不是自动取得的。** 初始两把Key按default预算；gemini/gc-video优惠线路已存入号池，但只有账号的分组与上游令牌实际分组一致才参与选路。不能在后台随便把账号改成优惠组，就认为上游会打折。多元 Banana2 文档明确回落约1K，不用于2K/4K；多元Pro4K矩阵与专页不一致，默认不使用该档。

## 密钥与扩展

本机 DEMO_MODE 可读取根目录 `api key.txt`，按 `toapis`、`多元探索`、`image2：` 三个独立标签取密钥。不会再按字符串长度猜测密钥，也不会把旧站密钥发送到新站。

生产使用环境变量：

```
POOL_TOAPIS_1_KEY=
POOL_DUOYUAN_1_KEY=
POOL_OPENAI_1_KEY=
POOL_GOOGLE_1_KEY=
POOL_XAI_1_KEY=
POOL_VOLCENGINE_1_KEY=
POOL_ALIYUN_1_KEY=
```

后续添加第二个账号：在服务端设置例如 `POOL_TOAPIS_2_KEY`，重启服务，再到管理工作台“添加账号”，填写变量名和所属站点。不要把密钥粘贴到变量名字段。新增站点可在“添加供应商”选已有协议，然后添加对应模型线路；全新协议仍需实现适配器。

“检查连接”只查询模型列表，不生成图片，不自动宣称画质验证通过。返回的可用模型列表用于筛掉账号不能调用的路由。对于尚无只读模型查询适配的火山/阿里官方入口，会明确提示，不能当作鉴权成功。

## 路由和账务

1. 匹配模型、文/图生图、分辨率、质量、参考图数量以及账号分组。
2. 过滤禁用、缺密钥、冷却中、账号模型列表不支持和上游估算高于售价的线路。
3. 按优先级、估算成本、账号占用比、上次使用时间选路。账号槽位包含排队、处理中、待核查任务，防止失去确认后继续挤占上游。
4. 在同一数据库事务中绑定账号、上游模型、地址、密钥变量名、参数和成本快照，并冻结钱包报价。
5. ToAPIs 保存异步任务ID，之后仅查询同一个任务。结果不明、超时或5xx不重发生成；任务进入待核查。401/403冷却1小时，429冷却1分钟，其他不明结果冷却5分钟。
6. 只按实际交付数量结算。更改线路不改变已提交任务的路由快照；网站调价不改变已受理订单。

两把Key初始各4个未结算任务，官方账号各2个。2026-09-17有限并发测试两家均通过8并发，但这不是供应商硬上限，也不能据此保证其他模型、其他时段相同。

## 切回 PostgreSQL / Redis

停止轻量进程，恢复正常环境下的生产/开发服务，然后执行原命令：

```powershell
npm run db:migrate
npm run db:seed
npm run start
# 独立终端
npm run worker
```

正常命令不设置 LIGHTWEIGHT_TEST，因此仍使用 `.env` 指定的 PostgreSQL/Redis。新增迁移是增量建表，不删除旧任务或余额。种子数据保留管理员已修改的号池、路线及价格。PGlite测试数据不自动迁入正式账本。

## 接口文档依据

- [ToAPIs GPT2](https://docs.toapis.com/docs/cn/api-reference/images/gpt-image-2/generation)、[任务查询](https://docs.toapis.com/docs/cn/api-reference/tasks/image-status)、[参考图上传](https://docs.toapis.com/docs/cn/api-reference/uploads/images)
- [ToAPIs Banana2](https://docs.toapis.com/docs/cn/api-reference/images/gemini-3.1-flash/generation)、[Seedream5](https://docs.toapis.com/docs/cn/api-reference/images/seedream-5.0/generation)、[GPT2.5](https://docs.toapis.com/docs/cn/api-reference/images/gpt-image-2.5/generation)
- [多元模型矩阵](https://docs.deepwl.cn/duoyuanx/zh/images/model-matrix)、[Gemini原生](https://docs.deepwl.cn/duoyuanx/zh/images/gemini-image/generation)、[GPT2](https://docs.deepwl.cn/duoyuanx/zh/images/gpt-image-2/generation)、[Seedream](https://docs.deepwl.cn/duoyuanx/zh/images/doubao-seedream/generation)
- [PGlite socket 官方包说明](https://www.npmjs.com/package/@electric-sql/pglite-socket)
