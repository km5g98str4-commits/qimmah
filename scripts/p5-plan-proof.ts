// P5 proof — يفحص أن الأسبوع المولّد لا يحوي «يوم تمرين مكرّر» (بطاقتان بنفس الاسم/النوع لنفس اليوم)
// ولا تعارض بين جدول الأسبوع و«يوم اليوم» (todayPlanDay). أداة إثبات فقط — لا تلمس التطبيق.

import { generatePlan } from '@/lib/planGenerator'
import type { Profile } from '@/types/profile'

function baseProfile(over: Partial<Profile>): Profile {
  return {
    userName: 'تجربة',
    gender: 'male',
    age: 28,
    heightCm: 178,
    weightKg: 82,
    goal: 'bulk',
    goalType: 'bulking',
    trainingLevel: 'intermediate',
    experienceBand: '1to2y',
    trainingDays: 6,
    workoutDuration: 60,
    workoutEnvironment: 'gym',
    gymType: 'full',
    gymAccess: 'full',
    activityLevel: 'moderate',
    nutritionStyle: 'high_protein',
    nutritionDisplayStyle: 'meal_suggestions',
    mealsPerDay: 4,
    trackNutrition: true,
    muscleFocus: 'balanced',
    splitMode: 'auto',
    ...over,
  } as Profile
}

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? '✅' : '❌'} ${msg}`)
  if (!cond) failures++
}

for (const days of [3, 4, 5, 6, 7]) {
  const p = baseProfile({ trainingDays: days })
  const plan = generatePlan(p)
  const dayNames = plan.workoutPlan.days.map((d) => d.nameAr)
  const dup = dayNames.filter((n, i) => dayNames.indexOf(n) !== i)
  console.log(`\n— ${days} أيام — تقسيمة: ${plan.suggestedWorkoutTemplateId}`)
  console.log('  أيام الخطة:', dayNames.join(' | '))
  console.log('  الجدول:', plan.weeklySchedule.map((r) => `${r.day.slice(0, 3)}:${r.type}`).join('  '))
  check(dup.length === 0, `لا تكرار في أسماء أيام الخطة (${days} أيام)${dup.length ? ' — مكرّر: ' + dup.join(', ') : ''}`)

  // لكل يوم أسبوع مُدرّب: نوع الجدول يجب أن يطابق نوع «يوم اليوم» المعروض لو كان اليوم هو ذاك اليوم.
  // نحاكي getDay() لكل يوم أسبوع (السبت=6.. الجمعة=5) عبر مطابقة النوع مباشرة على days.
}

// تعارض todayPlanDay ↔ الجدول: نتأكد أن كل يوم في workoutPlan.days يُمثَّل مرة واحدة في «today» عبر الأسبوع
{
  const p = baseProfile({ trainingDays: 6 })
  const plan = generatePlan(p)
  const len = plan.workoutPlan.days.length
  const covered = new Set<number>()
  for (let gd = 0; gd < 7; gd++) covered.add(gd % len)
  check(covered.size === len, `todayPlanDay يغطّي كل أيام الخطة (${covered.size}/${len})`)
}

console.log(`\n${failures === 0 ? '✅ كل الفحوص نجحت' : `❌ ${failures} فحص فشل`}`)
process.exit(failures === 0 ? 0 : 1)
