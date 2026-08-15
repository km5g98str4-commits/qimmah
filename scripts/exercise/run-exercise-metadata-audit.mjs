// Bundles the exercise metadata audit (TS with @/ paths) via esbuild and runs it in Node.
// Reports only — never mutates catalog data. Run: npm run audit:exercise-metadata
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const result = await build({
  entryPoints: [resolve(root, 'scripts/exercise/exercise-metadata-audit.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
    __OUT_DIR__: JSON.stringify(root),
  },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'exercise-metadata-audit-'))
const file = join(dir, 'audit.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
