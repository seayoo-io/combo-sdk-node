/** CJS 消费者视角冒烟：按包名解析，校验 exports.require 分支 */
const { runChecks } = require("./smoke-checks.cjs")
const sdk = require("@seayoo-io/combo-sdk-node")
const jwt = require("jsonwebtoken")

runChecks(sdk, jwt, "CJS require() on node " + process.version)
