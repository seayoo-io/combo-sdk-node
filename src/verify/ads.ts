import type { JwtPayload } from "jsonwebtoken"
import { isObject } from "../utils"

export interface AdPayload {
  /**
   * combo_id 是世游分配的聚合用户 ID
   *
   * 游戏侧应当使用 combo_id 作为用户的唯一标识。
   */
  combo_id: string
  /**
   * placement_id 是广告位 ID，游戏侧用它确定发放什么样的广告激励。
   */
  placement_id: string
  /**
   * impression_id 是世游服务端创建的，标识单次广告播放的唯一 ID。
   */
  impression_id: string
}

export type AdJwtPayload = JwtPayload &
  Omit<AdPayload, "combo_id"> & {
    scope: string
  }

export function isAdJwtPayload(payload: unknown): payload is AdJwtPayload {
  return (
    isObject(payload) &&
    "sub" in payload &&
    "iss" in payload &&
    "scope" in payload &&
    "placement_id" in payload &&
    "impression_id" in payload
  )
}
