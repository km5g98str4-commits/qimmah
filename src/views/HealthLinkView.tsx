import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import type { Lang } from '@/lib/appPreferences'
import { healthStatusCopy, healthStrings } from '@/i18n/dict/health'
import { healthConnectionSummary, requestAllHealthAccess, syncAllEnabled } from '@/lib/health/connect'
import { healthLinkSnapshot } from '@/lib/health/linkState'

interface Props {
  lang: Lang
  onBack: () => void
}

/**
 * صفحة ربط «صحتي من Apple» (Q18) — كل التفاصيل المتقدّمة في مكان واحد.
 *
 * القرار: البطاقة في الإعدادات تحمل الحالة وزرًّا واحدًا فقط، وكل ما عدا ذلك
 * (الأنواع المدعومة، حالة كل نوع، شرح تعديل الصلاحيات، تنويه القراءة فقط) يعيش
 * هنا — بدل أن يبحث المستخدم عنه بين إعدادات كثيرة.
 *
 * لا كتابة إلى HealthKit من أي مسار في هذه الصفحة. الطلب مجمّع واحد فقط.
 */
export function HealthLinkView({ lang, onBack }: Props) {
  const s = healthStrings[lang]
  const ar = lang !== 'en'
  const [snap, setSnap] = useState(() => healthLinkSnapshot())
  const [rows, setRows] = useState(() => healthConnectionSummary())
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const refresh = useCallback(() => {
    setSnap(healthLinkSnapshot())
    setRows(healthConnectionSummary())
  }, [])

  useEffect(() => {
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [refresh])

  const connect = useCallback(async () => {
    setBusy(true)
    setFailed(false)
    const result = await requestAllHealthAccess()
    // نفس سبب البطاقة: بلا سحب أول دفعة تبقى الحالة «يحتاج مراجعة» بلا وجه حق.
    if (result.status !== 'error') {
      try {
        await syncAllEnabled()
      } catch {
        /* الحالة أدناه تعكس ما وصل فعلًا */
      }
    }
    setBusy(false)
    refresh()
    if (result.status === 'error') setFailed(true)
  }, [refresh])

  const copy = healthStatusCopy(s, snap.status, snap.withDataCount, snap.totalCount)
  const requestedWhen = snap.requestedAt
    ? new Date(snap.requestedAt).toLocaleDateString(ar ? 'ar-SA' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-page">
      <header className="shrink-0 border-b border-line bg-surface" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-3 px-4">
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-11 place-items-center rounded-full bg-beige text-ink-700"
            aria-label={s.pageBack}
          >
            <Icon name={ar ? 'ChevronRight' : 'ChevronLeft'} className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-black text-ink-900">{s.title}</h1>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="app-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain px-4 py-4"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 1rem)' }}
      >
        <div className="mx-auto w-full max-w-md space-y-3">
          {/* الحالة */}
          <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="health-status-heading">
            <h2 id="health-status-heading" className="text-sm font-black text-ink-900">
              {copy.label}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{copy.body}</p>
            {requestedWhen && <p className="mt-2 text-[11px] text-ink-400">{s.requestedAtLabel(requestedWhen)}</p>}
            {failed && (
              <p role="alert" className="mt-2 text-xs font-bold leading-relaxed text-warning">
                {s.errorTitle} — {s.errorBody}
              </p>
            )}
            {snap.status !== 'unavailable' && !snap.hasRequested && (
              <button
                type="button"
                onClick={connect}
                disabled={busy}
                aria-label={s.ctaConnectA11y}
                className="btn-primary mt-3 min-h-[44px] w-full py-2.5 text-sm disabled:opacity-60"
              >
                {busy ? s.ctaBusy : s.ctaConnect}
              </button>
            )}
          </section>

          {/* قراءة فقط */}
          <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="health-readonly-heading">
            <div className="flex items-start gap-2.5">
              <Icon name="Lock" className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              <div className="min-w-0">
                <h2 id="health-readonly-heading" className="text-sm font-black text-ink-900">
                  {s.readOnlyTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.readOnlyBody}</p>
              </div>
            </div>
          </section>

          {/* كيف تعدّل الصلاحيات — يظهر بعد الطلب، حين يصير له معنى */}
          {snap.hasRequested && (
            <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="health-howto-heading">
              <h2 id="health-howto-heading" className="text-sm font-black text-ink-900">
                {s.howToTitle}
              </h2>
              <ol className="mt-2 space-y-1.5">
                {s.howToSteps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-500">
                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-beige text-[10px] font-black text-ink-700"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* الأنواع المدعومة — عرض فقط، لا مسار طلب لكل مقياس */}
          <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="health-metrics-heading">
            <h2 id="health-metrics-heading" className="text-sm font-black text-ink-900">
              {s.metricsTitle}
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{s.metricsHint}</p>
            <ul className="mt-3 divide-y divide-line">
              {rows.map((row) => {
                const state = !row.enabled ? s.metricOff : row.dataState === 'has-data' ? s.metricHasData : s.metricNoData
                return (
                  <li key={row.metric} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-xs font-bold text-ink-700">{ar ? row.nameAr : row.nameEn}</span>
                    <span className="shrink-0 text-[11px] text-ink-400">{state}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
