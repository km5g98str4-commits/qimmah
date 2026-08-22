// يجمّع إثبات المحتوى الإنجليزي (TS بمسارات @/) عبر esbuild ويشغّله فوق
// localStorage مُحاكى في Node. لا يلمس التطبيق — أداة إثبات فقط.
// Run: npm run test:english-content
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const banner = `
const __s = new Map();
const __ls = {
  get length(){return __s.size},
  key(i){return Array.from(__s.keys())[i] ?? null},
  getItem:(k)=>(__s.has(k)?__s.get(k):null),
  setItem:(k,v)=>{__s.set(k,String(v))},
  removeItem:(k)=>{__s.delete(k)},
  clear:()=>{__s.clear()},
};
globalThis.localStorage = __ls;
// [SOVEREIGN-003] كائن نافذة كامل لا نصفه.
// كان الكعب يحمل localStorage وحده: فيصير typeof window !== undefined صحيحًا
// فتدخل وحداتٌ فرعَها المخصّص للمتصفّح ثم تسقط على addEventListener غير
// الموجود. أي أن الكعب يدّعي متصفّحًا ثم لا يكون واحدًا — والعطل يظهر في
// إثبات محتوى لا علاقة له بالنافذة، لمجرّد أن رسم الاستيراد اتّسع.
// (بلا علامات اقتباس خلفية: هذه الكتلة تعيش داخل قالب نصّي.)
globalThis.window = {
  localStorage: __ls,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true },
};
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/english-content-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'en-content-proof-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
