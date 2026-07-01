// يجمع إثبات الأوسمة (TS) عبر esbuild مع حلّ الاسم المستعار @/، ويشغّله فوق
// localStorage مُحاكى في Node. لا يلمس التطبيق — أداة إثبات فقط.

import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// shim: window.localStorage + performance، تُحقن قبل كود الحزمة.
const banner = `
const __store = new Map();
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/achievements-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  logLevel: 'warning',
})

const out = result.outputFiles[0].text
const dir = mkdtempSync(join(tmpdir(), 'ach-proof-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, out)
await import(pathToFileURL(file).href)
