import {
  verifyConfigWithoutEndpoint,
  AuthorizationField,
  checkHttpAuthInfo,
  parseJSON,
  readBody,
  responseJson,
  responseError,
  type SDKBaseConfig,
  genNonceString,
} from "../utils"
import { GMError, HttpStatus } from "../const"
import type { IncomingMessage, ServerResponse } from "http"
import {
  isGMErrorResponse,
  isGMRequestBody,
  isIdempotencyRecord,
  type GMCommandHandler,
  type GMErrorResponse,
  type IdempotencyKeyStoreHelper,
  type IdempotencyRecord,
} from "./types"
import type { ParameterizedContext, Next } from "koa"
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from "express"
import { verifyStoreHelper, toString } from "./utils"

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
 * 获取一个处理函数用于响应 Seayoo Server 推送过来的 GM 执行通知，storeHelper 提供存储支持以实现幂等key（idempotencyKey）的自动化处理
 *
 * 另有 express 和 koa2 版本的处理函数可以使用。
 *
 * 由于签名需要原始请求的内容，如果 request 在函数执行之前已经被读取，则需要手工传入请求的 rawBody 字符串以核验签名
 */
export function getGMCommandHandler(config: SDKMinConfig, handler: GMCommandHandler, storeHelper?: IdempotencyKeyStoreHelper) {
  verifyConfigWithoutEndpoint(config)
  verifyStoreHelper(storeHelper)
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
    // 处理幂等key
    const currentRecord: IdempotencyRecord = {
      nonce: genNonceString(),
      key: gmRequest.idempotency_key || "",
      id: gmRequest.request_id,
      cmd: gmRequest.command,
      args: toString(gmRequest.args),
    }
    let oldResponse: Record<string, unknown> | GMErrorResponse | Error | null = null
    if (storeHelper && gmRequest.idempotency_key) {
      const oldRecordStr = await storeHelper
        .setNX(gmRequest.idempotency_key, toString(currentRecord))
        .catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))))
      if (oldRecordStr instanceof Error) {
        console.error(
          `gm command "${gmRequest.command}"(requestId: ${gmRequest.request_id}; idempotencyKey: ${
            gmRequest.idempotency_key || ""
          }) setNX error`,
          oldRecordStr
        )
        responseError(res, HttpStatus.InternalServerError, GMError.InternalError, oldRecordStr.message)
        return
      }
      const oldRecord = oldRecordStr ? parseJSON(oldRecordStr, isIdempotencyRecord) : null
      if (!oldRecord && oldRecordStr) {
        console.error(
          `gm command "${gmRequest.command}"(requestId: ${gmRequest.request_id}; idempotencyKey: ${
            gmRequest.idempotency_key || ""
          }) parse old idempotency record failed: ${oldRecordStr}`
        )
        responseError(res, HttpStatus.InternalServerError, GMError.InternalError, "parse old idempotency record failed")
        return
      }

      // spell-checker:disable
      // fix spell error
      if (oldRecord && "noce" in oldRecord) {
        oldRecord.nonce = oldRecord.noce + ""
      }
      // spell-checker:enable

      // 检查是否为首次请求
      const isFirstRequest = oldRecordStr === "" || oldRecord?.nonce === currentRecord.nonce
      if (!isFirstRequest && oldRecord) {
        if (!oldRecord.resp) {
          responseError(
            res,
            error2httpStatus[GMError.IdempotencyConflict],
            GMError.IdempotencyConflict,
            "previous request is not completed"
          )
          return
        }
        if (oldRecord.cmd !== gmRequest.command) {
          responseError(
            res,
            error2httpStatus[GMError.IdempotencyMismatch],
            GMError.IdempotencyMismatch,
            `cmd mismatch, expecting ${oldRecord.cmd}, got ${gmRequest.command}`
          )
          return
        }
        if (oldRecord.args !== currentRecord.args) {
          responseError(
            res,
            error2httpStatus[GMError.IdempotencyMismatch],
            GMError.IdempotencyMismatch,
            `args mismatch, expecting ${oldRecord.args}, got ${currentRecord.args}`
          )
          return
        }
        oldResponse = oldRecord.resp
      }
    }
    // 所有错误检查完毕，通知游戏处理函数
    try {
      const result =
        oldResponse ||
        (await handler(gmRequest.command, gmRequest.args, gmRequest.request_id, gmRequest.idempotency_key || "", gmRequest.version))
      // 记录handler返回的结果以备下次检查使用，setXX出现错误也不再中断请求
      if (storeHelper && gmRequest.idempotency_key) {
        currentRecord.resp = result
        storeHelper.setXX(gmRequest.idempotency_key, toString(currentRecord)).catch((err) => {
          console.error("failed to setXX idempotency record", err, currentRecord)
        })
      }
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
      responseJson(res, result ?? {})
    } catch (e) {
      console.error(
        `gm command "${gmRequest.command}"(requestId: ${gmRequest.request_id}; idempotencyKey: ${
          gmRequest.idempotency_key || ""
        }) exec error`,
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
export function getGMHandlerForExpress(config: SDKMinConfig, handler: GMCommandHandler, storeHelper?: IdempotencyKeyStoreHelper) {
  const func = getGMCommandHandler(config, handler, storeHelper)
  return async function (req: ExpressRequest & { rawBody?: string }, res: ExpressResponse) {
    await func(req, res, "rawBody" in req ? `${req.rawBody}` : "")
  }
}

/**
 * 获取基于 express 的中间件用于响应 Seayoo Server 推送过来的 GM 执行通知
 *
 * 需要先于 body-parse 等类似插件加载
 */
export function getGMMiddlewareForExpress(
  paths: string | string[],
  config: SDKMinConfig,
  handler: GMCommandHandler,
  storeHelper?: IdempotencyKeyStoreHelper
) {
  const func = getGMCommandHandler(config, handler, storeHelper)
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
export function getGMHandlerForKoa(config: SDKMinConfig, handler: GMCommandHandler, storeHelper?: IdempotencyKeyStoreHelper) {
  const func = getGMCommandHandler(config, handler, storeHelper)
  return async function (ctx: Pick<ParameterizedContext, "req" | "res"> & { rawBody?: string }) {
    await func(ctx.req, ctx.res, "rawBody" in ctx ? `${ctx.rawBody}` : "")
  }
}

/**
 * 获取基于 koa2 的中间件用于响应 Seayoo Server 推送过来的 GM 执行通知
 *
 * 需要先于 koa-body 等类似插件加载
 */
export function getGMMiddlewareForKoa(
  paths: string | string[],
  config: SDKMinConfig,
  handler: GMCommandHandler,
  storeHelper?: IdempotencyKeyStoreHelper
) {
  const func = getGMCommandHandler(config, handler, storeHelper)
  const matchPaths = Array.isArray(paths) ? paths : [paths]
  return async function (ctx: Pick<ParameterizedContext, "method" | "path" | "req" | "res">, next: Next) {
    if (ctx.method.toUpperCase() === "POST" && matchPaths.includes(ctx.path)) {
      await func(ctx.req, ctx.res)
      return
    }
    await next()
  }
}
