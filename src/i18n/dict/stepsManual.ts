// نصوص مسجّل الخطوات اليدوي — [R3-UX-STEPS].
//
// ═══ الحقيقة التي تحكم كل سطر هنا ═══
// **بناء الويب لا يقرأ HealthKit ولا أي عدّاد.** الجسر (`window.QimmahSteps`)
// مسجَّل في كل بيئة، لكن الذي يدفع فيه مجاميعَ اليوم plugin أصلي لا وجود له في
// المتصفّح. فأي صياغة تقول «نتتبّع خطواتك» أو «يتحدّث تلقائيًا» تَعِد بما لا
// يحدث — وهو ما يمنعه §5 («فشل الحفظ لا يُبتلع» · «لا بيانات وهمية») و§6-٤
// («الصدق قبل الطمأنينة»).
//
// ولذلك السطر التوضيحي **سطران لا سطر**: واحد للويب يقول «الرقم منك أنت»،
// وواحد للغلاف الأصلي يقول إن الربط **ممكن** ويبقى الإدخال يدويًّا حتى يقع.
// «قد» لا «سوف»: iOS لا يكشف رفض القراءة أصلًا (عقد الصدق في `healthKit.ts`).
//
// النبرة عامية بيضاء (§6)، والإنجليزية غير رسمية.

import type { Lang } from '@/lib/appPreferences'

export interface StepsManualStrings {
  title: string
  /** لمحة القسم — تقول من أين يأتي الرقم قبل أن يُعرض. */
  eyebrow: string
  /** الشرح على الويب: لا قراءة تلقائية، الرقم من المستخدم. */
  sourceWeb: string
  /** الشرح داخل الغلاف الأصلي: الربط ممكن، والإدخال يدوي حتى يقع. */
  sourceNative: string
  /** ما يُعرض حين لا يوجد رقم اليوم — «—» لا صفرًا مخترعًا. */
  emptyValue: string
  emptyHint: string
  /** «٤٬٢٠٠ من ١٠٬٠٠٠» — النصّان منسَّقان مسبقًا. */
  ofGoal: (steps: string, goal: string) => string
  goalReached: string
  stepsUnit: string
  edit: string
  stepsFieldLabel: string
  goalFieldLabel: string
  goalOptionalHint: string
  save: string
  cancel: string
  saved: string
  /** فشل الحفظ — لا شاشة نجاح ولا مسح للمُدخَل (§5). */
  saveFailedQuota: string
  saveFailedBlocked: string
  saveFailedGeneric: string
  /** وصف صوتي كامل لشريط التقدّم — لا يعتمد على اللون. */
  progressAria: (steps: string, goal: string) => string
  /** مصدر رقم اليوم كما هو مسجَّل فعلًا. */
  writtenByYou: string
  writtenByHealth: string
}

const ar: StepsManualStrings = {
  title: 'خطوات اليوم',
  eyebrow: 'تسجّلها بنفسك',
  sourceWeb: 'نسخة المتصفّح ما تقرأ عدّاد جهازك — الرقم اللي تكتبه هنا هو مصدرنا الوحيد.',
  sourceNative: 'لو ربطت Apple Health من الإعدادات يوصلنا مجموع يومك منها. وإلى أن يصير، الرقم اللي تكتبه هنا هو مصدرنا.',
  emptyValue: '—',
  emptyHint: 'ما سجّلت خطوات اليوم بعد.',
  ofGoal: (steps, goal) => `${steps} من ${goal}`,
  goalReached: 'كمّلت هدف اليوم',
  stepsUnit: 'خطوة',
  edit: 'سجّل خطواتك',
  stepsFieldLabel: 'مجموع خطوات اليوم',
  goalFieldLabel: 'هدفك اليومي',
  goalOptionalHint: 'اختياري — تقدر تغيّره أي وقت.',
  save: 'احفظ',
  cancel: 'إلغاء',
  saved: 'تم الحفظ',
  saveFailedQuota: 'مساحة التخزين على جهازك ممتلئة، فما انحفظ الرقم. رقمك باقٍ في الخانة — فضّي شوي وجرّب.',
  saveFailedBlocked: 'التخزين محجوب في هذا المتصفّح، فما نقدر نحفظ الرقم. رقمك باقٍ في الخانة.',
  saveFailedGeneric: 'ما قدرنا نحفظ الرقم. رقمك باقٍ في الخانة — جرّب مرة ثانية.',
  progressAria: (steps, goal) => `خطوات اليوم · ${steps} من ${goal}`,
  writtenByYou: 'أنت كتبته',
  writtenByHealth: 'من Apple Health',
}

const en: StepsManualStrings = {
  title: 'Today’s steps',
  eyebrow: 'You log these yourself',
  sourceWeb: 'The browser build can’t read your device’s step counter — the number you type here is our only source.',
  sourceNative: 'If you connect Apple Health in Settings, your daily total comes from there. Until you do, the number you type here is our source.',
  emptyValue: '—',
  emptyHint: 'No steps logged today yet.',
  ofGoal: (steps, goal) => `${steps} of ${goal}`,
  goalReached: 'Daily goal reached',
  stepsUnit: 'steps',
  edit: 'Log your steps',
  stepsFieldLabel: 'Total steps today',
  goalFieldLabel: 'Your daily goal',
  goalOptionalHint: 'Optional — you can change it anytime.',
  save: 'Save',
  cancel: 'Cancel',
  saved: 'Saved',
  saveFailedQuota: 'Your device storage is full, so the number wasn’t saved. It’s still in the box — free some space and try again.',
  saveFailedBlocked: 'Storage is blocked in this browser, so we can’t save the number. It’s still in the box.',
  saveFailedGeneric: 'We couldn’t save that number. It’s still in the box — please try again.',
  progressAria: (steps, goal) => `Today’s steps · ${steps} of ${goal}`,
  writtenByYou: 'You logged this',
  writtenByHealth: 'From Apple Health',
}

export const stepsManualStrings: Record<Lang, StepsManualStrings> = { ar, en }
