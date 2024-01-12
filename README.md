# Combo SDK for Node.js

`@seayoo-io/combo-sdk-node` 是世游核心系统 (Combo) 为 Node.js 提供的 SDK。

提供以下**服务端**功能，供游戏侧使用：

- 请求 Server REST API 并解析响应
- 接收 Server Notifications 并回复响应
- 验证世游服务端签发的 Identity Token 和 Ads Token

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
// 创建订单
const createOrderResult = await client.createOrder({
  /** 用于标识创建订单请求的唯一 ID */
  reference_id: "<游戏订单ID>",
  /** 发起购买的用户的唯一标识 */
  combo_id: "<ComboID>",
  /** 要购买的商品 ID */
  product_id: "<ProductID>",
  /** 平台，支持类型见源码类型定义 Platform */
  platform: Platform.iOS, 
  /**
   * 游戏侧接收发货通知的服务端地址
   * 这个地址对应的服务端应该通过 Notify 模块实现路由处理
   */
  notify_url: "https://<YourSite>/<YourPath>"
  /** 要购买的商品的数量，最小为 1 */
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
            // Do your work with payload
            break;
    }
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
const expressHandler = getNotificationHandlerForKoa(config, notificationHandler)
app.post("/path/to/your/notify/url", expressHandler)
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
    handler
);
app.use(notifyMiddleware);

// koa 插件
import { getNotificationMiddlewareForKoa } from "@seayoo-io/combo-sdk-node"
const notifyMiddleware = getNotificationMiddlewareForKoa(
    "/path/to/your/notify/url",
    config,
    handler
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
const result = verifier.verifyIdentityToken(token)
if(result instanceof Error) {
    console.error(result.message)
} else {
    // got Id info: { combo_id, idp, external_id, external_name, weixin_unionid }
    // 微信登录判断
    if(result.idp === IdP.Weixin) {
        // 微信登录会提供 weixin_unionid
        // do something
    }
    // 游客登录判断
    if(result.idp === IdP.Device) {
        // do something
    }
    // 更多 IdP 枚举可以查看源码定义
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
```