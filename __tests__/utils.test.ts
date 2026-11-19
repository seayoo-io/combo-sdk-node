import { genSessionID, mayBeComboId } from "../src"
import { decryptAESGCM } from "../src/utils/gcm"
import { describe, expect, test } from "vitest"
import { createCipheriv, randomBytes, createHash } from "crypto"

// spell-checker:ignore AESGCM ciphertext uids

describe("CreateInstance", () => {
  test("genSessionID", () => {
    const sessionID = genSessionID("")
    expect(sessionID).toBeTypeOf("string")
    expect(sessionID.length).toBe(32)
  })

  test("genSessionID Repeat", () => {
    const ids: string[] = []
    const N = 10000
    for (let i = 0; i < N; i++) {
      ids.push(genSessionID(""))
    }
    const uids = Array.from(new Set(ids))
    expect(uids.length).toBe(N)
  })
})

describe("mayBeComboId", () => {
  test("接受正式环境（16 位）的 comboId", () => {
    expect(mayBeComboId("1260418509000005")).toBe(true)
    expect(mayBeComboId("5231223346130001")).toBe(true)
  })

  test("接受测试环境（9 前缀，17 位）的 comboId", () => {
    expect(mayBeComboId("91260418509000005")).toBe(true)
    expect(mayBeComboId("95231223346130001")).toBe(true)
  })

  test("接受 2021 年及以后的合法年份", () => {
    expect(mayBeComboId("1210101123450001")).toBe(true) // 2021-01-01
    expect(mayBeComboId("1291231123450001")).toBe(true) // 2099-12-31
  })

  test("拒绝 2020 年及以前", () => {
    expect(mayBeComboId("1001011123450001")).toBe(false) // 2000-01-01
    expect(mayBeComboId("1201231123450001")).toBe(false) // 2020-01-23
  })

  test("接受闰年 2 月 29 日", () => {
    expect(mayBeComboId("1240229123450001")).toBe(true)
  })

  test("检查通过时收窄为 string", () => {
    const value: unknown = "1260418509000005"
    if (mayBeComboId(value)) {
      expect(value.length).toBe(16)
    } else {
      throw new Error("mayBeComboId 应当通过并收窄类型")
    }
  })

  test("拒绝非字符串", () => {
    expect(mayBeComboId(undefined)).toBe(false)
    expect(mayBeComboId(null)).toBe(false)
    expect(mayBeComboId(1260418509000005)).toBe(false)
    expect(mayBeComboId(true)).toBe(false)
    expect(mayBeComboId({})).toBe(false)
    expect(mayBeComboId([])).toBe(false)
  })

  test("拒绝长度或前缀不正确的字符串", () => {
    expect(mayBeComboId("")).toBe(false)
    // 1 开头的正式 comboId 应为 16 位
    expect(mayBeComboId("126041850900000")).toBe(false)
    expect(mayBeComboId("12604185090000055")).toBe(false)
    // 只支持 1 / 5 开头，以及其前的 9 非生产环境前缀
    expect(mayBeComboId("0260418509000005")).toBe(false)
    expect(mayBeComboId("2260418509000005")).toBe(false)
    expect(mayBeComboId("9926041850900005")).toBe(false)
    expect(mayBeComboId("93260418509000005")).toBe(false)
    expect(mayBeComboId("912604185090000005")).toBe(false)
  })

  test("拒绝含非数字字符的字符串", () => {
    expect(mayBeComboId("126041850900000a")).toBe(false)
    expect(mayBeComboId("12604185 9000005")).toBe(false)
    expect(mayBeComboId(" 1260418509000005")).toBe(false)
    expect(mayBeComboId("1260418509000005\n")).toBe(false)
  })

  test("拒绝注册日期不合理的 comboId", () => {
    // 月份 / 日期越界
    expect(mayBeComboId("1260011123450001")).toBe(false)
    expect(mayBeComboId("1261311123450001")).toBe(false)
    expect(mayBeComboId("1261000123450001")).toBe(false)
    // 该月不存在的日期
    expect(mayBeComboId("1262311123450001")).toBe(false)
    expect(mayBeComboId("1260431123450001")).toBe(false)
    expect(mayBeComboId("1250229123450001")).toBe(false)
  })

  test("拒绝当天秒数越界的 comboId", () => {
    expect(mayBeComboId("1260418863990001")).toBe(true)
    expect(mayBeComboId("1260418864000001")).toBe(false)
    expect(mayBeComboId("1260418999990001")).toBe(false)
  })

  test("拒绝序列号为 0 的 comboId", () => {
    expect(mayBeComboId("1260418509000001")).toBe(true)
    expect(mayBeComboId("1260418509000000")).toBe(false)
  })
})

describe("gcm utils", () => {
  const encodeAESGCM = (sk: string, plain: string): string => {
    const iv = randomBytes(12)
    const key = createHash("sha256").update(sk).digest()
    const cipher = createCipheriv("aes-256-gcm", key, iv)
    const ciphertext = Buffer.concat([cipher.update(plain, "utf8") as Uint8Array, cipher.final() as Uint8Array])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv as Uint8Array, ciphertext as Uint8Array, authTag as Uint8Array]).toString("base64")
  }

  test("base decode", () => {
    const encoded = decryptAESGCM("sk_secret", "u4PaFsxKN2GJV+WBVzJDr6CNUv07ZH4DhAxEZ4zZq16nhuQoRb7vMjen")
    expect(encoded).toBe("testSessionKey")
  })

  test("decryptAESGCM should decrypt valid ciphertext", () => {
    const sk = "test-secret-key"
    const plain = "hello from gcm test"
    const encoded = encodeAESGCM(sk, plain)
    expect(decryptAESGCM(sk, encoded)).toBe(plain)
  })

  test("decryptAESGCM should throw on wrong auth tag", () => {
    const sk = "test-secret-key"
    const plain = "hello from gcm test"
    const encoded = encodeAESGCM(sk, plain)
    const raw = Buffer.from(encoded, "base64")
    raw[raw.length - 1] = raw[raw.length - 1] ^ 0xff
    const tampered = raw.toString("base64")

    expect(() => decryptAESGCM(sk, tampered)).toThrow()
  })

  test("decryptAESGCM should throw on too short data", () => {
    expect(() => decryptAESGCM("test-secret-key", Buffer.from("abc").toString("base64"))).toThrow()
  })
})
