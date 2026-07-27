import { getUserAgent } from "./ua"
import { NetRequest, type IRequestGlobalConfig } from "../request"
import { AuthorizationField, calcAuthorizationHeader, verifyConfig, isObject, type SDKBaseConfig } from "../utils"
import type {
  CreateOrderOption,
  CreateOrderResponse,
  SendOtpOption,
  SendOtpResponse,
  VerifyOtpOption,
  VerifyOtpResponse,
  VoiceModerationRequestOption,
} from "./types"

const ApiPrefix = "/v1/server"
const TraceIdField = "x-trace-id"

// spell-checker:ignore cooldown

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
    const { ok, status, code, message, headers } = await this.req.post("leave-game", {
      combo_id: comboId,
      session_id: sessionId,
    })
    if (!ok) {
      console.error({ type: "leaveGame Error", status, code, message, traceId: headers[TraceIdField] })
    }
    return ok
  }

  /**
   * 发送验证码
   *
   * @param option 发送验证码参数
   */
  async sendOtp(option: SendOtpOption): Promise<SendOtpResponse> {
    const { ok, data, code, status, message, headers } = await this.req.post("send-otp", option, isSendOtpResponse)
    if (!ok || !data) {
      console.error({ type: "sendOtp Error", status, code, message, traceId: headers[TraceIdField] })
      throw new Error(`sendOtp: ${message || code || status}`)
    }
    return data
  }

  /**
   * 验证验证码
   *
   * @param option 验证码验证参数
   */
  async verifyOtp(option: VerifyOtpOption): Promise<VerifyOtpResponse> {
    const { ok, data, code, status, message, headers } = await this.req.post("verify-otp", option, isVerifyOtpResponse)
    if (!ok || !data) {
      console.error({ type: "verifyOtp Error", status, code, message, traceId: headers[TraceIdField] })
      throw new Error(`verifyOtp: ${message || code || status}`)
    }
    return data
  }

  /**
   * 申请语音审核。
   *
   * 玩家认为语音房间内某些玩家存在语音违规行为时，可提交语音审核申请。调用前提是：游戏已经在世游开启语音审核服务。
   */
  async voiceModerationRequest(option: VoiceModerationRequestOption): Promise<boolean> {
    const { ok, status, code, message, headers } = await this.req.post("voice-moderation-request", option)
    if (!ok) {
      console.error({ type: "voiceModerationRequest Error", status, code, message, traceId: headers[TraceIdField] })
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

// 目前 OTP 仅支持 sms 通道，mobile 恒为掩码后的手机号字符串，故此处统一按 string 校验。
// 后续新增 channel 时，需要在此根据 channel 补充 mobile 的关联校验
// （例如非 sms 通道下 mobile 可能为空），届时可考虑将 channel 传入本守卫。
function isSendOtpResponse(data: unknown): data is SendOtpResponse {
  return (
    isObject(data) &&
    "mobile" in data &&
    "otp_ttl" in data &&
    "otp_cooldown" in data &&
    typeof data.mobile === "string" &&
    typeof data.otp_ttl === "number" &&
    typeof data.otp_cooldown === "number"
  )
}

function isVerifyOtpResponse(data: unknown): data is VerifyOtpResponse {
  return isObject(data) && "valid" in data && typeof data.valid === "boolean"
}
