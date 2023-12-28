import type { IBaseRequestOptions, IBaseRequestBody } from "./type"
import type { RequestGlobalConfig } from "./config"

type FixedRequestOptions = Omit<Required<IBaseRequestOptions>, "params" | "body"> & {
  url: string
  params: Record<string, string>
  body: ReturnType<typeof convertBody>
}

export async function convertOptions(
  url: string,
  config: RequestGlobalConfig,
  options?: IBaseRequestOptions
): Promise<FixedRequestOptions> {
  const opt = Object.assign({ method: "GET" }, options)
  const isFormMode = opt.body instanceof FormData
  const method = isFormMode ? "POST" : opt.method
  if (method === "GET" || method === "HEAD" || method === "DELETE") {
    if (opt.body !== undefined) {
      console.warn("request body is invalid with method get, head, delete")
      delete opt.body
    }
  }
  const headers = Object.assign(
    isFormMode
      ? {}
      : {
          "Content-Type": "application/json;charset=utf-8",
        },
    opt.headers
  )
  const p = opt.params || {}
  const params: Record<string, string> = {}
  Object.keys(p).forEach((key) => {
    if (p[key] !== undefined) {
      params[key] = convertParam(p[key])
    }
  })
  const fullUrl = config.getFullUrl(url)
  const body = convertBody(opt.body)
  const timeout = opt.timeout || config.get("timeout")
  // 全局请求干预函数，可以修改 headers 和 params 并返回新的 url 地址
  const newURL = await config.get("requestTransformer")?.({ headers, params, method, url: fullUrl, body })
  const finalUrl = typeof newURL === "string" && newURL ? newURL : fullUrl
  // 打印日志
  config.get("logHandler")?.({ type: "ready", url: finalUrl, method, headers, timeout, body })
  // 返回
  return { url: finalUrl, method, body, params, headers, timeout }
}

/** 将数据转成 string 格式表示，仅仅特殊处理 array 为 item,item... */
function convertParam(val: unknown): string {
  if (typeof val === "string") {
    return val
  }
  if (Array.isArray(val)) {
    return val.join(",")
  }
  return val + ""
}

function convertBody(body: IBaseRequestOptions["body"]): IBaseRequestBody | undefined {
  if (!body) {
    return
  }
  if (
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    typeof body === "string"
  ) {
    return body
  }
  return JSON.stringify(body)
}
