import {
  verifyConfigWithoutEndpoint,
  AuthorizationField,
  checkHttpAuthInfo,
  isObject,
  parseJSON,
  readBody,
  repsonseJson,
  responseError,
  type SDKBaseConfig,
} from "../utils"
import { GMError, HttpStatus } from "../const"
import type { IncomingMessage, ServerResponse } from "http"
import type { GMCommandHandler, GMErrorResponse } from "./types"
import type { ParameterizedContext, Next } from "koa"
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from "express"

interface GMRequestBody {
  /** version 是世游 GM 服务的版本号，目前固定 2.0 */
  version: string
  /** 本次 GM 请求的唯一 ID。游戏侧可用此值来对请求进行去重 */
  request_id: string
  /** 本次 GM 请求的 Idempotency Key。如果有非空值则应当执行幂等处理逻辑。 */
  idempotency_key?: string
  /** GM 命令标识。取值和 GM 协议文件中的 rpc 名称对应，大小写敏感 */
  command: string
  /** args 是和 cmd 对应的命令参数，具体值取决于协议中对应 rpc 的 Request 定义 */
  args: Record<string, unknown>
}

function isGMRequestBody(data: unknown): data is GMRequestBody {
  return (
    isObject(data) &&
    "version" in data &&
    "request_id" in data &&
    "command" in data &&
    "args" in data &&
    ("idempotency_key" in data ? typeof data.idempotency_key === "string" : true) &&
    typeof data.request_id === "string" &&
    typeof data.command === "string" &&
    typeof data.args === "object" &&
    data.args !== null
  )
}

function isGMErrorResponse(data: unknown): data is GMErrorResponse {
  return isObject(data) && Object.keys(data).length === 2 && "error" in data && "message" in data
}

const error2httpStatus: Record<GMError, HttpStatus> = {
  [GMError.InvalidHttpMethod]: HttpStatus.MethodNotAllowed,
  [GMError.InvalidContentType]: HttpStatus.UnsupportedMediaType,
  [GMError.InvalidSignature]: HttpStatus.Unauthorized,
  [GMError.InvalidRequest]: HttpStatus.BadRequest,
  [GMError.InvalidCommand]: HttpStatus.BadRequest,
  [GMError.InvalidArgs]: HttpStatus.BadRequest,
  [GMError.NetworkError]: HttpStatus.InternalServerError,
  [GMError.DatabaseError]: HttpStatus.InternalServerError,
  [GMError.IdempotencyConflict]: HttpStatus.Conflict,
  [GMError.IdempotencyMismatch]: HttpStatus.UnprocessableEntity,
  [GMError.TimeoutError]: HttpStatus.InternalServerError,
  [GMError.MaintenanceError]: HttpStatus.ServiceUnavailable,
  [GMError.ThrottlingError]: HttpStatus.TooManyRequests,
  [GMError.InternalError]: HttpStatus.InternalServerError,
}

type SDKMinConfig = Omit<SDKBaseConfig, "endpoint">

/**
 * 获取一个处理函数用于响应 Seayoo Server 推送过来的 GM 执行通知
 *
 * 另有 express 和 koa2 版本的处理函数可以使用。
 *
 * 由于签名需要原始请求的内容，如果 request 在函数执行之前已经被读取，则需要手工传入请求的 rawBody 字符串以核验签名
 */
export function getGMCommandHandler(config: SDKMinConfig, handler: GMCommandHandler) {
  verifyConfigWithoutEndpoint(config)
  return async function (req: IncomingMessage, res: ServerResponse, rawBodyString?: string) {
    if (req.method !== "POST") {
      responseError(res, HttpStatus.MethodNotAllowed, GMError.InvalidHttpMethod, `Expecting POST, got ${req.method}`)
      return
    }
    const contentType = `${req.headers["Content-Type"] || req.headers["content-type"]}`.toLowerCase()
    if (!contentType || !contentType.startsWith("application/json")) {
      responseError(res, HttpStatus.UnsupportedMediaType, GMError.InvalidContentType, `Expecting application/json, got ${contentType}`)
      return
    }
    const authString = req.headers[AuthorizationField] || req.headers[AuthorizationField.toLowerCase()]
    const body = await readBody(req, rawBodyString)
    if (
      !body ||
      !checkHttpAuthInfo(`${authString}`, {
        game: config.game,
        secret: config.secret,
        method: "POST",
        // 此处协议不参与计算不需要准确设定
        endpoint: `http://${req.headers.host}`,
        url: req.url || "",
        data: body,
      })
    ) {
      responseError(res, HttpStatus.Unauthorized, GMError.InvalidSignature, "Signature failed")
      return
    }
    const gmRequest = parseJSON(body, isGMRequestBody)
    if (!gmRequest) {
      responseError(res, HttpStatus.BadRequest, GMError.InvalidRequest, `GM request body format error`)
      return
    }
    // 所有错误检查完毕，通知游戏处理函数
    try {
      const result = await handler(
        gmRequest.command,
        gmRequest.args,
        gmRequest.request_id,
        gmRequest.idempotency_key || "",
        gmRequest.version
      )
      // 游戏主动抛错不打印日志信息
      if (result instanceof Error) {
        responseError(res, HttpStatus.InternalServerError, GMError.InternalError, result.message)
        return
      }
      if (isGMErrorResponse(result)) {
        responseError(
          res,
          error2httpStatus[result.error] || HttpStatus.InternalServerError,
          result.error || GMError.InternalError,
          result.message
        )
        return
      }
      // 对游戏处理函数进一步兼容处理，允许返回一个预定义的错误码
      // 但此逻辑不作为公开 api，仅作为内容兼容处理
      if (typeof result === "string" && result in error2httpStatus) {
        responseError(res, error2httpStatus[result], result, result)
        return
      }
      // 如果 result 没有结果则进行提示然后继续
      if (!result) {
        console.warn(`gm command "${gmRequest.command}" should give back some data`)
      }
      repsonseJson(res, result ?? {})
    } catch (e) {
      console.error(
        `gm command "${gmRequest.command}"(requestId: ${gmRequest.request_id}; idempotencyKey: ${gmRequest.idempotency_key || ""}) exec error`,
        e
      )
      responseError(res, HttpStatus.InternalServerError, GMError.InternalError, e instanceof Error ? e.message : String(e))
    }
  }
}

/**
 * 获取基于 express 的处理函数用于响应 Seayoo Server 推送过来的 GM 执行通知
 *
 * 如需自定义处理，可以使用 getGMCommandHandler 方法，
 *
 * 如果 express 使用全局的 bodyParse 或类似插件，将需要做额外的处理以获取原始请求的内容 rawBody 以用以计算签名
 *
 * 处理方法可以参考
 *
 * https://cloud.tencent.com/developer/ask/sof/110062928
 */
export function getGMHandlerForExpress(config: SDKMinConfig, handler: GMCommandHandler) {
  const func = getGMCommandHandler(config, handler)
  return async function (req: ExpressRequest & { rawBody?: string }, res: ExpressResponse) {
    await func(req, res, "rawBody" in req ? `${req.rawBody}` : "")
  }
}

/**
 * 获取基于 express 的中间件用于响应 Seayoo Server 推送过来的 GM 执行通知
 *
 * 需要先于 body-parse 等类似插件加载
 */
export function getGMMiddlewareForExpress(paths: string | string[], config: SDKMinConfig, handler: GMCommandHandler) {
  const func = getGMCommandHandler(config, handler)
  const matchPaths = Array.isArray(paths) ? paths : [paths]
  return async function (req: ExpressRequest, res: ServerResponse, next: ExpressNextFunction) {
    if (req.method.toUpperCase() === "POST" && matchPaths.includes(req.path)) {
      await func(req, res)
      return
    }
    next()
  }
}

/**
 * 获取基于 koa2 的处理函数用于响应 Seayoo Server 推送过来的 GM 执行通知
 *
 * 如需自定义处理，可以使用 getGMCommandHandler 方法
 *
 * 如果 koa 使用全局的 koa-body 或类似插件，将需要做额外的处理以获取原始请求的内容 rawBody 以用以计算签名
 */
export function getGMHandlerForKoa(config: SDKMinConfig, handler: GMCommandHandler) {
  const func = getGMCommandHandler(config, handler)
  return async function (ctx: Pick<ParameterizedContext, "req" | "res"> & { rawBody?: string }) {
    await func(ctx.req, ctx.res, "rawBody" in ctx ? `${ctx.rawBody}` : "")
  }
}

/**
 * 获取基于 koa2 的中间件用于响应 Seayoo Server 推送过来的 GM 执行通知
 *
 * 需要先于 koa-body 等类似插件加载
 */
export function getGMMiddlewareForKoa(paths: string | string[], config: SDKMinConfig, handler: GMCommandHandler) {
  const func = getGMCommandHandler(config, handler)
  const matchPaths = Array.isArray(paths) ? paths : [paths]
  return async function (ctx: Pick<ParameterizedContext, "method" | "path" | "req" | "res">, next: Next) {
    if (ctx.method.toUpperCase() === "POST" && matchPaths.includes(ctx.path)) {
      await func(ctx.req, ctx.res)
      return
    }
    await next()
  }
}
