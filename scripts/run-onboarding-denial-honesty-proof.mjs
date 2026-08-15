/**
 * إثبات صدق المنع في نهاية الإعداد — [OVERNIGHT-1].
 *
 * السؤال الذي يجيبه: **حين يرفض كاتبٌ فعلًا مدفوعًا، هل يرى المستخدم الحقيقة
 * (بوّابة Premium) أم كذبة (شاشة «ما قدرنا نجهّز الخطة») بزرّ إعادة لا ينجح؟**
 *
 * لماذا وُجد — عطل حقيقي أحمرَ CI ستة أيام (`test:e2e:onboarding`، السير
 * 31868130097): بوّابتان تحرسان `plan.saveEdit` **بسؤالين مختلفين**:
 *   • `saveCustomization`        يسأل `isExistingPlanEdit()`
 *       = تخصيص محفوظ **و** إعداد مكتمل.
 *   • `saveOnboardingProfile`    يسأل `_meta.completed === true`.
 * والفجوة بينهما حالة حقيقية: **ملفّ مكتمل بلا تخصيص محفوظ** — تنشأ بعد استيراد
 * نسخة، أو ترطيب مزامنة جزئي، أو مسح مفتاح التخصيص وحده. في تلك الحالة كانت
 * الواجهة تمرّر الكتابة (مسندها يكذب) فيرميها الكاتب (مسنده يصدق)، ويبتلع
 * `catch {}` الاستثناءَ فيعرض عطلًا لم يقع. وزرّ «إعادة المحاولة» لا ينجح أبدًا
 * لأن السبب ليس عطلًا عابرًا — حلقة مغلقة يخرج منها المستخدم بإغلاق التطبيق.
 *
 * الإثبات يشغّل الكاتب الحقيقي على تخزين حقيقي (لا محاكاة منطق)، ويهاجم نفسه:
 * إعادة أيٍّ من نصفَي الإصلاح إلى صيغته القديمة تُسقط فحصًا **مسمّى**.
 */
import { readFileSync } from 'node:fs'
import { loadTsModule } from './food-production/lib/loadTs.mjs'

const checks = []
const ok = (label, pass, detail = '') => checks.push({ label, pass: !!pass, detail: String(detail) })

// ── تخزين حقيقي في الذاكرة (نفس عقد Storage) ────────────────────────────────
class MemStorage {
  #m = new Map()
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null }
  setItem(k, v) { this.#m.set(k, String(v)) }
  removeItem(k) { this.#m.delete(k) }
  clear() { this.#m.clear() }
  key(i) { return [...this.#m.keys()][i] ?? null }
  get length() { return this.#m.size }
}
const storage = new MemStorage()
globalThis.window = { localStorage: storage, dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
globalThis.localStorage = storage

const PROFILE_KEY = 'qimmah:onboarding:profile:v1'
const ONBOARDING_KEY = 'qimmah:onboarding:v1'
const CUSTOMIZATION_KEY = 'qimmah:customization:v1'
const LAST_USER_KEY = 'qimmah:lastUser:v1'

const profileMod = await loadTsModule('src/lib/onboardingProfile.ts')
const { hasCompletedOnboardingProfile, saveOnboardingProfile, defaultOnboardingProfile } = profileMod
const { isExistingPlanEdit } = await loadTsModule('src/lib/customization.ts')
const { PaidActionDenied, canPerform } = await loadTsModule('src/lib/access/guard.ts')

/** حالة الفجوة: ملفّ إعداد **مكتمل**، وبلا تخصيص محفوظ. */
const seedGap = () => {
  storage.clear()
  storage.setItem(LAST_USER_KEY, 'guest')
  storage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: false, lastStep: 0 }))
  storage.setItem(PROFILE_KEY, JSON.stringify({
    goal: { type: 'cut' },
    _meta: { schemaVersion: 2, completed: true, source: 'onboarding' },
  }))
}

console.log('\n① الدالّة الواحدة موجودة وتصف الحالة بصدق')
ok('`hasCompletedOnboardingProfile` مُصدَّرة من الكاتب', typeof hasCompletedOnboardingProfile === 'function')
storage.clear()
ok('لا ملفّ ⇒ false (الإكمال الأوّل مجاني — ميثاق §0.1)', hasCompletedOnboardingProfile() === false)
seedGap()
ok('ملفّ مكتمل ⇒ true', hasCompletedOnboardingProfile() === true)

console.log('\n② الفجوة حقيقية لا نظرية — المسندان يختلفان على نفس الحالة')
seedGap()
const gapWriter = hasCompletedOnboardingProfile()
const gapView = isExistingPlanEdit()
ok('★ مسند الكاتب يصدق ومسند الواجهة يكذب على الحالة نفسها',
  gapWriter === true && gapView === false,
  `writer=${gapWriter} · view=${gapView} — لو تساويا لما وُجد العطل ولسقط هذا الإثبات`)
ok('ولو تساوى المسندان لسقط هذا الفحص — فهو ليس تحصيل حاصل', gapWriter !== gapView)

console.log('\n③ الكاتب يرمي خطأً **مسمّى** لا استثناءً عابرًا')
seedGap()
ok('الاستحقاق غير فعّال في هذه الحالة (وإلّا لما رمى الكاتب أصلًا)',
  canPerform('plan.saveEdit') === false)
let thrown = null
try { saveOnboardingProfile(defaultOnboardingProfile()) } catch (e) { thrown = e }
// ملاحظة: `loadTsModule` يحمّل `guard.ts` نسخةً مستقلّة، فهوية الصنف تختلف عن
// النسخة التي يستوردها الكاتب. لذا نفحص **العقد** (الاسم والفعل) لا المرجع —
// وهوية الصنف داخل التطبيق يفحصها البند ⑤ بنيويًا (`error instanceof`).
ok('★ الكتابة فوق ملفّ مكتمل ترمي خطأً باسم `PaidActionDenied`',
  thrown !== null && thrown.name === 'PaidActionDenied',
  `thrown=${thrown && thrown.name}: ${thrown && thrown.message}`)
ok('ولم يكن `TypeError` عابرًا — السقوط بالاسم لا بالعرض (الميثاق §4.2)',
  thrown !== null && !(thrown instanceof TypeError) && thrown instanceof Error)
ok('والخطأ يحمل اسم الفعل — فالواجهة تفتح البوّابة الصحيحة لا بوّابة عامّة',
  thrown && thrown.action === 'plan.saveEdit')
ok('ولم يُكتب شيء — لا نجاح وهمي (الميثاق §٥)',
  JSON.parse(storage.getItem(PROFILE_KEY))._meta.completed === true
  && JSON.parse(storage.getItem(PROFILE_KEY)).goal.type === 'cut')

console.log('\n④ الواجهة: الفحص المسبق يجمع مسندَي البوّابتين')
const view = readFileSync('src/views/OnboardingV2.tsx', 'utf8')
// استخراج الكتلة بحدودها لا `includes()` متفرّقة (الميثاق §4.2).
const gateStart = view.indexOf('if ((isExistingPlanEdit()')
const gateEnd = view.indexOf('saveOnboardingProfile(op)')
const gateBlock = gateStart >= 0 && gateEnd > gateStart ? view.slice(gateStart, gateEnd) : ''
ok('كتلة الفحص المسبق موجودة **قبل** أوّل كتابة', gateBlock.length > 0)
ok('★ الشرط يجمع المسندين بـ`||` — إسقاط أيّهما يفتح الفجوة من جديد',
  /if \(\(isExistingPlanEdit\(\) \|\| hasCompletedOnboardingProfile\(\)\) && !canPaid\('plan\.saveEdit'\)\)/.test(gateBlock),
  gateBlock.slice(0, 160))
ok('والفحص يخرج بـ`return` فلا يصل الكاتب أصلًا', /\breturn\b/.test(gateBlock))
ok('ولا يعرض شاشة خطأ — المنع يعيد الحالة إلى `idle`', /finalizeReduce\(st, 'reset'\)/.test(gateBlock))

console.log('\n⑤ الواجهة: المنع لا يُعرَض عطلًا لو أفلت من الفحص')
const catchStart = view.indexOf('} catch (error) {')
const catchEnd = view.indexOf("setStatus((s) => finalizeReduce(s, 'fail'))", catchStart)
const catchBlock = catchStart >= 0 && catchEnd > catchStart ? view.slice(catchStart, catchEnd) : ''
ok('كتلة الالتقاط تستقبل الخطأ (لا `catch {}` أعمى)', catchBlock.length > 0)
ok('★ `PaidActionDenied` يفتح بوّابة Premium ويعود **قبل** مسار الفشل',
  /error instanceof PaidActionDenied/.test(catchBlock)
  && /guardPaid\(error\.action/.test(catchBlock)
  && /finalizeReduce\(st, 'reset'\)/.test(catchBlock)
  && /\breturn\b/.test(catchBlock),
  catchBlock.slice(0, 200))
ok('وغير المنع يبقى عطلًا صادقًا بشاشته وزرّ إعادته',
  view.includes("setStatus((s) => finalizeReduce(s, 'fail'))"))

console.log('\n⑥ محاكاة الالتفاف (§4.2) — إعادة كلّ نصف إلى صيغته القديمة')
{
  // النصف الأول: شرط الواجهة القديم `isExistingPlanEdit()` وحده.
  seedGap()
  const legacyGatePasses = !(isExistingPlanEdit() && !canPerform('plan.saveEdit'))
  const fixedGatePasses = !((isExistingPlanEdit() || hasCompletedOnboardingProfile()) && !canPerform('plan.saveEdit'))
  ok('★ الشرط القديم يمرّر الكتابة إلى الكاتب فترمي — وهو العطل بعينه',
    legacyGatePasses === true && fixedGatePasses === false,
    `legacy=${legacyGatePasses} · fixed=${fixedGatePasses}`)

  // النصف الثاني: `catch {}` أعمى يعرض العطل بدل البوّابة.
  const blindCatch = (e) => (e instanceof PaidActionDenied ? 'error-screen' : 'error-screen')
  const honestCatch = (e) => (e instanceof PaidActionDenied ? 'premium-gate' : 'error-screen')
  const denial = new PaidActionDenied('plan.saveEdit')
  ok('★ الالتقاط الأعمى يعرض «عطلًا» للمنع، والصادق يعرض البوّابة',
    blindCatch(denial) === 'error-screen' && honestCatch(denial) === 'premium-gate')
  ok('وكلاهما يعرض عطلًا للعطل الحقيقي — فالإصلاح لم يبتلع الأعطال',
    blindCatch(new Error('boom')) === 'error-screen' && honestCatch(new Error('boom')) === 'error-screen')
}

const failed = checks.filter((c) => !c.pass)
console.log('\n' + '─'.repeat(64))
for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}${c.pass ? '' : ` — ${c.detail}`}`)
console.log('─'.repeat(64))
if (failed.length === 0) console.log(`✅ صدق المنع في نهاية الإعداد: ${checks.length} فحصًا، 0 فشل.`)
else console.log(`❌ ${failed.length} فشل من ${checks.length}`)
process.exit(failed.length ? 1 : 0)
