// يحزم إثبات سلامة الجلسة ([FOUNDER-QA-001]) عبر esbuild ويشغّله فوق كعب
// متصفّح كامل — بلا متصفّح. نمط `run-plan-anatomy-proof.mjs` نفسه.
//
// المصادر المفحوصة بنيويًّا تُحقن نصًّا (`__SOURCES__`) بدل قراءتها داخل الحزمة:
// الحزمة تعمل بلا نظام ملفات، والفحص البنيوي يجب أن يقرأ **المصدر كما هو**.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SOURCE_FILES = ['src/views/WorkoutView.tsx', 'src/components/WorkoutMode.tsx']
const sources = Object.fromEntries(
  SOURCE_FILES.map((p) => [p, readFileSync(join(root, p), 'utf8')]),
)

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
  entryPoints: [resolve(root, 'scripts/session-integrity-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
    __SOURCES__: JSON.stringify(sources),
  },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'session-integrity-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
