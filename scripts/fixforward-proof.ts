// إثبات وحدة لإصلاحَي wave3 «يجب أن تعمل الميزات فعليًا»:
//  A) WorkoutV2 → جلسة قانونية (buildV2WorkoutSession) بالشكل الذي يقرؤه التقدّم/اليوم/الملف.
//  B) توحيد متجر التغذية: كتابة NutritionV2 تنعكس في متجر historyStore القانوني
//     (loggedFood) الذي تقرؤه ركيزة «تغذية» في اليوم.
// يعمل فوق localStorage مُحاكى (banner في المُشغّل) بلا متصفح.

import { buildV2WorkoutSession, type V2ActiveSnapshot } from '@/lib/workoutV2Persist'
import type { WorkoutV2Model } from '@/lib/workoutV2Model'
import { addFoodToDay, addWaterToDay, nutritionDayTotals, type LoggedFood } from '@/lib/nutritionV2Model'
import { getNutritionLog, getWaterLogs } from '@/lib/historyStore'
import { getDayStamp } from '@/lib/today'

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

console.log('\n① إصلاح A — تحويل جلسة التمرين v2 إلى الشكل القانوني')
{
  const model = {
    available: true,
    goal: 'cut',
    program: { titleAr: '', titleEn: '', contextAr: '', contextEn: '', estimatedDurationMin: 45 },
    session: { title: 'جسم كامل', muscles: [], durationMin: 45, exerciseCount: 2, source: '' },
    exercises: [
      { id: 'pe-1', exerciseId: 'barbell-bench-press', nameAr: 'بنش', nameEn: 'Bench', category: 'primary', equipment: [], muscles: [], sets: 2, reps: '8-12', restSec: 90, targetWeightKg: null, lastPerformance: null, cues: [], commonMistake: null, replaceable: true },
      { id: 'pe-2', exerciseId: 'deadlift', nameAr: 'رفعة', nameEn: 'Deadlift', category: 'primary', equipment: [], muscles: [], sets: 1, reps: '5', restSec: 120, targetWeightKg: null, lastPerformance: null, cues: [], commonMistake: null, replaceable: true },
    ],
  } as unknown as WorkoutV2Model
  const active: V2ActiveSnapshot = {
    startedAt: 1_800_000_000_000,
    rows: {
      'pe-1': [{ weight: 60, reps: 10, done: true }, { weight: 62.5, reps: 8, done: true }],
      'pe-2': [{ weight: 120, reps: 5, done: true }],
    },
  }
  const s = buildV2WorkoutSession(active, model, { date: '2026-07-13', finishedAtMs: 1_800_000_180_000 })
  check('المعرّف مشتقّ من بداية الجلسة', s.id === 'session-v2-1800000000000')
  check('التاريخ = ختم اليوم الممرَّر', s.date === '2026-07-13')
  check('finishedAt مضبوط (جلسة منتهية)', typeof s.finishedAt === 'string' && s.finishedAt.length > 0)
  check('تمرينان في الجلسة', s.exercises.length === 2)
  check('اسم التمرين القانوني (عربي) محفوظ', s.exercises[0].exerciseNameAr === 'بنش')
  check('معرّف التمرين قانوني (من الكتالوج)', s.exercises[0].exerciseId === 'barbell-bench-press')
  check('المجموعة الأولى: وزن نصّي 60', s.exercises[0].sets?.[0].weightKg === '60')
  check('المجموعة الأولى: تكرار نصّي 10', s.exercises[0].sets?.[0].actualReps === '10')
  check('كل مجموعات pe-1 مكتملة → التمرين مكتمل', s.exercises[0].completed === true)
  check('حجم بنش = 60×10 + 62.5×8 يُحسب لاحقًا من sets', s.exercises[0].sets?.length === 2)
}

console.log('\n② إصلاح B — توحيد متجر التغذية (كتابة v2 → قراءة اليوم القانونية)')
{
  globalThis.localStorage.clear()
  const today = getDayStamp()
  const meal: LoggedFood = { id: 'f1', nameAr: 'صدر دجاج', calories: 330, protein: 62, carbs: 0, fat: 7, meal: 'lunch' }
  addFoodToDay(meal)
  const log = getNutritionLog(today)
  check('اليوم القانوني موجود بعد تسجيل وجبة v2', !!log)
  check('سعرات loggedFood = سعرات الوجبة (الركيزة ستتحرّك)', log?.loggedFood?.calories === 330)
  check('بروتين loggedFood مطابق', log?.loggedFood?.protein === 62)

  // Second food accumulates into the same canonical field.
  addFoodToDay({ id: 'f2', nameAr: 'أرز', nameEn: 'Rice', calories: 200, protein: 4, carbs: 45, fat: 1, meal: 'lunch' })
  const log2 = getNutritionLog(today)
  check('تسجيل وجبة ثانية يراكم السعرات (330+200)', log2?.loggedFood?.calories === 530)
  check('يراكم الكارب (0+45)', log2?.loggedFood?.carbs === 45)

  // Water mirrors into the canonical water store too.
  addWaterToDay(500)
  check('الماء ينعكس في المتجر القانوني', getWaterLogs()[today]?.waterMl === 500)

  // Totals helper matches the mirrored write.
  const totals = nutritionDayTotals([meal, { id: 'f2', nameAr: 'أرز', calories: 200, protein: 4, carbs: 45, fat: 1, meal: 'lunch' }])
  check('nutritionDayTotals يطابق المجموع المنعكس', totals.calories === 530 && totals.protein === 66)
}

console.log(`\n${'─'.repeat(44)}`)
if (fail === 0) {
  console.log(`✅ كل فحوص الإصلاحين نجحت — ${pass} فحصًا.`)
} else {
  console.log(`❌ فشل ${fail} من ${pass + fail}.`)
  process.exit(1)
}
