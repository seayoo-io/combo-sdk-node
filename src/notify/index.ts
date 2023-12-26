import { verifyConfig, AuthorizationField, checkHttpAuthInfo, isObject, parseJSON, readBody, done, type SDKBaseConfig } from "../utils"
import { messageDataGuards, NotificationType, type ENotificationPayload, type NotificationHandler } from "./types"
import type { ParameterizedContext } from "koa"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Request as ExpressRequest, Response as ExpressResponse } from "express"

export type { NotificationType, NotificationHandler } from "./types"

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
 * 另有 express 和 koa2 版本的处理函数可以使用
 */
export function getNotificationRequestHandler(config: SDKBaseConfig, handler: NotificationHandler) {
  verifyConfig(config)
  return async function (req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST") {
      done(res, 405)
      return
    }
    const contentType = `${req.headers["Content-Type"]}`.toLowerCase()
    if (!contentType || !contentType.startsWith("application/json")) {
      done(res, 415)
      return
    }
    const body = await readBody(req)
    if (
      !checkHttpAuthInfo(`${req.headers[AuthorizationField]}`, {
        game: config.game,
        secret: config.secret,
        method: "POST",
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
 * 如需自定义处理，可以使用 getNotificationRequestHandler 方法
 */
export function getNotificationHandlerForExpress(config: SDKBaseConfig, handler: NotificationHandler) {
  const func = getNotificationRequestHandler(config, handler)
  return async function (req: ExpressRequest, res: ExpressResponse) {
    await func(req, res)
  }
}

/**
 * 获取基于 koa2 的处理函数用于接收 Seayoo Server 推送过来的消息通知
 *
 * 如需自定义处理，可以使用 getNotificationRequestHandler 方法
 */
export function getNotificationHandlerForKoa(config: SDKBaseConfig, handler: NotificationHandler) {
  const func = getNotificationRequestHandler(config, handler)
  return async function (ctx: ParameterizedContext) {
    await func(ctx.req, ctx.res)
  }
}
