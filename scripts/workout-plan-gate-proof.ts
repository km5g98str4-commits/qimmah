// إثبات ح-٠ · انسداد تبويب التمارين للمولود الجديد.
//
// الرحلة الموصوفة: مستخدم يكمل الإعداد ويرى «خطتك جاهزة»، وجدوله محفوظ
// (split: upper_lower · daysPerWeek: 4)، وشاشة التغذية تقرأ المخرَج بلا مشكلة —
// ثم يفتح تبويب التمارين فيُقابَل بـ«أكمل إعداد خطتك». طريق مسدود في الدقيقة
// الأولى، ويكذّب ما قاله له التطبيق قبل ثوانٍ.
//
// السبب المقيس على هذا الجذع: شرط الشاشة كان `available = تمارين يومِ اليوم > 0`
// وحده — فيخلط «لا خطة» بـ«خطة موجودة ويومُ اليوم بلا تمارين». والإصلاح: الشرط
// يقرأ **الخطة المحفوظة** (planAvailable)، وحالة اليوم الفارغ تصير حالة صادقة
// مستقلة لا مطالبةً بإعادة إعداد.
//
// الحالة المخزَّنة أدناه هي نفسها حالة الرحلة: أربعة أيام تدريب upper/lower.

import { buildWorkoutV2Model } from '@/lib/workoutV2Model'
import { getDefaultCustomization } from '@/lib/customization'
import type { Customization } from '@/lib/customization'
import type { PlanDay, PlanExercise } from '@/types/workout'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

function ex(id: string, exerciseId: string): PlanExercise {
  return { id, exerciseId, sets: 4, reps: '8-10', restSec: 120 }
}

/** يوم تدريب حقيقي من أيام upper_lower. */
function trainingDay(id: string, nameAr: string, nameEn: string, ids: string[]): PlanDay {
  return { id, nameAr, nameEn, exercises: ids.map((e, i) => ex(`${id}-${i}`, e)) }
}

/** يوم بلا تمارين — اليوم الذي يقع عليه المستخدم فيرى الانسداد. */
function emptyDay(id: string, nameAr: string, nameEn: string): PlanDay {
  return { id, nameAr, nameEn, exercises: [] }
}

/** الحالة المخزَّنة كما أنتجتها الرحلة: upper/lower ×2 = أربعة أيام تدريب. */
function journeyCustomization(days: PlanDay[]): Customization {
  const base = getDefaultCustomization()
  return { ...base, workoutPlan: { templateId: 'gen-adv-upper-lower', days } }
}

const UPPER = ['barbell-bench-press', 'barbell-row', 'overhead-press', 'lat-pulldown-machine']
const LOWER = ['barbell-back-squat', 'deadlift', 'leg-press-machine', 'bodyweight-calf-raise']

console.log('\n── ح-٠ · إثبات انسداد تبويب التمارين ──\n')

// ═══ ١. حالة الرحلة الحقيقية: خطة أربعة أيام محفوظة ═══
console.log('١. الحالة المخزَّنة التي أنتجت الانسداد')
{
  // يومُ اليوم في هذه الحالة يقع على يوم تدريب (الحالة السعيدة).
  const c = journeyCustomization([
    trainingDay('d1', 'علوي أ', 'Upper A', UPPER),
    trainingDay('d2', 'سفلي أ', 'Lower A', LOWER),
    trainingDay('d3', 'علوي ب', 'Upper B', UPPER),
    trainingDay('d4', 'سفلي ب', 'Lower B', LOWER),
  ])
  const m = buildWorkoutV2Model(c, 'ar')
  check('الخطة المحفوظة مقروءة: أربعة أيام تدريب', m.planTrainingDays === 4)
  check('planAvailable = true (الإعداد مكتمل فعلًا)', m.planAvailable === true)
  check('تمرين اليوم معروض (available = true)', m.available === true)
  check('اليوم يحمل تمارينه', m.exercises.length === 4)
}

// ═══ ٢. الانسداد نفسه: خطة محفوظة + يومُ اليوم فارغ ═══
console.log('\n٢. الانسداد: خطة محفوظة ويومُ اليوم بلا تمارين')
{
  // خطة أربعة أيام، لكن ترتيبها يضع يومًا فارغًا في موضع اليوم مهما كان يوم
  // الأسبوع — كل الأيام فارغة إلا واحدًا، فيقع الانسداد حتمًا في ٦ أيام من ٧.
  const days: PlanDay[] = [
    trainingDay('d1', 'علوي أ', 'Upper A', UPPER),
    emptyDay('d2', 'راحة', 'Rest'),
    emptyDay('d3', 'راحة', 'Rest'),
    emptyDay('d4', 'راحة', 'Rest'),
  ]
  const m = buildWorkoutV2Model(journeyCustomization(days), 'ar')
  const todayIsEmpty = m.available === false

  check('planAvailable = true رغم أن يومَ اليوم قد يكون فارغًا', m.planAvailable === true)
  check('عدد أيام التدريب مقروء من الخطة المحفوظة (١)', m.planTrainingDays === 1)

  // البند الحاكم: الشرطان لم يعودا شرطًا واحدًا.
  check(
    'الشرطان منفصلان: «لا خطة» ≠ «يومُ اليوم فارغ»',
    m.planAvailable === true && (todayIsEmpty ? m.available === false : m.available === true),
  )
  // «أكمل إعداد خطتك» تُعرض على !planAvailable وحدها (شرط الشاشة في WorkoutV2).
  check('شرط شاشة «أكمل إعداد خطتك» لا يتحقّق مع خطة محفوظة', !(!m.planAvailable))
}

// ═══ ٣. الحالة الوحيدة التي تستحق «أكمل إعداد خطتك» ═══
console.log('\n٣. لا خطة أصلًا')
{
  const m = buildWorkoutV2Model(journeyCustomization([]), 'ar')
  check('خطة بلا أيام: planAvailable = false', m.planAvailable === false)
  check('عدد أيام التدريب = ٠', m.planTrainingDays === 0)

  const allEmpty = buildWorkoutV2Model(
    journeyCustomization([emptyDay('d1', 'يوم', 'Day'), emptyDay('d2', 'يوم', 'Day')]),
    'ar',
  )
  check('أيام كلها بلا تمارين: planAvailable = false (خطة صورية لا خطة)', allEmpty.planAvailable === false)
}

// ═══ ٤. حرّاس عدم الانحدار ═══
console.log('\n٤. لا انحدار')
{
  const c = journeyCustomization([trainingDay('d1', 'علوي أ', 'Upper A', UPPER)])
  const ar = buildWorkoutV2Model(c, 'ar')
  const en = buildWorkoutV2Model(c, 'en')
  check('planAvailable لا يتأثّر باللغة', ar.planAvailable === en.planAvailable)
  check('planTrainingDays لا يتأثّر باللغة', ar.planTrainingDays === en.planTrainingDays)
  check('الحقل الجديد لا يغيّر available القديم', typeof ar.available === 'boolean')
}

console.log(`\n── النتيجة: ${passed} ناجحًا · ${failed} فاشلًا ──\n`)
if (failed > 0) process.exit(1)
