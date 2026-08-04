// كتالوج مقاييس الصحة (P9) — مصدر الحقيقة الوحيد لكل مقياس يستطيع قِمّة قراءته.
// The single source of truth for every health metric Qimmah may READ.
//
// القاعدة الصلبة (HARD RULE): قِمّة يقرأ فقط — قائمة أنواع الكتابة (write/share)
// فارغة لأن قِمّة لا يُنشئ أي بيانات صحية حاليًا. لا سجلّات سريرية (clinical
// records) إطلاقًا. انظر docs/data/HEALTHKIT-FOUNDATION.md.
//
// الوحدات: القيمة المخزَّنة دائمًا بوحدة الأساس (SI/base) المذكورة هنا؛ التحويل
// للعرض يتم عبر toDisplay في normalize.ts — لا تحويل داخل المتجر أبدًا.

/** كل مقياس يستطيع قِمّة قراءته من HealthKit — قراءة فقط. */
export type HealthMetric =
  // — قياسات الجسم —
  | 'height'
  | 'bodyMass'
  | 'bodyFatPercentage'
  | 'leanBodyMass'
  // — النشاط —
  | 'steps'
  | 'distanceWalkingRunning'
  | 'flightsClimbed'
  | 'activeEnergyBurned'
  | 'basalEnergyBurned'
  | 'appleExerciseTime'
  | 'appleStandTime'
  | 'workouts'
  // — القلب —
  | 'heartRate'
  | 'restingHeartRate'
  | 'walkingHeartRateAverage'
  | 'heartRateVariabilitySDNN'
  | 'vo2Max'
  | 'heartRateRecoveryOneMinute'
  // — النوم —
  | 'sleepAnalysis'
  // — العلامات الحيوية —
  | 'respiratoryRate'
  | 'oxygenSaturation'
  | 'appleSleepingWristTemperature'
  // — التغذية (قراءة ما سجّلته تطبيقات أخرى؛ قِمّة لا يكتب) —
  | 'dietaryWater'
  | 'dietaryEnergyConsumed'
  | 'dietaryProtein'
  | 'dietaryCarbohydrates'
  | 'dietaryFatTotal'

/** الاسم القديم 'weight' يبقى مقبولًا كمرادف لـ bodyMass في الجسر القديم. */
export type LegacyHealthMetric = 'weight'

export type MetricKind = 'quantity' | 'category' | 'workout'

export interface HealthMetricDef {
  id: HealthMetric
  kind: MetricKind
  /** نوع HealthKit المقابل (توثيقي — الحسم في السويفت). */
  hkType: string
  /** وحدة التخزين الأساسية (تطابق ما يُرجعه الجسر السويفت). */
  unit: string
  /** وحدة العرض + معامل التحويل منها إلى وحدة التخزين (عرض = قيمة × factor). */
  display: { unit: string; unitAr: string; factor: number }
  name: { ar: string; en: string }
  /** مقياس تراكمي (يُجمَع باليوم) أم لحظي (آخر قيمة هي المعبّرة). */
  cumulative: boolean
  /** متاح فقط من iOS 16 — يجب حراسة التوفّر عبر supportedMetrics. */
  requiresIOS16?: boolean
}

const M = (def: HealthMetricDef): HealthMetricDef => def

export const HEALTH_METRICS: Record<HealthMetric, HealthMetricDef> = {
  // — قياسات الجسم —
  height: M({ id: 'height', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierHeight', unit: 'm', display: { unit: 'cm', unitAr: 'سم', factor: 100 }, name: { ar: 'الطول', en: 'Height' }, cumulative: false }),
  bodyMass: M({ id: 'bodyMass', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierBodyMass', unit: 'kg', display: { unit: 'kg', unitAr: 'كجم', factor: 1 }, name: { ar: 'الوزن', en: 'Weight' }, cumulative: false }),
  bodyFatPercentage: M({ id: 'bodyFatPercentage', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierBodyFatPercentage', unit: 'fraction', display: { unit: '%', unitAr: '٪', factor: 100 }, name: { ar: 'نسبة الدهون', en: 'Body fat' }, cumulative: false }),
  leanBodyMass: M({ id: 'leanBodyMass', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierLeanBodyMass', unit: 'kg', display: { unit: 'kg', unitAr: 'كجم', factor: 1 }, name: { ar: 'الكتلة الصافية', en: 'Lean body mass' }, cumulative: false }),
  // — النشاط —
  steps: M({ id: 'steps', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierStepCount', unit: 'count', display: { unit: 'steps', unitAr: 'خطوة', factor: 1 }, name: { ar: 'الخطوات', en: 'Steps' }, cumulative: true }),
  distanceWalkingRunning: M({ id: 'distanceWalkingRunning', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierDistanceWalkingRunning', unit: 'm', display: { unit: 'km', unitAr: 'كم', factor: 0.001 }, name: { ar: 'مسافة المشي والجري', en: 'Walking + running distance' }, cumulative: true }),
  flightsClimbed: M({ id: 'flightsClimbed', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierFlightsClimbed', unit: 'count', display: { unit: 'floors', unitAr: 'طابق', factor: 1 }, name: { ar: 'الطوابق المصعودة', en: 'Flights climbed' }, cumulative: true }),
  activeEnergyBurned: M({ id: 'activeEnergyBurned', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierActiveEnergyBurned', unit: 'kcal', display: { unit: 'kcal', unitAr: 'سعرة', factor: 1 }, name: { ar: 'الطاقة النشطة', en: 'Active energy' }, cumulative: true }),
  basalEnergyBurned: M({ id: 'basalEnergyBurned', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierBasalEnergyBurned', unit: 'kcal', display: { unit: 'kcal', unitAr: 'سعرة', factor: 1 }, name: { ar: 'طاقة الأساس', en: 'Resting energy' }, cumulative: true }),
  appleExerciseTime: M({ id: 'appleExerciseTime', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierAppleExerciseTime', unit: 'min', display: { unit: 'min', unitAr: 'دقيقة', factor: 1 }, name: { ar: 'دقائق التمرين', en: 'Exercise minutes' }, cumulative: true }),
  appleStandTime: M({ id: 'appleStandTime', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierAppleStandTime', unit: 'min', display: { unit: 'min', unitAr: 'دقيقة', factor: 1 }, name: { ar: 'دقائق الوقوف', en: 'Stand minutes' }, cumulative: true }),
  workouts: M({ id: 'workouts', kind: 'workout', hkType: 'HKWorkoutType', unit: 'workout', display: { unit: 'workout', unitAr: 'جلسة', factor: 1 }, name: { ar: 'التمارين المسجّلة', en: 'Workouts' }, cumulative: true }),
  // — القلب —
  heartRate: M({ id: 'heartRate', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierHeartRate', unit: 'bpm', display: { unit: 'bpm', unitAr: 'نبضة/د', factor: 1 }, name: { ar: 'معدّل القلب', en: 'Heart rate' }, cumulative: false }),
  restingHeartRate: M({ id: 'restingHeartRate', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierRestingHeartRate', unit: 'bpm', display: { unit: 'bpm', unitAr: 'نبضة/د', factor: 1 }, name: { ar: 'نبض الراحة', en: 'Resting heart rate' }, cumulative: false }),
  walkingHeartRateAverage: M({ id: 'walkingHeartRateAverage', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierWalkingHeartRateAverage', unit: 'bpm', display: { unit: 'bpm', unitAr: 'نبضة/د', factor: 1 }, name: { ar: 'متوسط نبض المشي', en: 'Walking heart rate avg' }, cumulative: false }),
  heartRateVariabilitySDNN: M({ id: 'heartRateVariabilitySDNN', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', unit: 'ms', display: { unit: 'ms', unitAr: 'مللي ثانية', factor: 1 }, name: { ar: 'تغيّرية النبض (HRV)', en: 'Heart rate variability' }, cumulative: false }),
  vo2Max: M({ id: 'vo2Max', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierVO2Max', unit: 'ml/kg/min', display: { unit: 'ml/kg/min', unitAr: 'مل/كجم/د', factor: 1 }, name: { ar: 'الحد الأقصى للأكسجين (VO₂ Max)', en: 'VO₂ Max' }, cumulative: false }),
  heartRateRecoveryOneMinute: M({ id: 'heartRateRecoveryOneMinute', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierHeartRateRecoveryOneMinute', unit: 'bpm', display: { unit: 'bpm', unitAr: 'نبضة/د', factor: 1 }, name: { ar: 'تعافي النبض (دقيقة)', en: 'Heart rate recovery' }, cumulative: false, requiresIOS16: true }),
  // — النوم —
  sleepAnalysis: M({ id: 'sleepAnalysis', kind: 'category', hkType: 'HKCategoryTypeIdentifierSleepAnalysis', unit: 'min', display: { unit: 'min', unitAr: 'دقيقة', factor: 1 }, name: { ar: 'النوم', en: 'Sleep' }, cumulative: true }),
  // — العلامات الحيوية —
  respiratoryRate: M({ id: 'respiratoryRate', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierRespiratoryRate', unit: 'breaths/min', display: { unit: 'breaths/min', unitAr: 'نفس/د', factor: 1 }, name: { ar: 'معدّل التنفّس', en: 'Respiratory rate' }, cumulative: false }),
  oxygenSaturation: M({ id: 'oxygenSaturation', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierOxygenSaturation', unit: 'fraction', display: { unit: '%', unitAr: '٪', factor: 100 }, name: { ar: 'تشبّع الأكسجين', en: 'Blood oxygen' }, cumulative: false }),
  appleSleepingWristTemperature: M({ id: 'appleSleepingWristTemperature', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierAppleSleepingWristTemperature', unit: 'degC', display: { unit: '°C', unitAr: '°م', factor: 1 }, name: { ar: 'حرارة المعصم أثناء النوم', en: 'Sleeping wrist temperature' }, cumulative: false, requiresIOS16: true }),
  // — التغذية —
  dietaryWater: M({ id: 'dietaryWater', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierDietaryWater', unit: 'mL', display: { unit: 'L', unitAr: 'لتر', factor: 0.001 }, name: { ar: 'الماء', en: 'Water' }, cumulative: true }),
  dietaryEnergyConsumed: M({ id: 'dietaryEnergyConsumed', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierDietaryEnergyConsumed', unit: 'kcal', display: { unit: 'kcal', unitAr: 'سعرة', factor: 1 }, name: { ar: 'السعرات المستهلكة', en: 'Dietary energy' }, cumulative: true }),
  dietaryProtein: M({ id: 'dietaryProtein', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierDietaryProtein', unit: 'g', display: { unit: 'g', unitAr: 'غ', factor: 1 }, name: { ar: 'البروتين', en: 'Protein' }, cumulative: true }),
  dietaryCarbohydrates: M({ id: 'dietaryCarbohydrates', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierDietaryCarbohydrates', unit: 'g', display: { unit: 'g', unitAr: 'غ', factor: 1 }, name: { ar: 'الكربوهيدرات', en: 'Carbohydrates' }, cumulative: true }),
  dietaryFatTotal: M({ id: 'dietaryFatTotal', kind: 'quantity', hkType: 'HKQuantityTypeIdentifierDietaryFatTotal', unit: 'g', display: { unit: 'g', unitAr: 'غ', factor: 1 }, name: { ar: 'الدهون', en: 'Fat' }, cumulative: true }),
}

/** كل المقاييس — تُمرَّر كاملة في نداء التفويض المجمّع الواحد (قرار المالك: طلب واحد بعد شاشة الفائدة). */
export const ALL_HEALTH_METRICS: readonly HealthMetric[] = Object.keys(HEALTH_METRICS) as HealthMetric[]

/**
 * أنواع الكتابة (share) إلى HealthKit — فارغة عمدًا وإلى الأبد ما لم يُنشئ قِمّة
 * البيانات بنفسه (حاليًا: لا شيء). أي إضافة هنا تتطلّب قرار مالك موثّقًا.
 */
export const HEALTH_WRITE_TYPES: readonly string[] = []

/** يحسم المرادف القديم 'weight' إلى المعرّف القياسي. */
export function resolveMetric(metric: HealthMetric | LegacyHealthMetric): HealthMetric {
  return metric === 'weight' ? 'bodyMass' : metric
}

export function metricDef(metric: HealthMetric | LegacyHealthMetric): HealthMetricDef {
  return HEALTH_METRICS[resolveMetric(metric)]
}
