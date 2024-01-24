import { statusOK } from "./rule"
import { noop, sleep } from "../../utils"
import type { NetRequestCoreFn, IRequestOptions, IRequestBaseResponse } from "./type"
import type { RequestGlobalConfig } from "./config"

export async function retryRequest(
  agent: NetRequestCoreFn,
  url: string,
  config: RequestGlobalConfig,
  options?: IRequestOptions,
  _try?: number
): Promise<IRequestBaseResponse> {
  const currentTryCount = _try || 0
  const maxRetry = Math.min(10, options?.maxRetry ?? config.get("maxRetry") ?? 0)
  const retryResolve = options?.retryResolve ?? config.get("retryResolve")
  const logger = config.get("logHandler") || noop
  logger({
    type: "prepear",
    url,
    method: options?.method || "GET",
    retry: currentTryCount,
    maxRetry,
    message: currentTryCount === 0 ? "start" : `retry ${currentTryCount}/${maxRetry} start`,
    headers: options?.headers,
    options,
  })
  const start = Date.now()
  const result = await agent(url, config, options)
  const status = result.status
  const cost = Date.now() - start
  const payload = `[cost ${cost}][${status}] ${status < 0 ? result.body : ""}`
  logger({
    type: "finished",
    url,
    method: result.method,
    retry: currentTryCount,
    maxRetry,
    message: currentTryCount === 0 ? `finish ${payload}` : `retry ${currentTryCount}/${maxRetry} finish ${payload}`,
    response: result,
    headers: result.headers,
    cost,
  })
  // status 大于 0 表示服务器已经有响应
  const ok = statusOK(status)
  if (!maxRetry || (retryResolve === "network" && status > 0) || (retryResolve === "status" && ok) || currentTryCount >= maxRetry) {
    return result
  }
  const retryInterval = options?.retryInterval ?? config.get("retryInterval")
  // 最短间隔 100ms 才能重试
  await sleep(Math.max(100, typeof retryInterval === "function" ? retryInterval(currentTryCount + 1) : retryInterval))
  return await retryRequest(agent, url, config, options, currentTryCount + 1)
}
