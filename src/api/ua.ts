import { platform, arch } from "os"
import { SDKName, SDKVersion } from "../const"

export function getUserAgent(game: string) {
  return `${SDKName}/${SDKVersion} game/${game} node/${process.version} os/${platform()} arch/${arch()}`
}
