// Runner for extract-legacy-bank.ts — esbuild with @→src (repo-standard pattern).
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')
process.env.QAE_ROOT = resolve(__dirname, '..')
process.env.REPO_ROOT = root

const banner = `
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {} };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(__dirname, 'extract-legacy-bank.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  logLevel: 'silent',
})

const outDir = mkdtempSync(join(tmpdir(), 'qae-extract-'))
const bundlePath = join(outDir, 'extract.bundle.mjs')
writeFileSync(bundlePath, result.outputFiles[0].text)
await import(pathToFileURL(bundlePath).href)
