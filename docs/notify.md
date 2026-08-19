> [Combo SDK for Node.js](../README.md) / Notify

# Notify

世游服务端目前会推送以下几种通知：

| NotificationType | 说明                                                       | payload                 |
| ---------------- | ---------------------------------------------------------- | ----------------------- |
| `ShipOrder`      | 订单状态变更为已支付时推送，游戏侧据此发货                 | `ShipOrderNotification` |
| `Refund`         | 订单发生退款时推送                                         | `RefundNotification`    |
| `DataTags`       | 世游服务端批量推送约定好的数据标签，游戏侧应将其持久化存储 | `DataTagsNotification`  |

> 通知处理函数正常返回（`void` 或 `Promise<void>`）表示处理成功；如果处理过程中出现错误，应当 `throw Error`，世游服务端会在稍后重试推送。

## Step 1 准备参数

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
        case NotificationType.DataTags:
            // Do your work with payload：定义见 DataTagsNotification
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
  /**
   * 是否是沙盒订单。沙盒订单意味着此订单并未产生真实的付款。
   * 预期此字段仅用于记录日志和数据埋点。无论是否是沙盒订单，游戏侧都应当发货。
   */
  is_sandbox?: boolean
}

interface RefundNotification {
    // 结构同 ShipOrderNotification
}

/** DataTag 表示单条数据标签，即某个数据实体的某个标签 */
interface DataTag {
  /** 标签所属实体的类型。例如 `role` 代表实体类型为游戏角色 */
  entity_type: string
  /** 标签所属实体的唯一标识 */
  entity_id: string
  /** 标签名称 */
  tag_name: string
  /** 标签值 */
  tag_value: string
}

/** DataTagsNotification 是数据标签通知的数据结构，包含一批数据标签 */
interface DataTagsNotification {
  /** 一批数据标签，数组长度不定 */
  tags: DataTag[]
}

// 1.2 创建配置，类型定义参见源码 SDKBaseConfig
const config = {
    game: "<GameId>",
    secret: "<SecretKey>",
    endpoint: Endpoint.China
}
```

## Step 2 使用 RequestHandler 处理通知

```js
// 使用 http 模块的处理函数
import { getNotificationHandler } from "@seayoo-io/combo-sdk-node"
const notifyHandler = getNotificationHandler(config, notificationHandler)
http.createServer(async function (req, res) {
  if (req.path === "<YourNotifyUrl>" && req.method === "POST") {
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

## Step 2 使用 RequestMiddleware 处理通知

针对 express 或 koa 框架，可以创建一个高优先级的插件来处理回调通知，其原理如下

```js
// 插件需要先于 bodyParse 类似的插件执行，以确保可以获取原始请求的内容
app.use(function (req, res, next) {
  // 在其他插件处理之前，检查是否为通知请求的 url，方法是否为 POST
  if (req.method === "POST" && req.path === "/path/to/your/notify/url") {
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
const notifyMiddleware = getNotificationMiddlewareForExpress("/path/to/your/notify/url", config, notificationHandler)
app.use(notifyMiddleware)

// koa 插件
import { getNotificationMiddlewareForKoa } from "@seayoo-io/combo-sdk-node"
const notifyMiddleware = getNotificationMiddlewareForKoa("/path/to/your/notify/url", config, notificationHandler)
app.use(notifyMiddleware)
```
