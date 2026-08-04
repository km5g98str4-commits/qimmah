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
    intro: 'اختر اللي يفيد يومك. التنبيهات تنجدول على هذا الجهاز بس، وتقدر توقفها في أي وقت.',
    master: 'تفعيل تذكيرات قِمّة',
    masterHint: 'ما نطلب الإذن إلا إذا اخترت تفعّلها.',
    workout: 'أيام التمرين',
    workoutHint: 'على أيام خطتك الحالية',
    rest: 'أيام الراحة',
    restHint: 'تذكير هادئ بالتعافي',
    water: 'الماء',
    waterHint: 'خلال ساعات الاستيقاظ بس',
    weekly: 'ملخّص الأسبوع',
    weeklyHint: 'مراجعة قصيرة لتقدّمك',
    supplements: 'المكمّلات والأدوية',
    supplementsHint: 'تذكير عام — التزم بتعليمات مختصك',
    quietHours: 'ساعات الهدوء',
    quietHint: 'ما تنجدول تنبيهات داخل هذي الفترة',
    from: 'من',
    to: 'إلى',
    unsupported: 'التنبيهات المجدولة متاحة داخل تطبيق قِمّة على iPhone.',
    denied: 'الإشعارات موقوفة لقِمّة. فعّلها من إعدادات iPhone ثم جرّب مرة ثانية.',
    recoveryBlocked: 'التذكيرات موقوفة مؤقتًا وأنت في وضع استعادة كلمة المرور.',
    saved: 'تم تحديث جدول التذكيرات على هذا الجهاز.',
    saving: 'نحدّث الجدول…',
    error: 'ما قدرنا نحدّث الجدول. جرّب مرة ثانية.',
    scheduleSkipped: 'أي وقت داخل ساعات الهدوء ما بينجدول.',
    weekdays: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  },
  en: {
    title: 'Reminders',
    intro: 'Choose what helps your day. Notifications are scheduled only on this device and can be stopped anytime.',
    master: 'Enable Qimmah reminders',
    masterHint: 'We only ask for permission once you turn them on.',
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
    error: "Couldn't update the schedule. Try again.",
    scheduleSkipped: "Times inside quiet hours won't be scheduled.",
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
        body: ar ? 'خطتك جاهزة — افتحها وابدأ.' : 'Your plan is ready. Open it and get going.',
      }
    case 'restDay':
      return {
        title: ar ? 'خصّص وقت للتعافي' : 'Make time for recovery',
        body: ar ? 'مشي خفيف أو إطالة تكفي اليوم — التعافي جزء من التقدّم.' : 'A light walk or a stretch is enough today. Recovery is part of progress.',
      }
    case 'water':
      return {
        title: ar ? 'اشرب كوب ماء' : 'Have a glass of water',
        body: ar ? 'خطوة صغيرة تكمّل هدفك اليومي.' : 'A small step toward today’s target.',
      }
    case 'weeklyBrief':
      return {
        title: ar ? 'شوف ملخّص أسبوعك' : 'Check your weekly recap',
        body: ar ? 'تقدّمك جاهز — بأرقام واضحة.' : 'Your progress is ready — in clear numbers.',
      }
    case 'supplements':
      return {
        title: ar ? 'راجع روتينك الصحي' : 'Check your health routine',
        body: ar ? 'راجع روتينك حسب تعليمات مختصك — التفاصيل داخل التطبيق.' : 'Go over your routine as your professional advised. Details are in the app.',
      }
    // (P5) إشعار نهاية الراحة داخل الجلسة — يصل والتطبيق في الخلفية.
    case 'restEnd':
      return {
        title: ar ? 'خلصت الراحة' : 'Rest is over',
        body: ar ? 'جاهز للمجموعة الجاية؟ ارجع لتمرينك.' : 'Ready for the next set? Head back to your workout.',
      }
  }
}
