import { ApiClient, Platform } from "../src"
import { describe, expect, test, vi } from "vitest"
import { runSeayooMockServer, endpoint, game, secret } from "./mock.seayoo"

runSeayooMockServer()

describe("CreateInstance", () => {
  const baseConfig = {
    endpoint: "https://api.seayoo.com",
    game: "xcom",
    secret: "sk_secret",
  } as const

  test("Normal", () => {
    const apiClient = new ApiClient(baseConfig)
    expect(apiClient).toBeInstanceOf(ApiClient)
    expect("createOrder" in apiClient).toBe(true)
    expect(apiClient.createOrder.length).toBe(1)
    expect("enterGame" in apiClient).toBe(true)
    expect(apiClient.enterGame.length).toBe(2)
    expect("leaveGame" in apiClient).toBe(true)
    expect(apiClient.leaveGame.length).toBe(2)
  })

  test("WithoutKey", () => {
    let err: Error | null = null
    try {
      new ApiClient({ ...baseConfig, secret: "" as unknown as "sk_${string}" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })

  test("WithErrorKey", () => {
    let err: Error | null = null
    try {
      new ApiClient({ ...baseConfig, secret: "errorkey" as unknown as "sk_${string}" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })

  test("WithoutGame", () => {
    let err: Error | null = null
    try {
      new ApiClient({ ...baseConfig, game: "" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })

  test("WithoutEndpoint", () => {
    let err: Error | null = null
    try {
      new ApiClient({ ...baseConfig, endpoint: "" as unknown as "https://${string}" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })

  test("WithErrorEndpoint", () => {
    let err: Error | null = null
    try {
      new ApiClient({ ...baseConfig, endpoint: "x.com" as unknown as "https://${string}" })
    } catch (error) {
      err = error
    }
    expect(err).toBeInstanceOf(Error)
  })
})

describe("CreateOrder", () => {
  const baseOption = {
    reference_id: "game-order-id-00001",
    combo_id: "234232320001",
    product_id: "demo001",
    platform: Platform.Android,
    notify_url: "https://game-server/notify-url",
    quantity: 1,
    context: "payloay for game order, anything you want",
    meta: {},
  }

  test("Normal", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder(baseOption).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(false)
    expect(console.error).toBeCalledTimes(0)
    expect("order_id" in order).toBe(true)
    expect("order_token" in order).toBe(true)
    expect("expires_at" in order ? order.expires_at : null).toBeTypeOf("number")
  })

  test("SeayooServerError", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    // 借助数据字段告诉 mock server 以 500 响应
    const order = await client.createOrder({ ...baseOption, product_id: "SeayooServerError" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(1)
  })

  test("SeayooResponError", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    // 借助数据字段告诉 mock server 以 500 响应
    const order = await client.createOrder({ ...baseOption, product_id: "SeayooResponError" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(1)
  })

  test("SeayooResponMissingField", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    // 借助数据字段告诉 mock server 以错误字段响应
    const order = await client.createOrder({ ...baseOption, product_id: "SeayooResponMissingField" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(1)
  })

  test("ErrorSecret", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret: "sk_error" })
    const order = await client.createOrder(baseOption).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(1)
  })

  test("ErrorGameId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game: "nothing", secret })
    const order = await client.createOrder(baseOption).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(1)
  })

  // 以下必选参数的检查不需要提交服务器，并且不输出 error 信息
  test("MissingReferenceId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, reference_id: "" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })
  test("MissingComboId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, combo_id: "" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })
  test("MissingProductId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, product_id: "" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })
  test("MissingNotifyUrl", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, notify_url: "" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })

  // 数据格式基本检查
  test("ErrorNotifyUrl", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, notify_url: "//game.server/notify/order" }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })
  test("ErrorQuantity: 1.2", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, quantity: 1.2 }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })
  test("ErrorQuantity: 0", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, quantity: 0 }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })
  test("ErrorQuantity: -1", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const order = await client.createOrder({ ...baseOption, quantity: -1 }).catch((e) => <Error>e)
    expect(order instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })
})

describe("EnterGame", () => {
  test("Normal", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.enterGame("123400001", "game-session-id").catch((e) => <Error>e)
    expect(ok).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })

  test("MissingComboId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.enterGame("", "game-session-id").catch((e) => <Error>e)
    expect(ok instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })

  test("MissingSessionId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.enterGame("123400001", "").catch((e) => <Error>e)
    expect(ok instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })

  test("SeayooServerError", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.enterGame("123400001", "SeayooServerError").catch((e) => <Error>e)
    expect(ok).toBe(false)
    expect(console.error).toBeCalledTimes(1)
  })
})

describe.only("LeaveGame", () => {
  test("Normal", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.leaveGame("123400001", "game-session-id").catch((e) => <Error>e)
    expect(ok).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })

  test("MissingComboId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.leaveGame("", "game-session-id").catch((e) => <Error>e)
    expect(ok instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })

  test("MissingSessionId", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.leaveGame("123400001", "").catch((e) => <Error>e)
    expect(ok instanceof Error).toBe(true)
    expect(console.error).toBeCalledTimes(0)
  })

  test("SeayooServerError", async () => {
    vi.spyOn(console, "error")
    const client = new ApiClient({ endpoint, game, secret })
    const ok = await client.leaveGame("123400001", "SeayooServerError").catch((e) => <Error>e)
    expect(ok).toBe(false)
    expect(console.error).toBeCalledTimes(1)
  })
})
