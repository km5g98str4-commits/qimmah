/**
 * منطق جدول المستخدمين — تصفية وبحث وترتيب وتصفّح. **دوال نقيّة بلا React**.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ لماذا خارج المكوّن ═══
 * لتُختبر بلا DOM ولا متصفّح — فيدخل الجدول البوابة المحلّية بدل أن ينتظر سير
 * CI بمتصفّح (الميثاق §4.0).
 *
 * ═══ الفكرة الحاكمة: مصفاة بلا مصدر تُعطَّل ولا تُطبَّق ═══
 * «الأكثر نشاطًا» تحتاج نشاط منتج، ونشاط المنتج متحيّز بمقام الموافقة. ولو
 * طُبِّقت على ما نملك لأعادت **قائمة فارغة تبدو جوابًا**: المؤسس يقرأ «لا أحد
 * نشط» وهي في الحقيقة «لا نستطيع أن نعرف». فلكل مصفاة `availability`، وما ليس
 * `AVAILABLE_NOW` **يُعطَّل في الواجهة بسببه المعلَن** ولا يُنفَّذ منطقه.
 * ويحرس هذا `test:admin-dashboard` بتأكيد مضادّ: لو صار المُطبِّق ينفّذ مصفاة
 * معطّلة سقط الإثبات باسمه.
 */

import type { AdminUserRow, MetricAvailability } from '../contract/types'

export type UserFilterId =
  | 'all'
  | 'premium'
  | 'trial'
  | 'preview'
  | 'pendingActivation'
  | 'newToday'
  | 'inactive7d'
  | 'inactive30d'
  | 'onboardingIncomplete'
  | 'highlyActive'

export interface UserFilterDef {
  readonly id: UserFilterId
  readonly labelKey: string
  readonly availability: MetricAvailability
  /** مفتاح سبب التعطيل — يُعرض حين لا تكون المصفاة قابلة للتطبيق. */
  readonly disabledReasonKey?: string
}

/**
 * جدول المصافي. `availability` هنا يصف **مصدر المصفاة**، لا شكل الصفّ:
 * حقول `entitlement` و`onboarding` موجودة في النوع، لكن قِيَمها لا تصل إلا
 * بخادم — فالمصفاة تبقى معطّلة حتى يصل.
 */
export const USER_FILTERS: readonly UserFilterDef[] = [
  { id: 'all', labelKey: 'filter.all', availability: 'AVAILABLE_NOW' },
  {
    id: 'premium',
    labelKey: 'filter.premium',
    availability: 'NEEDS_BACKEND',
    disabledReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'trial',
    labelKey: 'filter.trial',
    availability: 'NEEDS_BACKEND',
    disabledReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'preview',
    labelKey: 'filter.preview',
    availability: 'NEEDS_BACKEND',
    disabledReasonKey: 'reason.noEntitlementSystem',
  },
  {
    id: 'pendingActivation',
    labelKey: 'filter.pendingActivation',
    availability: 'NEEDS_BACKEND',
    disabledReasonKey: 'reason.noEntitlementSystem',
  },
  { id: 'newToday', labelKey: 'filter.newToday', availability: 'NEEDS_BACKEND', disabledReasonKey: 'reason.noAdminRead' },
  {
    id: 'inactive7d',
    labelKey: 'filter.inactive7d',
    availability: 'NEEDS_BACKEND',
    disabledReasonKey: 'reason.authSchemaClosed',
  },
  {
    id: 'inactive30d',
    labelKey: 'filter.inactive30d',
    availability: 'NEEDS_BACKEND',
    disabledReasonKey: 'reason.authSchemaClosed',
  },
  {
    id: 'onboardingIncomplete',
    labelKey: 'filter.onboardingIncomplete',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    disabledReasonKey: 'reason.onboardingBias',
  },
  {
    id: 'highlyActive',
    labelKey: 'filter.highlyActive',
    availability: 'IMPOSSIBLE_WITHOUT_CONSENT_CHANGE',
    disabledReasonKey: 'reason.consentBias',
  },
] as const

export function filterDef(id: UserFilterId): UserFilterDef {
  return USER_FILTERS.find((f) => f.id === id) ?? USER_FILTERS[0]
}

/** هل هذه المصفاة قابلة للتطبيق على بيانات حقيقية اليوم؟ */
export function isFilterApplicable(id: UserFilterId): boolean {
  return filterDef(id).availability === 'AVAILABLE_NOW'
}

export type SortKey = 'createdAt' | 'lastSignInAt' | 'displayName' | 'entitlement'
export type SortDir = 'asc' | 'desc'

export interface TableQuery {
  readonly filter: UserFilterId
  readonly search: string
  readonly sortKey: SortKey
  readonly sortDir: SortDir
  readonly page: number
  readonly pageSize: number
}

export const DEFAULT_QUERY: TableQuery = {
  filter: 'all',
  search: '',
  sortKey: 'createdAt',
  sortDir: 'desc',
  page: 1,
  pageSize: 25,
}

const DAY_MS = 86_400_000

function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : (now - t) / DAY_MS
}

/**
 * يطبّق مصفاة **قابلة للتطبيق فقط**.
 *
 * ⚠️ الحارس أول سطر عمدًا: مصفاة غير قابلة للتطبيق تعيد المجموعة **كما هي**
 * ولا تُصفّي. فالواجهة تعرضها معطّلة، ولو نُودي المنطق برمجيًا لم يُنتج
 * «قائمة فارغة تبدو جوابًا». المنع بنيوي لا انضباط من المستدعي.
 */
export function applyFilter(rows: readonly AdminUserRow[], id: UserFilterId, now: number): readonly AdminUserRow[] {
  if (!isFilterApplicable(id)) return rows
  // القابلة للتطبيق تمرّ على المسند نفسه — **منطق مصفاة واحد لا اثنان**.
  // نسخ المنطق هنا كان سيجعل الفرعين ينحرفان يوم تُفتح مصفاة جديدة.
  return rows.filter(filterPredicate(id, now))
}

/**
 * منطق المصافي **حين تصير مصادرها متاحة**.
 *
 * مفصول عن `applyFilter` عمدًا: يُختبر اليوم على التجهيزات فيُثبت صحّته، ولا
 * يُشغَّل على بيانات حيّة قبل أن يصدق مصدره. **كتابته الآن ليست تشغيله الآن.**
 */
export function filterPredicate(id: UserFilterId, now: number): (row: AdminUserRow) => boolean {
  switch (id) {
    case 'all':
      return () => true
    case 'premium':
      return (r) => r.entitlement === 'premium'
    case 'trial':
      return (r) => r.entitlement === 'trial'
    case 'preview':
      return (r) => r.entitlement === 'preview'
    case 'pendingActivation':
      return (r) => r.entitlement === 'code'
    case 'newToday':
      return (r) => {
        const d = daysSince(r.createdAt, now)
        return d !== null && d < 1
      }
    case 'inactive7d':
      return (r) => {
        const d = daysSince(r.lastSignInAt, now)
        // بلا دخول مسجّل = خامل. الغياب هنا **معلومة** لا ثغرة.
        return d === null || d >= 7
      }
    case 'inactive30d':
      return (r) => {
        const d = daysSince(r.lastSignInAt, now)
        return d === null || d >= 30
      }
    case 'onboardingIncomplete':
      // `unknown` **لا تُحسب** غير مكتملة: الجهل ليس نفيًا (§5.5 من العقد).
      return (r) => r.onboarding === 'incomplete'
    case 'highlyActive':
      // لا حقل نشاط في صفّ الجدول أصلًا — ولا يُضاف: النشاط صنف `product`
      // ولا يُنقل مع الجدول. يبقى المسند صادقًا بأنه غير قابل للتقرير.
      return () => false
  }
}

/**
 * بحث نصّي — على **الاسم والمعرّف والبريد المُقنَّع** حصرًا.
 * البريد الكامل ليس في النوع، فلا يوجد ما يُبحث فيه ويُسرَّب.
 */
export function applySearch(rows: readonly AdminUserRow[], search: string): readonly AdminUserRow[] {
  const q = search.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) => {
    const name = (r.displayName ?? '').toLowerCase()
    const id = r.userId.toLowerCase()
    const mail = (r.emailMasked ?? '').toLowerCase()
    return name.includes(q) || id.includes(q) || mail.includes(q)
  })
}

const ENTITLEMENT_ORDER: Record<AdminUserRow['entitlement'], number> = {
  premium: 0,
  trial: 1,
  code: 2,
  preview: 3,
  unknown: 4,
}

/**
 * ترتيب **ثابت**: عند تساوي المفتاح يفصل `userId`.
 * بدون الفاصل يقفز صفّان متساويان بين الصفحات فيظهر أحدهما مرّتين ويغيب الآخر
 * — عيب تصفّح كلاسيكي لا يظهر إلا على بيانات حقيقية.
 */
export function applySort(rows: readonly AdminUserRow[], key: SortKey, dir: SortDir): readonly AdminUserRow[] {
  const mul = dir === 'asc' ? 1 : -1
  const copy = [...rows]
  copy.sort((a, b) => {
    let cmp = 0
    if (key === 'displayName') {
      cmp = (a.displayName ?? '').localeCompare(b.displayName ?? '', 'ar')
    } else if (key === 'entitlement') {
      cmp = ENTITLEMENT_ORDER[a.entitlement] - ENTITLEMENT_ORDER[b.entitlement]
    } else {
      const av = key === 'createdAt' ? a.createdAt : a.lastSignInAt
      const bv = key === 'createdAt' ? b.createdAt : b.lastSignInAt
      // الغياب في آخر القائمة **في الاتجاهين** — لا يتصدّر الفارغ ترتيبًا أبدًا.
      if (av === null && bv === null) cmp = 0
      else if (av === null) return 1
      else if (bv === null) return -1
      else cmp = Date.parse(av) - Date.parse(bv)
    }
    if (cmp !== 0) return cmp * mul
    return a.userId.localeCompare(b.userId)
  })
  return copy
}

export interface PageResult {
  readonly rows: readonly AdminUserRow[]
  readonly total: number
  readonly page: number
  readonly pageCount: number
  readonly pageSize: number
}

/** تصفّح آمن الحدود: الصفحة تُقصّ إلى المدى الصحيح ولا تُرجع نافذة خارجه. */
export function paginate(rows: readonly AdminUserRow[], page: number, pageSize: number): PageResult {
  const size = Math.max(1, Math.floor(pageSize))
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(Math.max(1, Math.floor(page)), pageCount)
  const start = (safePage - 1) * size
  return { rows: rows.slice(start, start + size), total, page: safePage, pageCount, pageSize: size }
}

/** خطّ المعالجة الكامل: تصفية ← بحث ← ترتيب ← تصفّح. */
export function runQuery(rows: readonly AdminUserRow[], q: TableQuery, now: number): PageResult {
  const filtered = applyFilter(rows, q.filter, now)
  const searched = applySearch(filtered, q.search)
  const sorted = applySort(searched, q.sortKey, q.sortDir)
  return paginate(sorted, q.page, q.pageSize)
}

/**
 * نافذة الافتراضية: أول وآخر فهرس يُرسَم + حشوتان بالبكسل.
 *
 * `overscan` يرسم صفوفًا خارج الإطار فيمنع الوميض الأبيض عند التمرير السريع.
 * والحسابات كلها هنا لتُختبر بلا DOM: تنفيذ الافتراضية في المكوّن وحده يعني
 * أن صحّتها لا تُثبت إلا بمتصفّح.
 */
export interface VirtualWindow {
  readonly startIndex: number
  readonly endIndex: number
  readonly padStart: number
  readonly padEnd: number
}

export function virtualWindow(
  total: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  overscan = 6,
): VirtualWindow {
  const h = Math.max(1, rowHeight)
  const first = Math.max(0, Math.floor(scrollTop / h) - overscan)
  const visible = Math.ceil(Math.max(0, viewportHeight) / h) + overscan * 2
  const last = Math.min(total, first + visible)
  return {
    startIndex: first,
    endIndex: last,
    padStart: first * h,
    padEnd: Math.max(0, (total - last) * h),
  }
}
