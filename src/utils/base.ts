const urlReg = /^(?:https?:)?\/\/.+/i
const urlReg2 = /^https?:\/\//i
const objReg = /^\{[\d\D]*\}$/
const arrReg = /^\[[\d\D]*\]$/

/**
 * 暂停一段时间
 * @param {number} ms 暂停的毫秒数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 空函数，异步空函数为 asyncNoop
 */
export function noop() {}

type EmptyValue = null | undefined

/**
 * 检查是否为空值 null / undefined
 */
export function isEmpty(data: unknown): data is EmptyValue {
  return data === null || data === undefined
}

/**
 * 检查是否为 object（非 null / array）
 */
export function isObject(data: unknown): data is object {
  return data !== null && typeof data === "object" && !Array.isArray(data)
}

/**
 * 检测是否为 String Record
 */
export function isStringRecord(data: unknown): data is Record<string, unknown> {
  return isObject(data) && Object.keys(data).every((key) => typeof key === "string")
}

/**
 * 检查一个url地址是否以 http/https 开头，如果第二个参数传递 true，则自适应协议（//....）也被认为是完整 url
 */
export function isFullURL(url: string, ignoreProtocal: boolean = false) {
  return ignoreProtocal ? urlReg.test(url) : urlReg2.test(url)
}

/**
 * 检测文本是否有可能转化为 object 或 array，注意，检测通过也未必能被正确格式化为 json
 */
export function isJsonLike(text: string) {
  return objReg.test(text) || arrReg.test(text)
}

/**
 * 基于 baseURL 计算完整的 url 信息，仅可在浏览器环境使用
 * @param url 要转化的 url，如果以 https: 或 http: 开头则直接返回
 * @param baseURL 可选 baseURL
 */
export function getFullURL(url: string, baseURL: string = "") {
  if (!baseURL || isFullURL(url, true)) {
    return fillUrl(url)
  }
  return (fillUrl(baseURL) + "/" + url).replace(/(?<!:)\/{2,}/g, "/")
}

/**
 * 给 url 添加完整域名和协议，仅可在浏览器环境使用
 * @param url 要检查的 url，如果是自适应协议 //... 则会添加当前页面的协议信息，否则添加域名和协议信息
 */
function fillUrl(url: string): string {
  if (isFullURL(url, true)) {
    if (url.startsWith("http")) {
      return url
    }
    return ("location" in globalThis ? location.protocol : "https:") + url
  }
  return ("location" in globalThis ? location.origin + "/" : "http://127.0.0.1/") + url.replace(/^\/+/, "")
}

/**
 * 简版 Object.fromEntries
 */
export function fromEntries(kv: [string, string | undefined][]): Record<string, string> {
  return kv.reduce(
    (result, [key, value]) => {
      if (key) {
        result[key] = value || ""
      }
      return result
    },
    {} as Record<string, string>
  )
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
