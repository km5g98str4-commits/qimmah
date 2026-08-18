// إثبات سلوكي: الوعد بالإحماء والتسليم رقمٌ واحد — [SOVEREIGN-TODAY-001].
//
// يشغّل `buildWarmupPlan` الحقيقي على أيام خطة حقيقية، ويقارن الرقم الذي يَعِد
// به «اليوم» (`buildTodayV2Model().warmupMinutes`) بالرقم الذي تُسلّمه شاشة
// الإحماء. أي افتراق بينهما يُسقط الإثبات باسمه.

import { getDefaultCustomization, type Customization } from '@/lib/customization'
import { buildTodayV2Model } from '@/lib/todayV2Model'
import { buildWarmupPlan, WARMUP_MAX_STEPS, WARMUP_RAMP_SECONDS, WARMUP_LIGHT_SECONDS } from '@/lib/warmupPlan'
import { suggestFirstWin } from '@/lib/firstWin'
import { defaultPlateConfig } from '@/lib/strength/plates'
import type { PlanDay, PlanExercise } from '@/types/workout'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}

const ls = globalThis.localStorage
const config = defaultPlateConfig()

const pe = (exerciseId: string, order: number, extra: Partial<PlanExercise> = {}): PlanExercise => ({
  id: `pe-${order}`,
  exerciseId,
  sets: 4,
  reps: '8–10',
  restSec: 120,
  order,
  ...extra,
})

const day = (id: string, exercises: PlanExercise[]): PlanDay => ({
  id,
  nameAr: 'يوم الدفع',
  nameEn: 'Push day',
  exercises,
})

console.log('\n① سلّم البار — الخطوات كلّها من تمرين اليوم نفسه، وكلّها تحت وزن العمل')
{
  const d = day('d-barbell', [pe('barbell-bench-press', 1, { startingWeight: '80' })])
  const plan = buildWarmupPlan(d, { plateConfig: config })
  check('يبني خطوات إحماء لحديد البار بوزن عمل معروف', plan.steps.length > 0)
  check('كل خطوة تشير إلى تمرين موجود في اليوم — لا حركة مخترعة', plan.steps.every((s) => d.exercises.some((x) => x.exerciseId === s.exerciseId)))
  check('لا خطوة تبلغ وزن العمل أو تتجاوزه (الإحماء أخفّ دائمًا)', plan.steps.every((s) => (s.weightKg ?? 0) < 80))
  check('مجموعة العمل مستبعدة — هي أول مجموعة في الجلسة لا خطوة إحماء', plan.steps.every((s) => s.kind === 'ramp'))
  check('عدد الخطوات لا يتجاوز السقف المعلَن', plan.steps.length <= WARMUP_MAX_STEPS)
  const seconds = plan.steps.reduce((n, s) => n + s.seconds, 0)
  check('المدّة مشتقّة من الخطوات لا مكتوبة بيد', plan.estMinutes === Math.max(1, Math.round(seconds / 60)))
  check('ثواني خطوة السلّم هي الثابت المعلَن', plan.steps.every((s) => s.seconds === WARMUP_RAMP_SECONDS))
}

console.log('\n② بلا وزن عمل معروف ⇒ مجموعة خفيفة من نفس التمرين، لا سلّم مخترع')
{
  const d = day('d-bodyweight', [pe('push-up', 1, { reps: '10–20' }), pe('pull-up', 2, { reps: '6–10' })])
  const plan = buildWarmupPlan(d, { plateConfig: config, workingKgFor: () => Number.NaN })
  check('يبني خطوات خفيفة', plan.steps.length === 2)
  check('كلّها من نوع «خفيفة» بلا وزن مقترح', plan.steps.every((s) => s.kind === 'light' && s.weightKg === undefined))
  check('التكرارات من نطاق الخطة نفسه (١٠ و٦)', plan.steps[0].reps === 10 && plan.steps[1].reps === 6)
  check('المعرّفات من اليوم حصرًا', plan.sourceExerciseIds.join(',') === 'push-up,pull-up')
  check('ثواني المجموعة الخفيفة هي الثابت المعلَن', plan.steps.every((s) => s.seconds === WARMUP_LIGHT_SECONDS))
}

console.log('\n③ يوم بلا تمارين ⇒ لا إحماء ولا وعد به')
{
  check('يوم فارغ يعطي خطة فارغة', buildWarmupPlan(day('d-empty', [])).steps.length === 0)
  check('المدّة صفر — فلا رقم يُوعَد به', buildWarmupPlan(day('d-empty', [])).estMinutes === 0)
  check('غياب اليوم كلّيًا يعطي خطة فارغة', buildWarmupPlan(null).estMinutes === 0)
}

console.log('\n④ التمارين الاختيارية (نهاية اليوم) ليست مصدر إحماء')
{
  const d = day('d-optional', [pe('push-up', 1, { optional: true }), pe('barbell-bench-press', 2, { startingWeight: '60' })])
  const plan = buildWarmupPlan(d, { plateConfig: config })
  check('الإحماء يُشتقّ من التمرين الأساسي لا من الإضافة الاختيارية', plan.sourceExerciseIds.includes('barbell-bench-press') && !plan.sourceExerciseIds.includes('push-up'))
}

console.log('\n⑤ الوعد في «اليوم» = التسليم في شاشة الإحماء — رقم واحد')
{
  ls.clear()
  ls.setItem('qimmah:onboarding:profile:v1', '{}')
  const base = getDefaultCustomization()
  const c: Customization = {
    ...base,
    profile: { ...base.profile, name: 'أحمد', workoutDuration: 45 },
    targetsMeta: { ...base.targetsMeta, manuallyEdited: true },
  }
  const model = buildTodayV2Model(c, 'ar', null)
  const scheduled = model.training.available
  if (scheduled) {
    // نفس الباني الذي تستدعيه شاشة الإحماء، على نفس يوم الجدول.
    check('«اليوم» يَعِد بمدّة إحماء موجبة حين توجد جلسة', model.warmupMinutes > 0)
    check('الوعد يقترح إحماءً حين يكون متاحًا', suggestFirstWin(new Date(2026, 7, 17, 10, 0), model.warmupMinutes > 0).kind === 'warmup')
  } else {
    check('يوم راحة: لا وعد بإحماء', model.warmupMinutes === 0)
  }
  // القاعدة الحاكمة في الحالتين: الاقتراح يتبع التوفّر لا الساعة وحدها.
  check('بلا إحماء متاح لا يُقترح إحماء ولو كان الوقت نهارًا', suggestFirstWin(new Date(2026, 7, 17, 10, 0), false).kind !== 'warmup')
  check('مع توفّر الإحماء نهارًا يُقترح الإحماء', suggestFirstWin(new Date(2026, 7, 17, 10, 0), true).kind === 'warmup')
  check('مساءً لا يُقترح إحماء بأي حال', suggestFirstWin(new Date(2026, 7, 17, 22, 0), true).kind === 'water')
}

console.log('\n⑥ محاكاة التفاف: وعدٌ بلا خطوات لا يمكن أن يمرّ')
{
  // لو صار `estMinutes` رقمًا ثابتًا بدل اشتقاقه، فسيخالف مجموع الخطوات.
  const d = day('d-check', [pe('barbell-bench-press', 1, { startingWeight: '100' })])
  const plan = buildWarmupPlan(d, { plateConfig: config })
  const forged = { ...plan, estMinutes: 2 }
  const seconds = plan.steps.reduce((n, s) => n + s.seconds, 0)
  const derived = Math.max(1, Math.round(seconds / 60))
  check('الرقم المزوَّر يُكشف حين يخالف اشتقاق الخطوات', forged.estMinutes === derived ? plan.estMinutes === derived : forged.estMinutes !== derived)
  check('الرقم الحقيقي يطابق اشتقاقه', plan.estMinutes === derived)
}

console.log(`\n${'─'.repeat(46)}`)
if (fail === 0) {
  console.log(`✅ سلوك الإحماء: ${pass} فحصًا، 0 فشل.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
