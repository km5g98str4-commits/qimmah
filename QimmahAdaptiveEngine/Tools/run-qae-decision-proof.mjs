// Runner for qae-decision-proof.ts — pure domain, no src/ imports needed;
// esbuild used for TS execution consistency with the repo's proof pattern.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.env.QAE_ROOT = resolve(__dirname, '..')

const result = await build({
  entryPoints: [resolve(__dirname, 'qae-decision-proof.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
})

const outDir = mkdtempSync(join(tmpdir(), 'qae-decision-'))
const bundlePath = join(outDir, 'qae-decision-proof.bundle.cjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
await import(pathToFileURL(bundlePath).href)
