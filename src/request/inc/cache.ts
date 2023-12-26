interface ICacheItem<T> {
  ttl: number
  res: Promise<T>
}

/** 为 get 请求并发而设计的缓冲工具 */
export class Cache<T = unknown> {
  private ttl: number
  private cache: Record<string, ICacheItem<T>>
  constructor(ttl: number = 500) {
    this.cache = {}
    this.ttl = Math.max(ttl, 0)
  }

  getKey(url: string, param?: Record<string, unknown>) {
    const p = Object.keys(param || {})
      .sort()
      .map((key) => `${key}#${param?.[key]}`)
    return url + p.join(",")
  }

  updateTTL(ttl: number) {
    this.ttl = Math.max(ttl, 0)
  }

  get(key: string): Promise<T> | null {
    if (this.ttl === 0) {
      return null
    }
    const c = this.cache[key]
    if (!c) {
      return null
    }
    if (c.ttl < Date.now()) {
      delete this.cache[key]
      return null
    }
    return c.res
  }

  set(key: string, action: Promise<T>) {
    if (this.ttl === 0) {
      return
    }
    this.cache[key] = {
      ttl: Date.now() + this.ttl,
      res: action,
    }
  }
}
