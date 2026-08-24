/**
 * الطريق الحيّ إلى أرقام اللوحة — نداء الخادم الوحيد.
 * [OVERNIGHT-ADMIN] · AGENT-E.
 *
 * ═══ لماذا ملفّ ثانٍ بجانب `source.ts` ═══
 * `source.ts` يبني **لقطة الغياب**: كل مقياس بدرجته من السجلّ، بلا شبكة. وهذا
 * الملف يضع فوقها ما أعاده الخادم فعلًا. الفصل مقصود: **الأساس غياب، والحضور
 * إضافة** — فأي حقل ينساه هذا الملف يبقى «غير متاح» ولا يسقط في صفر. لو كان
 * الأساس صفرًا لكان النسيان كذبًا صامتًا.
 *
 * ═══ ثلاثة قيود بنيوية ═══
 *  ① **لا `?? 0` ولا `|| 0` في هذا الملف.** القارئ الوحيد للأرقام هو `num()`
 *     أدناه، وهو يرفض كل ما ليس عددًا منتهيًا ويعيد الغياب. يحرسه
 *     `test:admin-mount` بفحص مسمّى ومحاكاة التفاف.
 *  ② **لا نداء قبل حسم الدور.** غير المؤسس لا تُرسَل عنه حزمة أصلًا: القرار
 *     يُفحص في أول سطر. حارس الواجهة لا يحمي البيانات (السلطة في القاعدة)،
 *     لكنه يمنع نداءً بلا معنى يُسجَّل في سجلّات الخادم.
 *  ③ **الفشل يُسمّى ولا يُبتلع.** كل مسار خطأ يعيد `LiveReadState` مسمّى تعرضه
 *     الشاشة، فلا يظنّ المؤسس أن الفراغ «لا مستخدمين».
 *
 * ⚠️ **اليوم:** الدالتان `founder_executive_snapshot()` و`founder_user_page()`
 *    موجودتان في `supabase/migrations/` و**لم تُطبَّقا** على أي قاعدة. فالنداء
 *    يعود بـ`rpc-missing`، وتبقى كل بطاقة «غير متاح» بسببها المكتوب. ما إن
 *    تُطبَّق الهجرة تضيء الشاشة **بلا سطر كود واحد**.
 */

import { getSupabase } from '@/lib/supabaseClient'
import { loadExecutiveSnapshot } from './source'
import {
  CODE_ENABLE_RPC,
  CODE_ISSUE_RPC,
  CODE_PAGE_RPC,
  DASHBOARD_RPC,
  REVOKE_ACCESS_RPC,
  USER_DETAIL_RPC,
  USER_PAGE_RPC,
  FAILED_ORDERS_RPC,
  CODE_REDEMPTIONS_RPC,
  EMAIL_HEALTH_RPC,
  GRANTS_BY_SOURCE_RPC,
  FOOD_SUBMISSIONS_RPC,
  FOOD_REVIEW_RPC,
} from './metrics'
import { canWrite, isAdmin } from '../auth/adminRole'
import type { AdminRoleDecision } from '../auth/adminRole'
import type {
  AdminCodePage,
  AdminCodeRow,
  CodeRedemptionRow,
  EmailHealth,
  FailedOrderRow,
  FoodSubmissionRow,
  AdminUserDetail,
  AdminUserPage,
  AdminUserRow,
  CodeStatus,
  EntitlementView,
  ExecutiveSnapshot,
  IssuedCode,
  MetricValue,
  OnboardingView,
  SeriesPoint,
} from './types'
import { ready, unavailable } from './types'

/** حالة القراءة الحيّة — مسمّاة دائمًا، فلا فراغ بلا تفسير. */
export type LiveReadState =
  /** لم يُضبط Supabase في هذا البناء. */
  | 'no-backend'
  /** لم يُحسم الدور مؤسسًا — لا يُرسل نداء أصلًا. */
  | 'not-founder'
  /** الدالة غير موجودة في القاعدة: الهجرة لم تُطبَّق بعد. */
  | 'rpc-missing'
  /** القاعدة ردّت بمنع — الجلسة لا تحمل الدور على الخادم. */
  | 'denied-by-server'
  /** فشل آخر (شبكة/صيغة). */
  | 'failed'
  /** أرقام حقيقية وصلت. */
  | 'live'

export interface LiveSnapshotResult {
  readonly snapshot: ExecutiveSnapshot
  readonly live: LiveReadState
}

export interface LiveUserPageResult {
  readonly page: MetricValue<AdminUserPage>
  readonly live: LiveReadState
}

/**
 * القارئ العددي الوحيد.
 *
 * **لا يعيد صفرًا احتياطيًا أبدًا.** `null`، `undefined`، نصّ، `NaN`، لانهاية —
 * كلها غياب. والصفر الذي **عدّه الخادم** يمرّ كما هو، لأنه قياس لا افتراض.
 */
function num(raw: unknown, asOf: string, fallback: MetricValue<number>): MetricValue<number> {
  if (typeof raw === 'number' && Number.isFinite(raw)) return ready(raw, asOf)
  return fallback
}

/** نسبة مشتقّة — تُحسب فقط حين يكون المقام عددًا موجبًا. */
function ratio(top: unknown, bottom: unknown, asOf: string, fallback: MetricValue<number>): MetricValue<number> {
  if (typeof top !== 'number' || !Number.isFinite(top)) return fallback
  if (typeof bottom !== 'number' || !Number.isFinite(bottom) || bottom <= 0) return fallback
  return ready(top / bottom, asOf)
}

/** سلسلة زمنية — تُقبل فقط إن كانت مصفوفة نقاط سليمة بالكامل. */
function series(raw: unknown, asOf: string, fallback: MetricValue<readonly SeriesPoint[]>): MetricValue<readonly SeriesPoint[]> {
  if (!Array.isArray(raw)) return fallback
  const points: SeriesPoint[] = []
  for (const p of raw) {
    if (!p || typeof p !== 'object') return fallback
    const rec = p as Record<string, unknown>
    if (typeof rec.date !== 'string' || typeof rec.value !== 'number' || !Number.isFinite(rec.value)) return fallback
    points.push({ date: rec.date, value: rec.value })
  }
  return ready(points, asOf)
}

function bag(root: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = root[key]
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

/** يصنّف خطأ Supabase إلى حالة مسمّاة — بلا ابتلاع وبلا تعميم. */
function classify(err: { code?: string; message?: string } | null | undefined): LiveReadState {
  const code = err?.code ?? ''
  const msg = (err?.message ?? '').toLowerCase()
  // PostgREST يعيد PGRST202 حين لا توجد الدالة في المخطّط المكشوف.
  if (code === 'PGRST202' || code === '42883' || msg.includes('could not find the function')) return 'rpc-missing'
  // `founder_role_required` يُرفع بـ42501 من `private.require_founder()`.
  if (code === '42501' || msg.includes('founder_role_required')) return 'denied-by-server'
  return 'failed'
}

/**
 * يحمّل اللقطة الحيّة.
 *
 * يبدأ **دائمًا** من لقطة الغياب، ثم يستبدل ما وصل فقط. فالفشل الجزئي يترك
 * البقيّة غائبة لا مصفّرة.
 */
export async function loadLiveExecutiveSnapshot(decision: AdminRoleDecision): Promise<LiveSnapshotResult> {
  const base = await loadExecutiveSnapshot()
  if (!isAdmin(decision)) return { snapshot: base, live: 'not-founder' }

  const client = await getSupabase()
  if (!client) return { snapshot: base, live: 'no-backend' }

  let payload: Record<string, unknown>
  try {
    const { data, error } = await client.rpc(DASHBOARD_RPC)
    if (error) return { snapshot: base, live: classify(error) }
    if (!data || typeof data !== 'object') return { snapshot: base, live: 'failed' }
    payload = data as Record<string, unknown>
  } catch {
    // نداء ينهار (شبكة/مكتبة) ليس صفرًا — يبقى الغياب كما هو.
    return { snapshot: base, live: 'failed' }
  }

  // لحظة القياس من **الخادم**. لا `asOf` ⇒ لا رقم يُقبل: قيمة بلا لحظة تبدو
  // حيّة وهي قد تكون بايتة، وذلك ما يمنعه العقد (`ready` يفرض `asOf`).
  const asOf = typeof payload.as_of === 'string' ? payload.as_of : null
  if (!asOf) return { snapshot: base, live: 'failed' }

  const u = bag(payload, 'users')
  const a = bag(payload, 'activity')
  const e = bag(payload, 'entitlement')
  const c = bag(payload, 'commerce')

  const snapshot: ExecutiveSnapshot = {
    ...base,
    users: {
      total: num(u.total, asOf, base.users.total),
      newToday: num(u.newToday, asOf, base.users.newToday),
      new7d: num(u.new7d, asOf, base.users.new7d),
      new30d: num(u.new30d, asOf, base.users.new30d),
      verified: num(u.verified, asOf, base.users.verified),
      growthSeries: series(u.growthSeries, asOf, base.users.growthSeries),
    },
    activity: {
      ...base.activity,
      signedIn7d: num(a.signedIn7d, asOf, base.activity.signedIn7d),
      signedIn30d: num(a.signedIn30d, asOf, base.activity.signedIn30d),
      dormant30d: num(a.dormant30d, asOf, base.activity.dormant30d),
      // نشاط المنتج يبقى غائبًا **حتى مع خادم مثالي**: مقامه متحيّز بالموافقة،
      // ولا يرفع ذلك تطبيقُ هجرة (قرار منتج، لا نقص مسار).
    },
    entitlement: {
      ...base.entitlement,
      premiumActive: num(e.premiumActive, asOf, base.entitlement.premiumActive),
      trialActive: num(e.trialActive, asOf, base.entitlement.trialActive),
      trialExpired: num(e.trialExpired, asOf, base.entitlement.trialExpired),
      previewOnly: num(e.previewOnly, asOf, base.entitlement.previewOnly),
      activationRedeemed: num(c.codesRedeemed, asOf, base.entitlement.activationRedeemed),
      activationPending: num(c.codesUnused, asOf, base.entitlement.activationPending),
      conversionOfAccounts: ratio(e.premiumActive, u.total, asOf, base.entitlement.conversionOfAccounts),
      activationFunnel: [
        { id: 'issued', labelKey: 'funnel.issued', count: num(c.codesIssued, asOf, base.entitlement.activationPending) },
        { id: 'redeemed', labelKey: 'funnel.redeemed', count: num(c.codesRedeemed, asOf, base.entitlement.activationRedeemed) },
        { id: 'active', labelKey: 'funnel.active', count: num(e.premiumActive, asOf, base.entitlement.premiumActive) },
      ],
    },
    commerce: {
      ordersSeen: num(c.ordersSeen, asOf, base.commerce.ordersSeen),
      ordersPaid: num(c.ordersPaid, asOf, base.commerce.ordersPaid),
      ordersFailed: num(c.ordersFailed, asOf, base.commerce.ordersFailed),
      codesIssued: num(c.codesIssued, asOf, base.commerce.codesIssued),
      codesRedeemed: num(c.codesRedeemed, asOf, base.commerce.codesRedeemed),
      codesUnused: num(c.codesUnused, asOf, base.commerce.codesUnused),
      // ⚠️ **لا مصدر**: لا يُقرأ من الحمولة ولو أُضيف مفتاح بهذا الاسم يومًا.
      redemptionFailures24h: base.commerce.redemptionFailures24h,
      revokedActive: num(e.revokedActive, asOf, base.commerce.revokedActive),
      webhookProcessed: num(c.webhookProcessed, asOf, base.commerce.webhookProcessed),
      webhookPending: num(c.webhookPending, asOf, base.commerce.webhookPending),
      // ⚠️ **لا مصدر**: لا عمود محاولات في الجدول. لا يُقرأ ولو حُشي المفتاح.
      webhookRetried: base.commerce.webhookRetried,
      grantsManual: num(c.grantsManual, asOf, base.commerce.grantsManual),
    },
    // الأخطاء والتخصيص والرحلة: بلا مسار وبلا مقام غير متحيّز — تبقى كما بناها
    // الغياب. و**الرحلة تحديدًا لا تُقرأ من الحمولة إطلاقًا**: خطّ الأحداث غير
    // موجود، فأي مفتاح بهذه الأسماء في ردّ الخادم رقمٌ لا نعرف من أين جاء.
    errors: base.errors,
    onboarding: base.onboarding,
    journey: base.journey,
  }

  return { snapshot, live: 'live' }
}

const ENTITLEMENT_VIEWS: readonly EntitlementView[] = ['premium', 'trial', 'code', 'preview', 'unknown']
const ONBOARDING_VIEWS: readonly OnboardingView[] = ['complete', 'incomplete', 'unknown']

/** يحوّل صفًّا خامًا. أي حقل خارج القائمة المعلَنة يصير `unknown` لا يُخترع. */
function toRow(raw: Record<string, unknown>): AdminUserRow | null {
  if (typeof raw.user_id !== 'string' || typeof raw.created_at !== 'string') return null
  const ent = ENTITLEMENT_VIEWS.find((v) => v === raw.entitlement) ?? 'unknown'
  const onb = ONBOARDING_VIEWS.find((v) => v === raw.onboarding) ?? 'unknown'
  return {
    userId: raw.user_id,
    displayName: typeof raw.display_name === 'string' ? raw.display_name : null,
    emailMasked: typeof raw.email_masked === 'string' ? raw.email_masked : null,
    createdAt: raw.created_at,
    lastSignInAt: typeof raw.last_sign_in_at === 'string' ? raw.last_sign_in_at : null,
    entitlement: ent,
    onboarding: onb,
  }
}

/** يحمّل صفحة من جدول المستخدمين. البحث والترتيب على الخادم لا في المتصفّح. */
export async function loadLiveUserPage(
  decision: AdminRoleDecision,
  opts: { search?: string; page?: number; pageSize?: number } = {},
): Promise<LiveUserPageResult> {
  const gap = (await loadExecutiveSnapshot()).users_page
  if (!isAdmin(decision)) return { page: gap, live: 'not-founder' }

  const client = await getSupabase()
  if (!client) return { page: gap, live: 'no-backend' }

  const page = Math.max(1, Math.trunc(opts.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Math.trunc(opts.pageSize ?? 25)))

  try {
    const { data, error } = await client.rpc(USER_PAGE_RPC, {
      p_search: opts.search ?? '',
      p_page: page,
      p_page_size: pageSize,
    })
    if (error) return { page: gap, live: classify(error) }
    if (!Array.isArray(data)) return { page: gap, live: 'failed' }

    const rows: AdminUserRow[] = []
    let total: number | null = null
    for (const item of data) {
      if (!item || typeof item !== 'object') return { page: gap, live: 'failed' }
      const rec = item as Record<string, unknown>
      const row = toRow(rec)
      if (!row) return { page: gap, live: 'failed' }
      rows.push(row)
      if (typeof rec.total_rows === 'number' && Number.isFinite(rec.total_rows)) total = rec.total_rows
    }
    // صفحة فارغة **بعد نجاح النداء** = صفر مقيس لا غياب: الخادم عدّ ولم يجد.
    const measuredTotal = total === null ? rows.length : total
    return {
      page: ready({ rows, total: measuredTotal, page, pageSize }, new Date().toISOString()),
      live: 'live',
    }
  } catch {
    return { page: gap, live: 'failed' }
  }
}


export interface LiveUserDetailResult {
  /** `null` = ما وصلت صفحة. **لا كائن نصف مملوء** يُقرأ حسابًا بلا بيانات. */
  readonly detail: AdminUserDetail | null
  readonly live: LiveReadState
}

/**
 * قارئ نصّي — أخو `num()`.
 *
 * **لا يعيد نصًّا فارغًا احتياطيًا.** ما ليس نصًّا ولا `null` صريحًا هو غياب.
 * والفرق بين `null` و«غير متاح» جوهري هنا: `null` جوابُ خادم («لا تاريخ
 * انتهاء» = منحة دائمة)، و«غير متاح» يعني أننا لم نقرأ.
 */
function str(raw: unknown, asOf: string): MetricValue<string | null> {
  if (typeof raw === 'string') return ready(raw, asOf)
  if (raw === null) return ready(null, asOf)
  return unavailable<string | null>('NEEDS_BACKEND')
}

/** قارئ منطقي — `true`/`false` وحدهما يمرّان. */
function bool(raw: unknown, asOf: string): MetricValue<boolean> {
  if (typeof raw === 'boolean') return ready(raw, asOf)
  return unavailable<boolean>('NEEDS_BACKEND')
}

/** حالة استحقاق الخادم ⟵ تصنيف الواجهة. المجهول يبقى مجهولًا ولا يُطوى. */
function entitlementViewOf(state: unknown): EntitlementView {
  switch (state) {
    case 'premiumActive':
      return 'premium'
    case 'trialActive':
      return 'trial'
    case 'specialAccessActive':
      return 'code'
    case 'noAccess':
    case 'trialExpired':
      return 'preview'
    default:
      return 'unknown'
  }
}

/**
 * يحمّل صفحة حساب واحد.
 *
 * ═══ ثلاثة قيود ═══
 *  ① **لا نداء قبل حسم الدور** — كما في الدالتين الأخريين.
 *  ② **الأساس غياب**: كل كتلة منتج (خطة · تمارين · تغذية · قياسات) تُبنى
 *     `unavailable` **ولا تُقرأ من الحمولة إطلاقًا**. ولو حشا الخادم مفتاحًا
 *     باسمها لا يُقرأ: لا مصدر يعني لا مصدر (نفس قاعدة `redemptionFailures24h`).
 *  ③ **رد بلا `as_of` أو بلا كتلة حساب يُرفض كلّه** — لا صفحة نصف مملوءة.
 */
export async function loadLiveUserDetail(
  decision: AdminRoleDecision,
  userId: string,
): Promise<LiveUserDetailResult> {
  if (!isAdmin(decision)) return { detail: null, live: 'not-founder' }

  const client = await getSupabase()
  if (!client) return { detail: null, live: 'no-backend' }

  let payload: Record<string, unknown>
  try {
    const { data, error } = await client.rpc(USER_DETAIL_RPC, { p_user_id: userId })
    if (error) return { detail: null, live: classify(error) }
    if (!data || typeof data !== 'object') return { detail: null, live: 'failed' }
    payload = data as Record<string, unknown>
  } catch {
    return { detail: null, live: 'failed' }
  }

  const asOf = typeof payload.as_of === 'string' ? payload.as_of : null
  if (!asOf) return { detail: null, live: 'failed' }

  const acct = bag(payload, 'account')
  const ent = bag(payload, 'entitlement')
  const com = bag(payload, 'commerce')
  // الصفّ يُبنى من كتلة الحساب نفسها لا من صفّ الجدول: الجدول قد يكون بايتًا،
  // وصفحة الحساب يجب أن تعرض ما تقوله القاعدة **الآن**.
  if (typeof acct.user_id !== 'string' || typeof acct.created_at !== 'string') {
    return { detail: null, live: 'failed' }
  }
  const row: AdminUserRow = {
    userId: acct.user_id,
    displayName: typeof acct.display_name === 'string' ? acct.display_name : null,
    emailMasked: typeof acct.email_masked === 'string' ? acct.email_masked : null,
    createdAt: acct.created_at,
    lastSignInAt: typeof acct.last_sign_in_at === 'string' ? acct.last_sign_in_at : null,
    entitlement: entitlementViewOf(ent.state),
    onboarding: ONBOARDING_VIEWS.find((v) => v === payload.onboarding) ?? 'unknown',
  }

  const consentGap = <T,>(): MetricValue<T> => unavailable<T>('IMPOSSIBLE_WITHOUT_CONSENT_CHANGE')

  return {
    detail: {
      row,
      // ⚠️ كتل المنتج **لا تُقرأ من الحمولة**: مقامها متحيّز بالموافقة، ولا
      // ترفع ذلك هجرةٌ. عرضها رقمًا هنا كان سيجعل حسابًا لم يوافق يبدو خاملًا.
      planSummary: consentGap<string | null>(),
      activity: {
        workoutsCompleted: consentGap<number>(),
        nutritionDaysLogged: consentGap<number>(),
        // ولا حتى عدّاد أحداث القياس: عدُّ جدول صحّي يفتح مسارًا إليه.
        measurementEvents: consentGap<number>(),
        lastActivityAt: consentGap<string | null>(),
      },
      recentWorkouts: consentGap<readonly { date: string; dayName: string | null }[]>(),
      supportContext: unavailable<readonly string[]>('NEEDS_BACKEND'),
      emailVerified: bool(acct.email_verified, asOf),
      entitlementDetail: {
        state: typeof ent.state === 'string' ? ready(ent.state, asOf) : unavailable<string>('NEEDS_BACKEND'),
        source: str(ent.source, asOf),
        activatedAt: str(ent.activated_at, asOf),
        expiresAt: str(ent.expires_at, asOf),
        revokedAt: str(ent.revoked_at, asOf),
        revokedReason: str(ent.revoked_reason, asOf),
      },
      commerce: {
        codesRedeemed: num(com.codesRedeemed, asOf, unavailable<number>('NEEDS_BACKEND')),
        purchases: num(com.purchases, asOf, unavailable<number>('NEEDS_BACKEND')),
        lastOrderId: str(com.lastOrderId, asOf),
        lastPurchaseAt: str(com.lastPurchaseAt, asOf),
        accessRevoked: bool(com.accessRevoked, asOf),
      },
    },
    live: 'live',
  }
}


// ═══════════════════ إدارة أكواد الوصول ═══════════════════
//
// ⚠️ **الخطّ الفاصل مُعاد هنا كي لا يُقرأ الكود بلا سببه:**
// المؤسس من المتصفّح **يُغلق الأبواب ويفتح بابًا موقوتًا قابلًا للسحب**؛
// ومنح Premium الدائم ورفع الحظر يبقيان بيد **مفتاح الخادم** — ولا مُغلِّف
// لأيّهما في هذا الملف بأي حال. (الأسماء والتعليل في رأس هجرة
// `20260822120002_founder_code_management.sql`؛ لا تُكتب هنا كي يبقى كود اللوحة
// خاليًا من كل اسم مميّز — يحرسه `test:admin-secret-leak` بالاسم لا بالسياق.)

const CODE_STATUSES: readonly CodeStatus[] = ['issued', 'redeemed', 'expired', 'disabled']

export interface LiveCodePageResult {
  readonly page: MetricValue<AdminCodePage>
  readonly live: LiveReadState
}

/** نتيجة فعل كتابة — **مسمّاة دائمًا**، فلا زرّ يُضغط ولا يُعرف ما جرى. */
export type WriteOutcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly live: LiveReadState }

/** يحوّل صفّ كود خامًا. حالة خارج القائمة تُسقط الصفحة ولا تُخترع. */
function toCodeRow(raw: Record<string, unknown>): AdminCodeRow | null {
  const status = CODE_STATUSES.find((v) => v === raw.status)
  if (typeof raw.code_id !== 'string' || typeof raw.created_at !== 'string' || !status) return null
  if (typeof raw.duration_days !== 'number' || typeof raw.max_redemptions !== 'number') return null
  if (typeof raw.redemption_count !== 'number') return null
  return {
    codeId: raw.code_id,
    label: typeof raw.label === 'string' ? raw.label : null,
    status,
    durationDays: raw.duration_days,
    maxRedemptions: raw.max_redemptions,
    redemptionCount: raw.redemption_count,
    startsAt: typeof raw.starts_at === 'string' ? raw.starts_at : raw.created_at,
    expiresAt: typeof raw.expires_at === 'string' ? raw.expires_at : null,
    createdBy: typeof raw.created_by === 'string' ? raw.created_by : '',
    createdReason: typeof raw.created_reason === 'string' ? raw.created_reason : '',
    createdAt: raw.created_at,
  }
}

/** يحمّل صفحة من جدول الأكواد. البحث بالوسم والسبب والحالة — **لا بالكود**. */
export async function loadLiveCodePage(
  decision: AdminRoleDecision,
  opts: { search?: string; page?: number; pageSize?: number } = {},
): Promise<LiveCodePageResult> {
  const gap = unavailable<AdminCodePage>('NEEDS_BACKEND')
  if (!isAdmin(decision)) return { page: gap, live: 'not-founder' }

  const client = await getSupabase()
  if (!client) return { page: gap, live: 'no-backend' }

  const page = Math.max(1, Math.trunc(opts.page ?? 1))
  const pageSize = Math.min(200, Math.max(1, Math.trunc(opts.pageSize ?? 25)))

  try {
    const { data, error } = await client.rpc(CODE_PAGE_RPC, {
      p_search: opts.search ?? '',
      p_page: page,
      p_page_size: pageSize,
    })
    if (error) return { page: gap, live: classify(error) }
    if (!Array.isArray(data)) return { page: gap, live: 'failed' }

    const rows: AdminCodeRow[] = []
    let total: number | null = null
    for (const item of data) {
      if (!item || typeof item !== 'object') return { page: gap, live: 'failed' }
      const rec = item as Record<string, unknown>
      const row = toCodeRow(rec)
      // صفّ مشوّه يُسقط الصفحة **كلّها**: نصف قائمة أكواد أخطر من لا قائمة.
      if (!row) return { page: gap, live: 'failed' }
      rows.push(row)
      if (typeof rec.total_rows === 'number' && Number.isFinite(rec.total_rows)) total = rec.total_rows
    }
    const measuredTotal = total === null ? rows.length : total
    return { page: ready({ rows, total: measuredTotal, page, pageSize }, new Date().toISOString()), live: 'live' }
  } catch {
    return { page: gap, live: 'failed' }
  }
}

/**
 * يُصدر كودًا. `code` فارغًا ⇒ **يولّده الخادم** — وهو المسار الافتراضي:
 * كود يكتبه إنسان يبدو عشوائيًا وليس كذلك (`RAMADAN2345` يمرّ عقد الشكل كاملًا).
 */
export async function issueAccessCode(
  decision: AdminRoleDecision,
  input: { reason: string; label?: string; durationDays: number; maxRedemptions: number; code?: string },
): Promise<WriteOutcome<IssuedCode>> {
  if (!canWrite(decision)) return { ok: false, live: 'not-founder' }
  const client = await getSupabase()
  if (!client) return { ok: false, live: 'no-backend' }
  try {
    const { data, error } = await client.rpc(CODE_ISSUE_RPC, {
      p_reason: input.reason,
      p_label: input.label ?? null,
      p_duration_days: input.durationDays,
      p_max_redemptions: input.maxRedemptions,
      p_expires_at: null,
      p_code: input.code ?? null,
    })
    if (error) return { ok: false, live: classify(error) }
    const rec = (data ?? {}) as Record<string, unknown>
    // بلا نصّ كود في الرد **لا نجاح يُعلَن**: النجاح هنا هو أن يظهر الكود مرّة.
    if (typeof rec.id !== 'string' || typeof rec.code !== 'string') return { ok: false, live: 'failed' }
    return {
      ok: true,
      value: {
        id: rec.id,
        code: rec.code,
        label: typeof rec.label === 'string' ? rec.label : null,
        durationDays: typeof rec.duration_days === 'number' ? rec.duration_days : input.durationDays,
        maxRedemptions: typeof rec.max_redemptions === 'number' ? rec.max_redemptions : input.maxRedemptions,
        expiresAt: typeof rec.expires_at === 'string' ? rec.expires_at : null,
        issuedAt: typeof rec.issued_at === 'string' ? rec.issued_at : new Date().toISOString(),
      },
    }
  } catch {
    return { ok: false, live: 'failed' }
  }
}

/** يعطّل كودًا أو يعيد تشغيله. **لا حذف** — صفّ الكود أثر إداري. */
export async function setAccessCodeEnabled(
  decision: AdminRoleDecision,
  codeId: string,
  enabled: boolean,
  reason: string,
): Promise<WriteOutcome<boolean>> {
  if (!canWrite(decision)) return { ok: false, live: 'not-founder' }
  const client = await getSupabase()
  if (!client) return { ok: false, live: 'no-backend' }
  try {
    const { data, error } = await client.rpc(CODE_ENABLE_RPC, {
      p_code_id: codeId,
      p_enabled: enabled,
      p_reason: reason,
    })
    if (error) return { ok: false, live: classify(error) }
    const rec = (data ?? {}) as Record<string, unknown>
    if (typeof rec.enabled !== 'boolean') return { ok: false, live: 'failed' }
    return { ok: true, value: rec.enabled }
  } catch {
    return { ok: false, live: 'failed' }
  }
}

/**
 * يسحب وصول حساب.
 * **ولا نظير له للمنح في هذا الملف** — سكّ وصول دائم فعل مفتاح خادم لا فعل
 * متصفّح، ورفع الحظر كذلك. الاتجاه المسموح من هنا واحد: **يسحب ولا يمنح**.
 */
export async function revokeUserAccess(
  decision: AdminRoleDecision,
  userId: string,
  reason: string,
): Promise<WriteOutcome<string>> {
  if (!canWrite(decision)) return { ok: false, live: 'not-founder' }
  const client = await getSupabase()
  if (!client) return { ok: false, live: 'no-backend' }
  try {
    const { data, error } = await client.rpc(REVOKE_ACCESS_RPC, { p_user_id: userId, p_reason: reason })
    if (error) return { ok: false, live: classify(error) }
    if (typeof data !== 'string') return { ok: false, live: 'failed' }
    return { ok: true, value: data }
  } catch {
    return { ok: false, live: 'failed' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// [COMMISSIONING §4/§7/§11] غرفة العمليات
// ─────────────────────────────────────────────────────────────────────────────
// نفس عقد بقيّة هذا الملف بحرفه: **القراءة تبدأ من الغياب**، والفشل يُصنَّف
// باسمه (`rpc-missing` · `denied-by-server` · `failed`) ولا يتحوّل إلى صفر ولا
// إلى قائمة فارغة تُقرأ «لا يوجد شيء». الفرق بين «لا طلبات فاشلة» و«لم نستطع
// السؤال» فرقٌ تشغيلي حقيقي، فيبقى مرئيًّا.

/** نتيجة قراءة قائمة: إمّا صفوف، وإمّا سببٌ مسمّى لغيابها. */
export type ListResult<T> =
  | { readonly ok: true; readonly rows: readonly T[] }
  | { readonly ok: false; readonly live: LiveReadState }

async function readRows<T>(
  decision: AdminRoleDecision,
  rpc: string,
  args: Record<string, unknown>,
  map: (row: Record<string, unknown>) => T,
): Promise<ListResult<T>> {
  if (!isAdmin(decision)) return { ok: false, live: 'not-founder' }
  const client = await getSupabase()
  if (!client) return { ok: false, live: 'no-backend' }
  try {
    const { data, error } = await client.rpc(rpc, args)
    if (error) return { ok: false, live: classify(error) }
    if (!Array.isArray(data)) return { ok: false, live: 'failed' }
    return { ok: true, rows: data.map((r) => map(r as Record<string, unknown>)) }
  } catch {
    return { ok: false, live: 'failed' }
  }
}

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')
const txtOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
/** رقمٌ أو **غياب** — لا صفر بديلًا عن «لم يصل». */
const numOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN
  return Number.isFinite(n) ? n : null
}

/** طابور الطلبات التي لم تُسلَّم — الرقم صار أسماءً. */
export async function loadFailedOrders(
  decision: AdminRoleDecision,
  limit = 50,
): Promise<ListResult<FailedOrderRow>> {
  return readRows(decision, FAILED_ORDERS_RPC, { p_limit: limit }, (r) => ({
    providerOrderId: txt(r.provider_order_id),
    classification: txt(r.classification),
    reason: txtOrNull(r.reason),
    receivedAt: txt(r.received_at),
    amountMinor: numOrNull(r.amount_minor),
    currency: txtOrNull(r.currency),
    identityRef: txtOrNull(r.identity_ref),
  }))
}

/** «من استهلك هذا الكود ومتى» — كان عدّادًا، وصار سجلًّا. */
export async function loadCodeRedemptions(
  decision: AdminRoleDecision,
  codeId: string,
): Promise<ListResult<CodeRedemptionRow>> {
  return readRows(decision, CODE_REDEMPTIONS_RPC, { p_code_id: codeId }, (r) => ({
    redeemedAt: txt(r.redeemed_at),
    userId: txt(r.user_id),
    maskedEmail: txtOrNull(r.masked_email),
  }))
}

/** طابور بلاغات الطعام الناقص. */
export async function loadFoodSubmissions(
  decision: AdminRoleDecision,
  status: 'pending' | 'approved' | 'rejected' | 'needs_info' | 'all' = 'pending',
  limit = 50,
): Promise<ListResult<FoodSubmissionRow>> {
  return readRows(decision, FOOD_SUBMISSIONS_RPC, { p_status: status, p_limit: limit }, (r) => ({
    id: txt(r.id),
    submittedAt: txt(r.submitted_at),
    submitterRef: txt(r.submitter_ref),
    productName: txt(r.product_name),
    brand: txtOrNull(r.brand),
    barcode: txtOrNull(r.barcode),
    servingDesc: txtOrNull(r.serving_desc),
    evidenceKcal: numOrNull(r.evidence_kcal),
    evidenceProteinG: numOrNull(r.evidence_protein_g),
    evidenceCarbsG: numOrNull(r.evidence_carbs_g),
    evidenceFatG: numOrNull(r.evidence_fat_g),
    evidenceNote: txtOrNull(r.evidence_note),
    status: (['pending', 'approved', 'rejected', 'needs_info'] as const)
      .find((s) => s === r.status) ?? 'pending',
    reviewedAt: txtOrNull(r.reviewed_at),
    reviewerRef: txtOrNull(r.reviewer_ref),
    reviewNote: txtOrNull(r.review_note),
    publishedFoodId: txtOrNull(r.published_food_id),
  }))
}

/**
 * قرار مراجعة بلاغ. **`canWrite` لا `isAdmin`**: الدعم يقرأ الطابور ولا يبتّ
 * فيه — وهذا ما يفرضه الخادم أيضًا، فالشاشة توافقه بدل أن تَعِد بما سيُرفض.
 */
export async function reviewFoodSubmission(
  decision: AdminRoleDecision,
  id: string,
  verdict: 'approved' | 'rejected' | 'needs_info',
  note: string,
  publishedFoodId?: string,
): Promise<WriteOutcome<string>> {
  if (!canWrite(decision)) return { ok: false, live: 'not-founder' }
  const client = await getSupabase()
  if (!client) return { ok: false, live: 'no-backend' }
  try {
    const { data, error } = await client.rpc(FOOD_REVIEW_RPC, {
      p_id: id, p_decision: verdict, p_note: note,
      p_published_food_id: publishedFoodId ?? null,
    })
    if (error) return { ok: false, live: classify(error) }
    return { ok: true, value: JSON.stringify(data ?? {}) }
  } catch {
    return { ok: false, live: 'failed' }
  }
}

/** صحّة طابور البريد. */
export async function loadEmailHealth(
  decision: AdminRoleDecision,
): Promise<{ ok: true; health: EmailHealth } | { ok: false; live: LiveReadState }> {
  if (!isAdmin(decision)) return { ok: false, live: 'not-founder' }
  const client = await getSupabase()
  if (!client) return { ok: false, live: 'no-backend' }
  try {
    const { data, error } = await client.rpc(EMAIL_HEALTH_RPC, { p_limit: 20 })
    if (error) return { ok: false, live: classify(error) }
    if (!data || typeof data !== 'object') return { ok: false, live: 'failed' }
    const root = data as Record<string, unknown>
    const byStateRaw = bag(root, 'byState')
    const byState: Record<string, number> = {}
    for (const [k, v] of Object.entries(byStateRaw)) {
      const n = numOrNull(v)
      if (n !== null) byState[k] = n
    }
    const deadRaw = Array.isArray(root.dead) ? root.dead : []
    return {
      ok: true,
      health: {
        asOf: txt(root.as_of),
        byState,
        dead: deadRaw.map((d) => {
          const row = d as Record<string, unknown>
          return {
            idempotencyKey: txt(row.idempotency_key),
            templateId: txt(row.template_id),
            // **لا `?? 0`**: «لم يصل عدد المحاولات» ليس «صفر محاولات».
            // الفرق تشغيليّ حقيقي — صفرٌ يقول «لم نحاول»، والغياب يقول «لا نعرف».
            attempts: numOrNull(row.attempts),
            lastReason: txtOrNull(row.last_reason),
            deadAt: txtOrNull(row.dead_at),
          }
        }),
      },
    }
  } catch {
    return { ok: false, live: 'failed' }
  }
}

/** «كيف حصلوا على Premium؟» إجماليًّا. مصدرٌ بلا أحد **لا يظهر** — لا صفر مخترع. */
export async function loadGrantsBySource(
  decision: AdminRoleDecision,
): Promise<{ ok: true; bySource: Readonly<Record<string, number>> } | { ok: false; live: LiveReadState }> {
  if (!isAdmin(decision)) return { ok: false, live: 'not-founder' }
  const client = await getSupabase()
  if (!client) return { ok: false, live: 'no-backend' }
  try {
    const { data, error } = await client.rpc(GRANTS_BY_SOURCE_RPC)
    if (error) return { ok: false, live: classify(error) }
    if (!data || typeof data !== 'object') return { ok: false, live: 'failed' }
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      const n = numOrNull(v)
      if (n !== null) out[k] = n
    }
    return { ok: true, bySource: out }
  } catch {
    return { ok: false, live: 'failed' }
  }
}
