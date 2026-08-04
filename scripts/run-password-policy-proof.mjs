// Bundles the password-policy proof (pure TS, @/ paths) via esbuild and runs it
// in node. evaluatePassword has no browser deps, so no shim is needed.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const result = await build({
  entryPoints: [resolve(root, 'scripts/password-policy-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'password-policy-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
