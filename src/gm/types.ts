import { GMError } from "../const"
import { MaybePromise } from "../utils"

export interface GMErrorResponse {
  /** 错误类型。对应内置定义好的 GmError 枚举值 */
  error: GMError
  /** 错误描述信息。预期是给人看的，便于联调和问题排查。*/
  message: string
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
    version: string
  ): MaybePromise<Record<string, unknown> | GMErrorResponse | Error>
}
