import { GMError } from "../const"
import { isObject, MaybePromise } from "../utils"

export interface GMRequestBody {
  /** version 是世游 GM 服务的版本号，目前固定 2.0 */
  version: string
  /** 本次 GM 请求的唯一 ID。游戏侧可用此值来对请求进行去重 */
  request_id: string
  /** 本次 GM 请求的 Idempotency Key。如果有非空值则应当执行幂等处理逻辑。 */
  idempotency_key?: string
  /** GM 命令标识。取值和 GM 协议文件中的 rpc 名称对应，大小写敏感 */
  command: string
  /** args 是和 cmd 对应的命令参数，具体值取决于协议中对应 rpc 的 Request 定义 */
  args: Record<string, unknown>
}

export function isGMRequestBody(data: unknown): data is GMRequestBody {
  return (
    isObject(data) &&
    "version" in data &&
    "request_id" in data &&
    "command" in data &&
    "args" in data &&
    ("idempotency_key" in data ? typeof data.idempotency_key === "string" : true) &&
    typeof data.request_id === "string" &&
    typeof data.command === "string" &&
    typeof data.args === "object" &&
    data.args !== null
  )
}

export interface GMErrorResponse {
  /** 错误类型。对应内置定义好的 GmError 枚举值 */
  error: GMError
  /** 错误描述信息。预期是给人看的，便于联调和问题排查。*/
  message: string
}

export function isGMErrorResponse(data: unknown): data is GMErrorResponse {
  return isObject(data) && Object.keys(data).length === 2 && "error" in data && "message" in data
}

/**
 * 自定义 GM 执行函数，需要返回执行结果，其结构由协议中对应 rpc 的 Response 定义。
 *
 * 如果遇到错误可以返回错误结构 ({ error, message }) 或 Error 对象
 */
export type GMCommandHandler = {
  (
    command: string,
    args: Record<string, unknown>,
    requestId: string,
    idempotencyKey: string,
    version: string
  ): MaybePromise<Record<string, unknown> | GMErrorResponse | Error>
}

/**
 * 在处理幂等性时，需要使用储存支持，比如 Reis
 */
export interface IdempotencyKeyStoreHelper {
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

/** 幂等key 记录 */
export interface IdempotencyRecord {
  nonce: string
  key: string
  id: string
  cmd: string
  args: string
  resp?: Record<string, unknown> | GMErrorResponse | Error
}

export function isIdempotencyRecord(data: unknown): data is IdempotencyRecord {
  return isObject(data) && "key" in data && "id" in data && "cmd" in data && "args" in data
}
