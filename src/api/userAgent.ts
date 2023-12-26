import { readFileSync } from "node:fs"
import { platform, arch } from "node:os"
import { resolve } from "node:path"
import { SDKName } from "../const"
const packageJson = readFileSync(resolve(__dirname, "../../package.json"), "utf8")
const { version } = JSON.parse(packageJson)
const nodeVersion = process.version

export function getUserAgent(game: string) {
  return `${SDKName}/${version} game/${game} nodejs/${nodeVersion} os/${platform()} arch/${arch()}`
}
