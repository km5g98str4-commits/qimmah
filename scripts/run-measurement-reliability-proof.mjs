// يحزم إثبات القياسات فوق localStorage قابل لإجبار quota/SecurityError.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const banner = `
const __store = new Map();
globalThis.__measurementWriteFailure = null;
const __measurementKey = 'qimmah:history:measurementLogs:v1';
const __ls = {
  get length() { return __store.size; },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => {
    if (k === __measurementKey && globalThis.__measurementWriteFailure === 'quota') { const e = new Error('quota'); e.name = 'QuotaExceededError'; e.code = 22; throw e; }
    if (k === __measurementKey && globalThis.__measurementWriteFailure === 'security') { const e = new Error('blocked'); e.name = 'SecurityError'; throw e; }
    __store.set(k, String(v));
  },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }) };
globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' };
globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/measurement-reliability-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'measurement-reliability-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
