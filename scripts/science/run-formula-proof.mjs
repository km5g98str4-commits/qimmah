// Direct Node runner; bundles the TypeScript proof and @/ aliases without package.json changes.
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
let build
try {
  ;({ build } = createRequire(resolve(root, 'package.json'))('esbuild'))
} catch {
  // A fresh worktree may intentionally have no node_modules. Resolve the same
  // lockfile-installed tool from the repository that owns the shared .git dir.
  const commonGitDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim()
  ;({ build } = createRequire(resolve(commonGitDir, '../package.json'))('esbuild'))
}
const result = await build({
  entryPoints: [resolve(root, 'scripts/science/formula-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'qimmah-formula-proof-'))
const output = join(dir, 'proof.mjs')
writeFileSync(output, result.outputFiles[0].text)
await import(pathToFileURL(output).href)
