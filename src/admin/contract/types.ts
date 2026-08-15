/**
 * عقد بيانات المركز التنفيذي — الأنواع.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * مرآة الكود لـ`docs/product/EXECUTIVE-DASHBOARD-DATA-CONTRACT.md`. الوثيقة تشرح
 * **لماذا**، وهذا الملف يجعل الـ**لماذا** غير قابل للتجاوز في وقت الترجمة.
 *
 * ═══ الفكرة المركزية: الغياب نوع، لا قيمة ═══
 * `MetricValue<T>` **اتحاد مُميَّز**، فلا يمكن قراءة `.value` قبل تضييق `state`.
 * والبديل الشائع — `number | null` — يسمح بـ`count ?? 0` في سطر واحد فيتحوّل
 * «لا نعرف» إلى «صفر» بلا أن يعترض أحد. وهذا **الخطأ الأخطر في لوحة تنفيذية**:
 * الصفر رقم يبدو مقروءًا فيُبنى عليه قرار، والغياب لا يُبنى عليه شيء.
 * فالعقد هنا يجعل ذلك الالتفاف **خطأ ترجمة لا خطأ مراجعة**.
 */

/**
 * درجات الإتاحة الثلاث. لا رابع لها عمدًا: أي حالة رابعة ستكون «متاح تقريبًا»،
 * وهي بالضبط الفجوة التي تتسرّب منها الأرقام المخترعة.
 */
export type MetricAvailability =
  /** يُحسب اليوم من مصدر قائم عبر مسار مُصرَّح قائم، بلا عمل Backend جديد. */
  | 'AVAILABLE_NOW'
  /** المصدر يمكن أن يكون كاملًا وغير متحيّز، وينقصه بناء خادم مسمّى. */
  | 'NEEDS_BACKEND'
  /** يبقى متحيّزًا بنيويًا بمقام الموافقة حتى مع خادم مثالي. */
  | 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'

/**
 * سبب الحاجة للخادم — التمييز يفرّق كلفتين بمقدار رتبة، فلا يُطوى في كلمة واحدة.
 * `source-system-missing` تعني أن الجدول **نفسه** غير موجود (كل ما يخصّ الاستحقاق).
 */
export type BackendGap = 'endpoint-missing' | 'source-system-missing'

/** صنف الخصوصية — يحكم أين يجوز أن يظهر الحقل، لا كيف يُنسَّق. */
export type PrivacyClass = 'aggregate' | 'account' | 'product' | 'health-sensitive'

/**
 * الدور المطلوب. **«مسجّل دخول» ليس دورًا** — ولذلك لا وجود لقيمة `authenticated`
 * هنا: لو وُجدت لأمكن لمكوّن أن يطلبها ويظنّ نفسه محروسًا.
 */
export type RequiredRole = 'founder' | 'founder+drilldown'

/** دورة التحديث المعلَنة. `on-demand` = لا يُسحب إلا بطلب المستخدم. */
export type RefreshCadence = 'on-load' | '1m' | '5m' | '1h' | 'on-demand'

/** الجهة التي تملك تمكين المقياس — تُعرض للمؤسس في بطاقة اللاإتاحة. */
export type MetricOwner = 'client' | 'backend' | 'product-decision'

/** المجموعة التي ينتمي إليها المقياس في الواجهة. */
export type MetricGroup = 'platform' | 'users' | 'activity' | 'entitlement' | 'onboarding' | 'commerce' | 'errors'

/**
 * تعريف مقياس واحد — البند الكامل من الوثيقة. يُقرأ في وقت التشغيل لبناء بطاقة
 * اللاإتاحة، فلا يحتاج المكوّن أن يعرف شيئًا عن أي مقياس بعينه.
 */
export interface MetricDefinition {
  readonly id: string
  /** مفتاح النصّ في `src/i18n/dict/admin.ts` — لا نصّ صلب هنا (الميثاق §6). */
  readonly labelKey: string
  readonly group: MetricGroup
  /** المصدر المطلوب بلغة الخادم (جدول/عمود/دالة) — يُعرض للـBackend لا للمؤسس. */
  readonly source: string
  /** كيف يُجمَّع: count / count-distinct / ratio / series / scalar. */
  readonly aggregation: 'count' | 'count-distinct' | 'ratio' | 'series' | 'scalar'
  readonly privacyClass: PrivacyClass
  readonly requiredRole: RequiredRole
  readonly refresh: RefreshCadence
  readonly owner: MetricOwner
  readonly availability: MetricAvailability
  /** يُملأ حصرًا حين `availability === 'NEEDS_BACKEND'`. */
  readonly backendGap?: BackendGap
  /** مفتاح نصّ سبب اللاإتاحة — ما يقرأه المؤسس حين لا يوجد رقم. */
  readonly unavailableReasonKey: string
}

/**
 * قيمة مقياس — اتحاد مُميَّز. **لا تحمل الحالة `error` قيمة**، فلا يوجد مسار
 * يعرض رقمًا قديمًا بجانب رسالة خطأ ويترك القارئ يخمّن أيّهما الحقيقة.
 */
export type MetricValue<T> =
  | { readonly state: 'ready'; readonly value: T; readonly asOf: string }
  | { readonly state: 'loading' }
  | { readonly state: 'unavailable'; readonly availability: MetricAvailability }
  | { readonly state: 'error'; readonly code: string }

/** نقطة في سلسلة زمنية — التاريخ ISO والقيمة عدد. */
export interface SeriesPoint {
  readonly date: string
  readonly value: number
}

/** مرحلة في قمع — الاسم والعدد؛ النسبة تُشتقّ ولا تُخزَّن. */
export interface FunnelStage {
  readonly id: string
  readonly labelKey: string
  readonly count: MetricValue<number>
}

/** حالة الاستحقاق كما تصفها الواجهة. `unknown` صادقة ولا تُطوى في `preview`. */
export type EntitlementView = 'premium' | 'trial' | 'code' | 'preview' | 'unknown'

/** حالة إكمال التخصيص — `unknown` هي الحالة الغالبة اليوم (تحيّز الموافقة). */
export type OnboardingView = 'complete' | 'incomplete' | 'unknown'

/**
 * صفّ المستخدم في الجدول — **الحقول المُصرَّح بها وحدها**.
 * لا حقل بصنف `product` هنا: تفاصيل النشاط تُطلب عند التعمّق فقط، فما لا يُنقل
 * لا يُسرَّب. ولا حقل `health-sensitive` في أي مستوى.
 */
export interface AdminUserRow {
  readonly userId: string
  readonly displayName: string | null
  /** **مُقنَّع دائمًا في هذا النوع** — القيمة الكاملة لا تدخل حمولة الجدول أصلًا. */
  readonly emailMasked: string | null
  readonly createdAt: string
  readonly lastSignInAt: string | null
  readonly entitlement: EntitlementView
  readonly onboarding: OnboardingView
}

/** نشاط مُلخَّص — **أعداد أحداث لا قيم**. لا وزن ولا محيط ولا اسم طعام. */
export interface AdminActivitySummary {
  readonly workoutsCompleted: MetricValue<number>
  readonly nutritionDaysLogged: MetricValue<number>
  readonly measurementEvents: MetricValue<number>
  readonly lastActivityAt: MetricValue<string | null>
}

/** صفحة مستخدم واحد — تُطلب بنداء مستقل عند التعمّق. */
export interface AdminUserDetail {
  readonly row: AdminUserRow
  readonly planSummary: MetricValue<string | null>
  readonly activity: AdminActivitySummary
  /** أحدث الجلسات — **تاريخ واسم يوم فقط**، بلا أوزان ولا تكرارات. */
  readonly recentWorkouts: MetricValue<readonly { date: string; dayName: string | null }[]>
  readonly supportContext: MetricValue<readonly string[]>
}

/** شدّة بند طابور الاهتمام. */
export type AttentionSeverity = 'critical' | 'warning' | 'info'

/**
 * بند في طابور الاهتمام. `detectable` يفصل **«فحصنا ولم نجد»** عن
 * **«لا نستطيع الفحص»** — وطيّهما في «لا يوجد تنبيه» هو أن تسكت اللوحة عن عمى.
 */
export interface AttentionItem {
  readonly id: string
  readonly severity: AttentionSeverity
  readonly titleKey: string
  readonly detailKey: string
  readonly detectable: boolean
  readonly availability: MetricAvailability
  readonly icon: string
}

/** وضع المنصّة — الكتلة الوحيدة المتاحة اليوم، ومصدرها ملاحظة العميل لنفسه. */
export interface PlatformPosture {
  readonly buildLabel: string
  readonly syncPipeline: 'enabled' | 'disabled'
  readonly entitlementSource: 'none' | 'mock' | 'backend'
  readonly backendConfigured: boolean
  readonly asOf: string
}

/** تجميعات الحسابات. */
export interface UsersSnapshot {
  readonly total: MetricValue<number>
  readonly newToday: MetricValue<number>
  readonly new7d: MetricValue<number>
  readonly new30d: MetricValue<number>
  readonly verified: MetricValue<number>
  readonly growthSeries: MetricValue<readonly SeriesPoint[]>
}

/** النشاط — بشقّيه المنفصلين عمدًا (دخول ≠ استخدام). */
export interface ActivitySnapshot {
  readonly signedIn7d: MetricValue<number>
  readonly signedIn30d: MetricValue<number>
  readonly dormant30d: MetricValue<number>
  readonly productActive7d: MetricValue<number>
  readonly workoutsCompleted7d: MetricValue<number>
  readonly nutritionLogged7d: MetricValue<number>
  readonly measurementsLogged30d: MetricValue<number>
  readonly activeSeries: MetricValue<readonly SeriesPoint[]>
}

/** الاستحقاق والتفعيل — كلها بلا نظام مصدر اليوم. */
export interface EntitlementSnapshot {
  readonly premiumActive: MetricValue<number>
  readonly trialActive: MetricValue<number>
  /** انتهت تجربته ولم يشترِ — رقم تحوّل لا رقم عطل. */
  readonly trialExpired: MetricValue<number>
  readonly previewOnly: MetricValue<number>
  readonly activationRedeemed: MetricValue<number>
  readonly activationPending: MetricValue<number>
  readonly activationFailed24h: MetricValue<number>
  readonly conversionOfAccounts: MetricValue<number>
  readonly activationFunnel: readonly FunnelStage[]
}

/**
 * التجارة — الأوامر والأكواد.
 *
 * `redemptionFailures24h` **بلا مصدر عمدًا**: لا يوجد سجلّ لمحاولات الاسترداد
 * المرفوضة، وبناؤه قرار أمني قائم بذاته (سجلّ يحمل الأكواد المُدخَلة يصير
 * قاموسًا للتخمين). فيبقى الحقل معلَنًا في العقد وغير متاح في الواجهة — أوضح
 * من حذفه، لأن غيابه من القائمة يقرأه القارئ «لا يحدث» لا «لا نقيس».
 */
export interface CommerceSnapshot {
  readonly ordersSeen: MetricValue<number>
  readonly ordersPaid: MetricValue<number>
  readonly ordersFailed: MetricValue<number>
  readonly codesIssued: MetricValue<number>
  readonly codesRedeemed: MetricValue<number>
  readonly codesUnused: MetricValue<number>
  readonly redemptionFailures24h: MetricValue<number>
  readonly revokedActive: MetricValue<number>
}

/** الأخطاء — لا مصدر واحد منها اليوم؛ الكتلة موجودة كي يبقى العمى مُعلَنًا. */
export interface ErrorsSnapshot {
  readonly clientErrors24h: MetricValue<number>
  readonly rpcFailures24h: MetricValue<number>
}

/** إكمال التخصيص — متحيّز البسط، انظر §5.5 من الوثيقة. */
export interface OnboardingSnapshot {
  readonly completionRate: MetricValue<number>
  readonly stuckCount: MetricValue<number>
  readonly funnel: readonly FunnelStage[]
}

/** صفحة من جدول المستخدمين. */
export interface AdminUserPage {
  readonly rows: readonly AdminUserRow[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

/** الحمولة الكاملة للوحة. */
export interface ExecutiveSnapshot {
  readonly platform: PlatformPosture
  readonly users: UsersSnapshot
  readonly activity: ActivitySnapshot
  readonly entitlement: EntitlementSnapshot
  readonly commerce: CommerceSnapshot
  readonly errors: ErrorsSnapshot
  readonly onboarding: OnboardingSnapshot
  readonly attention: readonly AttentionItem[]
  readonly users_page: MetricValue<AdminUserPage>
}

/** بانٍ مختصر لقيمة غير متاحة. */
export function unavailable<T>(availability: MetricAvailability): MetricValue<T> {
  return { state: 'unavailable', availability }
}

/** بانٍ مختصر لقيمة جاهزة — `asOf` **إلزامي**، فلا رقم بلا لحظة قياس. */
export function ready<T>(value: T, asOf: string): MetricValue<T> {
  return { state: 'ready', value, asOf }
}

/**
 * القارئ الآمن الوحيد. يعيد `null` لكل ما ليس `ready`، **ولا يعيد صفرًا أبدًا**.
 *
 * الغرض أن يكون **الطريق الوحيد** إلى القيمة، فيبقى تحويل الغياب إلى صفر فعلًا
 * يحتاج كتابته بيدك (`?? 0`) — وذلك ما يمنعه `test:admin-dashboard`.
 */
export function metricValue<T>(m: MetricValue<T>): T | null {
  return m.state === 'ready' ? m.value : null
}
