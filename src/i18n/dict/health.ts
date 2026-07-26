import type { Lang } from '@/lib/appPreferences'

/**
 * نصوص «صحتي من Apple» (Q18).
 *
 * قاعدة الصدق في كل سطر هنا: iOS لا يكشف رفض صلاحية القراءة، فلا كلمة «مرفوض»
 * ولا «ممنوع» في أي حالة. أقصى ما نقوله عند غياب البيانات هو «ما وصلتنا بيانات»
 * مع شرح كيف يراجع المستخدم الصلاحيات بنفسه من تطبيق «صحتي».
 */
export interface HealthStrings {
  /** عنوان البطاقة والصفحة. */
  title: string
  /** سطر واحد يشرح الفائدة قبل الربط. */
  cardIntro: string

  // حالات الربط الأربع
  statusNotConnected: string
  statusNeedsReview: string
  statusConnected: string
  statusUnavailable: string

  /** شرح تحت الحالة. */
  bodyNotConnected: string
  bodyNeedsReview: string
  /** «{0} من {1} مقياسًا وصلت منها بيانات» */
  bodyConnected: (withData: number, total: number) => string
  bodyUnavailable: string

  // الأزرار
  ctaConnect: string
  ctaManage: string
  ctaBusy: string
  /** وصف VoiceOver للزرّ الأساسي في كل حالة. */
  ctaConnectA11y: string
  ctaManageA11y: string

  // صفحة الربط
  pageBack: string
  readOnlyTitle: string
  readOnlyBody: string
  howToTitle: string
  /** خطوات تعديل الصلاحيات من تطبيق «صحتي» — تُعرض بعد الطلب. */
  howToSteps: string[]
  metricsTitle: string
  metricsHint: string
  metricHasData: string
  metricNoData: string
  metricOff: string
  requestedAtLabel: (when: string) => string
  errorTitle: string
  errorBody: string
  /** يُعلن للقارئ الصوتي فور انتهاء الطلب. */
  announceRequested: string
}

const ar: HealthStrings = {
  title: 'صحتي من Apple',
  cardIntro: 'اربط قِمّة بتطبيق «صحتي» عشان يقرأ خطواتك ووزنك ونبضك بدل ما تدخلها بنفسك.',

  statusNotConnected: 'غير مربوط',
  statusNeedsReview: 'يحتاج مراجعة',
  statusConnected: 'مربوط',
  statusUnavailable: 'غير متاح على هذا الجهاز',

  bodyNotConnected: 'طلب واحد يغطّي كل الأنواع المدعومة — ما راح نسألك مرّة لكل مقياس.',
  bodyNeedsReview:
    'أكملت الطلب، لكن ما وصلتنا بيانات بعد. يمكن ما سمحت للأنواع، أو ما فيه بيانات في «صحتي» أصلًا — نظام iOS ما يخبرنا أيّهما. راجع الصلاحيات من تطبيق «صحتي».',
  bodyConnected: (withData, total) => `وصلتنا بيانات من ${withData} من ${total} مقياسًا مدعومًا.`,
  bodyUnavailable: 'ربط «صحتي» متاح على iPhone فقط، من تطبيق قِمّة نفسه.',

  ctaConnect: 'اربط صحتي',
  ctaManage: 'إدارة الربط',
  ctaBusy: 'نفتح «صحتي»…',
  ctaConnectA11y: 'اربط صحتي — يفتح ورقة صلاحيات «صحتي» مرّة واحدة لكل الأنواع المدعومة',
  ctaManageA11y: 'إدارة الربط — يفتح صفحة تفاصيل ربط «صحتي»',

  pageBack: 'رجوع',
  readOnlyTitle: 'قراءة فقط',
  readOnlyBody: 'قِمّة يقرأ من «صحتي» ولا يكتب فيه أبدًا. بياناتك تبقى على جهازك.',
  howToTitle: 'كيف تعدّل الصلاحيات؟',
  howToSteps: [
    'افتح تطبيق «صحتي» من الآيفون.',
    'اضغط صورتك في أعلى الشاشة، ثم «التطبيقات».',
    'اختر «قِمّة» من القائمة.',
    'شغّل أو أطفئ أي نوع تبي — التغيير يسري فورًا.',
  ],
  metricsTitle: 'الأنواع المدعومة',
  metricsHint: 'كلها قراءة فقط، وكلها ضمن الطلب الواحد.',
  metricHasData: 'وصلت بيانات',
  metricNoData: 'ما وصلت بيانات',
  metricOff: 'مطفأ',
  requestedAtLabel: (when) => `آخر طلب: ${when}`,
  errorTitle: 'ما قدرنا نفتح «صحتي»',
  errorBody: 'صار خلل أثناء فتح ورقة الصلاحيات. جرّب مرّة ثانية.',
  announceRequested: 'اكتمل طلب الصلاحيات. راجع الحالة أدناه.',
}

const en: HealthStrings = {
  title: 'Apple Health',
  cardIntro: 'Connect Qimmah to Apple Health so it can read your steps, weight and heart rate instead of you typing them in.',

  statusNotConnected: 'Not connected',
  statusNeedsReview: 'Needs review',
  statusConnected: 'Connected',
  statusUnavailable: 'Not available on this device',

  bodyNotConnected: 'One request covers every supported type. We will not ask you once per metric.',
  bodyNeedsReview:
    'You finished the request, but no data has reached us yet. You may not have allowed the types, or Apple Health may have nothing to share. iOS does not tell us which. Review the permissions in the Health app.',
  bodyConnected: (withData, total) => `Data is arriving from ${withData} of ${total} supported types.`,
  bodyUnavailable: 'Apple Health can only be connected on an iPhone, from the Qimmah app itself.',

  ctaConnect: 'Connect Apple Health',
  ctaManage: 'Manage connection',
  ctaBusy: 'Opening Health…',
  ctaConnectA11y: 'Connect Apple Health — opens the Health permission sheet once for every supported type',
  ctaManageA11y: 'Manage connection — opens the Apple Health connection details page',

  pageBack: 'Back',
  readOnlyTitle: 'Read-only',
  readOnlyBody: 'Qimmah reads from Apple Health and never writes to it. Your data stays on your device.',
  howToTitle: 'How to change permissions',
  howToSteps: [
    'Open the Health app on your iPhone.',
    'Tap your picture at the top, then Apps.',
    'Choose Qimmah from the list.',
    'Turn any type on or off. The change takes effect right away.',
  ],
  metricsTitle: 'Supported types',
  metricsHint: 'All read-only, all covered by the single request.',
  metricHasData: 'Data received',
  metricNoData: 'No data received',
  metricOff: 'Off',
  requestedAtLabel: (when) => `Last request: ${when}`,
  errorTitle: 'We could not open Health',
  errorBody: 'Something went wrong opening the permission sheet. Please try again.',
  announceRequested: 'Permission request finished. Check the status below.',
}

export const healthStrings: Record<Lang, HealthStrings> = { ar, en }

/** نص الحالة + متنها بلغة الواجهة — مصدر واحد للبطاقة والصفحة معًا. */
export function healthStatusCopy(
  s: HealthStrings,
  status: 'unavailable' | 'not-connected' | 'needs-review' | 'connected',
  withData: number,
  total: number,
): { label: string; body: string } {
  if (status === 'unavailable') return { label: s.statusUnavailable, body: s.bodyUnavailable }
  if (status === 'not-connected') return { label: s.statusNotConnected, body: s.bodyNotConnected }
  if (status === 'needs-review') return { label: s.statusNeedsReview, body: s.bodyNeedsReview }
  return { label: s.statusConnected, body: s.bodyConnected(withData, total) }
}
