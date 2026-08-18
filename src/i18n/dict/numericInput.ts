import type { Lang } from '@/lib/appPreferences'

/**
 * نصوص حدّ الإدخال الرقمي — تقول **ما الخطأ** بدل المسح الصامت.
 *
 * كانت الحقول تبتلع الخطأ ثلاث مرات: تمسح ما يُكتب («٢٤» ⇐ فراغ)، أو تعطي
 * رقمًا معقولًا ليس ما كُتب («78٫5» ⇐ «785»)، أو تقفز إلى الحدّ الأدنى
 * («٢٤» ⇐ ١٣ فيصير البالغ قاصرًا). الثلاثة أخطر من رسالة صريحة.
 *
 * ⚠️ الوسائط **نصوص مُهيَّأة مسبقًا** لا أرقامًا — نمط `reveal.ts:122`: أي
 * وسيط مكتوب `(n: number)` تسرّبٌ لاتيني ينتظر وقوعه.
 */
interface NumericInputCopy {
  unreadable: string
  empty: string
  belowMin: (min: string) => string
  aboveMax: (max: string) => string
  outOfRange: (min: string, max: string) => string
}

export const numericInputStrings: Record<Lang, NumericInputCopy> = {
  ar: {
    unreadable: 'ما قدرنا نقرأ هذا الرقم — تقدر تكتبه بالأرقام العربية أو الغربية.',
    empty: 'الخانة فاضية — اكتب رقمًا.',
    belowMin: (min) => `أصغر رقم مقبول هنا ${min}.`,
    aboveMax: (max) => `أكبر رقم مقبول هنا ${max}.`,
    outOfRange: (min, max) => `خلّ الرقم بين ${min} و${max}.`,
  },
  en: {
    unreadable: 'We could not read that number — Arabic or Western digits both work.',
    empty: 'This field is empty — type a number.',
    belowMin: (min) => `The smallest value here is ${min}.`,
    aboveMax: (max) => `The largest value here is ${max}.`,
    outOfRange: (min, max) => `Keep it between ${min} and ${max}.`,
  },
}

/**
 * رسائل الحدود الرقمية للتمرين/التغذية/الماء.
 *
 * كانت في `src/lib/validation.ts` نصوصًا صلبة **عربية وحدها** بأرقام لاتينية
 * مكتوبة داخلها — فتظهر عربية داخل واجهة إنجليزية، وتعرض «50» داخل شاشة
 * أرقامها «٥٠». هنا بلغتين، ووسائطها نصوص مُهيَّأة من `formatNumber`.
 */
interface NumLimitCopy {
  workoutWeight: (min: string, max: string) => string
  reps: (min: string, max: string) => string
  dailyCalories: (min: string, max: string) => string
  quickCalories: (min: string, max: string) => string
  quickProtein: (min: string, max: string) => string
  quickMacro: (min: string, max: string) => string
  waterMl: (min: string, max: string) => string
}

export const numLimitStrings: Record<Lang, NumLimitCopy> = {
  ar: {
    workoutWeight: (min, max) => `اكتب وزنًا بين ${min} و${max} كجم.`,
    reps: (min, max) => `اكتب تكرارات بين ${min} و${max}.`,
    dailyCalories: (min, max) => `اكتب سعرات يومية بين ${min} و${max}.`,
    quickCalories: (min, max) => `اكتب سعرات بين ${min} و${max} للوجبة.`,
    quickProtein: (min, max) => `اكتب بروتينًا بين ${min} و${max} غ.`,
    quickMacro: (min, max) => `اكتب قيمة بين ${min} و${max} غ.`,
    waterMl: (min, max) => `اكتب كمية ماء بين ${min} و${max} مل.`,
  },
  en: {
    workoutWeight: (min, max) => `Enter a weight between ${min} and ${max} kg.`,
    reps: (min, max) => `Enter reps between ${min} and ${max}.`,
    dailyCalories: (min, max) => `Enter daily calories between ${min} and ${max}.`,
    quickCalories: (min, max) => `Enter calories between ${min} and ${max} for this meal.`,
    quickProtein: (min, max) => `Enter protein between ${min} and ${max} g.`,
    quickMacro: (min, max) => `Enter a value between ${min} and ${max} g.`,
    waterMl: (min, max) => `Enter a water amount between ${min} and ${max} ml.`,
  },
}
