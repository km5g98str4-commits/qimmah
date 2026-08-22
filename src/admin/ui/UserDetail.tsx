/**
 * صفحة مستخدم واحد — سطح **تشغيلي** لا عارض ملفّ شخصي.
 * [QIMMAH-SOVEREIGN-PHASE-II-001] · AGENT-E.
 *
 * تجيب سؤالين لا غير: **هل هذا الحساب عالق؟** و**هل استحقاقه صحيح؟**
 * وكل ما لا يخدم أحدهما خارج الشاشة — لا لأنه صعب، بل لأن **ما لا يُطلب لا
 * يُنقل، وما لا يُنقل لا يُسرَّب**.
 *
 * ═══ حدّ صريح مكتوب في الشاشة نفسها ═══
 * الإصابات والأدوية والحساسيات وقيم القياسات **لا تدخل هنا بأي دور**. وسطر
 * الاستبعاد مرئي للمؤسس عمدًا: القيد المعلَن في الواجهة أصعب على النقض من قيد
 * مدفون في تعليق كود.
 * ويحرس الاستبعاد `test:admin-dashboard` بتأكيد مضادّ يمنع ظهور أي حقل حسّاس.
 */

import { Icon } from '@/components/Icon'
import { adminStrings } from '@/i18n/dict/admin'
import { useLang } from '@/i18n'
import { cn } from '@/lib/cn'
import { findMetric } from '../contract/metrics'
import type { LiveReadState } from '../contract/liveSource'
import type { AdminUserDetail, MetricValue } from '../contract/types'

/** سطر قيمة — يعرض الجاهز، ويعلن الغائب بسببه. لا شرطة تُقرأ صفرًا. */
function ValueRow({
  label,
  value,
  metricId,
  format,
}: {
  label: string
  value: MetricValue<unknown>
  metricId: string
  /**
   * تنسيق القيمة الجاهزة. **يُستدعى على `value.value` وحدها** — لا على الغياب،
   * فلا يوجد مسار يجعل منسّقًا يخترع نصًّا لقيمة لم تصل.
   */
  format?: (v: unknown) => string
}) {
  const lang = useLang()
  const t = adminStrings[lang]
  const def = findMetric(metricId)
  return (
    <div className="flex flex-col gap-0.5 border-t border-line py-2 text-start first:border-t-0">
      <span className="text-xs font-bold text-ink-500">{label}</span>
      {value.state === 'ready' ? (
        <span className="text-sm font-bold text-ink-900">
          {format ? format(value.value) : String(value.value ?? '—')}
        </span>
      ) : value.state === 'loading' ? (
        <span className="skeleton h-4 w-24" aria-label={t.states.loading} />
      ) : value.state === 'error' ? (
        <span className="text-sm font-bold text-danger">{t.states.error}</span>
      ) : (
        <>
          <span className="text-sm font-bold text-ink-500">{t.states.unavailable}</span>
          {def ? <span className="text-[11px] leading-relaxed text-ink-400">{t.reasons[def.unavailableReasonKey] ?? ''}</span> : null}
        </>
      )}
    </div>
  )
}

/**
 * تنسيق تاريخ ISO إلى يوم واحد. **الوقت مقصوص عمدًا**: الساعة لا تخدم أي قرار
 * إداري هنا، وعرضها يجرّ منطقة زمنية تصير سؤالًا بلا جواب.
 */
const fmtDate = (whenNull: string) => (v: unknown) =>
  typeof v === 'string' ? v.slice(0, 10) : v === null ? whenNull : String(v)

interface UserDetailProps {
  detail: AdminUserDetail
  onBack?: () => void
  /**
   * حالة قراءة هذه الصفحة بعينها. **بلا قيمة ⇒ لا شريط** — لا ادّعاء ولا نفي:
   * من يرسم الصفحة من تجهيزة لا يقول عنها «حيّة» ولا «معطوبة».
   */
  live?: LiveReadState
}

export function UserDetailPanel({ detail, onBack, live }: UserDetailProps) {
  const lang = useLang()
  const t = adminStrings[lang]
  const r = detail.row

  return (
    <section className="card p-4 text-start sm:p-5" aria-labelledby="admin-detail-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-detail-heading" className="text-base font-extrabold text-ink-900">
          {t.detail.heading}
        </h2>
        {onBack ? (
          <button type="button" className="btn-ghost tap-target" onClick={onBack}>
            <Icon name="ArrowLeft" className="h-4 w-4" />
            <span className="text-xs">{t.detail.back}</span>
          </button>
        ) : null}
      </div>

      {/*
        شريط حالة القراءة — يظهر حين تُعلَن الحالة **وتكون غير حيّة**. الصفحة
        التي تُرسم من ردّ ناقص يجب أن تقول ذلك في سطرها الأول، وإلا قُرئ نقصها
        على أنه حقيقة الحساب.
      */}
      {live && live !== 'live' ? (
        <p
          data-detail-live-state={live}
          className={cn(
            'mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/[0.07] p-3 text-xs leading-relaxed text-ink-700',
          )}
        >
          <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          {t.live[live]}
        </p>
      ) : null}

      {/* ——— الحساب: الحقول المُصرَّح بها وحدها ——— */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-extrabold text-ink-500">{t.detail.account}</h3>
          <dl className="mt-2 flex flex-col">
            <div className="flex justify-between gap-2 border-t border-line py-2 text-sm first:border-t-0">
              <dt className="text-ink-500">{t.table.colUser}</dt>
              <dd className="font-bold text-ink-900">{r.displayName ?? t.table.noName}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-line py-2 text-sm">
              <dt className="text-ink-500">{t.table.colEmail}</dt>
              {/* مُقنَّع في النوع نفسه — لا مسار في هذه الشجرة يحمل بريدًا كاملًا. */}
              <dd className="font-bold text-ink-900">{r.emailMasked ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-line py-2 text-sm">
              <dt className="text-ink-500">{t.table.colCreated}</dt>
              <dd className="tabular-nums font-bold text-ink-900">{r.createdAt.slice(0, 10)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-line py-2 text-sm">
              <dt className="text-ink-500">{t.table.colLastSignIn}</dt>
              <dd className="tabular-nums font-bold text-ink-900">
                {r.lastSignInAt ? r.lastSignInAt.slice(0, 10) : t.table.noSignIn}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-line py-2 text-sm">
              <dt className="text-ink-500">{t.detail.entitlement}</dt>
              <dd className="font-bold text-ink-900">{t.entitlementView[r.entitlement]}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-line py-2 text-sm">
              <dt className="text-ink-500">{t.detail.onboarding}</dt>
              <dd className="font-bold text-ink-900">{t.onboardingView[r.onboarding]}</dd>
            </div>
          </dl>
        </div>

        {/* ——— النشاط: أعداد أحداث لا قيم ——— */}
        <div>
          <h3 className="text-xs font-extrabold text-ink-500">{t.detail.lastActive}</h3>
          <div className="mt-2 flex flex-col">
            <ValueRow label={t.detail.plan} value={detail.planSummary} metricId="onboarding.completionRate" />
            <ValueRow
              label={t.detail.workouts}
              value={detail.activity.workoutsCompleted}
              metricId="activity.workoutsCompleted7d"
            />
            <ValueRow
              label={t.detail.nutrition}
              value={detail.activity.nutritionDaysLogged}
              metricId="activity.nutritionLogged7d"
            />
            <ValueRow
              label={t.detail.measurements}
              value={detail.activity.measurementEvents}
              metricId="activity.measurementsLogged30d"
            />
            <ValueRow label={t.detail.lastActive} value={detail.activity.lastActivityAt} metricId="activity.productActive7d" />
            <ValueRow label={t.detail.support} value={detail.supportContext} metricId="entitlement.activationFailed24h" />
          </div>
        </div>
      </div>

      {/*
        ═══ الكتلة التشغيلية ═══
        السؤال الثاني الذي بُنيت له الشاشة: **هل استحقاقه صحيح؟**
        كل سطر هنا من `founder_user_detail` مباشرة، والحالة **مشتقّة بوقت
        القاعدة** لا مقروءة من عمود قد يشيخ.
      */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-extrabold text-ink-500">{t.detail.entitlement}</h3>
          <div className="mt-2 flex flex-col">
            <ValueRow
              label={t.detail.entState}
              value={detail.entitlementDetail.state}
              metricId="entitlement.premiumActive"
              format={(v) => (typeof v === 'string' ? (t.entitlementState[v] ?? v) : String(v))}
            />
            <ValueRow
              label={t.detail.entSource}
              value={detail.entitlementDetail.source}
              metricId="entitlement.premiumActive"
              format={(v) => (v === null ? t.detail.none : String(v))}
            />
            <ValueRow
              label={t.detail.entActivated}
              value={detail.entitlementDetail.activatedAt}
              metricId="entitlement.activationRedeemed"
              format={fmtDate(t.detail.none)}
            />
            <ValueRow
              label={t.detail.entExpires}
              value={detail.entitlementDetail.expiresAt}
              metricId="entitlement.trialActive"
              // `null` هنا **جواب** لا جهل: منحة بلا انتهاء. ولذلك لا يُعرض «—».
              format={fmtDate(t.detail.noExpiry)}
            />
            <ValueRow
              label={t.detail.entRevoked}
              value={detail.entitlementDetail.revokedAt}
              metricId="commerce.revokedActive"
              format={fmtDate(t.detail.none)}
            />
            <ValueRow
              label={t.detail.entRevokedReason}
              value={detail.entitlementDetail.revokedReason}
              metricId="commerce.revokedActive"
              format={(v) => (v === null ? t.detail.none : String(v))}
            />
          </div>
        </div>

        <div>
          <h3 className="text-xs font-extrabold text-ink-500">{t.detail.commerceHeading}</h3>
          <div className="mt-2 flex flex-col">
            <ValueRow label={t.detail.purchases} value={detail.commerce.purchases} metricId="commerce.ordersPaid" />
            <ValueRow
              label={t.detail.codesRedeemed}
              value={detail.commerce.codesRedeemed}
              metricId="commerce.codesRedeemed"
            />
            <ValueRow
              label={t.detail.lastOrderId}
              value={detail.commerce.lastOrderId}
              metricId="commerce.ordersSeen"
              format={(v) => (v === null ? t.detail.none : String(v))}
            />
            <ValueRow
              label={t.detail.lastPurchaseAt}
              value={detail.commerce.lastPurchaseAt}
              metricId="commerce.ordersPaid"
              format={fmtDate(t.detail.none)}
            />
            <ValueRow
              label={t.detail.accessRevoked}
              value={detail.commerce.accessRevoked}
              metricId="commerce.revokedActive"
              format={(v) => (v === true ? t.detail.yes : t.detail.no)}
            />
            <ValueRow
              label={t.detail.emailVerified}
              value={detail.emailVerified}
              metricId="users.verified"
              format={(v) => (v === true ? t.detail.yes : t.detail.no)}
            />
          </div>
        </div>
      </div>

      {/* ——— حدّ الحساسية معلَن في الشاشة ——— */}
      <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-beige p-3 text-[11px] leading-relaxed text-ink-500">
        <Icon name="ShieldCheck" className="mt-0.5 h-4 w-4 shrink-0" />
        {t.detail.sensitiveExcluded}
      </p>
    </section>
  )
}
