// سجلّ متاجر البيانات القابلة للنقل (تصدير/استيراد) — قِمّة (PDPL R-1).
//
// المبدأ (نفس نمط المسح fail-safe في accountScope.wipeUserData):
//   • «مساحة المستخدم» = كل مفاتيح `qimmah:*` عدا قائمة الاستثناء الصريحة
//     (تفضيلات الجهاز/الجلسة/سباكة المزامنة). فأي متجر جديد يُصدَّر افتراضيًا —
//     لا يُنسى بصمت (نفس ضمان المسح).
//   • هذا السجلّ يعرّف المتاجر المعروفة (بمُحمِّلها الحقيقي للتحقّق + شكلها + عدّها).
//     ما لم يُعرَّف هنا لكنه ضمن مساحة المستخدم يُلتقط عبر «مسح البقايا» (registry.ts:sweepUnregistered)
//     فلا تُفقد بيانات مستخدم جديدة.
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
import { CUSTOM_PLAN_KEY, loadCustomPlanRecord } from '@/features/customPlan/storage'
import { TODO_KEY_BASE, loadTodos } from '@/features/todo/store'
import { ACTIVE_SESSION_KEY_BASE } from '@/lib/activeSession'

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
 * تُضاف المتاجر الجديدة هنا؛ وإن نُسيت فسيلتقطها sweepUnregistered afford (fail-safe).
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

// ————————————————————— fail-safe: التقاط البقايا غير المسجّلة —————————————————————

/**
 * مفاتيح تُستثنى من التصدير/الاستيراد صراحةً (ليست بيانات مستخدم قابلة للنقل):
 *  • قائمة السماح العامّة في accountScope (تفضيلات جهاز/كاش/رمز جلسة) — أخطرها
 *    `qimmah:supabase-auth:v1` (استيراده = اختطاف حساب).
 *  • سباكة المزامنة العابرة (queue/backup/meta) — ليست بيانات مستخدم.
 *  • أعلام اختبار داخلية.
 *  • نسخ مفاتيح قديمة مكرّرة (هُوجرت إلى سجلّ التاريخ) — تصديرها يُكرّر العدّ.
 * مطابقة بالبادئة تغطّي المفاتيح المربوطة بالمالك (uid لاحقة).
 */
const EXCLUDED_EXACT: ReadonlySet<string> = new Set([
  // accountScope GLOBAL_SAFE_KEYS
  'qimmah:prefs:v1', 'qimmah:uiMode:v1', 'qimmah:design-preview',
  'qimmah:installPromptDismissed:v1', 'qimmah:install-banner:dismissed',
  'qimmah:analytics:v1', 'qimmah:analytics:milestones:v1', 'qimmah:off:cache:v1',
  'qimmah:products:v1', 'qimmah:products:audit:v1', 'qimmah:products:saudi-seed-done:v1',
  'qimmah:history:migrated:v1', 'qimmah:onboarding:accounts:v1',
  'qimmah:supabase-auth:v1', 'qimmah:lastUser:v1',
  // أعلام اختبار
  'qimmah:onboarding:force-fail',
  // نسخ قديمة مكرّرة (مصدرها الحقيقي سجلّ التاريخ)
  'qimmah:workoutSessions:v1', 'qimmah:exerciseHistory:v1',
  'qimmah:measurementLogs:v1', 'qimmah:nutritionToday:v1',
  // حالة تمرين محلّية للعرض (عابرة، بديلها activeSession)
  'qimmah:active-workout:v2', 'qimmah:workout-summary:v2',
])
const EXCLUDED_PREFIXES: readonly string[] = [
  'qimmah:syncQueue:v1', 'qimmah:syncBackup:v1', 'qimmah:sync:meta:v1',
  'qimmah:portability:', // بقايا الاستيراد المرحلية (نسخة التراجع) — لا تُصدَّر
]

const QIMMAH_PREFIX = 'qimmah:'

export function isExcludedKey(key: string): boolean {
  if (EXCLUDED_EXACT.has(key)) return true
  return EXCLUDED_PREFIXES.some((p) => key.startsWith(p))
}

/** كل المفاتيح التي يغطّيها السجلّ للمستخدم الحالي (لتحديد «البقايا»). */
function registeredKeysFor(uid: string | null | undefined): Set<string> {
  const s = new Set<string>()
  for (const d of STORE_DEFS) s.add(d.keyFor(uid))
  return s
}

/**
 * يمسح localStorage بحثًا عن مفاتيح `qimmah:*` ضمن مساحة المستخدم لكنها غير مسجّلة
 * وغير مستثناة — بيانات مستخدم «جديدة» يجب أن تُصدَّر افتراضيًا (fail-safe).
 * يُرجِع خريطة {key → قيمة خام مُحلَّلة}.
 */
export function sweepUnregistered(uid: string | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (typeof window === 'undefined') return out
  const registered = registeredKeysFor(uid)
  const ls = window.localStorage
  const otherOwnerSuffix = new Set(
    STORE_DEFS.filter((d) => d.kind === 'ownerSuffix').map((d) => `${d.key}:`),
  )
  for (let i = 0; i < ls.length; i += 1) {
    const k = ls.key(i)
    if (!k || !k.startsWith(QIMMAH_PREFIX)) continue
    if (registered.has(k) || isExcludedKey(k)) continue
    // متجر مربوط بمالك لكن لمالك آخر (لاحقة uid مختلفة) → ليس بيانات المستخدم الحالي.
    if ([...otherOwnerSuffix].some((p) => k.startsWith(p))) continue
    const val = readRaw(k)
    if (val !== undefined) out[k] = val
  }
  return out
}

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
