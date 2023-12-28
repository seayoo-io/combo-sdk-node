import type { RequestGlobalConfig } from "./config"
import type { MaybePromise, TypeGuard, TypeGuardFn } from "../../utils"

export type IBaseRequestBody = Blob | ArrayBuffer | FormData | URLSearchParams | string

/** 通用网络请求工具的基本配置 */
export interface IBaseRequestOptions {
  /** 网络请求方法，默认 GET */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD"

  /** 自定义 header 头 */
  headers?: Record<string, string>

  /** url 参数 */
  params?: Record<string, unknown>

  /** 发送的 body 内容，method 为 GET / HEAD / DELETE 时无效 */
  body?: IBaseRequestBody | object | unknown[]

  /** 请求超时设置，单位 ms */
  timeout?: number
}

/** 重试请求的配置参数，暂不支持全局配置 */
export interface IRetryRequestOptions {
  /** 错误时重试的次数，不能超过 10 次 */
  maxRetry?: number

  /** 重试策略：默认 network，可选 status */
  retryResolve?: ERetryResolve

  /** 两次重试的间隔，如果设置时间，则单位 ms，或者设置函数返回等待的时间（单位ms），默认 1000，最小 100，函数参数 retryIndex 从 1 开始 */
  retryInterval?: number | ((retryIndex: number) => number)
}

export interface IOtherRequestOptions {
  /** 如果设置为 false 则关闭通用提示，设置函数可以自定义提示，函数返回 falsly 则不提示 */
  message?: false | ((result: IResponseResult, method: string, url: string, defaultMessage: string) => string | false)

  /** 自定义 ajax response 解析策略 */
  responseRule?: IResponseRule
}

/** 对外工具接口的请求配置 */
export type IRequestOptions = IBaseRequestOptions & IRetryRequestOptions & IOtherRequestOptions

/** 全局默认配置 */
export type IRequestGlobalConfig = {
  /**
   * 设置全局 url 基础路径，必须要以 / 开头 或者完整的 api 地址，比如 /api 或 https://api.server.com/path
   */
  baseURL?: string
  /** 用于 get 请求的缓存时长，单位 ms，建议不小于 100 */
  cacheTTL?: number
  /** 全局 request 处理函数，headers 和 params 为引用型数据可直接修改，如果返回字符串，则替换原来的 url 进行请求 */
  requestTransformer?:
    | null
    | ((request: {
        headers: Record<string, string>
        params: Record<string, string>
        method: string
        url: string
        body?: IBaseRequestBody
      }) => MaybePromise<void | string>)
  /** 全局错误处理函数，仅仅在 statusCode 错误时触发 */
  errorHandler?: null | ((status: number, method: string, url: string) => void)
  /** 全局响应处理函数，任意状态都会触发 */
  responseHandler?: null | ((result: IResponseResult, method: string, url: string) => void)
  /** 全局消息提示函数 */
  messageHandler?: null | ((isError: boolean, message: string) => void)
  /** 全局日志打印函数 */
  logHandler?: null | ((data: IRequestLog) => void)
} & Pick<IBaseRequestOptions, "timeout"> &
  IRetryRequestOptions &
  IOtherRequestOptions

/**
 * 失败重试策略：
 * network 仅仅网络错误时重试；
 * status  当网络错误或者 http状态码错误时重试；
 */
export type ERetryResolve = "network" | "status"

/** 响应内容解析规则配置 */
export interface IResponseRule {
  /** http失败时 (status <200 || status >= 400) 解析策略 */
  failed: {
    /** 解析方式，如果解析方式为 json，则可以进一步指定错误消息字段 */
    resolve: "json" | "body"
    /** 解析错误消息的状态字段，仅在 resolve 为 json 时有效，有值的话会替换 response 的 code */
    statusField?: string
    /** 解析错误消息的字段，仅在 resolve 为 json 时有效 */
    messageField?: string | string[]
  }
  /** http成功时 (200 <= status < 400) 解析策略  */
  ok: {
    /**
     * http成功响应时，响应内容解析策略
     *
     * - json
     *
     * 此时 response body 被格式化为 json，并根据后续配置进一步读取自定义状态和数据字段等信息
     *
     * - body
     *
     * 此时 reponse body 被格式化为 json 并作为接口返回的数据使用，如果格式化失败，则返回 body 本身的字符串
     */
    resolve: "json" | "body"
    /** 表示自定义状态的字段名 */
    statusField?: string
    /** 自定义状态成功时的取值 */
    statusOKValue?: string
    /** 数据字段名，仅在自定义状态成功时有效 */
    dataField?: string
    /** 消息字段名，仅在自定义状态失败时有效 */
    messageField?: string | string[]
    /** 忽略特定的消息内容，如果可能是多个值，则设置为数组 */
    ignoreMessage?: string | string[]
  }
}

/** 通用网络请求工具返回的内容 */
export interface IRequestBaseResponse {
  /** 最终发送请求的方法 */
  method: string
  /** 最终发送请求的 url(带有params) */
  url: string
  /** 状态码，如果是网络错误或其他异常，返回负数状态码 */
  status: number
  /** 状态描述信息 */
  statusText: string
  /** 响应头，如果网络错误，则返回空对象 */
  headers?: Record<string, string | undefined>
  /** 响应体，如果网络错误或 204/202，则返回空或错误信息 */
  body: string
}

/** 对外工具接口的返回内容 */
export interface IResponseResult<T = unknown> {
  /** 标记响应是否成功，包括检测 http statusCode 以及 自定义 Response rule 中的规则 */
  ok: boolean
  /** 响应的 http 状态码，异常情况返回负数（仅代表异常，具体数值无含义） */
  status: number
  /** 响应返回的错误码或者自定义响应码 */
  code: string
  /** 从响应体中分析出的提示信息 */
  message: string
  /** 响应的 headers 信息 */
  headers: Record<string, string | undefined>
  /**
   * 成功时返回的数据，如果网络错误/服务器没有响应内容（比如 http status 202/204）/类型守卫检查失败则是 null
   *
   * 如果需要检查返回的内容，可以访问 body 属性
   */
  data: T
}

export type ResponseWithType<T> = Promise<IResponseResult<T | null>>
export type ResponseWithoutType = Promise<IResponseResult>

export interface NetRequestCoreFn {
  (url: string, config: RequestGlobalConfig, options?: IBaseRequestOptions): Promise<IRequestBaseResponse>
}

export interface NetRequestAgent {
  (url: string, config: RequestGlobalConfig, options?: IRequestOptions): Promise<IResponseResult>
}

interface LogBase {
  method: string
  url: string
}
interface RetryCount extends LogBase {
  retry: number
  maxRetry: number
  message: string
}

interface LogPrepear extends RetryCount {
  type: "prepear"
  /** 请求的参数 */
  options?: IRequestOptions
  /** 自定义追加的请求 header 头 */
  headers?: Record<string, string>
}

interface LogReady extends LogBase {
  type: "ready"
  /** 实际发送的请求 header 头 */
  headers: Record<string, string>
  /** 实际发送的数据 */
  body?: IBaseRequestBody
  /** 实际发送设定的 timeout */
  timeout?: number
}

interface LogFinished extends RetryCount {
  type: "finished"
  /** 请求消耗的时间，单位 ms */
  cost: number
  /** 请求响应的内容 */
  response: IRequestBaseResponse
  /** 请求响应的 header */
  headers?: Record<string, string | undefined>
}

export type IRequestLog = LogPrepear | LogReady | LogFinished

export type TypeGuardParam<T> = TypeGuard<T> | TypeGuardFn<T>
