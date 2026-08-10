// Runner for Tests/training/emit-prescription-metadata.ts — pure domain; repo-standard
// esbuild pattern.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.env.QAE_ROOT = resolve(__dirname, '..')

const result = await build({
  entryPoints: [resolve(__dirname, 'emit-prescription-metadata.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
})

const outDir = mkdtempSync(join(tmpdir(), 'emit-prescription-metadata-'))
const bundlePath = join(outDir, 'emit-prescription-metadata-proof.bundle.cjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
await import(pathToFileURL(bundlePath).href)
