# AI Bot with Payments

[English](README.md) · [Русский](README.ru.md) · **简体中文**

[文档](https://hostlife22.github.io/ai-bot-with-payments/zh/)

基于 TypeScript 的 Telegram AI 机器人，使用 OpenRouter、PostgreSQL 和 BullMQ/Redis，支持通过 Telegram Stars 与 Platega 购买消息和图片套餐。

## 功能

- 支持历史记录、预设角色和自定义系统提示词的文字对话。
- 为新用户提供本地图片，为购买过套餐的用户生成图片。
- 消息和图片余额、套餐商店、折扣与优惠码。
- 推荐奖励，以及可选频道订阅检查的每日奖励。
- 管理面板：用户、余额、价格、文本、统计与群发。
- 后台提醒，以及重启后继续检查待支付订单。

机器人通过 Telegram polling 获取更新。目前没有独立 HTTP API、用户媒体分析或语音生成。

## 快速开始

Docker 部署需要 Docker Engine 和 Compose。在容器外运行机器人需要 Node.js `^22.13.0 || >=24`、npm、PostgreSQL 15+ 和 Redis 7+。

```sh
cp .env.example .env
```

填写 `BOT_TOKEN`、`ADMIN_ID`、`OPENROUTER_API_KEY` 和数据库、Redis 连接信息。Compose 内的服务地址分别为 `postgres` 和 `redis`。Platega 还需要两项支付平台凭据。详见[配置说明](docs/zh/configuration.md)。

构建前将初始图片放入 `src/assets/free_pics/`，然后运行：

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f bot
```

数据库迁移会在机器人启动前自动执行，不会自动导入 `database_backup.sql`。向机器人发送 `/start`、接受条款并查看个人资料。`/admin` 仅对 `ADMIN_ID` 指定的 Telegram 用户开放。

Compose 使用名为 `pgdata` 的卷保存 PostgreSQL 数据，不向宿主机发布 PostgreSQL 或 Redis 端口。本地开发请使用[单独发布端口的服务](docs/zh/development.md)。

## 常用命令

| 命令                   | 用途                                           |
| ---------------------- | ---------------------------------------------- |
| `npm ci`               | 根据 lockfile 安装依赖。                       |
| `npm run dev`          | 读取 `.env`，通过 `tsx` 运行 TypeScript 源码。 |
| `npm run check`        | 检查代码与文档格式、类型、ESLint、测试和构建。 |
| `npm run format`       | 格式化代码并排序导入。                         |
| `npm run build`        | 清空 `dist`，编译 TypeScript 并转换路径别名。  |
| `npm start`            | 使用已配置的环境变量运行 `dist/main.js`。      |
| `npm run docs:notices` | 重新生成第三方依赖声明。                       |

`npm start` 不会自行读取 `.env`。编译后可使用：

```sh
node --env-file=.env --dns-result-order=ipv4first dist/main.js
```

## 文档

完整文档：[English](docs/eng/architecture.md)、[Русский](docs/ru/architecture.md)、[简体中文](docs/zh/architecture.md)。

| 文档                                         | 内容                                           |
| -------------------------------------------- | ---------------------------------------------- |
| [配置](docs/zh/configuration.md)             | 环境变量、连接地址、数据库设置和代码中的参数。 |
| [架构](docs/zh/architecture.md)              | 分层、类型、队列、表结构与应用生命周期。       |
| [开发](docs/zh/development.md)               | 本地运行、测试、别名、格式化和迁移。           |
| [支付](docs/zh/payments.md)                  | 套餐、订单快照、Stars、Platega 和入账限制。    |
| [管理](docs/zh/administration.md)            | 菜单、余额、价格、优惠码、奖励与群发。         |
| [运维](docs/zh/operations.md)                | 更新、备份、排错和存储限制。                   |
| [贡献指南](docs/zh/contributing.md)          | 变更准备、验证、提交和 pull request。          |
| [安全](docs/zh/security.md)                  | 私密漏洞报告和密钥管理。                       |
| [无障碍](docs/zh/accessibility.md)           | Telegram 界面行为与人工检查。                  |
| [更新日志](docs/zh/changelog.md)             | 等待发布的变更。                               |
| [第三方组件](docs/zh/third-party-notices.md) | 依赖版本、许可证和上游声明。                   |

## 运行限制

- polling、worker 和定时任务运行在一个进程中。会话和频率限制是本地状态，尚未实现多实例协调。
- 捕获并处理的错误会返还预留余额。进程崩溃可能留下预留，任务重试也可能重复调用外部 AI。
- Free Mode 仅关闭消息扣减，不取消图片限制。VIP 增加 9999 条消息和 9999 张图片，并非按时长订阅。
- 图片请求使用文字处理流程，关闭 Free Mode 时也需要消息余额。
- 没有订单快照的旧 JavaScript 版本账单需要在迁移时人工核对。

## 许可证

项目代码采用 [MIT](LICENSE)。依赖保留各自的许可条件，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。项目许可证不会自动覆盖上传的图片或外部 API 生成的内容。

- [GitHub 自动化、文档网站和发布](docs/zh/ci-cd.md)
