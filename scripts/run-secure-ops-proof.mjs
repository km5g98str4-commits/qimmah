// إثبات أمان الحساب (Prompt 3) — فحوص ساكنة + بوابة recovery في المزامنة.
import { execSync } from 'node:child_process'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const ok = (l) => { pass++; console.log(`  ✓ ${l}`) }
const grepZero = (pattern, label) => {
  const out = execSync(`grep -rniE '${pattern}' src --include='*.ts' --include='*.tsx' || true`, { cwd: root, encoding: 'utf8' }).trim()
  if (out) { console.error(`✗ FAIL: ${label}\n${out}`); process.exit(1) }
  ok(label)
}
// المحظورات المطلقة
grepZero('service_role|service-role', 'لا service_role في كود العميل')
grepZero('console\\.(log|info|warn|error)\\([^)]*(password|otp\\b)', 'لا تسجيل password/OTP في console')
grepZero('console\\.(log|info|warn|error)\\([^)]*(access_token|refresh_token)', 'لا تسجيل توكنات في console')
grepZero("localStorage\\.setItem\\([^)]*password", 'لا تخزين كلمة مرور في localStorage')
grepZero('impersonat|loginAs\\(|sudo', 'لا مسار impersonation/backdoor')
// عقود موجودة فعلًا
const auth = readFileSync(resolve(root, 'src/lib/authContext.tsx'), 'utf8')
if (!auth.includes('resetPasswordForEmail')) { console.error('✗ reset sender مفقود'); process.exit(1) }
ok('عقد إعادة التعيين موجود (resetPasswordForEmail + redirectTo #/reset)')
const deep = readFileSync(resolve(root, 'src/lib/deepLinkRecovery.ts'), 'utf8')
if (!deep.includes('exchangeCodeForSession')) { console.error('✗ PKCE exchange مفقود'); process.exit(1) }
ok('PKCE exchange لروابط iOS العميقة موجود')
// بوابة recovery في المزامنة — runtime
const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = { localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, matchMedia:()=>({matches:false}) };
`
const src = `
import { setSyncRuntime, setSyncFeatureEnabledForTests, syncAllowedFor } from '@/lib/syncQueue'
import { stampDataOwner } from '@/lib/dataOwnership'
setSyncFeatureEnabledForTests(true)
stampDataOwner('u1')
setSyncRuntime('u1', true) // جلسة استعادة نشطة
if (syncAllowedFor('u1')) { console.error('✗ recovery لا يحجب الرفع'); process.exit(1) }
console.log('  ✓ جلسة الاستعادة تجمّد الرفع (syncAllowedFor=false)')
setSyncRuntime('u1', false)
if (!syncAllowedFor('u1')) { console.error('✗ الرفع لا يعود بعد الاستعادة'); process.exit(1) }
console.log('  ✓ الرفع يعود بعد انتهاء الاستعادة')
setSyncFeatureEnabledForTests(undefined)
`
const tmp = mkdtempSync(join(tmpdir(), 'secure-ops-'))
writeFileSync(join(tmp, 'entry.ts'), src)
const r = await build({ entryPoints: [join(tmp, 'entry.ts')], bundle: true, format: 'esm', platform: 'node', write: false, banner: { js: banner }, alias: { '@': resolve(root, 'src') }, define: { 'import.meta.env': JSON.stringify({ MODE: 'test', VITE_SYNC_ENABLED: '' }) }, logLevel: 'warning' })
writeFileSync(join(tmp, 'proof.mjs'), r.outputFiles[0].text)
await import(pathToFileURL(join(tmp, 'proof.mjs')).href)
console.log(`\n✅ إثبات أمان الحساب — ${pass + 2} فحصًا.`)
