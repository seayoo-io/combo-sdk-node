> [Combo SDK for Node.js](../README.md) / Verify

# Verify

## 初始化

```js
import { TokenVerifier, Endpoint } from "@seayoo-io/combo-sdk-node"

const verifier = new TokenVerifier({
  game: "<GameId>",
  secret: "<SecretKey>",
  endpoint: Endpoint.China,
})
```

## IdentityToken 验证

```js
import { IdP } from "@seayoo-io/combo-sdk-node"
// verifyIdentityToken 对 IdentityToken 进行验证
// 返回 IdentityPayload 数据，如果解析出错则返回 Error 对象
const identityPayload = verifier.verifyIdentityToken(token)
if(identityPayload instanceof Error) {
    console.error(result.message)
} else {
    // WebGL 平台，包括微信、抖音等小游戏，以及 HTML5 网页游戏
    if(identityPayload.idp === IdP.WebGL) {
        // do something
    }
    // 游客登录判断
    if(identityPayload.idp === IdP.Guest) {
        // do something
    }
    // 更多 IdP 枚举可以查看源码定义 src/const.ts
}

// IdentityPayload 数据定义
interface IdentityPayload {
  /** combo_id 是世游分配的聚合用户 ID 游戏侧应当使用 combo_id 作为用户的唯一标识。*/
  combo_id: string
  /** IdP (Identity Provider) 是用户身份的提供者 */
  idp: IdP
  /**
   * external_id 是用户在外部 IdP 中的唯一标识
   *
   * 例如：
   *  - 如果用户使用世游通行证登录，那么 external_id 就是用户的世游通行证 ID。
   *  - 如果用户使用 Google Account 登录，那么 external_id 就是用户在 Google 中的账号标识。
   *  - 如果用户使用微信登录，那么 external_id 就是用户在微信中的 OpenId。
   *
   * 注意：
   * 游戏侧不应当使用 external_id 作为用户标识，但可以将 external_id 用于特定的业务逻辑。
   */
  external_id: string
  /** external_name 是用户在外部 IdP 中的名称，通常是用户的昵称 */
  external_name: string
  /**
   * weixin_session_key 是用户在微信小游戏登录时，从微信服务端获得的会话密钥 session_key。
   * 该字段在 Identity Token 中以 AES-256-GCM 加密存储，SDK 会自动解密。
   * weixin_session_key 只在 IdP 为 MinigameWeixin 时才会有值。
   */
  weixin_session_key: string
  /**
   * device_id 是用户在登录时使用的设备的唯一 ID。
   */
  device_id: string
  /**
   * distro 是游戏客户端的发行版本标识。
   * 游戏侧可将 distro 用于服务端数据埋点，以及特定的业务逻辑判断。
   */
  distro: string
  /**
   * variant 是游戏客户端的分包标识。
   * 游戏侧可将 variant 用于服务端数据埋点，以及特定的业务逻辑判断。
   * 注意：Variant 只在客户端是分包时才会有值。当客户端不是分包的情况下，variant 为空字符串。
   */
  variant: string
  /**
   * age 是根据用户的实名认证信息得到的年龄。
   *
   * 0 表示未知。
   *
   * 在某些特殊场景下，游戏侧可用 age 来自行处理防沉迷。
   *
   * 注意：age 不保证返回精确的年龄信息，仅保证用于防沉迷处理时的准确度够用。
   *
   * 例如：
   *
   * 当某个用户真实年龄为 35 岁时，age 可能返回 18，
   * 当某个用户真实年龄为 17 岁时，age 可能返回 16。
   */
  age: number
  /**
   * reg_time 是用户 ID（Combo ID）在的注册时间。Unix timestamp in seconds。
   */
  reg_time: number
}
```

## AdToken 验证

```js
// verifyAdToken 对 AdToken 进行验证
// 返回 AdPayload 数据，如果解析出错则返回 Error 对象
const adInfo = verifier.verifyAdToken(token)
if(result instanceof Error) {
    console.error(result.message)
} else {
    // got ad info: { combo_id, placement_id, impression_id }
}

// AdPayload 定义
interface AdPayload {
  /** combo_id 是世游分配的聚合用户 ID，游戏侧应当使用 combo_id 作为用户的唯一标识。*/
  combo_id: string
  /** placement_id 是广告位 ID，游戏侧用它确定发放什么样的广告激励。*/
  placement_id: string
  /** impression_id 是世游服务端创建的，标识单次广告播放的唯一 ID。*/
  impression_id: string
}
```
