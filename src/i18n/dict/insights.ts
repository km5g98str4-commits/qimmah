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
  pain: 'سجّلت ألمًا في «{exercise}». جرّب بديلًا أو خفّف الحمل.',
  progress: 'أداؤك ثابت في «{exercise}». جرّب زيادة الوزن 2.5 كجم في التمرين القادم.',
  hold: 'ثبّت الوزن في «{exercise}» حتى تكمل التكرارات المستهدفة.',
  undertrained: 'عضلة {muscle} ناقصة هذا الأسبوع.',
}

const en: InsightsStrings = {
  pain: 'You logged pain on "{exercise}". Try an alternative or lighten the load.',
  progress: 'Your performance is steady on "{exercise}". Try adding 2.5 kg next workout.',
  hold: 'Hold the weight on "{exercise}" until you complete the target reps.',
  undertrained: "{muscle} hasn't been trained this week.",
}

export const insightsStrings: Record<Lang, InsightsStrings> = { ar, en }
