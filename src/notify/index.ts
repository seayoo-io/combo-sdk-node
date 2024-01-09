import { verifyConfig, AuthorizationField, checkHttpAuthInfo, isObject, parseJSON, readBody, done, type SDKBaseConfig } from "../utils"
import { messageDataGuards, NotificationType, type ENotificationPayload, type NotificationHandler } from "./types"
import type { ParameterizedContext, Next } from "koa"
import type { IncomingMessage, ServerResponse } from "http"
import type { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from "express"

interface NotificationRequestBody {
  /** 世游服务端通知的版本号 */
  version: string
  /** 每次通知的唯一 ID。游戏侧可用此值来对通知进行去重 */
  notification_id: string
  /** 用于标识通知类型，Data 中的结构随着通知类型的不同而不同 */
  notification_type: NotificationType
  /** 通知消息的 payload */
  data: ENotificationPayload[NotificationType]
}

function isNotificationRequestBody(data: unknown): data is NotificationRequestBody {
  return (
    isObject(data) &&
    "version" in data &&
    "notification_id" in data &&
    "notification_type" in data &&
    "data" in data &&
    typeof data.version === "string" &&
    typeof data.notification_id === "string" &&
    typeof data.notification_type === "string"
  )
}

/**
 * 获取一个处理函数用于接收 Seayoo Server 推送过来的消息通知
 *
 * 另有 express 和 koa2 版本的处理函数可以使用。
 *
 * 由于签名需要原始请求的内容，如果 request 在函数执行之前已经被读取，则需要手工传入请求的 rawBody 字符串以核验签名
 */
export function getNotificationHandler(config: SDKBaseConfig, handler: NotificationHandler) {
  verifyConfig(config)
  /**
   * 第三个可选参数 rawBodyString 用于在特定场景 request 为 unreadable 时作为容错兜底方案处理
   *
   * 具体方案可以参考
   *
   * https://cloud.tencent.com/developer/ask/sof/110062928
   */
  return async function (req: IncomingMessage, res: ServerResponse, rawBodyString?: string) {
    if (req.method !== "POST") {
      done(res, 405)
      return
    }
    const contentType = `${req.headers["Content-Type"] || req.headers["content-type"]}`.toLowerCase()
    if (!contentType || !contentType.startsWith("application/json")) {
      done(res, 415)
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
      done(res, 401)
      return
    }
    const notification = parseJSON(body, isNotificationRequestBody)
    if (!notification) {
      done(res, 400, `Notification body Format Error`)
      return
    }
    const guardCfg = messageDataGuards[notification.notification_type]
    if (!guardCfg) {
      done(res, 400, `Unknown Notification Type: ${notification.notification_type}`)
      return
    }
    if (!guardCfg.guard(notification.data)) {
      done(res, 400, guardCfg.message)
      return
    }
    // 所有错误检查完毕，通知游戏处理函数
    try {
      await handler(notification.notification_type, notification.data)
      done(res, 200, "OK")
    } catch (e) {
      done(res, 500, e instanceof Error ? e.message : String(e))
    }
  }
}

/**
 * 获取基于 express 的处理函数用于接收 Seayoo Server 推送过来的消息通知
 *
 * 如需自定义处理，可以使用 getNotificationHandler 方法，
 *
 * 如果 express 使用全局的 bodyParse 或类似插件，将需要做额外的处理以获取原始请求的内容 rawBody 以用以计算签名
 *
 * 处理方法可以参考
 *
 * https://cloud.tencent.com/developer/ask/sof/110062928
 */
export function getNotificationHandlerForExpress(config: SDKBaseConfig, handler: NotificationHandler) {
  const func = getNotificationHandler(config, handler)
  return async function (req: ExpressRequest & { rawBody?: string }, res: ExpressResponse) {
    await func(req, res, "rawBody" in req ? `${req.rawBody}` : "")
  }
}

/**
 * 获取基于 express 的中间件用于接收 Seayoo Server 推送过来的消息通知
 *
 * 需要先于 body-parse 等类似插件加载
 */
export function getNotificationMiddlewareForExpress(paths: string | string[], config: SDKBaseConfig, handler: NotificationHandler) {
  const func = getNotificationHandler(config, handler)
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
 * 获取基于 koa2 的处理函数用于接收 Seayoo Server 推送过来的消息通知
 *
 * 如需自定义处理，可以使用 getNotificationHandler 方法
 *
 * 如果 koa 使用全局的 koa-body 或类似插件，将需要做额外的处理以获取原始请求的内容 rawBody 以用以计算签名
 */
export function getNotificationHandlerForKoa(config: SDKBaseConfig, handler: NotificationHandler) {
  const func = getNotificationHandler(config, handler)
  return async function (ctx: Pick<ParameterizedContext, "req" | "res"> & { rawBody?: string }) {
    await func(ctx.req, ctx.res, "rawBody" in ctx ? `${ctx.rawBody}` : "")
  }
}

/**
 * 获取基于 koa2 的中间件用于接收 Seayoo Server 推送过来的消息通知
 *
 * 需要先于 koa-body 等类似插件加载
 */
export function getNotificationMiddlewareForKoa(paths: string | string[], config: SDKBaseConfig, handler: NotificationHandler) {
  const func = getNotificationHandler(config, handler)
  const matchPaths = Array.isArray(paths) ? paths : [paths]
  return async function (ctx: Pick<ParameterizedContext, "method" | "path" | "req" | "res">, next: Next) {
    if (ctx.method.toUpperCase() === "POST" && matchPaths.includes(ctx.path)) {
      await func(ctx.req, ctx.res)
      return
    }
    await next()
  }
}
