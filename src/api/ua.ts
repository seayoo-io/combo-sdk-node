import { platform, arch } from "node:os"
import { SDKName, SDKVersion } from "../const"

export function getUserAgent(game: string) {
  return `${SDKName}/${SDKVersion} game/${game} nodejs/${process.version} os/${platform()} arch/${arch()}`
}
