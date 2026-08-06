/**
 * 产物冒烟检查（零依赖，需兼容 Node 12 语法：不可使用 ?. / ?? / 私有字段）
 *
 * 被 smoke.cjs 与 smoke.mjs 共用，确保两种模块格式校验同一份断言。
 */
const assert = require("assert")

const EXPECTED_EXPORTS = [
  "ApiClient",
  "Endpoint",
  "GMError",
  "IdP",
  "MemoryIdempotencyStore",
  "NotificationType",
  "Platform",
  "RedisIdempotencyStore",
  "TokenVerifier",
  "calcAuthorizationHeader",
  "checkHttpAuthInfo",
  "genSessionID",
  "getGMCommandHandler",
  "getGMHandlerForExpress",
  "getGMHandlerForKoa",
  "getGMMiddlewareForExpress",
  "getGMMiddlewareForKoa",
  "getNotificationHandler",
  "getNotificationHandlerForExpress",
  "getNotificationHandlerForKoa",
  "getNotificationMiddlewareForExpress",
  "getNotificationMiddlewareForKoa",
  "parseAuthorizationHeader",
]

const CONFIG = { endpoint: "https://api.seayoo.com", game: "xcom", secret: "sk_secret" }

const JWT_PAYLOAD = {
  iss: CONFIG.endpoint,
  aud: CONFIG.game,
  sub: "1231223346130001",
  iat: 1703748437,
  exp: 4103834837,
  scope: "auth",
  idp: "seayoo",
  external_id: "oUVs6xlA-2Ek5zqNwflQa12345678",
  external_name: "tester",
  device_id: "minigame_device_001",
  reg_time: 1703748437,
}

function runChecks(sdk, jwt, label) {
  const done = []
  function check(name, fn) {
    fn()
    done.push(name)
  }

  check("导出面完整", function () {
    for (let i = 0; i < EXPECTED_EXPORTS.length; i++) {
      const name = EXPECTED_EXPORTS[i]
      assert.ok(sdk[name] !== undefined, "缺少导出: " + name)
    }
  })

  check("枚举取值正确", function () {
    assert.strictEqual(sdk.NotificationType.ShipOrder, "ship_order")
    assert.strictEqual(sdk.NotificationType.Refund, "refund")
    assert.strictEqual(sdk.Endpoint.China, "https://api.seayoo.com")
    assert.strictEqual(sdk.Platform.HarmonyOS, "harmonyos")
    assert.strictEqual(sdk.IdP.Seayoo, "seayoo")
    assert.strictEqual(sdk.GMError.InternalError, "internal_error")
  })

  // 这条最关键：验证打包产物对 jsonwebtoken 的 interop 在 Node 12 上真实可用
  check("TokenVerifier 验证合法 token", function () {
    const token = jwt.sign(JWT_PAYLOAD, CONFIG.secret, { algorithm: "HS256" })
    const result = new sdk.TokenVerifier(CONFIG).verifyIdentityToken(token)
    assert.ok(!(result instanceof Error), "验证意外失败: " + result)
    assert.strictEqual(result.combo_id, JWT_PAYLOAD.sub)
  })

  check("非法 token 返回 Error", function () {
    const result = new sdk.TokenVerifier(CONFIG).verifyIdentityToken("not-a-jwt")
    assert.ok(result instanceof Error)
  })

  check("签名与工具函数可用", function () {
    const header = sdk.calcAuthorizationHeader({
      method: "POST",
      url: "https://api.seayoo.com/v1/test",
      data: "{}",
      game: CONFIG.game,
      secret: CONFIG.secret,
      endpoint: CONFIG.endpoint,
    })
    assert.strictEqual(typeof header, "string")
    assert.ok(header.length > 0)
    assert.strictEqual(sdk.genSessionID("").length, 32)
  })

  check("配置校验仍会拒绝非法 secret", function () {
    assert.throws(function () {
      new sdk.TokenVerifier({ endpoint: CONFIG.endpoint, game: CONFIG.game, secret: "bad" })
    })
  })

  console.log("[" + label + "] " + done.length + " 项检查通过: " + done.join(" / "))
}

module.exports = { runChecks: runChecks }
