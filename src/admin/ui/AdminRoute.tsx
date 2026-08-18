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
import { CLOSED_DECISION, isAdmin, resolveAdminRole } from '../auth/adminRole'
import type { AdminRoleDecision } from '../auth/adminRole'
import { buildUserDetailFromRow } from '../contract/source'
import { loadLiveExecutiveSnapshot, loadLiveUserPage } from '../contract/liveSource'
import type { LiveReadState } from '../contract/liveSource'
import type { AdminUserDetail, ExecutiveSnapshot } from '../contract/types'
import { AdminDenied } from './AdminDenied'
import { AdminShell } from './AdminShell'

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

export function AdminRoute() {
  const lang = useLang()
  const t = adminStrings[lang]
  const auth = useAuth()

  // ⚠️ **أثناء استعادة الجلسة الجواب `CLOSED_DECISION` لا «زائر»**: القرار غير
  // المحسوم يمنع كما يمنع الرفض، ولا يُرسم على أنه نفي نهائي.
  const decision: AdminRoleDecision = auth.loading ? CLOSED_DECISION : resolveAdminRole(auth.user)
  const allowed = isAdmin(decision)

  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null)
  const [live, setLive] = useState<LiveReadState>('not-founder')
  const [nonce, setNonce] = useState(0)
  // يمنع أن تكتب استجابة قديمة فوق أحدث لقطة بعد «حدّث» متكرّر.
  const runRef = useRef(0)

  useEffect(() => {
    if (!allowed) {
      setSnapshot(null)
      setLive('not-founder')
      return
    }
    const run = ++runRef.current
    let alive = true
    void (async () => {
      const [snap, page] = await Promise.all([
        loadLiveExecutiveSnapshot(decision),
        loadLiveUserPage(decision, { pageSize: 200 }),
      ])
      if (!alive || run !== runRef.current) return
      setSnapshot({ ...snap.snapshot, users_page: page.page })
      // الحالة المعروضة هي **الأضعف** بين النداءين: نجاحٌ جزئي لا يُعلَن «حيّ».
      setLive(snap.live === 'live' && page.live === 'live' ? 'live' : snap.live)
    })()
    return () => {
      alive = false
    }
    // `decision` كائن جديد كل رسم؛ المفتاح الحقيقي هو الصلاحية ومعرّف الحساب.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, auth.user?.id, nonce])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  /**
   * ═══ السلك الذي كان مفقودًا ═══
   * `UserDetailPanel` مبنيّ، و`AdminShell` يرسمه عند وجود `detail`، وهذا الملفّ
   * لم يكن يمرّر `detail` ولا `onOpenUser` — فالنقر على صفٍّ في جدول المستخدمين
   * **لا يفعل شيئًا**. لوحة كاملة خلف زرٍّ بلا سلك.
   *
   * ولا نداء جديد: الصفّ محمَّل أصلًا في `users_page`، وفيه ما يطلبه الأمر
   * («حالة استحقاق المستخدم»). فنختاره بمعرّفه من اللقطة نفسها.
   */
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const openUser = useCallback((userId: string) => setOpenUserId(userId), [])
  const closeUser = useCallback(() => setOpenUserId(null), [])

  if (!allowed) return <AdminDenied decision={decision} />
  if (!snapshot) return <AdminLoading label={t.states.loading} />

  const page = snapshot.users_page
  const openRow = openUserId && page.state === 'ready'
    ? page.value.rows.find((r) => r.userId === openUserId) ?? null
    : null
  // صفّ اختير ثم اختفى من الصفحة (تحديث بينهما) لا يترك الشاشة فارغة: يُغلق ضمنًا.
  const detail: AdminUserDetail | null = openRow ? buildUserDetailFromRow(openRow) : null

  return (
    <AdminShell
      decision={decision}
      snapshot={snapshot}
      live={live}
      onRefresh={refresh}
      detail={detail}
      onOpenUser={openUser}
      onCloseUser={closeUser}
    />
  )
}
