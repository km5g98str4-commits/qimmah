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
import { HEALTH_CONSENT_POLICY_VERSION, ONBOARDING_SCHEMA_VERSION } from '@/types/onboarding'
import type {
  ActivityLevel,
  Consistency,
  Gender,
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
  effectiveGoalTypeForAge,
  profileHash,
} from '@/lib/calculators'
// P11.5: الاشتقاقات الخفيفة من planDerive — planGenerator (ومعه قاعدة التمارين)
// يُحمَّل كسولًا داخل buildCustomizationFromOnboarding فقط، خارج حزمة الإقلاع.
import { deriveActivityLevel, deriveTargetWeight, levelFromExperience } from '@/lib/planDerive'
import { experienceToBand, goalChoices, gymTypeToAccess } from '@/data/planBuilder'
import type { Customization } from '@/lib/customization'
import type { GeneratedPlan } from '@/lib/planGenerator'
import type { PlanRationale } from '@/lib/planRationale'
import { hasSavedCustomization, loadCustomization } from '@/lib/customization'
import { loadOnboarding } from '@/lib/onboarding'
import { enqueueSyncOperation } from '@/lib/syncQueue'
import { assertPaid } from '@/lib/access/guard'
import { readRaw, removeKey, writeJson, type WriteResult } from '@/lib/safeStorage'

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
    limitations: { hasInjury: false, injuries: [] },
    wellnessTracking: { mode: 'none', supplements: [], medications: [] },
    appPreferences: { language: 'ar', reminders: false },
    consents: {
      healthData: {
        accepted: false,
        policyVersion: HEALTH_CONSENT_POLICY_VERSION,
      },
    },
    _meta: { schemaVersion: ONBOARDING_SCHEMA_VERSION, completed: false, source: 'onboarding' },
  }
}

/** دمج آمن لقسم محفوظ فوق الافتراضي. */
function mergeSection<T extends object>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object') return base
  return { ...base, ...(saved as Partial<T>) }
}

/**
 * هجرة الأهداف الملغاة عند القراءة (لا تعطّل، ويُعاد الحساب تلقائيًا):
 * - «recomp» (إعادة تركيب الجسم) → «cut».
 * - «strength» (زيادة القوة، أُلغي في P2.5) → «bulk» (أقرب مسار: فائض سعرات + تمرين أولًا).
 */
function migrateLegacyOnbGoal(goal: OnboardingProfile['goal']): OnboardingProfile['goal'] {
  if ((goal.type as string) === 'recomp') return { ...goal, type: 'cut' }
  if ((goal.type as string) === 'strength') return { ...goal, type: 'bulk' }
  return goal
}

// ===== التخزين =====

/** يقرأ مصدر الحقيقة المحفوظ مدموجًا فوق الافتراضي (آمن ضد بيانات تالفة/قديمة). */
export function loadOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === 'undefined') return null
  // القراءة عبر `readRaw`: مجرّد لمس `window.localStorage` يرمي `SecurityError`
  // حين يُحجب التخزين (سياسة مؤسسة/تصفّح خاص)، والطبقة تبتلعه إلى `null` بدل
  // أن يتسرّب الاستثناء إلى كل مستدعٍ.
  const raw = readRaw(ONBOARDING_PROFILE_KEY)
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
      consents: {
        ...base.consents,
        ...saved.consents,
        healthData: mergeSection(base.consents.healthData, saved.consents?.healthData),
      },
      _meta: { ...base._meta, ...saved._meta, schemaVersion: ONBOARDING_SCHEMA_VERSION },
    }
  } catch {
    return null
  }
}

/**
 * المسار القانوني الوحيد لرفع onboarding إلى صف profiles (إصلاح سباق الكتّاب
 * الثلاثة — P12): كل كاتب (حفظ محلي، ترطيب المزامنة، بوابة إكمال الإعداد) يمرّ
 * من هنا بنفس الشكل الكامل وبطابع LWW (updated_at) — لا كتابة مباشرة لعمود
 * onboarding خارج طابور المزامنة عندما تكون المزامنة مفعّلة.
 */
export function enqueueOnboardingProfileUpsert(value: OnboardingProfile): void {
  // ── الموافقة الصحّية تُقرأ، لا تُجمع وتُهمل ───────────────────────────────
  // ملفّ الإعداد **كلّه بيانات صحّية حسّاسة** (عمر · جنس · وزن · إصابات)، وقرار
  // المؤسس المقفل (§8-5) يشترط موافقة صريحة منفصلة قبل مزامنتها. وكانت قيمة
  // المربّع تُحفظ ولا يقرأها أحد إطلاقًا — تُجمع بلا مستهلك، وهو ما يمنعه §5.
  // الآن هي **شرط الرفع**: بلا موافقة مسجَّلة يبقى الملفّ محلّيًا بالكامل.
  if (value.consents?.healthData?.accepted !== true) return
  enqueueSyncOperation('profiles', 'profile', {
    data: { onboarding: value },
    updated_at: value._meta.updatedAt ?? value._meta.completedAt ?? new Date().toISOString(),
  })
}

/**
 * **سلطة واحدة** لسؤال «هل على هذا الجهاز ملفّ إعداد مكتمل؟».
 *
 * كان السؤال يُطرح بصيغتين مختلفتين: الكاتب هنا يقرأ `_meta.completed`، والواجهة
 * تقرأ `isExistingPlanEdit()` (تخصيص محفوظ **و** إعداد مكتمل). فحين تصدُق الأولى
 * وتكذب الثانية — ملفّ مكتمل بلا تخصيص محفوظ، كما يحدث بعد استيراد نسخة أو
 * ترطيب مزامنة جزئي — تمرّ الواجهة الكتابةَ فيرميها الكاتب، ويرى المستخدم
 * «ما قدرنا نجهّز الخطة» بزرّ إعادة لا ينجح أبدًا.
 *
 * فالسؤال الآن دالّة واحدة يستهلكها الطرفان، ولا يمكن لأحدهما أن يشيخ وحده.
 */
export function hasCompletedOnboardingProfile(): boolean {
  return loadOnboardingProfile()?._meta?.completed === true
}

/**
 * يكتب مصدر الحقيقة — **ويُبلّغ بالنتيجة**.
 *
 * ═══ لماذا صار للدالة قيمة راجعة (P0 · تقرير R10 §A بند ٤) ═══
 * كانت الكتابة `try { localStorage.setItem(…) } catch { /* تجاهل *\/ }`، أي أن
 * فشلها **غير قابل للتبليغ بنيويًا**: التوقيع `void` لا يملك قناة تقول «لم
 * أكتب». وهذا هو المفتاح الذي يثبت `A2` أنه **مرساة الاسترجاع** — من ملفّه
 * وحده تُعاد الخطة كاملة بدقّة. فحين يفشل بصمت على جهاز محجوب التخزين (تصفّح
 * Safari الخاص · حصّة ممتلئة · سياسة مؤسسة) يرى المستخدم خطته الحقيقية من
 * الذاكرة، تُمسح مسودّته القابلة للاستئناف، ثم يجد بعد إعادة التحميل خطة
 * شخصٍ آخر — ٢٤ سنة و٨٦ كجم لا تخصّه.
 *
 * فالآن: كتابة عبر `writeJson` (لا ترمي أبدًا وتُصنّف السبب)، والنتيجة تُرجَع،
 * و**الرفع إلى طابور المزامنة لا يحدث إلّا بعد `'ok'`** — كتابة لم تصل القرص
 * لا تدخل طابورًا يدّعي أنها وصلت.
 */
export function saveOnboardingProfile(value: OnboardingProfile): WriteResult {
  if (typeof window === 'undefined') return 'unavailable'
  // ── [PHASE-II] حدّ التحوير، لا حدّ الزرّ ──────────────────────────────────
  // أوّل إكمال **مجاني** (ميثاق §0.1: التخصيص وتوليد الخطة ومعاينتها مجانية
  // للجميع بلا حساب ولا دفع) — وهذه بوّابة القمع الأولى فلا تُغلق أبدًا.
  //
  // أمّا الكتابة فوق ملف **مكتمل** فهي `plan.saveEdit`، وهو فعل معلَن مدفوعًا
  // في `access/paidActions.ts`. كان يُحرَس على مسار واحد (`WorkoutView`) ويُترك
  // مفتوحًا على `#/setup` — فتغيّر الهدف من cut إلى bulk وثبت بعد إعادة التحميل.
  //
  // الحارس هنا في **الكاتب** لا في المعالج: أي مسار حفظ بديل، حاضر أو قادم،
  // يمرّ من هنا حتمًا. حراسة الزرّ وحده تترك الباب الثاني مفتوحًا.
  //
  // ولا يُحرَس الوارد من المزامنة: له كاتبه المنفصل `saveOnboardingProfileFromSync`
  // لأنه ترطيب لا تحوير من المستخدم. ولا تُحرَس هجرة `ensureOnboardingProfile`
  // لأنها لا تعمل إلا حين لا يوجد ملف أصلًا (`existing` = null أدناه).
  if (hasCompletedOnboardingProfile()) assertPaid('plan.saveEdit')
  // ختم LWW عند كل حفظ محلي — دليل الأحدثية لدمج profiles.data.onboarding.
  const stamped: OnboardingProfile = { ...value, _meta: { ...value._meta, updatedAt: new Date().toISOString() } }
  const result = writeJson(ONBOARDING_PROFILE_KEY, stamped)
  if (result !== 'ok') return result
  enqueueOnboardingProfileUpsert(stamped)
  return 'ok'
}

/**
 * كتابة ملف الإعداد من مسار المزامنة (hydrate) بعد فوزه بالـLWW — **دون إعادة
 * ختم** (إعادة الختم بـ«الآن» تزوّر الأحدثية وتقلب دمج الأجهزة اللاحق).
 */
export function saveOnboardingProfileFromSync(value: OnboardingProfile): WriteResult {
  if (typeof window === 'undefined') return 'unavailable'
  return writeJson(ONBOARDING_PROFILE_KEY, value)
}

export function clearOnboardingProfile(): void {
  removeKey(ONBOARDING_PROFILE_KEY)
}

// ===== قراءة الجنس لكل حساب (إصلاح P10.1) =====

/**
 * جنس العرض للمالك الحالي — لكل **حساب** لا لكل جهاز.
 *
 * السبب الجذري: التخصيص (qimmah:customization:v1) مفتاح عام على مستوى الجهاز
 * يكتبه آخر من أكمل الإعداد، بينما حالة الإعداد (qimmah:onboarding:v1) تحمل
 * «مالك» تلك الكتابة (معرّف الحساب أو undefined للضيف). لذلك نثق بجنس التخصيص
 * فقط إذا لم يكن التخزين العام مملوكًا لحساب آخر معروف:
 *   • المالك هو الحساب الحالي نفسه → جنس التخصيص (بياناته هو).
 *   • لا مالك مسجّل (بيانات ضيف/قديمة) → جنس التخصيص (يغطّي مسار «ضيف ثم أنشأ حسابًا»).
 *   • المالك حساب مختلف → 'unspecified' — الافتراضي الموثّق: تسمية محايدة،
 *     فلا تظهر «أنثى/ذكر» موروثة من حساب آخر على الجهاز نفسه.
 */
export function accountGender(userId: string | null | undefined, deviceGender: Gender): Gender {
  const owner = loadOnboarding().owner
  const current = userId ?? undefined
  if (!owner || owner === current) return deviceGender
  return 'unspecified'
}

// ===== خرائط مصدر-الحقيقة → الشكل القديم (للمولّد) =====

const GOAL_TO_GOALTYPE: Record<OnbGoalType, GoalType> = {
  bulk: 'bulking',
  cut: 'cutting',
  maintain: 'maintenance',
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
  const age = op.profile.age || base.age
  // القاصرون (دون 18): «المحافظة» فقط — قرار المالك؛ نُثبّت الهدف عند بناء الملف من الإعداد.
  const goalType: GoalType = effectiveGoalTypeForAge(
    op.goal.type ? GOAL_TO_GOALTYPE[op.goal.type] : base.goalType,
    age,
  )
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
    age,
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
    // توزيع حجم الوجبات ووقت الجوع (P2.5) — يؤثّران على توزيع السعرات في اقتراح الوجبات.
    mealDistribution: op.nutritionPreferences.mealDistribution ?? base.mealDistribution,
    appetiteTiming: op.nutritionPreferences.appetiteTiming ?? base.appetiteTiming,
    // نمط الأكل (P3) — يصفّي اقتراح الوجبات/البدائل حسب النباتي/الصرف/البيسكتاريان.
    dietPattern: op.foodPreferences.dietPattern ?? base.dietPattern,
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
 * [QIM-WEB-FOUNDER-UX-003/حزمة ٣] مخرجات التوليد كاملة من **تشغيل واحد**.
 *
 * شاشة التسليم تعرض حقائق الخطة (التقسيمة · الأيام · السعرات · الماكروز · أول
 * يوم · «لماذا هذه خطتك»)، وهذه الحقائق **يجب أن تكون نفسها المحفوظة** لا نسخة
 * مُعاد توليدها. توليد ثانٍ للعرض يفتح باب انحراف صامت بين ما يراه المستخدم على
 * شاشة الوعد وما يجده في التطبيق — وهو أسوأ من عدم العرض أصلًا (الميثاق §5:
 * لا واجهة تَعِد بما لا يحدث).
 *
 * فالتوليد هنا مرّة واحدة، ويُسلَّم `customization` للحفظ و`generated`/`rationale`
 * للعرض. و`buildCustomizationFromOnboarding` تبقى كما هي للمستدعين القائمين.
 */
export interface OnboardingPlanArtifacts {
  customization: Customization
  generated: GeneratedPlan
  rationale: PlanRationale
  profile: Profile
}

export async function buildPlanArtifactsFromOnboarding(
  op: OnboardingProfile,
  current: Customization,
): Promise<OnboardingPlanArtifacts> {
  const profile = toLegacyProfile(op, current.profile)
  const [{ generatePlan }, { buildPlanRationale }] = await Promise.all([
    import('@/lib/planGenerator'),
    import('@/lib/planRationale'),
  ])
  const g = generatePlan(profile)
  return {
    customization: assembleCustomization(op, current, g, profile),
    generated: g,
    rationale: buildPlanRationale(profile, g),
    profile,
  }
}

/**
 * يبني التخصيص الكامل من مصدر الحقيقة — يشغّل المولّد الحالي.
 * لا تمارين/وجبات مكتوبة يدويًا، ولا بيانات وهمية مزروعة.
 */
export async function buildCustomizationFromOnboarding(
  op: OnboardingProfile,
  current: Customization,
): Promise<Customization> {
  const profile = toLegacyProfile(op, current.profile)
  const { generatePlan } = await import('@/lib/planGenerator')
  return assembleCustomization(op, current, generatePlan(profile), profile)
}

/** التجميع المشترك — مصدر واحد لشكل التخصيص، يستهلكه المساران أعلاه. */
function assembleCustomization(
  op: OnboardingProfile,
  current: Customization,
  g: GeneratedPlan,
  profile: Profile,
): Customization {
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
  // المحافظة/الثبات/الرجوع/الصحة كلها سعرات صيانة → مسار «المحافظة على العضل».
  maintenance: 'maintain',
  returning: 'maintain',
  health: 'maintain',
  // الهدف الملغى «إعادة التكوين» يُهاجَر إلى «تنشيف» (نفس مسار العجز).
  recomposition: 'cut',
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
    foodPreferences: { dietPattern: p.dietPattern ?? 'none', dislikedFoods: dislikes, allergies: [] },
    limitations: { hasInjury: injuries.length > 0, injuries, notes: p.healthNotes || undefined },
    wellnessTracking: {
      mode: suppIds.length || medIds.length ? 'basic' : 'none',
      supplements: suppIds,
      medications: medIds,
    },
    appPreferences: { language: 'ar', reminders: !!p.remindersOptIn },
    // البيانات القديمة لا تُعد موافقة صريحة؛ يُطلب الإقرار في الإعداد بدل استنتاجه.
    consents: base.consents,
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
