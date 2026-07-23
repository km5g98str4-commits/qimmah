// سجلّ متاجر البيانات القابلة للنقل (تصدير/استيراد) — قِمّة (PDPL R-1).
//
// المبدأ: allowlist صريحة فقط. لا يُصدَّر أو يُستورد أي مفتاح لم يُسجّل هنا
// بمحمّله الحقيقي وشكله وحدوده. هذا يمنع التقاط جلسة/جهاز/مالك آخر بالحدس.
//
// الأمان (STRIDE): الاستيراد يكتب فقط إلى مفاتيح هذا السجلّ (المعروفة) + إعادة ترميز
// المالك إلى المستخدم الحالي حصراً. لا يمسّ إطلاقاً رمز الجلسة (qimmah:supabase-auth)،
// ولا سباكة المزامنة، ولا مفاتيح الجهاز العامّة — فحقن حساب آخر مستحيل بنيويًّا.

import { Capacitor } from '@capacitor/core'
// الأصل: مفاتيح الاستثناء تُطابق قائمة السماح في accountScope (لا نستوردها لتجنّب دورة الاعتماد).

// —— المُحمِّلات الحقيقية (بوابة التحقّق عند التطبيق) ——
import {
  HISTORY_KEYS,
  getWorkoutSessions,
  getExerciseHistory,
  getDailyLogs,
  getMeasurementLogs,
  getNutritionLogs,
  getWaterLogs,
  getSupplementLogs,
  getMedicationLogs,
} from '@/lib/historyStore'
import { STORAGE_KEY as CUSTOMIZATION_KEY, loadCustomization } from '@/lib/customization'
import { NUTRITION_V2_KEY, loadNutritionDay } from '@/lib/nutritionV2Model'
import { WELLNESS_TODAY_KEY, loadWellnessToday } from '@/lib/wellnessTracking'
import { COMMITMENTS_TODAY_KEY, loadCommitmentsToday } from '@/lib/commitmentTracking'
import { TODAY_KEY, loadToday } from '@/lib/today'
import { STEP_LOG_KEY, STEP_GOAL_KEY, STEP_SOURCE_KEY, loadStepLog, loadStepGoal } from '@/lib/stepCounter'
import { REMINDER_PREFS_KEY, loadReminderPrefs } from '@/lib/reminderPrefs'
import { ONBOARDING_KEY, loadOnboarding } from '@/lib/onboarding'
import { ONBOARDING_PROFILE_KEY, loadOnboardingProfile } from '@/lib/onboardingProfile'
import { ACHIEVEMENTS_KEY, loadAchievementState } from '@/features/achievements/engine'
import { WORKOUT_CALENDAR_KEY, loadWeeklySchedule } from '@/lib/workoutCalendar'
import { CUSTOM_PLAN_KEY, loadCustomPlanRecord } from '@/features/customPlan/storage'
import { TODO_KEY_BASE, loadTodos } from '@/features/todo/store'
import { ACTIVE_SESSION_KEY_BASE } from '@/lib/activeSession'
import { notificationPrefsKey } from '@/lib/notifications/prefs'
import { PLATES_KEY_BASE, plateKey, isValidPlateConfig, WARMUP_PREF_BASE, warmupPrefKey } from '@/lib/strength'
import { lessonProgressKey } from '@/lib/coaching/lessonRotation'

/** معرّف المالك في المفتاح/الخريطة: الحساب المسجّل أو 'guest'. مطابق لبُناة المفاتيح. */
export function ownerToken(uid: string | null | undefined): string {
  return uid ?? 'guest'
}

export type StoreKind = 'fixed' | 'ownerSuffix' | 'ownerMap'

export interface StoreDef {
  /** معرّف ثابت داخل الحزمة (لا يتغيّر عبر الإصدارات). */
  id: string
  kind: StoreKind
  /** المفتاح الثابت (fixed/ownerMap) أو الأساس (ownerSuffix). */
  key: string
  /** تسمية عربية للملخّص. */
  labelAr: string
  /** يبني مفتاح localStorage الفعلي للمستخدم الحالي. */
  keyFor(uid: string | null | undefined): string
  /** عدّ العناصر داخل القيمة (للملخّص/المعاينة). 0 عند الغياب. */
  count(value: unknown): number
  /** تحقّق بنيوي من الشكل قبل أي كتابة. يعيد true أو سبب الرفض (نص). */
  validate(value: unknown): true | string
  /** المُحمِّل الحقيقي — بوابة التحقّق النهائية بعد الكتابة (يجب ألّا يرمي). */
  load(uid: string | null | undefined): unknown
}

// —— مساعدات تحقّق بنيوي ——
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const isArr = Array.isArray
/** عدد مفاتيح كائن مفهرس بالتاريخ (ByDate) أو سجلّ. */
const objCount = (v: unknown): number => (isObj(v) ? Object.keys(v).length : 0)
const arrCount = (v: unknown): number => (isArr(v) ? v.length : 0)

/** حدّ أقصى لعدد العناصر لكل متجر (حماية DoS من ملفّ معادٍ). */
export const MAX_ITEMS_PER_STORE = 100_000

function arrayStore(id: string, key: string, labelAr: string, load: () => unknown): StoreDef {
  return {
    id, kind: 'fixed', key, labelAr,
    keyFor: () => key,
    count: arrCount,
    validate: (v) => (v == null || (isArr(v) && v.length <= MAX_ITEMS_PER_STORE) ? true : `الشكل غير صالح (${labelAr})`),
    load,
  }
}
function mapStore(id: string, key: string, labelAr: string, load: () => unknown): StoreDef {
  return {
    id, kind: 'fixed', key, labelAr,
    keyFor: () => key,
    count: objCount,
    validate: (v) => (v == null || (isObj(v) && Object.keys(v).length <= MAX_ITEMS_PER_STORE) ? true : `الشكل غير صالح (${labelAr})`),
    load,
  }
}
function objectStore(id: string, key: string, labelAr: string, load: () => unknown, present = 1): StoreDef {
  return {
    id, kind: 'fixed', key, labelAr,
    keyFor: () => key,
    count: (v) => (v == null ? 0 : present),
    validate: (v) => (v == null || isObj(v) ? true : `الشكل غير صالح (${labelAr})`),
    load,
  }
}

/**
 * سجلّ المتاجر المعروفة. الترتيب هو ترتيب العرض في الملخّص.
 * تُضاف المتاجر الجديدة هنا مع proof؛ وما لا يُسجّل يبقى خارج النسخة عمدًا.
 */
export const STORE_DEFS: StoreDef[] = [
  // — سجلّ التاريخ (History namespace) —
  arrayStore('workoutSessions', HISTORY_KEYS.workoutSessions, 'تمارين', getWorkoutSessions),
  mapStore('exerciseHistory', HISTORY_KEYS.exerciseHistory, 'سجلّ التمارين', getExerciseHistory),
  mapStore('dailyLogs', HISTORY_KEYS.dailyLogs, 'أيام مسجّلة', getDailyLogs),
  arrayStore('measurementLogs', HISTORY_KEYS.measurementLogs, 'قياسات', getMeasurementLogs),
  mapStore('nutritionLogs', HISTORY_KEYS.nutritionLogs, 'أيام تغذية', getNutritionLogs),
  mapStore('waterLogs', HISTORY_KEYS.waterLogs, 'أيام ماء', getWaterLogs),
  mapStore('supplementLogs', HISTORY_KEYS.supplementLogs, 'أيام مكمّلات', getSupplementLogs),
  mapStore('medicationLogs', HISTORY_KEYS.medicationLogs, 'أيام أدوية', getMedicationLogs),
  // — متاجر مفردة —
  objectStore('customization', CUSTOMIZATION_KEY, 'الإعدادات والخطة', loadCustomization),
  objectStore('nutritionV2', NUTRITION_V2_KEY, 'تغذية اليوم', loadNutritionDay),
  objectStore('wellnessToday', WELLNESS_TODAY_KEY, 'تعافي اليوم', loadWellnessToday),
  objectStore('commitmentsToday', COMMITMENTS_TODAY_KEY, 'التزامات اليوم', loadCommitmentsToday),
  objectStore('today', TODAY_KEY, 'حالة اليوم', loadToday),
  mapStore('steps', STEP_LOG_KEY, 'أيام خطوات', loadStepLog),
  {
    id: 'stepGoal', kind: 'fixed', key: STEP_GOAL_KEY, labelAr: 'هدف الخطوات',
    keyFor: () => STEP_GOAL_KEY, count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || typeof v === 'number' ? true : 'هدف الخطوات غير صالح'),
    load: loadStepGoal,
  },
  mapStore('stepSource', STEP_SOURCE_KEY, 'مصدر الخطوات', () => readRaw(STEP_SOURCE_KEY)),
  objectStore('reminders', REMINDER_PREFS_KEY, 'التذكيرات', loadReminderPrefs),
  objectStore('onboarding', ONBOARDING_KEY, 'الإعداد', loadOnboarding),
  objectStore('onboardingProfile', ONBOARDING_PROFILE_KEY, 'ملف الإعداد', loadOnboardingProfile),
  objectStore('achievements', ACHIEVEMENTS_KEY, 'الإنجازات', loadAchievementState),
  objectStore('workoutCalendar', WORKOUT_CALENDAR_KEY, 'الجدول الأسبوعي', loadWeeklySchedule),
  // — متاجر مربوطة بالمالك (المعرّف في لاحقة المفتاح) —
  {
    id: 'todo', kind: 'ownerSuffix', key: TODO_KEY_BASE, labelAr: 'مهام',
    keyFor: (uid) => `${TODO_KEY_BASE}:${ownerToken(uid)}`,
    count: (v) => (isObj(v) && isArr((v as { items?: unknown }).items) ? ((v as { items: unknown[] }).items).length : 0),
    validate: (v) => (v == null || (isObj(v) && typeof (v as { date?: unknown }).date === 'string' && isArr((v as { items?: unknown }).items)) ? true : 'شكل المهام غير صالح'),
    load: (uid) => loadTodos(uid),
  },
  {
    id: 'activeSession', kind: 'ownerSuffix', key: ACTIVE_SESSION_KEY_BASE, labelAr: 'جلسة تمرين نشطة',
    keyFor: (uid) => `${ACTIVE_SESSION_KEY_BASE}:${ownerToken(uid)}`,
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || isObj(v) ? true : 'شكل الجلسة النشطة غير صالح'),
    load: (uid) => readRaw(`${ACTIVE_SESSION_KEY_BASE}:${ownerToken(uid)}`),
  },
  {
    id: 'notificationPrefs', kind: 'ownerSuffix', key: 'qimmah:notifications:v1', labelAr: 'تفضيلات التذكيرات',
    keyFor: (uid) => notificationPrefsKey(ownerToken(uid)),
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || isObj(v) ? true : 'شكل تفضيلات التذكيرات غير صالح'),
    load: (uid) => readRaw(notificationPrefsKey(ownerToken(uid))),
  },
  {
    id: 'plateConfig', kind: 'ownerSuffix', key: PLATES_KEY_BASE, labelAr: 'إعداد الأقراص',
    keyFor: (uid) => plateKey(uid),
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || isValidPlateConfig(v) ? true : 'شكل إعداد الأقراص غير صالح'),
    load: (uid) => readRaw(plateKey(uid)),
  },
  {
    id: 'warmupPref', kind: 'ownerSuffix', key: WARMUP_PREF_BASE, labelAr: 'تفضيل الإحماء',
    keyFor: (uid) => warmupPrefKey(uid),
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || (isObj(v) && typeof v.show === 'boolean') ? true : 'شكل تفضيل الإحماء غير صالح'),
    load: (uid) => readRaw(warmupPrefKey(uid)),
  },
  {
    id: 'coachLessons', kind: 'ownerSuffix', key: 'qimmah:coach:lessons:v1', labelAr: 'تقدّم الدروس',
    keyFor: (uid) => lessonProgressKey(uid),
    count: arrCount,
    validate: (v) => (v == null || (isArr(v) && v.length <= MAX_ITEMS_PER_STORE && v.every((item) => typeof item === 'string')) ? true : 'شكل تقدّم الدروس غير صالح'),
    load: (uid) => readRaw(lessonProgressKey(uid)),
  },
  // — متجر مربوط بالمالك (المعرّف مفتاحٌ في خريطة) —
  {
    id: 'customPlan', kind: 'ownerMap', key: CUSTOM_PLAN_KEY, labelAr: 'الجدول المخصّص',
    keyFor: () => CUSTOM_PLAN_KEY,
    count: (v) => (isObj(v) && isObj((v as { plan?: unknown }).plan) && isArr(((v as { plan: { days?: unknown } }).plan).days) ? ((v as { plan: { days: unknown[] } }).plan.days).length : (v == null ? 0 : 1)),
    validate: (v) => (v == null || (isObj(v) && isObj((v as { plan?: unknown }).plan)) ? true : 'شكل الجدول المخصّص غير صالح'),
    load: (uid) => loadCustomPlanRecord(uid),
  },
]

/** خريطة id → تعريف (وصول سريع عند الاستيراد). */
export const STORE_BY_ID: Record<string, StoreDef> = Object.fromEntries(STORE_DEFS.map((d) => [d.id, d]))

// ————————————————————— قراءة/كتابة خام آمنة —————————————————————

/** يقرأ قيمة مفتاح ويُحلّلها JSON. undefined إن غاب المفتاح؛ يرمي إن كان JSON تالفًا. */
export function readRaw(key: string): unknown {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem(key)
  if (raw === null) return undefined
  return JSON.parse(raw) as unknown
}

/** يكتب قيمة (JSON) إلى مفتاح، أو يحذفه إن كانت undefined/null-غياب. محلّي بحت. */
export function writeRaw(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  if (value === undefined) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

/** هل نعمل داخل الغلاف الأصلي (لاختيار مسار المشاركة الأصلي مقابل تنزيل الويب)؟ */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
