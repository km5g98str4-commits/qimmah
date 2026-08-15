/**
 * المركز التنفيذي — **الشاشة الواحدة**.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * ═══ لماذا شاشة واحدة ═══
 * سؤال المؤسس التنفيذي («كيف حال المنتج؟») لا يحتمل خمسة مستويات تنقّل. فترتيب
 * الشاشة يتبع ترتيب السؤال: **ما الذي يحتاجني الآن** ⟵ **ما الأرقام** ⟵
 * **إلى أين تتجه** ⟵ **من هم**.
 *
 * ولذلك يأتي طابور الاهتمام **قبل** شريط الأرقام: اليوم هو الجزء الوحيد الذي
 * يحمل معلومة حقيقية، ووضع الأرقام الفارغة فوقه كان سيجعل الشاشة تبدو معطّلة
 * بدل أن تبدو **صريحة**.
 *
 * ═══ مكوّن مستقلّ بذاته ═══
 * يستقبل اللقطة والقرار **بالخصائص**، ولا يلمس `App.tsx` ولا `appRoutes.ts`.
 * السبب معلَن في `docs/execution/qimmah-postweb/admin/DEPENDENCIES.md`: سباق
 * الويب السيادي يعمل على نفس القشرة الآن، وحقن مسار `/admin` فيها اليوم =
 * تعارض مؤكّد. **الوصل خطوة موثّقة تُنفَّذ حين يهبط الرأس النهائي.**
 */

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import { adminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import type { AdminRoleDecision } from '../auth/adminRole'
import { isAdmin } from '../auth/adminRole'
import type { AdminUserDetail, ExecutiveSnapshot, PlatformPosture } from '../contract/types'
import { buildAttentionQueue, detectedCount } from '../model/attention'
import { AdminDenied } from './AdminDenied'
import { AttentionPanel } from './AttentionPanel'
import { FunnelChart, TrendChart } from './Charts'
import { MetricCard } from './MetricCard'
import { UserDetailPanel } from './UserDetail'
import { UserTable } from './UserTable'

/** شريط وضع المنصّة — أربع حقائق يعرفها العميل عن نفسه بلا خادم. */
function PostureStrip({ platform }: { platform: PlatformPosture }) {
  const lang = useLang()
  const t = adminStrings[lang]
  const cells = [
    { id: 'platform.buildLabel', icon: 'Code2', value: platform.buildLabel, ok: true },
    {
      id: 'platform.syncPipeline',
      icon: 'Database',
      value: platform.syncPipeline === 'enabled' ? 'on' : 'off',
      ok: platform.syncPipeline === 'enabled',
    },
    {
      id: 'platform.entitlementSource',
      icon: 'Wallet',
      value: platform.entitlementSource,
      ok: platform.entitlementSource === 'backend',
    },
    {
      id: 'platform.backendConfigured',
      icon: 'ShieldCheck',
      value: platform.backendConfigured ? 'ok' : 'missing',
      ok: platform.backendConfigured,
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cells.map((c) => (
        <div key={c.id} className="card flex items-center gap-2 p-3 text-start" data-posture={c.id}>
          {/* المعنى بالأيقونة والنصّ معًا — لا يحمله اللون وحده (الميثاق §9). */}
          <Icon name={c.icon} className={cn('h-4 w-4 shrink-0', c.ok ? 'text-success' : 'text-warning')} />
          <div className="min-w-0">
            <span className="block truncate text-[11px] font-bold text-ink-500">{t.labels[c.id]}</span>
            <span className="block truncate text-sm font-extrabold text-ink-900">{c.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

type Tab = 'overview' | 'users' | 'charts'

interface AdminShellProps {
  decision: AdminRoleDecision
  snapshot: ExecutiveSnapshot
  /** تفصيل مستخدم — يُطلب عند التعمّق، فلا يُحمَّل مع الجدول. */
  detail?: AdminUserDetail | null
  onOpenUser?: (userId: string) => void
  onCloseUser?: () => void
  onRefresh?: () => void
}

export function AdminShell({ decision, snapshot, detail, onOpenUser, onCloseUser, onRefresh }: AdminShellProps) {
  const lang = useLang()
  const t = adminStrings[lang]
  const [tab, setTab] = useState<Tab>('overview')

  // ⚠️ **البوّابة أول شيء وقبل أي قراءة.** لا لقطة تُقرأ ولا مكوّن يُبنى قبلها،
  // فلا مسار رسم واحد يسبق فحص الدور.
  if (!isAdmin(decision)) return <AdminDenied decision={decision} />

  const attention = buildAttentionQueue(snapshot)
  const usersPage = snapshot.users_page
  const rowsValue =
    usersPage.state === 'ready'
      ? ({ state: 'ready', value: usersPage.value.rows, asOf: usersPage.asOf } as const)
      : usersPage

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: t.shell.navOverview, icon: 'LayoutGrid' },
    { id: 'users', label: t.shell.navUsers, icon: 'Users' },
    { id: 'charts', label: t.shell.navCharts, icon: 'BarChart3' },
  ]

  return (
    <main className="container-page section text-start" data-admin-shell="true">
      {/* ——— الترويسة ——— */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading">{t.shell.title}</h1>
          <p className="subheading">{t.shell.subtitle}</p>
        </div>
        <button type="button" className="btn-ghost tap-target" onClick={onRefresh}>
          <Icon name="RefreshCw" className="h-4 w-4" />
          <span className="text-xs">{t.shell.refresh}</span>
        </button>
      </header>

      {/*
        شريط حالة التوصيل — **دائم ولا يُطوى**. من يفتح الشاشة يقرأ في أول سطر
        لماذا هي فارغة، بدل أن يستنتج من فراغها أن المنتج بلا مستخدمين.
      */}
      <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/[0.07] p-3 text-xs leading-relaxed text-ink-700">
        <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        {t.shell.wiringBanner}
      </p>

      <div className="mt-4">
        <PostureStrip platform={snapshot.platform} />
      </div>

      {/* ——— التنقّل ——— */}
      <nav className="mt-5 flex flex-wrap gap-2" aria-label={t.shell.title}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            aria-current={tab === x.id ? 'page' : undefined}
            className={cn(
              'tap-target inline-flex items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors',
              tab === x.id ? 'border-primary-soft bg-primary-soft text-primary-c' : 'border-line bg-surface text-ink-700',
            )}
          >
            <Icon name={x.icon} className="h-4 w-4" />
            {x.label}
            {x.id === 'overview' && detectedCount(attention) > 0 ? (
              <span className="rounded-full bg-danger px-1.5 text-[10px] font-extrabold text-white">
                {detectedCount(attention)}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* ——— نظرة عامة ——— */}
      {tab === 'overview' ? (
        <div className="mt-4 flex flex-col gap-4">
          <AttentionPanel items={attention} />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard metricId="users.total" value={snapshot.users.total} emphasis />
            <MetricCard metricId="users.newToday" value={snapshot.users.newToday} emphasis />
            <MetricCard metricId="entitlement.premiumActive" value={snapshot.entitlement.premiumActive} emphasis />
            <MetricCard
              metricId="entitlement.conversionOfAccounts"
              value={snapshot.entitlement.conversionOfAccounts}
              format={(v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : String(v))}
              emphasis
            />
            <MetricCard metricId="users.new7d" value={snapshot.users.new7d} />
            <MetricCard metricId="users.new30d" value={snapshot.users.new30d} />
            <MetricCard metricId="users.verified" value={snapshot.users.verified} />
            <MetricCard metricId="entitlement.previewOnly" value={snapshot.entitlement.previewOnly} />
            <MetricCard metricId="activity.signedIn7d" value={snapshot.activity.signedIn7d} />
            <MetricCard metricId="activity.signedIn30d" value={snapshot.activity.signedIn30d} />
            <MetricCard metricId="activity.dormant30d" value={snapshot.activity.dormant30d} />
            <MetricCard metricId="activity.productActive7d" value={snapshot.activity.productActive7d} />
            <MetricCard metricId="activity.workoutsCompleted7d" value={snapshot.activity.workoutsCompleted7d} />
            <MetricCard metricId="activity.nutritionLogged7d" value={snapshot.activity.nutritionLogged7d} />
            <MetricCard metricId="activity.measurementsLogged30d" value={snapshot.activity.measurementsLogged30d} />
            <MetricCard
              metricId="onboarding.completionRate"
              value={snapshot.onboarding.completionRate}
              format={(v) => (typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : String(v))}
            />
            <MetricCard metricId="entitlement.activationRedeemed" value={snapshot.entitlement.activationRedeemed} />
            <MetricCard metricId="entitlement.activationPending" value={snapshot.entitlement.activationPending} />
            <MetricCard metricId="entitlement.activationFailed24h" value={snapshot.entitlement.activationFailed24h} />
            <MetricCard metricId="onboarding.stuckCount" value={snapshot.onboarding.stuckCount} />
          </div>

          <RoadmapPanel />
        </div>
      ) : null}

      {/* ——— المستخدمون ——— */}
      {tab === 'users' ? (
        <div className="mt-4 flex flex-col gap-4">
          {detail ? (
            <UserDetailPanel detail={detail} onBack={onCloseUser} />
          ) : (
            <UserTable data={rowsValue} onOpen={onOpenUser} />
          )}
        </div>
      ) : null}

      {/* ——— الاتجاهات ——— */}
      {tab === 'charts' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TrendChart title={t.charts.growth} metricId="users.growthSeries" data={snapshot.users.growthSeries} />
          <TrendChart title={t.charts.active} metricId="activity.activeSeries" data={snapshot.activity.activeSeries} />
          <FunnelChart
            title={t.charts.activationFunnel}
            metricId="entitlement.activationPending"
            stages={snapshot.entitlement.activationFunnel}
          />
          <FunnelChart title={t.charts.onboardingFunnel} metricId="users.total" stages={snapshot.onboarding.funnel} />
          <TrendChart
            title={t.charts.workoutTrend}
            metricId="activity.workoutsCompleted7d"
            data={snapshot.activity.activeSeries}
          />
          <TrendChart
            title={t.charts.retention}
            metricId="activity.retentionCohorts"
            data={snapshot.activity.activeSeries}
          />
        </div>
      ) : null}
    </main>
  )
}

/**
 * خارطة الطريق — **بديل الأزرار المعطّلة**.
 *
 * الأفعال المدمّرة (تعليق حساب · منح استحقاق · حذف بيانات) **لا قدرة خادم
 * مُراجَعة لها**، فلا تظهر أزرارًا. الزرّ المعطّل يَعِد بقدرة غير موجودة،
 * والقائمة تقول الحقيقة: هذا ليس هنا **بعد**.
 */
function RoadmapPanel() {
  const lang = useLang()
  const t = adminStrings[lang]
  return (
    <section className="card p-4 text-start sm:p-5">
      <div className="flex items-center gap-2">
        <Icon name="Compass" className="h-5 w-5 text-ink-500" />
        <h2 className="text-base font-extrabold text-ink-900">{t.roadmap.heading}</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-500">{t.roadmap.note}</p>
    </section>
  )
}
