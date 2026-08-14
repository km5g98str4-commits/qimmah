import type { Lang } from '@/lib/appPreferences'

export interface MeasurementsScreenStrings {
  title: string
  intro: string
  back: string
  backToProgress: string
  add: string
  historyTitle: string
  emptyTitle: string
  emptyBody: string
  weight: string
  waist: string
  bodyFat: string
  kg: string
  cm: string
  estimated: string
  healthSource: string
  edit: string
  delete: string
  deleteQuestion: string
  deleteBody: string
  cancel: string
  confirmDelete: string
  storageError: string
  unavailableRecord: string
  progressEntryTitle: string
  progressEntryBody: string
  editTitle: string
  addTitle: string
  formIntro: string
  save: string
  update: string
  syncNote: string
  weightRange: string
  waistRange: string
  bodyFatRange: string
}

const ar: MeasurementsScreenStrings = {
  title: 'القياسات',
  intro: 'سجلّك الفعلي للوزن والخصر ونسبة الدهون. الأرقام المقاسة حاسمة، ونسبة الدهون تظل تقديرية.',
  back: 'رجوع',
  backToProgress: 'رجوع إلى التقدّم',
  add: 'أضف قياسًا',
  historyTitle: 'سجلّ القياسات',
  emptyTitle: 'ما فيه قياسات مسجّلة لسا.',
  emptyBody: 'أضف وزنك اليوم، وتقدر تضيف الخصر أو نسبة الدهون إذا قستها.',
  weight: 'الوزن',
  waist: 'محيط الخصر',
  bodyFat: 'نسبة الدهون',
  kg: 'كجم',
  cm: 'سم',
  estimated: 'تقديري',
  healthSource: 'من Apple Health',
  edit: 'عدّل',
  delete: 'احذف',
  deleteQuestion: 'تحذف هذا القياس؟',
  deleteBody: 'ينحذف من سجلّك. تقدر تلغي وترجع بدون تغيير.',
  cancel: 'إلغاء',
  confirmDelete: 'نعم، احذفه',
  storageError: 'ما قدرنا نحفظ التغيير على جهازك. بياناتك الحالية ما تغيّرت — فضّ مساحة أو فعّل التخزين وجرّب مرة ثانية.',
  unavailableRecord: 'هذا السجل من مصدر صحي أو ما عاد متاحًا للتعديل هنا.',
  progressEntryTitle: 'القياسات',
  progressEntryBody: 'أضف وزنك وراجع سجلّك وعدّل قياساتك',
  editTitle: 'تعديل القياس',
  addTitle: 'تسجيل قياسات اليوم',
  formIntro: 'سجّل وزنك، وأضف الخصر أو نسبة الدهون إن قستها اليوم.',
  save: 'احفظ القياسات',
  update: 'احفظ التعديل',
  syncNote: 'تُحفظ القياسات على جهازك، وتُزامن مع حسابك فقط عند تفعيل المزامنة.',
  weightRange: 'أدخل وزنًا بين 15 و250 كجم.',
  waistRange: 'أدخل محيط خصر بين 30 و250 سم.',
  bodyFatRange: 'أدخل نسبة دهون بين 2% و70%.',
}

const en: MeasurementsScreenStrings = {
  title: 'Measurements',
  intro: 'Your real weight, waist, and body-fat history. Measured numbers are exact; body-fat remains an estimate.',
  back: 'Back',
  backToProgress: 'Back to Progress',
  add: 'Add measurement',
  historyTitle: 'Measurement history',
  emptyTitle: 'No measurements logged yet.',
  emptyBody: 'Add today’s weight, plus waist or body fat if you measured them.',
  weight: 'Weight',
  waist: 'Waist',
  bodyFat: 'Body fat',
  kg: 'kg',
  cm: 'cm',
  estimated: 'estimated',
  healthSource: 'From Apple Health',
  edit: 'Edit',
  delete: 'Delete',
  deleteQuestion: 'Delete this measurement?',
  deleteBody: 'It will be removed from your history. You can cancel and go back without changing anything.',
  cancel: 'Cancel',
  confirmDelete: 'Yes, delete it',
  storageError: 'We couldn’t save the change on your device. Your current data is unchanged — free some space or enable storage, then try again.',
  unavailableRecord: 'This entry comes from a health source or is no longer available to edit here.',
  progressEntryTitle: 'Measurements',
  progressEntryBody: 'Add weight, review history, and edit measurements',
  editTitle: 'Edit measurement',
  addTitle: 'Log today’s measurements',
  formIntro: 'Log your weight, and add waist or body fat if measured today.',
  save: 'Save measurements',
  update: 'Save changes',
  syncNote: 'Measurements stay on your device and sync to your account only when cloud sync is enabled.',
  weightRange: 'Enter a weight between 15 and 250 kg.',
  waistRange: 'Enter a waist measurement between 30 and 250 cm.',
  bodyFatRange: 'Enter body fat between 2% and 70%.',
}

export const measurementsScreenStrings: Record<Lang, MeasurementsScreenStrings> = { ar, en }
