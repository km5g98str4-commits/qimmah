// يحزم برهان محرّك التعافي v2 (TS بمسارات @/) عبر esbuild فوق localStorage
// محاكى ويشغّله في node — بلا متصفح.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, removeEventListener() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/recovery-engine-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }),
  }, logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'recovery-engine-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
process.chdir(root) // الحارس النصّي في البرهان يقرأ المصدر من جذر المستودع
await import(pathToFileURL(file).href)
