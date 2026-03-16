import { createHash, createDecipheriv } from "crypto"

// spell-checker:ignore AESGCM Ciphertext

type SecretKey = string | Buffer

/**
 * decryptAESGCM 使用 AES-256-GCM 解密 base64 编码的密文。
 * 密文格式为 base64(nonce || ciphertext || authTag)，其中 nonce 为 12 字节，authTag 为 16 字节。
 */
export function decryptAESGCM(sk: SecretKey, encoded: string): string {
  let data: Buffer
  try {
    data = Buffer.from(encoded, "base64")
  } catch (err) {
    throw new Error(`base64 decode error: ${err}`)
  }

  const key = deriveAESKey(sk)
  const nonceSize = 12
  const authTagSize = 16

  if (data.length < nonceSize + authTagSize) {
    throw new Error("ciphertext too short")
  }

  const nonce = data.slice(0, nonceSize)
  // 密文格式: nonce (12) || ciphertext (variable) || authTag (16)
  const authTag = data.slice(data.length - authTagSize)
  const ciphertext = data.slice(nonceSize, data.length - authTagSize)

  const decipher = createDecipheriv("aes-256-gcm", key, nonce)
  decipher.setAuthTag(authTag)

  // Node.js 12 兼容：使用 update 处理所有数据，避免 final() 的问题
  let plaintext: Buffer
  try {
    plaintext = decipher.update(ciphertext)
    // Node.js 12 中 GCM 模式下 final() 通常返回空 Buffer，但会验证 authTag
    const finalBuffer = decipher.final()
    if (finalBuffer.length > 0) {
      plaintext = Buffer.concat([plaintext as Uint8Array, finalBuffer as Uint8Array])
    }
  } catch (err) {
    throw new Error(`gcm decrypt error: ${err}`)
  }

  return plaintext.toString("utf8")
}

function deriveAESKey(sk: SecretKey): Buffer {
  return createHash("sha256").update(sk).digest()
}
