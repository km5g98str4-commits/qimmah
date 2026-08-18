// اشتقاقات خفيفة من إجابات الإعداد — بلا اعتماد على بيانات التمارين/القوالب.
//
// فُصلت عن planGenerator (P11.5) كي تستطيع وحدات مسار الإقلاع (onboardingProfile)
// استخدامها دون سحب مولّد الخطط وقاعدة التمارين (~80KB) إلى حزمة الدخول.
// planGenerator يعيد تصديرها للحفاظ على التوافق مع المستوردين الحاليين.

import type { ActivityLevel, ExperienceBand, GoalType, TrainingLevel } from '@/types/profile'

/** مستوى التدريب من مدّة الخبرة. */
export function levelFromExperience(band?: ExperienceBand): TrainingLevel {
  if (band === 'lt1m' || band === '1to6m') return 'beginner'
  if (band === '6to12m' || band === '1to2y') return 'intermediate'
  if (band === 'gt2y') return 'advanced'
  return 'intermediate'
}

/** مستوى النشاط مشتقّ من عدد أيام التمرين. */
export function deriveActivityLevel(days: number): ActivityLevel {
  if (days <= 2) return 'light'
  if (days <= 4) return 'moderate'
  if (days <= 6) return 'active'
  return 'very_active'
}

// ═══════════════ الوزن المستهدف — سلطة واحدة لا سلطتان ═══════════════
//
// [SOVEREIGN-003] كان في المستودع **معاملان متنافسان** لنفس الرقم:
//   • هنا:                       تنشيف ×0.92 · تضخيم ×1.05
//   • `onboardingV2Adapter.ts`:  تنشيف ×0.90 · تضخيم ×1.10
// شاشة الكشف كانت ترسم الأول، بينما المدّة المعروضة تحته (`estimatedWeeksToGoal`)
// تُحسب في `calculators.ts` من الثاني — أي **رقم هدف ومدّة من رقمين مختلفين**
// في نفس البطاقة. لمستخدم ٨٢ كجم على التنشيف: يُعرض هدف ٧٥ كجم ومدّة مبنيّة على
// هدف ٧٤ كجم. هذا خرق §١-٧ (رقم يقول عن نفسه ما ليس هو) بلا كذبة نيّة واحدة.
//
// السطران داخل `deriveTargetWeight` هما **الزوج الوحيد في `src/`**، ويحرسه
// `test:target-weight` بفحص بنيوي يسقط بالاسم إن عاد زوج ثانٍ في أي ملف.
//
// وبقيا **رقمين حرفيّين** لا ثابتين مُسمّيين عن قصد: `test:e-calc-explainer`
// يستشهد بهذا السطر بعينه (`weightKg * 0.92`) دليلًا على أن جزءًا من الخطة
// نسبة ثابتة لا تخصيصًا — وهو ما يبرّر تنويه «قواعد عامة» على شاشة الكشف.
// إخفاء الرقم خلف اسم كان سيقطع ذلك الاستشهاد بلا مقابل.

/** وزن هدف منطقي مشتقّ من الوزن والهدف (حين لا يُسأل عنه صراحةً). */
export function deriveTargetWeight(weightKg: number, gt: GoalType): number {
  if (gt === 'cutting') return Math.round(weightKg * 0.92)
  if (gt === 'bulking') return Math.round(weightKg * 1.05)
  return weightKg // recomposition / health / maintenance / returning
}

/** من أين جاء الرقم: كتبه المستخدم، أو اشتققناه نحن. */
export type TargetWeightSource = 'user' | 'derived'

export interface ResolvedTargetWeight {
  targetWeightKg: number
  source: TargetWeightSource
  /**
   * **المشتقّ تقدير، والمُدخَل ليس تقديرًا** (§6/الثابت ٢). هذا الحقل هو ما
   * يحكم ظهور وسم «تقريبي» على الشاشة — لا اجتهاد كل سطح على حدة.
   */
  isEstimate: boolean
  /**
   * رقم المستخدم يعاكس اتجاه هدفه (تنشيف بهدف أثقل، أو تضخيم بهدف أخفّ).
   *
   * **لا نصحّحه صامتًا ولا نمنعه**: قد يعرف عن نفسه ما لا نعرفه (عائد من
   * إصابة، مرحلة استقرار، وزن مرجعي قديم). نعرض رقمه كما كتبه، ونقول
   * التناقض صراحةً، ونمتنع عن رسم مدّة — لأن المدّة تُحسب من اتجاه السعرات
   * الذي يفرضه الهدف، فتخرج عكس رقمه.
   */
  contradictsGoal: boolean
}

/** هل هذا رقمٌ صالح ليكون وزنًا مستهدفًا مُدخَلًا؟ */
function isUsableTarget(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

/** هل يعاكس هذا الهدف اتجاه الغاية المعلنة؟ */
function contradicts(currentWeightKg: number, targetWeightKg: number, gt: GoalType): boolean {
  if (gt === 'cutting') return targetWeightKg > currentWeightKg
  if (gt === 'bulking') return targetWeightKg < currentWeightKg
  return false
}

/**
 * **السلطة الوحيدة للوزن المستهدف.** كل سطح يقرأ منها ولا يشتقّ لنفسه.
 *
 * ١) رقم كتبه المستخدم يفوز دائمًا — لا يُستبدل باشتقاق أبدًا.
 * ٢) بلا رقم مُدخَل: يُشتقّ من `deriveTargetWeight` ويُوسم تقديرًا.
 */
export function resolveTargetWeight(
  currentWeightKg: number,
  gt: GoalType,
  explicitTargetKg?: number | null,
): ResolvedTargetWeight {
  if (isUsableTarget(explicitTargetKg)) {
    return {
      targetWeightKg: explicitTargetKg,
      source: 'user',
      isEstimate: false,
      contradictsGoal: contradicts(currentWeightKg, explicitTargetKg, gt),
    }
  }
  const derived = deriveTargetWeight(currentWeightKg, gt)
  return {
    targetWeightKg: derived,
    source: 'derived',
    isEstimate: true,
    // يُحسب ولا يُفترض: المعاملان يضمنانه اليوم، وأي تعديل قادم عليهما
    // يُكشف هنا بدل أن يُرسم على الشاشة كخطّ يقرأ عكس معناه.
    contradictsGoal: contradicts(currentWeightKg, derived, gt),
  }
}

// ═══════════════ اتّساق المدّة مع الرقم المعروض ═══════════════
//
// `computeTargets` يحسب المدّة بالمعدّل **الخام** ((عجز×٧)/٧٧٠٠ ≈ 0.3636)
// بينما يعرض المعدّل **مقرَّبًا لخانة واحدة** (0.4). فمقارنة `weeks` بقسمة
// واحدة على المعدّل المعروض تفشل فشلًا كاذبًا. لذلك نبني **نطاقًا** من
// المعدّلات التي تُقرَّب إلى الرقم المعروض (±0.05) ونسأل: هل المدّة داخله؟
//
// النطاق ضيّق كفاية ليكشف العطل الحقيقي: هدف ٧٥ ومدّة محسوبة من ٧٤ تسقط خارجه.

/** أضيق وأوسع مدّة يمكن أن تنتج عن (الفارق، معدّل يُقرَّب إلى المعروض). */
export function trajectoryWeeksBand(
  currentWeightKg: number,
  targetWeightKg: number,
  weeklyRateKg: number,
): { min: number; max: number } | null {
  const diff = Math.abs(targetWeightKg - currentWeightKg)
  const rate = Math.abs(weeklyRateKg)
  if (!Number.isFinite(diff) || !Number.isFinite(rate) || diff <= 0 || rate <= 0) return null
  const fastest = rate + 0.05
  const slowest = rate - 0.05
  return {
    min: Math.ceil(diff / fastest),
    max: slowest > 0 ? Math.ceil(diff / slowest) : Number.POSITIVE_INFINITY,
  }
}

/**
 * هل (الوزن الحالي · الهدف المعروض · المعدّل · المدّة) أربعتها من نفس الحساب؟
 *
 * تُستعمل قبل عرض المدّة تحت الهدف: عدم الاتّساق يعني أن رقمين مختلفين
 * يتشاركان بطاقة واحدة، والصواب حينها **إسقاط المدّة** لا عرضها (§5).
 */
export function isTrajectoryConsistent(
  currentWeightKg: number,
  targetWeightKg: number,
  weeklyRateKg: number,
  weeks: number,
): boolean {
  const band = trajectoryWeeksBand(currentWeightKg, targetWeightKg, weeklyRateKg)
  if (!band) return false
  if (!Number.isFinite(weeks) || weeks <= 0) return false
  // الاتجاه قبل المقدار: معدّل صاعد تحت هدف نازل تناقض لا يصلحه أي نطاق.
  const goingUp = targetWeightKg > currentWeightKg
  if (goingUp !== weeklyRateKg > 0) return false
  return weeks >= band.min && weeks <= band.max
}
