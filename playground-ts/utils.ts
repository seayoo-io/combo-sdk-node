import type { IncomingMessage, ServerResponse } from "node:http"

export async function readBody(req: IncomingMessage): Promise<string> {
  const body: Buffer[] = []
  return new Promise((resolve, reject) => {
    req.on("error", reject)
    req.on("data", (chunk) => body.push(chunk))
    req.on("end", () => resolve(Buffer.concat(body).toString("utf-8")))
  })
}

export async function done(res: ServerResponse, statusCode: number, message?: string) {
  res.statusCode = statusCode
  if (statusCode !== 204) {
    res.write(message || "")
  }
  res.end()
}

/**
 * 暂停一段时间
 * @param {number} ms 暂停的毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 检查是否为 object（非 null / array）
 */
export function isObject(data: unknown): data is object {
  return data !== null && typeof data === "object" && !Array.isArray(data)
}

/**
 * JSON.parse的扩展，格式化错误则返回 null，第二个参数为可选 typeGuard
 */
export function parseJSON(str: string): unknown
export function parseJSON<T>(str: string, typeGuard: (data: unknown) => data is T): T | null
export function parseJSON<T>(str: string, typeGuard?: (data: unknown) => data is T): unknown | T | null {
  try {
    const data = JSON.parse(str)
    if (typeGuard) {
      return typeGuard(data) ? data : null
    }
    return data
  } catch (e) {
    return null
  }
}
