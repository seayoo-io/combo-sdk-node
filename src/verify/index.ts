import { verify } from "jsonwebtoken"
import { verifyConfig, type SDKBaseConfig } from "../utils"
import { isIdentityJwtPayload, type IdentityPayload } from "./id"
import { isAdJwtPayload, type AdPayload } from "./ads"
import type { VerifyOptions } from "jsonwebtoken"

const IdentityTokenScope = "auth"
const AdTokenScope = "ads"

/**
 * token 验证器
 */
export class TokenVerifier {
  private privateKey: string
  private baseOption: VerifyOptions
  constructor(config: SDKBaseConfig) {
    verifyConfig(config)
    this.privateKey = config.secret
    this.baseOption = {
      // https://github.com/auth0/node-jsonwebtoken#algorithms-supported
      algorithms: ["HS256"],
      audience: config.game,
      issuer: config.endpoint,
      ignoreExpiration: false,
    }
  }

  /**
   * verifyIdentityToken 对 IdentityToken 进行验证
   *
   * 验证失败会返回 Error 对象
   */
  verifyIdentityToken(token: string): IdentityPayload | Error {
    try {
      const payload = verify(token, this.privateKey, { ...this.baseOption, complete: false })
      if (!payload || !isIdentityJwtPayload(payload) || !payload.sub) {
        return new Error("verifyIdentityToken: token 格式化失败 " + JSON.stringify(payload))
      }
      if (payload.scope !== IdentityTokenScope) {
        return new Error("verifyIdentityToken: 无效的 Scope")
      }
      return {
        combo_id: payload.sub,
        idp: payload.idp,
        external_id: payload.external_id,
        external_name: payload.external_name,
        weixin_unionid: payload.weixin_unionid || "",
        distro: payload.distro || "",
        variant: payload.variant || "",
      }
    } catch (error: unknown) {
      return new Error(`IdentityToken 验证失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * verifyAdToken 对 AdToken 进行验证
   *
   * 验证失败会返回 Error 对象
   */
  verifyAdToken(token: string): AdPayload | Error {
    try {
      const payload = verify(token, this.privateKey, { ...this.baseOption, complete: false })
      if (!payload || !isAdJwtPayload(payload) || !payload.sub) {
        return new Error("verifyAdToken: token 格式化失败 " + JSON.stringify(payload))
      }
      if (payload.scope !== AdTokenScope) {
        return new Error("verifyAdToken: 无效的 Scope")
      }
      return {
        combo_id: payload.sub,
        placement_id: payload.placement_id,
        impression_id: payload.impression_id,
      }
    } catch (error: unknown) {
      return new Error(`AdToken 验证失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
