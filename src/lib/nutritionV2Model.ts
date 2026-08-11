// Nutrition v2 model — Qimmah Design v2.1 (Slice 5). Goal-aware. Targets are
// real (customization.nutritionPlan); consumed comes from a v2-local day log
// (qimmah:nutrition:v2). No fake logged meals, no fake barcode. Copy shape
// changes with the goal (cut = protein-first, maintain = balance, bulk = fuel).
//
// v2.1 adds: consumed carbs/fat per food, on-device water tracking, and
// verb-first nudges («بقي 35g بروتين لهدف اليوم · أضف ›») driven by real gaps.

import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { CalorieGoal } from '@/types/profile'
import { getDayStamp } from '@/lib/today'
// Fix-forward B: the v2 day log mirrors its totals into the CANONICAL daily
// nutrition store (historyStore), which is the same store Today's تغذية pillar
// reads (loggedFood) and which auto-enqueues sync. One real store, both ways.
import { saveNutritionLog, saveWaterLog } from '@/lib/historyStore'
import { runMigration } from '@/lib/dataOwnership'
// (P7) الدفتر المؤرَّخ: persist يكتب أصناف اليوم في سجلّ التاريخ لتاريخها — مسار
// الكاتب الواحد نفسه، فالترحيل اليومي لا يفقد تفصيل الأمس بعد الآن.
// (دورة استيراد محسوبة: nutritionHistory يستدعي دوالنا داخل دوالّه فقط — آمنة.)
import { recordLedgerDay } from '@/lib/nutritionHistory'
import { assertPaid } from '@/lib/access/guard'

export const NUTRITION_V2_KEY = 'qimmah:nutrition:v2'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export interface LoggedFood {
  id: string
  nameAr: string
  nameEn?: string
  calories: number
  protein: number
  /** جرامات الكارب/الدهون تقديرية — اختيارية للتوافق مع سجلّات أقدم لا تحملها. */
  carbs?: number
  fat?: number
  meal: MealSlot
  /** (P7) مرجع عنصر المكتبة إن سُجّل منها — يتيح إعادة حساب الماكروز عند تعديل الكمية. */
  foodId?: string
  /** (P7) الكمية المسجّلة — جرامات و/أو حصص؛ اختيارية للتوافق مع سجلّات أقدم بلا كمية. */
  grams?: number
  servings?: number
  /** (P7) وحدة الإدخال الأصلية. */
  unit?: 'g' | 'serving'
}
interface DayLog { date: string; foods: LoggedFood[]; waterMl: number }

/** Day food totals in the canonical `loggedFood` shape Today's pillar reads. */
export function nutritionDayTotals(foods: LoggedFood[]): { calories: number; protein: number; carbs: number; fat: number } {
  return {
    calories: Math.round(foods.reduce((s, f) => s + (f.calories || 0), 0)),
    protein: Math.round(foods.reduce((s, f) => s + (f.protein || 0), 0)),
    carbs: Math.round(foods.reduce((s, f) => s + (f.carbs ?? 0), 0)),
    fat: Math.round(foods.reduce((s, f) => s + (f.fat ?? 0), 0)),
  }
}

/** Mirror the v2 day into the canonical daily nutrition store (best-effort). */
function mirrorToCanonical(day: DayLog): void {
  try {
    saveNutritionLog(day.date, { loggedFood: nutritionDayTotals(day.foods) })
    saveWaterLog(day.date, day.waterMl)
  } catch {
    /* canonical mirror is best-effort — the v2 store already persisted */
  }
}

// ── Legacy compat (wave3 debt) ──────────────────────────────────────────────
// The v1 nutrition day store lived under `qimmah:nutritionToday:v1`
// (nutritionTracking.ts). v2 is now the default surface and reads
// `qimmah:nutrition:v2` (the unified store). A user upgrading mid-day could have
// today's meals only under the legacy key. So loadNutritionDay reads the unified
// store first and, ONLY when it has no entry for today, falls back to a
// READ-ONLY read of the legacy key (never writes it back here — the next v2
// write persists to the unified store and the app converges).
//
// REMOVAL PLAN: delete LEGACY_NUTRITION_KEY + readLegacyNutritionDay + this
// fallback branch ONE release after wave3 ships v2 as default (by then every
// active install has written the unified key at least once). Tracking: the v1
// key write path in nutritionTracking.ts is retired in the same removal.
const LEGACY_NUTRITION_KEY = 'qimmah:nutritionToday:v1'

interface LegacyLoggedFood {
  id: string
  label: string
  calories: number
  protein: number
  carbs?: number
  fat?: number
  meal?: MealSlot
}

/** Read-only map of the legacy v1 day store for TODAY → v2 DayLog, or null. */
function readLegacyNutritionDay(): DayLog | null {
  try {
    const raw = localStorage.getItem(LEGACY_NUTRITION_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { date?: string; waterMl?: number; log?: LegacyLoggedFood[] }
    if (!p || p.date !== getDayStamp() || !Array.isArray(p.log)) return null
    const foods: LoggedFood[] = p.log.map((e) => ({
      id: e.id,
      nameAr: e.label,
      calories: Number(e.calories) || 0,
      protein: Number(e.protein) || 0,
      carbs: typeof e.carbs === 'number' ? e.carbs : undefined,
      fat: typeof e.fat === 'number' ? e.fat : undefined,
      meal: e.meal ?? 'snack',
    }))
    return { date: p.date, foods, waterMl: Number(p.waterMl) || 0 }
  } catch {
    return null
  }
}

// ── هجرة v1→v2 لمرة واحدة (تستبدل الـfallback القرائي القديم) ─────────────────
// عبر مشغّل الهجرات الموحّد: idempotent (سجل qimmah:migrations:v1) + snapshot +
// verify + rollback، ويحذف مفتاح v1 فقط بعد نجاح مثبت. بعدها القراءة من مصدر واحد.
let unifyAttempted = false
function ensureNutritionUnified(): void {
  if (unifyAttempted || typeof window === 'undefined') return
  unifyAttempted = true
  runMigration({
    id: 'nutrition-unify-v1-to-v2',
    keys: [NUTRITION_V2_KEY, LEGACY_NUTRITION_KEY],
    run: () => {
      let hasV2Today = false
      try {
        const raw = localStorage.getItem(NUTRITION_V2_KEY)
        const p = raw ? (JSON.parse(raw) as Partial<DayLog>) : null
        hasV2Today = !!(p && p.date === getDayStamp() && Array.isArray(p.foods))
      } catch {
        hasV2Today = false
      }
      if (hasV2Today) return // v2 هو الأحدث — لا ننسخ فوقه
      const legacy = readLegacyNutritionDay()
      if (legacy) localStorage.setItem(NUTRITION_V2_KEY, JSON.stringify(legacy))
    },
    verify: () => {
      const legacy = readLegacyNutritionDay()
      if (!legacy) return true // لا بيانات يوم-حالي في v1 — لا شيء يُثبت
      try {
        const p = JSON.parse(localStorage.getItem(NUTRITION_V2_KEY) ?? 'null') as Partial<DayLog> | null
        return !!p && p.date === getDayStamp() && Array.isArray(p.foods)
      } catch {
        return false
      }
    },
    cleanup: () => localStorage.removeItem(LEGACY_NUTRITION_KEY),
  })
}

export function loadNutritionDay(): DayLog {
  const empty: DayLog = { date: getDayStamp(), foods: [], waterMl: 0 }
  if (typeof window === 'undefined') return empty
  ensureNutritionUnified()
  try {
    const raw = localStorage.getItem(NUTRITION_V2_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<DayLog>) : null
    if (parsed && parsed.date === getDayStamp() && Array.isArray(parsed.foods)) {
      return { date: parsed.date, foods: parsed.foods as LoggedFood[], waterMl: Number(parsed.waterMl) || 0 }
    }
  } catch {
    /* ignore */
  }
  return empty // مصدر واحد — لا fallback قرائي بعد الهجرة
}

// ── عقد المتجر القانوني: getSnapshot / subscribe / mutate(persist) / export ──
const dayListeners = new Set<() => void>()
let dayCache: DayLog | null = null

/** إشعار المشتركين — يلغي حاجة الواجهات لعدّادات tick اليدوية. */
function notifyNutritionDay(): void {
  dayListeners.forEach((l) => l())
}

export function subscribeNutritionDay(cb: () => void): () => void {
  dayListeners.add(cb)
  return () => {
    dayListeners.delete(cb)
  }
}

/** لقطة مستقرة المرجع (صالحة لـ useSyncExternalStore) — تُجدَّد عند الكتابة/تغيّر اليوم. */
export function getNutritionDaySnapshot(): DayLog {
  if (!dayCache || dayCache.date !== getDayStamp()) dayCache = loadNutritionDay()
  return dayCache
}

/** إبطال اللقطة عند كتابة خارجية (تبويب آخر/استيراد) ثم إشعار المشتركين. */
export function invalidateNutritionDay(): void {
  dayCache = null
  notifyNutritionDay()
}

function persist(day: DayLog): DayLog {
  try {
    localStorage.setItem(NUTRITION_V2_KEY, JSON.stringify(day))
  } catch {
    /* storage unavailable */
  }
  mirrorToCanonical(day)
  try {
    recordLedgerDay(day) // (P7) تفصيل اليوم يُدوَّن لتاريخه — best-effort مثل المرآة
  } catch {
    /* الدفتر best-effort — متجر اليوم ثبت بالفعل */
  }
  dayCache = day
  notifyNutritionDay()
  return day
}

/** يحذف صنفًا من سجل اليوم — مصدر واحد، مع إشعار المشتركين. */
export function removeFoodFromDay(id: string): DayLog {
  // [QIM-WEB-FOUNDER-UX-003/حزمة ٢] الدفاع الثاني في طبقة الكتابة — الكاتب
  // الواحد هو الموضع الصحيح للحارس: كل مسارات الواجهة تمرّ من هنا، فلا يحتاج
  // كل زرّ أن يتذكّر الفحص، ولا ينفع تجاوزه باستدعاء المعالج يدويًا (§25).
  assertPaid('nutrition.removeFood')
  const day = loadNutritionDay()
  return persist({ ...day, date: getDayStamp(), foods: day.foods.filter((f) => f.id !== id) })
}

export function addFoodToDay(food: LoggedFood): DayLog {
  assertPaid('nutrition.addFood')
  const day = loadNutritionDay()
  return persist({ ...day, date: getDayStamp(), foods: [...day.foods, food] })
}

/** (P7) يستبدل صنفًا بمعرّفه في سجل اليوم (تعديل كمية/ماكروز) — نفس مسار الكاتب الواحد. */
export function updateFoodInDay(food: LoggedFood): DayLog {
  assertPaid('nutrition.addFood')
  const day = loadNutritionDay()
  return persist({ ...day, date: getDayStamp(), foods: day.foods.map((f) => (f.id === food.id ? food : f)) })
}

/** يضيف ماءً (مل) لليوم الحالي — يُثبّت التاريخ ويُراكم على المسجّل سابقًا. */
export function addWaterToDay(ml: number): DayLog {
  assertPaid('nutrition.water')
  const day = loadNutritionDay()
  return persist({ ...day, date: getDayStamp(), waterMl: Math.max(0, day.waterMl + Math.round(ml)) })
}

export type CalStatus = 'under' | 'onTrack' | 'over' | 'unknown'
export type ProStatus = 'low' | 'onTrack' | 'complete' | 'unknown'
export type NudgeTone = 'protein' | 'water' | 'trend' | 'calorie'
export type NudgeAction = 'add' | 'water250' | 'water500'

export interface Nudge {
  id: string
  tone: NudgeTone
  icon: string
  text: string
  actionLabel: string
  action: NudgeAction
}

export interface NutritionV2Model {
  goal: CalorieGoal | null
  goalLabel: string | null
  hero: { title: string; subtitle: string; priorityLabel: string; ctaLabel: string; category: 'protein' | 'balance' | 'fuel' }
  calories: { target: number; consumed: number; remaining: number; status: CalStatus }
  protein: { targetGrams: number; consumedGrams: number; remainingGrams: number; status: ProStatus }
  /** ماكروز مستهلكة مقابل الأهداف (جرامات). */
  macros: {
    protein: { consumed: number; target: number }
    carbs: { consumed: number; target: number }
    fat: { consumed: number; target: number }
  }
  water: { targetMl: number; consumedMl: number; remainingMl: number }
  meals: { slot: MealSlot; nameAr: string; nameEn: string; calories: number; proteinGrams: number; logged: boolean }[]
  nudges: Nudge[]
  suggestions: { label: string; reason: string; actionLabel: string; category: string }[]
  dataQuality: 'real' | 'partial' | 'fallback'
}

const GOAL_AR: Record<CalorieGoal, string> = { cut: 'تنشيف', maintain: 'محافظة', bulk: 'تضخيم' }
const GOAL_EN: Record<CalorieGoal, string> = { cut: 'Cut', maintain: 'Maintain', bulk: 'Bulk' }
const SLOT_LABELS: Record<MealSlot, { ar: string; en: string }> = {
  breakfast: { ar: 'الفطور', en: 'Breakfast' },
  lunch: { ar: 'الغداء', en: 'Lunch' },
  dinner: { ar: 'العشاء', en: 'Dinner' },
  snack: { ar: 'وجبة خفيفة', en: 'Snack' },
}

export function buildNutritionV2Model(customization: Customization, lang: Lang): NutritionV2Model {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const goal = customization.profile.goal ?? null
  const plan = customization.nutritionPlan
  const calTarget = plan?.targetCalories ?? 0
  const proTarget = plan?.targetProtein ?? 0
  const carbTarget = plan?.targetCarbs ?? 0
  const fatTarget = plan?.targetFat ?? 0
  const waterTarget = Math.round((plan?.targetWaterLiters ?? 0) * 1000)

  const day = loadNutritionDay()
  const calConsumed = day.foods.reduce((s, f) => s + f.calories, 0)
  const proConsumed = day.foods.reduce((s, f) => s + f.protein, 0)
  const carbConsumed = day.foods.reduce((s, f) => s + (f.carbs ?? 0), 0)
  const fatConsumed = day.foods.reduce((s, f) => s + (f.fat ?? 0), 0)
  const calRemaining = Math.max(0, calTarget - calConsumed)
  const proRemaining = Math.max(0, proTarget - proConsumed)
  const waterRemaining = Math.max(0, waterTarget - day.waterMl)
  const anyLogged = day.foods.length > 0

  const calStatus: CalStatus = calTarget <= 0 ? 'unknown' : calConsumed > calTarget * 1.05 ? 'over' : calConsumed >= calTarget * 0.85 ? 'onTrack' : 'under'
  const proStatus: ProStatus = proTarget <= 0 ? 'unknown' : proConsumed >= proTarget ? 'complete' : proConsumed >= proTarget * 0.6 ? 'onTrack' : 'low'

  // Goal-aware hero.
  let hero: NutritionV2Model['hero']
  if (goal === 'cut') {
    hero = {
      category: 'protein',
      priorityLabel: t('الأولوية · بروتين', 'Priority · protein'),
      title: proTarget > 0 ? t(`باقي ${proRemaining}g بروتين`, `${proRemaining}g protein left`) : t('ركّز على البروتين', 'Focus on protein'),
      subtitle: t('أضف وجبة عالية البروتين وتكمّل هدفك.', 'Add a high-protein meal to hit your goal.'),
      ctaLabel: t('أضف وجبة', 'Add a meal'),
    }
  } else if (goal === 'bulk') {
    hero = {
      category: 'fuel',
      priorityLabel: t('الأولوية · وقود', 'Priority · fuel'),
      title: calTarget > 0 ? t(`باقي ${calRemaining} سعرة`, `${calRemaining} kcal left`) : t('أضف سعرات كافية', 'Add enough calories'),
      subtitle: t('أضف وجبة كارب وبروتين قبل التمرين.', 'Add a carb + protein meal before training.'),
      ctaLabel: t('أضف وجبة', 'Add a meal'),
    }
  } else {
    hero = {
      category: 'balance',
      priorityLabel: t('الأولوية · توازن', 'Priority · balance'),
      title: anyLogged && calStatus === 'onTrack' ? t('ضمن نطاقك اليوم', 'Within your range today') : t('حافظ على توازنك', 'Keep it balanced'),
      subtitle: t('حافظ على توازن السعرات والبروتين.', 'Keep calories and protein balanced.'),
      ctaLabel: t('أضف وجبة', 'Add a meal'),
    }
  }
  if (!anyLogged && calTarget > 0) {
    hero.title = goal === 'bulk' ? hero.title : t('سجّل أول وجبة', 'Log your first meal')
    hero.subtitle = t('نضبط بروتينك وسعراتك حسب هدفك.', 'We tune protein and calories to your goal.')
  }

  const meals = (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((slot) => {
    const foods = day.foods.filter((f) => f.meal === slot)
    return {
      slot,
      nameAr: SLOT_LABELS[slot].ar,
      nameEn: SLOT_LABELS[slot].en,
      calories: foods.reduce((s, f) => s + f.calories, 0),
      proteinGrams: foods.reduce((s, f) => s + f.protein, 0),
      logged: foods.length > 0,
    }
  })

  // Verb-first nudges — driven by real gaps, ordered by goal priority.
  const nudges: Nudge[] = []
  if (proTarget > 0 && proRemaining > 0) {
    nudges.push({
      id: 'protein',
      tone: 'protein',
      icon: 'Egg',
      text: t(`باقي ${proRemaining}g بروتين لهدف اليوم`, `${proRemaining}g protein left for today’s goal`),
      actionLabel: t('أضف', 'Add'),
      action: 'add',
    })
  }
  if (waterTarget > 0 && waterRemaining > 0) {
    // Pick the glass that fits the remaining gap so the label and the logged
    // amount stay identical (a full 500 would overshoot when little is left).
    const glass = waterRemaining >= 500 ? 500 : 250
    nudges.push({
      id: 'water',
      tone: 'water',
      icon: 'Droplets',
      text: t(`اشرب ${glass}ml ماء وتكمّل هدفك`, `Drink ${glass}ml water to hit your goal`),
      actionLabel: t('سجّل', 'Log'),
      action: glass === 500 ? 'water500' : 'water250',
    })
  }
  if (calTarget > 0 && goal === 'bulk' && calRemaining > 0) {
    nudges.push({
      id: 'calorie',
      tone: 'calorie',
      icon: 'Flame',
      text: t(`أضف ${calRemaining} سعرة تكمّل وقود اليوم`, `Add ${calRemaining} kcal to fuel today`),
      actionLabel: t('أضف', 'Add'),
      action: 'add',
    })
  }

  const suggestions: NutritionV2Model['suggestions'] = []
  if (proStatus === 'low' || proStatus === 'onTrack') suggestions.push({ label: t('خيار عالي البروتين', 'High-protein option'), reason: t('عشان تكمّل هدف البروتين', 'to hit your protein goal'), actionLabel: t('أضف', 'Add'), category: 'protein' })
  suggestions.push({ label: t('أكلات سعودية', 'Saudi foods'), reason: t('خيارات مألوفة', 'familiar options'), actionLabel: t('تصفّح', 'Browse'), category: 'saudi' })
  if (anyLogged) suggestions.push({ label: t('الأكثر تسجيلًا', 'Recent foods'), reason: t('أضف بسرعة', 'add quickly'), actionLabel: t('أضف', 'Add'), category: 'recent' })

  return {
    goal,
    goalLabel: goal ? (ar ? GOAL_AR[goal] : GOAL_EN[goal]) : null,
    hero,
    calories: { target: calTarget, consumed: calConsumed, remaining: calRemaining, status: calStatus },
    protein: { targetGrams: proTarget, consumedGrams: proConsumed, remainingGrams: proRemaining, status: proStatus },
    macros: {
      protein: { consumed: proConsumed, target: proTarget },
      carbs: { consumed: carbConsumed, target: carbTarget },
      fat: { consumed: fatConsumed, target: fatTarget },
    },
    water: { targetMl: waterTarget, consumedMl: day.waterMl, remainingMl: waterRemaining },
    meals,
    nudges,
    suggestions: suggestions.slice(0, 4),
    dataQuality: anyLogged ? 'partial' : 'fallback',
  }
}
