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
}
interface DayLog { date: string; foods: LoggedFood[]; waterMl: number }

export function loadNutritionDay(): DayLog {
  const empty: DayLog = { date: getDayStamp(), foods: [], waterMl: 0 }
  if (typeof window === 'undefined') return empty
  try {
    const raw = localStorage.getItem(NUTRITION_V2_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<DayLog>) : null
    if (parsed && parsed.date === getDayStamp() && Array.isArray(parsed.foods)) {
      return { date: parsed.date, foods: parsed.foods as LoggedFood[], waterMl: Number(parsed.waterMl) || 0 }
    }
  } catch {
    /* ignore */
  }
  return empty
}

function persist(day: DayLog): DayLog {
  try {
    localStorage.setItem(NUTRITION_V2_KEY, JSON.stringify(day))
  } catch {
    /* storage unavailable */
  }
  return day
}

export function addFoodToDay(food: LoggedFood): DayLog {
  const day = loadNutritionDay()
  return persist({ ...day, date: getDayStamp(), foods: [...day.foods, food] })
}

/** يضيف ماءً (مل) لليوم الحالي — يُثبّت التاريخ ويُراكم على المسجّل سابقًا. */
export function addWaterToDay(ml: number): DayLog {
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
      title: proTarget > 0 ? t(`بقي ${proRemaining}g بروتين`, `${proRemaining}g protein left`) : t('ركّز على البروتين', 'Focus on protein'),
      subtitle: t('أضف وجبة عالية البروتين لتكمل هدفك.', 'Add a high-protein meal to hit your goal.'),
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
      icon: 'Star',
      text: t(`بقي ${proRemaining}g بروتين لهدف اليوم`, `${proRemaining}g protein left for today’s goal`),
      actionLabel: t('أضف', 'Add'),
      action: 'add',
    })
  }
  if (waterTarget > 0 && waterRemaining > 0) {
    const glass = 500
    nudges.push({
      id: 'water',
      tone: 'water',
      icon: 'Droplets',
      text: t(`اشرب ${Math.min(glass, waterRemaining)}ml ماء لتكمل هدفك`, `Drink ${Math.min(glass, waterRemaining)}ml water to hit your goal`),
      actionLabel: t('سجّل', 'Log'),
      action: 'water500',
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
  if (proStatus === 'low' || proStatus === 'onTrack') suggestions.push({ label: t('خيار عالي البروتين', 'High-protein option'), reason: t('لإكمال هدف البروتين', 'to hit your protein goal'), actionLabel: t('أضف', 'Add'), category: 'protein' })
  suggestions.push({ label: t('أكلات سعودية', 'Saudi foods'), reason: t('خيارات مألوفة', 'familiar options'), actionLabel: t('تصفّح', 'Browse'), category: 'saudi' })
  if (anyLogged) suggestions.push({ label: t('الأكثر تسجيلًا', 'Recent foods'), reason: t('أضِف بسرعة', 'add quickly'), actionLabel: t('أضف', 'Add'), category: 'recent' })

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
