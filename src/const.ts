/** SDK 名称 */
export const SDKName = "combo-sdk-node"

/**
 * Api 路由前缀
 */
export const ApiPrefix = "/v3/server"

/**
 * 世游支持的服务端点列表
 */
export const enum Endpoint {
  /** 中国大陆 API 端点，用于国内发行 */
  China = "https://api.seayoo.com",
  /** 全球的 API 端点，用于海外发行  */
  Global = "https://api.seayoo.io",
}

/** 支持的系统平台 */
export const enum Platform {
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
export const enum IdP {
  /** 设备登录（游客） */
  Device = "device",
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
}

declare global {
  type EPlatform = Platform
  type EIdP = IdP
}
