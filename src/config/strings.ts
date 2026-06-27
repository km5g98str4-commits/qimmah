// نصوص قشرة التطبيق (الشاشات والتنقّل) بالعربية والإنجليزية.
// محتوى الأقسام التفصيلي يبقى عربيًا في هذه المرحلة.

import type { Lang } from '@/lib/appPreferences'

export interface ShellStrings {
  brand: string
  tagline: string
  nav: { home: string; setup: string; demo: string }
  lang: { ar: string; en: string; label: string }
  start: {
    welcome: string
    intro: string
    startSetup: string
    continueSetup: string
    seeDemo: string
    importPrevious: string
    chooseLang: string
    note: string
  }
  demo: { badge: string; title: string; body: string; back: string }
  workout: {
    start: string
    watch: string
    trustedGuide: string
    alternatives: string
    altPrompt: string
    startRest: string
    pause: string
    resume: string
    reset: string
    rest: string
    sets: string
    reps: string
    todayWeight: string
    repsDone: string
    prevWeight: string
    bestWeight: string
    notes: string
    difficulty: string
    easy: string
    medium: string
    hard: string
    painLabel: string
    painPlaceholder: string
    safety: string
    finish: string
    confirmUnfinished: string
    finishTitle: string
    finishBodyUnfinished: string
    finishBodyDone: string
    confirmFinish: string
    keepGoing: string
    errWeight: string
    errReps: string
    progress: string
    savedTitle: string
    savedBody: string
    recentTitle: string
    completedToday: string
    emptyPlan: string
    workoutsTitle: string
    workoutsDesc: string
    // — وضع التمرين النشط —
    heroReady: string
    startToday: string
    targetMuscles: string
    estDuration: string
    exercisesCount: string
    minShort: string
    lastWorkout: string
    noLastWorkout: string
    streak: string
    streakDays: string
    weekDone: string
    of: string
    target: string
    prevPerf: string
    bestPerf: string
    noHistory: string
    repeatLast: string
    nextExercise: string
    prevExercise: string
    setSaved: string
    weightKg: string
    moreDetails: string
    rpe: string
    restAdd30: string
    skipRest: string
    stopRest: string
    nextUp: string
    restDone: string
    quickGuide: string
    videoLabel: string
    techniquePoints: string
    commonMistakes: string
    swapForToday: string
    saveToPlan: string
    swapped: string
    equipment: string
    // — ملخّص التمرين —
    summaryTitle: string
    summarySub: string
    duration: string
    exercisesDone: string
    setsDone: string
    totalVolume: string
    volumeUnit: string
    prsLabel: string
    noPrs: string
    musclesTrained: string
    nextWorkout: string
    backToToday: string
    viewProgress: string
    newPr: string
  }
  nutrition: {
    title: string
    desc: string
    enable: string
    useSmart: string
    calories: string
    protein: string
    carbs: string
    fat: string
    water: string
    total: string
    target: string
    diff: string
    addTemplate: string
    addMeal: string
    addIngredient: string
    servings: string
    recalc: string
    estimateNote: string
    empty: string
    mealsDone: string
    addWater250: string
    addWater500: string
    resetWater: string
    search: string
    allTypes: string
  }
  wellness: {
    title: string
    desc: string
    enable: string
    supplementsTab: string
    medicationsTab: string
    addSupplement: string
    addMedication: string
    addCustomSupplement: string
    addCustomMedication: string
    amount: string
    dose: string
    doseHint: string
    timing: string
    frequency: string
    food: string
    before: string
    after: string
    withFood: string
    anyFood: string
    notes: string
    doctorNote: string
    caution: string
    purpose: string
    medSafety: string
    empty: string
    search: string
    allCategories: string
  }
  commit: {
    title: string
    desc: string
    enable: string
    intro: string
    add: string
    addCustom: string
    name: string
    category: string
    frequency: string
    daily: string
    weekly: string
    custom: string
    notes: string
    progress: string
    empty: string
    search: string
    allCategories: string
  }
  progress: {
    title: string
    desc: string
    enable: string
    selectTypes: string
    advanced: string
    advancedNote: string
    quickLog: string
    save: string
    latest: string
    history: string
    trend: string
    up: string
    down: string
    same: string
    noLogs: string
    empty: string
    notes: string
    delete: string
  }
}

const ar: ShellStrings = {
  brand: 'قِمّة',
  tagline: 'تطبيقك الشخصي للتمرين والتغذية والمتابعة',
  nav: { home: 'الرئيسية', setup: 'الإعداد', demo: 'النموذج' },
  lang: { ar: 'العربية', en: 'English', label: 'اللغة' },
  start: {
    welcome: 'أهلاً بك في قِمّة',
    intro: 'تمارينك، أكلك، مكملاتك، أدويتك، قياساتك، والتزامك اليومي — كلها في مكان واحد.',
    startSetup: 'ابدأ إعداد صفحتي',
    continueSetup: 'أكمل إعداد صفحتي',
    seeDemo: 'شاهد نموذج جاهز',
    importPrevious: 'استورد نسخة سابقة',
    chooseLang: 'اختر اللغة',
    note: 'كل شيء محفوظ على جهازك. تقدر تعدل كل شيء لاحقًا.',
  },
  demo: {
    badge: 'نموذج تجريبي',
    title: 'هذا نموذج تجريبي',
    body: 'هذا نموذج تجريبي ولا يغيّر بياناتك.',
    back: 'رجوع',
  },
  workout: {
    start: 'ابدأ تمريني',
    watch: 'شاهد الشرح',
    trustedGuide: 'رابط شرح موثوق',
    alternatives: 'بدائل',
    altPrompt: 'الجهاز مشغول؟ جرّب بديلًا',
    startRest: 'ابدأ الراحة',
    pause: 'إيقاف',
    resume: 'متابعة',
    reset: 'تصفير',
    rest: 'راحة',
    sets: 'مجموعات',
    reps: 'تكرارات',
    todayWeight: 'وزن اليوم',
    repsDone: 'التكرارات المنجزة',
    prevWeight: 'آخر وزن',
    bestWeight: 'أفضل وزن',
    notes: 'ملاحظات',
    difficulty: 'الصعوبة',
    easy: 'سهل',
    medium: 'متوسط',
    hard: 'صعب',
    painLabel: 'ألم أو انزعاج (اختياري)',
    painPlaceholder: 'صف أي انزعاج لاحظته',
    safety: 'إذا شعرت بألم غير طبيعي، أوقف التمرين واستشر مختصًا.',
    finish: 'إنهاء التمرين',
    confirmUnfinished: 'لسا فيه تمارين ما خلّصتها. تبي تنهي التمرين؟',
    finishTitle: 'تنهي التمرين؟',
    finishBodyUnfinished: 'لسا فيه تمارين ما خلّصتها — بنحفظ اللي سجّلته ونعرض الملخّص.',
    finishBodyDone: 'بنحفظ تمرينك ونعرض الملخّص.',
    confirmFinish: 'نعم، أنهِ واحفظ',
    keepGoing: 'أكمل التمرين',
    errWeight: 'الوزن لازم بين ٠ و٥٠٠ كجم',
    errReps: 'التكرارات لازم بين ٠ و١٠٠',
    progress: 'الإنجاز',
    savedTitle: 'تم حفظ تمرينك',
    savedBody: 'تم تحديث أوزانك وسجل التمرين.',
    recentTitle: 'آخر تمرين',
    completedToday: 'تمرين اليوم مكتمل',
    emptyPlan: 'اختر جدولك من الإعداد لتبدأ.',
    workoutsTitle: 'تماريني',
    workoutsDesc: 'جدولك الحالي بكل أيامه وتمارينه — مع شرح كل تمرين.',
    heroReady: 'تمرينك اليوم جاهز',
    startToday: 'ابدأ تمرين اليوم',
    targetMuscles: 'العضلات المستهدفة',
    estDuration: 'المدة التقريبية',
    exercisesCount: 'تمارين',
    minShort: 'دقيقة',
    lastWorkout: 'آخر تمرين',
    noLastWorkout: 'أول تمرين لك — يلا نبدأ!',
    streak: 'سلسلة',
    streakDays: 'يوم متتالي',
    weekDone: 'هذا الأسبوع',
    of: 'من',
    target: 'الهدف',
    prevPerf: 'آخر مرة',
    bestPerf: 'أفضل أداء',
    noHistory: 'لا يوجد سجل سابق',
    repeatLast: 'كرّر آخر مرة',
    nextExercise: 'التمرين التالي',
    prevExercise: 'السابق',
    setSaved: 'تم حفظ الجولة',
    weightKg: 'الوزن (كجم)',
    moreDetails: 'تفاصيل إضافية',
    rpe: 'مجهود (RPE)',
    restAdd30: '+30 ث',
    skipRest: 'تخطي الراحة',
    stopRest: 'إيقاف',
    nextUp: 'التالي',
    restDone: 'خلصت الراحة — جاهز للجولة الجاية',
    quickGuide: 'شرح سريع',
    videoLabel: 'فيديو',
    techniquePoints: 'نقاط التكنيك',
    commonMistakes: 'أخطاء شائعة',
    swapForToday: 'استبدل لهذا اليوم',
    saveToPlan: 'احفظ في خطتي',
    swapped: 'تم الاستبدال لهذا اليوم',
    equipment: 'المعدّات',
    summaryTitle: 'تمرينك انحفظ 🎉',
    summarySub: 'شغل ممتاز — استمر على هذا الإيقاع.',
    duration: 'المدة',
    exercisesDone: 'تمارين',
    setsDone: 'جولات',
    totalVolume: 'الحجم الكلي',
    volumeUnit: 'كجم',
    prsLabel: 'أرقام قياسية',
    noPrs: 'ما فيه رقم قياسي هالمرة — بس كل جولة تقربك.',
    musclesTrained: 'عضلات مرّنتها',
    nextWorkout: 'تمرينك القادم',
    backToToday: 'العودة لليوم',
    viewProgress: 'عرض تقدمي',
    newPr: 'رقم قياسي جديد',
  },
  nutrition: {
    title: 'خطة الأكل',
    desc: 'وجباتك وأهدافك الغذائية — مبنية على حساباتك الذكية وقابلة للتعديل.',
    enable: 'أريد متابعة الأكل',
    useSmart: 'استخدم حساباتي الذكية',
    calories: 'سعرات',
    protein: 'بروتين',
    carbs: 'كارب',
    fat: 'دهون',
    water: 'ماء',
    total: 'المخطّط',
    target: 'الهدف',
    diff: 'الفرق',
    addTemplate: 'أضف وجبة جاهزة',
    addMeal: 'أضف وجبة مخصّصة',
    addIngredient: 'أضف مكوّن',
    servings: 'حصص',
    recalc: 'احسب من المكونات',
    estimateNote: 'القيم الغذائية تقديرية وقد تختلف حسب المنتج وطريقة التحضير.',
    empty: 'فعّل خطة الأكل من الإعداد إذا تبغى تتابع وجباتك.',
    mealsDone: 'وجبات مكتملة',
    addWater250: '+250 مل',
    addWater500: '+500 مل',
    resetWater: 'تصفير الماء',
    search: 'ابحث…',
    allTypes: 'كل الأنواع',
  },
  wellness: {
    title: 'المكملات والأدوية',
    desc: 'نظّم مكملاتك وأدويتك وتابعها يوميًا — للتنظيم فقط، وليست نصيحة طبية.',
    enable: 'أريد متابعة المكملات والأدوية',
    supplementsTab: 'المكملات',
    medicationsTab: 'الأدوية',
    addSupplement: 'أضف مكمّلًا من المكتبة',
    addMedication: 'أضف دواءً من المكتبة',
    addCustomSupplement: 'أضف مكمّلًا مخصّصًا',
    addCustomMedication: 'أضف دواءً مخصّصًا',
    amount: 'الكمية',
    dose: 'الجرعة',
    doseHint: 'أدخل الجرعة بحسب وصف الطبيب',
    timing: 'التوقيت',
    frequency: 'التكرار',
    food: 'مع الأكل',
    before: 'قبل',
    after: 'بعد',
    withFood: 'مع',
    anyFood: 'أي وقت',
    notes: 'ملاحظات',
    doctorNote: 'ملاحظة الطبيب',
    caution: 'تنبيه',
    purpose: 'الغرض من المتابعة',
    medSafety:
      'قِمّة يساعدك على تنظيم ومتابعة أدويتك فقط. لا تبدأ أو توقف أو تغيّر جرعة أي دواء بدون استشارة الطبيب أو الصيدلي.',
    empty: 'فعّل المكملات والأدوية من الإعداد إذا تبغى تتابعها.',
    search: 'ابحث…',
    allCategories: 'كل الفئات',
  },
  commit: {
    title: 'التزاماتي',
    desc: 'الأشياء اللي تبي تلتزم فيها يوميًا أو أسبوعيًا.',
    enable: 'أريد متابعة الالتزامات اليومية',
    intro: 'اختر الأشياء التي تبي تلتزم فيها يوميًا أو أسبوعيًا. تقدر تعدلها لاحقًا.',
    add: 'أضف من المكتبة',
    addCustom: 'أضف التزامًا مخصّصًا',
    name: 'الاسم',
    category: 'الفئة',
    frequency: 'التكرار',
    daily: 'يومي',
    weekly: 'أسبوعي',
    custom: 'مخصّص',
    notes: 'ملاحظات',
    progress: 'إنجاز اليوم',
    empty: 'فعّل الالتزامات من الإعداد إذا تبغى تتابعها.',
    search: 'ابحث…',
    allCategories: 'كل الفئات',
  },
  progress: {
    title: 'القياسات والتقدّم',
    desc: 'سجّل قياساتك وتابع تقدّمك بمرور الوقت.',
    enable: 'أريد متابعة القياسات والتقدّم',
    selectTypes: 'اختر القياسات التي تبي تتابعها',
    advanced: 'قياسات صحية متقدمة',
    advancedNote: 'القياسات الصحية المتقدمة للتسجيل فقط، وليست للتشخيص.',
    quickLog: 'تسجيل سريع',
    save: 'احفظ القياس',
    latest: 'آخر قياس',
    history: 'السجل',
    trend: 'الاتجاه',
    up: 'ارتفاع',
    down: 'انخفاض',
    same: 'بدون تغيير',
    noLogs: 'لا توجد قياسات بعد.',
    empty: 'فعّل القياسات من الإعداد إذا تبغى تتابع تقدّمك.',
    notes: 'ملاحظات',
    delete: 'حذف',
  },
}

const en: ShellStrings = {
  brand: 'Qimmah',
  tagline: 'Your personal fitness journey in one page',
  nav: { home: 'My Page', setup: 'Setup', demo: 'Demo' },
  lang: { ar: 'العربية', en: 'English', label: 'Language' },
  start: {
    welcome: 'Welcome to Qimmah',
    intro: 'Your workouts, food, supplements, medications, measurements, and daily commitments — all in one place.',
    startSetup: 'Set up my page',
    continueSetup: 'Continue my setup',
    seeDemo: 'See a ready sample',
    importPrevious: 'Import a previous copy',
    chooseLang: 'Choose language',
    note: 'Everything is saved on your device. You can edit anything later.',
  },
  demo: {
    badge: 'Demo',
    title: 'This is a demo',
    body: 'This is a demo and does not change your data.',
    back: 'Back',
  },
  workout: {
    start: 'Start workout',
    watch: 'Watch video',
    trustedGuide: 'Trusted video guide',
    alternatives: 'Alternatives',
    altPrompt: 'Machine busy? Try an alternative',
    startRest: 'Start rest',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    rest: 'Rest',
    sets: 'Sets',
    reps: 'Reps',
    todayWeight: "Today's weight",
    repsDone: 'Reps done',
    prevWeight: 'Last weight',
    bestWeight: 'Best weight',
    notes: 'Notes',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    painLabel: 'Pain or discomfort (optional)',
    painPlaceholder: 'Describe any discomfort you noticed',
    safety: 'If you feel unusual pain, stop and consult a professional.',
    finish: 'Finish workout',
    confirmUnfinished: 'Some exercises are not done yet. Finish the workout anyway?',
    finishTitle: 'Finish workout?',
    finishBodyUnfinished: 'Some exercises aren’t done — we’ll save what you logged and show the summary.',
    finishBodyDone: 'We’ll save your workout and show the summary.',
    confirmFinish: 'Yes, finish & save',
    keepGoing: 'Keep going',
    errWeight: 'Weight must be between 0 and 500 kg',
    errReps: 'Reps must be between 0 and 100',
    progress: 'Progress',
    savedTitle: 'Workout saved',
    savedBody: 'Your weights and workout log were updated.',
    recentTitle: 'Recent workout',
    completedToday: "Today's workout completed",
    emptyPlan: 'Choose your plan in Setup to get started.',
    workoutsTitle: 'My workouts',
    workoutsDesc: 'Your current plan with all days and exercises — each with a guide.',
    heroReady: "Today's workout is ready",
    startToday: "Start today's workout",
    targetMuscles: 'Target muscles',
    estDuration: 'Est. duration',
    exercisesCount: 'exercises',
    minShort: 'min',
    lastWorkout: 'Last workout',
    noLastWorkout: 'Your first workout — let’s go!',
    streak: 'Streak',
    streakDays: 'day streak',
    weekDone: 'This week',
    of: 'of',
    target: 'Target',
    prevPerf: 'Last time',
    bestPerf: 'Best',
    noHistory: 'No previous record',
    repeatLast: 'Repeat last',
    nextExercise: 'Next exercise',
    prevExercise: 'Previous',
    setSaved: 'Set saved',
    weightKg: 'Weight (kg)',
    moreDetails: 'More details',
    rpe: 'Effort (RPE)',
    restAdd30: '+30s',
    skipRest: 'Skip rest',
    stopRest: 'Stop',
    nextUp: 'Next up',
    restDone: 'Rest done — ready for the next set',
    quickGuide: 'Quick guide',
    videoLabel: 'Video',
    techniquePoints: 'Technique tips',
    commonMistakes: 'Common mistakes',
    swapForToday: 'Swap for today',
    saveToPlan: 'Save to my plan',
    swapped: 'Swapped for today',
    equipment: 'Equipment',
    summaryTitle: 'Workout saved 🎉',
    summarySub: 'Great work — keep the rhythm going.',
    duration: 'Duration',
    exercisesDone: 'Exercises',
    setsDone: 'Sets',
    totalVolume: 'Total volume',
    volumeUnit: 'kg',
    prsLabel: 'Personal records',
    noPrs: 'No PR this time — every set still counts.',
    musclesTrained: 'Muscles trained',
    nextWorkout: 'Next workout',
    backToToday: 'Back to Today',
    viewProgress: 'View progress',
    newPr: 'New PR',
  },
  nutrition: {
    title: 'Meal plan',
    desc: 'Your meals and nutrition targets — based on your smart calculations and editable.',
    enable: 'Track my food',
    useSmart: 'Use my smart calculations',
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    water: 'Water',
    total: 'Planned',
    target: 'Target',
    diff: 'Diff',
    addTemplate: 'Add a ready meal',
    addMeal: 'Add a custom meal',
    addIngredient: 'Add ingredient',
    servings: 'Servings',
    recalc: 'Recalculate from ingredients',
    estimateNote: 'Nutrition values are estimates and may vary by product and preparation.',
    empty: 'Enable the meal plan in Setup to track your meals.',
    mealsDone: 'meals done',
    addWater250: '+250 ml',
    addWater500: '+500 ml',
    resetWater: 'Reset water',
    search: 'Search…',
    allTypes: 'All types',
  },
  wellness: {
    title: 'Supplements & Medications',
    desc: 'Organize and track your supplements and medications — for tracking only, not medical advice.',
    enable: 'Track supplements & medications',
    supplementsTab: 'Supplements',
    medicationsTab: 'Medications',
    addSupplement: 'Add a supplement from the library',
    addMedication: 'Add a medication from the library',
    addCustomSupplement: 'Add a custom supplement',
    addCustomMedication: 'Add a custom medication',
    amount: 'Amount',
    dose: 'Dose',
    doseHint: 'Enter the dose as prescribed by your doctor',
    timing: 'Timing',
    frequency: 'Frequency',
    food: 'With food',
    before: 'Before',
    after: 'After',
    withFood: 'With',
    anyFood: 'Any',
    notes: 'Notes',
    doctorNote: "Doctor's note",
    caution: 'Caution',
    purpose: 'Tracking purpose',
    medSafety:
      'Qimmah helps you organize and track medications only. Do not start, stop, or change any medication dose without consulting a doctor or pharmacist.',
    empty: 'Enable supplements & medications in Setup to track them.',
    search: 'Search…',
    allCategories: 'All categories',
  },
  commit: {
    title: 'My commitments',
    desc: 'The things you want to commit to daily or weekly.',
    enable: 'Track daily commitments',
    intro: 'Choose what you want to commit to daily or weekly. You can edit later.',
    add: 'Add from library',
    addCustom: 'Add a custom commitment',
    name: 'Name',
    category: 'Category',
    frequency: 'Frequency',
    daily: 'Daily',
    weekly: 'Weekly',
    custom: 'Custom',
    notes: 'Notes',
    progress: "Today's progress",
    empty: 'Enable commitments in Setup to track them.',
    search: 'Search…',
    allCategories: 'All categories',
  },
  progress: {
    title: 'Measurements & progress',
    desc: 'Log your measurements and track progress over time.',
    enable: 'Track measurements & progress',
    selectTypes: 'Choose the measurements you want to track',
    advanced: 'Advanced health measurements',
    advancedNote: 'Advanced health measurements are for recording only, not diagnosis.',
    quickLog: 'Quick log',
    save: 'Save measurement',
    latest: 'Latest',
    history: 'History',
    trend: 'Trend',
    up: 'Up',
    down: 'Down',
    same: 'No change',
    noLogs: 'No measurements yet.',
    empty: 'Enable measurements in Setup to track your progress.',
    notes: 'Notes',
    delete: 'Delete',
  },
}

export function getStrings(lang: Lang): ShellStrings {
  return lang === 'en' ? en : ar
}
