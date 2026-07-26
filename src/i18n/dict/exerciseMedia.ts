import type { Lang } from '@/lib/appPreferences'

/**
 * نصوص عرض وسائط التمرين (Q20).
 *
 * كلها هنا لا داخل المكوّن — قاعدة المشروع: أي نص قابل للتخصيص في `config/` أو
 * `i18n/`. النبرة مقيَّدة بقاعدة الصدق: لا نقول «شرح» إلا لما هو شرح فعلًا، ولا
 * نُلمّح إلى وجود فيديو أو تشريح ليس عندنا.
 */
export interface ExerciseMediaStrings {
  /** تسمية إطار بداية الحركة. */
  startLabel: string
  /** تسمية إطار نهاية الحركة. */
  endLabel: string
  /** وصف للوصول لتسلسل البداية→النهاية. */
  sequenceAlt: (name: string) => string
  /** تسمية الرسم التوضيحي للجهاز (رسم داخلي، ليس صورة فوتوغرافية). */
  machineLabel: string
  /** وصف للوصول لرسم الجهاز. */
  machineAlt: (name: string) => string
  /** لقطة واحدة متاحة فقط — لا ندّعي أنها تُظهر الحركة كاملة. */
  singleFrameLabel: string
  /** الحالة الصادقة عند غياب وسيط موثوق. */
  pendingTitle: string
  pendingBody: string
}

const ar: ExerciseMediaStrings = {
  startLabel: 'البداية',
  endLabel: 'النهاية',
  sequenceAlt: (name) => `${name} — وضعية البداية ثم وضعية النهاية`,
  machineLabel: 'رسم الجهاز',
  machineAlt: (name) => `${name} — رسم توضيحي للجهاز`,
  singleFrameLabel: 'لقطة واحدة',
  pendingTitle: 'الشرح المرئي قيد الإضافة',
  pendingBody: 'ما عندنا صورة موثوقة لهذا التمرين بعد. الخطوات المكتوبة تحت كاملة وصحيحة.',
}

const en: ExerciseMediaStrings = {
  startLabel: 'Start',
  endLabel: 'End',
  sequenceAlt: (name) => `${name} — start position, then end position`,
  machineLabel: 'Machine diagram',
  machineAlt: (name) => `${name} — machine diagram`,
  singleFrameLabel: 'Single frame',
  pendingTitle: 'Visual guide coming soon',
  pendingBody: "We don't have a verified image for this exercise yet. The written steps below are complete and correct.",
}

export const exerciseMediaStrings: Record<Lang, ExerciseMediaStrings> = { ar, en }
