// يوم التغذية — **الواجهة الواحدة** التي تقرأ منها شاشة التغذية أيَّ يوم كان.
//
// ═══ لماذا هذه الطبقة ═══
// كان لليوم الحالي هوك (`useNutritionToday`) وللماضي دوالّ دفتر
// (`getDayEntries`/`editEntry`/`removeEntry`) — سطحان مختلفان لنفس السؤال.
// فبناء تصفّح الأيام فوقهما مباشرةً كان سيولّد فرعين في الواجهة: «إن كان اليوم
// افعل كذا وإلّا كذا» في كل زرّ. وهذا بعينه شكل العطل الذي تعالجه هذه الموجة.
//
// فالحلّ سطح واحد: `useNutritionDay(date)` يعيد **نفس شكل** `useNutritionToday`
// (سجلّ + مجاميع + ماء + حذف + تعديل كمية) أيًّا كان اليوم. الشاشة لا تعرف —
// ولا تحتاج أن تعرف — من أين جاء اليوم.
//
// ═══ ما لا تفعله هذه الطبقة ═══
//   • **لا تكتب في الماضي طعامًا جديدًا.** الإضافة تقع على اليوم الحالي وحده،
//     وهذا معلَن في الشاشة بسبب مكتوب لا بزرّ مطفأ صامت.
//   • **لا تخترع تفصيلًا ليوم لا تفصيل له.** اليوم الأقدم من الدفتر يعود
//     بمجاميعه موسومة (`legacyTotals`) وسجلّه فارغ — لا أصناف مُلفَّقة.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDayStamp } from '@/lib/today'
import { getWaterLogs } from '@/lib/historyStore'
import {
  logTotals,
  useNutritionToday,
  type LoggedFood,
  type LogTotals,
} from '@/lib/nutritionTracking'
import {
  editEntry,
  getDayEntries,
  getDayNutritionStat,
  removeEntry,
  subscribeNutritionLedger,
  type NutritionEntry,
} from '@/lib/nutritionHistory'

/** مجاميع يوم أقدم من الدفتر — معروفة بلا تفصيل. */
export interface LegacyDayTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface NutritionDay {
  date: string
  isToday: boolean
  /** أصناف اليوم — فارغ ليوم بلا تفصيل (ليس «بلا بيانات» بالضرورة: انظر legacyTotals). */
  log: LoggedFood[]
  totals: LogTotals
  waterMl: number
  /** مجاميع يوم ما قبل الدفتر — null حين يوجد تفصيل أو لا بيانات أصلًا. */
  legacyTotals: LegacyDayTotals | null
  /** هل لليوم أي بيانات إطلاقًا (تفصيل أو مجاميع أو ماء)؟ */
  hasData: boolean
  /** الإضافة متاحة على اليوم الحالي وحده. */
  canAdd: boolean
  removeLog: (id: string) => boolean
  updateLogQuantity: (id: string, value: number, unit: 'g' | 'serving') => boolean
}

/** قيد دفتر → شكل السجلّ الحيّ. نفس الحقول، فلا فرع في الواجهة بين اليوم والماضي. */
export function loggedFoodFromLedgerEntry(entry: NutritionEntry): LoggedFood {
  return {
    id: entry.id,
    label: entry.nameAr,
    calories: entry.macros.calories,
    protein: entry.macros.protein,
    ...(entry.macros.carbs !== undefined ? { carbs: entry.macros.carbs } : {}),
    ...(entry.macros.fat !== undefined ? { fat: entry.macros.fat } : {}),
    meal: entry.meal,
    ...(entry.foodId ? { foodId: entry.foodId } : {}),
    ...(entry.quantity.grams !== undefined ? { grams: entry.quantity.grams } : {}),
    ...(entry.quantity.servings !== undefined ? { servings: entry.quantity.servings } : {}),
    unit: entry.unit,
  }
}

function waterForDate(date: string): number {
  try {
    const log = getWaterLogs()[date]
    return typeof log?.waterMl === 'number' && Number.isFinite(log.waterMl) ? Math.max(0, log.waterMl) : 0
  } catch {
    return 0
  }
}

/**
 * يوم التغذية المعروض. `date` ختم محلي (YYYY-MM-DD).
 *
 * الهوكان يُستدعيان دائمًا (قواعد الهوكس) ويُختار بينهما بعد ذلك — فلا يتغيّر
 * عدد الهوكس بتغيّر اليوم المعروض.
 */
export function useNutritionDay(date: string): NutritionDay {
  const today = useNutritionToday()
  const isToday = date === getDayStamp()

  // نسخة تُزاد عند كل كتابة في الماضي — تُجبر إعادة القراءة من الدفتر.
  const [version, setVersion] = useState(0)
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  // كتابة من سطح آخر (استيراد/مزامنة/تبويب ثانٍ) تُحدّث اليوم المعروض كذلك.
  useEffect(() => subscribeNutritionLedger(bump), [bump])

  const past = useMemo(() => {
    if (isToday) return null
    void version
    const stat = getDayNutritionStat(date)
    const log = getDayEntries(date).map(loggedFoodFromLedgerEntry)
    return {
      log,
      totals: logTotals(log),
      waterMl: waterForDate(date),
      legacyTotals: stat.source === 'totals' ? stat.totals : null,
      hasData: stat.source !== 'none' || waterForDate(date) > 0,
    }
  }, [date, isToday, version])

  const removePast = useCallback(
    (id: string) => {
      const result = removeEntry(id)
      if (result.status === 'ok') bump()
      return result.status === 'ok'
    },
    [bump],
  )

  const updatePast = useCallback(
    (id: string, value: number, unit: 'g' | 'serving') => {
      if (!Number.isFinite(value) || value <= 0) return false
      const result = editEntry(id, { quantity: unit === 'g' ? { grams: value } : { servings: value } })
      if (result.status === 'ok') bump()
      return result.status === 'ok'
    },
    [bump],
  )

  if (isToday || past === null) {
    return {
      date,
      isToday: true,
      log: today.state.log,
      totals: today.totals,
      waterMl: today.state.waterMl,
      legacyTotals: null,
      hasData: today.state.log.length > 0 || today.state.waterMl > 0,
      canAdd: true,
      removeLog: today.removeLog,
      updateLogQuantity: today.updateLogQuantity,
    }
  }

  return {
    date,
    isToday: false,
    log: past.log,
    totals: past.totals,
    waterMl: past.waterMl,
    legacyTotals: past.legacyTotals,
    hasData: past.hasData,
    canAdd: false,
    removeLog: removePast,
    updateLogQuantity: updatePast,
  }
}
