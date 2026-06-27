// إرشاد التكنيك داخل وضع التمرين — نقاط تكنيك وأخطاء شائعة لكل نمط حركة.
// مصدر البيانات هنا لتفادي hardcoding داخل المكوّن، وقابل للتوسعة لاحقًا لكل تمرين.

import type { MovementPattern } from '@/types/workout'
import type { Lang } from '@/lib/appPreferences'
import { getExercise } from '@/data/exercises'

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
}

/** نقاط التكنيك والأخطاء الشائعة لتمرين — حسب نمط الحركة. */
export function exerciseGuidance(exerciseId: string, lang: Lang): GuidanceText {
  const ex = getExercise(exerciseId)
  const pattern = ex?.movementPattern ?? 'isolation'
  const g = byPattern[pattern] ?? byPattern.isolation
  return lang === 'en' ? g.en : g.ar
}
