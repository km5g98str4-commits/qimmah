// Bundles the TS proof with @/ aliases via esbuild, then runs it in-process.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync, rmSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const outfile = resolve(here, '.proof.bundle.mjs')

await build({
  entryPoints: [resolve(here, 'logic-audit-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': '{}' },
  logLevel: 'warning',
})

try {
  await import(pathToFileURL(outfile).href)
} finally {
  try { rmSync(outfile) } catch { /* ignore */ }
}
