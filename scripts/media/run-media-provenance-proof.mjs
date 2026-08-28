// يحزم إثبات نَسَب وسائط التمارين (TS بمسارات @/) عبر esbuild ويشغّله في Node — بلا متصفّح.
// التشغيل: npm run test:media-provenance
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const result = await build({
  entryPoints: [resolve(root, 'scripts/media/media-provenance-proof.ts')],
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

const dir = mkdtempSync(join(tmpdir(), 'media-provenance-proof-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
