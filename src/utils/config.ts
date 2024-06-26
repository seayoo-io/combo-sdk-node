import { Endpoint } from "../const"
import { isObject, isFullURL } from "./base"

/** 通用初始化配置 */
export interface SDKBaseConfig {
  /** 服务地址，内置 Endpoint 枚举可选 */
  endpoint: `http://${string}` | `https://${string}`
  /** 游戏 Game ID */
  game: string
  /** 游戏 Secret Key */
  secret: `sk_${string}`
}

/**
 * 校验通用配置，如果有错误，则直接 throw Error
 */
export function verifyConfig(config: SDKBaseConfig) {
  verifyConfigWithoutEndpoint(config)
  if (!isFullURL(config.endpoint)) {
    throw Error(`Config.endpoint Error, Should be url, Preset Values: ${Endpoint.China}, ${Endpoint.Global}}`)
  }
}

/**
 * 校验通用配置，如果有错误，则直接 throw Error
 */
export function verifyConfigWithoutEndpoint(config: Omit<SDKBaseConfig, "endpoint">) {
  if (!isObject(config)) {
    throw Error("Config Missing")
  }
  if (!config.game) {
    throw Error(`Config.game Error, Missing Required GameId`)
  }
  if (!config.secret) {
    throw Error(`Config.secret Error, Missing Required Secret`)
  }
  if (!config.secret.startsWith("sk_")) {
    throw Error(`Config.secret Error, Should be Start With sk_`)
  }
}
