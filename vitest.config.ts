import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    onConsoleLog(log: string, type: "stdout" | "stderr"): false | void {
      // if (type === "stderr") return false
    },
  },
})
