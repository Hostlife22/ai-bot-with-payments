# Security

**English** · [Русский](../ru/security.md) · [简体中文](../zh/security.md)

## Scope

This policy covers the current primary branch. A separate support period for numbered releases has not been established. Include a commit hash and environment versions so a report can be reproduced.

Relevant issues include administrator authorization bypass, payment substitution or duplicate crediting, concurrent balance overspending, secret/user-data exposure, and unsafe processing of queued jobs or external responses.

## Reporting a vulnerability

Use the [private GitHub Security Advisory form](https://github.com/Hostlife22/ai-bot-with-payments/security/advisories/new) if private vulnerability reporting is enabled.

If unavailable, create an [Issue](https://github.com/Hostlife22/ai-bot-with-payments/issues) requesting a private channel only. Do not include exploit details, tokens, payment payloads, real Telegram IDs, or conversations. A separately verified security email address has not been published.

A private report should contain:

1. The affected use case and potential impact.
2. Commit hash and Node.js/PostgreSQL/Redis versions.
3. Minimal reproduction steps using test accounts and services.
4. Expected/actual behavior and sanitized logs.
5. A proposed fix or regression test, if available.

Test only environments you own or have permission to assess. Use test payments and data; do not extract others' conversations or change their balances. Coordinate public disclosure with the maintainer. No fixed response or remediation timeline is promised.

## Secrets and user data

- Store Telegram/OpenRouter tokens, Platega credentials, and database passwords in the environment. `.env` is excluded from Git and Docker build context.
- If a secret leaks, rotate it with the provider and update the application environment. Removing it from the latest commit does not revoke it.
- PostgreSQL, backups, and SQL dumps contain user data. Keep them out of PRs, public Issues, and shared logs.
- Use separate development/test credentials, PostgreSQL, and Redis. Queue tests remove their queue in the supplied Redis database.

## Updates and validation

Install with `npm install`. To inspect runtime dependencies:

```sh
npm audit --omit=dev
```

Dependency auditing does not validate payment or authorization logic. Run `npm run check` and relevant integration scenarios for a fix. Update [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) after dependency changes.

Crash reservations, Redis storage, and local session boundaries are documented in [operations](operations.md). Interface accessibility reports follow [ACCESSIBILITY.md](accessibility.md).
