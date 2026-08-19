import { setupServer } from "msw/node"
import { HttpResponse, http } from "msw"
import { beforeAll, afterAll, afterEach } from "vitest"
import { checkHttpAuthInfo } from "../src/utils"
import type {
  CreateOrderOption,
  GetMiniGameWeixinAccessTokenOption,
  SendOtpOption,
  VerifyOtpOption,
  VoiceModerationRequestOption,
} from "../src"

export const game = "xcom"

export const secret = "sk_secret"

export const endpoint = "https://api.seayoo.com"

const serverBaseUrl = "/v1/server"

export function runSeayooMockServer() {
  const server = setupServer(
    http.post<object, Partial<CreateOrderOption>>(endpoint + serverBaseUrl + "/create-order", async function ({ request }) {
      const rawBody = await request.clone().text()
      const body = await request.json()
      if (!body.combo_id || !body.notify_url || !body.platform || !body.product_id || !body.reference_id || !body.quantity) {
        return HttpResponse.json({ message: "Missing required parameters" }, { status: 400 })
      }
      const headers = { "x-trace-id": "tr" + Date.now() }
      // body 即使提交的数据，此处为 mock server 不再继续处理
      // 开始校验认证信息
      const authHeader = request.headers.get("Authorization") || ""
      if (
        !checkHttpAuthInfo(authHeader, {
          game,
          secret,
          endpoint,
          method: "POST",
          url: request.url,
          data: rawBody,
        })
      ) {
        return HttpResponse.json({ message: "Authorization Error" }, { status: 401, headers })
      }
      // mock server 跳过创建订单的流程
      // 如果世游响应数据错误
      if (body.product_id === "SeayooServerError") {
        return HttpResponse.json({ message: "Seayoo Error Response" }, { status: 500, headers })
      }
      if (body.product_id === "SeayooResponseError") {
        return HttpResponse.json(
          {
            order_id: Math.random().toString(32).slice(2),
            order_token: Math.random().toString(32).slice(2) + Math.random().toString(32).slice(2),
            // 设置响应数据类型错误
            expires_at: "" + Math.floor(Date.now() / 1000) + 60 * 10,
          },
          { headers }
        )
      }
      if (body.product_id === "SeayooResponseMissingField") {
        return HttpResponse.json(
          {
            order_id: Math.random().toString(32).slice(2),
            // 假设服务器同学手抖写错了字段名
            order_Token: Math.random().toString(32).slice(2) + Math.random().toString(32).slice(2),
            expires_at: Math.floor(Date.now() / 1000) + 60 * 10,
          },
          { headers }
        )
      }

      // 直接响应
      return HttpResponse.json(
        {
          // 实际的 orderId 为纯数字，这里故意设置为字符串以强制 SDK 把 id 当作字符串处理
          order_id: Math.random().toString(32).slice(2),
          // 世游服务端创建的订单 token，用于后续支付流程
          // order_token 不需要游戏测进行解析，故 mock 数据直接返回假的 token 以强制 SDK 不检查 token 格式
          order_token: Math.random().toString(32).slice(2) + Math.random().toString(32).slice(2),
          // 设置为十分钟后失效，实际后端值要高于这个时长
          expires_at: Math.floor(Date.now() / 1000) + 60 * 10,
        },
        { headers }
      )
    }),

    // 签名验证过程已经在 creteOrder 中做了检查，因为签名逻辑是一个函数，故在剩余的 mock api 中不再重复检查
    http.post<object, { combo_id?: string; session_id?: string }>(endpoint + serverBaseUrl + "/enter-game", async function ({ request }) {
      const body = await request.json()
      if (!body.combo_id || !body.session_id) {
        return HttpResponse.json({ message: "Missing required parameters" }, { status: 400 })
      }
      if (body.session_id === "SeayooServerError") {
        return HttpResponse.json({ message: "Seayoo Error Response" }, { status: 500 })
      }
      return new HttpResponse(undefined, { status: 204 })
    }),
    http.post<object, { combo_id?: string; session_id?: string }>(endpoint + serverBaseUrl + "/leave-game", async function ({ request }) {
      const body = await request.json()
      if (!body.combo_id || !body.session_id) {
        return HttpResponse.json({ message: "Missing required parameters" }, { status: 400 })
      }
      if (body.session_id === "SeayooServerError") {
        return HttpResponse.json({ message: "Seayoo Error Response" }, { status: 500 })
      }
      return new HttpResponse(undefined, { status: 204 })
    }),

    http.post<object, Partial<SendOtpOption>>(endpoint + serverBaseUrl + "/send-otp", async function ({ request }) {
      const body = await request.json()
      const headers = { "x-trace-id": "tr" + Date.now() }
      // combo_id 和 action 为必填，channel 可选（默认 sms）
      if (!body.combo_id || !body.action) {
        return HttpResponse.json({ message: "Missing required parameters" }, { status: 400, headers })
      }
      // 借助 action 字段告诉 mock server 以异常方式响应
      if (body.action === "SeayooServerError") {
        return HttpResponse.json({ message: "Seayoo Error Response" }, { status: 500, headers })
      }
      if (body.action === "SeayooResponseError") {
        return HttpResponse.json(
          {
            mobile: "138****0001",
            // 设置响应数据类型错误：otp_ttl 应为 number
            otp_ttl: "600",
            otp_cooldown: 60,
          },
          { headers }
        )
      }
      if (body.action === "SeayooResponseMissingField") {
        return HttpResponse.json(
          {
            mobile: "138****0001",
            // 假设服务器同学手抖漏写了 otp_ttl 字段
            otp_cooldown: 60,
          },
          { headers }
        )
      }
      return HttpResponse.json(
        {
          // 掩码后的手机号，仅当 channel=sms 时有值
          mobile: "138****0001",
          otp_ttl: 600,
          otp_cooldown: 60,
        },
        { headers }
      )
    }),
    http.post<object, Partial<VerifyOtpOption>>(endpoint + serverBaseUrl + "/verify-otp", async function ({ request }) {
      const body = await request.json()
      const headers = { "x-trace-id": "tr" + Date.now() }
      if (!body.combo_id || !body.action || !body.otp) {
        return HttpResponse.json({ message: "Missing required parameters" }, { status: 400, headers })
      }
      if (body.action === "SeayooServerError") {
        return HttpResponse.json({ message: "Seayoo Error Response" }, { status: 500, headers })
      }
      // 约定：otp 为 "000000" 时验证通过，否则验证失败（验证失败属于正常业务结果，仍以 200 响应）
      return HttpResponse.json({ valid: body.otp === "000000" }, { headers })
    }),

    http.post<object, Partial<GetMiniGameWeixinAccessTokenOption>>(
      endpoint + serverBaseUrl + "/minigame-weixin-access-token",
      async function ({ request }) {
        const body = await request.json()
        const headers = { "x-trace-id": "tr" + Date.now() }
        if (!body.app_id) {
          return HttpResponse.json({ message: "Missing required parameters" }, { status: 400, headers })
        }
        // 借助 app_id 字段告诉 mock server 以异常方式响应
        if (body.app_id === "SeayooServerError") {
          return HttpResponse.json({ message: "Seayoo Error Response" }, { status: 500, headers })
        }
        if (body.app_id === "SeayooResponseError") {
          return HttpResponse.json(
            {
              app_id: body.app_id,
              // 设置响应数据类型错误：access_token 应为 string
              access_token: 123456,
            },
            { headers }
          )
        }
        if (body.app_id === "SeayooResponseMissingField") {
          return HttpResponse.json(
            {
              // 假设服务器同学手抖漏写了 access_token 字段
              app_id: body.app_id,
            },
            { headers }
          )
        }
        return HttpResponse.json({ app_id: body.app_id, access_token: "STABLE_AK" }, { headers })
      }
    ),

    http.post<object, Partial<VoiceModerationRequestOption>>(
      endpoint + serverBaseUrl + "/voice-moderation-request",
      async function ({ request }) {
        const body = await request.json()
        const headers = { "x-trace-id": "tr" + Date.now() }
        if (!body.room_instance_id || !body.server_id || !body.requester_role_id || !body.target_role_ids) {
          return HttpResponse.json({ message: "Missing required parameters" }, { status: 400, headers })
        }
        if (body.reasons && (body.reasons.length > 12 || body.reasons.some((r) => r.length > 32 || r.includes(",")))) {
          return HttpResponse.json({ message: "Invalid reasons" }, { status: 400, headers })
        }
        if (body.room_instance_id === "SeayooServerError") {
          return HttpResponse.json({ message: "Seayoo Error Response" }, { status: 500, headers })
        }
        return new HttpResponse(undefined, { status: 204 })
      }
    ),

    http.all("/*", async () => {
      return HttpResponse.text("NotFound", { status: 404 })
    })
  )

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
