// Runner for scripts/qae-shadow-proof.ts — bundles the APP side (@/ + @qae/).
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const result = await build({
  entryPoints: [resolve(__dirname, 'qae-shadow-proof.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  write: false,
  logLevel: 'silent',
  loader: { '.json': 'json' },
  alias: {
    '@': resolve(root, 'src'),
    '@qae': resolve(root, 'QimmahAdaptiveEngine'),
  },
})

const outDir = mkdtempSync(join(tmpdir(), 'qae-shadow-'))
const bundlePath = join(outDir, 'qae-shadow-proof.bundle.cjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
await import(pathToFileURL(bundlePath).href)
