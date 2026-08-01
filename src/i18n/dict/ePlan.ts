/**
 * قاموس معاينة الخطة (حارة E · المرحلة الثانية).
 *
 * السجلّ: **فصحى دافئة** (الميثاق §6) — لا لوم ولا ضغط ولا تهويل.
 * كل الأرقام هنا **مقيسة** من مخرجات المحرّك، فاللغة حاسمة لا متحفّظة.
 *
 * **قاعدة الترجمة:** هذا القاموس يترجم **مفاتيح المصدر** التي تخرج من
 * `planRationale`/`GeneratedPlan` — لا يخترع قيمًا ولا يحمل منطقًا.
 * أي معرّف جديد يخرج من المحرّك يُضاف هنا بالعربية والإنجليزية معًا.
 */
import type { Lang } from '@/lib/appPreferences'
import type { GoalType } from '@/types/profile'
import type { Muscle } from '@/types/workout'
import type { PlanAxisKey, PlanDecisionArea, PlanDriverKey } from '@/lib/planRationale'

export interface EPlanStrings {
  screenTitle: string
  back: string
  loadingTitle: string
  loadingBody: string
  emptyTitle: string
  emptyBody: string
  errorTitle: string
  errorBody: string
  retry: string
  editAnswers: string
  savePlan: string
  saveHint: string
  whySummary: string
  previewTitle: string
  previewIntro: string
  /** «{goal} · {days} · {split}» — تُملأ من مفاتيح الخطة. */
  planLabel: string
  daysValue: string
  scheduleHeading: string
  exercisesValue: string
  firstDayHeading: string
  exerciseFallback: string
  setsRepsValue: string
  restValue: string
  secondsUnit: string
  targetsHeading: string
  targetsNote: string
  calories: string
  caloriesUnit: string
  protein: string
  carbs: string
  fat: string
  gramsUnit: string
  water: string
  litersUnit: string
  notesHeading: string
  emptyPlan: string
  /** أسماء التقسيمات بمعرّف القالب — مفتاح المصدر يُترجم هنا لا في المكوّن. */
  splitTitles: Record<string, string>
  goalLabels: Record<GoalType, string>

  // ── «ليش هذي خطتك؟» (الموجة ٣) ──
  whyTitle: string
  whyIntro: string
  /** مقدّمة السبب للقرار **المقيس** — لغة حاسمة (§6). */
  becauseMeasured: string
  /** مقدّمة السبب للقرار **البنيوي** — لغة متحفّظة (§6). */
  becauseStructural: string
  driverJoin: string
  areaLabels: Record<PlanDecisionArea, string>
  /** قالب صياغة المدخل — `{value}` قيمته المترجمة. */
  driverText: Record<PlanDriverKey, string>
  /** قالب صياغة المخرَج بمفتاحه — `{value}` قيمته المترجمة. */
  outcomeText: Record<string, string>
  /** ترجمة القيم المنظَّمة بمفتاح `<key>:<value>` — للمدخلات والمخرجات معًا. */
  tokenLabels: Record<string, string>
  volumeHeading: string
  volumeNote: string
  volumeRow: string
  muscleLabels: Record<Muscle, string>
  inactiveHeading: string
  inactiveIntro: string
  axisLabels: Record<PlanAxisKey, string>
  axisReasons: Record<'fieldNotCollected' | 'notWiredToGenerator' | 'pinnedByBridge', string>
}

export const ePlanStrings: Record<Lang, EPlanStrings> = {
  ar: {
    screenTitle: 'خطتك الأولى',
    back: 'ارجع',
    loadingTitle: 'نبني خطتك من إجاباتك',
    loadingBody: 'لحظات ونرتّب أسبوعك وأهدافك اليومية.',
    emptyTitle: 'نحتاج إجاباتك أول',
    emptyBody: 'كمّل أسئلة الهدف والتدريب عشان نبني لك خطة تقدر تراجعها.',
    errorTitle: 'ما قدرنا نبني الخطة',
    errorBody: 'إجاباتك محفوظة. جرّب مرة ثانية، أو ارجع وعدّلها.',
    retry: 'جرّب مرة ثانية',
    editAnswers: 'عدّل إجاباتك',
    savePlan: 'احفظ خطتك',
    saveHint: 'بنطلب منك إنشاء حساب عشان نحفظ الخطة ونربط تقدّمك فيها.',
    whySummary: 'ليش بنيناها كذا؟',
    previewTitle: 'معاينة خطتك',
    previewIntro: 'هذا شكل أسبوعك من إجاباتك. راجعه وعدّل اللي ما يناسبك قبل ما تحفظه.',
    planLabel: '{goal} · {days} · {split}',
    daysValue: '{n} أيام تدريب',
    scheduleHeading: 'أيام الأسبوع',
    exercisesValue: '{n} تمارين',
    firstDayHeading: 'أول يوم تدريب كامل',
    exerciseFallback: 'تمرين من خطتك',
    setsRepsValue: '{sets} مجموعات × {reps}',
    restValue: 'راحة {seconds} {unit}',
    secondsUnit: 'ثانية',
    targetsHeading: 'أهدافك اليومية',
    targetsNote: 'هذه تقديرات بداية من بياناتك، وتقدر تعدّلها مع تغيّر جسمك ونشاطك.',
    calories: 'السعرات',
    caloriesUnit: 'سعرة',
    protein: 'بروتين',
    carbs: 'كربوهيدرات',
    fat: 'دهون',
    gramsUnit: 'غ',
    water: 'ماء',
    litersUnit: 'لتر',
    notesHeading: 'ملاحظات على خطتك',
    emptyPlan: 'لا توجد أيام تدريب في هذه الخطة بعد.',
    splitTitles: {
      'gen-fullbody': 'جسم كامل',
      'gen-upper-lower-4': 'علوي / سفلي',
      'gen-upper-lower-5': 'علوي / سفلي + يوم مركّز',
      'gen-ppl-6': 'دفع / سحب / أرجل ×٢',
      'gen-ppl-7': 'دفع / سحب / أرجل ×٢ + إضافي',
      'gen-adv-fullbody': 'جسم كامل (اختيارك)',
      'gen-adv-upper-lower': 'علوي / سفلي (اختيارك)',
      'gen-adv-ppl': 'دفع / سحب / أرجل (اختيارك)',
      'gen-adv-arnold': 'تقسيمة أرنولد (اختيارك)',
      'gen-adv-bro': 'عضلة باليوم (اختيارك)',
    },
    goalLabels: {
      cutting: 'تنشيف',
      bulking: 'تضخيم',
      maintenance: 'محافظة',
      returning: 'رجوع بعد انقطاع',
      health: 'صحة عامة',
      recomposition: 'إعادة تكوين',
    },

    whyTitle: 'ليش هذي خطتك؟',
    whyIntro: 'هنا تشوف الإجابات اللي دخلت فعلًا في كل قرار، والمحاور اللي ما خصّصناها للحين.',
    becauseMeasured: 'مبنيّة على',
    becauseStructural: 'راعينا فيها',
    driverJoin: ' و',
    areaLabels: {
      split: 'التقسيمة',
      sessionSize: 'حجم الجلسة',
      weeklyVolume: 'حجم الأسبوع',
      repRange: 'نطاق التكرارات',
      restBetweenSets: 'الراحة بين المجموعات',
      equipmentPool: 'حوض التمارين',
      injuryFilter: 'مراعاة الإصابات',
      muscleFocus: 'التركيز العضلي',
      startingLoad: 'حمل البداية',
      calorieTarget: 'سعرات يومك',
      ageGuardrail: 'حدّ العمر',
    },
    driverText: {
      trainingDays: '{value} أيام تدريب في الأسبوع',
      splitChoice: 'تقسيمتك المختارة: {value}',
      sessionMinutes: 'مدّة الجلسة {value} دقيقة',
      experience: 'خبرتك: {value}',
      goalType: 'هدفك: {value}',
      gymAccess: 'مكان تمرينك: {value}',
      injuries: '{value}',
      muscleFocus: 'تركيزك: {value}',
      consistency: 'انتظامك: {value}',
      age: 'عمرك {value} سنة',
      gender: 'الجنس المستخدم في معادلة الاحتياج: {value}',
      weightKg: 'وزنك {value} كجم',
      heightCm: 'طولك {value} سم',
      activityLevel: 'نشاطك اليومي: {value}',
    },
    outcomeText: {
      templateId: 'تقسيمة {value}',
      exercisesPerDay: 'حتى {value} تمارين في الجلسة',
      weeklySets: '{value} مجموعة عمل في الأسبوع',
      compoundReps: '{value} تكرارًا في التمارين المركّبة',
      compoundRestSec: '{value} ثانية راحة بين المجموعات',
      resolvedAccess: 'تمارين تناسب {value}',
      filter: '{value}',
      extraSets: '{value}',
      firstWeek: '{value}',
      targetCalories: '{value} سعرة يوميًا',
      effectiveGoalType: 'هدف {value}',
    },
    tokenLabels: {
      'gymAccess:full': 'ناديًا مجهّزًا',
      'gymAccess:small': 'ناديًا صغيرًا',
      'gymAccess:home': 'أدوات المنزل',
      'gymAccess:bodyweight': 'وزن الجسم',
      'resolvedAccess:full': 'ناديًا مجهّزًا',
      'resolvedAccess:small': 'ناديًا صغيرًا',
      'resolvedAccess:home': 'أدوات المنزل',
      'resolvedAccess:bodyweight': 'وزن الجسم',
      'injuries:declared': 'الإصابة التي ذكرتها',
      'injuries:none': 'أنك لم تذكر إصابة',
      'filter:applied': 'شِلنا التمارين المطابقة لقائمة المخاطر لهذه المنطقة، واخترنا بدائل لنفس العضلات',
      'filter:notApplied': 'بلا استبعاد — لم تذكر إصابة',
      'filter:unrecognized': 'ملاحظتك محفوظة، لكنها ما طابقت مناطق التصفية الحالية — راجع تمارينك قبل البدء',
      'extraSets:applied': 'مجموعة إضافية لعضلات تركيزك',
      'extraSets:none': 'توزيع متوازن على المجموعات العضلية',
      'firstWeek:reduced': 'أسبوع أول أخفّ',
      'firstWeek:standard': 'حجم معتاد من البداية',
      'experience:lt1m': 'أقل من شهر',
      'experience:1to6m': 'من شهر إلى ستة أشهر',
      'experience:6to12m': 'من ستة أشهر إلى سنة',
      'experience:1to2y': 'من سنة إلى سنتين',
      'experience:gt2y': 'أكثر من سنتين',
      'experience:beginner': 'مبتدئ',
      'experience:intermediate': 'متوسط',
      'experience:advanced': 'متقدّم',
      'muscleFocus:balanced': 'متوازن',
      'muscleFocus:upper': 'الجزء العلوي',
      'muscleFocus:lower': 'الجزء السفلي',
      'muscleFocus:core': 'الكور',
      'muscleFocus:chest': 'الصدر',
      'muscleFocus:back': 'الظهر',
      'muscleFocus:shoulders': 'الأكتاف',
      'muscleFocus:arms': 'الذراعان',
      'consistency:never': 'لم تنتظم من قبل',
      'consistency:onoff': 'انتظام متقطّع',
      'consistency:regular': 'انتظام مستمر',
      'consistency:returning': 'رجوع بعد انقطاع',
      'consistency:unspecified': 'غير محدّد',
      'splitChoice:full_body': 'جسم كامل',
      'splitChoice:upper_lower': 'علوي / سفلي',
      'splitChoice:push_pull_legs': 'دفع / سحب / أرجل',
      'splitChoice:arnold': 'أرنولد',
      'splitChoice:bro_split': 'عضلة باليوم',
      'gender:male': 'ذكر',
      'gender:female': 'أنثى',
      'activityLevel:sedentary': 'قليل الحركة',
      'activityLevel:light': 'خفيف',
      'activityLevel:moderate': 'متوسط',
      'activityLevel:active': 'نشيط',
      'activityLevel:very_active': 'نشيط جدًا',
    },
    volumeHeading: 'حجم أسبوعك لكل عضلة',
    volumeNote: 'مقيس من خطتك: مجموع مجموعات العمل وعدد الأيام التي تلمس كل عضلة.',
    volumeRow: '{sets} مجموعة · {sessions} أيام',
    muscleLabels: {
      chest: 'الصدر',
      back: 'الظهر',
      shoulders: 'الأكتاف',
      biceps: 'البايسبس',
      triceps: 'الترايسبس',
      legs: 'الأرجل',
      glutes: 'الأَلْيَتان',
      hamstrings: 'الأوتار الخلفية',
      quads: 'أمامية الفخذ',
      calves: 'السمانة',
      core: 'الكور',
      cardio: 'اللياقة الهوائية',
    },
    inactiveHeading: 'ما لم نخصّصه بعد',
    inactiveIntro: 'هذه محاور لم تدخل في بناء خطتك، ونذكرها كما هي:',
    axisLabels: {
      trainingFocus: 'تركيز التدريب (قوّة أو تضخيم)',
      pastPerformance: 'أداؤك السابق في التمارين',
      muscleFocus: 'التركيز على عضلة بعينها',
    },
    axisReasons: {
      fieldNotCollected: 'لا نسألك عنه بعد، فخطتك محايدة تجاهه.',
      notWiredToGenerator: 'مسجَّل عندك، لكنه لا يدخل في بناء الخطة بعد.',
      pinnedByBridge: 'إجابتك عنه لا تصل إلى المولّد بعد، فالتوزيع متوازن على كل المجموعات.',
    },
  },
  en: {
    screenTitle: 'Your first plan',
    back: 'Go back',
    loadingTitle: 'Building your plan from your answers',
    loadingBody: 'One moment while we shape your week and daily targets.',
    emptyTitle: 'We need your answers first',
    emptyBody: 'Finish the goal and training questions so we can build a plan for you to review.',
    errorTitle: "We couldn't build your plan",
    errorBody: 'Your answers are still here. Try again, or go back and edit them.',
    retry: 'Try again',
    editAnswers: 'Edit your answers',
    savePlan: 'Save your plan',
    saveHint: 'Create an account next so we can save this plan and connect your progress to it.',
    whySummary: 'Why did we build it this way?',
    previewTitle: 'Your plan preview',
    previewIntro: 'This is the week built from your answers. Review it and change anything that does not fit before saving.',
    planLabel: '{goal} · {days} · {split}',
    daysValue: '{n} training days',
    scheduleHeading: 'Your week',
    exercisesValue: '{n} exercises',
    firstDayHeading: 'Your first full training day',
    exerciseFallback: 'Exercise from your plan',
    setsRepsValue: '{sets} sets × {reps}',
    restValue: '{seconds} {unit} rest',
    secondsUnit: 'sec',
    targetsHeading: 'Your daily targets',
    targetsNote: 'These are starting estimates from your data. You can adjust them as your body and activity change.',
    calories: 'Calories',
    caloriesUnit: 'kcal',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    gramsUnit: 'g',
    water: 'Water',
    litersUnit: 'L',
    notesHeading: 'Notes on your plan',
    emptyPlan: 'This plan has no training days yet.',
    splitTitles: {
      'gen-fullbody': 'Full Body',
      'gen-upper-lower-4': 'Upper / Lower',
      'gen-upper-lower-5': 'Upper / Lower + Focus day',
      'gen-ppl-6': 'Push / Pull / Legs ×2',
      'gen-ppl-7': 'Push / Pull / Legs ×2 + Extra',
      'gen-adv-fullbody': 'Full Body (your choice)',
      'gen-adv-upper-lower': 'Upper / Lower (your choice)',
      'gen-adv-ppl': 'Push / Pull / Legs (your choice)',
      'gen-adv-arnold': 'Arnold Split (your choice)',
      'gen-adv-bro': 'Bro Split (your choice)',
    },
    goalLabels: {
      cutting: 'Cutting',
      bulking: 'Bulking',
      maintenance: 'Maintenance',
      returning: 'Returning after a break',
      health: 'General health',
      recomposition: 'Recomposition',
    },

    whyTitle: 'Why is this your plan?',
    whyIntro: 'See which answers actually fed each decision, and which parts we have not personalised yet.',
    becauseMeasured: 'Based on',
    becauseStructural: 'We took into account',
    driverJoin: ' and ',
    areaLabels: {
      split: 'Your split',
      sessionSize: 'Session size',
      weeklyVolume: 'Weekly volume',
      repRange: 'Rep range',
      restBetweenSets: 'Rest between sets',
      equipmentPool: 'Exercise pool',
      injuryFilter: 'Injury awareness',
      muscleFocus: 'Muscle focus',
      startingLoad: 'Starting load',
      calorieTarget: 'Daily calories',
      ageGuardrail: 'Age guardrail',
    },
    driverText: {
      trainingDays: '{value} training days a week',
      splitChoice: 'the split you chose: {value}',
      sessionMinutes: 'a {value}-minute session',
      experience: 'your experience: {value}',
      goalType: 'your goal: {value}',
      gymAccess: 'where you train: {value}',
      injuries: '{value}',
      muscleFocus: 'your focus: {value}',
      consistency: 'your consistency: {value}',
      age: 'your age of {value}',
      gender: 'sex used in the energy equation: {value}',
      weightKg: 'weight {value} kg',
      heightCm: 'height {value} cm',
      activityLevel: 'daily activity: {value}',
    },
    outcomeText: {
      templateId: 'A {value} split',
      exercisesPerDay: 'Up to {value} exercises per session',
      weeklySets: '{value} working sets a week',
      compoundReps: '{value} reps on compound lifts',
      compoundRestSec: '{value} seconds of rest between sets',
      resolvedAccess: 'Exercises that suit {value}',
      filter: '{value}',
      extraSets: '{value}',
      firstWeek: '{value}',
      targetCalories: '{value} kcal a day',
      effectiveGoalType: 'A {value} goal',
    },
    tokenLabels: {
      'gymAccess:full': 'a fully equipped gym',
      'gymAccess:small': 'a small gym',
      'gymAccess:home': 'home equipment',
      'gymAccess:bodyweight': 'bodyweight only',
      'resolvedAccess:full': 'a fully equipped gym',
      'resolvedAccess:small': 'a small gym',
      'resolvedAccess:home': 'home equipment',
      'resolvedAccess:bodyweight': 'bodyweight only',
      'injuries:declared': 'the injury you told us about',
      'injuries:none': 'that you reported no injury',
      'filter:applied': 'we left out exercises on the risk list for that area and chose alternatives for the same muscles',
      'filter:notApplied': 'nothing was left out — no injury was reported',
      'filter:unrecognized': 'your note is saved, but it did not match the current filter areas — review your exercises before starting',
      'extraSets:applied': 'an extra set for the muscles you focus on',
      'extraSets:none': 'an even spread across muscle groups',
      'firstWeek:reduced': 'a lighter first week',
      'firstWeek:standard': 'the usual volume from the start',
      'experience:lt1m': 'under a month',
      'experience:1to6m': 'one to six months',
      'experience:6to12m': 'six months to a year',
      'experience:1to2y': 'one to two years',
      'experience:gt2y': 'over two years',
      'experience:beginner': 'beginner',
      'experience:intermediate': 'intermediate',
      'experience:advanced': 'advanced',
      'muscleFocus:balanced': 'balanced',
      'muscleFocus:upper': 'upper body',
      'muscleFocus:lower': 'lower body',
      'muscleFocus:core': 'core',
      'muscleFocus:chest': 'chest',
      'muscleFocus:back': 'back',
      'muscleFocus:shoulders': 'shoulders',
      'muscleFocus:arms': 'arms',
      'consistency:never': 'never trained regularly before',
      'consistency:onoff': 'on and off',
      'consistency:regular': 'steady',
      'consistency:returning': 'returning after a break',
      'consistency:unspecified': 'not specified',
      'splitChoice:full_body': 'Full Body',
      'splitChoice:upper_lower': 'Upper / Lower',
      'splitChoice:push_pull_legs': 'Push / Pull / Legs',
      'splitChoice:arnold': 'Arnold',
      'splitChoice:bro_split': 'Bro Split',
      'gender:male': 'male',
      'gender:female': 'female',
      'activityLevel:sedentary': 'sedentary',
      'activityLevel:light': 'light',
      'activityLevel:moderate': 'moderate',
      'activityLevel:active': 'active',
      'activityLevel:very_active': 'very active',
    },
    volumeHeading: 'Your weekly volume per muscle',
    volumeNote: 'Measured from your plan: total working sets and how many days touch each muscle.',
    volumeRow: '{sets} sets · {sessions} days',
    muscleLabels: {
      chest: 'Chest',
      back: 'Back',
      shoulders: 'Shoulders',
      biceps: 'Biceps',
      triceps: 'Triceps',
      legs: 'Legs',
      glutes: 'Glutes',
      hamstrings: 'Hamstrings',
      quads: 'Quads',
      calves: 'Calves',
      core: 'Core',
      cardio: 'Cardio',
    },
    inactiveHeading: 'What we have not personalised yet',
    inactiveIntro: 'These did not go into building your plan, and we say so plainly:',
    axisLabels: {
      trainingFocus: 'Training focus (strength or hypertrophy)',
      pastPerformance: 'Your past performance on exercises',
      muscleFocus: 'Focusing on one muscle group',
    },
    axisReasons: {
      fieldNotCollected: 'We do not ask about it yet, so your plan stays neutral on it.',
      notWiredToGenerator: 'It is recorded for you, but it does not feed plan building yet.',
      pinnedByBridge: 'Your answer does not reach the generator yet, so the spread stays even across all groups.',
    },
  },
}

/** يستبدل `{key}` بقيمته — لا منطق ولا لغة، مجرّد ملء قالب. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
