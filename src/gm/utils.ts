import { IdempotencyKeyStoreHelper } from "./types"
import type { Redis } from "ioredis"

export function verifyStoreHelper(storeHelper: unknown) {
  if (storeHelper) {
    if (typeof storeHelper !== "object" || !("setXX" in storeHelper) || !("setNX" in storeHelper)) {
      throw new Error("store helper should be { setXX, setNX }")
    }
    if (typeof storeHelper.setNX !== "function" || storeHelper.setNX.length !== 2) {
      throw new Error("store.setNX should be (key, value) => string")
    }
    if (typeof storeHelper.setXX !== "function" || storeHelper.setXX.length !== 2) {
      throw new Error("store.setXX should be (key, value) => void")
    }
  }
}

export function toString(data: object): string {
  return JSON.stringify(data)
}

/** 提供基于内存的 store helper，仅供本地调试使用，不支持 ttl 超时功能 */
export class MemoryIdempotencyStore implements IdempotencyKeyStoreHelper {
  mc: Record<string, string>
  constructor() {
    this.mc = {}
  }

  async setNX(key: string, value: string) {
    const r = this.mc[key]
    if (!r) {
      this.mc[key] = value
      return ""
    }
    return r
  }

  async setXX(key: string, value: string) {
    const r = this.mc[key]
    if (r) {
      this.mc[key] = value
    }
  }
}

/**
 * 基于 ioredis 的 store helper,
 *
 * 需要 Redis >= 7.0，见 https://redis.io/docs/latest/commands/set/
 */
export class RedisIdempotencyStore implements IdempotencyKeyStoreHelper {
  client: Redis
  ttl: number
  prefix: string

  constructor(options: {
    /** 超时设定，单位秒，推荐不低于24小时 */
    ttl?: number
    /** ioredis 客户端 */
    client: Redis
    /** key 前缀 */
    prefix?: string
  }) {
    this.client = options.client
    this.ttl = Math.max(24 * 3600, options.ttl ?? 0)
    this.prefix = options.prefix || ""
  }

  async setNX(key: string, value: string) {
    return (await this.client.set(`${this.prefix}${key}`, value, "EX", this.ttl, "NX", "GET")) || ""
  }
  async setXX(key: string, value: string) {
    await this.client.set(`${this.prefix}${key}`, value, "EX", this.ttl, "XX")
  }
}
