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
}

export interface CreateOrderResponse {
  /** 世游服务端创建的，标识订单的唯一 ID。 */
  order_id: string
  /** 世游服务端创建的订单 token，用于后续支付流程。 */
  order_token: string
  /** 订单失效时间。Unix timestamp in seconds。 */
  expires_at: number
}

export type SupportedOtpChannel = "sms"

export interface SendOtpOption {
  /** 要发送验证码的用户的唯一标识。 */
  combo_id: string
  /** 发送验证码的通道，目前仅支持 sms。不填写时默认为 sms。*/
  channel?: SupportedOtpChannel
  /** 发送验证码的目标行为，由世游发行平台创建并管理。*/
  action: string
  /** 发送方元数据，主要用于数据分析，游戏服务端应当尽量提供。*/
  meta?: SendOtpMetaData
}

export type SendOtpMetaData = OrderMetaData

export interface SendOtpResponse {
  /** 掩码后的手机号，仅当 channel=sms 时有值。*/
  mobile: string
  /** 验证码有效期，单位秒。*/
  otp_ttl: number
  /**  重新发送验证码的冷却时间，单位秒。*/
  otp_cooldown: number
}

export interface VerifyOtpOption {
  /** 要验证验证码的用户的唯一标识。 */
  combo_id: string
  /** 发送验证码的通道，需与发送时一致。不填写时默认为 sms。*/
  channel?: SupportedOtpChannel
  /** 发送验证码的目标行为，需与发送时一致。*/
  action: string
  /** 用户输入的验证码。*/
  otp: string
}

export interface VerifyOtpResponse {
  /**
   * 是否验证通过。
   *
   * - true 表示验证通过。验证通过后验证码立即失效，不可重复使用。
   * - false 表示验证失败，用户输入的验证码与系统生成的验证码不匹配，可能是由于输入错误或验证码已过期，建议用户重新检查输入的验证码。
   */
  valid: boolean
}

export interface GetMiniGameWeixinAccessTokenOption {
  /** 微信小游戏的 AppID。必须是当前游戏配置的微信小游戏应用。 */
  app_id: string
}

export interface GetMiniGameWeixinAccessTokenResponse {
  /** 微信小游戏的 AppID，与请求中的 app_id 一致。 */
  app_id: string
  /** 微信小游戏的接口调用凭证。 */
  access_token: string
}

export interface VoiceModerationRequestOption {
  /** 房间实例 ID，唯一标识某个语音房间的一次存续（从开启到关闭）。 */
  room_instance_id: string
  /** 游戏服务器 ID。 */
  server_id: number
  /** 提交审核申请的玩家角色 ID。 */
  requester_role_id: string
  /** 提交审核申请的玩家的唯一标识，选填。不传表示未提供。 */
  requester_combo_id?: string
  /** 被提交语音审核的玩家角色 ID 列表，一次最多提交 32 个。 */
  target_role_ids: string[]
  /**
   * 提交审核申请的原因列表，选填。
   *
   * 一次最多提交 12 个，单个原因最多 32 个字符，取值参见：审核申请原因维度表。
   * 注意：取值不能包含英文逗号。
   */
  reasons?: string[]
}
