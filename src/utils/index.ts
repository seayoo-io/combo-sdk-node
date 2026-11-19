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

/**
 * 检查一个值是否为 Combo ID 的格式。
 *
 * 仅做格式检查，不检查该 ID 是否真实存在。
 */
export function mayBeComboId(id: unknown): id is string {
  if (typeof id !== "string") {
    return false
  }
  const m = id.match(/^9?[15](\d{2})(\d{2})(\d{2})(\d{5})(\d{4})$/)
  if (!m) {
    return false
  }
  const year = 2000 + Number(m[1])
  const month = Number(m[2])
  const date = Number(m[3])
  const seconds = Number(m[4])
  const sn = Number(m[5])
  if (year <= 2020 || seconds >= 24 * 3600 || sn === 0) {
    return false
  }
  // 时间部分按 UTC 解释，避免宿主时区影响；日期溢出（如 2 月 30 日）会被 Date 规范化为下月，比对即可发现
  const d = new Date(Date.UTC(year, month - 1, date))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === date
}
