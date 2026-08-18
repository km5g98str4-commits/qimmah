// نموذج بيانات «مركز التخصيص» + التخزين المحلي.
// الافتراضي يُبنى من ملفات config/data، والتعديلات تُحفظ في localStorage فقط (بلا backend).

import { product } from '@/config/product'
import { supplements as defaultSupplements } from '@/data/supplements'
import { meals as defaultMeals } from '@/data/meals'
import { weeklyRoutine } from '@/data/routine'
import type { RoutineDay, SupplementItem } from '@/types'
import type { Profile, Targets } from '@/types/profile'
import { computeTargets, defaultProfile, isMinorAge, profileHash } from './calculators'
import { enqueueSyncOperation } from './syncQueue'
import { isOnboardingComplete } from './onboarding'
import { getLastUser } from './accountScope'
import { assertPaid, assertWriteAllowed } from '@/lib/access/guard'
import type { WriteIntent } from '@/lib/access/paidActions'
import type { WorkoutPlan } from '@/types/workout'
import { generatePlanFromTemplate } from './workoutPlan'
import { normalizePlanDayNames } from './planDayNames'
import type { NutritionPlan } from '@/types/nutrition'
import { defaultNutritionPlan } from './nutritionPlan'
import type { WellnessPlan } from '@/types/wellness'
import type { CommitmentPlan, MeasurementPlan } from '@/types/progress'
import { defaultCommitmentPlan } from './commitmentPlan'
import { isStorageAvailable, readRaw, safeRemove, safeWriteJson, type WriteResult } from '@/lib/safeStorage'

export const STORAGE_KEY = 'qimmah:customization:v1'

/**
 * الخطة الافتراضية للمكملات/الأدوية — قوائم فارغة تمامًا؛ يضيفها المستخدم بنفسه فقط.
 * انتقلت من wellnessPlan (P11.5): ذلك الملف يسحب مكتبتَي المكملات والأدوية (~48KB)
 * غير اللازمتين في حزمة الإقلاع، بينما هذا الافتراضي لا يحتاجهما إطلاقًا.
 */
export function defaultWellnessPlan(): WellnessPlan {
  return {
    enabled: true,
    supplements: [],
    medications: [],
  }
}

export type UserType = 'individual' | 'coach' | 'creator'

export const userTypeOptions: { value: UserType; label: string }[] = [
  { value: 'individual', label: 'فرد' },
  { value: 'coach', label: 'مدرب' },
  { value: 'creator', label: 'صانع محتوى' },
]

export interface WorkoutRow {
  name: string
  muscle: string
  sets: number
  reps: string
  weight: string
}

export interface SupplementRow {
  name: string
  dose: string
  timing: string
  type: SupplementItem['type']
}

export interface MealRow {
  name: string
  time: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

export interface MetricRow {
  label: string
  value: string
  unit: string
}

export interface RoutineRow {
  day: string
  title: string
  type: RoutineDay['type']
}

/** أقسام الصفحة القابلة للإظهار/الإخفاء (بنية v2 — تُوسّع لاحقًا). */
export interface SectionVisibility {
  today: boolean
  workouts: boolean
  meals: boolean
  supplements: boolean
  medications: boolean
  measurements: boolean
  commitments: boolean
  notes: boolean
}

export const defaultSections: SectionVisibility = {
  today: true,
  workouts: true,
  meals: true,
  supplements: true,
  medications: true,
  measurements: true,
  commitments: true,
  notes: true,
}

export interface Customization {
  identity: {
    userName: string
    brandName: string
    tagline: string
    mainGoal: string
    userType: UserType
  }
  colors: {
    primary: string
    accent: string
  }
  sections: SectionVisibility
  profile: Profile
  targets: Targets
  /** حالة الحسابات: هل عُدّلت يدويًا + بصمة الملف الذي حُسبت منه. */
  targetsMeta: {
    manuallyEdited: boolean
    lastCalculatedFromProfileHash?: string
    updatedAt?: string
    /**
     * ختم هجرة القاصرين (Option B): يُضبَط مرّة عند تحويل هدف حساب قاصر من تنشيف/تضخيم
     * إلى محافظة. وجوده = تمّت الهجرة (idempotent — لا تتكرّر)، ويُشغّل الإشعار اللطيف لمرّة.
     */
    minorGoalMigratedAt?: string
    /** ختم إغلاق إشعار هجرة القاصرين (لمرّة واحدة). */
    minorGoalNoticeDismissed?: boolean
  }
  workoutPlan: WorkoutPlan
  nutritionPlan: NutritionPlan
  wellnessPlan: WellnessPlan
  commitmentPlan: CommitmentPlan
  measurementPlan: MeasurementPlan
  workouts: WorkoutRow[]
  supplements: SupplementRow[]
  meals: MealRow[]
  metrics: MetricRow[]
  routine: RoutineRow[]
  /** طابع آخر حفظ (P12) — دليل LWW لمزامنة إعدادات الحساب (profiles.data.settings). */
  settingsUpdatedAt?: string
  /**
   * [SOVEREIGN-RECOVERY-001] **وسم الاختلاق.** `true` يعني: هذه ليست خطة أحد —
   * هي `getDefaultCustomization()` تُعرض لأن المحفوظ غائب أو تعذّرت قراءته.
   *
   * وجودها شرط الميثاق §5 «لا بيانات وهمية في مسار إنتاجي دون وسم صريح»: كانت
   * القيمة الافتراضية (٢٤ سنة · ٨٦ كجم · جسم كامل ×٣ · ٢٢٩٤ سعرة) تُعاد من
   * `loadCustomization()` بلا أي فرق عن خطة حقيقية، فتُعرض على أنها «خطتك».
   * **لا تُكتب إلى التخزين أبدًا** — `saveCustomization` يحذفها قبل الكتابة.
   */
  isDefault?: true
}

/**
 * إعدادات الحساب المُزامَنة (P12) — الحقول التي تتبع الحساب لا الجهاز:
 * ملفه (عمر/طول/وزن/هدف)، أهدافه المحسوبة وحالتها، خطط التغذية/المكملات/الالتزام/
 * القياس، هويته الشخصية (الاسم/الهدف/النوع) وإظهار الأقسام.
 *
 * تبقى على الجهاز (لا تُزامَن): ألوان القالب وهوية العلامة (brandName/tagline)،
 * صفوف قالب v1 التسويقية (workouts/supplements/meals/metrics/routine)، وكل
 * تفضيلات الجهاز العامة (لغة/ثيم/هابتكس في qimmah:prefs، uiMode…). خطة التمرين
 * workoutPlan مستثناة عمدًا — مزامنتها عبر جدول custom_plans (لا ازدواج مصدر).
 */
export interface AccountSettings {
  identity: Pick<Customization['identity'], 'userName' | 'mainGoal' | 'userType'>
  sections: SectionVisibility
  profile: Profile
  targets: Targets
  targetsMeta: Customization['targetsMeta']
  nutritionPlan: NutritionPlan
  wellnessPlan: WellnessPlan
  commitmentPlan: CommitmentPlan
  measurementPlan: MeasurementPlan
  updatedAt: string
}

/** يستخرج شريحة إعدادات الحساب من التخصيص الكامل (انظر AccountSettings). */
export function accountSettingsSlice(c: Customization): AccountSettings {
  return {
    identity: {
      userName: c.identity.userName,
      mainGoal: c.identity.mainGoal,
      userType: c.identity.userType,
    },
    sections: { ...c.sections },
    profile: { ...c.profile },
    targets: { ...c.targets },
    targetsMeta: { ...c.targetsMeta },
    nutritionPlan: c.nutritionPlan,
    wellnessPlan: c.wellnessPlan,
    commitmentPlan: c.commitmentPlan,
    measurementPlan: c.measurementPlan,
    updatedAt: c.settingsUpdatedAt ?? new Date().toISOString(),
  }
}

/** القيم الافتراضية مأخوذة مباشرة من config/data — مصدر الحقيقة الوحيد. */
export function getDefaultCustomization(): Customization {
  return {
    identity: {
      // لا اسم افتراضي — يُدخله المستخدم في الإعداد (لا أسماء وهمية في اللوحة الحقيقية).
      userName: '',
      brandName: product.name,
      tagline: product.tagline,
      mainGoal: '',
      userType: 'individual',
    },
    colors: {
      primary: '#F26A21',
      accent: '#E0941F',
    },
    sections: { ...defaultSections },
    profile: { ...defaultProfile },
    targets: computeTargets(defaultProfile),
    targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: profileHash(defaultProfile) },
    workoutPlan: generatePlanFromTemplate('full-body'),
    nutritionPlan: defaultNutritionPlan(computeTargets(defaultProfile), defaultProfile.goal),
    wellnessPlan: defaultWellnessPlan(),
    commitmentPlan: defaultCommitmentPlan(),
    measurementPlan: { enabled: true, selectedTypeIds: ['weightKg', 'waistCm', 'bodyFatPercent'] },
    // بيانات المستخدم الشخصية تبدأ فارغة دائمًا — لا تمارين مُسجّلة ولا قياسات جسم مزروعة.
    // (المستخدم الحقيقي يملؤها بنفسه؛ العيّنة الغنية تظهر في وضع النموذج فقط عبر DemoCustomizationProvider.)
    workouts: [],
    supplements: defaultSupplements.map((s) => ({
      name: s.name,
      dose: s.dose,
      timing: s.timing,
      type: s.type,
    })),
    meals: defaultMeals.map((m) => ({
      name: m.name,
      time: m.time,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fats: m.fats,
    })),
    metrics: [],
    routine: weeklyRoutine.map((r) => ({
      day: r.day,
      title: r.title,
      type: r.type,
    })),
  }
}

/**
 * هجرة الأهداف الملغاة في الملف المحفوظ (تتغيّر بصمة الملف فتُعاد الأهداف حسابها في withFreshTargets):
 * - «إعادة التكوين» (recomposition) → «تنشيف» (cutting، TDEE−400).
 * - «القوة» (strength، أُلغي في P2.5) → «تضخيم» (bulking، TDEE+300).
 */
function migrateLegacyGoal(p: Profile): Profile {
  if (p.goalType === 'recomposition') return { ...p, goalType: 'cutting', goal: 'cut' }
  if ((p.goalType as string) === 'strength') return { ...p, goalType: 'bulking', goal: 'bulk' }
  return p
}

/**
 * هجرة حساب قاصر حالي (Option B، قرار المالك): من كان دون 18 واختار تنشيف/تضخيم سابقًا
 * يُحوَّل هدفه إلى «المحافظة» عند الإقلاع، مرّة واحدة وبإشعار لطيف. الهجرة:
 * - **idempotent**: بعدها يصبح الهدف maintenance فيتعذّر تكرارها؛ والختم الزمني يُحفظ ولا يُستبدل.
 * - **مقيّدة بالمالك**: تعيش داخل التخصيص المخزّن (يُمسح عند تبديل الحساب عبر wipeUserData).
 * - إلغاء بصمة الحساب يُجبر `withFreshTargets` على إعادة حساب سعرات المحافظة تلقائيًا.
 */
function migrateMinorGoal(c: Customization): Customization {
  const isCutOrBulk = c.profile.goalType === 'cutting' || c.profile.goalType === 'bulking'
  if (!isMinorAge(c.profile.age) || !isCutOrBulk) return c
  return {
    ...c,
    profile: { ...c.profile, goalType: 'maintenance', goal: 'maintain' },
    targetsMeta: {
      ...c.targetsMeta,
      minorGoalMigratedAt: c.targetsMeta.minorGoalMigratedAt ?? new Date().toISOString(),
      lastCalculatedFromProfileHash: undefined, // يُجبر إعادة حساب المحافظة في withFreshTargets
    },
  }
}

// ════════════════════════════════════════════════════════════════════════
// [SOVEREIGN-RECOVERY-001] تسلسل حالات الخطة — تصريح لا استبدال صامت
// ════════════════════════════════════════════════════════════════════════
//
// ما كان يحدث: `catch { return base }`. أي أن **ثلاثة أبواب مختلفة تمامًا**
// تخرج من الباب نفسه، بلا فرق يستطيع أي مستدعٍ رؤيته:
//   ١. بايتات تالفة (JSON.parse يرمي)      ← بيانات مستخدم حقيقي فُقدت
//   ٢. لا مفتاح أصلًا                        ← جهاز جديد، وهذا مشروع
//   ٣. التخزين محجوب (SecurityError)        ← بيانات المستخدم سليمة على القرص!
// والنتيجة في الحالتين ١ و٣: خطة **مختلَقة** (٢٤ سنة · ٨٦ كجم · جسم كامل ×٣ ·
// ٢٢٩٤ سعرة) تُعرض على صاحب خطة حقيقية (٢٢ سنة · ٩٢ كجم · علوي-سفلي ×٤ ·
// ٢١٠٦ سعرة) على أنها خطته.
//
// التسلسل الآن صريح ومُنمَّط، بأربع مراتب:
//   ١. `saved`           — تخصيص صالح.
//   ٢. `recoverable`     — تعذّرت قراءته **وملف الإعداد سليم** ⇒ يُعاد بناؤه بالضبط.
//   ٣. `unreadable`      — تعذّرت قراءته ولا مصدر لإعادة البناء ⇒ مسار استرجاع صادق.
//   ٤. `storage-blocked` — التخزين محجوب ⇒ عطل بيئة، لا فقد بيانات، ولا وعد كاذب.
//   +  `absent`          — لا خطة بعد (جهاز جديد) — **يُميَّز عن الثلاثة أعلاه**.

/** حالة قراءة التخصيص — صريحة، يستطيع كل مستدعٍ التفريق بها. */
export type CustomizationLoadState =
  | 'saved'
  | 'absent'
  | 'recoverable'
  | 'unreadable'
  | 'storage-blocked'

/** السبب الفنّي للفشل — للتشخيص والإثبات، لا نصًّا يُعرض للمستخدم. */
export type CustomizationLoadReason = 'parse' | 'shape' | 'blocked'

export interface CustomizationLoad {
  state: CustomizationLoadState
  /**
   * القيمة القابلة للعرض. في **كل حالة غير `saved`** هي الافتراضي موسومًا
   * `isDefault: true` — فلا يستطيع أي سطح أن يقدّمها «خطتك» بحسن نيّة.
   */
  customization: Customization
  reason?: CustomizationLoadReason
}

/**
 * مفتاح ملف الإعداد — مُكرَّر هنا **عمدًا**: `onboardingProfile.ts` يستورد من هذا
 * الملف، فاستيراده منه يصنع دورة استيراد ساكنة. والتكرار **محروس**: إثبات
 * `test:plan-recovery` يستورد `ONBOARDING_PROFILE_KEY` من مصدره ويؤكّد تطابقه
 * حرفيًّا — فإن انزاح أحدهما سقط الإثبات باسمه (الميثاق §4.2).
 */
const ONBOARDING_PROFILE_KEY_MIRROR = 'qimmah:onboarding:profile:v1'

/** هل يوجد ملف إعداد **مكتمل** صالح لإعادة البناء منه؟ لا يرمي أبدًا. */
function hasRecoverySource(): boolean {
  const raw = readRaw(ONBOARDING_PROFILE_KEY_MIRROR)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { _meta?: { completed?: unknown } } | null
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
    return parsed._meta?.completed === true
  } catch {
    return false
  }
}

// ── التحقّق من الشكل عند القراءة ──────────────────────────────────────────
//
// الدمج القديم كان يقبل كل شيء: `age: "abc"` و`workoutPlan: 42` و`heightCm: -5`
// كلّها تنجو وتُدمج فوق الافتراضي فتنتج **هجينًا مختلط الأنواع** لا يتحقّق منه أحد
// لاحقًا — أسوأ من التلف الكامل، لأن التلف الكامل يعطي كائنًا متماسكًا (وإن كاذبًا).
// النمط المُتّبع هو نمط `activeWorkout.ts:97` القائم في المستودع: فحص شكل صارم،
// وأي انحراف يعني «تالف». **ونرفض قيمة قبل أن نخترع واحدة.**

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** مدى معقول لكل حقل رقمي في الملف — خارجه = تالف، لا «يُصلَّح» بقيمة مخترعة. */
const PROFILE_NUMBER_RANGES: Record<string, [number, number]> = {
  age: [5, 120],
  heightCm: [80, 260],
  weightKg: [15, 400],
  targetWeightKg: [15, 400],
  trainingDays: [0, 7],
  workoutDuration: [5, 300],
  mealsPerDay: [1, 12],
}

function profileShapeOk(v: unknown): boolean {
  if (v === undefined) return true
  if (!isPlainObject(v)) return false
  for (const [field, [min, max]] of Object.entries(PROFILE_NUMBER_RANGES)) {
    const raw = v[field]
    if (raw === undefined) continue
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < min || raw > max) return false
  }
  for (const field of ['name', 'gender', 'goal', 'goalType', 'injuries', 'healthNotes'] as const) {
    if (v[field] !== undefined && typeof v[field] !== 'string') return false
  }
  if (v.trackNutrition !== undefined && typeof v.trackNutrition !== 'boolean') return false
  if (v.equipment !== undefined && !Array.isArray(v.equipment)) return false
  if (v.injuryAreas !== undefined && !Array.isArray(v.injuryAreas)) return false
  return true
}

function workoutPlanShapeOk(v: unknown): boolean {
  if (v === undefined) return true
  if (!isPlainObject(v)) return false
  if (!Array.isArray(v.days)) return false
  if (v.templateId !== undefined && typeof v.templateId !== 'string') return false
  return v.days.every((d) => isPlainObject(d))
}

/**
 * فحص شكل صارم للتخصيص المقروء. `true` = يمكن الدمج بأمان؛ `false` = تالف.
 * الغياب مقبول (الافتراضي يكمّله)، لكن **الحضور بشكل خاطئ مرفوض**.
 */
/**
 * حقول `targets` النصّية بطبعها — مصدر واحد بدل تخمين «ما ينتهي بـLabel».
 *
 * [SOVEREIGN-RECOVERY-001] القاعدة الأولى كانت «كل ما لا ينتهي بـ`Label` رقم»،
 * وهي **ترفض ما يكتبه المنتج نفسه**: `suggestedTrainingSplit` و`notes` نصّان في
 * `Targets` منذ الأصل. فكان كل ملف مستخدم حقيقي يُقرأ «غير قابل للقراءة» —
 * أي أن حارس التلف كان سيصنّف **الجميع** تالفين ويعرض عليهم الافتراضي: نفس
 * العطل الذي جاء ليغلقه، معمَّمًا. التُقط بكتابة الملف بكاتب المنتج ثم قراءته.
 */
const TARGET_TEXT_FIELDS = new Set(['suggestedTrainingSplit', 'notes'])

export function isReadableCustomizationShape(v: unknown): v is Partial<Customization> {
  if (!isPlainObject(v)) return false
  if (!profileShapeOk(v.profile)) return false
  if (!workoutPlanShapeOk(v.workoutPlan)) return false
  if (v.identity !== undefined) {
    if (!isPlainObject(v.identity)) return false
    for (const f of ['userName', 'brandName', 'tagline', 'mainGoal', 'userType'] as const) {
      if (v.identity[f] !== undefined && typeof v.identity[f] !== 'string') return false
    }
  }
  if (v.targets !== undefined) {
    if (!isPlainObject(v.targets)) return false
    for (const [k, val] of Object.entries(v.targets)) {
      if (k.endsWith('Label') || TARGET_TEXT_FIELDS.has(k)) {
        // الحقول النصّية تبقى محروسة كنصوص — لا تُترك بلا نوع.
        if (val !== undefined && typeof val !== 'string') return false
        continue
      }
      if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val))) return false
    }
  }
  for (const f of ['sections', 'colors', 'targetsMeta', 'nutritionPlan', 'wellnessPlan', 'commitmentPlan', 'measurementPlan'] as const) {
    if (v[f] !== undefined && !isPlainObject(v[f])) return false
  }
  for (const f of ['workouts', 'supplements', 'meals', 'metrics', 'routine'] as const) {
    if (v[f] !== undefined && !Array.isArray(v[f])) return false
  }
  if (v.settingsUpdatedAt !== undefined && typeof v.settingsUpdatedAt !== 'string') return false
  return true
}

/** الافتراضي **موسومًا** — لا يخرج من هذا الملف افتراضٌ بلا وسم في حالة فشل. */
function markedDefault(): Customization {
  return { ...getDefaultCustomization(), isDefault: true }
}

function fallbackLoad(state: Exclude<CustomizationLoadState, 'saved'>, reason?: CustomizationLoadReason): CustomizationLoad {
  return { state, customization: markedDefault(), ...(reason ? { reason } : {}) }
}

function corruptLoad(reason: CustomizationLoadReason): CustomizationLoad {
  return fallbackLoad(hasRecoverySource() ? 'recoverable' : 'unreadable', reason)
}

/**
 * **القارئ الصادق.** يُرجع الحالة صريحةً مع القيمة، ولا يرمي أبدًا.
 * كل مستدعٍ يستطيع الآن التفريق بين «لا خطة بعد» و«ما قدرنا نقرأ خطتك»
 * و«التخزين محجوب» — وهي فروق كانت مطويّة في `catch` واحد.
 */
export function readCustomization(): CustomizationLoad {
  if (typeof window === 'undefined') return fallbackLoad('absent')
  if (!isStorageAvailable()) return fallbackLoad('storage-blocked', 'blocked')
  const raw = readRaw(STORAGE_KEY)
  if (raw === null) return fallbackLoad('absent')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return corruptLoad('parse')
  }
  if (!isReadableCustomizationShape(parsed)) return corruptLoad('shape')
  const saved = parsed
  const base = getDefaultCustomization()
  try {
    const merged: Customization = {
      identity: { ...base.identity, ...saved.identity },
      colors: { ...base.colors, ...saved.colors },
      sections: { ...base.sections, ...saved.sections },
      profile: migrateLegacyGoal({ ...base.profile, ...saved.profile }),
      targets: { ...base.targets, ...saved.targets },
      targetsMeta: { ...base.targetsMeta, ...saved.targetsMeta },
      // تطبيع أسماء الأيام وقت القراءة (P10.1): خطط قديمة بلا nameEn تُكمَّل تلقائيًا.
      workoutPlan: normalizePlanDayNames(saved.workoutPlan ?? base.workoutPlan),
      nutritionPlan: saved.nutritionPlan
        ? { ...base.nutritionPlan, ...saved.nutritionPlan }
        : base.nutritionPlan,
      wellnessPlan: saved.wellnessPlan
        ? { ...base.wellnessPlan, ...saved.wellnessPlan }
        : base.wellnessPlan,
      commitmentPlan: saved.commitmentPlan
        ? { ...base.commitmentPlan, ...saved.commitmentPlan }
        : base.commitmentPlan,
      measurementPlan: saved.measurementPlan
        ? { ...base.measurementPlan, ...saved.measurementPlan }
        : base.measurementPlan,
      workouts: saved.workouts ?? base.workouts,
      supplements: saved.supplements ?? base.supplements,
      meals: saved.meals ?? base.meals,
      metrics: saved.metrics ?? base.metrics,
      routine: saved.routine ?? base.routine,
      ...(typeof saved.settingsUpdatedAt === 'string' && saved.settingsUpdatedAt
        ? { settingsUpdatedAt: saved.settingsUpdatedAt }
        : {}),
    }
    return { state: 'saved', customization: withFreshTargets(migrateMinorGoal(merged)) }
  } catch {
    // انهيار غير متوقّع في الدمج/الهجرة يبقى **تلفًا معلنًا**، لا استبدالًا صامتًا.
    return corruptLoad('shape')
  }
}

/**
 * سطح التوافق لثلاثة عشر مستدعيًا قائمًا. الفرق الجوهري عن السابق: ما يعود في
 * حالة الفشل **موسوم `isDefault: true`** — فلم يعد ممكنًا عرضه «خطتك» بلا كذب.
 * من يحتاج التفريق يستدعي `readCustomization()`.
 */
export function loadCustomization(): Customization {
  return readCustomization().customization
}

/**
 * يعيد حساب الأهداف من الملف الشخصي عند تغيّره (أو تحديث صيغة الحساب) ما لم تُعدَّل يدويًا،
 * ثم يزامن أهداف خطة التغذية (سعرات/ماكروز/ماء) مع الأهداف الجديدة مع إبقاء الوجبات.
 * هذا يضمن أن المتابعة واللوحة تعكسان حسابات صحيحة دائمًا.
 */
function withFreshTargets(c: Customization): Customization {
  if (c.targetsMeta.manuallyEdited) return c
  const hash = profileHash(c.profile)
  if (c.targetsMeta.lastCalculatedFromProfileHash === hash) return c
  const targets = computeTargets(c.profile)
  return {
    ...c,
    targets,
    targetsMeta: { ...c.targetsMeta, lastCalculatedFromProfileHash: hash },
    nutritionPlan: {
      ...c.nutritionPlan,
      targetCalories: targets.targetCalories,
      targetProtein: targets.proteinGrams,
      targetCarbs: targets.carbsGrams,
      targetFat: targets.fatGrams,
      targetWaterLiters: targets.waterLiters,
    },
  }
}

/**
 * حقول تعريف الخطة: تغييرها فوق خطة قائمة **يُنتج حالة مدفوعة**، وهو تعريف
 * `plan.saveEdit` في `access/paidActions.ts`. وما عداها (ألوان، وحدات، إعدادات
 * حساب) يبقى حرًّا — فالحارس أدناه لا يقفل الإعدادات، يقفل تحوير الخطة.
 */
const PLAN_IDENTITY_FIELDS = [
  'goal', 'goalType', 'trainingDays', 'workoutDuration', 'workoutEnvironment', 'trainingLevel',
] as const

/**
 * «هل هذا تحوير لخطة قائمة؟» — مسند واحد يستهلكه الكاتب **والمعالج** معًا.
 * وجود مسندين متقاربين هو ما أنتج الاستثناء الخام: المعالج فحص اكتمال ملف
 * الإعداد، والكاتب فحص علم الجهاز — فلم يفتح الأول البوّابة ورمى الثاني.
 *
 * ── [FINAL-CONVERGENCE] المالك يُقرأ، ولا يُفترض ضيفًا ──────────────────────
 * كان النداء `isOnboardingComplete(null)` — و`null` تعني حرفيًا **علم الجهاز**.
 * و`markCompleted(userId)` لا يمسّ علم الجهاز عمدًا للمسجَّل (كي لا «يتسرّب»
 * الإكمال لحساب جديد لاحقًا). فالنتيجة أن المسند كان يعود `false` لكل
 * **مستخدم مسجَّل** أكمل إعداده وهو داخل حسابه — أي أن حارس `plan.saveEdit`
 * كان ميتًا على الشريحة المدفوعة بالضبط، وحيًّا على الضيف وحده.
 *
 * `getLastUser()` هو قارئ المالك خارج React (نفس ما يستهلكه `dataPortability`):
 * نصّ = حساب فيُقرأ سجلّ الحسابات · `null`/`undefined` = ضيف فيُقرأ علم الجهاز.
 */
export function isExistingPlanEdit(): boolean {
  return hasSavedCustomization() && isOnboardingComplete(getLastUser() ?? null)
}

/** خيارات الكتابة — النيّة تُصرَّح، ولا تُفترض. */
export interface SaveCustomizationOptions {
  /**
   * من بدأ الكتابة. الافتراض `'user-edit'` — أي أن **السكوت يعني الحراسة**،
   * فلا يتسلّل مسار جديد بلا بوّابة لمجرّد أنه لم يذكر نيّته.
   */
  intent?: WriteIntent
}

/**
 * يكتب التخصيص ويُرجع **نتيجة صادقة**.
 *
 * كان التوقيع `: void`، أي أن فشل الكتابة **غير قابل للتبليغ بنيويًّا**: شاشة
 * النجاح لا تستطيع فحص ما لم يُقَل لها. ومع ذلك كان الطابور يُشحن دائمًا — فكتابة
 * لم تصل القرص كانت تدخل طابور المزامنة وتصير «الحقيقة» في السحابة.
 *
 * الآن: `WriteResult` عائدة، **والمزامنة لا تُشحن إلا على `'ok'`**.
 */
export function saveCustomization(value: Customization, opts?: SaveCustomizationOptions): WriteResult {
  if (typeof window === 'undefined') return 'unavailable'
  const intent = opts?.intent ?? 'user-edit'
  // ── [PHASE-II] حدّ التحوير الثاني ────────────────────────────────────────
  // هذا هو الكاتب الفعلي لـ`qimmah:customization:v1`. مسار «الإعدادات → تعديل
  // خطتي» يصل إليه **دون** المرور بـ`saveOnboardingProfile`، فحراسة ذاك وحده
  // تركت هذا الباب مفتوحًا: معاينة غيّرت الهدف cut → bulk وثبت بعد إعادة التحميل.
  //
  // شرطان معًا حتى لا يُقفل القمع المجاني:
  //   • تخصيص محفوظ موجود أصلًا، و
  //   • الإعداد مكتمل على هذا الجهاز — أي أن هناك خطة قائمة تُحوَّر لا تُنشأ.
  // أوّل إكمال يمرّ حرًّا (ميثاق §0.1)، وتغيير لون أو وحدة يمرّ حرًّا دائمًا.
  //
  // ── [SOVEREIGN-RECOVERY-001] والإصلاح ليس تحويرًا ────────────────────────
  // كتابة إصلاح تمرّ من `assertWriteAllowed` ببرهان حيّ: `readCustomization()`
  // يجب أن يقول إن المخزن ليس `'saved'`. فوق مخزن سليم يسقط الادّعاء بخطأ
  // مسمّى `RepairIntentRejected` — والحارس على التحوير الحقيقي لم يُمسّ.
  if (intent === 'system-repair') {
    assertWriteAllowed('plan.saveEdit', intent, () => readCustomization().state !== 'saved')
  } else if (isExistingPlanEdit()) {
    const prev = loadCustomization()
    const planChanged = PLAN_IDENTITY_FIELDS.some((f) => prev.profile?.[f] !== value.profile?.[f])
    if (planChanged) assertPaid('plan.saveEdit')
  }
  const stamped: Customization = { ...value, settingsUpdatedAt: new Date().toISOString() }
  // وسم الاختلاق لا يُخزَّن أبدًا: ما يُكتب صار خطة حقيقية بحكم كتابتها.
  delete stamped.isDefault
  const result = safeWriteJson(STORAGE_KEY, stamped)
  if (result !== 'ok') return result
  // مزامنة إعدادات الحساب (P12): شريحة الحساب فقط تركب صف profiles (data.settings)
  // بمفتاح كيان مستقل عن onboarding كي لا يستبدل أحدهما الآخر في دمج الطابور.
  // **لا تُشحن إلا بعد `'ok'`** — طابور يحمل ما لم يهبط على القرص يزوّر LWW.
  enqueueSyncOperation('profiles', 'settings', {
    data: { settings: accountSettingsSlice(stamped) },
    updated_at: stamped.settingsUpdatedAt,
  })
  return 'ok'
}

// ════════════════════════════════════════════════════════════════════════
// [SOVEREIGN-RECOVERY-001] الاسترجاع: اكتشِف ← أعِد البناء ← تحقّق ← نظِّف
// ════════════════════════════════════════════════════════════════════════

/** نتيجة محاولة استرجاع — مُنمَّطة، وكل فشل فيها **مسمّى**. */
export type RecoveryOutcome =
  | { ok: true; customization: Customization }
  | { ok: false; reason: 'not-needed' | 'no-source' | 'storage-blocked' | 'write-failed'; write?: WriteResult }

/**
 * يعيد بناء التخصيص من ملف الإعداد السليم.
 *
 * ثلاث حقائق مقيسة تجعل هذا صحيحًا لا تقريبيًا:
 *  • المفتاحان منفصلان (`qimmah:customization:v1` ≠ `qimmah:onboarding:profile:v1`)
 *    فيتلف أحدهما ويبقى الآخر.
 *  • المولّد **بلا عشوائية وبلا ساعة** — فإعادة البناء حتمية ومطابقة.
 *  • ما يخرج منه هو خطة المستخدم الحقيقية (٢٢ سنة · ٩٢ كجم · علوي-سفلي ×٤ ·
 *    ٢١٠٦ سعرة)، لا الافتراضي المختلَق.
 *
 * **الترتيب مقصود:** لا تُنظَّف البايتات التالفة إلا بعد كتابة ناجحة **مُتحقَّق
 * منها بقراءة ثانية**. الحذف أوّلًا ثم فشل الكتابة = فقدان بيانات ثانٍ بأيدينا.
 *
 * والاستدعاء **يدوي بطبعه** (لا تلقائي عند الإقلاع): الميثاق §8/قرار ٣ يجعل
 * تغييرات الخطة اقتراحًا دائمًا في v1، فالسطح يعرض ويسأل، وهذه تنفّذ عند القبول.
 */
export async function recoverCustomizationFromOnboarding(): Promise<RecoveryOutcome> {
  const before = readCustomization()
  if (before.state === 'saved') return { ok: false, reason: 'not-needed' }
  if (before.state === 'storage-blocked') return { ok: false, reason: 'storage-blocked' }
  if (before.state !== 'recoverable') return { ok: false, reason: 'no-source' }

  // استيراد ديناميكي: `onboardingProfile` يستورد من هذا الملف، والاستيراد
  // الساكن المقابل يصنع دورة تُقيَّم وقت الإقلاع.
  const { loadOnboardingProfile, buildCustomizationFromOnboarding } = await import('./onboardingProfile')
  const op = loadOnboardingProfile()
  if (!op || op._meta?.completed !== true) return { ok: false, reason: 'no-source' }

  const rebuilt = await buildCustomizationFromOnboarding(op, getDefaultCustomization())
  const write = saveCustomization(rebuilt, { intent: 'system-repair' })
  if (write !== 'ok') return { ok: false, reason: 'write-failed', write }

  // التحقّق بعد الكتابة — «نجحت الكتابة» ادّعاء يُفحَص، لا يُصدَّق.
  const after = readCustomization()
  if (after.state !== 'saved') return { ok: false, reason: 'write-failed', write }
  return { ok: true, customization: after.customization }
}

/**
 * كتابة إعدادات الحساب من مسار المزامنة (hydrate) بعد فوزها بالـLWW: حقول الحساب
 * تُدمج فوق المحلي، حقول الجهاز (ألوان/هوية علامة/صفوف القالب/workoutPlan) تبقى
 * كما هي، والطابع المحفوظ هو طابع السحابة (لا إعادة ختم بـ«الآن» — وإلا انقلب LWW).
 *
 * [SOVEREIGN-RECOVERY-001] تُرجع `WriteResult`: ترطيبٌ فشل كان لا يُميَّز عن ترطيب نجح.
 */
export function applyAccountSettingsFromSync(slice: Partial<AccountSettings>, stamp: string): WriteResult {
  if (typeof window === 'undefined' || !slice || typeof slice !== 'object') return 'unavailable'
  const local = loadCustomization()
  const merged: Customization = {
    ...local,
    identity: { ...local.identity, ...slice.identity },
    sections: { ...local.sections, ...slice.sections },
    profile: { ...local.profile, ...slice.profile },
    targets: { ...local.targets, ...slice.targets },
    targetsMeta: { ...local.targetsMeta, ...slice.targetsMeta },
    nutritionPlan: slice.nutritionPlan ? { ...local.nutritionPlan, ...slice.nutritionPlan } : local.nutritionPlan,
    wellnessPlan: slice.wellnessPlan ? { ...local.wellnessPlan, ...slice.wellnessPlan } : local.wellnessPlan,
    commitmentPlan: slice.commitmentPlan ? { ...local.commitmentPlan, ...slice.commitmentPlan } : local.commitmentPlan,
    measurementPlan: slice.measurementPlan
      ? { ...local.measurementPlan, ...slice.measurementPlan }
      : local.measurementPlan,
    settingsUpdatedAt: stamp,
  }
  delete merged.isDefault
  return safeWriteJson(STORAGE_KEY, merged)
}

export function clearCustomization(): void {
  safeRemove(STORAGE_KEY)
}

/**
 * «هل على هذا الجهاز خطة محفوظة **قابلة للقراءة**؟»
 *
 * كانت: `window.localStorage.getItem(KEY) !== null` — بلا `try/catch`. عيبان:
 *  ١. **ترمي** `SecurityError` حين يكون التخزين محجوبًا (مجرّد لمس `localStorage`
 *     يرمي). والرمي كان ينتشر إلى `isExistingPlanEdit` ← `saveCustomization`
 *     و`OnboardingV2` و`workoutCalendar` و`notifications/*` — فتظهر شاشة «ما
 *     قدرنا نجهّز الخطة» بزرّ إعادة **لا ينجح أبدًا** لأن السبب ليس عابرًا.
 *  ٢. تقول «محفوظ» عن بايتات **تالفة**، فتسمّم سبعة حرّاس أدناها — أهمّها حارس
 *     `plan.saveEdit`: مستخدمٌ فقدَ خطته يُطالَب بالدفع ليعيد إعدادها.
 *
 * الآن: تفشل **مغلقة وصادقة** — `false` عند الحجب وعند التلف وعند الغياب،
 * والتفريق بين الثلاثة متاح لمن يريده عبر `readCustomization().state`.
 */
export function hasSavedCustomization(): boolean {
  return readCustomization().state === 'saved'
}

/**
 * هل التخزين محجوب الآن؟ سؤال بيئة لا سؤال بيانات — يفصل «ما عندك خطة»
 * عن «ما نقدر نقرأ». يستهلكه السطح ليقول الصدق بدل عرض إعداد جديد.
 */
export function isCustomizationStorageBlocked(): boolean {
  return readCustomization().state === 'storage-blocked'
}
