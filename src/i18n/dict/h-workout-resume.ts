// قاموس حارة H — ح-١ استعادة الجلسة. ملف خاص بالحارة (§1.4.2): لا يُعدَّل قاموس
// مشترك ولا قاموس حارة أخرى. النبرة فصحى دافئة (§6): سؤال لا إعلان، وبلا لوم.

import type { Lang } from '@/lib/appPreferences'

export interface WorkoutResumeStrings {
  /** ترويسة ورقة الاستئناف. */
  title: string
  /** سطر يشرح ما وُجد — يُركَّب مع الأرقام المقاسة. */
  subtitle: string
  /** «{n} جولة مسجّلة» — تُملأ بعدد مقاس، لا تقديري. */
  loggedSets: (n: string) => string
  /** «في {name}» — التمرين الذي توقّف عنده. */
  stoppedAt: (name: string) => string
  /** «الجولة {n} التالية». */
  nextSet: (n: string) => string
  /** «بقي من الراحة {mmss}». */
  restLeft: (time: string) => string
  /** «منذ {n} دقيقة» / «منذ أكثر من ساعة» — لغة متحفّظة للزمن المقدَّر. */
  ageMinutes: (n: string) => string
  ageOverAnHour: string
  /** زرّ المتابعة. */
  resume: string
  /** زرّ البدء من جديد (فعل مدمِّر — يسبقه تأكيد). */
  discard: string
  /** تأكيد التجاهل. */
  discardConfirmTitle: string
  discardConfirmBody: (n: string) => string
  discardConfirmYes: string
  discardConfirmNo: string
  /** تنبيه صادق حين يفشل حفظ الجلسة الجارية. */
  saveFailedQuota: string
  saveFailedGeneric: string
  /** وصف وصولي لورقة الاستئناف. */
  sheetAria: string
  /** ح-٠ · خطة محفوظة موجودة ويومُ اليوم بلا تمارين — لا «أكمل إعدادك». */
  noTrainingTodayTitle: string
  noTrainingTodayBody: (days: string) => string
  noTrainingTodayCta: string
}

const ar: WorkoutResumeStrings = {
  title: 'عندك تمرين مفتوح',
  subtitle: 'تركت تمرينًا لم يُنهَ، وما سجّلته محفوظ كما هو.',
  loggedSets: (n) => `${n} جولة مسجّلة`,
  stoppedAt: (name) => `توقّفت عند: ${name}`,
  nextSet: (n) => `الجولة ${n} هي التالية`,
  restLeft: (time) => `بقي من الراحة ${time}`,
  ageMinutes: (n) => `منذ ${n} دقيقة تقريبًا`,
  ageOverAnHour: 'منذ أكثر من ساعة',
  resume: 'نكمّل',
  discard: 'أبدأ من جديد',
  discardConfirmTitle: 'تأكيد البدء من جديد',
  discardConfirmBody: (n) => `سيُحذف ما سجّلته في هذه الجلسة (${n} جولة). لا يمكن التراجع بعدها.`,
  discardConfirmYes: 'احذف وابدأ',
  discardConfirmNo: 'رجوع',
  saveFailedQuota: 'مساحة التخزين ممتلئة، فلم يُحفظ آخر تغيير. جولاتك السابقة سليمة.',
  saveFailedGeneric: 'تعذّر حفظ آخر تغيير على هذا الجهاز. جولاتك السابقة سليمة.',
  sheetAria: 'استئناف تمرين مفتوح',
  noTrainingTodayTitle: 'اليوم ليس يوم تمرين',
  noTrainingTodayBody: (days) => `خطتك محفوظة وفيها ${days} أيام تدريب. لا تمارين مجدولة لليوم.`,
  noTrainingTodayCta: 'رجوع للرئيسية',
}

const en: WorkoutResumeStrings = {
  title: 'You have a workout in progress',
  subtitle: 'You left a workout unfinished — everything you logged is still here.',
  loggedSets: (n) => `${n} sets logged`,
  stoppedAt: (name) => `Stopped at: ${name}`,
  nextSet: (n) => `Set ${n} is next`,
  restLeft: (time) => `${time} of rest left`,
  ageMinutes: (n) => `about ${n} minutes ago`,
  ageOverAnHour: 'over an hour ago',
  resume: 'Resume',
  discard: 'Start fresh',
  discardConfirmTitle: 'Start fresh?',
  discardConfirmBody: (n) => `This deletes what you logged in this session (${n} sets). It cannot be undone.`,
  discardConfirmYes: 'Delete and start',
  discardConfirmNo: 'Back',
  saveFailedQuota: 'Storage is full, so the last change was not saved. Your earlier sets are safe.',
  saveFailedGeneric: 'The last change could not be saved on this device. Your earlier sets are safe.',
  sheetAria: 'Resume workout in progress',
  noTrainingTodayTitle: 'No training scheduled today',
  noTrainingTodayBody: (days) => `Your plan is saved with ${days} training days. Nothing is scheduled for today.`,
  noTrainingTodayCta: 'Back to home',
}

export const workoutResumeStrings: Record<Lang, WorkoutResumeStrings> = { ar, en }
