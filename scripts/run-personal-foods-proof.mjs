import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const banner = `
const __mkStore = () => {
  const m = new Map();
  return {
    getItem: (key) => (m.has(key) ? m.get(key) : null),
    setItem: (key, value) => { m.set(key, String(value)); },
    removeItem: (key) => { m.delete(key); },
    clear: () => { m.clear(); },
  };
};
const __ls = __mkStore();
const __ss = __mkStore();
globalThis.localStorage = __ls;
globalThis.window = { localStorage: __ls, sessionStorage: __ss, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
// تخزين محجوب: الوصول إلى الخاصية نفسها يرمي — كما في Safari حين تُمنع الكعكات.
globalThis.__qimmahBlockStorage = () => {
  Object.defineProperty(globalThis.window, 'sessionStorage', {
    configurable: true,
    get() { throw new Error('SecurityError: storage is blocked'); },
  });
};
// تخزين يرمي من الدوال لا من الخاصية — الوجه الثاني لنفس العطل.
globalThis.__qimmahThrowingStorage = () => {
  Object.defineProperty(globalThis.window, 'sessionStorage', {
    configurable: true,
    value: {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('QuotaExceededError'); },
      removeItem() { throw new Error('SecurityError'); },
    },
  });
};
globalThis.__qimmahRestoreStorage = () => {
  Object.defineProperty(globalThis.window, 'sessionStorage', { configurable: true, value: __ss });
  __ss.clear();
};
// [FOOD-UX-001] تخزين محلي يرمي عند الكتابة — لإثبات أن فشل حفظ «أكلاتي» يعود مسمًّى لا مبتلَعًا.
globalThis.__qimmahThrowingLocalStorage = () => {
  Object.defineProperty(globalThis.window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => __ls.getItem(k),
      setItem() { throw new Error('QuotaExceededError'); },
      removeItem() { throw new Error('SecurityError'); },
    },
  });
};
globalThis.__qimmahRestoreLocalStorage = () => {
  Object.defineProperty(globalThis.window, 'localStorage', { configurable: true, value: __ls });
};
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/personal-foods-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
    __QIMMAH_ROOT__: JSON.stringify(root),
  },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'personal-foods-proof-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
