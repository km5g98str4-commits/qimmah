// إثبات وحدة لمنطق تدفّق الإعداد v2.1 (تحقّق الخطوات، مسار إعادة المحاولة،
// جولة المسودة، وتجاهلها عند الإنهاء). يعمل فوق localStorage مُحاكى (banner في
// المُشغّل) بلا متصفح — منطق خالص من onboardingV2Flow.

import {
  canAdvance,
  clearDraftV2,
  finalizeReduce,
  loadDraftV2,
  saveDraftV2,
  validateStep,
  type OnboardingV2Draft,
} from '@/lib/onboardingV2Flow'

let pass = 0
let fail = 0
function check(label: string, cond: boolean): void {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

function draft(over: Partial<OnboardingV2Draft> = {}): OnboardingV2Draft {
  return { step: 2, goal: 'cut', days: 4, duration: 45, place: 'gym', pref: 'mixed', hasInjury: true, injuries: ['knee'], ...over }
}

console.log('\n① تحقّق الخطوات (رسالة خاصة بكل خطوة)')
{
  // Step 0 — goal required.
  check('خطوة الهدف بلا هدف → «goal»', validateStep(0, { goal: null, days: 4, duration: 45, place: null, pref: null }) === 'goal')
  check('خطوة الهدف مع هدف → صالحة', validateStep(0, { goal: 'bulk', days: 4, duration: 45, place: null, pref: null }) === null)
  check('canAdvance(0) يتبع التحقّق', canAdvance(0, { goal: 'cut', days: 4, duration: 45, place: null, pref: null }) === true)
  // Step 1 — training defaults are always valid; an off-set value is caught.
  check('خطوة التدريب بالقيم الافتراضية → صالحة', validateStep(1, { goal: 'cut', days: 4, duration: 45, place: null, pref: null }) === null)
  check('خطوة التدريب بقيمة أيام خارج المجموعة → «training»', validateStep(1, { goal: 'cut', days: 7, duration: 45, place: null, pref: null }) === 'training')
  // Step 2 — place + pref required.
  check('خطوة المعدات بلا مكان → «equipment»', validateStep(2, { goal: 'cut', days: 4, duration: 45, place: null, pref: 'mixed' }) === 'equipment')
  check('خطوة المعدات بلا تفضيل → «equipment»', validateStep(2, { goal: 'cut', days: 4, duration: 45, place: 'gym', pref: null }) === 'equipment')
  check('خطوة المعدات بمكان وتفضيل → صالحة', validateStep(2, { goal: 'cut', days: 4, duration: 45, place: 'gym', pref: 'mixed' }) === null)
  check('canAdvance(2) ناقص → false', canAdvance(2, { goal: 'cut', days: 4, duration: 45, place: 'gym', pref: null }) === false)
}

console.log('\n② مسار إعادة المحاولة (آلة حالة الإنهاء)')
{
  check('idle + start → building', finalizeReduce('idle', 'start') === 'building')
  check('building + fail → error', finalizeReduce('building', 'fail') === 'error')
  check('error + start (إعادة محاولة) → building', finalizeReduce('error', 'start') === 'building')
  check('building + ok → done', finalizeReduce('building', 'ok') === 'done')
  check('done + start → يبقى done (لا إعادة دخول)', finalizeReduce('done', 'start') === 'done')
  check('أي حالة + reset → idle', finalizeReduce('error', 'reset') === 'idle')
}

console.log('\n③ جولة المسودة (مربوطة بالمالك، آمنة ضد الإدخال المعطوب)')
{
  const d = draft({ step: 1, goal: 'maintain' })
  saveDraftV2(d, 'userA')
  const loaded = loadDraftV2('userA')
  check('التحميل يُعيد مسودة غير فارغة', loaded !== undefined)
  check('البيانات متطابقة (round-trip)', JSON.stringify(loaded) === JSON.stringify(d))
  check('حساب آخر لا يرى مسودة A (لا تسريب)', loadDraftV2('userB') === undefined)
  check('الضيف لا يرى مسودة حساب مسجّل', loadDraftV2(null) === undefined)

  // Guest draft isolation the other way.
  clearDraftV2('userA')
  const g = draft({ step: 0, goal: 'bulk' })
  saveDraftV2(g, null)
  check('الضيف يرى مسودته', JSON.stringify(loadDraftV2(null)) === JSON.stringify(g))
  check('حساب مسجّل لا يرى مسودة الضيف', loadDraftV2('userA') === undefined)

  // Hostile input — wrong version / malformed → ignored.
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { v: 1, step: 1, goal: 'cut', days: 4, duration: 45, place: 'gym', pref: 'mixed', hasInjury: false, injuries: [] } }))
  check('مسودة بإصدار قديم → تُتجاهَل', loadDraftV2('userA') === undefined)
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { v: 2, step: 99, goal: 'nope', days: 'x' } }))
  check('مسودة مشوّهة → تُتجاهَل', loadDraftV2('userA') === undefined)
}

console.log('\n④ تجاهل المسودة عند الإنهاء')
{
  saveDraftV2(draft(), 'userZ')
  check('المسودة موجودة قبل الإنهاء', loadDraftV2('userZ') !== undefined)
  clearDraftV2('userZ')
  check('المسودة مُسحت بعد الإنهاء (لا استئناف لإعداد مكتمل)', loadDraftV2('userZ') === undefined)
}

console.log(`\n${'─'.repeat(44)}`)
if (fail === 0) {
  console.log(`✅ كل الفحوص نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
