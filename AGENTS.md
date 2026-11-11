# Repository Guidelines

## Project Structure & Module Organization

This repository implements a Telegram AI bot using Telegraf, OpenRouter, PostgreSQL, and BullMQ/Redis.

- `src/bot.js`: application entry point, command routing, shop, and administration.
- `src/handlers/`: profile, AI settings, and help handlers.
- `src/ai.js` and `src/prompts.js`: AI requests and system prompt templates.
- `src/database.js`: database access and startup schema updates; `init.sql` defines base tables.
- `src/queue.js`, `src/broadcast.js`, and `src/referral.js`: AI jobs, broadcast jobs, and referral logic.
- `src/platega.js`: payment provider integration.
- `Dockerfile` and `docker-compose.yml`: bot, PostgreSQL, and Redis deployment.

No test directory exists. Image handling expects `src/assets/free_pics/`, but `src/assets` is currently a placeholder file; resolve this before adding images.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from the lockfile.
- `npx eslint src`: run the configured ESLint checks.
- `docker compose up --build -d`: build and start the bot and supporting services using `.env`.
- `docker compose logs -f bot`: follow application logs.
- `node --dns-result-order=ipv4first src/bot.js`: run directly with environment variables exported and PostgreSQL/Redis available.

There is no compilation step or working test script. `npm test` currently exits with an error by design.

## Coding Style & Naming Conventions

Use JavaScript ES modules with explicit `.js` extensions in relative imports. Follow surrounding code: four-space indentation, semicolons, and predominantly single-quoted strings. Use camelCase for functions and variables, UPPER_SNAKE_CASE for constants and environment variables, and snake_case for SQL columns. Preserve existing filenames such as `ai_menu.js`. ESLint flags undefined identifiers as errors and unused variables as warnings; no formatter is configured.

## Testing Guidelines

No test framework or coverage threshold is configured. Run ESLint and manually verify affected flows using a development bot and isolated database: onboarding, AI replies, balances, referrals, and payment handling. Check that repeated payment checks cannot credit balances twice. Describe verification steps and results in the pull request.

## Commit & Pull Request Guidelines

The sole existing commit uses `feat: ...`; continue with concise Conventional Commit prefixes such as `feat:`, `fix:`, or `docs:`. Pull requests should explain behavior changes, reference relevant issues, list configuration or schema changes, and document validation. Include screenshots for Telegram menu changes.

## Security & Configuration

Keep `.env`, tokens, payment secrets, and user data out of commits and logs. Configure `BOT_TOKEN`, `ADMIN_ID`, `OPENROUTER_API_KEY`, `DATABASE_URL`, `REDIS_URL`, and PostgreSQL credentials; Platega requires `PLATEGA_MERCHANT_ID` and `PLATEGA_SECRET`. Treat `database_backup.sql` as potentially sensitive data, not a test fixture.
