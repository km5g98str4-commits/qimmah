// إثبات بوابة موافقة المزامنة + الـtripwire (حارة G · ج-١).
//
// شقّان:
//   (أ) tripwire ساكن — يفشل صراحةً إذا صار العلم قابلًا للتفعيل والبوابةُ غائبة،
//       أو إذا عبر حقل حسّاس حدَّ الإدراج بلا تنقية. يحرس المستقبل لا الحاضر:
//       اليوم العلم مطفأ، ويوم يُقلَب يجب أن تكون البوابة قائمة — وهذا ما يمنع
//       قلبَه على شفرة بلا حارس.
//   (ب) إثبات سلوكي — يُبنى بالعلم **مفعّلًا داخل الصندوق** ليبرهن أن الحجب من
//       البوابة لا من الإطفاء.
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(resolve(root, p), 'utf8')

let pass = 0
const check = (label, cond) => {
  if (!cond) {
    console.error(`✗ FAIL: ${label}`)
    process.exit(1)
  }
  pass++
  console.log(`  ✓ ${label}`)
}

console.log('════════ tripwire: العلم لا يُقلَب على شفرة بلا بوابة ════════')

const queue = read('src/lib/syncQueue.ts')
const policy = read('src/lib/syncFieldPolicy.ts')
const consent = read('src/lib/syncConsent.ts')

// ── (1) البوابة قائمة في نقطة الاختناق ──
// تأكيد بنيوي مقترن: تُستخرج كتلة syncAllowedFor بحدودها ويُفحص أن شرط الموافقة
// **داخلها**. فحص `includes` على الملف كلّه كان يمرّ لو ورد الاسم في تعليق.
const allowedStart = queue.indexOf('export function syncAllowedFor')
check('syncAllowedFor موجودة', allowedStart !== -1)
const allowedBody = queue.slice(allowedStart, queue.indexOf('\n}', allowedStart))
check(
  'شرط الموافقة الأولى داخل جسم syncAllowedFor نفسه (لا في تعليق ولا في دالة أخرى)',
  /hasCloudSyncConsent\(userId\)/.test(allowedBody),
)
check(
  'وهو شرط اقتراني (&&) لا بديل (||) — لا يُرضى بتحقّق غيره',
  /&&\s*\n?\s*hasCloudSyncConsent\(userId\)/.test(allowedBody),
)

// ── (2) التنقية على حدّ الإدراج ──
const enqStart = queue.indexOf('export function enqueueSyncOperation')
check('enqueueSyncOperation موجودة', enqStart !== -1)
const enqBody = queue.slice(enqStart, queue.indexOf('\n}', enqStart))
check('التنقية تُستدعى داخل enqueueSyncOperation', /sanitizeSyncPayload\(/.test(enqBody))
check(
  'والعملية تحمل الحمولة المنقّاة لا الأصلية (payload: safePayload)',
  /payload:\s*safePayload/.test(enqBody) && !/\bpayload,\s*$/m.test(enqBody.replace(/payload:\s*safePayload/, '')),
)
check(
  'ومفتاح التنقية هو الموافقة الثانية لا الأولى',
  /sanitizeSyncPayload\([^)]*hasSensitiveHealthConsent\(userId\)\)/.test(enqBody),
)

// ── (3) القائمة قائمةُ سماح لا حظر ──
check('قائمة السماح مصدَّرة', /export const SYNCABLE_PROFILE_FIELDS/.test(policy))
check('قائمة الحقول الحسّاسة مصدَّرة', /export const SENSITIVE_PROFILE_FIELDS/.test(policy))
check(
  'المنقّي يبني من المسموح (pickAllowed) ولا يحذف من المصدر',
  /function pickAllowed/.test(policy) && !/delete\s+\w+\[/.test(policy),
)

// ── (4) الحقول الحسّاسة المعروفة كلها معلنة ──
for (const field of [
  'limitations.injuries',
  'limitations.notes',
  'wellnessTracking.supplements',
  'wellnessTracking.medications',
  'foodPreferences.allergies',
]) {
  check(`«${field}» معلَن حسّاسًا`, policy.includes(`'${field}'`))
}

// ── (5) التأكيد المضادّ (§4.2): لا حقل حسّاس تسلّل إلى قائمة السماح ──
const syncableBlock = policy.slice(
  policy.indexOf('SYNCABLE_PROFILE_FIELDS'),
  policy.indexOf('SENSITIVE_PROFILE_FIELDS'),
)
for (const banned of ['injuries', 'medications', 'supplements', 'allergies', 'limitations.*', 'wellnessTracking.*']) {
  check(`قائمة السماح خالية من «${banned}»`, !syncableBlock.includes(banned))
}
check(
  'ولا بطاقة عمياء (*) على فرع يحمل حسّاسًا — foodPreferences مذكور بحقوله',
  !syncableBlock.includes('foodPreferences.*'),
)

// ── (6) الموافقة مقيّدة بنسخة السياسة وبالحساب ──
check('المفتاح يحمل معرّف الحساب', /SYNC_CONSENT_PREFIX}\$\{userId\}/.test(consent) || /\$\{SYNC_CONSENT_PREFIX\}\$\{userId\}/.test(consent))
check('السريان مشروط بنسخة السياسة الحالية', /policyVersion === SYNC_CONSENT_POLICY_VERSION/.test(consent))
check('الموافقة الثانية تشترط الأولى معها', /isLive\(state\.cloudSync\) && isLive\(state\.sensitiveHealth\)/.test(consent))
check('الكتابة عبر safeStorage لا localStorage خام', /from '\.\/safeStorage'/.test(consent) && !/localStorage\.setItem/.test(consent))
check('وتُرجع WriteResult ولا تبتلعه', /: WriteResult/.test(consent))

// ── (7) العلم ما زال مطفأ في تهيئة الشحن ──
check("العلم لا يُفعَّل إلا بالنص 'true'", /VITE_SYNC_ENABLED === 'true'/.test(queue))

console.log(`\n  ── tripwire: ${pass} فحصًا ──\n`)

// ══════ الشقّ السلوكي — بالعلم مفعّلًا داخل الصندوق ══════
const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = { localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/sync-consent-proof.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  banner: { js: banner },
  alias: { '@': resolve(root, 'src') },
  // العلم مفعّل هنا وحده — تهيئة الشحن لا تتأثّر.
  define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false, VITE_SYNC_ENABLED: 'true' }) },
  logLevel: 'warning',
})
const file = join(mkdtempSync(join(tmpdir(), 'sync-consent-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
