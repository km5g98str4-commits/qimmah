import type { Exercise, MovementPattern, Muscle } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'
import { muscleLabels } from '@/lib/muscles'

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


// English twins of the three pattern tables above. Same keys, same lengths — the
// proof asserts both, so the two languages cannot drift apart silently.
const TECHNIQUE_BY_PATTERN_EN: Record<MovementPattern, string[]> = {
  push: ['Set your shoulder blades back and down before you start pressing.', 'Lower under control (2-3 seconds), then press back up with intent.', 'Keep your wrist straight and stacked over your elbow.'],
  pull: ['Start the pull from your back muscles, not from your arms.', 'Squeeze your shoulder blades together at the end of the pull.', 'Avoid swinging your torso so the tension stays where you want it.'],
  squat: ['Descend to about parallel, or lower if your mobility allows it.', 'Drive your knees out so they track in line with your toes.', 'Keep your chest up and your spine neutral.'],
  hinge: ['Start the movement by pushing your hips back, not by bending your back.', 'Keep the bar or dumbbell close to your body.', 'Hold a neutral spine from start to finish.'],
  lunge: ['Keep your front shin close to vertical, with the knee tracking over the foot.', 'Lower straight down and keep your torso balanced.', 'Drive back up through your front heel.'],
  isolation: ['Keep your attention on the target muscle through the whole range.', 'Control the lowering phase and avoid using momentum.', 'Use a full range of motion without slamming the joint into lockout.'],
  carry: ['Keep your core braced and your shoulders back.', 'Walk with steady steps and your eyes forward.', 'Split the load evenly between both sides.'],
  core: ['Keep your lower back flat against the floor or in a neutral position.', 'Breathe steadily and avoid holding your breath.', 'Work from your abs rather than pulling on your neck.'],
  cardio: ['Begin with an easy warm-up and raise the intensity gradually.', 'Keep your breathing rhythm regular.', 'Watch your heart rate and stay at an effort you can hold comfortably.'],
  mobility: ['Move slowly and stay within a comfortable, pain-free range.', 'Breathe deeply and relax into each rep or hold.', 'The goal is to prepare the joint and muscle, not to fatigue them.'],
}

const MISTAKES_BY_PATTERN_EN: Record<MovementPattern, string[]> = {
  push: ['Lifting your hips off the bench while pressing.', 'Snapping the elbows straight at the top.', 'Using more weight than you can control.'],
  pull: ['Pulling with the arms only, without engaging the back.', 'Swinging the body to cheat the weight up.', 'Cutting the range of motion short.'],
  squat: ['Letting your heels come off the floor.', 'Letting the knees cave inward.', 'Letting the lower back round at the bottom.'],
  hinge: ['Rounding the back instead of pushing the hips back.', 'Letting the bar drift away from your body.', 'Keeping the knees rigidly locked instead of hinging at the hips.'],
  lunge: ['Letting the front knee shoot far forward while the heel lifts.', 'Leaning the torso forward.', 'Taking too short a step, which crowds the front knee.'],
  isolation: ['Swinging the weight instead of working the muscle.', 'Going so heavy that the range of motion gets shorter.', 'Dropping the weight fast with no control.'],
  carry: ['Letting the shoulders slump forward.', 'Holding your breath for the whole distance.', 'Carrying an uneven load between the two hands.'],
  core: ['Pulling on your neck instead of working your abs.', 'Holding your breath.', 'Using momentum instead of control.'],
  cardio: ['Starting at high intensity with no warm-up.', 'Hunching over the machine.', 'Ignoring the signs of excessive fatigue.'],
  mobility: ['Bouncing hard instead of holding the stretch.', 'Pushing past the point of pain.', 'Holding your breath while you stretch.'],
}

const SAFETY_BY_PATTERN_EN: Record<MovementPattern, string[]> = {
  push: ['Use a spotter, or set the safety pins, when you press heavy weight over your chest.', 'Avoid dropping the weight quickly into the bottom position.'],
  pull: ['Protect your lower back by keeping it in a neutral position.', 'Start with a weight that lets you keep clean form.'],
  squat: ['Set the safety bars in the rack before you load up.', 'Avoid snapping your knees into lockout at the top.'],
  hinge: ['A rounded lower back puts more strain on your spine, so keep it neutral.', 'Start light and master the pattern before you add weight.'],
  lunge: ['Mind your balance and hold a support when you need one.', 'Stop if you feel pain in the knee.'],
  isolation: ['Avoid excessive loads on a small joint.', 'Stop the set if you feel sharp pain.'],
  carry: ['Keep your walking path clear of obstacles.', 'Set the weight down under control when you finish.'],
  core: ['Stop if you feel pain in your lower back or neck.', 'Avoid fast, bouncing movements.'],
  cardio: ['Warm up before you start to lower your injury risk, and wind down gradually instead of stopping suddenly.', 'Drink water, and stop if you feel dizzy or unusually short of breath.'],
  mobility: ['Never force a joint into a painful range.', 'Stop right away if you feel sharp pain or tingling.'],
}

export const MUSCLE_AR: Record<Muscle, string> = {
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

/**
 * اسم العضلة بلغة الواجهة.
 *
 * الإنجليزية تأتي من `muscleLabels` في src/lib/muscles.ts بدل تعريف قاموس ثانٍ —
 * قاموسان للاسم نفسه ينحرفان حتمًا. العربية تبقى من MUSCLE_AR هنا كما هي بالضبط
 * (الملفّان يختلفان عربيًا في hamstrings وcardio؛ توحيدهما إصلاح منفصل).
 */
export function muscleName(m: Muscle, lang: Lang = 'ar'): string {
  return lang === 'en' ? muscleLabels[m].en : MUSCLE_AR[m]
}

/** نقاط تكنيك للتمرين — الخاصة به إن وُجدت، وإلا افتراضية حسب نمط الحركة. */
export function getTechniqueTips(exercise: Exercise, lang: Lang = 'ar'): string[] {
  if (lang !== 'en' && exercise.techniqueTipsAr?.length) return exercise.techniqueTipsAr
  if (lang === 'en') {
    if (exercise.techniqueTipsEn?.length) return exercise.techniqueTipsEn
    // A catalog item without authored English is intentionally not translated by inference.
    if (getExercise(exercise.id)) return []
  }
  const table = lang === 'en' ? TECHNIQUE_BY_PATTERN_EN : TECHNIQUE_BY_PATTERN
  const base = table[exercise.movementPattern] ?? table.isolation
  const lead =
    lang === 'en'
      ? `Focus on your ${muscleName(exercise.primaryMuscle, 'en')} throughout the movement.`
      : `ركّز على ${MUSCLE_AR[exercise.primaryMuscle]} طوال الحركة.`
  return [lead, ...base.slice(0, 2)]
}

/** أخطاء شائعة للتمرين — الخاصة به إن وُجدت، وإلا افتراضية حسب نمط الحركة. */
export function getCommonMistakes(exercise: Exercise, lang: Lang = 'ar'): string[] {
  if (lang !== 'en' && exercise.commonMistakesAr?.length) return exercise.commonMistakesAr
  if (lang === 'en') {
    if (exercise.commonMistakesEn?.length) return exercise.commonMistakesEn
    if (getExercise(exercise.id)) return []
  }
  const table = lang === 'en' ? MISTAKES_BY_PATTERN_EN : MISTAKES_BY_PATTERN
  return table[exercise.movementPattern] ?? table.isolation
}

/** تنبيهات أمان للتمرين — الخاصة به إن وُجدت، وإلا افتراضية حسب نمط الحركة. */
export function getSafetyNotes(exercise: Exercise, lang: Lang = 'ar'): string[] {
  if (lang !== 'en' && exercise.safetyNotesAr?.length) return exercise.safetyNotesAr
  if (lang === 'en') {
    if (exercise.safetyNotesEn?.length) return exercise.safetyNotesEn
    if (getExercise(exercise.id)) return []
  }
  const table = lang === 'en' ? SAFETY_BY_PATTERN_EN : SAFETY_BY_PATTERN
  const base = table[exercise.movementPattern] ?? table.isolation
  const priorInjury =
    lang === 'en'
      ? 'If you have a previous injury, check with a qualified professional before training.'
      : 'إذا كان لديك إصابة سابقة، استشر مختصًا قبل التمرين.'
  return [...base, priorInjury]
}

/** وصف واضح لزر/مصدر الفيديو بحيث لا نزعم أن كل رابط رسمي. */
export function getVideoLabel(exercise: Exercise, lang: Lang = 'ar'): string {
  const en = lang === 'en'
  switch (exercise.videoSource) {
    case 'official':
      return en ? 'Official video' : 'فيديو رسمي'
    case 'custom':
      return en ? 'Custom video' : 'فيديو مخصّص'
    case 'trusted':
    case 'trusted_video':
      return en ? 'Trusted tutorial video' : 'فيديو شرح موثوق'
    case 'youtube_search':
    default:
      return en ? 'Trusted YouTube search' : 'بحث يوتيوب موثوق'
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
  if (lang === 'en' && ex) {
    return { tips: getTechniqueTips(ex, 'en'), mistakes: getCommonMistakes(ex, 'en') }
  }
  if (lang === 'en') return g.en
  if (ex) {
    return { tips: getTechniqueTips(ex), mistakes: getCommonMistakes(ex) }
  }
  return g.ar
}

// — إرشاد مبسّط لتبويب «عن التمرين» في تفاصيل التمرين (ExerciseDetail) —
export interface ExerciseGuidance {
  howTo: string[]
  tips: string[]
  mistakes: string[]
  safety: string
}

const GUIDANCE_BY_PATTERN: Record<MovementPattern, ExerciseGuidance> = {
  push: {
    howTo: [
      'ثبّت لوح الكتف للخلف والأسفل قبل كل تكرار.',
      'انزل بتحكّم حتى مدى مريح، ثم ادفع بقوة للأعلى.',
      'حافظ على الرسغ مستقيمًا فوق المرفق.',
    ],
    tips: ['اشهق عند النزول وازفر عند الدفع.', 'لا تقفل المرفقين بعنف في الأعلى.'],
    mistakes: ['رفع الأرداف أو تقويس الظهر بشكل مبالغ.', 'تباعد المرفقين ٩٠° عن الجسم.'],
    safety: 'استخدم مراقبًا (Spotter) مع الأوزان الثقيلة على البار.',
  },
  pull: {
    howTo: [
      'ابدأ بشدّ لوح الكتف ثم اسحب بالمرفقين لا باليدين.',
      'اسحب حتى تلامس العضلة قمة الانقباض.',
      'ارجع بتحكّم حتى استطالة كاملة دون فقدان الشدّ.',
    ],
    tips: ['تخيّل أن يديك مجرد خطاطيف والشغل من الظهر.', 'تجنّب الأرجحة بالجسم.'],
    mistakes: ['استخدام الزخم بدل العضلة.', 'عدم إكمال مدى الحركة.'],
    safety: 'ابدأ بوزن يسمح بأداء نظيف قبل الزيادة.',
  },
  squat: {
    howTo: [
      'ثبّت القدمين بعرض الكتف والأصابع للخارج قليلًا.',
      'انزل بدفع الورك للخلف وإبقاء الصدر مرفوعًا.',
      'انزل حتى يوازي الفخذ الأرض أو أعمق إن أمكن بأمان.',
    ],
    tips: ['ادفع الركبتين للخارج باتجاه الأصابع.', 'وزّع الثقل على كامل القدم.'],
    mistakes: ['ميلان الركبتين للداخل.', 'تقويس أو تدوير أسفل الظهر.'],
    safety: 'استخدم قائمة الأمان (Safety bars) عند السكوات الثقيل.',
  },
  hinge: {
    howTo: [
      'حافظ على انحناءة طبيعية بأسفل الظهر طوال الحركة.',
      'ادفع الورك للخلف وأنزل البار قريبًا من الساقين.',
      'افرد الورك بقوة عند الصعود واعصر المؤخرة.',
    ],
    tips: ['شدّ عضلات البطن قبل الرفع.', 'أبقِ البار/الدمبل ملاصقًا للجسم.'],
    mistakes: ['تدوير الظهر تحت الحمل.', 'فتح الورك متأخرًا بعد الركبة.'],
    safety: 'الظهر المستقيم أهم من الوزن — خفّف إذا اختلّت الوضعية.',
  },
  lunge: {
    howTo: [
      'اخطُ خطوة ثابتة وأنزل بشكل عمودي.',
      'أبقِ الجذع منتصبًا والركبة الأمامية فوق القدم.',
      'ادفع من كعب القدم الأمامية للرجوع.',
    ],
    tips: ['ابدأ بوزن الجسم لإتقان التوازن.', 'انظر للأمام لا للأسفل.'],
    mistakes: ['تجاوز الركبة لأصابع القدم كثيرًا.', 'فقدان التوازن جانبيًا.'],
    safety: 'تمرّن قرب حامل أو جدار إذا اختلّ توازنك.',
  },
  isolation: {
    howTo: [
      'تحكّم في الوزن في كلا الاتجاهين دون أرجحة.',
      'ركّز على انقباض العضلة المستهدفة.',
      'توقّف لحظة عند قمة الانقباض.',
    ],
    tips: ['الوزن المعتدل بأداء نظيف أفضل من الثقيل المتأرجح.', 'مدى حركة كامل.'],
    mistakes: ['استخدام الزخم.', 'سرعة مبالغ بها تفقد الشدّ العضلي.'],
    safety: 'لا تدفع المفصل لمدى مؤلم.',
  },
  carry: {
    howTo: ['أمسك الوزن بقبضة محكمة وامشِ بخطوات ثابتة.', 'أبقِ الكتفين للخلف والجذع مشدودًا.'],
    tips: ['تنفّس بانتظام أثناء المشي.', 'حافظ على رأسك محايدًا.'],
    mistakes: ['الانحناء للأمام تحت الحمل.', 'خطوات غير متزنة.'],
    safety: 'اختر مسارًا خاليًا من العوائق.',
  },
  core: {
    howTo: ['شدّ عضلات البطن وثبّت الحوض.', 'تحرّك ببطء وتحكّم وتجنّب شدّ الرقبة.'],
    tips: ['الجودة أهم من العدد.', 'تنفّس ولا تحبس نفسك.'],
    mistakes: ['شدّ الرقبة باليدين.', 'تقويس أسفل الظهر في التمارين الثابتة.'],
    safety: 'أوقف إذا شعرت بألم بأسفل الظهر.',
  },
  cardio: {
    howTo: ['ابدأ بإحماء خفيف وارفع الشدّة تدريجيًا.', 'حافظ على وضعية مريحة وتنفّس منتظم.'],
    tips: ['راقب نبضك وحافظ على وتيرة تقدر تكمّلها.', 'رطّب جسمك بالماء.'],
    mistakes: ['البدء بشدّة عالية بلا إحماء.', 'وضعية منحنية على الجهاز.'],
    safety: 'قلّل الشدّة فورًا عند الدوخة أو ضيق التنفّس.',
  },
  mobility: {
    howTo: ['تحرّك ضمن مدى مريح دون ارتداد.', 'تنفّس بعمق وأطل الإطالة تدريجيًا.'],
    tips: ['ثبّت الإطالة دون ألم حاد.', 'كرّر بانتظام لتحسين المدى.'],
    mistakes: ['الارتداد العنيف.', 'تجاوز نقطة الألم.'],
    safety: 'لا تجبر المفصل على مدى مؤلم.',
  },
}

/** يرجع الإرشادات العامة المناسبة لنمط حركة التمرين (لتبويب «عن التمرين»). */

// English twin of GUIDANCE_BY_PATTERN (the exercise-detail «about» tab).
const GUIDANCE_BY_PATTERN_EN: Record<MovementPattern, ExerciseGuidance> = {
  push: {
    howTo: ['Set your shoulder blades back and down before every rep.', 'Lower under control to a comfortable range, then press back up with intent.', 'Keep your wrist straight and stacked over your elbow.'],
    tips: ['Breathe in as you lower and out as you press.', 'Avoid snapping your elbows into lockout at the top.'],
    mistakes: ['Lifting your hips off the bench or over-arching your back.', 'Flaring the elbows out to 90 degrees from your body.'],
    safety: 'Use a spotter when you press heavy weight with a barbell.',
  },
  pull: {
    howTo: ['Set your shoulder blades first, then pull with your elbows, not your hands.', 'Pull until the target muscle reaches full contraction.', 'Return under control to a full stretch without losing tension.'],
    tips: ['Think of your hands as hooks and let your back do the work.', 'Avoid swinging your body.'],
    mistakes: ['Using momentum instead of the muscle.', 'Not completing the full range of motion.'],
    safety: 'Start with a weight you can move cleanly before you add load.',
  },
  squat: {
    howTo: ['Set your feet about shoulder-width apart with the toes turned slightly out.', 'Descend by sending your hips back while keeping your chest up.', 'Go to about parallel, or deeper if you can do it safely with a neutral spine.'],
    tips: ['Drive your knees out so they track in line with your toes; some travel past the toes is normal.', 'Spread your weight across the whole foot.'],
    mistakes: ['Letting the knees cave inward.', 'Rounding or over-arching the lower back.'],
    safety: 'Set the safety bars in the rack when you squat heavy.',
  },
  hinge: {
    howTo: ['Keep the natural curve in your lower back for the whole movement.', 'Push your hips back and lower the bar close to your legs.', 'Drive your hips forward to stand up, and squeeze your glutes at the top.'],
    tips: ['Brace your abs before you lift.', 'Keep the bar or dumbbell against your body.'],
    mistakes: ['Rounding the back under load.', 'Letting the knees straighten before the hips, so the hips shoot up and the back takes the load.'],
    safety: 'A neutral back matters more than the weight on the bar, so lighten the load if your position breaks down.',
  },
  lunge: {
    howTo: ['Take a stable step and lower straight down.', 'Keep your torso upright and the front knee tracking over the foot.', 'Drive back up through your front heel.'],
    tips: ['Start with bodyweight until your balance is solid.', 'Look ahead, not down.'],
    mistakes: ['Letting the front knee shoot far forward while the heel lifts.', 'Losing your balance side to side.'],
    safety: 'Train next to a rack or a wall if your balance is shaky.',
  },
  isolation: {
    howTo: ['Control the weight in both directions, with no swinging.', 'Focus on contracting the target muscle.', 'Pause for a moment at peak contraction.'],
    tips: ['A moderate weight moved cleanly beats a heavy one you swing.', 'Use a full range of motion.'],
    mistakes: ['Using momentum.', 'Moving so fast that the muscle loses tension.'],
    safety: 'Avoid pushing a joint into a painful range.',
  },
  carry: {
    howTo: ['Take a firm grip on the weight and walk with steady steps.', 'Keep your shoulders back and your core braced.'],
    tips: ['Breathe steadily as you walk.', 'Keep your head in a neutral position.'],
    mistakes: ['Leaning forward under the load.', 'Uneven, unsteady steps.'],
    safety: 'Pick a path that is clear of obstacles.',
  },
  core: {
    howTo: ['Brace your abs and keep your pelvis stable.', 'Move slowly and under control, and avoid straining your neck.'],
    tips: ['Quality matters more than the rep count.', 'Breathe, and avoid holding your breath.'],
    mistakes: ['Pulling your head forward with your hands.', 'Letting the lower back arch during holds such as planks.'],
    safety: 'Stop if you feel pain in your lower back.',
  },
  cardio: {
    howTo: ['Begin with an easy warm-up and build the intensity gradually.', 'Hold a comfortable posture and keep your breathing steady.'],
    tips: ['Watch your pulse and hold a pace you can sustain.', 'Keep drinking water.'],
    mistakes: ['Starting hard with no warm-up.', 'Hunching over the machine.'],
    safety: 'Stop right away if you feel dizzy or unusually short of breath, and see a qualified professional if it keeps happening.',
  },
  mobility: {
    howTo: ['Move within a comfortable range, with no bouncing.', 'Breathe deeply and ease into the stretch gradually.'],
    tips: ['Hold the stretch at a point of mild tension, never at sharp pain.', 'Repeat regularly to build range over time.'],
    mistakes: ['Bouncing hard.', 'Pushing past the point of pain.'],
    safety: 'Avoid forcing a joint into a painful range.',
  },
}

export function guidanceFor(ex: Exercise, lang: Lang = 'ar'): ExerciseGuidance {
  const table = lang === 'en' ? GUIDANCE_BY_PATTERN_EN : GUIDANCE_BY_PATTERN
  const generic = table[ex.movementPattern] ?? table.isolation
  const known = Boolean(getExercise(ex.id))
  // Synthetic callers (and legacy probes) still receive the stable pattern card.
  if (!known) return generic
  if (lang === 'en') {
    return {
      howTo: ex.howToEn ?? [],
      tips: getTechniqueTips(ex, 'en'),
      mistakes: getCommonMistakes(ex, 'en'),
      safety: getSafetyNotes(ex, 'en')[0] ?? '',
    }
  }
  return {
    ...generic,
    tips: getTechniqueTips(ex),
    mistakes: getCommonMistakes(ex),
    safety: getSafetyNotes(ex)[0] ?? generic.safety,
  }
}
