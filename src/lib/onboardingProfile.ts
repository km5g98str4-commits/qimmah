// تخزين/هجرة/تسليم مصدر الحقيقة للإعداد (Qimmah Phase 1).
// - مفتاح مُصدَّر منفصل عن التخصيص: qimmah:onboarding:profile:v1
// - يقرأ بأمان فوق الافتراضي (لا يتعطّل على بيانات قديمة/تالفة).
// - يهاجر من شكل التخصيص/الملف القديم عند الإمكان، وإلا إعداد فارغ آمن (لا بيانات وهمية).
// - يحوّل مصدر الحقيقة إلى Profile الذي يفهمه مولّد الخطة الحالي (تسليم لـ Agent B/C جاهز).

import type {
  Environment,
  NeatLevel,
  OnbConsistency,
  OnbGoalType,
  OnboardingProfile,
} from '@/types/onboarding'
import { ONBOARDING_SCHEMA_VERSION } from '@/types/onboarding'
import type {
  ActivityLevel,
  Consistency,
  GoalType,
  GymType,
  NutritionStyle,
  Profile,
} from '@/types/profile'
import type { ExperienceLevel } from '@/types/profile'
import {
  calorieGoalFromGoalType,
  computeTargets,
  defaultProfile,
  profileHash,
} from '@/lib/calculators'
import {
  deriveTargetWeight,
  generatePlan,
  levelFromExperience,
} from '@/lib/planGenerator'
import { experienceToBand, goalChoices, gymTypeToAccess } from '@/data/planBuilder'
import type { Customization } from '@/lib/customization'
import { hasSavedCustomization, loadCustomization } from '@/lib/customization'
import { loadOnboarding } from '@/lib/onboarding'
import { readRaw, removeKey, writeJson } from './safeStorage'

export const ONBOARDING_PROFILE_KEY = 'qimmah:onboarding:profile:v1'

// ===== الافتراضي الآمن (لا بيانات وهمية) =====

/** إعداد فارغ آمن — لا اسم، لا مكملات/أدوية، تتبّع none، عربية مثبّتة. */
export function defaultOnboardingProfile(): OnboardingProfile {
  return {
    profile: {},
    bodyMetrics: {},
    goal: {},
    trainingPreferences: {},
    activityProfile: {},
    nutritionPreferences: {},
    foodPreferences: { dislikedFoods: [], allergies: [] },
    limitations: { injuries: [] },
    wellnessTracking: { mode: 'none', supplements: [], medications: [] },
    appPreferences: { language: 'ar', reminders: false },
    _meta: { schemaVersion: ONBOARDING_SCHEMA_VERSION, completed: false, source: 'onboarding' },
  }
}

/**
 * دمج آمن لقسم محفوظ فوق الافتراضي — **محصَّن ضد الأنواع الغريبة**.
 *
 * الدمج السطحي القديم كان يسمح لملف محفوظ فيه `"injuries": null` بأن يتجاوز الافتراضي `[]`،
 * فينفجر `null.join('، ')` لاحقًا أثناء توليد الخطة → استثناء غير ملتقَط يُبيّض الشاشة.
 * القواعد هنا (عامة، فلا يتكرّر العطل في أي حقل مصفوفي آخر):
 *  1. القسم المحفوظ يجب أن يكون كائنًا (لا مصفوفة ولا نصًّا) وإلا نرجع الافتراضي كاملًا.
 *  2. الحقل الذي افتراضيه **مصفوفة** لا يُقبل إلا مصفوفة، وتُنقّى عناصرها إلى نصوص غير فارغة
 *     (كل الحقول المصفوفية في مصدر الحقيقة هي string[]).
 *  3. `null`/`undefined` الصريحان لا يتجاوزان الافتراضي أبدًا (يُهمَلان).
 * أي حقل تالف يسقط وحده — بقيّة القسم تنجو (لا إعادة تعيين كاملة للمستخدم).
 */
function mergeSection<T extends object>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base
  const out: T = { ...base }
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    if (v === null || v === undefined) continue
    const key = k as keyof T
    if (Array.isArray(base[key])) {
      // حقل مصفوفي: نقبل المصفوفات فقط، وننقّي العناصر إلى نصوص.
      if (!Array.isArray(v)) continue
      out[key] = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') as T[keyof T]
      continue
    }
    out[key] = v as T[keyof T]
  }
  return out
}

/** مصفوفة نصوص مضمونة — حارس أخير عند نقاط الاستهلاك (حزام وحمّالة). */
function safeStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
}

/**
 * هجرة الهدف الملغى «recomp» (إعادة تركيب الجسم) → «cut» عند القراءة.
 * أي ملف محفوظ قديمًا بهدف recomp يُحمَّل بأمان ويُعاد حساب أهدافه بصيغة التنشيف (لا تعطّل).
 */
function migrateLegacyOnbGoal(goal: OnboardingProfile['goal']): OnboardingProfile['goal'] {
  if ((goal.type as string) === 'recomp') return { ...goal, type: 'cut' }
  return goal
}

// ===== التخزين =====

/** يبني مصدر حقيقة كاملًا من كائن محفوظ (سليم أو تالف جزئيًا) فوق الافتراضي. */
function mergeSavedProfile(saved: unknown): OnboardingProfile {
  const s = (saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}) as Partial<OnboardingProfile>
  const base = defaultOnboardingProfile()
  return {
    profile: mergeSection(base.profile, s.profile),
    bodyMetrics: mergeSection(base.bodyMetrics, s.bodyMetrics),
    goal: migrateLegacyOnbGoal(mergeSection(base.goal, s.goal)),
    trainingPreferences: mergeSection(base.trainingPreferences, s.trainingPreferences),
    activityProfile: mergeSection(base.activityProfile, s.activityProfile),
    nutritionPreferences: mergeSection(base.nutritionPreferences, s.nutritionPreferences),
    foodPreferences: mergeSection(base.foodPreferences, s.foodPreferences),
    limitations: mergeSection(base.limitations, s.limitations),
    wellnessTracking: mergeSection(base.wellnessTracking, s.wellnessTracking),
    // اللغة مثبّتة عربية، ونسخة المخطّط دائمًا الحالية (لا نثق بقيمة محفوظة قديمة).
    appPreferences: { ...mergeSection(base.appPreferences, s.appPreferences), language: 'ar' },
    _meta: { ...mergeSection(base._meta, s._meta), schemaVersion: ONBOARDING_SCHEMA_VERSION },
  }
}

/**
 * يقرأ مصدر الحقيقة المحفوظ مدموجًا فوق الافتراضي (آمن ضد بيانات تالفة/قديمة).
 *
 * إنقاذ جزئي: ما دام النص يُحلَّل إلى كائن، **ننقذ كل قسم سليم** ونسقط الحقول التالفة وحدها
 * (عبر mergeSection) — بدل رفض الملف كاملًا لأن حقلًا واحدًا خرج عن نوعه.
 *
 * أما فشل التحليل الكلّي (بايت تالف يكسر JSON) فلا يمكن إنقاذ أقسامه بنظافة من نصّ مكسور،
 * ونرجع `null` **عمدًا**: هذا ليس «إعدادًا فارغًا» بل إشارة «لا مصدر حقيقة مقروء»،
 * وهي التي تفتح مسار الإنقاذ الأعلى في ensureOnboardingProfile (هجرة من التخصيص القديم المحفوظ)
 * قبل السقوط إلى إعداد فارغ. إرجاع كائن هنا كان سيقطع مسار الإنقاذ ذاك.
 */
export function loadOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === 'undefined') return null
  const raw = readRaw(ONBOARDING_PROFILE_KEY)
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  // نصّ يحلّل إلى قيمة غير كائن (مثل "null" أو رقم) = ملف غير مقروء → مسار الإنقاذ الأعلى.
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  return mergeSavedProfile(parsed)
}

export function saveOnboardingProfile(value: OnboardingProfile): void {
  if (typeof window === 'undefined') return
  try {
    writeJson(ONBOARDING_PROFILE_KEY, value)
  } catch {
    /* تجاهل أخطاء التخزين (وضع التصفّح الخاص …) */
  }
}

export function clearOnboardingProfile(): void {
  // removeKey لا يرمي أبدًا (تخزين محظور/خاص) — لا حاجة لـ try/catch هنا.
  removeKey(ONBOARDING_PROFILE_KEY)
}

// ===== خرائط مصدر-الحقيقة → الشكل القديم (للمولّد) =====

const GOAL_TO_GOALTYPE: Record<OnbGoalType, GoalType> = {
  bulk: 'bulking',
  cut: 'cutting',
  strength: 'strength',
}

const CONSISTENCY_TO_LEGACY: Record<OnbConsistency, Consistency> = {
  new: 'never',
  on_and_off: 'onoff',
  consistent: 'regular',
  returning: 'returning',
}

const ENVIRONMENT_TO_GYMTYPE: Record<Environment, GymType> = {
  commercial_gym: 'commercial',
  small_gym: 'small',
  home_gym: 'home',
  bodyweight: 'bodyweight',
}

const NEAT_TO_ACTIVITY: Record<NeatLevel, ActivityLevel> = {
  sedentary: 'sedentary',
  light: 'light',
  moderate: 'moderate',
  high: 'active',
}

const showsTargetWeight = (g?: OnbGoalType) => g === 'cut' || g === 'bulk'

/** يحوّل مصدر الحقيقة إلى Profile الذي يستهلكه مولّد الخطة الحالي. */
export function toLegacyProfile(op: OnboardingProfile, base: Profile = defaultProfile): Profile {
  // أقسام مضمونة الوجود: قد يصل كائن قديم/يدوي ينقصه قسم كامل — لا نُسقط الشاشة عليه.
  const tp = op.trainingPreferences ?? {}
  const goal = op.goal ?? {}
  const body = op.bodyMetrics ?? {}
  const activity = op.activityProfile ?? {}
  const nutrition = op.nutritionPreferences ?? {}
  const identity = op.profile ?? {}
  const goalType: GoalType = goal.type ? GOAL_TO_GOALTYPE[goal.type] : base.goalType
  const experienceLevel: ExperienceLevel | undefined = tp.experience
  const band = experienceLevel ? experienceToBand(experienceLevel) : base.experienceBand
  const trainingLevel = experienceLevel ? levelFromExperience(band) : base.trainingLevel
  const gymType: GymType = tp.environment ? ENVIRONMENT_TO_GYMTYPE[tp.environment] : (base.gymType ?? 'commercial')
  const gymAccess = gymTypeToAccess(gymType)
  const weightKg = body.currentWeightKg || base.weightKg
  const trainingDays = tp.daysPerWeek || base.trainingDays
  const consistency: Consistency = tp.consistency
    ? CONSISTENCY_TO_LEGACY[tp.consistency]
    : base.consistency ?? 'regular'
  // وزن الهدف يُسأل مرّة واحدة لـ cut/bulk فقط؛ القوة لا هدف وزن لها (لا مدة/تغيّر مضلّل).
  const targetWeightKg = showsTargetWeight(goal.type)
    ? body.targetWeightKg || deriveTargetWeight(weightKg, goalType)
    : weightKg
  // حركة الحياة (NEAT) مفصولة عن التمرين عمدًا في computeTargets:
  // المعامل الكلّي = NEAT + (أيام التمرين × 0.025).
  // لذلك عند غياب NEAT **لا نشتقّه من أيام التمرين** (deriveActivityLevel) — كان ذلك يحتسب
  // أيام التمرين مرّتين (مرّة داخل مستوى النشاط ومرّة في الإضافة) فيتضخّم TDEE في مسار الهجرة.
  // الافتراضي المحافظ = خامل (1.20)، وأثر التمرين يأتي من الأيام وحدها.
  const activityLevel: ActivityLevel = activity.neat
    ? NEAT_TO_ACTIVITY[activity.neat]
    : 'sedentary'
  // أسلوب التغذية الجديد دلالي (طريقة العرض)؛ نُبقي أسلوب الطبخ القديم للمولّد.
  const nutritionStyle: NutritionStyle = base.nutritionStyle ?? 'high_protein'
  const mealsPerDay = nutrition.mealsPerDay || base.mealsPerDay

  return {
    ...base,
    name: identity.name?.trim() || '',
    gender: identity.sex ?? 'unspecified',
    age: identity.age || base.age,
    heightCm: body.heightCm || base.heightCm,
    weightKg,
    targetWeightKg,
    activityLevel,
    trainingLevel,
    goal: calorieGoalFromGoalType(goalType),
    goalType,
    trainingDays,
    workoutDuration: tp.sessionDurationMin || base.workoutDuration,
    splitMode: tp.splitMode ?? 'auto',
    splitChoice: tp.splitMode === 'advanced' ? tp.advancedSplit : undefined,
    workoutEnvironment: gymAccess === 'home' || gymAccess === 'bodyweight' ? 'home' : 'gym',
    // حارس أخير: ملف قديم/تالف قد يحمل null مكان المصفوفة — لا نستدعي join عليه مباشرة.
    injuries: safeStrings(op.limitations?.injuries).join('، '),
    healthNotes: typeof op.limitations?.notes === 'string' ? op.limitations.notes : '',
    trackNutrition: true,
    mealsPerDay,
    nutritionStyle,
    // أسلوب العرض الدلالي من الإعداد — يقود واجهة التغذية (اقتراح وجبات / ماكروز فقط).
    nutritionDisplayStyle: nutrition.style ?? base.nutritionDisplayStyle,
    dislikedFoods: safeStrings(op.foodPreferences?.dislikedFoods).join('، '),
    muscleFocus: 'balanced',
    consistency,
    experienceBand: band,
    experienceLevel,
    gymAccess,
    gymType,
    equipment: [],
    schedulingStyle: 'flexible',
    preferredDays: [],
    remindersOptIn: !!op.appPreferences?.reminders,
  }
}

/**
 * المصدر الأساسي الوحيد لأهداف التغذية المشتقّة من الإعداد.
 * الإعداد والرئيسية وتبويب التغذية كلها تتفق لأنها تمرّ عبر هذه الدالة (toLegacyProfile + computeTargets).
 * BMR/TDEE/السعرات/الماكروز/الماء كلها محسوبة في computeTargets (NEAT منفصل عن التمرين، بلا مضاعفة).
 */
export function nutritionTargetsFromOnboarding(op: OnboardingProfile, base: Profile = defaultProfile) {
  return computeTargets(toLegacyProfile(op, base))
}

/**
 * يبني التخصيص الكامل من مصدر الحقيقة — يشغّل المولّد الحالي.
 * لا تمارين/وجبات مكتوبة يدويًا، ولا بيانات وهمية مزروعة.
 */
export function buildCustomizationFromOnboarding(op: OnboardingProfile, current: Customization): Customization {
  const profile = toLegacyProfile(op, current.profile)
  const g = generatePlan(profile)
  const goalLabel = goalChoices.find((x) => x.value === op.goal?.type)?.label
  return {
    ...current,
    identity: {
      ...current.identity,
      userName: profile.name, // فارغ غالبًا — لا اسم وهمي
      mainGoal: goalLabel ?? current.identity.mainGoal,
    },
    profile,
    targets: g.targets,
    targetsMeta: {
      manuallyEdited: false,
      lastCalculatedFromProfileHash: profileHash(profile),
      updatedAt: new Date().toISOString(),
    },
    workoutPlan: g.workoutPlan,
    nutritionPlan: g.nutritionPlan,
    commitmentPlan: g.commitmentPlan,
    measurementPlan: g.measurementPlan,
    routine: g.weeklySchedule,
    // تتبّع المكملات/الأدوية يتبع اختيار الإعداد: «none» → معطّل (لا بطاقة وهمية)،
    // basic/detailed → مُفعّل بقوائم فارغة (قشرة تتبّع فقط، يملؤها المستخدم).
    wellnessPlan: { enabled: (op.wellnessTracking?.mode ?? 'none') !== 'none', supplements: [], medications: [] },
    workouts: [],
    supplements: [],
    meals: [],
    metrics: [],
  }
}

// ===== الهجرة من الشكل القديم =====

const GOALTYPE_TO_ONB: Partial<Record<GoalType, OnbGoalType>> = {
  bulking: 'bulk',
  cutting: 'cut',
  // الهدف الملغى «إعادة التكوين» يُهاجَر إلى «تنشيف» (نفس مسار العجز).
  recomposition: 'cut',
  strength: 'strength',
}

const LEGACY_CONSISTENCY_TO_ONB: Record<Consistency, OnbConsistency> = {
  never: 'new',
  onoff: 'on_and_off',
  regular: 'consistent',
  returning: 'returning',
}

const ACTIVITY_TO_NEAT: Record<ActivityLevel, NeatLevel> = {
  sedentary: 'sedentary',
  light: 'light',
  moderate: 'moderate',
  active: 'high',
  very_active: 'high',
}

const ENVIRONMENT_FROM_GYMTYPE: Record<GymType, Environment> = {
  commercial: 'commercial_gym',
  small: 'small_gym',
  home: 'home_gym',
  bodyweight: 'bodyweight',
}

function gymToEnvironment(p: Profile): Environment {
  if (p.gymType) return ENVIRONMENT_FROM_GYMTYPE[p.gymType]
  if (p.gymAccess === 'full') return 'commercial_gym'
  if (p.gymAccess === 'small') return 'small_gym'
  if (p.gymAccess === 'home') return 'home_gym'
  if (p.gymAccess === 'bodyweight') return 'bodyweight'
  return p.workoutEnvironment === 'home' ? 'home_gym' : 'commercial_gym'
}

function experienceFromLegacy(p: Profile): ExperienceLevel | undefined {
  if (p.experienceLevel) return p.experienceLevel
  if (p.trainingLevel === 'beginner') return 'beginner'
  if (p.trainingLevel === 'advanced') return 'advanced'
  if (p.trainingLevel === 'intermediate') return 'intermediate'
  return undefined
}

/** يبني مصدر حقيقة من تخصيص قديم محفوظ (لحفظ المستخدمين الحاليين). */
export function migrateFromCustomization(c: Customization): OnboardingProfile {
  const p = c.profile ?? defaultProfile
  const base = defaultOnboardingProfile()
  const goalOnb = GOALTYPE_TO_ONB[p.goalType] ?? 'cut'
  // النصوص القديمة قد تكون null/رقمًا في ملف تالف — نتعامل معها كنصّ فارغ لا كـ crash.
  const splitList = (v: unknown) =>
    (typeof v === 'string' ? v : '').split(/[،,]/).map((s) => s.trim()).filter(Boolean)
  const dislikes = splitList(p.dislikedFoods)
  const injuries = splitList(p.injuries)
  const wp = c.wellnessPlan
  // قوائم الويلنس قد تُحفظ null/كائنًا — Array.isArray قبل map (map على غير مصفوفة = استثناء).
  const suppIds = Array.isArray(wp?.supplements)
    ? wp.supplements.map((s) => s.supplementId || s.id).filter(Boolean)
    : []
  const medIds = Array.isArray(wp?.medications)
    ? wp.medications.map((m) => m.medicationId || m.id).filter(Boolean)
    : []
  return {
    profile: {
      name: c.identity?.userName?.trim() || undefined,
      sex: p.gender === 'male' || p.gender === 'female' ? p.gender : undefined,
      age: p.age,
    },
    bodyMetrics: {
      heightCm: p.heightCm,
      currentWeightKg: p.weightKg,
      targetWeightKg: p.targetWeightKg,
    },
    goal: { type: goalOnb },
    trainingPreferences: {
      experience: experienceFromLegacy(p),
      consistency: p.consistency ? LEGACY_CONSISTENCY_TO_ONB[p.consistency] : undefined,
      environment: gymToEnvironment(p),
      daysPerWeek: p.trainingDays,
      sessionDurationMin: p.workoutDuration,
      splitMode: 'auto',
    },
    activityProfile: {
      neat: p.activityLevel ? ACTIVITY_TO_NEAT[p.activityLevel] : undefined,
    },
    nutritionPreferences: {
      style: p.trackNutrition ? 'meal_suggestions' : 'macros_only',
      mealsPerDay: p.mealsPerDay,
    },
    foodPreferences: { dietPattern: 'none', dislikedFoods: dislikes, allergies: [] },
    limitations: { injuries, notes: p.healthNotes || undefined },
    wellnessTracking: {
      mode: suppIds.length || medIds.length ? 'basic' : 'none',
      supplements: suppIds,
      medications: medIds,
    },
    appPreferences: { language: 'ar', reminders: !!p.remindersOptIn },
    _meta: { ...base._meta, completed: true, source: 'migrated', completedAt: new Date().toISOString() },
  }
}

/**
 * يضمن وجود مصدر حقيقة:
 * 1) المفتاح الجديد إن وُجد.
 * 2) هجرة من تخصيص قديم مكتمل الإعداد (يُحفظ المفتاح الجديد).
 * 3) إعداد فارغ آمن (لا بيانات وهمية).
 */
export function ensureOnboardingProfile(): OnboardingProfile {
  const existing = loadOnboardingProfile()
  if (existing) return existing
  try {
    if (hasSavedCustomization() && loadOnboarding().completed) {
      const migrated = migrateFromCustomization(loadCustomization())
      saveOnboardingProfile(migrated)
      return migrated
    }
  } catch {
    /* أي خطأ في القراءة القديمة → إعداد فارغ آمن */
  }
  return defaultOnboardingProfile()
}
