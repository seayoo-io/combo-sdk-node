import { parseAuthorizationHeader, calcAuthorizationHeader, checkHttpAuthInfo } from "../src"
import { describe, expect, test, afterEach, vi } from "vitest"

describe("parseAuthorizationHeader", () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  // 正常数据格式化
  test.concurrent("Normal", () => {
    const info = parseAuthorizationHeader(
      "SEAYOO-HMAC-SHA256 Game=xcom,Timestamp=20231228T065821Z,Signature=05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea",
      "HS256"
    )
    expect(info).toBeTypeOf("object")
    expect(info.Game).toEqual("xcom")
    expect(info.Timestamp).toEqual("20231228T065821Z")
    expect(info.Signature).toEqual("05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea")
  })

  // 默认值
  test.concurrent("DefaultVersion HS256", () => {
    const info = parseAuthorizationHeader(
      "SEAYOO-HMAC-SHA256 Game=xcom,Timestamp=20231228T065821Z,Signature=05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea"
    )
    expect(info).toBeTypeOf("object")
    expect(info.Game).toEqual("xcom")
    expect(info.Timestamp).toEqual("20231228T065821Z")
    expect(info.Signature).toEqual("05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea")
  })

  // 乱序
  test.concurrent("OutOfOrder", () => {
    const info = parseAuthorizationHeader(
      "SEAYOO-HMAC-SHA256 Timestamp=20231228T065821Z,Game=xcom,Signature=05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea",
      "HS256"
    )
    expect(info).toBeTypeOf("object")
    expect(info.Game).toEqual("xcom")
    expect(info.Timestamp).toEqual("20231228T065821Z")
    expect(info.Signature).toEqual("05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea")
  })

  // 有空格
  test.concurrent("WithSpace", () => {
    const info = parseAuthorizationHeader(
      "SEAYOO-HMAC-SHA256 Timestamp= 20231228T065821Z , Game=xcom, Signature = 05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea ",
      "HS256"
    )
    expect(info).toBeTypeOf("object")
    expect(info.Game).toEqual("xcom")
    expect(info.Timestamp).toEqual("20231228T065821Z")
    expect(info.Signature).toEqual("05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea")
  })

  // 有双引号，如果不是成对出现，则不替换，引号内的空格不删除
  test.concurrent("WithQuot", () => {
    const info = parseAuthorizationHeader(
      'SEAYOO-HMAC-SHA256 Timestamp= "20231228T065821Z " , Game= " xcom , Signature = 05f5be " ',
      "HS256"
    )
    expect(info).toBeTypeOf("object")
    expect(info.Game).toEqual('" xcom')
    expect(info.Timestamp).toEqual("20231228T065821Z ")
    expect(info.Signature).toEqual('05f5be "')
  })

  // 版本错误
  test.concurrent("VersionError1", () => {
    const fn = vi.spyOn(console, "error")
    const info = parseAuthorizationHeader(
      "SEAYOO-HMAC-SHA256 Timestamp= 20231228T065821Z , Game=xcom, Signature = 05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea",
      "XXX" as unknown as "HS256"
    )
    expect(info).toBe(null)
    expect(fn).toBeCalledTimes(1)
  })

  // 版本识别
  test.concurrent("VersionError1", () => {
    const info = parseAuthorizationHeader('SEAYOO-HMAC-SHA Timestamp= "20231228T065821Z " , Game= " xcom , Signature = 05f5be " ', "HS256")
    expect(info).toBe(null)
  })

  // 版本识别对大小写敏感
  test.concurrent("VersionError2", () => {
    const info = parseAuthorizationHeader(
      'seayoo-hmac-SHA256 Timestamp= "20231228T065821Z " , Game= " xcom , Signature = 05f5be " ',
      "HS256"
    )
    expect(info).toBe(null)
  })

  // 空值
  test.concurrent("EmptyString", () => {
    const info = parseAuthorizationHeader("", "HS256")
    expect(info).toBe(null)
  })

  // 仅仅传递空的版本号，不被允许
  test.concurrent("OnlyVersion", () => {
    const info = parseAuthorizationHeader("SEAYOO-HMAC-SHA256", "HS256")
    expect(info).toBe(null)
  })

  // 没有 payload 是允许的
  test.concurrent("EmptyPayload", () => {
    const info = parseAuthorizationHeader("SEAYOO-HMAC-SHA256 ", "HS256")
    expect(info).toBeTypeOf("object")
    expect(Object.keys(info).length).toEqual(0)
  })
})

describe("calcAuthorizationHeader", () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  const baseConfig = {
    game: "xcom",
    secret: "sk_secret",
    endpoint: "https://api.example.com",
    method: "POST",
    url: "/v1/my-test-api?key=123&value=foobar",
    data: '{"hello":"world"}',
    timestamp: "20231228T065821Z",
  }
  const baseSignature = "05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea"
  const baseAuthorization = `SEAYOO-HMAC-SHA256 Game=${baseConfig.game},Timestamp=${baseConfig.timestamp},Signature=${baseSignature}`

  // 基础测试（5条）
  test.concurrent("Normal, Only Signature", () => {
    const sign = calcAuthorizationHeader(baseConfig, true, "HS256")
    expect(sign).toEqual(baseSignature)
  })
  test.concurrent("Normal, Full Authorization", () => {
    const sign = calcAuthorizationHeader(baseConfig, false, "HS256")
    expect(sign).toEqual(baseAuthorization)
  })
  test.concurrent("DefaultVersion HS256", () => {
    const sign = calcAuthorizationHeader(baseConfig, true)
    expect(sign).toEqual(baseSignature)
  })
  test.concurrent("DefaultOutput", () => {
    const sign = calcAuthorizationHeader(baseConfig)
    expect(sign).toEqual(baseAuthorization)
  })
  test.concurrent("ObjectBodyData", () => {
    const sign = calcAuthorizationHeader({ ...baseConfig, data: JSON.parse(baseConfig.data) })
    expect(sign).toEqual(baseAuthorization)
  })

  // 因为 endpoint 不参与计算签名，所以可以为空或错误
  test.concurrent("WithoutEndpoint", () => {
    const sign = calcAuthorizationHeader(Object.assign({}, baseConfig, { endpoint: "" }), true, "HS256")
    expect(sign).toEqual(baseSignature)
  })
  test.concurrent("ErrorEndpoint", () => {
    const sign = calcAuthorizationHeader(Object.assign({}, baseConfig, { endpoint: "xxxx" }), true, "HS256")
    expect(sign).toEqual(baseSignature)
  })

  // 如果时间戳错误
  test.concurrent("TimestampError", () => {
    const sign = calcAuthorizationHeader(Object.assign({}, baseConfig, { timestamp: "xxxx" }), true, "HS256")
    expect(sign).toEqual("ErrorTimestamp")
  })

  // 如果版本错误
  test.concurrent("VersionError", () => {
    const fn = vi.spyOn(console, "error")
    const sign = calcAuthorizationHeader(Object.assign({}, baseConfig, { timestamp: "xxxx" }), true, "XXX" as unknown as "HS256")
    expect(sign).toEqual("ErrorSigningVersion")
    expect(fn).toBeCalledTimes(1)
  })
})

describe("checkHttpAuthInfo", () => {
  const baseConfig = {
    game: "xcom",
    secret: "sk_secret",
    endpoint: "https://api.example.com",
    method: "POST",
    url: "/v1/my-test-api?key=123&value=foobar",
    data: '{"hello":"world"}',
    timestamp: "20231228T065821Z",
  }
  const baseSignature = "05f5be3e9f55f8fa2fb027666ec5bb379ff4732181839c28c77662b7e8eb0fea"
  const baseAuthorization = `SEAYOO-HMAC-SHA256 Game=${baseConfig.game},Timestamp=${baseConfig.timestamp},Signature=${baseSignature}`
  function getTimestamp(d: Date) {
    return d
      .toISOString()
      .replace(/\.\d+Z$/, "Z")
      .replace(/[-:]/g, "")
  }

  // 示例的签名时间戳过期了
  test("Normal.TimeOver", () => {
    const ok = checkHttpAuthInfo(baseAuthorization, baseConfig)
    expect(ok).toBe(false)
  })

  // 时间戳超前 5 分钟
  test("Normal.ValidTimeBeyond", () => {
    const ts = getTimestamp(new Date(Date.now() + 5 * 60 * 1000))
    const signature = calcAuthorizationHeader({ ...baseConfig, timestamp: ts })
    const ok = checkHttpAuthInfo(signature, baseConfig)
    expect(ok).toBe(true)
  })

  // 时间戳超前 5 分钟多 1 秒
  test("Normal.TimeBeyondOver", () => {
    const ts = getTimestamp(new Date(Date.now() + 5 * 60 * 1000 + 1000))
    const signature = calcAuthorizationHeader({ ...baseConfig, timestamp: ts })
    const ok = checkHttpAuthInfo(signature, baseConfig)
    expect(ok).toBe(false)
  })

  // 时间落后 5 分钟
  test("Normal.ValidTimeBehind", () => {
    const ts = getTimestamp(new Date(Date.now() - 5 * 60 * 1000))
    const signature = calcAuthorizationHeader({ ...baseConfig, timestamp: ts })
    const ok = checkHttpAuthInfo(signature, baseConfig)
    expect(ok).toBe(true)
  })

  // 时间戳落后 5 分钟多 1 秒
  test("Normal.TimeBehindOver", () => {
    const ts = getTimestamp(new Date(Date.now() - 5 * 60 * 1000 - 1000))
    const signature = calcAuthorizationHeader({ ...baseConfig, timestamp: ts })
    const ok = checkHttpAuthInfo(signature, baseConfig)
    expect(ok).toBe(false)
  })

  test("VersionError", () => {
    const ts = getTimestamp(new Date())
    const signature = calcAuthorizationHeader({ ...baseConfig, timestamp: ts })
    const ok = checkHttpAuthInfo("X" + signature, baseConfig)
    expect(ok).toBe(false)
  })

  test("SignatureError", () => {
    const ts = getTimestamp(new Date())
    const signature = calcAuthorizationHeader({ ...baseConfig, timestamp: ts })
    const ok = checkHttpAuthInfo(signature + "x", baseConfig)
    expect(ok).toBe(false)
  })

  test("EmptyAuthorization", () => {
    const ok = checkHttpAuthInfo("", baseConfig)
    expect(ok).toBe(false)
  })

  test("FakeAuthorizationTimstamp", () => {
    const ok = checkHttpAuthInfo("SEAYOO-HMAC-SHA256 Game=xcom,Timestamp=xxxx,Signature=ErrorTimestamp", baseConfig)
    expect(ok).toBe(false)
  })
})
