// Deterministic chaos/data-loss harness runner.
//
// Bundles scripts/resilience/chaos-proof.ts (TS, @/ paths) with esbuild over a
// *controllable* mocked localStorage and runs it in Node (no browser, no backend).
//
// The mock adds fault injection the spec requires: QuotaExceededError on demand
// (global or per-key-substring), plus a length/key(i) implementation that the
// prefix-wipe in accountScope needs. IDs and the clock are seeded so two runs
// with the same CHAOS_SEED produce byte-identical output; a different seed
// permutes race orderings to surface order-dependence.
//
// Usage: CHAOS_SEED=1337 node scripts/resilience/run-chaos.mjs
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..', '..')
const SEED = Number(process.env.CHAOS_SEED || '1337')

// Controllable localStorage + deterministic seams. `globalThis.__chaos` is the
// fault-injection control surface the proof arms/disarms between scenarios.
const banner = `
const __CHAOS_SEED = ${SEED};
globalThis.__CHAOS_SEED = __CHAOS_SEED;
class QuotaExceededError extends Error {
  constructor(msg) { super(msg || 'QuotaExceededError'); this.name = 'QuotaExceededError'; this.code = 22; }
}
globalThis.QuotaExceededError = QuotaExceededError;
const __chaos = { failAll: false, failKeySubstr: null, failKeys: new Set() };
globalThis.__chaos = __chaos;
function __mustFail(k) {
  if (__chaos.failAll) return true;
  if (__chaos.failKeys.has(k)) return true;
  if (__chaos.failKeySubstr && String(k).includes(__chaos.failKeySubstr)) return true;
  return false;
}
const __store = new Map();
const __ls = {
  get length() { return __store.size; },
  key(i) { return Array.from(__store.keys())[i] ?? null; },
  getItem: (k) => (__store.has(k) ? __store.get(k) : null),
  setItem: (k, v) => { if (__mustFail(k)) throw new QuotaExceededError('quota'); __store.set(k, String(v)); },
  removeItem: (k) => { __store.delete(k); },
  clear: () => { __store.clear(); },
};
globalThis.__store = __store;
globalThis.localStorage = __ls;
// deterministic monotone clock (seeded); proof can also pass explicit now values.
let __clock = 1_700_000_000_000 + __CHAOS_SEED;
globalThis.__setClock = (t) => { __clock = t; };
globalThis.__tick = (ms) => { __clock += ms; return __clock; };
const __RealDate = Date;
globalThis.Date = class extends __RealDate {
  constructor(...args) { if (args.length === 0) super(__clock); else super(...args); }
  static now() { return __clock; }
};
// seeded, deterministic UUIDs so identical seeds ⇒ identical artifacts.
let __uuid = 0;
const __crypto = { randomUUID: () => 'uuid-' + __CHAOS_SEED + '-' + (__uuid++).toString(16).padStart(6, '0') };
try { globalThis.crypto = __crypto; } catch { /* readonly in some node builds */ }
const __noop = () => {};
globalThis.document = { addEventListener: __noop, removeEventListener: __noop, visibilityState: 'visible' };
globalThis.window = {
  localStorage: __ls, crypto: __crypto,
  addEventListener: __noop, removeEventListener: __noop,
  location: { hash: '', href: 'http://localhost/', reload: __noop, assign: __noop },
};
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => __clock };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/resilience/chaos-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'chaos-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
