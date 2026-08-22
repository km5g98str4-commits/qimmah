import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { strict as assert } from 'node:assert'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// NATIVE CONFIRM: any new permission must be declared in Info.plist. The sunset
// schedule requests location, so the location usage key must be present.
const plist = readFileSync(resolve(root, 'ios/App/App/Info.plist'), 'utf8')
assert.ok(plist.includes('NSLocationWhenInUseUsageDescription'), 'Info.plist must declare NSLocationWhenInUseUsageDescription (location permission)')
assert.ok(plist.includes('NSHealthShareUsageDescription'), 'Info.plist must keep the HealthKit usage key')
console.log('  ✓ Info.plist declares the location + health permission keys')

const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: globalThis.localStorage, dispatchEvent() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/polish1-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) }, logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'polish1-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
