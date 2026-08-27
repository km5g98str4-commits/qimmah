/**
 * نقطة الوصل الوحيدة — ما يُركَّب على `#/admin`.
 * [OVERNIGHT-ADMIN] · AGENT-E.
 *
 * ═══ القاعدة التي يحملها هذا الملف ═══
 * **المسار لا يمنح شيئًا.** كتابة `#/admin` في شريط العنوان فعلٌ متاح لكل زائر،
 * ولا يجوز أن يكون له أي أثر غير أن يرى شاشة المنع. ولذلك:
 *   ١) الدور يُحسم **قبل** أي شيء آخر، ومن `app_metadata` وحده عبر
 *      `resolveAdminRole` — لا علم في التخزين، ولا معامل في العنوان.
 *   ٢) **لا نداء شبكة واحد** يُطلق قبل أن يُحسم الدور مؤسسًا. غير المؤسس لا
 *      يُرسل عنه طلب أصلًا.
 *   ٣) وحتى لو انخدع هذا الملف كلّه، **القاعدة ترفض**: دوال `founder_*` تفحص
 *      `app_metadata` بنفسها وترفع `founder_role_required`. الطبقتان تتعاضدان،
 *      والواجهة ليست السلطة.
 *
 * ═══ ولماذا `useEffect` لا تحميل عند الاستيراد ═══
 * تحميل اللقطة عند تقييم الوحدة كان سيُطلق النداء بمجرّد أن يجلب الموجّه الحزمة
 * — أي **قبل** أن يُرسم أي حارس. الأثر مربوط بحسم الدور، فلا يعمل إلا بعده.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { adminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import { useAuth } from '@/lib/authContext'
import { CLOSED_DECISION, canWrite, isAdmin, resolveAdminRole } from '../auth/adminRole'
import type { AdminRoleDecision } from '../auth/adminRole'
import {
  issueAccessCode,
  issueAccessCodeBatch,
  loadCodeBatches,
  loadCodeRedemptions,
  loadLiveCodePage,
  loadLiveExecutiveSnapshot,
  loadLiveUserDetail,
  loadLiveUserPage,
  setAccessCodeEnabled,
  revokeUserAccess,
} from '../contract/liveSource'
import type { LiveReadState } from '../contract/liveSource'
import type {
  AdminCodePage,
  AdminUserDetail,
  AdminUserPage,
  CodeBatchRow,
  CodeRedemptionRow,
  ExecutiveSnapshot,
  IssuedCode,
  IssuedCodeBatch,
  MetricValue,
} from '../contract/types'
import { unavailable } from '../contract/types'
import { AdminDenied } from './AdminDenied'
import { AdminShell } from './AdminShell'
import type { PanelList } from './CodesPanel'

/** شاشة انتظار — بلا رقم واحد، فلا هيكل يوهم بقيمة قادمة. */
function AdminLoading({ label }: { label: string }) {
  return (
    <main className="container-page section text-start" data-admin-loading="true" aria-busy="true">
      <div className="card flex items-center gap-3 p-5">
        <Icon name="RefreshCw" className="h-5 w-5 animate-spin text-ink-500" />
        <span className="text-sm font-bold text-ink-700">{label}</span>
      </div>
    </main>
  )
}

/** حجم الصفحة على الخادم. ٢٥ لا ٢٠٠: صفحة تُقرأ، لا شريحة تُقصّ ثم يُبحث فيها. */
const PAGE_SIZE = 25
/** تأخير البحث — كل حرف نداءً يعني نداءً لكل حرف، وقائمة نتائج تتأرجح. */
const SEARCH_DEBOUNCE_MS = 300

export function AdminRoute() {
  const lang = useLang()
  const t = adminStrings[lang]
  const auth = useAuth()

  // ⚠️ **أثناء استعادة الجلسة الجواب `CLOSED_DECISION` لا «زائر»**: القرار غير
  // المحسوم يمنع كما يمنع الرفض، ولا يُرسم على أنه نفي نهائي.
  const decision: AdminRoleDecision = auth.loading ? CLOSED_DECISION : resolveAdminRole(auth.user)
  const allowed = isAdmin(decision)

  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null)
  const [snapLive, setSnapLive] = useState<LiveReadState>('not-founder')
  const [nonce, setNonce] = useState(0)

  // ═══ حالة الجدول — **مقسومة عمدًا إلى ثلاثة** ═══
  // `typed` ما يكتبه المؤسس الآن (فوري، بلا نداء) · `search` ما استقرّ بعد
  // التأخير (هو وحده يُرسَل) · `page` رقم الصفحة على الخادم.
  const [typed, setTyped] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [userPage, setUserPage] = useState<MetricValue<AdminUserPage> | null>(null)
  const [pageLive, setPageLive] = useState<LiveReadState>('not-founder')
  const [pageBusy, setPageBusy] = useState(false)

  // ═══ التعمّق — **نداء مستقل عند الطلب وحده** ═══
  // تحميل التفصيل مع الجدول كان سيجلب عن كل صفّ ما لا تعرضه الشاشة. وما لا
  // يُنقل لا يُسرَّب: الصفحة تُطلب حين يفتحها المؤسس، لا قبل ذلك.
  // ═══ الأكواد ═══
  const [codeSearch, setCodeSearch] = useState('')
  const [codePage, setCodePage] = useState<MetricValue<AdminCodePage>>(() => unavailable<AdminCodePage>('NEEDS_BACKEND'))
  const [codeLive, setCodeLive] = useState<LiveReadState>('not-founder')
  const [issued, setIssued] = useState<IssuedCode | null>(null)
  const [writeError, setWriteError] = useState<LiveReadState | null>(null)
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeNonce, setCodeNonce] = useState(0)
  const codeRunRef = useRef(0)
  // ═══ [ADMIN-CONV] الحملات · الدفعة · سجلّ المستبدلين ═══
  const [batches, setBatches] = useState<PanelList<CodeBatchRow>>({ kind: 'loading' })
  const batchesRunRef = useRef(0)
  const [issuedBatch, setIssuedBatch] = useState<IssuedCodeBatch | null>(null)
  // سجلّ مستبدلي كود واحد مفتوح — الفتح فعل طلب، فالنداء يقع عنده لا مع الجدول.
  const [redemptions, setRedemptions] = useState<{ codeId: string; list: PanelList<CodeRedemptionRow> } | null>(null)
  const redemptionsRunRef = useRef(0)
  const openRedemptionsRef = useRef<string | null>(null)

  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [detailLive, setDetailLive] = useState<LiveReadState>('not-founder')
  const detailRunRef = useRef(0)

  // يمنع أن تكتب استجابة قديمة فوق أحدث لقطة بعد «حدّث» متكرّر.
  const runRef = useRef(0)
  const pageRunRef = useRef(0)

  // ── اللقطة التنفيذية: لا تُعاد بتغيّر الصفحة ──
  useEffect(() => {
    if (!allowed) {
      setSnapshot(null)
      setSnapLive('not-founder')
      return
    }
    const run = ++runRef.current
    let alive = true
    void (async () => {
      const snap = await loadLiveExecutiveSnapshot(decision)
      if (!alive || run !== runRef.current) return
      setSnapshot(snap.snapshot)
      setSnapLive(snap.live)
    })()
    return () => {
      alive = false
    }
    // `decision` كائن جديد كل رسم؛ المفتاح الحقيقي هو الصلاحية ومعرّف الحساب.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, auth.user?.id, nonce])

  // ── تأخير البحث: الحرف لا يُرسَل، والاستقرار يُرسَل ──
  useEffect(() => {
    if (!allowed) return
    const id = setTimeout(() => {
      setSearch(typed)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [typed, allowed])

  // ── صفحة الجدول: **الخادم يبحث ويصفّح** ──
  useEffect(() => {
    if (!allowed) {
      setUserPage(null)
      setPageLive('not-founder')
      return
    }
    const run = ++pageRunRef.current
    let alive = true
    setPageBusy(true)
    void (async () => {
      const res = await loadLiveUserPage(decision, { search, page, pageSize: PAGE_SIZE })
      if (!alive || run !== pageRunRef.current) return
      setUserPage(res.page)
      setPageLive(res.live)
      setPageBusy(false)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, auth.user?.id, nonce, search, page])

  // ── صفحة الحساب الواحد ──
  useEffect(() => {
    if (!allowed || !openUserId) {
      setDetail(null)
      setDetailLive(allowed ? 'not-founder' : 'not-founder')
      return
    }
    const run = ++detailRunRef.current
    let alive = true
    void (async () => {
      const res = await loadLiveUserDetail(decision, openUserId)
      if (!alive || run !== detailRunRef.current) return
      setDetail(res.detail)
      setDetailLive(res.live)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, auth.user?.id, openUserId, nonce])

  // ── قائمة الأكواد ──
  useEffect(() => {
    if (!allowed) {
      setCodePage(unavailable<AdminCodePage>('NEEDS_BACKEND'))
      setCodeLive('not-founder')
      return
    }
    const run = ++codeRunRef.current
    let alive = true
    void (async () => {
      const res = await loadLiveCodePage(decision, { search: codeSearch, page: 1, pageSize: 100 })
      if (!alive || run !== codeRunRef.current) return
      setCodePage(res.page)
      setCodeLive(res.live)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, auth.user?.id, codeSearch, codeNonce, nonce])

  // ── [ADMIN-CONV] الحملات مجمّعة بالوسم — تُعاد مع كل فعل أكواد ──
  useEffect(() => {
    if (!allowed) {
      setBatches({ kind: 'loading' })
      return
    }
    const run = ++batchesRunRef.current
    let alive = true
    void (async () => {
      const res = await loadCodeBatches(decision)
      if (!alive || run !== batchesRunRef.current) return
      // الفشل يبقى باسمه — «الهجرة ما انطبقت» تصل الشاشة `rpc-missing` لا فراغًا.
      setBatches(res.ok ? { kind: 'rows', rows: res.rows } : { kind: 'gap', why: res.live })
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, auth.user?.id, codeNonce, nonce])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  const onSearch = useCallback((v: string) => setTyped(v), [])
  const onPage = useCallback((p: number) => setPage(Math.max(1, Math.trunc(p))), [])
  const onOpenUser = useCallback((id: string) => setOpenUserId(id), [])
  const onCloseUser = useCallback(() => setOpenUserId(null), [])

  /**
   * [COMMISSIONING §4] سحب الوصول — القدرة كانت مكتوبة ومُثبَتة **وبلا مستدعٍ**.
   *
   * تُمرَّر `undefined` لغير المؤسس، فلا يرسم `UserDetailPanel` الزرّ أصلًا:
   * الدعم يقرأ ولا يغيّر، والخادم يرفض فعله أيضًا — فالشاشة توافق الخادم بدل
   * أن تَعِد بما سيُرفض.
   */
  const onRevoke = useCallback(
    async (reason: string) => {
      if (!openUserId) return
      const out = await revokeUserAccess(decision, openUserId, reason)
      if (!out.ok) { setWriteError(out.live); return }
      // نجاح السحب يغيّر حالة الاستحقاق، فتُعاد قراءة الصفحة والتفصيل معًا —
      // وإلا بقيت الشاشة تعرض «مفعّل» بعد سحبٍ تمّ فعلًا.
      await refresh()
    },
    [decision, openUserId, refresh],
  )

  /**
   * الإصدار. **الكود يُعرض ولا يُخزَّن في أي مكان آخر** — لا تخزين محلّي ولا
   * سجلّ ولا عنوان. ظهوره في الحالة وحدها، وحتى يصرفه المؤسس بنفسه.
   */
  const onIssue = useCallback(
    (input: { reason: string; label?: string; durationDays: number; maxRedemptions: number; code?: string }) => {
      setCodeBusy(true)
      setWriteError(null)
      void (async () => {
        const res = await issueAccessCode(decision, input)
        setCodeBusy(false)
        if (!res.ok) {
          setWriteError(res.live)
          return
        }
        setIssued(res.value)
        setCodeNonce((n) => n + 1)
      })()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.user?.id],
  )

  const onToggleCode = useCallback(
    (codeId: string, enabled: boolean, reason: string) => {
      setCodeBusy(true)
      setWriteError(null)
      void (async () => {
        const res = await setAccessCodeEnabled(decision, codeId, enabled, reason)
        setCodeBusy(false)
        if (!res.ok) {
          setWriteError(res.live)
          return
        }
        setCodeNonce((n) => n + 1)
      })()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.user?.id],
  )

  const onDismissIssued = useCallback(() => setIssued(null), [])
  const onCodeSearch = useCallback((v: string) => setCodeSearch(v), [])

  /**
   * [ADMIN-CONV] الإصدار الدفعيّ. **الأكواد الخام تعيش في الحالة وحدها** —
   * لا تخزين محلّي ولا سجلّ: تظهر مرّة، ويصرفها المؤسس بنفسه.
   */
  const onIssueBatch = useCallback(
    (input: {
      reason: string
      label?: string
      durationDays: number
      maxRedemptions: number
      expiresAt: string | null
      count: number
    }) => {
      setCodeBusy(true)
      setWriteError(null)
      void (async () => {
        const res = await issueAccessCodeBatch(decision, input)
        setCodeBusy(false)
        if (!res.ok) {
          setWriteError(res.live)
          return
        }
        setIssuedBatch(res.value)
        setCodeNonce((n) => n + 1)
      })()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.user?.id],
  )
  const onDismissIssuedBatch = useCallback(() => setIssuedBatch(null), [])

  /** [ADMIN-CONV] «من استخدمه؟» — فتح السجلّ هو لحظة النداء، وإغلاقه لا ينادي. */
  const onToggleRedemptions = useCallback(
    (codeId: string) => {
      const run = ++redemptionsRunRef.current
      if (openRedemptionsRef.current === codeId) {
        openRedemptionsRef.current = null
        setRedemptions(null)
        return
      }
      openRedemptionsRef.current = codeId
      setRedemptions({ codeId, list: { kind: 'loading' } })
      void (async () => {
        const res = await loadCodeRedemptions(decision, codeId)
        // استجابة قديمة لا تكتب فوق أحدث فتح — نفس نمط بقيّة النداءات هنا.
        if (run !== redemptionsRunRef.current || openRedemptionsRef.current !== codeId) return
        setRedemptions({ codeId, list: res.ok ? { kind: 'rows', rows: res.rows } : { kind: 'gap', why: res.live } })
      })()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.user?.id],
  )

  if (!allowed) return <AdminDenied decision={decision} />
  if (!snapshot) return <AdminLoading label={t.states.loading} />

  // الحالة المعروضة هي **الأضعف** بين النداءين: نجاحٌ جزئي لا يُعلَن «حيّ».
  const live: LiveReadState = snapLive === 'live' && pageLive === 'live' ? 'live' : snapLive
  const merged: ExecutiveSnapshot = userPage ? { ...snapshot, users_page: userPage } : snapshot
  // العدد الكلّي من الخادم. **`null` لا صفر**: بلا صفحة جاهزة لا عدد يُدّعى،
  // والصفر هنا كان سيُقرأ «لا حسابات» وهو أشدّ الأكاذيب في لوحة تنفيذية.
  const total = merged.users_page.state === 'ready' ? merged.users_page.value.total : null

  return (
    <AdminShell
      decision={decision}
      snapshot={merged}
      live={live}
      onRefresh={refresh}
      userPaging={{ search: typed, page, pageSize: PAGE_SIZE, total, onSearch, onPage, busy: pageBusy }}
      detail={detail}
      detailOpen={Boolean(openUserId)}
      detailLive={openUserId ? detailLive : undefined}
      onOpenUser={onOpenUser}
      onCloseUser={onCloseUser}
      onRevokeUser={canWrite(decision) ? onRevoke : undefined}
      codes={{
        page: codePage,
        live: codeLive,
        search: codeSearch,
        onSearch: onCodeSearch,
        onIssue,
        onToggle: onToggleCode,
        issued,
        onDismissIssued,
        writeError,
        busy: codeBusy,
        onIssueBatch,
        issuedBatch,
        onDismissIssuedBatch,
        batches,
        redemptions,
        onToggleRedemptions,
      }}
    />
  )
}
