// Bundles the storage-honesty proof (TS with @/ paths) via esbuild over a
// simulated localStorage with two switchable faults, and runs it in node — no
// browser:
//   __setQuota(true)   → every setItem throws a QuotaExceededError (code 22),
//                        which is exactly what Safari private mode and a full
//                        5MB origin quota do;
//   __setBlocked(true) → touching window.localStorage throws a SecurityError,
//                        which is what a browser with site data disabled does.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const banner = `
const __store = new Map();
let __quota = false;
let __blocked = false;
const __quotaError = () => {
  const e = new Error('The quota has been exceeded.');
  e.name = 'QuotaExceededError';
  e.code = 22;
  return e;
};
const __ls = {
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { if (__quota) throw __quotaError(); __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
  key: (i) => Array.from(__store.keys())[i] ?? null,
  get length() { return __store.size; },
};
globalThis.localStorage = __ls;
const __window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
Object.defineProperty(__window, 'localStorage', {
  get() {
    if (__blocked) { const e = new Error('The operation is insecure.'); e.name = 'SecurityError'; throw e; }
    return __ls;
  },
});
globalThis.window = __window;
globalThis.document = { addEventListener() {}, removeEventListener() {}, documentElement: { lang: 'ar', dir: 'rtl' } };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
globalThis.__setQuota = (on) => { __quota = !!on; };
globalThis.__setBlocked = (on) => { __blocked = !!on; };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/storage-honesty-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'storage-honesty-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
