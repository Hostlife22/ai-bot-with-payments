# Contributing

**English** · [Русский](../ru/contributing.md) · [简体中文](../zh/contributing.md)

Start with the [README](../../README.md), [architecture](architecture.md), and [local setup](development.md).

## Proposing changes

Report ordinary bugs through [Issues](https://github.com/Hostlife22/ai-bot-with-payments/issues). Include reproduction steps, expected/actual behavior, Node.js version, and commit hash. Remove credentials, real conversations, and payment data.

Discuss substantial behavior changes first: explain the affected use case, data, and upgrade path. Report vulnerabilities using [SECURITY.md](security.md) and accessibility issues using [ACCESSIBILITY.md](accessibility.md).

## Setup

1. Create a fork or working branch from the current primary branch.
2. Install a supported Node.js version and run `npm ci`.
3. Configure a dedicated bot, `.env`, PostgreSQL, and Redis as described in development documentation.
4. Add a regression test for a bug involving balances, payments, access, or background processing.

Use descriptive branch names such as `feat/payment-status`, `fix/referral-race`, and `docs/local-setup`.

## Code and architecture

- Keep strict TypeScript checks enabled. Do not suppress problems with `any`, `@ts-ignore`, or non-null assertions.
- Use Prettier: four-space indentation, single quotes, semicolons. `npm run format` also sorts imports.
- Use short aliases such as `@database/users` and `@contracts/user`; use `./file.js` for siblings.
- Put shared models/contracts in focused `src/types/` files and use `import type`. Keep executable behavior in its appropriate layer.
- Application use cases depend on contracts, adapters implement them, and bootstrap wires implementations. Do not open connections or start timers during module import.
- Preserve existing data. Add a new migration and list it in `migrate.ts` rather than editing an applied migration.
- Handle errors, release resources, parameterize SQL, and account for concurrent balance/state changes.

## Validation before a pull request

```sh
npm run format
npm run docs:format
npm run check
```

For database/queue changes, also run integration suites with `TEST_DATABASE_URL` and `TEST_REDIS_URL` against isolated services. See [integration tests](development.md#integration-tests).

Payment tests should cover duplicate confirmation, wrong amount/currency/owner, concurrent fulfillment, and rollback. Balance tests should cover nonnegative results and refunds after handled generation failures. Name files `tests/<scenario>.test.ts`; no fixed coverage percentage is required.

Test menu changes as an ordinary user and administrator. Review long labels, navigation, screen-reader behavior, and meaning without relying solely on emoji or color.

After dependency updates, synchronize the lockfile and run:

```sh
npm run docs:notices
```

## Commits and pull requests

Use concise prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, or `chore:`. Example: `fix: prevent duplicate Stars credits`.

A PR description should include the problem and resulting behavior, related Issue, schema/environment/upgrade changes, validation results, and limits such as absent live provider testing. Include sanitized screenshots or a short recording for menu changes.

Update affected documentation and the `Unreleased` section of [CHANGELOG.md](changelog.md). Keep English, Russian, and Simplified Chinese guides aligned, including commands and operational limits. Do not commit `dist/`, `.env`, dumps, backups, or user logs.

Contributions use the project's [MIT license](../../LICENSE). Added third-party code must retain its notices and compatible distribution terms.

- [GitHub automation and documentation website checks](ci-cd.md)
