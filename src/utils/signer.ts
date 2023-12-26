import { createHash, createHmac } from "crypto"
import type { IncomingHttpHeaders } from "node:http"
import type { IRequestOptions } from "../request"

export const AuthorizationField = "Authorization"
const SigningAlgorithm = "SEAYOO-HMAC-SHA256"
const EmptyStringSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
const MaxTimeDiff = 5 * 60 * 1000
const authHeaderReg = new RegExp(`^${SigningAlgorithm}\\s{1,}Game\\s*=([^,]+),\\s*Timestamp\\s*=([^,]+),\\s*Signature\\s*=(.+)$`)
const timestampReg = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/

/**
 * 获取请求签名值
 */
export function calcAuthorizationHeader({
  game,
  secret,
  endpoint,
  method,
  url,
  data,
  timestamp,
}: {
  game: string
  secret: string
  endpoint: string
  method: string
  url: string
  data: IRequestOptions["body"]
  timestamp?: string
}) {
  const payloadHash = !data ? EmptyStringSha256 : sha256(JSON.stringify(data))
  const ts = timestamp || getTimestamp()
  const fullURL = url.startsWith("http") ? new URL(url) : new URL(url, endpoint)
  const uri = fullURL.hostname + fullURL.search
  const signature = hmacSha256(secret, [SigningAlgorithm, method.toUpperCase(), uri, ts, payloadHash].join("\n"))
  return `${SigningAlgorithm} Game=${game},Timestamp=${ts},Signature=${signature}`
}

/**
 * 检查 http auth 信息是否正确
 */
export function checkHttpAuthInfo(
  game: string,
  secret: string,
  endpoint: string,
  url: string,
  headers: IncomingHttpHeaders,
  body: string
): boolean {
  const info = parseAuthorizationHeader(`${headers[AuthorizationField]}`)
  if (!info || !info.game || !info.signature || !info.timestamp) {
    return false
  }
  const ts = parseTimestamp(info.timestamp)
  const now = Date.now()
  if (!ts || ts < now - MaxTimeDiff || ts > now + MaxTimeDiff) {
    return false
  }
  return info.signature === calcAuthorizationHeader({ game, url, secret, endpoint, data: body, method: "POST", timestamp: info.timestamp })
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

function parseAuthorizationHeader(authHeader: string) {
  const info = authHeader.match(authHeaderReg)
  if (!info) {
    return null
  }
  return {
    game: info[1].trim(),
    timestamp: info[2].trim(),
    signature: info[3].trim(),
  }
}

function sha256(data: string | NodeJS.ArrayBufferView) {
  return createHash("sha256").update(data).digest("hex").toLowerCase()
}

function hmacSha256(secret: string, data: string) {
  return createHmac("sha256", secret).update(data).digest("hex").toLowerCase()
}
