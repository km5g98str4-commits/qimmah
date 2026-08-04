// قاموس محرّك التخصيص — نصوص ١٩٤ سؤالًا بالعربية والإنجليزية معًا.
//
// ═══ لماذا الزوجان متلاصقان في المصدر ═══
// الشكل المُصدَّر `Record<Lang, …>` كبقيّة القواميس، لكن **التأليف** يضع العربية
// والإنجليزية في سطر واحد (`t(ar, en)`). السبب عملي: قاموسان منفصلان بـ١٩٤
// مفتاحًا ينحرفان — يُضاف سؤال لعربية وينسى في الإنجليزية، فيظهر مفتاح خام
// للمستخدم. التلاصق يجعل النقص **مستحيلًا نحويًا**، والإسقاط إلى الشكل
// القياسي يتمّ آليًا في الأسفل.
//
// ═══ النبرة (الميثاق §6) ═══
// عامية بيضاء سعودية/خليجية دافئة، وإنجليزية ودودة غير رسمية. وممنوع في مسار
// المبتدئ أي مصطلح حمل متقدّم (RIR · RPE · Deload · 1RM · AMRAP) — أسئلة تلك
// المصطلحات كلّها في `bank/advanced.ts` بـ`levels` مقيّد، ويحرسه الإثبات.
//
// ═══ والاستثناء الوحيد: كتلة الموافقة ═══
// `s-health-consent.legal` **فصحى** — العقود لا تُكتب بالعامية (§6). وهي
// **معلَنة مفصولة** في حقل خاصّ لا مندسّة في نبرة الشاشة.

import type { Lang } from '@/lib/appPreferences'

export interface Bilingual {
  ar: string
  en: string
}

export interface QuestionText {
  title: string
  hint?: string
  /** كتلة قانونية مفصولة بصريًا — لا تندسّ في نبرة الشاشة. */
  legal?: string
  opts?: Record<string, string>
}

export interface PersonalizationStrings {
  questions: Record<string, QuestionText>
  ui: {
    next: string
    back: string
    skip: string
    finish: string
    progressApprox: string
    whyAsk: string
    outOfRange: string
    required: string
    tooFew: string
    tooMany: string
    optionUnavailable: string
    clearanceTitle: string
    clearanceBody: string
    minorGoalNote: string
    assumptionNote: string
    conflictIntro: string
    resumeTitle: string
    saveFailed: string
  }
}

interface RawQuestion {
  title: Bilingual
  hint?: Bilingual
  legal?: Bilingual
  opts?: Record<string, Bilingual>
}

const t = (ar: string, en: string): Bilingual => ({ ar, en })

/**
 * تسميات مناطق الجسم — تُستعمل في كل أسئلة `bodyAreas` الخمسة.
 * موحّدة عمدًا: «الركبة» يجب أن تُسمّى «الركبة» في سؤال الإصابة وسؤال العملية
 * وسؤال مدى الحركة. اختلاف التسمية بين سؤالين يجعل المستخدم يظنّهما شيئين.
 */
const AREAS: Record<string, Bilingual> = {
  neck: t('الرقبة', 'Neck'),
  shoulder: t('الكتف', 'Shoulder'),
  elbow: t('الكوع', 'Elbow'),
  wrist: t('الرسغ', 'Wrist'),
  upper_back: t('أعلى الظهر', 'Upper back'),
  lower_back: t('أسفل الظهر', 'Lower back'),
  hip: t('الورك', 'Hip'),
  knee: t('الركبة', 'Knee'),
  ankle: t('الكاحل', 'Ankle'),
  core: t('الوسط', 'Core'),
}

// ————————————————————————— الأسئلة —————————————————————————

const Q: Record<string, RawQuestion> = {
  // ═══ الموافقة ═══
  's-health-consent': {
    title: t('قبل ما نبدأ — نحتاج إذنك', 'Before we start — we need your okay'),
    hint: t('بنسألك عن جسمك وصحتك عشان نحسب لك خطة تناسبك. تقدر ترفض وتستخدم التطبيق.', "We'll ask about your body and health to build a plan that fits. You can decline and still use the app."),
    legal: t(
      'بالموافقة، تأذن بمعالجة البيانات الصحية التي تدخلها لغرض توليد خطة التدريب والتغذية. تُحفظ البيانات على جهازك افتراضيًا، ولا تُزامَن سحابيًا إلا بموافقة منفصلة صريحة. يجوز سحب الموافقة في أي وقت من الإعدادات.',
      'By agreeing, you permit processing of the health data you enter for the purpose of generating your training and nutrition plan. Data is stored on your device by default and is not synced to the cloud without separate explicit consent. You may withdraw consent at any time from Settings.',
    ),
  },

  // ═══ الأساسيات ═══
  'b-age': {
    title: t('كم عمرك؟', 'How old are you?'),
    hint: t('يدخل في حساب طاقتك، وبعض الأهداف ما تُعرض قبل ١٨.', "It feeds your energy targets, and some goals aren't shown under 18."),
  },
  'b-sex': {
    title: t('جنسك؟', 'Your sex?'),
    hint: t('يدخل في معادلة الطاقة بس، ولا يُستخدم لغير ذلك.', "Only used in the energy formula, nothing else."),
    opts: { male: t('ذكر', 'Male'), female: t('أنثى', 'Female') },
  },
  'b-height': { title: t('كم طولك؟', 'How tall are you?'), hint: t('بالسنتيمتر.', 'In centimetres.') },
  'b-weight': { title: t('كم وزنك الحالي؟', 'Your current weight?'), hint: t('تقريبي يكفي — تقدر تحدّثه أي وقت.', 'A rough figure is fine — you can update it anytime.') },
  'b-units': {
    title: t('وش الوحدات اللي تريحك؟', 'Which units suit you?'),
    opts: { metric: t('كيلو وسنتيمتر', 'kg & cm'), imperial: t('رطل وبوصة', 'lb & inches') },
  },
  'b-weight-trend': {
    title: t('وزنك وين رايح آخر ٣ شهور؟', 'Which way has your weight gone in the last 3 months?'),
    hint: t('يساعدنا نعرف نقطة بدايتك بدل ما نفترضها.', 'Helps us read your starting point instead of assuming it.'),
    opts: { rising: t('زايد', 'Going up'), stable: t('ثابت', 'Steady'), falling: t('ناقص', 'Going down'), unknown: t('ما أدري', 'Not sure') },
  },
  'b-target-weight': { title: t('وش الوزن اللي تبيه؟', "What weight are you aiming for?"), hint: t('رقم تقريبي — ما راح نلومك عليه.', 'A ballpark number — no pressure attached.') },
  'b-pace': {
    title: t('تبي التغيير يكون بأي سرعة؟', 'How fast do you want the change?'),
    hint: t('الأسرع يحتاج التزام أعلى، وما هو دايم الأفضل.', 'Faster needs tighter adherence, and faster is not always better.'),
    opts: { gentle: t('على راحتي', 'Take it easy'), steady: t('متوسط وثابت', 'Steady'), aggressive: t('بأقصى ما أقدر', 'Push hard') },
  },
  'b-body-shape': {
    title: t('كيف تشوف جسمك الحين؟', 'How do you see your body right now?'),
    hint: t('تقديرك أنت — ما فيه صح وغلط.', "Your own read — there's no right answer."),
    opts: { lean: t('نحيف', 'Lean'), average: t('عادي', 'Average'), soft: t('فيه ترهّل', 'A bit soft'), large: t('وزن زايد واضح', 'Carrying extra weight'), skip: t('أفضّل ما أجاوب', 'Rather not say') },
  },

  // ═══ الخبرة ═══
  'x-trained-before': {
    title: t('سبق تمرّنت بأوزان؟', 'Have you trained with weights before?'),
    opts: { never: t('لا، أول مرة', 'No, first time'), tried: t('جرّبت شوي', 'Tried a little'), months: t('شهور', 'A few months'), years: t('سنين', 'Years') },
  },
  'x-total-duration': {
    title: t('كم المدة الكلية اللي تمرّنت فيها؟', 'How long have you trained in total?'),
    opts: { lt3: t('أقل من ٣ شهور', 'Under 3 months'), m3_6: t('٣–٦ شهور', '3–6 months'), m6_12: t('٦–١٢ شهر', '6–12 months'), y1_3: t('سنة لـ٣ سنوات', '1–3 years'), y3_plus: t('أكثر من ٣ سنوات', '3+ years') },
  },
  'x-last-trained': {
    title: t('متى آخر مرة تمرّنت بانتظام؟', 'When did you last train regularly?'),
    opts: { now: t('حاليًا', 'Right now'), w2: t('قبل أسبوعين تقريبًا', 'About 2 weeks ago'), m1_3: t('شهر لـ٣ شهور', '1–3 months ago'), m3_12: t('٣ شهور لسنة', '3–12 months ago'), y1_plus: t('أكثر من سنة', 'Over a year ago') },
  },
  'x-consistency': {
    title: t('كيف كان انتظامك؟', 'How consistent were you?'),
    hint: t('هذا أهم من عدد السنين — الانتظام هو اللي يبني.', 'This matters more than years — consistency is what builds.'),
    opts: { rare: t('نادر', 'Rarely'), on_off: t('متقطّع', 'On and off'), mostly: t('غالبًا منتظم', 'Mostly consistent'), steady: t('منتظم ثابت', 'Rock steady') },
  },
  'x-exercise-familiarity': {
    title: t('كم تمرين تعرف تسوّيه صح؟', 'How many exercises can you do correctly?'),
    opts: { none: t('ولا واحد', 'None'), few: t('كم واحد', 'A few'), most: t('معظمها', 'Most'), all: t('كلها تقريبًا', 'Nearly all') },
  },
  'x-program-experience': {
    title: t('سبق مشيت على برنامج مكتوب؟', 'Have you followed a written program?'),
    opts: { never: t('أبدًا', 'Never'), app_only: t('تطبيق بس', 'App only'), followed: t('مشيت على برنامج', 'Followed one'), wrote_own: t('أكتب برنامجي بنفسي', 'I write my own') },
  },
  'x-tracking': {
    title: t('تسجّل مجموعاتك وأوزانك؟', 'Do you log your sets and weights?'),
    opts: { never: t('لا', 'No'), sometimes: t('أحيانًا', 'Sometimes'), always: t('دايمًا', 'Always') },
  },
  'x-progression-understanding': {
    title: t('تعرف كيف تزيد الحمل مع الوقت؟', 'Do you know how to add load over time?'),
    opts: { no: t('لا', 'No'), vaguely: t('فكرة عامة', 'Roughly'), yes: t('إيه أعرف', 'Yes I do') },
  },
  'x-confidence': {
    title: t('كم تحس نفسك واثق داخل النادي؟', 'How confident do you feel in the gym?'),
    hint: t('من ١ (مو مرتاح) لـ٥ (مرتاح تمامًا).', 'From 1 (uneasy) to 5 (totally comfortable).'),
  },
  'x-coached': {
    title: t('سبق تمرّنت مع مدرّب؟', 'Have you worked with a coach?'),
    opts: { never: t('لا', 'No'), past: t('سابقًا', 'In the past'), now: t('حاليًا', 'Currently') },
  },
  'x-guidance-pref': {
    title: t('تبي التطبيق يمسك يدك ولا يخلّيك؟', 'Want the app to guide you closely or step back?'),
    opts: { hand_hold: t('وضّح لي كل شي', 'Walk me through it'), balanced: t('بين بين', 'Somewhere between'), minimal: t('أعطني الخطة وبس', 'Just give me the plan') },
  },
  'x-return-reason': {
    title: t('وش وقّفك آخر مرة؟', 'What stopped you last time?'),
    hint: t('نسأل عشان نتفاداه، مو عشان نلومك.', "We ask to design around it, not to judge."),
    opts: { injury: t('إصابة', 'Injury'), time: t('الوقت', 'Time'), motivation: t('الحماس', 'Motivation'), life: t('ظروف', 'Life happened'), other: t('غير ذلك', 'Something else') },
  },
  'x-return-ramp': {
    title: t('تبي ترجع بالتدريج ولا مباشرة؟', 'Ease back in or go straight in?'),
    opts: { easy: t('بالتدريج', 'Ease in'), normal: t('عادي', 'Normal'), straight: t('مباشرة', 'Straight in') },
  },
  'x-prev-results': {
    title: t('آخر برنامج مشيت عليه — كيف كانت النتيجة؟', 'Your last program — how did it go?'),
    opts: { good: t('زينة', 'Went well'), mixed: t('متفاوتة', 'Mixed'), none: t('ما تغيّر شي', 'Nothing changed'), never_ran: t('ما كمّلته', "Didn't finish it") },
  },
  'x-selfrated-level': {
    title: t('لو تقيّم نفسك، وش مستواك؟', 'How would you rate yourself?'),
    opts: { beginner: t('مبتدئ', 'Beginner'), intermediate: t('متوسط', 'Intermediate'), advanced: t('متقدّم', 'Advanced') },
  },
  'x-technique-check': {
    title: t('كيف أداؤك بحركات البار؟', 'How is your barbell technique?'),
    opts: { no_idea: t('ما جرّبتها', "Haven't tried"), basic: t('أساسيات', 'Basics'), confident: t('واثق', 'Confident') },
  },
  'x-warmup-habit': {
    title: t('تسخّن قبل التمرين؟', 'Do you warm up?'),
    opts: { never: t('لا', 'No'), sometimes: t('أحيانًا', 'Sometimes'), always: t('دايمًا', 'Always') },
  },
  'x-failure-familiarity': {
    title: t('تمرّنت لين ما تعجز عن التكرار؟', 'Have you trained to the point you cannot do another rep?'),
    opts: { no: t('لا', 'No'), sometimes: t('أحيانًا', 'Sometimes'), yes: t('إيه', 'Yes') },
  },
  'x-strength-marker': {
    title: t('سكوات بوزن جسمك — وين أنت منه؟', 'Squatting your bodyweight — where are you?'),
    opts: { unknown: t('ما قسته', "Haven't measured"), bodyweight_under: t('أقل منه', 'Below it'), bodyweight_around: t('قريب منه', 'Around it'), bodyweight_over: t('أكثر منه', 'Above it') },
  },
  'x-session-tolerance': {
    title: t('التمرين الطويل يتعبك؟', 'Do long sessions wear you out?'),
    opts: { short: t('أفضّل قصير', 'Prefer short'), medium: t('متوسط يناسبني', 'Medium suits me'), long: t('أتحمّل الطويل', 'Long is fine') },
  },
  'x-other-sport-history': {
    title: t('عندك خلفية رياضية ثانية؟', 'Any other sport background?'),
    opts: { none: t('لا', 'None'), recreational: t('ألعب للمتعة', 'Recreational'), competitive: t('تنافسي', 'Competitive') },
  },

  // ═══ الأهداف ═══
  'g-primary': {
    title: t('وش هدفك الأساسي؟', "What's your main goal?"),
    hint: t('تقدر تغيّره أي وقت.', 'You can change it anytime.'),
    opts: {
      fat_loss: t('أنقص دهون', 'Lose fat'),
      muscle_gain: t('أبني عضل', 'Build muscle'),
      general_health: t('صحة عامة', 'General health'),
      get_fitter: t('لياقة أحسن', 'Get fitter'),
      recomp: t('أنقص دهون وأبني عضل', 'Lose fat and build muscle'),
      strength: t('أصير أقوى', 'Get stronger'),
    },
  },
  'g-secondary': {
    title: t('فيه هدف ثاني جنبه؟', 'Any second goal alongside it?'),
    opts: { none: t('لا، واحد يكفي', 'No, one is enough'), fat_loss: t('نقص دهون', 'Fat loss'), muscle_gain: t('بناء عضل', 'Muscle'), strength: t('قوة', 'Strength'), endurance: t('نفَس أطول', 'Endurance'), mobility: t('مرونة', 'Mobility'), posture: t('وقفة أحسن', 'Posture') },
  },
  'g-fatloss-focus': {
    title: t('وش الأهم لك وأنت تنقص؟', "What matters most while you cut?"),
    opts: { keep_muscle: t('أحافظ على عضلي', 'Keep my muscle'), fastest: t('أسرع نتيجة', 'Fastest result'), sustainable: t('شي أقدر أكمله', 'Something I can sustain') },
  },
  'g-gain-focus': {
    title: t('تبي حجم ولا قوة؟', 'Size or strength?'),
    opts: { size: t('حجم', 'Size'), strength: t('قوة', 'Strength'), both: t('الاثنين', 'Both') },
  },
  'g-recomp-bias': {
    title: t('لو نميل شوي، لأي جهة؟', 'If we lean slightly, which way?'),
    opts: { lean_first: t('النقص أول', 'Leaner first'), balanced: t('متوازن', 'Balanced'), muscle_first: t('العضل أول', 'Muscle first') },
  },
  'g-health-driver': {
    title: t('وش اللي تبي يتحسّن أكثر شي؟', 'What do you most want to improve?'),
    hint: t('اختر لين ثلاثة.', 'Pick up to three.'),
    opts: { energy: t('طاقتي', 'My energy'), sleep: t('نومي', 'My sleep'), mood: t('مزاجي', 'My mood'), blood_markers: t('تحاليلي', 'My blood markers'), mobility: t('حركتي', 'My mobility'), daily_ease: t('راحة يومي', 'Everyday ease') },
  },
  'g-cardio-willing': {
    title: t('وش رايك بالكارديو؟', 'How do you feel about cardio?'),
    opts: { no: t('ما أبيه', 'Not for me'), little: t('شوي يمشي الحال', 'A little is fine'), yes: t('عادي', "I'm fine with it"), love_it: t('أحبه', 'I love it') },
  },
  'g-horizon': {
    title: t('تفكّر بمدى كم؟', "What timeframe are you thinking?"),
    opts: { m1: t('شهر', 'A month'), m3: t('٣ شهور', '3 months'), m6: t('٦ شهور', '6 months'), ongoing: t('نمط حياة', 'Ongoing') },
  },
  'g-event': { title: t('فيه مناسبة قدّامك؟', 'Is there an event coming up?') },
  'g-muscle-priority': {
    title: t('فيه منطقة تبي تركّز عليها؟', 'Any area you want to focus on?'),
    hint: t('لين ثلاثة.', 'Up to three.'),
    opts: { chest: t('صدر', 'Chest'), back: t('ظهر', 'Back'), shoulders: t('أكتاف', 'Shoulders'), arms: t('ذراعين', 'Arms'), legs: t('أرجل', 'Legs'), glutes: t('مؤخرة', 'Glutes'), core: t('وسط', 'Core'), balanced: t('كل شي بالتساوي', 'Keep it even') },
  },
  'g-weak-point': {
    title: t('فيه منطقة متأخرة عن باقي جسمك؟', 'Any area lagging behind?'),
    opts: { none: t('لا', 'No'), chest: t('صدر', 'Chest'), back: t('ظهر', 'Back'), shoulders: t('أكتاف', 'Shoulders'), arms: t('ذراعين', 'Arms'), legs: t('أرجل', 'Legs'), glutes: t('مؤخرة', 'Glutes'), core: t('وسط', 'Core') },
  },
  'g-posture-concern': { title: t('وقفتك تضايقك؟', 'Does your posture bother you?') },
  'g-mobility-goal': {
    title: t('المرونة مهمة لك؟', 'Is mobility important to you?'),
    opts: { no: t('لا', 'Not really'), some: t('شوي', 'Somewhat'), priority: t('أولوية', 'A priority') },
  },
  'g-performance-sport': {
    title: t('تلعب رياضة معيّنة؟', 'Do you play a particular sport?'),
    opts: { none: t('لا', 'None'), football: t('كرة قدم', 'Football'), running: t('جري', 'Running'), combat: t('رياضة قتالية', 'Combat sport'), padel: t('بادل', 'Padel'), swimming: t('سباحة', 'Swimming'), other: t('غيرها', 'Something else') },
  },
  'g-endurance-target': {
    title: t('فيه هدف نفَس معيّن؟', 'Any endurance target?'),
    opts: { none: t('لا', 'None'), walk_longer: t('أمشي أطول', 'Walk longer'), run_5k: t('أجري ٥ كم', 'Run 5k'), run_10k: t('أجري ١٠ كم', 'Run 10k'), stairs: t('أطلع الدرج بلا نهجة', 'Stairs without puffing') },
  },
  'g-motivation-driver': {
    title: t('وش اللي يحرّكك أكثر؟', 'What drives you most?'),
    opts: { look: t('شكلي', 'How I look'), health: t('صحتي', 'My health'), strength: t('قوتي', 'My strength'), habit: t('عادة ثابتة', 'A steady habit'), competition: t('المنافسة', 'Competition') },
  },
  'g-past-obstacle': {
    title: t('وش أكثر شي وقفك قبل؟', "What's stopped you before?"),
    opts: { time: t('الوقت', 'Time'), motivation: t('الحماس', 'Motivation'), injury: t('إصابة', 'Injury'), confusion: t('ما أدري وش أسوي', "Not knowing what to do"), travel: t('السفر', 'Travel'), none: t('ما فيه', 'Nothing') },
  },
  'g-success-metric': {
    title: t('وش المقياس اللي يهمك؟', 'Which measure matters to you?'),
    opts: { scale: t('الميزان', 'The scale'), mirror: t('المرايا', 'The mirror'), measurements: t('المقاسات', 'Measurements'), lifts: t('أوزاني بالتمرين', 'My lifts'), how_i_feel: t('إحساسي', 'How I feel') },
  },
  'g-plan-adherence-style': {
    title: t('تحب الخطة تكون صارمة ولا مرنة؟', 'Strict plan or flexible one?'),
    opts: { strict: t('صارمة', 'Strict'), flexible: t('مرنة', 'Flexible'), minimal: t('أقل شي ممكن', 'As light as possible') },
  },
  'g-body-focus-balance': {
    title: t('علوي ولا سفلي أهم لك؟', 'Upper body or lower body more important?'),
    opts: { upper: t('علوي', 'Upper'), balanced: t('متوازن', 'Balanced'), lower: t('سفلي', 'Lower') },
  },
  'g-plateau': { title: t('حاس إنك واقف مكانك؟', 'Feel like you have stalled?') },
  'g-nutrition-interest': {
    title: t('تبي منّا شي بالأكل؟', 'Want anything from us on food?'),
    opts: { numbers_only: t('أرقام بس', 'Just numbers'), meal_ideas: t('أفكار وجبات', 'Meal ideas'), both: t('الاثنين', 'Both'), skip: t('لا شكرًا', 'No thanks') },
  },

  // ═══ الفرز الآمن ═══
  's-screen-gate': {
    title: t('نسألك كم سؤال سلامة — ثانية وحدة', 'A few quick safety questions — one moment'),
    hint: t('عشان ما نعطيك تمارين ما تناسب حالتك. تقدر تتخطاها.', "So we don't hand you exercises that don't suit you. You can skip."),
  },
  's-chest-pain': {
    title: t('حسّيت بألم بصدرك وقت المجهود؟', 'Have you had chest pain during effort?'),
    hint: t('سؤال فرز — إحنا ما نشخّص.', "A screening question — we don't diagnose."),
  },
  's-fainting': { title: t('صار لك دوخة أو إغماء وقت المجهود؟', 'Have you felt faint or dizzy during effort?') },
  's-doctor-restriction': { title: t('فيه دكتور قال لك تتجنب شي معيّن؟', 'Has a doctor told you to avoid something?') },
  's-restriction-area': { title: t('وش المناطق اللي قالك تتجنبها؟', 'Which areas were you told to avoid?'), opts: AREAS },
  's-recent-surgery': { title: t('سويت عملية آخر ٦ شهور؟', 'Any surgery in the last 6 months?') },
  's-surgery-when': {
    title: t('متى كانت؟', 'When was it?'),
    opts: { under6w: t('أقل من ٦ أسابيع', 'Under 6 weeks'), w6_12: t('٦–١٢ أسبوع', '6–12 weeks'), m3_6: t('٣–٦ شهور', '3–6 months'), over6m: t('أكثر من ٦ شهور', 'Over 6 months') },
  },
  's-surgery-area': { title: t('وش المنطقة؟', 'Which area?'), opts: AREAS },
  's-pregnancy': {
    title: t('فيه حمل أو ولادة قريبة؟', 'Pregnancy or recent birth?'),
    hint: t('اختياري — ونحترم إذا ما تبين تجاوبين.', "Optional — and it's fine to skip."),
    opts: { no: t('لا', 'No'), pregnant: t('حامل', 'Pregnant'), postpartum: t('بعد الولادة', 'Postpartum'), prefer_not: t('أفضّل ما أجاوب', 'Rather not say') },
  },
  's-older-adult': {
    title: t('فيه شي من هذي تبي ننتبه له؟', 'Anything here you want us to mind?'),
    opts: { none: t('ولا شي', 'Nothing'), balance: t('التوازن', 'Balance'), joints: t('المفاصل', 'Joints'), blood_pressure: t('الضغط', 'Blood pressure'), bone_density: t('العظام', 'Bone health') },
  },
  's-breathing': { title: t('عندك ضيق نفس مع المجهود؟', 'Do you get short of breath with effort?') },
  's-dizziness-on-effort': { title: t('تجيك دوخة إذا زاد المجهود؟', 'Do you get light-headed when effort rises?') },
  's-clearance-ack': {
    title: t('نحتاج تأكيدك', 'We need your acknowledgement'),
    hint: t('جوابك يخلينا نبعد التمارين عالية الخطورة، وننصحك تراجع مختصّ قبل ما تزيد الحمل.', "Your answer means we hold back higher-risk work, and we suggest seeing a professional before you add load."),
  },

  // ═══ القيود ═══
  'l-has-injury': {
    title: t('عندك إصابة أو ألم يمنعك من حركة؟', 'Any injury or pain that limits a movement?'),
    opts: { none: t('لا', 'No'), past: t('سابقة وخفّت', 'Past, healed'), current: t('حالية', 'Current') },
  },
  'l-current-areas': { title: t('وين بالضبط؟', 'Where exactly?'), hint: t('اختر كل المناطق اللي تنطبق.', 'Pick every area that applies.'), opts: AREAS },
  'l-past-areas': { title: t('وين كانت؟', 'Where was it?'), opts: AREAS },
  'l-past-recovered': {
    title: t('رجعت طبيعية؟', 'Is it back to normal?'),
    opts: { fully: t('تمامًا', 'Fully'), mostly: t('غالبًا', 'Mostly'), flares: t('ترجع أحيانًا', 'It flares up') },
  },
  'l-pain-on-movement': {
    title: t('أي حركة تألمك؟', 'Which movements hurt?'),
    hint: t('هذا اللي بنستبعده فعلًا من خطتك.', "This is what we'll actually leave out of your plan."),
    opts: { none: t('ولا وحدة', 'None'), push: t('الدفع', 'Pushing'), pull: t('السحب', 'Pulling'), squat: t('القرفصاء', 'Squatting'), hinge: t('الانحناء', 'Hinging'), overhead: t('فوق الرأس', 'Overhead'), twist: t('اللف', 'Twisting'), impact: t('القفز والجري', 'Jumping and running') },
  },
  'l-pain-level': { title: t('الألم كم من ١٠؟', 'How bad is the pain out of 10?') },
  'l-shoulder-overhead': {
    title: t('ترفع فوق راسك؟', 'Can you press overhead?'),
    opts: { fine: t('عادي', 'Fine'), uncomfortable: t('مو مريح', 'Uncomfortable'), cannot: t('ما أقدر', 'I cannot') },
  },
  'l-knee-depth': {
    title: t('تنزل بالسكوات لأي عمق؟', 'How deep can you squat?'),
    opts: { full: t('كامل', 'Full depth'), partial: t('نص', 'Partial'), minimal: t('بالكاد', 'Barely') },
  },
  'l-back-hinge': {
    title: t('تنحني وترفع من الأرض؟', 'Can you hinge and lift from the floor?'),
    opts: { fine: t('عادي', 'Fine'), light_only: t('خفيف بس', 'Light only'), avoid: t('أتجنبها', 'I avoid it') },
  },
  'l-wrist-grip': {
    title: t('قبضتك ورسغك؟', 'Your wrist and grip?'),
    opts: { fine: t('عادي', 'Fine'), straps_needed: t('أحتاج حزام', 'I need straps'), limited: t('محدودة', 'Limited') },
  },
  'l-balance': {
    title: t('توازنك؟', 'Your balance?'),
    opts: { none: t('ممتاز', 'No issues'), some: t('فيه شوي', 'A little shaky'), significant: t('ضعيف', 'Poor') },
  },
  'l-rom-limits': { title: t('فيه مفصل حركته محدودة؟', 'Any joint with limited range?'), opts: AREAS },
  'l-joint-sensitivity': {
    title: t('فيه مفصل يزعجك مع الحمل؟', 'Any joint that complains under load?'),
    opts: { none: t('لا', 'None'), shoulder: t('كتف', 'Shoulder'), elbow: t('كوع', 'Elbow'), wrist: t('رسغ', 'Wrist'), hip: t('ورك', 'Hip'), knee: t('ركبة', 'Knee'), ankle: t('كاحل', 'Ankle') },
  },
  'l-impact-tolerance': {
    title: t('القفز والجري يناسبك؟', 'Are jumping and running okay for you?'),
    opts: { fine: t('عادي', 'Fine'), limited: t('محدود', 'Limited'), none: t('لا أبدًا', 'Not at all') },
  },
  'l-medication-effect': {
    title: t('تاخذ دواء يأثّر على مجهودك؟', 'Any medication affecting your effort?'),
    opts: { none: t('لا', 'No'), some: t('إيه', 'Yes'), prefer_not: t('أفضّل ما أجاوب', 'Rather not say') },
  },
  'l-notes': { title: t('تبي تضيف تفصيل؟', 'Want to add any detail?'), hint: t('اختياري — يقراه إنسان مو فلتر.', 'Optional — a human reads this, not a filter.') },
  'l-cannot-perform': { title: t('فيه تمارين ما تقدر عليها؟', 'Any exercises you cannot do?'), hint: t('بنشيلها من خطتك نهائيًا.', "We'll leave these out entirely.") },
  'l-standing-tolerance': {
    title: t('الوقوف الطويل يناسبك؟', 'Is standing for a while okay?'),
    opts: { fine: t('عادي', 'Fine'), limited: t('محدود', 'Limited'), seated_only: t('أفضّل جالس', 'Seated please') },
  },
  'l-breath-holding': { title: t('قالك أحد تتجنب حبس النفس بالرفع؟', 'Told to avoid holding your breath when lifting?') },

  // ═══ التوافر ═══
  'a-days': {
    title: t('كم يوم بالأسبوع تقدر تتمرّن؟', 'How many days a week can you train?'),
    hint: t('اختر اللي تقدر تلتزم فيه فعلًا.', 'Pick what you can actually stick to.'),
    opts: { '2': t('يومين', '2 days'), '3': t('٣ أيام', '3 days'), '4': t('٤ أيام', '4 days'), '5': t('٥ أيام', '5 days'), '6': t('٦ أيام', '6 days') },
  },
  'a-session-minutes': {
    title: t('كم دقيقة للتمرين الواحد؟', 'How long per session?'),
    opts: { '20': t('٢٠ دقيقة', '20 min'), '30': t('٣٠ دقيقة', '30 min'), '45': t('٤٥ دقيقة', '45 min'), '60': t('ساعة', '60 min'), '75': t('٧٥ دقيقة', '75 min'), '90': t('ساعة ونص', '90 min') },
  },
  'a-preferred-days': { title: t('أي أيام تناسبك؟', 'Which days suit you?') },
  'a-time-of-day': {
    title: t('متى تفضّل تتمرّن؟', 'When do you prefer to train?'),
    opts: { early: t('قبل الفجر', 'Very early'), morning: t('الصبح', 'Morning'), afternoon: t('العصر', 'Afternoon'), evening: t('المغرب', 'Evening'), late: t('متأخر', 'Late night'), varies: t('يختلف', 'It varies') },
  },
  'a-schedule-flex': {
    title: t('جدولك ثابت ولا يتغيّر؟', 'Is your schedule fixed or shifting?'),
    opts: { fixed: t('ثابت', 'Fixed'), somewhat: t('شوي مرن', 'Somewhat flexible'), flexible: t('مرن', 'Flexible') },
  },
  'a-travel': {
    title: t('تسافر كثير؟', 'Do you travel much?'),
    opts: { never: t('لا', 'Never'), rare: t('نادر', 'Rarely'), monthly: t('كل شهر', 'Monthly'), weekly: t('كل أسبوع', 'Weekly') },
  },
  'a-commute': {
    title: t('كم ياخذ منك الوصول للنادي؟', 'How long to reach the gym?'),
    opts: { at_home: t('بالبيت', 'At home'), under10: t('أقل من ١٠ دقايق', 'Under 10 min'), under30: t('أقل من نص ساعة', 'Under 30 min'), over30: t('أكثر', 'Longer') },
  },
  'a-busy-season': { title: t('جاي عليك موسم شغل ضاغط؟', 'A busy stretch coming up?') },
  'a-min-session': {
    title: t('لو ضاق وقتك، كم أقل مدة تقبلها؟', 'If time gets tight, what is your minimum?'),
    opts: { '10': t('١٠ دقايق', '10 min'), '15': t('١٥ دقيقة', '15 min'), '20': t('٢٠ دقيقة', '20 min'), '30': t('٣٠ دقيقة', '30 min') },
  },
  'a-weekend-different': { title: t('نهاية الأسبوع تختلف عندك؟', 'Is your weekend different?') },
  'a-can-add-day': { title: t('تقدر تزيد يوم لو احتجنا؟', 'Could you add a day if needed?') },
  'a-rest-day-pref': {
    title: t('كيف تبي أيام الراحة؟', 'How do you want rest days?'),
    opts: { spread: t('موزّعة', 'Spread out'), block: t('متتالية', 'Together'), no_pref: t('ما يفرق', 'No preference') },
  },
  // 'a-ramadan-aware' حُذف بـ[CTO-76] القرار ٢ — السياق الخليجي افتراض لا سؤال.
  'a-heat-sensitivity': {
    title: t('الحر يأثّر عليك؟', 'Does the heat affect you?'),
    opts: { fine: t('عادي', 'Fine'), some: t('شوي', 'A bit'), avoid: t('أتجنبه', 'I avoid it') },
  },

  // ═══ المكان والمعدّات ═══
  'e-place': {
    title: t('وين بتتمرّن؟', 'Where will you train?'),
    opts: { gym: t('نادي', 'Gym'), home: t('البيت', 'Home'), outdoor: t('برّا', 'Outdoors'), mixed: t('يختلف', 'Mix of places') },
  },
  'e-equipment-list': {
    title: t('وش المتوفر عندك؟', 'What do you have?'),
    hint: t('نبني خطتك على اللي عندك فعلًا.', "We'll build on what you actually have."),
    opts: {
      machine: t('أجهزة', 'Machines'), bodyweight: t('وزن الجسم', 'Bodyweight'), dumbbell: t('دمبل', 'Dumbbells'), cable: t('كيبل', 'Cables'),
      barbell: t('بار', 'Barbell'), bench: t('مقعد', 'Bench'), 'ez-bar': t('بار متعرّج', 'EZ bar'), band: t('أستك', 'Bands'),
      smith: t('سميث', 'Smith machine'), rope: t('حبل', 'Rope'), plate: t('أوزان حرة', 'Plates'), kettlebell: t('كيتل بل', 'Kettlebell'),
    },
  },
  'e-gym-type': {
    title: t('ناديك كيف؟', "What's your gym like?"),
    opts: { full: t('مجهّز كامل', 'Fully equipped'), machines_only: t('أجهزة بس', 'Machines only'), hotel: t('نادي فندق', 'Hotel gym'), ladies: t('نادي نسائي', 'Ladies gym'), crossfit: t('كروسفت', 'CrossFit box') },
  },
  'e-crowded': {
    title: t('ناديك زحمة؟', 'Is your gym busy?'),
    opts: { never: t('لا', 'Never'), sometimes: t('أحيانًا', 'Sometimes'), always: t('دايمًا', 'Always') },
  },
  'e-dumbbell-kind': {
    title: t('دمبلاتك أي نوع؟', 'What kind of dumbbells?'),
    opts: { fixed_pair: t('زوج ثابت', 'One fixed pair'), adjustable: t('قابلة للتعديل', 'Adjustable'), set: t('طقم كامل', 'A full set') },
  },
  'e-dumbbell-max': { title: t('أثقل دمبل عندك كم؟', 'Heaviest dumbbell you have?') },
  'e-plate-max': { title: t('أقصى وزن تقدر تحطه على البار؟', 'Max weight you can load on the bar?') },
  'e-rack': {
    title: t('عندك حامل للبار؟', 'Do you have a rack?'),
    hint: t('يحدّد وش نقدر نعطيك بأمان.', 'It decides what we can safely give you.'),
    opts: { none: t('لا', 'No'), stands: t('حوامل بسيطة', 'Simple stands'), full_rack: t('قفص كامل', 'Full rack') },
  },
  'e-bench-kind': {
    title: t('مقعدك أي نوع؟', 'What kind of bench?'),
    opts: { none: t('ما عندي', "Don't have one"), flat: t('مستوي', 'Flat'), adjustable: t('قابل للميل', 'Adjustable') },
  },
  'e-bodyweight-only-confirm': {
    title: t('يعني وزن جسمك بس؟', 'So bodyweight only?'),
    hint: t('نتأكد بس — نقدر نعطيك خطة كاملة بوزن الجسم.', 'Just checking — we can build a full bodyweight plan.'),
  },
  'e-pullup-bar': { title: t('عندك عقلة؟', 'Do you have a pull-up bar?') },
  'e-space': {
    title: t('كم المساحة عندك؟', 'How much space do you have?'),
    opts: { tiny: t('ضيقة', 'Tight'), room: t('غرفة', 'A room'), garage: t('كراج', 'A garage'), outdoor: t('برّا', 'Outdoors') },
  },
  'e-noise-limit': { title: t('لازم تتمرّن بهدوء؟', 'Do you need to keep it quiet?') },
  'e-cardio-machines': {
    title: t('فيه أجهزة كارديو؟', 'Any cardio machines?'),
    opts: { none: t('لا', 'None'), treadmill: t('مشاية', 'Treadmill'), bike: t('دراجة', 'Bike'), elliptical: t('إليبتكال', 'Elliptical'), rower: t('تجديف', 'Rower'), stairs: t('درج', 'Stair climber') },
  },
  'e-bands-only-detail': {
    title: t('أستكاتك قوتها كم؟', 'How strong are your bands?'),
    opts: { light: t('خفيفة', 'Light'), mixed: t('متنوّعة', 'Mixed'), heavy: t('ثقيلة', 'Heavy') },
  },
  'e-travel-fallback': {
    title: t('وأنت مسافر، وش تسوي؟', 'When travelling, what do you do?'),
    opts: { hotel_gym: t('نادي الفندق', 'Hotel gym'), bodyweight: t('وزن جسمي', 'Bodyweight'), bands: t('أستكات', 'Bands'), skip_training: t('أوقف', 'I pause') },
  },
  'e-machine-access': {
    title: t('كم جهاز متوفر لك؟', 'How many machines do you have access to?'),
    opts: { none: t('ولا واحد', 'None'), few: t('كم واحد', 'A few'), most: t('معظمها', 'Most'), all: t('كلها', 'All of them') },
  },
  'e-spotter': { title: t('فيه أحد يأمّن عليك؟', 'Is anyone there to spot you?') },
  'e-equipment-confidence': {
    title: t('تعرف تستخدم الأجهزة؟', 'Do you know how to use the machines?'),
    opts: { lost: t('لا', 'Not really'), basics: t('الأساسيات', 'The basics'), confident: t('إيه', 'Yes') },
  },
  'e-weather-dependency': { title: t('تمرينك يعتمد على الجو؟', 'Does the weather decide your training?') },

  // ═══ التفضيلات ═══
  'p-style': {
    title: t('وش يريحك أكثر؟', 'What suits you best?'),
    opts: { machines: t('أجهزة', 'Machines'), free_weights: t('أوزان حرة', 'Free weights'), mixed: t('مزيج', 'A mix'), bodyweight: t('وزن الجسم', 'Bodyweight') },
  },
  'p-compound-bias': {
    title: t('حركات كبيرة ولا عزل؟', 'Big lifts or isolation?'),
    opts: { compound: t('حركات كبيرة', 'Big lifts'), balanced: t('متوازن', 'Balanced'), isolation: t('عزل', 'Isolation') },
  },
  'p-disliked': { title: t('فيه تمارين ما تحبها؟', 'Any exercises you dislike?'), hint: t('ما بنشيلها بالغصب — بس بننزّل ترتيبها.', "We won't force them out — just push them down the list.") },
  'p-preferred': { title: t('فيه تمارين تحبها؟', 'Any exercises you love?'), hint: t('بنقدّمها لك بالخطة.', "We'll bring these forward in your plan.") },
  'p-variety': {
    title: t('تحب التغيير بالتمارين؟', 'Do you like variety?'),
    opts: { same: t('نفس الشي', 'Keep it the same'), some: t('شوي تغيير', 'A little variety'), lots: t('تغيير كثير', 'Lots of variety') },
  },
  'p-cardio-type': {
    title: t('أي كارديو تحب؟', 'Which cardio do you enjoy?'),
    opts: { walk: t('مشي', 'Walking'), run: t('جري', 'Running'), bike: t('دراجة', 'Cycling'), row: t('تجديف', 'Rowing'), swim: t('سباحة', 'Swimming'), stairs: t('درج', 'Stairs'), sport: t('رياضة', 'A sport'), hiit: t('متقطّع عالي الشدة', 'Intervals') },
  },
  'p-cardio-timing': {
    title: t('متى تفضّل الكارديو؟', 'When do you want the cardio?'),
    opts: { after_lifting: t('بعد الأوزان', 'After lifting'), separate_day: t('يوم مستقل', 'Its own day'), before: t('قبل الأوزان', 'Before lifting'), no_pref: t('ما يفرق', 'No preference') },
  },
  'p-superset-tolerance': {
    title: t('تقبل تمرينين ورا بعض بلا راحة؟', 'Okay pairing two exercises back to back?'),
    hint: t('يوفّر وقت.', 'It saves time.'),
    opts: { no: t('لا', 'No'), ok: t('عادي', 'Fine'), prefer: t('أفضّلها', 'I prefer it') },
  },
  'p-rest-preference': {
    title: t('كم تحب الراحة بين المجموعات؟', 'How long between sets?'),
    opts: { short: t('قصيرة', 'Short'), moderate: t('متوسطة', 'Moderate'), long: t('طويلة', 'Long'), auto: t('اختاروا لي', 'Pick for me') },
  },
  'p-music-cue-pref': {
    title: t('كم توجيه تبي داخل التمرين؟', 'How much guidance during the session?'),
    opts: { minimal: t('أقل شي', 'Minimal'), normal: t('عادي', 'Normal'), detailed: t('مفصّل', 'Detailed') },
  },
  'p-solo-or-partner': {
    title: t('تتمرّن لحالك؟', 'Do you train alone?'),
    opts: { solo: t('لحالي', 'Alone'), partner: t('مع شريك', 'With a partner'), group: t('مجموعة', 'In a group') },
  },
  'p-mirror-avoid': {
    title: t('الزحمة تضايقك؟', 'Do crowds bother you?'),
    opts: { fine: t('عادي', 'Fine'), prefer_quiet: t('أفضّل الهدوء', 'Prefer it quiet'), avoid_busy: t('أتجنب الزحمة', 'I avoid busy times') },
  },
  'p-machine-vs-free-reason': {
    title: t('ليش اخترت هذا الأسلوب؟', 'Why that style?'),
    opts: { safety: t('أأمن', 'Feels safer'), simplicity: t('أسهل', 'Simpler'), results: t('نتايج أحسن', 'Better results'), enjoyment: t('أستمتع فيه', 'I enjoy it') },
  },
  'p-session-structure': {
    title: t('تبي ترتيب ثابت للتمارين؟', 'Fixed exercise order?'),
    opts: { fixed_order: t('ثابت', 'Fixed'), flexible_order: t('مرن', 'Flexible') },
  },
  'p-substitution-openness': {
    title: t('لو الجهاز مشغول، نبدّل لك؟', 'If a machine is taken, shall we swap?'),
    opts: { never: t('لا، أنتظر', "No, I'll wait"), when_busy: t('إذا كان زحمة', 'When it is busy'), always_ok: t('عادي دايمًا', 'Always fine') },
  },
  'p-warmup-time': {
    title: t('كم وقت للإحماء؟', 'How much warm-up?'),
    opts: { none: t('بلا', 'None'), short: t('قصير', 'Short'), full: t('كامل', 'Full') },
  },
  'p-stretch-time': {
    title: t('كم وقت للإطالة بالنهاية؟', 'How much stretching at the end?'),
    opts: { none: t('بلا', 'None'), short: t('قصير', 'Short'), full: t('كامل', 'Full') },
  },
  'p-exercise-complexity': {
    title: t('تبي تمارين بسيطة ولا فنية؟', 'Simple exercises or technical ones?'),
    opts: { simple: t('بسيطة', 'Simple'), moderate: t('متوسطة', 'Moderate'), technical: t('فنية', 'Technical') },
  },
  'p-unilateral': {
    title: t('تمارين الجهة الوحدة؟', 'Single-side exercises?'),
    opts: { avoid: t('أتجنبها', 'I avoid them'), ok: t('عادي', 'Fine'), prefer: t('أفضّلها', 'I prefer them') },
  },
  'p-home-noise-style': { title: t('نتجنب القفز والدق؟', 'Shall we avoid jumping and banging?') },

  // ═══ التعافي ═══
  'r-sleep-hours': {
    title: t('كم تنام باليوم؟', 'How much do you sleep?'),
    hint: t('النوم يحدّد كم نقدر نحمّلك.', 'Sleep decides how much we can load you.'),
    opts: { lt5: t('أقل من ٥ ساعات', 'Under 5 hours'), h5_6: t('٥–٦', '5–6 hours'), h6_7: t('٦–٧', '6–7 hours'), h7_8: t('٧–٨', '7–8 hours'), gt8: t('أكثر من ٨', 'Over 8 hours') },
  },
  'r-sleep-quality': {
    title: t('نومك مريح؟', 'Is your sleep restful?'),
    opts: { poor: t('لا', 'Not really'), fair: t('متوسط', 'So-so'), good: t('إيه', 'Yes') },
  },
  'r-stress': {
    title: t('كم الضغط عليك هالفترة؟', 'How much stress lately?'),
    opts: { low: t('قليل', 'Low'), moderate: t('متوسط', 'Moderate'), high: t('عالي', 'High') },
  },
  'r-work-type': {
    title: t('شغلك كيف؟', "What's your work like?"),
    opts: { desk: t('مكتبي', 'Desk based'), mixed: t('مختلط', 'Mixed'), standing: t('وقوف', 'On my feet'), physical: t('بدني', 'Physical'), shift: t('ورديات', 'Shift work') },
  },
  'r-daily-steps': {
    title: t('كم تمشي باليوم تقريبًا؟', 'Roughly how many steps a day?'),
    opts: { lt3k: t('أقل من ٣ آلاف', 'Under 3,000'), k3_6: t('٣–٦ آلاف', '3,000–6,000'), k6_10: t('٦–١٠ آلاف', '6,000–10,000'), gt10k: t('أكثر من ١٠ آلاف', 'Over 10,000'), unknown: t('ما أدري', 'No idea') },
  },
  'r-soreness-history': {
    title: t('كيف تجيك عضلاتك بعد التمرين؟', 'How sore do you get after training?'),
    opts: { rare: t('نادر توجعني', 'Rarely sore'), normal: t('عادي', 'Normal'), lingering: t('توجعني أيام', 'Sore for days') },
  },
  'r-fatigue-after-session': {
    title: t('بعد التمرين تحس بنفسك كيف؟', 'How do you feel after a session?'),
    opts: { energised: t('منشّط', 'Energised'), normal: t('عادي', 'Normal'), wiped: t('منهك', 'Wiped out') },
  },
  'r-other-sport-now': {
    title: t('تمارس رياضة ثانية حاليًا؟', 'Playing any other sport now?'),
    opts: { none: t('لا', 'No'), light: t('خفيف', 'Lightly'), regular: t('بانتظام', 'Regularly'), competitive: t('تنافسي', 'Competitively') },
  },
  'r-sport-days': {
    title: t('كم يوم بالأسبوع؟', 'How many days a week?'),
    opts: { '1': t('يوم', '1 day'), '2': t('يومين', '2 days'), '3': t('٣ أيام', '3 days'), '4plus': t('٤ أو أكثر', '4 or more') },
  },
  'r-hydration': {
    title: t('تشرب ماي كفاية؟', 'Do you drink enough water?'),
    opts: { low: t('لا', 'Not really'), ok: t('متوسط', 'So-so'), good: t('إيه', 'Yes') },
  },
  'r-meals-per-day': {
    title: t('كم وجبة تاكل باليوم؟', 'How many meals a day?'),
    opts: { '1_2': t('وجبة أو وجبتين', '1–2'), '3': t('ثلاث', '3'), '4': t('أربع', '4'), '5plus': t('خمس أو أكثر', '5 or more') },
  },
  'r-appetite': {
    title: t('شهيتك كيف؟', "How's your appetite?"),
    opts: { low: t('قليلة', 'Low'), normal: t('عادية', 'Normal'), high: t('عالية', 'High') },
  },
  'r-caffeine': {
    title: t('متى تاخذ الكافيين؟', 'When do you have caffeine?'),
    opts: { none: t('ما آخذ', "I don't"), morning: t('الصبح', 'Mornings'), all_day: t('طول اليوم', 'All day'), late: t('متأخر', 'Late in the day') },
  },
  'r-recovery-selfrating': { title: t('كم تحس إنك ترتاح بين التمارين؟', 'How well do you recover between sessions?'), hint: t('من ١ لـ٥.', 'From 1 to 5.') },
  'r-deload-history': {
    title: t('تاخذ أسابيع تخفيف؟', 'Do you take lighter weeks?'),
    opts: { never: t('لا', 'Never'), sometimes: t('أحيانًا', 'Sometimes'), planned: t('مجدولة', 'Planned in') },
  },
  'r-injury-prone': { title: t('تحس نفسك تنصاب بسهولة؟', 'Do you pick up niggles easily?') },
  'r-sitting-hours': {
    title: t('كم ساعة تجلس باليوم؟', 'How many hours do you sit?'),
    opts: { lt4: t('أقل من ٤', 'Under 4'), h4_8: t('٤–٨', '4–8'), gt8: t('أكثر من ٨', 'Over 8') },
  },

  // ═══ البرمجة المتقدّمة ═══
  'v-control-level': {
    title: t('كم تبي تتحكم بخطتك؟', 'How much control do you want?'),
    opts: { guided: t('سوّوها لي', 'Build it for me'), balanced: t('اقترحوا وأعدّل', 'Suggest and I tweak'), full_control: t('أنا أقرّر', 'I decide') },
  },
  'v-split-choice': {
    title: t('تفضّل تقسيمة معيّنة؟', 'Prefer a specific split?'),
    opts: { auto: t('اختاروا لي', 'Pick for me'), full_body: t('جسم كامل', 'Full body'), upper_lower: t('علوي/سفلي', 'Upper/lower'), push_pull_legs: t('دفع/سحب/أرجل', 'Push/pull/legs'), bro_split: t('عضلة باليوم', 'One muscle a day') },
  },
  'v-volume-pref': {
    title: t('كم مجموعات تفضّل بالأسبوع؟', 'How much weekly volume?'),
    opts: { low: t('قليل', 'Low'), moderate: t('متوسط', 'Moderate'), high: t('عالي', 'High') },
  },
  'v-intensity-pref': {
    title: t('كم تحب الشدّة؟', 'How hard do you like it?'),
    opts: { conservative: t('محافظة', 'Conservative'), moderate: t('متوسطة', 'Moderate'), hard: t('عالية', 'Hard') },
  },
  'v-rir-familiarity': {
    title: t('تعرف مقياس التكرارات المتبقية (RIR)؟', 'Do you know RIR (reps in reserve)?'),
    opts: { no: t('لا', 'No'), heard: t('سمعت عنه', 'Heard of it'), use_it: t('أستخدمه', 'I use it') },
  },
  'v-target-rir': { title: t('كم RIR تستهدف عادة؟', 'What RIR do you usually target?') },
  'v-progression-style': {
    title: t('كيف تحب تتدرّج؟', 'How do you like to progress?'),
    opts: { auto: t('اختاروا لي', 'Pick for me'), double_progression: t('تدرّج مزدوج', 'Double progression'), linear_load: t('زيادة وزن خطية', 'Linear load'), rep_first: t('تكرارات أول', 'Reps first'), rpe_based: t('على أساس RPE', 'RPE based') },
  },
  'v-deload-pref': {
    title: t('أسابيع التخفيف؟', 'Deload weeks?'),
    opts: { auto: t('اختاروا لي', 'Pick for me'), every4: t('كل ٤ أسابيع', 'Every 4 weeks'), every6: t('كل ٦ أسابيع', 'Every 6 weeks'), by_feel: t('على حسب إحساسي', 'By feel'), none: t('بلا', 'None') },
  },
  'v-block-length': {
    title: t('كم أسبوع للكتلة الواحدة؟', 'How long per block?'),
    opts: { '4': t('٤ أسابيع', '4 weeks'), '6': t('٦ أسابيع', '6 weeks'), '8': t('٨ أسابيع', '8 weeks'), '12': t('١٢ أسبوع', '12 weeks') },
  },
  'v-strength-hypertrophy-bias': {
    title: t('ميلك لأي جهة؟', 'Which way do you lean?'),
    opts: { strength: t('قوة', 'Strength'), balanced: t('متوازن', 'Balanced'), hypertrophy: t('تضخيم', 'Hypertrophy') },
  },
  'v-exercise-rotation': {
    title: t('كم مرة تبدّل التمارين؟', 'How often do you rotate exercises?'),
    opts: { fixed: t('ما أبدّل', 'I keep them'), per_block: t('كل كتلة', 'Each block'), frequent: t('كثير', 'Often') },
  },
  'v-specialisation': {
    title: t('تبي تخصّص لعضلة معيّنة؟', 'Want to specialise on one muscle?'),
    opts: { none: t('لا', 'No'), chest: t('صدر', 'Chest'), back: t('ظهر', 'Back'), shoulders: t('أكتاف', 'Shoulders'), arms: t('ذراعين', 'Arms'), legs: t('أرجل', 'Legs'), glutes: t('مؤخرة', 'Glutes') },
  },
  'v-frequency-per-muscle': {
    title: t('كم مرة بالأسبوع للعضلة الوحدة؟', 'How often per muscle each week?'),
    opts: { '1': t('مرة', 'Once'), '2': t('مرتين', 'Twice'), '3': t('ثلاث', 'Three times') },
  },
  'v-main-lift-focus': {
    title: t('فيه رفعة أساسية تركّز عليها؟', 'Any main lift you focus on?'),
    opts: { squat: t('سكوات', 'Squat'), bench: t('بنش', 'Bench'), deadlift: t('رفعة ميتة', 'Deadlift'), overhead: t('ضغط فوق الرأس', 'Overhead press'), pullup: t('عقلة', 'Pull-up'), none: t('ولا وحدة', 'None') },
  },
  'v-tempo-control': {
    title: t('تتحكم بسرعة التكرار؟', 'Do you control tempo?'),
    opts: { no: t('لا', 'No'), sometimes: t('أحيانًا', 'Sometimes'), yes: t('إيه', 'Yes') },
  },
  'v-set-to-failure': {
    title: t('توصل للعجز بمجموعاتك؟', 'Do you take sets to failure?'),
    opts: { never: t('أبدًا', 'Never'), last_set: t('آخر مجموعة بس', 'Last set only'), often: t('كثير', 'Often') },
  },
  'v-accessory-appetite': {
    title: t('كم تمرين مساعد تحب؟', 'How many accessories do you want?'),
    opts: { minimal: t('أقل شي', 'Minimal'), balanced: t('متوازن', 'Balanced'), lots: t('كثير', 'Plenty') },
  },
  'v-weekly-set-target': {
    title: t('كم مجموعة بالأسبوع للعضلة؟', 'Weekly sets per muscle?'),
    opts: { '8': t('٨', '8'), '12': t('١٢', '12'), '16': t('١٦', '16'), '20': t('٢٠', '20') },
  },
  'v-cardio-interference': { title: t('تخاف الكارديو يأثّر على عضلك؟', 'Worried cardio will blunt your gains?') },
  'v-autoregulation': {
    title: t('تبي الخطة تتعدّل حسب يومك؟', 'Want the plan to flex with your day?'),
    opts: { no: t('لا', 'No'), light: t('شوي', 'A little'), full: t('كامل', 'Fully') },
  },
  'v-warmup-sets': {
    title: t('مجموعات الإحماء؟', 'Warm-up sets?'),
    opts: { auto: t('اختاروا لي', 'Pick for me'), minimal: t('أقل شي', 'Minimal'), full_ramp: t('تدرّج كامل', 'Full ramp') },
  },
  'v-training-age-honest': {
    title: t('كم سنة تدريب جادّة عندك فعلًا؟', 'How many years of serious training, honestly?'),
    hint: t('الجادّة يعني منتظمة — مو من يوم فتحت الاشتراك.', 'Serious means consistent — not since you first joined.'),
    opts: { lt1: t('أقل من سنة', 'Under a year'), y1_2: t('سنة لسنتين', '1–2 years'), y2_5: t('سنتين لخمس', '2–5 years'), gt5: t('أكثر من خمس', 'Over 5 years') },
  },
  'v-plan-edit-appetite': {
    title: t('تعدّل خطتك كثير؟', 'Do you edit your plan much?'),
    opts: { never: t('لا', 'Never'), sometimes: t('أحيانًا', 'Sometimes'), often: t('كثير', 'Often') },
  },
  'v-metric-tracking': {
    title: t('وش تحب تتابع؟', 'What do you like to track?'),
    opts: { weight: t('وزني', 'Weight'), measurements: t('مقاساتي', 'Measurements'), photos: t('صور', 'Photos'), lifts: t('أوزاني', 'My lifts'), steps: t('خطواتي', 'Steps'), none: t('ولا شي', 'Nothing') },
  },

  // ═══ التوضيح ═══
  'c-level-mismatch': {
    title: t('نبي نتأكد بس', 'Just double-checking'),
    hint: t('جوابين ما يتفقون شوي — أيهم أقرب لك؟', "Two answers don't quite line up — which is closer?"),
    opts: { im_newer: t('أنا أجدد مما قلت', "I'm newer than that"), im_experienced: t('أنا أخبر مما قلت', "I'm more experienced than that"), in_between: t('بينهم', 'Somewhere between') },
  },
  'c-equipment-mismatch': {
    title: t('عن الأجهزة', 'About machines'),
    hint: t('اخترت أسلوب أجهزة بس ما بيّنت إنها متوفرة — كيف الوضع؟', "You picked a machine-based style but they don't look available — what's the case?"),
    opts: { have_access: t('متوفرة عندي', 'I do have access'), no_access: t('ما هي متوفرة', "They're not available"), sometimes: t('أحيانًا', 'Sometimes') },
  },
  'c-days-split-mismatch': {
    title: t('التقسيمة والأيام', 'Split and days'),
    hint: t('التقسيمة اللي اخترتها تحتاج أيام أكثر — وش تفضّل؟', "The split you picked needs more days — what do you prefer?"),
    opts: { keep_days: t('خلّ الأيام زي ما هي', 'Keep my days'), more_days: t('أقدر أزيد يوم', 'I can add a day'), change_split: t('غيّروا التقسيمة', 'Change the split') },
  },
  'c-limitation-mismatch': {
    title: t('نتأكد من شي مهم', 'Checking something important'),
    hint: t('فيه حركة قلت ما تقدر عليها واختارتها ضمن تفضيلاتك.', "There's a movement you said you can't do that's also in your preferences."),
    opts: { keep_limit: t('صح، ما أقدر عليها', "Right, I can't do it"), limit_eased: t('صرت أقدر عليها', 'I can manage it now'), drop_exercise: t('شيلوها من تفضيلاتي', 'Drop it from my preferences') },
  },
  'c-goal-pace-mismatch': {
    title: t('السرعة والوقت', 'Pace and time'),
    hint: t('السرعة اللي تبيها تحتاج وقت أكثر من اللي عندك.', "The pace you want needs more time than you have."),
    opts: { slower_pace: t('خلّها أبطأ', 'Go slower'), more_days: t('أزيد أيام', "I'll add days"), keep_both: t('كمّل زي ما هو', 'Keep both as is') },
  },
  'c-progression-mismatch': {
    title: t('عن التدرّج', 'About progression'),
    hint: t('اخترت أسلوب تدرّج متقدّم — تبينا نشرحه ولا نختار لك؟', "You picked an advanced progression style — want us to explain it or choose for you?"),
    opts: { explain_it: t('اشرحوه لي', 'Explain it'), i_know_it: t('أعرفه', 'I know it'), pick_for_me: t('اختاروا لي', 'Pick for me') },
  },
  'c-time-volume-mismatch': {
    title: t('الوقت والحجم', 'Time and volume'),
    hint: t('الحجم اللي تبيه ما يدخل بالوقت اللي عندك.', "The volume you want won't fit the time you have."),
    opts: { shorter_sessions: t('تمارين أقصر', 'Shorter sessions'), fewer_exercises: t('تمارين أقل', 'Fewer exercises'), longer_sessions: t('أطوّل الوقت', "I'll make time") },
  },
  'c-cardio-mismatch': {
    title: t('عن الكارديو', 'About cardio'),
    hint: t('قلت ما تبي كارديو، لكن عندك هدف يحتاجه.', "You said no cardio, but you have a goal that needs some."),
    opts: { drop_cardio: t('لا كارديو', 'No cardio'), keep_cardio: t('عادي حطّوه', 'Go ahead, add it'), short_cardio: t('شوي بس', 'Just a little') },
  },
  'c-fill-equipment': {
    title: t('نحتاج نعرف معدّاتك', 'We need to know your gear'),
    hint: t('بدونها ما نقدر نبني خطة تشتغل.', "Without it we can't build a plan that works."),
    opts: { gym_full: t('نادي مجهّز', 'A full gym'), dumbbells_only: t('دمبلات بس', 'Dumbbells only'), bands_only: t('أستكات بس', 'Bands only'), bodyweight_only: t('وزن جسمي بس', 'Bodyweight only') },
  },
  'c-fill-goal-minor': {
    title: t('وش تبي من التطبيق؟', 'What do you want from the app?'),
    hint: t('في عمرك نركّز على اللياقة والصحة، مو على تغيير الوزن.', "At your age we focus on fitness and health, not weight change."),
    opts: { get_fitter: t('لياقة أحسن', 'Get fitter'), general_health: t('صحة عامة', 'General health') },
  },
  'c-confirm-high-frequency': {
    title: t('٥ أو ٦ أيام — متأكد؟', '5 or 6 days — are you sure?'),
    hint: t('البداية بـ٣ عادةً تعطي نتيجة أحسن لأنك تلتزم فيها. القرار قرارك.', "Starting at 3 usually works better because you stick to it. Your call though."),
  },
  'c-confirm-injury-load': {
    title: t('ألمك عالي — نحتاج نتأكد', "That's a lot of pain — let's be sure"),
    hint: t('ننصحك تراجع مختصّ قبل ما تحمّل. بنعطيك خطة أخف لين ذاك الوقت.', "We suggest seeing a professional before loading. We'll keep things light until then."),
  },
  'c-confirm-bodyweight-goal': {
    title: t('بناء عضل بوزن الجسم', 'Building muscle with bodyweight'),
    hint: t('يصير، بس أبطأ من الأوزان. وش تفضّل؟', "It works, just slower than weights. What do you prefer?"),
    opts: { ok_bodyweight: t('عادي، كمّل', "That's fine, carry on"), will_get_gear: t('بجيب معدّات', "I'll get some gear"), change_goal: t('غيّر هدفي', 'Change my goal') },
  },
  'c-confirm-short-session': {
    title: t('٢٠ دقيقة وكل الجسم', '20 minutes for your whole body'),
    hint: t('نقدر، بس بتمارين أقل لكل عضلة.', "We can, but with fewer exercises per muscle."),
    opts: { keep_short: t('خلّها قصيرة', 'Keep it short'), add_time: t('أقدر أزيد وقت', 'I can add time'), fewer_days_longer: t('أيام أقل وأطول', 'Fewer, longer days') },
  },
}

// ————————————————————————— الإسقاط إلى الشكل القياسي —————————————————————————

const UI: Record<keyof PersonalizationStrings['ui'], Bilingual> = {
  next: t('التالي', 'Next'),
  back: t('رجوع', 'Back'),
  skip: t('تخطّي', 'Skip'),
  finish: t('جهّز خطتي', 'Build my plan'),
  progressApprox: t('تقريبًا {done} من {total}', 'About {done} of {total}'),
  whyAsk: t('ليش نسأل؟', 'Why we ask'),
  outOfRange: t('الرقم خارج المدى المسموح.', "That's outside the allowed range."),
  required: t('نحتاج هذا السؤال عشان نكمّل.', 'We need this one to carry on.'),
  tooFew: t('اختر واحد على الأقل.', 'Pick at least one.'),
  tooMany: t('اخترت أكثر من اللازم.', "That's more than allowed."),
  optionUnavailable: t('هذا الخيار مو متاح لك.', "That option isn't available to you."),
  clearanceTitle: t('ننصحك تراجع مختصّ', 'We suggest seeing a professional'),
  clearanceBody: t('من جوابك، الأسلم تتأكد من مختصّ قبل ما تزيد الحمل. بنعطيك خطة أخف لين ذاك الوقت، والتطبيق يبقى مفتوح لك.', "From your answer, it's safer to check with a professional before adding load. We'll keep your plan lighter until then, and the app stays open to you."),
  minorGoalNote: t('في عمرك نركّز على اللياقة والصحة. تقدر تغيّره لما تكبر.', 'At your age we focus on fitness and health. You can change this later.'),
  assumptionNote: t('هذا مبني على افتراض — جاوب السؤال وبنحدّثه.', "This one's an assumption — answer the question and we'll update it."),
  conflictIntro: t('جوابين ما يتفقون — نوضّح بسرعة؟', "Two answers don't line up — mind clearing it up?"),
  resumeTitle: t('نكمّل من وين وقفت؟', 'Pick up where you left off?'),
  saveFailed: t('ما قدرنا نحفظ إجابتك. جرّب مرة ثانية — ما ضاع شي.', "We couldn't save your answer. Try again — nothing was lost."),
}

function project(lang: Lang): PersonalizationStrings {
  const questions: Record<string, QuestionText> = {}
  for (const [id, raw] of Object.entries(Q)) {
    const entry: QuestionText = { title: raw.title[lang] }
    if (raw.hint) entry.hint = raw.hint[lang]
    if (raw.legal) entry.legal = raw.legal[lang]
    if (raw.opts) {
      entry.opts = Object.fromEntries(Object.entries(raw.opts).map(([k, v]) => [k, v[lang]]))
    }
    questions[id] = entry
  }
  const ui = Object.fromEntries(Object.entries(UI).map(([k, v]) => [k, v[lang]])) as PersonalizationStrings['ui']
  return { questions, ui }
}

export const personalizationStrings: Record<Lang, PersonalizationStrings> = {
  ar: project('ar'),
  en: project('en'),
}

/** معرّفات الأسئلة التي لها نصّ — يستعمله الإثبات لكشف سؤال بلا قاموس. */
export const PERSONALIZATION_TEXT_IDS: readonly string[] = Object.keys(Q)
