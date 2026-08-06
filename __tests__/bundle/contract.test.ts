import { describe, expect, test, beforeAll } from "vitest"
import { readFileSync } from "fs"
import { createRequire } from "module"
import { fileURLToPath, pathToFileURL } from "url"
import { join } from "path"
import { sign } from "jsonwebtoken"

// 产物路径以变量形式传入，避免 tsc 在 dist 缺失时把类型检查搞挂
const distDir = fileURLToPath(new URL("../../dist/", import.meta.url))
const require = createRequire(import.meta.url)

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  version: string
  main: string
  module: string
  types: string
}

/** 公开导出面快照。新增或移除导出时必须同步更新，避免无意破坏 API 契约。 */
const expectedExports = [
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

interface SdkModule {
  [key: string]: unknown
  TokenVerifier: new (config: unknown) => {
    verifyIdentityToken(token: string): unknown
  }
  NotificationType: Record<string, string>
  Endpoint: Record<string, string>
  Platform: Record<string, string>
  GMError: Record<string, string>
  IdP: Record<string, string>
}

let cjs: SdkModule
let esm: SdkModule

beforeAll(async () => {
  cjs = require(join(distDir, "index.cjs")) as SdkModule
  esm = (await import(pathToFileURL(join(distDir, "index.js")).href)) as unknown as SdkModule
})

describe("产物导出面", () => {
  test("CJS 导出与快照一致", () => {
    expect(Object.keys(cjs).sort()).toEqual(expectedExports)
  })

  test("ESM 导出与快照一致", () => {
    expect(Object.keys(esm).filter(k => k !== "default").sort()).toEqual(expectedExports)
  })

  test("两种格式导出面完全相同", () => {
    expect(Object.keys(cjs).sort()).toEqual(Object.keys(esm).filter(k => k !== "default").sort())
  })

  test("内部枚举未泄漏到导出面", () => {
    expect(cjs.HttpStatus).toBeUndefined()
  })
})

describe("枚举运行时取值", () => {
  // const enum 改为 enum 后，取值必须逐一保持不变
  const cases = {
    NotificationType: { ShipOrder: "ship_order", Refund: "refund" },
    Endpoint: { China: "https://api.seayoo.com", Global: "https://api.seayoo.io" },
    Platform: {
      Android: "android",
      iOS: "ios",
      Windows: "windows",
      macOS: "macos",
      WebGL: "webgl",
      HarmonyOS: "harmonyos",
    },
  }

  for (const [name, expected] of Object.entries(cases)) {
    test(`${name} (CJS)`, () => {
      expect(cjs[name]).toMatchObject(expected)
    })
    test(`${name} (ESM)`, () => {
      expect(esm[name]).toMatchObject(expected)
    })
  }

  test("GMError 与 IdP 为字符串枚举", () => {
    for (const mod of [cjs, esm]) {
      expect(Object.values(mod.GMError).every(v => typeof v === "string")).toBe(true)
      expect(Object.values(mod.IdP).every(v => typeof v === "string")).toBe(true)
      expect(mod.GMError.InternalError).toBe("internal_error")
      expect(mod.IdP.Seayoo).toBe("seayoo")
    }
  })
})

describe("jsonwebtoken interop", () => {
  const config = { endpoint: "https://api.seayoo.com", game: "xcom", secret: "sk_secret" } as const
  const payload = {
    iss: config.endpoint,
    aud: config.game,
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
  const token = sign(payload, config.secret, { algorithm: "HS256" })

  // 这两条用例专门拦 `import { verify }` → `import jwt from` 的 interop 回归：
  // 前者在打包后的 CJS 产物里会取到 undefined，而源码测试对此无感
  test.each([
    ["CJS", () => cjs],
    ["ESM", () => esm],
  ])("%s 可验证合法 token", (_label, get) => {
    const { TokenVerifier } = get()
    const result = new TokenVerifier(config).verifyIdentityToken(token)
    expect(result).not.toBeInstanceOf(Error)
    expect((result as { combo_id?: string }).combo_id).toBe(payload.sub)
  })

  test.each([
    ["CJS", () => cjs],
    ["ESM", () => esm],
  ])("%s 对非法 token 返回 Error 而非抛出", (_label, get) => {
    const { TokenVerifier } = get()
    expect(new TokenVerifier(config).verifyIdentityToken("not-a-jwt")).toBeInstanceOf(Error)
  })
})

describe("版本一致性", () => {
  // preconvert.cjs 负责把 package.json 的 version 写进产物，漏跑会导致 UA 版本号错位
  test.each(["index.js", "index.cjs"])("%s 内嵌版本号与 package.json 一致", file => {
    const code = readFileSync(join(distDir, file), "utf8")
    const matched = code.match(/SDKVersion\s*=\s*"([^"]+)"/)
    expect(matched?.[1]).toBe(pkg.version)
  })
})

describe("package.json 声明的入口真实存在", () => {
  test.each([
    ["main", () => pkg.main],
    ["module", () => pkg.module],
    ["types", () => pkg.types],
  ])("%s 指向的文件可读", (_label, get) => {
    expect(() => readFileSync(new URL(get(), new URL("../../", import.meta.url)))).not.toThrow()
  })
})
