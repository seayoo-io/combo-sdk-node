import { genSessionID } from "../src"
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
