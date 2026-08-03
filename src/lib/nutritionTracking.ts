// تتبّع التغذية اليومي — **محوّل (adapter) فوق المصدر القانوني الواحد**.
//
// موجة توحيد المخازن: كاتب v1 القديم (مفتاح qimmah:nutritionToday:v1) حُذف نهائيًا —
// كل القراءة/الكتابة هنا تمرّ عبر nutritionV2Model (qimmah:nutrition:v2 للأصناف
// والماء) وhistoryStore (doneMeals في سجل التغذية اليومي الدائم). الواجهة العامة
// نفسها بقيت (types + loadNutritionToday + useNutritionToday) حفاظًا على مستهلكيها
// (achievements/dataPortability) بلا لمس واجهات. بيانات v1 القديمة تُهاجَر لمرة
// واحدة داخل nutritionV2Model (idempotent + snapshot + rollback) ثم يُحذف مفتاحها.

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { getDayStamp } from './today'
import { useIsDemo } from './demoMode'
import { getNutritionLog, saveNutritionLog } from './historyStore'
import { completeFirstWin } from './firstWin'
import {
  addFoodToDay,
  addWaterToDay,
  getNutritionDaySnapshot,
  removeFoodFromDay,
  subscribeNutritionDay,
  NUTRITION_V2_KEY,
  type LoggedFood as CanonicalFood,
} from './nutritionV2Model'

/** @deprecated مفتاح v1 — لم يعد يُكتب؛ يُحذف عبر هجرة nutrition-unify-v1-to-v2. */
export const NUTRITION_TODAY_KEY = 'qimmah:nutritionToday:v1'

/** خانة الوجبة لتصنيف العنصر المسجّل. */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** خانات الوجبات لعرض التغذية اليومي. */
export const MEAL_SLOTS: { id: MealSlot; ar: string; en: string; icon: string }[] = [
  { id: 'breakfast', ar: 'الفطور', en: 'Breakfast', icon: 'Sparkles' },
  { id: 'lunch', ar: 'الغداء', en: 'Lunch', icon: 'Flame' },
  { id: 'dinner', ar: 'العشاء', en: 'Dinner', icon: 'Moon' },
  { id: 'snack', ar: 'سناك', en: 'Snack', icon: 'Salad' },
]

/** عنصر مسجّل في سجل اليوم (شكل v1 التاريخي — يُشتق من المصدر القانوني). */
export interface LoggedFood {
  id: string
  label: string
  /** نسبة الكمية المُسجّلة إلى الحصة المرجعية — للتوافق التاريخي. */
  servings: number
  /** الكمية المُسجّلة بالغرام (إن توفرت). */
  grams?: number
  calories: number
  protein: number
  carbs: number
  fat: number
  meal?: MealSlot
  note?: string
}

export interface NutritionTodayState {
  date: string
  doneMeals: Record<string, boolean>
  waterMl: number
  log: LoggedFood[]
}

function fresh(): NutritionTodayState {
  return { date: getDayStamp(), doneMeals: {}, waterMl: 0, log: [] }
}

function fromCanonical(f: CanonicalFood): LoggedFood {
  return {
    id: f.id,
    label: f.nameAr,
    servings: 1,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs ?? 0,
    fat: f.fat ?? 0,
    meal: f.meal,
  }
}

/** يبني حالة اليوم من المصدرين القانونيين (v2: أصناف+ماء · historyStore: doneMeals). */
function assemble(): NutritionTodayState {
  const day = getNutritionDaySnapshot()
  const doneMeals = getNutritionLog(day.date)?.doneMeals ?? {}
  return { date: day.date, doneMeals, waterMl: day.waterMl, log: day.foods.map(fromCanonical) }
}

/** قراءة حالة اليوم (للتصدير وغير-الهوك) — من المصدر القانوني، لا من مفتاح v1. */
export function loadNutritionToday(): NutritionTodayState {
  if (typeof window === 'undefined') return fresh()
  return assemble()
}

/** مجاميع السعرات والماكروز من سجل اليوم. */
export function logTotals(log: LoggedFood[]) {
  return log.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

// ── مخزن المحوّل: لقطة مستقرة + مشتركون (لا tick يدوي) ───────────────────────
const listeners = new Set<() => void>()
let realCache: NutritionTodayState | null = null
let demoCache: NutritionTodayState | null = null

function notify(): void {
  listeners.forEach((l) => l())
}

function invalidateReal(): void {
  realCache = null
  notify()
}

// أي كتابة في المصدر القانوني (من أي شاشة) تُبطل اللقطة وتُشعر المشتركين هنا.
if (typeof window !== 'undefined') {
  subscribeNutritionDay(invalidateReal)
}

function snapshot(demo: boolean): NutritionTodayState {
  if (demo) {
    if (!demoCache) demoCache = fresh()
    return demoCache
  }
  if (!realCache || realCache.date !== getDayStamp()) realCache = assemble()
  return realCache
}

// معرّف بسيط لعناصر السجل بلا اعتماد على Date.now (يكفي للتمييز محليًا).
let logSeq = 0
function nextLogId(): string {
  logSeq += 1
  return `log-${logSeq}-${Math.round(performance.now())}`
}

/** هوك تتبّع التغذية اليومي — مشترك في المصدر القانوني مباشرة. */
export function useNutritionToday() {
  const demo = useIsDemo()
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }, [])
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot(demo),
    () => snapshot(demo),
  )

  useEffect(() => {
    const check = () => invalidateReal() // تغيّر اليوم/العودة للواجهة — أعِد التجميع من المصدر
    const onStorage = (e: StorageEvent) => {
      // مزامنة بين التبويبات (الوضع الحقيقي فقط) — المفتاح القانوني لا مفتاح v1.
      if (!demo && (e.key === NUTRITION_V2_KEY || e.key === null)) invalidateReal()
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('storage', onStorage)
    }
  }, [demo])

  const toggleMeal = useCallback(
    (mealId: string) => {
      if (demo) {
        const prev = snapshot(true)
        demoCache = { ...prev, doneMeals: { ...prev.doneMeals, [mealId]: !prev.doneMeals[mealId] } }
        notify()
        return
      }
      const date = getDayStamp()
      const doneMeals = { ...(getNutritionLog(date)?.doneMeals ?? {}) }
      doneMeals[mealId] = !doneMeals[mealId]
      saveNutritionLog(date, { doneMeals })
      invalidateReal()
    },
    [demo],
  )

  const addWater = useCallback(
    (ml: number) => {
      if (demo) {
        const prev = snapshot(true)
        demoCache = { ...prev, waterMl: Math.max(0, prev.waterMl + ml) }
        notify()
        return
      }
      addWaterToDay(ml) // المصدر القانوني الواحد — يُشعرنا عبر الاشتراك
      // [CTO-70] البند ١ — أول انتصار: تسجيل ماء حقيقي يُنهي الانتصار الأول.
      // هنا لا في البطاقة: الضغطة نيّة، والإنجاز ما وقع — ويُحتسب من أي سطح.
      if (ml > 0) completeFirstWin('water')
    },
    [demo],
  )

  const resetWater = useCallback(() => {
    if (demo) {
      const prev = snapshot(true)
      demoCache = { ...prev, waterMl: 0 }
      notify()
      return
    }
    addWaterToDay(-getNutritionDaySnapshot().waterMl)
  }, [demo])

  /** إضافة عنصر للسجل (سعرات/ماكروز). يُولَّد المعرّف تلقائيًا إن لم يُمرَّر. */
  const addLog = useCallback(
    (entry: Omit<LoggedFood, 'id'> & { id?: string }) => {
      const item: LoggedFood = { ...entry, id: entry.id ?? nextLogId() }
      if (demo) {
        const prev = snapshot(true)
        demoCache = { ...prev, log: [...prev.log, item] }
        notify()
      } else {
        addFoodToDay({
          id: item.id,
          nameAr: item.label,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          meal: item.meal ?? 'snack',
        })
        // [CTO-70] البند ١ — أول انتصار بتسجيل وجبة (يصير «عشاء» مساءً).
        completeFirstWin('meal')
      }
    },
    [demo],
  )

  const removeLog = useCallback(
    (id: string) => {
      if (demo) {
        const prev = snapshot(true)
        demoCache = { ...prev, log: prev.log.filter((e) => e.id !== id) }
        notify()
        return
      }
      removeFoodFromDay(id)
    },
    [demo],
  )

  const isMealDone = useCallback((mealId: string) => !!state.doneMeals[mealId], [state])
  const totals = logTotals(state.log)

  return { state, totals, toggleMeal, addWater, resetWater, addLog, removeLog, isMealDone }
}
