import jwt from "jsonwebtoken"
import { verifyConfig, type ISDKConfig } from "../utils"
import { isIdentityJwtPayload, type IdentityPayload } from "./id"
import type { VerifyOptions } from "jsonwebtoken"

export type { IdentityPayload } from "./id"

/**
 * token 验证器
 */
export class TokenVerifier {
  private privateKey: string
  private baseOption: VerifyOptions
  constructor(config: ISDKConfig) {
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
      const payload = jwt.verify(token, this.privateKey, { ...this.baseOption, complete: false })
      if (!payload || !isIdentityJwtPayload(payload) || !payload.sub) {
        return new Error("verifyIdentityToken: token 格式化失败 " + JSON.stringify(payload))
      }
      if (payload.scope !== "auth") {
        return new Error("verifyIdentityToken: 无效的 Scope")
      }
      return {
        combo_id: payload.sub,
        idp: payload.idp,
        external_id: payload.external_id,
        external_name: payload.external_name,
        weixin_unionid: payload.weixin_unionid,
      }
    } catch (error: unknown) {
      return new Error(`IdentityToken 验证失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
