/**
 * جدول المستخدمين — تصفية وبحث وترتيب وتصفّح وافتراضية.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * كل المنطق في `../model/filters.ts` (دوال نقيّة مُختبَرة بلا DOM)، وهذا الملف
 * **عرضٌ وتفاعل فقط**. الفصل مقصود: صحّة الترتيب والتصفّح والنافذة الافتراضية
 * تُثبت في البوابة المحلّية بدل أن تنتظر متصفّحًا في CI (الميثاق §4.0).
 *
 * ═══ ثلاثة قيود بنيوية ═══
 * ١) **البريد مُقنَّع في النوع نفسه** (`emailMasked`) — لا يوجد في هذه الشجرة
 *    موضع يحمل بريدًا كاملًا، فلا مسار لكشفه سهوًا.
 * ٢) **المصفاة بلا مصدر تُعطَّل وتشرح**، ولا تُطبَّق فتعيد قائمة فارغة تبدو جوابًا.
 * ٣) **لا صفّ بصنف `product`** — النشاط يُطلب عند التعمّق وحده.
 */

import { useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { adminStrings } from '@/i18n/dict/admin'
import { useLanguage } from '@/i18n'
import type { AdminUserRow, MetricValue } from '../contract/types'
import { findMetric } from '../contract/metrics'
import {
  DEFAULT_QUERY,
  USER_FILTERS,
  isFilterApplicable,
  runQuery,
  virtualWindow,
  type SortKey,
  type TableQuery,
  type UserFilterId,
} from '../model/filters'

/** ارتفاع الصفّ بالبكسل — ثابت مشترك بين الحساب والرسم، فلا ينحرف أحدهما. */
const ROW_HEIGHT = 56
/** ارتفاع منطقة التمرير — يحدّد كم صفًّا يُرسم فعلًا. */
const VIEWPORT_HEIGHT = 560
/** فوق هذا العدد تُشغَّل الافتراضية. تحته الرسم الكامل أرخص وأبسط. */
const VIRTUALIZE_ABOVE = 60

/**
 * عقد «الخادم يبحث ويصفّح».
 *
 * ═══ لماذا وضعان لا وضع واحد ═══
 * الجدول كان يبحث ويصفّح **في المتصفّح** على ما وصله. وذلك صحيح على قائمة
 * كاملة، **وكذبٌ على شريحة**: البحث في أول ٢٠٠ صفًّا يعيد «ما فيه نتائج» عن
 * حساب موجود فعلًا، والعدد المعروض يصير عدد ما جُلب لا عدد الحسابات.
 * فحين يُمرَّر هذا العقد يتنحّى المتصفّح عن الثلاثة كلها (بحث · ترتيب · تصفّح)
 * ويتولّاها الخادم، ويبقى المنطق المحلّي كما هو لمن يمرّر قائمة كاملة
 * (التجهيزات والإثباتات).
 */
export interface ServerPaging {
  readonly search: string
  readonly page: number
  readonly pageSize: number
  /**
   * عدد الحسابات **كلها** بعد البحث — من الخادم لا من طول المصفوفة.
   * `null` = لم يعدّ الخادم بعد. **ليس صفرًا**: صفرٌ هنا يُقرأ «لا حسابات».
   */
  readonly total: number | null
  readonly onSearch: (search: string) => void
  readonly onPage: (page: number) => void
  /** صفحة قيد الجلب — يُعلَن ولا يُخفى خلف صفوف قديمة بلا إشارة. */
  readonly busy?: boolean
}

interface UserTableProps {
  data: MetricValue<readonly AdminUserRow[]>
  onOpen?: (userId: string) => void
  /** معرّف المقياس الذي يشرح سبب غياب الجدول. */
  metricId?: string
  /** حين يُمرَّر: البحث والتصفّح على الخادم، والترتيب معطّل بسبب مسمّى. */
  server?: ServerPaging
}

export function UserTable({ data, onOpen, metricId = 'users.total', server }: UserTableProps) {
  const { lang, dir } = useLanguage()
  const t = adminStrings[lang]
  // اتجاه سهم «افتح» يتبع اتجاه القراءة — بلا صنف اتجاهي ثابت.
  const forwardIcon = dir === 'rtl' ? 'ChevronLeft' : 'ChevronRight'
  const [query, setQuery] = useState<TableQuery>(DEFAULT_QUERY)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const def = findMetric(metricId)

  // `now` من الحالة لا من كل رسم: `Date.now()` مباشرة كان يجعل النتيجة تتغيّر
  // بين رسمتين للمدخلات نفسها، فلا تُختبر ولا تُقارن.
  const [now] = useState(() => Date.now())
  // الاشتقاق داخل الـmemo: مصفوفة `[]` جديدة في كل رسم كانت تُبطل الذاكرة
  // دائمًا، فيُعاد فرز خمسة آلاف صفّ على كل ضغطة مفتاح في حقل البحث.
  const clientResult = useMemo(() => runQuery(data.state === 'ready' ? data.value : [], query, now), [data, query, now])

  // في وضع الخادم لا يُعاد تشغيل خطّ المعالجة على الصفحة: الخادم بحث ورتّب
  // وقصّ، وإعادة القصّ هنا تعني **تصفّحًا داخل تصفّح** — صفحة من صفحة.
  const result = server
    ? {
        rows: data.state === 'ready' ? data.value : [],
        total: server.total,
        page: server.page,
        pageSize: server.pageSize,
        // بلا عدّ من الخادم لا عدد صفحات يُدّعى: تبقى الصفحة الحالية سقفًا،
        // فزرّ «التالي» يُعطَّل بدل أن يَعِد بصفحة لا نعرف وجودها.
        pageCount:
          server.total === null ? server.page : Math.max(1, Math.ceil(server.total / Math.max(1, server.pageSize))),
      }
    : clientResult

  const patch = (p: Partial<TableQuery>) => setQuery((q) => ({ ...q, ...p, page: p.page ?? 1 }))
  const goToPage = (p: number) => (server ? server.onPage(p) : setQuery((q) => ({ ...q, page: p })))

  if (data.state !== 'ready') {
    return (
      <section className="card p-4 text-start sm:p-5" aria-labelledby="admin-users-heading">
        <h2 id="admin-users-heading" className="text-base font-extrabold text-ink-900">
          {t.table.heading}
        </h2>
        <div className="mt-4">
          {data.state === 'loading' ? (
            <div className="flex flex-col gap-2" aria-label={t.states.loading}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : data.state === 'error' ? (
            <p className="text-sm font-bold text-danger">{t.states.error}</p>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-line p-4">
              <Icon name="CircleSlash" className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
              <div>
                <p className="text-sm font-bold text-ink-500">{t.states.unavailable}</p>
                {def ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{t.reasons[def.unavailableReasonKey] ?? ''}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }

  const virtual = result.rows.length > VIRTUALIZE_ABOVE
  const win = virtualWindow(result.rows.length, scrollTop, VIEWPORT_HEIGHT, ROW_HEIGHT)
  const visible = virtual ? result.rows.slice(win.startIndex, win.endIndex) : result.rows

  return (
    <section className="card p-4 text-start sm:p-5" aria-labelledby="admin-users-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-users-heading" className="text-base font-extrabold text-ink-900">
          {t.table.heading}
        </h2>
        <span className="text-xs tabular-nums text-ink-500">
          {result.total === null ? '—' : result.total} {t.table.rows}
        </span>
      </div>

      {/* ——— البحث والترتيب ——— */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="admin-user-search" className="mb-1 block text-xs font-bold text-ink-500">
            {t.table.searchLabel}
          </label>
          <input
            id="admin-user-search"
            type="search"
            className="input"
            placeholder={t.table.searchPlaceholder}
            value={server ? server.search : query.search}
            onChange={(e) => (server ? server.onSearch(e.target.value) : patch({ search: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="admin-user-sort" className="mb-1 block text-xs font-bold text-ink-500">
            {t.table.sortBy}
          </label>
          {/*
            في وضع الخادم الترتيب **معطّل بسبب مسمّى** لا مُطبَّق محليًا: دالة
            الصفحة ترتّب بالأحدث ولا تقبل مفتاحًا، وترتيب الصفحة وحدها يُقرأ
            ترتيبًا للكل — وهو بالضبط ما يمنعه عقد الصدق.
          */}
          <select
            id="admin-user-sort"
            className="input"
            disabled={Boolean(server)}
            title={server ? t.table.sortServerNote : undefined}
            value={query.sortKey}
            onChange={(e) => patch({ sortKey: e.target.value as SortKey })}
          >
            <option value="createdAt">{t.table.colCreated}</option>
            <option value="lastSignInAt">{t.table.colLastSignIn}</option>
            <option value="displayName">{t.table.colUser}</option>
            <option value="entitlement">{t.table.colEntitlement}</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-ghost tap-target"
          disabled={Boolean(server)}
          title={server ? t.table.sortServerNote : undefined}
          onClick={() => patch({ sortDir: query.sortDir === 'asc' ? 'desc' : 'asc' })}
          aria-label={query.sortDir === 'asc' ? t.table.sortAsc : t.table.sortDesc}
        >
          <Icon name={query.sortDir === 'asc' ? 'ChevronUp' : 'ChevronDown'} className="h-4 w-4" />
          <span className="text-xs">{query.sortDir === 'asc' ? t.table.sortAsc : t.table.sortDesc}</span>
        </button>
      </div>

      {server ? (
        <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-ink-500" data-server-paging="true">
          <Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t.table.serverNote} {server.busy ? t.table.searching : ''}
          </span>
        </p>
      ) : null}

      {/* ——— المصافي ——— */}
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t.table.heading}>
        {USER_FILTERS.map((f) => {
          const enabled = isFilterApplicable(f.id)
          const active = query.filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              disabled={!enabled}
              // العنوان يشرح **سبب** التعطيل — الزرّ الرمادي الصامت يترك المؤسس
              // يظنّ الأمر عطلًا، وهو في الحقيقة غياب مصدر معلَن.
              title={enabled ? undefined : `${t.table.filterDisabled} — ${t.reasons[f.disabledReasonKey ?? ''] ?? ''}`}
              onClick={() => patch({ filter: f.id as UserFilterId })}
              className={cn(
                'inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors',
                active ? 'border-primary-soft bg-primary-soft text-primary-c' : 'border-line bg-surface text-ink-700',
                !enabled && 'cursor-not-allowed opacity-45',
              )}
            >
              {!enabled ? <Icon name="Lock" className="h-3 w-3" /> : null}
              {t.filters[f.labelKey] ?? f.id}
            </button>
          )
        })}
      </div>

      {/* ——— الجدول ——— */}
      <div
        ref={scrollRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="mt-4 overflow-auto rounded-xl border border-line"
        style={virtual ? { maxHeight: VIEWPORT_HEIGHT } : undefined}
      >
        <table className="w-full min-w-[720px] border-collapse text-start text-sm">
          <thead className="sticky top-0 z-10 bg-beige">
            <tr className="text-start text-xs font-bold text-ink-500">
              <th scope="col" className="px-3 py-2 text-start">
                {t.table.colUser}
              </th>
              <th scope="col" className="px-3 py-2 text-start">
                {t.table.colEmail}
              </th>
              <th scope="col" className="px-3 py-2 text-start">
                {t.table.colCreated}
              </th>
              <th scope="col" className="px-3 py-2 text-start">
                {t.table.colLastSignIn}
              </th>
              <th scope="col" className="px-3 py-2 text-start">
                {t.table.colEntitlement}
              </th>
              <th scope="col" className="px-3 py-2 text-start">
                {t.table.colOnboarding}
              </th>
              <th scope="col" className="px-3 py-2 text-end">
                <span className="sr-only">{t.table.open}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* حشوة علوية تحفظ ارتفاع التمرير الحقيقي في الوضع الافتراضي. */}
            {virtual && win.padStart > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={7} style={{ height: win.padStart, padding: 0 }} />
              </tr>
            ) : null}

            {visible.map((r) => (
              <tr key={r.userId} className="border-t border-line" style={{ height: ROW_HEIGHT }} data-user-row={r.userId}>
                <td className="px-3 py-2">
                  <span className="font-bold text-ink-900">{r.displayName ?? t.table.noName}</span>
                  <span className="block text-[11px] text-ink-400">{r.userId.slice(0, 14)}…</span>
                </td>
                <td className="px-3 py-2 text-ink-500">{r.emailMasked ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums text-ink-500">{r.createdAt.slice(0, 10)}</td>
                <td className="px-3 py-2 tabular-nums text-ink-500">
                  {r.lastSignInAt ? r.lastSignInAt.slice(0, 10) : t.table.noSignIn}
                </td>
                <td className="px-3 py-2 text-ink-700">{t.entitlementView[r.entitlement]}</td>
                <td className="px-3 py-2 text-ink-700">{t.onboardingView[r.onboarding]}</td>
                <td className="px-3 py-2 text-end">
                  <button
                    type="button"
                    className="tap-target inline-flex items-center gap-1 rounded-lg px-2 text-xs font-bold text-primary-c"
                    onClick={() => onOpen?.(r.userId)}
                  >
                    {t.table.open}
                    <Icon name={forwardIcon} className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}

            {virtual && win.padEnd > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={7} style={{ height: win.padEnd, padding: 0 }} />
              </tr>
            ) : null}

            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-ink-500">
                  {t.table.noRows}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* ——— التصفّح ——— */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn-ghost tap-target"
          disabled={result.page <= 1}
          onClick={() => goToPage(result.page - 1)}
        >
          {t.table.prev}
        </button>
        <span className="text-xs tabular-nums text-ink-500">
          {t.table.page} {result.page} {t.table.of} {result.pageCount}
        </span>
        <button
          type="button"
          className="btn-ghost tap-target"
          disabled={result.page >= result.pageCount}
          onClick={() => goToPage(result.page + 1)}
        >
          {t.table.next}
        </button>
      </div>
    </section>
  )
}
