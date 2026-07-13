// يُجمّع إثبات وسائط الكتالوج (TS بمسارات @/) عبر esbuild ويشغّله على Node.
// يستخدم node:fs + fetch العام (Node 18+) — لا يمسّ package.json.
//   node scripts/run-catalog-media-proof.mjs
//   CATALOG_MEDIA_REMOTE=1 node scripts/run-catalog-media-proof.mjs
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const result = await build({
  entryPoints: [resolve(root, 'scripts/catalog-media-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  write: false,
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'catalog-media-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
