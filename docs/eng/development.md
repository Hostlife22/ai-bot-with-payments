# Development and testing

**English** · [Русский](../ru/development.md) · [简体中文](../zh/development.md)

[Documentation](../../README.md#documentation) · [Contributing](contributing.md)

## Local setup

Use a Node.js version matching `engines.node` and a dedicated development Telegram bot. Do not run two polling processes with the same token.

```sh
npm install
cp .env.example .env
```

Start disposable services bound to loopback:

```sh
docker run --rm -d --name ai-bot-dev-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=bot_dev -p 127.0.0.1:15432:5432 postgres:15-alpine

docker run --rm -d --name ai-bot-dev-redis \
  -p 127.0.0.1:16379:6379 redis:7-alpine

docker exec ai-bot-dev-postgres pg_isready -U postgres -d bot_dev
```

Wait until PostgreSQL is ready. Add your bot/OpenRouter credentials and administrator ID to `.env`, then configure:

```dotenv
DATABASE_URL=postgres://postgres:dev_password@127.0.0.1:15432/bot_dev
REDIS_URL=redis://127.0.0.1:16379/0
```

```sh
npm run dev
```

This loads `.env` and runs sources through `tsx`; automatic watch/restart is not enabled. Migrations use the same code as production. These containers are disposable; use Compose with persistent PostgreSQL storage for data you need to retain.

```sh
docker rm -f ai-bot-dev-postgres ai-bot-dev-redis
```

## Validation commands

| Command                | Purpose                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| `npm run typecheck`    | Check source and tests together without emission.                              |
| `npm run lint`         | Check code, Promise handling, and architecture boundaries.                     |
| `npm run format`       | Apply Prettier and import ordering.                                            |
| `npm run format:check` | Verify formatting without changes.                                             |
| `npm test`             | Run `node:test` through `tsx`; enable integrations with environment variables. |
| `npm run build`        | Clean compilation and alias-to-ESM-path rewriting.                             |
| `npm run check`        | Formatting, documentation, types, lint, tests, and build.                      |

`tsconfig.json` includes `src/` and `tests/`, sets `types: ["node"]`, and disables emission. `tsconfig.build.json` emits only `src/` into `dist/`. For editor errors on `node:crypto` or `node:test`, run `npm install`, select workspace TypeScript, and use `TypeScript: Restart TS Server`.

## Documentation checks

`npm run docs:format` formats all three README files, project policies, and localized guides. `npm run docs:check` verifies formatting, local files/heading links, and matching document sets in `docs/ru`, `docs/eng`, and `docs/zh`. Upstream notices are generated separately with `npm run docs:notices` and retain their original text.

## Integration tests

Use isolated services. PostgreSQL tests create a random schema and remove it afterwards. Redis tests remove `ai-requests` in the selected database, so never point them at a production Redis instance.

```sh
docker run --rm -d --name ai-bot-test-pg \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=bot_test \
  -p 127.0.0.1:25432:5432 postgres:15-alpine

docker run --rm -d --name ai-bot-test-redis \
  -p 127.0.0.1:26379:6379 redis:7-alpine

docker exec ai-bot-test-pg pg_isready -U postgres -d bot_test
```

After PostgreSQL is ready:

```sh
TEST_DATABASE_URL=postgres://postgres:test@127.0.0.1:25432/bot_test \
TEST_REDIS_URL=redis://127.0.0.1:26379/15 npm run check

docker rm -f ai-bot-test-pg ai-bot-test-redis
```

Without `TEST_DATABASE_URL` the PostgreSQL suite is skipped; without `TEST_REDIS_URL` the Redis suite is skipped. Unit and integration tests do not make real payments or call external AI APIs. There is no coverage percentage requirement. Name tests `tests/<scenario>.test.ts`.

## Types and aliases

```ts
import type { PurchaseIntent } from '@contracts/purchases';
import type { User } from '@contracts/user';
import { createRepository } from '@database/repository';
```

| Alias          | Directory                              |
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

Use `./file.js` for a sibling and the nearest alias for another module. Put shared models and contracts in focused type files; one-use SQL result shapes may remain next to their query. Avoid a barrel exporting every type.

Alias targets in `paths` use `.js` for NodeNext compatibility. `tsx` resolves sources, and `tsc-alias` rewrites emitted paths. Update TypeScript paths, Prettier import groups, and relevant ESLint restrictions together when adding an alias.

## Schema changes

Add a SQL file to `migrations/` and add its name to [migrate.ts](../../src/infrastructure/database/migrate.ts). Files are not discovered automatically. Applied names are not rerun, so corrections require a new migration. There is no automatic rollback or separate `migrate` command.

Test a fresh database, repeated startup, and upgrading an existing schema. Parameterize SQL values with `$1`, `$2`; SQL identifiers must come from a closed set.
