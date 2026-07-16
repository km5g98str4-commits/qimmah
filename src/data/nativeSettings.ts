import type { Lang } from '@/lib/appPreferences'

export const NATIVE_SETTINGS_COPY: Record<Lang, {
  group: string
  healthTitle: string
  healthBody: string
  connect: string
  refresh: string
  connected: string
  denied: string
  unavailable: string
  hapticsTitle: string
  hapticsBody: string
  hapticsToggle: string
}> = {
  ar: {
    group: 'الصحة والاستجابة اللمسية',
    healthTitle: 'خطوات صحة Apple',
    healthBody: 'يقرأ قِمّة عدد خطواتك فقط بعد موافقتك، ويملأ اليوم وآخر ١٤ يومًا. الإدخال اليدوي يبقى متاحًا دائمًا.',
    connect: 'ربط صحة Apple',
    refresh: 'تحديث الخطوات',
    connected: 'تم تحديث خطواتك من صحة Apple.',
    denied: 'لم يُمنح الإذن. يمكنك الاستمرار بالإدخال اليدوي أو تغييره من إعدادات صحة Apple.',
    unavailable: 'صحة Apple غير متاحة على هذا الجهاز.',
    hapticsTitle: 'استجابة لمسية',
    hapticsBody: 'نبضات خفيفة عند حفظ مجموعة، فتح رقم قياسي، وانتهاء الراحة. تتوقف تلقائيًا مع «تقليل الحركة».',
    hapticsToggle: 'تشغيل الاستجابة اللمسية',
  },
  en: {
    group: 'Health & haptics',
    healthTitle: 'Apple Health steps',
    healthBody: 'Qimmah reads steps only after you approve it, then fills today and the last 14 days. Manual entry always remains available.',
    connect: 'Connect Apple Health',
    refresh: 'Refresh steps',
    connected: 'Your steps were refreshed from Apple Health.',
    denied: 'Permission was not granted. Keep using manual entry or change access in Apple Health settings.',
    unavailable: 'Apple Health is unavailable on this device.',
    hapticsTitle: 'Haptic feedback',
    hapticsBody: 'Gentle feedback for a logged set, a new PR, and rest completion. Disabled automatically with Reduce Motion.',
    hapticsToggle: 'Enable haptic feedback',
  },
}
