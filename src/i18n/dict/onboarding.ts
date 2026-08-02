import type { Lang } from '@/lib/appPreferences'

export interface OnboardingStrings {
  // ── PlanBuilder: navigation / chrome ──
  back: string
  skip: string
  next: string
  buildMyPlan: string
  recommended: string // "الموصى به: {n} أيام" → prefix, composed with count + unit
  recommendedForLevel: string // "الموصى به لمستواك: {n} أيام." — {n} يُستبدل بعدد الأيام
  daysUnit: string // "أيام"
  buildingTitle: string
  buildingSubtitle: string

  // PlanBuilder: step labels (header chip)
  labelName: string
  labelGoal: string
  labelSex: string
  labelAge: string
  labelHeight: string
  labelWeight: string
  labelTargetWeight: string
  labelExperience: string
  labelConsistency: string
  labelEnvironment: string
  labelDays: string
  labelDuration: string
  labelSplitMode: string
  labelAdvancedSplit: string
  labelActivity: string
  labelNutritionStyle: string
  labelMeals: string
  labelMealDistribution: string
  labelAppetiteTiming: string
  labelFood: string
  labelLimitations: string
  labelBuilding: string

  // PlanBuilder: step titles + hints
  nameTitle: string
  nameHint: string
  namePlaceholder: string
  nameAria: string
  goalTitle: string
  goalHint: string
  sexTitle: string
  sexHint: string
  ageTitle: string
  ageUnit: string
  ageAria: string
  heightTitle: string
  heightUnit: string
  heightAria: string
  weightTitle: string
  weightUnit: string
  weightAria: string
  targetWeightTitle: string
  targetWeightHintCut: string
  targetWeightHintBulk: string
  targetWeightAria: string
  experienceTitle: string
  experienceHint: string
  consistencyTitle: string
  consistencyHint: string
  environmentTitle: string
  environmentHint: string
  daysTitle: string
  durationTitle: string
  durationHint: string
  splitModeTitle: string
  splitModeHint: string
  advancedSplitTitle: string
  advancedSplitHint: string
  activityTitle: string
  activityHint: string
  activityStepsToggleTitle: string
  activityStepsToggleSubtitle: string
  stepsUnit: string
  stepsAria: string
  nutritionStyleTitle: string
  nutritionStyleHint: string
  mealsTitle: string
  mealsHint: string
  mealsUnit: string
  mealDistributionTitle: string
  mealDistributionHint: string
  appetiteTimingTitle: string
  appetiteTimingHint: string
  foodTitle: string
  foodHint: string
  foodPatternLabel: string
  foodAllergiesLabel: string
  limitationsTitle: string
  limitationsHint: string
  limitationsInjuriesLabel: string
  limitationsWellnessLabel: string

  // PlanBuilder: validation
  targetWeightErrorCut: string
  targetWeightErrorBulk: string

  // Stepper aria
  decrease: string
  increase: string

  // ── CustomizationCenter: chrome ──
  editPlanTitle: string
  setupPlanTitle: string
  saved: string
  saveDraft: string
  previewOnSite: string
  preview: string
  stepPrefix: string // "الخطوة"
  stepOf: string // "من"
  completeRequiredFirst: string
  hideAdvanced: string
  advancedOptions: string
  livePreview: string
  prev: string
  saveAndClose: string
  approveAndStart: string

  // CustomizationCenter: step titles
  ccWelcome: string
  ccBody: string
  ccPlan: string
  ccWellness: string
  ccMeasurements: string
  ccReview: string
  ccWorkoutTemplate: string
  ccNutrition: string
  ccSmartCalc: string
  ccSections: string
  ccCommitments: string

  // ── PreviewSummary ──
  previewYourPage: string
  previewYourGoal: string
  previewPageOwner: string
  previewWorkouts: string
  previewMeals: string
  previewSupplements: string
  previewMetrics: string

  // ── EditableTable ──
  deleteRow: string

  // ── StepWelcome ──
  welcomePoint1: string
  welcomePoint2: string
  welcomePoint3: string
  welcomeHelloNamed: string // "أهلاً {name} 👋" prefix
  welcomeHelloGuest: string
  welcomeDescription: string
  welcomeNameLabel: string
  welcomeNameHint: string
  welcomeNamePlaceholder: string
  welcomeNameRequired: string
  welcomeFirstTime: string
  welcomeLivePreviewNote: string

  // ── StepBody ──
  bodyTitle: string
  bodyDescription: string
  bodyGoalLabel: string
  bodyGender: string
  bodyAge: string
  bodyAgeHint: string
  bodyHeight: string
  bodyHeightHint: string
  bodyWeight: string
  bodyWeightHint: string
  bodyTargetWeight: string
  bodyTargetWeightHint: string
  bodyActivityLevel: string
  bodyTrainingLevel: string
  bodyTrainingDays: string
  bodyTrainingDaysHint: string
  bodyWorkoutDuration: string
  bodyWorkoutDurationHint: string
  bodyWorkoutEnvironment: string
  bodyInjuries: string
  bodyInjuriesHint: string
  bodyInjuriesPlaceholder: string
  bodyErrorHint: string
  bodyCalcIntro: string
  bodyTargetCalories: string
  bodyProtein: string
  bodyWater: string
  unitCalories: string
  unitG: string
  unitLiter: string

  // ── StepGeneratePlan ──
  genTitle: string
  genDescription: string
  genIntro: string
  genDailyTargets: string
  genCalories: string
  genProtein: string
  genCarbs: string
  genFat: string
  genWater: string
  genSuggestedSchedule: string
  genChooseAnother: string
  genNutritionPlan: string
  genTrackNutrition: string
  genMealsCount: string
  genNutritionStyle: string
  genPlanned: string // "المخطّط: {cal} سعرة · {p}غ بروتين (الهدف: {tc} سعرة · {tp}غ)"
  genPlannedProteinSuffix: string
  genPlannedTargetPrefix: string
  genSuggestedCommitments: string
  daysWord: string // "أيام"
  gGram: string // "غ"
  lLiter: string // "ل"
  calWord: string // "سعرة"

  // ── StepSmartCalculations ──
  smartTitle: string
  smartDescription: string
  smartDisclaimer: string
  smartManualNotice: string
  smartRecalcNow: string
  smartRecalcFromData: string
  smartCaloriesCard: string
  smartBmr: string
  smartTdee: string
  smartMaintenance: string
  smartCutting: string
  smartBulking: string
  smartMacros: string
  smartProtein: string
  smartFat: string
  smartCarbs: string
  smartWaterCard: string
  smartDailyWater: string
  smartWeightGoalCard: string
  smartBmi: string
  smartBmiLabel: string
  smartWeeklyChange: string
  smartWeeksToGoal: string
  smartTrainingCard: string
  smartSuggestedSplit: string
  smartNotes: string
  unitWeeks: string
  unitKg: string

  // ── StepWorkoutTemplate ──
  wtTitle: string
  wtDescription: string
  wtReplaceNotice: string
  wtBalanceFallback: string
  wtCancel: string
  wtConfirm: string
  wtDayNameArPlaceholder: string
  wtDayNameEnPlaceholder: string
  wtWatchGuide: string
  wtMoveUp: string
  wtMoveDown: string
  wtDelete: string
  wtSets: string
  wtReps: string
  wtRest: string
  wtStartWeight: string
  wtNotes: string
  wtVideoLink: string
  wtVideoPlaceholder: string
  wtAddFromLibrary: string
  daysAndRecommended: string // "{n} أيام · {rec}"

  // ── StepNutrition ──
  nutTitle: string
  nutDescription: string
  nutTrackNutrition: string
  nutDiffersNotice: string
  nutUpdateFromCalc: string
  nutGoalsTitle: string
  nutUseSmartCalc: string
  nutCalories: string
  nutProtein: string
  nutCarbs: string
  nutFat: string
  nutWater: string
  nutAddTemplate: string
  nutSearchPlaceholder: string
  nutAllTypes: string
  nutAdd: string
  nutMealNameArPlaceholder: string
  nutMealNameEnPlaceholder: string
  nutServing: string
  nutDelete: string
  nutAddIngredient: string
  nutRecalcFromIngredients: string
  nutMealCalories: string
  nutMealProtein: string
  nutMealCarbs: string
  nutMealFat: string
  nutMoveUp: string
  nutMoveDown: string
  nutAddCustomMeal: string
  nutDisclaimer: string

  // ── StepWellness ──
  wellTitle: string
  wellDescription: string
  wellSuppNameArPlaceholder: string
  wellSuppNameEnPlaceholder: string
  wellSuppAmountPlaceholder: string
  wellMedNameArPlaceholder: string
  wellMedNameEnPlaceholder: string
  wellDelete: string

  // ── StepCommitments ──
  commitTitle: string
  commitNameArPlaceholder: string
  commitNameEnPlaceholder: string
  commitMoveUp: string
  commitMoveDown: string
  commitDelete: string

  // ── StepMeasurements ──
  measTitle: string

  // ── StepSections ──
  secTitle: string
  secDescription: string
  secToday: string
  secTodayHint: string
  secWorkouts: string
  secWorkoutsHint: string
  secMeals: string
  secMealsHint: string
  secSupplements: string
  secSupplementsHint: string
  secMedications: string
  secMedicationsHint: string
  secMeasurements: string
  secMeasurementsHint: string
  secCommitments: string
  secCommitmentsHint: string
  secNotes: string
  secNotesHint: string
  secAlwaysVisible: string

  // ── StepReview ──
  reviewTitle: string
  reviewDescription: string
  reviewName: string
  reviewGoal: string
  reviewWeight: string
  reviewTargetCalories: string
  reviewProtein: string
  reviewSchedule: string
  reviewMeals: string
  reviewSuppMed: string
  reviewMeasurements: string
  reviewEditLater: string
  reviewAdvancedOptions: string
  reviewAdvancedIntro: string
  reviewBackup: string
  reviewRestore: string
  reviewResetBasic: string
  reviewRestartOnboarding: string
  reviewRestartOnboardingNote: string
  reviewFullResetConfirm: string
  reviewFullReset: string
  reviewFullResetNote: string

  // ── Dead / legacy editor steps (Basics/Goal/Look/Meals/Metrics/Schedule/Supplements/Workouts) ──
  basicsTitle: string
  basicsDescription: string
  basicsNameLabel: string
  basicsNameHint: string
  basicsNamePlaceholder: string
  basicsBrandLabel: string
  basicsBrandHint: string
  basicsBrandPlaceholder: string
  basicsTaglineLabel: string
  basicsTaglineHint: string
  basicsTaglinePlaceholder: string
  basicsUserType: string

  goalStepTitle: string
  goalStepDescription: string
  goalStepLabel: string
  goalStepHint: string
  goalStepPlaceholder: string
  goalStepSuggestionsIntro: string
  goalStepEditLater: string
  goalSuggestion1: string
  goalSuggestion2: string
  goalSuggestion3: string

  lookTitle: string
  lookDescription: string
  lookPresetColors: string
  lookPrimaryColor: string
  lookAccentColor: string

  mealsStepTitle: string
  mealsStepDescription: string
  mealsColName: string
  mealsColTime: string
  mealsColCalories: string
  mealsColProtein: string
  mealsColCarbs: string
  mealsColFats: string
  mealsAddLabel: string

  metricsTitle: string
  metricsDescription: string
  metricsColLabel: string
  metricsColValue: string
  metricsColUnit: string
  metricsAddLabel: string

  scheduleTitle: string
  scheduleDescription: string
  scheduleColDay: string
  scheduleColTitle: string
  scheduleColType: string
  scheduleAddLabel: string

  suppStepTitle: string
  suppStepDescription: string
  suppSafetyNote: string
  suppColName: string
  suppColDose: string
  suppColTiming: string
  suppColType: string
  suppTypeSupplement: string
  suppTypeMedication: string
  suppAddLabel: string

  workoutsStepTitle: string
  workoutsStepDescription: string
  workoutsColName: string
  workoutsColMuscle: string
  workoutsColSets: string
  workoutsColReps: string
  workoutsColWeight: string
  workoutsAddLabel: string
}

const ar: OnboardingStrings = {
  back: 'رجوع',
  skip: 'تخطّي',
  next: 'التالي',
  buildMyPlan: 'ابنِ خطتي',
  recommended: 'الموصى به:',
  recommendedForLevel: 'الموصى به لمستواك: {n} أيام.',
  daysUnit: 'أيام',
  buildingTitle: 'نبني خطتك المثالية…',
  buildingSubtitle: 'نختار التقسيمة، نوزّع الأيام، ونحسب أهدافك.',

  labelName: 'اسمك',
  labelGoal: 'الهدف',
  labelSex: 'الجنس',
  labelAge: 'العمر',
  labelHeight: 'الطول',
  labelWeight: 'الوزن',
  labelTargetWeight: 'وزن الهدف',
  labelExperience: 'خبرتك',
  labelConsistency: 'انتظامك',
  labelEnvironment: 'مكان التمرين',
  labelDays: 'الأيام',
  labelDuration: 'مدّة الجلسة',
  labelSplitMode: 'التقسيمة',
  labelAdvancedSplit: 'نوع التقسيمة',
  labelActivity: 'نشاطك اليومي',
  labelNutritionStyle: 'التغذية',
  labelMeals: 'الوجبات',
  labelMealDistribution: 'توزيع الوجبات',
  labelAppetiteTiming: 'وقت الجوع',
  labelFood: 'تفضيلات الأكل',
  labelLimitations: 'قيود ومتابعة',
  labelBuilding: 'نبني خطتك',

  nameTitle: 'وش نناديك؟',
  nameHint: 'اختياري — نستخدمه نرحّب فيك بالرئيسية. تقدر تتخطّاها.',
  namePlaceholder: 'اسمك (اختياري)',
  nameAria: 'الاسم (اختياري)',
  goalTitle: 'وش هدفك؟',
  goalHint: 'نبني الخطة كلها حوله.',
  sexTitle: 'جنسك؟',
  sexHint: 'نستخدمه عشان نحسب السعرات بدقة.',
  ageTitle: 'كم عمرك؟',
  ageUnit: 'سنة',
  ageAria: 'العمر بالسنوات',
  heightTitle: 'كم طولك؟',
  heightUnit: 'سم',
  heightAria: 'الطول بالسنتيمتر',
  weightTitle: 'كم وزنك الحالي؟',
  weightUnit: 'كجم',
  weightAria: 'الوزن الحالي بالكيلوجرام',
  targetWeightTitle: 'كم وزنك المستهدف؟',
  targetWeightHintCut: 'أقل من وزنك الحالي.',
  targetWeightHintBulk: 'أعلى من وزنك الحالي.',
  targetWeightAria: 'الوزن الهدف بالكيلوجرام',
  experienceTitle: 'من متى وأنت تتمرن حديد؟',
  experienceHint: 'نضبط صعوبة الخطة على مستواك.',
  consistencyTitle: 'كيف انتظامك حاليًا؟',
  consistencyHint: 'نبدأ من نقطة تناسب وضعك.',
  environmentTitle: 'وين بتتمرن؟',
  environmentHint: 'نختار تمارين مناسبة لمكانك.',
  daysTitle: 'كم يوم تقدر تتمرن بالأسبوع؟',
  durationTitle: 'كم تحب تطول الجلسة؟',
  durationHint: 'نضبط عدد التمارين على وقتك.',
  splitModeTitle: 'كيف تبي نحدد التقسيمة؟',
  splitModeHint: 'التلقائي يكفي أغلب الناس.',
  advancedSplitTitle: 'أي تقسيمة تفضّل؟',
  advancedSplitHint: 'اختر الأنسب لأسلوبك.',
  activityTitle: 'كيف حركتك اليومية خارج التمرين؟',
  activityHint: 'تساعدنا نضبط سعراتك بدقة.',
  activityStepsToggleTitle: 'أعرف عدد خطواتي اليومية',
  activityStepsToggleSubtitle: 'اختياري — يحسّن دقّة التقدير',
  stepsUnit: 'خطوة',
  stepsAria: 'تقدير الخطوات اليومية',
  nutritionStyleTitle: 'كيف تبي تتعامل مع التغذية؟',
  nutritionStyleHint: 'نقدر نعدّلها بعدين.',
  mealsTitle: 'كم وجبة باليوم تناسبك؟',
  mealsHint: 'نوزّع سعراتك عليها.',
  mealsUnit: 'وجبات',
  mealDistributionTitle: 'تفضّل وجباتك أكبر وأقل، ولا أصغر وأكثر؟',
  mealDistributionHint: 'يحدّد وين نركّز سعراتك.',
  appetiteTimingTitle: 'متى تجوع أكثر؟',
  appetiteTimingHint: 'نوزّع سعراتك على وقتك المناسب.',
  foodTitle: 'تفضيلات أكلك',
  foodHint: 'اختياري — تقدر تتخطّاها.',
  foodPatternLabel: 'نمط الأكل',
  foodAllergiesLabel: 'حساسيات غذائية (اختر اللي ينطبق)',
  limitationsTitle: 'قيود ومتابعة',
  limitationsHint: 'اختياري — تقدر تتخطّاها.',
  limitationsInjuriesLabel: 'إصابات أو مناطق حساسة؟',
  limitationsWellnessLabel: 'تتبّع المكملات والأدوية؟',

  targetWeightErrorCut: 'وزن الهدف للتنشيف لازم يكون أقل من وزنك الحالي.',
  targetWeightErrorBulk: 'وزن الهدف للتضخيم لازم يكون أعلى من وزنك الحالي.',

  decrease: 'ناقص',
  increase: 'زائد',

  editPlanTitle: 'تعديل خطتي',
  setupPlanTitle: 'إعداد خطتي',
  saved: 'تم الحفظ',
  saveDraft: 'حفظ مؤقت',
  previewOnSite: 'معاينة في الموقع',
  preview: 'معاينة',
  stepPrefix: 'الخطوة',
  stepOf: 'من',
  completeRequiredFirst: 'كمّل الخطوات المطلوبة أول',
  hideAdvanced: 'إخفاء الخيارات المتقدّمة',
  advancedOptions: 'خيارات متقدّمة',
  livePreview: 'معاينة حية',
  prev: 'السابق',
  saveAndClose: 'حفظ وإغلاق',
  approveAndStart: 'اعتمد خطتي وابدأ',

  ccWelcome: 'الترحيب',
  ccBody: 'بياناتك',
  ccPlan: 'خطتك',
  ccWellness: 'المكملات والأدوية',
  ccMeasurements: 'القياسات والمتابعة',
  ccReview: 'المراجعة',
  ccWorkoutTemplate: 'جدول التمرين',
  ccNutrition: 'خطة الأكل',
  ccSmartCalc: 'الحسابات الذكية',
  ccSections: 'إظهار الأقسام',
  ccCommitments: 'الأقسام',

  previewYourPage: 'معاينة خطتك',
  previewYourGoal: 'هدفك',
  previewPageOwner: 'صاحب الخطة',
  previewWorkouts: 'تمارين',
  previewMeals: 'وجبات',
  previewSupplements: 'مكملات',
  previewMetrics: 'قياسات',

  deleteRow: 'حذف الصف',

  welcomePoint1: 'تقدر تعدل كل شي بعدين',
  welcomePoint2: 'ما تحتاج معرفة تقنية',
  welcomePoint3: 'كل شي محفوظ على جهازك',
  welcomeHelloNamed: 'أهلاً',
  welcomeHelloGuest: 'حيّاك في قِمّة 👋',
  welcomeDescription:
    'بنجهّز تطبيقك الشخصي خطوة بخطوة. جاوب على أسئلة بسيطة، وتقدر ترجع تعدّل أي شي وقت ما تبي.',
  welcomeNameLabel: 'اسمك',
  welcomeNameHint: 'يظهر في خطتك وفي ترحيب «اليوم» — مطلوب للبدء',
  welcomeNamePlaceholder: 'مثال: محمد',
  welcomeNameRequired: 'اكتب اسمك عشان تكمّل.',
  welcomeFirstTime: 'بنجهّز خطتك لأول مرة. تقدر تعدل كل شي بعدين.',
  welcomeLivePreviewNote: 'كل ما تكمل خطوة، تشوف معاينة خطتك تتحدّث على طول. جاهز؟ اضغط «التالي» نبدأ.',

  bodyTitle: 'بياناتك',
  bodyDescription: 'جاوب على بياناتك وهدفك، وقِمّة بتجهّز خطتك تلقائيًا. تقدر تعدّل أي شي بعدين.',
  bodyGoalLabel: 'هدفك',
  bodyGender: 'الجنس',
  bodyAge: 'العمر',
  bodyAgeHint: 'سنة (13–100)',
  bodyHeight: 'الطول',
  bodyHeightHint: 'سم (100–230)',
  bodyWeight: 'الوزن الحالي',
  bodyWeightHint: 'كجم (15–250)',
  bodyTargetWeight: 'الوزن الهدف',
  bodyTargetWeightHint: 'كجم (15–250)',
  bodyActivityLevel: 'مستوى النشاط',
  bodyTrainingLevel: 'مستوى التمرين',
  bodyTrainingDays: 'أيام التمرين بالأسبوع',
  bodyTrainingDaysHint: '1–7',
  bodyWorkoutDuration: 'مدة التمرين',
  bodyWorkoutDurationHint: 'دقيقة (20–150)',
  bodyWorkoutEnvironment: 'مكان التمرين',
  bodyInjuries: 'إصابات (اختياري)',
  bodyInjuriesHint: 'أي إصابة تحب تنتبه لها',
  bodyInjuriesPlaceholder: 'مثال: ألم أسفل الظهر',
  bodyErrorHint: 'صحّح القيم المظلّلة بالأحمر عشان تكمّل.',
  bodyCalcIntro: 'قِمّة بتحسب أهدافك من هذي البيانات:',
  bodyTargetCalories: 'سعرات الهدف',
  bodyProtein: 'البروتين',
  bodyWater: 'الماء',
  unitCalories: 'سعرة',
  unitG: 'غ',
  unitLiter: 'لتر',

  genTitle: 'خطتك جاهزة',
  genDescription: 'قِمّة جهّزت لك خطة مبدئية من بياناتك وهدفك.',
  genIntro: 'قِمّة حسبت هذي الأهداف من بياناتك وهدفك. تقدر تعدّلها بعدين من الإعدادات المتقدمة.',
  genDailyTargets: 'أهدافك اليومية',
  genCalories: 'سعرات',
  genProtein: 'بروتين',
  genCarbs: 'كارب',
  genFat: 'دهون',
  genWater: 'ماء',
  genSuggestedSchedule: 'جدول التمرين المقترح',
  genChooseAnother: 'اختيار جدول آخر',
  genNutritionPlan: 'خطة الأكل',
  genTrackNutrition: 'أبغى أتابع الأكل',
  genMealsCount: 'عدد الوجبات',
  genNutritionStyle: 'أسلوب الأكل',
  genPlanned: 'المخطّط:',
  genPlannedProteinSuffix: 'بروتين',
  genPlannedTargetPrefix: 'الهدف:',
  genSuggestedCommitments: 'التزامات مقترحة',
  daysWord: 'أيام',
  gGram: 'غ',
  lLiter: 'ل',
  calWord: 'سعرة',

  smartTitle: 'الحسابات الذكية',
  smartDescription: 'قِمّة قدّرت أرقامك من بياناتك. عدّل أي رقم يدويًا إذا تبي.',
  smartDisclaimer: 'هذي الحسابات تقريبية للتنظيم والمتابعة بس، ومو بديل عن مختص.',
  smartManualNotice: 'عندك تعديلات يدوية على الحسابات. تقدر تعيد الحساب من بياناتك في أي وقت.',
  smartRecalcNow: 'إعادة الحساب الآن',
  smartRecalcFromData: 'إعادة الحساب من بياناتي',
  smartCaloriesCard: 'السعرات',
  smartBmr: 'الأساس (BMR)',
  smartTdee: 'إجمالي الحركة (TDEE)',
  smartMaintenance: 'المحافظة',
  smartCutting: 'التنشيف',
  smartBulking: 'التضخيم',
  smartMacros: 'الماكروز',
  smartProtein: 'البروتين',
  smartFat: 'الدهون',
  smartCarbs: 'الكربوهيدرات',
  smartWaterCard: 'الماء',
  smartDailyWater: 'الماء اليومي',
  smartWeightGoalCard: 'الوزن والهدف',
  smartBmi: 'مؤشر الكتلة (BMI)',
  smartBmiLabel: 'تصنيف المؤشر',
  smartWeeklyChange: 'تغيّر أسبوعي متوقّع',
  smartWeeksToGoal: 'أسابيع تقريبية للهدف',
  smartTrainingCard: 'اقتراح التمرين',
  smartSuggestedSplit: 'التقسيمة المقترحة',
  smartNotes: 'ملاحظات',
  unitWeeks: 'أسبوع',
  unitKg: 'كجم',

  wtTitle: 'اختيار جدول التمرين',
  wtDescription: 'اختر قالب جاهز وعدّله مثل ما تحب — أضف من المكتبة أو احذف.',
  wtReplaceNotice: 'بنستبدل جدول التمرين الحالي. تقدر تعدل كل شي بعد الاختيار.',
  wtBalanceFallback: 'راجع توازن جدولك قبل ما تحفظ التغييرات.',
  wtCancel: 'إلغاء',
  wtConfirm: 'تأكيد',
  wtDayNameArPlaceholder: 'اسم اليوم (عربي)',
  wtDayNameEnPlaceholder: 'Day name (English)',
  wtWatchGuide: 'شوف الشرح',
  wtMoveUp: 'أعلى',
  wtMoveDown: 'أسفل',
  wtDelete: 'حذف',
  wtSets: 'مجموعات',
  wtReps: 'تكرارات',
  wtRest: 'راحة (ث)',
  wtStartWeight: 'وزن البداية',
  wtNotes: 'ملاحظات',
  wtVideoLink: 'رابط شرح (اختياري)',
  wtVideoPlaceholder: 'خلّه فاضي عشان نستخدم شرح المكتبة',
  wtAddFromLibrary: 'أضف تمرين من المكتبة',
  daysAndRecommended: 'أيام',

  nutTitle: 'خطة الأكل',
  nutDescription: 'حدّد أهدافك واختر وجباتك الجاهزة أو ابنِها من المكونات.',
  nutTrackNutrition: 'أبغى أتابع الأكل',
  nutDiffersNotice: 'فيه اختلافات بين حساباتك وخطة الأكل.',
  nutUpdateFromCalc: 'تحديث خطة الأكل من حساباتي',
  nutGoalsTitle: 'الأهداف الغذائية',
  nutUseSmartCalc: 'استخدم حساباتي الذكية',
  nutCalories: 'سعرات',
  nutProtein: 'بروتين (غ)',
  nutCarbs: 'كارب (غ)',
  nutFat: 'دهون (غ)',
  nutWater: 'ماء (لتر)',
  nutAddTemplate: 'أضف وجبة جاهزة',
  nutSearchPlaceholder: 'ابحث…',
  nutAllTypes: 'كل الأنواع',
  nutAdd: 'أضف',
  nutMealNameArPlaceholder: 'اسم الوجبة (عربي)',
  nutMealNameEnPlaceholder: 'Meal name (English)',
  nutServing: 'حصة',
  nutDelete: 'حذف',
  nutAddIngredient: 'أضف مكوّن',
  nutRecalcFromIngredients: 'احسب من المكونات',
  nutMealCalories: 'سعرات',
  nutMealProtein: 'بروتين',
  nutMealCarbs: 'كارب',
  nutMealFat: 'دهون',
  nutMoveUp: 'أعلى',
  nutMoveDown: 'أسفل',
  nutAddCustomMeal: 'أضف وجبة مخصّصة',
  nutDisclaimer: 'القيم الغذائية تقريبية وممكن تختلف حسب المنتج وطريقة التحضير.',

  wellTitle: 'المكملات والأدوية',
  wellDescription: 'نظّم مكملاتك وأدويتك للمتابعة بس. الأدوية للمتابعة ومو نصيحة طبية.',
  wellSuppNameArPlaceholder: 'الاسم (عربي)',
  wellSuppNameEnPlaceholder: 'Name (English)',
  wellSuppAmountPlaceholder: 'مثال: مكيال',
  wellMedNameArPlaceholder: 'الاسم (عربي)',
  wellMedNameEnPlaceholder: 'Name (English)',
  wellDelete: 'حذف',

  commitTitle: 'الالتزامات',
  commitNameArPlaceholder: 'الاسم (عربي)',
  commitNameEnPlaceholder: 'Name (English)',
  commitMoveUp: 'أعلى',
  commitMoveDown: 'أسفل',
  commitDelete: 'حذف',

  measTitle: 'القياسات والمتابعة',

  secTitle: 'الأقسام اللي تبيها في قِمّة',
  secDescription: 'اختر الأقسام اللي تبي تشوفها. تقدر تشغّل أي قسم أو توقفه بعدين.',
  secToday: 'اليوم',
  secTodayHint: 'متابعة يومك خطوة بخطوة',
  secWorkouts: 'تمارين القوة',
  secWorkoutsHint: 'تمارينك ومجموعاتك',
  secMeals: 'خطة الأكل',
  secMealsHint: 'وجباتك وسعراتك',
  secSupplements: 'المكملات',
  secSupplementsHint: 'مكملاتك الغذائية',
  secMedications: 'الأدوية',
  secMedicationsHint: 'أدويتك وجرعاتها',
  secMeasurements: 'القياسات',
  secMeasurementsHint: 'وزنك ومحيطاتك',
  secCommitments: 'مفاتيح الالتزام',
  secCommitmentsHint: 'عاداتك اليومية',
  secNotes: 'التنبيه الصحي',
  secNotesHint: 'ملاحظة صحية بسيطة',
  secAlwaysVisible: 'الملف الشخصي والهدف يبقون ظاهرين دايمًا.',

  reviewTitle: 'المراجعة والحفظ',
  reviewDescription: 'راجع خطتك بسرعة، وإذا كل شي تمام احفظ وأقفل. كل شي محفوظ على جهازك.',
  reviewName: 'اسمك',
  reviewGoal: 'الهدف',
  reviewWeight: 'الوزن',
  reviewTargetCalories: 'سعرات الهدف',
  reviewProtein: 'بروتين',
  reviewSchedule: 'جدول التمرين',
  reviewMeals: 'وجبات',
  reviewSuppMed: 'مكملات/أدوية',
  reviewMeasurements: 'قياسات',
  reviewEditLater: 'تقدر ترجع تعدّل أي شي بعدين — ما يحتاج معرفة تقنية.',
  reviewAdvancedOptions: 'خيارات متقدمة',
  reviewAdvancedIntro:
    'تقدر تحفظ نسخة احتياطية من بياناتك على جهازك، أو تستعيدها بعدين، أو ترجع للإعداد الأساسي.',
  reviewBackup: 'حفظ نسخة احتياطية',
  reviewRestore: 'استعادة من نسخة',
  reviewResetBasic: 'رجوع للإعداد الأساسي',
  reviewRestartOnboarding: 'إعادة تشغيل الإعداد الأولي',
  reviewRestartOnboardingNote:
    '«إعادة تشغيل الإعداد الأولي» يفتح لك الإعداد من جديد أول زيارة، بدون مسح بياناتك.',
  reviewFullResetConfirm:
    'بتنحذف كل بيانات قِمّة من هذا المتصفح نهائيًا (الإعداد، الخطة، المتابعات، السجلّات). ما فيه تراجع. متأكد؟',
  reviewFullReset: 'إعادة ضبط قِمّة بالكامل',
  reviewFullResetNote: 'يحذف بيانات قِمّة بس من هذا المتصفح، وبعدها يبدأ من جديد.',

  basicsTitle: 'بياناتي الأساسية',
  basicsDescription: 'نبدأ باسمك وشكل التعريف بخطتك. تقدر تعدّل كل شي بعدين.',
  basicsNameLabel: 'اسمك',
  basicsNameHint: 'يظهر في خطتك وفي ترحيب «اليوم»',
  basicsNamePlaceholder: 'مثال: محمد',
  basicsBrandLabel: 'اسم خطتك',
  basicsBrandHint: 'العنوان اللي يظهر فوق',
  basicsBrandPlaceholder: 'مثال: قِمّة',
  basicsTaglineLabel: 'وصف قصير',
  basicsTaglineHint: 'جملة تعرّف بخطتك',
  basicsTaglinePlaceholder: 'مثال: خطتي الشخصية للنادي',
  basicsUserType: 'نوعك',

  goalStepTitle: 'هدفي الحالي',
  goalStepDescription: 'اكتب هدف واحد واضح تشتغل عليه. بيظهر واضح في خطتك ويذكّرك كل يوم.',
  goalStepLabel: 'هدفك',
  goalStepHint: 'جملة بسيطة بلغتك أنت',
  goalStepPlaceholder: 'مثال: أوصل وزن 78 كجم وأبني عضلاتي خلال 3 أشهر',
  goalStepSuggestionsIntro: 'أفكار تساعدك (اضغط لتختار):',
  goalStepEditLater: 'تقدر تعدل كل شي بعدين.',
  goalSuggestion1: 'الوصول إلى 78 كجم وزيادة الكتلة العضلية خلال 12 أسبوعًا',
  goalSuggestion2: 'إنقاص نسبة الدهون والثبات على روتين تمرين 4 أيام بالأسبوع',
  goalSuggestion3: 'بناء قوة في تمارين الضغط والسحب مع أكل صحي منتظم',

  lookTitle: 'شكل التطبيق',
  lookDescription: 'اختر ألوانك في قِمّة. تنعكس مباشرة على أزرارك ومؤشراتك في كل مكان.',
  lookPresetColors: 'ألوان جاهزة:',
  lookPrimaryColor: 'اللون الأساسي',
  lookAccentColor: 'لون التمييز',

  mealsStepTitle: 'خطة الأكل',
  mealsStepDescription: 'وجباتك وأوقاتها وسعراتك. خلّها بسيطة وواقعية تقدر تلتزم فيها.',
  mealsColName: 'الوجبة',
  mealsColTime: 'الوقت',
  mealsColCalories: 'سعرات',
  mealsColProtein: 'بروتين',
  mealsColCarbs: 'كارب',
  mealsColFats: 'دهون',
  mealsAddLabel: 'إضافة وجبة',

  metricsTitle: 'القياسات والمتابعة',
  metricsDescription: 'اختر الأرقام اللي تبي تتابعها — وزنك، ونسبة دهونك، ومحيطاتك. بتساعدك تشوف تقدّمك.',
  metricsColLabel: 'القياس',
  metricsColValue: 'القيمة',
  metricsColUnit: 'الوحدة',
  metricsAddLabel: 'إضافة قياس',

  scheduleTitle: 'جدولي الأسبوعي',
  scheduleDescription: 'رتّب أيامك بين تمرين وراحة. اضغط «إضافة يوم» أو احذف اللي ما يناسبك.',
  scheduleColDay: 'اليوم',
  scheduleColTitle: 'الوصف',
  scheduleColType: 'النوع',
  scheduleAddLabel: 'إضافة يوم',

  suppStepTitle: 'المكملات والأدوية',
  suppStepDescription: 'سجّل ما تتناوله وجرعته وموعده — لتتابعه بوضوح.',
  suppSafetyNote:
    'هذه الصفحة للتنظيم والمتابعة فقط، ولا تغني عن استشارة الطبيب. لا تغيّر جرعة أي دواء بدون الرجوع للطبيب.',
  suppColName: 'الاسم',
  suppColDose: 'الجرعة',
  suppColTiming: 'التوقيت',
  suppColType: 'النوع',
  suppTypeSupplement: 'مكمل',
  suppTypeMedication: 'دواء',
  suppAddLabel: 'إضافة مكمل / دواء',

  workoutsStepTitle: 'تمارين القوة',
  workoutsStepDescription: 'تمارينك بمجموعاتها وتكراراتها وأوزانها — هذي اللي تظهر لك في «اليوم».',
  workoutsColName: 'التمرين',
  workoutsColMuscle: 'العضلة',
  workoutsColSets: 'مجموعات',
  workoutsColReps: 'تكرارات',
  workoutsColWeight: 'الوزن',
  workoutsAddLabel: 'إضافة تمرين',
}

const en: OnboardingStrings = {
  back: 'Back',
  skip: 'Skip',
  next: 'Next',
  buildMyPlan: 'Build my plan',
  recommended: 'Recommended:',
  recommendedForLevel: 'Recommended for your level: {n} days.',
  daysUnit: 'days',
  buildingTitle: 'Building your perfect plan…',
  buildingSubtitle: 'Picking your split, spreading your days, and crunching your targets.',

  labelName: 'Name',
  labelGoal: 'Goal',
  labelSex: 'Sex',
  labelAge: 'Age',
  labelHeight: 'Height',
  labelWeight: 'Weight',
  labelTargetWeight: 'Target weight',
  labelExperience: 'Experience',
  labelConsistency: 'Consistency',
  labelEnvironment: 'Training location',
  labelDays: 'Days',
  labelDuration: 'Session length',
  labelSplitMode: 'Split',
  labelAdvancedSplit: 'Split type',
  labelActivity: 'Daily activity',
  labelNutritionStyle: 'Nutrition',
  labelMeals: 'Meals',
  labelMealDistribution: 'Meal distribution',
  labelAppetiteTiming: 'Hunger timing',
  labelFood: 'Food preferences',
  labelLimitations: 'Limits & tracking',
  labelBuilding: 'Building your plan',

  nameTitle: 'What should we call you?',
  nameHint: 'Optional — we use it to welcome you on the home screen. You can skip this.',
  namePlaceholder: 'Your name (optional)',
  nameAria: 'Name (optional)',
  goalTitle: "What's your goal?",
  goalHint: 'We build the whole plan around it.',
  sexTitle: 'Your sex?',
  sexHint: 'We use it to calculate calories accurately.',
  ageTitle: 'How old are you?',
  ageUnit: 'years',
  ageAria: 'Age in years',
  heightTitle: 'How tall are you?',
  heightUnit: 'cm',
  heightAria: 'Height in centimeters',
  weightTitle: "What's your current weight?",
  weightUnit: 'kg',
  weightAria: 'Current weight in kilograms',
  targetWeightTitle: "What's your target weight?",
  targetWeightHintCut: 'Lower than your current weight.',
  targetWeightHintBulk: 'Higher than your current weight.',
  targetWeightAria: 'Target weight in kilograms',
  experienceTitle: 'How long have you been lifting?',
  experienceHint: 'We tune the plan difficulty to your level.',
  consistencyTitle: 'How consistent are you right now?',
  consistencyHint: 'We start from a point that fits where you are.',
  environmentTitle: 'Where will you train?',
  environmentHint: 'We pick exercises that suit your space.',
  daysTitle: 'How many days a week can you train?',
  durationTitle: 'How long do you want each session?',
  durationHint: 'We tune the number of exercises to your time.',
  splitModeTitle: 'How should we set your split?',
  splitModeHint: 'Auto works for most people.',
  advancedSplitTitle: 'Which split do you prefer?',
  advancedSplitHint: 'Pick what best fits your style.',
  activityTitle: 'How active are you outside training?',
  activityHint: 'It helps us dial in your calories accurately.',
  activityStepsToggleTitle: 'I know my daily step count',
  activityStepsToggleSubtitle: 'Optional — improves estimate accuracy',
  stepsUnit: 'steps',
  stepsAria: 'Daily steps estimate',
  nutritionStyleTitle: 'How do you want to handle nutrition?',
  nutritionStyleHint: 'We can adjust it later.',
  mealsTitle: 'How many meals a day suit you?',
  mealsHint: 'We spread your calories across them.',
  mealsUnit: 'meals',
  mealDistributionTitle: 'Prefer fewer bigger meals, or more smaller ones?',
  mealDistributionHint: 'It decides where we focus your calories.',
  appetiteTimingTitle: 'When are you hungriest?',
  appetiteTimingHint: 'We spread your calories to fit your day.',
  foodTitle: 'Your food preferences',
  foodHint: 'Optional — you can skip this.',
  foodPatternLabel: 'Eating style',
  foodAllergiesLabel: 'Food allergies (select any that apply)',
  limitationsTitle: 'Limits & tracking',
  limitationsHint: 'Optional — you can skip this.',
  limitationsInjuriesLabel: 'Injuries or sensitive areas?',
  limitationsWellnessLabel: 'Track supplements & medications?',

  targetWeightErrorCut: 'For a cut, your target weight must be lower than your current weight.',
  targetWeightErrorBulk: 'For a bulk, your target weight must be higher than your current weight.',

  decrease: 'Decrease',
  increase: 'Increase',

  editPlanTitle: 'Edit my plan',
  setupPlanTitle: 'Set up my plan',
  saved: 'Saved',
  saveDraft: 'Save draft',
  previewOnSite: 'Preview on site',
  preview: 'Preview',
  stepPrefix: 'Step',
  stepOf: 'of',
  completeRequiredFirst: 'Complete the required steps first',
  hideAdvanced: 'Hide advanced options',
  advancedOptions: 'Advanced options',
  livePreview: 'Live preview',
  prev: 'Previous',
  saveAndClose: 'Save & close',
  approveAndStart: 'Confirm my plan & start',

  ccWelcome: 'Welcome',
  ccBody: 'Your data',
  ccPlan: 'Your plan',
  ccWellness: 'Supplements & medications',
  ccMeasurements: 'Measurements & tracking',
  ccReview: 'Review',
  ccWorkoutTemplate: 'Workout schedule',
  ccNutrition: 'Meal plan',
  ccSmartCalc: 'Smart calculations',
  ccSections: 'Show sections',
  ccCommitments: 'Sections',

  previewYourPage: 'Preview your plan',
  previewYourGoal: 'Your goal',
  previewPageOwner: 'Plan owner',
  previewWorkouts: 'Workouts',
  previewMeals: 'Meals',
  previewSupplements: 'Supplements',
  previewMetrics: 'Measurements',

  deleteRow: 'Delete row',

  welcomePoint1: 'You can edit everything later',
  welcomePoint2: 'No technical knowledge needed',
  welcomePoint3: 'Everything is saved on your device',
  welcomeHelloNamed: 'Hi',
  welcomeHelloGuest: 'Welcome to Qimmah 👋',
  welcomeDescription:
    "We'll set up your personal app step by step. Just answer a few simple questions — you can come back and change anything anytime.",
  welcomeNameLabel: 'Your name',
  welcomeNameHint: 'Shows in your plan and in the "Today" greeting — required to start',
  welcomeNamePlaceholder: 'e.g. Mohammed',
  welcomeNameRequired: 'Enter your name to continue.',
  welcomeFirstTime: "We'll set up your plan for the first time. You can edit everything later.",
  welcomeLivePreviewNote:
    'Each step you finish, your plan preview updates instantly. Ready? Tap "Next" to start.',

  bodyTitle: 'Your data',
  bodyDescription:
    'Answer your details and goal, and Qimmah builds your plan automatically. You can edit anything later.',
  bodyGoalLabel: 'Your goal',
  bodyGender: 'Gender',
  bodyAge: 'Age',
  bodyAgeHint: 'years (13–100)',
  bodyHeight: 'Height',
  bodyHeightHint: 'cm (100–230)',
  bodyWeight: 'Current weight',
  bodyWeightHint: 'kg (15–250)',
  bodyTargetWeight: 'Target weight',
  bodyTargetWeightHint: 'kg (15–250)',
  bodyActivityLevel: 'Activity level',
  bodyTrainingLevel: 'Training level',
  bodyTrainingDays: 'Training days per week',
  bodyTrainingDaysHint: '1–7',
  bodyWorkoutDuration: 'Workout duration',
  bodyWorkoutDurationHint: 'minutes (20–150)',
  bodyWorkoutEnvironment: 'Training location',
  bodyInjuries: 'Injuries (optional)',
  bodyInjuriesHint: 'Any injury you want to watch out for',
  bodyInjuriesPlaceholder: 'e.g. lower back pain',
  bodyErrorHint: 'Fix the fields highlighted in red to continue.',
  bodyCalcIntro: 'Qimmah calculates your targets from this data:',
  bodyTargetCalories: 'Target calories',
  bodyProtein: 'Protein',
  bodyWater: 'Water',
  unitCalories: 'cal',
  unitG: 'g',
  unitLiter: 'L',

  genTitle: 'Your plan is ready',
  genDescription: 'Qimmah built you a starter plan from your data and goal.',
  genIntro:
    'Qimmah calculated these targets based on your data and goal. You can adjust them later in advanced settings.',
  genDailyTargets: 'Your daily targets',
  genCalories: 'Calories',
  genProtein: 'Protein',
  genCarbs: 'Carbs',
  genFat: 'Fat',
  genWater: 'Water',
  genSuggestedSchedule: 'Suggested workout schedule',
  genChooseAnother: 'Choose another schedule',
  genNutritionPlan: 'Meal plan',
  genTrackNutrition: 'I want to track my food',
  genMealsCount: 'Number of meals',
  genNutritionStyle: 'Eating style',
  genPlanned: 'Planned:',
  genPlannedProteinSuffix: 'protein',
  genPlannedTargetPrefix: 'target:',
  genSuggestedCommitments: 'Suggested commitments',
  daysWord: 'days',
  gGram: 'g',
  lLiter: 'L',
  calWord: 'cal',

  smartTitle: 'Smart calculations',
  smartDescription: 'Qimmah estimated your numbers from your data. Edit any number manually if you want.',
  smartDisclaimer: 'These calculations are estimates for organizing and tracking only, not a substitute for a professional.',
  smartManualNotice: 'You have manual edits on the calculations. You can recalculate from your data anytime.',
  smartRecalcNow: 'Recalculate now',
  smartRecalcFromData: 'Recalculate from my data',
  smartCaloriesCard: 'Calories',
  smartBmr: 'Basal (BMR)',
  smartTdee: 'Total activity (TDEE)',
  smartMaintenance: 'Maintenance',
  smartCutting: 'Cutting',
  smartBulking: 'Bulking',
  smartMacros: 'Macros',
  smartProtein: 'Protein',
  smartFat: 'Fat',
  smartCarbs: 'Carbs',
  smartWaterCard: 'Water',
  smartDailyWater: 'Daily water',
  smartWeightGoalCard: 'Weight & goal',
  smartBmi: 'Body mass index (BMI)',
  smartBmiLabel: 'BMI category',
  smartWeeklyChange: 'Expected weekly change',
  smartWeeksToGoal: 'Estimated weeks to goal',
  smartTrainingCard: 'Training suggestion',
  smartSuggestedSplit: 'Suggested split',
  smartNotes: 'Notes',
  unitWeeks: 'weeks',
  unitKg: 'kg',

  wtTitle: 'Choose your workout schedule',
  wtDescription: 'Pick a ready-made template, then tweak it however you like — add from the library or delete.',
  wtReplaceNotice: 'Your current workout schedule will be replaced. You can edit everything after choosing.',
  wtBalanceFallback: 'Review your workout balance before saving these changes.',
  wtCancel: 'Cancel',
  wtConfirm: 'Confirm',
  wtDayNameArPlaceholder: 'Day name (Arabic)',
  wtDayNameEnPlaceholder: 'Day name (English)',
  wtWatchGuide: 'Watch guide',
  wtMoveUp: 'Move up',
  wtMoveDown: 'Move down',
  wtDelete: 'Delete',
  wtSets: 'Sets',
  wtReps: 'Reps',
  wtRest: 'Rest (s)',
  wtStartWeight: 'Starting weight',
  wtNotes: 'Notes',
  wtVideoLink: 'Guide link (optional)',
  wtVideoPlaceholder: 'Leave empty to use the library guide',
  wtAddFromLibrary: 'Add exercise from library',
  daysAndRecommended: 'days',

  nutTitle: 'Meal plan',
  nutDescription: 'Set your targets and pick ready-made meals or build them from ingredients.',
  nutTrackNutrition: 'I want to track my food',
  nutDiffersNotice: 'There are differences between your calculations and your meal plan.',
  nutUpdateFromCalc: 'Update meal plan from my calculations',
  nutGoalsTitle: 'Nutrition targets',
  nutUseSmartCalc: 'Use my smart calculations',
  nutCalories: 'Calories',
  nutProtein: 'Protein (g)',
  nutCarbs: 'Carbs (g)',
  nutFat: 'Fat (g)',
  nutWater: 'Water (L)',
  nutAddTemplate: 'Add a ready-made meal',
  nutSearchPlaceholder: 'Search…',
  nutAllTypes: 'All types',
  nutAdd: 'Add',
  nutMealNameArPlaceholder: 'Meal name (Arabic)',
  nutMealNameEnPlaceholder: 'Meal name (English)',
  nutServing: 'serving',
  nutDelete: 'Delete',
  nutAddIngredient: 'Add ingredient',
  nutRecalcFromIngredients: 'Calculate from ingredients',
  nutMealCalories: 'Calories',
  nutMealProtein: 'Protein',
  nutMealCarbs: 'Carbs',
  nutMealFat: 'Fat',
  nutMoveUp: 'Move up',
  nutMoveDown: 'Move down',
  nutAddCustomMeal: 'Add a custom meal',
  nutDisclaimer: 'Nutrition values are estimates and may vary by product and preparation.',

  wellTitle: 'Supplements & medications',
  wellDescription: 'Organize your supplements and medications for tracking only. Medications are for tracking, not medical advice.',
  wellSuppNameArPlaceholder: 'Name (Arabic)',
  wellSuppNameEnPlaceholder: 'Name (English)',
  wellSuppAmountPlaceholder: 'e.g. 1 scoop',
  wellMedNameArPlaceholder: 'Name (Arabic)',
  wellMedNameEnPlaceholder: 'Name (English)',
  wellDelete: 'Delete',

  commitTitle: 'Commitments',
  commitNameArPlaceholder: 'Name (Arabic)',
  commitNameEnPlaceholder: 'Name (English)',
  commitMoveUp: 'Move up',
  commitMoveDown: 'Move down',
  commitDelete: 'Delete',

  measTitle: 'Measurements & tracking',

  secTitle: 'The sections you want in Qimmah',
  secDescription: 'Choose the sections you want to see. You can turn any section on or off later.',
  secToday: 'Today',
  secTodayHint: 'Track your day step by step',
  secWorkouts: 'Strength workouts',
  secWorkoutsHint: 'Your exercises and sets',
  secMeals: 'Meal plan',
  secMealsHint: 'Your meals and calories',
  secSupplements: 'Supplements',
  secSupplementsHint: 'Your dietary supplements',
  secMedications: 'Medications',
  secMedicationsHint: 'Your medications and doses',
  secMeasurements: 'Measurements',
  secMeasurementsHint: 'Your weight and measurements',
  secCommitments: 'Commitment keys',
  secCommitmentsHint: 'Your daily habits',
  secNotes: 'Health notice',
  secNotesHint: 'A simple health note',
  secAlwaysVisible: 'Your profile and goal always stay visible.',

  reviewTitle: 'Review & save',
  reviewDescription: 'Take a quick look at your plan, and if everything looks good, save and close. Everything is saved on your device.',
  reviewName: 'Name',
  reviewGoal: 'Goal',
  reviewWeight: 'Weight',
  reviewTargetCalories: 'Target calories',
  reviewProtein: 'Protein',
  reviewSchedule: 'Workout schedule',
  reviewMeals: 'Meals',
  reviewSuppMed: 'Supplements/medications',
  reviewMeasurements: 'Measurements',
  reviewEditLater: 'You can come back and edit anything later — no technical knowledge needed.',
  reviewAdvancedOptions: 'Advanced options',
  reviewAdvancedIntro:
    'You can save a backup of your data to your device, restore it later, or go back to the basic setup.',
  reviewBackup: 'Save backup',
  reviewRestore: 'Restore from backup',
  reviewResetBasic: 'Back to basic setup',
  reviewRestartOnboarding: 'Restart initial setup',
  reviewRestartOnboardingNote:
    '"Restart initial setup" opens setup again on your next visit, without wiping your data.',
  reviewFullResetConfirm:
    'All Qimmah data will be permanently deleted from this browser (setup, plan, tracking, logs). This cannot be undone. Are you sure?',
  reviewFullReset: 'Reset Qimmah completely',
  reviewFullResetNote: 'Deletes only Qimmah data from this browser, then starts fresh.',

  basicsTitle: 'My basic info',
  basicsDescription: 'We start with your name and how your plan is introduced. You can change all of this later.',
  basicsNameLabel: 'Your name',
  basicsNameHint: 'Shows in your plan and in the "Today" greeting',
  basicsNamePlaceholder: 'e.g. Mohammed',
  basicsBrandLabel: 'Your plan name',
  basicsBrandHint: 'The title shown at the top',
  basicsBrandPlaceholder: 'e.g. Qimmah',
  basicsTaglineLabel: 'Short description',
  basicsTaglineHint: 'A sentence that introduces your plan',
  basicsTaglinePlaceholder: 'e.g. My personal gym plan',
  basicsUserType: 'Your type',

  goalStepTitle: 'My current goal',
  goalStepDescription: 'Write one clear goal to work on. It shows large in your plan and reminds you every day.',
  goalStepLabel: 'Your goal',
  goalStepHint: 'A simple sentence in your own words',
  goalStepPlaceholder: 'e.g. reach 78 kg and build muscle in 3 months',
  goalStepSuggestionsIntro: 'Ideas to help (tap to choose):',
  goalStepEditLater: 'You can edit everything later.',
  goalSuggestion1: 'Reach 78 kg and increase muscle mass within 12 weeks',
  goalSuggestion2: 'Lower body fat and stick to a 4-day-a-week training routine',
  goalSuggestion3: 'Build strength in push and pull movements with regular healthy eating',

  lookTitle: 'App look',
  lookDescription: 'Choose your colors in Qimmah. They apply instantly to your buttons and indicators everywhere.',
  lookPresetColors: 'Preset colors:',
  lookPrimaryColor: 'Primary color',
  lookAccentColor: 'Accent color',

  mealsStepTitle: 'Meal plan',
  mealsStepDescription: 'Your meals, times, and calories. Keep them simple and realistic so you can stick to them.',
  mealsColName: 'Meal',
  mealsColTime: 'Time',
  mealsColCalories: 'Calories',
  mealsColProtein: 'Protein',
  mealsColCarbs: 'Carbs',
  mealsColFats: 'Fat',
  mealsAddLabel: 'Add meal',

  metricsTitle: 'Measurements & tracking',
  metricsDescription: 'The numbers you want to track — your weight, body fat, measurements. They help you see your progress.',
  metricsColLabel: 'Measurement',
  metricsColValue: 'Value',
  metricsColUnit: 'Unit',
  metricsAddLabel: 'Add measurement',

  scheduleTitle: 'My weekly schedule',
  scheduleDescription: 'Arrange your days between training and rest. Tap "Add day" or delete what doesn\'t fit.',
  scheduleColDay: 'Day',
  scheduleColTitle: 'Description',
  scheduleColType: 'Type',
  scheduleAddLabel: 'Add day',

  suppStepTitle: 'Supplements & medications',
  suppStepDescription: 'Log what you take, the dose, and its timing — so you can track it without forgetting.',
  suppSafetyNote:
    "This page is for organizing and tracking only, and doesn't replace consulting a doctor. Don't change any medication dose without checking with your doctor.",
  suppColName: 'Name',
  suppColDose: 'Dose',
  suppColTiming: 'Timing',
  suppColType: 'Type',
  suppTypeSupplement: 'Supplement',
  suppTypeMedication: 'Medication',
  suppAddLabel: 'Add supplement / medication',

  workoutsStepTitle: 'Strength workouts',
  workoutsStepDescription: 'Your exercises with their sets, reps, and weights — these show up in "Today".',
  workoutsColName: 'Exercise',
  workoutsColMuscle: 'Muscle',
  workoutsColSets: 'Sets',
  workoutsColReps: 'Reps',
  workoutsColWeight: 'Weight',
  workoutsAddLabel: 'Add exercise',
}

export const onboardingStrings: Record<Lang, OnboardingStrings> = { ar, en }
