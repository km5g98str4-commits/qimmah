// يحزم إثبات شاشة المرشد [SOVEREIGN-COACH-002] عبر esbuild فوق متصفّح مُحاكى
// ويشغّله بلا متصفح — نفس نمط `run-injury-safety-proof.mjs`.
//
// الكعب **كامل** عمدًا: `addEventListener`/`removeEventListener`/`dispatchEvent`
// موجودة كلها. كعبٌ نصفيّ يجعل `typeof window` صادقًا ثم ينهار عند أول مستمع،
// فيُسقط إثباتًا بريئًا بـ`TypeError` — وهو بالضبط العطل النمطي الذي أُصلح في
// اثنين وعشرين كعبًا قبل هذه الموجة.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

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
globalThis.window = {
  localStorage: __ls,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  location: { hash: '', href: 'http://localhost/', replace() {} },
};
globalThis.CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/coach-ui-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'coach-ui-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
