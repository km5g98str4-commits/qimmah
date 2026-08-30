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
import { purchaseBatchStrings } from '@/i18n/dict/purchaseBatches'
import type { AdminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import type { AdminRoleDecision } from '../auth/adminRole'
import { isAdmin } from '../auth/adminRole'
import type { AdminUserDetail, ExecutiveSnapshot, PlatformPosture } from '../contract/types'
import type { LiveReadState } from '../contract/liveSource'
import { buildAttentionQueue, detectedCount } from '../model/attention'
import { OperationsPanel } from './OperationsPanel'
import { AdminDenied } from './AdminDenied'
import { AttentionPanel } from './AttentionPanel'
import { CodesPanel } from './CodesPanel'
import { PurchaseBatchPanel } from './PurchaseBatchPanel'
import type { PurchaseBatchPanelProps } from './PurchaseBatchPanel'
import type { CodesPanelProps } from './CodesPanel'
import { FunnelChart, TrendChart } from './Charts'
import { MetricCard } from './MetricCard'
import { UserDetailPanel } from './UserDetail'
import { UserTable } from './UserTable'
import type { ServerPaging } from './UserTable'

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
            {/* القيمة تُترجَم إن كانت حالةً معلومة، وتُطبع كما هي إن كانت وسم بناء. */}
            <span className="block truncate text-sm font-extrabold text-ink-900" data-posture-value={c.value}>
              {t.postureValues[c.value] ?? c.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

type Tab = 'overview' | 'users' | 'codes' | 'purchases' | 'ops' | 'charts'

interface AdminShellProps {
  decision: AdminRoleDecision
  snapshot: ExecutiveSnapshot
  /** تفصيل مستخدم — يُطلب عند التعمّق، فلا يُحمَّل مع الجدول. */
  detail?: AdminUserDetail | null
  /** [COMMISSIONING §4] سحب الوصول. **`undefined` ⇒ لا زرّ** — الدعم يقرأ ولا يغيّر. */
  onRevokeUser?: (reason: string) => Promise<void> | void
  onOpenUser?: (userId: string) => void
  onCloseUser?: () => void
  onRefresh?: () => void
  /** حين يُمرَّر: بحث وتصفّح الجدول يمرّان بالخادم لا بالمتصفّح. */
  userPaging?: ServerPaging
  /** حالة قراءة صفحة التفصيل — مستقلّة عن اللقطة، فالفشل يُسمّى وحده. */
  detailLive?: LiveReadState
  /**
   * صفحة حساب **مفتوحة**. مستقلّة عن `detail` عمدًا: الفتح فعلٌ وقع، وتعذّر
   * الجلب حدثٌ آخر. لولا الفصل لعاد الضغط على الصفّ إلى الجدول بلا كلمة —
   * وهو أسوأ أشكال الفشل: فشلٌ يبدو «ما صار شيء».
   */
  detailOpen?: boolean
  /**
   * لوحة الأكواد. **بلا هذه الخصائص لا يظهر التبويب أصلًا** — تبويبٌ يفتح على
   * شاشة لا تفعل شيئًا أسوأ من تبويب غائب.
   */
  codes?: CodesPanelProps
  /** [WAVE2-PURCHASE-OPS] صكوك الشراء — تبويب مستقلّ عن أكواد الوصول: مخزونان لا يُخلطان. */
  purchases?: PurchaseBatchPanelProps
  /**
   * حالة القراءة الحيّة. **بلا قيمة ⇒ `'not-founder'`** — الافتراض الأقلّ ادّعاءً:
   * مكوّن يُرسَم بلا إخبار عن مصدره لا يجوز أن يقول «حيّ».
   */
  live?: LiveReadState
}

export function AdminShell({
  decision,
  snapshot,
  detail,
  onOpenUser,
  onCloseUser,
  onRevokeUser,
  onRefresh,
  userPaging,
  detailLive,
  detailOpen,
  codes,
  purchases,
  live = 'not-founder',
}: AdminShellProps) {
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
    // يظهر حين تُمرَّر قدرته فقط — لا تبويب يَعِد بما لا يعمل.
    ...(codes ? [{ id: 'codes' as Tab, label: t.codes.heading, icon: 'KeyRound' }] : []),
    ...(purchases ? [{ id: 'purchases' as Tab, label: purchaseBatchStrings[lang === 'en' ? 'en' : 'ar'].heading, icon: 'Wallet' }] : []),
    // [COMMISSIONING §4] غرفة العمليات — بلا شرط: الغلاف كلّه خلف
    // `isAdmin(decision)` أعلاه، فمن وصل هنا مؤسسٌ أو دعم. وكل قراءة داخلها
    // محروسة بالدور في الخادم كذلك، وتعلن غيابها بسببه المسمّى.
    { id: 'ops', label: t.ops.nav, icon: 'Activity' },
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
      {/*
        شريط حالة القراءة — **يتبع الحقيقة لا نصًّا ثابتًا**. كان سطرًا واحدًا
        يقول «لا رقم متاح»؛ وهو يصير كذبًا في اللحظة التي تصل فيها الأرقام.
        الآن لكل حالة قراءة نصّها، و«حيّ» وحدها تختفي فيها النبرة التحذيرية.
      */}
      <p
        data-live-state={live}
        className={cn(
          'mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs leading-relaxed',
          live === 'live'
            ? 'border-success/40 bg-success/[0.07] text-ink-700'
            : 'border-warning/40 bg-warning/[0.07] text-ink-700',
        )}
      >
        <Icon
          name={live === 'live' ? 'CheckCircle2' : 'Info'}
          className={cn('mt-0.5 h-4 w-4 shrink-0', live === 'live' ? 'text-success' : 'text-warning')}
        />
        {t.live[live]}
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

          {/*
            ═══ الأرقام الخمسة ═══
            خمسة لا عشرون: الشريط العلوي يجيب «كيف حال المنتج؟» في نظرة واحدة،
            وكل ما عداه ينزل إلى قسمه المسمّى. عشرون بطاقةً متساوية الوزن ليست
            ملخّصًا بل قائمة، والقائمة تُقرأ ولا تُلتقط.
          */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard metricId="users.total" value={snapshot.users.total} emphasis />
            <MetricCard metricId="users.newToday" value={snapshot.users.newToday} emphasis />
            <MetricCard metricId="entitlement.premiumActive" value={snapshot.entitlement.premiumActive} emphasis />
            <MetricCard metricId="commerce.ordersPaid" value={snapshot.commerce.ordersPaid} emphasis />
            <MetricCard
              metricId="entitlement.conversionOfAccounts"
              value={snapshot.entitlement.conversionOfAccounts}
              format={(v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : String(v))}
              emphasis
            />
          </div>

          <Section id="growth" icon="TrendingUp">
            <MetricCard metricId="users.new7d" value={snapshot.users.new7d} />
            <MetricCard metricId="users.new30d" value={snapshot.users.new30d} />
            <MetricCard metricId="users.verified" value={snapshot.users.verified} />
            {/* [ADMIN-CONV] «اليوم» قبل النوافذ الأطول — أول سؤال صباحي يُجاب أولًا. */}
            <MetricCard metricId="activity.signedInToday" value={snapshot.activity.signedInToday} />
            <MetricCard metricId="activity.signedIn7d" value={snapshot.activity.signedIn7d} />
            <MetricCard metricId="activity.signedIn30d" value={snapshot.activity.signedIn30d} />
            <MetricCard metricId="activity.dormant30d" value={snapshot.activity.dormant30d} />
          </Section>

          <Section id="entitlement" icon="Wallet">
            <MetricCard metricId="entitlement.previewOnly" value={snapshot.entitlement.previewOnly} />
            <MetricCard metricId="entitlement.trialActive" value={snapshot.entitlement.trialActive} />
            <MetricCard metricId="entitlement.trialExpired" value={snapshot.entitlement.trialExpired} />
            <MetricCard metricId="entitlement.premiumActive" value={snapshot.entitlement.premiumActive} />
            <MetricCard metricId="commerce.revokedActive" value={snapshot.commerce.revokedActive} />
          </Section>

          <Section id="commerce" icon="Diamond">
            <MetricCard metricId="commerce.ordersSeen" value={snapshot.commerce.ordersSeen} />
            <MetricCard metricId="commerce.ordersPaid" value={snapshot.commerce.ordersPaid} />
            <MetricCard metricId="commerce.ordersFailed" value={snapshot.commerce.ordersFailed} />
            <MetricCard metricId="commerce.codesIssued" value={snapshot.commerce.codesIssued} />
            <MetricCard metricId="commerce.codesRedeemed" value={snapshot.commerce.codesRedeemed} />
            <MetricCard metricId="commerce.codesUnused" value={snapshot.commerce.codesUnused} />
            <MetricCard metricId="commerce.redemptionFailures24h" value={snapshot.commerce.redemptionFailures24h} />
            <MetricCard metricId="commerce.webhookProcessed" value={snapshot.commerce.webhookProcessed} />
            <MetricCard metricId="commerce.webhookPending" value={snapshot.commerce.webhookPending} />
            <MetricCard metricId="commerce.webhookRetried" value={snapshot.commerce.webhookRetried} />
            <MetricCard metricId="commerce.grantsManual" value={snapshot.commerce.grantsManual} />
          </Section>

          {/*
            ═══ رحلة الزائر — قسمٌ كل بنوده «غير مقيسة» ═══
            بقاؤه معروضًا وهو فارغ هو **المقصد**: القمع الذي يبدأ من «شراء»
            يُقرأ كأن كل زائر يشتري. وهذا القسم يقول أين ينقطع علمنا بالضبط،
            وأن ما ينقص خطّ أحداث بأكمله لا هجرة تُطبَّق.
          */}
          <Section id="journey" icon="Footprints">
            <MetricCard metricId="journey.landing" value={snapshot.journey.landing} />
            <MetricCard metricId="journey.onboardingStarted" value={snapshot.journey.onboardingStarted} />
            <MetricCard metricId="journey.onboardingCompleted" value={snapshot.journey.onboardingCompleted} />
            <MetricCard metricId="journey.reveal" value={snapshot.journey.reveal} />
            <MetricCard metricId="journey.premiumCta" value={snapshot.journey.premiumCta} />
            <MetricCard metricId="journey.trialCta" value={snapshot.journey.trialCta} />
            <MetricCard metricId="journey.sallaClick" value={snapshot.journey.sallaClick} />
          </Section>

          <Section id="funnel" icon="SlidersHorizontal">
            <MetricCard metricId="entitlement.activationPending" value={snapshot.entitlement.activationPending} />
            <MetricCard metricId="entitlement.activationRedeemed" value={snapshot.entitlement.activationRedeemed} />
            <MetricCard metricId="entitlement.activationFailed24h" value={snapshot.entitlement.activationFailed24h} />
            <MetricCard
              metricId="onboarding.completionRate"
              value={snapshot.onboarding.completionRate}
              format={(v) => (typeof v === 'number' ? `${(v * 100).toFixed(0)}%` : String(v))}
            />
            <MetricCard metricId="onboarding.stuckCount" value={snapshot.onboarding.stuckCount} />
          </Section>

          {/*
            قسم الأخطاء **يبقى معروضًا وهو فارغ**. حذفه حين لا مصدر له يجعل
            الشاشة تُقرأ «لا أخطاء»؛ وبقاؤه بـ«غير متاح» يقول الحقيقة: لا نقيس.
          */}
          <Section id="errors" icon="AlertCircle">
            <MetricCard metricId="errors.clientErrors24h" value={snapshot.errors.clientErrors24h} />
            <MetricCard metricId="errors.rpcFailures24h" value={snapshot.errors.rpcFailures24h} />
          </Section>

          <Section id="product" icon="Activity">
            <MetricCard metricId="activity.productActive7d" value={snapshot.activity.productActive7d} />
            <MetricCard metricId="activity.workoutsCompleted7d" value={snapshot.activity.workoutsCompleted7d} />
            <MetricCard metricId="activity.nutritionLogged7d" value={snapshot.activity.nutritionLogged7d} />
            <MetricCard metricId="activity.measurementsLogged30d" value={snapshot.activity.measurementsLogged30d} />
          </Section>

          <RoadmapPanel />
        </div>
      ) : null}

      {/* ——— المستخدمون ——— */}
      {tab === 'users' ? (
        <div className="mt-4 flex flex-col gap-4">
          {detail ? (
            <UserDetailPanel detail={detail} onBack={onCloseUser} live={detailLive} onRevoke={onRevokeUser} />
          ) : detailOpen ? (
            <DetailUnavailable live={detailLive ?? 'failed'} onBack={onCloseUser} />
          ) : (
            <UserTable data={rowsValue} onOpen={onOpenUser} server={userPaging} />
          )}
        </div>
      ) : null}

      {/* ——— الأكواد ——— */}
      {tab === 'codes' && codes ? <div className="mt-4">{<CodesPanel {...codes} />}</div> : null}

      {tab === 'purchases' && purchases ? <div className="mt-4">{<PurchaseBatchPanel {...purchases} />}</div> : null}

      {/* ——— الاتجاهات ——— */}
      {tab === 'ops' ? <OperationsPanel lang={lang} decision={decision} /> : null}

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
          {/* قمع الرحلة الكامل — تسع مراحل، سبعٌ منها بلا مصدر ومعلَنة كذلك. */}
          <FunnelChart title={t.charts.journeyFunnel} metricId="journey.landing" stages={snapshot.journey.funnel} />
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
 * صفحة حساب طُلبت ولم تصل — **تُعلَن ولا تُبتلع**.
 *
 * الرجوع الصامت إلى الجدول كان سيجعل الضغطة تبدو بلا أثر، فيظنّ المؤسس أن
 * الزرّ معطّل لا أن القراءة فشلت. والحالة هنا **مسمّاة** كما في شريط اللقطة.
 */
function DetailUnavailable({ live, onBack }: { live: LiveReadState; onBack?: () => void }) {
  const lang = useLang()
  const t = adminStrings[lang]
  return (
    <section className="card p-4 text-start sm:p-5" data-detail-unavailable={live}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-ink-900">{t.detail.heading}</h2>
        {onBack ? (
          <button type="button" className="btn-ghost tap-target" onClick={onBack}>
            <Icon name="ArrowLeft" className="h-4 w-4" />
            <span className="text-xs">{t.detail.back}</span>
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-line p-4">
        <Icon name="CircleSlash" className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
        <div>
          <p className="text-sm font-bold text-ink-500">{t.states.unavailable}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{t.live[live]}</p>
        </div>
      </div>
    </section>
  )
}

/**
 * قسم مُعنوَن.
 *
 * العنوان **يُشتقّ من المعرّف** لا يُمرَّر نصًّا: تمريره كان يسمح بقسم يحمل
 * عنوان قسم آخر بلا أن يعترض شيء. والمعرّف يُطبع في `data-section` فيصير
 * وجود القسم قابلًا للفحص بنيويًا لا بمطابقة نصّ قد يظهر صدفةً في مكان آخر.
 * وشبكته تنهار إلى عمود واحد عند ٣٢٠بكسل.
 */
function Section({ id, icon, children }: { id: keyof AdminStrings['sections']; icon: string; children: React.ReactNode }) {
  const lang = useLang()
  const t = adminStrings[lang]
  return (
    <section className="text-start" data-section={id}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink-700">
        <Icon name={icon} className="h-4 w-4 text-ink-500" />
        {t.sections[id]}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
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
