import type { Exercise, MovementPattern, Muscle } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'

// إرشاد التمارين — نقاط تكنيك، أخطاء شائعة، وتنبيهات أمان.
// إذا كان للتمرين محتوى خاص (techniqueTipsAr/commonMistakesAr/safetyNotesAr) استخدمناه،
// وإلا نولّد إرشادًا عامًا مناسبًا حسب نمط الحركة والعضلة المستهدفة.
// كما نوفّر exerciseGuidance() ثنائية اللغة لوضع التمرين النشط (WorkoutMode).

const TECHNIQUE_BY_PATTERN: Record<MovementPattern, string[]> = {
  push: [
    'ثبّت لوح الكتف للخلف وللأسفل قبل بدء الدفع.',
    'انزل بتحكّم (٢–٣ ثوانٍ) ثم ادفع بقوة.',
    'حافظ على الرسغ مستقيمًا فوق المرفق.',
  ],
  pull: [
    'ابدأ السحب من عضلات الظهر وليس من الذراعين.',
    'اعصر لوحي الكتف في نهاية الحركة.',
    'تجنّب التأرجح بالجذع للحصول على شدّ نظيف.',
  ],
  squat: [
    'انزل حتى يوازي الفخذ الأرض أو أقل إن سمحت المرونة.',
    'ادفع الركبتين للخارج باتجاه أصابع القدم.',
    'حافظ على صدرك مرفوعًا وظهرك محايدًا.',
  ],
  hinge: [
    'ابدأ الحركة بدفع الورك للخلف لا بثني الظهر.',
    'حافظ على البار/الدمبل قريبًا من الجسم.',
    'حافظ على ظهر مستقيم محايد طوال الحركة.',
  ],
  lunge: [
    'اجعل ركبتك الأمامية فوق الكاحل لا متقدمة كثيرًا.',
    'انزل بشكل عمودي وحافظ على توازن الجذع.',
    'ادفع من كعب القدم الأمامية للصعود.',
  ],
  isolation: [
    'ركّز على العضلة المستهدفة طوال المدى.',
    'تحكّم في النزول ولا تستخدم الزخم.',
    'استخدم مدى حركة كامل دون قفل المفصل بعنف.',
  ],
  carry: [
    'حافظ على جذع مشدود وكتفين للخلف.',
    'امشِ بخطوات ثابتة ونظرة للأمام.',
    'وزّع الحمل بالتساوي بين الجانبين.',
  ],
  core: [
    'ابقِ أسفل ظهرك ملاصقًا للأرض أو محايدًا.',
    'تنفّس بثبات ولا تحبس النفس.',
    'ركّز على شدّ عضلات البطن لا شدّ الرقبة.',
  ],
  cardio: [
    'ابدأ بإحماء خفيف وارفع الشدّة تدريجيًا.',
    'حافظ على إيقاع تنفّس منتظم.',
    'راقب معدّل ضربات القلب وابقَ ضمن نطاق مريح.',
  ],
  mobility: [
    'تحرّك ببطء وضمن مدى مريح بلا ألم.',
    'تنفّس بعمق واسترخِ في كل تكرار/ثبات.',
    'الهدف تجهيز المفصل والعضلة لا إجهادهما.',
  ],
}

const MISTAKES_BY_PATTERN: Record<MovementPattern, string[]> = {
  push: ['رفع المؤخرة عن المقعد أثناء الدفع.', 'فرد المرفق بعنف في الأعلى.', 'وزن أثقل من اللازم يفقدك التحكّم.'],
  pull: ['السحب بالذراعين فقط دون إشراك الظهر.', 'التأرجح بالجسم للغش بالوزن.', 'عدم إكمال المدى الكامل للحركة.'],
  squat: ['رفع الكعبين عن الأرض.', 'انهيار الركبتين للداخل.', 'تقويس أسفل الظهر في القاع.'],
  hinge: ['تدوير الظهر بدل دفع الورك.', 'إبعاد البار عن الجسم.', 'فرد الركبتين بالكامل بدل المفصلة من الورك.'],
  lunge: ['تقدّم الركبة كثيرًا على أصابع القدم.', 'ميلان الجذع للأمام.', 'خطوة قصيرة جدًا تضغط الركبة.'],
  isolation: ['استخدام الزخم بدل العضلة.', 'وزن ثقيل يقصّر مدى الحركة.', 'النزول السريع غير المتحكّم.'],
  carry: ['ترهّل الكتفين للأمام.', 'حبس النفس طوال المسافة.', 'حمل غير متوازن بين اليدين.'],
  core: ['شدّ الرقبة بدل البطن.', 'حبس النفس.', 'استخدام الزخم بدل التحكّم.'],
  cardio: ['البدء بشدّة عالية دون إحماء.', 'وضعية جسم منحنية على الجهاز.', 'تجاهل علامات الإرهاق الزائد.'],
  mobility: ['الارتداد العنيف بدل التمدّد الثابت.', 'تجاوز حدّ الألم.', 'حبس النفس أثناء التمدّد.'],
}

const SAFETY_BY_PATTERN: Record<MovementPattern, string[]> = {
  push: ['استخدم مراقبًا (سبوتر) مع الأوزان الثقيلة على الصدر.', 'لا تُنزل الوزن بسرعة على المفصل.'],
  pull: ['أحمِ أسفل ظهرك بوضعية محايدة.', 'ابدأ بوزن يسمح بأداء نظيف.'],
  squat: ['استخدم حوامل الأمان (سيفتي) في القفص.', 'لا تقفل الركبة بعنف أعلى الحركة.'],
  hinge: ['الظهر المقوّس خطر على الفقرات — حافظ على استقامته.', 'ابدأ بوزن خفيف لإتقان النمط أولًا.'],
  lunge: ['انتبه للتوازن، واستند عند الحاجة.', 'توقّف إذا شعرت بألم في الركبة.'],
  isolation: ['تجنّب الأوزان المبالغ فيها على المفصل الصغير.', 'أوقف التمرين عند أي ألم حاد.'],
  carry: ['أبقِ مسارك خاليًا من العوائق.', 'أنزل الوزن بأمان عند الانتهاء.'],
  core: ['توقّف عند أي ألم في أسفل الظهر أو الرقبة.', 'تجنّب الحركات المرتدّة العنيفة.'],
  cardio: ['أحماء وتهدئة ضروريان لتجنّب الإصابات.', 'اشرب الماء وتوقّف عند الدوار أو ضيق النفس.'],
  mobility: ['لا تجبر المفصل على مدى مؤلم.', 'توقّف فورًا عند أي ألم حاد أو وخز.'],
}

const MUSCLE_AR: Record<Muscle, string> = {
  chest: 'الصدر',
  back: 'الظهر',
  shoulders: 'الأكتاف',
  biceps: 'البايسبس',
  triceps: 'الترايسبس',
  legs: 'الأرجل',
  glutes: 'الجلوتس',
  hamstrings: 'الهامسترنج',
  quads: 'الكوادز',
  calves: 'السمانة',
  core: 'الكور',
  cardio: 'اللياقة',
}

/** نقاط تكنيك للتمرين — الخاصة به إن وُجدت، وإلا افتراضية حسب نمط الحركة. */
export function getTechniqueTips(exercise: Exercise): string[] {
  if (exercise.techniqueTipsAr?.length) return exercise.techniqueTipsAr
  const base = TECHNIQUE_BY_PATTERN[exercise.movementPattern] ?? TECHNIQUE_BY_PATTERN.isolation
  return [`ركّز على ${MUSCLE_AR[exercise.primaryMuscle]} طوال الحركة.`, ...base.slice(0, 2)]
}

/** أخطاء شائعة للتمرين — الخاصة به إن وُجدت، وإلا افتراضية حسب نمط الحركة. */
export function getCommonMistakes(exercise: Exercise): string[] {
  if (exercise.commonMistakesAr?.length) return exercise.commonMistakesAr
  return MISTAKES_BY_PATTERN[exercise.movementPattern] ?? MISTAKES_BY_PATTERN.isolation
}

/** تنبيهات أمان للتمرين — الخاصة به إن وُجدت، وإلا افتراضية حسب نمط الحركة. */
export function getSafetyNotes(exercise: Exercise): string[] {
  if (exercise.safetyNotesAr?.length) return exercise.safetyNotesAr
  const base = SAFETY_BY_PATTERN[exercise.movementPattern] ?? SAFETY_BY_PATTERN.isolation
  return [...base, 'إذا كان لديك إصابة سابقة، استشر مختصًا قبل التمرين.']
}

/** وصف واضح لزر/مصدر الفيديو بحيث لا نزعم أن كل رابط رسمي. */
export function getVideoLabel(exercise: Exercise): string {
  switch (exercise.videoSource) {
    case 'official':
      return 'فيديو رسمي'
    case 'custom':
      return 'فيديو مخصّص'
    case 'trusted':
    case 'trusted_video':
      return 'فيديو شرح موثوق'
    case 'youtube_search':
    default:
      return 'بحث يوتيوب موثوق'
  }
}

// ===== إرشاد ثنائي اللغة لوضع التمرين النشط (WorkoutMode) =====

interface GuidanceText {
  tips: string[]
  mistakes: string[]
}

interface Guidance {
  ar: GuidanceText
  en: GuidanceText
}

const byPattern: Record<MovementPattern, Guidance> = {
  push: {
    ar: {
      tips: ['ثبّت لوح الكتف للخلف وللأسفل.', 'نزّل الوزن بتحكّم ثم ادفع بقوة.', 'حافظ على الرسغ مستقيمًا فوق المرفق.'],
      mistakes: ['رفع الكتف للأعلى أثناء الدفع.', 'ارتداد الوزن من الصدر بسرعة.'],
    },
    en: {
      tips: ['Set your shoulder blades back and down.', 'Lower under control, then press hard.', 'Keep wrists stacked over elbows.'],
      mistakes: ['Shrugging the shoulders while pressing.', 'Bouncing the weight off the chest.'],
    },
  },
  pull: {
    ar: {
      tips: ['ابدأ السحب من عضلات الظهر لا الذراع.', 'اسحب الكوع نحو الخلف والأسفل.', 'اعصر لوح الكتف في النهاية.'],
      mistakes: ['استخدام الزخم وهز الجسم.', 'السحب بالساعد فقط دون إشراك الظهر.'],
    },
    en: {
      tips: ['Initiate the pull from your back, not arms.', 'Drive the elbow down and back.', 'Squeeze the shoulder blades at the top.'],
      mistakes: ['Using momentum and swinging.', 'Pulling with the forearms only.'],
    },
  },
  squat: {
    ar: {
      tips: ['ادفع الركبتين للخارج باتجاه الأصابع.', 'انزل حتى يوازي الفخذ الأرض أو أقل.', 'حافظ على الصدر مرفوعًا والظهر محايدًا.'],
      mistakes: ['انهيار الركبتين للداخل.', 'رفع الكعب عن الأرض.'],
    },
    en: {
      tips: ['Push your knees out toward your toes.', 'Descend to at least parallel.', 'Keep the chest up and spine neutral.'],
      mistakes: ['Knees caving inward.', 'Heels lifting off the floor.'],
    },
  },
  hinge: {
    ar: {
      tips: ['ادفع الورك للخلف وحافظ على ظهر مستقيم.', 'أبقِ البار قريبًا من جسمك.', 'اعصر الجلوتس عند الوقوف.'],
      mistakes: ['تقويس أسفل الظهر.', 'تحويل الحركة إلى سكوات.'],
    },
    en: {
      tips: ['Push hips back, keep a flat back.', 'Keep the bar close to your body.', 'Squeeze glutes at lockout.'],
      mistakes: ['Rounding the lower back.', 'Turning it into a squat.'],
    },
  },
  lunge: {
    ar: {
      tips: ['خطوة ثابتة وجذع منتصب.', 'انزل حتى تقترب الركبة الخلفية من الأرض.', 'ادفع من كعب القدم الأمامية.'],
      mistakes: ['تجاوز الركبة الأمامية لأصابع القدم كثيرًا.', 'فقدان التوازن بخطوة قصيرة.'],
    },
    en: {
      tips: ['Take a stable step, torso upright.', 'Lower until the back knee nears the floor.', 'Drive up through the front heel.'],
      mistakes: ['Front knee traveling too far past the toes.', 'Losing balance with too short a step.'],
    },
  },
  isolation: {
    ar: {
      tips: ['ركّز على العضلة المستهدفة طوال الحركة.', 'تحكّم في النزول ولا تستخدم الزخم.', 'استخدم مدى حركة كامل.'],
      mistakes: ['وزن أثقل من اللازم يكسر الشكل.', 'تأرجح الجسم للمساعدة.'],
    },
    en: {
      tips: ['Focus on the target muscle throughout.', 'Control the lowering, no momentum.', 'Use a full range of motion.'],
      mistakes: ['Going too heavy and breaking form.', 'Swinging the body to assist.'],
    },
  },
  carry: {
    ar: {
      tips: ['شدّ الكور وابقِ الكتف للخلف.', 'خطوات قصيرة ثابتة.', 'تنفّس بانتظام.'],
      mistakes: ['الانحناء للأمام.', 'فقدان شدّ القبضة.'],
    },
    en: {
      tips: ['Brace the core, shoulders back.', 'Short, steady steps.', 'Breathe consistently.'],
      mistakes: ['Leaning forward.', 'Losing grip tension.'],
    },
  },
  core: {
    ar: {
      tips: ['شدّ عضلات البطن طوال التمرين.', 'تنفّس ولا تحبس النفس.', 'حركة بطيئة ومضبوطة.'],
      mistakes: ['شدّ الرقبة بدل البطن.', 'تقويس أسفل الظهر.'],
    },
    en: {
      tips: ['Keep the abs braced throughout.', 'Breathe, don’t hold your breath.', 'Slow, controlled movement.'],
      mistakes: ['Straining the neck instead of abs.', 'Arching the lower back.'],
    },
  },
  cardio: {
    ar: {
      tips: ['ابدأ بإحماء خفيف.', 'حافظ على إيقاع تنفّس منتظم.', 'حافظ على وضعية جسم منتصبة.'],
      mistakes: ['البدء بشدّة عالية مباشرة.', 'الإمساك بالمقابض بقوة وإراحة الجسم عليها.'],
    },
    en: {
      tips: ['Start with a light warm-up.', 'Keep a steady breathing rhythm.', 'Hold an upright posture.'],
      mistakes: ['Starting at high intensity cold.', 'Leaning your weight on the handles.'],
    },
  },
  mobility: {
    ar: {
      tips: ['تحرّك ببطء وضمن مدى مريح بلا ألم.', 'تنفّس بعمق واسترخِ في كل ثبات.', 'الهدف تجهيز المفصل لا إجهاده.'],
      mistakes: ['الارتداد العنيف بدل التمدّد الثابت.', 'تجاوز حدّ الألم.'],
    },
    en: {
      tips: ['Move slowly within a comfortable, pain-free range.', 'Breathe deeply and relax into each hold.', 'Aim to prep the joint, not strain it.'],
      mistakes: ['Bouncing instead of holding the stretch.', 'Pushing past the point of pain.'],
    },
  },
}

/**
 * نقاط التكنيك والأخطاء الشائعة لتمرين — لوضع التمرين النشط (ثنائي اللغة).
 * العربية: تفضّل المحتوى الخاص بالتمرين إن وُجد، ثم النمط الحركي.
 * الإنجليزية: تعتمد على إرشاد النمط الحركي.
 */
export function exerciseGuidance(exerciseId: string, lang: Lang): GuidanceText {
  const ex = getExercise(exerciseId)
  const pattern = ex?.movementPattern ?? 'isolation'
  const g = byPattern[pattern] ?? byPattern.isolation
  if (lang === 'en') return g.en
  if (ex) {
    return { tips: getTechniqueTips(ex), mistakes: getCommonMistakes(ex) }
  }
  return g.ar
}
