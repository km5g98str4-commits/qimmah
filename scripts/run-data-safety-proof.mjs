import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── المعيار 10: لا service_role في كود العميل، ولا تسجيل كلمات مرور في logs ──
const { execSync } = await import('node:child_process')
const grepZero = (pattern, label) => {
  let out = ''
  try {
    out = execSync(`grep -rniE '${pattern}' src --include='*.ts' --include='*.tsx' || true`, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    out = ''
  }
  if (out) {
    console.error(`✗ FAIL (أمن): ${label}\n${out}`)
    process.exit(1)
  }
  console.log(`  ✓ أمن: ${label}`)
}
grepZero('service_role|service-role', 'لا مفتاح service_role في كود العميل')
grepZero('console\\.(log|info|warn|error)\\([^)]*password', 'لا تسجيل كلمات مرور في السجلات')
grepZero("localStorage\\.setItem\\([^)]*password", 'لا تخزين كلمة مرور في localStorage')

const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/data-safety-proof.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
  banner: { js: banner }, alias: { '@': resolve(root, 'src') },
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: '' }) }, logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'data-safety-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
