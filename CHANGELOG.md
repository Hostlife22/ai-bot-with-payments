# Changelog

**English** · [Русский](docs/ru/changelog.md) · [简体中文](docs/zh/changelog.md)

Significant changes are recorded here. Add entries to `Unreleased`; assign a version and date when a release is actually made. `package.json` version metadata alone does not indicate a published release.

## [Unreleased]

- Named configuration constants, shared message/error catalogs and typed text formatters; parameterized SQL windows and limits, configurable package labels, and lint rules against inline messages and magic numbers.

## [1.0.0] - 2026-11-11

### Added

- Canonical URLs, language alternatives, Open Graph/Twitter metadata, a sitemap and robots.txt for the documentation website.
- Dependabot groups, GitHub issue forms, CI, CodeQL, Docker publication, draft release archives and a three-language GitHub Pages documentation site.
- Strict TypeScript for source/tests and a separate production build configuration.
- Focused `src/types/` contracts, short module aliases, and Node.js-compatible alias rewriting.
- Dependency factories, separate startup/shutdown modules, and session cleanup.
- SQL migrations with an application journal and advisory lock.
- Purchase snapshots, payment proof validation, and transactional single fulfillment.
- Unit/integration coverage for PostgreSQL, Redis, Telegram middleware, and lifecycle behavior.
- Prettier, import sorting, and ESLint architecture checks.
- English, Russian, and Simplified Chinese READMEs and guides for setup, architecture, development, payments, administration, and operations.
- Contributing, security, accessibility, and third-party notices documentation with a notice generator.
- The project's MIT license text.

### Changed

- JavaScript migrated to TypeScript with domain, application, adapter, and Telegram responsibilities separated.
- PostgreSQL repository split by responsibility; shop split into menu, Stars, Platega, and polling modules.
- Multi-stage Docker build and runtime execution as user `node`.
- Package identity/links updated to `Hostlife22/ai-bot-with-payments`; compatible dependency ranges refreshed.
- Node.js requirement aligned with tooling: 22.13+ in the 22 branch, or 24+.
- Package license changed from `ISC` to `MIT`.

### Fixed

- Authorization checks across administrator callback families.
- Concurrent duplicate referral rewards and purchase credits.
- Concurrent balance overspending and refunds after handled generation failures.
- Waiting for migrations and closing background resources during graceful shutdown.
- Node.js type definitions and editor project membership for tests using `node:crypto` and `node:test`.
- Removal of obsolete `dist` artifacts before compilation.

### Upgrade notes

- Legacy invoices without `purchase_intents` require separate reconciliation; automatic fulfillment is unavailable for them.
- Reservation handling has no separate recovery ledger after process crashes.
- Back up the database before upgrading and review [operations](docs/eng/operations.md).
