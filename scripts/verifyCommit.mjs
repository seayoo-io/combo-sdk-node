// Invoked on the commit-msg git hook by simple-git-hooks.
import { readFileSync } from "fs"

// get $1 from commit-msg script
const msgPath = process.argv[2]
const msg = readFileSync(msgPath, "utf-8").trim()
const commitRE = /^(?:revert: )?(?:feat|fix|docs|style|refactor|perf|test|build|chore|debug)(?:\(.+\))?: .{1,50}/

if (!commitRE.test(msg)) {
  console.log()
  console.error(`ERROR! invalid commit message format. \n\n
      Examples: \n
      feat: add 'comments' option\n
      fix: handle events on blur\n`)
  process.exit(1)
}
