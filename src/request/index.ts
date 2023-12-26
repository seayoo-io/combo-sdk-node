import { nodeRequest } from "./inc/request"
import { NetRequestHandler } from "./inc/main"
import type { IRequestGlobalConfig } from "./inc/type"

export type * from "./inc/type"
export function NetRequest(config?: IRequestGlobalConfig) {
  return new NetRequestHandler(nodeRequest, config)
}
