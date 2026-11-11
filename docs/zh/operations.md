# 运维

[English](../eng/operations.md) · [Русский](../ru/operations.md) · **简体中文**

[返回文档](../../README.zh-CN.md#文档)

## 启动与更新

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 bot
```

PostgreSQL 和 Redis 配置了健康检查，机器人没有 HTTP 健康端点。启动后使用授权账户检查 `/start`、个人资料和 `/admin`。构建成功不代表外部服务凭据有效。

升级前备份数据库、Git 之外保存的 `.env` 和图片。只更新机器人：

```sh
docker compose up --build -d bot
```

启动时执行迁移。结构不会自动回滚，旧镜像必须兼容当前 schema。不要让新旧版本同时使用相同令牌进行 polling。

Compose 未设置 `stop_grace_period`，AI 请求可能耗时 120 秒。为正常停止预留时间：

```sh
docker compose stop -t 180 bot
```

该值是等待额度，不保证所有外部请求都能完成。强制终止可能留下预留余额和未完成任务。

## 存储

- PostgreSQL 使用 `pgdata` 命名卷，`docker compose down` 保留它，`-v` 会删除它。
- Compose 没有 Redis 命名卷或独立队列持久化策略，不应假定重建服务后所有任务仍在。
- 订单快照保存在 PostgreSQL，符合条件的 Platega 检查不依赖 AI 队列状态即可恢复。
- 草稿、管理员当前目标和频率限制保存在内存，重启后清空。
- 对话历史没有自动保留期限；清除上下文会删除对应用户历史。

多实例需要另行设计更新接入、共享会话和活动协调。迁移锁本身不能提供这些能力。

## PostgreSQL 备份

在仓库外创建 custom-format 备份：

```sh
mkdir -p ../ai-bot-backups

docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "../ai-bot-backups/bot-$(date +%Y%m%d-%H%M%S).dump"
```

检查退出状态，并通过 `pg_restore --list` 查看内容。备份包含用户与支付信息，应与源码分开保存。

恢复测试应使用新数据库，并替换示例文件名：

```sh
docker compose exec -T postgres sh -c \
  'createdb -U "$POSTGRES_USER" bot_restore'

docker compose exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d bot_restore --no-owner --no-privileges' \
  < ../ai-bot-backups/backup.dump
```

这些命令不会切换应用数据库。切换前先停止机器人，更新 `DATABASE_URL`，启动并验证余额、订单和迁移记录。`database_backup.sql` 不会自动导入。

## 迁移

文件显式列于 [migrate.ts](../../src/infrastructure/database/migrate.ts)。先幂等执行 `init.sql`，再执行未应用的迁移名称。完整过程受事务和 advisory lock 保护。

打开 `psql`：

```sh
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

只读查询示例：

```sql
SELECT name, applied_at FROM schema_migrations ORDER BY name;
SELECT id, provider, amount, currency, provider_tx_id, fulfilled_at, canceled_at
FROM purchase_intents ORDER BY created_at DESC LIMIT 20;
```

不要公开包含用户或交易标识的查询结果。

## 诊断

| 症状               | 检查项                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| 缺少环境变量       | 必填项、`.env` 传入方式；`npm start` 不会读取文件。                     |
| 测试缺少 Node 类型 | `npm install`、根 `tsconfig.json`、工作区 TypeScript 和重启 TS Server。 |
| PostgreSQL 不可用  | 就绪状态、URL、已有用户密码、容器与宿主机地址差异。                     |
| 队列无处理         | `REDIS_URL`、数据库编号、队列和 worker 日志。                           |
| polling 冲突       | 是否有其他进程或环境使用相同令牌。                                      |
| 初始图片不可用     | 镜像中文件、扩展名和新增后的重新构建。                                  |
| 图片生成不可用     | 消息和图片余额、`has_purchased`、每日费用、模型权限和响应格式。         |
| 频道奖励不可用     | 频道 ID、机器人权限和实际订阅。                                         |
| Platega 不可用     | 两项凭据、HTTP 错误、预期 JSON 和 HTTPS 支付链接。                      |
| 支付未入账         | 订单 UUID、金额、币种、payload、绑定交易和订单状态。                    |
| 部分群发失败       | 发送错误、用户屏蔽机器人、消息格式。                                    |

手动操作前先把平台数据与订单快照核对。不要取消 `payments.tx_id` 唯一约束或清空 `fulfilled_at` 来再次入账。管理面板提供历史和手动发放功能。

## 费用统计限制

PostgreSQL 日期变化后，每日费用会逻辑重置。图片请求前检查已记录费用是否达到 1 USD，但这不是预算预留：并发请求可能同时通过，平台未返回的图片费用也不会记录。

缺少 `usage.cost` 时，文字费用由适配器系数估算。更换模型后应检查这些系数；应用统计不能替代平台账单。

密钥和漏洞报告见[安全](security.md)，界面问题见[无障碍](accessibility.md)。
