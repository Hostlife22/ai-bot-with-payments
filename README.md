# AI Bot with Payments

**English** · [Русский](README.ru.md) · [简体中文](README.zh-CN.md)

[Documentation](https://hostlife22.github.io/ai-bot-with-payments/)

A TypeScript Telegram bot with OpenRouter conversations, PostgreSQL storage, BullMQ/Redis queues, and message/photo packages paid through Telegram Stars or Platega.

## Features

- Text conversations with history, predefined roles, and custom system prompts.
- Local starter photos and image generation for customers who have purchased a package.
- Message and photo balances, package purchases, discounts, and promo codes.
- Referral rewards and daily bonuses with optional channel subscription checks.
- An administrator panel for users, balances, prices, content, statistics, and broadcasts.
- Background reminders and restart recovery for pending payment checks.

Updates are received through Telegram polling. The project currently has no HTTP API, user-media analysis, or voice generation.

## Quick start

Docker deployment requires Docker Engine and Compose. Running the bot outside Docker requires Node.js `^22.13.0 || >=24`, npm, PostgreSQL 15+, and Redis 7+.

```sh
cp .env.example .env
```

Fill in `BOT_TOKEN`, `ADMIN_ID`, `OPENROUTER_API_KEY`, and the database/Redis connection details. Inside Compose, the service hosts are `postgres` and `redis`. Platega also requires both provider credentials. See [configuration](docs/eng/configuration.md).

Place starter images in `src/assets/free_pics/` before building, then run:

```sh
docker compose up --build -d
docker compose ps
docker compose logs -f bot
```

Migrations run automatically before the bot starts. `database_backup.sql` is not imported automatically. Send `/start`, accept the terms, and check your profile. `/admin` is available to the Telegram ID in `ADMIN_ID`.

Compose stores PostgreSQL data in the named `pgdata` volume. It does not publish PostgreSQL or Redis ports to the host. For local development, use the [separate services with published ports](docs/eng/development.md).

## Commands

| Command                | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `npm ci`               | Install the locked dependency tree.                               |
| `npm run dev`          | Run TypeScript sources through `tsx`, loading `.env`.             |
| `npm run check`        | Check formatting, documentation, types, ESLint, tests, and build. |
| `npm run format`       | Format code and sort imports.                                     |
| `npm run build`        | Clean `dist`, compile TypeScript, and rewrite aliases.            |
| `npm start`            | Run `dist/main.js` with an already configured environment.        |
| `npm run docs:notices` | Regenerate third-party package notices.                           |

`npm start` does not load `.env` itself. To use an environment file with a compiled build:

```sh
node --env-file=.env --dns-result-order=ipv4first dist/main.js
```

## Documentation

Full guides: [English](docs/eng/architecture.md), [Русский](docs/ru/architecture.md), [简体中文](docs/zh/architecture.md).

| Document                                         | Contents                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| [Configuration](docs/eng/configuration.md)       | Environment variables, connections, database settings, code-level parameters. |
| [Architecture](docs/eng/architecture.md)         | Layers, types, queues, tables, startup and shutdown.                          |
| [Development](docs/eng/development.md)           | Local setup, tests, aliases, formatting, migrations.                          |
| [Payments](docs/eng/payments.md)                 | Packages, purchase snapshots, Stars, Platega, fulfillment boundaries.         |
| [Administration](docs/eng/administration.md)     | Menus, balances, prices, promo codes, rewards, broadcasts.                    |
| [Operations](docs/eng/operations.md)             | Updates, backups, diagnostics, storage and recovery limits.                   |
| [Contributing](CONTRIBUTING.md)                  | Changes, validation, commits, pull requests.                                  |
| [Security](SECURITY.md)                          | Private vulnerability reporting and secret handling.                          |
| [Accessibility](ACCESSIBILITY.md)                | Telegram interface behavior and manual checks.                                |
| [Changelog](CHANGELOG.md)                        | Changes awaiting release.                                                     |
| [Third-party components](THIRD_PARTY_NOTICES.md) | Installed versions and upstream notices.                                      |

## Operational boundaries

- One process hosts polling, workers, and schedulers. Sessions and rate limits are local; multi-instance coordination is not implemented.
- A handled failure refunds a reserved balance. A process crash can leave a reservation, and a retried job can repeat an external AI request.
- Free Mode disables message debits, not photo limits. VIP grants 9999 messages and 9999 photos rather than a timed subscription.
- Photo requests enter the text flow and also require a message balance when Free Mode is off.
- Legacy JavaScript invoices without purchase snapshots require manual reconciliation during migration.

## License

Project code is licensed under [MIT](LICENSE). Dependencies retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The project license does not automatically cover uploaded photos or external API output.

- [GitHub automation, documentation website and releases](docs/eng/ci-cd.md)
