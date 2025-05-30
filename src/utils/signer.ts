import { createHash, createHmac, type BinaryLike } from "crypto"
import { IBaseRequestBody } from "../request"
import { fromEntries, isFullURL } from "./base"

export const AuthorizationField = "Authorization"
const MaxTimeDiff = 5 * 60 * 1000
const timestampReg = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/

interface SignDataOption {
  game: string
  secret: string
  endpoint: string
  method: string
  url: string
  data: IBaseRequestBody
  timestamp?: string
}
type SignDataOptionForVerify = Omit<SignDataOption, "game" | "timestamp"> & { game?: string }

// 签名方法定义，给未来扩展新签名方法留出空间
const SigningDefinitions = {
  HS256: {
    prefix: "SEAYOO-HMAC-SHA256",
    sign({ game, secret, method, url, data, timestamp }, onlySignature = false) {
      if (timestamp && !timestampReg.test(timestamp)) {
        return "ErrorTimestamp"
      }
      const payloadHash = sha256(convertBodyData(data || ""))
      const ts = timestamp || getTimestamp()
      const fullURL = isFullURL(url) ? new URL(url) : new URL(url, "http://x.com")
      const uri = fullURL.pathname + fullURL.search
      const signature = hS256(secret, [this.prefix, method.toUpperCase(), uri, ts, payloadHash].join("\n"))
      return onlySignature ? signature : `${this.prefix} Game=${game},Timestamp=${ts},Signature=${signature}`
    },
    verify(authString, option): boolean {
      const info = parseRawAuthHeader(authString, this.prefix)
      if (!info) {
        return false
      }
      const game = "Game" in info ? info.Game : null
      const timestamp = "Timestamp" in info ? info.Timestamp : null
      const signature = "Signature" in info ? info.Signature : null
      if (!game || !signature || !timestamp || (option.game && option.game !== game)) {
        return false
      }
      const ts = parseTimestamp(timestamp)
      // 时间戳精度只到秒，需要忽略毫秒值
      const now = Math.floor(Date.now() / 1000) * 1000
      if (!ts || ts < now - MaxTimeDiff || ts > now + MaxTimeDiff) {
        return false
      }
      return signature === this.sign({ ...option, game, timestamp }, true)
    },
  },
} as const satisfies Record<
  string,
  {
    prefix: string
    sign: (option: SignDataOption, onlySignature: boolean) => string
    verify: (authString: string, option: SignDataOptionForVerify) => boolean
  }
>

/**
 * 格式化 AuthorizationHeader
 */
export function parseAuthorizationHeader(authString: string, version: keyof typeof SigningDefinitions = "HS256") {
  if (!version || !SigningDefinitions[version]) {
    console.error({
      type: "parseAuthorizationHeader Error",
      message: `invalid version ${version}, support ${Object.keys(SigningDefinitions).join(", ")}`,
    })
    return null
  }
  return parseRawAuthHeader(authString, SigningDefinitions[version].prefix)
}

/**
 * 获取请求签名值，默认签名方法是 HS256
 */
export function calcAuthorizationHeader(option: SignDataOption, onlySignature = false, version: keyof typeof SigningDefinitions = "HS256") {
  if (!version || !SigningDefinitions[version]) {
    console.error({
      type: "calcAuthorizationHeader Error",
      message: `invalid version ${version}, support ${Object.keys(SigningDefinitions).join(", ")}`,
    })
    return "ErrorSigningVersion"
  }
  return SigningDefinitions[version].sign(option, onlySignature)
}

/**
 * 检查 http auth 信息是否正确
 */
export function checkHttpAuthInfo(authString: string, option: SignDataOptionForVerify): boolean {
  if (!authString) {
    return false
  }
  const configs = Object.values(SigningDefinitions)
  for (const cfg of configs) {
    if (authString.startsWith(cfg.prefix + " ")) {
      return cfg.verify(authString, option)
    }
  }
  return false
}

function getTimestamp() {
  const d = new Date()
  return d
    .toISOString()
    .replace(/\.\d+Z$/, "Z")
    .replace(/[-:]/g, "")
}

function parseTimestamp(ts: string) {
  const info = ts.match(timestampReg)
  if (!info) {
    return null
  }
  return Date.UTC(+info[1], +info[2] - 1, +info[3], +info[4], +info[5], +info[6])
}

function sha256(data: BinaryLike) {
  return createHash("sha256").update(data).digest("hex").toLowerCase()
}

function hS256(secret: string, data: BinaryLike) {
  return createHmac("sha256", secret).update(data).digest("hex").toLowerCase()
}

function convertBodyData(body: IBaseRequestBody): string {
  if (typeof body === "string") {
    return body
  }
  return JSON.stringify(body)
}

function parseRawAuthHeader(authString: string, prefix: string): Record<string, string | undefined> | null {
  if (!authString || !authString.startsWith(prefix + " ")) {
    return null
  }
  return fromEntries(
    authString
      .substring(prefix.length + 1)
      .split(",")
      .map<[string, string] | null>((kvs) => {
        const kv = kvs.split("=")
        if (kv.length !== 2) {
          return null
        }
        const key = kv[0].trim()
        const value = getValue(kv[1])
        if (!key || !value) {
          return null
        }
        return [key, value]
      })
      .filter<[string, string]>((v): v is [string, string] => v !== null)
  )
}
function getValue(value: string) {
  const v = value.trim()
  return /^".+"$/.test(v) ? v.replace(/^"|"$/g, "") : v
}
