/**
 * إثبات حارس تحوير الخطة — [FINAL-CONVERGENCE].
 *
 * السؤال الذي يجيبه: **هل يقف `plan.saveEdit` أمام المستخدم المسجَّل، أم أمام
 * الضيف وحده؟**
 *
 * لماذا وُجد: أغلقت الحارة A تجاوز المعاينة عند حدّ التحوير (CONV-8)، ومسندها
 * `isExistingPlanEdit()` كان ينادي `isOnboardingComplete(null)` — و`null` تعني
 * حرفيًا **علم الجهاز**. لكن `markCompleted(userId)` **لا يمسّ علم الجهاز عمدًا**
 * للمسجَّل (كي لا يتسرّب الإكمال لحساب جديد). فكان المسند يعود `false` لكل
 * مستخدم أكمل إعداده وهو داخل حسابه — أي أن الحارس كان **حيًّا على الضيف
 * وميتًا على الشريحة المدفوعة بالضبط**، وهو عكس المقصود تمامًا.
 *
 * الإثبات يشغّل المسند الحقيقي على تخزين حقيقي (لا محاكاة منطق)، ويهاجم نفسه:
 * إعادة المسند إلى صيغته القديمة تُسقط الفحص الحاسم باسمه.
 */
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
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, localStorage: storage, dispatchEvent() {}, addEventListener() {} }
globalThis.localStorage = storage

const ONBOARDING_KEY = 'qimmah:onboarding:v1'
const ACCOUNTS_KEY = 'qimmah:onboarding:accounts:v1'
const CUSTOMIZATION_KEY = 'qimmah:customization:v1'
const LAST_USER_KEY = 'qimmah:lastUser:v1'

const { isExistingPlanEdit, readCustomization } = await loadTsModule('src/lib/customization.ts')
const { isOnboardingComplete } = await loadTsModule('src/lib/onboarding.ts')

/** يبني حالة جهاز: مالك · إكمال الجهاز · إكمال الحساب · وجود تخصيص محفوظ. */
const seed = ({ owner, deviceCompleted, accountCompleted, hasCustomization }) => {
  storage.clear()
  storage.setItem(LAST_USER_KEY, owner ?? 'guest')
  storage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: !!deviceCompleted, lastStep: 9 }))
  if (accountCompleted) storage.setItem(ACCOUNTS_KEY, JSON.stringify({ [accountCompleted]: { completedAt: new Date(0).toISOString() } }))
  if (hasCustomization) storage.setItem(CUSTOMIZATION_KEY, JSON.stringify({ profile: { goal: 'cut' } }))
}

console.log('\n① الضيف — السلوك الذي كان يعمل أصلًا')
seed({ owner: null, deviceCompleted: false, hasCustomization: false })
ok('ضيف في منتصف الإعداد: ليس تحويرًا (القمع المجاني مفتوح)', isExistingPlanEdit() === false)
seed({ owner: null, deviceCompleted: true, hasCustomization: true })
ok('ضيف أكمل وله تخصيص محفوظ: تحوير ⇒ الحارس يعمل', isExistingPlanEdit() === true)

console.log('\n② المستخدم المسجَّل — الثغرة التي كُشفت')
// أكمل إعداده **وهو مسجَّل**: سجلّ الحسابات يحمل إكماله، وعلم الجهاز يبقى false
// لأن `markCompleted(userId)` لا يمسّه عمدًا.
seed({ owner: 'user-abc', deviceCompleted: false, accountCompleted: 'user-abc', hasCustomization: true })
ok('سجلّ الحسابات يعرف إكماله', isOnboardingComplete('user-abc') === true)
ok('وعلم الجهاز false — وهذا مقصود لا عطل', isOnboardingComplete(null) === false)
ok('★ مسجَّل أكمل إعداده وله خطة: تحوير ⇒ الحارس يجب أن يعمل',
  isExistingPlanEdit() === true,
  `isExistingPlanEdit()=${isExistingPlanEdit()} — لو false لكان plan.saveEdit مجانًا لكل مسجَّل`)

console.log('\n③ لا يُقفل القمع المجاني على المسجَّل الجديد')
seed({ owner: 'user-new', deviceCompleted: false, accountCompleted: null, hasCustomization: false })
ok('مسجَّل جديد لم يكمل بعد: ليس تحويرًا (إكماله الأول مجاني — ميثاق §0.1)', isExistingPlanEdit() === false)
seed({ owner: 'user-new', deviceCompleted: true, accountCompleted: null, hasCustomization: true })
ok('إكمال حساب آخر على نفس الجهاز لا يُحسب إكمالًا لهذا الحساب',
  isExistingPlanEdit() === false,
  'علم الجهاز من ضيف سابق لا يقفل حسابًا جديدًا')

console.log('\n④ محاكاة الالتفاف (§4.2): إعادة المسند إلى صيغته القديمة')
{
  // المسند القديم حرفيًا: hasSavedCustomization() && isOnboardingComplete(null)
  const legacyPredicate = (hasCustomization, deviceCompleted) => hasCustomization && deviceCompleted
  seed({ owner: 'user-abc', deviceCompleted: false, accountCompleted: 'user-abc', hasCustomization: true })
  const legacy = legacyPredicate(true, isOnboardingComplete(null))
  ok('المسند القديم يعود false للمسجَّل — أي أن الفحص ★ أعلاه هو الحارس بعينه',
    legacy === false && isExistingPlanEdit() === true,
    `legacy=${legacy} · fixed=${isExistingPlanEdit()}`)
  ok('ولو تساوى المسندان لسقط هذا الإثبات — فهو ليس تحصيل حاصل',
    legacy !== isExistingPlanEdit())
}

console.log('\n⑤ [GOV-003/BLOCKER-D] التلف ليس بابًا خلفيًا للاستحقاق')
{
  // المخزون المعطوب كان يُسقط الحارس كلّه: `state !== 'saved'` ⇒ لا `assertPaid`.
  // فكان إفساد بايت واحد يفتح تحوير الخطة مجّانًا. الفحوص أدناه تقيس **الشهادة
  // بخطّة سابقة** لا **القدرة على قراءتها**.
  const CUSTOMIZATION_KEY_LOCAL = 'qimmah:customization:v1'
  const seedRaw = (raw) => {
    seed({ owner: 'user-abc', deviceCompleted: true, accountCompleted: 'user-abc', hasCustomization: false })
    if (raw !== null) storage.setItem(CUSTOMIZATION_KEY_LOCAL, raw)
  }

  seedRaw('{not json')
  ok('★ مخزون معطوب (تحليل) ⇒ الحارس يعمل — التلف لا يمنح تحويرًا مجّانيًا',
    isExistingPlanEdit() === true, `state=${readCustomization().state}`)

  seedRaw(JSON.stringify([1, 2, 3]))
  ok('★ مخزون معطوب (شكل) ⇒ الحارس يعمل',
    isExistingPlanEdit() === true, `state=${readCustomization().state}`)

  seedRaw(null)
  ok('لا بايتات إطلاقًا ⇒ الحارس لا يعمل — الخطة الأولى مجّانية (§0.1)',
    isExistingPlanEdit() === false, `state=${readCustomization().state}`)

  // محاكاة الالتفاف: إعادة المسند إلى «saved وحدها» تُسقط الفحصين ★ باسمهما.
  seedRaw('{not json')
  const legacyOnlySaved = readCustomization().state === 'saved'
  ok('محاكاة الالتفاف: مسند «saved وحدها» يعود false على التلف — فالفحص ليس تحصيل حاصل',
    legacyOnlySaved === false && isExistingPlanEdit() === true,
    `legacy(saved-only)=${legacyOnlySaved} · fixed=${isExistingPlanEdit()}`)
}

const failed = checks.filter((c) => !c.pass)
console.log('\n' + '─'.repeat(64))
for (const c of checks) console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}${c.pass ? '' : ` — ${c.detail}`}`)
console.log('─'.repeat(64))
if (failed.length === 0) console.log(`✅ حارس تحوير الخطة: ${checks.length} فحصًا، 0 فشل.`)
else console.log(`❌ ${failed.length} فشل من ${checks.length}`)
process.exit(failed.length ? 1 : 0)
