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
  weixin_unionid: string
  /**
   * distro 是游戏客户端的发行版本标识。
   * 游戏侧可将 distro 用于服务端数据埋点，以及特定的业务逻辑判断。
   */
  distro: string
  /**
   * variant 是游戏客户端的分包标识。
   * 游戏侧可将 variant 用于服务端数据埋点，以及特定的业务逻辑判断。
   *
   * 注意：variant 只在客户端是分包时才会有值。当客户端不是分包的情况下，variant 为空字符串。
   */
  variant: string

  /**
   * age 是根据用户的实名认证信息得到的年龄。
   *
   * 0 表示未知。
   *
   * 在某些特殊场景下，游戏侧可用 age 来自行处理防沉迷。
   *
   * 注意：age 不保证返回精确的年龄信息，仅保证用于防沉迷处理时的准确度够用。
   *
   * 例如：
   *
   * 当某个用户真实年龄为 35 岁时，age 可能返回 18，
   * 当某个用户真实年龄为 17 岁时，age 可能返回 16。
   */
  age: number
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
