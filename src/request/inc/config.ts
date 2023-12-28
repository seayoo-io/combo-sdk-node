import { isFullURL, getFullURL, type SomeRequired } from "../../utils"
import type { IRequestGlobalConfig } from "./type"

export class RequestGlobalConfig {
  // 保存的配置需要部分字段强制设置默认值
  private config: SomeRequired<
    IRequestGlobalConfig,
    "baseURL" | "maxRetry" | "cacheTTL" | "responseRule" | "retryInterval" | "timeout" | "retryResolve"
  > = {
    baseURL: "",
    maxRetry: 0,
    retryInterval: 1000,
    retryResolve: "network",
    timeout: 5000,
    cacheTTL: 500,
    responseRule: {
      ok: {
        resolve: "body",
      },
      failed: {
        resolve: "json",
        messageField: "message",
      },
    },
  }
  constructor(config?: IRequestGlobalConfig) {
    config && this.set(config)
  }

  set(config: Partial<IRequestGlobalConfig>) {
    if (config.baseURL && !/^\/.+/.test(config.baseURL) && !isFullURL(config.baseURL)) {
      console.warn("baseURL 需要以 / 开头，或者是完整的 url 地址")
      throw new Error("BaseURLError")
    }
    Object.assign(this.config, config)
  }

  get<T extends keyof IRequestGlobalConfig>(key: T) {
    return this.config[key]
  }

  /** 基于 baseURL 返回完整的 url 地址, 如果 url 地址以 / 开头则表示忽略 baseURL 的值 */
  getFullUrl(url: string): string {
    return url.startsWith("/") ? getFullURL(url) : getFullURL(url, this.config.baseURL)
  }

  /** 提示消息 */
  showMessage(isError: boolean, message: string | false) {
    if (this.config.messageHandler && message) {
      this.config.messageHandler(isError, message)
    }
  }
}
