import type { Platform } from "../const"

export interface CreateOrderOption {
  /** 用于标识创建订单请求的唯一 ID */
  reference_id: string
  /** 发起购买的用户的唯一标识 */
  combo_id: string
  /** 要购买的商品 ID */
  product_id: string
  /** 平台 */
  platform: Platform
  /**
   * 游戏侧接收发货通知的服务端地址
   *
   * 这个地址对应的服务端应该通过 Notify 模块实现基础的验证接口
   */
  notify_url: string
  /** 要购买的商品的数量 */
  quantity: number
  /** 订单上下文，在发货通知中透传回游戏 */
  context?: string
  /**
   * 订单的元数据
   *
   * 大部分元数据用于数据分析与查询，游戏侧应当尽量提供
   * 某些元数据在特定的支付场景下是必须的，例如微信小游戏的 iOS 支付场景
   */
  meta?: OrderMetaData
}

export interface OrderMetaData {
  /** 游戏大区 ID */
  zone_id?: string
  /** 游戏服务器 ID */
  server_id?: string
  /** 游戏角色 ID */
  role_id?: string
  /** 游戏角色名 */
  role_name?: string
  /** 游戏角色的等级 */
  role_level?: number
  /** 微信小游戏的 App ID, 微信小游戏的 iOS 支付场景必须传入 */
  weixin_appid?: string
  /** 微信小游戏的玩家 OpenID, 微信小游戏的 iOS 支付场景必须传入 */
  weixin_openid?: string
}

export interface CreateOrderResponse {
  /** 世游服务端创建的，标识订单的唯一 ID。 */
  order_id: string
  /** 世游服务端创建的订单 token，用于后续支付流程。 */
  order_token: string
  /** 订单失效时间。Unix timestamp in seconds。 */
  expires_at: number
}
