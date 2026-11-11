# 第三方组件

[English](../eng/third-party-notices.md) · [Русский](../ru/third-party-notices.md) · **简体中文**

完整依赖清单与上游 LICENSE/NOTICE 原文见 [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)。声明保持权利人使用的原始语言，本地化指南不替代法律文本。

## 重新生成

```sh
npm ci
npm run docs:notices
```

生成器读取已安装的传递运行时依赖和直接开发工具，使用本地包元数据及可用声明文件，不进行网络搜索。结果包含准确版本、声明许可证、安装平台及 lockfile SHA-256；相同文本只保存一次，并列出所有来源。

部分发布包不含许可证或 NOTICE 文件，生成器会单独列出，不从其他版本推测版权归属或文本。分发前应核对这些包的确切上游版本。

可选原生依赖会随平台变化，请在匹配目标分发平台的独立环境中重新生成。传递开发工具不属于该清单范围。

## 项目许可证

项目代码使用 [MIT](../../LICENSE)，第三方库保留各自条件。图片与外部 API 输出的使用权需单独考虑。依赖更新 PR 应同时包含 lockfile 和声明更新。
