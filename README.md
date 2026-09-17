# 幻彩

多模型图片创作平台 v0.2：专业创作工作台、账号密码与恢复码、跨设备历史、人民币账本、退款审核、后台任务和管理面板。

**当前可以测试网站业务流程；GPT 中转适配器已编写，但真实生图返回 HTTP 502，尚未验证成功，不开放销售。** GPT/Gemini/Grok/Seedream 入口默认关闭；测试模型输出带标识的图案，测试充值不涉及真实资金。

## 本机运行

```powershell
npm ci
Copy-Item .env.example .env
docker compose -f compose.dev.yaml up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npx tsx scripts/init-storage.ts
npm run dev
```

另开终端运行 `npm run worker`。打开 http://localhost:3000 。APP_ORIGIN 必须与浏览器来源一致，localhost 与 127.0.0.1 不能混用。

完整测试：在独立测试数据库的 .env 设置 DEMO_MODE=true，再运行 `npm run db:seed`。自行注册账号，在钱包测试充值后生成。管理员授权：`npm run admin -- 已注册账号名`。

没有对象存储时可设置 STORAGE_DRIVER=local，文件位于 .local/assets，仅 DEMO_MODE=true 时有效。生产默认 S3。**不要将测试数据库和测试余额转为生产数据库。**

本次本机测试复用缓存 PostgreSQL 15 / Redis 6 镜像，正式配置为 PostgreSQL 16 / Redis 7。本地启动应复用 .env 中保存的 POSTGRES_IMAGE、REDIS_IMAGE，避免已初始化数据卷跨大版本启动。停止容器使用 `docker compose -f compose.dev.yaml stop postgres redis`，不要用 down -v 删除数据。

## 验证与构建

```powershell
npm test
npm run test:integration
npm run build
npm run start
# 另一个终端启动 Worker 后：
npm run test:e2e
```

财务集成测试需 DEMO_MODE=true、种子数据、独立测试库，且停止 Worker 防止其消费测试 Outbox。浏览器测试使用本机 Edge；Linux CI 应改用 Chromium 并安装浏览器。测试不要连接生产库。

Windows 下 Prisma DLL 可能被 Web/Worker 锁定，重新生成客户端或构建前先停止项目进程。start 使用 standalone 输出且只监听本机；Docker 部署由容器入口监听内部网络。

## 结构

- src/app：页面与 HTTP 接口；src/components：创作工作台。
- src/lib：账户、计费、生成、支付、存储与队列；src/worker.ts：后台执行。
- prisma：模型、迁移、种子；tests：单元、数据库和浏览器测试。
- compose.yaml、Dockerfile、deploy：服务器部署。

真实中转适配器需要文生图、图生图、任务查询、原生参数及计费文档。支付需要商户资料、验签、查单和退款协议。当前注册表只允许测试适配器，管理员无法绕过验证强行启用真实渠道。

文档：[需求](需求文档.md) · [运维](docs/OPERATIONS.md) · [接口](docs/API.md) · [验证](docs/VALIDATION.md)

最新本机操作与接口状态见 [本机测试说明](docs/LOCAL_TEST.md)。
