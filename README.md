# Combo SDK for Node.js

`@seayoo-io/combo-sdk-node` 是世游核心系统 (Combo) 为 Node.js 提供的 SDK。

提供以下**服务端**功能，供游戏侧使用：

- 请求 Server REST API 并解析响应
- 接收 Server Notifications 并回复响应
- 验证世游服务端签发的 Identity Token 和 Ads Token
- 接收 Server GM Command 指令并回复响应

## breaking changes

v1 新增 gm 模块的 [IdempotencyKey](https://docs.seayoo.com/combo/server/gm/#idempotency)，主要改动包括：

1. 修改了 commandHandler 的参数，插入 idempotencyKey 参数；当此参数为非空字符串时需要处理幂等性；
2. 新增预设错误 IdempotencyConflict / IdempotencyMismatch
3. gm 服务版本号升级到 2.0

## 安装

```js
// 使用 npm 安装
npm install @seayoo-io/combo-sdk-node

// 使用 pnpm 安装
pnpm add @seayoo-io/combo-sdk-node
```

## 导入方式

请按照工程实际情况选择导入方式，后续示例采用 ES 方式导入。

```js
// ES
import { ApiClient } from "@seayoo-io/combo-sdk-node"

// CommonJS
const { ApiClient } = require("@seayoo-io/combo-sdk-node")
```

## 文档

各模块的详细用法见 `docs` 目录：

- [ApiClient](./docs/api-client.md) — 请求 Server REST API 并解析响应
  - [初始化](./docs/api-client.md#初始化)
  - [创建订单 CreateOrder](./docs/api-client.md#创建订单-createorder)
  - [进入/离开游戏](./docs/api-client.md#进入离开游戏)
  - [发送/验证短信验证码 OTP](./docs/api-client.md#发送验证短信验证码-otp)
  - [获取微信小游戏接口调用凭证 GetMiniGameWeixinAccessToken](./docs/api-client.md#获取微信小游戏接口调用凭证-getminigameweixinaccesstoken)
  - [申请语音审核 VoiceModerationRequest](./docs/api-client.md#申请语音审核-voicemoderationrequest)
- [Notify](./docs/notify.md) — 接收 Server Notifications 并回复响应
  - [Step 1 准备参数](./docs/notify.md#step-1-准备参数)
  - [Step 2 处理通知](./docs/notify.md#step-2-处理通知)
- [Verify](./docs/verify.md) — 验证世游服务端签发的 Identity Token 和 Ads Token
  - [初始化](./docs/verify.md#初始化)
  - [IdentityToken 验证](./docs/verify.md#identitytoken-验证)
  - [AdToken 验证](./docs/verify.md#adtoken-验证)
- [GM](./docs/gm.md) — 接收 Server GM Command 指令并回复响应
  - [Step 1 准备](./docs/gm.md#step-1-准备)
  - [Step 2 创建 Store Helper 以启用 idempotencyKey 处理逻辑](./docs/gm.md#step-2-创建-store-helper-以启用-idempotencykey-处理逻辑)
  - [Step 3 绑定处理函数](./docs/gm.md#step-3-绑定处理函数)
