// قاموس توصيات التغطية العضلية (P12) — قوالب النصوص بالعربية والإنجليزية.
// الوسائط تُستبدل وقت التوليد: {muscles} أسماء عضلات مفصولة، {muscle} اسم عضلة واحدة.

import type { Lang } from '@/lib/appPreferences'

export interface MuscleCoverageStrings {
  /** عضلات ناقصة هذا الأسبوع — {muscles} (عضلة واحدة). */
  missingSingle: string
  /** عضلات ناقصة هذا الأسبوع — {muscles} (أكثر من عضلة). */
  missingMultiple: string
  /** عضلة تحتاج راحة اليوم — {muscle}. */
  needsRest: string
  /** عضلات تجاوزت الحد الموصى به — {muscles}. */
  overtrained: string
  /** عضلة تعافت وجاهزة — {muscle}. */
  readyToTrain: string
  /** الفاصل بين أسماء العضلات في القائمة. */
  listSeparator: string
}

const ar: MuscleCoverageStrings = {
  missingSingle: '{muscles} تمرّن أقل من باقي العضلات هذا الأسبوع — أضف له تمرين.',
  missingMultiple: '{muscles} تمرّنت أقل من باقي العضلات هذا الأسبوع — أضف لها تمارين.',
  needsRest: '{muscle} يحتاج راحة اليوم — لسا ما تعافى بالكامل.',
  overtrained: '{muscles} تجاوز الحد الموصى به من المجموعات — خفّف الحجم شوي.',
  readyToTrain: '{muscle} تعافى وجاهز للتمرين اليوم.',
  listSeparator: '، ',
}

const en: MuscleCoverageStrings = {
  missingSingle: '{muscles} got less work than the rest this week — add an exercise for it.',
  missingMultiple: '{muscles} got less work than the rest this week — add exercises for them.',
  needsRest: "{muscle} needs rest today — it hasn't fully recovered yet.",
  overtrained: '{muscles} exceeded the recommended weekly sets — dial the volume back a little.',
  readyToTrain: '{muscle} has recovered and is ready to train today.',
  listSeparator: ', ',
}

export const muscleCoverageStrings: Record<Lang, MuscleCoverageStrings> = { ar, en }
