// Bundles the signup-completion proof (TS with @/ paths) via esbuild and runs it in
// node. `src/lib/authErrors.ts` is deliberately DOM-free — the offline signal is
// injected, not read from `navigator` — so the proof needs no browser shim, which is
// the point: the honesty logic is testable without a browser.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const result = await build({
  entryPoints: [resolve(root, 'scripts/signup-completion-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'signup-completion-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
// The wiring guard reads source files relative to the repo root.
process.chdir(root)
await import(pathToFileURL(file).href)
