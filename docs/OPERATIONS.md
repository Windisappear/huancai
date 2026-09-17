# 云服务器部署与运维

> 2026-09-17：新增多供应商账号池、官方适配器和异步任务查询，详见 [PROVIDER_POOL.md](PROVIDER_POOL.md)。现有两把中转Key已完成限定模型的生成测试；官方Key尚未提供。真实支付接入仍未完成。轻量PGlite模式仅用于本机测试，正式部署仍使用本文的PostgreSQL/Redis路径。

## 当前可用范围

应用、业务数据库模型、队列 Worker、测试支付和测试图案已实现。真实中转/官方适配器与微信/支付宝验签、查单、原路退款尚待文档和商户资料；当前版本禁止真实销售，不应宣传已支持真实 AI 生成。

## 硬件与服务

- 建议起步 4 vCPU、8 GB 内存、80 GB SSD，Ubuntu 24.04 LTS；无需 GPU。
- 私有 S3 兼容对象存储、域名、TLS 证书、数据库异地备份。
- 生产存储不放服务器本地磁盘。当前本机测试可启用 local 存储，仅在 DEMO_MODE=true 有效。
- 推荐带宽 10 Mbps 起步，实际容量以压测为准；不承诺单机高可用。
- Node 24，依赖由 package-lock.json 固定。数据库生产 PostgreSQL 16、队列 Redis 7；本机可复用 PostgreSQL 15 / Redis 6 进行兼容性测试。

## 首次部署

1. 安装 Docker Engine 与 Compose 插件，将项目放入独立目录。
2. 将 deploy/production.env.example 复制为 .env.production，填写随机密码、真实域名和私有存储配置。DATABASE_URL 中的密码要 URL 编码。
3. 将 TLS fullchain.pem 和 privkey.pem 放入 deploy/certs；不要将密钥加入 Git。
4. 构建固定版本镜像：`docker compose --env-file .env.production build`。
5. 启动数据服务：`docker compose --env-file .env.production up -d postgres redis`。
6. 执行迁移与种子：`docker compose --env-file .env.production --profile setup run --rm migrate`。
7. 初始化专用私有 bucket：`docker compose --env-file .env.production run --rm worker npx tsx scripts/init-storage.ts`。使用专用空桶，生命周期会按 3 天清理桶内内容。
8. 启动：`docker compose --env-file .env.production up -d web worker nginx`。
9. 正常注册维护者账户后，通过受控终端授权：`docker compose --env-file .env.production exec web npm run admin -- 账号名`。

应用端口、PostgreSQL、Redis 不对公网暴露。仅 Nginx 80/443 对外开放；必须覆盖 X-Real-IP，不能把应用直接挂公网。

## 数据与备份

Creative content uses separate TaskContent/Asset tables. Long-term financial backups must exclude creative rows:

```sh
docker compose --env-file .env.production exec -T postgres pg_dump -U frame -d frame -Fc --exclude-table-data='public."TaskContent"' --exclude-table-data='public."Asset"' > financial.dump
```

备份账号、会话、钱包、流水、订单等敏感数据时需加密并限权；不要将未过滤的全库快照长期留存。对象存储不开启保留旧版本的版本控制，不备份作品。清理过期内容不删除资金流水。

恢复演练应在新数据库执行 `pg_restore --no-owner`，再比较钱包余额、流水合计及订单状态，不能向正在运行的生产数据库直接覆盖恢复。恢复后撤销旧会话，对未结算任务核查，不重发上游生成请求。

## 监控和任务恢复

- `/api/health` 检查数据库可用性；生产应另外监测 worker 进程、Redis、队列深度及磁盘。
- Worker 每 3 秒投递 Outbox；每小时清理；每分钟检查超时任务。
- 任务超过 15 分钟未确认会转为 REVIEW，不再次提交上游请求。
- 管理员应先核对交付记录，再按实际已保存图片结算。REVIEW 不自动全额退款，避免尚在交付时误判。
- ALERT_WEBHOOK 可接收不含提示词或密钥的异常事件。未配置则输出结构化错误日志。
- 失败入账、冻结长期未释放、异常任务、清理失败均需处理。真实支付上线前还必须补充渠道定时查单和对账告警。

## 发布与回滚

镜像使用发布版本标记并记录 digest。先备份，再运行兼容迁移，再滚动更新应用；首期单机更新会存在短暂停机。回滚使用上一镜像，不能把不兼容数据库迁移当作自动可逆操作。队列只存任务 ID，不存提示词。

## 上线阻断项

真实供应商文档、模型能力及计费方式验证；明确售价；真实支付验签/查单/退款联调；生产 S3 验证；TLS、压力、故障恢复、备份恢复及内容服务规则确认。任何一项未完成都不得打开真实充值销售。
