import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { getDayStamp } from './today'
import { useIsDemo } from './demoMode'
import { saveNutritionLog, saveWaterLog } from './historyStore'
import { track, firstOnce } from './analytics'

// تتبّع التغذية اليومي — وجبات الخطة المنجزة + وجبات مسجّلة (سعرات/بروتين) + كمية الماء.
// يُصفّر تلقائيًا مع تغيّر اليوم. يستخدم مخزنًا مشتركًا (store) حتى تبقى كل المكوّنات متزامنة
// (مثل قسم «اليوم» ومسجّل الوجبات على نفس الصفحة) بلا تعارض في الكتابة.

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

/** عنصر مسجّل في سجل اليوم — من قاعدة الأطعمة أو إضافة سريعة مخصّصة. */
export interface LoggedFood {
  id: string
  label: string
  /** نسبة الكمية المُسجّلة إلى الحصة المرجعية (grams / servingGrams) — للتوافق التاريخي. */
  servings: number
  /** الكمية المُسجّلة بالغرام (الإدخال الأساسي لعناصر قاعدة الأطعمة). */
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

function readStorage(): NutritionTodayState {
  if (typeof window === 'undefined') return fresh()
  const today = getDayStamp()
  try {
    const raw = window.localStorage.getItem(NUTRITION_TODAY_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<NutritionTodayState>
      if (p && p.date === today && p.doneMeals) {
        // ترحيل: أي عنصر مسجّل قديم بلا خانة وجبة → سناك.
        const log = Array.isArray(p.log)
          ? p.log.map((e) => (e.meal ? e : { ...e, meal: 'snack' as MealSlot }))
          : []
        return {
          date: today,
          doneMeals: p.doneMeals,
          waterMl: p.waterMl || 0,
          log,
        }
      }
    }
  } catch {
    /* تجاهل */
  }
  const f = fresh()
  window.localStorage.setItem(NUTRITION_TODAY_KEY, JSON.stringify(f))
  return f
}

export function loadNutritionToday(): NutritionTodayState {
  return readStorage()
}

export function saveNutritionToday(state: NutritionTodayState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NUTRITION_TODAY_KEY, JSON.stringify(state))
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

// ===== مخزن مشترك (module-level) =====
// مرجع واحد لكل وضع (حقيقي/تجريبي) يضمن تزامن كل النسخ بلا تعارض كتابة.

const listeners = new Set<() => void>()
let realCache: NutritionTodayState | null = null
let demoCache: NutritionTodayState | null = null

function snapshot(demo: boolean): NutritionTodayState {
  if (demo) {
    if (!demoCache) demoCache = fresh()
    return demoCache
  }
  if (!realCache) realCache = readStorage()
  return realCache
}

function notify() {
  listeners.forEach((l) => l())
}

function setState(demo: boolean, mutate: (prev: NutritionTodayState) => NutritionTodayState): void {
  const prev = snapshot(demo)
  const next = mutate(prev)
  if (demo) {
    demoCache = next
  } else {
    realCache = next
    saveNutritionToday(next)
    // عكس الحالة في المتجر التاريخي الدائم (لا يُصفّر مع تغيّر اليوم). نحفظ أيضًا مجاميع
    // الأطعمة المُسجّلة يدويًا حتى تبقى بعد تصفير اليوم وتظهر في الملخّص الأسبوعي والتقدّم.
    saveNutritionLog(next.date, { doneMeals: next.doneMeals, waterMl: next.waterMl, loggedFood: logTotals(next.log) })
    saveWaterLog(next.date, next.waterMl)
  }
  notify()
}

function rolloverIfNeeded(demo: boolean): void {
  const today = getDayStamp()
  const cur = snapshot(demo)
  if (cur.date !== today) setState(demo, () => fresh())
}

// معرّف بسيط لعناصر السجل بلا اعتماد على Date.now (يكفي للتمييز محليًا).
let logSeq = 0
function nextLogId(): string {
  logSeq += 1
  return `log-${logSeq}-${Math.round(performance.now())}`
}

/** هوك تتبّع التغذية اليومي مع تصفير عند تغيّر اليوم — مزامَن عبر مخزن مشترك. */
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
    const check = () => rolloverIfNeeded(demo)
    const onStorage = (e: StorageEvent) => {
      // مزامنة بين التبويبات (الوضع الحقيقي فقط)
      if (!demo && e.key === NUTRITION_TODAY_KEY) {
        realCache = readStorage()
        notify()
      }
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
      setState(demo, (prev) => ({ ...prev, doneMeals: { ...prev.doneMeals, [mealId]: !prev.doneMeals[mealId] } }))
    },
    [demo],
  )

  const addWater = useCallback(
    (ml: number) => {
      setState(demo, (prev) => ({ ...prev, waterMl: Math.max(0, prev.waterMl + ml) }))
    },
    [demo],
  )

  const resetWater = useCallback(() => {
    setState(demo, (prev) => ({ ...prev, waterMl: 0 }))
  }, [demo])

  /** إضافة عنصر للسجل (سعرات/ماكروز). يُولَّد المعرّف تلقائيًا إن لم يُمرَّر. */
  const addLog = useCallback(
    (entry: Omit<LoggedFood, 'id'> & { id?: string }) => {
      const item: LoggedFood = { ...entry, id: entry.id ?? nextLogId() }
      setState(demo, (prev) => ({ ...prev, log: [...prev.log, item] }))
      // إشارة وجبة — خانة الوجبة فقط (تعداد)، بلا اسم الطبق أو الكمية. وضع النموذج لا يُرسل شيئًا.
      if (!demo) {
        track('meal_logged', { mealSlot: item.meal })
        if (firstOnce('firstMeal')) track('first_meal_logged', {})
      }
    },
    [demo],
  )

  const removeLog = useCallback(
    (id: string) => {
      setState(demo, (prev) => ({ ...prev, log: prev.log.filter((e) => e.id !== id) }))
    },
    [demo],
  )

  const isMealDone = useCallback((mealId: string) => !!state.doneMeals[mealId], [state])
  const totals = logTotals(state.log)

  return { state, totals, toggleMeal, addWater, resetWater, addLog, removeLog, isMealDone }
}
