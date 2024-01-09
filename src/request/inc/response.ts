import { analyseResponse, statusOK } from "./rule"
import type { RequestGlobalConfig } from "./config"
import type { IRequestOptions, IResponseResult, IRequestBaseResponse } from "./type"
import { fromEntries } from "../../utils"

export function handleResponse(
  res: IRequestBaseResponse,
  url: string,
  config: RequestGlobalConfig,
  options?: IRequestOptions
): IResponseResult {
  // status为负数的表示网络错误或请求取消等异常情况
  if (res.status < 0) {
    return checkGlobalMessage(
      { ok: false, status: res.status, code: res.statusText, headers: {}, message: "", data: null },
      `${res.method} ${url} ${res.statusText}`,
      res.method,
      url,
      config,
      options
    )
  }
  // 处理全局 http 错误
  if (!statusOK(res.status)) {
    config.get("errorHandler")?.(res.status, res.method, url)
  }
  // 分析响应内容
  const result: IResponseResult = {
    ...analyseResponse(res.status, res.statusText, res.body, config.get("responseRule"), options?.responseRule),
    status: res.status,
    headers: fromEntries(Object.entries(res.headers || {}).map(([key, value]) => [key.toLowerCase(), value])),
  }
  // 全局处理响应结果 (浅复制，防止被修改，同时保留修改 result.data 的可能性)
  config.get("responseHandler")?.({ ...result }, res.method, url)
  // 检查并全局提示
  const defaultMessage = result.ok
    ? result.message
    : `${res.method} ${url} [${result.code || res.statusText}] ${result.message || res.statusText}`
  return checkGlobalMessage(result, defaultMessage, res.method, url, config, options)
}

function checkGlobalMessage(
  result: IResponseResult,
  defaultMessage: string,
  method: string,
  url: string,
  config: RequestGlobalConfig,
  options?: IRequestOptions
) {
  const gmessageConvert = config.get("message")
  const messageConvert = gmessageConvert === false || options?.message === false ? false : options?.message || gmessageConvert
  if (messageConvert !== false) {
    config.showMessage(
      !result.ok,
      typeof messageConvert === "function" ? messageConvert(result, method, url, defaultMessage) : defaultMessage
    )
  }
  return result
}
