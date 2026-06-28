// نصوص قشرة التطبيق (الشاشات والتنقّل) بالعربية والإنجليزية.
// محتوى الأقسام التفصيلي يبقى عربيًا في هذه المرحلة.

import type { Lang } from '@/lib/appPreferences'

export interface ShellStrings {
  brand: string
  tagline: string
  nav: { home: string; setup: string; demo: string; settings: string }
  tabs: { home: string; workout: string; nutrition: string; progress: string; profile: string }
  lang: { ar: string; en: string; label: string }
  badge: { guest: string; account: string; demo: string }
  start: {
    welcome: string
    headline: string
    intro: string
    startSetup: string
    buildPlan: string
    continueSetup: string
    seeDemo: string
    importPrevious: string
    chooseLang: string
    note: string
    positioning: string
    login: string
    continueGuest: string
    guestNote: string
  }
  auth: {
    title: string
    subtitle: string
    email: string
    password: string
    login: string
    createAccount: string
    logout: string
    continueGuest: string
    disabledTitle: string
    disabledBody: string
    guestBadge: string
    guestNote: string
    accountNote: string
    cloudNote: string
    back: string
  }
  settings: {
    title: string
    groupAccount: string
    groupData: string
    groupPlan: string
    groupPrivacy: string
    groupLanguage: string
    languageActive: string
    languageSoon: string
    export: string
    import: string
    reset: string
    resetConfirm: string
    editPlan: string
    regenerate: string
    regenerateConfirm: string
    privacyLink: string
    termsLink: string
    healthDisclaimer: string
    importConfirm: string
  }
  legal: {
    privacyTitle: string
    termsTitle: string
    back: string
    privacyBody: string[]
    termsBody: string[]
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
    tabTitle: string
    needCals: string
    foodCals: string
    exerciseCals: string
    equationNote: string
    addShort: string
    copy: string
    favorite: string
    soon: string
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
    foodName: string
    quickAddHint: string
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
    emptySupp: string
    emptyMed: string
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
    tabTitle: string
    cardWeight: string
    noWeight: string
    cardStreak: string
    streakDays: string
    cardVolume: string
    noWorkouts: string
    cardPRs: string
    noPRs: string
    cardMuscles: string
    healthSyncTitle: string
    healthSyncSoon: string
    healthSyncBody: string
    remindersTitle: string
    reminderEnabled: string
    reminderTrainingTime: string
    reminderNote: string
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
  tagline: 'تطبيقك الشخصي لكمال الأجسام والتمرين',
  nav: { home: 'الرئيسية', setup: 'الإعداد', demo: 'النموذج', settings: 'الإعدادات' },
  tabs: { home: 'الرئيسية', workout: 'تمرين', nutrition: 'تغذية', progress: 'تقدّم', profile: 'حسابي' },
  lang: { ar: 'العربية', en: 'English', label: 'اللغة' },
  badge: { guest: 'ضيف', account: 'حساب', demo: 'نموذج تجريبي' },
  start: {
    welcome: 'أهلاً بك في قِمّة',
    headline: 'كل رحلتك في كمال الأجسام في نظام واحد',
    intro: 'تمارينك، أوزانك، التضخيم التدريجي، تغذيتك، وقياساتك — كلها في مكان واحد.',
    startSetup: 'ابدأ إعداد صفحتي',
    buildPlan: 'ابنِ خطتي الآن',
    continueSetup: 'أكمل إعداد صفحتي',
    seeDemo: 'شاهد نموذجًا',
    importPrevious: 'استورد نسخة سابقة',
    chooseLang: 'اختر اللغة',
    note: 'بياناتك محفوظة على جهازك. تقدر تعدّل كل شيء لاحقًا.',
    positioning: 'نظام كمال أجسام للرياضي الفرد: تابع أوزانك وتكراراتك وتضخّمك التدريجي يومًا بيوم.',
    login: 'تسجيل الدخول',
    continueGuest: 'المتابعة كضيف',
    guestNote: 'بيانات الضيف محفوظة على هذا الجهاز فقط.',
  },
  auth: {
    title: 'تسجيل الدخول',
    subtitle: 'سجّل الدخول لحفظ بياناتك على حسابك السحابي والوصول إليها من أي جهاز.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    continueGuest: 'المتابعة كضيف',
    disabledTitle: 'تسجيل الدخول السحابي غير مفعّل حاليًا',
    disabledBody: 'تقدر تستخدم وضع الضيف على هذا الجهاز.',
    guestBadge: 'ضيف',
    guestNote: 'بيانات الضيف محفوظة على هذا الجهاز فقط.',
    accountNote: 'أنت مسجّل الدخول. بياناتك تُزامَن مع حسابك السحابي.',
    cloudNote: 'بياناتك محفوظة على هذا الجهاز وعلى حسابك السحابي.',
    back: 'رجوع',
  },
  settings: {
    title: 'الإعدادات',
    groupAccount: 'الحساب',
    groupData: 'البيانات',
    groupPlan: 'خطتي',
    groupPrivacy: 'الخصوصية والثقة',
    groupLanguage: 'اللغة',
    languageActive: 'العربية — مفعّلة',
    languageSoon: 'الإنجليزية قريبًا (English coming soon)',
    export: 'تصدير نسخة احتياطية',
    import: 'استيراد نسخة',
    reset: 'إعادة ضبط البيانات',
    resetConfirm:
      'سيتم حذف كل بيانات قِمّة من هذا المتصفح نهائيًا (الإعداد، الخطة، المتابعات، السجلّات). لا يمكن التراجع. هل أنت متأكد؟',
    editPlan: 'تعديل خطتي',
    regenerate: 'إعادة توليد الخطة',
    regenerateConfirm:
      'سيُعاد توليد خطة التمرين والتغذية من بياناتك الحالية، وستُستبدل خطتك الحالية. هل تريد المتابعة؟',
    privacyLink: 'سياسة الخصوصية',
    termsLink: 'شروط الاستخدام',
    healthDisclaimer:
      'قِمّة أداة تنظيم ومتابعة شخصية، وليست بديلًا عن الاستشارة الطبية. لا تبدأ أو توقف أي دواء أو نظام بدون مختص.',
    importConfirm: 'سيستبدل الاستيراد خطّتك وسجلّك الحالي بمحتوى الملف. هل تريد المتابعة؟',
  },
  legal: {
    privacyTitle: 'سياسة الخصوصية',
    termsTitle: 'شروط الاستخدام',
    back: 'رجوع',
    privacyBody: [
      'قِمّة تطبيق شخصي يعمل على جهازك أولًا (local-first). في وضع الضيف تُحفظ كل بياناتك في متصفّح هذا الجهاز فقط ولا تغادره.',
      'عند تسجيل الدخول بحساب سحابي (Supabase) تُرفع بياناتك إلى حسابك الخاص لتتمكّن من الوصول إليها من أجهزة أخرى. لا يصل إلى صفوفك إلا أنت (Row Level Security).',
      'لا نبيع بياناتك ولا نشاركها مع معلنين. قياساتك وسجلّاتك الصحية تبقى ملكك ويمكنك حذفها في أي وقت عبر «إعادة ضبط البيانات».',
      'يمكنك تصدير نسخة كاملة من بياناتك في أي وقت من «الإعدادات → البيانات».',
    ],
    termsBody: [
      'قِمّة أداة لتنظيم ومتابعة التمرين والتغذية والمكملات والقياسات للرياضي الفرد. الاستخدام على مسؤوليتك الشخصية.',
      'المحتوى داخل التطبيق (حسابات السعرات، اقتراحات الأوزان، الجرعات) تقديري وتعليمي فقط، وليس نصيحة طبية أو غذائية أو دوائية.',
      'استشر طبيبًا أو مختصًا مؤهّلًا قبل تغيير نظامك الغذائي أو الدوائي أو برنامج تمرينك، خصوصًا عند وجود حالة صحية.',
      'أنت مسؤول عن صحة البيانات التي تُدخلها وعن الاحتفاظ بنسخة احتياطية عبر خاصية التصدير.',
    ],
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
    tabTitle: 'التغذية',
    needCals: 'احتياجك',
    foodCals: 'الطعام',
    exerciseCals: 'التمرين',
    equationNote: 'احتياجك − الطعام + التمرين = المتبقّي',
    addShort: 'أضف',
    copy: 'نسخ',
    favorite: 'مفضّلة',
    soon: 'قريبًا',
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
    foodName: 'اسم الطعام/الوجبة',
    quickAddHint: 'أدخل سعرات أو بروتين على الأقل للإضافة.',
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
    emptySupp: 'أضف مكمّلاتك إذا كنت تستخدمها.',
    emptyMed: 'أضف ما تريد متابعته فقط.',
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
    tabTitle: 'التقدّم',
    cardWeight: 'الوزن',
    noWeight: 'سجّل وزنك من قسم القياسات ليظهر هنا.',
    cardStreak: 'سلسلة التمرين',
    streakDays: 'يوم متتالٍ',
    cardVolume: 'حجم التمرين',
    noWorkouts: 'لا توجد تمارين مسجّلة بعد. ابدأ تمرينك ليظهر تقدّمك هنا.',
    cardPRs: 'أفضل الأوزان (PRs)',
    noPRs: 'أكمل تمرينًا بأوزان لتظهر أرقامك القياسية.',
    cardMuscles: 'العضلات هذا الأسبوع',
    healthSyncTitle: 'مزامنة الصحة',
    healthSyncSoon: 'قريبًا: Apple Health و Google Fit',
    healthSyncBody: 'حاليًا تقدر تتابع تمرينك وتغذيتك داخل قِمّة.',
    remindersTitle: 'التذكيرات',
    reminderEnabled: 'تفعيل التذكير',
    reminderTrainingTime: 'وقت تذكير التمرين',
    reminderNote: 'التذكيرات داخل المتصفح محدودة. دعم التنبيهات الكامل لاحقًا في تطبيق الجوال.',
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
  tagline: 'Your personal bodybuilding & training app',
  nav: { home: 'Home', setup: 'Setup', demo: 'Demo', settings: 'Settings' },
  tabs: { home: 'Home', workout: 'Workout', nutrition: 'Nutrition', progress: 'Progress', profile: 'Profile' },
  lang: { ar: 'العربية', en: 'English', label: 'Language' },
  badge: { guest: 'Guest', account: 'Account', demo: 'Demo' },
  start: {
    welcome: 'Welcome to Qimmah',
    headline: 'Your entire bodybuilding journey in one system',
    intro: 'Your workouts, weights, progressive overload, nutrition, and measurements — all in one place.',
    startSetup: 'Set up my page',
    buildPlan: 'Build my plan now',
    continueSetup: 'Continue my setup',
    seeDemo: 'See a sample',
    importPrevious: 'Import a previous copy',
    chooseLang: 'Choose language',
    note: 'Your data is saved on your device. You can edit anything later.',
    positioning: 'A bodybuilding OS for the individual athlete: track your weights, reps, and progressive overload day by day.',
    login: 'Log in',
    continueGuest: 'Continue as guest',
    guestNote: 'Guest data is stored on this device only.',
  },
  auth: {
    title: 'Log in',
    subtitle: 'Log in to back up your data to the cloud and access it from any device.',
    email: 'Email',
    password: 'Password',
    login: 'Log in',
    createAccount: 'Create account',
    logout: 'Log out',
    continueGuest: 'Continue as guest',
    disabledTitle: 'Cloud login is not enabled right now',
    disabledBody: 'You can use guest mode on this device.',
    guestBadge: 'Guest',
    guestNote: 'Guest data is stored on this device only.',
    accountNote: 'You are logged in. Your data syncs to your cloud account.',
    cloudNote: 'Your data is stored on this device and on your cloud account.',
    back: 'Back',
  },
  settings: {
    title: 'Settings',
    groupAccount: 'Account',
    groupData: 'Data',
    groupPlan: 'My Plan',
    groupPrivacy: 'Privacy & Trust',
    groupLanguage: 'Language',
    languageActive: 'Arabic — active',
    languageSoon: 'English coming soon',
    export: 'Export backup',
    import: 'Import backup',
    reset: 'Reset data',
    resetConfirm:
      'This will permanently delete all Qimmah data from this browser (setup, plan, tracking, logs). This cannot be undone. Are you sure?',
    editPlan: 'Edit my plan',
    regenerate: 'Regenerate plan',
    regenerateConfirm:
      'Your workout and nutrition plan will be regenerated from your current data, replacing the current plan. Continue?',
    privacyLink: 'Privacy policy',
    termsLink: 'Terms of use',
    healthDisclaimer:
      'Qimmah is a personal organization and tracking tool, not a substitute for medical advice. Do not start or stop any medication or program without a professional.',
    importConfirm: 'Importing will replace your current plan and logs with the file contents. Continue?',
  },
  legal: {
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms of Use',
    back: 'Back',
    privacyBody: [
      'Qimmah is a local-first personal app. In guest mode, all your data stays in this device’s browser and never leaves it.',
      'When you log in with a cloud account (Supabase), your data is uploaded to your own account so you can access it from other devices. Only you can read your rows (Row Level Security).',
      'We do not sell or share your data with advertisers. Progress photos and health measurements remain yours and can be deleted anytime via “Reset data”.',
      'You can export a full copy of your data anytime from Settings → Data.',
    ],
    termsBody: [
      'Qimmah is a tool to organize and track training, nutrition, supplements, and measurements for the individual athlete. Use is at your own responsibility.',
      'In-app content (calorie calculations, weight suggestions, doses) is estimated and educational only, not medical, nutritional, or pharmaceutical advice.',
      'Consult a qualified professional before changing your diet, medication, or training program, especially with a health condition.',
      'You are responsible for the accuracy of the data you enter and for keeping a backup via the export feature.',
    ],
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
    tabTitle: 'Nutrition',
    needCals: 'Needs',
    foodCals: 'Food',
    exerciseCals: 'Exercise',
    equationNote: 'Needs − Food + Exercise = Remaining',
    addShort: 'Add',
    copy: 'Copy',
    favorite: 'Favorite',
    soon: 'Soon',
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
    foodName: 'Food/meal name',
    quickAddHint: 'Enter at least calories or protein to add.',
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
    emptySupp: 'Add your supplements if you use any.',
    emptyMed: 'Add only what you want to track.',
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
    tabTitle: 'Progress',
    cardWeight: 'Weight',
    noWeight: 'Log your weight in Measurements to see it here.',
    cardStreak: 'Workout streak',
    streakDays: 'days in a row',
    cardVolume: 'Training volume',
    noWorkouts: 'No workouts logged yet. Start a workout to see progress here.',
    cardPRs: 'Best lifts (PRs)',
    noPRs: 'Complete a weighted workout to see your PRs.',
    cardMuscles: 'Muscles this week',
    healthSyncTitle: 'Health sync',
    healthSyncSoon: 'Soon: Apple Health & Google Fit',
    healthSyncBody: 'For now, track your workouts and nutrition inside Qimmah.',
    remindersTitle: 'Reminders',
    reminderEnabled: 'Enable reminder',
    reminderTrainingTime: 'Training reminder time',
    reminderNote: 'In-browser reminders are limited. Full notifications later in the mobile app.',
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
