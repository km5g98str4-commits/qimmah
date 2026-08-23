/**
 * إثبات أمان معاينة المؤسس — [QIMMAH-FOUNDER-QA-PREVIEW-SAFETY-001].
 *
 * ═══ الخطر الذي يحرسه ═══
 * `supabaseClient` يحمل عنوان مشروع الإنتاج ومفتاح anon **مخبوزين كاحتياط**،
 * و`isSupabaseConfigured()` تعيد `true` بمجرّد وجودهما. وكل كاتب خطير يسأل
 * هذا السؤال وحده. فأي بناء بلا متغيّرات بيئة — **بما فيه نشرة معاينة** —
 * كان يملك سلطة كتابة كاملة على الإنتاج: `start_trial` حقيقي ·
 * `redeem_access_code` يستهلك كودًا حقيقيًا · `signUp` ينشئ مستخدمًا ويرسل بريدًا.
 *
 * ═══ العلاج المُثبَت هنا ═══
 * في `VITE_APP_ENV=founder_preview` يُقرأ الشرط **حرفيًّا وقت البناء**، فيطوي
 * المُصغِّر الاحتياط ويحذف بيانات الاعتماد من الأرتيفكت. فالضمان **بنيوي**:
 * الحزمة لا تحمل العنوان أصلًا — لا «تحمله ولا تستعمله».
 *
 * ═══ ثلاث طبقات ═══
 *   ① الأرتيفكت  — العنوان غائب من بناء المعاينة، حاضر في الإنتاج (بلا تغيير).
 *   ② السلوك     — كل كاتب خطير يعيد حالته الصادقة **بلا أي نداء شبكة** (مِشْبَك
 *                   على `fetch` يعدّ المحاولات: يجب أن يكون صفرًا).
 *   ③ الهجوم     — استدعاء الكاتب مباشرةً (تجاوز الواجهة)، ومحاولة قلب الوضع من
 *                   `localStorage`/`sessionStorage`/العنوان، ومحاكاة ارتداد.
 */
import { build } from 'esbuild'
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROD_HOST = 'ledlypcyrtnzvjvhykwz'

let pass = 0
const fails = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}
/** كم ملفًا في `dist` يحمل عنوان الإنتاج؟ (يُبنى الوضع المطلوب أولًا) */
function filesWithProdHost(env) {
  execSync('npm run build', {
    cwd: root, stdio: 'ignore',
    env: { ...process.env, ...(env === 'founder_preview' ? { VITE_APP_ENV: 'founder_preview' } : {}) },
  })
  return walk(join(root, 'dist')).filter((f) => {
    try { return readFileSync(f, 'utf8').includes(PROD_HOST) } catch { return false }
  })
}

// ── ① طبقة الأرتيفكت ─────────────────────────────────────────────────────────
console.log('\n① الأرتيفكت — بيانات الإنتاج محذوفة من بناء المعاينة')
const previewHits = filesWithProdHost('founder_preview')
check(`بناء المعاينة لا يحمل عنوان الإنتاج إطلاقًا (وُجد في ${previewHits.length} ملف)`, previewHits.length === 0,
  previewHits.slice(0, 3).join(' · '))
const prodHits = filesWithProdHost('production')
check(`وبناء الإنتاج ما زال يحمله — سلوك الإنتاج لم يتغيّر (${prodHits.length} ملف)`, prodHits.length >= 1)
const idx = readFileSync(join(root, 'dist/index.html'), 'utf8')
check('وسم البيئة يعلن الإنتاج في بناء الإنتاج', /name="qimmah-env" content="production"/.test(idx))

// ── ② طبقة السلوك — الكتّاب الخطرون فوق بيئة معاينة مُحاكاة ─────────────────
console.log('\n② السلوك — كل كاتب خطير يفشل مغلقًا بلا نداء شبكة')

const ENTRY = `
import { isSupabaseConfigured, getSupabase } from '@/lib/supabaseClient'
import { startTrialOnServer, redeemCodeOnServer, claimPendingGrantsOnServer, backendAvailable } from '@/lib/access/entitlementBackend'
import { resolveEntitlement, redeemActivationCode, clearMockEntitlement, startTrial, FOUNDER_QA_CODE } from '@/lib/access/entitlementSource'
export { isSupabaseConfigured, getSupabase, startTrialOnServer, redeemCodeOnServer,
         claimPendingGrantsOnServer, backendAvailable, resolveEntitlement, redeemActivationCode,
         clearMockEntitlement, startTrial, FOUNDER_QA_CODE }
`
async function loadUnder(appEnv) {
  const dir = mkdtempSync(join(tmpdir(), 'fp-safety-'))
  const entry = join(dir, 'entry.ts')
  writeFileSync(entry, ENTRY)
  const out = join(dir, 'bundle.mjs')
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': join(root, 'src') },
    define: {
      'import.meta.env': JSON.stringify({
        MODE: 'production', DEV: false, PROD: true,
        ...(appEnv ? { VITE_APP_ENV: appEnv } : {}),
      }),
    },
    logLevel: 'silent',
  })
  return import(pathToFileURL(out).href)
}

/** مِشْبَك الشبكة: أي محاولة خروج تُعدّ وتُرفض — فالصفر دليل لا ادّعاء. */
function installNetworkTripwire() {
  const attempts = []
  globalThis.fetch = async (input) => {
    attempts.push(String(input))
    throw new Error('NETWORK_TRIPWIRE: outbound request attempted')
  }
  globalThis.XMLHttpRequest = class { open(_m, u) { attempts.push(String(u)) ; throw new Error('NETWORK_TRIPWIRE') } }
  return attempts
}

const store = new Map()
const ls = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => store.delete(k), clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null, get length() { return store.size },
}
globalThis.localStorage = ls
globalThis.sessionStorage = ls
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: ls, sessionStorage: ls, location: { href: 'https://preview.example/', hash: '', search: '' }, addEventListener() {}, removeEventListener() {} }
if (typeof globalThis.performance === 'undefined') globalThis.performance = { now: () => 0 }

const attempts = installNetworkTripwire()
const preview = await loadUnder('founder_preview')

check('`isSupabaseConfigured()` كاذبة في المعاينة', preview.isSupabaseConfigured() === false)
check('`backendAvailable()` كاذبة في المعاينة', preview.backendAvailable() === false)
check('`getSupabase()` تعيد null (لا عميل يُبنى أصلًا)', (await preview.getSupabase()) === null)

// ③ الهجوم: استدعاء الكاتب **مباشرةً** — تجاوز الواجهة كما يفعل مستخدم متمرّس.
//
// [SOVEREIGN-COMMERCE-001] **شُدَّت هذه الفحوص الثلاثة، ولم تُرخَ.**
// كانت تشترط الرفض بالكلمة `offline` حرفيًّا — أي أنها كانت **تثبّت العيب**:
// «تأكّد من النت» جوابًا عن بناءٍ لا خادم فيه أصلًا. والخاصيّة التي تحرسها
// هذه الطبقة ليست نصّ الرفض بل **أن الكاتب يرفض بلا نداء شبكة**، وهي مصونة
// (⑤ و⑧ أدناه). فصار الشرط أقوى: الرفض `backend_unconfigured` بعينه،
// و**ليس** `offline` — فبناء المراجعة لا يجوز أن يلوم شبكة المستخدم.
const REFUSES_HONESTLY = (v) => v === 'backend_unconfigured'
const trial = await preview.startTrialOnServer()
check('② بدء تجربة إنتاج مستحيل — الكاتب المباشر يرفض بـ`backend_unconfigured`', REFUSES_HONESTLY(trial), `عاد: ${trial}`)
check('   ولا يلوم شبكة المستخدم على غياب خادمٍ في البناء', trial !== 'offline', `عاد: ${trial}`)
const redeem = await preview.redeemCodeOnServer('QIMMAHTEST2024')
check('③ استهلاك كود تفعيل إنتاج مستحيل — الكاتب المباشر يرفض بـ`backend_unconfigured`', REFUSES_HONESTLY(redeem), `عاد: ${redeem}`)
check('   وكذلك لا يلوم الشبكة', redeem !== 'offline', `عاد: ${redeem}`)
const claim = await preview.claimPendingGrantsOnServer()
check('منح معلّقة لا تُطالَب', claim === false, `عاد: ${claim}`)
/**
 * [LIVE-QA-A] أمرُ المؤسس فتح **مراجعة QA** داخل بناء المعاينة وحده، فصار
 * مصدر الاستحقاق `mock` لا `none`. والخاصيّة المحروسة هنا **اشتدّت لا رخت**:
 * كانت «لا استحقاق»، وصارت «لا استحقاق قبل تفعيل معلَن **ولا ادّعاء شهادة
 * خادم أبدًا**». و`mock` تُعلن محلّيتها؛ `none` كانت تخفيها خلف حياد.
 */
const ent = await preview.resolveEntitlement()
check('الاستحقاق `none` قبل أي تفعيل — المعاينة لا تمنح شيئًا بذاتها',
  ent.status === 'none', JSON.stringify(ent))
check('   والسبب معلَن: خادمٌ غير مضبوط، لا شبكة المستخدم',
  ent.lastError === 'backend_unconfigured', JSON.stringify(ent))
check('   ولا يدّعي شهادة خادم (`backend`) أبدًا',
  ent.source !== 'backend', JSON.stringify(ent))
check('   ويُعلن محلّيته صراحةً (`mock`) لا يتنكّر في حياد `none`',
  ent.source === 'mock', JSON.stringify(ent))
// وكودٌ خارج مجموعة المراجعة يُردّ **بالسبب الصادق ولا يمنح**: «لم يُجرَّب»
// لا «جُرّب فلم يُقبل» — فالمعاينة لا خادم لها تحاكم به كود أحد.
const redeemUi = await preview.redeemActivationCode('QIMMAH-TEST-CODE')
check('مسار الواجهة للاستبدال يرفض بنفس السبب المعلَن', REFUSES_HONESTLY(redeemUi), `عاد: ${redeemUi}`)
check('   ولا يحكم على كود المستخدم بـ`invalid` وهو لم يُجرَّب', redeemUi !== 'invalid', `عاد: ${redeemUi}`)
const afterBadCode = await preview.resolveEntitlement()
check('   ولم يمنح شيئًا: الاستحقاق ما زال `none`', afterBadCode.status === 'none', JSON.stringify(afterBadCode))
check('   والحقل الفارغ يُردّ محلّيًا بـ`empty` — بلا نداء ولا لوم',
  (await preview.redeemActivationCode('   ')) === 'empty')

// ⑤ لا نجاح كاذب: لا نتيجة من النتائج أعلاه تعني «تم».
const SUCCESSY = new Set(['success', 'active', 'started', 'ok', true])
check('⑤ لا نتيجة تدّعي نجاحًا لم يحدث', ![trial, redeem, claim, redeemUi, ent.status].some((v) => SUCCESSY.has(v)))

// ⑧ المِشْبَك: صفر محاولات خروج طوال ما سبق.
check(`⑧ صفر نداء شبكة صادر عن الكتّاب (سُجّل ${attempts.length})`, attempts.length === 0, attempts.slice(0, 3).join(' · '))

// ── ⑨ الشقّ المعلَن: مراجعة QA حقيقية · محلّية · قابلة للإقفال ───────────────
/**
 * [LIVE-QA-A] الشقّ الذي فتحه أمر المؤسس **يُعلن ويُقاس** — لا يُترك موجودًا
 * بلا حارس. وأربع خصائص تُثبت هنا مجتمعةً، لا واحدة منها تكفي وحدها:
 *   • حقيقي   — الكود المسمّى يمنح فعلًا (وإلا فالمؤسس عالق كما كان).
 *   • محلّي   — بصفر نداء شبكة (المِشْبَك شاهد، لا الادّعاء).
 *   • محصور  — التجربة الحقيقية لا تمرّ منه، فلا يشهد على عقد الخادم.
 *   • راجع    — إقفال واحد يعيد الحالة، فإعادة الضبط حتمية لا احتمالية.
 */
console.log('\n⑨ شقّ مراجعة QA — معلَن، محلّي، محصور، وقابل للإقفال')
const beforeQa = attempts.length
const qaRedeem = await preview.redeemActivationCode(preview.FOUNDER_QA_CODE)
check('كود المراجعة المسمّى يمنح في المعاينة (الشقّ حقيقي لا زينة)', qaRedeem === 'success', `عاد: ${qaRedeem}`)
const qaEnt = await preview.resolveEntitlement()
check('   والاستحقاق `active` بمصدر `mock` المعلَن — لا `backend`',
  qaEnt.status === 'active' && qaEnt.source === 'mock', JSON.stringify(qaEnt))
check('   وبلا نداء شبكة واحد (المِشْبَك ما زال صفرًا)',
  attempts.length === beforeQa, attempts.slice(0, 3).join(' · '))
const qaTrial = await preview.startTrial()
check('   والتجربة الحقيقية لا تمرّ من الشقّ — تبقى مرفوضة بسببها المعلَن',
  qaTrial === 'backend_unconfigured', `عاد: ${qaTrial}`)
preview.clearMockEntitlement()
const qaCleared = await preview.resolveEntitlement()
check('   وإقفال واحد يعيدها `none` — إعادة ضبط حتمية لا احتمالية',
  qaCleared.status === 'none', JSON.stringify(qaCleared))

// ⚔️ ولا تُشترى الترقية من مخزن المستخدم: مفاتيح المنتج المزوَّرة لا تمنح شيئًا.
//    (سلطة QA الوحيدة مخزنها المعلَن، وهو **غائب من الإنتاج** — يحرسه
//     `test:qa-boundary` على الأرتيفكت لا على المصدر.)
for (const k of ['qimmah:entitlement', 'qimmah:premium', 'premiumActive', 'qimmah:access']) store.set(k, 'active')
const forged = await preview.resolveEntitlement()
check('⚔️ تزوير مفاتيح المنتج في التخزين لا يمنح شيئًا', forged.status === 'none', JSON.stringify(forged))
for (const k of ['qimmah:entitlement', 'qimmah:premium', 'premiumActive', 'qimmah:access']) store.delete(k)

// ── ③ الوضع لا يُقلَب من المتصفّح ────────────────────────────────────────────
console.log('\n③ الوضع قرار بناء لا يملكه المستخدم')
const appEnvSrc = readFileSync(join(root, 'src/lib/appEnv.ts'), 'utf8')
const clientSrc = readFileSync(join(root, 'src/lib/supabaseClient.ts'), 'utf8')
const USER_CONTROLLED = /localStorage|sessionStorage|location\.(search|hash|href)|document\.cookie|URLSearchParams/
check('`appEnv` لا يقرأ أي مصدر يملكه المستخدم', !USER_CONTROLLED.test(code(appEnvSrc)))
check('و`supabaseClient` كذلك في قرار الاحتياط', !USER_CONTROLLED.test(code(clientSrc).split('export function isSupabaseConfigured')[0]))
// ومحاولة فعلية للقلب من التخزين ثم إعادة السؤال.
store.set('VITE_APP_ENV', 'production'); store.set('qimmah:env', 'production')
check('⑦ دسّ `production` في التخزين لا يقلب الوضع', preview.isSupabaseConfigured() === false)

// ── ④ محاكاة الارتداد — الحارس يعضّ ─────────────────────────────────────────
console.log('\n④ محاكاة ارتداد — إعادة الاحتياط غير المشروط تُسقط الفحص باسمه')
const restored = clientSrc
  .replace("const url = explicitUrl || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_URL)", 'const url = explicitUrl || DEFAULT_SUPABASE_URL')
  .replace("const anonKey = explicitAnonKey || (IS_FOUNDER_PREVIEW ? '' : DEFAULT_SUPABASE_ANON_KEY)", 'const anonKey = explicitAnonKey || DEFAULT_SUPABASE_ANON_KEY')
check('نسخة الارتداد اختلفت فعلًا عن المصدر', restored !== clientSrc)
check('وفيها يعود الاحتياط غير مشروط (الشرط البنيوي سقط)',
  !/IS_FOUNDER_PREVIEW \? '' : DEFAULT_SUPABASE_URL/.test(restored) && /explicitUrl \|\| DEFAULT_SUPABASE_URL/.test(restored))

// ⑥ الإنتاج بلا تغيير — نفس الوحدات تحت بيئة الإنتاج.
console.log('\n⑤ الإنتاج بلا تغيير')
const prod = await loadUnder(null)
check('⑥ الإنتاج: `isSupabaseConfigured()` صادقة كما كانت', prod.isSupabaseConfigured() === true)
check('⑥ الإنتاج: `backendAvailable()` صادقة كما كانت', prod.backendAvailable() === true)

// ⚔️ [LIVE-QA-A] وشقّ المراجعة **مشروط بالبناء**، لا بالكود: نفس الكود المسمّى
//    على وحدات الإنتاج لا يمنح شيئًا — وهذا هو الفرق بين شقٍّ محصور وبابٍ خلفي.
const prodRedeem = await prod.redeemActivationCode(preview.FOUNDER_QA_CODE)
check('⚔️ الكود نفسه على بناء الإنتاج لا يمنح', prodRedeem !== 'success', `عاد: ${prodRedeem}`)
const prodEnt = await prod.resolveEntitlement()
check('   والاستحقاق هناك ليس `active` ولا مصدره `mock`',
  prodEnt.status !== 'active' && prodEnt.source !== 'mock', JSON.stringify(prodEnt))

/**
 * ⚠️ **المِشْبَك يجب أن يُثبَت صالحًا، والفرق البنيوي أن يُقاس.**
 *
 * «صفر نداء شبكة» وحده كان سيكون ادّعاءً رخوًا: تبيّن عند مهاجمته أن الإنتاج
 * **أيضًا** لا يخرج للشبكة بلا جلسة — كل كاتب يسأل `getSession()` أولًا ويعود
 * `not_authenticated`. فالصفر في المعاينة ليس دليلًا بذاته، وسُجّل ذلك بدل
 * تمريره. الدليل الحقيقي طبقتان:
 *   (أ) الأداة تعمل — نداء مباشر يُسجَّل.
 *   (ب) الفارق البنيوي — الإنتاج يبني **عميلًا**، والمعاينة تعيد `null`. فحتى
 *       مع جلسة صالحة لا يوجد في المعاينة كائنٌ يُنادى به الخادم أصلًا.
 */
attempts.length = 0
await fetch('https://' + PROD_HOST + '.supabase.co/probe').catch(() => undefined)
check(`المِشْبَك أداة صالحة — النداء المباشر يُسجَّل (${attempts.length})`, attempts.length === 1)

const prodClient = await prod.getSupabase()
check('الإنتاج يبني عميلًا فعليًّا (سلطة قائمة)', prodClient !== null && typeof prodClient === 'object')
check('والمعاينة لا عميل لها — لا كائن يُنادى به الخادم مهما كانت الجلسة',
  (await preview.getSupabase()) === null)

if (fails.length) {
  console.log(`\n❌ أمان المعاينة: ${pass} نجحت · ${fails.length} فشلت`)
  fails.forEach((f) => console.log(`   • ${f}`))
  process.exit(1)
}
console.log(`\n✅ أمان معاينة المؤسس: ${pass} فحصًا · 0 فشل`)
