# GitHub 自动化

## 检查和依赖更新

`ci.yml` 在 Node.js 22、24、26 上运行格式、文档链接、TypeScript、ESLint、单元测试和构建检查。独立任务使用 PostgreSQL 15 和 Redis 7 运行集成测试。`codeql.yml` 在推送、拉取请求及每周计划中分析 JavaScript/TypeScript。

Dependabot 每周日检查 npm、GitHub Actions 和 Docker 基础镜像。次要版本与补丁更新合并分组，主要版本单独提交 PR。更新需要审核，不自动合并。Node.js 类型定义保持版本 22，直至调整支持基线。

## 文档、归档和 GitHub Pages

`docs.yml` 检查 Markdown，构建三语言 VitePress 网站，并在 Chromium 中验证导航、搜索、图表和移动菜单。可在工作流运行的 **Artifacts** 部分下载 `documentation.tar.gz`。

首次使用时设置 **Settings → Pages → Build and deployment → Source → GitHub Actions**。默认分支推送、版本标签以及默认分支手动运行在检查成功后部署网站。拉取请求仅构建与检查。预期地址为 <https://hostlife22.github.io/ai-bot-with-payments/>；需要先推送文件并启用 Pages。

```bash
npm install
npm run docs:check
npm run docs:build
npm run docs:preview
npx playwright install chromium
npm run docs:test
```

测试项目路径时，在构建和测试中设置 `DOCS_BASE=/ai-bot-with-payments/`。原始文档保留在 `docs/eng`、`docs/ru`、`docs/zh`；`.docs-site/` 自动生成且被 Git 忽略。网站使用 VitePress 标准响应式主题和本地搜索。

## Docker 与发布归档

`docker.yml` 为分支和 PR 构建并检查生产镜像。版本标签向 GHCR 发布 AMD64/ARM64 镜像及 SBOM、provenance。手动发布需要选择 `publish`，默认关闭。身份验证使用工作流的 `GITHUB_TOKEN`。

`release.yml` 使用 PostgreSQL 和 Redis 完成检查，生成包含源码及编译 JavaScript 的归档、生产依赖 CycloneDX SBOM 和 `SHA256SUMS`。归档排除已安装依赖、真实环境文件和数据库转储。解压后先执行 `npm ci --omit=dev`。

标签必须等于 `v` 加 `package.json` 版本，例如 `v1.0.0`。标签运行创建待审核的**草稿**发布；手动运行仅上传候选产物。不会覆盖已公开的发布。本地命令：`npm run build && npm run release:prepare`。

CodeQL 需要仓库支持代码扫描。Pages 和包发布取决于仓库或组织权限。仅添加这些文件不会立即发布内容。
