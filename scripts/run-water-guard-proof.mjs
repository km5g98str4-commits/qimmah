// يحزم إثبات حارس تسجيل الماء ([FOUNDER-QA/P1]) عبر esbuild ويشغّله فوق كعب
// متصفّح **كامل** (نمط run-plan-anatomy-proof.mjs) — بلا متصفّح.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// كعب نافذة كامل: نصفه يجعل `typeof window` صادقًا ثم ينفجر عند أول مستمع.
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
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, matchMedia: () => ({ matches: false }) };
globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/water-guard-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  // الإثبات يقرأ ملفات المصدر نصًّا (فحوص بنيوية) — المسارات نسبية إلى
  // `scripts/`، فنثبّت `import.meta.url` على موقع المصدر لا على ملف مؤقّت.
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
    'import.meta.url': JSON.stringify(pathToFileURL(resolve(root, 'scripts/water-guard-proof.ts')).href),
  },
  external: ['node:fs', 'node:assert', 'node:url', 'node:path'],
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'water-guard-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
