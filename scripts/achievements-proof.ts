// إثبات وقت التشغيل لمحرّك الأوسمة — يشغّل المحرّك الحقيقي فوق localStorage مُحاكى (Node).
// يحاكي بيانات تفتح كل نوع وسام، ويتحقّق: الفتح مرّة واحدة، الثبات بعد التحديث، واكتشاف PR.

import {
  ACHIEVEMENTS_KEY,
  computeAchievementView,
  dismissCelebration,
  evaluateAchievements,
  getCelebrationQueue,
  loadAchievementState,
  registerWorkoutPRs,
  resetAchievements,
} from '@/features/achievements/engine'
import { ACHIEVEMENTS } from '@/data/achievements'

// — مساعدات —
let failures = 0
function assert(cond: boolean, msg: string): void {
  if (cond) {
    console.log(`  ✓ ${msg}`)
  } else {
    failures += 1
    console.log(`  ✗ FAIL: ${msg}`)
  }
}
function stamp(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const LS = globalThis.localStorage
function seed(key: string, value: unknown): void {
  LS.setItem(key, JSON.stringify(value))
}
function unlockedIds(): string[] {
  return Object.keys(loadAchievementState().unlocked)
}

// — تهيئة نظيفة —
LS.clear()
LS.setItem('qimmah:history:migrated:v1', 'done') // تجاوز الترحيل
resetAchievements()

console.log('\n═══ 1) البدايات: أول تمرين + أول وجبة + أول خطوات ═══')
// جلسة تمرين مكتملة اليوم
seed('qimmah:history:workoutSessions:v1', [
  {
    id: 'w-today',
    date: stamp(0),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    workoutDayId: 'd1',
    workoutDayName: 'دفع',
    exercises: [],
  },
])
// وجبة مسجّلة اليوم
seed('qimmah:history:nutritionLogs:v1', {
  [stamp(0)]: { date: stamp(0), doneMeals: { breakfast: true }, updatedAt: new Date().toISOString() },
})
// خطوات اليوم فوق الهدف الافتراضي (10000)
seed('qimmah:steps:v1', { [stamp(0)]: 12000 })

const newly = evaluateAchievements({ daysPerWeek: 3 })
const firstIds = newly.map((a) => a.id)
assert(firstIds.includes('first-workout'), 'فتح «أول تمرين»')
assert(firstIds.includes('first-meal'), 'فتح «أول وجبة»')
assert(firstIds.includes('steps-1'), 'فتح «قفلت خطواتك» (أول يوم)')

console.log('\n═══ 2) الفتح مرّة واحدة (idempotent) ═══')
const queueLenBefore = getCelebrationQueue().length
const newlyAgain = evaluateAchievements({ daysPerWeek: 3 })
assert(newlyAgain.length === 0, 'إعادة التقييم بنفس البيانات لا تفتح شيئًا جديدًا')
assert(getCelebrationQueue().length === queueLenBefore, 'لا احتفالات مكرّرة عند إعادة التقييم')

console.log('\n═══ 3) البروتين: أول مرة + ٣ + ١٠ + ٣٠ يوم ═══')
// راكم ٣٠ يوم بروتين (تواريخ متمايزة) — كل نداء يضيف يومًا واحدًا
for (let i = 0; i < 30; i++) {
  evaluateAchievements({ proteinToday: 190, proteinTarget: 180, daysPerWeek: 3, today: stamp(i) })
}
const afterProtein = unlockedIds()
assert(loadAchievementState().proteinDays.length === 30, 'تراكم ٣٠ يوم بروتين بلا تكرار')
;['protein-1', 'protein-3', 'protein-10', 'protein-30'].forEach((id) =>
  assert(afterProtein.includes(id), `فتح وسام البروتين ${id}`),
)
// بروتين تحت الهدف لا يُحسب
const daysBefore = loadAchievementState().proteinDays.length
evaluateAchievements({ proteinToday: 100, proteinTarget: 180, today: stamp(100) })
assert(loadAchievementState().proteinDays.length === daysBefore, 'بروتين تحت الهدف لا يُسجَّل يومًا')

console.log('\n═══ 4) السلاسل: ٣٠ يوم تمرين متتالية + الخطوات + الأسبوع ═══')
// ٣٠ يوم تمرين متتالية + ٣٠ يوم خطوات متتالية
const sessions = []
const steps: Record<string, number> = {}
const nut: Record<string, unknown> = {}
for (let i = 0; i < 30; i++) {
  sessions.push({
    id: `w-${i}`,
    date: stamp(i),
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    workoutDayId: 'd1',
    workoutDayName: 'دفع',
    exercises: [],
  })
  steps[stamp(i)] = 11000
  nut[stamp(i)] = { date: stamp(i), doneMeals: { lunch: true }, updatedAt: new Date().toISOString() }
}
seed('qimmah:history:workoutSessions:v1', sessions)
seed('qimmah:steps:v1', steps)
seed('qimmah:history:nutritionLogs:v1', nut)
evaluateAchievements({ daysPerWeek: 3 })
const afterStreak = unlockedIds()
;['streak-3', 'streak-7', 'streak-14', 'streak-30'].forEach((id) =>
  assert(afterStreak.includes(id), `فتح وسام السلسلة ${id}`),
)
;['steps-7', 'steps-30'].forEach((id) => assert(afterStreak.includes(id), `فتح وسام الخطوات ${id}`))
assert(afterStreak.includes('first-week'), 'فتح «أول أسبوع كامل»')
;['workouts-10', 'workouts-25'].forEach((id) =>
  assert(afterStreak.includes(id), `فتح وسام المعالم ${id}`),
)

console.log('\n═══ 5) اكتشاف الأرقام القياسية (PR) + أوسمتها ═══')
const qBefore = getCelebrationQueue().length
registerWorkoutPRs([{ nameAr: 'بنش برس', weight: 100 }])
assert(loadAchievementState().prCount === 1, 'عدّاد الأرقام القياسية = 1 بعد أول PR')
assert(unlockedIds().includes('first-pr'), 'فتح «أول رقم قياسي»')
const prCeleb = getCelebrationQueue().slice(qBefore).find((c) => c.kind === 'pr')
assert(!!prCeleb, 'ظهور احتفال «رقم قياسي جديد»')
// المزيد من الأرقام القياسية → أوسمة ٣ و١٠
registerWorkoutPRs([
  { nameAr: 'سكوات', weight: 140 },
  { nameAr: 'ديدليفت', weight: 180 },
])
assert(unlockedIds().includes('pr-3'), 'فتح «٣ أرقام قياسية» عند بلوغ ٣')
registerWorkoutPRs(Array.from({ length: 7 }, (_, i) => ({ nameAr: `تمرين ${i}`, weight: 50 + i })))
assert(loadAchievementState().prCount === 10, 'عدّاد الأرقام القياسية = 10')
assert(unlockedIds().includes('pr-10'), 'فتح «١٠ أرقام قياسية»')

console.log('\n═══ 6) اكتمال كل الأوسمة + الثبات بعد «التحديث» ═══')
const view = computeAchievementView({ daysPerWeek: 3 })
assert(view.earnedCount === ACHIEVEMENTS.length, `كل الأوسمة مفتوحة (${view.earnedCount}/${ACHIEVEMENTS.length})`)
// «تحديث الصفحة» = قراءة جديدة من نفس التخزين (لا كاش في الذاكرة للحالة)
const raw = LS.getItem(ACHIEVEMENTS_KEY)!
const persisted = JSON.parse(raw)
assert(Object.keys(persisted.unlocked).length === ACHIEVEMENTS.length, 'كل المعرّفات محفوظة في localStorage')
const reloaded = loadAchievementState()
assert(
  ACHIEVEMENTS.every((a) => !!reloaded.unlocked[a.id]),
  'قراءة جديدة بعد التحديث تُبقي كل الأوسمة مفتوحة',
)
// إعادة تقييم بعد التحديث لا تُطلق أي احتفال جديد
const qLen = getCelebrationQueue().length
evaluateAchievements({ daysPerWeek: 3 })
assert(getCelebrationQueue().length === qLen, 'لا فتح مكرّر بعد التحديث')

console.log('\n═══ 7) إغلاق الاحتفال يزيله من الطابور ═══')
const q = getCelebrationQueue()
if (q.length > 0) {
  const k = q[0].key
  dismissCelebration(k)
  assert(!getCelebrationQueue().some((c) => c.key === k), 'إغلاق الاحتفال يزيله من الطابور')
} else {
  assert(true, 'الطابور فارغ (لا شيء لإغلاقه)')
}

console.log('\n─────────────────────────────────────')
if (failures === 0) {
  console.log(`✅ نجحت كل الاختبارات — ${ACHIEVEMENTS.length} وسام، كل الأنواع تُفتح مرّة واحدة وتثبت.`)
  process.exit(0)
} else {
  console.log(`❌ ${failures} اختبار فشل.`)
  process.exit(1)
}
