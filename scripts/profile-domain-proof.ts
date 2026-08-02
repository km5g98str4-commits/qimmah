// إثبات مصدر الحقيقة الواحد للحدود والأهداف — [CTO-65] البند ٢.
//
// الفجوة التي يُغلقه: مساران، لكلٍّ حدوده وأهدافه.
//   • `onboardingV2Flow` قال طول 120–220 ووزن 30–250، و`validation` قال 100–230
//     و15–250 — فالمستخدم نفسه يُقبل في مسار ويُرفض في الآخر.
//   • رسائل `validation` حملت الأرقام نصًّا صلبًا، فتوحيد الحدود وحده كان يترك
//     **رسالة تكذب**: تُرفض القيمة عند 120 وتقول لك 100 مسموح.
//   • جسر الأهداف كان سلسلة `if` بافتراضي `maintain`، فأي هدف جديد يسقط عليه
//     بلا خطأ ترجمة ولا كاشف.
//
// الفحص سلوكي على الوحدات الحقيقية (لا نصّ ملفات): نستورد الطرفين ونطالب
// بتطابقهما، ونهاجم كل تأكيد بمحاكاة التفاف تفشل بفحص مسمّى (§4.2).

import {
  AGE_RANGE,
  GOAL_TYPE_TO_CALORIE_GOAL,
  HEIGHT_RANGE,
  PICKABLE_GOAL_TYPES,
  TARGET_WEIGHT_RANGE,
  WEIGHT_RANGE,
  ageRangeCopy,
  heightRangeCopy,
  weightRangeCopy,
  withinRange,
} from '@/config/profileDomain'
import { AGE_RANGE as FLOW_AGE, HEIGHT_RANGE as FLOW_HEIGHT, WEIGHT_RANGE as FLOW_WEIGHT } from '@/lib/onboardingV2Flow'
import { LIMITS, validateProfile } from '@/lib/validation'
import { calorieGoalFromGoalType, defaultProfile, goalTypeLabel, goalTypeOptions } from '@/lib/calculators'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import type { GoalType, Profile } from '@/types/profile'

let pass = 0
const fails: string[] = []
const check = (label: string, ok: boolean) => {
  if (ok) { pass++; console.log('  ✓ ' + label) } else { fails.push(label); console.log('  ✗ ' + label) }
}

console.log('\n═══ 1) الحدود — رقم واحد يراه المساران ═══')
check('العمر: مسار الإعداد ومدقّق الملف على نفس النطاق', FLOW_AGE.min === LIMITS.age.min && FLOW_AGE.max === LIMITS.age.max)
check('الطول: نفس النطاق (كان 120–220 مقابل 100–230)', FLOW_HEIGHT.min === LIMITS.heightCm.min && FLOW_HEIGHT.max === LIMITS.heightCm.max)
check('الوزن: نفس النطاق (كان 30–250 مقابل 15–250)', FLOW_WEIGHT.min === LIMITS.weightKg.min && FLOW_WEIGHT.max === LIMITS.weightKg.max)
check('وزن الهدف يشترك مع الوزن في نفس النطاق', TARGET_WEIGHT_RANGE.min === WEIGHT_RANGE.min && TARGET_WEIGHT_RANGE.max === WEIGHT_RANGE.max)
check('القيم المعتمدة هي الأضيق (حدود الإعداد)', AGE_RANGE.min === 13 && HEIGHT_RANGE.min === 120 && WEIGHT_RANGE.min === 30)

console.log('\n═══ 2) الرسالة لا تكذب — مبنيّة من نفس الرقم ═══')
for (const [name, copy, range] of [
  ['العمر', ageRangeCopy(), AGE_RANGE],
  ['الطول', heightRangeCopy(), HEIGHT_RANGE],
  ['الوزن', weightRangeCopy(), WEIGHT_RANGE],
] as const) {
  check(`${name}: الرسالة العربية تذكر حدّي النطاق فعلًا`, copy.ar.includes(String(range.min)) && copy.ar.includes(String(range.max)))
  check(`${name}: الرسالة الإنجليزية تذكر حدّي النطاق فعلًا`, copy.en.includes(String(range.min)) && copy.en.includes(String(range.max)))
}

// التأكيد الحاسم: القيمة التي يرفضها المدقّق **ليست** مذكورة كمسموحة في رسالته.
const belowHeight: Profile = { ...defaultProfile, heightCm: HEIGHT_RANGE.min - 1 }
const heightErr = validateProfile(belowHeight).find((e) => e.field === 'heightCm')
check('قيمة مرفوضة فعلًا تُنتج رسالة خطأ', !!heightErr)
check(
  'الرسالة تذكر الحدّ الذي رُفضت عنده لا حدًّا أوسع',
  !!heightErr && heightErr.message.includes(String(HEIGHT_RANGE.min)) && !heightErr.message.includes('100'),
)
check('الرسالة تتبع لغة الشاشة', validateProfile(belowHeight, 'en').find((e) => e.field === 'heightCm')!.message.startsWith('Enter'))

console.log('\n═══ 3) الأهداف — لا هدف يسقط صامتًا ═══')
const ALL_GOALS: GoalType[] = ['cutting', 'bulking', 'maintenance', 'returning', 'health', 'recomposition']
check('السجلّ يغطّي كل قيم GoalType بلا استثناء', ALL_GOALS.every((g) => g in GOAL_TYPE_TO_CALORIE_GOAL))
check('returning موجود وله مسار حراري صريح', GOAL_TYPE_TO_CALORIE_GOAL.returning === 'maintain')
check('health موجود وله مسار حراري صريح', GOAL_TYPE_TO_CALORIE_GOAL.health === 'maintain')
check('returning له تسمية غير فارغة (مستهلَكة في تفسير الخطة)', goalTypeLabel('returning').length > 0)
check('health له تسمية غير فارغة', goalTypeLabel('health').length > 0)
check('الجسر يقرأ من السجلّ لكل هدف', ALL_GOALS.every((g) => calorieGoalFromGoalType(g) === GOAL_TYPE_TO_CALORIE_GOAL[g]))
check('التنشيف والتضخيم لم يُسحبا إلى المحافظة', calorieGoalFromGoalType('cutting') === 'cut' && calorieGoalFromGoalType('bulking') === 'bulk')

console.log('\n═══ 4) قائمة العرض مشتقّة لا مكتوبة ═══')
check('عدد بطاقات الاختيار = عدد الأهداف المعروضة', goalTypeOptions.length === PICKABLE_GOAL_TYPES.length)
check('كل هدف معروض له بطاقة بنفس الترتيب', PICKABLE_GOAL_TYPES.every((g, i) => goalTypeOptions[i].value === g))
check('كل بطاقة تحمل تسمية غير فارغة', goalTypeOptions.every((o) => o.label.trim().length > 0))
check('كل هدف معروض له مسار حراري في السجلّ', PICKABLE_GOAL_TYPES.every((g) => !!GOAL_TYPE_TO_CALORIE_GOAL[g]))
check('recomposition ملغى: خارج العرض وباقٍ في السجلّ', !PICKABLE_GOAL_TYPES.includes('recomposition' as never) && !!GOAL_TYPE_TO_CALORIE_GOAL.recomposition)

console.log('\n═══ 5) محاكاة الالتفاف — كل تأكيد يُهاجَم (§4.2) ═══')

// أ) حدّان متباعدان يجب أن يسقطا في الفحص ١ — نحاكي التباعد ونطالب الفحص بكشفه.
const DIVERGED = { min: 100, max: 230 }
check('التفاف ١: نطاق ثانٍ مخالف يُكشَف بمقارنة الحدّين', !(DIVERGED.min === HEIGHT_RANGE.min && DIVERGED.max === HEIGHT_RANGE.max))

// ب) رسالة بأرقام صلبة مخالفة يجب أن تسقط في الفحص ٢.
const LYING = 'أدخل طولًا بين 100 و230 سم.'
check('التفاف ٢: رسالة صلبة مخالفة تُكشَف بفحص ذكر الحدّ', !(LYING.includes(String(HEIGHT_RANGE.min)) && LYING.includes(String(HEIGHT_RANGE.max))))

// ج) الجسر القديم (سلسلة if بافتراضي) يجب أن يسقط في الفحص ٣ — نعيد بناءه حرفيًا.
const legacyBridge = (g: GoalType) => (g === 'cutting' ? 'cut' : g === 'bulking' ? 'bulk' : 'maintain')
const NEW_GOAL = 'gainStrength' as unknown as GoalType
check(
  'التفاف ٣: هدف جديد كان يسقط على maintain في الجسر القديم',
  legacyBridge(NEW_GOAL) === 'maintain' && GOAL_TYPE_TO_CALORIE_GOAL[NEW_GOAL] === undefined,
)

// د) قائمة عرض مكتوبة يدويًا تنقص هدفًا يجب أن تسقط في الفحص ٤.
const HANDWRITTEN = [{ value: 'cutting' }, { value: 'bulking' }, { value: 'maintenance' }]
check('التفاف ٤: قائمة يدوية ناقصة تُكشَف بمقارنة الطول', HANDWRITTEN.length !== PICKABLE_GOAL_TYPES.length)

// هـ) `withinRange` لا يقبل الفراغ — وإلا مرّ ملف بلا بيانات جسم.
check('withinRange يرفض null/NaN', !withinRange(null, AGE_RANGE) && !withinRange(Number('س'), AGE_RANGE))
check('withinRange يقبل الحدّين ويرفض ما حولهما', withinRange(AGE_RANGE.min, AGE_RANGE) && withinRange(AGE_RANGE.max, AGE_RANGE) && !withinRange(AGE_RANGE.min - 1, AGE_RANGE) && !withinRange(AGE_RANGE.max + 1, AGE_RANGE))

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ 6) التلميح المعروض تحت الحقل يطابق الحدّ المطبَّق — [CTO-67] البند ٣ ═══')
// [CTO-65] البند ٢ وحّد الحدود وبنى **رسائل الأخطاء** منها، وبقيت **التلميحات**
// أرقامًا صلبة في القاموس («كجم (15–250)» · «سم (100–230)») بلغتيها. فالشاشة
// الواحدة تقول رقمين: التلميح يَعِد بـ15 والمدقّق يرفض عند 30.
// الفحص هنا على **القاموس المعروض فعلًا**، لا على الثوابت وحدها.
const hintFields: [string, string, string, { min: number; max: number }][] = [
  ['العمر', onboardingStrings.ar.bodyAgeHint, onboardingStrings.en.bodyAgeHint, LIMITS.age],
  ['الطول', onboardingStrings.ar.bodyHeightHint, onboardingStrings.en.bodyHeightHint, LIMITS.heightCm],
  ['الوزن', onboardingStrings.ar.bodyWeightHint, onboardingStrings.en.bodyWeightHint, LIMITS.weightKg],
  ['الوزن الهدف', onboardingStrings.ar.bodyTargetWeightHint, onboardingStrings.en.bodyTargetWeightHint, LIMITS.targetWeightKg],
  ['أيام التدريب', onboardingStrings.ar.bodyTrainingDaysHint, onboardingStrings.en.bodyTrainingDaysHint, LIMITS.trainingDays],
  ['مدة التمرين', onboardingStrings.ar.bodyWorkoutDurationHint, onboardingStrings.en.bodyWorkoutDurationHint, LIMITS.workoutDuration],
]
for (const [name, ar, en, range] of hintFields) {
  check(`${name}: التلميح العربي يذكر ${range.min}–${range.max} ولا شيء غيره`, ar.includes(`${range.min}–${range.max}`))
  check(`${name}: التلميح الإنجليزي يذكر ${range.min}–${range.max}`, en.includes(`${range.min}–${range.max}`))
  // والأهمّ: ألّا يحمل التلميح **أي** رقم خارج الحدّين — فرقم ثالث في السطر كذبة.
  const strayAr = (ar.match(/\d+/g) ?? []).filter((n) => n !== String(range.min) && n !== String(range.max))
  const strayEn = (en.match(/\d+/g) ?? []).filter((n) => n !== String(range.min) && n !== String(range.max))
  check(`${name}: لا رقم ثالث في التلميح بلغتيه`, strayAr.length === 0 && strayEn.length === 0)
}
// اقتران بالمدقّق: نفس القيمة التي يرفضها المدقّق **خارج** ما يَعِد به التلميح.
const belowWeight = { ...defaultProfile, weightKg: 15 } as Profile
check(
  'وزن 15 مرفوض فعلًا، والتلميح لا يَعِد به',
  validateProfile(belowWeight).some((e) => e.field === 'weightKg') && !onboardingStrings.ar.bodyWeightHint.includes('15'),
)

console.log('\n═══ 6-ب) التأكيد المضادّ للتلميحات (§4.2) ═══')
// أ) تلميح صلب قديم يجب أن يسقط في الفحص أعلاه.
const LYING_HINT = 'كجم (15–250)'
check('التفاف: التلميح الصلب القديم يُكشَف بعدم ذكره الحدّ المطبَّق', !LYING_HINT.includes(`${LIMITS.weightKg.min}–${LIMITS.weightKg.max}`))
// ب) وتلميح يذكر الحدّ الصحيح **ومعه رقم ثالث** يجب أن يسقط كذلك — وإلا مرّ
//    «كجم (30–250، وسابقًا 15)» وهو كذب مغلَّف بصدق.
const SMUGGLED_HINT = `كجم (${LIMITS.weightKg.min}–${LIMITS.weightKg.max}، وسابقًا 15)`
const smuggledStray = (SMUGGLED_HINT.match(/\d+/g) ?? []).filter((n) => n !== String(LIMITS.weightKg.min) && n !== String(LIMITS.weightKg.max))
check('التفاف: رقم ثالث مهرَّب داخل تلميح صحيح يُكشَف', smuggledStray.length > 0)
// ج) والعكس: التلميح الحالي لا يُكشَف — البوابة لا تصرخ على السليم.
const currentStray = (onboardingStrings.ar.bodyWeightHint.match(/\d+/g) ?? []).filter((n) => n !== String(LIMITS.weightKg.min) && n !== String(LIMITS.weightKg.max))
check('ولا يُكشَف التلميح الحالي الصحيح', currentStray.length === 0)

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات مصدر الحقيقة الواحد: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) { for (const f of fails) console.log('   ✗ ' + f); process.exit(1) }
