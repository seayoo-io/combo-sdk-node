import { getUserAgent } from "./ua"
import { NetRequest, type IRequestGlobalConfig } from "../request"
import { AuthorizationField, calcAuthorizationHeader, verifyConfig, isObject, type SDKBaseConfig, isFullURL } from "../utils"
import type { CreateOrderOption, CreateOrderResponse } from "./types"

const ApiPrefix = "/v1/server"
const TraceIdField = "x-trace-id"

/** Api Client Config */
export interface ApiClientConfig extends SDKBaseConfig {
  /** 自动重试次数，默认重试 1 次 */
  maxRetry?: IRequestGlobalConfig["maxRetry"]
  /** 重试间隔，可以使用函数设定不同的间隔 */
  retryInterval?: IRequestGlobalConfig["retryInterval"]
  /** 可选请求日志函数，用于输出请求调试信息 */
  logger?: IRequestGlobalConfig["logHandler"]
  /** 请求超时设定，单位 ms */
  timeout?: number
}
/**
 * Combo SDK For Server REST Api
 */
export class ApiClient {
  private req: ReturnType<typeof NetRequest>

  constructor(config: ApiClientConfig) {
    verifyConfig(config)
    const ua = getUserAgent(config.game)
    this.req = NetRequest({
      baseURL: `${config.endpoint.replace(/\/$/, "")}${ApiPrefix}`,
      maxRetry: config.maxRetry ?? 1,
      retryInterval: config.retryInterval,
      responseRule: {
        ok: {
          resolve: "body",
        },
        failed: {
          resolve: "json",
          statusField: "error",
          messageField: "message",
        },
      },
      requestTransformer({ headers, method, url, params, body }) {
        const iURL = new URL(url)
        if (params) {
          if (params instanceof Object) {
            Object.keys(params).forEach((key) => iURL.searchParams.set(key, params[key]))
          }
        }
        headers["User-Agent"] = ua
        headers[AuthorizationField] = calcAuthorizationHeader({
          game: config.game,
          secret: config.secret,
          endpoint: config.endpoint,
          method,
          url: iURL.toString(),
          data: body || "",
        })
      },
      logHandler: config.logger,
      timeout: config.timeout || 5000,
    })
  }

  /**
   * 创建订单
   */
  async createOrder(option: CreateOrderOption): Promise<CreateOrderResponse> {
    if (!option.combo_id || !option.notify_url || !option.product_id || !option.reference_id) {
      throw new Error("createOrder: 必要参数缺失")
    }
    // 检查通知回调地址
    if (!isFullURL(option.notify_url)) {
      throw new Error("createOrder: notify_url 需要是一个完整的 url 地址")
    }
    // 检查购买数量
    const quantity = Math.min(Math.max(1, Math.ceil(option.quantity)), Number.MAX_SAFE_INTEGER)
    if (quantity !== option.quantity) {
      throw new Error("createOrder: 购买数量 quantity 必须是一个有限的正整数，且不能小于 1")
    }
    const { ok, data, code, status, message, headers } = await this.req.post("create-order", option, isCreateOrderResponse)
    if (!ok || !data) {
      console.error({ type: "createOrder Error", status, code, message, traceId: headers[TraceIdField] })
      throw new Error(`createOrder: ${message || code || status}`)
    }
    return data
  }

  /**
   * 通知世游服务端玩家进入游戏世界（上线）
   *
   * 此接口仅用于中宣部防沉迷系统的上下线数据上报
   *
   * @param comboId 聚合用户标识
   * @param sessionId 游戏会话标识，单次游戏会话的上下线动作必须使用同一会话标识上报
   */
  async enterGame(comboId: string, sessionId: string): Promise<boolean> {
    if (!comboId || !sessionId) {
      throw new Error("enterGame: 必要参数缺失")
    }
    const { ok, status, code, message, headers } = await this.req.post("enter-game", {
      combo_id: comboId,
      session_id: sessionId,
    })
    if (!ok) {
      console.error({ type: "enterGame Error", status, code, message, traceId: headers[TraceIdField] })
    }
    return ok
  }

  /**
   * 通知世游服务端玩家离开游戏世界（下线）
   *
   * 此接口仅用于中宣部防沉迷系统的上下线数据上报
   *
   * @param comboId 聚合用户标识
   * @param sessionId 游戏会话标识，单次游戏会话的上下线动作必须使用同一会话标识上报
   */
  async leaveGame(comboId: string, sessionId: string): Promise<boolean> {
    if (!comboId || !sessionId) {
      throw new Error("enterGame: 必要参数缺失")
    }
    const { ok, status, code, message, headers } = await this.req.post("leave-game", {
      combo_id: comboId,
      session_id: sessionId,
    })
    if (!ok) {
      console.error({ type: "leaveGame Error", status, code, message, traceId: headers[TraceIdField] })
    }
    return ok
  }
}

function isCreateOrderResponse(data: unknown): data is CreateOrderResponse {
  return (
    isObject(data) &&
    ["order_id", "order_token"].every((field) => field in data) &&
    "expires_at" in data &&
    typeof data.expires_at === "number"
  )
}
