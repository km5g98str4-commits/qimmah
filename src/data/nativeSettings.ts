import type { Lang } from '@/lib/appPreferences'

export interface NativeSettingsCopy {
  group: string
  intro: string
  // metric titles + descriptions
  stepsTitle: string
  stepsBody: string
  weightTitle: string
  weightBody: string
  heartTitle: string
  heartBody: string
  // source chip labels
  srcHealth: string
  srcManual: string
  srcUnavailable: string
  srcNone: string
  // shared status line
  neverUpdated: string
  lastUpdatedPrefix: string
  // actions
  connect: string
  refresh: string
  connectWeight: string
  refreshWeight: string
  checkHeart: string
  disconnect: string
  // outcome messages
  connected: string
  denied: string
  unavailable: string
  weightImported: string
  weightNoData: string
  heartUnavailable: string
  heartReading: string
  // manual fallback
  manualStepsLabel: string
  manualStepsSave: string
  manualStepsSaved: string
  weightManualNote: string
  // haptics
  hapticsTitle: string
  hapticsBody: string
  hapticsToggle: string
}

export const NATIVE_SETTINGS_COPY: Record<Lang, NativeSettingsCopy> = {
  ar: {
    group: 'آبل هيلث والأجهزة',
    intro: 'لكل مقياس مصدره ووقت تحديثه. نطلب الإذن عند الحاجة فقط — لا جدار أذونات عند فتح التطبيق — ويبقى الإدخال اليدوي متاحًا دائمًا.',
    stepsTitle: 'الخطوات',
    stepsBody: 'تُقرأ من صحة Apple بعد موافقتك، وتملأ اليوم وآخر ١٤ يومًا.',
    weightTitle: 'الوزن',
    weightBody: 'اختياري. الافتراضي إدخال يدوي، ويمكنك استيراد آخر قياس من صحة Apple موسومًا «مستورد».',
    heartTitle: 'معدّل القلب',
    heartBody: 'يُعرض فقط إذا كان لديك جهاز مقترن كتب قراءة فعلية — بلا أرقام مُختلقة.',
    srcHealth: 'من صحة Apple',
    srcManual: 'يدوي',
    srcUnavailable: 'غير متوفّر',
    srcNone: 'لا مصدر بعد',
    neverUpdated: 'لم يُحدَّث بعد',
    lastUpdatedPrefix: 'آخر تحديث:',
    connect: 'ربط صحة Apple',
    refresh: 'تحديث الخطوات',
    connectWeight: 'استيراد الوزن',
    refreshWeight: 'تحديث الوزن',
    checkHeart: 'تحقّق من معدّل القلب',
    disconnect: 'فصل وحذف المستورد',
    connected: 'تم تحديث خطواتك من صحة Apple.',
    denied: 'لم يُمنح الإذن. تابع بالإدخال اليدوي أو فعّله من إعدادات صحة Apple.',
    unavailable: 'صحة Apple غير متاحة على هذا الجهاز.',
    weightImported: 'استوردنا آخر وزن من صحة Apple.',
    weightNoData: 'تم الربط، لكن لا يوجد وزن مسجَّل في صحة Apple بعد.',
    heartUnavailable: 'غير متوفّر — لم يُقترن جهاز',
    heartReading: 'آخر قراءة من جهازك المقترن.',
    manualStepsLabel: 'إدخال خطوات اليوم يدويًا',
    manualStepsSave: 'حفظ',
    manualStepsSaved: 'حُفظت خطواتك يدويًا.',
    weightManualNote: 'أدخل وزنك يدويًا من شاشة التقدّم — يبقى الخيار الافتراضي.',
    hapticsTitle: 'استجابة لمسية',
    hapticsBody: 'نبضات خفيفة عند حفظ مجموعة، فتح رقم قياسي، وانتهاء الراحة. تتوقف تلقائيًا مع «تقليل الحركة».',
    hapticsToggle: 'تشغيل الاستجابة اللمسية',
  },
  en: {
    group: 'Apple Health & devices',
    intro: 'Every metric shows its source and update time. Permission is requested only when needed — no permission wall at launch — and manual entry always remains available.',
    stepsTitle: 'Steps',
    stepsBody: 'Read from Apple Health after you approve, filling today and the last 14 days.',
    weightTitle: 'Weight',
    weightBody: 'Optional. Manual entry is the default; you can import the latest reading from Apple Health, tagged “imported”.',
    heartTitle: 'Heart rate',
    heartBody: 'Shown only if a paired device wrote a real reading — never a fabricated number.',
    srcHealth: 'From Apple Health',
    srcManual: 'Manual',
    srcUnavailable: 'Unavailable',
    srcNone: 'No source yet',
    neverUpdated: 'Not updated yet',
    lastUpdatedPrefix: 'Last updated:',
    connect: 'Connect Apple Health',
    refresh: 'Refresh steps',
    connectWeight: 'Import weight',
    refreshWeight: 'Refresh weight',
    checkHeart: 'Check heart rate',
    disconnect: 'Disconnect & remove imported',
    connected: 'Your steps were refreshed from Apple Health.',
    denied: 'Permission was not granted. Keep using manual entry or enable it in Apple Health settings.',
    unavailable: 'Apple Health is unavailable on this device.',
    weightImported: 'Imported your latest weight from Apple Health.',
    weightNoData: 'Connected, but no weight is recorded in Apple Health yet.',
    heartUnavailable: 'Unavailable — no device paired',
    heartReading: 'Latest reading from your paired device.',
    manualStepsLabel: 'Enter today’s steps manually',
    manualStepsSave: 'Save',
    manualStepsSaved: 'Your steps were saved manually.',
    weightManualNote: 'Enter weight manually from the Progress screen — it stays the default.',
    hapticsTitle: 'Haptic feedback',
    hapticsBody: 'Gentle feedback for a logged set, a new PR, and rest completion. Disabled automatically with Reduce Motion.',
    hapticsToggle: 'Enable haptic feedback',
  },
}
