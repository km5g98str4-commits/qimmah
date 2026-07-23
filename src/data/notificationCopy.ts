import type { Lang } from '@/lib/appPreferences'
import type { ReminderKind } from '@/lib/notifications/types'

export interface NotificationSettingsCopy {
  title: string
  intro: string
  master: string
  masterHint: string
  workout: string
  workoutHint: string
  rest: string
  restHint: string
  water: string
  waterHint: string
  everyHours: (hours: number) => string
  weekly: string
  weeklyHint: string
  supplements: string
  supplementsHint: string
  quietHours: string
  quietHint: string
  from: string
  to: string
  unsupported: string
  denied: string
  recoveryBlocked: string
  saved: string
  saving: string
  error: string
  scheduleSkipped: string
  weekdays: string[]
}

const SETTINGS: Record<Lang, Omit<NotificationSettingsCopy, 'everyHours'>> = {
  ar: {
    title: 'التذكيرات',
    intro: 'اختر ما يفيد يومك. تُجدول التنبيهات على هذا الجهاز فقط، ويمكنك إيقافها في أي وقت.',
    master: 'تفعيل تذكيرات قِمّة',
    masterHint: 'لن نطلب الإذن إلا بعد اختيارك التفعيل.',
    workout: 'أيام التمرين',
    workoutHint: 'وفق أيام خطتك الحالية',
    rest: 'أيام الراحة',
    restHint: 'تذكير هادئ بالتعافي',
    water: 'الماء',
    waterHint: 'خلال ساعات الاستيقاظ فقط',
    weekly: 'ملخّص الأسبوع',
    weeklyHint: 'مراجعة قصيرة لتقدّمك',
    supplements: 'المكمّلات والأدوية',
    supplementsHint: 'تذكير عام؛ اتبع تعليمات مختصك',
    quietHours: 'ساعات الهدوء',
    quietHint: 'لا تُجدول تنبيهات داخل هذه الفترة',
    from: 'من',
    to: 'إلى',
    unsupported: 'التنبيهات المجدولة متاحة داخل تطبيق قِمّة على iPhone.',
    denied: 'الإشعارات متوقفة لقِمّة. فعّلها من إعدادات iPhone ثم أعد المحاولة.',
    recoveryBlocked: 'تتوقف التذكيرات مؤقتًا أثناء استعادة كلمة المرور.',
    saved: 'تم تحديث جدول التذكيرات على هذا الجهاز.',
    saving: 'يتم تحديث الجدول…',
    error: 'تعذّر تحديث الجدول. حاول مرة أخرى.',
    scheduleSkipped: 'أي وقت يقع داخل ساعات الهدوء لن يُجدول.',
    weekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  },
  en: {
    title: 'Reminders',
    intro: 'Choose what helps your day. Notifications are scheduled only on this device and can be stopped anytime.',
    master: 'Enable Qimmah reminders',
    masterHint: 'We ask for permission only after you choose to enable them.',
    workout: 'Workout days',
    workoutHint: 'Follows your current plan days',
    rest: 'Rest days',
    restHint: 'A calm recovery reminder',
    water: 'Water',
    waterHint: 'Only during waking hours',
    weekly: 'Weekly brief',
    weeklyHint: 'A short progress review',
    supplements: 'Supplements & medication',
    supplementsHint: 'A general reminder; follow professional advice',
    quietHours: 'Quiet hours',
    quietHint: 'No notifications are scheduled in this window',
    from: 'From',
    to: 'To',
    unsupported: 'Scheduled notifications are available in the Qimmah iPhone app.',
    denied: 'Notifications are off for Qimmah. Enable them in iPhone Settings, then try again.',
    recoveryBlocked: 'Reminders pause while password recovery is active.',
    saved: 'The reminder schedule was updated on this device.',
    saving: 'Updating schedule…',
    error: 'The schedule could not be updated. Try again.',
    scheduleSkipped: 'A time inside quiet hours will not be scheduled.',
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
}

export function notificationSettingsCopy(lang: Lang): NotificationSettingsCopy {
  return {
    ...SETTINGS[lang],
    everyHours: (hours) =>
      lang === 'ar'
        ? hours === 1 ? 'كل ساعة' : `كل ${hours.toLocaleString('ar-EG')} ساعات`
        : hours === 1 ? 'Every hour' : `Every ${hours} hours`,
  }
}

interface NotificationMessage {
  title: string
  body: string
}

export function notificationMessage(
  kind: ReminderKind,
  lang: Lang,
): NotificationMessage {
  const ar = lang === 'ar'
  switch (kind) {
    case 'workoutDay':
      return {
        title: ar ? 'ابدأ تمرين اليوم' : 'Start today’s workout',
        body: ar ? 'خطتك جاهزة. افتحها وابدأ.' : 'Your plan is ready. Open it and begin.',
      }
    case 'restDay':
      return {
        title: ar ? 'خصص وقتًا للتعافي' : 'Make time for recovery',
        body: ar ? 'مشي خفيف أو إطالة يكفي اليوم. التعافي جزء من التقدّم.' : 'A light walk or mobility is enough today. Recovery supports progress.',
      }
    case 'water':
      return {
        title: ar ? 'اشرب كوب ماء' : 'Have a glass of water',
        body: ar ? 'خطوة صغيرة تكمل هدفك اليومي.' : 'A small step toward today’s target.',
      }
    case 'weeklyBrief':
      return {
        title: ar ? 'راجع ملخّص أسبوعك' : 'Review your weekly brief',
        body: ar ? 'تقدّمك جاهز للقراءة بأرقام واضحة.' : 'Your progress is ready to review with clear numbers.',
      }
    case 'supplements':
      return {
        title: ar ? 'راجع روتينك الصحي' : 'Review your health routine',
        body: ar ? 'راجع روتينك وفق تعليمات مختصك. تبقى التفاصيل داخل التطبيق.' : 'Review your routine according to professional advice. Details stay inside the app.',
      }
    // (P5) إشعار نهاية الراحة داخل الجلسة — يصل والتطبيق في الخلفية.
    case 'restEnd':
      return {
        title: ar ? 'انتهت الراحة' : 'Rest is over',
        body: ar ? 'جاهز للمجموعة التالية؟ ارجع لتمرينك.' : 'Ready for the next set? Head back to your workout.',
      }
  }
}
