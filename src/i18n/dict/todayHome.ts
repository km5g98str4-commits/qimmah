// نصوص الرئيسية المعاد تصميمها — [QIMMAH-TODAY-SOVEREIGN-REDESIGN-001].
//
// النبرة **عامية بيضاء** يفهمها كل عربي (§6)، والإنجليزية غير رسمية ودودة.
// الثوابت الأربعة تسري على كل سطر: لا لوم · لا ضغط · لا تهويل · ولا تكديس تعجّب.
//
// ═══ قاعدتان تحكمان صياغة الأرقام هنا ═══
// ① **الأرقام لا تُخبَز في النصّ.** كل دالة تستقبل نصًّا مُنسَّقًا مسبقًا
//    (`formatNumber(n, lang)`) لا رقمًا خامًا. لولا ذلك لعادت أرقام لاتينية إلى
//    جلسة عربية من باب القاموس بعد أن أُغلق باب المكوّن (BUG-019).
// ② **لغة التقدّم متحفّظة للمُستنتَج وحاسمة للمُقاس** (§6). «أكملت ٣ من ٤» مقيسة
//    فتُقال حاسمة؛ وأهداف السعرات **تقديرية** فتُقال بلفظها.

import type { Lang } from '@/lib/appPreferences'

export interface TodayHomeStrings {
  // — بطاقة «باقي لك اليوم» —
  remainingTitle: string
  /** سطر يشرح دلالة الحلقة: القوس مستهلَك · الرقم في المنتصف متبقٍّ. */
  ringLegend: string
  caloriesUnit: string
  /** «١٬٣٨٧ / ٢٬٤٠٠» — النصّان منسَّقان مسبقًا. */
  ofTarget: (consumed: string, target: string) => string
  macroProtein: string
  macroCarbs: string
  macroFat: string
  gramsShort: string
  /** وصف صوتي كامل لحلقة واحدة — لقارئ الشاشة، لا يعتمد على اللون. */
  ringAria: (label: string, remaining: string, consumed: string, target: string) => string
  noTargetsTitle: string
  noTargetsBody: string
  noTargetsBodyMinor: string
  openNutrition: string

  // — اليوم الأول (يُعرض للقادم الجديد قبل أي رقم) —
  /** عنوان يقول أين هو من الرحلة، لا «مرحبًا» عامًّا. */
  firstDayTitle: string
  /** وش متوقّع منه اليوم — جملة واحدة، بلا ضغط ولا قائمة مهامّ. */
  firstDayExpect: string
  /** لمحة القائمة: هذه أبواب اليوم لا مهامّ مطلوبة كلّها. */
  firstDayPickOne: string
  /** **وش تعني الأرقام** — يُقال قبل أن يظهر أول رقم لا بعده. */
  firstDayNumbers: string
  /** [MINOR-COPY-001] لمن هم دون 18: لا حلقات سعرات ولا أهداف رقمية — النصّ لا يعد بما لا يصل. */
  firstDayNumbersMinor: string

  // — الإجراء التالي —
  nextStepEyebrow: string
  restDayChip: string
  metaExercises: string
  metaDuration: string
  metaSets: string
  minutesShort: string
  /** «أنجزت ٤ من ١٨ مجموعة» — تقدّم جزئي حقيقي فقط. */
  partialProgress: (done: string, total: string) => string

  // — الماء —
  waterTitle: string
  /** «٥ من ٨ أكواب» — النصّان منسَّقان مسبقًا. */
  waterCups: (consumed: string, target: string) => string
  waterNoTarget: string
  waterNoTargetMinor: string
  /** بلا هدف محسوب — يُقال المسجَّل فعلًا حتى لا تكون الضغطة بلا أثر مرئي. */
  waterLoggedOnly: (ml: string) => string
  waterAdd: string
  waterDone: string
  waterSaveError: string
  waterAria: (consumed: string, target: string) => string

  // — أفعال سريعة —
  logMeal: string
  logMealHint: string
  todayWeight: string
  /** «آخر قياس قبل ٩ أيام» — العدد منسَّق مسبقًا. */
  weightLastDays: (days: string) => string
  weightToday: string
  weightNever: string

  // — نبض الأسبوع —
  pulseTitle: string
  pulseSubtitle: string
  /** «أكملت ٣ من ٤ أيام مخططة هذا الأسبوع.» */
  pulseSummary: (done: string, planned: string) => string
  pulseNoPlan: (done: string) => string
  pulseEmpty: string
  pulseDayShort: readonly string[]
  pulseState: Record<'completed' | 'partial' | 'missed' | 'today' | 'planned' | 'rest' | 'none', string>

  // — التعافي (يظهر عند وجود تذكير حقيقي وحده) —
  recoveryTitle: string

  // — سطر الثقة —
  estimateNote: string
  howWeCalculate: string
}

const ar: TodayHomeStrings = {
  remainingTitle: 'باقي لك اليوم',
  ringLegend: 'الحلقة تمثّل اللي استهلكته من هدفك · والرقم داخلها هو الباقي',
  caloriesUnit: 'سعرة',
  ofTarget: (consumed, target) => `${consumed} / ${target}`,
  macroProtein: 'بروتين',
  macroCarbs: 'كارب',
  macroFat: 'دهون',
  gramsShort: 'غ',
  ringAria: (label, remaining, consumed, target) => `${label} · باقي ${remaining} · استهلكت ${consumed} من ${target}`,
  noTargetsTitle: 'لنضبط يومك أولًا',
  noTargetsBody: 'سجّل أول وجبة ووزنك الحالي، ونعرض لك حلقات السعرات والماكروز على طول.',
  noTargetsBodyMinor: 'لعمرك ما نعرض حلقات سعرات أو ماكروز — سجّل أكلك وتمرينك ووزنك، والإرشاد النوعي معك.',
  openNutrition: 'افتح التغذية',

  firstDayTitle: 'يومك الأول في قِمّة',
  firstDayExpect: 'اليوم ما نبي منك إلا بداية صغيرة — خطوة وحدة تكفي، وباقي اليوم يجي وراها.',
  firstDayPickOne: 'اختر اللي يناسبك الحين:',
  firstDayNumbers: 'أول ما تسجّل، تظهر أرقامك هنا. كل هدف تقديري من بياناتك.',
  firstDayNumbersMinor: 'لعمرك ما نحسب أهداف سعرات أو ماء — نركّز على العادات والتسجيل. أول ما تسجّل يظهر سجلّك هنا.',

  nextStepEyebrow: 'خطوتك الجاية · الحين',
  restDayChip: 'يوم راحة',
  metaExercises: 'تمارين',
  metaDuration: 'المدة',
  metaSets: 'مجموعات',
  minutesShort: 'د',
  partialProgress: (done, total) => `أنجزت ${done} من ${total} مجموعة`,

  waterTitle: 'الماء',
  waterCups: (consumed, target) => `${consumed} من ${target} أكواب`,
  waterNoTarget: 'كمّل إعدادك عشان نحسب هدف مويتك.',
  waterNoTargetMinor: 'ما نحسب هدف ماء رقمي لعمرك — سجّل مويتك وتابعها بنفسك.',
  waterLoggedOnly: (ml) => `سجّلت ${ml} مل اليوم`,
  waterAdd: 'أضف كوب ماء',
  waterDone: 'كمّلت هدف مويتك',
  waterSaveError: 'ما قدرنا نحفظ الكوب — جرّب مرة ثانية.',
  waterAria: (consumed, target) => `الماء · ${consumed} من ${target} أكواب`,

  logMeal: 'سجّل وجبة',
  logMealHint: 'باركود أو بحث',
  todayWeight: 'وزن اليوم',
  weightLastDays: (days) => `آخر قياس قبل ${days} أيام`,
  weightToday: 'سجّلته اليوم',
  weightNever: 'ما فيه قياس مسجّل',

  pulseTitle: 'نبض أسبوعك',
  pulseSubtitle: 'الأيام المكتملة من أيام خطتك',
  pulseSummary: (done, planned) => `أكملت ${done} من ${planned} أيام مخططة هذا الأسبوع.`,
  pulseNoPlan: (done) => `أكملت ${done} أيام تمرين هذا الأسبوع · ما فيه أيام مخططة.`,
  pulseEmpty: 'ما فيه بيانات بعد. يبدأ نبض أسبوعك بعد أول تمرين مسجّل.',
  // مختصرات بلا «ال» — «الأربعاء» كاملة ما تسع سبعة أعمدة على شاشة ٣٢٠.
  // الترقيم ترقيم JS: 0=الأحد … 6=السبت. والاسم الكامل يبقى لقارئ الشاشة.
  pulseDayShort: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'],
  pulseState: {
    completed: 'مكتمل',
    partial: 'جزئي',
    missed: 'ما تم',
    today: 'اليوم',
    planned: 'مخطط',
    rest: 'راحة',
    none: 'بلا خطة',
  },

  recoveryTitle: 'تذكير المساء',

  estimateNote: 'أهداف السعرات والماكروز تقديرية — مبنية على بياناتك ونشاطك المسجّل، وتتحدّث معها.',
  howWeCalculate: 'كيف نحسب أرقامك؟',
}

const en: TodayHomeStrings = {
  remainingTitle: 'Left for you today',
  ringLegend: 'The ring shows what you have used of your target · the number inside is what is left',
  caloriesUnit: 'kcal',
  ofTarget: (consumed, target) => `${consumed} / ${target}`,
  macroProtein: 'Protein',
  macroCarbs: 'Carbs',
  macroFat: 'Fat',
  gramsShort: 'g',
  ringAria: (label, remaining, consumed, target) => `${label} · ${remaining} left · ${consumed} of ${target} used`,
  noTargetsTitle: 'Let us set up your day first',
  noTargetsBody: 'Log your first meal and your current weight, and we will show your calorie and macro rings right away.',
  noTargetsBodyMinor: 'At your age we don’t show calorie or macro rings — log your food, training and weight, and the qualitative guidance stays with you.',
  openNutrition: 'Open nutrition',

  firstDayTitle: 'Your first day on Qimmah',
  firstDayExpect: 'All we want today is a small start — one step is enough, the rest follows.',
  firstDayPickOne: 'Pick whatever suits you right now:',
  firstDayNumbers: 'Log something and your numbers show up here. Every target is an estimate from your data.',
  firstDayNumbersMinor: 'At your age we don’t set calorie or water targets — we focus on habits and logging. Log something and it shows up here.',

  nextStepEyebrow: 'Your next step · now',
  restDayChip: 'Rest day',
  metaExercises: 'Exercises',
  metaDuration: 'Duration',
  metaSets: 'Sets',
  minutesShort: 'min',
  partialProgress: (done, total) => `${done} of ${total} sets done`,

  waterTitle: 'Water',
  waterCups: (consumed, target) => `${consumed} of ${target} cups`,
  waterNoTarget: 'Finish your setup so we can work out your water target.',
  waterNoTargetMinor: 'We don’t set a numeric water target at your age — log your water and track it yourself.',
  waterLoggedOnly: (ml) => `${ml} ml logged today`,
  waterAdd: 'Add a cup of water',
  waterDone: 'Water goal reached',
  waterSaveError: 'We could not save that cup — please try again.',
  waterAria: (consumed, target) => `Water · ${consumed} of ${target} cups`,

  logMeal: 'Log a meal',
  logMealHint: 'Barcode or search',
  todayWeight: 'Today’s weight',
  weightLastDays: (days) => `Last logged ${days} days ago`,
  weightToday: 'Logged today',
  weightNever: 'No weight logged yet',

  pulseTitle: 'Your weekly pulse',
  pulseSubtitle: 'Days completed out of your plan days',
  pulseSummary: (done, planned) => `You completed ${done} of ${planned} planned days this week.`,
  pulseNoPlan: (done) => `You completed ${done} workout days this week · no days are planned.`,
  pulseEmpty: 'No data yet. Your weekly pulse starts after your first logged workout.',
  pulseDayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  pulseState: {
    completed: 'Completed',
    partial: 'Partial',
    missed: 'Not done',
    today: 'Today',
    planned: 'Planned',
    rest: 'Rest',
    none: 'No plan',
  },

  recoveryTitle: 'Evening reminder',

  estimateNote: 'Calorie and macro targets are estimates — based on your data and logged activity, and they update with it.',
  howWeCalculate: 'How do we work out your numbers?',
}

export const todayHomeStrings: Record<Lang, TodayHomeStrings> = { ar, en }
