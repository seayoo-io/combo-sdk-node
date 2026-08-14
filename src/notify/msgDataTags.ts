import { isObject } from "../utils"

/** DataTag 表示单条数据标签，即某个数据实体的某个标签 */
export interface DataTag {
  /** 标签所属实体的类型。例如 `role` 代表实体类型为游戏角色 */
  entity_type: string
  /** 标签所属实体的唯一标识 */
  entity_id: string
  /** 标签名称 */
  tag_name: string
  /** 标签值 */
  tag_value: string
}

/** DataTagsNotification 是数据标签通知的数据结构，包含一批数据标签 */
export interface DataTagsNotification {
  /** 一批数据标签，数组长度不定 */
  tags: DataTag[]
}

function isDataTag(data: unknown): data is DataTag {
  return (
    isObject(data) &&
    "entity_type" in data &&
    "entity_id" in data &&
    "tag_name" in data &&
    "tag_value" in data &&
    typeof data.entity_type === "string" &&
    typeof data.entity_id === "string" &&
    typeof data.tag_name === "string" &&
    typeof data.tag_value === "string" &&
    !!data.entity_type &&
    !!data.entity_id &&
    !!data.tag_name
  )
}

export function isDataTagsPayload(data: unknown): data is DataTagsNotification {
  // tags 允许为空数组：世游服务端推送空批次时，游戏侧按无标签处理即可，不应判为格式错误
  return isObject(data) && "tags" in data && Array.isArray(data.tags) && data.tags.every(isDataTag)
}
