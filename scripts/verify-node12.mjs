/**
 * 在真实 Node 12 运行时中冒烟验证发布产物。
 *
 * 现代 Node 的 cjs-module-lexer 能力更强，某些 CJS interop 问题只在 Node 12 上暴露，
 * 因此这一层无法被跑在现代 Node 上的单元测试替代。
 */
import { execFileSync, spawnSync } from "child_process"
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { fileURLToPath } from "url"

const NODE_IMAGE = "node:12-alpine"
const repoRoot = fileURLToPath(new URL("..", import.meta.url))
const scriptsDir = join(repoRoot, "scripts")

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: "utf8", ...options })
  if (result.error) throw result.error
  return result
}

// docker 缺失时 spawnSync 走 error 而非非零退出码，两种情况都要给出提示
const docker = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { encoding: "utf8" })
if (docker.error || docker.status !== 0) {
  console.error("需要可用的 docker 才能运行 Node 12 验证，请先安装并启动 docker。")
  process.exit(1)
}

const workDir = mkdtempSync(join(tmpdir(), "combo-node12-"))

try {
  console.log("打包发布产物...")
  execFileSync("npm", ["pack", "--pack-destination", workDir], { cwd: repoRoot, stdio: "pipe", shell: true })

  const tarball = readdirSync(workDir).find(f => f.endsWith(".tgz"))
  if (!tarball) throw new Error("npm pack 未产出 tarball")
  console.log(`已打包 ${tarball}`)

  for (const file of ["smoke.cjs", "smoke.mjs", "smoke-checks.cjs"]) {
    copyFileSync(join(scriptsDir, file), join(workDir, file))
  }

  const inContainer = [
    "cp /work/*.tgz /work/smoke-checks.cjs /work/smoke.cjs /work/smoke.mjs /app/",
    "npm init -y >/dev/null 2>&1",
    "npm i ./*.tgz --no-audit --no-fund --loglevel=error >/dev/null 2>&1",
    'echo "node $(node --version)"',
    "node smoke.cjs",
    "node smoke.mjs",
  ].join(" && ")

  console.log(`在 ${NODE_IMAGE} 中运行冒烟检查...`)
  const result = run("docker", ["run", "--rm", "-v", `${workDir}:/work`, "-w", "/app", NODE_IMAGE, "sh", "-c", inContainer], {
    stdio: "inherit",
  })

  if (result.status !== 0) {
    console.error(`\nNode 12 验证失败（退出码 ${result.status}）`)
    process.exit(result.status ?? 1)
  }
  console.log("\nNode 12 验证通过")
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
