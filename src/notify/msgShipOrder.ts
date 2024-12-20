import { isObject } from "../utils"

/**  ShipOrderNotification 是订单发货通知的数据结构，包含了订单的详细信息 */
export interface ShipOrderNotification {
  /** 世游服务端创建的，标识订单的唯一 ID */
  order_id: string
  /** 游戏侧用于标识创建订单请求的唯一 ID */
  reference_id: string
  /** 发起购买的用户的唯一标识 */
  combo_id: string
  /** 购买的商品 ID */
  product_id: string
  /** 购买的商品的数量 */
  quantity: number
  /** 订单币种代码。例如 USD CNY */
  currency: string
  /** 订单金额，单位为分，如果币种为美元，则单位为美分。 */
  amount: number
  /** 游戏侧创建订单时提供的订单上下文，透传回游戏 */
  context?: string
  /**
   * 是否是沙盒订单。沙盒订单意味着此订单并未产生真实的付款。
   *
   * 预期此字段仅用于记录日志和数据埋点。无论是否是沙盒订单，游戏侧都应当发货。
   */
  is_sandbox: boolean
}

export function isShipOrderPayload(data: unknown): data is ShipOrderNotification {
  return (
    isObject(data) &&
    "order_id" in data &&
    "reference_id" in data &&
    "combo_id" in data &&
    "product_id" in data &&
    "quantity" in data &&
    "currency" in data &&
    "amount" in data &&
    "is_sandbox" in data &&
    typeof data.order_id === "string" &&
    typeof data.combo_id === "string" &&
    typeof data.quantity === "number" &&
    typeof data.amount === "number" &&
    typeof data.is_sandbox === "boolean" &&
    Number.isSafeInteger(data.quantity) &&
    Number.isSafeInteger(data.amount) &&
    !!data.order_id &&
    !!data.combo_id
  )
}
