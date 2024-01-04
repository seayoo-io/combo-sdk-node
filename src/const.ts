/** SDK 名称 */
export const SDKName = "combo-sdk-node"

/** SDK 版本，在编译前会被动态替换 */
export const SDKVersion = "0.1.3"

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
