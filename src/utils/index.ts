export * from "./base"
export * from "./types"
export * from "./config"
export * from "./signer"
export * from "./http"

import { createHash } from "crypto"

/** 生成一个 SessionID 以用作用户上下线的上报标记 */
export function genSessionID(comboId: string) {
  const ts = process.hrtime.bigint()
  const r = Math.random() + Math.random()
  return createHash("md5").update(`${comboId}${ts}${r}`).digest("hex").toLowerCase()
}

/** 生成一个随机id */
export function genNonceString() {
  const ts = process.hrtime.bigint()
  const r = Math.random() + Math.random()
  return createHash("md5").update(`${ts}${r}`).digest("hex").toLowerCase()
}
