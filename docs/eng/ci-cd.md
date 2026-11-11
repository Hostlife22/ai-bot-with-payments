# GitHub automation

## Checks and dependency updates

`ci.yml` runs formatting, documentation links, TypeScript, ESLint, unit tests and builds on Node.js 22, 24 and 26. A separate job runs PostgreSQL 15 and Redis 7 integration tests. `codeql.yml` scans JavaScript/TypeScript on pushes, pull requests and weekly.

Dependabot checks npm packages, GitHub Actions and Docker base images every Sunday. Minor and patch updates are grouped; major updates remain separate. Changes require review and are never automatically merged. Node.js type definitions stay on version 22 until the supported baseline changes.

## Documentation and GitHub Pages

`docs.yml` validates Markdown, builds the three-language VitePress website, tests navigation, search, diagrams and mobile menus in Chromium, and uploads `documentation.tar.gz`. Download this archive from the workflow run's **Artifacts** section.

Enable **Settings → Pages → Build and deployment → Source → GitHub Actions** once. Successful default-branch pushes, version tags and manual runs on the default branch deploy to GitHub Pages. Pull requests only build and validate. The expected URL is <https://hostlife22.github.io/ai-bot-with-payments/>; publication requires pushing these files and enabling Pages.

```bash
npm ci
npm run docs:check
npm run docs:build
npm run docs:preview
npx playwright install chromium
npm run docs:test
```

For a project-path preview, set `DOCS_BASE=/ai-bot-with-payments/` when building and testing. Source Markdown stays in `docs/eng`, `docs/ru`, `docs/zh`; `.docs-site/` is generated and ignored. The standard VitePress theme supplies responsive navigation and local search.

## Docker and release archives

`docker.yml` builds and checks the production image on branches and pull requests. Version tags publish AMD64/ARM64 images to GHCR with SBOM and provenance. Manual publication requires selecting `publish`; its default is false. Authentication uses the workflow's `GITHUB_TOKEN`.

`release.yml` runs all checks with PostgreSQL and Redis, creates a source/runtime archive containing compiled JavaScript, a production CycloneDX SBOM and `SHA256SUMS`. The archive excludes installed dependencies, real environment files and database dumps. After extraction, run `npm ci --omit=dev` before starting the compiled bot.

The tag must equal `v` plus `package.json` version, for example `v1.0.0`. Tag runs create a **draft** release for review; manual runs only upload candidate artifacts. Published releases are never overwritten. Locally: `npm run build && npm run release:prepare`.

CodeQL requires GitHub code scanning availability for the repository. Pages and package publication also depend on repository/organization permissions. No deployment or release is created merely by adding these files.
