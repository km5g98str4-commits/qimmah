// يقرأ الأسبوع الحقيقي للمستخدم (من customization.routine — المصدر الوحيد للخطة الفعلية،
// لا src/data/routine.ts الذي بيانات عرض تجريبية ثابتة) ويحوّله لـ PlanWeek خالص
// (weekday رقمي باصطلاح JS: 0=الأحد…6=السبت) تستهلكه schedule.ts الخالصة.

import { hasSavedCustomization, loadCustomization } from '@/lib/customization'
import type { RoutineRow } from '@/lib/customization'
import type { PlanWeek, PlanWeekday } from './types'

const AR_DAY_TO_WEEKDAY: Record<string, number> = {
  الأحد: 0,
  الإثنين: 1,
  الثلاثاء: 2,
  الأربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
  السبت: 6,
}

/** يحوّل صفّ خطة واحد إلى يوم أسبوع رقمي، أو null إن كان اسم اليوم غير معروف (دفاع صامت). */
function rowToWeekday(row: RoutineRow): PlanWeekday | null {
  const weekday = AR_DAY_TO_WEEKDAY[row.day]
  if (weekday === undefined) return null
  return { weekday, isRestDay: row.type === 'rest', title: row.title }
}

/**
 * يقرأ خطة المستخدم الحقيقية المحفوظة محليًا. يعيد null إن لم تُحفظ خطة بعد (لا نخترع
 * أيام تدريب وهمية) — عندها لا تُجدوَل تذكيرات workoutDay/restDay حتى تُكمَل الخطة.
 */
export function readPlanWeek(): PlanWeek {
  if (!hasSavedCustomization()) return null
  const routine = loadCustomization().routine
  if (!routine || routine.length === 0) return null
  const days = routine.map(rowToWeekday).filter((d): d is PlanWeekday => d !== null)
  return days.length > 0 ? days : null
}
