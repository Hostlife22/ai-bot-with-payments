# 开发与测试

[English](../eng/development.md) · [Русский](../ru/development.md) · **简体中文**

[返回文档](../../README.zh-CN.md#文档) · [贡献指南](contributing.md)

## 本地环境

使用满足 `engines.node` 的 Node.js 版本和独立的开发机器人。不要同时运行使用相同令牌的两个 polling 进程。

```sh
npm install
cp .env.example .env
```

启动仅绑定 loopback 的临时服务：

```sh
docker run --rm -d --name ai-bot-dev-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=bot_dev -p 127.0.0.1:15432:5432 postgres:15-alpine

docker run --rm -d --name ai-bot-dev-redis \
  -p 127.0.0.1:16379:6379 redis:7-alpine

docker exec ai-bot-dev-postgres pg_isready -U postgres -d bot_dev
```

等待 PostgreSQL 就绪。在 `.env` 中填写机器人、OpenRouter 凭据和管理员 ID，再配置：

```dotenv
DATABASE_URL=postgres://postgres:dev_password@127.0.0.1:15432/bot_dev
REDIS_URL=redis://127.0.0.1:16379/0
```

```sh
npm run dev
```

该命令读取 `.env` 并通过 `tsx` 运行源码，未启用自动监视或重启。迁移逻辑与生产运行一致。这些容器是临时的；需要保留数据时，请使用带 PostgreSQL 持久卷的 Compose。

```sh
docker rm -f ai-bot-dev-postgres ai-bot-dev-redis
```

## 验证命令

| 命令                   | 作用                                                    |
| ---------------------- | ------------------------------------------------------- |
| `npm run typecheck`    | 在同一项目中检查源码和测试，不生成文件。                |
| `npm run lint`         | 检查代码、Promise 处理及架构边界。                      |
| `npm run format`       | 应用 Prettier 和导入排序。                              |
| `npm run format:check` | 只检查格式，不修改文件。                                |
| `npm test`             | 通过 `tsx` 执行 `node:test`，通过环境变量启用集成测试。 |
| `npm run build`        | 清理构建并将别名转换成 ESM 路径。                       |
| `npm run check`        | 检查格式、文档、类型、ESLint、测试和构建。              |

`tsconfig.json` 包含 `src/` 和 `tests/`，显式设置 `types: ["node"]` 并关闭输出。`tsconfig.build.json` 只把 `src/` 编译到 `dist/`。编辑器无法识别 `node:crypto` 或 `node:test` 时，执行 `npm install`、选择工作区 TypeScript，再运行 `TypeScript: Restart TS Server`。

## 文档检查

`npm run docs:format` 格式化三个 README、项目政策和本地化指南。`npm run docs:check` 检查格式、本地文件与标题链接，以及 `docs/ru`、`docs/eng`、`docs/zh` 的文件集合一致性。上游声明通过 `npm run docs:notices` 单独生成，保留原文。

## 集成测试

使用隔离的服务。PostgreSQL 测试创建随机 schema，结束后删除。Redis 测试会删除所选数据库中的 `ai-requests`，因此绝不能连接生产 Redis。

```sh
docker run --rm -d --name ai-bot-test-pg \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=bot_test \
  -p 127.0.0.1:25432:5432 postgres:15-alpine

docker run --rm -d --name ai-bot-test-redis \
  -p 127.0.0.1:26379:6379 redis:7-alpine

docker exec ai-bot-test-pg pg_isready -U postgres -d bot_test
```

就绪后运行：

```sh
TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:25432/bot_test \
TEST_REDIS_URL=redis://127.0.0.1:26379/15 npm run check

docker rm -f ai-bot-test-pg ai-bot-test-redis
```

没有 `TEST_DATABASE_URL` 时跳过 PostgreSQL 组，没有 `TEST_REDIS_URL` 时跳过 Redis 组。单元和集成测试不执行真实支付，也不调用外部 AI API。没有固定覆盖率门槛。测试文件使用 `tests/<场景>.test.ts`。

## 类型与别名

```ts
import type { PurchaseIntent } from '@contracts/purchases';
import type { User } from '@contracts/user';
import { createRepository } from '@database/repository';
```

| 别名           | 目录                                   |
| -------------- | -------------------------------------- |
| `@bootstrap/*` | `src/bootstrap/*`                      |
| `@config/*`    | `src/config/*`                         |
| `@contracts/*` | `src/types/*`                          |
| `@domain/*`    | `src/domain/*`                         |
| `@app/*`       | `src/application/*`                    |
| `@database/*`  | `src/infrastructure/database/*`        |
| `@providers/*` | `src/infrastructure/ai/*`              |
| `@payments/*`  | `src/infrastructure/payments/*`        |
| `@queues/*`    | `src/infrastructure/queues/*`          |
| `@telegram/*`  | `src/presentation/telegram/*`          |
| `@shop/*`      | `src/presentation/telegram/shop/*`     |
| `@admin/*`     | `src/presentation/telegram/admin/*`    |
| `@handlers/*`  | `src/presentation/telegram/handlers/*` |

同目录文件使用 `./file.js`，跨模块使用最近的别名。共享模型和契约放在对应类型文件中，一次性 SQL 结果类型可保留在查询附近。不要建立重新导出全部类型的总入口。

为兼容 NodeNext，`paths` 的目标使用 `.js`。`tsx` 解析源码，`tsc-alias` 转换编译后的路径。新增别名时同时更新 TypeScript、Prettier 导入分组和相应 ESLint 限制。

## 修改数据库结构

在 `migrations/` 添加 SQL 文件，并将文件名加入 [migrate.ts](../../src/infrastructure/database/migrate.ts)。迁移文件不会自动发现；已应用名称不会再次运行，因此修复需要新迁移。没有自动回滚或单独的 `migrate` 命令。

验证全新数据库、重复启动和已有结构升级。SQL 值通过 `$1`、`$2` 传参，SQL 标识符只能从封闭集合中选择。
