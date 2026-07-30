// إثبات وحدة لمنطق تدفّق الإعداد v2.1 (تحقّق الخطوات، مسار إعادة المحاولة،
// جولة المسودة، وتجاهلها عند الإنهاء). يعمل فوق localStorage مُحاكى (banner في
// المُشغّل) بلا متصفح — منطق خالص من onboardingV2Flow.

import {
  canAdvance,
  clearDraftV2,
  finalizeReduce,
  initialDraftV2,
  loadDraftV2,
  saveDraftV2,
  validateStep,
  type OnboardingV2Draft,
} from '@/lib/onboardingV2Flow'
import { V2_ONBOARDING } from '@/design-system/v2/labels'

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
  return { step: 2, age: null, gender: null, heightCm: null, weightKg: null, intent: 'meals', level: 'intermediate', trainingYears: null, goal: 'cut', days: 4, duration: 45, place: 'gym', pref: 'mixed', hasInjury: true, injuries: ['knee'], healthDataConsent: true, ...over }
}

/** حالة تحقّق كاملة — الأرقام أُزيحت بعد إدراج خطوة «النية والمستوى» (1). */
const V = (over: Partial<OnboardingV2Draft> = {}) => ({
  age: 30, gender: 'male' as const, heightCm: 180, weightKg: 90,
  intent: 'meals' as const, level: 'intermediate' as const, trainingYears: null,
  goal: 'cut' as const, days: 4, duration: 45,
  place: null, pref: null, healthDataConsent: true,
  ...over,
})

console.log('\n① تحقّق الخطوات (رسالة خاصة بكل خطوة)')
{
  check('صياغة المكان تطابق النص العربي المعتمد', V2_ONBOARDING.ar.equipment.title === 'وين وكيف تتمرّن؟')
  // الموافقة على الخطوة 0 (الجسد) لتسبق أي جمع بيانات — وتُفحص قبل حقول الجسد.
  check('الموافقة شرط الخطوة الأولى (قبل حقول الجسد)', validateStep(0, V({ age: null, gender: null, heightCm: null, weightKg: null, goal: null, healthDataConsent: false })) === 'healthConsent')
  check('بعد الموافقة تُطلب حقول الجسد', validateStep(0, V({ age: null, gender: null, heightCm: null, weightKg: null, goal: null })) === 'body')
  // Step 1 — النية والمستوى.
  check('خطوة النية بلا نية → «intentLevel»', validateStep(1, V({ intent: null })) === 'intentLevel')
  check('خطوة النية بلا مستوى → «intentLevel»', validateStep(1, V({ level: null })) === 'intentLevel')
  check('النية والمستوى معًا → صالحة', validateStep(1, V()) === null)
  // Step 2 — goal required.
  check('خطوة الهدف بلا هدف → «goal»', validateStep(2, V({ goal: null })) === 'goal')
  check('خطوة الهدف مع الموافقة → صالحة', validateStep(2, V({ goal: 'bulk' })) === null)
  check('canAdvance(2) يتبع الهدف', canAdvance(2, V()) === true)
  // Step 3 — training defaults are always valid; an off-set value is caught.
  check('خطوة التدريب بالقيم الافتراضية → صالحة', validateStep(3, V()) === null)
  check('خطوة التدريب بقيمة أيام خارج المجموعة → «training»', validateStep(3, V({ days: 7 })) === 'training')
  // Step 4 — place + pref required.
  check('خطوة المعدات بلا مكان → «equipment»', validateStep(4, V({ pref: 'mixed' })) === 'equipment')
  check('خطوة المعدات بلا تفضيل → «equipment»', validateStep(4, V({ place: 'gym' })) === 'equipment')
  check('خطوة المعدات بمكان وتفضيل → صالحة', validateStep(4, V({ place: 'gym', pref: 'mixed' })) === null)
  check('canAdvance(4) ناقص → false', canAdvance(4, V({ place: 'gym' })) === false)
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
  check('حالة أول render تُبنى من المسودة بلا افتراضيات وسيطة', JSON.stringify(initialDraftV2('userA')) === JSON.stringify(d))
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
  // نية/مستوى مزيّفان في التخزين → تُرفض المسودة كلها (إدخال غير موثوق).
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { ...draft(), v: 5, intent: 'hack' } }))
  check('نية غير معروفة → تُتجاهَل المسودة', loadDraftV2('userA') === undefined)
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { ...draft(), v: 5, level: 'elite' } }))
  check('مستوى غير معروف → تُتجاهَل المسودة', loadDraftV2('userA') === undefined)
}

console.log('\n④ تجاهل المسودة عند الإنهاء')
{
  saveDraftV2(draft(), 'userZ')
  check('المسودة موجودة قبل الإنهاء', loadDraftV2('userZ') !== undefined)
  clearDraftV2('userZ')
  check('المسودة مُسحت بعد الإنهاء (لا استئناف لإعداد مكتمل)', loadDraftV2('userZ') === undefined)
}

console.log('\n⑤ افتراضيات أول تشغيل')
{
  clearDraftV2('newUser')
  check('بلا مسودة يبدأ من الجسد مع قيم التدريب الآمنة', JSON.stringify(initialDraftV2('newUser')) === JSON.stringify({
    step: 0,
    age: null,
    gender: null,
    heightCm: null,
    weightKg: null,
    intent: null,
    level: null,
    trainingYears: null,
    goal: null,
    days: 4,
    duration: 45,
    place: null,
    pref: null,
    hasInjury: false,
    injuries: [],
    healthDataConsent: false,
  }))
}

console.log(`\n${'─'.repeat(44)}`)
if (fail === 0) {
  console.log(`✅ كل الفحوص نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
