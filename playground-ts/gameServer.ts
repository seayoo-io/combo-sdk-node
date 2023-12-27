import { Server } from "./server"
import { sleep } from "@seayoo-web/utils"
// import { ApiClient, Endpoint, Platform } from "@seayoo-io/combo-sdk-node"

const app = new Server()
// const client = new ApiClient({
//   endpoint: Endpoint.China,
//   game: "test",
//   secret: "sk_ddd",
// })

app
  .loadHtml("assets/game")
  .assetsIn("assets")
  .get("/", async function (req, res) {
    await sleep(1000)

    res.html(200, "game", {})
  })
  .post("/game/create-order", async function (req, res) {
    // 通知 SDK 下单
    // const result = await client.createOrder({
    //   reference_id: "",
    //   combo_id: "string",
    //   product_id: "string",
    //   platform: Platform.Windows,
    //   notify_url: "string",
    //   quantity: 1,
    //   context: "string",
    //   meta: {},
    // })
    // 利用 SDK 发送下单请求
    // res.json(200, result)
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
