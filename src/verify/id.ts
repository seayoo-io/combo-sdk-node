import type { JwtPayload } from "jsonwebtoken"
import type { IdP } from "../const"
import { isObject } from "../utils"

export interface IdentityPayload {
  /**
   * combo_id 是世游分配的聚合用户 ID
   *
   * 游戏侧应当使用 combo_id 作为用户的唯一标识。
   */
  combo_id: string
  /**
   * IdP (Identity Provider) 是用户身份的提供者
   *
   * 游戏侧可以使用 IdP 做业务辅助判断，例如判定用户是否使用了某个特定的登录方式。
   */
  idp: IdP
  /**
   * external_id 是用户在外部 IdP 中的唯一标识
   *
   * 例如：
   *  - 如果用户使用世游通行证登录，那么 external_id 就是用户的世游通行证 ID。
   *  - 如果用户使用 Google Account 登录，那么 external_id 就是用户在 Google 中的账号标识。
   *  - 如果用户使用微信登录，那么 external_id 就是用户在微信中的 OpenId。
   *
   * 注意：
   * 游戏侧不应当使用 external_id 作为用户标识，但可以将 external_id 用于特定的业务逻辑。
   */
  external_id: string
  /**
   * external_name 是用户在外部 IdP 中的名称，通常是用户的昵称
   */
  external_name: string
  /**
   * weixin_unionid 是用户在微信中的 UnionId
   * 游戏侧可以使用 weixin_unionid 实现多端互通
   *
   * 注意：weixin_unionid 只在 IdP 为 weixin 时才会有值。
   */
  weixin_unionid?: string
}

export type IdentityJwtPayload = JwtPayload &
  Omit<IdentityPayload, "combo_id"> & {
    scope: string
  }

export function isIdentityJwtPayload(payload: unknown): payload is IdentityJwtPayload {
  return (
    isObject(payload) &&
    "sub" in payload &&
    "iss" in payload &&
    "scope" in payload &&
    "idp" in payload &&
    "external_id" in payload &&
    "external_name" in payload
  )
}
