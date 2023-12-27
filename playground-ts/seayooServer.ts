import { Server } from "./server"

const app = new Server()

app
  .loadHtml("assets/seayoo")
  .assetsIn("assets")
  .get("/", async (req, res) => {
    res.html(200, "seayoo")
  })
  .post("/v3/server/create-order", async function (req, res) {
    console.log(req.body)
    res.text(200, "Hi")
  })
  .post("/v3/server/enter-game", async function (req, res) {
    res.text(200, "Hi")
  })
  .post("/v3/server/leave-game", async function (req, res) {
    res.text(200, "Bye")
  })
  .post("/seayoo/notify/ship-order", async function (req, res) {
    // 向游戏服务发送发货通知
    res.text(200, "游戏服务器正确响应")
  })

app.listen(9000)
console.log("Seayoo Mock Server run at :9000")

/////////////////////////// 创建订单 //////////////////////////
// interface CreateOrderRequest {
//   reference_id: string
//   combo_id: string
//   product_id: string
//   platform: string
//   notify_url: string
//   quantity: number
//   context?: string
//   meta?: Record<string, unknown>
// }
// async function createOrder(option: CreateOrderRequest) {}
