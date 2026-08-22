import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { QUICK_LOG_INTENT_KEY, clearQuickLogIntent, requestQuickLogIntent, takeQuickLogIntent } from '@/lib/quickLogIntent'

declare const __QIMMAH_ROOT__: string
declare const __qimmahBlockStorage: () => void
declare const __qimmahThrowingStorage: () => void
declare const __qimmahRestoreStorage: () => void
const read = (path: string) => readFileSync(resolve(__QIMMAH_ROOT__, path), 'utf8')
let passed = 0
function check(label: string, condition: unknown): void {
  assert.ok(condition, label)
  passed += 1
  console.log(`  ✓ ${label}`)
}

const app = read('src/App.tsx')
const profile = read('src/views/ProfileV2.tsx')
const nutrition = read('src/views/NutritionView.tsx')
const intent = read('src/lib/quickLogIntent.ts')

/**
 * عقد «التسجيل السريع» — ثلاثة أعطال مقيسة أغلقتها الحزمة ٩:
 *   • الكتابة والقراءة الخام على `sessionStorage` ترمي حين يُحجب التخزين.
 *   • «ماء» نيّة معلَنة بلا مستهلك — تُمسح ولا يحدث شيء.
 *   • نيّة تُكتب قبل أن يُعرف المقصد، فتبقى معلّقة حين يحوّل الحارس المسار.
 */
/**
 * مناطق `try { … } catch` الحقيقية بعدّ الأقواس — لا بتخمين نصّي.
 *
 * السبب: تعبير نمطي يسأل «هل بعد الاستدعاء catch؟» يمرّ على شيفرة يكون فيها
 * الاستدعاء **خارج** الحرس تمامًا وبعده كتلة حراسة أخرى. البوابة التي تُرضى
 * من موضعين متفرّقين رخوة (§4.2) — فالحدّ يُستخرج ببنيته لا بجواره.
 */
/**
 * يُفرِغ التعليقات مع الحفاظ على المواضع (مسافات بدل الحروف، والأسطر كما هي).
 * بلا هذا يُحاكَم النصّ الشارح لا الشيفرة: توثيق العطل نفسه يذكر
 * `window.sessionStorage` فيُحسب وصولًا مكشوفًا.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
}

function tryRegions(source: string): Array<[number, number]> {
  const regions: Array<[number, number]> = []
  const re = /\btry\s*\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    let depth = 1
    let i = m.index + m[0].length
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth += 1
      else if (source[i] === '}') depth -= 1
      i += 1
    }
    if (depth !== 0) continue
    // كتلة `try` بلا `catch` ليست حرسًا.
    if (!/^\s*catch\s*(?:\([^)]*\)\s*)?\{/.test(source.slice(i))) continue
    regions.push([m.index, i])
  }
  return regions
}

function assertIntentOwnerSource(raw: string): void {
  const source = stripComments(raw)
  const regions = tryRegions(source)
  const access = /window\.sessionStorage/g
  let m: RegExpExecArray | null
  let accesses = 0
  while ((m = access.exec(source)) !== null) {
    accesses += 1
    const at = m.index
    const guarded = regions.some(([start, end]) => at > start && at < end)
    assert.ok(
      guarded,
      `intent-owner-guarded: وصول تخزين خارج أي حرس عند الموضع ${at} — كل وصول داخل المالك القانوني يجب أن يقع في try/catch`,
    )
  }
  assert.ok(
    accesses >= 3,
    'intent-owner-guarded: المالك القانوني يجب أن يملك كتابة وقراءة ومسحًا فعليًا لا واجهة فارغة',
  )
  assert.match(
    source,
    /export function takeQuickLogIntent/,
    'intent-owner-take: المالك القانوني يجب أن يعرض قراءةً مستهلِكة واحدة',
  )
}

function assertNoRawIntentStorage(source: string, name: string): void {
  assert.doesNotMatch(
    source,
    /window\.sessionStorage/,
    `no-raw-intent-storage-${name}: المستهلك الحيّ يجب أن يمرّ بالمالك القانوني لا بالتخزين الخام`,
  )
  assert.doesNotMatch(
    source,
    /'qimmah:quick-log-intent'/,
    `no-raw-intent-key-${name}: مفتاح النيّة يملكه المالك القانوني وحده`,
  )
}

function assertWaterIsLive(source: string): void {
  assert.match(
    source,
    /takeQuickLogIntent|QuickLogIntent/,
    'water-live: التغذية يجب أن تستهلك النيّة عبر المالك القانوني',
  )
  assert.match(
    source,
    /'water'[\s\S]{0,400}?setFocusWater\(true\)/,
    'water-live: نيّة «ماء» يجب أن تصل إلى لوحة الماء لا أن تُمسح بلا أثر',
  )
  assert.match(
    source,
    /focusRequested=\{focusWater\}/,
    'water-live: لوحة الماء يجب أن تستقبل طلب التركيز',
  )
}

function assertNoStaleIntent(source: string): void {
  assert.match(
    source,
    /const destination = guardRoute\(/,
    'no-stale-intent: النيّة لا تُكتب قبل حسم المقصد الحقيقي',
  )
  assert.match(
    source,
    /if \(destination !== [\s\S]{0,120}?return/,
    'no-stale-intent: تحويل الحارس يجب أن يمنع كتابة نيّة معلّقة',
  )
}

function assertInMemoryHandoff(source: string): void {
  assert.match(
    source,
    /useState<QuickLogTarget \| null>\(null\)/,
    'quick-log-in-memory: App يجب أن يملك النيّة حتى يركب المسار الكسول',
  )
  assert.match(
    source,
    /if \(destination !== intended\)[\s\S]{0,220}?return[\s\S]{0,260}?setPendingQuickLog\(target\)[\s\S]*quickLogIntent=\{pendingQuickLog\}/,
    'quick-log-in-memory: الذاكرة تُكتب بعد حسم الحارس وتُسلّم للمستهلك الحيّ',
  )
}

function assertNotFoundRecovery(source: string): void {
  assert.match(
    source,
    /beforeNotFoundRef\s*=\s*useRef<AppRoute \| null>\(null\)/,
    'not-found-owned-route: 404 يجب أن يملك آخر مسار تطبيق صالح',
  )
  assert.match(
    source,
    /recoverNotFound[\s\S]*window\.location\.replace\(`#\/\$\{target\}`\)/,
    'not-found-replace: التعافي يجب أن يستبدل المدخل المكسور لا أن يدفعه تحت مدخل جديد',
  )
  assert.match(
    source,
    /onHome=\{\(\) => recoverNotFound\([\s\S]*onBack=\{\(\) => recoverNotFound\(/,
    'not-found-actions: فعلا 404 كلاهما يجب أن يبقيا داخل التطبيق',
  )
}

console.log('\n① المالك القانوني لنيّة التسجيل السريع محروس')
assertIntentOwnerSource(intent)
check('كل وصول تخزين داخل المالك القانوني محروس بـcatch', true)
check('المالك يعرض قراءة مستهلِكة واحدة (take)', /export function takeQuickLogIntent/.test(intent))
check('المالك يتحقّق من القيمة قبل قبولها', /'meal'|'water'|'routine'/.test(intent))

console.log('\n② المستهلكون الأحياء لا يلمسون التخزين الخام')
assertNoRawIntentStorage(app, 'app')
assertNoRawIntentStorage(profile, 'profile')
assertNoRawIntentStorage(nutrition, 'nutrition')
check('App.tsx يمرّ بالمالك القانوني', /requestQuickLogIntent/.test(app))
check('ProfileV2 يمرّ بالمالك القانوني', /takeQuickLogIntent/.test(profile))
check('NutritionView يمرّ بالمالك القانوني', /takeQuickLogIntent/.test(nutrition))

console.log('\n③ «ماء» نيّة حيّة لا زرّ ميت')
assertWaterIsLive(nutrition)
check('نيّة «ماء» تفتح لوحة الماء', true)
check('لوحة الماء تنقل التركيز إلى أول إجراء فعلي', /focusRequested/.test(nutrition))
check('فتح لوحة الماء لا يكتب أي بيانات بنفسه', !/onAdd\(\s*\d+\s*\)[\s\S]{0,80}?focusRequested/.test(nutrition))

console.log('\n④ لا نيّة معلّقة حين يحوّل الحارس المسار')
assertNoStaleIntent(app)
check('المقصد يُحسم قبل كتابة النيّة', true)

console.log('\n⑤ جسر ذاكرة للمسار الكسول وتعافٍ حتمي من 404')
assertInMemoryHandoff(app)
check('App يحتفظ بنيّة Quick Log حتى يقرّ المستهلك باستلامها', true)
assertNotFoundRecovery(app)
check('404 يملك مساره السابق ويستبدل المدخل المكسور', true)

console.log('\n⑥ سلوك المالك القانوني تحت تخزين محجوب (تشغيل حقيقي)')
__qimmahRestoreStorage()
requestQuickLogIntent('meal')
check('النيّة تُكتب وتُقرأ في الحالة السليمة', takeQuickLogIntent(['meal', 'water']) === 'meal')
check('القراءة مستهلِكة — لا تتكرّر النيّة نفسها', takeQuickLogIntent(['meal', 'water']) === null)

__qimmahRestoreStorage()
requestQuickLogIntent('routine')
check('نيّة «ملفك» لا تبتلعها التغذية', takeQuickLogIntent(['meal', 'water']) === null)
check('صاحبة النيّة وحدها تستهلكها', takeQuickLogIntent(['routine']) === 'routine')

__qimmahRestoreStorage()
window.sessionStorage.setItem(QUICK_LOG_INTENT_KEY, 'not-a-real-intent')
check('القيمة المجهولة تُرفض', takeQuickLogIntent(['meal', 'water', 'routine']) === null)
check('القيمة المجهولة تُمسح فلا تعلق أبدًا', window.sessionStorage.getItem(QUICK_LOG_INTENT_KEY) === null)

// حجب على مستوى الخاصية — وجه Safari حين تُمنع الكعكات.
__qimmahBlockStorage()
assert.doesNotThrow(() => requestQuickLogIntent('meal'), 'blocked-write: الكتابة يجب ألّا ترمي والتخزين محجوب')
assert.doesNotThrow(() => takeQuickLogIntent(['meal']), 'blocked-read: القراءة يجب ألّا ترمي والتخزين محجوب')
assert.doesNotThrow(() => clearQuickLogIntent(), 'blocked-clear: المسح يجب ألّا يرمي والتخزين محجوب')
check('الكتابة لا ترمي حين يُحجب التخزين (خاصية)', true)
check('القراءة لا ترمي حين يُحجب التخزين (خاصية)', true)
check('القراءة تعيد null لا قيمة مخترعة', takeQuickLogIntent(['meal']) === null)

// حجب على مستوى الدوالّ — الوجه الثاني لنفس العطل.
__qimmahThrowingStorage()
assert.doesNotThrow(() => requestQuickLogIntent('water'), 'throwing-write: الكتابة يجب ألّا ترمي مع دوالّ رامية')
assert.doesNotThrow(() => takeQuickLogIntent(['water']), 'throwing-read: القراءة يجب ألّا ترمي مع دوالّ رامية')
check('الكتابة لا ترمي حين ترمي دوالّ التخزين', true)
check('القراءة لا ترمي حين ترمي دوالّ التخزين', true)
__qimmahRestoreStorage()

console.log('\n⑦ محاكاة الالتفاف')
assert.throws(
  () => assertIntentOwnerSource(intent.replace(/\btry\s*\{/g, 'if (true) {')),
  /intent-owner-guarded/,
  'محاكاة: نزع الحارس يجب أن يسقط بفحص مسمّى',
)
check('نزع حارس الاستثناء يسقط بفحص مسمّى', true)

// الثغرة التي كانت تمرّ على الفحص النصّي: وصول **خارج** الحرس، وكتلة حراسة
// سليمة في موضع آخر من الملف تُرضي أي فحص يسأل عن الجوار لا عن الاحتواء.
assert.throws(
  () =>
    assertIntentOwnerSource(
      `export function leak() { return window.sessionStorage.getItem('k') }\n` +
        `function unrelated() { try { window.sessionStorage.setItem('a','b') } catch { /* */ } }\n` +
        `function alsoGuarded() { try { window.sessionStorage.removeItem('c') } catch { /* */ } }\n` +
        `export function takeQuickLogIntent() {}\n`,
    ),
  /intent-owner-guarded/,
  'محاكاة: وصول خارج الحرس مع حرس مجاور يجب أن يسقط بفحص مسمّى',
)
check('حرس في موضع آخر لا يغطّي وصولًا مكشوفًا', true)

// واجهة فارغة: try/catch موجود والوصول الحقيقي محذوف — «أخضر» بلا سلوك.
assert.throws(
  () =>
    assertIntentOwnerSource(
      `export function requestQuickLogIntent() { try { /* nothing */ } catch { /* */ } }\n` +
        `export function takeQuickLogIntent() { try { /* nothing */ } catch { /* */ } return null }\n`,
    ),
  /intent-owner-guarded/,
  'محاكاة: واجهة بلا وصول فعلي يجب أن تسقط بفحص مسمّى',
)
check('واجهة محروسة بلا سلوك تسقط بفحص مسمّى', true)

assert.throws(
  () => assertNoRawIntentStorage(app.replace('requestQuickLogIntent(target)', "window.sessionStorage.setItem('qimmah:quick-log-intent', target)"), 'app'),
  /no-raw-intent-storage-app/,
  'محاكاة: العودة للتخزين الخام يجب أن تسقط بفحص مسمّى',
)
check('عودة App للتخزين الخام تسقط بفحص مسمّى', true)

assert.throws(
  () => assertWaterIsLive(nutrition.replace(/setFocusWater\(true\)/g, '/* dropped */')),
  /water-live/,
  'محاكاة: إسقاط نيّة الماء يجب أن يسقط بفحص مسمّى',
)
check('إسقاط أثر «ماء» يسقط بفحص مسمّى', true)

assert.throws(
  () => assertNoStaleIntent(app.replace(/const destination = guardRoute\(/, 'const unusedDestination = guardRoute(')),
  /no-stale-intent/,
  'محاكاة: كتابة النيّة قبل حسم المقصد يجب أن تسقط بفحص مسمّى',
)
check('كتابة النيّة قبل حسم المقصد تسقط بفحص مسمّى', true)

assert.throws(
  () => assertInMemoryHandoff(app.replace('setPendingQuickLog(target)', '/* dropped in-memory handoff */')),
  /quick-log-in-memory/,
  'محاكاة: إسقاط جسر الذاكرة يجب أن يسقط بفحص مسمّى',
)
check('إسقاط جسر الذاكرة يسقط بفحص مسمّى', true)

assert.throws(
  () => assertNotFoundRecovery(app.replace('window.location.replace(`#/${target}`)', 'window.location.hash = `/${target}`')),
  /not-found-replace/,
  'محاكاة: تحويل استبدال 404 إلى دفع يجب أن يسقط بفحص مسمّى',
)
check('إعادة حلقة 404 عبر hash push تسقط بفحص مسمّى', true)

console.log(`\n✅ عقد التسجيل السريع: ${passed}/${passed} فحصًا`)
