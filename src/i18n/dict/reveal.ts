// نصوص «الكشف» — ما يراه المستخدم بعد آخر سؤال.
// [OVERNIGHT-4] الحزمة ٤.
//
// النبرة: عامية بيضاء دافئة (الميثاق §٦). وهذه الشاشة تطلب مالًا، فيحكمها
// الثابت الأول تحديدًا: **لا لوم ولا ضغط ولا تهويل ولا تكديس تعجّب**. تصف ما
// يفتحه الاشتراك، ولا تعاتب من لم يشترك ولا تخوّفه بالفوات.
//
// ═══ قاعدتان تحكمان كل سطر رقمي هنا ═══
// ١) **المقاس حاسم، والمُستنتَج متحفّظ** (الميثاق §٦/٢). الوزن الذي أدخله
//    المستخدم يُقال بلا تحفّظ. أمّا الوزن المستهدف والمدّة فمشتقّان من معادلة،
//    فيُقالان بـ«تقريبي» و«على هذا المسار» — ولا يُقال «ستصل» أبدًا.
// ٢) **لا رقم لا مصدر له.** كل قيمة معروضة تأتي من إجابة أدخلها المستخدم أو من
//    حساب المحرّك عليها. ما لا نعرفه لا يُعرض ولا يُخترع له بديل.

import type { Lang } from '@/lib/appPreferences'

export interface RevealStrings {
  /** مراحل التجهيز — قصّة قصيرة لا دوّامة صامتة. */
  synthesis: {
    /** يُقرأ بصوت الشاشة القارئة مرّة واحدة، فلا يُقاطَع عند كل مرحلة. */
    ariaLabel: string
    stages: readonly string[]
    /** يظهر وحده حين يطلب المستخدم تقليل الحركة. */
    reducedMotion: string
  }
  hero: {
    eyebrow: string
    /** تحيّة باسمه إن عرفناه — وإلّا فالبديل بلا اسم، لا اسم مخترع. */
    titleNamed: (name: string) => string
    titleAnonymous: string
    subtitle: string
  }
  journey: {
    title: string
    /** «نقطة البداية» — مقاسة، فتُقال حاسمة. */
    current: string
    /** «مسارك المستهدف» لا «ستصل» — تسمية الرقم **المشتقّ**. */
    target: string
    /**
     * تسمية الرقم الذي **كتبه المستخدم بنفسه**. مقاسٌ لا مُستنتَج، فلا يحمل
     * وسم «تقريبي» ولا لغة تحفّظ (§6/الثابت ٢).
     */
    targetYours: string
    /** وسم صريح على كل رقم مشتقّ. */
    estimateBadge: string
    /**
     * رقم المستخدم يعاكس اتجاه هدفه — يُقال صراحةً ولا يُصحَّح صامتًا.
     * النبرة إخبار لا لوم: رقمه يبقى، والباب مفتوح لتغيير أيّهما شاء.
     */
    mismatchNote: string
    /** سطر المدّة التقريبية. الرقم يصل **مُنسَّقًا** — التوطين عند حدّ الرسم لا في القاموس. */
    weeks: (weeks: string) => string
    /** معدّل التغيّر الأسبوعي التقريبي. */
    weeklyRate: (kg: string) => string
    /** حين يكون الهدف ثباتًا لا تغيير وزن — لا مسار وهمي. */
    steadyTitle: string
    steadyBody: string
    /** تنويه صدق يظهر دائمًا تحت الرسم. */
    honesty: string
    unitKg: string
  }
  /** الأقسام التي تصف ما ستفعله قِمّة — كلٌّ منها مبنيّ على إجابة حقيقية. */
  value: {
    title: string
    training: (days: string, minutes: string) => string
    place: (place: string) => string
    nutrition: (calories: string) => string
    protein: (grams: string) => string
    progress: string
    adaptation: string
    /** الهدف كما اختاره — مقاس (اختيار صريح) فيُقال حاسمًا. */
    goal: (label: string) => string
    /** استراتيجية الخطة: التقسيمة التي **يبنيها المحرّك**، لا التي نتمنّاها. */
    strategy: (split: string) => string
    /** الأدوات التي أعلنها — سببُ كون التمارين هذه بالضبط. */
    equipment: (list: string) => string
    /** اتجاه التغذية حسب نيّته المعلنة — ثلاث حالات لا حالة واحدة. */
    nutritionStyle: Record<'meal_suggestions' | 'macros_only' | 'simple_guidance', string>
    /** عنوان «وش نتتبّعه معك» — وعدُ تتبّع لا وعدُ نتيجة. */
    tracksTitle: string
    /** وسم على كل سطر مشتقّ داخل هذا القسم. */
    estimateBadge: string
    /** يُقال حين يتعذّر رسم هدف وزنٍ يوافق الهدف المعلن — اتجاه لا رقم. */
    directionOnly: string
  }
  /** ترتيب النداءات الثلاثة. */
  cta: {
    premiumTitle: string
    premiumCta: string
    /** الصيغة المعتمدة وحدها (§0.1) — لا «مدى الحياة» ولا «lifetime». */
    premiumNote: string
    trialCta: string
    trialNote: string
    previewCta: string
    previewNote: string
    /** حالات بدء التجربة — كلٌّ منها سبب صادق لا رسالة عامّة. */
    trialStarting: string
    trialNeedsAccount: string
    trialNeedsVerifiedEmail: string
    trialAlreadyUsed: string
    trialOffline: string
    trialStarted: string
    /**
     * [WAVE-A] نداء إنشاء الحساب — يظهر **عند الحاجة فقط**.
     *
     * التجربة وPremium يحتاجان حسابًا (سلطة الخادم). كانت الحالة تُبلَّغ نصًّا
     * («سجّل دخولك أول») بلا أي طريق إليه — رسالة تصف بابًا ولا تفتحه.
     * أما المعاينة فتبقى بلا حساب (§0.1)، فلا يُعرض هذا النداء لأجلها.
     */
    createAccountCta: string
    /**
     * [SOVEREIGN-ENTRY-001] استئناف تجربة طُلبت **قبل** الحساب.
     *
     * الرحلة تعبر تفكيك شاشة التسليم، فالوعد يُقطع هناك ويُوفّى هنا. النبرة
     * تذكير لا مطالبة: لا ضغط ولا «لا تفوّت» (§6/الثابت ١).
     */
    resumeTrialTitle: string
    resumeTrialCta: string
    resumeTrialDismiss: string
  }
}

const ar: RevealStrings = {
  synthesis: {
    ariaLabel: 'نجهّز خطتك، لحظة من فضلك',
    stages: [
      'نفهم هدفك',
      'نبني مسارك',
      'نوازن التدريب والغذاء',
      'نرتّب أول أسبوع لك',
      'نجهّز قِمّتك',
    ],
    reducedMotion: 'نجهّز خطتك…',
  },
  hero: {
    eyebrow: 'خطتك',
    titleNamed: (name) => `يا ${name}، هذي نقطة البداية.`,
    titleAnonymous: 'هذي نقطة البداية.',
    subtitle: 'الأرقام تحت مبنيّة على إجاباتك — وبعضها يبدأ من قواعد عامة نضبّطها معك.',
  },
  journey: {
    title: 'مسارك',
    current: 'اليوم',
    target: 'مسارك المستهدف',
    targetYours: 'هدفك',
    estimateBadge: 'تقريبي',
    mismatchNote: 'الرقم اللي كتبته يمشي بعكس الهدف اللي اخترته، فما نرسم لك مدّة عليه. خلّيناه زي ما كتبته — وتقدر تغيّر الهدف أو الرقم أي وقت.',
    weeks: (weeks) => `على هذا المسار، تقريبًا ${weeks} أسبوعًا`,
    weeklyRate: (kg) => `بمعدّل ${kg} كجم بالأسبوع تقريبًا`,
    steadyTitle: 'هدفك ثبات لا تغيير وزن',
    steadyBody: 'فما نرسم لك خطًّا صاعدًا ولا نازلًا — نرسم التزامك.',
    honesty: 'هذا اتجاه نبني عليه خطتك، مو وعد. جسمك يتغيّر بأشياء كثيرة، وإحنا نعدّل معك.',
    unitKg: 'كجم',
  },
  value: {
    title: 'وش راح تسوي معك قِمّة؟',
    training: (days, minutes) => `${days} أيام تمرين، ${minutes} دقيقة للجلسة`,
    place: (place) => `مبنية على تمرينك في ${place}`,
    nutrition: (calories) => `${calories} سعرة هدفك اليومي`,
    protein: (grams) => `${grams} غرام بروتين باليوم`,
    progress: 'وزنك وقياساتك بالأرقام، لا بالإحساس',
    adaptation: 'كل تغيير في خطتك نشرح لك سببه — ولا نغيّر شي بصمت',
    goal: (label) => `هدفك: ${label}`,
    strategy: (split) => `تقسيمتك: ${split}`,
    equipment: (list) => `تمارينك مبنية على: ${list}`,
    nutritionStyle: {
      meal_suggestions: 'نقترح لك وجبات تناسب نمط أكلك',
      macros_only: 'نعطيك أرقامك بس — سعراتك وماكروزك',
      simple_guidance: 'نعطيك إرشاد مبسّط بلا تعقيد',
    },
    tracksTitle: 'وش نتتبّعه معك؟',
    estimateBadge: 'تقريبي',
    directionOnly: 'ما عندنا معلومات كافية لرقم دقيق — نعطيك الاتجاه، ونضبّطه معك أول ما تسجّل قياساتك.',
  },
  cta: {
    premiumTitle: 'ابدأ مع قِمّة',
    premiumCta: 'ابدأ مع قِمّة Premium',
    premiumNote: 'يشمل تحديثات قِمّة — بلا اشتراك شهري',
    trialCta: 'جرّب Premium ٣ أيام',
    trialNote: 'تجربة كاملة ٧٢ ساعة، تحتاج حساب موثَّق.',
    previewCta: 'الدخول بوضع المعاينة',
    previewNote: 'تتصفّح كل شي وتشوف خطتك. التسجيل يحتاج Premium.',
    trialStarting: 'نجهّز تجربتك…',
    trialNeedsAccount: 'التجربة تحتاج حساب موثَّق. أنشئ حسابك أو سجّل دخولك.',
    trialNeedsVerifiedEmail: 'أكّد بريدك أول، وبعدها تبدأ تجربتك.',
    trialAlreadyUsed: 'تجربتك استُخدمت من قبل على هذا الحساب.',
    trialOffline: 'ما قدرنا نوصل للخادم. تأكّد من اتصالك وجرّب مرة ثانية.',
    trialStarted: 'تجربتك بدأت — ٧٢ ساعة كاملة.',
    createAccountCta: 'أنشئ حسابك',
    resumeTrialTitle: 'طلبت تجربة Premium قبل شوي — حسابك جاهز الحين.',
    resumeTrialCta: 'ابدأ تجربتك',
    resumeTrialDismiss: 'مو الحين',
  },
}

const en: RevealStrings = {
  synthesis: {
    ariaLabel: 'Building your plan, one moment',
    stages: [
      'Understanding your goal',
      'Mapping your path',
      'Balancing training and food',
      'Laying out your first week',
      'Finishing your Qimmah',
    ],
    reducedMotion: 'Building your plan…',
  },
  hero: {
    eyebrow: 'Your plan',
    titleNamed: (name) => `${name}, this is your starting point.`,
    titleAnonymous: 'This is your starting point.',
    subtitle: 'The numbers below build on your answers — some start from general rules we tune with you.',
  },
  journey: {
    title: 'Your path',
    current: 'Today',
    target: 'Your target path',
    targetYours: 'Your target',
    estimateBadge: 'estimate',
    mismatchNote: "The number you entered goes the other way from the goal you picked, so we're not drawing a timeline on it. We kept your number as you wrote it — you can change either one anytime.",
    weeks: (weeks) => `On this path, roughly ${weeks} weeks`,
    weeklyRate: (kg) => `About ${kg} kg per week`,
    steadyTitle: 'Your goal is steady, not weight change',
    steadyBody: 'So we draw no rising or falling line — we draw your consistency.',
    honesty: "This is the direction we build your plan on, not a promise. Bodies change for many reasons, and we adjust with you.",
    unitKg: 'kg',
  },
  value: {
    title: 'What Qimmah will do with you',
    training: (days, minutes) => `${days} training days, ${minutes} minutes a session`,
    place: (place) => `Built around training at ${place}`,
    nutrition: (calories) => `${calories} calories a day`,
    protein: (grams) => `${grams} g of protein a day`,
    progress: 'Your weight and measurements in numbers, not feelings',
    adaptation: 'We explain every change to your plan — nothing changes silently',
    goal: (label) => `Your goal: ${label}`,
    strategy: (split) => `Your split: ${split}`,
    equipment: (list) => `Your exercises are built around: ${list}`,
    nutritionStyle: {
      meal_suggestions: 'We suggest meals that fit how you eat',
      macros_only: 'Just your numbers — calories and macros',
      simple_guidance: 'Simple guidance, nothing complicated',
    },
    tracksTitle: 'What we track with you',
    estimateBadge: 'estimate',
    directionOnly: "We don't have enough to give an exact number — here's the direction, and we tune it once you log measurements.",
  },
  cta: {
    premiumTitle: 'Start with Qimmah',
    premiumCta: 'Start with Qimmah Premium',
    premiumNote: 'Includes Qimmah updates — no monthly subscription',
    trialCta: 'Try Premium for 3 days',
    trialNote: 'A full 72 hours. Needs a verified account.',
    previewCta: 'Continue in preview mode',
    previewNote: 'Browse everything and see your plan. Logging needs Premium.',
    trialStarting: 'Starting your trial…',
    trialNeedsAccount: 'The trial needs a verified account. Create one or sign in.',
    trialNeedsVerifiedEmail: 'Confirm your email first, then your trial can start.',
    trialAlreadyUsed: 'This account has already used its trial.',
    trialOffline: "We couldn't reach the server. Check your connection and try again.",
    trialStarted: 'Your trial has started — a full 72 hours.',
    createAccountCta: 'Create your account',
    resumeTrialTitle: 'You asked for a Premium trial earlier — your account is ready now.',
    resumeTrialCta: 'Start your trial',
    resumeTrialDismiss: 'Not now',
  },
}

export const revealStrings: Record<Lang, RevealStrings> = { ar, en }
