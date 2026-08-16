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
    /** «مسارك المستهدف» لا «ستصل». */
    target: string
    /** وسم صريح على كل رقم مشتقّ. */
    estimateBadge: string
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
    subtitle: 'كل رقم تحت مبني على إجاباتك أنت — ما فيه شي عام.',
  },
  journey: {
    title: 'مسارك',
    current: 'اليوم',
    target: 'مسارك المستهدف',
    estimateBadge: 'تقريبي',
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
    subtitle: 'Every number below comes from your own answers — nothing generic.',
  },
  journey: {
    title: 'Your path',
    current: 'Today',
    target: 'Your target path',
    estimateBadge: 'estimate',
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
  },
}

export const revealStrings: Record<Lang, RevealStrings> = { ar, en }
