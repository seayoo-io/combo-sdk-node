# Combo SDK for Node.js

`@seayoo-io/combo-sdk-node` 是世游核心系统 (Combo) 为 Node.js 提供的 SDK。

提供以下**服务端**功能，供游戏侧使用：

- 请求 Server REST API 并解析响应
- 接收 Server Notifications 并回复响应
- 验证世游服务端签发的 Identity Token 和 Ads Token
- 接收 Server GM Command 指令并回复响应

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

## ApiClient

### 初始化

```js
import { ApiClient, Endpoint } from "@seayoo-io/combo-sdk-node"

const client = new ApiClient({
    game: "<GameId>",
    secret: "<SecretKey>",
    endpoint: Endpoint.China,
    // 以下参数可选
    maxRetry: 1,                // 失败后自动重试次数，默认 1
    retryInterval: 1000,        // 重试间隔，默认是 1000，单位 ms，可以传递函数动态设置间隔
    logger: function(log) {},   // 请求日志函数，log 类型参见源码类型定义
    timeout: 5000,              // 超时等待时长，单位 ms，默认 5000
})
```

### 创建订单 CreateOrder

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
  /** 微信小游戏的 App ID, 微信小游戏的 iOS 支付场景必须传入 */
  weixin_appid?: string
  /** 微信小游戏的玩家 OpenID, 微信小游戏的 iOS 支付场景必须传入 */
  weixin_openid?: string
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

### 进入/离开游戏

下述两个接口对应的功能是**中宣部防沉迷系统**的上报功能，这里的 SessionID 是一次游戏会话的标识，也就是每次玩家进入游戏+离开游戏，算一个 Game Session。单次游戏会话的上下线动作必须使用同一个 SessionID 上报。

```js
// 进入游戏
await client.enterGame("<ComboID>", "<SessionID>");

// 离开游戏
await client.leaveGame("<ComboID>", "<SessionID>");

```

> 注意，SessionID 不可重复使用，可以使用 SDK 提供的工具函数生成 SessionID

```js
import { genSessionID } from "@seayoo-io/combo-sdk-node"

// genSessionID 接受唯一参数 comboId 作为输入，返回一个 32 位固定长度的不重复字符串
const userSessionID = genSessionID("<ComboID>")

```

## Notify

### Step 1 准备参数

```js
import { NotificationType, Endpoint } from "@seayoo-io/combo-sdk-node"

// 1.1 定义消息处理函数，类型定义参见源码 NotificationHandler
function notificationHandler(type, payload) {
    switch(type) {
        case NotificationType.ShipOrder:
            // Do your work with payload：定义见 ShipOrderNotification
            break;
        case NotificationType.Refund:
            // Do your work with payload：定义见 RefundNotification
            break;
    }
}

/**  ShipOrderNotification 是订单发货通知的数据结构，包含了订单的详细信息 */
interface ShipOrderNotification {
  /** 世游服务端创建的，标识订单的唯一 ID */
  order_id: string
  /** 游戏侧用于标识创建订单请求的唯一 ID */
  reference_id: string
  /** 发起购买的用户的唯一标识 */
  combo_id: string
  /** 购买的商品 ID，指的是在世游发行平台管理的商品 ID */
  product_id: string
  /** 购买的商品的数量 */
  quantity: number
  /** 订单币种代码。例如 USD CNY */
  currency: string
  /** 订单金额，单位为分，如果币种为美元，则单位为美分。 */
  amount: number
  /** 游戏侧创建订单时提供的订单上下文，透传回游戏 */
  context?: string
}
  
interface RefundNotification {
    // 结构同 ShipOrderNotification
}

// 1.2 创建配置，类型定义参见源码 SDKBaseConfig
const config = {
    game: "<GameId>",
    secret: "<SecretKey>",
    endpoint: Endpoint.China
}
```

### Step 2 使用 RequestHandler 处理通知

```js
// 使用 http 模块的处理函数
import { getNotificationHandler } from "@seayoo-io/combo-sdk-node"
const notifyHandler = getNotificationHandler(config, notificationHandler)
http.createServer(async function(req, res){
    if(req.path === "<YourNotifyUrl>" && req.method === "POST") {
       await notifyHandler(req, res)
    }
})

// 或，使用 Express 处理函数
import { getNotificationHandlerForExpress } from "@seayoo-io/combo-sdk-node"
const expressHandler = getNotificationHandlerForExpress(config, notificationHandler)
app.post("/path/to/your/notify/url", expressHandler)

// 或，使用 Koa 处理函数
import { getNotificationHandlerForKoa } from "@seayoo-io/combo-sdk-node"
const koaHandler = getNotificationHandlerForKoa(config, notificationHandler)
app.post("/path/to/your/notify/url", koaHandler)
```

> ⚠️ 注意事项
>
> 由于 http request 的 body 只能被消费（读取）一次，如果您使用了 express 或 koa 框架并优先加载了 bodyParse 类似的插件，那么 NotificationHandler 将无法再次读取 request 内容用于签名计算，此时需要提供请求的原始 rawBody 才可以继续。
>
> 网上有一些方法可以在 express 或 koa 框架下获取 rawBody 内容，但都具有一定的破坏性风险。
>
> 推荐以下解决方案：

### Step 2 使用 RequestMiddleware 处理通知

针对 express 或 koa 框架，可以创建一个高优先级的插件来处理回调通知，其原理如下

```js
// 插件需要先于 bodyParse 类似的插件执行，以确保可以获取原始请求的内容
app.use(function(req, res, next){
    // 在其他插件处理之前，检查是否为通知请求的 url，方法是否为 POST
    if(req.method === "POST" && req.path === "/path/to/your/notify/url") {
        // 如果是，则交由插件处理后续响应
        notifyMiddleware(req, res)
        return
    }
    // 否则其他一切正常
    next()
})
```

SDK 提供了两个插件来处理：

```js
// express 插件
import { getNotificationMiddlewareForExpress } from "@seayoo-io/combo-sdk-node"
const notifyMiddleware = getNotificationMiddlewareForExpress(
    "/path/to/your/notify/url",
    config,
    notificationHandler
);
app.use(notifyMiddleware);

// koa 插件
import { getNotificationMiddlewareForKoa } from "@seayoo-io/combo-sdk-node"
const notifyMiddleware = getNotificationMiddlewareForKoa(
    "/path/to/your/notify/url",
    config,
    notificationHandler
);
app.use(notifyMiddleware);
```

## Verify

### 初始化

```js
import { TokenVerifier, Endpoint } from "@seayoo-io/combo-sdk-node"

const verifier = new TokenVerifier({
    game: "<GameId>",
    secret: "<SecretKey>",
    endpoint: Endpoint.China
})
```

### IdentityToken 验证

```js
import { IdP } from "@seayoo-io/combo-sdk-node"
// verifyIdentityToken 对 IdentityToken 进行验证
// 返回 IdentityPayload 数据，如果解析出错则返回 Error 对象
const identityPayload = verifier.verifyIdentityToken(token)
if(identityPayload instanceof Error) {
    console.error(result.message)
} else {
    // 微信登录判断
    if(identityPayload.idp === IdP.Weixin) {
        // 微信登录会提供 weixin_unionid
        // do something
    }
    // 游客登录判断
    if(identityPayload.idp === IdP.Device) {
        // do something
    }
    // 更多 IdP 枚举可以查看源码定义 src/const.ts
}

// IdentityPayload 数据定义
interface IdentityPayload {
  /** combo_id 是世游分配的聚合用户 ID 游戏侧应当使用 combo_id 作为用户的唯一标识。*/
  combo_id: string
  /** IdP (Identity Provider) 是用户身份的提供者 */
  idp: IdP
  /**
   * external_id 是用户在外部 IdP 中的唯一标识
   *
   * 例如：
   *  - 如果用户使用世游通行证登录，那么 external_id 就是用户的世游通行证 ID。
   *  - 如果用户使用 Google Account 登录，那么 external_id 就是用户在 Google 中的账号标识。
   *  - 如果用户使用微信登录，那么 external_id 就是用户在微信中的 OpenId。
   *
   * 注意：
   * 游戏侧不应当使用 external_id 作为用户标识，但可以将 external_id 用于特定的业务逻辑。
   */
  external_id: string
  /** external_name 是用户在外部 IdP 中的名称，通常是用户的昵称 */
  external_name: string
  /**
   * weixin_unionid 是用户在微信中的 UnionId
   * 游戏侧可以使用 weixin_unionid 实现多端互通
   * 注意：weixin_unionid 只在 IdP 为 weixin 时才会有值。
   */
  weixin_unionid: string
  /**
   * distro 是游戏客户端的发行版本标识。
   * 游戏侧可将 distro 用于服务端数据埋点，以及特定的业务逻辑判断。
   */
  distro: string
  /**
   * variant 是游戏客户端的分包标识。
   * 游戏侧可将 variant 用于服务端数据埋点，以及特定的业务逻辑判断。
   * 注意：Variant 只在客户端是分包时才会有值。当客户端不是分包的情况下，variant 为空字符串。
   */
  variant: string
}
```

### AdToken 验证

```js
// verifyAdToken 对 AdToken 进行验证
// 返回 AdPayload 数据，如果解析出错则返回 Error 对象
const adInfo = vierfier.verifyAdToken(token)
if(result instanceof Error) {
    console.error(result.message)
} else {
    // got ad info: { combo_id, placement_id, impression_id }
}

// AdPayload 定义
interface AdPayload {
  /** combo_id 是世游分配的聚合用户 ID，游戏侧应当使用 combo_id 作为用户的唯一标识。*/
  combo_id: string
  /** placement_id 是广告位 ID，游戏侧用它确定发放什么样的广告激励。*/
  placement_id: string
  /** impression_id 是世游服务端创建的，标识单次广告播放的唯一 ID。*/
  impression_id: string
}
```

## GM

GM 模块使用方式类似于 Notify 模块。

### Step 1 准备

```js
import { GMError } from "@seayoo-io/combo-sdk-node"

// 1.1 定义 GM 处理函数
function gmCommandHandler(command, args, requestId, version) {
    // requestId 每次 GM 请求的唯一 ID。游戏侧可用此值来对请求进行去重。
    // version 对应的是世游 GM 服务的版本号，目前固定是 1.0
    // command 对应的是 GM 协议中定义的方法名，区分大小写
    switch(command) {
        case "SomeCmdName":
            // 参数 args 由协议定义，在使用前需要做严格的格式和逻辑校验
            // 返回值需要根据协议定义进行响应，通常是一个包含了多个字段的 object
            return await execSomeCommand(args);
        case "OtherCmdName":
            // 抛出自定义错误有三种方式：
            // 1. 返回一个 Error 对象，最终响应以 500(internalServerError)作为 http status
            return new Error("自定义错误信息")
            // 2. 返回一个自定义消息体 (预设的消息类型见下描述)，推荐使用此方式
            return { error: GMError.ThrottlingError, message: "请求过于频繁，请稍后再试" }
            // 3. 直接抛出错误，用于处理异常场景，最终响应以 500 作为 http status
            //    相比于方式1，此流程会打印一条错误日志
            throw new Error("some unknown error")
        ...
        default: // 不识别的指令进行返回
            return { error: GMError.InvalidCommand, message: "不识别的指令"+ command }
    }
}

/** GM 预设错误类型枚举 */
const enum GMError {
  /** 请求中的 HTTP method 不正确，没有按照预期使用 POST。*/
  InvalidHttpMethod = "invalid_http_method",
  /** 请求中的 Content-Type 不是 application/json。*/
  InvalidContentType = "invalid_content_type",
  /** 对 HTTP 请求的签名验证不通过。这意味着 HTTP 请求不可信。 */
  InvalidSignature = "invalid_signature",
  /** 请求的结构不正确。例如，缺少必要的字段，或字段类型不正确。 */
  InvalidRequest = "invalid_request",
  /** 游戏侧不认识请求中的 GM 命令。 */
  InvalidCommand = "invalid_command",
  /** GM 命令发送频率过高，被游戏侧限流，命令未被处理。 */
  ThrottlingError = "throttling_error",
  /** GM 命令的参数不正确。例如，参数缺少必要的字段，或参数的字段类型不正确。 */
  InvalidArgs = "invalid_args",

  /** 游戏当前处于停服维护状态，无法处理收到的 GM 命令。*/
  MaintenanceError = "maintenance_error",
  /** 网络通信错误。 */
  NetworkError = "network_error",
  /** 数据库操作异常导致 GM 命令执行失败。 */
  DatabaseError = "database_error",
  /** GM 命令处理超时。 */
  TimeoutError = "timeout_error",
  /** 处理 GM 命令时内部出错。可作为兜底的通用错误类型。*/
  InternalError = "internal_error",
}

// 1.2 创建配置，相比于 Notify 模块，此处不需要 endpoint 配置
const config = {
   game: "<GameId>",
   secret: "<SecretKey>",
}
```

### Step 2 绑定处理函数

绑定方式同 Notify 类似，提供三种不同的方式来对接 http 服务。推荐使用方式 3。

```js
// 方式 1. 使用 http 模块处理函数
import { getGMCommandHandler } from "@seayoo-io/combo-sdk-node"
const handler = getGMCommandHandler(config, gmCommandHandler)
http.createServer(async function(req, res){
    if(req.path === "<YourNotifyUrl>" && req.method === "POST") {
       await handler(req, res)
    }
})

// 方式 2. 使用 express / koa 的 handler
import { getGMHandlerForExpress } from "@seayoo-io/combo-sdk-node"
const expressHandler = getGMHandlerForExpress(config, gmCommandHandler)
app.post("/path/to/your/gm/url", expressHandler)

import { getGMHandlerForKoa } from "@seayoo-io/combo-sdk-node"
const koaHandler = getGMHandlerForKoa(config, gmCommandHandler)
app.post("/path/to/your/gm/url", koaHandler)

// 方式 3. 使用 expres / koa 的中间件，推荐
import { getGMMiddlewareForExpress } from "@seayoo-io/combo-sdk-node"
const gmMiddleware = getGMMiddlewareForExpress("/path/to/your/gm/url", config, gmCommandHandler);
app.use(gmMiddleware);

import { getGMMiddlewareForKoa } from "@seayoo-io/combo-sdk-node"
const gmMiddleware = getGMMiddlewareForKoa("/path/to/your/gm/url", config, gmCommandHandler);
app.use(gmMiddleware);

```

