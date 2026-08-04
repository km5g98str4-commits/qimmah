import type { Lang } from '@/lib/appPreferences'
import {
  ADULT_MIN_AGE,
  BULK_SURPLUS,
  CUT_DEFICIT,
  FAT_CALORIE_RATIO,
  KCAL_PER_KG,
  PROTEIN_PER_KG,
  WATER_MAX_LITERS,
  WATER_MIN_LITERS,
  WATER_ML_PER_KG,
} from '@/lib/calculators'
import type { ActivityLevel, Gender, GoalType } from '@/types/profile'

export const E_CALC_CERTAINTY_KEYS = [
  'published_equation',
  'established_range_choice',
  'qimmah_practical_estimate',
] as const

export type ECalcCertaintyKey = (typeof E_CALC_CERTAINTY_KEYS)[number]

export type ECalcInputId =
  | 'age'
  | 'gender'
  | 'height'
  | 'weight'
  | 'activity_level'
  | 'training_days'
  | 'goal'

export type ECalcSourceId =
  | 'bmi'
  | 'bmr'
  | 'macro_energy_factors'
  | 'protein_target'
  | 'fat_ratio'
  | 'water_floor'
  | 'activity_factor'
  | 'calorie_adjustment'
  | 'water_weight_rule'
  | 'weight_change_rate'
  | 'water_ceiling'

export type ECalcInputValueUnitId = 'age' | 'height' | 'weight' | 'training_days'

export interface ECalcInputRow {
  id: ECalcInputId
  label: string
  usedBy: string
}

export interface ECalcSourceRow {
  id: ECalcSourceId
  certainty: ECalcCertaintyKey
  label: string
  source: string
}

export interface ECalcFormulaValues {
  proteinPerKg: number
  fatCalorieRatio: number
  cutDeficit: number
  bulkSurplus: number
  kcalPerKg: number
  waterLitersPerKg: number
  waterMinLiters: number
  waterMaxLiters: number
}

export const E_CALC_FORMULA_VALUES: ECalcFormulaValues = {
  proteinPerKg: PROTEIN_PER_KG,
  fatCalorieRatio: FAT_CALORIE_RATIO,
  cutDeficit: CUT_DEFICIT,
  bulkSurplus: BULK_SURPLUS,
  kcalPerKg: KCAL_PER_KG,
  waterLitersPerKg: WATER_ML_PER_KG,
  waterMinLiters: WATER_MIN_LITERS,
  waterMaxLiters: WATER_MAX_LITERS,
}

export interface ECalcCopyParameters {
  sampleAge: number
  sampleHeightCm: number
  sampleWeightKg: number
  sampleTrainingDays: number
  moderateActivityMultiplier: number
  trainingAddPerDay: number
  activityMultiplierCap: number
  maleCalorieFloor: number
  femaleCalorieFloor: number
  proteinKcalPerGram: number
  carbohydrateKcalPerGram: number
  fatKcalPerGram: number
}

export const E_CALC_COPY_PARAMETERS: ECalcCopyParameters = {
  sampleAge: 30,
  sampleHeightCm: 178,
  sampleWeightKg: 85,
  sampleTrainingDays: 4,
  moderateActivityMultiplier: 1.35,
  trainingAddPerDay: 0.025,
  activityMultiplierCap: 1.9,
  maleCalorieFloor: 1500,
  femaleCalorieFloor: 1200,
  proteinKcalPerGram: 4,
  carbohydrateKcalPerGram: 4,
  fatKcalPerGram: 9,
}

export interface ECalcStrings {
  back: string
  loadingTitle: string
  loadingBody: string
  emptyTitle: string
  emptyBody: string
  errorTitle: string
  errorBody: string
  retryAction: string
  completeProfileAction: string
  expandAction: string
  collapseAction: string
  progressLink: string
  progressLinkDetail: string

  pageTitle: string
  pageSubtitle: string
  intro: string
  introEstimate: string
  needData: string

  inputsTitle: string
  inputsNote: string
  inputsAccuracy: string
  inputRows: readonly ECalcInputRow[]
  genderLabels: Record<Gender, string>
  activityLabels: Record<ActivityLevel, string>
  goalLabels: Record<GoalType, string>
  inputValueUnits: Record<ECalcInputValueUnitId, string>

  bmiTitle: string
  bmiWhat: string
  bmiFormula: string
  bmiExample: string
  bmiSource: string
  bmiUnder: string
  bmiNormal: string
  bmiOver: string
  bmiObese: string
  bmiLimits: string
  bmiMinor: string

  bmrTitle: string
  bmrWhat: string
  bmrSource: string
  bmrFormulaMale: string
  bmrFormulaFemale: string
  bmrExample: string
  bmrAssume: string
  bmrLimits: string
  bmrWhyNoBodyFat: string

  tdeeTitle: string
  tdeeWhat: string
  tdeeFormula: string
  tdeeExample: string
  tdeeApproach: string
  tdeeNeatTitle: string
  tdeeTrainingAdd: string
  tdeeCap: string
  tdeeActivitySedentary: string
  tdeeActivityModerate: string
  tdeeActivityActive: string
  tdeeExampleFull: string
  tdeeHonesty: string
  tdeeLimits: string
  tdeeCalibrate: string

  caloriesTitle: string
  caloriesWhat: string
  caloriesCut: string
  caloriesMaintain: string
  caloriesBulk: string
  caloriesFloor: string
  caloriesMinor: string
  caloriesHonesty: string
  caloriesAdjust: string
  manualOverrideTitle: string
  manualOverrideBody: string

  macrosTitle: string
  proteinTitle: string
  proteinFormula: string
  proteinExample: string
  proteinWhy: string
  proteinSource: string
  proteinLimits: string
  fatTitle: string
  fatFormula: string
  fatExample: string
  fatWhy: string
  fatSource: string
  carbsTitle: string
  carbsFormula: string
  carbsExample: string
  carbsWhy: string
  macrosConversion: string
  macrosLimits: string

  waterTitle: string
  waterFormula: string
  waterExample: string
  waterRange: string
  waterFloorWhy: string
  waterCapWhy: string
  waterHonesty: string
  waterDrinking: string
  waterHeat: string

  rateTitle: string
  rateWhat: string
  rateFormula: string
  rateExampleCut: string
  rateExampleBulk: string
  rateWhyKcalPerKg: string
  rateHonesty: string
  rateWater: string
  rateReal: string
  actualRateAvailable: string
  actualRateMissing: string

  accuracyTitle: string
  accuracyIntro: string
  accuracyBody: string
  accuracyWhatMatters: string
  accuracyHelp: string

  sourcesTitle: string
  sourcesIntro: string
  certaintyLabels: Record<ECalcCertaintyKey, string>
  sourceRows: readonly ECalcSourceRow[]

  disclaimerTitle: string
  disclaimerBody: string
  disclaimerWhen: string
  disclaimerYou: string

  unitKcalPerDay: string
  unitGramPerDay: string
  unitLiterPerDay: string
  unitKgPerWeek: string
}

export interface ECalcDocumentStrings {
  calcPageTitle: string
  calcPageSubtitle: string
  calcIntro: string
  calcIntroEstimate: string
  calcNeedData: string
  calcInputsTitle: string
  calcInputsNote: string
  calcInputsAccuracy: string
  calcInputRows: readonly ECalcInputRow[]
  calcBmiTitle: string
  calcBmiWhat: string
  calcBmiFormula: string
  calcBmiExample: string
  calcBmiSource: string
  calcBmiUnder: string
  calcBmiNormal: string
  calcBmiOver: string
  calcBmiObese: string
  calcBmiLimits: string
  calcBmiMinor: string
  calcBmrTitle: string
  calcBmrWhat: string
  calcBmrSource: string
  calcBmrFormulaMale: string
  calcBmrFormulaFemale: string
  calcBmrExample: string
  calcBmrAssume: string
  calcBmrLimits: string
  calcBmrWhyNoBodyFat: string
  calcTdeeTitle: string
  calcTdeeWhat: string
  calcTdeeFormula: string
  calcTdeeExample: string
  calcTdeeApproach: string
  calcTdeeNeatTitle: string
  calcTdeeTrainingAdd: string
  calcTdeeCap: string
  calcTdeeActivitySedentary: string
  calcTdeeActivityModerate: string
  calcTdeeActivityActive: string
  calcTdeeExampleFull: string
  calcTdeeHonesty: string
  calcTdeeLimits: string
  calcTdeeCalibrate: string
  calcCaloriesTitle: string
  calcCaloriesWhat: string
  calcCaloriesCut: string
  calcCaloriesMaintain: string
  calcCaloriesBulk: string
  calcCaloriesFloor: string
  calcCaloriesMinor: string
  calcCaloriesHonesty: string
  calcCaloriesAdjust: string
  calcMacrosTitle: string
  calcProteinTitle: string
  calcProteinFormula: string
  calcProteinExample: string
  calcProteinWhy: string
  calcProteinSource: string
  calcProteinLimits: string
  calcFatTitle: string
  calcFatFormula: string
  calcFatExample: string
  calcFatWhy: string
  calcFatSource: string
  calcCarbsTitle: string
  calcCarbsFormula: string
  calcCarbsExample: string
  calcCarbsWhy: string
  calcMacrosConversion: string
  calcMacrosLimits: string
  calcWaterTitle: string
  calcWaterFormula: string
  calcWaterExample: string
  calcWaterRange: string
  calcWaterFloorWhy: string
  calcWaterCapWhy: string
  calcWaterHonesty: string
  calcWaterDrinking: string
  calcWaterHeat: string
  calcRateTitle: string
  calcRateWhat: string
  calcRateFormula: string
  calcRateExampleCut: string
  calcRateExampleBulk: string
  calcRateWhy7700: string
  calcRateHonesty: string
  calcRateWater: string
  calcRateReal: string
  calcAccuracyTitle: string
  calcAccuracyIntro: string
  calcAccuracyBody: string
  calcAccuracyWhatMatters: string
  calcAccuracyHelp: string
  calcSourcesTitle: string
  calcSourcesIntro: string
  calcSourceLevel1: string
  calcSourceLevel2: string
  calcSourceLevel3: string
  calcSourceRows: readonly ECalcSourceRow[]
  calcDisclaimerTitle: string
  calcDisclaimerBody: string
  calcDisclaimerWhen: string
  calcDisclaimerYou: string
  calcLoadingTitle: string
  calcLoadingBody: string
  calcEmptyTitle: string
  calcEmptyBody: string
  calcErrorTitle: string
  calcErrorBody: string
  calcRetryAction: string
  calcCompleteProfileAction: string
  calcExpandAction: string
  calcCollapseAction: string
}

interface ECalcExamples {
  bmr: number
  activityMultiplier: number
  tdee: number
  cuttingCalories: number
  bulkingCalories: number
  proteinGrams: number
  fatGrams: number
  carbsGrams: number
  waterLiters: number
  cutWeeklyRate: number
  bulkWeeklyRate: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function calculateExamples(
  formula: ECalcFormulaValues,
  copy: ECalcCopyParameters,
): ECalcExamples {
  const bmr = Math.round(
    copy.sampleWeightKg * 10 +
      copy.sampleHeightCm * 6.25 -
      copy.sampleAge * 5 +
      5,
  )
  const activityMultiplier =
    copy.moderateActivityMultiplier + copy.sampleTrainingDays * copy.trainingAddPerDay
  const tdee = Math.round(bmr * activityMultiplier)
  const cuttingCalories = tdee - formula.cutDeficit
  const bulkingCalories = tdee + formula.bulkSurplus
  const proteinGrams = Math.round(copy.sampleWeightKg * formula.proteinPerKg)
  const fatGrams = Math.round(
    (cuttingCalories * formula.fatCalorieRatio) / copy.fatKcalPerGram,
  )
  const carbsGrams = Math.round(
    (cuttingCalories -
      proteinGrams * copy.proteinKcalPerGram -
      fatGrams * copy.fatKcalPerGram) /
      copy.carbohydrateKcalPerGram,
  )
  const rawWater = copy.sampleWeightKg * formula.waterLitersPerKg
  const waterLiters = clamp(
    Math.round(rawWater * 2) / 2,
    formula.waterMinLiters,
    formula.waterMaxLiters,
  )

  return {
    bmr,
    activityMultiplier,
    tdee,
    cuttingCalories,
    bulkingCalories,
    proteinGrams,
    fatGrams,
    carbsGrams,
    waterLiters,
    cutWeeklyRate: roundTo((formula.cutDeficit * 7) / formula.kcalPerKg, 1),
    bulkWeeklyRate: roundTo((formula.bulkSurplus * 7) / formula.kcalPerKg, 1),
  }
}

function formatNumber(
  lang: Lang,
  value: number,
  minimumFractionDigits = 0,
  maximumFractionDigits = minimumFractionDigits,
): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

function buildArabicStrings(
  formula: ECalcFormulaValues,
  copy: ECalcCopyParameters,
): ECalcStrings {
  const example = calculateExamples(formula, copy)
  const n = (
    value: number,
    minimumFractionDigits = 0,
    maximumFractionDigits = minimumFractionDigits,
  ) => formatNumber('ar', value, minimumFractionDigits, maximumFractionDigits)
  const fatPercent = formula.fatCalorieRatio * 100
  const waterMlPerKg = formula.waterLitersPerKg * 1000
  const sampleHeightMeters = copy.sampleHeightCm / 100
  const sampleBmi = copy.sampleWeightKg / sampleHeightMeters ** 2
  const sampleHeightSquared = roundTo(sampleHeightMeters ** 2, 2)
  const sampleFatCalories = Math.round(
    example.cuttingCalories * formula.fatCalorieRatio,
  )
  const sampleCarbCalories =
    example.cuttingCalories -
    example.proteinGrams * copy.proteinKcalPerGram -
    example.fatGrams * copy.fatKcalPerGram
  const cutWeeklyKcal = formula.cutDeficit * 7

  return {
    back: 'رجوع',
    loadingTitle: 'نجهّز شرح أرقامك',
    loadingBody: 'نقرأ بياناتك المحفوظة ونحسب الأمثلة المرتبطة بها.',
    emptyTitle: 'نحتاج بيانات جسمك أولًا',
    emptyBody: 'أكمل الوزن والطول والعمر والجنس لنشرح الحساب بأرقامك الفعلية.',
    errorTitle: 'تعذّر عرض الحساب الآن',
    errorBody: 'بياناتك محفوظة. أعد المحاولة، وإن استمرّ الخطأ راجع بيانات الجسم في الإعداد.',
    retryAction: 'إعادة المحاولة',
    completeProfileAction: 'إكمال بيانات الجسم',
    expandAction: 'عرض التفاصيل',
    collapseAction: 'إخفاء التفاصيل',
    progressLink: 'كيف حسبنا هذه الأرقام؟',
    progressLinkDetail: 'افهم المعادلات وحدود الدقّة وراء تقديرات التقدّم.',

    pageTitle: 'كيف يحسب قِمّة أرقامك؟',
    pageSubtitle: 'كل رقم في خطتك له طريقة واضحة — نفكّكها هنا بأرقامك أنت.',
    intro:
      'الأرقام التي تراها في خطتك مبنيّة على معادلات منشورة في علم التغذية والرياضة، وعلى اختيارات عملية من قِمّة داخل نطاقات معتمدة. نوضّح هنا مصدر كل رقم، ونميّز ما هو معادلة منشورة عمّا هو اجتهاد منّا.',
    introEstimate:
      'جميع هذه الأرقام تقديرات تصلح للتنظيم والمتابعة. جسمك هو المرجع النهائي، ونقترح التعديل معك بناءً على ما نقيسه فعلًا.',
    needData: 'أكمل بيانات جسمك في الإعداد لنعرض لك الحساب بأرقامك الفعلية.',

    inputsTitle: 'بياناتك التي نبني عليها',
    inputsNote: 'هذه أرقام أدخلتَها أنت، ونستخدمها كما هي بلا تعديل.',
    inputsAccuracy: 'تحديث وزنك بانتظام يجعل كل الأرقام أدقّ — فالوزن يدخل في أربعة منها.',
    inputRows: [
      { id: 'age', label: 'العمر', usedBy: 'معدّل الأيض الأساسي' },
      { id: 'gender', label: 'الجنس', usedBy: 'معدّل الأيض الأساسي · الحدّ الأدنى للسعرات' },
      { id: 'height', label: 'الطول', usedBy: 'معدّل الأيض الأساسي · مؤشّر كتلة الجسم' },
      {
        id: 'weight',
        label: 'الوزن',
        usedBy: 'معدّل الأيض الأساسي · مؤشّر كتلة الجسم · البروتين · الماء',
      },
      { id: 'activity_level', label: 'مستوى النشاط', usedBy: 'إجمالي الطاقة اليومية' },
      { id: 'training_days', label: 'أيام التدريب', usedBy: 'إجمالي الطاقة اليومية' },
      {
        id: 'goal',
        label: 'الهدف',
        usedBy: 'السعرات المستهدفة · معدّل التغيّر المتوقع',
      },
    ],
    genderLabels: {
      male: 'ذكر',
      female: 'أنثى',
      unspecified: 'غير محدّد',
    },
    activityLabels: {
      sedentary: 'خامل',
      light: 'نشاط خفيف',
      moderate: 'نشاط متوسط',
      active: 'نشِط',
      very_active: 'نشِط جدًّا',
    },
    goalLabels: {
      cutting: 'تنشيف',
      bulking: 'تضخيم',
      maintenance: 'محافظة',
      recomposition: 'إعادة تشكيل الجسم',
      returning: 'رجوع بعد انقطاع',
      health: 'صحّة عامة',
    },
    inputValueUnits: {
      age: 'سنة',
      height: 'سم',
      weight: 'كجم',
      training_days: 'أيام / أسبوع',
    },

    bmiTitle: 'مؤشّر كتلة الجسم',
    bmiWhat: 'رقم يقارن وزنك بطولك، ويُستخدم في الصحّة العامة كمؤشّر أوّلي سريع.',
    bmiFormula: 'الوزن (كجم) ÷ (الطول بالمتر)²',
    bmiExample: `${n(copy.sampleWeightKg)} ÷ (${n(sampleHeightMeters, 2)})² = ${n(copy.sampleWeightKg)} ÷ ${n(sampleHeightSquared, 2)} = ${n(sampleBmi, 1)}`,
    bmiSource: 'المعادلة والعتبات من منظمة الصحة العالمية.',
    bmiUnder: 'أقل من ١٨٫٥ — أقل من النطاق المرجعي',
    bmiNormal: '١٨٫٥ إلى ٢٤٫٩ — ضمن النطاق المرجعي',
    bmiOver: '٢٥ إلى ٢٩٫٩ — فوق النطاق المرجعي',
    bmiObese: '٣٠ فأكثر — أعلى بكثير من النطاق المرجعي',
    bmiLimits:
      'مؤشّر كتلة الجسم لا يفرّق بين العضل والدهون. رياضي عضليّ قد يظهر «فوق النطاق» وهو في حالة ممتازة، وشخص قليل الحركة قد يظهر «ضمن النطاق» وتكوين جسمه غير مثالي. اقرأه مؤشّرًا أوّليًا لا حكمًا.',
    bmiMinor: `لا نعرض تصنيف مؤشّر كتلة الجسم لمن هم دون ${n(ADULT_MIN_AGE)} سنة. تقييمه في هذا العمر يحتاج مخططات نموّ بحسب العمر والجنس، ولا يصحّ تطبيق عتبات البالغين عليه.`,

    bmrTitle: 'معدّل الأيض الأساسي',
    bmrWhat:
      'الطاقة التي يحتاجها جسمك وأنت ساكن تمامًا — للتنفّس والدورة الدموية والحفاظ على حرارة الجسم ووظائف الأعضاء.',
    bmrSource:
      'نستخدم معادلة Mifflin-St Jeor، وهي من أكثر المعادلات دقّة واستخدامًا لتقدير طاقة الراحة لدى البالغين الأصحّاء.',
    bmrFormulaMale: '(١٠ × الوزن) + (٦٫٢٥ × الطول) − (٥ × العمر) + ٥',
    bmrFormulaFemale: '(١٠ × الوزن) + (٦٫٢٥ × الطول) − (٥ × العمر) − ١٦١',
    bmrExample: `(${n(10)} × ${n(copy.sampleWeightKg)}) + (${n(6.25, 2)} × ${n(copy.sampleHeightCm)}) − (${n(5)} × ${n(copy.sampleAge)}) + ${n(5)}\n= ${n(example.bmr)} سعرة يوميًا`,
    bmrAssume: 'المعادلة مبنيّة على بالغين أصحّاء، وتفترض تكوين جسم قريبًا من المتوسّط.',
    bmrLimits:
      'تقديرها يقترب عادةً من القياس المخبري بفارق ±١٠٪ تقريبًا لدى معظم الناس. وقد يزيد الفارق عند من لديه كتلة عضلية عالية جدًّا أو حالة صحّية تؤثّر في الأيض.',
    bmrWhyNoBodyFat:
      'معادلات أخرى تستخدم نسبة الدهون فتكون أدقّ نظريًا — لكنها تحتاج قياسًا موثوقًا لنسبة الدهون، وهو غير متاح لمعظم الناس.',

    tdeeTitle: 'إجمالي طاقتك اليومية',
    tdeeWhat:
      'معدّل الأيض الأساسي مضروبًا في معامل يعبّر عن حركتك — نشاط حياتك اليومية زائد تمرينك.',
    tdeeFormula: 'معدّل الأيض الأساسي × معامل النشاط',
    tdeeExample: `${n(example.bmr)} × ${n(example.activityMultiplier, 2)} = ${n(example.tdee)} سعرة يوميًا`,
    tdeeApproach:
      'نفصل حركة حياتك اليومية عن تمرينك عمدًا. الجداول الشائعة تدمجهما في معامل واحد فتحتسب التمرين مرّتين لمن يتمرّن كثيرًا.',
    tdeeNeatTitle: 'من حركة حياتك',
    tdeeTrainingAdd: `ثم نضيف ${n(copy.trainingAddPerDay, 3)} لكل يوم تدريب أسبوعيًا.`,
    tdeeCap: `الحدّ الأقصى للمعامل الكلّي ${n(copy.activityMultiplierCap, 1)}.`,
    tdeeActivitySedentary: 'خامل أو نشاط خفيف',
    tdeeActivityModerate: 'نشاط متوسط',
    tdeeActivityActive: 'نشِط أو نشِط جدًّا',
    tdeeExampleFull: `نشاطك متوسط (${n(copy.moderateActivityMultiplier, 2)}) + ${n(copy.sampleTrainingDays)} أيام تدريب (${n(copy.sampleTrainingDays)} × ${n(copy.trainingAddPerDay, 3)} = ${n(copy.sampleTrainingDays * copy.trainingAddPerDay, 2)}) = ${n(example.activityMultiplier, 2)}`,
    tdeeHonesty:
      'هذا المعامل اختيار من قِمّة، لا معادلة منشورة. بحثنا عن مرجع منشور لهذه الطريقة بالذات فلم نجده، ونذكر ذلك بوضوح بدل أن نقدّمه علمًا مثبتًا. أساسه منطقيّ — تجنّب احتساب التمرين مرّتين — لكنه يبقى تقديرًا عمليًا.',
    tdeeLimits:
      'إجمالي الطاقة اليومية أكثر أرقامك تفاوتًا بين شخص وآخر. شخصان بنفس الجسم ونفس التمرين قد يختلفان بمئات السعرات بسبب حركة يومية لا يشعران بها.',
    tdeeCalibrate:
      'لهذا نقترح تعديل هذا الرقم بناءً على وزنك المسجَّل بعد أسبوعين إلى ثلاثة، لا بناءً على المعادلة وحدها. الميزان مرجع أدقّ من أيّ معامل.',

    caloriesTitle: 'سعراتك المستهدفة',
    caloriesWhat: 'نبدأ من إجمالي طاقتك اليومية، ثم نطرح أو نضيف بحسب هدفك.',
    caloriesCut: `تنشيف: ناقص ${n(formula.cutDeficit)} سعرة. ${n(example.tdee)} − ${n(formula.cutDeficit)} = ${n(example.cuttingCalories)}.`,
    caloriesMaintain: `محافظة: بلا تعديل. ${n(example.tdee)} سعرة يوميًا.`,
    caloriesBulk: `تضخيم: زائد ${n(formula.bulkSurplus)} سعرة. ${n(example.tdee)} + ${n(formula.bulkSurplus)} = ${n(example.bulkingCalories)}.`,
    caloriesFloor: `لا تنزل سعراتك المستهدفة تحت حدّ أدنى مهما كان هدفك: ${n(copy.maleCalorieFloor)} للذكور و${n(copy.femaleCalorieFloor)} للإناث. النزول تحت هذا الحدّ يحتاج إشرافًا مختصًّا، ولا نصل إليه بحساب تلقائي.`,
    caloriesMinor: `لمن هم دون ${n(ADULT_MIN_AGE)} سنة نحسب على المحافظة دائمًا — بلا عجز أو فائض — لأن تعديل الوزن في هذا العمر يحتاج متابعة مختصّ ومخططات نموّ.`,
    caloriesHonesty: `رقما ${n(formula.cutDeficit)} و${n(formula.bulkSurplus)} اختيار من قِمّة، لا معادلة منشورة. اخترناهما لأنهما يعطيان تغيّرًا ملموسًا مع بقاء الخطة قابلة للاستمرار. الأنسب لك قد يختلف.`,
    caloriesAdjust:
      'إن لاحظنا أن وزنك لا يتحرّك كما هو متوقّع، سنقترح تعديلًا ونشرح سببه. ولن نغيّر أرقامك دون علمك.',
    manualOverrideTitle: 'هدف السعرات عُدّل يدويًا',
    manualOverrideBody:
      'الهدف المحفوظ يعكس تعديلك اليدوي. المعادلة أدناه تعرض خط الأساس المحسوب وتشرح مصدره، ولا تفترض أنه يساوي هدفك الحالي.',

    macrosTitle: 'الماكروز',
    proteinTitle: 'البروتين',
    proteinFormula: `${n(formula.proteinPerKg, 1)} غرام لكل كيلوغرام من وزن جسمك`,
    proteinExample: `${n(formula.proteinPerKg, 1)} × ${n(copy.sampleWeightKg)} = ${n(example.proteinGrams)} غرامًا يوميًا`,
    proteinWhy:
      'البروتين يحمي عضلك أثناء خسارة الدهون، ويبني عضلًا جديدًا مع التدريب، ويُشبع أكثر من غيره لكل سعرة.',
    proteinSource: `مراجعة بحثية شاملة لتدريب المقاومة وجدت أن الفائدة تستقرّ عند نحو ١٫٦ غ/كجم، مع نطاق ثقة يمتدّ إلى ٢٫٢. رقمنا ${n(formula.proteinPerKg, 1)} يقع داخل هذا النطاق.`,
    proteinLimits:
      'الرقم مبنيّ على وزن الجسم الكلّي. من لديه نسبة دهون مرتفعة قد يكفيه أقلّ، إذ إن حاجة البروتين ترتبط بالكتلة الخالية من الدهون أكثر من الوزن الكلّي.',
    fatTitle: 'الدهون',
    fatFormula: `${n(fatPercent)}٪ من سعراتك المستهدفة ÷ ${n(copy.fatKcalPerGram)}`,
    fatExample: `(${n(example.cuttingCalories)} × ${n(formula.fatCalorieRatio, 2)}) ÷ ${n(copy.fatKcalPerGram)} = ${n(sampleFatCalories)} ÷ ${n(copy.fatKcalPerGram)} = ${n(example.fatGrams)} غرامًا يوميًا`,
    fatWhy: `الدهون ضرورية لتوازن الهرمونات وامتصاص الفيتامينات الذائبة فيها. كل غرام منها يعطي ${n(copy.fatKcalPerGram)} سعرات.`,
    fatSource: `النطاق المعتمد للبالغين ٢٠–٣٥٪ من الطاقة، و${n(fatPercent)}٪ اختيار من قِمّة في وسطه.`,
    carbsTitle: 'الكربوهيدرات',
    carbsFormula: `ما تبقّى من سعراتك بعد البروتين والدهون ÷ ${n(copy.carbohydrateKcalPerGram)}`,
    carbsExample: `${n(example.cuttingCalories)} − (${n(example.proteinGrams)} × ${n(copy.proteinKcalPerGram)}) − (${n(example.fatGrams)} × ${n(copy.fatKcalPerGram)}) = ${n(sampleCarbCalories)}\n${n(sampleCarbCalories)} ÷ ${n(copy.carbohydrateKcalPerGram)} = ${n(example.carbsGrams)} غرامًا يوميًا`,
    carbsWhy:
      'الكربوهيدرات وقودك الأساسي في التمرين. نحسبها آخرًا لأن البروتين والدهون لهما حدّ أدنى وظيفي، أمّا الكربوهيدرات فتملأ ما تبقّى.',
    macrosConversion: `معاملات التحويل: ${n(copy.proteinKcalPerGram)} سعرات لكل غرام بروتين · ${n(copy.carbohydrateKcalPerGram)} لكل غرام كربوهيدرات · ${n(copy.fatKcalPerGram)} لكل غرام دهون.`,
    macrosLimits:
      'هذه المعاملات متوسّطات عامّة معتمدة. القيمة الفعلية تختلف قليلًا بين الأطعمة بحسب تركيبها وقابليتها للهضم.',

    waterTitle: 'الماء',
    waterFormula: `${n(waterMlPerKg)} مليلترًا لكل كيلوغرام من وزنك، ثم نقرّبه لأقرب نصف لتر.`,
    waterExample: `${n(copy.sampleWeightKg)} × ${n(formula.waterLitersPerKg, 3)} = ${n(copy.sampleWeightKg * formula.waterLitersPerKg, 3)} لتر ← ${n(example.waterLiters, 1)} لتر يوميًا`,
    waterRange: `ونُبقي النتيجة بين ${n(formula.waterMinLiters, 1)} لتر كحدّ أدنى و${n(formula.waterMaxLiters)} لترات كحدّ أقصى.`,
    waterFloorWhy: `الأرضية ${n(formula.waterMinLiters, 1)} لتر تقع ضمن المراجع الأوروبية والأمريكية لاحتياج البالغين اليومي من الماء.`,
    waterCapWhy: `السقف ${n(formula.waterMaxLiters)} لترات حدّ أمان. قاعدة «${n(waterMlPerKg)} مل/كجم» تعطي أرقامًا غير معقولة عند الأوزان العالية جدًّا — لأن حاجة السوائل لا ترتفع بنفس نسبة ارتفاع كتلة الدهون. ما فوق ${n(formula.waterMaxLiters)} لترات يحتاج تقييمًا فرديًا.`,
    waterHonesty: `قاعدة ${n(waterMlPerKg)} مل/كجم قاعدة سريرية شائعة لا معيارًا مثبتًا. المراجع الرسمية تبني توصياتها على الجنس والفئة السكّانية لا على وزن الجسم. اخترناها لأنها تعطي رقمًا شخصيًا مفيدًا، ونذكر أنها تقدير عملي.`,
    waterDrinking:
      'هذا الرقم يقدّر ما تشربه فقط. طعامك يوفّر نحو ٢٠٪ إضافية من ماء يومك.',
    waterHeat:
      'في الأيام الحارّة أو التمارين الطويلة تزيد حاجتك. العطش مؤشّر جيّد، ولون البول الفاتح علامة مطمئنة.',

    rateTitle: 'معدّل التغيّر المتوقّع',
    rateWhat: 'تقدير لسرعة تغيّر وزنك إن التزمت بسعراتك المستهدفة.',
    rateFormula: `(العجز أو الفائض اليومي × ${n(7)}) ÷ ${n(formula.kcalPerKg)}`,
    rateExampleCut: `(${n(formula.cutDeficit)} × ${n(7)}) ÷ ${n(formula.kcalPerKg)} = ${n(cutWeeklyKcal)} ÷ ${n(formula.kcalPerKg)} = تقديريًا ${n(example.cutWeeklyRate, 1)} كجم أسبوعيًا`,
    rateExampleBulk: `(${n(formula.bulkSurplus)} × ${n(7)}) ÷ ${n(formula.kcalPerKg)} = تقديريًا ${n(example.bulkWeeklyRate, 1)} كجم أسبوعيًا`,
    rateWhyKcalPerKg: `الرقم ${n(formula.kcalPerKg)} تقدير تقليدي للطاقة المخزّنة في كيلوغرام من نسيج الجسم.`,
    rateHonesty: `هذه أكثر أرقامك تقديرًا. قاعدة ${n(formula.kcalPerKg)} قاعدة ثابتة قديمة، والجسم في الواقع يتكيّف: كلّما نزل وزنك انخفض احتياجك من الطاقة قليلًا، فيبطؤ المعدّل تدريجيًا. الأسابيع الأولى عادةً أسرع من التالية.`,
    rateWater:
      'تغيّر وزن الأسبوع الأول غالبًا ماء لا دهون — خصوصًا مع تغيّر الكربوهيدرات أو الملح. لا تقرأ نتيجة أسبوع واحد على أنها اتّجاه.',
    rateReal:
      'نعرض إلى جانب هذا التقدير معدّلك الفعلي المحسوب من وزنك المسجَّل. وحين يختلفان، الفعلي هو الصحيح.',
    actualRateAvailable:
      'هذا معدّلك الفعلي من أوزانك المسجّلة. إذا اختلف عن التقدير، فالمعدّل الفعلي هو المرجع.',
    actualRateMissing:
      'سجّل وزنك بانتظام لنعرض معدّلك الفعلي إلى جانب التقدير.',

    accuracyTitle: 'إلى أيّ مدى تدقّ هذه الأرقام؟',
    accuracyIntro: 'سؤال عادل، وهذه إجابته بصراحة:',
    accuracyBody:
      'نقطة انطلاق جيّدة، لا حقيقة نهائية. المعادلات مبنيّة على متوسّطات مجموعات كبيرة، وأنت لست متوسّطًا. الفارق المعتاد بين التقدير والواقع يتراوح بين ١٠٪ و١٥٪ في أرقام الطاقة.',
    accuracyWhatMatters:
      'الأهمّ من دقّة الرقم الأول هو ما نفعله بعده. نتابع وزنك وسجلّك، ونقترح تعديلًا حين نلاحظ أن الواقع يخالف التقدير. الرقم الجيّد بعد ثلاثة أسابيع من المتابعة أفضل من أدقّ رقم في اليوم الأول.',
    accuracyHelp:
      'تساعدنا على الدقّة بثلاثة أمور: تسجيل وزنك بانتظام · تسجيل طعامك بصدق · إبقاء بياناتك محدّثة.',

    sourcesTitle: 'من أين جاء كل رقم؟',
    sourcesIntro: 'نميّز بين ثلاث درجات، ونضع كل رقم في درجته بلا تجميل:',
    certaintyLabels: {
      published_equation: 'معادلة منشورة — من بحث علمي منشور ومراجَع.',
      established_range_choice:
        'اختيار داخل نطاق معتمد — الرقم من عندنا، والنطاق الذي يقع فيه معتمد علميًا.',
      qimmah_practical_estimate:
        'تقدير عملي من قِمّة — لم نجد له مرجعًا منشورًا بهذه الصيغة، ونقوله صراحة.',
    },
    sourceRows: [
      {
        id: 'bmi',
        certainty: 'published_equation',
        label: 'مؤشّر كتلة الجسم',
        source: 'منظمة الصحة العالمية',
      },
      {
        id: 'bmr',
        certainty: 'published_equation',
        label: 'معدّل الأيض الأساسي',
        source: 'Mifflin-St Jeor (1990)',
      },
      {
        id: 'macro_energy_factors',
        certainty: 'published_equation',
        label: `معاملات ${n(copy.proteinKcalPerGram)}/${n(copy.carbohydrateKcalPerGram)}/${n(copy.fatKcalPerGram)} للماكروز`,
        source: 'معاملات Atwater العامة',
      },
      {
        id: 'protein_target',
        certainty: 'established_range_choice',
        label: `البروتين ${n(formula.proteinPerKg, 1)} غ/كجم`,
        source: 'مراجعة Morton (2018)',
      },
      {
        id: 'fat_ratio',
        certainty: 'established_range_choice',
        label: `الدهون ${n(fatPercent)}٪`,
        source: 'النطاق المعتمد للبالغين ٢٠–٣٥٪',
      },
      {
        id: 'water_floor',
        certainty: 'established_range_choice',
        label: `أرضية الماء ${n(formula.waterMinLiters, 1)} لتر`,
        source: 'مراجع البالغين الأوروبية والأمريكية',
      },
      {
        id: 'activity_factor',
        certainty: 'qimmah_practical_estimate',
        label: 'معامل النشاط',
        source: 'لا مرجع منشور لهذه الصيغة',
      },
      {
        id: 'calorie_adjustment',
        certainty: 'qimmah_practical_estimate',
        label: `العجز ${n(formula.cutDeficit)} / الفائض ${n(formula.bulkSurplus)}`,
        source: 'سياسة منتج',
      },
      {
        id: 'water_weight_rule',
        certainty: 'qimmah_practical_estimate',
        label: `الماء ${n(waterMlPerKg)} مل/كجم`,
        source: 'قاعدة سريرية شائعة',
      },
      {
        id: 'weight_change_rate',
        certainty: 'qimmah_practical_estimate',
        label: `معدّل التغيّر ${n(formula.kcalPerKg)}`,
        source: 'قاعدة ثابتة قديمة، والجسم يتكيّف',
      },
      {
        id: 'water_ceiling',
        certainty: 'qimmah_practical_estimate',
        label: `سقف الماء ${n(formula.waterMaxLiters)} لترات`,
        source: 'حدّ أمان للمنتج',
      },
    ],

    disclaimerTitle: 'تنويه',
    disclaimerBody:
      'هذه الأرقام تقديرات تنظيمية للتخطيط والمتابعة، وليست تشخيصًا طبيًا ولا وصفة علاجية ولا بديلًا عن استشارة مختصّ. قِمّة لا يشخّص ولا يعالج ولا يصف دواءً.',
    disclaimerWhen: `راجع مختصًّا قبل أي تغيير كبير في تمرينك أو طعامك إن كان لديك حالة صحّية أو تتناول دواءً بانتظام، أو إن كنتِ حاملًا أو مرضعًا، أو إن كان عمرك دون ${n(ADULT_MIN_AGE)} سنة، أو إن ظهرت أعراض تقلقك.`,
    disclaimerYou:
      'أنت أعرف بجسمك. إن خالف رقمٌ ما تشعر به، فما تشعر به يستحقّ الانتباه.',

    unitKcalPerDay: 'سعرة / يوم',
    unitGramPerDay: 'غرام / يوم',
    unitLiterPerDay: 'لتر / يوم',
    unitKgPerWeek: 'كجم / أسبوع',
  }
}

function buildEnglishStrings(
  formula: ECalcFormulaValues,
  copy: ECalcCopyParameters,
): ECalcStrings {
  const example = calculateExamples(formula, copy)
  const n = (
    value: number,
    minimumFractionDigits = 0,
    maximumFractionDigits = minimumFractionDigits,
  ) => formatNumber('en', value, minimumFractionDigits, maximumFractionDigits)
  const fatPercent = formula.fatCalorieRatio * 100
  const waterMlPerKg = formula.waterLitersPerKg * 1000
  const sampleHeightMeters = copy.sampleHeightCm / 100
  const sampleBmi = copy.sampleWeightKg / sampleHeightMeters ** 2
  const sampleHeightSquared = roundTo(sampleHeightMeters ** 2, 2)
  const sampleFatCalories = Math.round(
    example.cuttingCalories * formula.fatCalorieRatio,
  )
  const sampleCarbCalories =
    example.cuttingCalories -
    example.proteinGrams * copy.proteinKcalPerGram -
    example.fatGrams * copy.fatKcalPerGram
  const cutWeeklyKcal = formula.cutDeficit * 7

  return {
    back: 'Back',
    loadingTitle: 'Preparing your number breakdown',
    loadingBody: 'We’re reading your saved details and building the examples tied to them.',
    emptyTitle: 'We need your body details first',
    emptyBody: 'Add your weight, height, age, and sex so we can explain the math with your actual numbers.',
    errorTitle: 'We couldn’t show the calculation',
    errorBody: 'Your data is still saved. Try again, or review your body details in setup if the issue continues.',
    retryAction: 'Try again',
    completeProfileAction: 'Complete body details',
    expandAction: 'Show details',
    collapseAction: 'Hide details',
    progressLink: 'How did we calculate these numbers?',
    progressLinkDetail: 'See the equations and accuracy limits behind your progress estimates.',

    pageTitle: 'How Qimmah calculates your numbers',
    pageSubtitle: 'Every number in your plan has a clear method — here it is, worked through with your own numbers.',
    intro:
      'The numbers in your plan are built on published equations from nutrition and exercise science, plus practical choices Qimmah makes within established ranges. Here we show where each number comes from and distinguish published equations from our own judgment calls.',
    introEstimate:
      'All of these are estimates meant for planning and tracking. Your body is the final reference, and we suggest adjustments with you based on what we actually measure.',
    needData: 'Complete your body details in setup and we’ll show the calculation with your actual numbers.',

    inputsTitle: 'What we build on',
    inputsNote: 'These are numbers you entered, and we use them exactly as they are.',
    inputsAccuracy: 'Updating your weight regularly makes every number more accurate — it feeds into four of them.',
    inputRows: [
      { id: 'age', label: 'Age', usedBy: 'Basal Metabolic Rate' },
      { id: 'gender', label: 'Sex', usedBy: 'Basal Metabolic Rate · calorie floor' },
      { id: 'height', label: 'Height', usedBy: 'Basal Metabolic Rate · Body Mass Index' },
      {
        id: 'weight',
        label: 'Weight',
        usedBy: 'Basal Metabolic Rate · Body Mass Index · protein · water',
      },
      { id: 'activity_level', label: 'Activity level', usedBy: 'Total daily energy' },
      { id: 'training_days', label: 'Training days', usedBy: 'Total daily energy' },
      {
        id: 'goal',
        label: 'Goal',
        usedBy: 'Target calories · expected rate of change',
      },
    ],
    genderLabels: {
      male: 'Male',
      female: 'Female',
      unspecified: 'Not specified',
    },
    activityLabels: {
      sedentary: 'Sedentary',
      light: 'Light activity',
      moderate: 'Moderate activity',
      active: 'Active',
      very_active: 'Very active',
    },
    goalLabels: {
      cutting: 'Cutting',
      bulking: 'Bulking',
      maintenance: 'Maintenance',
      recomposition: 'Body recomposition',
      returning: 'Returning after a break',
      health: 'General health',
    },
    inputValueUnits: {
      age: 'years',
      height: 'cm',
      weight: 'kg',
      training_days: 'days / week',
    },

    bmiTitle: 'Body Mass Index',
    bmiWhat: 'A number comparing your weight to your height, used in public health as a quick first indicator.',
    bmiFormula: 'Weight (kg) ÷ (height in metres)²',
    bmiExample: `${n(copy.sampleWeightKg)} ÷ (${n(sampleHeightMeters, 2)})² = ${n(copy.sampleWeightKg)} ÷ ${n(sampleHeightSquared, 2)} = ${n(sampleBmi, 1)}`,
    bmiSource: 'The equation and thresholds come from the World Health Organization.',
    bmiUnder: 'Under 18.5 — below the reference range',
    bmiNormal: '18.5 to 24.9 — within the reference range',
    bmiOver: '25 to 29.9 — above the reference range',
    bmiObese: '30 and above — well above the reference range',
    bmiLimits:
      'BMI doesn’t distinguish muscle from fat. A muscular athlete may read “above range” while in excellent shape, and a sedentary person may read “within range” with poor body composition. Read it as a first indicator, not a verdict.',
    bmiMinor: `We don’t show a BMI category for anyone under ${n(ADULT_MIN_AGE)}. Assessing it at that age requires age- and sex-specific growth charts; adult thresholds don’t apply.`,

    bmrTitle: 'Basal Metabolic Rate',
    bmrWhat:
      'The energy your body needs at complete rest — for breathing, circulation, maintaining body temperature, and organ function.',
    bmrSource:
      'We use the Mifflin-St Jeor equation, one of the most accurate and widely used for estimating resting energy in healthy adults.',
    bmrFormulaMale: '(10 × weight) + (6.25 × height) − (5 × age) + 5',
    bmrFormulaFemale: '(10 × weight) + (6.25 × height) − (5 × age) − 161',
    bmrExample: `(${n(10)} × ${n(copy.sampleWeightKg)}) + (${n(6.25, 2)} × ${n(copy.sampleHeightCm)}) − (${n(5)} × ${n(copy.sampleAge)}) + ${n(5)}\n= ${n(example.bmr)} kcal/day`,
    bmrAssume: 'The equation is based on healthy adults and assumes a body composition near average.',
    bmrLimits:
      'Its estimate typically falls within about ±10% of laboratory measurement for most people. The gap can widen for those with very high muscle mass or a medical condition affecting metabolism.',
    bmrWhyNoBodyFat:
      'Other equations use body-fat percentage and are theoretically more accurate — but they require a reliable body-fat measurement, which most people don’t have.',

    tdeeTitle: 'Your total daily energy',
    tdeeWhat:
      'Your basal rate multiplied by a factor reflecting how much you move — daily life activity plus your training.',
    tdeeFormula: 'Basal rate × activity factor',
    tdeeExample: `${n(example.bmr)} × ${n(example.activityMultiplier, 2)} = ${n(example.tdee)} kcal/day`,
    tdeeApproach:
      'We deliberately separate your daily life movement from your training. Common tables merge them into one factor, which double-counts training for people who train often.',
    tdeeNeatTitle: 'From your daily movement',
    tdeeTrainingAdd: `Then we add ${n(copy.trainingAddPerDay, 3)} for each weekly training day.`,
    tdeeCap: `The total factor is capped at ${n(copy.activityMultiplierCap, 1)}.`,
    tdeeActivitySedentary: 'Sedentary or light activity',
    tdeeActivityModerate: 'Moderate activity',
    tdeeActivityActive: 'Active or very active',
    tdeeExampleFull: `Moderate activity (${n(copy.moderateActivityMultiplier, 2)}) + ${n(copy.sampleTrainingDays)} training days (${n(copy.sampleTrainingDays)} × ${n(copy.trainingAddPerDay, 3)} = ${n(copy.sampleTrainingDays * copy.trainingAddPerDay, 2)}) = ${n(example.activityMultiplier, 2)}`,
    tdeeHonesty:
      'This factor is a Qimmah choice, not a published equation. We looked for a published reference for this exact method and didn’t find one, and we say so plainly rather than presenting it as established science. Its basis is sound — avoiding double-counting training — but it remains a practical estimate.',
    tdeeLimits:
      'Total daily energy is the number that varies most between people. Two people with identical bodies and training can differ by hundreds of calories from daily movement they don’t even notice.',
    tdeeCalibrate:
      'That’s why we suggest adjusting this number from your logged weight after two to three weeks, not from the equation alone. The scale is a more accurate reference than any factor.',

    caloriesTitle: 'Your calorie target',
    caloriesWhat: 'We start from your total daily energy, then subtract or add based on your goal.',
    caloriesCut: `Cut: minus ${n(formula.cutDeficit)} kcal. ${n(example.tdee)} − ${n(formula.cutDeficit)} = ${n(example.cuttingCalories)}.`,
    caloriesMaintain: `Maintain: no adjustment. ${n(example.tdee)} kcal/day.`,
    caloriesBulk: `Bulk: plus ${n(formula.bulkSurplus)} kcal. ${n(example.tdee)} + ${n(formula.bulkSurplus)} = ${n(example.bulkingCalories)}.`,
    caloriesFloor: `Your target never goes below a floor, whatever your goal: ${n(copy.maleCalorieFloor)} for men and ${n(copy.femaleCalorieFloor)} for women. Going below that needs professional supervision and isn’t something we reach automatically.`,
    caloriesMinor: `For anyone under ${n(ADULT_MIN_AGE)} we always calculate at maintenance — no deficit or surplus — because changing weight at that age needs specialist follow-up and growth charts.`,
    caloriesHonesty: `The ${n(formula.cutDeficit)} and ${n(formula.bulkSurplus)} figures are Qimmah’s choice, not a published equation. We chose them to give noticeable change while keeping the plan sustainable. What suits you may differ.`,
    caloriesAdjust:
      'If we notice your weight isn’t moving as expected, we’ll suggest an adjustment and explain why. We won’t change your numbers without telling you.',
    manualOverrideTitle: 'Your calorie target was adjusted manually',
    manualOverrideBody:
      'The saved target reflects your manual adjustment. The equation below shows and explains the calculated baseline; it does not claim that baseline equals your current target.',

    macrosTitle: 'Macros',
    proteinTitle: 'Protein',
    proteinFormula: `${n(formula.proteinPerKg, 1)} grams per kilogram of body weight`,
    proteinExample: `${n(formula.proteinPerKg, 1)} × ${n(copy.sampleWeightKg)} = ${n(example.proteinGrams)} g/day`,
    proteinWhy:
      'Protein protects your muscle during fat loss, builds new muscle alongside training, and is more filling per calorie than other macros.',
    proteinSource: `A comprehensive resistance-training review found benefits plateau around 1.6 g/kg, with a confidence interval extending to 2.2. Our ${n(formula.proteinPerKg, 1)} sits inside that range.`,
    proteinLimits:
      'The figure is based on total body weight. Someone with a high body-fat percentage may need less, since protein needs track lean mass more closely than total weight.',
    fatTitle: 'Fat',
    fatFormula: `${n(fatPercent)}% of your target calories ÷ ${n(copy.fatKcalPerGram)}`,
    fatExample: `(${n(example.cuttingCalories)} × ${n(formula.fatCalorieRatio, 2)}) ÷ ${n(copy.fatKcalPerGram)} = ${n(sampleFatCalories)} ÷ ${n(copy.fatKcalPerGram)} = ${n(example.fatGrams)} g/day`,
    fatWhy: `Fat is essential for hormone balance and absorbing fat-soluble vitamins. Each gram provides ${n(copy.fatKcalPerGram)} calories.`,
    fatSource: `The established adult range is 20–35% of energy; ${n(fatPercent)}% is Qimmah’s choice near its midpoint.`,
    carbsTitle: 'Carbohydrates',
    carbsFormula: `Whatever remains of your calories after protein and fat ÷ ${n(copy.carbohydrateKcalPerGram)}`,
    carbsExample: `${n(example.cuttingCalories)} − (${n(example.proteinGrams)} × ${n(copy.proteinKcalPerGram)}) − (${n(example.fatGrams)} × ${n(copy.fatKcalPerGram)}) = ${n(sampleCarbCalories)}\n${n(sampleCarbCalories)} ÷ ${n(copy.carbohydrateKcalPerGram)} = ${n(example.carbsGrams)} g/day`,
    carbsWhy:
      'Carbs are your main training fuel. We calculate them last because protein and fat have functional minimums, while carbs fill the remainder.',
    macrosConversion: `Conversion factors: ${n(copy.proteinKcalPerGram)} calories per gram of protein · ${n(copy.carbohydrateKcalPerGram)} per gram of carbohydrate · ${n(copy.fatKcalPerGram)} per gram of fat.`,
    macrosLimits:
      'These factors are established general averages. Actual values differ slightly between foods depending on composition and digestibility.',

    waterTitle: 'Water',
    waterFormula: `${n(waterMlPerKg)} millilitres per kilogram of your weight, rounded to the nearest half litre.`,
    waterExample: `${n(copy.sampleWeightKg)} × ${n(formula.waterLitersPerKg, 3)} = ${n(copy.sampleWeightKg * formula.waterLitersPerKg, 3)} L → ${n(example.waterLiters, 1)} L per day`,
    waterRange: `And we keep the result between a ${n(formula.waterMinLiters, 1)} L floor and a ${n(formula.waterMaxLiters)} L ceiling.`,
    waterFloorWhy: `The ${n(formula.waterMinLiters, 1)} L floor sits within European and American references for adult daily water needs.`,
    waterCapWhy: `The ${n(formula.waterMaxLiters)} L ceiling is a safety limit. The “${n(waterMlPerKg)} mL/kg” rule produces unreasonable figures at very high body weights, because fluid needs don’t rise in proportion to fat mass. Above ${n(formula.waterMaxLiters)} L needs individual assessment.`,
    waterHonesty: `The ${n(waterMlPerKg)} mL/kg rule is a common clinical rule of thumb, not an established standard. Official references base their recommendations on sex and population group rather than body weight. We chose it because it gives a useful personal number, and we note that it’s a practical estimate.`,
    waterDrinking:
      'This figure estimates what you drink only. Your food provides roughly another 20% of your daily water.',
    waterHeat:
      'On hot days or during long sessions your needs rise. Thirst is a good signal, and pale urine is a reassuring sign.',

    rateTitle: 'Expected rate of change',
    rateWhat: 'An estimate of how quickly your weight may change if you stay close to your calorie target.',
    rateFormula: `(daily deficit or surplus × ${n(7)}) ÷ ${n(formula.kcalPerKg)}`,
    rateExampleCut: `(${n(formula.cutDeficit)} × ${n(7)}) ÷ ${n(formula.kcalPerKg)} = ${n(cutWeeklyKcal)} ÷ ${n(formula.kcalPerKg)} = around ${n(example.cutWeeklyRate, 1)} kg per week`,
    rateExampleBulk: `(${n(formula.bulkSurplus)} × ${n(7)}) ÷ ${n(formula.kcalPerKg)} = around ${n(example.bulkWeeklyRate, 1)} kg per week`,
    rateWhyKcalPerKg: `The ${n(formula.kcalPerKg)} figure is a traditional estimate of the energy stored in a kilogram of body tissue.`,
    rateHonesty: `This is the most estimated of your numbers. The ${n(formula.kcalPerKg)} rule is an old fixed rule, while the body actually adapts: as your weight drops your energy needs fall slightly, so the rate gradually slows. The first weeks are usually faster than the ones after.`,
    rateWater:
      'First-week weight change is often water, not fat — especially when carbs or salt change. Don’t read a single week’s result as a trend.',
    rateReal:
      'Alongside this estimate we show your actual rate calculated from your logged weight. When they differ, the actual one is right.',
    actualRateAvailable:
      'This is your actual rate from logged weights. If it differs from the estimate, the actual rate is the reference.',
    actualRateMissing:
      'Log your weight regularly to see your actual rate alongside the estimate.',

    accuracyTitle: 'How accurate are these numbers?',
    accuracyIntro: 'A fair question, and here’s the honest answer:',
    accuracyBody:
      'A good starting point, not a final truth. The equations are built on averages from large groups, and you are not an average. The usual gap between estimate and reality runs 10% to 15% on the energy numbers.',
    accuracyWhatMatters:
      'What matters more than the first number’s accuracy is what we do next. We track your weight and logs, and suggest adjustments when reality differs from the estimate. A good number after three weeks of tracking beats the most accurate number on day one.',
    accuracyHelp:
      'Three things help our accuracy: logging your weight regularly, logging your food honestly, and keeping your details up to date.',

    sourcesTitle: 'Where each number comes from',
    sourcesIntro: 'We distinguish three levels and place each number in its own, without dressing it up:',
    certaintyLabels: {
      published_equation: 'Published equation — from peer-reviewed published research.',
      established_range_choice:
        'A choice within an established range — the figure is ours, the range it sits in is scientifically established.',
      qimmah_practical_estimate:
        'A practical Qimmah estimate — we found no published reference for this exact form, and we say so plainly.',
    },
    sourceRows: [
      {
        id: 'bmi',
        certainty: 'published_equation',
        label: 'Body Mass Index',
        source: 'World Health Organization',
      },
      {
        id: 'bmr',
        certainty: 'published_equation',
        label: 'Basal Metabolic Rate',
        source: 'Mifflin-St Jeor (1990)',
      },
      {
        id: 'macro_energy_factors',
        certainty: 'published_equation',
        label: `${n(copy.proteinKcalPerGram)}/${n(copy.carbohydrateKcalPerGram)}/${n(copy.fatKcalPerGram)} macro energy factors`,
        source: 'General Atwater factors',
      },
      {
        id: 'protein_target',
        certainty: 'established_range_choice',
        label: `Protein at ${n(formula.proteinPerKg, 1)} g/kg`,
        source: 'Morton review (2018)',
      },
      {
        id: 'fat_ratio',
        certainty: 'established_range_choice',
        label: `Fat at ${n(fatPercent)}%`,
        source: 'Established adult range of 20–35%',
      },
      {
        id: 'water_floor',
        certainty: 'established_range_choice',
        label: `${n(formula.waterMinLiters, 1)} L water floor`,
        source: 'European and American adult references',
      },
      {
        id: 'activity_factor',
        certainty: 'qimmah_practical_estimate',
        label: 'Activity factor',
        source: 'No published reference for this exact form',
      },
      {
        id: 'calorie_adjustment',
        certainty: 'qimmah_practical_estimate',
        label: `${n(formula.cutDeficit)} deficit / ${n(formula.bulkSurplus)} surplus`,
        source: 'Product policy',
      },
      {
        id: 'water_weight_rule',
        certainty: 'qimmah_practical_estimate',
        label: `${n(waterMlPerKg)} mL/kg water rule`,
        source: 'Common clinical rule of thumb',
      },
      {
        id: 'weight_change_rate',
        certainty: 'qimmah_practical_estimate',
        label: `${n(formula.kcalPerKg)} weight-change rule`,
        source: 'An old fixed rule; the body adapts',
      },
      {
        id: 'water_ceiling',
        certainty: 'qimmah_practical_estimate',
        label: `${n(formula.waterMaxLiters)} L water ceiling`,
        source: 'Product safety limit',
      },
    ],

    disclaimerTitle: 'A note',
    disclaimerBody:
      'These numbers are planning and tracking estimates. They are not a medical diagnosis, not a treatment prescription, and not a substitute for professional advice. Qimmah does not diagnose, treat, or prescribe.',
    disclaimerWhen: `Consult a professional before any major change to your training or diet if you have a health condition or take regular medication, if you are pregnant or breastfeeding, if you are under ${n(ADULT_MIN_AGE)}, or if you notice symptoms that concern you.`,
    disclaimerYou:
      'You know your body best. If a number contradicts how you feel, how you feel deserves attention.',

    unitKcalPerDay: 'kcal / day',
    unitGramPerDay: 'g / day',
    unitLiterPerDay: 'L / day',
    unitKgPerWeek: 'kg / week',
  }
}

export function createECalcStrings(
  formula: ECalcFormulaValues = E_CALC_FORMULA_VALUES,
  copy: ECalcCopyParameters = E_CALC_COPY_PARAMETERS,
): Record<Lang, ECalcStrings> {
  return {
    ar: buildArabicStrings(formula, copy),
    en: buildEnglishStrings(formula, copy),
  }
}

export const eCalcStrings: Record<Lang, ECalcStrings> = createECalcStrings()

export function eCalcCopy(lang: Lang): ECalcStrings & ECalcDocumentStrings {
  const copy = eCalcStrings[lang]
  return {
    ...copy,
    calcPageTitle: copy.pageTitle,
    calcPageSubtitle: copy.pageSubtitle,
    calcIntro: copy.intro,
    calcIntroEstimate: copy.introEstimate,
    calcNeedData: copy.needData,
    calcInputsTitle: copy.inputsTitle,
    calcInputsNote: copy.inputsNote,
    calcInputsAccuracy: copy.inputsAccuracy,
    calcInputRows: copy.inputRows,
    calcBmiTitle: copy.bmiTitle,
    calcBmiWhat: copy.bmiWhat,
    calcBmiFormula: copy.bmiFormula,
    calcBmiExample: copy.bmiExample,
    calcBmiSource: copy.bmiSource,
    calcBmiUnder: copy.bmiUnder,
    calcBmiNormal: copy.bmiNormal,
    calcBmiOver: copy.bmiOver,
    calcBmiObese: copy.bmiObese,
    calcBmiLimits: copy.bmiLimits,
    calcBmiMinor: copy.bmiMinor,
    calcBmrTitle: copy.bmrTitle,
    calcBmrWhat: copy.bmrWhat,
    calcBmrSource: copy.bmrSource,
    calcBmrFormulaMale: copy.bmrFormulaMale,
    calcBmrFormulaFemale: copy.bmrFormulaFemale,
    calcBmrExample: copy.bmrExample,
    calcBmrAssume: copy.bmrAssume,
    calcBmrLimits: copy.bmrLimits,
    calcBmrWhyNoBodyFat: copy.bmrWhyNoBodyFat,
    calcTdeeTitle: copy.tdeeTitle,
    calcTdeeWhat: copy.tdeeWhat,
    calcTdeeFormula: copy.tdeeFormula,
    calcTdeeExample: copy.tdeeExample,
    calcTdeeApproach: copy.tdeeApproach,
    calcTdeeNeatTitle: copy.tdeeNeatTitle,
    calcTdeeTrainingAdd: copy.tdeeTrainingAdd,
    calcTdeeCap: copy.tdeeCap,
    calcTdeeActivitySedentary: copy.tdeeActivitySedentary,
    calcTdeeActivityModerate: copy.tdeeActivityModerate,
    calcTdeeActivityActive: copy.tdeeActivityActive,
    calcTdeeExampleFull: copy.tdeeExampleFull,
    calcTdeeHonesty: copy.tdeeHonesty,
    calcTdeeLimits: copy.tdeeLimits,
    calcTdeeCalibrate: copy.tdeeCalibrate,
    calcCaloriesTitle: copy.caloriesTitle,
    calcCaloriesWhat: copy.caloriesWhat,
    calcCaloriesCut: copy.caloriesCut,
    calcCaloriesMaintain: copy.caloriesMaintain,
    calcCaloriesBulk: copy.caloriesBulk,
    calcCaloriesFloor: copy.caloriesFloor,
    calcCaloriesMinor: copy.caloriesMinor,
    calcCaloriesHonesty: copy.caloriesHonesty,
    calcCaloriesAdjust: copy.caloriesAdjust,
    calcMacrosTitle: copy.macrosTitle,
    calcProteinTitle: copy.proteinTitle,
    calcProteinFormula: copy.proteinFormula,
    calcProteinExample: copy.proteinExample,
    calcProteinWhy: copy.proteinWhy,
    calcProteinSource: copy.proteinSource,
    calcProteinLimits: copy.proteinLimits,
    calcFatTitle: copy.fatTitle,
    calcFatFormula: copy.fatFormula,
    calcFatExample: copy.fatExample,
    calcFatWhy: copy.fatWhy,
    calcFatSource: copy.fatSource,
    calcCarbsTitle: copy.carbsTitle,
    calcCarbsFormula: copy.carbsFormula,
    calcCarbsExample: copy.carbsExample,
    calcCarbsWhy: copy.carbsWhy,
    calcMacrosConversion: copy.macrosConversion,
    calcMacrosLimits: copy.macrosLimits,
    calcWaterTitle: copy.waterTitle,
    calcWaterFormula: copy.waterFormula,
    calcWaterExample: copy.waterExample,
    calcWaterRange: copy.waterRange,
    calcWaterFloorWhy: copy.waterFloorWhy,
    calcWaterCapWhy: copy.waterCapWhy,
    calcWaterHonesty: copy.waterHonesty,
    calcWaterDrinking: copy.waterDrinking,
    calcWaterHeat: copy.waterHeat,
    calcRateTitle: copy.rateTitle,
    calcRateWhat: copy.rateWhat,
    calcRateFormula: copy.rateFormula,
    calcRateExampleCut: copy.rateExampleCut,
    calcRateExampleBulk: copy.rateExampleBulk,
    calcRateWhy7700: copy.rateWhyKcalPerKg,
    calcRateHonesty: copy.rateHonesty,
    calcRateWater: copy.rateWater,
    calcRateReal: copy.rateReal,
    calcAccuracyTitle: copy.accuracyTitle,
    calcAccuracyIntro: copy.accuracyIntro,
    calcAccuracyBody: copy.accuracyBody,
    calcAccuracyWhatMatters: copy.accuracyWhatMatters,
    calcAccuracyHelp: copy.accuracyHelp,
    calcSourcesTitle: copy.sourcesTitle,
    calcSourcesIntro: copy.sourcesIntro,
    calcSourceLevel1: copy.certaintyLabels.published_equation,
    calcSourceLevel2: copy.certaintyLabels.established_range_choice,
    calcSourceLevel3: copy.certaintyLabels.qimmah_practical_estimate,
    calcSourceRows: copy.sourceRows,
    calcDisclaimerTitle: copy.disclaimerTitle,
    calcDisclaimerBody: copy.disclaimerBody,
    calcDisclaimerWhen: copy.disclaimerWhen,
    calcDisclaimerYou: copy.disclaimerYou,
    calcLoadingTitle: copy.loadingTitle,
    calcLoadingBody: copy.loadingBody,
    calcEmptyTitle: copy.emptyTitle,
    calcEmptyBody: copy.emptyBody,
    calcErrorTitle: copy.errorTitle,
    calcErrorBody: copy.errorBody,
    calcRetryAction: copy.retryAction,
    calcCompleteProfileAction: copy.completeProfileAction,
    calcExpandAction: copy.expandAction,
    calcCollapseAction: copy.collapseAction,
  }
}
