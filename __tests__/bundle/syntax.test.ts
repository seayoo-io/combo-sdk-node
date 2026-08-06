import { describe, expect, test } from "vitest"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { join } from "path"
import { parse } from "acorn"

const distDir = fileURLToPath(new URL("../../dist/", import.meta.url))

/** engines.node 声明为 >=12，ES2019 是 Node 12 完整支持的最高语法级别 */
const ECMA_VERSION = 2019

const targets = [
  { file: "index.js", sourceType: "module" as const },
  { file: "index.cjs", sourceType: "script" as const },
]

function parseDist(file: string, sourceType: "module" | "script") {
  const code = readFileSync(join(distDir, file), "utf8")
  return parse(code, { ecmaVersion: ECMA_VERSION, sourceType, allowHashBang: true })
}

/** 递归收集 AST 中的成员属性名、标识符名与 Promise 静态方法调用 */
function collectNames(ast: unknown) {
  const props = new Set<string>()
  const idents = new Set<string>()
  const promiseStatics = new Set<string>()

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== "object") return
    const n = node as Record<string, unknown> & { type?: string }

    if (n.type === "MemberExpression" && !n.computed) {
      const prop = n.property as { type?: string; name?: string } | undefined
      const obj = n.object as { type?: string; name?: string } | undefined
      if (prop?.type === "Identifier" && prop.name) {
        props.add(prop.name)
        if (obj?.type === "Identifier" && obj.name === "Promise") promiseStatics.add(prop.name)
      }
    }
    if (n.type === "Identifier" && typeof n.name === "string") idents.add(n.name)

    for (const key of Object.keys(n)) {
      if (key === "type" || key === "start" || key === "end" || key === "loc") continue
      walk(n[key])
    }
  }

  walk(ast)
  return { props, idents, promiseStatics }
}

describe("产物语法级别", () => {
  // 语法层面的硬门禁：出现任何高于 ES2019 的语法（?. ?? 私有字段 静态块等）解析即失败
  test.each(targets)(`$file 可被 ES${ECMA_VERSION} 解析器解析`, ({ file, sourceType }) => {
    expect(() => parseDist(file, sourceType)).not.toThrow()
  })

  test("index.js 是真正的 ESM，index.cjs 是真正的 CJS", () => {
    // 反向校验：ESM 产物用 script 模式解析必须失败，否则说明格式串了
    expect(() => parseDist("index.js", "script")).toThrow()
    const cjs = readFileSync(join(distDir, "index.cjs"), "utf8")
    expect(cjs).toMatch(/require\(/)
    expect(cjs).not.toMatch(/^\s*import\s+[\w{*]/m)
  })
})

describe("产物运行时 API 兼容 Node 12", () => {
  // 这些 API 语法合法，但在 Node 12 上不存在，仅靠语法解析拦不住
  const bannedProps: Record<string, string> = {
    at: "Array.prototype.at 需要 Node 16.6",
    hasOwn: "Object.hasOwn 需要 Node 16.9",
    replaceAll: "String.prototype.replaceAll 需要 Node 15",
  }
  const bannedIdents: Record<string, string> = {
    structuredClone: "需要 Node 17",
    AbortController: "需要 Node 15",
    WeakRef: "需要 Node 14.6",
    FinalizationRegistry: "需要 Node 14.6",
  }
  const bannedPromiseStatics: Record<string, string> = {
    any: "Promise.any 需要 Node 15",
    allSettled: "Promise.allSettled 需要 Node 12.9，低于 engines 声明的 12.0",
  }

  test.each(targets)("$file 未使用 Node 12 之后才有的 API", ({ file, sourceType }) => {
    const { props, idents, promiseStatics } = collectNames(parseDist(file, sourceType))
    const found: string[] = []
    for (const [name, reason] of Object.entries(bannedProps)) {
      if (props.has(name)) found.push(`.${name}() — ${reason}`)
    }
    for (const [name, reason] of Object.entries(bannedIdents)) {
      if (idents.has(name)) found.push(`${name} — ${reason}`)
    }
    for (const [name, reason] of Object.entries(bannedPromiseStatics)) {
      if (promiseStatics.has(name)) found.push(`Promise.${name} — ${reason}`)
    }
    expect(found).toEqual([])
  })

  test.each(targets)("$file 未使用 node: 协议前缀导入", ({ file }) => {
    // node: 前缀在 Node 14.18 / 16 之前不被识别
    const code = readFileSync(join(distDir, file), "utf8")
    expect(code).not.toMatch(/["']node:/)
  })
})
