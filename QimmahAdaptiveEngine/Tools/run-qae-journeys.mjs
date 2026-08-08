// Runner for qae-journeys.ts — pure QAE domain + content JSON; no src/ imports.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.env.QAE_ROOT = resolve(__dirname, '..')

const result = await build({
  entryPoints: [resolve(__dirname, 'qae-journeys.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
})

const outDir = mkdtempSync(join(tmpdir(), 'qae-journeys-'))
const bundlePath = join(outDir, 'qae-journeys.bundle.cjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
await import(pathToFileURL(bundlePath).href)
