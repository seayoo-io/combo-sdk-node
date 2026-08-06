import { defineConfig } from "vitest/config"
import { fileURLToPath } from "url"

const shared = {
  environment: "node" as const,
  onConsoleLog(log: string, type: "stdout" | "stderr"): false | void {
    if (type === "stderr") return false
  },
}

const behaviorTests = ["__tests__/*.test.ts"]

export default defineConfig({
  test: {
    projects: [
      {
        test: { ...shared, name: "src", include: behaviorTests },
      },
      {
        // 把公开入口重定向到打包产物，让同一套行为用例复跑一遍 dist
        resolve: {
          alias: [{ find: /^\.\.\/src$/, replacement: fileURLToPath(new URL("dist/index.js", import.meta.url)) }],
        },
        // 与 src project 错开端口，两者可能并行执行
        test: { ...shared, name: "dist", include: behaviorTests, env: { GAME_MOCK_PORT: "6210" } },
      },
      {
        test: { ...shared, name: "contract", include: ["__tests__/bundle/*.test.ts"] },
      },
    ],
  },
})
