// Dev-only isolation harness for the Today home surface.
//
// Mounts <TodayV2> inside its REAL CustomizationProvider with localStorage seeded
// to produce each founder-stress-tested state — normal · new-user · after-workout
// · rest day · no-plan — so the states can be screenshotted without the auth/route
// shell. Data is seeded through the same storage keys the app writes, so the model
// reads exactly what production would. Never shipped: not referenced by index.html,
// so `vite build` (index.html entry) excludes it; only `vite dev` serves this path.
//
// Query params:  ?state=<state>&lang=<ar|en>

import { createRoot } from 'react-dom/client'
import { CustomizationProvider } from '@/lib/customizationContext'
import { TodayV2 } from '@/views/TodayV2'
import '@/design-system/fonts'
import '@/styles/index.css'
import '@/design-system/tokens.css'

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const stampOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const stamp = stampOf(now)
const iso = now.toISOString()
/**
 * أيام **داخل الأسبوع الجاري** (يبدأ السبت — `weekStart: 6`).
 *
 * ضرورة لا تجميل: أول تشغيل بذر الجلسات بـ`daysAgo(2/4/6)` فوقعت كلّها في
 * الأسبوع الماضي حين كان اليوم أحدًا، فعرضت البطاقة «٠ من ٣» بحقّ — ولقطةٌ
 * لحالةٍ فارغة لا تُظهر التصميم المقصود. البذر الآن مرتبط ببداية الأسبوع نفسها.
 */
const weekStartOffset = (now.getDay() - 6 + 7) % 7
const inThisWeek = (dayOfWeekOffset: number) =>
  stampOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekStartOffset + dayOfWeekOffset, 12, 0, 0, 0))
/** أيام مضت من الأسبوع الجاري (اليوم غير مشمول) — أقصاها عدد الأيام المنقضية. */
const pastDaysThisWeek = (count: number) =>
  Array.from({ length: Math.min(count, weekStartOffset) }, (_, i) => inThisWeek(i))

type Seed = { wellness?: boolean }

/** خطة تمرين حقيقية بيومين — تعطي عدد تمارين ومجموعات فعليًّا لا مخترعًا. */
function plan() {
  const ex = (id: string, sets: number) => ({ id: `p-${id}`, exerciseId: id, sets, reps: '8-12', restSec: 90, order: 0 })
  return {
    templateId: 'shot',
    days: [
      {
        id: 'd1',
        nameAr: 'الصدر والكتف',
        nameEn: 'Chest & Shoulders',
        exercises: [
          ex('bench-press', 4), ex('incline-press', 3), ex('shoulder-press', 3),
          ex('lateral-raise', 3), ex('chest-fly', 3), ex('triceps-pushdown', 2),
        ],
      },
      {
        id: 'd2',
        nameAr: 'الظهر والذراع',
        nameEn: 'Back & Arms',
        exercises: [ex('lat-pulldown', 4), ex('barbell-row', 4), ex('biceps-curl', 3)],
      },
    ],
  }
}

function customization(seed: Seed): string {
  return JSON.stringify({
    profile: { name: 'أحمد', goal: 'cut', workoutDuration: 45 },
    // manuallyEdited stops withFreshTargets from recomputing our explicit targets.
    targetsMeta: { manuallyEdited: true },
    nutritionPlan: { targetCalories: 2400, targetProtein: 145, targetCarbs: 240, targetFat: 70, targetWaterLiters: 2 },
    workoutPlan: plan(),
    ...(seed.wellness ? { wellnessPlan: { enabled: true, supplements: [{ id: 's1', supplementId: 'magnesium', order: 0 }], medications: [] } } : {}),
  })
}

/** جدول أسبوعي حقيقي — تدريب في الأيام المعطاة (ترقيم JS)، وراحة ما عداها. */
function schedule(trainingWeekdays: number[]): string {
  const weekdays = Array.from({ length: 7 }, (_, i) => (trainingWeekdays.includes(i) ? i % 2 : 'rest'))
  return JSON.stringify({
    version: 1, weekdays, split: 'upper_lower', daysPerWeek: trainingWeekdays.length,
    weekStart: 6, overrides: {}, missedDecisions: {}, source: 'user', updatedAt: iso,
  })
}

/**
 * أيام التدريب: **اليوم** + ما مضى من هذا الأسبوع (حتى ثلاثة) + حشوٌ من القادم
 * ليصير الأسبوع أربعة أيام واقعية.
 *
 * لماذا ترتبط بما مضى: المحاولة الأولى وزّعتها بإزاحات ثابتة (+٢/+٤/+٥) فلم
 * يصادف أيٌّ منها يومًا منقضيًا حين شُغّلت اللقطات يوم أحد — فخرجت البطاقة
 * «٠ من ٤» في كل لقطة، وهي حالة صحيحة لكنها لا تُظهر مربّعًا مكتملًا واحدًا.
 * اللقطة التي لا تُظهر ما تراجعه ليست مراجعة.
 */
const ELAPSED_WEEKDAYS = pastDaysThisWeek(3).map((s) => new Date(`${s}T12:00:00`).getDay())
const TRAINING_WEEKDAYS = (() => {
  const set = new Set<number>([now.getDay(), ...ELAPSED_WEEKDAYS])
  for (let step = 1; set.size < 4 && step < 7; step += 1) set.add((now.getDay() + step + 1) % 7)
  return Array.from(set)
})()
/** أيام التدريب التي **مضت** من هذا الأسبوع — عليها تُبذر الجلسات المكتملة. */
const PAST_TRAINING_STAMPS = pastDaysThisWeek(7).filter((s) =>
  TRAINING_WEEKDAYS.includes(new Date(`${s}T12:00:00`).getDay()),
)

function seedCommon(seed: Seed = {}): void {
  localStorage.clear()
  document.documentElement.dataset.design = 'v2'
  localStorage.setItem('qimmah:history:migrated:v1', 'done') // protect seeded history keys
  localStorage.setItem('qimmah:onboarding:profile:v1', '{}') // any value → onboarded
  localStorage.setItem('qimmah:customization:v1', customization(seed))
  localStorage.setItem('qimmah:workoutCalendar:v1', schedule(TRAINING_WEEKDAYS))
}

/**
 * تُكتب التغذية في **المتجرين معًا** كما تفعل الكتابة الحقيقية.
 *
 * `persist()` في `nutritionV2Model` يعكس كل كتابة إلى المتجر التاريخي
 * (`mirrorToCanonical`). وبذرُ مفتاح `v2` وحده يخلق حالة لا تقع في الإنتاج:
 * الحلقات (من `useNutritionToday`) تقرأ ١١٠غ بروتين بينما تنبيه النموذج (من
 * `historyStore.loggedFood`) يقرأ صفرًا فيقول «باقي ١٤٥غ». حالة بذرٍ لا عطل
 * منتج — لكنّها تكشف أنّ للتغذية **مصدرين** تُبقيهما المرآة متوافقين.
 */
function setNutrition(calories: number, protein: number, carbs: number, fat: number, waterMl: number): void {
  localStorage.setItem(
    'qimmah:nutrition:v2',
    JSON.stringify({
      date: stamp,
      waterMl,
      foods: [{ id: 'f1', nameAr: 'وجبة', calories, protein, carbs, fat, meal: 'lunch' }],
    }),
  )
  localStorage.setItem(
    'qimmah:history:nutritionLogs:v1',
    JSON.stringify({ [stamp]: { date: stamp, doneMeals: {}, loggedFood: { calories, protein, carbs, fat }, updatedAt: iso } }),
  )
  localStorage.setItem('qimmah:history:waterLogs:v1', JSON.stringify({ [stamp]: waterMl }))
}

/** جلسات مكتملة في تواريخ معيّنة — نفس الشكل الذي يكتبه `saveWorkoutSession`. */
function setSessions(stamps: string[]): void {
  localStorage.setItem(
    'qimmah:history:workoutSessions:v1',
    JSON.stringify(
      stamps.map((s, i) => ({
        id: `sess-shot-${i}`,
        date: s,
        startedAt: new Date(`${s}T09:00:00`).toISOString(),
        finishedAt: new Date(`${s}T10:00:00`).toISOString(),
        status: 'completed',
        workoutDayId: 'd1',
        workoutDayName: 'الصدر والكتف',
        exercises: [{ exerciseId: 'bench-press', targetSets: 4, targetReps: '8-12', targetRestSec: 90, completed: true }],
      })),
    ),
  )
}

const params = new URLSearchParams(location.search)
const state = params.get('state') ?? 'normal'
const lang = params.get('lang') === 'en' ? 'en' : 'ar'

if (state === 'newUser') {
  seedCommon() // onboarded + plan ready, but no history → new-user (low data)
} else if (state === 'afterWorkout') {
  seedCommon({ wellness: true })
  setNutrition(1860, 110, 190, 52, 1500)
  setSessions([...PAST_TRAINING_STAMPS, stamp]) // today finished → after-workout
} else if (state === 'restDay') {
  seedCommon()
  // اليوم راحة صراحةً بالجدول — لا «ابدأ تمرين اليوم» على يوم راحة.
  localStorage.setItem('qimmah:workoutCalendar:v1', schedule([(now.getDay() + 1) % 7, (now.getDay() + 3) % 7]))
  setNutrition(900, 60, 95, 30, 750)
  setSessions(PAST_TRAINING_STAMPS)
} else if (state === 'noPlan') {
  // خطة فارغة وأهداف غير محسوبة — يجب أن ينحدر بصدق لا بأزرار فارغة.
  localStorage.clear()
  document.documentElement.dataset.design = 'v2'
  localStorage.setItem('qimmah:history:migrated:v1', 'done')
  localStorage.setItem('qimmah:onboarding:profile:v1', '{}')
  localStorage.setItem(
    'qimmah:customization:v1',
    JSON.stringify({ profile: { name: 'أحمد' }, targetsMeta: { manuallyEdited: true }, nutritionPlan: { targetCalories: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0, targetWaterLiters: 0 }, workoutPlan: { templateId: 'empty', days: [] } }),
  )
} else {
  seedCommon()
  setNutrition(1387, 110, 150, 45, 1250) // ‎1013 kcal left · matches the reference framing
  setSessions(PAST_TRAINING_STAMPS) // كل يوم تدريب مضى من هذا الأسبوع أُنجز · واليوم بانتظاره
}

document.documentElement.lang = lang
document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl'

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <CustomizationProvider>
      <TodayV2 lang={lang} onNavigate={() => undefined} />
    </CustomizationProvider>,
  )
}
