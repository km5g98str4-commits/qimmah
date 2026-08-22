// يجمّع إثبات صدق الإرشاد (TS بمسارات @/) عبر esbuild ويشغّله في Node.
// أداة إثبات فقط — لا تلمس التطبيق. Run: npm run test:guidance-honesty
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
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: __ls };
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 };
`

const result = await build({
  entryPoints: [resolve(root, 'scripts/guidance-honesty-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) },
  logLevel: 'warning',
})

const dir = mkdtempSync(join(tmpdir(), 'guidance-honesty-proof-'))
const file = join(dir, 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
process.env.QIMMAH_ROOT = root
await import(pathToFileURL(file).href)
