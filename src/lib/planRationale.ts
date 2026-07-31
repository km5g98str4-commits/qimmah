// طبقة تعليل الخطة (حارة E · المرحلة الثانية — الموجة ١).
//
// **ما هذه الطبقة:** دالة نقيّة تقرأ `Profile` + `GeneratedPlan` وتُخرج **قرارات
// منظَّمة بمفاتيح ثابتة** تربط كل مخرَج في الخطة بالمدخل الذي أنتجه، إضافةً إلى
// حجم أسبوعي مقيس لكل عضلة. لا تولّد خطة ولا تعدّلها ولا تقرأ تخزينًا.
//
// **قاعدة حاكمة (الميثاق §6): القيمة المخزّنة ثابتة والصياغة متغيّرة.**
// كل ما يخرج من هنا معرّفات وقيم منظَّمة وأرقام — **لا نصّ معروض ولا لغة**.
// الترجمة كلها في طبقة العرض، والإثبات يفحص المفتاح لا النصّ.
//
// **الصدق قبل الادّعاء (§5):** كل قرار يحمل `basis`:
//   - `measured`   → مقروء فعلًا من مخرجات الخطة (لغة حاسمة في العرض).
//   - `structural` → قاعدة معلنة في المحرّك لا قياس لها في المخرَج (لغة متحفّظة).
// والمحاور التي **لا يخصّص المحرّك بها اليوم** تُعلَن صراحةً في `inactiveAxes`
// بدل أن تُترك للمستخدم يظنّها مُطبَّقة.
//
// **الخصوصية (§9):** نصّ الإصابات مدخل صحّي حسّاس — لا يخرج من هنا أبدًا؛
// يخرج وجوده فقط (`declared` / `none`).

import type { GoalType, MuscleFocus, PlannedSplit, Profile } from '@/types/profile'
import type { Muscle, WorkoutPlan } from '@/types/workout'
import { effectiveGoalTypeForAge } from '@/lib/calculators'
import { resolveGymAccess } from '@/lib/equipmentAccess'
import { getExercise } from '@/data/exercises'
import type { GeneratedPlan } from '@/lib/planGenerator'

// ============================================================================
// نقطة الامتداد الموثّقة — محور trainingFocus
// ============================================================================

/**
 * محور تركيز التدريب (قوّة / تضخيم / عام).
 *
 * ⚠️ **نقطة امتداد موثّقة — المحور غير موجود في بيانات المستخدم اليوم.**
 * مذكّرة `docs/product/TRAINING-FOCUS-SCHEMA-VERDICT.md` تُثبت أن الجذع لا يحمل
 * `trainingFocus` ولا مرادفًا شرعيًا له: `MuscleFocus` مناطق جسم لا محور قوّة،
 * و`'strength'` مسدود في `GoalType` بهجرتين تعيدانه إلى `bulking` عند التحميل.
 *
 * **حين تهبط موجة مخطّط حارة A** ويصير الحقل موجودًا في `Profile`:
 * يُستبدل جسم `resolveTrainingFocus` أدناه بقراءة الحقل — **وهذا هو الموضع
 * الوحيد الذي يتغيّر في هذه الطبقة.** لا يُنشأ الحقل من هنا: `types/profile.ts`
 * و`types/onboarding.ts` و`onboardingProfile.ts` ملك حارة A (الميثاق §1.4/4).
 *
 * **السلوك اليوم `'general'` صراحةً**، ويُعلَن في `inactiveAxes` بأنه محايد
 * لا مخصَّص — فلا تدّعي الواجهة تخصيصًا لم يحدث (§5).
 */
export type TrainingFocusAxis = 'general' | 'strength' | 'hypertrophy'

/** السلوك المحايد المعتمد ما دام المحور غير مجموع. */
export const PLAN_TRAINING_FOCUS_DEFAULT: TrainingFocusAxis = 'general'

function resolveTrainingFocus(_profile: Profile): TrainingFocusAxis {
  // ← نقطة الامتداد: تُقرأ هنا قيمة `trainingFocus` حين يضيفها مخطّط حارة A.
  return PLAN_TRAINING_FOCUS_DEFAULT
}

// ============================================================================
// حارس المحاور المشلولة في الجسر
// ============================================================================

/**
 * **الحقل الحاضر المشلول أخطر من الغائب.**
 *
 * `trainingFocus` غائب عن النوع فأُعلن محايدًا بلا لبس. أمّا `muscleFocus`
 * فـ**حاضر في `Profile`** — يبدو مجموعًا وهو ليس كذلك: جسر الإعداد
 * `toLegacyProfile` يثبّته على `'balanced'` لكل مستخدم مهما أجاب
 * (`src/lib/onboardingProfile.ts:283`). فلو عرضناه سائقًا لقرار، لقالت الواجهة
 * لكل مستخدم «تركيزك: متوازن» **كأنها إجابته**، وهي ثابت في الجسر. ادّعاء
 * يبدو صادقًا — وهو أسوأ صنف (§5).
 *
 * **جردة الجسر كاملة (فُحصت على المصدر لا افتراضًا):** الحقول التي يثبّتها
 * `toLegacyProfile` خمسة، وهذه حالة كلٍّ منها في هذه الطبقة:
 *
 * | الحقل المثبَّت | الموضع | هل نعرضه سائقًا؟ |
 * |---|---|---|
 * | `muscleFocus: 'balanced'` | `onboardingProfile.ts:283` | **نعم ⇒ يُحرَس هنا** |
 * | `equipment: []`           | `:289` | لا — `resolveGymAccess` و`makeEquipmentGate` **لا يقرآن `p.equipment` إطلاقًا**؛ سائق `gymAccess` يقرأ `gymAccess`/`gymType`/`workoutEnvironment` وكلها مُسنَدة من إجابات فعلية. |
 * | `schedulingStyle: 'flexible'` | `:290` | لا — غير معروض. |
 * | `preferredDays: []`       | `:291` | لا — غير معروض (يؤثّر في ترتيب أيام الأسبوع لا في قرار مُعلَّل). |
 * | `nutritionStyle: 'high_protein'` | `:250` | لا — غير معروض. |
 *
 * **الحارس يسقط من نفسه:** يُقارَن بالقيمة المثبَّتة لا بوجود الحقل. فحالما
 * يمرّر الجسر اختيارًا حقيقيًا (`'lower'` مثلًا) يعود المحور سائقًا معلنًا بلا
 * تعديل هنا. ويبقى خطأ التحفّظ في اتجاهه الصحيح: مستخدم اختار «متوازن» عمدًا
 * يُعامَل محايدًا — **نبخس تخصيصًا حدث، ولا ندّعي تخصيصًا لم يحدث.**
 *
 * يُحذف هذا الحارس كاملًا حين يتوقّف `toLegacyProfile` عن التثبيت.
 */
const BRIDGE_PINNED_MUSCLE_FOCUS: MuscleFocus = 'balanced'

// ============================================================================
// الأنواع المنظَّمة
// ============================================================================

/** مساحة القرار داخل الخطة — مفتاح ثابت لا يترجم. */
export type PlanDecisionArea =
  | 'split'
  | 'sessionSize'
  | 'weeklyVolume'
  | 'repRange'
  | 'restBetweenSets'
  | 'equipmentPool'
  | 'injuryFilter'
  | 'muscleFocus'
  | 'startingLoad'
  | 'calorieTarget'
  | 'ageGuardrail'

/** مفتاح المدخل الذي قاد القرار — مفتاح ثابت لا يترجم. */
export type PlanDriverKey =
  | 'trainingDays'
  | 'splitChoice'
  | 'sessionMinutes'
  | 'experience'
  | 'goalType'
  | 'gymAccess'
  | 'injuries'
  | 'muscleFocus'
  | 'consistency'
  | 'age'

/** المحاور المعروفة التي قد تُخصِّص الخطة — مفتاح ثابت. */
export type PlanAxisKey = 'trainingFocus' | 'pastPerformance' | 'muscleFocus'

export interface PlanDriver {
  key: PlanDriverKey
  /** قيمة منظَّمة أو رقم — لا نصّ حرّ ولا نصّ معروض. */
  value: string | number
}

export interface PlanOutcome {
  /** مفتاح ثابت يصف ما تقرّر (لا نصّه). */
  key: string
  /** معرّف منظَّم أو رقم مقيس. */
  value: string | number
}

export interface PlanDecision {
  area: PlanDecisionArea
  drivers: readonly PlanDriver[]
  outcome: PlanOutcome
  /** `measured` مقروء من مخرجات الخطة · `structural` قاعدة معلنة في المحرّك. */
  basis: 'measured' | 'structural'
}

/** حجم أسبوعي مقيس لعضلة — مجموع مجموعات الأسبوع وعدد الأيام التي تلمسها. */
export interface MuscleWeeklyVolume {
  muscle: Muscle
  sets: number
  sessions: number
}

/** محور تخصيص غير مفعَّل — يُعلَن ولا يُدّعى (§5). */
export interface InactiveAxis {
  axis: PlanAxisKey
  /** السلوك الفعلي القائم مكانه — محايد بالتعريف. */
  neutralValue: string
  /** سبب عدم التفعيل بمفتاح ثابت لا نصّ. */
  reason: 'fieldNotCollected' | 'notWiredToGenerator' | 'pinnedByBridge'
}

export interface PlanRationale {
  decisions: readonly PlanDecision[]
  weeklyVolume: readonly MuscleWeeklyVolume[]
  inactiveAxes: readonly InactiveAxis[]
}

// ============================================================================
// قياسات من مخرجات الخطة
// ============================================================================

function measureWeeklyVolume(plan: WorkoutPlan): MuscleWeeklyVolume[] {
  const sets = new Map<Muscle, number>()
  const sessions = new Map<Muscle, number>()
  for (const day of plan.days) {
    const touched = new Set<Muscle>()
    for (const pe of day.exercises) {
      const ex = getExercise(pe.exerciseId)
      if (!ex) continue
      sets.set(ex.primaryMuscle, (sets.get(ex.primaryMuscle) ?? 0) + pe.sets)
      touched.add(ex.primaryMuscle)
    }
    for (const m of touched) sessions.set(m, (sessions.get(m) ?? 0) + 1)
  }
  return [...sets.entries()]
    .map(([muscle, s]) => ({ muscle, sets: s, sessions: sessions.get(muscle) ?? 0 }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle))
}

function maxExercisesPerDay(plan: WorkoutPlan): number {
  return plan.days.reduce((max, d) => Math.max(max, d.exercises.length), 0)
}

function totalWeeklySets(volume: readonly MuscleWeeklyVolume[]): number {
  return volume.reduce((sum, v) => sum + v.sets, 0)
}

/** أوّل تمرين مركّب في الخطة — مصدر القياس لنطاق التكرارات والراحة. */
function firstCompound(plan: WorkoutPlan): { reps: string; restSec: number } | null {
  for (const day of plan.days) {
    for (const pe of day.exercises) {
      const ex = getExercise(pe.exerciseId)
      if (ex && ex.movementPattern !== 'isolation' && ex.movementPattern !== 'core') {
        return { reps: pe.reps, restSec: pe.restSec }
      }
    }
  }
  return null
}

// ============================================================================
// البناء
// ============================================================================

const clampDays = (n: number) => Math.max(1, Math.min(7, n))

/**
 * يبني تعليل الخطة من الملف الشخصي ومخرجات المحرّك.
 * دالة نقيّة: لا تخزين ولا شبكة ولا حالة ولا لغة.
 */
export function buildPlanRationale(profile: Profile, plan: GeneratedPlan): PlanRationale {
  const effectiveGoal: GoalType = effectiveGoalTypeForAge(profile.goalType, profile.age)
  const goalWasRestricted = effectiveGoal !== profile.goalType
  const days = clampDays(profile.trainingDays)
  const volume = measureWeeklyVolume(plan.workoutPlan)
  const compound = firstCompound(plan.workoutPlan)
  const access = resolveGymAccess(profile)
  const focus: MuscleFocus = profile.muscleFocus ?? 'balanced'
  // ما دامت القيمة هي المثبَّتة في الجسر فهي ليست إجابة المستخدم — تُعلَن محايدة
  // ولا تُعرض سائقًا لأي قرار (انظر `BRIDGE_PINNED_MUSCLE_FOCUS` أعلاه).
  const focusIsPinned = focus === BRIDGE_PINNED_MUSCLE_FOCUS
  const usedAdvancedSplit = profile.splitMode === 'advanced' && Boolean(profile.splitChoice)
  const conservativeStart =
    effectiveGoal === 'returning' || profile.consistency === 'returning' || profile.consistency === 'onoff'

  const decisions: PlanDecision[] = []

  // ١) التقسيمة — المحرّك يختارها من الأيام (والتركيز عند خمسة)، أو من اختيار
  //    المستخدم في النمط المتقدّم. المخرَج مقيس: معرّف القالب في الخطة نفسها.
  decisions.push({
    area: 'split',
    drivers: usedAdvancedSplit
      ? [
          { key: 'splitChoice', value: profile.splitChoice as PlannedSplit },
          { key: 'trainingDays', value: days },
        ]
      : [
          { key: 'trainingDays', value: days },
          // التركيز يدخل قرار التقسيمة عند خمسة أيام — لكن لا يُذكر سائقًا وهو مثبَّت.
          ...(days === 5 && !focusIsPinned ? [{ key: 'muscleFocus' as const, value: focus }] : []),
        ],
    outcome: { key: 'templateId', value: plan.suggestedWorkoutTemplateId },
    basis: 'measured',
  })

  // ٢) حجم الجلسة — الخبرة تحدّد الأساس ومدّة الجلسة تعدّله.
  decisions.push({
    area: 'sessionSize',
    drivers: [
      { key: 'experience', value: profile.experienceBand ?? profile.trainingLevel },
      { key: 'sessionMinutes', value: profile.workoutDuration },
    ],
    outcome: { key: 'exercisesPerDay', value: maxExercisesPerDay(plan.workoutPlan) },
    basis: 'measured',
  })

  // ٣) الحجم الأسبوعي الكلّي — مجموع مجموعات العمل عبر أيام الأسبوع.
  decisions.push({
    area: 'weeklyVolume',
    drivers: [
      { key: 'trainingDays', value: days },
      { key: 'experience', value: profile.experienceBand ?? profile.trainingLevel },
    ],
    outcome: { key: 'weeklySets', value: totalWeeklySets(volume) },
    basis: 'measured',
  })

  // ٤) و٥) نطاق التكرارات والراحة — يقودهما الهدف المنظَّم، ويُقاسان من الخطة.
  if (compound) {
    decisions.push({
      area: 'repRange',
      drivers: [{ key: 'goalType', value: effectiveGoal }],
      outcome: { key: 'compoundReps', value: compound.reps },
      basis: 'measured',
    })
    decisions.push({
      area: 'restBetweenSets',
      drivers: [{ key: 'goalType', value: effectiveGoal }],
      outcome: { key: 'compoundRestSec', value: compound.restSec },
      basis: 'measured',
    })
  }

  // ٦) حوض التمارين — بيئة التمرين والأدوات تُحسم في equipmentAccess، وأثرها
  //    في الحوض قبل الاختيار لا في المخرَج، فالأساس بنيوي لا مقيس.
  decisions.push({
    area: 'equipmentPool',
    drivers: [{ key: 'gymAccess', value: access }],
    outcome: { key: 'resolvedAccess', value: access },
    basis: 'structural',
  })

  // ٧) تصفية الإصابات — **لا يخرج نصّ الإصابة** (§9)، وجودها فقط.
  decisions.push({
    area: 'injuryFilter',
    drivers: [{ key: 'injuries', value: profile.injuries ? 'declared' : 'none' }],
    outcome: { key: 'filter', value: profile.injuries ? 'applied' : 'notApplied' },
    basis: 'structural',
  })

  // ٨) التركيز العضلي — مجموعة إضافية لعضلات التركيز.
  //    **القرار يُحذف كليًّا وهو مثبَّت في الجسر**، ولا يُعرض «متوازنًا» كأنه
  //    اختيار المستخدم. مكانه حينها قسم «ما لم نخصّصه بعد» أدناه.
  if (!focusIsPinned) {
    decisions.push({
      area: 'muscleFocus',
      drivers: [{ key: 'muscleFocus', value: focus }],
      outcome: { key: 'extraSets', value: 'applied' },
      basis: 'structural',
    })
  }

  // ٩) حمل البداية — الرجوع بعد انقطاع أو الانتظام المتقطّع يخفّف الأسبوع الأول.
  decisions.push({
    area: 'startingLoad',
    drivers: [
      { key: 'consistency', value: profile.consistency ?? 'unspecified' },
      { key: 'goalType', value: effectiveGoal },
    ],
    outcome: { key: 'firstWeek', value: conservativeStart ? 'reduced' : 'standard' },
    basis: 'structural',
  })

  // ١٠) سعرات الهدف — رقم مقيس من مخرجات الحاسبات.
  decisions.push({
    area: 'calorieTarget',
    drivers: [{ key: 'goalType', value: effectiveGoal }],
    outcome: { key: 'targetCalories', value: plan.targets.targetCalories },
    basis: 'measured',
  })

  // ١١) حاجز القاصرين — يُذكر فقط حين يُطبَّق فعلًا.
  if (goalWasRestricted) {
    decisions.push({
      area: 'ageGuardrail',
      drivers: [{ key: 'age', value: profile.age }],
      outcome: { key: 'effectiveGoalType', value: effectiveGoal },
      basis: 'measured',
    })
  }

  return {
    decisions,
    weeklyVolume: volume,
    inactiveAxes: [
      // محور القوّة/التضخيم: الحقل غير مجموع أصلًا (مذكّرة المخطّط).
      {
        axis: 'trainingFocus',
        neutralValue: resolveTrainingFocus(profile),
        reason: 'fieldNotCollected',
      },
      // الأداء السابق: `exerciseHistory` قائم لكن لا يستورده المولّد إطلاقًا،
      // و`startingWeight` يخرج فارغًا دائمًا (planGenerator.ts:682).
      { axis: 'pastPerformance', neutralValue: 'none', reason: 'notWiredToGenerator' },
      // التركيز العضلي: حاضر في النوع، مشلول في الجسر (onboardingProfile.ts:283).
      ...(focusIsPinned
        ? [{ axis: 'muscleFocus' as const, neutralValue: focus, reason: 'pinnedByBridge' as const }]
        : []),
    ],
  }
}
