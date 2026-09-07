// إثبات «الموافقة الصحّية تحرس الحمولة لا المربّع» (حارة G).
//
// العطل الذي وُلد منه هذا الإثبات: `sanitizeSyncPayload` كانت تبدأ بـ
// `if (table !== 'profiles') return payload` — فالموافقة الثانية تحرس حمولة
// الإعداد وحدها، بينما `daily_logs` يحمل سجلّي المكمّلات والأدوية حرفيًّا،
// و`recovery_logs` يحمل ألمًا ونبضًا وتغيّرية نبض، وشريحة `profiles.data.settings`
// تحمل الإصابات والملاحظات الصحية وخطة الأدوية بجرعاتها. مستخدم يوافق على
// المزامنة ويرفض الموافقة الصحّية كان سيرفعها كلّها — خرقًا للقرار المقفل (§8-٥).
//
// شقّان:
//   (أ) بنيوي — الوعد النصّي «أي جدول يُضاف لاحقًا يُضاف هنا صراحةً» صار مُلزِمًا:
//       سجلّ جداول مُنمَّط بالاتحاد كاملًا (فـ`tsc` يسقط عند جدول بلا سياسة)،
//       وشبكة سقوط مغلق تحت السجلّ. ومحاكاة التفاف تسقط **باسم الجدول**.
//   (ب) سلوكي — بالعلم مفعّلًا داخل الصندوق، والتأكيد على الحمولة المدرَجة في
//       الطابور لا على مربّع في الواجهة.
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

console.log('════════ بنيوي: لا جدول مزامنة بلا سياسة معلنة ════════')

const queue = read('src/lib/syncQueue.ts')
const policy = read('src/lib/syncFieldPolicy.ts')
const pkg = read('package.json')

/** يستخرج كتلة بحدودها من المصدر — لا `includes` على الملف كلّه. */
function block(source, startMarker) {
  const start = source.indexOf(startMarker)
  if (start === -1) return ''
  return source.slice(start, source.indexOf('\n}', start))
}

// ── (1) الشرط القديم زال: الحكم على المحتوى لا على اسم الجدول ──
// الفحص على **جسمَي الدالتين بحدودهما** لا على الملف كلّه: نصّ العطل مقتبس في
// تعليق تاريخي أعلى الملف، وفحصٌ نصّي عام كان سيسقط على اقتباسه.
const auditBody = block(policy, 'export function auditSyncPayload')
const sanitizeBody = block(policy, 'export function sanitizeSyncPayload')
check('auditSyncPayload موجودة', auditBody !== '')
check(
  "لا اختصار «table !== 'profiles'» داخل جسمَي التنقية",
  !/table\s*!==\s*'profiles'/.test(auditBody + sanitizeBody),
)
check('وتقرأ سياسة الجدول من السجلّ', /SYNC_TABLE_POLICIES/.test(auditBody))
check('وتُطبّق شبكة السقوط المغلق داخلها', /stripSensitiveKeysDeep\(/.test(auditBody))
check(
  'والشبكة مشروطة برفض الموافقة الثانية (allowSensitive) لا بشيء آخر',
  /if\s*\(!allowSensitive\)\s*\{[\s\S]*stripSensitiveKeysDeep\(/.test(auditBody),
)
check('وsanitizeSyncPayload تمرّ من auditSyncPayload حصرًا', /return auditSyncPayload\(/.test(sanitizeBody))
check(
  'وenqueueSyncOperation ما زالت تستدعي التنقية بمفتاح الموافقة الثانية',
  /sanitizeSyncPayload\([^)]*hasSensitiveHealthConsent\(userId\)\)/.test(block(queue, 'export function enqueueSyncOperation')),
)

// ── (2) الإلزام بالنوع: السجلّ مُنمَّط بالاتحاد كاملًا ──
check(
  'السجلّ مُنمَّط Readonly<Record<SyncTable, TableSyncPolicy>> — فجدول بلا سياسة يُسقط tsc',
  /export const SYNC_TABLE_POLICIES:\s*Readonly<Record<SyncTable, TableSyncPolicy>>/.test(policy),
)

// ── (3) التغطية: كل جدول في SYNC_TABLES له سطر في السجلّ ──
/** جداول العميل كما يعلنها syncQueue — الكتلة بحدّها `])` لا بأول `}`. */
function tablesOf(queueSource) {
  const start = queueSource.indexOf('export const SYNC_TABLES')
  if (start === -1) return []
  const set = queueSource.slice(start, queueSource.indexOf('])', start))
  return [...set.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
}
/** مفاتيح السجلّ كما يعلنها syncFieldPolicy. */
function policiesOf(policySource) {
  const reg = block(policySource, 'export const SYNC_TABLE_POLICIES')
  return [...reg.matchAll(/^ {2}([a-z_]+):/gm)].map((m) => m[1])
}
/** الفحص المسمّى: أي جدول مزامنة بلا سياسة؟ */
function tablesWithoutPolicy(queueSource, policySource) {
  const declared = new Set(policiesOf(policySource))
  return tablesOf(queueSource).filter((t) => !declared.has(t))
}

const tables = tablesOf(queue)
check(`SYNC_TABLES مقروءة (${tables.length} جدولًا)`, tables.length >= 13)
const orphans = tablesWithoutPolicy(queue, policy)
check(`لا جدول مزامنة بلا سياسة معلنة (يتامى: ${orphans.join('، ') || 'لا شيء'})`, orphans.length === 0)

// ── (4) محاكاة الالتفاف (§4.2): جدول جديد بلا سياسة يجب أن يسقط **باسمه** ──
const smuggled = queue.replace("  'plan_templates',\n", "  'plan_templates',\n  'health_journal',\n")
check('محاكاة الالتفاف بُنيت فعلًا (الجدول المهرَّب حاضر في النص)', tablesOf(smuggled).includes('health_journal'))
const caught = tablesWithoutPolicy(smuggled, policy)
check('محاكاة الالتفاف تسقط باسم الجدول لا بمصادفة', caught.length === 1 && caught[0] === 'health_journal')

// ── (5) الشبكة: أوراق حسّاسة معلنة، وبلا تعميم يبتلع البريء ──
const netBlock = block(policy, 'export const SENSITIVE_KEY_NAMES')
for (const key of ['injuries', 'medications', 'supplements', 'allergies', 'healthNotes', 'soreness', 'hrv', 'restingHeartRate']) {
  check(`«${key}» في شبكة السقوط المغلق`, new RegExp(`'${key}'`).test(netBlock))
}
// التأكيد المضادّ (§4.2): الشبكة ليست قاعدة تبتلع كل شيء — مفاتيح عامة خارجها.
for (const generic of ['notes', 'name', 'date', 'data', 'updated_at', 'nutrition', 'water']) {
  check(`ولا تبتلع المفتاح العام «${generic}»`, !new RegExp(`'${generic}'`).test(netBlock))
}
check(
  'المنقّي يبني كائنات جديدة ولا يحذف من المصدر (لا delete)',
  !/delete\s+\w+\[/.test(policy),
)

// ── (6) الجداول المركّبة المعروفة معلنة بمساراتها ──
for (const path of [
  'data.supplements',
  'data.medications',
  'data.input.soreness',
  'data.input.restingHeartRate',
  'data.input.hrv',
  'data.settings.profile.injuries',
  'data.settings.profile.healthNotes',
  'data.settings.wellnessPlan.medications',
]) {
  check(`«${path}» معلَن حسّاسًا في سجلّ الجداول`, policy.includes(`'${path}'`))
}

// ── (7) الإثبات موصول بالبوابة (وإلا كان حارسًا نائمًا) ──
check('test:sensitive-consent موصول في test:gate', /npm run test:sensitive-consent/.test(pkg))

// ── [RR-003] بوّابة الإكمال (مزامنة مطفأة) تمرّ بالمنقّي — بنيويًّا ──
{
  const ob = read('src/lib/onboardingSync.ts')
  const fn = block(ob, 'export async function persistOnboardingToProfile(')
  const upsertIdx = fn.indexOf(".upsert(")
  check('onboardingSync: مسار المزامنة المطفأة يرفع شكلًا منقًّى لا الملف الخام',
    upsertIdx !== -1 && fn.slice(0, upsertIdx).includes('cloudOnboardingSnapshot(stamped, hasSensitiveHealthConsent(userId))')
      && !/onboarding:\s*stamped\b/.test(fn))
  check('⚔️ ومحاكاة إعادة الملف الخام تسقط بفحص مسمّى',
    /onboarding:\s*stamped\b/.test(fn.replace('cloudOnboardingSnapshot(stamped, hasSensitiveHealthConsent(userId))', 'stamped')))
}

console.log(`\n  ── بنيوي: ${pass} فحصًا ──\n`)

// ══════ الشقّ السلوكي — بالعلم مفعّلًا داخل الصندوق ══════
const banner = `
const __store = new Map();
globalThis.localStorage = { getItem:k=>__store.get(k)??null, setItem:(k,v)=>__store.set(k,String(v)), removeItem:k=>__store.delete(k), clear:()=>__store.clear(), key:i=>Array.from(__store.keys())[i]??null, get length(){return __store.size} };
globalThis.window = { localStorage: globalThis.localStorage, dispatchEvent() {}, addEventListener() {}, removeEventListener() {}, matchMedia:()=>({matches:false}) };
globalThis.CustomEvent = class CustomEvent { constructor(type){ this.type=type } };
`
const result = await build({
  entryPoints: [resolve(root, 'scripts/sensitive-consent-proof.ts')],
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
const file = join(mkdtempSync(join(tmpdir(), 'sensitive-consent-')), 'proof.mjs')
writeFileSync(file, result.outputFiles[0].text)
await import(pathToFileURL(file).href)
