// نصوص قشرة التطبيق (الشاشات والتنقّل) بالعربية والإنجليزية.
// محتوى الأقسام التفصيلي يبقى عربيًا في هذه المرحلة.

import type { Lang } from '@/lib/appPreferences'

export interface ShellStrings {
  brand: string
  tagline: string
  nav: { home: string; setup: string; demo: string; settings: string }
  lang: { ar: string; en: string; label: string }
  start: {
    welcome: string
    intro: string
    positioning: string
    login: string
    guest: string
    startSetup: string
    continueSetup: string
    seeDemo: string
    importPrevious: string
    chooseLang: string
    note: string
  }
  account: {
    badgeDemo: string
    badgeGuest: string
    badgeCloud: string
    account: string
    loginTitle: string
    loginSubtitle: string
    email: string
    password: string
    login: string
    createAccount: string
    logout: string
    guest: string
    guestLimit: string
    cloudDisabled: string
    cloudOn: string
    signedInAs: string
    confirmEmail: string
    back: string
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
    customWater: string
    customWaterAdd: string
    customWaterPlaceholder: string
    search: string
    allTypes: string
    logMeal: string
    quickAdd: string
    eaten: string
    remaining: string
    remainingCalories: string
    remainingProtein: string
    addToLog: string
    customQuickAdd: string
    note: string
    optional: string
    searchFood: string
    servingsCount: string
    todayLog: string
    emptyLog: string
    removeEntry: string
    swapMeal: string
    swapMealTitle: string
    noAlternatives: string
    close: string
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
    suppSafety: string
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
  nav: { home: 'الصفحة الرئيسية', setup: 'الإعداد', demo: 'النموذج', settings: 'الإعدادات' },
  lang: { ar: 'العربية', en: 'English', label: 'اللغة' },
  start: {
    welcome: 'قِمّة — نظام كمال الأجسام',
    intro: 'تمارينك، أوزانك، تغذيتك، وقياساتك — في نظام واحد مبني للاعب كمال الأجسام.',
    positioning: 'صمّم تقسيمتك، تتبّع كل تمرين ووزن، واحسب سعراتك وبروتينك. نظام شخصي يكبر معك.',
    login: 'تسجيل الدخول',
    guest: 'المتابعة كضيف',
    startSetup: 'ابدأ إعداد صفحتي',
    continueSetup: 'أكمل إعداد صفحتي',
    seeDemo: 'شاهد نموذجًا',
    importPrevious: 'استورد نسخة سابقة',
    chooseLang: 'اختر اللغة',
    note: 'كل شيء محفوظ على جهازك. تقدر تعدل كل شيء لاحقًا.',
  },
  account: {
    badgeDemo: 'نموذج تجريبي',
    badgeGuest: 'ضيف',
    badgeCloud: 'حساب سحابي',
    account: 'حسابي',
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'سجّل الدخول لمزامنة خطتك عبر أجهزتك، أو تابع كضيف على هذا الجهاز.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    guest: 'المتابعة كضيف على هذا الجهاز',
    guestLimit: 'بيانات الضيف محفوظة على هذا الجهاز فقط.',
    cloudDisabled: 'تسجيل الدخول السحابي غير مفعّل حاليًا. تقدر تستخدم وضع الضيف على هذا الجهاز.',
    cloudOn: 'المزامنة السحابية مفعّلة في هذه النسخة.',
    signedInAs: 'مسجّل الدخول بـ',
    confirmEmail: 'أرسلنا رابط تأكيد إلى بريدك. فعّل حسابك ثم سجّل الدخول.',
    back: 'رجوع',
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
    customWater: 'أضف كمية',
    customWaterAdd: 'أضف',
    customWaterPlaceholder: 'كمية بالمل (مثال: 350)',
    search: 'ابحث…',
    allTypes: 'كل الأنواع',
    logMeal: '+ سجّل وجبة',
    quickAdd: 'أضف سعرات وبروتين سريعًا',
    eaten: 'مأكول',
    remaining: 'المتبقّي',
    remainingCalories: 'سعرات متبقّية',
    remainingProtein: 'بروتين متبقّي',
    addToLog: 'أضف للسجل',
    customQuickAdd: 'إضافة سريعة مخصّصة',
    note: 'ملاحظة',
    optional: 'اختياري',
    searchFood: 'ابحث عن طعام…',
    servingsCount: 'عدد الحصص',
    todayLog: 'سجل اليوم',
    emptyLog: 'لا يوجد شيء مسجّل اليوم بعد.',
    removeEntry: 'حذف',
    swapMeal: 'بدّل الوجبة',
    swapMealTitle: 'بدائل بسعرات وبروتين متقارب',
    noAlternatives: 'لا توجد بدائل متقاربة حاليًا.',
    close: 'إغلاق',
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
    suppSafety: 'قِمّة يساعدك على تتبّع المكملات فقط، ولا يوصي بجرعات علاجية.',
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
  nav: { home: 'Home', setup: 'Setup', demo: 'Demo', settings: 'Settings' },
  lang: { ar: 'العربية', en: 'English', label: 'Language' },
  start: {
    welcome: 'Qimmah — Bodybuilding OS',
    intro: 'Your workouts, weights, nutrition, and measurements — in one system built for the bodybuilder.',
    positioning: 'Design your split, track every set and weight, and dial in calories and protein. A personal system that grows with you.',
    login: 'Log in',
    guest: 'Continue as guest',
    startSetup: 'Set up my page',
    continueSetup: 'Continue my setup',
    seeDemo: 'See a sample',
    importPrevious: 'Import a previous copy',
    chooseLang: 'Choose language',
    note: 'Everything is saved on your device. You can edit anything later.',
  },
  account: {
    badgeDemo: 'Demo',
    badgeGuest: 'Guest',
    badgeCloud: 'Cloud',
    account: 'My account',
    loginTitle: 'Log in',
    loginSubtitle: 'Log in to sync your plan across devices, or continue as a guest on this device.',
    email: 'Email',
    password: 'Password',
    login: 'Log in',
    createAccount: 'Create account',
    logout: 'Log out',
    guest: 'Continue as guest on this device',
    guestLimit: 'Guest data is stored on this device only.',
    cloudDisabled: 'Cloud login is not enabled. You can use guest mode on this device.',
    cloudOn: 'Cloud sync is enabled in this build.',
    signedInAs: 'Signed in as',
    confirmEmail: 'We sent a confirmation link to your email. Activate your account, then log in.',
    back: 'Back',
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
    customWater: 'Add amount',
    customWaterAdd: 'Add',
    customWaterPlaceholder: 'Amount in ml (e.g. 350)',
    search: 'Search…',
    allTypes: 'All types',
    logMeal: '+ Log meal',
    quickAdd: 'Quickly add calories & protein',
    eaten: 'Eaten',
    remaining: 'Remaining',
    remainingCalories: 'Calories left',
    remainingProtein: 'Protein left',
    addToLog: 'Add to log',
    customQuickAdd: 'Custom quick add',
    note: 'Note',
    optional: 'optional',
    searchFood: 'Search food…',
    servingsCount: 'Servings',
    todayLog: "Today's log",
    emptyLog: 'Nothing logged today yet.',
    removeEntry: 'Remove',
    swapMeal: 'Swap meal',
    swapMealTitle: 'Alternatives with similar calories & protein',
    noAlternatives: 'No close alternatives right now.',
    close: 'Close',
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
    suppSafety: 'Qimmah helps you track supplements only and does not recommend therapeutic doses.',
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
