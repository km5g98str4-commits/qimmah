// ============================================================================
// test:offline-entitlement — سماح الانقطاع: من دفع لا يُطالَب بالدفع مرّتين،
// ومن لم يدفع لا يُفتح له شيء. [OFFLINE-ENTITLEMENT-001]
// ============================================================================
//
// ═══ العطل الذي يغلقه ═══
// `site/index.html` يَعِد أن التطبيق يعمل «بلا إنترنت»، والاستحقاق كان يُحسم
// حيًّا في كل قراءة ولا يُحفَظ. فانقطاعُ شبكة أو مهلةُ ثمان ثوانٍ تعيد
// `{status:'none'}`، فيعرض `PremiumGate` **نداء شراء لمشترٍ دفع بالفعل**.
//
// ═══ ما يُختبَر هنا: الوحدات الحقيقية، لا محاكاةُ محاكاة ═══
// تُبنى `entitlementSource` + `entitlementCache` + `entitlementBackend` +
// المخزن والحارس بـesbuild من `src/` نفسها، فوق تخزينٍ محلّي مُحاكى **وعميل
// Supabase مُستبدَل وحده** (`@supabase/supabase-js` هو الشيء الوحيد المزيَّف —
// لأنه الشبكة). كل قرار يمرّ به الاختبار قرارٌ من شيفرة الإنتاج.
//
// ═══ حدّ معلَن يُختبَر بوصفه حدًّا ═══
// `integrity` بصمة كاشفة للعبث لا توقيع: من يملك تنفيذ كود في الصفحة يملك
// إعادة حسابها. يُثبَت ذلك صراحةً أدناه (⑧) بدل أن يُدَّعى خلافه — والسلطة
// النهائية تبقى للخادم، الذي يُسأل في أوّل اتصال.
// ============================================================================
import { build } from 'esbuild'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dir = mkdtempSync(join(tmpdir(), 'qimmah-offline-ent-'))
const p = (rel) => resolve(root, rel).replaceAll('\\', '/')

const results = []
const check = (label, condition, detail = '') => {
  results.push({ label, pass: Boolean(condition), detail })
  console.log(`  ${condition ? '✓' : '✗ FAIL'}  ${label}${!condition && detail ? `  — ${detail}` : ''}`)
  return Boolean(condition)
}

// ── جهاز مُحاكى: تخزين حقيقي السلوك، ساعة نتحكّم بها، وشبكة معدودة ──────────
const memory = new Map()
let quota = false
const localStorageShim = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => {
    if (quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; e.code = 22; throw e }
    memory.set(k, String(v))
  },
  removeItem: (k) => { memory.delete(k) },
  clear: () => memory.clear(),
  key: (i) => [...memory.keys()][i] ?? null,
  get length() { return memory.size },
}
globalThis.localStorage = localStorageShim
globalThis.window = {
  localStorage: localStorageShim,
  sessionStorage: localStorageShim,
  location: { href: 'https://qimmah.example/', search: '', hash: '', pathname: '/' },
  addEventListener: () => {},
  removeEventListener: () => {},
}
// Node 22 يعرّف `navigator` بخاصيّة قراءة فقط — نُعيد تعريفها بدل الإسناد.
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true })
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 }
let fetchCalls = 0
globalThis.fetch = () => { fetchCalls += 1; return Promise.reject(new Error('network blocked by proof harness')) }

/** الخادم المُحاكى — يُبدَّل سلوكه بين المشاهد. */
const server = {
  session: null,
  answer: null,
  rpcCalls: 0,
}
globalThis.__server = server

// ── عميل Supabase مزيَّف: الشبكة وحدها هي المزيَّفة ──────────────────────────
const fakeSdk = join(dir, 'fake-supabase.mjs')
writeFileSync(fakeSdk, `
export function createClient() {
  return {
    auth: {
      getSession: async () => globalThis.__server.session,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    rpc: async () => {
      globalThis.__server.rpcCalls += 1
      return globalThis.__server.answer
    },
  }
}
`)

const EXPORTS = [
  ['lib/access/entitlementSource', ['resolveEntitlement', 'mockEnabled']],
  ['lib/access/entitlementCache', [
    'applyOfflineGrace', 'rememberVerifiedEntitlement', 'forgetVerifiedEntitlement',
    'readVerifiedEntitlement', 'replayVerifiedEntitlement', 'judgeVerifiedEntitlement',
    'fingerprintRecord', 'VERIFIED_ENTITLEMENT_KEY', 'OFFLINE_GRACE_MS', 'CLOCK_SKEW_TOLERANCE_MS',
  ]],
  ['lib/access/entitlementBackend', ['fetchEntitlement', 'statusForServerState', 'SERVER_ENTITLEMENT_STATES', 'backendAvailable']],
  ['lib/access/entitlementStore', ['getEntitlement', 'setEntitlement', 'resetEntitlement']],
  ['lib/access/guard', ['canPerform', 'assertPaid', 'PaidActionDenied']],
  ['lib/access/paidActions', ['PAID_ACTIONS', 'isPaidActionAllowed']],
  ['lib/accountScope', ['wipeUserData']],
]

const ENV_PROD = { MODE: 'production', DEV: false, PROD: true }
const ENV_PREVIEW = { MODE: 'production', DEV: false, PROD: true, VITE_APP_ENV: 'founder_preview' }

/**
 * يبني طبقة الوصول **حزمةً واحدة** — كما يشحنها Vite. الفصل إلى حزم يعطي كل
 * حزمة نسخةً خاصّة من المخزن، فيبدو الحارس رافضًا بينما المخزن الذي عُدّل غيرُ
 * الذي يقرؤه. و`patch` يسمح ببناء نسخة **معطوبة عمدًا** للتأكيد المضادّ (§4.2).
 */
async function bundleLayer(name, env, patch = null) {
  const entry = join(dir, `${name}-entry.ts`)
  writeFileSync(entry, EXPORTS.map(([mod, names]) => `export { ${names.join(', ')} } from '${p('src/' + mod)}'`).join('\n'))
  const plugins = []
  if (patch) {
    plugins.push({
      name: 'patch',
      setup(b) {
        b.onLoad({ filter: new RegExp(patch.file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }, async (args) => {
          const { readFile } = await import('node:fs/promises')
          const text = await readFile(args.path, 'utf8')
          const patched = patch.apply(text)
          if (patched === text) throw new Error(`patch matched nothing in ${patch.file}`)
          return { contents: patched, loader: 'ts' }
        })
      },
    })
  }
  const out = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(root, 'src'), '@supabase/supabase-js': fakeSdk },
    define: { 'import.meta.env': JSON.stringify(env) },
    plugins,
    logLevel: 'silent',
  })
  const file = join(dir, `${name}.mjs`)
  writeFileSync(file, out.outputFiles[0].text)
  return { mod: await import(pathToFileURL(file).href), text: out.outputFiles[0].text }
}

// ── أدوات المشهد ────────────────────────────────────────────────────────────
const HOUR = 3_600_000
const ACCOUNT_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const ACCOUNT_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'

const sessionFor = (uid) => ({ data: { session: { user: { id: uid } } }, error: null })
const NO_SESSION = { data: { session: null }, error: null }
const SESSION_NETWORK_DOWN = { data: { session: null }, error: { message: 'TypeError: Failed to fetch' } }

/** صفّ `my_entitlement()` كما تعيده قاعدة البيانات فعلًا (طوابع زمنية نصّية). */
const row = ({ state, type, noExpiry = false, expiresAt = null, serverTime }) => ({
  data: [{
    state,
    entitlement_type: type,
    source: 'test',
    activated_at: new Date(serverTime - HOUR).toISOString(),
    expires_at: expiresAt === null ? null : new Date(expiresAt).toISOString(),
    no_expiry: noExpiry,
    server_time: new Date(serverTime).toISOString(),
  }],
  error: null,
})
const NETWORK_ERROR = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } }
const SERVICE_ERROR = { data: null, error: { message: 'permission denied for function my_entitlement', code: '42501' } }

const NOW = Date.UTC(2026, 7, 22, 12, 0, 0)
const readRecord = () => {
  const raw = memory.get('qimmah:entitlement-verified:v1')
  return raw === undefined ? null : JSON.parse(raw)
}
const writeRecord = (rec) => memory.set('qimmah:entitlement-verified:v1', JSON.stringify(rec))

console.log('\n🔌 إثبات سماح الانقطاع — الاستحقاق لا يُنسى لأن الشبكة غابت\n')

const prod = await bundleLayer('prod', ENV_PROD)
const A = prod.mod

check('البناء الإنتاجي ليس في وضع التقليد', A.mockEnabled() === false)
check('وخادمه مضبوط (فالمشاهد أدناه تقيس السلوك الحقيقي)', A.backendAvailable() === true)
check('مفتاح الذاكرة تحت مساحة قِمّة — فيمسحه عزل الحسابات', A.VERIFIED_ENTITLEMENT_KEY.startsWith('qimmah:'))
check('نافذة السماح مقفلة ومعلَنة (٧٢ ساعة)', A.OFFLINE_GRACE_MS === 72 * HOUR, String(A.OFFLINE_GRACE_MS))

/** المشهد الكامل: قراءة حقيقية ثم سياسة السماح — نفس ما يفعله المزوّد بالضبط. */
async function settle(deviceNowMs = NOW) {
  const resolved = await A.resolveEntitlement()
  return A.applyOfflineGrace(resolved, deviceNowMs, 0)
}

/** يضع المخزن الحقيقي على النتيجة ويسأل الحارس — «هل يستطيع الاستعمال فعلًا؟» */
function usable(settled) {
  A.setEntitlement({ status: settled.status, source: settled.source, detail: settled.detail ?? null, lastError: settled.lastError, cacheReason: settled.cacheReason })
  return A.canPerform('workout.logSet') && A.canPerform('nutrition.addFood')
}

// ════════════════ ① مشترٍ متّصل ⇒ Premium، والإجابة تُحفَظ ════════════════
console.log('① مشترٍ Premium متّصل')
memory.clear()
server.session = sessionFor(ACCOUNT_A)
server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
{
  const s = await settle()
  check('الحالة `active` من الخادم مباشرةً', s.status === 'active' && s.source === 'backend', `${s.status}/${s.source}`)
  check('والفعل المدفوع يمرّ فعلًا عبر الحارس الحقيقي', usable(s) === true)
  const rec = readRecord()
  check('وحُفظت الإجابة مربوطةً بالحساب', rec !== null && rec.accountId === ACCOUNT_A, JSON.stringify(rec))
  check('وبحالتها ونوعها كما قالهما الخادم', rec.serverState === 'premiumActive' && rec.entitlementType === 'premium')
  check('وبساعة الخادم لا بساعة الجهاز', rec.verifiedAtServerMs === NOW && typeof rec.verifiedAtDeviceMs === 'number')
  check('وببصمة سليمة', rec.integrity === A.fingerprintRecord({ ...rec, integrity: undefined }))
}

// ════════════ ② انقطاع مؤقّت ⇒ يبقى مستعمِلًا داخل النافذة ════════════════
console.log('\n② انقطاع مؤقّت — المشتري لا يُطالَب بالدفع ثانية')
server.answer = NETWORK_ERROR
{
  const s = await settle(NOW + 2 * HOUR)
  check('★ بعد ساعتين بلا شبكة: ما زال `active`', s.status === 'active', `${s.status}`)
  check('★ والمصدر معلَن `cache` لا مموّهًا بـ`backend`', s.source === 'cache', s.source)
  check('والسبب مسمّى `within_grace`', s.cacheReason === 'within_grace', s.cacheReason)
  check('وسبب الشبكة يبقى مقولًا لا مبتلعًا', s.lastError === 'backend_offline', s.lastError)
  check('★ والفعل المدفوع يمرّ — وهذا هو العطل الذي أُغلق', usable(s) === true)
  check('والتفصيل يعلن أنه معاد (`fromCache`)', s.detail?.fromCache === true)
}
{
  const s = await settle(NOW + 71 * HOUR)
  check('وبعد ٧١ ساعة (داخل النافذة) ما زال يعمل', s.status === 'active' && s.source === 'cache')
}
{
  // المهلة مسار فشل ثانٍ (٨ ثوانٍ لا تُنتظر في إثبات) — تُختبر على الدالّة نفسها.
  const s = A.applyOfflineGrace(
    { status: 'none', source: 'backend', detail: null, lastError: 'backend_timeout', failure: 'timeout', accountId: ACCOUNT_A },
    NOW + HOUR, 0)
  check('★ والمهلة تُعامَل معاملة الانقطاع — كلتاهما «لم نصل»', s.status === 'active' && s.source === 'cache')
}
{
  // عطلٌ عندنا (صلاحية ناقصة) عبر المسار الحقيقي — الخادم **رُدّ عليه** فعلًا.
  server.answer = SERVICE_ERROR
  const s = await settle(NOW + HOUR)
  check('★ بينما عطلٌ عندنا (`service_error`) لا يركب الذاكرة — الخادم رُدّ عليه',
    s.status === 'none' && s.source === 'backend' && s.cacheReason === undefined, `${s.status}/${s.source}/${s.cacheReason}`)
  check('ويُقال باسمه لا «تأكّد من النت»', s.lastError === 'backend_error', s.lastError)
  check('ولا يمسح السجلّ أيضًا — عطلنا ليس حكمًا على المستخدم', readRecord() !== null)
  server.answer = NETWORK_ERROR
}
{
  // والذاكرة **لا تختصر السؤال**: تُستشار بعد أن يُسأل الخادم ويتعذّر، لا قبله.
  const before = server.rpcCalls
  const s = await settle(NOW + HOUR)
  check('★ والسماح لا يُلغي السؤال: الخادم يُسأل في كل قراءة ثم تُستشار الذاكرة',
    s.source === 'cache' && server.rpcCalls === before + 1, `${server.rpcCalls - before}`)
  // والكاتب الحقيقي في طبقة المخازن يمرّ — لا حجب بعد السماح.
  usable(s)
  let threw = null
  try { A.assertPaid('workout.logSet') } catch (e) { threw = e }
  check('★ و`assertPaid` لا يرمي على مشترٍ منقطع', threw === null)
}

// ════════════════ ③ مستخدم مجّاني + انقطاع ⇒ لا Premium أبدًا ══════════════
console.log('\n③ مستخدم بلا استحقاق')
memory.clear()
server.session = sessionFor(ACCOUNT_B)
server.answer = row({ state: 'noAccess', type: 'none', serverTime: NOW })
{
  const s = await settle()
  check('متّصلًا: `none` كما قال الخادم', s.status === 'none')
  check('ولا يُحفظ شيء — الموجب وحده يُحفَظ', readRecord() === null)
  server.answer = NETWORK_ERROR
  const off = await settle(NOW + HOUR)
  check('★ ثم بانقطاع الشبكة: ما زال `none`', off.status === 'none' && off.source === 'backend', `${off.status}/${off.source}`)
  check('والسبب `absent` لا اختراعًا', off.cacheReason === 'absent', off.cacheReason)
  check('★ والحارس يمنع الفعل المدفوع', usable(off) === false)
  let threw = null
  try { A.assertPaid('workout.logSet') } catch (e) { threw = e }
  check('★ وكاتب طبقة المخازن يرمي `PaidActionDenied` باسمه',
    threw instanceof A.PaidActionDenied && threw.name === 'PaidActionDenied')
}
{
  // ولا تصير القراءة الفاشلة قفلًا: نفس المستخدم يفتح فورًا حين يشتري ويعود النت.
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW + 2 * HOUR })
  const back = await settle(NOW + 2 * HOUR)
  check('★ وقراءةٌ فاشلة لم تصر قفلًا: أوّل اتصال ناجح يفتح فورًا', back.status === 'active' && back.source === 'backend')
}

// ════════════════ ④ تبديل الحساب ⇒ لا تسرّب ══════════════════════════════
console.log('\n④ حساب أ ثم حساب ب')
memory.clear()
server.session = sessionFor(ACCOUNT_A)
server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
await settle()
check('سجلّ أ محفوظ', readRecord()?.accountId === ACCOUNT_A)
{
  server.session = sessionFor(ACCOUNT_B)
  server.answer = NETWORK_ERROR
  const s = await settle(NOW + HOUR)
  check('★ ب بلا شبكة لا يرث استحقاق أ', s.status === 'none', s.status)
  check('والسبب مسمّى `account_mismatch`', s.cacheReason === 'account_mismatch', s.cacheReason)
  check('★ والحارس يمنع ب', usable(s) === false)
  check('وسجلّ أ أُتلف عند المحاولة — لا يبقى بابًا مواربًا', readRecord() === null)
}
{
  // وطبقة العزل نفسها تمسحه: المفتاح ليس في قائمة السماح العامّة.
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle()
  check('سجلّ أ عاد بالتحقّق', readRecord() !== null)
  A.wipeUserData()
  check('★ و`wipeUserData()` (خروج/تبديل حساب) يمسحه — دفاع ثانٍ', readRecord() === null)
}

// ════════════ ⑤ إلغاء/انتهاء بعد عودة الاتصال ⇒ يُمسح فورًا ════════════════
console.log('\n⑤ الخادم يفوز فورًا — إلغاء واسترداد وانتهاء')
for (const [state, label] of [['revoked', 'موقوف'], ['trialExpired', 'تجربة منتهية'], ['noAccess', 'بلا وصول']]) {
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle()
  const seeded = readRecord() !== null
  server.answer = row({ state, type: 'none', serverTime: NOW + HOUR })
  const s = await settle(NOW + HOUR)
  check(`★ «${label}» بعد الاتصال ⇒ منع فوري`, seeded && s.status === 'none' && s.source === 'backend', `${s.status}/${s.source}`)
  check(`  وسجلّ المنحة مُسح في نفس اللحظة`, readRecord() === null)
  server.answer = NETWORK_ERROR
  const off = await settle(NOW + 2 * HOUR)
  check(`  ثم انقطاعٌ بعده لا يُحيي المنحة`, off.status === 'none' && off.cacheReason === 'absent')
}
{
  // الخروج: لا جلسة ⇒ لا استحقاق، والسجلّ يموت.
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle()
  server.session = NO_SESSION
  const s = await settle(NOW + HOUR)
  check('★ ولا جلسة ⇒ منع، والسجلّ يُمسح', s.status === 'none' && s.lastError === 'not_authenticated' && readRecord() === null,
    `${s.status}/${s.lastError}`)
}
{
  // وجلسةٌ غابت **بسبب الشبكة** ليست خروجًا: تلك اللحظة بالذات (رمز منتهٍ بلا نت)
  // هي أكثر ما يصيب مشتريًا في الطائرة.
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle()
  server.session = SESSION_NETWORK_DOWN
  const s = await settle(NOW + HOUR)
  check('★ ورمزٌ تعذّر تجديده بلا نت ليس «خروجًا» — السجلّ يصمد داخل النافذة',
    s.status === 'active' && s.source === 'cache', `${s.status}/${s.source}/${s.lastError}`)
  check('  ومع ذلك يبقى مربوطًا بحسابه', s.detail?.accountId === ACCOUNT_A)
}

// ════════════════ ⑥ سجلّ تالف ⇒ منع بسبب صادق باسمه ══════════════════════
console.log('\n⑥ سجلّ تالف أو معبوث')
async function withRecord(mutate, deviceNowMs = NOW + HOUR) {
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle()
  const rec = readRecord()
  const next = mutate(rec)
  if (next === null) memory.delete('qimmah:entitlement-verified:v1')
  else if (typeof next === 'string') memory.set('qimmah:entitlement-verified:v1', next)
  else writeRecord(next)
  server.answer = NETWORK_ERROR
  return settle(deviceNowMs)
}
{
  const s = await withRecord(() => '{ this is not json')
  check('★ سجلّ غير قابل للتحليل ⇒ منع باسم `unreadable`', s.status === 'none' && s.cacheReason === 'unreadable', s.cacheReason)
  check('★ ولا يُلبَس عطلُ التخزين ثوبَ انقطاع الشبكة', s.cacheReason !== 'offline' && s.cacheReason !== 'absent')
  check('وسبب الشبكة الحقيقي يبقى معلنًا معه', s.lastError === 'backend_offline', s.lastError)
  check('والسجلّ التالف يُتلف فلا يُعاد فحصه أبدًا', readRecord() === null)
}
{
  const s = await withRecord((r) => ({ ...r, expiresAtMs: 'soon' }))
  check('حقل من نوع آخر ⇒ `unreadable` لا اجتهاد', s.cacheReason === 'unreadable', s.cacheReason)
}
{
  const s = await withRecord((r) => ({ ...r, v: 99 }))
  check('نسخة سجلّ لا نعرفها ⇒ `wrong_version` ولا تُقرأ', s.cacheReason === 'wrong_version', s.cacheReason)
}

// ════════════════ ⑦ بناء المعاينة لا يملك سلطة استحقاق ════════════════════
console.log('\n⑦ بناء المعاينة (VITE_APP_ENV=founder_preview)')
{
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle() // سجلّ **سليم تمامًا** ببصمة صحيحة، كتبه بناء الإنتاج
  check('سجلّ إنتاجي سليم موجود على الجهاز', readRecord()?.accountId === ACCOUNT_A)

  const preview = await bundleLayer('preview', ENV_PREVIEW)
  const P = preview.mod
  check('بناء المعاينة بلا خادم أصلًا', P.backendAvailable() === false)
  const before = fetchCalls
  const resolved = await P.resolveEntitlement()
  const s = P.applyOfflineGrace(resolved, NOW + HOUR, 0)
  check('★ ولا يمنح شيئًا رغم السجلّ السليم', s.status === 'none', `${s.status}/${s.source}`)
  check('★ والسبب `backend_unconfigured` لا «ما فيه نت»', s.cacheReason === 'backend_unconfigured' && s.lastError === 'backend_unconfigured', `${s.cacheReason}/${s.lastError}`)
  check('★ ولا رحلة شبكة واحدة', fetchCalls === before, `${fetchCalls - before}`)
  check('ولا يمسّ السجلّ — لا يمنح منه ولا يتلفه', readRecord() !== null)
  // حذفُ بيانات اعتماد الإنتاج من **أرتيفكت** المعاينة يقيسه `test:preview-safety`
  // ببناء Vite حقيقي (طيّ الشرط وهزّ الأشجار)؛ ولا يُقاس بحزمة esbuild هنا لأن
  // `define` لكائن `import.meta.env` كاملًا لا يُطوى كما يطويه Vite. القياس في
  // موضعه أصدق من قياسٍ يمرّ بالمصادفة.
  check('★ ولو كان الفحص أعمى لما فرّق: نفس السجلّ يمنح في بناء الإنتاج',
    (await settleGrantsFromCache()) === true)
}
async function settleGrantsFromCache() {
  server.answer = NETWORK_ERROR
  const s = await settle(NOW + HOUR)
  return s.status === 'active' && s.source === 'cache'
}

// ════════════════ ⑧ الهجوم — كل التفاف يسقط باسمه ════════════════════════
console.log('\n⑧ الهجوم على الذاكرة')
{
  // ترقية «تجربة ⇒ Premium» بلا إعادة بصمة — أشهر تحوير يخطر ببال من يفتح devtools.
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'trialActive', type: 'trial', expiresAt: NOW + HOUR, serverTime: NOW })
  await settle()
  writeRecord({ ...readRecord(), entitlementType: 'premium', serverState: 'premiumActive', expiresAtMs: null })
  server.answer = NETWORK_ERROR
  const s = await settle(NOW + HOUR)
  check('★ قلب النوع/الحالة (تجربة ⇒ Premium) بلا إعادة بصمة ⇒ `tampered`',
    s.status === 'none' && s.cacheReason === 'tampered', s.cacheReason)
}
{
  const s = await withRecord((r) => ({ ...r, expiresAtMs: NOW + 10 * 365 * 24 * HOUR }))
  check('★ مدّ الانتهاء عشر سنوات ⇒ `tampered` لا منحة', s.status === 'none' && s.cacheReason === 'tampered', s.cacheReason)
}
{
  const s = await withRecord((r) => ({ ...r, accountId: ACCOUNT_B }))
  check('★ تبديل هوية السجلّ ⇒ `tampered` (البصمة تغطّي الهوية)', s.cacheReason === 'tampered', s.cacheReason)
}
{
  // وهوية مبدَّلة **مع** إعادة حساب البصمة: تسقط بالمطابقة لا بالبصمة.
  const s = await withRecord((r) => {
    const body = { ...r, accountId: ACCOUNT_B }
    delete body.integrity
    return { ...body, integrity: A.fingerprintRecord(body) }
  })
  check('★ وهوية مبدَّلة ببصمة مُعاد حسابها ⇒ `account_mismatch`', s.cacheReason === 'account_mismatch', s.cacheReason)
}
{
  const s = await withRecord((r) => r, NOW + 72 * HOUR + 60_000)
  check('★ تجاوز النافذة بدقيقة ⇒ `stale`', s.status === 'none' && s.cacheReason === 'stale', s.cacheReason)
}
{
  const s = await withRecord((r) => r, NOW - 6 * 60_000)
  check('★ إرجاع ساعة الجهاز ⇒ `clock_rollback` لا تمديد', s.status === 'none' && s.cacheReason === 'clock_rollback', s.cacheReason)
}
{
  const s = await withRecord((r) => r, NOW + 2 * 60_000 - 4 * 60_000)
  check('  بينما انحرافٌ دقيقتين إلى الوراء يُتسامح معه (تصحيح ساعة عادي)', s.status === 'active')
}
{
  // حدّ الانتهاء: تجربة ٧٢ ساعة محفوظة عند بقاء ساعتين.
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'trialActive', type: 'trial', expiresAt: NOW + 2 * HOUR, serverTime: NOW })
  await settle()
  server.answer = NETWORK_ERROR
  const before = await settle(NOW + 2 * HOUR - 60_000)
  check('★ تجربة باقٍ منها دقيقة (بلا شبكة) ⇒ ما زالت تعمل', before.status === 'active' && before.source === 'cache')
  const rem = before.detail.expiresAtMs - before.detail.serverTimeMs
  check('  والعدّاد يواصل من حيث تركه الخادم لا من لحظة التحقّق', rem === 60_000, String(rem))

  memory.clear()
  server.answer = row({ state: 'trialActive', type: 'trial', expiresAt: NOW + 2 * HOUR, serverTime: NOW })
  await settle()
  server.answer = NETWORK_ERROR
  const after = await settle(NOW + 2 * HOUR)
  check('★ وعند الحدّ بالضبط ⇒ `expired` — انقطاعُ الشبكة لا يمدّ تجربة',
    after.status === 'none' && after.cacheReason === 'expired', after.cacheReason)
  check('  والسجلّ المنتهي يُتلف', readRecord() === null)
}
{
  // حالة غير قابلة للحفظ مدسوسة ببصمة صحيحة — الجدول الحاكم يرفضها.
  const s = await withRecord((r) => {
    const body = { ...r, serverState: 'revoked' }
    delete body.integrity
    return { ...body, integrity: A.fingerprintRecord(body) }
  })
  check('★ سجلّ بحالة غير فعّالة (`revoked`) ببصمة صحيحة ⇒ `state_not_cacheable`',
    s.status === 'none' && s.cacheReason === 'state_not_cacheable', s.cacheReason)
}
{
  // الجدول الحاكم واحد: ما يمنحه الخادم هو ما تمنحه الذاكرة، لا أكثر.
  const leaks = []
  for (const state of A.SERVER_ENTITLEMENT_STATES) {
    const body = {
      v: 1, accountId: ACCOUNT_A, serverState: state, entitlementType: 'premium',
      noExpiry: true, expiresAtMs: null, activatedAtMs: null,
      verifiedAtServerMs: NOW, verifiedAtDeviceMs: NOW,
    }
    memory.clear()
    writeRecord({ ...body, integrity: A.fingerprintRecord(body) })
    const outcome = A.replayVerifiedEntitlement(ACCOUNT_A, NOW + HOUR, 0)
    const serverSays = A.statusForServerState(state) === 'active'
    if (outcome.granted !== serverSays) leaks.push(`${state}:${outcome.granted}≠${serverSays}`)
  }
  check('★ الذاكرة تمنح لِما يمنحه الخادم بالضبط — لا حالة زائدة ولا ناقصة',
    leaks.length === 0, leaks.join('، '))
}
{
  // ⚠️ حدّ معلَن لا ثغرة مخفيّة — نفس منطق `attack-forgery` مع المخزن.
  memory.clear()
  const body = {
    v: 1, accountId: ACCOUNT_A, serverState: 'premiumActive', entitlementType: 'premium',
    noExpiry: true, expiresAtMs: null, activatedAtMs: null,
    verifiedAtServerMs: NOW, verifiedAtDeviceMs: NOW,
  }
  writeRecord({ ...body, integrity: A.fingerprintRecord(body) })
  const outcome = A.replayVerifiedEntitlement(ACCOUNT_A, NOW + HOUR, 0)
  check('⚠️ حدّ معلَن: من يملك تنفيذ كود في الصفحة يصنع سجلًّا صالحًا — والبصمة كشفٌ لا توقيع',
    outcome.granted === true)
  check('   ويبقى الحدّ محدودًا: أوّل اتصال بالخادم يمحوه',
    await (async () => {
      server.session = sessionFor(ACCOUNT_A)
      server.answer = row({ state: 'noAccess', type: 'none', serverTime: NOW + HOUR })
      const s = await settle(NOW + HOUR)
      return s.status === 'none' && readRecord() === null
    })())
}

// ════════════════ ⑨ صدق الحفظ — لا نجاح زائف ══════════════════════════════
console.log('\n⑨ صدق طبقة التخزين (الميثاق §5)')
{
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  quota = true
  const s = await settle()
  quota = false
  check('تخزينٌ ممتلئ لا يمنع الجلسة الحالية من العمل', s.status === 'active' && s.source === 'backend')
  check('★ ولا يُدّعى حفظٌ لم يقع', readRecord() === null)
  const detail = { serverState: 'premiumActive', entitlementType: 'premium', noExpiry: true, expiresAtMs: null, activatedAtMs: null, serverTimeMs: NOW, receivedAtPerfMs: 0, accountId: ACCOUNT_A }
  quota = true
  const result = A.rememberVerifiedEntitlement(detail, NOW)
  quota = false
  check('★ والكتابة تُرجع سببها الصادق لا `ok`', result === 'quota', String(result))
  check('وحفظ حالة غير موجبة مرفوض من الأصل',
    A.rememberVerifiedEntitlement({ ...detail, serverState: 'revoked', entitlementType: 'none' }, NOW) === 'error' && readRecord() === null)
}

// ════════════ ⑩ التأكيد المضادّ — تعطيل الحرّاس يجب أن يُسقط فحوصًا بأسمائها ═
console.log('\n⑩ التأكيد المضادّ (§4.2) — بناءٌ منزوع الحارس يخترق')
{
  const neutered = await bundleLayer('no-integrity', ENV_PROD, {
    file: 'src/lib/access/entitlementCache.ts',
    apply: (t) => t.replace(
      "  if (integrity !== fingerprintRecord(body)) return { reason: 'tampered', elapsedMs }",
      '  void integrity; void body'),
  })
  const N = neutered.mod
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'trialActive', type: 'trial', expiresAt: NOW + HOUR, serverTime: NOW })
  await settle()
  const forged = { ...readRecord(), serverState: 'premiumActive', entitlementType: 'premium', expiresAtMs: null }
  // ترتيب مقصود: البناء السليم **يُتلف** السجلّ المرفوض، فلو سُئل أوّلًا لوجد
  // البناءُ المعطوب فراغًا وبدا رافضًا مثله — أي لَبَدا الفحص ناجحًا وهو أعمى.
  writeRecord(forged)
  const broken = N.replayVerifiedEntitlement(ACCOUNT_A, NOW + HOUR, 0)
  writeRecord(forged)
  const healthy = A.replayVerifiedEntitlement(ACCOUNT_A, NOW + HOUR, 0)
  check('★ بناءٌ بلا فحص بصمة يقبل ترقية «تجربة ⇒ Premium» المزوَّرة', broken.granted === true)
  check('★ والسليم يرفضها باسم `tampered` — فالفحص يقيس شيئًا لا يمرّ مجّانًا',
    healthy.granted === false && healthy.reason === 'tampered', healthy.reason)
}
{
  const loose = await bundleLayer('no-account', ENV_PROD, {
    file: 'src/lib/access/entitlementCache.ts',
    apply: (t) => t.replace(
      "  if (accountId !== null && record.accountId !== accountId) return { reason: 'account_mismatch', elapsedMs }",
      '  void accountId'),
  })
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle()
  const broken = loose.mod.replayVerifiedEntitlement(ACCOUNT_B, NOW + HOUR, 0)
  const healthy = A.replayVerifiedEntitlement(ACCOUNT_B, NOW + HOUR, 0)
  check('★ بناءٌ بلا ربط هوية يسلّم استحقاق أ إلى ب', broken.granted === true)
  check('★ والسليم يرفض باسم `account_mismatch`', healthy.granted === false && healthy.reason === 'account_mismatch')
}
{
  const wide = await bundleLayer('no-window', ENV_PROD, {
    file: 'src/lib/access/entitlementCache.ts',
    apply: (t) => t.replace(
      "  if (elapsedMs > OFFLINE_GRACE_MS) return { reason: 'stale', elapsedMs }",
      '  void OFFLINE_GRACE_MS'),
  })
  memory.clear()
  server.session = sessionFor(ACCOUNT_A)
  server.answer = row({ state: 'premiumActive', type: 'premium', noExpiry: true, serverTime: NOW })
  await settle()
  const far = NOW + 400 * 24 * HOUR
  check('★ بناءٌ بلا نافذة سماح يمنح بعد سنة بلا اتصال', wide.mod.replayVerifiedEntitlement(ACCOUNT_A, far, 0).granted === true)
  check('★ والسليم يرفض باسم `stale`', A.replayVerifiedEntitlement(ACCOUNT_A, far, 0).reason === 'stale')
}

// ════════════ ⑪ ما لم يُمَس — سلطة الخادم والفشل المغلق ═══════════════════
console.log('\n⑪ لم يُضعَف شيء')
{
  A.resetEntitlement()
  check('الحالة الابتدائية ما زالت `loading` المغلقة', A.getEntitlement().status === 'loading')
  check('ولا فعل مدفوع يمرّ فيها', A.PAID_ACTIONS.every((a) => A.canPerform(a) === false))
  const leaks = []
  for (const action of A.PAID_ACTIONS) {
    for (const st of ['loading', 'none', 'cache', 'premiumActive', undefined, null, '', true, 1]) {
      if (A.isPaidActionAllowed(action, st)) leaks.push(`${action}/${JSON.stringify(st)}`)
    }
  }
  check('★ ولا حالة غير `active` تفتح شيئًا — ولا حتى الاسم `cache`', leaks.length === 0, leaks.join('،'))
  check('و`active` وحدها تمرّ — فالفحص يميّز لا يرفض كل شيء', A.PAID_ACTIONS.every((a) => A.isPaidActionAllowed(a, 'active')))
  const backendSrc = (await import('node:fs')).readFileSync(resolve(root, 'src/lib/access/entitlementBackend.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')
  check('★ وجسر الخادم نفسه ما زال بلا ذاكرة — لا يقرأ تخزينًا ولا يستورد الذاكرة',
    !backendSrc.includes('entitlementCache') && !/storage/i.test(backendSrc))
  check('وكل فشل فيه ما زال يعود منعًا', (backendSrc.match(/return \{ \.\.\.DENIED/g) ?? []).length >= 6)
}

// ── الخلاصة ─────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass)
console.log('\n' + '─'.repeat(66))
if (failed.length === 0) console.log(`✅ سماح الانقطاع: ${results.length} فحصًا، 0 فشل.\n`)
else {
  console.log(`❌ ${failed.length} فشل من ${results.length}:`)
  for (const f of failed) console.log(`   ✗ ${f.label}${f.detail ? ` — ${f.detail}` : ''}`)
  console.log('')
}
process.exit(failed.length ? 1 : 0)
