import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import type { Profile } from '@/types/profile'
import type { WorkoutPlan } from '@/types/workout'
import { declaredEquipment } from '@/lib/equipmentAccess'
import { getExercise } from '@/data/exercises'
import { targetCaloriesFor } from '@/lib/calculators'
import { planTitle } from '@/lib/planGenerator'
import { onboardingStrings } from '@/i18n/dict/onboarding'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'
import { planChangeStrings } from '@/i18n/dict/planChanges'

/**
 * فرق الخطة عند المراجعة — [CTO-65] البند ٤.
 *
 * خطوة المراجعة كانت تعرض **القيم النهائية فقط**: يرى المستخدم «٢٬٦٤٥ سعرة» ولا
 * يعرف أنها كانت ٢٬٢٤٥ ولا **لماذا** تغيّرت. وهذا يمسّ القرار المؤسسي المقفل ٣
 * (تعديلات الخطة اقتراح دائمًا، ويُشرح سبب كل تغيير) — فالعرض بلا سبب تعديل صامت
 * بواجهة.
 *
 * المخرَج هنا **فرق لا ملخّص**: ما لم يتغيّر لا يُذكر إطلاقًا، وكل تغيير يحمل
 * «كان → صار — والسبب».
 *
 * ═══ عقد الصدق في السبب ═══
 * السبب **مستنتَج من المدخلات لا مُخترَع**. قاعدتان فقط:
 *   • تغيّر رقم مشتقّ (سعرات/بروتين) **ومعه** تغيّر في مدخلات الملف ⇒ السبب هو
 *     المدخل الذي تغيّر، مسمّى بالاسم.
 *   • تغيّر بلا أي مدخل مشتقّ ⇒ **«عدّلته بنفسك»** — لا نخترع تعليلًا هندسيًا
 *     لتحرير يدوي.
 * حين لا نعرف السبب نقولها صريحة بدل تلفيق ربط سببي (§5: الصدق قبل الطمأنينة).
 */

/** مدخلات الملف التي تقود الأرقام المشتقّة — تُفحص بالترتيب وتُسمّى في السبب. */
const DRIVER_FIELDS = [
  'weightKg',
  'targetWeightKg',
  'heightCm',
  'age',
  'gender',
  'activityLevel',
  'goal',
  'goalType',
  'trainingLevel',
  'trainingDays',
] as const

export type DriverField = (typeof DRIVER_FIELDS)[number]

export interface PlanChange {
  /** مفتاح ثابت للاختبار — لا يُعرض. */
  key: string
  /** وسم الصفّ كما يراه المستخدم. */
  label: string
  /** القيمة قبل التعديل. */
  before: string
  /** القيمة بعده. */
  after: string
  /** سبب التغيير بالعامية البيضاء — أو null حين لا سبب يُذكر بصدق. */
  reason: string | null
}

/** أي مدخلات الملف تغيّرت بين النسختين (بالاسم، لا عددًا). */
export function changedDrivers(saved: Customization, pending: Customization): DriverField[] {
  return DRIVER_FIELDS.filter((f) => saved.profile[f] !== pending.profile[f])
}

/**
 * يبني قائمة التغييرات. القيم المتطابقة تُسقَط تمامًا — الدالة تعيد فرقًا لا جدولًا.
 */
export function buildPlanChanges(saved: Customization, pending: Customization, lang: Lang): PlanChange[] {
  const d = onboardingStrings[lang]
  const choices = profileChoiceStrings[lang]
  const c = planChangeStrings[lang] ?? planChangeStrings.ar
  const drivers = changedDrivers(saved, pending)

  /** السبب لرقم مشتقّ: أول مدخل تغيّر يُسمّى؛ بلا مدخل ⇒ تحرير يدوي. */
  const derivedReason = (): string =>
    drivers.length > 0 ? c.becauseDriver(drivers.map((f) => c.driver[f]).join(c.driverJoin)) : c.manualEdit

  /** السبب لقيمة يحرّرها المستخدم مباشرةً — لا تعليل هندسي لها. */
  const directReason = (): string => c.manualEdit

  const rows: Array<{ key: string; label: string; before: string; after: string; reason: () => string }> = [
    {
      key: 'name',
      label: d.reviewName,
      before: saved.identity.userName,
      after: pending.identity.userName,
      reason: directReason,
    },
    {
      key: 'goal',
      label: d.reviewGoal,
      before: choices.goal[saved.profile.goalType],
      after: choices.goal[pending.profile.goalType],
      reason: directReason,
    },
    {
      key: 'weight',
      label: d.reviewWeight,
      before: `${saved.profile.weightKg} → ${saved.profile.targetWeightKg} ${d.unitKg}`,
      after: `${pending.profile.weightKg} → ${pending.profile.targetWeightKg} ${d.unitKg}`,
      reason: directReason,
    },
    {
      key: 'calories',
      label: d.reviewTargetCalories,
      before: String(targetCaloriesFor(saved.profile.goal, saved.targets)),
      after: String(targetCaloriesFor(pending.profile.goal, pending.targets)),
      reason: derivedReason,
    },
    {
      key: 'protein',
      label: d.reviewProtein,
      before: `${saved.targets.proteinGrams}${d.gGram}`,
      after: `${pending.targets.proteinGrams}${d.gGram}`,
      reason: derivedReason,
    },
    {
      key: 'schedule',
      label: d.reviewSchedule,
      before: planTitle(saved.workoutPlan.templateId, lang),
      after: planTitle(pending.workoutPlan.templateId, lang),
      reason: derivedReason,
    },
    {
      key: 'meals',
      label: d.reviewMeals,
      before: String(saved.nutritionPlan.meals.length),
      after: String(pending.nutritionPlan.meals.length),
      reason: directReason,
    },
    {
      key: 'suppMed',
      label: d.reviewSuppMed,
      before: String(saved.wellnessPlan.supplements.length + saved.wellnessPlan.medications.length),
      after: String(pending.wellnessPlan.supplements.length + pending.wellnessPlan.medications.length),
      reason: directReason,
    },
    {
      key: 'measurements',
      label: d.reviewMeasurements,
      before: String(saved.measurementPlan.selectedTypeIds.length),
      after: String(pending.measurementPlan.selectedTypeIds.length),
      reason: directReason,
    },
  ]

  // الفرق لا الجدول: المتطابق يُسقَط قبل أي شيء آخر.
  return rows
    .filter((r) => r.before !== r.after)
    .map((r) => ({ key: r.key, label: r.label, before: r.before, after: r.after, reason: r.reason() }))
}


// ════════════════════════════════════════════════════════════════════════════
// نتيجة إعادة التوليد والتحويل لنسخة الأجهزة — [SOVEREIGN-003] D7
// ════════════════════════════════════════════════════════════════════════════
//
// **الجذر (سببان متراكبان):**
//
// ١) الزرّان «إعادة توليد الخطة» و«التحويل لنسخة الأجهزة» ينفّذان **نفس
//    الاستدعاء بالضبط** (`regenerateFromProfile()`) ثم يعلنان نجاحًا نصًّا ثابتًا
//    **بلا أي نظر في المخرَج**:
//      `regenerateFromProfile(); window.alert('تم — خطتك التلقائية صارت بنسخة الأجهزة.')`
//
// ٢) ونيّة «نسخة الأجهزة» تُقرأ في `resolveMachinesOnly` من حقل `preferMachines`
//    **الذي لم يكن يكتبه أحد**. فالتحويل لم يكن يغيّر مدخلًا واحدًا، والمولّد
//    حتميّ، فالمخرَج **مطابق بايتًا** — والرسالة تقول «صارت بنسخة الأجهزة».
//
// **العلاج على مستويين:** النيّة صارت تُكتب فعلًا (`withMachinePreference` في
// `equipmentAccess`)، والرسالة صارت تُشتقّ من **الفرق في المخرَج** لا من الزرّ
// المضغوط. وتطابقُ نتيجةِ مولّدٍ حتميّ لنفس المدخلات **نتيجة صحيحة تُشرح**، لا
// فشل يُخفى ولا نجاح يُدَّعى. النصوص في `@/i18n/dict/planCoherence`.

/** رموز النتائج — القاموس يترجمها، والمحرّك يختارها من الواقع. */
export type PlanOutcomeCode =
  | 'machines_converted'
  | 'machines_already'
  | 'machines_unavailable'
  | 'machines_no_effect'
  | 'regenerated'
  | 'regenerated_identical'

export interface PlanOutcome {
  code: PlanOutcomeCode
  /** هل تغيّر المخرَج فعلًا؟ الواجهة **لا** تعرض حالة نجاح حين تكون false. */
  changed: boolean
  /** عدد أيام الخطة التي اختلف محتواها. */
  changedDays: number
  /** عدد الخانات التي اختلف معرّفها أو مجموعاتها أو تكراراتها أو راحتها. */
  changedExercises: number
}

/** بصمة خانة واحدة — الهوية والوصفة معًا: تبديل جهاز أو تغيير مجموعات كلاهما فرق. */
function slotSignature(pe: { exerciseId: string; sets: number; reps: string; restSec: number }): string {
  return `${pe.exerciseId}|${pe.sets}|${pe.reps}|${pe.restSec}`
}

/** الفرق البنيوي بين خطتي تمرين — أيامٌ وخاناتٌ اختلفت فعلًا. */
export function diffWorkoutPlans(before: WorkoutPlan, after: WorkoutPlan): { changedDays: number; changedExercises: number } {
  let changedDays = 0
  let changedExercises = 0
  const dayCount = Math.max(before.days.length, after.days.length)
  for (let i = 0; i < dayCount; i++) {
    const a = before.days[i]?.exercises ?? []
    const b = after.days[i]?.exercises ?? []
    let dayDelta = 0
    const slots = Math.max(a.length, b.length)
    for (let j = 0; j < slots; j++) {
      const sa = a[j] ? slotSignature(a[j]) : null
      const sb = b[j] ? slotSignature(b[j]) : null
      if (sa !== sb) dayDelta++
    }
    if (dayDelta > 0) {
      changedDays++
      changedExercises += dayDelta
    }
  }
  return { changedDays, changedExercises }
}

/** هل أدوات هذا الملف تسمح ببناء نسخة أجهزة أصلًا؟ (إعلانٌ بلا `machine` ⇒ لا). */
export function machineVersionAvailable(p: Profile): boolean {
  const declared = declaredEquipment(p)
  return declared ? declared.includes('machine') : true
}

/** هل كل خانات الخطة أجهزةٌ فعلًا؟ يُقرأ من الكتالوج لا يُستنتج من النيّة. */
export function planIsAllMachines(plan: WorkoutPlan): boolean {
  const slots = plan.days.flatMap((d) => d.exercises)
  if (!slots.length) return false
  return slots.every((pe) => getExercise(pe.exerciseId)?.equipment.includes('machine') === true)
}

/**
 * نتيجة «التحويل لنسخة الأجهزة» — تُحسب من **مقارنة المخرَجين وقراءة الخطة**،
 * لا من الزرّ. لا تُصدر `machines_converted` إلا وقد اختلف المخرَج فعلًا، ولا
 * تقول «خطتك أصلًا أجهزة» إلا والخطة أجهزةٌ بالكتالوج.
 *
 * `machines_no_effect` هو **الفرع المغلق**: لم يتغيّر شيء، والأدوات تسمح
 * بالأجهزة، والخطة ليست أجهزة — أي أن النيّة لم تصل المحرّك. لا نلفّق له تعليلًا
 * ولا ندّعي نجاحًا؛ نقولها كما هي. ويحرسه تأكيدٌ في `run-plan-coherence-proof.mjs`
 * يسقط بالاسم إن ظهر في مسار سليم.
 */
export function machineConversionOutcome(profile: Profile, before: WorkoutPlan, after: WorkoutPlan): PlanOutcome {
  const { changedDays, changedExercises } = diffWorkoutPlans(before, after)
  if (changedExercises > 0) return { code: 'machines_converted', changed: true, changedDays, changedExercises }
  const unchanged = { changed: false as const, changedDays: 0, changedExercises: 0 }
  if (planIsAllMachines(after)) return { code: 'machines_already', ...unchanged }
  if (!machineVersionAvailable(profile)) return { code: 'machines_unavailable', ...unchanged }
  return { code: 'machines_no_effect', ...unchanged }
}

/** نتيجة «إعادة توليد الخطة» — المولّد حتميّ، فالتطابق نتيجة تُشرح لا نجاح يُدَّعى. */
export function regenerateOutcome(before: WorkoutPlan, after: WorkoutPlan): PlanOutcome {
  const { changedDays, changedExercises } = diffWorkoutPlans(before, after)
  return changedExercises > 0
    ? { code: 'regenerated', changed: true, changedDays, changedExercises }
    : { code: 'regenerated_identical', changed: false, changedDays: 0, changedExercises: 0 }
}
