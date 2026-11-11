# Configuration

**English** · [Русский](../ru/configuration.md) · [简体中文](../zh/configuration.md)

[Documentation](../../README.md#documentation)

The environment loader is [env.ts](../../src/config/env.ts). Copy `.env.example` to `.env` and keep real credentials out of Git.

## Environment variables

| Variable              | Required for         | Value                                                                                            |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| `BOT_TOKEN`           | All application runs | Telegram bot token. Presence is validated; Telegram access is checked at startup.                |
| `ADMIN_ID`            | All application runs | A positive Telegram ID representable as a safe JavaScript integer.                               |
| `OPENROUTER_API_KEY`  | All application runs | OpenRouter key for text and image requests.                                                      |
| `DATABASE_URL`        | All application runs | A `postgres:` or `postgresql:` URL.                                                              |
| `REDIS_URL`           | All application runs | A `redis:` or `rediss:` URL.                                                                     |
| `POSTGRES_USER`       | Compose              | PostgreSQL user; defaults to `db_user`.                                                          |
| `POSTGRES_PASSWORD`   | Compose              | PostgreSQL password; it must match `DATABASE_URL`.                                               |
| `POSTGRES_DB`         | Compose              | Database name; defaults to `db_name`.                                                            |
| `PLATEGA_MERCHANT_ID` | Platega              | Merchant identifier.                                                                             |
| `PLATEGA_SECRET`      | Platega              | Provider secret. Without both credentials the client reports this payment method as unavailable. |
| `TEST_DATABASE_URL`   | Integration tests    | An isolated test database; the application does not use it.                                      |
| `TEST_REDIS_URL`      | Integration tests    | An isolated Redis database for queue tests.                                                      |

PostgreSQL container credentials initialize an empty database. Editing `.env` does not change an existing user's password in `pgdata`.

## Connection examples

Standard Compose, replacing the password in both locations:

```dotenv
POSTGRES_USER=db_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=db_name
DATABASE_URL=postgres://db_user:CHANGE_ME@postgres:5432/db_name
REDIS_URL=redis://redis:6379
```

For a local process using the development containers:

```dotenv
DATABASE_URL=postgres://postgres:dev_password@127.0.0.1:15432/bot_dev
REDIS_URL=redis://127.0.0.1:16379/0
```

URL-encode special characters in credentials. Inside the bot container, use the other services' names rather than `localhost`.

The [Redis adapter](../../src/infrastructure/queues/redis.ts) preserves the URL username, password, and database number, enables TLS for `rediss:`, and uses IPv4. These options have no separate environment variables.

## Database-backed settings

`/admin` updates values in `global_settings`:

- `pkg_<name>`: a package encoded as `Stars_RUB_Messages_Photos`.
- `free_mode_enabled`: disable text-message debits.
- `policy_text`, `agreement_text`, `faq_text`: informational content.
- `support_url`, `buy_stars_url`: support and Stars purchase links.
- `bonus_channel_id`, `bonus_channel_url`: channel membership check and its button link.

Editing instructions and text formatting differences are in [administration](administration.md).

## Parameters defined in code

These are not overridden through `.env`:

| Parameter                                                     | Source                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Models, text provider, `max_tokens`, OpenRouter timeout/retry | [ai.ts](../../src/constants/ai.ts)                                                 |
| Platega API URL and `return`/`failedUrl` links                | [payments.ts](../../src/constants/payments.ts)                                     |
| Initial package values                                        | [packages.ts](../../src/constants/packages.ts)                                     |
| Roles and system prompts                                      | [roles.ts](../../src/domain/roles.ts), [prompts.ts](../../src/messages/prompts.ts) |
| AI rate limits and image-cost threshold                       | [ai.ts](../../src/constants/ai.ts)                                                 |
| Payment polling interval                                      | [payments.ts](../../src/constants/payments.ts)                                     |

Before enabling Platega, review the return links: `src/constants/payments.ts` currently contains `https://t.me/evaflirt_bot`.

## Starter photos

`src/assets/free_pics/` is resolved from the application's working directory. Regular `.jpg`, `.jpeg`, `.png`, and `.webp` files are supported. Supply images with suitable usage rights.

Docker copies photos into the image; rebuild after adding files. No host-directory volume is configured. If no local photo is available, the bot reports unavailability and refunds the photo reservation.

## Constants and messages

Use `@constants/*` for policy and runtime values, and `@messages/*` for text. Shared buttons live in `messages/common.ts`; errors and logs have separate catalogs. Keep dynamic text in typed formatter functions, and derive displayed limits and rewards from the same constants used by services. ESLint rejects magic numbers and inline error/Telegram reply strings in implementation modules; zero, one, array indexes and type literals retain their structural meaning.

Rebuild after editing constants. Stored `pkg_*` settings override `DEFAULT_PACKAGES`; update existing prices and quantities through the administrator panel.
