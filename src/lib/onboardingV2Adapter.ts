// Adapter: Qimmah v2.1 onboarding (Slice 2B) choices → the existing PlanBuilder
// `Answers` model. Pure and type-safe so the v2 flow reuses the exact same
// downstream plan-generation/persistence as v1 without duplicating any logic.
//
// The v2 flow asks only approved, consumed questions; whatever it does not ask
// falls back to `defaultAnswers` and generation stays safe with them. There is
// NO existing `Answers` field for a user-selected muscle/training focus, so this
// adapter deliberately keeps the generator's honest balanced default.

import { defaultAnswers, type Answers } from './planBuilderAnswers'
import {
  historyFollowUpsApply,
  isBodyweightOnly,
  normalizeName,
  withBodyweight,
  resolveExperienceLevel,
  resolveTrainingConsistency,
  type V2Intent,
  type V2Level,
} from './onboardingV2Flow'
import type {
  DietPattern,
  Environment,
  LastTrainedBucket,
  NeatLevel,
  NutritionStyle,
  TotalMonthsBucket,
  TrainedBefore,
  TrainingConsistency,
} from '@/types/onboarding'
import type { V2GoalValue } from '@/design-system/v2/labels'
import type { Equipment } from '@/types/profile'

export type V2Place = 'gym' | 'home' | 'machines'

export interface V2OnboardingChoices {
  /** الاسم المعروض — اختياري؛ غيابه يعني تحيّة بلا اسم، لا اسمًا مخترعًا. */
  name?: string | null
  goal: V2GoalValue | null
  days: number
  duration: number
  place: V2Place | null
  /** الأدوات المتاحة — فارغة تعني «لم يُسأل» فيبقى اشتقاق المكان كما كان. */
  equipment?: readonly Equipment[]
  neat: NeatLevel | null
  dietPattern: DietPattern | null
  hasInjury: boolean
  injuries: string[]
  healthDataConsent: boolean
  /** بيانات الجسم — تُجمع في الخطوة الأولى؛ null يعني «لم تُجَب بعد». */
  age?: number | null
  gender?: 'male' | 'female' | null
  heightCm?: number | null
  weightKg?: number | null
  /** النية والمستوى — الخطوة الثانية؛ null يعني «لم تُجَب بعد» (مسودّة قديمة). */
  intent?: V2Intent | null
  level?: V2Level | null
  trainedBefore?: TrainedBefore | null
  totalMonths?: TotalMonthsBucket | null
  lastTrained?: LastTrainedBucket | null
  consistency?: TrainingConsistency | null
}

/**
 * النية ⇒ أسلوب التغذية. **هذا أثر السؤال الحقيقي**: القيمة تصل إلى
 * `nutritionPreferences.style` ثم إلى `nutritionDisplayStyle` في الملف، فتتغيّر
 * واجهة التغذية بين اقتراح وجبات / أرقام فقط / إرشاد مبسّط — ومع
 * `simple_guidance` و`macros_only` لا يُحفظ `mealsPerDay` أصلًا
 * (انظر `buildOnboardingProfile`). لا سؤال بلا أثر.
 */
const INTENT_TO_NUTRITION: Record<V2Intent, NutritionStyle> = {
  plan: 'simple_guidance',
  meals: 'meal_suggestions',
  numbers: 'macros_only',
}

/** v2 training place → the closest existing `Environment`. */
const PLACE_TO_ENV: Record<V2Place, Environment> = {
  gym: 'commercial_gym', // نادي — full gym (machines + free weights)
  home: 'home_gym', // منزل — home setup
  machines: 'small_gym', // أجهزة فقط — closest existing (machine-focused, limited)
}

/**
 * Convert v2 onboarding choices into a full `Answers` object. Target weight is
 * derived from the goal the same way v1 does (cut ×0.9, bulk ×1.1, maintain =)
 * so calorie direction is sane.
 *
 * **بيانات الجسم تأتي من المستخدم الآن.** كان التدفّق لا يسألها إطلاقًا فتسقط
 * كلها على `defaultAnswers` (25 سنة · 170سم · 75كجم) — أي **نفس BMR لكل
 * مستخدمي التطبيق**. القيم المُجابة تحلّ محلّها؛ وما لم يُجَب بعد يسقط على
 * الافتراضي كما كان (توافق رجعي مع مسودّات قديمة).
 *
 * حقائق التاريخ تبقى خامًا داخل مصدر الحقيقة، ومشتقاتها وحدها تذهب للمولّد.
 * never حالة كاملة: لا أشهر ولا انقطاع ولا انتظام مصطنع.
 */
export function toAnswersFromV2(choices: V2OnboardingChoices): Answers {
  const weightKg = choices.weightKg ?? defaultAnswers.weightKg
  const targetWeightKg =
    choices.goal === 'cut'
      ? Math.round(weightKg * 0.9)
      : choices.goal === 'bulk'
        ? Math.round(weightKg * 1.1)
        : weightKg
  const trainedBefore = choices.trainedBefore ?? null
  const followUps = historyFollowUpsApply(trainedBefore)
  const totalMonths = followUps ? choices.totalMonths ?? null : null
  const lastTrained = followUps ? choices.lastTrained ?? null : null
  const historyConsistency = followUps ? choices.consistency ?? null : null

  return {
    ...defaultAnswers,
    // الاسم يقطع الأنبوب كاملًا من هنا: `Answers.name` → `op.profile.name` →
    // `profile.name` → `identity.userName` → تحيّة الرئيسية. لا حلقة جديدة،
    // إنما منبع لأنبوب كان قائمًا بلا مصدر.
    name: normalizeName(choices.name),
    age: choices.age ?? defaultAnswers.age,
    sex: choices.gender ?? defaultAnswers.sex,
    heightCm: choices.heightCm ?? defaultAnswers.heightCm,
    weightKg,
    experienceLevel: resolveExperienceLevel(
      choices.level ?? null,
      trainedBefore,
      totalMonths,
      lastTrained,
      historyConsistency,
    ),
    consistency: resolveTrainingConsistency(trainedBefore, totalMonths, lastTrained, historyConsistency),
    trainingHistory: trainedBefore && choices.level ? {
      declaredLevel: choices.level,
      trainedBefore,
      ...(followUps && totalMonths ? { totalMonths } : {}),
      ...(followUps && lastTrained ? { lastTrained } : {}),
      ...(followUps && historyConsistency ? { consistency: historyConsistency } : {}),
    } : undefined,
    // النية ⇒ أسلوب التغذية؛ بلا نية يبقى الافتراضي كما كان (توافق رجعي).
    nutritionStyle: choices.intent ? INTENT_TO_NUTRITION[choices.intent] : defaultAnswers.nutritionStyle,
    // ═══ الأدوات: المكان سياق، والأداة حاكمة ═══
    // فارغة ⇒ لا نضيف وزن الجسم من عندنا: مسودّة أقدم لم تُسأل، وحقنُ قيمة
    // فيها يقلب «لم يُسأل» إلى «أجاب بوزن الجسم» — وهو ما يجعل `toLegacyProfile`
    // يظنّ أن لديه إعلانًا ويضيّق الخطة على ملفّ قديم بلا سبب.
    equipment: choices.equipment && choices.equipment.length > 0 ? withBodyweight(choices.equipment) : [],
    goalValue: choices.goal ?? undefined,
    trainingDays: choices.days,
    daysTouched: true,
    sessionDurationMin: choices.duration,
    // فرع `bodyweight` كان **غير قابل للوصول** من الإعداد إطلاقًا: `V2Place`
    // ثلاث قيم لا رابع، فمن عنده سجّادة وحدها كان يُسلَّم برنامج بار. الآن
    // إعلانُ «وزن الجسم وحده» يفتح الفرع المنفَّذ أصلًا في
    // `equipmentAccess.ts:44-45` وفي المولّد.
    environment: choices.equipment && choices.equipment.length > 0 && isBodyweightOnly(choices.equipment)
      ? 'bodyweight'
      : choices.place ? PLACE_TO_ENV[choices.place] : undefined,
    neat: choices.neat ?? defaultAnswers.neat,
    dietPattern: choices.dietPattern ?? defaultAnswers.dietPattern,
    hasInjury: choices.hasInjury,
    injuries: [...choices.injuries],
    healthDataConsent: choices.healthDataConsent,
    targetWeightKg,
    targetTouched: true,
  }
}
