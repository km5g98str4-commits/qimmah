// يحزم إثبات توحيد التغذية (TS بمسارات @/) عبر esbuild فوق localStorage مُحاكى
// ويشغّله بلا متصفح — نفس عدّة run-nutrition-history-proof.mjs حرفيًّا.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// localStorage مكتمل المواصفات (length + key(i)) — مسح العزل يعدّد المفاتيح.
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
globalThis.window = { localStorage: __ls, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }) };
globalThis.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };
// الحزمة تُشغَّل من /tmp، فالمسارات النسبية لا تصل جذر المستودع. نحقن الجذر
// وقت البناء ليقرأ الإثبات مصادر الشاشة (الفحوص البنيوية في البند ①).
globalThis.__QIMMAH_ROOT = __QIMMAH_ROOT_LITERAL__;
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const bannerJs = banner.replace('__QIMMAH_ROOT_LITERAL__', JSON.stringify(root))

const result = await build({
  entryPoints: [resolve(root, 'scripts/nutrition-canonical-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: bannerJs },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'nutrition-canonical-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
