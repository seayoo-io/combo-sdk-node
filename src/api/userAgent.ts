import { existsSync, readFileSync } from "node:fs"
import { platform, arch } from "node:os"
import { resolve } from "node:path"
import { SDKName } from "../const"

const pkg = resolve(__dirname, "../package.json")
const pkgString = existsSync(pkg) ? readFileSync(pkg, "utf8") : JSON.stringify({ version: "0.0.0" })
const pkgJson = JSON.parse(pkgString)
const version = pkgJson && typeof pkgJson === "object" && "version" in pkgJson ? `${pkgJson.version}` : "0.0.0"
const nodeVersion = process.version

export function getUserAgent(game: string) {
  return `${SDKName}/${version} game/${game} nodejs/${nodeVersion} os/${platform()} arch/${arch()}`
}
