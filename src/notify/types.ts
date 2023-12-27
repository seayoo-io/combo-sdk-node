import { isShipOrderPayload, type ShipOrderNotification } from "./msgShipOrder"
import type { MaybePromise, TypeGuard } from "../utils"

/**
 * 通知类型枚举
 */
export const enum NotificationType {
  /**
   * 世游服务端会在订单状态变更为已支付时，向游戏侧推送发货通知。
   *
   * 游戏侧需要在收到通知后，根据通知中的订单信息，发货给用户：
   *
   * - 如果游戏内发货成功，则应当返回 void 或 Promise<void>
   * - 如果游戏内发货出现错误，则应当 throw Error。世游服务端会在稍后重试推送发货通知。
   */
  ShipOrder = "ship_order",
}

/**
 * 通知类型对应的 payload
 */
export interface ENotificationPayload {
  [NotificationType.ShipOrder]: ShipOrderNotification
}

/**
 * 自定义处理函数
 *
 * 每种消息类型对应不同的 payload 以及返回值具体可以查看类型定义
 */
export type NotificationHandler = {
  <T extends NotificationType>(type: T, payload: ENotificationPayload[T]): MaybePromise<void>
}

type IPayload<T extends NotificationType> = Record<T, TypeGuard<ENotificationPayload[T]>>

/**
 * 消息处理分发配置
 */
export const messageDataGuards = {
  [NotificationType.ShipOrder]: {
    guard: isShipOrderPayload,
    message: "ShipOrder Data Format Error",
  },
} as const satisfies IPayload<NotificationType>
