# 安全

[English](../eng/security.md) · [Русский](../ru/security.md) · **简体中文**

## 范围

本政策适用于当前主开发分支。尚未为编号版本规定单独支持期限。报告中请注明 commit hash 和环境版本，以便复现。

重点包括管理员权限绕过、支付替换或重复入账、并发余额超额扣减、密钥或用户信息泄露，以及队列任务和外部响应的不安全处理。

## 漏洞报告

如果仓库启用了 private vulnerability reporting，请使用 [GitHub 私密安全报告表单](https://github.com/Hostlife22/ai-bot-with-payments/security/advisories/new)。

表单不可用时，可创建 [Issue](https://github.com/Hostlife22/ai-bot-with-payments/issues)，仅请求提供私密渠道，不要附利用细节、令牌、支付 payload、真实 Telegram ID 或对话。目前没有单独公布经确认的安全报告邮箱。

私密报告建议包含：

1. 受影响的使用场景和潜在影响。
2. Commit hash，以及 Node.js、PostgreSQL、Redis 版本。
3. 使用测试账户与服务的最小复现步骤。
4. 预期和实际行为，以及清理过的日志。
5. 可选的修复建议或回归测试。

仅测试自己拥有或已获授权的环境，使用测试支付和数据，不要提取他人对话或更改他人余额。公开细节前请与维护者协调。项目未承诺固定响应或修复时限。

## 密钥与用户数据

- Telegram/OpenRouter 令牌、Platega 凭据和数据库密码保存在环境中，`.env` 不进入 Git 和 Docker 构建上下文。
- 发生泄露后，应在平台端轮换密钥并更新环境；从最新 commit 删除文本并不会撤销密钥。
- PostgreSQL、备份和 SQL 导出包含用户信息，不应放入 PR、公开 Issue 或共享日志。
- 开发和集成测试使用独立凭据、数据库与 Redis。队列测试会删除传入 Redis 数据库中的测试队列。

## 更新与验证

通过 `npm ci` 安装依赖。检查运行时依赖：

```sh
npm audit --omit=dev
```

依赖审计不能验证支付或权限业务逻辑。修复时执行 `npm run check` 和相关集成场景；依赖变更后更新 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。

崩溃预留、Redis 存储和本地会话限制见[运维](operations.md)。界面无障碍问题使用[单独流程](accessibility.md)。
