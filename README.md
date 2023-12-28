# Combo SDK for NodeJs

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

## ApiClient

```js
import { ApiClient, Endpoint } from "@seayoo-io/combo-sdk-node"

const client = new ApiClient({
    game: "<GameId>",
    secret: "<SecretKey>",
    endpoint: Endpoint.China
    // 以下参数可选
    maxRetry: 1,       // 失败后自动重试次数，默认 1
    retryInterval: 100 // 重试间隔，默认是 100，单位 ms，可以传递函数动态设置间隔
    logger: function(log) {} // 请求日志函数，log 类型参见源码类型定义
    timeout: 5000,           // 超时等待时长，单位 ms，默认 5000
})

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
   * 订单的元数据，详细定义参看源码 OrderMetaData
   *
   * 大部分元数据用于数据分析与查询，游戏侧应当尽量提供
   * 某些元数据在特定的支付场景下是必须的，例如微信小游戏的 iOS 支付场景
   */
  meta: { ... }
})

// 进入游戏
await client.enterGame("<ComboID>", "<SessionID>");

// 离开游戏
await client.leaveGame("<ComboID>", "<SessionID>");

```

## Notify

```js
import { NotificationType, Endpoint } from "@seayoo-io/combo-sdk-node"

// Step 1 准备参数
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

// Step 2 获取 Request 请求处理函数
// 方法1：使用底层 http 模块的处理函数
import { getNotificationHandler } from "@seayoo-io/combo-sdk-node"
const notifyHandler = getNotificationHandler(config, notificationHandler)
http.createServer(async function(req, res){
    if(req.url === "<YourNotifyUrl>" && req.method === "POST") {
       await notifyHandler(req, res)
    }
})
// 方法2：使用 Express 插件
import { getNotificationHandlerForExpress } from "@seayoo-io/combo-sdk-node"
const expressHandler = getNotificationHandlerForExpress(config, notificationHandler)
app.post("/path/to/your/notify/url", expressHandler)
// 方法3：使用 Koa 插件
import { getNotificationHandlerForKoa } from "@seayoo-io/combo-sdk-node"
const expressHandler = getNotificationHandlerForKoa(config, notificationHandler)
app.post("/path/to/your/notify/url", expressHandler)
```

## Verify

```js
import { TokenVerifier, Endpoint } from "@seayoo-io/combo-sdk-node"

const verifier = new TokenVerifier({
    game: "<GameId>",
    secret: "<SecretKey>",
    endpoint: Endpoint.China
})

// verifyIdentityToken 对 IdentityToken 进行验证
// 返回 IdentityPayload 数据，如果解析出错则返回 Error 对象
const result = verifier.verifyIdentityToken(token)
if(result instanceof Error) {
    console.error(result.message)
} else {
    // got Id info: { combo_id, idp, external_id, external_name, weixin_unionid }
}

// verifyAdToken 对 AdToken 进行验证
// 返回 AdPayload 数据，如果解析出错则返回 Error 对象
const adInfo = vierfier.verifyAdToken(token)
if(result instanceof Error) {
    console.error(result.message)
} else {
    // got ad info: { combo_id, idp, placement_id, impression_id }
}
```

