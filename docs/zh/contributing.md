# 贡献指南

[English](../eng/contributing.md) · [Русский](../ru/contributing.md) · **简体中文**

请先阅读 [README](../../README.zh-CN.md)、[架构](architecture.md) 和[本地环境](development.md)。

## 提出变更

普通问题请在 [Issues](https://github.com/Hostlife22/ai-bot-with-payments/issues) 中报告，包含复现步骤、预期与实际行为、Node.js 版本和 commit hash，并移除凭据、真实对话和支付数据。

较大的行为变更请先讨论受影响的场景、数据和升级方式。漏洞使用[安全报告流程](security.md)，界面使用问题参考[无障碍说明](accessibility.md)。

## 准备

1. 从最新主开发分支创建 fork 或工作分支。
2. 安装受支持的 Node.js，运行 `npm ci`。
3. 按开发文档配置独立机器人、`.env`、PostgreSQL 和 Redis。
4. 修复余额、支付、权限或后台处理错误时，添加回归测试。

分支名称应说明用途，例如 `feat/payment-status`、`fix/referral-race`、`docs/local-setup`。

## 代码与架构

- 保持严格 TypeScript 检查，不使用 `any`、`@ts-ignore` 或非空断言来掩盖问题。
- 使用 Prettier：4 空格缩进、单引号、分号。`npm run format` 也会排序导入。
- 跨模块使用 `@database/users`、`@contracts/user` 等短别名，同目录使用 `./file.js`。
- 共享模型和契约放入 `src/types/` 的对应主题文件，以 `import type` 导入；可执行逻辑放入所属层。
- 应用用例依赖契约，适配器实现契约，bootstrap 组装实现。不要在导入模块时创建连接或启动定时器。
- 保持已有数据兼容。新增迁移并登记到 `migrate.ts`，不要修改已经应用的迁移。
- 处理异常、释放资源、对 SQL 值传参，并考虑余额和状态的并发修改。

## 提交 PR 前的验证

```sh
npm run format
npm run docs:format
npm run check
```

修改数据库或队列时，还应在隔离服务上使用 `TEST_DATABASE_URL`、`TEST_REDIS_URL` 执行[集成测试](development.md#集成测试)。

支付测试覆盖重复确认、错误金额/币种/所有者、并发入账和事务回滚。余额测试覆盖非负结果和已处理生成错误后的返还。文件命名为 `tests/<场景>.test.ts`，没有固定覆盖率百分比要求。

菜单变更请分别以普通用户和管理员测试，检查长标签、导航、屏幕阅读器，以及不依赖表情或颜色时的含义。

更新依赖后同步 lockfile，并执行：

```sh
npm run docs:notices
```

## Commit 与 pull request

使用简短前缀：`feat:`、`fix:`、`refactor:`、`docs:`、`test:`、`chore:`。例如：`fix: prevent duplicate Stars credits`。

PR 描述应包含问题、最终行为、关联 Issue、数据库/环境/升级变更、验证结果，以及未进行真实平台测试等限制。菜单变更可附去除个人信息的截图或短视频。

同步相关文档与[更新日志](changelog.md)的 `Unreleased`。英文、俄文和简体中文版本应保持命令与运行限制一致。不要提交 `dist/`、`.env`、数据库导出、备份或用户日志。

贡献遵循项目 [MIT 许可证](../../LICENSE)。新增第三方代码须保留其声明及兼容的分发条件。

- [GitHub 自动化和文档网站检查](ci-cd.md)

## 常量与消息

使用 `@constants/*` 管理规则和运行参数，使用 `@messages/*` 管理文本。通用按钮位于 `messages/common.ts`，错误和日志分别存放。动态文本使用类型化格式函数；展示的限制和奖励应引用服务使用的同一常量。ESLint 禁止业务模块中的魔法数字和内联错误/Telegram 回复文本；零、一、数组索引和字面量类型保留其结构含义。
