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
import { assertPaid } from '@/lib/access/guard'
import {
  addFoodToDay,
  addWaterToDay,
  getNutritionDaySnapshot,
  removeFoodFromDay,
  updateFoodInDay,
  subscribeNutritionDay,
  NUTRITION_V2_KEY,
  NutritionStorageError,
  WaterConfirmationRequired,
  type LoggedFood as CanonicalFood,
  type WaterTier,
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
  servings?: number
  /** الكمية المُسجّلة بالغرام (إن توفرت). */
  grams?: number
  /** مرجع المكتبة ووحدة الإدخال الأصلية — لإعادة حساب التعديل بصدق. */
  foodId?: string
  unit?: 'g' | 'serving'
  calories: number
  protein: number
  /** [PARTIAL-NUTRITION-001] غياب الكارب/الدهون حقيقة تُحفظ كما هي — لا يُملأ صفرًا. */
  carbs?: number
  fat?: number
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
    calories: f.calories,
    protein: f.protein,
    ...(typeof f.carbs === 'number' ? { carbs: f.carbs } : {}),
    ...(typeof f.fat === 'number' ? { fat: f.fat } : {}),
    meal: f.meal,
    grams: f.grams,
    servings: f.servings,
    foodId: f.foodId,
    unit: f.unit,
  }
}

function storageWrite(run: () => void): boolean {
  try {
    run()
    return true
  } catch (error) {
    if (error instanceof NutritionStorageError) return false
    throw error
  }
}

function toCanonical(item: LoggedFood): CanonicalFood {
  return {
    id: item.id,
    nameAr: item.label,
    calories: item.calories,
    protein: item.protein,
    ...(typeof item.carbs === 'number' ? { carbs: item.carbs } : {}),
    ...(typeof item.fat === 'number' ? { fat: item.fat } : {}),
    meal: item.meal ?? 'snack',
    ...(item.foodId ? { foodId: item.foodId } : {}),
    ...(item.grams !== undefined ? { grams: item.grams } : {}),
    ...(item.servings !== undefined ? { servings: item.servings } : {}),
    ...(item.unit ? { unit: item.unit } : {}),
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

/** عدد القيود التي لا تحمل مغذّيًا ما — «المجموع ناقص» يُعلَن لا يُخفى. */
export interface UnknownNutrientCounts { protein: number; carbs: number; fat: number }
export interface LogTotals { calories: number; protein: number; carbs: number; fat: number; unknown: UnknownNutrientCounts }

/**
 * مجاميع السعرات والماكروز من سجل اليوم.
 * [PARTIAL-NUTRITION-001] القيد بلا كارب/دهون **لا يُجمع صفرًا بصمت**: المجموع يضمّ المعروف فقط،
 * و`unknown` يعدّ القيود الناقصة لكل مغذٍّ كي تعلنها الواجهة (بلا بيانات كارب لـ n صنف).
 */
export function logTotals(log: LoggedFood[]): LogTotals {
  return log.reduce<LogTotals>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + (typeof e.carbs === 'number' ? e.carbs : 0),
      fat: acc.fat + (typeof e.fat === 'number' ? e.fat : 0),
      unknown: {
        protein: acc.unknown.protein,
        carbs: acc.unknown.carbs + (typeof e.carbs === 'number' ? 0 : 1),
        fat: acc.unknown.fat + (typeof e.fat === 'number' ? 0 : 1),
      },
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, unknown: { protein: 0, carbs: 0, fat: 0 } },
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

// ── عقد تسجيل الماء في الواجهة ───────────────────────────────────────────────
// `addWater` كانت تعيد `boolean`؛ صارت نتيجة **مسمّاة** لأن الفشل صار بابين لا
// بابًا واحدًا: تعذّر حفظ، أو كتابة موقوفة تنتظر تأكيد المستخدم. الـ`boolean`
// كان سيبتلع الفرق ويعرض «ما قدرنا نحفظ» لكتابة لم تُرفض أصلًا (§5: الصدق قبل
// الطمأنينة — والرسالة الخاطئة كذبة بحسن نيّة).
export interface AddWaterCallOptions {
  /** هدف اليوم بالمل — يرفع أساس سياسة الطبقات لمن هدفه أعلى من سقف المقدِّر. */
  targetMl?: number
  /** الطبقة التي أقرّها المستخدم في نافذة التأكيد. */
  acknowledgedTier?: WaterTier
}

export type WaterAddOutcome =
  | { ok: true }
  | { ok: false; reason: 'storage' }
  | { ok: false; reason: 'confirm'; tier: Exclude<WaterTier, 'normal'>; projectedMl: number }

export type AddWaterFn = (ml: number, opts?: AddWaterCallOptions) => WaterAddOutcome

const WATER_OK: WaterAddOutcome = { ok: true }
const WATER_STORAGE_FAILED: WaterAddOutcome = { ok: false, reason: 'storage' }

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
      // [QIM-WEB-FOUNDER-UX-003/حزمة ٢] حارس هنا لا في `saveNutritionLog`:
      // ذاك كاتب تاريخ **مشترك** مع الاستيراد والمزامنة، وحجبه يمنع المستخدم من
      // استعادة بياناته. الحدّ نفسه المطبَّق على القياسات.
      assertPaid('nutrition.toggleMeal')
      const date = getDayStamp()
      const doneMeals = { ...(getNutritionLog(date)?.doneMeals ?? {}) }
      doneMeals[mealId] = !doneMeals[mealId]
      saveNutritionLog(date, { doneMeals })
      invalidateReal()
    },
    [demo],
  )

  const addWater: AddWaterFn = useCallback(
    (ml: number, opts: AddWaterCallOptions = {}) => {
      if (demo) {
        const prev = snapshot(true)
        demoCache = { ...prev, waterMl: Math.max(0, prev.waterMl + ml) }
        notify()
        return WATER_OK
      }
      let needsConfirm: WaterConfirmationRequired | null = null
      const saved = storageWrite(() => {
        try {
          // ═══ نقطة الإعلان الوحيدة ═══
          // `source: 'user'` تُكتب **هنا** لا في الأزرار: بطاقة الرئيسية ولوحة
          // ماء التغذية كلتاهما تستهلكان هذا الهوك، فلا يقدر زرّ أن ينسى الحارس.
          // والمسجّل التلقائي أثناء التمرين لا يمرّ من هنا — فيبقى معفى من
          // النافذة بحكم الافتراض `'auto'` مع بقاء محاسبته كاملة.
          addWaterToDay(ml, { ...opts, source: 'user' })
        } catch (error) {
          if (error instanceof WaterConfirmationRequired) {
            needsConfirm = error
            return
          }
          throw error
        }
      })
      if (needsConfirm) {
        const pending = needsConfirm as WaterConfirmationRequired
        return { ok: false, reason: 'confirm', tier: pending.tier, projectedMl: pending.projectedMl }
      }
      if (!saved) return WATER_STORAGE_FAILED
      // [CTO-70] البند ١ — أول انتصار: تسجيل ماء حقيقي يُنهي الانتصار الأول.
      // هنا لا في البطاقة: الضغطة نيّة، والإنجاز ما وقع — ويُحتسب من أي سطح.
      if (ml > 0) completeFirstWin('water')
      return WATER_OK
    },
    [demo],
  )

  const resetWater = useCallback(() => {
    if (demo) {
      const prev = snapshot(true)
      demoCache = { ...prev, waterMl: 0 }
      notify()
      return true
    }
    return storageWrite(() => { addWaterToDay(-getNutritionDaySnapshot().waterMl) })
  }, [demo])

  /** إضافة عنصر للسجل (سعرات/ماكروز). يُولَّد المعرّف تلقائيًا إن لم يُمرَّر. */
  const addLog = useCallback(
    (entry: Omit<LoggedFood, 'id'> & { id?: string }) => {
      const item: LoggedFood = { ...entry, id: entry.id ?? nextLogId() }
      if (demo) {
        const prev = snapshot(true)
        demoCache = { ...prev, log: [...prev.log, item] }
        notify()
        return true
      } else {
        const saved = storageWrite(() => { addFoodToDay(toCanonical(item)) })
        if (!saved) return false
        // [CTO-70] البند ١ — أول انتصار بتسجيل وجبة (يصير «عشاء» مساءً).
        completeFirstWin('meal')
        return true
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
        return true
      }
      return storageWrite(() => { removeFoodFromDay(id) })
    },
    [demo],
  )

  /** يعدّل كمية قيد حيّ بالنسبة إلى كميته المحفوظة؛ بلا أساس معروف لا نخترع حسابًا. */
  const updateLogQuantity = useCallback(
    (id: string, value: number, unit: 'g' | 'serving') => {
      if (!Number.isFinite(value) || value <= 0) return false
      const current = snapshot(demo).log.find((entry) => entry.id === id)
      if (!current) return false
      const base = unit === 'g' ? current.grams : current.servings
      if (typeof base !== 'number' || !Number.isFinite(base) || base <= 0) return false
      const ratio = value / base
      const updated: LoggedFood = {
        ...current,
        grams: current.grams === undefined ? undefined : Math.round(current.grams * ratio * 10) / 10,
        servings: current.servings === undefined ? undefined : Math.round(current.servings * ratio * 100) / 100,
        calories: Math.round(current.calories * ratio),
        protein: Math.round(current.protein * ratio * 10) / 10,
        ...(typeof current.carbs === 'number' ? { carbs: Math.round(current.carbs * ratio * 10) / 10 } : {}),
        ...(typeof current.fat === 'number' ? { fat: Math.round(current.fat * ratio * 10) / 10 } : {}),
        unit,
      }
      if (demo) {
        const prev = snapshot(true)
        demoCache = { ...prev, log: prev.log.map((entry) => (entry.id === id ? updated : entry)) }
        notify()
        return true
      }
      return storageWrite(() => { updateFoodInDay(toCanonical(updated)) })
    },
    [demo],
  )

  const isMealDone = useCallback((mealId: string) => !!state.doneMeals[mealId], [state])
  const totals = logTotals(state.log)

  return { state, totals, toggleMeal, addWater, resetWater, addLog, removeLog, updateLogQuantity, isMealDone }
}
