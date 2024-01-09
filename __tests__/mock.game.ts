import { getNotificationHandler, type NotificationHandler, type SDKBaseConfig } from "../src"
import { createServer } from "http"

export const localGameHostPort = "5678"
export const notifyPath = "/seayoo-notify"

export function runGameMockServer(config: SDKBaseConfig, messageHandler: NotificationHandler) {
  const handler = getNotificationHandler(config, messageHandler)

  const server = createServer(async function (req, res) {
    // 为了检测 handler 对 method 的检查，此处 mock 需要跳过 method 过滤
    if (req.url === notifyPath /*&& req.method === "POST"*/) {
      await handler(req, res)
      return
    }

    res.statusCode = 404
    res.write("Not Found")
    res.end()
  })

  server.listen(localGameHostPort)

  return {
    stop: () => server.close(),
  }
}
