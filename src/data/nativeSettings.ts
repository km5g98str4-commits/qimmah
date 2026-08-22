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
  /**
   * P14 — عقد الصدق: هذا المفتاح اسمه قديم (`denied`) لكن **نصّه لا يدّعي رفضًا**.
   * iOS لا يكشف أبدًا رفض قراءة نوع صحي، فأي نتيجة فارغة تعني «لا بيانات أو مرفوض»
   * ولا يجوز عرض «رفضت الوصول». الاسم يبقى للتوافق مع الواجهة القائمة؛ المفتاح
   * الجديد المفضّل لـCodex هو `unknown` بنفس المعنى.
   */
  denied: string
  /** «ما وصلتنا شيء ولا نعرف السبب» — الحالة الصادقة الوحيدة لغياب البيانات. */
  unknown: string
  unavailable: string
  weightImported: string
  weightNoData: string
  heartUnavailable: string
  heartReading: string
  // manual fallback
  manualStepsLabel: string
  manualStepsSave: string
  manualStepsSaved: string
  /** فشل حفظ الخطوات — لا رسالة نجاح فوق قرص لم يُكتب (§5). */
  manualStepsFailed: string
  /** الويب لا يصل HealthKit إطلاقًا — نقول أين يعمل الربط ونُبقي المسار العامل. */
  healthNativeOnly: string
  weightManualNote: string
  // haptics
  hapticsTitle: string
  hapticsBody: string
  hapticsToggle: string
}

export const NATIVE_SETTINGS_COPY: Record<Lang, NativeSettingsCopy> = {
  ar: {
    group: 'آبل هيلث والأجهزة',
    intro: 'لكل مقياس مصدره ووقت تحديثه. نطلب الإذن وقت الحاجة بس — بدون جدار أذونات عند فتح التطبيق — والإدخال اليدوي يبقى متاح دائمًا.',
    stepsTitle: 'الخطوات',
    stepsBody: 'تنقرأ من صحة Apple بعد موافقتك، وتعبّي اليوم وآخر ١٤ يوم.',
    weightTitle: 'الوزن',
    weightBody: 'اختياري. الافتراضي إدخال يدوي، وتقدر تستورد آخر قياس من صحة Apple ويظهر بعلامة «مستورد».',
    heartTitle: 'معدّل القلب',
    heartBody: 'يظهر بس إذا عندك جهاز مقترن سجّل قراءة فعلية — بدون أرقام مختلقة.',
    srcHealth: 'من صحة Apple',
    srcManual: 'يدوي',
    srcUnavailable: 'ما هو متوفّر',
    srcNone: 'ما فيه مصدر لسا',
    neverUpdated: 'ما تحدّث لسا',
    lastUpdatedPrefix: 'آخر تحديث:',
    connect: 'ربط صحة Apple',
    refresh: 'تحديث الخطوات',
    connectWeight: 'استيراد الوزن',
    refreshWeight: 'تحديث الوزن',
    checkHeart: 'شيّك على معدّل القلب',
    disconnect: 'فصل وحذف المستورد',
    connected: 'تم تحديث خطواتك من صحة Apple.',
    denied: 'ما وصلنا شي من صحة Apple. يا إن الإذن مقفّل للمقياس هذا، يا إنه ما فيه بيانات مسجّلة — شيّك على إعدادات صحة Apple، والإدخال اليدوي متاح دائمًا.',
    unknown: 'ما وصلنا شي من صحة Apple. يا إن الإذن مقفّل للمقياس هذا، يا إنه ما فيه بيانات مسجّلة — شيّك على إعدادات صحة Apple، والإدخال اليدوي متاح دائمًا.',
    unavailable: 'صحة Apple مو متاحة على هذا الجهاز.',
    weightImported: 'استوردنا آخر وزن من صحة Apple.',
    weightNoData: 'تم الربط، بس ما فيه وزن مسجّل في صحة Apple لسا.',
    heartUnavailable: 'ما هو متوفّر — ما فيه جهاز مقترن',
    heartReading: 'آخر قراءة من جهازك المقترن.',
    manualStepsLabel: 'إدخال خطوات اليوم يدويًا',
    manualStepsSave: 'حفظ',
    manualStepsSaved: 'انحفظت خطواتك يدويًا.',
    manualStepsFailed: 'ما قدرنا نحفظ خطواتك — رقمك السابق باقٍ كما هو. جرّب مرّة ثانية.',
    healthNativeOnly: 'ربط Apple Health يشتغل في تطبيق الآيفون بس. هنا تقدر تسجّل خطواتك بنفسك.',
    weightManualNote: 'اكتب وزنك يدويًا من شاشة التقدّم — وهو الخيار الافتراضي.',
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
    denied: "Nothing came through from Apple Health. Either the permission for this metric is off, or there's nothing recorded yet — check your Apple Health settings. Manual entry always works.",
    unknown: "Nothing came through from Apple Health. Either the permission for this metric is off, or there's nothing recorded yet — check your Apple Health settings. Manual entry always works.",
    unavailable: 'Apple Health is unavailable on this device.',
    weightImported: 'Imported your latest weight from Apple Health.',
    weightNoData: 'Connected, but no weight is recorded in Apple Health yet.',
    heartUnavailable: 'Unavailable — no device paired',
    heartReading: 'Latest reading from your paired device.',
    manualStepsLabel: 'Enter today’s steps manually',
    manualStepsSave: 'Save',
    manualStepsSaved: 'Your steps were saved manually.',
    manualStepsFailed: 'We could not save your steps — your previous number is still there. Give it another try.',
    healthNativeOnly: 'Apple Health sync works in the iPhone app only. Here you can log your steps yourself.',
    weightManualNote: 'Enter weight manually from the Progress screen — it stays the default.',
    hapticsTitle: 'Haptic feedback',
    hapticsBody: 'Gentle feedback for a logged set, a new PR, and rest completion. Disabled automatically with Reduce Motion.',
    hapticsToggle: 'Enable haptic feedback',
  },
}
