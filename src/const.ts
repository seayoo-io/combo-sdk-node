/** SDK 名称 */
export const SDKName = "combo-sdk-node"

/** SDK 版本，在编译前会被动态替换 */
export const SDKVersion = "1.4.0"

/**
 * 世游支持的服务端点列表
 */
export enum Endpoint {
  /** 中国大陆 API 端点，用于国内发行 */
  China = "https://api.seayoo.com",
  /** 全球的 API 端点，用于海外发行  */
  Global = "https://api.seayoo.io",
}

/** 支持的系统平台 */
export enum Platform {
  /** 安卓平台，包括华为鸿蒙系统、小米澎湃 OS 等基于 Android 的操作系统 */
  Android = "android",
  /** 苹果的 iOS 和 iPadOS */
  iOS = "ios",
  /**  Windows (PC) 桌面平台 */
  Windows = "windows",
  /** macOS 桌面平台 */
  macOS = "macos",
  /** 微信小游戏 */
  Weixin = "weixin",
}

/** 支持的登录提供方 */
export enum IdP {
  /** 游客登录 */
  Guest = "guest",
  /** 世游通行证 */
  Seayoo = "seayoo",
  /** Sign-in with Apple */
  Apple = "apple",
  /** Google Account */
  Google = "google",
  /** Facebook Login */
  Facebook = "facebook",
  /** 小米账号 */
  Xiaomi = "xiaomi",
  /** 微信登录 */
  Weixin = "weixin",
  /** OPPO 账号 */
  Oppo = "oppo",
  /** VIVO 账号 */
  Vivo = "vivo",
  /** 华为账号 */
  Huawei = "huawei",
  /** 荣耀账号 */
  Honor = "honor",
  /** UC（九游）登录 */
  UC = "uc",
  /** TapTap 登录 */
  TapTap = "taptap",
  /** 哔哩哔哩（B站）账号 */
  Bilibili = "bilibili",
  /** 应用宝 YSDK 登录 */
  Yingyongbao = "yingyongbao",
  /** 4399 账号登录 */
  F4399 = "4399",
  /** 雷电模拟器账号 */
  Leidian = "leidian",
  /** 猫窝游戏 */
  Maowo = "maowo",
  /** 联想 */
  Lenovo = "lenovo",
  /** 魅族 */
  Meizu = "meizu",
  /** 酷派 */
  Coolpad = "coolpad",
  /** 努比亚 */
  Nubia = "nubia",
}

/** GM 错误类型枚举 */
export const enum GMError {
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

export const enum HttpStatus {
  OK = 200,
  Accepted = 202,
  NoContent = 204,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  NotAcceptable = 406,
  RequestTimeout = 408,
  Conflict = 409,
  UnsupportedMediaType = 415,
  UnprocessableEntity = 422,
  TooManyRequests = 429,
  InternalServerError = 500,
  BadGateway = 502,
  ServiceUnavailable = 503,
}
