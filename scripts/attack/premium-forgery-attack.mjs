// ============================================================================
// test:attack-forgery — كل طريق عميل إلى `status:'active'` يُجرَّب ويُرفض.
// ============================================================================
// [OVERNIGHT-THREAT] · AGENT-F.
//
// الفرضية المُهاجَمة: «العميل لا يمنح نفسه شيئًا» (`entitlementSource.ts` §١١).
// الادّعاء لا يُقرأ — يُهاجَم. كل ناقل تخزين/عنوان/رسالة يُملأ بقيمة تقول
// «مدفوع»، ثم يُسأل الكود الحقيقي (مبنيًّا بـesbuild من `src/` لا منسوخًا).
//
// ═══ الاقتران المطلوب (الميثاق §4.2) ═══
// ماسحٌ يرفض دائمًا يمرّ مجّانًا. فالإثبات **بناءان**:
//   • بناء الإنتاج (بلا `VITE_ENTITLEMENT_MODE`) ⇒ كل ناقل يُرفَض.
//   • بناء التقليد (`VITE_ENTITLEMENT_MODE=mock`) ⇒ ناقل بذرة الاختبار **ينجح**،
//     فيثبت أن الرفض في الإنتاج نتيجة مستحقّة لا عمى أداة.
// إن رُفض الناقل في البناءين فالفحص أعمى، ويسقط بفحص مسمّى `harness-blind`.
// ============================================================================
import { build } from 'esbuild'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const dir = mkdtempSync(join(tmpdir(), 'qimmah-forgery-'))

let passed = 0
const check = (label, condition) => {
  if (!condition) throw new Error(`FAIL: ${label}`)
  passed += 1
  console.log(`  ✓ ${label}`)
}

// ── الجهاز المزيَّف: تخزين وعنوان ورسائل يتحكّم بها «المهاجم» بالكامل ────────
function installHostileBrowser() {
  const mem = () => {
    const m = new Map()
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      clear: () => m.clear(),
      get length() { return m.size },
      key: (i) => [...m.keys()][i] ?? null,
      __raw: m,
    }
  }
  const localStorage = mem()
  const sessionStorage = mem()
  const listeners = new Map()
  const win = {
    localStorage,
    sessionStorage,
    location: {
      href: 'https://qimmah.example/?premium=1&entitlement=active&status=premiumActive#premiumActive',
      search: '?premium=1&entitlement=active&status=premiumActive',
      hash: '#premiumActive',
      pathname: '/',
    },
    addEventListener: (t, fn) => { listeners.set(t, [...(listeners.get(t) ?? []), fn]) },
    removeEventListener: () => {},
    postMessage: (data) => {
      for (const fn of listeners.get('message') ?? []) fn({ data, origin: 'https://evil.example' })
    },
    __listeners: listeners,
  }
  globalThis.window = win
  globalThis.localStorage = localStorage
  globalThis.sessionStorage = sessionStorage
  globalThis.document = { cookie: '' }
  return win
}

// [OVERNIGHT-5] الهجوم **معزول عن الشبكة**.
//
// بعد وصول عقد الخادم صار المسار الإنتاجي ينادي Supabase فعلًا. وإثبات أمنيّ
// يخرج إلى الشبكة يصير رهينةً لها: يبطئ، ويتذبذب، ويسقط لأسباب لا علاقة لها
// بما يفحصه. فيُقطع الاتصال عند الجذر — `fetch` يرفض فورًا — ونفحص أن الرفض
// **يُغلق ولا يفتح**. وهذا أقوى: يثبت السلوك تحت شبكة معادية لا شبكة سليمة.
globalThis.fetch = () => Promise.reject(new Error('network blocked by attack harness'))

const ENV_PROD = { MODE: 'production', DEV: false, PROD: true }
const ENV_MOCK = { MODE: 'production', DEV: false, PROD: true, VITE_ENTITLEMENT_MODE: 'mock' }

async function bundle(entry, name, env, external = []) {
  const out = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    external,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': JSON.stringify(env) },
    logLevel: 'silent',
  })
  const file = join(dir, `${name}.mjs`)
  writeFileSync(file, out.outputFiles[0].text)
  return { mod: await import(pathToFileURL(file).href), text: out.outputFiles[0].text }
}

/**
 * طبقة الوصول كلها في **حزمة واحدة**.
 *
 * الفصل إلى حزم مستقلّة كان سيعطي كل حزمة **نسخة خاصّة** من مخزن الاستحقاق —
 * فيبدو الحارس رافضًا بينما المخزن الذي عُدّل غيرُ الذي يقرؤه. حزمة واحدة تعني
 * أن الرسم البياني للوحدات هو نفسه الذي يشحنه Vite.
 */
async function bundleAccessLayer(name, env) {
  const entry = join(dir, `${name}-entry.ts`)
  writeFileSync(entry, [
    `export * from '${resolve(root, 'src/lib/access/entitlementSource').replaceAll('\\', '/')}'`,
    `export * from '${resolve(root, 'src/lib/access/entitlementStore').replaceAll('\\', '/')}'`,
    `export * from '${resolve(root, 'src/lib/access/guard').replaceAll('\\', '/')}'`,
    `export * from '${resolve(root, 'src/lib/access/paidActions').replaceAll('\\', '/')}'`,
    `export { CLOSED_ACCESS } from '${resolve(root, 'src/lib/access/context').replaceAll('\\', '/')}'`,
  ].join('\n'))
  return bundle(entry, name, env)
}

/** كل النواقل التي يملكها مهاجم في المتصفّح — تُملأ دفعةً قبل كل سؤال. */
const FORGED_KEYS = [
  'qimmah:entitlement-mock:v1', 'qimmah:entitlement', 'qimmah:premium', 'premium',
  'entitlement', 'status', 'qimmah_premium', 'qimmah:access', 'qimmah:paid',
  'subscription', 'isPremium', 'qimmah:entitlement:v1',
]
function poisonEverything(win) {
  for (const k of FORGED_KEYS) {
    win.localStorage.setItem(k, 'active')
    win.sessionStorage.setItem(k, 'active')
  }
  win.localStorage.setItem('qimmah:entitlement', JSON.stringify({ status: 'active', source: 'backend' }))
  globalThis.document.cookie = 'premium=active; entitlement=premiumActive; qimmah_role=founder'
}

console.log('\n⚔️  هجوم تزوير Premium — كل ناقل عميل')

const win = installHostileBrowser()
poisonEverything(win)

// ════════════════════ ① بناء الإنتاج — كل ناقل يُرفَض ════════════════════
console.log('\n① بناء الإنتاج (بلا VITE_ENTITLEMENT_MODE)')
const prod = await bundleAccessLayer('prod-access', ENV_PROD)
// [OVERNIGHT-5] حزمة **كودنا وحده**: عميل Supabase خارجيّ.
//
// وليس هذا تخفيفًا. عقد الخادم أدخل `@supabase/supabase-js` في الرسم البياني،
// وهو يقرأ `window.location.href` عمدًا (`detectSessionInUrl`) لالتقاط رمز
// المصادقة من روابط الدعوة — وهي الآلية التي يقوم عليها مسار التفعيل نفسه.
// فمسحُ الحزمة كاملةً صار يقيس **سلوك المكتبة** لا سلوكنا، ويخلط قراءةَ رمز
// مصادقة يتحقّق منه الخادم بمنحِ استحقاق من العنوان — وهما ليسا الشيء نفسه.
// الضمان المقصود يبقى محفوظًا ويُفحص أدناه: **استحقاقنا لا يُشتقّ من العنوان.**
const sourceOnly = await bundle(resolve(root, 'src/lib/access/entitlementSource.ts'), 'prod-source-only', ENV_PROD, ['@supabase/supabase-js'])
const prodGuard = prod, prodStore = prod, prodPolicy = prod, prodCtx = prod

check('وضع التقليد مطفأ في بناء الإنتاج', prod.mod.mockEnabled() === false)

const r1 = await prod.mod.resolveEntitlement()
check(`localStorage مسمومة بـ${FORGED_KEYS.length} مفتاحًا ⇒ ما زال ${r1.status}`, r1.status === 'none')
// [OVERNIGHT-5] كان الشرط يضيف `r1.source === 'none'`. وبعد وصول عقد الخادم
// صار المصدر `'backend'` — **لأننا سألنا خادمًا فعلًا ورفض**، وهو أصدق لا أضعف.
// والضمان الذي يحمله اسم الفحص محفوظ حرفيًّا: تسميم مفتاح التقليد لا يمنح شيئًا.
// فنفحص ما يدّعيه الاسم: الحالة `none`، **والمفتاح المسموم لم يُقرأ**.
check('sessionStorage مسمومة بمفتاح التقليد نفسه ⇒ ما زال none',
  r1.status === 'none' && r1.source !== 'mock')
check('والمصدر معلَن بصدق لا مموّه', r1.source === 'backend' || r1.source === 'none')
// ولو كان الفحص أعلاه تحصيل حاصل لما فرّق بين البناءين: في بناء التقليد **يُقرأ**
// نفس المفتاح المسموم ويُمنح. الفرق هو الدليل على أن الفحص يقيس شيئًا.
{
  const mockBuild = await bundleAccessLayer('mock-probe', ENV_MOCK)
  const rm = await mockBuild.mod.resolveEntitlement()
  check('★ وفي بناء التقليد يُقرأ المفتاح نفسه ويُمنح — فالفحص أعلاه ليس تحصيل حاصل',
    rm.status === 'active' && rm.source === 'mock', `${rm.status}/${rm.source}`)
}
check('الكوكيز لا تمنح شيئًا', globalThis.document.cookie.includes('premium=active') && r1.status === 'none')
check('معطى العنوان (?premium=1) لا يمنح شيئًا', win.location.search.includes('premium=1') && r1.status === 'none')
check('جزء العنوان (#premiumActive) لا يمنح شيئًا', win.location.hash === '#premiumActive' && r1.status === 'none')

// postMessage من أصل معادٍ
win.postMessage({ type: 'entitlement', status: 'active', premium: true })
const r2 = await prod.mod.resolveEntitlement()
check('postMessage من أصل معادٍ لا يغيّر شيئًا', r2.status === 'none')

// أكواد التقليد نفسها من بناء الإنتاج
// [OVERNIGHT-5] كان الشرط `out === 'offline'` — وهو ما كان **الرفض الوحيد**
// الممكن قبل وصول عقد الخادم. صارت الرفوض عدّة، وكلّها صادقة؛ والمهمّ أن
// أيًّا منها **ليس نجاحًا**، وأن أثرها صفر. فنفحص ذلك لا الصيغة بعينها.
const HONEST_REFUSALS = ['offline', 'invalid', 'already_used', 'expired', 'revoked', 'not_authenticated']
for (const code of ['QIMMAH-TEST-OK', 'qimmah-test-ok', '  QIMMAH-TEST-OK  ']) {
  const out = await prod.mod.redeemActivationCode(code)
  check(`كود التقليد «${code.trim()}» في الإنتاج ⇒ ${out} (لا success)`,
    out !== 'success' && HONEST_REFUSALS.includes(out))
}
// ولو صار أيّ رفض «نجاحًا» لسقط ما سبق — الجدول لا يحوي success بحال.
check('وجدول الرفوض لا يحوي success بحال', !HONEST_REFUSALS.includes('success'))
const afterRedeem = await prod.mod.resolveEntitlement()
check('محاولة الاستبدال لم تترك أثرًا يمنح', afterRedeem.status === 'none')

// المصدر لا يقرأ العنوان ولا localStorage أصلًا — يُثبت على **الحزمة** لا المصدر
check('حزمة المصدر لا تحمل أي قراءة location', !/location\s*\.\s*(search|hash|href)/.test(sourceOnly.text))
// وحدّ المكتبة معلَن لا مبتلَع: المكتبة **تقرأ** العنوان، ونحن لا نشتقّ منه
// استحقاقًا. الرمز الذي تلتقطه جلسةٌ يتحقّق منها الخادم، والاستحقاق يأتي بعدها
// من `my_entitlement()` وحده — فلا يمنح عنوانٌ شيئًا مهما حُشي.
{
  const withSdk = await bundle(resolve(root, 'src/lib/access/entitlementSource.ts'), 'prod-with-sdk', ENV_PROD)
  const sdkReads = (withSdk.text.match(/location\s*\.\s*(search|hash|href)/g) ?? []).length
  check('★ كل قراءات العنوان مصدرها المكتبة لا كودنا', sdkReads > 0 && !/location\s*\.\s*(search|hash|href)/.test(sourceOnly.text), `${sdkReads} في المكتبة · 0 عندنا`)
  check('واستحقاقنا يأتي من نداء الخادم لا من العنوان',
    /my_entitlement/.test(withSdk.text) && !/premiumActive[\s\S]{0,120}location/.test(sourceOnly.text))
}
// التعليقات تُنزع قبل المسح: بقاؤها يجعل الفحص يسقط على **كلمة في شرح** لا على
// قراءة فعلية — وهو إنذار كاذب يُطبِّع تجاهل الفحص، وذلك أخطر من غيابه.
const codeOnly = sourceOnly.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
check('حزمة المصدر لا تحمل أي قراءة localStorage', !/localStorage/.test(codeOnly))
check('حزمة المصدر لا تحمل أي قراءة document.cookie', !/document\s*\.\s*cookie/.test(codeOnly))
// ولو كانت قراءة حقيقية لا تعليقًا لسقط الفحص — يُهاجَم بزرع الاثنين.
check('★ ونزعُ التعليقات لا يعمي الفحص: قراءة مزروعة تُكتشف',
  /localStorage/.test(`${codeOnly}\nconst x = localStorage.getItem('qimmah:premium')`.replace(/\/\*[\s\S]*?\*\//g, '')))
check('★ بينما تعليق مزروع لا يُسقطه',
  !/localStorage/.test(`${codeOnly}\n// نقرأ localStorage هنا يومًا ما`.replace(/(^|[^:])\/\/[^\n]*/g, '$1')))

// ② سياسة الأفعال: كل فعل × كل حالة غير active
console.log('\n② جدول السياسة — الافتراض منع')
const { PAID_ACTIONS, isPaidActionAllowed } = prodPolicy.mod
check(`قائمة الأفعال المدفوعة غير فارغة (${PAID_ACTIONS.length})`, PAID_ACTIONS.length >= 10)
const leaks = []
for (const a of PAID_ACTIONS) {
  for (const s of ['loading', 'none', undefined, null, '', 'active ', 'ACTIVE', 'premiumActive', 'trialActive', 0, 1, true, {}, []]) {
    if (isPaidActionAllowed(a, s)) leaks.push(`${a}/${JSON.stringify(s)}`)
  }
}
check(`لا فعل يمرّ بحالة غير active (${PAID_ACTIONS.length}×14 تركيبة)`, leaks.length === 0, leaks.join(','))
check('و«active» بالضبط تمرّ — الفحص ليس رافضًا دائمًا', PAID_ACTIONS.every((a) => isPaidActionAllowed(a, 'active')))

// ③ الحارس: الحالة الابتدائية والرفض المسمّى
console.log('\n③ الحارس وطبقة المخزن')
const { getEntitlement, setEntitlement, resetEntitlement } = prodStore.mod
const { canPerform, assertPaid, runIfPaid, PaidActionDenied } = prodGuard.mod
check('الحالة الابتدائية loading لا none ولا active', getEntitlement().status === 'loading')
check('canPerform يمنع في loading', PAID_ACTIONS.every((a) => canPerform(a) === false))
let named = null
try { assertPaid('workout.logSet') } catch (e) { named = e }
check('assertPaid يرمي خطأً مسمّى لا TypeError', named instanceof PaidActionDenied && named.name === 'PaidActionDenied')
check('الخطأ يحمل اسم الفعل', named.action === 'workout.logSet')
check('runIfPaid لا ينفّذ شيئًا عند المنع', runIfPaid('workout.finish', () => { throw new Error('ran') }) === false)

// **التزوير المباشر للمخزن** — الوحيد الذي ينجح، ويُعلَن حدًّا لا ثغرة مخفيّة:
// المخزن حالة عميل، والحارس فيه إقناع لا سلطة. السلطة الوحيدة هي الخادم.
setEntitlement({ status: 'active', source: 'backend' })
check('⚠️ حدّ معلَن: من يملك تنفيذ كود في الصفحة يملك المخزن (فالسلطة للخادم لا للعميل)', canPerform('workout.logSet') === true)
resetEntitlement()
check('resetEntitlement يعود إلى المغلق لا إلى none', getEntitlement().status === 'loading')

// ولا يوجد مسار **مُصدَّر إلى العالم** يفعل ذلك: لا تعليق على global
check('الحزمة لا تعلّق setEntitlement على أي global', !/(window|globalThis|self)\s*\.\s*setEntitlement/.test(prodStore.text))
check('الحزمة لا تعلّق المخزن على window', !/(window|globalThis)\s*\.\s*(__QIMMAH|qimmah|entitlement)\s*=/.test(prodStore.text))

// ④ حقن سياق React: شجرة بلا مزوّد **مغلقة** لا متساهلة
console.log('\n④ حقن سياق/خصائص React')
const { CLOSED_ACCESS } = prodCtx.mod
check('CLOSED_ACCESS.can يرفض كل فعل', PAID_ACTIONS.every((a) => CLOSED_ACCESS.can(a) === false))
check('CLOSED_ACCESS.entitlement مغلقة (loading)', CLOSED_ACCESS.entitlement.status === 'loading')
let ranViaGuard = false
CLOSED_ACCESS.guard('workout.start', () => { ranViaGuard = true })('arg')
check('CLOSED_ACCESS.guard لا ينفّذ المعالج', ranViaGuard === false)
check('CLOSED_ACCESS.redeem يعيد offline لا success', (await CLOSED_ACCESS.redeem('QIMMAH-TEST-OK')) === 'offline')

// ════════════════ ⑤ العدّاد المضادّ — البناء المُقلَّد يخترق ════════════════
console.log('\n⑤ العدّاد المضادّ (§4.2) — نفس الهجوم على بناء التقليد')
const mock = await bundleAccessLayer('mock-access', ENV_MOCK)
check('وضع التقليد مُشتغل في بناء التقليد', mock.mod.mockEnabled() === true)
// نفس البذرة المسمومة أعلاه ما زالت في sessionStorage — والآن **تُقرأ**.
const mr = await mock.mod.resolveEntitlement()
check('harness-blind؟ لا — بذرة sessionStorage تمنح active في بناء التقليد', mr.status === 'active' && mr.source === 'mock')
win.sessionStorage.clear()
const mr2 = await mock.mod.resolveEntitlement()
check('وبعد مسح البذرة يعود none — فالقراءة حقيقية لا ثابتة', mr2.status === 'none')
const mOut = await mock.mod.redeemActivationCode('QIMMAH-TEST-OK')
check('وكود التقليد ينجح في بناء التقليد وحده', mOut === 'success')
check('فرفض الإنتاج نتيجة مستحقّة لا عمى ماسح', true)

console.log(`\n✅ تزوير Premium: ${passed} فحصًا، 0 اختراق في بناء الإنتاج.\n`)
// خروج صريح: عميل Supabase يشغّل مؤقّت تجديد الجلسة (`autoRefreshToken`)، وهو
// مقبض حيّ يُبقي Node قائمًا **بعد** انتهاء كل الفحوص. فبلا هذا السطر يعلّق
// الإثبات ناجحًا إلى الأبد — وتعليقٌ بلا سبب معلَن يُقرأ فشلًا في البوّابة.
// و`check` يرمي عند أي سقوط، فالوصول إلى هنا يعني نجاح الكلّ.
process.exit(0)
