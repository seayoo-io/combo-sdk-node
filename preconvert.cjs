const fs = require("fs")
const pkg = require("./package.json")
const constFile = fs.readFileSync("./src/const.ts").toString()
const newFile = constFile.replace(/const SDKVersion = ".*"/g, `const SDKVersion = "${pkg.version}"`)
fs.writeFileSync("./src/const.ts", newFile)