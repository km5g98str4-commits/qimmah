// قاموس «الذكاء التدريبي» (P10.1) — قوالب نصوص الملاحظات بالعربية والإنجليزية.
// القوالب تحمل وسائط تُستبدل وقت التوليد: {exercise} اسم التمرين، {muscle} اسم العضلة.

import type { Lang } from '@/lib/appPreferences'

export interface InsightsStrings {
  /** ألم مسجّل في تمرين — {exercise}. */
  pain: string
  /** ثبات على الهدف لجلستين → اقتراح زيادة الوزن — {exercise}. */
  progress: string
  /** عدم بلوغ التكرارات لجلستين → تثبيت الوزن — {exercise}. */
  hold: string
  /** عضلة ناقصة هذا الأسبوع — {muscle}. */
  undertrained: string
}

const ar: InsightsStrings = {
  pain: 'سجّلت ألم في «{exercise}». جرّب بديل أو خفّف الحمل.',
  progress: 'أداؤك ثابت في «{exercise}». جرّب تزيد الوزن 2.5 كجم في التمرين الجاي.',
  hold: 'ثبّت الوزن في «{exercise}» لين تكمّل التكرارات المستهدفة.',
  undertrained: 'عضلة {muscle} ناقصة هذا الأسبوع.',
}

const en: InsightsStrings = {
  pain: 'You logged pain on "{exercise}". Try an alternative or go lighter.',
  progress: 'You\'ve been steady on "{exercise}". Try adding 2.5 kg next workout.',
  hold: 'Keep the weight on "{exercise}" where it is until you hit the target reps.',
  undertrained: "{muscle} hasn't gotten much work this week.",
}

export const insightsStrings: Record<Lang, InsightsStrings> = { ar, en }
