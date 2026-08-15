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
import { assertPaid } from '@/lib/access/guard'
import type { WorkoutPlan } from '@/types/workout'
import { generatePlanFromTemplate } from './workoutPlan'
import { normalizePlanDayNames } from './planDayNames'
import type { NutritionPlan } from '@/types/nutrition'
import { defaultNutritionPlan } from './nutritionPlan'
import type { WellnessPlan } from '@/types/wellness'
import type { CommitmentPlan, MeasurementPlan } from '@/types/progress'
import { defaultCommitmentPlan } from './commitmentPlan'
import { safeRemove, safeWriteJson } from '@/lib/safeStorage'

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

/** قراءة التخصيص المحفوظ مدموجًا فوق الافتراضي (آمن ضد بيانات تالفة). */
export function loadCustomization(): Customization {
  const base = getDefaultCustomization()
  if (typeof window === 'undefined') return base
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Customization>
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
    return withFreshTargets(migrateMinorGoal(merged))
  } catch {
    return base
  }
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

export function saveCustomization(value: Customization): void {
  if (typeof window === 'undefined') return
  // ── [PHASE-II] حدّ التحوير الثاني ────────────────────────────────────────
  // هذا هو الكاتب الفعلي لـ`qimmah:customization:v1`. مسار «الإعدادات → تعديل
  // خطتي» يصل إليه **دون** المرور بـ`saveOnboardingProfile`، فحراسة ذاك وحده
  // تركت هذا الباب مفتوحًا: معاينة غيّرت الهدف cut → bulk وثبت بعد إعادة التحميل.
  //
  // شرطان معًا حتى لا يُقفل القمع المجاني:
  //   • تخصيص محفوظ موجود أصلًا، و
  //   • الإعداد مكتمل على هذا الجهاز — أي أن هناك خطة قائمة تُحوَّر لا تُنشأ.
  // أوّل إكمال يمرّ حرًّا (ميثاق §0.1)، وتغيير لون أو وحدة يمرّ حرًّا دائمًا.
  if (isExistingPlanEdit()) {
    const prev = loadCustomization()
    const planChanged = PLAN_IDENTITY_FIELDS.some((f) => prev.profile?.[f] !== value.profile?.[f])
    if (planChanged) assertPaid('plan.saveEdit')
  }
  const stamped: Customization = { ...value, settingsUpdatedAt: new Date().toISOString() }
  safeWriteJson(STORAGE_KEY, stamped)
  // مزامنة إعدادات الحساب (P12): شريحة الحساب فقط تركب صف profiles (data.settings)
  // بمفتاح كيان مستقل عن onboarding كي لا يستبدل أحدهما الآخر في دمج الطابور.
  enqueueSyncOperation('profiles', 'settings', {
    data: { settings: accountSettingsSlice(stamped) },
    updated_at: stamped.settingsUpdatedAt,
  })
}

/**
 * كتابة إعدادات الحساب من مسار المزامنة (hydrate) بعد فوزها بالـLWW: حقول الحساب
 * تُدمج فوق المحلي، حقول الجهاز (ألوان/هوية علامة/صفوف القالب/workoutPlan) تبقى
 * كما هي، والطابع المحفوظ هو طابع السحابة (لا إعادة ختم بـ«الآن» — وإلا انقلب LWW).
 */
export function applyAccountSettingsFromSync(slice: Partial<AccountSettings>, stamp: string): void {
  if (typeof window === 'undefined' || !slice || typeof slice !== 'object') return
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
  safeWriteJson(STORAGE_KEY, merged)
}

export function clearCustomization(): void {
  safeRemove(STORAGE_KEY)
}

export function hasSavedCustomization(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) !== null
}
