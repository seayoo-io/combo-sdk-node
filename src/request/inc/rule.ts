import { isJsonLike, parseJSON, isStringRecord } from "../../utils"
import type { IResponseResult, IResponseRule } from "./type"

type ResponseInfo = Pick<IResponseResult, "ok" | "code" | "data" | "message">

const defaultDataField = "data"
const defaultMessageField = "message"

/**
 * 分析响应内容中的错误信息和数据
 */
export function analyseResponse(
  status: number,
  statusText: string,
  responseText: string,
  globalRule: IResponseRule,
  rule?: IResponseRule
): ResponseInfo {
  const responseRule = rule || globalRule
  return statusOK(status)
    ? getResponseOKInfo(responseRule.ok || globalRule.ok, status, statusText, responseText)
    : getReponseFailedInfo(responseRule.failed || globalRule.failed, statusText, responseText)
}

/**
 * 将 Response Rules 转化成为自然描述语言
 */
export const getResponseRulesDescription = function (rules: IResponseRule) {
  const result = []
  ///////////////////////////
  const failedRule = rules.failed || { resolve: "json" }
  result.push("- 当http状态码 <200 或者 >=400 时")
  switch (failedRule.resolve) {
    case "body":
      result.push("  将响应内容格式化为字符串并作为错误消息")
      break
    case "json":
      result.push("  将响应解析为json，并读取 " + (failedRule.messageField || defaultMessageField) + " 作为错误消息")
      break
  }
  const okRule = rules.ok || { resolve: "body" }
  result.push("- 当http状态码 >=200 并且 <400 时")
  switch (okRule.resolve) {
    case "body":
      result.push("  将响应尝试解析为 json，并作为数据内容返回")
      break
    case "json":
      result.push(
        "  将响应解析为 json，读取 " +
          (okRule.dataField || defaultDataField) +
          " 作为响应数据，读取 " +
          (okRule.messageField || defaultMessageField) +
          " 作为提示消息"
      )
      if (okRule.statusField) {
        result.push("  当 " + okRule.statusField + " 为 " + (okRule.statusOKValue || "空值") + " 时是成功提示，否则是错误消息")
      }
      if (okRule.ignoreMessage) {
        result.push("  并忽略以下消息：" + okRule.ignoreMessage)
      }
      break
  }
  return result.join("\n")
}

function getReponseFailedInfo(rule: IResponseRule["failed"], statusText: string, responseText: string): ResponseInfo {
  const r = rule || { resolve: "json", messageField: defaultMessageField }
  const result: ResponseInfo = {
    ok: false,
    code: statusText,
    message: responseText,
    data: null,
  }
  switch (r.resolve) {
    case "body":
      result.message = formatPresetBody(responseText) || responseText
      break
    case "json":
      const { code, message } = formatJsonBody(responseText, r.statusField, r.messageField)
      result.code = code || statusText
      result.message = formatPresetBody(responseText) || message
      break
  }
  return result
}

function formatJsonBody(
  body: string,
  statusField?: string,
  msgField: string | string[] = defaultMessageField
): { message: string; code?: string } {
  if (!isJsonLike(body)) {
    return { message: "" }
  }
  const json = parseJSON(body)
  if (!json || !isStringRecord(json)) {
    return { message: body }
  }
  return {
    code: statusField ? readMessageFrom(json, statusField) : "",
    message: readMessageFrom(json, msgField) || body,
  }
}

function readMessageFrom(json: Record<string, unknown>, field: string | string[]): string {
  const fields = Array.isArray(field) ? field : [field]
  for (const field of fields) {
    if (field in json) {
      return convert2str(json[field])
    }
  }
  return ""
}

function convert2str(data: unknown): string {
  if (!data) {
    return ""
  }
  if (typeof data === "string") {
    return data
  }
  return JSON.stringify(data)
}

const htmlReg = /<title>([^<]+)<\/title>/i
const xmlReg = /<message>([^<]+)<\/message>/i
function formatPresetBody(str: string): string {
  const htmlMatch = str.match(htmlReg)
  if (htmlMatch) {
    return htmlMatch[1]
  }
  const xmlMatch = str.match(xmlReg)
  if (xmlMatch) {
    return xmlMatch[1]
  }
  return ""
}

function getResponseOKInfo(rule: IResponseRule["ok"], status: number, statusText: string, responseText: string): ResponseInfo {
  const r = rule || { resolve: "body" }
  const result: ResponseInfo = {
    ok: true,
    code: statusText,
    message: "",
    data: null,
  }
  // https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status#%E6%88%90%E5%8A%9F%E5%93%8D%E5%BA%94
  if (status === 202 || status === 204 || !responseText) {
    return result
  }
  // 解析策略为 body 则直接将 body 当作响应数据
  if (r.resolve === "body") {
    result.data = isJsonLike(responseText) ? parseJSON(responseText) : responseText
    return result
  }
  // 否则解析策略为 json，从 object json 中查找数据和消息
  const response = parseJSON(responseText)
  if (!response || !isStringRecord(response)) {
    result.ok = false
    result.code = "ResponseFormatError"
    result.message = "响应内容无法格式化为 Object"
    return result
  }

  const statusField = r.statusField
  const statusOKValue = r.statusOKValue || ""
  const dataField = r.dataField || defaultDataField
  const messageField = r.messageField || defaultMessageField
  const ignoreMessage = r.ignoreMessage || ""
  if (statusField && !(statusField in response)) {
    result.ok = false
    result.code = "ResponseFieldMissing"
    result.message = "响应内容找不到状态字段 " + statusField
    return result
  }

  const code = statusField ? response[statusField] + "" : ""
  result.ok = statusField ? code === statusOKValue : true
  result.code = code || statusText
  result.data = dataField in response ? response[dataField] : null
  result.message = readMessageFrom(response, messageField)

  if (ignoreMessage && result.message) {
    if (
      (Array.isArray(ignoreMessage) && ignoreMessage.includes(result.message)) ||
      (typeof ignoreMessage === "string" && result.message === ignoreMessage)
    ) {
      result.message = ""
    }
  }
  return result
}

export function statusOK(status: number): boolean {
  return status >= 200 && status < 400
}
