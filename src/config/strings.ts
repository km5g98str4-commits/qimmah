// نصوص قشرة التطبيق (الشاشات والتنقّل) بالعربية والإنجليزية.
// محتوى الأقسام التفصيلي يبقى عربيًا في هذه المرحلة.

import type { Lang } from '@/lib/appPreferences'

export interface ShellStrings {
  brand: string
  tagline: string
  nav: { home: string; setup: string; settings: string }
  tabs: { home: string; today: string; workout: string; nutrition: string; progress: string; profile: string }
  lang: { ar: string; en: string; label: string }
  badge: { guest: string; account: string }
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
    trust: string
    login: string
    continueGuest: string
    guestNote: string
  }
  auth: {
    title: string
    subtitle: string
    signupTitle: string
    signupSubtitle: string
    name: string
    email: string
    password: string
    login: string
    createAccount: string
    logout: string
    // استعادة كلمة المرور (Sprint UI 1)
    forgotLink: string
    forgotTitle: string
    forgotSubtitle: string
    sendReset: string
    forgotSent: string
    forgotFailed: string
    // تعيين كلمة مرور جديدة (Sprint A) — شاشة استكمال الاستعادة بعد فتح رابط البريد
    resetTitle: string
    resetSubtitle: string
    resetNewPassword: string
    resetConfirmPassword: string
    resetSave: string
    resetSuccess: string
    resetSuccessHint: string
    resetMismatch: string
    resetWeak: string
    resetExpiredTitle: string
    resetExpired: string
    resetChecking: string
    continueGuest: string
    noAccount: string
    haveAccount: string
    switchToSignup: string
    switchToLogin: string
    savePrompt: string
    disabledTitle: string
    disabledBody: string
    guestBadge: string
    guestNote: string
    accountNote: string
    cloudNote: string
    back: string
    deleteAccount: string
    deleteAccountDesc: string
    deleteConfirmTitle: string
    deleteConfirmBody: string
    deleteConfirmHint: string
    deleteConfirmWord: string
    deleteConfirmCta: string
    deleting: string
    // فشل حذف مستخدم المصادقة على الخادم — رسالة صادقة بلا ادّعاء نجاح (Sprint B)
    deleteFailed: string
    deleteRetry: string
    deleteContactCta: string
    cancel: string
  }
  settings: {
    title: string
    groupAccount: string
    groupData: string
    groupPlan: string
    groupPrivacy: string
    groupLanguage: string
    languageActive: string
    languageHint: string
    export: string
    import: string
    reset: string
    resetConfirm: string
    editPlan: string
    regenerate: string
    regenerateConfirm: string
    switchMachines: string
    switchMachinesConfirm: string
    switchMachinesSuccess: string
    privacyLink: string
    termsLink: string
    healthDisclaimer: string
    importConfirm: string
    importSuccess: string
    importError: string
    // — نقل البيانات المحصّن (معاينة → تأكيد → تطبيق ذرّي → تراجع) —
    dataLocalNote: string
    exportShared: string
    exportDownloaded: string
    exportFailed: string
    importPreviewTitle: string
    importPreviewNote: string
    importConfirmBtn: string
    importCancel: string
    importBackedUp: string
    importExtra: string
    importDoneTitle: string
    importDoneNote: string
    importViewData: string
    importUndo: string
    importUndoLast: string
    importUndoDesc: string
    importRecoveryBlocked: string
    importInvalidFile: string
    regenerateSuccess: string
    groupDev: string
    devReviewProducts: string
    devReviewHint: string
    groupAbout: string
    versionLabel: string
    calcLink: string
    // تحليلات مجهولة اختيارية (opt-out)
    analyticsTitle: string
    analyticsDesc: string
    analyticsToggle: string
  }
  pwa: {
    group: string
    installTitle: string
    installBody: string
    installBtn: string
    installIosTitle: string
    installIosBody: string
    installedTitle: string
    installedBody: string
    notifTitle: string
    notifBody: string
    notifEnable: string
    notifGranted: string
    notifDenied: string
    notifUnsupported: string
    notifConfirm: string
    bannerText: string
    bannerInstall: string
    bannerDismiss: string
  }
  legal: {
    privacyTitle: string
    termsTitle: string
    back: string
    privacyBody: string[]
    termsBody: string[]
  }
  notFound: {
    code: string
    title: string
    body: string
    home: string
    back: string
  }
  errorBoundary: {
    title: string
    body: string
    reload: string
    // بطاقة خطأ الشاشات (حدّ أخطاء المسارات) — إعادة محاولة بلا تحديث كامل للصفحة.
    routeTitle: string
    routeBody: string
    retry: string
  }
  contact: {
    title: string
    intro: string
    emailLabel: string
    emailValue: string
    emailCta: string
    reportCta: string
    reportSubject: string
    back: string
  }
  workout: {
    start: string
    watch: string
    trustedGuide: string
    alternatives: string
    altPrompt: string
    startRest: string
    pause: string
    resume: string
    resumeTitle: string
    resumeBody: string
    resumeDiscard: string
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
    // — دعوة تفعيل تذكير التمرين بعد الجلسة (iOS الأصلي فقط) —
    reminderCtaText: string
    reminderCtaButton: string
    reminderCtaEnabled: string
    reminderCtaDenied: string
    // — سلسلة الالتزام الأسبوعي —
    weeklyStreakTitle: string
    weeklyDonePrefix: string
    weeklyWorkoutsWord: string
    weeksUnit: string
    weeklyStreakEmpty: string
  }
  nutrition: {
    tabTitle: string
    needCals: string
    foodCals: string
    exerciseCals: string
    equationNote: string
    addShort: string
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
    remainingWater: string
    addToLog: string
    customQuickAdd: string
    foodName: string
    quickAddHint: string
    note: string
    optional: string
    searchFood: string
    servingsCount: string
    gramsAmount: string
    gramsUnit: string
    perServingNote: string
    todayLog: string
    emptyLog: string
    removeEntry: string
    swapMeal: string
    swapMealTitle: string
    noAlternatives: string
    close: string
    per100g: string
    perPortion: string
    emptyStateTitle: string
    emptyStateHint: string
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
    remindersTitle: string
    reminderEnabled: string
    reminderTrainingTime: string
    reminderNote: string
    // نص إشعار التمرين + تلميحات الإذن/الويب
    reminderNotifTitle: string
    reminderNotifBody: string
    reminderDeniedHint: string
    reminderWebHint: string
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
  tagline: 'مرشدك الهادئ نحو صحة أفضل',
  nav: { home: 'الرئيسية', setup: 'الإعداد', settings: 'الإعدادات' },
  tabs: { home: 'الرئيسية', today: 'اليوم', workout: 'تمرين', nutrition: 'تغذية', progress: 'تقدّم', profile: 'حسابي' },
  lang: { ar: 'العربية', en: 'English', label: 'اللغة' },
  badge: { guest: 'ضيف', account: 'حساب' },
  start: {
    welcome: 'هلا فيك في قِمّة',
    headline: 'كل قمة تبدأ بخطوة.',
    intro: 'تمارينك، أكلك، وتقدّمك — كلها في مكان واحد، بوضوح وهدوء.',
    startSetup: 'ابدأ إعداد صفحتي',
    buildPlan: 'جهّز خطتي الحين',
    continueSetup: 'كمّل إعداد صفحتي',
    seeDemo: 'شوف نموذج',
    importPrevious: 'استورد نسخة سابقة',
    chooseLang: 'اختر اللغة',
    note: 'بياناتك محفوظة على جهازك، وتقدر تعدّل كل شي بعدين.',
    positioning: 'مرشدك الهادئ نحو صحة أفضل.',
    trust: 'بلا إعلانات، وبلا مبالغات.',
    login: 'تسجيل الدخول',
    continueGuest: 'كمّل كضيف',
    guestNote: 'بيانات الضيف تنحفظ على هذا الجهاز بس.',
  },
  auth: {
    title: 'تسجيل الدخول',
    subtitle: 'سجّل دخولك عشان بياناتك تنحفظ في حسابك السحابي وتوصل لها من أي جهاز.',
    signupTitle: 'حساب جديد',
    signupSubtitle: 'افتح حسابك مرة وحدة، وتقدّمك ينحفظ وتوصل له من أي جهاز.',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    createAccount: 'افتح حساب جديد',
    logout: 'تسجيل الخروج',
    forgotLink: 'نسيت كلمة المرور؟',
    forgotTitle: 'استعادة كلمة المرور',
    forgotSubtitle: 'اكتب بريدك، وبنرسل لك رابط تغيير كلمة المرور.',
    sendReset: 'أرسل رابط الاستعادة',
    forgotSent: 'إذا بريدك مسجّل عندنا، بيوصلك رابط الاستعادة — شيّك على بريدك.',
    forgotFailed: 'ما قدرنا نرسل الرابط الحين. جرّب بعد شوي.',
    resetTitle: 'تعيين كلمة مرور جديدة',
    resetSubtitle: 'اختر كلمة مرور جديدة لحسابك في قِمّة.',
    resetNewPassword: 'كلمة المرور الجديدة',
    resetConfirmPassword: 'تأكيد كلمة المرور',
    resetSave: 'حفظ كلمة المرور',
    resetSuccess: 'تم — كلمة مرورك الجديدة انحفظت.',
    resetSuccessHint: 'تقدر الحين تسجّل دخولك بكلمة المرور الجديدة.',
    resetMismatch: 'كلمتا المرور مو متطابقتين — تأكّد منهم مرة ثانية.',
    resetWeak: 'كلمة المرور ضعيفة — ٨ أحرف على الأقل مع حرف ورقم.',
    resetExpiredTitle: 'الرابط خلصت صلاحيته',
    resetExpired: 'الرابط انتهت صلاحيته أو ما عاد يشتغل. اطلب رابط جديد وبيوصلك على بريدك.',
    resetChecking: 'نتأكّد من الرابط…',
    continueGuest: 'كمّل كضيف',
    noAccount: 'ما عندك حساب؟',
    haveAccount: 'عندك حساب؟',
    switchToSignup: 'افتح حساب',
    switchToLogin: 'سجّل الدخول',
    savePrompt: 'سجّل عشان تقدّمك ينحفظ',
    disabledTitle: 'تسجيل الدخول السحابي مو مفعّل حاليًا',
    disabledBody: 'المزامنة السحابية مو مفعّلة في هذي النسخة. كلّم مزوّد الخدمة عشان يفعّل لك الحساب.',
    guestBadge: 'ضيف',
    guestNote: 'بيانات الضيف تنحفظ على هذا الجهاز بس.',
    accountNote: 'أنت مسجّل دخولك، وبياناتك تتزامن مع حسابك السحابي.',
    cloudNote: 'بياناتك محفوظة على هذا الجهاز وعلى حسابك السحابي.',
    back: 'رجوع',
    deleteAccount: 'حذف الحساب',
    deleteAccountDesc: 'يحذف حسابك وكل بياناتك نهائيًا — وما تقدر ترجّعها.',
    deleteConfirmTitle: 'تحذف الحساب نهائيًا؟',
    deleteConfirmBody:
      'بينحذف حسابك وكل بياناتك (خطتك، سجلّاتك، قياساتك) نهائيًا من هذا الجهاز ومن حسابك السحابي، وما تقدر ترجّعها.',
    deleteConfirmHint: 'اكتب «حذف» للتأكيد',
    deleteConfirmWord: 'حذف',
    deleteConfirmCta: 'احذف حسابي نهائيًا',
    deleting: 'جاري الحذف…',
    deleteFailed: 'ما قدرنا نحذف الحساب كامل — العملية ما اكتملت. جرّب مرة ثانية أو',
    deleteRetry: 'جرّب مرة ثانية',
    deleteContactCta: 'تواصل معنا',
    cancel: 'إلغاء',
  },
  settings: {
    title: 'الإعدادات',
    groupAccount: 'الحساب',
    groupData: 'البيانات',
    groupPlan: 'خطتي',
    groupPrivacy: 'الخصوصية والثقة',
    groupLanguage: 'اللغة',
    languageActive: 'العربية — مفعّلة',
    languageHint: 'النص واتجاه الصفحة يتغيّرون على طول، واختيارك ينحفظ على هذا الجهاز.',
    export: 'تصدير نسخة احتياطية',
    import: 'استيراد نسخة',
    reset: 'إعادة ضبط البيانات',
    resetConfirm:
      'بتنحذف كل بيانات قِمّة من هذا المتصفح نهائيًا (الإعداد، الخطة، المتابعات، السجلّات) وما تقدر ترجّعها. متأكد؟',
    editPlan: 'تعديل خطتي',
    regenerate: 'إعادة توليد الخطة',
    regenerateConfirm:
      'بنسوّي لك خطة تمرين وتغذية جديدة من بياناتك الحالية، وبتحل مكان خطتك الحالية. تبي تكمّل؟',
    switchMachines: 'التحويل لنسخة الأجهزة',
    switchMachinesConfirm:
      'بنعيد توليد خطتك التلقائية بتمارين أجهزة الكتالوج بس، وبتحل مكان الخطة التلقائية الحالية. جدولك المخصّص وسجل تمارينك ما بيتغيّرون. تبي تكمّل؟',
    switchMachinesSuccess: 'تم — خطتك التلقائية صارت بنسخة الأجهزة.',
    privacyLink: 'سياسة الخصوصية',
    termsLink: 'شروط الاستخدام',
    healthDisclaimer:
      'قِمّة أداة تنظيم ومتابعة شخصية، ومو بديل عن استشارة الطبيب. لا تبدأ ولا توقف أي دواء أو نظام بدون مختص.',
    importConfirm: 'الاستيراد بيستبدل خطتك وسجلك الحالي بمحتوى الملف. تبي تكمّل؟',
    importSuccess: 'تم استيراد نسختك بنجاح.',
    importError: 'ما قدرنا نقرأ الملف. تأكّد إنه نسخة قِمّة صحيحة.',
    dataLocalNote:
      'ملف التصدير ينسوي على جهازك بصيغة JSON، وتقدر تحفظه أو تشاركه مثل ما تبي. هذا ما يغيّر إعداد المزامنة في حسابك.',
    exportShared: 'تمت مشاركة نسخة بياناتك.',
    exportDownloaded: 'تم تنزيل نسخة بياناتك على جهازك.',
    exportFailed: 'ما قدرنا نسوّي نسخة التصدير.',
    importPreviewTitle: 'معاينة الاستيراد',
    importPreviewNote: 'هذي البيانات بتحل مكان اللي على جهازك الحين، وتقدر تتراجع بعد الاستيراد.',
    importConfirmBtn: 'تأكيد الاستيراد',
    importCancel: 'إلغاء',
    importBackedUp: 'أخذنا نسخة احتياطية',
    importExtra: 'عناصر إضافية',
    importDoneTitle: 'تمّ الاستيراد',
    importDoneNote: 'رجّعنا بياناتك على هذا الجهاز.',
    importViewData: 'عرض بياناتي',
    importUndo: 'تراجع',
    importUndoLast: 'تراجع عن آخر استيراد',
    importUndoDesc: 'يرجّع بياناتك مثل ما كانت قبل آخر استيراد.',
    importRecoveryBlocked: 'ما تقدر تستورد وأنت في وضع استعادة كلمة المرور.',
    importInvalidFile: 'الملف مو صالح.',
    regenerateSuccess: 'تم — سوّينا لك خطة جديدة من بياناتك الحالية.',
    groupDev: 'أدوات داخلية',
    devReviewProducts: 'مراجعة المنتجات',
    devReviewHint: 'مراجعة منتجات ممسوحة/مُضافة بانتظار الاعتماد قبل ظهورها للمستخدمين.',
    groupAbout: 'عن التطبيق',
    versionLabel: 'إصدار التطبيق',
    calcLink: 'كيف نحسب أرقامك؟',
    analyticsTitle: 'تحليلات مجهولة',
    analyticsDesc:
      'إحصاءات استخدام مجهولة تمامًا (بلا اسم أو بريد أو أي بيانات شخصية) تساعدنا على تحسين قِمّة. لا نبيع بياناتك ولا نتتبّعك خارج التطبيق. تقدر توقفها في أي وقت.',
    analyticsToggle: 'المشاركة في التحليلات المجهولة',
  },
  pwa: {
    group: 'التطبيق والتنبيهات',
    installTitle: 'ثبّت قِمّة على جهازك',
    installBody: 'أضف قِمّة كتطبيق — يفتح بلمسة وحدة ويشتغل حتى بدون نت.',
    installBtn: 'تثبيت التطبيق',
    installIosTitle: 'أضف قِمّة للشاشة الرئيسية',
    installIosBody:
      'في متصفح آيفون: اضغط زر المشاركة ثم «أضف إلى الشاشة الرئيسية». التنبيهات محدودة في متصفح الآيفون — عشان التجربة الكاملة أضف قِمّة للشاشة الرئيسية.',
    installedTitle: 'قِمّة مثبّتة ✓',
    installedBody: 'تستخدم قِمّة كتطبيق مثبّت — استمتع بالتجربة الكاملة.',
    notifTitle: 'تنبيهات التذكير',
    notifBody:
      'فعّل التنبيهات عشان توصلك تذكيرات لطيفة بتمرينك ووجباتك. التذكيرات محلية داخل هذا المتصفح، وممكن ما توصل في الخلفية على بعض الأجهزة — بلا وعود مضمونة.',
    notifEnable: 'تفعيل التنبيهات',
    notifGranted: 'التنبيهات مفعّلة ✓',
    notifDenied: 'التنبيهات موقوفة من إعدادات المتصفح. فعّلها بنفسك من إعدادات الموقع.',
    notifUnsupported: 'متصفحك ما يدعم التنبيهات هنا. أضف قِمّة للشاشة الرئيسية وبتكون التجربة أفضل.',
    notifConfirm: 'تمام! بنذكّرك بمواعيد تمرينك ووجباتك.',
    bannerText: 'أضف قِمّة لشاشتك الرئيسية — أسرع وتشتغل بدون نت.',
    bannerInstall: 'تثبيت',
    bannerDismiss: 'لاحقًا',
  },
  legal: {
    privacyTitle: 'سياسة الخصوصية',
    termsTitle: 'شروط الاستخدام',
    back: 'رجوع',
    privacyBody: [
      'قِمّة يتطلّب حسابًا، ويعمل بأسلوب محلي أولًا (local-first): تُحفظ بياناتك على جهازك أولًا، ثم تُزامَن إلى حسابك عند تفعيل المزامنة.',
      'عند تسجيل الدخول بحساب سحابي (Supabase) تُرفع بياناتك إلى حسابك الخاص لتتمكّن من الوصول إليها من أجهزة أخرى. لا يصل إلى صفوفك إلا أنت (Row Level Security).',
      'لا نبيع بياناتك ولا نشاركها مع معلنين. قياساتك وسجلّاتك الصحية تبقى ملكك ويمكنك حذفها في أي وقت عبر «إعادة ضبط البيانات».',
      'نستخدم إحصاءات استخدام مجهولة تمامًا (بلا اسم أو بريد أو أي بيانات شخصية) لتحسين قِمّة، دون بيعها أو تتبّعك خارج التطبيق. يمكنك إيقافها في أي وقت من «الإعدادات → الخصوصية».',
      'تقدر تحذف حسابك وكل بياناته نهائيًا من «الإعدادات → الحساب → حذف الحساب»، أو تصدّر نسخة كاملة من بياناتك في أي وقت من «الإعدادات → البيانات».',
    ],
    termsBody: [
      'قِمّة أداة لتنظيم ومتابعة التمرين والتغذية والمكملات والقياسات للرياضي الفرد. الاستخدام على مسؤوليتك الشخصية.',
      'المحتوى داخل التطبيق (حسابات السعرات واقتراحات أوزان التمرين) تقديري وتعليمي فقط، وليس نصيحة طبية أو غذائية أو دوائية.',
      'استشر طبيبًا أو مختصًا مؤهّلًا قبل تغيير نظامك الغذائي أو الدوائي أو برنامج تمرينك، خصوصًا عند وجود حالة صحية.',
      'أنت مسؤول عن صحة البيانات التي تُدخلها وعن الاحتفاظ بنسخة احتياطية عبر خاصية التصدير.',
      'مصادر الوسائط: صور إرشادات التمارين الثابتة مشتقة من قاعدتَي free-exercise-db و wrkout/exercises.json، ومتاحة بموجب Unlicense/إهداء الملك العام. أمّا الرسوم التوضيحية لبطاقات الأجهزة فهي أعمال أصلية من إنتاج قِمّة (IN-HOUSE) نملك حقوقها كاملةً.',
    ],
  },
  notFound: {
    code: '٤٠٤',
    title: 'الصفحة غير موجودة',
    body: 'الرابط اللي فتحته مو موجود أو اتغيّر.',
    home: 'ارجع للرئيسية',
    back: 'الشاشة السابقة',
  },
  errorBoundary: {
    title: 'صار خلل بسيط',
    body: 'واجهنا مشكلة غير متوقعة في هذي الشاشة. جرّب تحدّث الصفحة وبيرجع كل شي مكانه — بياناتك محفوظة على جهازك.',
    reload: 'حدّث الصفحة',
    routeTitle: 'صار خطأ غير متوقّع',
    routeBody: 'ما قدرنا نحمّل هذي الشاشة — يمكن النت ضعيف. بياناتك محفوظة على جهازك.',
    retry: 'جرّب مرة ثانية',
  },
  contact: {
    title: 'تواصل معنا',
    intro: 'عندك ملاحظة أو سؤال أو واجهت مشكلة؟ يسعدنا نسمع منك ونرد عليك بأقرب وقت.',
    emailLabel: 'البريد للدعم',
    emailValue: 'support@qimmah.app',
    emailCta: 'راسلنا عبر البريد',
    reportCta: 'أبلغ عن مشكلة',
    reportSubject: 'الإبلاغ عن مشكلة في قِمّة',
    back: 'رجوع',
  },
  workout: {
    start: 'ابدأ تمريني',
    watch: 'شوف الشرح',
    trustedGuide: 'رابط شرح موثوق',
    alternatives: 'بدائل',
    altPrompt: 'الجهاز مشغول؟ جرّب بديل',
    startRest: 'ابدأ الراحة',
    pause: 'إيقاف',
    resume: 'متابعة',
    resumeTitle: 'عندك تمرين ما خلص',
    resumeBody: 'تكمّل من مكان ما وقفت؟',
    resumeDiscard: 'تجاهل',
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
    painPlaceholder: 'اكتب أي انزعاج حسّيت فيه',
    safety: 'إذا حسّيت بألم غير طبيعي، وقّف التمرين واستشر مختص.',
    finish: 'إنهاء التمرين',
    confirmUnfinished: 'لسا فيه تمارين ما خلّصتها. تبي تنهي التمرين؟',
    finishTitle: 'خلصت التمرين؟',
    finishBodyUnfinished: 'لسا فيه تمارين ما خلّصتها — بنحفظ اللي سجّلته ونعرض الملخّص.',
    finishBodyDone: 'بنحفظ تمرينك ونعرض الملخّص.',
    confirmFinish: 'نعم، أنهِ واحفظ',
    keepGoing: 'أكمل التمرين',
    errWeight: 'الوزن لازم بين ٠ و٥٠٠ كجم',
    errReps: 'التكرارات لازم بين ٠ و١٠٠',
    progress: 'الإنجاز',
    savedTitle: 'يعطيك العافية! حفظنا تمرينك',
    savedBody: 'حدّثنا أوزانك وسجل تمرينك.',
    recentTitle: 'آخر تمرين',
    completedToday: 'تمرين اليوم مكتمل',
    emptyPlan: 'اختر جدولك من الإعداد عشان تبدأ.',
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
    noHistory: 'ما فيه سجل سابق',
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
    summarySub: 'كفو عليك — استمر على نفس الإيقاع.',
    duration: 'المدة',
    exercisesDone: 'تمارين',
    setsDone: 'جولات',
    totalVolume: 'الحجم الكلي',
    volumeUnit: 'كجم',
    prsLabel: 'أرقام قياسية',
    noPrs: 'ما فيه رقم قياسي هالمرة — بس كل جولة تقرّبك.',
    musclesTrained: 'عضلات مرّنتها',
    nextWorkout: 'تمرينك الجاي',
    backToToday: 'ارجع لليوم',
    viewProgress: 'شوف تقدّمي',
    reminderCtaText: 'تبي تذكير بموعد تمرينك الجاي؟',
    reminderCtaButton: 'ذكّرني بموعد تمريني',
    reminderCtaEnabled: 'تذكير التمرين مفعّل — بيوصلك على وقتك.',
    reminderCtaDenied: 'الإشعارات موقوفة. فعّلها من إعدادات آيفون ← الإشعارات ← قِمّة.',
    newPr: 'رقم قياسي جديد',
    weeklyStreakTitle: 'سلسلة الالتزام الأسبوعي',
    weeklyDonePrefix: 'خلّصت',
    weeklyWorkoutsWord: 'تمارين هذا الأسبوع',
    weeksUnit: 'أسبوع',
    weeklyStreakEmpty: 'ابدأ أسبوعك — كل تمرين يقرّبك لهدفك.',
  },
  nutrition: {
    tabTitle: 'التغذية',
    needCals: 'احتياجك',
    foodCals: 'الأكل',
    exerciseCals: 'التمرين',
    equationNote: 'احتياجك − الأكل + التمرين = المتبقّي',
    addShort: 'أضف',
    title: 'خطة الأكل',
    desc: 'وجباتك وأهدافك الغذائية — مبنية على حساباتك الذكية وتقدر تعدّلها.',
    enable: 'أبغى أتابع أكلي',
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
    estimateNote: 'القيم الغذائية تقريبية وممكن تختلف حسب المنتج وطريقة التحضير.',
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
    logMeal: '+ سجّل أكلك',
    quickAdd: 'أضف سعرات وبروتين بسرعة',
    eaten: 'مأكول',
    remaining: 'المتبقّي',
    remainingCalories: 'سعرات متبقّية',
    remainingProtein: 'بروتين متبقّي',
    remainingWater: 'ماء متبقّي',
    addToLog: 'أضف للسجل',
    customQuickAdd: 'إضافة سريعة مخصّصة',
    foodName: 'اسم الأكل/الوجبة',
    quickAddHint: 'اكتب سعرات أو بروتين على الأقل عشان تضيف.',
    note: 'ملاحظة',
    optional: 'اختياري',
    searchFood: 'ابحث عن أكل…',
    servingsCount: 'عدد الحصص',
    gramsAmount: 'الكمية (غرام)',
    gramsUnit: 'غ',
    perServingNote: 'القيم لكل',
    todayLog: 'سجل اليوم',
    emptyLog: 'ما سجّلت شي اليوم لسا.',
    removeEntry: 'حذف',
    swapMeal: 'بدّل الوجبة',
    swapMealTitle: 'بدائل بسعرات وبروتين متقارب',
    noAlternatives: 'ما فيه بدائل قريبة حاليًا.',
    close: 'إغلاق',
    per100g: 'لكل 100غ',
    perPortion: 'لكل حصة',
    emptyStateTitle: 'ابدأ — سجّل أول وجبة',
    emptyStateHint: 'اضغط «أضف» عند أي وجبة، دوّر أكلتك، وحدّد الكمية بالغرام.',
  },
  wellness: {
    title: 'المكملات والأدوية',
    desc: 'نظّم مكملاتك وأدويتك وتابعها يوميًا — للتنظيم بس، ومو نصيحة طبية.',
    enable: 'أبغى أتابع مكملاتي وأدويتي',
    supplementsTab: 'المكملات',
    medicationsTab: 'الأدوية',
    addSupplement: 'أضف مكمّلًا من المكتبة',
    addMedication: 'أضف دواءً من المكتبة',
    addCustomSupplement: 'أضف مكمّلًا مخصّصًا',
    addCustomMedication: 'أضف دواءً مخصّصًا',
    amount: 'الكمية',
    dose: 'الجرعة',
    doseHint: 'اكتب الجرعة مثل ما وصفها الطبيب',
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
      'قِمّة يساعدك تنظّم وتتابع أدويتك بس. لا تبدأ ولا توقف ولا تغيّر جرعة أي دواء بدون استشارة الطبيب أو الصيدلي.',
    suppSafety: 'قِمّة يساعدك تتابع مكملاتك بس، وما يوصي بجرعات علاجية.',
    empty: 'فعّل المكملات والأدوية من الإعداد إذا تبغى تتابعها.',
    emptySupp: 'أضف مكمّلاتك إذا تستخدمها.',
    emptyMed: 'أضف بس اللي تبغى تتابعه.',
    search: 'ابحث…',
    allCategories: 'كل الفئات',
  },
  commit: {
    title: 'التزاماتي',
    desc: 'الأشياء اللي تبغى تلتزم فيها يوميًا أو أسبوعيًا.',
    enable: 'أبغى أتابع التزاماتي اليومية',
    intro: 'اختر الأشياء اللي تبغى تلتزم فيها يوميًا أو أسبوعيًا، وتقدر تعدّلها بعدين.',
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
    noWeight: 'سجّل وزنك من قسم القياسات وبيظهر هنا.',
    cardStreak: 'سلسلة التمرين',
    streakDays: 'يوم متتالٍ',
    cardVolume: 'حجم التمرين',
    noWorkouts: 'ما فيه تمارين مسجّلة لسا. ابدأ تمرينك وبيظهر تقدّمك هنا.',
    cardPRs: 'أفضل الأوزان (PRs)',
    noPRs: 'خلّص تمرين بأوزان وبتظهر أرقامك القياسية.',
    cardMuscles: 'العضلات هذا الأسبوع',
    remindersTitle: 'التذكيرات',
    reminderEnabled: 'تفعيل التذكير',
    reminderTrainingTime: 'وقت تذكير التمرين',
    reminderNote: 'التذكيرات داخل المتصفح محدودة — دعم التنبيهات الكامل بيجي لاحقًا في تطبيق الجوال.',
    reminderNotifTitle: 'وقت تمرينك 💪',
    reminderNotifBody: 'تمرينك بانتظارك — خلّك مستمر.',
    reminderDeniedHint: 'الإشعارات موقوفة لقِمّة. فعّلها من إعدادات آيفون ← الإشعارات ← قِمّة، ثم جرّب مرة ثانية.',
    reminderWebHint: 'التذكيرات المجدولة تشتغل في تطبيق آيفون. داخل المتصفح ما بيوصلك إشعار في الخلفية.',
    title: 'القياسات والتقدّم',
    desc: 'سجّل قياساتك وشوف تقدّمك مع الوقت.',
    enable: 'أبغى أتابع قياساتي وتقدّمي',
    selectTypes: 'اختر القياسات اللي تبغى تتابعها',
    advanced: 'قياسات صحية متقدمة',
    advancedNote: 'القياسات الصحية المتقدمة للتسجيل بس، ومو للتشخيص.',
    quickLog: 'تسجيل سريع',
    save: 'احفظ القياس',
    latest: 'آخر قياس',
    history: 'السجل',
    trend: 'الاتجاه',
    up: 'ارتفاع',
    down: 'انخفاض',
    same: 'بدون تغيير',
    noLogs: 'ما فيه قياسات لسا.',
    empty: 'فعّل القياسات من الإعداد إذا تبغى تتابع تقدّمك.',
    notes: 'ملاحظات',
    delete: 'حذف',
  },
}

const en: ShellStrings = {
  brand: 'Qimmah',
  tagline: 'Your calm guide to better health',
  nav: { home: 'Home', setup: 'Setup', settings: 'Settings' },
  tabs: { home: 'Home', today: 'Today', workout: 'Workout', nutrition: 'Nutrition', progress: 'Progress', profile: 'Profile' },
  lang: { ar: 'العربية', en: 'English', label: 'Language' },
  badge: { guest: 'Guest', account: 'Account' },
  start: {
    welcome: 'Welcome to Qimmah',
    headline: 'Every summit begins with a step.',
    intro: 'Your workouts, nutrition, and progress — all in one place, with clarity and calm.',
    startSetup: 'Set up my page',
    buildPlan: 'Build my plan now',
    continueSetup: 'Continue my setup',
    seeDemo: 'See a sample',
    importPrevious: 'Import a previous copy',
    chooseLang: 'Choose language',
    note: 'Your data is saved on your device. You can edit anything later.',
    positioning: 'Your calm guide to better health.',
    trust: 'No ads. No hype.',
    login: 'Log in',
    continueGuest: 'Continue as guest',
    guestNote: 'Guest data is stored on this device only.',
  },
  auth: {
    title: 'Log in',
    subtitle: 'Log in to back up your data to the cloud and access it from any device.',
    signupTitle: 'Create account',
    signupSubtitle: 'Create your account once to save your progress and reach it from any device.',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    login: 'Log in',
    createAccount: 'Create account',
    logout: 'Log out',
    forgotLink: 'Forgot your password?',
    forgotTitle: 'Reset your password',
    forgotSubtitle: "Enter your email and we'll send you a link to reset your password.",
    sendReset: 'Send reset link',
    forgotSent: "If that email is registered, a reset link is on its way. Check your inbox.",
    forgotFailed: "Couldn't send the link right now. Try again later.",
    resetTitle: 'Set a new password',
    resetSubtitle: 'Choose a new password for your Qimmah account.',
    resetNewPassword: 'New password',
    resetConfirmPassword: 'Confirm password',
    resetSave: 'Save password',
    resetSuccess: 'Your password has been updated.',
    resetSuccessHint: 'You can now sign in with your new password.',
    resetMismatch: "The passwords don't match — double-check them.",
    resetWeak: 'Password too weak — at least 8 characters with a letter and a number.',
    resetExpiredTitle: 'This link is no longer valid',
    resetExpired: 'This link has expired or no longer works. Just request a new one.',
    resetChecking: 'Checking the link…',
    continueGuest: 'Continue as guest',
    noAccount: 'No account?',
    haveAccount: 'Have an account?',
    switchToSignup: 'Create one',
    switchToLogin: 'Log in',
    savePrompt: 'Sign up to save your progress',
    disabledTitle: "Cloud login isn't available right now",
    disabledBody: "Cloud sync isn't enabled in this build. Contact the provider to enable accounts.",
    guestBadge: 'Guest',
    guestNote: 'Guest data is stored on this device only.',
    accountNote: 'You are logged in. Your data syncs to your cloud account.',
    cloudNote: 'Your data is stored on this device and on your cloud account.',
    back: 'Back',
    deleteAccount: 'Delete account',
    deleteAccountDesc: "Permanently delete your account and all your data. This can't be undone.",
    deleteConfirmTitle: 'Delete account permanently?',
    deleteConfirmBody:
      "Your account and all your data (plan, logs, measurements) will be permanently deleted from this device and your cloud account. It can't be recovered.",
    deleteConfirmHint: 'Type "DELETE" to confirm',
    deleteConfirmWord: 'DELETE',
    deleteConfirmCta: 'Delete my account',
    deleting: 'Deleting…',
    deleteFailed: "We couldn't fully delete your account. The process didn't complete. Try again or",
    deleteRetry: 'Try again',
    deleteContactCta: 'contact us',
    cancel: 'Cancel',
  },
  settings: {
    title: 'Settings',
    groupAccount: 'Account',
    groupData: 'Data',
    groupPlan: 'My Plan',
    groupPrivacy: 'Privacy & Trust',
    groupLanguage: 'Language',
    languageActive: 'Arabic — active',
    languageHint: 'Text and page direction switch instantly, and your choice is saved on this device.',
    export: 'Export backup',
    import: 'Import backup',
    reset: 'Reset data',
    resetConfirm:
      "This will permanently delete all Qimmah data from this browser (setup, plan, tracking, logs). This can't be undone. Are you sure?",
    editPlan: 'Edit my plan',
    regenerate: 'Regenerate plan',
    regenerateConfirm:
      'Your workout and nutrition plan will be regenerated from your current data, replacing the current plan. Continue?',
    switchMachines: 'Switch to machines version',
    switchMachinesConfirm:
      'Your auto plan will be regenerated with catalog machine exercises only, replacing the current auto plan. Your custom plan and workout history stay untouched. Continue?',
    switchMachinesSuccess: 'Done — your auto plan is now the machines version.',
    privacyLink: 'Privacy policy',
    termsLink: 'Terms of use',
    healthDisclaimer:
      'Qimmah is a personal organization and tracking tool, not a substitute for medical advice. Do not start or stop any medication or program without a professional.',
    importConfirm: 'Importing will replace your current plan and logs with the file contents. Continue?',
    importSuccess: 'Your backup was imported successfully.',
    importError: "Couldn't read the file. Make sure it's a valid Qimmah backup.",
    dataLocalNote:
      'The export is created on your device as a JSON file that you can save or share. Exporting does not change your account sync setting.',
    exportShared: 'Your data copy was shared.',
    exportDownloaded: 'Your data was downloaded to your device.',
    exportFailed: "Couldn't create the export.",
    importPreviewTitle: 'Import preview',
    importPreviewNote: 'This will replace what is on your device now. You can undo after importing.',
    importConfirmBtn: 'Confirm import',
    importCancel: 'Cancel',
    importBackedUp: 'Backed up',
    importExtra: 'Extra items',
    importDoneTitle: 'Import complete',
    importDoneNote: 'Your data was restored on this device.',
    importViewData: 'View my data',
    importUndo: 'Undo',
    importUndoLast: 'Undo last import',
    importUndoDesc: 'Restores your data to before the last import.',
    importRecoveryBlocked: 'Import is disabled during password recovery.',
    importInvalidFile: 'Invalid file.',
    regenerateSuccess: 'Your plan was regenerated from your current data.',
    groupDev: 'Internal tools',
    devReviewProducts: 'Product review',
    devReviewHint: 'Review scanned or submitted products awaiting approval before they reach users.',
    groupAbout: 'About',
    versionLabel: 'App version',
    calcLink: 'How we calculate your numbers',
    analyticsTitle: 'Anonymous analytics',
    analyticsDesc:
      "Fully anonymous usage stats (no name, email, or personal data) that help us improve Qimmah. We don't sell your data or track you across apps. You can turn this off any time.",
    analyticsToggle: 'Share anonymous analytics',
  },
  pwa: {
    group: 'App & Notifications',
    installTitle: 'Install Qimmah on your device',
    installBody: 'Add Qimmah as an app so it opens in one tap and works offline.',
    installBtn: 'Install app',
    installIosTitle: 'Add Qimmah to your Home Screen',
    installIosBody:
      'On iPhone Safari: tap the Share button, then “Add to Home Screen”. Notifications are limited in the iPhone browser — for the full experience add Qimmah to your Home Screen.',
    installedTitle: 'Qimmah installed ✓',
    installedBody: 'You’re using Qimmah as an installed app. Enjoy the full experience.',
    notifTitle: 'Reminder notifications',
    notifBody:
      'Enable notifications for gentle nudges about your workouts and meals. Reminders are local to this browser and may not arrive in the background on some devices — no guarantees.',
    notifEnable: 'Enable notifications',
    notifGranted: 'Notifications enabled ✓',
    notifDenied: 'Notifications are blocked in your browser settings. Turn them on in your site settings.',
    notifUnsupported: "Your browser doesn't support notifications here. Add Qimmah to your Home Screen for a better experience.",
    notifConfirm: 'Great! We’ll remind you about your workouts and meals.',
    bannerText: 'Add Qimmah to your Home Screen — faster and works offline.',
    bannerInstall: 'Install',
    bannerDismiss: 'Later',
  },
  legal: {
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms of Use',
    back: 'Back',
    privacyBody: [
      'Qimmah requires an account and follows a local-first approach: your data is stored on your device first, then synced to your account when sync is enabled.',
      'When you log in with a cloud account (Supabase), your data is uploaded to your own account so you can access it from other devices. Only you can read your rows (Row Level Security).',
      'We do not sell or share your data with advertisers. Your measurements remain yours and can be deleted anytime via “Reset data”.',
      'We use fully anonymous usage analytics (no name, email, or personal data) to improve Qimmah — never sold and never used to track you across apps. You can turn this off anytime in Settings → Privacy.',
      'You can permanently delete your account and all its data from Settings → Account → Delete account, or export a full copy of your data anytime from Settings → Data.',
    ],
    termsBody: [
      'Qimmah is a tool to organize and track training, nutrition, supplements, and measurements for the individual athlete. Use is at your own responsibility.',
      'In-app content (calorie calculations and suggested training weights) is estimated and educational only, not medical, nutritional, or pharmaceutical advice.',
      'Consult a qualified professional before changing your diet, medication, or training program, especially with a health condition.',
      'You are responsible for the accuracy of the data you enter and for keeping a backup via the export feature.',
      'Media sources: Static exercise-instruction images are derived from free-exercise-db and wrkout/exercises.json, available under the Unlicense/public-domain dedication. Machine-card illustrations are original in-house Qimmah artwork that we fully own.',
    ],
  },
  notFound: {
    code: '404',
    title: 'Page not found',
    body: 'The link you opened doesn’t exist or has changed.',
    home: 'Back to home',
    back: 'Previous screen',
  },
  errorBoundary: {
    title: 'Something went wrong',
    body: 'We hit an unexpected problem on this screen. Try reloading the page and it should be back to normal — your data is saved on your device.',
    reload: 'Reload page',
    routeTitle: 'Something went wrong',
    routeBody: 'This screen failed to load — your connection may be weak. Your data is saved on your device.',
    retry: 'Try again',
  },
  contact: {
    title: 'Contact us',
    intro: 'Have feedback, a question, or hit a problem? We’d love to hear from you and will reply as soon as we can.',
    emailLabel: 'Support email',
    emailValue: 'support@qimmah.app',
    emailCta: 'Email us',
    reportCta: 'Report a problem',
    reportSubject: 'Reporting a problem in Qimmah',
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
    resumeTitle: 'You have an unfinished workout',
    resumeBody: 'Continue where you left off?',
    resumeDiscard: 'Discard',
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
    confirmUnfinished: "Some exercises aren't done yet. Finish anyway?",
    finishTitle: 'All done?',
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
    reminderCtaText: 'Want a reminder for your next workout?',
    reminderCtaButton: 'Remind me at my workout time',
    reminderCtaEnabled: 'Workout reminder on — we’ll nudge you at your time.',
    reminderCtaDenied: 'Notifications are off. Enable them in iOS Settings → Notifications → Qimmah.',
    newPr: 'New PR',
    weeklyStreakTitle: 'Weekly commitment streak',
    weeklyDonePrefix: 'You finished',
    weeklyWorkoutsWord: 'workouts this week',
    weeksUnit: 'weeks',
    weeklyStreakEmpty: 'Start your week — every workout counts.',
  },
  nutrition: {
    tabTitle: 'Nutrition',
    needCals: 'Needs',
    foodCals: 'Food',
    exerciseCals: 'Exercise',
    equationNote: 'Needs − Food + Exercise = Remaining',
    addShort: 'Add',
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
    logMeal: '+ Log food',
    quickAdd: 'Quick-add calories & protein',
    eaten: 'Eaten',
    remaining: 'Remaining',
    remainingCalories: 'Calories left',
    remainingProtein: 'Protein left',
    remainingWater: 'Water left',
    addToLog: 'Add to log',
    customQuickAdd: 'Custom quick add',
    foodName: 'Food/meal name',
    quickAddHint: 'Enter at least calories or protein to add.',
    note: 'Note',
    optional: 'optional',
    searchFood: 'Search food…',
    servingsCount: 'Servings',
    gramsAmount: 'Amount (grams)',
    gramsUnit: 'g',
    perServingNote: 'Values per',
    todayLog: "Today's log",
    emptyLog: 'Nothing logged today yet.',
    removeEntry: 'Remove',
    swapMeal: 'Swap meal',
    swapMealTitle: 'Alternatives with similar calories & protein',
    noAlternatives: 'No close alternatives right now.',
    close: 'Close',
    per100g: 'Per 100g',
    perPortion: 'Per portion',
    emptyStateTitle: 'Start — log your first meal',
    emptyStateHint: 'Tap “Add” on any meal, search for your food, and set the amount in grams.',
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
    remindersTitle: 'Reminders',
    reminderEnabled: 'Enable reminder',
    reminderTrainingTime: 'Training reminder time',
    reminderNote: 'In-browser reminders are limited. Full notifications later in the mobile app.',
    reminderNotifTitle: 'Time to train 💪',
    reminderNotifBody: 'Your workout is waiting — keep your momentum going.',
    reminderDeniedHint: 'Notifications are off for Qimmah. Enable them in iOS Settings → Notifications → Qimmah, then try again.',
    reminderWebHint: 'Scheduled reminders work in the iOS app. In the browser you won’t get a background notification.',
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
