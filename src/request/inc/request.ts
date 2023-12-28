import * as http from "node:http"
import * as https from "node:https"
import { isFullURL } from "../../utils"
import { retryRequest } from "./retry"
import { handleResponse } from "./response"
import { convertOptions } from "./option"
import type { NetRequestAgent, NetRequestCoreFn } from "./type"

/**
 * 基于 nodejs 的 http/https 包的网络请求包装函数，url 必须是一个完整 url
 *
 * 该方法必定 resolve，限制在 nodejs 环境中使用
 */
export const nodeRequest: NetRequestAgent = async function (url, config, options) {
  return handleResponse(await retryRequest(coreNodeRequest, url, config, options), url, config, options)
}

const coreNodeRequest: NetRequestCoreFn = async function (url, config, options) {
  const opt = await convertOptions(url, config, options)
  if (!isFullURL(opt.url)) {
    return {
      url: opt.url,
      method: opt.method,
      status: -2,
      statusText: "URLFormatError",
      headers: {},
      body: "",
    }
  }
  const client = /^https:\/\//i.test(opt.url) ? https : http
  const iURL = new URL(opt.url)
  const params = opt.params
  if (params instanceof Object) {
    Object.keys(params).forEach((key) => iURL.searchParams.set(key, params[key]))
  }
  const isHeadRequest = opt.method === "HEAD"
  return new Promise((resolve) => {
    const req = client.request(
      iURL,
      {
        headers: opt.headers,
        method: opt.method,
        timeout: opt.timeout > 0 ? opt.timeout : undefined,
      },
      function (res) {
        const resbody: Buffer[] = []
        res.on("data", (chunk: Buffer) => resbody.push(chunk))
        res.on("end", () => {
          const headers = Object.fromEntries(
            Object.entries(res.headers).map(([key, value]) => {
              return [key.toLowerCase(), Array.isArray(value) ? value.join(",") : value]
            })
          )
          resolve({
            url: iURL.toString(),
            method: opt.method,
            status: res.statusCode || -3,
            statusText: res.statusMessage || "Unknown",
            headers,
            body: isHeadRequest ? "" : Buffer.concat(resbody).toString("utf-8"),
          })
        })
      }
    )
    req.on("error", (e: Error) => {
      resolve({
        url: iURL.toString(),
        method: opt.method,
        status: -1,
        statusText: e.name || "Unknown",
        body: e.message,
      })
    })
    req.on("timeout", () => {
      resolve({
        url: iURL.toString(),
        method: opt.method,
        status: -1,
        statusText: "Timeout",
        body: "",
      })
    })
    if (opt.body) {
      req.write(opt.body)
    }
    req.end()
  })
}
