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
import { DASHBOARD_RPC, USER_PAGE_RPC } from './metrics'
import { isAdmin } from '../auth/adminRole'
import type { AdminRoleDecision } from '../auth/adminRole'
import type {
  AdminUserPage,
  AdminUserRow,
  EntitlementView,
  ExecutiveSnapshot,
  MetricValue,
  OnboardingView,
  SeriesPoint,
} from './types'
import { ready } from './types'

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
    },
    // الأخطاء والتخصيص: بلا مسار وبلا مقام غير متحيّز — تبقى كما بناها الغياب.
    errors: base.errors,
    onboarding: base.onboarding,
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
