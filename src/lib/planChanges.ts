import type { Customization } from '@/lib/customization'
import type { Lang } from '@/lib/appPreferences'
import { hasNumericNutritionPrescription, targetCaloriesFor } from '@/lib/calculators'
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
    .filter((r) => hasNumericNutritionPrescription(pending.targets) || (r.key !== 'calories' && r.key !== 'protein'))
    .filter((r) => r.before !== r.after)
    .map((r) => ({ key: r.key, label: r.label, before: r.before, after: r.after, reason: r.reason() }))
}
