/** ESM 消费者视角冒烟：按包名解析，校验 exports.import 分支 */
import { createRequire } from "module"
import * as sdk from "@seayoo-io/combo-sdk-node"
import jwt from "jsonwebtoken"

const require = createRequire(import.meta.url)
const { runChecks } = require("./smoke-checks.cjs")

runChecks(sdk, jwt, "ESM import on node " + process.version)
