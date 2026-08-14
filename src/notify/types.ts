import { isShipOrderPayload, type ShipOrderNotification } from "./msgShipOrder"
import { isRefundPayload, type RefundNotification } from "./msgRefund"
import { isDataTagsPayload, type DataTagsNotification } from "./msgDataTags"
import type { MaybePromise, TypeGuard } from "../utils"

/**
 * 通知类型枚举
 */
export enum NotificationType {
  /**
   * 世游服务端会在订单状态变更为已支付时，向游戏侧推送发货通知。
   *
   * 游戏侧需要在收到通知后，根据通知中的订单信息，发货给用户：
   *
   * - 如果游戏内发货成功，则应当返回 void 或 Promise<void>
   * - 如果游戏内发货出现错误，则应当 throw Error。世游服务端会在稍后重试推送发货通知。
   */
  ShipOrder = "ship_order",
  /**
   * 世游服务端会在订单状态发生退款时，向游戏侧推送退款通知。
   */
  Refund = "refund",
  /**
   * 世游服务端会将约定好的数据标签批量推送给游戏侧。
   *
   * 预期游戏侧在接收到数据标签通知后，将这些数据标签持久化存储：
   *
   * - 如果游戏内成功处理了数据标签通知，则应当返回 void 或 Promise<void>
   * - 如果游戏内处理数据标签时出现错误，则应当 throw Error。世游服务端会在稍后重试推送数据标签通知。
   */
  DataTags = "data_tags",
}

/**
 * 通知类型对应的 payload
 */
export interface ENotificationPayload {
  [NotificationType.ShipOrder]: ShipOrderNotification
  [NotificationType.Refund]: RefundNotification
  [NotificationType.DataTags]: DataTagsNotification
}

/**
 * 自定义通知处理函数
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
  [NotificationType.Refund]: {
    guard: isRefundPayload,
    message: "Refund Data Format Error",
  },
  [NotificationType.DataTags]: {
    guard: isDataTagsPayload,
    message: "DataTags Data Format Error",
  },
} as const satisfies IPayload<NotificationType>
