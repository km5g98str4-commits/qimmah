// ⚙️ أداة تطوير فقط — بذرة بيانات تجريبية محلّية (App Review + اختبار المالك على الجهاز).
//
// تبني خريطة {مفتاح localStorage → قيمة JSON} تطابق تمامًا المتاجر التي يقرؤها التطبيق
// (historyStore / measurementLog / customization / achievements …). لا تلمس Supabase،
// ولا تعمل إلا عند استدعائها صراحةً عبر run-demo-seed.mjs. البيانات كلها عربية وواقعية.
//
// حتمية: كل التواريخ تُشتقّ من `nowMs` المُمرَّر (لا Date.now داخليًا)، فإعادة التوليد
// بنفس (البروفايل، nowMs) تُنتج نفس الخريطة بايتًا ببايت (idempotent).

export type SeedProfile = 'reviewer' | 'fresh' | 'veteran'
export interface SeedOptions { profile: SeedProfile; nowMs: number; ownerId?: string | null }

const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')
function stamp(nowMs: number, daysAgo: number): string {
  const d = new Date(nowMs - daysAgo * DAY)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function iso(nowMs: number, daysAgo: number, hour = 18): string {
  const d = new Date(nowMs - daysAgo * DAY)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

// ————— أشكال المتاجر (مطابقة لأنواع src/lib؛ لا نستوردها لإبقاء الأداة خفيفة) —————
interface SetLog { setNumber: number; targetReps: string; actualReps: string; weightKg: string; completed: boolean }
interface SessionExercise { exerciseId: string; exerciseNameAr?: string; targetSets: number; targetReps: string; targetRestSec: number; completed: boolean; sets: SetLog[] }
interface WorkoutSession { id: string; date: string; startedAt: string; finishedAt: string; workoutDayId: string; workoutDayName: string; exercises: SessionExercise[] }

/** تمارين البذرة — معرّفات كتالوج حقيقية (أجهزة/بار)، مع تدرّج أسبوعي في الوزن. */
const LIFTS: { id: string; nameAr: string; base: number; step: number; reps: string }[] = [
  { id: 'leg-press-machine', nameAr: 'جهاز دفع الأرجل', base: 120, step: 5, reps: '10' },
  { id: 'chest-press-machine', nameAr: 'جهاز ضغط الصدر', base: 45, step: 2.5, reps: '10' },
  { id: 'lat-pulldown-machine', nameAr: 'جهاز السحب العلوي', base: 50, step: 2.5, reps: '10' },
  { id: 'shoulder-press-machine', nameAr: 'جهاز ضغط الكتف', base: 30, step: 2.5, reps: '10' },
  { id: 'seated-leg-curl', nameAr: 'جهاز ثني الأرجل', base: 40, step: 2.5, reps: '12' },
]

/** أطعمة سعودية حقيقية (أسماء/ماكروز واقعية) لسجلّ التغذية v2. */
const SAUDI_MEALS = [
  { id: 'seed-kabsa-chicken', nameAr: 'كبسة دجاج', calories: 520, protein: 34, carbs: 62, fat: 15, meal: 'lunch' as const },
  { id: 'seed-grilled-chicken', nameAr: 'صدر دجاج مشوي', calories: 248, protein: 46, carbs: 0, fat: 6, meal: 'dinner' as const },
  { id: 'seed-jareesh', nameAr: 'جريش', calories: 163, protein: 8, carbs: 17, fat: 7, meal: 'lunch' as const },
  { id: 'seed-dates', nameAr: 'تمر (٣ حبّات)', calories: 66, protein: 0, carbs: 18, fat: 0, meal: 'snack' as const },
  { id: 'seed-laban', nameAr: 'لبن', calories: 90, protein: 8, carbs: 12, fat: 2, meal: 'breakfast' as const },
]

interface ProfileConfig { weeks: number; daysPerWeek: number; startWeight: number; endWeight: number; targetWeight: number; achievements: string[]; prCount: number; nutritionDays: number }
const CONFIG: Record<SeedProfile, ProfileConfig> = {
  fresh: { weeks: 0, daysPerWeek: 0, startWeight: 82, endWeight: 82, targetWeight: 76, achievements: [], prCount: 0, nutritionDays: 0 },
  reviewer: { weeks: 3, daysPerWeek: 4, startWeight: 80.5, endWeight: 78.4, targetWeight: 75, achievements: ['first-workout', 'first-meal', 'first-week', 'first-pr', 'streak-3', 'protein-3'], prCount: 1, nutritionDays: 6 },
  veteran: { weeks: 8, daysPerWeek: 4, startWeight: 86, endWeight: 79.5, targetWeight: 78, achievements: ['first-workout', 'first-meal', 'first-week', 'first-pr', 'streak-3', 'streak-7', 'streak-14', 'protein-3', 'protein-10'], prCount: 4, nutritionDays: 12 },
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** يبني الجلسات المؤرّخة بتدرّج أسبوعي (الأحدث أولًا، كما يخزّنها historyStore). */
function buildSessions(cfg: ProfileConfig, nowMs: number): WorkoutSession[] {
  const sessions: WorkoutSession[] = []
  const totalDays = cfg.weeks * cfg.daysPerWeek
  for (let i = 0; i < totalDays; i++) {
    const week = Math.floor(i / cfg.daysPerWeek)
    const daysAgo = (totalDays - 1 - i) * Math.floor(7 / cfg.daysPerWeek) // spread across each week
    const date = stamp(nowMs, daysAgo)
    const exercises: SessionExercise[] = LIFTS.slice(0, 4 + (i % 2)).map((l) => {
      const w = round1(l.base + week * l.step)
      const sets: SetLog[] = Array.from({ length: 3 }, (_, s) => ({ setNumber: s + 1, targetReps: l.reps, actualReps: l.reps, weightKg: String(w), completed: true }))
      return { exerciseId: l.id, exerciseNameAr: l.nameAr, targetSets: 3, targetReps: l.reps, targetRestSec: 90, completed: true, sets }
    })
    sessions.push({ id: `demo-${date}-${i}`, date, startedAt: iso(nowMs, daysAgo, 18), finishedAt: iso(nowMs, daysAgo, 19), workoutDayId: 'demo-day', workoutDayName: 'تمرين اليوم', exercises })
  }
  return sessions.reverse() // newest first
}

/** سجل الأداء (آخر/أفضل وزن) مشتقّ من الجلسات — يغذّي القوة والأرقام القياسية. */
function buildExerciseHistory(sessions: WorkoutSession[], nowMs: number): Record<string, unknown> {
  const hist: Record<string, { lastWeight: string; bestWeight: string; lastReps: string; lastCompletedAt: string; totalSessions: number }> = {}
  for (const s of [...sessions].reverse()) {
    for (const ex of s.exercises) {
      const top = Math.max(...ex.sets.map((x) => Number(x.weightKg)))
      const prev = hist[ex.exerciseId]
      hist[ex.exerciseId] = {
        lastWeight: String(top),
        bestWeight: String(Math.max(top, prev ? Number(prev.bestWeight) : 0)),
        lastReps: ex.sets[0].actualReps,
        lastCompletedAt: s.finishedAt,
        totalSessions: (prev?.totalSessions ?? 0) + 1,
      }
    }
  }
  void nowMs
  return hist
}

/** خريطة البذرة الكاملة: مفتاح → قيمة JSON نصّية، جاهزة للحقن في localStorage. */
export function buildSeed(opts: SeedOptions): Record<string, string> {
  const cfg = CONFIG[opts.profile]
  const nowMs = opts.nowMs
  const out: Record<string, unknown> = {}

  // 1) الملف الشخصي + الهدف (يُدمج فوق الافتراضي؛ الأهداف تُعاد حسابها تلقائيًا عند القراءة).
  out['qimmah:customization:v1'] = {
    profile: { name: 'أحمد', goal: 'cut', goalType: 'cutting', weightKg: cfg.endWeight, targetWeightKg: cfg.targetWeight, heightCm: 178, age: 28, gender: 'male', activityLevel: 'moderate' },
  }

  // 2) الجلسات + سجل الأداء + لقطات الأيام.
  const sessions = buildSessions(cfg, nowMs)
  out['qimmah:history:workoutSessions:v1'] = sessions
  out['qimmah:history:exerciseHistory:v1'] = buildExerciseHistory(sessions, nowMs)
  const daily: Record<string, unknown> = {}
  for (const s of sessions) daily[s.date] = { date: s.date, workoutCompleted: true, updatedAt: s.finishedAt }

  // 3) الوزن (اتجاه نزولي للتنشيف) + قياس خصر — بمفتاحَي القديم والتاريخي معًا.
  const measurements: unknown[] = []
  const points = Math.max(cfg.weeks, 0)
  for (let w = 0; w <= points; w++) {
    const daysAgo = (points - w) * 7
    const kg = round1(cfg.startWeight + ((cfg.endWeight - cfg.startWeight) * w) / Math.max(points, 1))
    measurements.push({ id: `demo-wt-${w}`, date: stamp(nowMs, daysAgo), values: { weightKg: kg } })
  }
  if (cfg.weeks > 0) measurements.push({ id: 'demo-waist', date: stamp(nowMs, 7), values: { waistCm: 88 } })
  const measurementsNewestFirst = measurements.reverse()
  out['qimmah:measurementLogs:v1'] = measurementsNewestFirst // legacy key (measurementLog.loadLogs)
  out['qimmah:history:measurementLogs:v1'] = measurementsNewestFirst // permanent store

  // 4) التغذية: مجاميع loggedFood لأيام سابقة + سجلّ اليوم التفصيلي (أطعمة سعودية).
  const nutrition: Record<string, unknown> = {}
  const water: Record<string, unknown> = {}
  for (let d = 0; d < cfg.nutritionDays; d++) {
    const date = stamp(nowMs, d)
    nutrition[date] = { date, doneMeals: {}, loggedFood: { calories: 1850 - (d % 3) * 60, protein: 150 - (d % 4) * 5, carbs: 180, fat: 55 }, updatedAt: iso(nowMs, d, 20) }
    water[date] = { date, waterMl: 2000, updatedAt: iso(nowMs, d, 20) }
  }
  out['qimmah:history:nutritionLogs:v1'] = nutrition
  out['qimmah:history:waterLogs:v1'] = water
  out['qimmah:history:dailyLogs:v1'] = daily

  // v2 nutrition day (today) — تُعرض الأطعمة السعودية في تبويب التغذية.
  if (cfg.nutritionDays > 0) {
    out['qimmah:nutrition:v2'] = { date: stamp(nowMs, 0), foods: SAUDI_MEALS, waterMl: 1500 }
  }

  // 5) الإنجازات (وسام أول تمرين/أسبوع/رقم قياسي/سلسلة) — واقعية حسب البروفايل.
  const unlocked: Record<string, string> = {}
  cfg.achievements.forEach((id, idx) => { unlocked[id] = iso(nowMs, Math.max(0, cfg.weeks * 7 - idx * 3)) })
  out['qimmah:achievements:v1'] = { unlocked, proteinDays: Object.keys(nutrition).slice(0, 3), prCount: cfg.prCount }

  // 6) علم إكمال الإعداد (وضع الضيف) — لمنع إعادة الأسئلة على الجهاز. الحساب المسجّل
  //    يُعلَّم عبر لقطة المتصفّح التي تقرأ الجلسة الحيّة (run-demo-seed.mjs).
  out['qimmah:onboarding:v1'] = { completed: true, completedAt: iso(nowMs, 0), lastStep: 99, owner: opts.ownerId ?? undefined }
  if (opts.ownerId) out['qimmah:onboarding:accounts:v1'] = { [opts.ownerId]: { completedAt: iso(nowMs, 0) } }

  // Stringify deterministically.
  const map: Record<string, string> = {}
  for (const [k, v] of Object.entries(out)) map[k] = JSON.stringify(v)
  return map
}

/** لقطة متصفّح جاهزة للّصق: تحقن كل المفاتيح وتعلّم الحساب الحيّ كمُكمِل للإعداد. */
export function browserSnippet(seed: Record<string, string>): string {
  const lines = Object.entries(seed).map(([k, v]) => `  localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`)
  return `(function(){\n  // Qimmah demo seed — أداة تطوير. الصقها في Safari Web Inspector ثم أعد التحميل.\n${lines.join('\n')}\n  // علّم الحساب المسجّل حاليًا كمُكمِل للإعداد (يقرأ الجلسة الحيّة، لا يلمس Supabase).\n  try {\n    var s = JSON.parse(localStorage.getItem('qimmah:supabase-auth:v1')||'null');\n    var uid = s && s.user && s.user.id;\n    if (uid) { var r = JSON.parse(localStorage.getItem('qimmah:onboarding:accounts:v1')||'{}'); r[uid] = { completedAt: new Date().toISOString() }; localStorage.setItem('qimmah:onboarding:accounts:v1', JSON.stringify(r)); }\n  } catch(e){}\n  location.reload();\n})();`
}
