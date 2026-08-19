> [Combo SDK for Node.js](../README.md) / ApiClient

# ApiClient

## 初始化

```js
import { ApiClient, Endpoint } from "@seayoo-io/combo-sdk-node"

const client = new ApiClient({
  game: "<GameId>",
  secret: "<SecretKey>",
  endpoint: Endpoint.China,
  // 以下参数可选
  maxRetry: 1, // 失败后自动重试次数，默认 1
  retryInterval: 1000, // 重试间隔，默认是 1000，单位 ms，可以传递函数动态设置间隔
  logger: function (log) {}, // 请求日志函数，log 类型参见源码类型定义
  timeout: 5000, // 超时等待时长，单位 ms，默认 5000
})
```

## 创建订单 CreateOrder

```js
// 导入枚举变量
import { Platform } from "@seayoo-io/combo-sdk-node"

// 创建订单
const createOrderResult = await client.createOrder({
  /** 用于标识创建订单请求的唯一 ID */
  reference_id: "<游戏订单ID>",
  /** 发起购买的用户的唯一标识 */
  combo_id: "<ComboID>",
  /**
   * 要购买的商品 ID
   * 这里指的是在世游发行平台管理的商品 ID，其中重要的两个约定是：
   *  - 商品价格是正整数
   *  - 商品价格单位为 分 或 美分，即商品币种所支持的最小流通单位
   */
  product_id: "<ProductID>",
  /** 平台，支持类型见源码类型定义 Platform */
  platform: Platform.iOS,
  /**
   * 游戏侧接收发货通知的服务端地址
   * 这个地址对应的服务端应该通过 Notify 模块实现路由处理
   */
  notify_url: "https://<YourSite>/<YourPath>"
  /** 要购买的商品的数量，最小为 1，必须为正整数 */
  quantity: 1,
  /** [可选]订单上下文，在发货通知中透传回游戏 */
  context: "",
  /**
   * 订单的元数据，详细定义参看 OrderMetaData
   *
   * 大部分元数据用于数据分析与查询，游戏侧应当尽量提供
   * 某些元数据在特定的支付场景下是必须的，例如微信小游戏的 iOS 支付场景
   */
  meta: { ... }
})

interface OrderMetaData {
  /** 游戏大区 ID */
  zone_id?: string
  /** 游戏服务器 ID */
  server_id?: string
  /** 游戏角色 ID */
  role_id?: string
  /** 游戏角色名 */
  role_name?: string
  /** 游戏角色的等级 */
  role_level?: number
}

interface CreateOrderResponse {
  /** 世游服务端创建的，标识订单的唯一 ID。 */
  order_id: string
  /** 世游服务端创建的订单 token，用于后续支付流程。 */
  order_token: string
  /** 订单失效时间。Unix timestamp in seconds。 */
  expires_at: number
}
```

## 进入/离开游戏

下述两个接口对应的功能是**中宣部防沉迷系统**的上报功能，这里的 SessionID 是一次游戏会话的标识，也就是每次玩家进入游戏+离开游戏，算一个 Game Session。单次游戏会话的上下线动作必须使用同一个 SessionID 上报。

```js
// 进入游戏
await client.enterGame("<ComboID>", "<SessionID>")

// 离开游戏
await client.leaveGame("<ComboID>", "<SessionID>")
```

> 注意，SessionID 不可重复使用，可以使用 SDK 提供的工具函数生成 SessionID

```js
import { genSessionID } from "@seayoo-io/combo-sdk-node"

// genSessionID 接受唯一参数 comboId 作为输入，返回一个 32 位固定长度的不重复字符串
const userSessionID = genSessionID("<ComboID>")
```

## 发送/验证短信验证码 OTP

用于向用户发送短信验证码 (OTP)，以及校验用户输入的验证码，可用于账号绑定、敏感操作二次确认等场景。

> 验证码的目标行为 `action` 由世游发行平台创建并管理。同一次验证流程中，`sendOtp` 与 `verifyOtp` 传入的 `action` 和 `channel` 必须保持一致。

```js
// 1. 发送验证码
const sendResult = await client.sendOtp({
  /** 要发送验证码的用户的唯一标识 */
  combo_id: "<ComboID>",
  /** [可选] 发送验证码的通道，目前仅支持 "sms"，不填写时默认为 "sms" */
  channel: "sms",
  /** 发送验证码的目标行为，由世游发行平台创建并管理 */
  action: "<Action>",
  /**
   * [可选] 发送方元数据，主要用于数据分析，游戏服务端应当尽量提供
   * 字段定义同 OrderMetaData
   */
  meta: { ... },
})

interface SendOtpResponse {
  /** 掩码后的手机号，仅当 channel=sms 时有值。 */
  mobile: string
  /** 验证码有效期，单位秒。 */
  otp_ttl: number
  /** 重新发送验证码的冷却时间，单位秒。 */
  otp_cooldown: number
}

// 2. 验证验证码
const verifyResult = await client.verifyOtp({
  /** 要验证验证码的用户的唯一标识 */
  combo_id: "<ComboID>",
  /** [可选] 发送验证码的通道，需与发送时一致，不填写时默认为 "sms" */
  channel: "sms",
  /** 发送验证码的目标行为，需与发送时一致 */
  action: "<Action>",
  /** 用户输入的验证码 */
  otp: "<OTP>",
})

if (verifyResult.valid) {
  // 验证通过。验证码立即失效，不可重复使用
} else {
  // 验证失败：验证码错误或已过期，建议提示用户重新输入
}

interface VerifyOtpResponse {
  /**
   * 是否验证通过。
   * - true  表示验证通过。验证通过后验证码立即失效，不可重复使用。
   * - false 表示验证失败，验证码不匹配或已过期，建议用户重新检查后重试。
   */
  valid: boolean
}
```

> ⚠️ 错误处理
>
> - `sendOtp` 在请求失败时（如触发发送冷却、参数错误、服务端错误）会**抛出异常**，请使用 try/catch 捕获处理。
> - `verifyOtp` 仅在请求本身失败时抛出异常。**验证码不正确属于正常业务结果**，此时会返回 `{ valid: false }` 而不会抛出异常，游戏侧需要根据 `valid` 字段判断验证是否通过。

## 获取微信小游戏接口调用凭证 GetMiniGameWeixinAccessToken

获取微信小游戏的接口调用凭证（Access Token），供游戏服务端调用微信服务端 API 使用。接口调用凭证由世游服务端统一维护和刷新，游戏侧无需自行调用微信接口获取。

> 此接口仅适用于微信小游戏。

```js
const result = await client.getMiniGameWeixinAccessToken({
  /** 微信小游戏的 AppID，必须是当前游戏配置的微信小游戏应用 */
  app_id: "<WeixinAppID>",
})

interface GetMiniGameWeixinAccessTokenResponse {
  /** 微信小游戏的 AppID，与请求中的 app_id 一致。 */
  app_id: string
  /** 微信小游戏的接口调用凭证。 */
  access_token: string
}
```

> ⚠️ 注意事项
>
> - 游戏服务端应当**缓存**接口调用凭证，缓存时间 1 分钟，按照 1 次/分钟 的频率请求该 API 获取并刷新缓存。
> - `getMiniGameWeixinAccessToken` 在请求失败时会**抛出异常**，请使用 try/catch 捕获处理。

## 申请语音审核 VoiceModerationRequest

玩家认为语音房间内某些玩家存在语音违规行为时，可提交语音审核申请。调用前提是：游戏已经在世游开启语音审核服务。

```js
const ok = await client.voiceModerationRequest({
  /** 房间实例 ID，唯一标识某个语音房间的一次存续（从开启到关闭） */
  room_instance_id: "<RoomInstanceID>",
  /** 游戏服务器 ID */
  server_id: 1001,
  /** 提交审核申请的玩家角色 ID */
  requester_role_id: "<PlayerRoleID>",
  /** 提交审核申请的玩家的唯一标识，选填 */
  requester_combo_id: "<PlayerComboID>",
  /** 被提交语音审核的玩家角色 ID 列表，一次最多提交 32 个 */
  target_role_ids: ["<TargetRoleID1>", "<TargetRoleID2>"],
  /** 提交审核申请的原因列表，选填，数据来自于 GM 维度表 */
  reasons: ["abuse", "noise"],
})

// ok 为 true 表示提交成功，false 表示提交失败（已自动打印错误日志）
if (ok) {
  // 提交成功
}
```

> ⚠️ 注意事项
>
> - `voiceModerationRequest` 不会在失败时抛出异常，而是返回 `false`。游戏侧可根据返回值决定后续处理。
> - `target_role_ids` 一次最多提交 32 个玩家角色 ID。
> - `reasons` 选填，一次最多提交 12 个，单个原因最多 32 个字符且不能包含英文逗号，取值参见：审核申请原因维度表。
