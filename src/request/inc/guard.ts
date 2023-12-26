import { getTypeGuard, isEmpty } from "../../utils"
import type { IResponseResult, TypeGuardParam } from "./type"
import type { RequestGlobalConfig } from "./config"

export function checkTypedDataResult<T>(
  url: string,
  result: IResponseResult,
  config: RequestGlobalConfig,
  typeGard: TypeGuardParam<T> | null
): IResponseResult<T | null | unknown> {
  if (result.ok && !isEmpty(result.data) && typeGard) {
    const guard = getTypeGuard(typeGard, "响应数据未能正确识别")
    if (guard.guard(result.data)) {
      return <IResponseResult<T>>result
    }
    console.error("ResponseCheckFaild", url, result.data)
    config.showMessage(true, `${url} ${guard.message}`)
    result.data = null
    return <IResponseResult<null>>result
  }
  return result
}
