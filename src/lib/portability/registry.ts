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
import { PLAN_TEMPLATES_KEY, listTemplates, MAX_TEMPLATES } from '@/features/customPlan/templates'
import { NUTRITION_HISTORY_KEY, PERSONAL_FOODS_KEY, MAX_PERSONAL_FOODS, loadLedgerDays, listPersonalFoods } from '@/lib/nutritionHistory'
import { TODO_KEY_BASE, loadTodos } from '@/features/todo/store'
import { ACTIVE_SESSION_KEY_BASE } from '@/lib/activeSession'
import { notificationPrefsKey } from '@/lib/notifications/prefs'
import { PLATES_KEY_BASE, plateKey, isValidPlateConfig, WARMUP_PREF_BASE, warmupPrefKey } from '@/lib/strength'
import { lessonProgressKey } from '@/lib/coaching/lessonRotation'
import type { Lang } from '@/lib/appPreferences'
import type { InvalidReason } from './errors'

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
  /** English label for the same summary line. */
  labelEn: string
  /** يبني مفتاح localStorage الفعلي للمستخدم الحالي. */
  keyFor(uid: string | null | undefined): string
  /** عدّ العناصر داخل القيمة (للملخّص/المعاينة). 0 عند الغياب. */
  count(value: unknown): number
  /**
   * تحقّق بنيوي من الشكل قبل أي كتابة. يعيد true أو سبب الرفض بلغتين.
   * العربية تبقى نفس الجملة التي كانت تُرمى قبل التوطين — لا تغيير في نصّها.
   */
  validate(value: unknown): true | InvalidReason
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

function arrayStore(id: string, key: string, labelAr: string, labelEn: string, load: () => unknown): StoreDef {
  return {
    id, kind: 'fixed', key, labelAr, labelEn,
    keyFor: () => key,
    count: arrCount,
    validate: (v) => (v == null || (isArr(v) && v.length <= MAX_ITEMS_PER_STORE) ? true : { ar: `الشكل غير صالح (${labelAr})`, en: `Invalid format (${labelEn})` }),
    load,
  }
}
function mapStore(id: string, key: string, labelAr: string, labelEn: string, load: () => unknown): StoreDef {
  return {
    id, kind: 'fixed', key, labelAr, labelEn,
    keyFor: () => key,
    count: objCount,
    validate: (v) => (v == null || (isObj(v) && Object.keys(v).length <= MAX_ITEMS_PER_STORE) ? true : { ar: `الشكل غير صالح (${labelAr})`, en: `Invalid format (${labelEn})` }),
    load,
  }
}
function objectStore(id: string, key: string, labelAr: string, labelEn: string, load: () => unknown, present = 1): StoreDef {
  return {
    id, kind: 'fixed', key, labelAr, labelEn,
    keyFor: () => key,
    count: (v) => (v == null ? 0 : present),
    validate: (v) => (v == null || isObj(v) ? true : { ar: `الشكل غير صالح (${labelAr})`, en: `Invalid format (${labelEn})` }),
    load,
  }
}

/**
 * سجلّ المتاجر المعروفة. الترتيب هو ترتيب العرض في الملخّص.
 * تُضاف المتاجر الجديدة هنا مع proof؛ وما لا يُسجّل يبقى خارج النسخة عمدًا.
 */
export const STORE_DEFS: StoreDef[] = [
  // — سجلّ التاريخ (History namespace) —
  arrayStore('workoutSessions', HISTORY_KEYS.workoutSessions, 'تمارين', 'Workout sessions', getWorkoutSessions),
  mapStore('exerciseHistory', HISTORY_KEYS.exerciseHistory, 'سجلّ التمارين', 'Exercise history', getExerciseHistory),
  mapStore('dailyLogs', HISTORY_KEYS.dailyLogs, 'أيام مسجّلة', 'Logged days', getDailyLogs),
  arrayStore('measurementLogs', HISTORY_KEYS.measurementLogs, 'قياسات', 'Body measurements', getMeasurementLogs),
  mapStore('nutritionLogs', HISTORY_KEYS.nutritionLogs, 'أيام تغذية', 'Daily nutrition logs', getNutritionLogs),
  mapStore('waterLogs', HISTORY_KEYS.waterLogs, 'أيام ماء', 'Daily water logs', getWaterLogs),
  mapStore('supplementLogs', HISTORY_KEYS.supplementLogs, 'أيام مكمّلات', 'Daily supplement logs', getSupplementLogs),
  mapStore('medicationLogs', HISTORY_KEYS.medicationLogs, 'أيام أدوية', 'Daily medication logs', getMedicationLogs),
  // — متاجر مفردة —
  objectStore('customization', CUSTOMIZATION_KEY, 'الإعدادات والخطة', 'Settings and plan', loadCustomization),
  objectStore('nutritionV2', NUTRITION_V2_KEY, 'تغذية اليوم', 'Today\'s nutrition', loadNutritionDay),
  objectStore('wellnessToday', WELLNESS_TODAY_KEY, 'تعافي اليوم', 'Today\'s supplement and medication check-ins', loadWellnessToday),
  objectStore('commitmentsToday', COMMITMENTS_TODAY_KEY, 'التزامات اليوم', 'Today\'s commitments', loadCommitmentsToday),
  objectStore('today', TODAY_KEY, 'حالة اليوم', 'Today\'s status', loadToday),
  mapStore('steps', STEP_LOG_KEY, 'أيام خطوات', 'Daily step counts', loadStepLog),
  {
    id: 'stepGoal', kind: 'fixed', key: STEP_GOAL_KEY, labelAr: 'هدف الخطوات', labelEn: 'Step goal',
    keyFor: () => STEP_GOAL_KEY, count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || typeof v === 'number' ? true : { ar: 'هدف الخطوات غير صالح', en: 'The step goal in this backup is not valid. Nothing was imported.' }),
    load: loadStepGoal,
  },
  mapStore('stepSource', STEP_SOURCE_KEY, 'مصدر الخطوات', 'Step data source', () => readRaw(STEP_SOURCE_KEY)),
  objectStore('reminders', REMINDER_PREFS_KEY, 'التذكيرات', 'Reminders', loadReminderPrefs),
  objectStore('onboarding', ONBOARDING_KEY, 'الإعداد', 'Setup', loadOnboarding),
  objectStore('onboardingProfile', ONBOARDING_PROFILE_KEY, 'ملف الإعداد', 'Setup profile', loadOnboardingProfile),
  objectStore('achievements', ACHIEVEMENTS_KEY, 'الإنجازات', 'Achievements', loadAchievementState),
  objectStore('workoutCalendar', WORKOUT_CALENDAR_KEY, 'الجدول الأسبوعي', 'Weekly schedule', loadWeeklySchedule),
  // — متاجر مربوطة بالمالك (المعرّف في لاحقة المفتاح) —
  {
    id: 'todo', kind: 'ownerSuffix', key: TODO_KEY_BASE, labelAr: 'مهام', labelEn: 'Tasks',
    keyFor: (uid) => `${TODO_KEY_BASE}:${ownerToken(uid)}`,
    count: (v) => (isObj(v) && isArr((v as { items?: unknown }).items) ? ((v as { items: unknown[] }).items).length : 0),
    validate: (v) => (v == null || (isObj(v) && typeof (v as { date?: unknown }).date === 'string' && isArr((v as { items?: unknown }).items)) ? true : { ar: 'شكل المهام غير صالح', en: 'The tasks in this backup are not in the expected format. Nothing was imported.' }),
    load: (uid) => loadTodos(uid),
  },
  {
    id: 'activeSession', kind: 'ownerSuffix', key: ACTIVE_SESSION_KEY_BASE, labelAr: 'جلسة تمرين نشطة', labelEn: 'Active workout session',
    keyFor: (uid) => `${ACTIVE_SESSION_KEY_BASE}:${ownerToken(uid)}`,
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || isObj(v) ? true : { ar: 'شكل الجلسة النشطة غير صالح', en: 'The active workout session in this backup is not in the expected format. Nothing was imported.' }),
    load: (uid) => readRaw(`${ACTIVE_SESSION_KEY_BASE}:${ownerToken(uid)}`),
  },
  {
    id: 'notificationPrefs', kind: 'ownerSuffix', key: 'qimmah:notifications:v1', labelAr: 'تفضيلات التذكيرات', labelEn: 'Reminder preferences',
    keyFor: (uid) => notificationPrefsKey(ownerToken(uid)),
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || isObj(v) ? true : { ar: 'شكل تفضيلات التذكيرات غير صالح', en: 'The reminder preferences in this backup are not in the expected format. Nothing was imported.' }),
    load: (uid) => readRaw(notificationPrefsKey(ownerToken(uid))),
  },
  {
    id: 'plateConfig', kind: 'ownerSuffix', key: PLATES_KEY_BASE, labelAr: 'إعداد الأقراص', labelEn: 'Barbell plate setup',
    keyFor: (uid) => plateKey(uid),
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || isValidPlateConfig(v) ? true : { ar: 'شكل إعداد الأقراص غير صالح', en: 'The barbell plate setup in this backup is not in the expected format. Nothing was imported.' }),
    load: (uid) => readRaw(plateKey(uid)),
  },
  {
    id: 'warmupPref', kind: 'ownerSuffix', key: WARMUP_PREF_BASE, labelAr: 'تفضيل الإحماء', labelEn: 'Warm-up preference',
    keyFor: (uid) => warmupPrefKey(uid),
    count: (v) => (v == null ? 0 : 1),
    validate: (v) => (v == null || (isObj(v) && typeof v.show === 'boolean') ? true : { ar: 'شكل تفضيل الإحماء غير صالح', en: 'The warm-up preference in this backup is not in the expected format. Nothing was imported.' }),
    load: (uid) => readRaw(warmupPrefKey(uid)),
  },
  {
    id: 'coachLessons', kind: 'ownerSuffix', key: 'qimmah:coach:lessons:v1', labelAr: 'تقدّم الدروس', labelEn: 'Lesson progress',
    keyFor: (uid) => lessonProgressKey(uid),
    count: arrCount,
    validate: (v) => (v == null || (isArr(v) && v.length <= MAX_ITEMS_PER_STORE && v.every((item) => typeof item === 'string')) ? true : { ar: 'شكل تقدّم الدروس غير صالح', en: 'The lesson progress in this backup is not in the expected format. Nothing was imported.' }),
    load: (uid) => readRaw(lessonProgressKey(uid)),
  },
  // — متجر مربوط بالمالك (المعرّف مفتاحٌ في خريطة) —
  {
    id: 'customPlan', kind: 'ownerMap', key: CUSTOM_PLAN_KEY, labelAr: 'الجدول المخصّص', labelEn: 'Custom schedule',
    keyFor: () => CUSTOM_PLAN_KEY,
    count: (v) => (isObj(v) && isObj((v as { plan?: unknown }).plan) && isArr(((v as { plan: { days?: unknown } }).plan).days) ? ((v as { plan: { days: unknown[] } }).plan.days).length : (v == null ? 0 : 1)),
    validate: (v) => (v == null || (isObj(v) && isObj((v as { plan?: unknown }).plan)) ? true : { ar: 'شكل الجدول المخصّص غير صالح', en: 'The custom schedule in this backup is not in the expected format. Nothing was imported.' }),
    load: (uid) => loadCustomPlanRecord(uid),
  },
  {
    id: 'planTemplates', kind: 'ownerMap', key: PLAN_TEMPLATES_KEY, labelAr: 'قوالب الجداول', labelEn: 'Schedule templates',
    keyFor: () => PLAN_TEMPLATES_KEY,
    count: arrCount,
    validate: (v) =>
      v == null ||
      (isArr(v) &&
        v.length <= MAX_TEMPLATES &&
        v.every((t) => isObj(t) && typeof (t as { nameAr?: unknown }).nameAr === 'string' && isObj((t as { plan?: unknown }).plan)))
        ? true
        : { ar: 'شكل قوالب الجداول غير صالح', en: 'The schedule templates in this backup are not in the expected format. Nothing was imported.' },
    load: (uid) => listTemplates(uid),
  },
  {
    id: 'nutritionHistory', kind: 'ownerMap', key: NUTRITION_HISTORY_KEY, labelAr: 'دفتر التغذية المؤرَّخ', labelEn: 'Nutrition history by date',
    keyFor: () => NUTRITION_HISTORY_KEY,
    count: objCount, // عدد الأيام المفصَّلة
    validate: (v) =>
      v == null || (isObj(v) && Object.keys(v).length <= MAX_ITEMS_PER_STORE && Object.values(v).every(isArr))
        ? true
        : { ar: 'شكل دفتر التغذية غير صالح', en: 'The nutrition history in this backup is not in the expected format. Nothing was imported.' },
    load: (uid) => loadLedgerDays(uid),
  },
  {
    id: 'personalFoods', kind: 'ownerMap', key: PERSONAL_FOODS_KEY, labelAr: 'أطعمة شخصية', labelEn: 'Personal foods',
    keyFor: () => PERSONAL_FOODS_KEY,
    count: arrCount,
    validate: (v) =>
      v == null ||
      (isArr(v) && v.length <= MAX_PERSONAL_FOODS && v.every((f) => isObj(f) && typeof (f as { nameAr?: unknown }).nameAr === 'string'))
        ? true
        : { ar: 'شكل الأطعمة الشخصية غير صالح', en: 'The personal foods in this backup are not in the expected format. Nothing was imported.' },
    load: (uid) => listPersonalFoods(uid ?? null), // null صراحةً = 'guest' (undefined عندنا = المالك الحالي)
  },
]

/** تسمية المتجر بلغة الواجهة. العربية افتراضًا حفاظًا على سلوك المستدعين القدامى. */
export function storeLabel(def: StoreDef, lang: Lang = 'ar'): string {
  return lang === 'en' ? def.labelEn : def.labelAr
}

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
