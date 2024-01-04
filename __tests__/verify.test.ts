import { TokenVerifier } from "../src/verify"
import { describe, expect, test } from "vitest"

// jwt 编码解码工具
// https://www.bejson.com/jwt/

describe("CreateInstance", () => {
  const baseConfig = {
    endpoint: "https://api.seayoo.com",
    game: "xcom",
    secret: "sk_secret",
  } as const

  test("Normal", () => {
    const verifier = new TokenVerifier(baseConfig)
    expect(verifier).toBeInstanceOf(TokenVerifier)
    expect("verifyIdentityToken" in verifier).toBe(true)
    expect(verifier.verifyIdentityToken.length).toBe(1)
    expect("verifyAdToken" in verifier).toBe(true)
    expect(verifier.verifyAdToken.length).toBe(1)
  })

  test("WithoutKey", () => {
    let err: Error | null = null
    try {
      new TokenVerifier({ ...baseConfig, secret: "" as unknown as "sk_${string}" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })

  test("WithoutGame", () => {
    let err: Error | null = null
    try {
      new TokenVerifier({ ...baseConfig, game: "" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })

  test("WithoutEndpoint", () => {
    let err: Error | null = null
    try {
      new TokenVerifier({ ...baseConfig, endpoint: "" as unknown as "https://${string}" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })
})

describe("Identity Token", () => {
  const baseConfig = {
    endpoint: "https://api.seayoo.com",
    game: "xcom",
    secret: "sk_secret",
  } as const
  const baseToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbSIsInN1YiI6IjkxMjMxMjIzMzQ2MTMwMDAxIiwiaWF0IjoxNzAzNzQ4NDM3LCJleHAiOjQxMDM4MzQ4MzcsInNjb3BlIjoiYXV0aCIsImlkcCI6InNlYXlvbyIsImV4dGVybmFsX2lkIjoiMTk5OSIsImV4dGVybmFsX25hbWUiOiIqKuWzsCJ9.LuGwQ1sVCFBmxYx-FuArO_17Y02mqpMYENXhb-yTyiY"

  test("Normal", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyIdentityToken(baseToken)
    expect(info instanceof Error).toBe(false)
    expect("combo_id" in info ? info.combo_id : "").toEqual("91231223346130001")
    expect("idp" in info ? info.idp : "").toEqual("seayoo")
    expect("external_id" in info ? info.external_id : "").toEqual("1999")
    expect("external_name" in info ? info.external_name : "").toEqual("**峰")
    expect("weixin_unionid" in info ? info.weixin_unionid : "error").toEqual("")
  })

  test("ErrorSecretKey", () => {
    const verifier = new TokenVerifier({ ...baseConfig, secret: "sk_error" })
    const info = verifier.verifyIdentityToken(baseToken)
    expect(info).toBeInstanceOf(Error)
  })

  // scope
  test("ErrorToken:ScopeError", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyIdentityToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbSIsInN1YiI6IjkxMjMxMjIzMzQ2MTMwMDAxIiwiaWF0IjoxNzAzNzQ4NDM3LCJleHAiOjQxMDM4MzQ4MzcsInNjb3BlIjoiZXJyb3IiLCJpZHAiOiJzZWF5b28iLCJleHRlcm5hbF9pZCI6IjE5OTkiLCJleHRlcm5hbF9uYW1lIjoiKirls7AifQ.ZnrspSrwOpPp65ogKFnYC-S8Y-clWHWbtwNJ5WoIrik"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // aud
  test("ErrorToken:AudError", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyIdentityToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbTIiLCJzdWIiOiI5MTIzMTIyMzM0NjEzMDAwMSIsImlhdCI6MTcwMzc0ODQzNywiZXhwIjo0MTAzODM0ODM3LCJzY29wZSI6ImF1dGgiLCJpZHAiOiJzZWF5b28iLCJleHRlcm5hbF9pZCI6IjE5OTkiLCJleHRlcm5hbF9uYW1lIjoiKirls7AifQ.HYNnnRbnZ16w3keS-GXPB3jxBP20S1laT6McQcpvbu4"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // iss
  test("ErrorToken:IssError", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyIdentityToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS54LmNvbSIsImF1ZCI6Inhjb20iLCJzdWIiOiI5MTIzMTIyMzM0NjEzMDAwMSIsImlhdCI6MTcwMzc0ODQzNywiZXhwIjo0MTAzODM0ODM3LCJzY29wZSI6ImF1dGgiLCJpZHAiOiJzZWF5b28iLCJleHRlcm5hbF9pZCI6IjE5OTkiLCJleHRlcm5hbF9uYW1lIjoiKirls7AifQ.YIKD3k_8KkHaupaAMQ7QhmXC5RCuoYnCQ7utjNQGd1c"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // 时间过期
  test("ErrorToken:ExpTimeout", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyIdentityToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbSIsInN1YiI6IjkxMjMxMjIzMzQ2MTMwMDAxIiwiaWF0IjoxMDAzNzQ4NDM3LCJleHAiOjExMDM4MzQ4MzcsInNjb3BlIjoiYXV0aCIsImlkcCI6InNlYXlvbyIsImV4dGVybmFsX2lkIjoiMTk5OSIsImV4dGVybmFsX25hbWUiOiIqKuWzsCJ9.xE0D5JM5asOAOliwdZpEe3UZ6NZveOg1cRwm-xdoPmo"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // 空
  test("ErrorToken:EmptyToken", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyIdentityToken("")
    expect(info).toBeInstanceOf(Error)
  })
})

describe("Ad Token", () => {
  const baseConfig = {
    endpoint: "https://api.seayoo.com",
    game: "xcom",
    secret: "sk_secret",
  } as const
  const baseToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbSIsInN1YiI6IjkxMjMxMjIyMTMxMjEwMDAxIiwiaWF0IjoxNzAzNjY2ODQwLCJleHAiOjQxMDM2NjcxNDAsInNjb3BlIjoiYWRzIiwicGxhY2VtZW50X2lkIjoidG9wb25fYW5kcm9pZF90ZXN0XzAxIiwiaW1wcmVzc2lvbl9pZCI6IjhkY2E5OGJiZWFhMzRhYzU5ZmE1OGI0NmE5MGU2YjRhIn0.B51iBWNFGEYofVCgadzU3k3R3WnQC6duzbowELZ4PwA"

  test("Normal", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyAdToken(baseToken)
    expect(info instanceof Error).toBe(false)
    expect("placement_id" in info ? info.placement_id : "").toEqual("topon_android_test_01")
    expect("impression_id" in info ? info.impression_id : "").toEqual("8dca98bbeaa34ac59fa58b46a90e6b4a")
  })

  test("ErrorSecretKey", () => {
    const verifier = new TokenVerifier({ ...baseConfig, secret: "sk_error" })
    const info = verifier.verifyAdToken(baseToken)
    expect(info).toBeInstanceOf(Error)
  })

  // scope
  test("ErrorToken:ScopeError", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyAdToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbSIsInN1YiI6IjkxMjMxMjIyMTMxMjEwMDAxIiwiaWF0IjoxNzAzNjY2ODQwLCJleHAiOjQxMDM2NjcxNDAsInNjb3BlIjoiYXV0aCIsInBsYWNlbWVudF9pZCI6InRvcG9uX2FuZHJvaWRfdGVzdF8wMSIsImltcHJlc3Npb25faWQiOiI4ZGNhOThiYmVhYTM0YWM1OWZhNThiNDZhOTBlNmI0YSJ9.zhfOpG5PKvShiP9SMTMklle3Js93TNcvONbZw9OxhWU"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // aud
  test("ErrorToken:AudError", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyAdToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbTIiLCJzdWIiOiI5MTIzMTIyMjEzMTIxMDAwMSIsImlhdCI6MTcwMzY2Njg0MCwiZXhwIjo0MTAzNjY3MTQwLCJzY29wZSI6ImFkcyIsInBsYWNlbWVudF9pZCI6InRvcG9uX2FuZHJvaWRfdGVzdF8wMSIsImltcHJlc3Npb25faWQiOiI4ZGNhOThiYmVhYTM0YWM1OWZhNThiNDZhOTBlNmI0YSJ9.utusJmxc2IJ-6VRVHl4HaUZfnf6bIv-OEVCDIBlSV8M"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // iss
  test("ErrorToken:IssError", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyAdToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS54LmNvbSIsImF1ZCI6Inhjb20iLCJzdWIiOiI5MTIzMTIyMjEzMTIxMDAwMSIsImlhdCI6MTcwMzY2Njg0MCwiZXhwIjo0MTAzNjY3MTQwLCJzY29wZSI6ImFkcyIsInBsYWNlbWVudF9pZCI6InRvcG9uX2FuZHJvaWRfdGVzdF8wMSIsImltcHJlc3Npb25faWQiOiI4ZGNhOThiYmVhYTM0YWM1OWZhNThiNDZhOTBlNmI0YSJ9.4Oi51LzwdIp234-1aSBZOUX3f2h56M5gXIZeibYm0YY"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // 时间过期
  test("ErrorToken:ExpTimeout", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyAdToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FwaS5zZWF5b28uY29tIiwiYXVkIjoieGNvbSIsInN1YiI6IjkxMjMxMjIyMTMxMjEwMDAxIiwiaWF0IjoxMDAzNjY2ODQwLCJleHAiOjExMDM2NjcxNDAsInNjb3BlIjoiYWRzIiwicGxhY2VtZW50X2lkIjoidG9wb25fYW5kcm9pZF90ZXN0XzAxIiwiaW1wcmVzc2lvbl9pZCI6IjhkY2E5OGJiZWFhMzRhYzU5ZmE1OGI0NmE5MGU2YjRhIn0.VFKW6NPRCvTv4ZJwncbd9afan3-1GTP0EKjqhlj4l5w"
    )
    expect(info).toBeInstanceOf(Error)
  })

  // 空
  test("ErrorToken:EmptyToken", () => {
    const verifier = new TokenVerifier(baseConfig)
    const info = verifier.verifyAdToken("")
    expect(info).toBeInstanceOf(Error)
  })
})
