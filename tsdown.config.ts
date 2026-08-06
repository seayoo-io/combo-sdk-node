import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  // Node 12 完整支持 ES2019 语法，保证产物可在 engines.node >= 12 环境运行
  target: "es2019",
  // 这些集成仅以 devDependencies 提供类型，需显式外部化，否则声明文件会内联其完整类型
  external: ["ioredis", "koa", "express"],
  dts: true,
  clean: true,
  sourcemap: false,
  // 沿用历史产物命名 index.js/index.cjs/index.d.ts，保持 package.json 发布契约不变
  outExtensions({ format }) {
    return format === "es" ? { js: ".js", dts: ".d.ts" } : { js: ".cjs", dts: ".d.cts" }
  },
})
