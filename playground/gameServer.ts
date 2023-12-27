import { Server } from "./server"
import { sleep } from "@seayoo-web/utils"

const app = new Server()

app
  .loadHtml("assets/game")
  .assetsIn("assets")
  .get("/", async function (req, res) {
    await sleep(1000)
    res.html(200, "game", {})
  })
  .post("/game/create-order", async function (req, res) {
    // 利用 SDK 发送下单请求
    res.text(200, "OK")
  })
  .post("/game/enter", async function (req, res) {
    // 利用 SDK 发送进入游戏统计
    res.text(200, "OK")
  })
  .post("/game/leave", async function (req, res) {
    // 利用 SDK 发送离开游戏统计
    res.text(200, "OK")
  })
  .post("/game/verify-id-token", async function (req, res) {
    // 利用 SDK 解析 id token
    res.text(200, "OK")
  })
  .post("/game/verify-ad-toke", async function (req, res) {
    // 利用 SDK 解析 ad token
    res.text(200, "OK")
  })

app.listen(8000)
console.log("Game Mock Server run at :8000")
