# 幻彩：本机轻量测试

本机开发和验收不需要 Docker、PostgreSQL 或 Redis。轻量模式使用 PGlite、本地文件存储和进程内任务轮询；正式环境仍使用 Prisma PostgreSQL、Redis 和 BullMQ，数据库结构无需重写。

## 启动生产构建预览

```powershell
cd D:\生图网站
npm run build
npm run preview:light
```

浏览器打开 <http://localhost:3000>。启动时会自动执行迁移、补齐预设，并对 ToAPIs 和多元探索调用只读模型列表接口；不会提交生图任务。按 `Ctrl+C` 停止。

日常开发可运行：

```powershell
npm run dev:light
```

## 测试

```powershell
npm test
npm run test:light
npm run test:e2e:light
```

- `npm test`：账号池选择、参数适配、密钥隔离和失败策略等单元测试。
- `npm run test:light`：在临时 PGlite 数据库执行钱包与账号池集成测试。
- `npm run test:e2e:light`：构建预览上的桌面、移动端和完整用户流程测试。

浏览器测试只选“流程测试模型”，不会调用付费接口。付费并发探测脚本要求显式传入 `--run-paid-probe`，普通测试不会误触发。

## 数据和密钥

- 持久化轻量数据库位于 `.local/pglite-dev`，生成文件位于 `.local/assets`。
- `api key.txt` 只在服务端按标签读取，已经排除 Git、Docker 和 standalone 构建。
- 管理后台只保存密钥对应的环境变量名，不显示或回传密钥值。
- 当前只读鉴权结果：ToAPIs 161 个模型，多元探索 88 个模型。

如果系统通过 `HTTP_PROXY`/`HTTPS_PROXY` 访问外网，轻量启动器会为其子进程启用 Node 的环境代理支持。

## 切回 PostgreSQL 和 Redis

正式运行时保持 `LIGHTWEIGHT_TEST=false`，设置生产 `DATABASE_URL` 和 `REDIS_URL`，然后执行：

```powershell
npm run db:migrate
npm run db:seed
npm run start
```

另开一个终端运行：

```powershell
npm run worker
```

完整的账号、线路、模型和官方 Key 配置见 [账号池说明](PROVIDER_POOL.md)，正式部署步骤见 [运维说明](OPERATIONS.md)。
