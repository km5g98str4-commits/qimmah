// إثبات وحدة لمنطق تدفّق الإعداد v2.1 (تحقّق الخطوات، مسار إعادة المحاولة،
// جولة المسودة، وتجاهلها عند الإنهاء). يعمل فوق localStorage مُحاكى (banner في
// المُشغّل) بلا متصفح — منطق خالص من onboardingV2Flow.

import {
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
  return {
    step: 2, age: null, gender: null, heightCm: null, weightKg: null,
    intent: 'meals', level: 'intermediate',
    trainedBefore: 'months', totalMonths: 'm6_12', lastTrained: 'now', consistency: 'mostly',
    goal: 'cut', days: 4, duration: 45, place: 'gym', neat: 'moderate', dietPattern: 'none',
    hasInjury: true, injuries: ['knee'], healthDataConsent: true, ...over,
  }
}

/** حالة تحقّق كاملة — الأرقام أُزيحت بعد إدراج خطوة «النية والمستوى» (1). */
const V = (over: Partial<OnboardingV2Draft> = {}) => ({
  age: 30, gender: 'male' as const, heightCm: 180, weightKg: 90,
  intent: 'meals' as const, level: 'intermediate' as const,
  trainedBefore: 'months' as const, totalMonths: 'm6_12' as const,
  lastTrained: 'now' as const, consistency: 'mostly' as const,
  goal: 'cut' as const, days: 4, duration: 45,
  place: null, neat: null, dietPattern: null, hasInjury: null, injuries: [] as string[], healthDataConsent: true,
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
  check('خطوة التاريخ بلا جواب → trainingHistory', validateStep(2, V({ trainedBefore: null })) === 'trainingHistory')
  check('never جواب كامل وحده', validateStep(2, V({ trainedBefore: 'never', totalMonths: null, lastTrained: null, consistency: null })) === null)
  check('التاريخ لغير never يتطلب المتابعات', validateStep(2, V({ totalMonths: null })) === 'trainingHistory')
  check('خطوة الهدف بلا هدف → goal', validateStep(3, V({ goal: null })) === 'goal')
  check('خطوة الجدول ترفض أيامًا شاذة', validateStep(4, V({ days: 7 })) === 'training')
  check('خطوة السياق تتطلب المكان والنشاط والأكل', validateStep(5, V({ place: 'gym', neat: null, dietPattern: 'none' })) === 'lifestyle')
  check('خطوة السياق مكتملة', validateStep(5, V({ place: 'gym', neat: 'moderate', dietPattern: 'none' })) === null)
  check('خطوة القيود تتطلب جوابًا صريحًا', validateStep(6, V({ hasInjury: null })) === 'limitations')
  check('الإصابة تتطلب منطقة', validateStep(6, V({ hasInjury: true, injuries: [] })) === 'limitations')
  check('لا إصابة جواب صالح', validateStep(6, V({ hasInjury: false })) === null)
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

  // v5 migration is additive: old answers survive, new facts stay unanswered.
  const legacy = {
    v: 5, step: 4, age: 30, gender: 'male', heightCm: 180, weightKg: 90,
    intent: 'meals', level: 'intermediate', trainingYears: 2,
    goal: 'maintain', days: 4, duration: 45, place: 'gym', pref: 'mixed',
    hasInjury: true, injuries: ['knee'], healthDataConsent: true,
  }
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: legacy }))
  const migrated = loadDraftV2('userA')
  check('v5 تُرقّى ولا تُحذف', migrated !== undefined)
  check('v5 المتقدمة تعود إلى خطوة التاريخ الجديدة', migrated?.step === 2)
  check('أجوبة v5 الأصلية تبقى', migrated?.goal === 'maintain' && migrated.place === 'gym' && migrated.injuries[0] === 'knee')
  check('لا تاريخ ولا نشاط ولا نمط أكل مصنوع في الهجرة', migrated?.trainedBefore === null && migrated.neat === null && migrated.dietPattern === null)

  // Hostile input — unsupported version / malformed → ignored.
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { v: 1, step: 1, goal: 'cut', days: 4, duration: 45, place: 'gym', pref: 'mixed', hasInjury: false, injuries: [] } }))
  check('مسودة بإصدار غير مدعوم → تُتجاهَل', loadDraftV2('userA') === undefined)
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { ...draft(), v: 6, step: 99, goal: 'nope', days: 'x' } }))
  check('مسودة مشوّهة → تُتجاهَل', loadDraftV2('userA') === undefined)
  // نية/مستوى مزيّفان في التخزين → تُرفض المسودة كلها (إدخال غير موثوق).
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { ...legacy, intent: 'hack' } }))
  check('نية غير معروفة → تُتجاهَل المسودة', loadDraftV2('userA') === undefined)
  globalThis.localStorage.setItem('qimmah:onboarding:v1', JSON.stringify({ owner: 'userA', draft: { ...legacy, level: 'elite' } }))
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
    trainedBefore: null,
    totalMonths: null,
    lastTrained: null,
    consistency: null,
    goal: null,
    days: 4,
    duration: 45,
    place: null,
    neat: null,
    dietPattern: null,
    hasInjury: null,
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
