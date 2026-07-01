// يُجمّع إثبات P8 A2 (TS بمسارات @/) عبر esbuild ثم يشغّله داخل العملية.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { rmSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const outfile = resolve(here, '.p8a2-off-proof.bundle.mjs')

await build({
  entryPoints: [resolve(here, 'p8a2-off-proof.ts')],
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
