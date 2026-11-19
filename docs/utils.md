> [Combo SDK for Node.js](../README.md) / Utils

# Utils

## genSessionID

生成用于标记用户上下线的 SessionID。

```js
import { genSessionID } from "@seayoo-io/combo-sdk-node"

const sessionID = genSessionID(combo_id)
// 32 位小写十六进制字符串
```

## mayBeComboId

检查一个值是否为 Combo ID 的格式，仅做格式检查，不检查该 ID 是否真实存在。

```js
import { mayBeComboId } from "@seayoo-io/combo-sdk-node"

mayBeComboId("1260418509000005") // true
mayBeComboId("95231223346130001") // true
mayBeComboId("1260418509000000") // false
mayBeComboId(1260418509000005) // false，只接受字符串
```

## parseAuthorizationHeader

解析 Authorization 请求头，返回 `{ Game, Timestamp, Signature }`，格式不正确时返回 `null`。

```js
import { parseAuthorizationHeader } from "@seayoo-io/combo-sdk-node"

const info = parseAuthorizationHeader(authString)
if (!info) {
  // 请求头格式不正确
}
```

## calcAuthorizationHeader

计算 HTTP 请求的 Authorization 请求头。

```js
import { calcAuthorizationHeader } from "@seayoo-io/combo-sdk-node"

const authString = calcAuthorizationHeader({
  game: "<GameId>",
  secret: "<SecretKey>",
  endpoint: "https://api.seayoo.com",
  method: "POST",
  url: "/path/to/api",
  data: { combo_id: "<ComboID>" },
})
```

## checkHttpAuthInfo

校验 HTTP 请求的签名信息是否正确，签名不合法或时间戳超出允许范围时返回 `false`。

```js
import { checkHttpAuthInfo } from "@seayoo-io/combo-sdk-node"

const ok = checkHttpAuthInfo(authString, {
  // 省略 game 时不校验签发方
  secret: "<SecretKey>",
  endpoint: "https://api.seayoo.com",
  method: "POST",
  url: "/path/to/api",
  data: { combo_id: "<ComboID>" },
})
```
