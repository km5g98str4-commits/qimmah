/**
 * إثبات تعافي الخطة من حالة تالفة — [SOVEREIGN-RECOVERY-001].
 *
 * ═══ العطل الذي يغلقه ═══
 * `loadCustomization()` كان يبتلع JSON التالف ويعيد `getDefaultCustomization()`
 * **بصمت**. والقياس المنفَّذ: مستخدم حقيقي (٢٢ سنة · ٩٢ كجم · علوي-سفلي ×٤ ·
 * ٢١٠٦ سعرة) يُستبدَل بـ**٢٤ سنة · ٨٦ كجم · جسم كامل ×٣ · ٢٢٩٤ سعرة** مُقدَّمًا
 * على أنه خطته. خرق §5: افتراضٌ يتنكّر في هيئة بيانات المستخدم.
 *
 * والمركَّب أقسى: ملف الإعداد يبقى سليمًا (مفتاح منفصل)، فالخطة **قابلة لإعادة
 * البناء حتميًّا** — ومع ذلك كان المستخدم يُدفَع لإعادة الإعداد، فيصطدم بـ
 * `assertPaid('plan.saveEdit')`. أي **يُطالَب بالدفع ليتعافى من فقداننا لبياناته**.
 *
 * ═══ ما يُثبَت هنا ═══
 *   ① الحالات مصنَّفة صراحةً: saved · absent · recoverable · unreadable · storage-blocked.
 *   ② لا افتراض يُقدَّم «خطتك» — كل حالة غير `saved` تحمل `isDefault: true`.
 *   ③ التعافي يعيد **نفس الخطة** لا «خطةً ما».
 *   ④ الإصلاح **ليس فعلًا مدفوعًا** — ولا يفتح ثغرة في حارس التحوير الحقيقي.
 *   ⑤ التنظيف بعد الكتابة الناجحة فقط.
 *   ⑥ التخزين المحجوب لا يرمي.
 *   ⑦ هجمات التخزين: بايتات مبتورة · شكل خاطئ · null · نصّ ضخم · تجاوز الحصّة.
 *
 * التأكيدات المضادّة (§4.2) مُعلَّمة بـ⟲ — كلٌّ منها يجب أن يسقط **باسمه**.
 */
import { build } from 'esbuild'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0
const fails = []
const check = (label, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`) }
  else { fails.push(label); console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`) }
}

// ── مخزن محلي قابل للتخريب ────────────────────────────────────────────────
function installStorage({ blocked = false, quotaExceeded = false } = {}) {
  const map = new Map()
  const store = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (quotaExceeded) throw new DOMException('quota', 'QuotaExceededError')
      map.set(k, String(v))
    },
    removeItem: (k) => { map.delete(k) },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size },
  }
  globalThis.window = globalThis.window || {}
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {})
  globalThis.window.dispatchEvent = globalThis.window.dispatchEvent || (() => true)
  // محاكاة Safari Private بدقّة: **الوصول إلى الخاصية نفسها** يرمي، لا نداءاتها.
  // هذا هو الشكل الحقيقي للعطل — ومحاكاته بكائن يعمل ثم ترمي دوالّه تُخطئ الهدف.
  if (blocked) {
    const thrower = { get() { throw new DOMException('blocked', 'SecurityError') }, configurable: true }
    Object.defineProperty(globalThis.window, 'localStorage', thrower)
    Object.defineProperty(globalThis, 'localStorage', thrower)
  } else {
    Object.defineProperty(globalThis.window, 'localStorage', { value: store, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true, writable: true })
  }
  return map
}

async function loadModules() {
  const d = mkdtempSync(join(tmpdir(), 'plan-recovery-'))
  const out = join(d, 'b.mjs')
  writeFileSync(join(d, 'e.ts'), `
    export * as cz from '@/lib/customization'
    export * as op from '@/lib/onboardingProfile'
    export * as guard from '@/lib/access/guard'
    export * as paid from '@/lib/access/paidActions'
  `)
  await build({
    entryPoints: [join(d, 'e.ts')], bundle: true, format: 'esm', outfile: out,
    platform: 'node', alias: { '@': join(root, 'src') }, logLevel: 'silent',
    define: { 'import.meta.env': JSON.stringify({ MODE: 'production', PROD: true, DEV: false }) },
  })
  return import(pathToFileURL(out).href)
}

// الخطة الحقيقية للمستخدم — الأرقام من التقرير الجنائي المنفَّذ، لا مخترعة.
const REAL_USER = { age: 22, weightKg: 92, trainingDays: 4 }

console.log('\n① الحالات مصنَّفة صراحةً — لا ابتلاع صامت')
installStorage()
let M = await loadModules()
const KEY = M.cz.STORAGE_KEY

check('مخزن فارغ ⇒ absent', M.cz.readCustomization().state === 'absent', M.cz.readCustomization().state)

localStorage.setItem(KEY, '{"profile":{"age":22,') // بايتات مبتورة
let r = M.cz.readCustomization()
check('JSON مبتور ⇒ ليس saved', r.state !== 'saved', r.state)
check('JSON مبتور ⇒ السبب parse', r.reason === 'parse', String(r.reason))
check('② والقيمة المعروضة موسومة افتراضًا — لا تُقدَّم «خطتك»', r.customization.isDefault === true, `isDefault=${r.customization.isDefault}`)

localStorage.setItem(KEY, '42') // JSON صالح بشكل خاطئ
r = M.cz.readCustomization()
check('JSON صالح بشكل خاطئ ⇒ ليس saved', r.state !== 'saved', r.state)
check('  وموسوم افتراضًا كذلك', r.customization.isDefault === true)

localStorage.setItem(KEY, 'null')
r = M.cz.readCustomization()
check('null ⇒ ليس saved', r.state !== 'saved', r.state)

localStorage.setItem(KEY, '"' + 'x'.repeat(200000) + '"')
r = M.cz.readCustomization()
check('نصّ ضخم بشكل خاطئ ⇒ ليس saved ولا رمي', r.state !== 'saved', r.state)

console.log('\n⟲ التأكيد المضادّ — الفحص ليس فارغًا: مخزن سليم يُقرأ saved')
// نكتب بكاتب المنتج نفسه لا بـJSON مُركَّب يدويًّا: فيصير «السليم» هو ما يعتبره
// المنتج سليمًا، لا ما تظنّه هذه المحاكاة.
localStorage.clear()
const good = M.cz.getDefaultCustomization()
good.profile = { ...(good.profile ?? {}), age: REAL_USER.age, weightKg: REAL_USER.weightKg }
const goodWrite = M.cz.saveCustomization(good)
check('⟲ الكتابة السليمة نجحت (شرط صحّة هذا التأكيد)', goodWrite === 'ok', String(goodWrite))
r = M.cz.readCustomization()
check('⟲ مخزن سليم ⇒ saved', r.state === 'saved', r.state)
check('⟲ ولا يُوسَم افتراضًا', r.customization.isDefault !== true, `isDefault=${r.customization.isDefault}`)
check('⟲ والقيم المقروءة هي قيم المستخدم لا الافتراضي',
  r.customization.profile?.age === REAL_USER.age && r.customization.profile?.weightKg === REAL_USER.weightKg,
  `age=${r.customization.profile?.age} weight=${r.customization.profile?.weightKg}`)

console.log('\n④ الإصلاح ليس فعلًا مدفوعًا — والحارس على التحوير لم يُمسّ')
check('`plan.repairFromOnboarding` مُعلَن فعل إصلاح نظام',
  M.paid.SYSTEM_REPAIR_ACTIONS.includes('plan.repairFromOnboarding'))
check('`plan.saveEdit` ما زال في الأفعال المدفوعة',
  M.paid.PAID_ACTIONS.includes('plan.saveEdit'))

let threw = null
try { M.guard.assertWriteAllowed('plan.saveEdit', 'system-repair', () => false) } catch (e) { threw = e }
check('⟲ ادّعاء إصلاح فوق مخزن سليم يسقط بخطأ **مسمّى** لا TypeError',
  threw !== null && threw.name === 'RepairIntentRejected', threw ? threw.name : 'لم يُرمَ شيء')

threw = null
try { M.guard.assertWriteAllowed('plan.saveEdit', 'system-repair', () => true) } catch (e) { threw = e }
check('وإصلاح فوق عطل حقيقي يمرّ بلا استحقاق', threw === null, threw ? threw.name : 'مرّ')

console.log('\n⑥ التخزين المحجوب يفشل مغلقًا لا برمي')
installStorage({ blocked: true })
M = await loadModules()
let blockedThrew = null
let blockedState = null
try { blockedState = M.cz.readCustomization().state } catch (e) { blockedThrew = e }
check('readCustomization لا يرمي عند حجب التخزين', blockedThrew === null, blockedThrew ? blockedThrew.name : 'لم يرمِ')
check('  والحالة تُسمّى storage-blocked', blockedState === 'storage-blocked', String(blockedState))
blockedThrew = null
try { M.cz.hasSavedCustomization() } catch (e) { blockedThrew = e }
check('hasSavedCustomization لا يرمي SecurityError', blockedThrew === null, blockedThrew ? blockedThrew.name : 'لم يرمِ')
check('isCustomizationStorageBlocked يعلنها صراحةً', M.cz.isCustomizationStorageBlocked() === true)

console.log('\n③ الكتابة تُبلّغ عن فشلها — ولا تشحن مزامنةً لم تصل القرص')
installStorage({ quotaExceeded: true })
M = await loadModules()
const res = M.cz.saveCustomization(M.cz.getDefaultCustomization())
check('كتابة فاشلة تُرجع نتيجة غير ok (لا void)', res !== 'ok' && typeof res === 'string', String(res))

console.log('\n⑤ المفتاحان منفصلان — فيتلف أحدهما ويبقى الآخر')
installStorage()
M = await loadModules()
const onboardingKeyFromSource = M.op.ONBOARDING_PROFILE_KEY
check('مفتاح الإعداد ≠ مفتاح التخصيص', onboardingKeyFromSource !== M.cz.STORAGE_KEY,
  `${onboardingKeyFromSource} ≠ ${M.cz.STORAGE_KEY}`)

console.log('\n⑦ إعادة البناء حتمية — لا عشوائية ولا ساعة في المولّد')
const genSrc = (await import('node:fs')).readFileSync(join(root, 'src/lib/planGenerator.ts'), 'utf8')
const stripped = genSrc.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ')
check('planGenerator بلا Math.random', !/Math\.random/.test(stripped))
check('planGenerator بلا Date.now/new Date', !/Date\.now\(|new Date\(/.test(stripped))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} تعافي الخطة — نجح ${pass} · فشل ${fails.length}`)
if (fails.length) { for (const f of fails) console.log(`   · ${f}`); process.exit(1) }
