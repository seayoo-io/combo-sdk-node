> [Combo SDK for Node.js](../README.md) / GM

# GM

GM 模块使用方式类似于 Notify 模块。

## Step 1 准备

```js
import { GMError } from "@seayoo-io/combo-sdk-node"

// 1.1 定义 GM 处理函数
function gmCommandHandler(command, args, requestId, idempotencyKey, version, origin) {
    // command 对应的是 GM 协议中定义的方法名，区分大小写，args 为该方法的参数。
    // requestId 本次 GM 请求的唯一 ID。游戏侧可用此值来对请求进行去重。
    // idempotencyKey 本次 GM 请求的 Idempotency Key。如果有非空值则应当执行幂等处理逻辑。
    // SDK 已经内置了 idempotencyKey 的处理工具和配置，详细见下描述
    // version 对应的是世游 GM 服务的版本号，目前固定是 2.0
    // origin 对应的是 GM 请求的来源标记，区分大小写，如 combo/console
    // 详见 https://docs.seayoo.com/combo/server/gm/#gm-request
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
enum GMError {
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
  /** 幂等处理重试请求时，idempotency_key 所对应的原始请求尚未处理完毕。*/
  IdempotencyConflict = "idempotency_conflict",
  /** 幂等处理重试请求时，请求内容和 idempotency_key 所对应的原始请求内容不一致。*/
  IdempotencyMismatch = "idempotency_mismatch",
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

## Step 2 创建 Store Helper 以启用 idempotencyKey 处理逻辑

```js
// SDK 内置 idempotencyKey 处理逻辑，其需要相关存储来实现，比如 Redis。
// 创建 Store Helper 用于启用内置的 idempotencyKey 处理逻辑
// store helper 需要实现以下方法即可：
interface IdempotencyKeyStoreHelper {
  /**
   * setNX 用于原子性地存储幂等记录并返回旧值。
   * value 仅在 key 不存在时才会被存储 (Only set the key if it does not already exist)。
   * 返回值是 key 存在时的旧值。如果 key 不存在则返回空字符串。
   */
  setNX: (key: string, value: string) => Promise<string>

  /**
   * setXX 用于原子性地更新已存在的幂等记录。
   * value 仅在 key 存在时才会被存储 (Only set the key if it already exists)。
   */
  setXX: (key: string, value: string) => Promise<void>
}

// SDK 内置实现了两个工具类
import { MemoryIdempotencyStore, RedisIdempotencyStore } from "@seayoo-io/combo-sdk-node"

// MemoryIdempotencyStore 仅仅用于本地调试
const storeHelper = new MemoryIdempotencyStore()
// RedisIdempotencyStore 基于 ioredis 实现，需要 Redis 版本大于 7: https://redis.io/docs/latest/commands/set/
const storeHelper = new RedisIdempotencyStore({
   /** 超时设定，单位秒，推荐不低于24小时 */
   ttl?: number
   /** ioredis 客户端 */
   client: Redis
   /** key 前缀 */
   prefix?: string
})

// 当然可以直接自行实现上述 store helper 方法
```

## Step 3 绑定处理函数

绑定方式同 Notify 类似，提供三种不同的方式来对接 http 服务。推荐使用方式 3。

```js
// 方式 1. 使用 http 模块处理函数
import { getGMCommandHandler } from "@seayoo-io/combo-sdk-node"
// storeHelper 类型为 IdempotencyKeyStoreHelper
// 可不传递，如果不提供则不会启用内置的 idempotencyKey 处理逻辑，下同
const handler = getGMCommandHandler(config, gmCommandHandler, storeHelper)
http.createServer(async function (req, res) {
  if (req.path === "<YourNotifyUrl>" && req.method === "POST") {
    await handler(req, res)
  }
})

// 方式 2. 使用 express / koa 的 handler
import { getGMHandlerForExpress } from "@seayoo-io/combo-sdk-node"
const expressHandler = getGMHandlerForExpress(config, gmCommandHandler, storeHelper)
app.post("/path/to/your/gm/url", expressHandler)

import { getGMHandlerForKoa } from "@seayoo-io/combo-sdk-node"
const koaHandler = getGMHandlerForKoa(config, gmCommandHandler, storeHelper)
app.post("/path/to/your/gm/url", koaHandler)

// 方式 3. 使用 express / koa 的中间件，推荐
import { getGMMiddlewareForExpress } from "@seayoo-io/combo-sdk-node"
const gmMiddleware = getGMMiddlewareForExpress("/path/to/your/gm/url", config, gmCommandHandler, storeHelper)
app.use(gmMiddleware)

import { getGMMiddlewareForKoa } from "@seayoo-io/combo-sdk-node"
const gmMiddleware = getGMMiddlewareForKoa("/path/to/your/gm/url", config, gmCommandHandler, storeHelper)
app.use(gmMiddleware)
```
