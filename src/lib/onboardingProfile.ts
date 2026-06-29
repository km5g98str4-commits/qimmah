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
  deriveActivityLevel,
  deriveTargetWeight,
  generatePlan,
  levelFromExperience,
} from '@/lib/planGenerator'
import { experienceToBand, goalChoices, gymTypeToAccess } from '@/data/planBuilder'
import type { Customization } from '@/lib/customization'
import { hasSavedCustomization, loadCustomization } from '@/lib/customization'
import { loadOnboarding } from '@/lib/onboarding'

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

/** دمج آمن لقسم محفوظ فوق الافتراضي. */
function mergeSection<T extends object>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object') return base
  return { ...base, ...(saved as Partial<T>) }
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

/** يقرأ مصدر الحقيقة المحفوظ مدموجًا فوق الافتراضي (آمن ضد بيانات تالفة/قديمة). */
export function loadOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === 'undefined') return null
  let raw: string | null
  try {
    raw = window.localStorage.getItem(ONBOARDING_PROFILE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const saved = JSON.parse(raw) as Partial<OnboardingProfile>
    const base = defaultOnboardingProfile()
    const goal = migrateLegacyOnbGoal(mergeSection(base.goal, saved.goal))
    return {
      profile: mergeSection(base.profile, saved.profile),
      bodyMetrics: mergeSection(base.bodyMetrics, saved.bodyMetrics),
      goal,
      trainingPreferences: mergeSection(base.trainingPreferences, saved.trainingPreferences),
      activityProfile: mergeSection(base.activityProfile, saved.activityProfile),
      nutritionPreferences: mergeSection(base.nutritionPreferences, saved.nutritionPreferences),
      foodPreferences: mergeSection(base.foodPreferences, saved.foodPreferences),
      limitations: mergeSection(base.limitations, saved.limitations),
      wellnessTracking: mergeSection(base.wellnessTracking, saved.wellnessTracking),
      appPreferences: { ...base.appPreferences, ...saved.appPreferences, language: 'ar' },
      _meta: { ...base._meta, ...saved._meta, schemaVersion: ONBOARDING_SCHEMA_VERSION },
    }
  } catch {
    return null
  }
}

export function saveOnboardingProfile(value: OnboardingProfile): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(value))
  } catch {
    /* تجاهل أخطاء التخزين (وضع التصفّح الخاص …) */
  }
}

export function clearOnboardingProfile(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ONBOARDING_PROFILE_KEY)
  } catch {
    /* تجاهل */
  }
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
  const tp = op.trainingPreferences
  const goalType: GoalType = op.goal.type ? GOAL_TO_GOALTYPE[op.goal.type] : base.goalType
  const experienceLevel: ExperienceLevel | undefined = tp.experience
  const band = experienceLevel ? experienceToBand(experienceLevel) : base.experienceBand
  const trainingLevel = experienceLevel ? levelFromExperience(band) : base.trainingLevel
  const gymType: GymType = tp.environment ? ENVIRONMENT_TO_GYMTYPE[tp.environment] : (base.gymType ?? 'commercial')
  const gymAccess = gymTypeToAccess(gymType)
  const weightKg = op.bodyMetrics.currentWeightKg || base.weightKg
  const trainingDays = tp.daysPerWeek || base.trainingDays
  const consistency: Consistency = tp.consistency
    ? CONSISTENCY_TO_LEGACY[tp.consistency]
    : base.consistency ?? 'regular'
  // وزن الهدف يُسأل مرّة واحدة لـ cut/bulk فقط؛ القوة لا هدف وزن لها (لا مدة/تغيّر مضلّل).
  const targetWeightKg = showsTargetWeight(op.goal.type)
    ? op.bodyMetrics.targetWeightKg || deriveTargetWeight(weightKg, goalType)
    : weightKg
  const activityLevel: ActivityLevel = op.activityProfile.neat
    ? NEAT_TO_ACTIVITY[op.activityProfile.neat]
    : deriveActivityLevel(trainingDays)
  // أسلوب التغذية الجديد دلالي (طريقة العرض)؛ نُبقي أسلوب الطبخ القديم للمولّد.
  const nutritionStyle: NutritionStyle = base.nutritionStyle ?? 'high_protein'
  const mealsPerDay = op.nutritionPreferences.mealsPerDay || base.mealsPerDay

  return {
    ...base,
    name: op.profile.name?.trim() || '',
    gender: op.profile.sex ?? 'unspecified',
    age: op.profile.age || base.age,
    heightCm: op.bodyMetrics.heightCm || base.heightCm,
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
    injuries: op.limitations.injuries.join('، '),
    healthNotes: op.limitations.notes ?? '',
    trackNutrition: true,
    mealsPerDay,
    nutritionStyle,
    // أسلوب العرض الدلالي من الإعداد — يقود واجهة التغذية (اقتراح وجبات / ماكروز فقط).
    nutritionDisplayStyle: op.nutritionPreferences.style ?? base.nutritionDisplayStyle,
    dislikedFoods: op.foodPreferences.dislikedFoods.join('، '),
    muscleFocus: 'balanced',
    consistency,
    experienceBand: band,
    experienceLevel,
    gymAccess,
    gymType,
    equipment: [],
    schedulingStyle: 'flexible',
    preferredDays: [],
    remindersOptIn: op.appPreferences.reminders,
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
  const goalLabel = goalChoices.find((x) => x.value === op.goal.type)?.label
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
    wellnessPlan: { enabled: op.wellnessTracking.mode !== 'none', supplements: [], medications: [] },
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
  const p = c.profile
  const base = defaultOnboardingProfile()
  const goalOnb = GOALTYPE_TO_ONB[p.goalType] ?? 'cut'
  const dislikes = (p.dislikedFoods ?? '').split(/[،,]/).map((s) => s.trim()).filter(Boolean)
  const injuries = (p.injuries ?? '').split(/[،,]/).map((s) => s.trim()).filter(Boolean)
  const wp = c.wellnessPlan
  const suppIds = wp?.supplements?.map((s) => s.supplementId || s.id).filter(Boolean) ?? []
  const medIds = wp?.medications?.map((m) => m.medicationId || m.id).filter(Boolean) ?? []
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
