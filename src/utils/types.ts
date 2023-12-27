export type MaybePromise<T> = T extends Promise<infer P> ? P | T : T | Promise<T>
export type SomeRequired<T, K extends keyof T> = Omit<T, K> & { [F in K]-?: T[F] }
export type TypeGuardFn<T> = (data: unknown) => data is T
export type TypeGuard<T> = {
  guard: TypeGuardFn<T>
  message: string
}

export function getTypeGuard<T>(typeGuard: TypeGuardFn<T> | TypeGuard<T>, defaultMessage: string = "数据未能正确识别"): TypeGuard<T> {
  if (typeof typeGuard === "function") {
    return {
      guard: typeGuard,
      message: defaultMessage,
    }
  }
  return {
    guard: typeGuard.guard,
    message: typeGuard.message || defaultMessage,
  }
}

/**
 * 获取一个指定类型数据的 list 守卫函数
 */
export function typedArrayGuard<T>(fn: TypeGuardFn<T>): TypeGuardFn<T[]> {
  return function (data: unknown): data is T[] {
    return Array.isArray(data) && data.every((item) => fn(item))
  }
}

/**
 * 获取一个指定类型数据的 map 守卫函数，需要是一个纯对象，否则校验将失败
 */
export function typedMapGuard<K extends string | number | symbol, T>(fn: TypeGuardFn<T>): TypeGuardFn<Record<K, T>> {
  return function (data: unknown): data is Record<K, T> {
    return (
      typeof data === "object" &&
      data !== null &&
      Object.keys(data).every((key) => {
        return Object.prototype.hasOwnProperty.call(data, key) && fn(data[key as keyof typeof data])
      })
    )
  }
}
