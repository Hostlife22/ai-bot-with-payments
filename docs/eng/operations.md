# Operations

**English** · [Русский](../ru/operations.md) · [简体中文](../zh/operations.md)

[Documentation](../../README.md#documentation)

## Startup and updates

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 bot
```

PostgreSQL and Redis have healthchecks; the bot has no HTTP health endpoint. After startup, check `/start`, the profile, and `/admin` from the authorized account. A successful build does not validate external-service credentials.

Before upgrading, preserve the database, `.env` outside Git, and supplied photos. To update only the bot:

```sh
docker compose up --build -d bot
```

Migrations run during startup. Schema rollback is not automatic; an older image must remain compatible with the schema. Do not run old and new polling processes with the same token concurrently.

Compose does not set `stop_grace_period`, while an AI request may take up to 120 seconds. Allow time for graceful completion:

```sh
docker compose stop -t 180 bot
```

This is a waiting allowance rather than a guarantee for every external request. Forced termination can leave a reservation and an unfinished job.

## Storage

- PostgreSQL uses the named `pgdata` volume. `docker compose down` preserves it; `-v` removes it.
- Compose defines no named Redis volume or separate queue persistence policy. Do not rely on all queued work surviving service recreation.
- Purchase snapshots live in PostgreSQL; eligible Platega checks resume independently of AI queue state.
- Drafts, selected administrator targets, and rate limits live in memory and reset on restart.
- Conversation history has no automatic retention period. Clearing context removes it for that user.

Multiple instances need a separate update-ingestion design, shared sessions, and coordinated campaigns. Migration locking alone does not provide those guarantees.

## PostgreSQL backup

Create a custom-format dump outside the repository:

```sh
mkdir -p ../ai-bot-backups

docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "../ai-bot-backups/bot-$(date +%Y%m%d-%H%M%S).dump"
```

Check the command's exit status and inspect the dump with `pg_restore --list`. Backups contain user data and payment history; store them separately from source code.

Test restoration into a new database, replacing the example filename:

```sh
docker compose exec -T postgres sh -c \
  'createdb -U "$POSTGRES_USER" bot_restore'

docker compose exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d bot_restore --no-owner --no-privileges' \
  < ../ai-bot-backups/backup.dump
```

These commands do not switch the application database. Stop the bot before switching, update `DATABASE_URL`, restart, and verify balances, purchases, and migration records. `database_backup.sql` is not automatically imported.

## Migrations

Files are explicitly listed in [migrate.ts](../../src/infrastructure/database/migrate.ts). `init.sql` runs idempotently, then unapplied migration names run. A transaction and advisory lock protect the complete pass.

Open `psql` for diagnosis:

```sh
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Read-only examples:

```sql
SELECT name, applied_at FROM schema_migrations ORDER BY name;
SELECT id, provider, amount, currency, provider_tx_id, fulfilled_at, canceled_at
FROM purchase_intents ORDER BY created_at DESC LIMIT 20;
```

Do not publish results containing user or transaction identifiers.

## Diagnostics

| Symptom                      | Check                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Missing environment variable | Required values and how `.env` is loaded; `npm start` does not load it.                      |
| Missing Node types in tests  | `npm ci`, root `tsconfig.json`, workspace TypeScript, restart TS Server.                     |
| PostgreSQL unavailable       | Service readiness, URL, existing user's password, container versus host addresses.           |
| Jobs not processed           | `REDIS_URL`, Redis database number, queue and worker logs.                                   |
| Polling conflict             | Another process or environment using the same token.                                         |
| Starter photos unavailable   | Files in the runtime image, supported extensions, rebuilding after additions.                |
| Image generation unavailable | Text/photo balances, `has_purchased`, recorded daily cost, model access and response format. |
| Channel bonus unavailable    | Channel ID, bot privileges, actual membership.                                               |
| Platega unavailable          | Both credentials, HTTP errors, expected JSON, HTTPS payment link.                            |
| Payment not credited         | Purchase UUID, amount, currency, payload, transaction binding, purchase state.               |
| Partial broadcast            | Delivery errors, blocked bot, message markup.                                                |

Reconcile provider data against the stored purchase before manual action. Do not remove `payments.tx_id` uniqueness or clear `fulfilled_at` to credit again. The administrator panel provides history and manual grants.

## Cost accounting limits

Daily accounting resets logically when the PostgreSQL date changes. Image generation checks recorded cost against a 1 USD threshold before the request. This does not reserve a budget: parallel requests may both pass, and unreported image costs remain unrecorded.

When `usage.cost` is absent, text cost is estimated with adapter coefficients. Review those coefficients when changing models; application statistics do not replace provider billing records.

See [security](security.md) for secrets and vulnerability reporting, and [accessibility](accessibility.md) for interface problems.
