# 更新日志

[English](../eng/changelog.md) · [Русский](../ru/changelog.md) · **简体中文**

重要变更记录在此。新条目先加入 `Unreleased`，实际发布时再指定版本和日期。`package.json` 的版本字段本身不代表已发布版本。

## [Unreleased]

### 新增

- 源码与测试的严格 TypeScript 检查，以及独立生产构建配置。
- 按主题拆分的 `src/types/` 契约、短模块别名和 Node.js 兼容转换。
- 依赖工厂、独立启动/停止模块和会话清理。
- 带迁移记录与 advisory lock 的 SQL 迁移。
- 订单快照、支付凭据校验和事务内单次入账。
- PostgreSQL、Redis、Telegram 中间件和生命周期的单元/集成测试。
- Prettier、导入排序和 ESLint 架构检查。
- 英文、俄文和简体中文 README，以及配置、架构、开发、支付、管理、运维文档。
- 贡献、安全、无障碍及第三方声明文档和声明生成器。
- 项目 MIT 许可证文本。

### 变更

- JavaScript 迁移为 TypeScript，分离领域、应用、适配器和 Telegram 职责。
- PostgreSQL 仓储按业务拆分，商店分为菜单、Stars、Platega 和轮询。
- Docker 多阶段构建，以 `node` 用户运行。
- 包身份和链接更新为 `Hostlife22/ai-bot-with-payments`，刷新兼容依赖范围。
- Node.js 要求与工具链一致：22 分支从 22.13 开始，或 24+。
- 包许可证从 `ISC` 改为 `MIT`。

### 修复

- 管理员 callback 各类操作的权限检查。
- 并发下重复推荐奖励和订单入账。
- 并发余额超额扣减，以及已处理生成错误后的返还。
- 等待迁移和正常停止时关闭后台资源。
- 使用 `node:crypto`、`node:test` 的测试所需的 Node 类型和编辑器项目归属。
- 编译前清理过期 `dist` 文件。

### 升级说明

- 没有 `purchase_intents` 的旧账单需单独核对，不会自动入账。
- 进程崩溃后没有独立的预留恢复账本。
- 升级前备份数据库并阅读[运维说明](operations.md)。
