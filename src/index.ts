export { ApiClient } from "./api"
export type { ApiClientConfig } from "./api"
export type { CreateOrderOption, OrderMetaData, CreateOrderResponse } from "./api/types"

export { TokenVerifier } from "./verify"
export type { IdentityPayload } from "./verify/id"
export type { AdPayload } from "./verify/ads"

export {
  getNotificationHandler,
  getNotificationHandlerForExpress,
  getNotificationHandlerForKoa,
  getNotificationMiddlewareForExpress,
  getNotificationMiddlewareForKoa,
} from "./notify"
export { NotificationType } from "./notify/types"
export type { NotificationHandler } from "./notify/types"

export type { SDKBaseConfig } from "./utils"
export { Endpoint, Platform, IdP } from "./const"
export { genSessionID, parseAuthorizationHeader, calcAuthorizationHeader, checkHttpAuthInfo } from "./utils"
