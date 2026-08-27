/**
 * تجهيزات اختبار المركز التنفيذي — **بيانات اختبار معلَنة، لا مسار إنتاجي**.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ لماذا هذا الملف آمن رغم الميثاق §5 ═══
 * «لا بيانات وهمية في أي مسار إنتاجي **دون وسم صريح**». والوسم هنا بنيوي لا
 * لفظي، بثلاث طبقات:
 *   ١) **لا مستورد إنتاجي**: `src/admin/contract/source.ts` — الطريق الوحيد
 *      الذي تقرأ منه الواجهة — لا يستورد هذا الملف إطلاقًا.
 *   ٢) كل قيمة هنا تحمل `asOf` من طابع ثابت معلَن، فلا تبدو حيّة أبدًا.
 *   ٣) الأسماء والبُرد **مُصطنعة ظاهرة** (`example.test`)، لا تشبه بيانات حقيقية.
 * ويحرس الطبقة الأولى تأكيدٌ مسمّى في `test:admin-dashboard`: أي استيراد لهذا
 * الملف من `source.ts` أو من مكوّن يُسقط البوابة.
 *
 * ولماذا تجهيزات أصلًا ما دام لا شيء متاحًا: لأن حالات **الجاهز** و**الجزئي**
 * لا يمكن رؤيتها اليوم بأي طريقة أخرى. فبدونها تُبنى الواجهة على حالة واحدة
 * (الغياب) ثم تنكسر يوم تصل الأرقام — وهو أسوأ وقت للاكتشاف.
 */

import type {
  ActivitySnapshot,
  AdminUserDetail,
  AdminUserRow,
  AttentionItem,
  CommerceSnapshot,
  EntitlementSnapshot,
  ErrorsSnapshot,
  ExecutiveSnapshot,
  FunnelStage,
  JourneySnapshot,
  MetricValue,
  OnboardingSnapshot,
  PlatformPosture,
  SeriesPoint,
  UsersSnapshot,
} from './types'
import { ready, unavailable } from './types'

/** طابع ثابت — تجهيزات حتمية تُقارَن بالتساوي في الإثباتات. */
export const FIXTURE_AS_OF = '2026-08-14T09:00:00.000Z'

/** أساس زمني ثابت لتوليد التواريخ — لا `Date.now()` كي تبقى التجهيزات حتمية. */
const BASE_MS = Date.parse(FIXTURE_AS_OF)
const DAY_MS = 86_400_000

function isoDaysAgo(days: number): string {
  return new Date(BASE_MS - days * DAY_MS).toISOString()
}

function series(count: number, seed: number): SeriesPoint[] {
  const out: SeriesPoint[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    // متتالية حتمية بلا Math.random — الإثبات يقارن قيمًا بعينها.
    const v = ((i * 7 + seed * 13) % 19) + 3
    out.push({ date: isoDaysAgo(i).slice(0, 10), value: v })
  }
  return out
}

// ───────────────────────────── وضع المنصّة ─────────────────────────────

/** الوضع الحقيقي اليوم: لا مزامنة، ولا مصدر استحقاق. */
export const platformFixture: PlatformPosture = {
  buildLabel: 'v1.0.0·fixture',
  syncPipeline: 'disabled',
  entitlementSource: 'none',
  backendConfigured: true,
  asOf: FIXTURE_AS_OF,
}

// ───────────────────────────── حالة «جاهز» ─────────────────────────────

export const usersReadyFixture: UsersSnapshot = {
  total: ready(1_284, FIXTURE_AS_OF),
  newToday: ready(17, FIXTURE_AS_OF),
  new7d: ready(96, FIXTURE_AS_OF),
  new30d: ready(342, FIXTURE_AS_OF),
  verified: ready(1_091, FIXTURE_AS_OF),
  growthSeries: ready(series(90, 1), FIXTURE_AS_OF),
}

export const activityReadyFixture: ActivitySnapshot = {
  signedInToday: ready(63, FIXTURE_AS_OF),
  signedIn7d: ready(418, FIXTURE_AS_OF),
  signedIn30d: ready(769, FIXTURE_AS_OF),
  dormant30d: ready(515, FIXTURE_AS_OF),
  // ⚠️ حتى في تجهيزة «كل شيء جاهز» تبقى مقاييس نشاط المنتج **غير متاحة**:
  // تحيّز المقام لا يزول بوصول خادم. جعلها جاهزة هنا يعلّم الواجهة كذبة.
  productActive7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  workoutsCompleted7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  nutritionLogged7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  measurementsLogged30d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  activeSeries: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
}

const activationFunnelReady: readonly FunnelStage[] = [
  { id: 'issued', labelKey: 'funnel.issued', count: ready(500, FIXTURE_AS_OF) },
  { id: 'redeemed', labelKey: 'funnel.redeemed', count: ready(213, FIXTURE_AS_OF) },
  { id: 'active', labelKey: 'funnel.active', count: ready(188, FIXTURE_AS_OF) },
]

export const entitlementReadyFixture: EntitlementSnapshot = {
  premiumActive: ready(188, FIXTURE_AS_OF),
  trialActive: ready(24, FIXTURE_AS_OF),
  trialExpired: ready(61, FIXTURE_AS_OF),
  previewOnly: ready(1_072, FIXTURE_AS_OF),
  activationRedeemed: ready(213, FIXTURE_AS_OF),
  activationPending: ready(287, FIXTURE_AS_OF),
  activationFailed24h: ready(6, FIXTURE_AS_OF),
  conversionOfAccounts: ready(0.1464, FIXTURE_AS_OF),
  activationFunnel: activationFunnelReady,
}

export const onboardingReadyFixture: OnboardingSnapshot = {
  // متحيّز بنيويًا ⇒ غير متاح حتى في التجهيزة الجاهزة (§5.5 من العقد).
  completionRate: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  stuckCount: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  funnel: [
    { id: 'signed_up', labelKey: 'funnel.signedUp', count: ready(1_284, FIXTURE_AS_OF) },
    { id: 'started', labelKey: 'funnel.started', count: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE') },
    { id: 'completed', labelKey: 'funnel.completed', count: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE') },
  ],
}

/**
 * التجارة الجاهزة — **بمقياس واحد غائب دائمًا**: محاولات الكود المرفوضة بلا
 * سجلّ. تجهيزةٌ تملؤه برقم تجعل المصمّم يرسم شاشة لن توجد.
 */
export const commerceReadyFixture: CommerceSnapshot = {
  ordersSeen: ready(241, FIXTURE_AS_OF),
  ordersPaid: ready(188, FIXTURE_AS_OF),
  ordersFailed: ready(9, FIXTURE_AS_OF),
  codesIssued: ready(500, FIXTURE_AS_OF),
  codesRedeemed: ready(213, FIXTURE_AS_OF),
  codesUnused: ready(287, FIXTURE_AS_OF),
  redemptionFailures24h: unavailable('NEEDS_BACKEND'),
  revokedActive: ready(3, FIXTURE_AS_OF),
  webhookProcessed: ready(188, FIXTURE_AS_OF),
  webhookPending: ready(2, FIXTURE_AS_OF),
  // ⚠️ غائب **في كل تجهيزة**: لا عمود محاولات، فلا شاشة تُرسم عليه.
  webhookRetried: unavailable('NEEDS_BACKEND'),
  grantsManual: ready(4, FIXTURE_AS_OF),
}

/**
 * رحلة الزائر — **غائبة في كل تجهيزة بلا استثناء**، كالأخطاء تمامًا.
 * ملؤها برقم يجعل المصمّم يرسم شاشة لا يمكن أن توجد بلا خطّ أحداث عميل.
 */
export const journeyGapFixture: JourneySnapshot = {
  landing: unavailable('NEEDS_BACKEND'),
  onboardingStarted: unavailable('NEEDS_BACKEND'),
  onboardingCompleted: unavailable('NEEDS_BACKEND'),
  reveal: unavailable('NEEDS_BACKEND'),
  premiumCta: unavailable('NEEDS_BACKEND'),
  trialCta: unavailable('NEEDS_BACKEND'),
  sallaClick: unavailable('NEEDS_BACKEND'),
  funnel: [
    { id: 'landing', labelKey: 'funnel.landing', count: unavailable('NEEDS_BACKEND') },
    { id: 'onboardingStarted', labelKey: 'funnel.onboardingStarted', count: unavailable('NEEDS_BACKEND') },
    { id: 'onboardingCompleted', labelKey: 'funnel.onboardingCompleted', count: unavailable('NEEDS_BACKEND') },
    { id: 'reveal', labelKey: 'funnel.reveal', count: unavailable('NEEDS_BACKEND') },
    { id: 'premiumCta', labelKey: 'funnel.premiumCta', count: unavailable('NEEDS_BACKEND') },
    { id: 'trialCta', labelKey: 'funnel.trialCta', count: unavailable('NEEDS_BACKEND') },
    { id: 'sallaClick', labelKey: 'funnel.sallaClick', count: unavailable('NEEDS_BACKEND') },
    { id: 'purchase', labelKey: 'funnel.purchase', count: unavailable('NEEDS_BACKEND') },
    { id: 'entitlement', labelKey: 'funnel.entitlement', count: unavailable('NEEDS_BACKEND') },
  ],
}

/** الأخطاء — غائبة في **كل** تجهيزة بلا استثناء: لا مسار لها أصلًا. */
export const errorsGapFixture: ErrorsSnapshot = {
  clientErrors24h: unavailable('NEEDS_BACKEND'),
  rpcFailures24h: unavailable('NEEDS_BACKEND'),
}

function allCommerce(v: <T>() => MetricValue<T>): CommerceSnapshot {
  return {
    ordersSeen: v(),
    ordersPaid: v(),
    ordersFailed: v(),
    codesIssued: v(),
    codesRedeemed: v(),
    webhookProcessed: v(),
    webhookPending: v(),
    webhookRetried: v(),
    grantsManual: v(),
    codesUnused: v(),
    // يبقى غائبًا حتى في تجهيزة «فارغ»: صفرٌ هنا يدّعي قياسًا لا يوجد.
    redemptionFailures24h: unavailable('NEEDS_BACKEND'),
    revokedActive: v(),
  }
}

// ───────────────────────── حالات فارغ / تحميل / خطأ ─────────────────────────

function allUsers(v: <T>() => MetricValue<T>): UsersSnapshot {
  return { total: v(), newToday: v(), new7d: v(), new30d: v(), verified: v(), growthSeries: v() }
}
function allActivity(v: <T>() => MetricValue<T>): ActivitySnapshot {
  return {
    signedInToday: v(),
    signedIn7d: v(),
    signedIn30d: v(),
    dormant30d: v(),
    productActive7d: v(),
    workoutsCompleted7d: v(),
    nutritionLogged7d: v(),
    measurementsLogged30d: v(),
    activeSeries: v(),
  }
}
function allEntitlement(v: <T>() => MetricValue<T>): EntitlementSnapshot {
  return {
    premiumActive: v(),
    trialActive: v(),
    trialExpired: v(),
    previewOnly: v(),
    activationRedeemed: v(),
    activationPending: v(),
    activationFailed24h: v(),
    conversionOfAccounts: v(),
    activationFunnel: [
      { id: 'issued', labelKey: 'funnel.issued', count: v() },
      { id: 'redeemed', labelKey: 'funnel.redeemed', count: v() },
      { id: 'active', labelKey: 'funnel.active', count: v() },
    ],
  }
}
function allOnboarding(v: <T>() => MetricValue<T>): OnboardingSnapshot {
  return {
    completionRate: v(),
    stuckCount: v(),
    funnel: [
      { id: 'signed_up', labelKey: 'funnel.signedUp', count: v() },
      { id: 'started', labelKey: 'funnel.started', count: v() },
      { id: 'completed', labelKey: 'funnel.completed', count: v() },
    ],
  }
}

const loadingV = <T,>(): MetricValue<T> => ({ state: 'loading' })
const errorV = <T,>(): MetricValue<T> => ({ state: 'error', code: 'fixture.error' })
const gapV = <T,>(): MetricValue<T> => unavailable<T>('NEEDS_BACKEND')
/**
 * صفر **مقيس** — للحالة «أجاب الخادم ولم يجد شيئًا».
 * موجود كي تفرّق التجهيزات بين هذا الصفر و«لا نعرف»؛ وهما في الشاشة شيئان
 * مختلفان تمامًا، فيجب أن يكونا مختلفين في التجهيزة أيضًا.
 */
const readyZero = <T,>(): MetricValue<T> => ready(0 as unknown as T, FIXTURE_AS_OF)

// ───────────────────────────── جدول المستخدمين ─────────────────────────────

const ENTITLEMENTS = ['premium', 'trial', 'code', 'preview', 'unknown'] as const
const ONBOARDING = ['complete', 'incomplete', 'unknown'] as const

/**
 * يولّد مستخدمين حتميين — **بيانات مُصطنعة ظاهرة**.
 * البريد مُقنَّع **في التوليد نفسه**: النوع `AdminUserRow` لا يحمل حقل بريد كامل
 * أصلًا، فلا يوجد في هذا المسار موضع يمكن أن يُسرَّب منه بريد حقيقي.
 */
export function makeUserRows(count: number): AdminUserRow[] {
  const rows: AdminUserRow[] = []
  for (let i = 0; i < count; i += 1) {
    const ent = ENTITLEMENTS[i % ENTITLEMENTS.length]
    const ob = ONBOARDING[i % ONBOARDING.length]
    // فجوات مقصودة: كل سابع بلا اسم، وكل ١١ بلا دخول مسجّل. الجدول يجب أن
    // يصمد أمام الحقول الغائبة، والتجهيزة المثالية لا تكشف ذلك.
    const hasName = i % 7 !== 0
    const hasSignIn = i % 11 !== 0
    rows.push({
      userId: `fixture-user-${String(i).padStart(5, '0')}`,
      displayName: hasName ? `مستخدم ${i}` : null,
      emailMasked: `u${i}••••@example.test`,
      createdAt: isoDaysAgo(i % 120),
      lastSignInAt: hasSignIn ? isoDaysAgo(i % 45) : null,
      entitlement: ent,
      onboarding: ob,
    })
  }
  return rows
}

/** طقم صغير — لقراءة الجدول بالعين. */
export const smallUserSet: readonly AdminUserRow[] = makeUserRows(25)

/**
 * **الطقم الكبير — اختبار الافتراضية.** ٥٠٠٠ صفّ: أكبر بكثير من أي DOM معقول،
 * فيسقط أي تنفيذ يرسم كل الصفوف بدل النافذة المرئية.
 */
export const largeUserSet: readonly AdminUserRow[] = makeUserRows(5_000)

export const userDetailFixture: AdminUserDetail = {
  row: smallUserSet[0],
  planSummary: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  activity: {
    workoutsCompleted: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    nutritionDaysLogged: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    measurementEvents: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    lastActivityAt: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  },
  recentWorkouts: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  supportContext: unavailable('NEEDS_BACKEND'),
  // الكتل التشغيلية جاهزة في التجهيزة كي تُرسَم الحالة الممتلئة ويُصمَّم عليها.
  emailVerified: ready(true, FIXTURE_AS_OF),
  entitlementDetail: {
    state: ready('premiumActive', FIXTURE_AS_OF),
    source: ready('salla', FIXTURE_AS_OF),
    activatedAt: ready('2026-08-01T09:12:00.000Z', FIXTURE_AS_OF),
    expiresAt: ready(null, FIXTURE_AS_OF),
    revokedAt: ready(null, FIXTURE_AS_OF),
    revokedReason: ready(null, FIXTURE_AS_OF),
  },
  commerce: {
    codesRedeemed: ready(0, FIXTURE_AS_OF),
    purchases: ready(1, FIXTURE_AS_OF),
    lastOrderId: ready('SLA-10241', FIXTURE_AS_OF),
    lastPurchaseAt: ready('2026-08-01T09:11:40.000Z', FIXTURE_AS_OF),
    accessRevoked: ready(false, FIXTURE_AS_OF),
    // [ADMIN-CONV] سجلّ مملوء كي تُرسَم الحالة الممتلئة ويُصمَّم عليها.
    codeHistory: ready(
      [{ label: 'ramadan', redeemedAt: '2026-08-02T10:00:00.000Z', durationDays: 30 }],
      FIXTURE_AS_OF,
    ),
  },
  foodSubmissions: ready(
    [{ id: 'fixture-food-1', status: 'pending', productName: 'تمر سكري — عبوة ٥٠٠غ', submittedAt: '2026-08-10T08:00:00.000Z' }],
    FIXTURE_AS_OF,
  ),
}

// ───────────────────────────── لقطات كاملة ─────────────────────────────

/** طابور اهتمام التجهيزة — يُبنى في `model/attention.ts` من نفس المصدر. */
const attentionFixture: readonly AttentionItem[] = []

/** كل شيء جاهز قدر ما يسمح الصدق — لتصميم الحالة الممتلئة. */
export const snapshotReady: ExecutiveSnapshot = {
  platform: platformFixture,
  users: usersReadyFixture,
  activity: activityReadyFixture,
  entitlement: entitlementReadyFixture,
  commerce: commerceReadyFixture,
  errors: errorsGapFixture,
  onboarding: onboardingReadyFixture,
  journey: journeyGapFixture,
  attention: attentionFixture,
  users_page: ready({ rows: smallUserSet, total: 1_284, page: 1, pageSize: 25 }, FIXTURE_AS_OF),
}

/** فارغ — الخادم أجاب ولا صفوف. **صفر حقيقي مقيس، لا غياب مُقنَّع.** */
export const snapshotEmpty: ExecutiveSnapshot = {
  platform: platformFixture,
  users: {
    total: ready(0, FIXTURE_AS_OF),
    newToday: ready(0, FIXTURE_AS_OF),
    new7d: ready(0, FIXTURE_AS_OF),
    new30d: ready(0, FIXTURE_AS_OF),
    verified: ready(0, FIXTURE_AS_OF),
    growthSeries: ready([], FIXTURE_AS_OF),
  },
  activity: allActivity(gapV),
  entitlement: allEntitlement(gapV),
  commerce: allCommerce(readyZero),
  errors: errorsGapFixture,
  onboarding: allOnboarding(gapV),
  journey: journeyGapFixture,
  attention: attentionFixture,
  users_page: ready({ rows: [], total: 0, page: 1, pageSize: 25 }, FIXTURE_AS_OF),
}

export const snapshotLoading: ExecutiveSnapshot = {
  platform: platformFixture,
  users: allUsers(loadingV),
  activity: allActivity(loadingV),
  entitlement: allEntitlement(loadingV),
  commerce: allCommerce(loadingV),
  errors: errorsGapFixture,
  onboarding: allOnboarding(loadingV),
  journey: journeyGapFixture,
  attention: attentionFixture,
  users_page: { state: 'loading' },
}

/**
 * **جزئي — أهمّ التجهيزات.** الحسابات وصلت، والاستحقاق سقط، والنشاط متحيّز.
 * وهذه هي الحالة الواقعية المتوقّعة بعد أول دفعة Backend: خليط من ثلاث حالات
 * في شاشة واحدة. أي تنفيذ يفترض «كله أو لا شيء» ينكسر هنا لا في الإنتاج.
 */
export const snapshotPartial: ExecutiveSnapshot = {
  platform: platformFixture,
  users: usersReadyFixture,
  activity: {
    signedInToday: ready(41, FIXTURE_AS_OF),
    signedIn7d: ready(418, FIXTURE_AS_OF),
    signedIn30d: ready(769, FIXTURE_AS_OF),
    dormant30d: unavailable('NEEDS_BACKEND'),
    productActive7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    workoutsCompleted7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    nutritionLogged7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    measurementsLogged30d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    activeSeries: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  },
  entitlement: allEntitlement(errorV),
  commerce: allCommerce(errorV),
  errors: errorsGapFixture,
  onboarding: allOnboarding(gapV),
  journey: journeyGapFixture,
  attention: attentionFixture,
  users_page: ready({ rows: smallUserSet, total: 1_284, page: 1, pageSize: 25 }, FIXTURE_AS_OF),
}

export const snapshotError: ExecutiveSnapshot = {
  platform: platformFixture,
  users: allUsers(errorV),
  activity: allActivity(errorV),
  entitlement: allEntitlement(errorV),
  commerce: allCommerce(errorV),
  errors: errorsGapFixture,
  onboarding: allOnboarding(errorV),
  journey: journeyGapFixture,
  attention: attentionFixture,
  users_page: { state: 'error', code: 'fixture.error' },
}

/** الحالة الصادقة اليوم — كل شيء غير متاح بدرجته الصحيحة. */
export const snapshotToday: ExecutiveSnapshot = {
  platform: platformFixture,
  users: allUsers(gapV),
  activity: {
    signedInToday: unavailable('NEEDS_BACKEND'),
    signedIn7d: unavailable('NEEDS_BACKEND'),
    signedIn30d: unavailable('NEEDS_BACKEND'),
    dormant30d: unavailable('NEEDS_BACKEND'),
    productActive7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    workoutsCompleted7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    nutritionLogged7d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    measurementsLogged30d: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
    activeSeries: unavailable('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE'),
  },
  entitlement: allEntitlement(gapV),
  commerce: allCommerce(gapV),
  errors: errorsGapFixture,
  onboarding: allOnboarding(gapV),
  journey: journeyGapFixture,
  attention: attentionFixture,
  users_page: unavailable('NEEDS_BACKEND'),
}

/** الأسماء المعلَنة — تقرأها لوحة المعاينة والإثبات معًا. */
export const FIXTURE_SCENARIOS = ['today', 'ready', 'empty', 'loading', 'partial', 'error'] as const
export type FixtureScenario = (typeof FIXTURE_SCENARIOS)[number]

export function fixtureFor(scenario: FixtureScenario): ExecutiveSnapshot {
  switch (scenario) {
    case 'ready':
      return snapshotReady
    case 'empty':
      return snapshotEmpty
    case 'loading':
      return snapshotLoading
    case 'partial':
      return snapshotPartial
    case 'error':
      return snapshotError
    case 'today':
      return snapshotToday
  }
}
