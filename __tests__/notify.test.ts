import { describe, expect, test } from "vitest"
import { endpoint, game, secret } from "./mock.seayoo"
import { runGameMockServer, notifyPath, localGameHostPort } from "./mock.game"
import { calcAuthorizationHeader } from "../src"
import { getNotificationHandler, getNotificationHandlerForExpress, getNotificationHandlerForKoa } from "../src"
import { NotificationType, getNotificationMiddlewareForExpress, getNotificationMiddlewareForKoa } from "../src"
import { NetRequest } from "../src/request"

const serverNotifyUrl = `http://127.0.0.1:${localGameHostPort}${notifyPath}`
const AuthorizationField = "Authorization"
const { post, put } = NetRequest({
  responseRule: {
    failed: {
      resolve: "body",
    },
    ok: {
      resolve: "body",
      ignoreMessage: [],
    },
  },
  requestTransformer({ headers, method, url, params, body }) {
    const iURL = new URL(url)
    if (params) {
      if (params instanceof Object) {
        Object.keys(params).forEach((key) => iURL.searchParams.set(key, params[key]))
      }
    }
    headers["User-Agent"] = "seayoo-mock-server"
    headers[AuthorizationField] =
      headers[AuthorizationField] || calcAuthorizationHeader({ game, secret, endpoint, method, url: iURL.toString(), data: body || "" })
  },
})

describe("Factory of Function", () => {
  const baseConfig = { endpoint, game, secret } as const
  const noop = function () {}

  test("Factory: Raw Handler", () => {
    const handler = getNotificationHandler(baseConfig, noop)
    expect(handler).toBeInstanceOf(Function)
    expect(handler.length).toEqual(3)
  })

  test("Factory: Express Handler", () => {
    const handler = getNotificationHandlerForExpress(baseConfig, noop)
    expect(handler).toBeInstanceOf(Function)
    expect(handler.length).toEqual(2)
  })

  test("Factory: Koa Handler", () => {
    const handler = getNotificationHandlerForKoa(baseConfig, noop)
    expect(handler).toBeInstanceOf(Function)
    expect(handler.length).toEqual(1)
  })
})

describe("Factory of Middleware", () => {
  const baseConfig = { endpoint, game, secret } as const
  const noop = function () {}

  test("Factory: Express Middleware", () => {
    const handler = getNotificationMiddlewareForExpress("/seayoo-notify", baseConfig, noop)
    expect(handler).toBeInstanceOf(Function)
    expect(handler.length).toEqual(3)
  })

  test("Factory: Koa Middleware", () => {
    const handler = getNotificationMiddlewareForKoa("/seayoo-notify", baseConfig, noop)
    expect(handler).toBeInstanceOf(Function)
    expect(handler.length).toEqual(2)
  })
})

// message payload 示例参考
const shipOrderMessagePayload: {
  order_id: string | number
  reference_id: string | number
  combo_id: string | number
  product_id: string | number
  quantity: string | number
  currency: string
  amount: string | number
  context?: string
} = Object.freeze({
  order_id: Math.random().toString(32).slice(2) + Math.random().toString(32).slice(2),
  reference_id: "abc",
  combo_id: "1232300001",
  product_id: "product1",
  quantity: 12,
  currency: "CNY",
  amount: 12000,
  context: "",
})

describe("Notification: Common", () => {
  const baseConfig = { endpoint, game, secret } as const
  const payload = { ...shipOrderMessagePayload }

  test("Error Authorization", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(
      serverNotifyUrl,
      {
        version: "0.1.2",
        notification_id: Math.random().toString(32).slice(2),
        notification_type: NotificationType.ShipOrder,
        data: payload,
      },
      null,
      {
        headers: {
          [AuthorizationField]: calcAuthorizationHeader({ game, secret, endpoint, method: "POST", url: serverNotifyUrl, data: "Error" }),
        },
      }
    )
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(401)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Unknown NotificationType", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: "NewType",
      data: { unknown: "SomeData" },
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Missing Version", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
      data: payload,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Missing NotificationType", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      data: payload,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Missing NotificationID", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_type: NotificationType.ShipOrder,
      data: payload,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Missing Payload", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("NotificationID Must be String", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      // id 必须是字符串格式
      notification_id: 1111111,
      notification_type: NotificationType.ShipOrder,
      data: payload,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Request Method Must be POST", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await put(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
      data: payload,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(405)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Request ContentType Must be json", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(
      serverNotifyUrl,
      {
        version: "0.1.2",
        notification_id: Math.random().toString(32).slice(2),
        notification_type: NotificationType.ShipOrder,
        data: payload,
      },
      null,
      {
        // header 头的 content-type 声明错误也直接拒绝
        // 此时不会检查具体发送的内容是否 OK
        headers: {
          "Content-Type": "text/plain",
        },
      }
    )
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(415)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Error Payload Format", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(
      serverNotifyUrl,
      // 以下格式不符合严格的 json 字符串，将会在收到请求后格式化失败
      `{
      version: "0.1.2",
      notification_id: "123",
      notification_type: "ship_order",
      data: ${JSON.stringify(payload)},
    }`
    )
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Error Payload Struct", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: "123",
      notification_type: NotificationType.ShipOrder,
      // 错误的 payload 结构
      data: {},
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  })

  test("Game Server Error By Handler", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
      // 模拟 game server 处理消息出现异常
      throw new Error("Game Server Error")
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: "123",
      notification_type: NotificationType.ShipOrder,
      data: payload,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(500)
    expect(reviceData.message).toEqual(NotificationType.ShipOrder)
    expect(reviceData.payload).toEqual(payload)
  })
})

describe("Notification: shipOrder", () => {
  const baseConfig = { endpoint, game, secret } as const
  const payload = { ...shipOrderMessagePayload }

  // 检查错误 payload 的通用方法
  async function errorPayloadCheck(payload: Record<string, string | number>) {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
      data: payload,
    })
    stop()
    expect(ok).toBe(false)
    expect(status).toEqual(400)
    expect(reviceData.message).toEqual("")
    expect(reviceData.payload).toEqual(null)
  }

  test("Normal: Full Data", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const { ok, status, data } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
      data: payload,
    })
    stop()
    expect(ok).toBe(true)
    expect(status).toEqual(200)
    expect(data).toEqual("OK")
    expect(reviceData.message).toEqual(NotificationType.ShipOrder)
    expect(reviceData.payload).toEqual(payload)
  })

  test("Normal: Without Context", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const miniPayload = { ...payload }
    delete miniPayload.context
    const { ok, status, data } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
      data: miniPayload,
    })
    stop()
    expect(ok).toBe(true)
    expect(status).toEqual(200)
    expect(data).toEqual("OK")
    expect(reviceData.message).toEqual(NotificationType.ShipOrder)
    expect(reviceData.payload).toEqual(miniPayload)
  })

  test("Missing OrderID", async () => {
    const fixPayload = { ...payload }
    delete fixPayload.order_id
    await errorPayloadCheck(fixPayload)
  })

  test("Missing ComboID", async () => {
    const fixPayload = { ...payload }
    delete fixPayload.combo_id
    await errorPayloadCheck(fixPayload)
  })

  test("Missing ReferenceID", async () => {
    const fixPayload = { ...payload }
    delete fixPayload.reference_id
    await errorPayloadCheck(fixPayload)
  })

  test("Missing Amount", async () => {
    const fixPayload = { ...payload }
    delete fixPayload.amount
    await errorPayloadCheck(fixPayload)
  })

  test("Missing Quantity", async () => {
    const fixPayload = { ...payload }
    delete fixPayload.quantity
    await errorPayloadCheck(fixPayload)
  })

  test("OrderID Must be String", async () => {
    const fixPayload = { ...payload }
    fixPayload.order_id = 123123123
    await errorPayloadCheck(fixPayload)
  })

  test("payload.amount Must be Number", async () => {
    const fixPayload = { ...payload }
    fixPayload.amount = "123123123"
    await errorPayloadCheck(fixPayload)
  })

  test("payload.quantity Must be Number", async () => {
    const fixPayload = { ...payload }
    fixPayload.quantity = "123123123"
    await errorPayloadCheck(fixPayload)
  })

  test("Allowed Zero", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const fixPayload = { ...payload }
    fixPayload.quantity = 0
    fixPayload.amount = 0
    const { ok, status, data } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
      data: fixPayload,
    })
    stop()
    expect(ok).toBe(true)
    expect(status).toEqual(200)
    expect(data).toEqual("OK")
    expect(reviceData.message).toEqual(NotificationType.ShipOrder)
    expect(reviceData.payload).toEqual(fixPayload)
  })

  test("Allowed Negative", async () => {
    const reviceData = { message: "", payload: null }
    const { stop } = runGameMockServer(baseConfig, function (message, payload) {
      reviceData.message = message
      reviceData.payload = payload
    })
    const fixPayload = { ...payload }
    fixPayload.quantity = -1
    fixPayload.amount = -100
    const { ok, status, data } = await post(serverNotifyUrl, {
      version: "0.1.2",
      notification_id: Math.random().toString(32).slice(2),
      notification_type: NotificationType.ShipOrder,
      data: fixPayload,
    })
    stop()
    expect(ok).toBe(true)
    expect(status).toEqual(200)
    expect(data).toEqual("OK")
    expect(reviceData.message).toEqual(NotificationType.ShipOrder)
    expect(reviceData.payload).toEqual(fixPayload)
  })
})
