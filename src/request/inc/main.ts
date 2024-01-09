import { Cache } from "./cache"
import { checkTypedDataResult } from "./guard"
import { RequestGlobalConfig } from "./config"
import type { TypeGuardParam, IRequestOptions, IRequestGlobalConfig, IResponseResult, NetRequestAgent } from "./type"

type RequestBody = NonNullable<IRequestOptions["body"]>

/** 工具函数主类 */
export class NetRequestHandler {
  private agent: NetRequestAgent
  private config: RequestGlobalConfig
  private cache: Cache<IResponseResult>
  constructor(agent: NetRequestAgent, config?: IRequestGlobalConfig) {
    this.config = new RequestGlobalConfig(config)
    this.agent = agent
    this.cache = new Cache<IResponseResult>(this.config.get("cacheTTL"))
    // bind this
    this.setConfig = this.setConfig.bind(this)
    this.getConfig = this.getConfig.bind(this)
    this.get = this.get.bind(this)
    this.post = this.post.bind(this)
    this.del = this.del.bind(this)
    this.patch = this.patch.bind(this)
    this.put = this.put.bind(this)
    this.head = this.head.bind(this)
  }

  /**
   * 执行网络请求
   */
  private async exec(url: string, options?: IRequestOptions) {
    return await this.agent(url, this.config, options)
  }

  /**
   * 检查响应的数据类型
   */
  private async guard<T>(
    url: string,
    result: IResponseResult,
    typeGard: TypeGuardParam<T> | null
  ): Promise<IResponseResult<T | null | unknown>> {
    return checkTypedDataResult(url, result, this.config, typeGard)
  }

  /**
   * 修改默认请求配置: baesURL / timeout / credentials / errorHandler / messageHandler / responseHandler / logHandler / responseRule
   */
  setConfig(config: IRequestGlobalConfig) {
    this.config.set(config)
    this.cache.updateTTL(this.config.get("cacheTTL"))
  }

  /**
   * 读取默认的请求配置
   */
  getConfig<T extends keyof IRequestGlobalConfig>(key: T) {
    return this.config.get(key)
  }

  /**
   * 发送一个 HEAD 请求，并且不处理响应 body
   */
  async head(url: string, options?: IRequestOptions): Promise<IResponseResult> {
    const ops = Object.assign({}, options || null)
    ops.method = "HEAD"
    return this.guard(url, await this.exec(url, ops), null)
  }

  /**
   * 发送一个 GET 请求，请求自带 500ms 缓冲控制以应对并发场景
   */
  async get(url: string): Promise<IResponseResult>
  async get(url: string, typeGard: null, options?: IRequestOptions): Promise<IResponseResult>
  async get<T>(url: string, typeGard: TypeGuardParam<T>, options?: IRequestOptions): Promise<IResponseResult<T | null>>
  async get<T>(url: string, typeGard?: TypeGuardParam<T> | null, options?: IRequestOptions) {
    const ops = Object.assign({}, options || null)
    ops.method = "GET"
    const cacheKey = this.cache.getKey(url, ops.params)
    const cache = this.cache.get(cacheKey)
    if (cache) {
      return this.guard<T>(url, await cache, typeGard || null)
    }
    const res = this.exec(url, ops)
    this.cache.set(cacheKey, res)
    return this.guard<T>(url, await res, typeGard || null)
  }

  /**
   * 发送一个 POST 请求，可选 typeGuard 用于检查数据类型
   */
  async post(url: string, data: RequestBody): Promise<IResponseResult>
  async post(url: string, data: RequestBody, typeGard: null, options?: IRequestOptions): Promise<IResponseResult>
  async post<T>(url: string, data: RequestBody, typeGard: TypeGuardParam<T>, options?: IRequestOptions): Promise<IResponseResult<T | null>>
  async post<T>(url: string, data: RequestBody, typeGard?: TypeGuardParam<T> | null, options?: IRequestOptions) {
    const ops = Object.assign({}, options || null)
    ops.method = "POST"
    ops.body = data
    return this.guard<T>(url, await this.exec(url, ops), typeGard || null)
  }

  /**
   * 发送一个 DELETE 请求，可选 typeGuard 用于检查数据类型
   */
  async del(url: string): Promise<IResponseResult>
  async del(url: string, typeGard: null, options?: IRequestOptions): Promise<IResponseResult>
  async del<T>(url: string, typeGard: TypeGuardParam<T>, options?: IRequestOptions): Promise<IResponseResult<T | null>>
  async del<T>(url: string, typeGard?: TypeGuardParam<T> | null, options?: IRequestOptions) {
    const ops = Object.assign({}, options || null)
    ops.method = "DELETE"
    return this.guard<T>(url, await this.exec(url, ops), typeGard || null)
  }

  /**
   * 发送一个 PUT 请求，可选 typeGuard 用于检查数据类型
   */
  async put(url: string, data: RequestBody): Promise<IResponseResult>
  async put(url: string, data: RequestBody, typeGard: null, options?: IRequestOptions): Promise<IResponseResult>
  async put<T>(url: string, data: RequestBody, typeGard: TypeGuardParam<T>, options?: IRequestOptions): Promise<IResponseResult<T | null>>
  async put<T>(url: string, data: RequestBody, typeGard?: TypeGuardParam<T> | null, options?: IRequestOptions) {
    const ops = Object.assign({}, options || null)
    ops.method = "PUT"
    ops.body = data
    return this.guard<T>(url, await this.exec(url, ops), typeGard || null)
  }

  /**
   * 发送一个 PATCH 请求，可选 typeGuard 用于检查数据类型
   */
  async patch(url: string, data: RequestBody): Promise<IResponseResult>
  async patch(url: string, data: RequestBody, typeGard: null, options?: IRequestOptions): Promise<IResponseResult>
  async patch<T>(url: string, data: RequestBody, typeGard: TypeGuardParam<T>, options?: IRequestOptions): Promise<IResponseResult<T | null>>
  async patch<T>(url: string, data: RequestBody, typeGard?: TypeGuardParam<T> | null, options?: IRequestOptions) {
    const ops = Object.assign({}, options || null)
    ops.method = "PATCH"
    ops.body = data
    return this.guard<T>(url, await this.exec(url, ops), typeGard || null)
  }
}
