# HTTP API

基础路径 /api。JSON 写请求带 Content-Type: application/json，以及与 APP_ORIGIN 一致的 Origin。Cookie 会话负责身份验证。失败返回 error 字符串；金额单位为整数分。

## 账户

| 路径 | 方法 | 输入／行为 |
| --- | --- | --- |
| /auth/register | POST | username（3–24 字母数字下划线）、password（10–128）；一次性返回 recoveryCode 并登录 |
| /auth/login | POST | username、password；7 天 HttpOnly 会话 |
| /auth/recover | POST | username、password（新）、recoveryCode；换恢复码，撤销全部会话 |
| /auth/password | POST | currentPassword、password；更新密码和恢复码、重建当前会话 |
| /auth/revoke | POST | 空对象；退出其他设备 |
| /auth/logout | POST | 空对象；退出当前设备 |
| /me | GET | 用户公共信息、钱包和 demo 标识 |

## 创作

| 路径 | 方法 | 输入／行为 |
| --- | --- | --- |
| /models | GET | 可用性、sizes、qualities、maxCount、maxReferences 和价格 |
| /quote | POST | modelId、mode（TEXT/REFERENCE）、size（WxH）、quality、count；报价有效 5 分钟 |
| /uploads | POST | multipart file，静态 PNG/JPEG/WebP ≤20MB、≤4000 万像素；转为去元数据 PNG |
| /tasks | POST | quoteId、prompt、referenceIds、requestKey（UUID）；原子冻结、任务和 Outbox |
| /tasks | GET | 当前用户有效创作历史及未结算任务，最多 100 条 |
| /tasks/:id | GET | 当前用户任务状态 |
| /assets/:id | GET | 校验归属与到期后返回文件，?download 下载，无永久 bucket URL |
| /assets/:id | DELETE | 立即禁止访问，后台物理删除 |

QUEUED → RUNNING → SAVING → SUCCEEDED/PARTIAL/FAILED；结果不明进入 REVIEW，禁止盲目重发生图。PENDING 为未来异步协议预留，接入真实模型时必须实现上游查询调度。

## 钱包

| 路径 | 方法 | 输入／行为 |
| --- | --- | --- |
| /wallet | GET | 余额、最近 100 笔流水和充值、退款申请 |
| /payments | POST | amount（100–10000 分）、requestKey；仅 demo 建立 TEST 订单 |
| /payments/test-confirm | POST | id；仅 demo，对所属用户幂等入账 |
| /refunds | POST | paymentId；冻结整笔可退款金额，待审核 |
| /payments/webhook/* | POST | 未启用，返回 503，不接收未验证支付通知 |

## 管理

- GET /admin：模型、渠道公共信息、待审核退款和异常任务。
- POST /admin/models、/admin/channels：id、enabled；未实现或未验证不能启用。
- POST /admin/prices：modelId、mode、size、quality、unitCents，建立新的价格版本。
- POST /admin/refunds：id、approve，测试退款或驳回释放。真实原路退款待接入。
- POST /admin/tasks/resolve：id；仅 REVIEW，按实际保存结果数量结算，不接受任意扣款金额。

生产仅 Nginx 公开，覆盖 X-Real-IP。上传、注册、登录、恢复和用户写操作分别限流。资产接口响应 private/no-store；队列只存任务 ID，不存提示词或文件。
