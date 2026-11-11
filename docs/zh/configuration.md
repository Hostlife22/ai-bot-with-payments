# 配置

[English](../eng/configuration.md) · [Русский](../ru/configuration.md) · **简体中文**

[返回文档](../../README.zh-CN.md#文档)

环境变量由 [env.ts](../../src/config/env.ts) 校验。将 `.env.example` 复制为 `.env`，不要把真实凭据提交到 Git。

## 环境变量

| 变量                  | 何时必需     | 含义                                                          |
| --------------------- | ------------ | ------------------------------------------------------------- |
| `BOT_TOKEN`           | 所有运行环境 | Telegram 机器人令牌。启动时检查其存在，并验证 Telegram 访问。 |
| `ADMIN_ID`            | 所有运行环境 | 正整数 Telegram ID，必须处于 JavaScript 安全整数范围内。      |
| `OPENROUTER_API_KEY`  | 所有运行环境 | 用于文字和图片请求的 OpenRouter 密钥。                        |
| `DATABASE_URL`        | 所有运行环境 | 使用 `postgres:` 或 `postgresql:` 协议的 URL。                |
| `REDIS_URL`           | 所有运行环境 | 使用 `redis:` 或 `rediss:` 协议的 URL。                       |
| `POSTGRES_USER`       | Compose      | PostgreSQL 用户，默认 `db_user`。                             |
| `POSTGRES_PASSWORD`   | Compose      | 数据库密码，须与 `DATABASE_URL` 一致。                        |
| `POSTGRES_DB`         | Compose      | 数据库名称，默认 `db_name`。                                  |
| `PLATEGA_MERCHANT_ID` | Platega      | 商户标识。                                                    |
| `PLATEGA_SECRET`      | Platega      | 支付平台密钥。两项凭据未齐全时，此支付方式不可用。            |
| `TEST_DATABASE_URL`   | 集成测试     | 独立的测试数据库，应用本身不会使用它。                        |
| `TEST_REDIS_URL`      | 集成测试     | 队列测试专用的 Redis 数据库。                                 |

PostgreSQL 容器的凭据只用于初始化空数据库。修改 `.env` 不会更改 `pgdata` 中现有用户的密码。

## 连接示例

标准 Compose 配置，须同时替换两处密码：

```dotenv
POSTGRES_USER=db_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=db_name
DATABASE_URL=postgres://db_user:CHANGE_ME@postgres:5432/db_name
REDIS_URL=redis://redis:6379
```

本地进程连接开发容器：

```dotenv
DATABASE_URL=postgres://postgres:dev_password@127.0.0.1:15432/bot_dev
REDIS_URL=redis://127.0.0.1:16379/0
```

用户名和密码中的特殊字符需要 URL 编码。机器人容器应使用其他服务的名称，而不是 `localhost`。

[Redis 适配器](../../src/infrastructure/queues/redis.ts) 从 URL 保留用户名、密码和数据库编号；`rediss:` 启用 TLS，连接使用 IPv4。这些选项没有独立的环境变量。

## 数据库中的设置

通过 `/admin` 修改 `global_settings`：

- `pkg_<名称>`：格式为 `Stars_RUB_消息数_图片数` 的套餐。
- `free_mode_enabled`：关闭文字消息扣减。
- `policy_text`、`agreement_text`、`faq_text`：说明文本。
- `support_url`、`buy_stars_url`：支持和 Stars 购买链接。
- `bonus_channel_id`、`bonus_channel_url`：订阅检查的频道及跳转链接。

编辑方式与文本格式差异见[管理说明](administration.md)。

## 代码中的参数

以下配置目前不能通过 `.env` 覆盖：

| 参数                                                  | 文件                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 模型、文字提供方、`max_tokens`、OpenRouter 超时和重试 | [openrouter.ts](../../src/infrastructure/ai/openrouter.ts)                            |
| Platega API 地址及 `return`、`failedUrl`              | [platega.ts](../../src/infrastructure/payments/platega.ts)                            |
| 初始套餐                                              | [packages.ts](../../src/domain/packages.ts)                                           |
| 角色与系统提示词                                      | [roles.ts](../../src/domain/roles.ts)、[prompts.ts](../../src/application/prompts.ts) |
| AI 频率限制及图片费用阈值                             | [ai.ts](../../src/application/ai.ts)                                                  |
| 支付轮询周期                                          | [polling.ts](../../src/presentation/telegram/shop/polling.ts)                         |

启用 Platega 前请检查返回链接：适配器目前保留了 `https://t.me/evaflirt_bot`。

## 初始图片

`src/assets/free_pics/` 相对于应用工作目录解析，支持普通 `.jpg`、`.jpeg`、`.png` 和 `.webp` 文件。请使用拥有相应使用权的图片。

Docker 会把图片复制进镜像，新增文件后需要重新构建。当前没有配置宿主机图片目录挂载。找不到可用本地图片时，机器人返回不可用提示并返还图片预留额度。
