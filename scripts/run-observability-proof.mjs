import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const banner = `
const __store = new Map();
globalThis.localStorage = {
  get length() { return __store.size; }, key: (i) => Array.from(__store.keys())[i] ?? null,
  getItem: (k) => __store.get(k) ?? null, setItem: (k, v) => __store.set(k, String(v)),
  removeItem: (k) => __store.delete(k), clear: () => __store.clear(),
};
globalThis.window = { localStorage: globalThis.localStorage, location: { reload() {} } };
const __APP_VERSION__ = '1.0.0';
const __BUILD_COMMIT__ = 'proof123';
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/observability-proof.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'observability-')), 'proof.cjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
