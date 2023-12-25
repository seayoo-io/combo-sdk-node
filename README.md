# Combo SDK for Node.js

`combo-sdk-node` 是世游核心系统 (Combo) 为 Node.js 提供的 SDK。

提供以下服务端功能，供游戏侧使用：

- 请求 Server REST API 并解析响应
- 接收 Server Notifications 并回复响应
- 验证世游服务端签发的 Identity Token

`combo-sdk-node` 会将 API 的请求响应结构、签名计算与签名验证、HTTP 状态码等实现细节封装起来，提供 Node.js API，降低游戏侧接入世游系统时出错的可能性，提高接入的速度。
