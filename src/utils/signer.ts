import { createHash, createHmac } from "crypto"
import type { IRequestOptions } from "../request"

export const AuthorizationField = "Authorization"
const MaxTimeDiff = 5 * 60 * 1000
const EmptyStringSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

interface SignDataOption {
  game: string
  secret: string
  endpoint: string
  method: string
  url: string
  data: IRequestOptions["body"]
  timestamp?: string
}

// 签名方法定义，给未来扩展新签名方法留出空间
const SigningDefinitions = {
  HS256: {
    prefix: "SEAYOO-HMAC-SHA256",
    sign({ game, secret, endpoint, method, url, data, timestamp }) {
      const payloadHash = !data ? EmptyStringSha256 : sha256(JSON.stringify(data))
      const ts = timestamp || getTimestamp()
      const fullURL = url.startsWith("http") ? new URL(url) : new URL(url, endpoint)
      const uri = fullURL.pathname + fullURL.search
      const signature = hS256(secret, [this.prefix, method.toUpperCase(), uri, ts, payloadHash].join("\n"))
      return `${this.prefix} Game=${game},Timestamp=${ts},Signature=${signature}`
    },
    verify(authHeader, option): boolean {
      const info = parseAuthHeader(authHeader, this.prefix)
      if (!info) {
        return false
      }
      const game = "Game" in info ? info.Game : null
      const timestamp = "Timestamp" in info ? info.Timestamp : null
      const signature = "Signature" in info ? info.Signature : null
      if (!game || !signature || !timestamp || option.game !== game) {
        return false
      }
      const ts = parseTimestamp(info.timestamp)
      const now = Date.now()
      if (!ts || ts < now - MaxTimeDiff || ts > now + MaxTimeDiff) {
        return false
      }
      return info.signature === this.sign({ ...option, timestamp })
    },
  },
} as const satisfies Record<
  string,
  {
    prefix: string
    sign: (option: SignDataOption) => string
    verify: (authHeader: string, option: SignDataOption) => boolean
  }
>

const timestampReg = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/

/**
 * 获取请求签名值，默认签名方法是 HS256
 */
export function calcAuthorizationHeader(option: SignDataOption, version: keyof typeof SigningDefinitions = "HS256") {
  if (!version || !SigningDefinitions[version]) {
    return "ErrorSigningVersion"
  }
  return SigningDefinitions[version].sign(option)
}

/**
 * 检查 http auth 信息是否正确
 */
export function checkHttpAuthInfo(authHeader: string, option: SignDataOption): boolean {
  if (!authHeader) {
    return false
  }
  const cfgs = Object.values(SigningDefinitions)
  for (const cfg of cfgs) {
    if (authHeader.startsWith(cfg.prefix + " ")) {
      return cfg.verify(authHeader, option)
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

function sha256(data: string | NodeJS.ArrayBufferView) {
  return createHash("sha256").update(data).digest("hex").toLowerCase()
}

function hS256(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("hex").toLowerCase()
}

function parseAuthHeader(authHeader: string, prefix: string): Record<string, string> | null {
  if (!authHeader || !authHeader.startsWith(prefix + " ")) {
    return null
  }
  return Object.fromEntries(
    authHeader
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
  return /^".+"$/.test(v) ? value.replace(/^"|"$/g, "") : v
}
