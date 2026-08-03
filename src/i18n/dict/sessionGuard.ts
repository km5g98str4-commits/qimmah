// نصوص حارس الجلسة — سؤالان قبل التخلّي عن تمرين فيه عمل. [CTO-72] البند ٤.
//
// ═══ لماذا سؤالان لا سؤال واحد ═══
// التخلّي عن جلسة له مساران، ونتيجتهما **مختلفة فعلًا**:
//
//   • **التوقّف** (زرّ ✕ في وضع الجلسة): المجموعات **تبقى محفوظة** وتظهر بطاقة
//     «عندك تمرين لم ينتهِ» للاستئناف. لا شيء يضيع.
//   • **البدء نظيفًا** (زرّ التجاهل في تلك البطاقة): المجموعات **تُمحى نهائيًا**.
//     قِيس: `qimmah:activeWorkout:v1` يصير `{}` — بلا سؤال وبلا تراجع.
//
// فلو استُعملت جملة «تقدّمك بيروح» في الحالتين لكذبنا في إحداهما. و§5 من دستور
// الجودة يمنع الاتجاهين معًا: لا واجهة تَعِد بما لا يحدث، **ولا واجهة تُحذّر من
// فقدٍ لا يقع**. تحذير كاذب يُعلّم المستخدم تجاهل التحذيرات — فيمرّ على الحقيقي.
//
// لذلك: التوقّف يقول الحقيقة المطمئنة، والمحو يقول الحقيقة الصريحة.
//
// النبرة (§6): عامية بيضاء · بلا لوم ولا تهويل · والفعل المدمّر يُسمّى باسمه.

import type { Lang } from '@/lib/appPreferences'

export interface SessionGuardCopy {
  /** ✕ أثناء الجلسة — العمل **باقٍ**، والسؤال عن التوقّف لا عن الفقد. */
  stopTitle: string
  stopBody: (sets: number) => string
  stopConfirm: string
  stopCancel: string

  /** «ابدأ نظيفًا» — الفقد **حقيقي** هنا، فيُقال صريحًا. */
  discardTitle: string
  discardBody: (sets: number) => string
  discardConfirm: string
  discardCancel: string

  /** تسمية النافذة لقارئ الشاشة. */
  dialogLabel: string
}

/** أرقام عربية-هندية في النصّ العربي — اتّساقًا مع بقية نصوص الجلسة. */
const arNum = (n: number) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])

const ar: SessionGuardCopy = {
  stopTitle: 'توقّف التمرين الحين؟',
  stopBody: (sets) =>
    `سجّلت ${arNum(sets)} ${sets === 1 ? 'مجموعة' : 'مجموعات'}. بتنحفظ لك، وتقدر تكمّل من مكانك وقت ما ترجع.`,
  stopConfirm: 'وقّف الحين',
  stopCancel: 'كمّل التمرين',

  discardTitle: 'تقدّمك في الجلسة بيروح — متأكد؟',
  discardBody: (sets) =>
    `${arNum(sets)} ${sets === 1 ? 'مجموعة مسجّلة بتنمسح' : 'مجموعات مسجّلة بتنمسح'} ومعها تفاصيل الجلسة. ما فيه تراجع بعدها.`,
  discardConfirm: 'امسحها وابدأ نظيف',
  discardCancel: 'خلّها',

  dialogLabel: 'تأكيد قبل ترك الجلسة',
}

const en: SessionGuardCopy = {
  stopTitle: 'Stop the workout now?',
  stopBody: (sets) =>
    `You logged ${sets} ${sets === 1 ? 'set' : 'sets'}. They stay saved, and you can pick up where you left off.`,
  stopConfirm: 'Stop for now',
  stopCancel: 'Keep training',

  discardTitle: 'This will erase your session progress — sure?',
  discardBody: (sets) =>
    `${sets} logged ${sets === 1 ? 'set' : 'sets'} and the session details will be deleted. There is no undo.`,
  discardConfirm: 'Erase and start fresh',
  discardCancel: 'Keep it',

  dialogLabel: 'Confirm before leaving the session',
}

export const sessionGuardStrings: Record<Lang, SessionGuardCopy> = { ar, en }
