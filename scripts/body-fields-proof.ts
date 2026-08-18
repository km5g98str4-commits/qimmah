// إثبات موجة الجسد: تدفّق الإعداد يجمع بيانات الجسم فعلًا، والخطة تختلف
// باختلافها، وحاجز القاصرين يعمل للضيف الجديد.
//
// الادعاء المُبطَل: قبل هذه الموجة كان `OnboardingV2` لا يسأل العمر ولا الجنس
// ولا الطول ولا الوزن، فتسقط كلها على `defaultAnswers` — أي نفس BMR لكل
// مستخدمي التطبيق، وحاجز القاصرين معطّل لكل ضيف جديد (لا عمر ⇒ بالغ افتراضًا).

import {
  AGE_RANGE,
  HEIGHT_RANGE,
  WEIGHT_RANGE,
  LAST_INPUT_STEP,
  inRange,
  validateStep,
  canAdvance,
  initialDraftV2,
} from '@/lib/onboardingV2Flow'
import { toAnswersFromV2 } from '@/lib/onboardingV2Adapter'
import { buildOnboardingProfile, defaultAnswers } from '@/lib/planBuilderAnswers'
import { deriveTargetWeight } from '@/lib/planDerive'
import { computeTargets } from '@/lib/calculators'
import { toLegacyProfile } from '@/lib/onboardingProfile'
import { isMinorAge } from '@/lib/calculators'
import { bodyStepStrings } from '@/i18n/dict/bodyStep'

let pass = 0
const fails: string[] = []
function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log('  ✓ ' + name) }
  else { fails.push(name); console.log('  ✗ ' + name) }
}

// النية والمستوى أُضيفا في موجة «النية والمستوى» كخطوة 1؛ يُملآن هنا كي تبقى
// فحوص هذه الموجة مركّزة على بيانات الجسم وحدها.
const base = {
  intent: 'meals' as const, level: 'intermediate' as const,
  trainedBefore: 'months' as const, totalMonths: 'm6_12' as const,
  lastTrained: 'now' as const, consistency: 'mostly' as const,
  goal: 'cut' as const, days: 4, duration: 45,
  place: 'gym' as const, neat: 'moderate' as const, dietPattern: 'none' as const,
  hasInjury: false, injuries: [] as string[], healthDataConsent: true,
}
const body = { age: 30, gender: 'male' as const, heightCm: 180, weightKg: 90 }

console.log('\n═══ 1) الخطوة الأولى هي الجسد ولا تُتجاوز فارغة ═══')
const empty = { ...base, age: null, gender: null, heightCm: null, weightKg: null }
check('خطوة فارغة تُرجع رسالة body', validateStep(0, empty) === 'body')
check('لا يمكن التقدّم من خطوة الجسد الفارغة', !canAdvance(0, empty))
check('المسودّة الجديدة تبدأ بلا بيانات جسم', initialDraftV2(null).age === null)
check('الخطوة الأولى رقمها 0', validateStep(0, { ...base, ...body }) === null)
check('آخر خطوة إدخال هي 6 (القيود)', LAST_INPUT_STEP === 6)

console.log('\n═══ 2) الحدود تمنع القيم الشاذّة ولا تُقصي أحدًا ═══')
check('عمر 12 مرفوض', !inRange(12, AGE_RANGE))
check('عمر 13 مقبول (القاصر يُقبل ثم يُقيَّد)', inRange(13, AGE_RANGE))
check('عمر 101 مرفوض', !inRange(101, AGE_RANGE))
check('طول 119 مرفوض و120 مقبول', !inRange(119, HEIGHT_RANGE) && inRange(120, HEIGHT_RANGE))
check('وزن 29 مرفوض و30 مقبول', !inRange(29, WEIGHT_RANGE) && inRange(30, WEIGHT_RANGE))
check('null مرفوض دائمًا', !inRange(null, AGE_RANGE))
check('NaN مرفوض', !inRange(Number('س'), AGE_RANGE))
check('جنس ناقص يُبطل الخطوة', validateStep(0, { ...base, ...body, gender: null }) === 'body')

console.log('\n═══ 3) القيم تصل فعلًا إلى الخطة (لا افتراضي صامت) ═══')
const a = toAnswersFromV2({ ...base, ...body })
check('العمر وصل', a.age === 30)
check('الجنس وصل', a.sex === 'male')
check('الطول وصل', a.heightCm === 180)
check('الوزن وصل', a.weightKg === 90)
// [QIM-V1-002] كان هذا الفحص يشترط الرقم **٨١** حرفيًّا — أي ٩٠ × ٠٫٩، ثابت
// المسند القديم. وقصده المُعلَن (وعنوانه) هو «مشتقّ من الوزن المُجاب لا
// الافتراضي»، لا «يساوي ٨١». فحين صارت للاشتقاق سلطة واحدة (`deriveTargetWeight`،
// تنشيف ×0.92) سقط الفحص على **رقمه** بينما قصده سليم.
// الآن يُقاس القصد نفسه، بطرفيه: يساوي ما تعطيه السلطة للوزن المُجاب،
// و**يخالف** ما تعطيه للوزن الافتراضي. فلا يبقى ثابتٌ منسوخ يشيخ في ملفَّين.
check('وزن الهدف مشتقّ من الوزن المُجاب', a.targetWeightKg === deriveTargetWeight(90, 'cutting'))
check('وليس من الوزن الافتراضي',
  a.targetWeightKg !== deriveTargetWeight(defaultAnswers.weightKg, 'cutting'))

console.log('\n═══ 4) الحسم: مستخدمان مختلفان ⇒ طاقتان مختلفتان ═══')
const p1 = toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, age: 22, gender: 'male', heightCm: 190, weightKg: 95 })))
const p2 = toLegacyProfile(buildOnboardingProfile(toAnswersFromV2({ ...base, age: 45, gender: 'female', heightCm: 158, weightKg: 60 })))
const t1 = computeTargets(p1)
const t2 = computeTargets(p2)
console.log(`     مستخدم أ: BMR=${t1.bmr} TDEE=${t1.tdee} سعرات=${t1.targetCalories}`)
console.log(`     مستخدم ب: BMR=${t2.bmr} TDEE=${t2.tdee} سعرات=${t2.targetCalories}`)
check('BMR مختلف بين المستخدمَين', t1.bmr !== t2.bmr)
check('TDEE مختلف', t1.tdee !== t2.tdee)
check('السعرات المستهدفة مختلفة', t1.targetCalories !== t2.targetCalories)
check('الفارق معتبر لا تقريبي (>300 سعرة)', Math.abs(t1.targetCalories - t2.targetCalories) > 300)
check('كلا الرقمين موجب ومنطقي', t1.bmr > 800 && t2.bmr > 800)

console.log('\n═══ 5) حاجز القاصرين يعمل للضيف الجديد ═══')
check('عمر 15 = قاصر', isMinorAge(15))
check('عمر 18 = بالغ', !isMinorAge(18))
// قبل الموجة: الضيف الجديد بلا عمر ⇒ undefined ⇒ لا تقييد.
check('غياب العمر كان يعني «بالغ» (السلوك القديم)', !isMinorAge(undefined))
check('العمر المُجاب يقود الحاجز الآن', isMinorAge(15) && !isMinorAge(30))

console.log('\n═══ 6) النصوص في القواميس بالعربية والإنجليزية (§6) ═══')
for (const lang of ['ar', 'en'] as const) {
  const s = bodyStepStrings[lang]
  check(`${lang}: العنوان غير فارغ`, s.title.length > 0)
  check(`${lang}: تسميات الحقول الأربعة موجودة`, !!(s.ageLabel && s.genderLabel && s.heightLabel && s.weightLabel))
  check(`${lang}: تنويه القاصر موجود`, s.minorNote.length > 0)
  check(`${lang}: يشرح سبب السؤال`, s.whyNote.length > 0)
}
check('العربية ليست نسخة من الإنجليزية', bodyStepStrings.ar.title !== bodyStepStrings.en.title)
// §6: بلا لوم ولا تهويل ولا تعجّب مكدّس.
const arAll = Object.values(bodyStepStrings.ar).join(' ')
check('لا علامات تعجّب في النبرة العربية', !arAll.includes('!'))

console.log(`\n${fails.length === 0 ? '✅' : '❌'} إثبات بيانات الجسم: ${pass} فحصًا، ${fails.length} فشل.`)
if (fails.length) {
  for (const f of fails) console.log('   ✗ ' + f)
  process.exit(1)
}
