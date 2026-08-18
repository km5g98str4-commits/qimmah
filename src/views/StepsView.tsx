import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { StateBlock } from '@/components/StateBlock'
import type { Lang } from '@/lib/appPreferences'
import { eStepsCopy } from '@/i18n/dict/eSteps'
import { buildStepsPageModel, type StepsPageModel } from '@/lib/eStepsModel'
import { metricState, refreshHealthKitStepsIfEnabled } from '@/lib/healthKit'
import { formatNumber, formatNumeralsIn, resolveNumeralSystem } from '@/lib/numberFormat'

interface StepsViewProps {
  lang: Lang
  onBack: () => void
  onOpenSettings: () => void
}

type StepsScreenState =
  | { status: 'loading' }
  | { status: 'ready'; model: StepsPageModel }
  | { status: 'error'; model: StepsPageModel }

/**
 * تقويم **ميلادي مثبَّت صراحةً** ونظام أرقام مأخوذ من التفضيل.
 *
 * كان السطران يُمرّران `'ar-SA'` عاريًا: التقويم المفضَّل لـ`ar-SA` في CLDR هو
 * `islamic-umalqura`، وبعض المتصفّحات تحسمه كذلك — فتُرقَّم أيام الأسبوع هجريًا
 * فوق بيانات ميلادية. `-u-ca-gregory` يقفلها بلا كلفة.
 */
function dateLocale(lang: Lang): string {
  const base = lang === 'ar' ? 'ar-SA' : 'en'
  return `${base}-u-ca-gregory-nu-${resolveNumeralSystem(lang)}`
}

function localDate(date: string, lang: Lang): string {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })
}

function localDayNumber(date: string, lang: Lang): string {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString(dateLocale(lang), { day: 'numeric' })
}

/**
 * المنسّق المركزي لا `toLocaleString('ar-SA')`: النسخة المحلية كانت مصدر حقيقة
 * خامسًا لا يصله تفضيل «شكل الأرقام»، ويكفي سقوط لاحقة إقليم واحدة حتى يقلب
 * `'ar'` وحدها المخرجات إلى اللاتينية.
 */
function number(value: number, lang: Lang, maximumFractionDigits = 0): string {
  return formatNumber(value, lang, { maximumFractionDigits })
}

export function StepsView({ lang, onBack, onOpenSettings }: StepsViewProps) {
  const ar = lang !== 'en'
  const copy = eStepsCopy(lang)
  const [screen, setScreen] = useState<StepsScreenState>({ status: 'loading' })
  const health = metricState('steps')

  const loadSaved = useCallback(() => {
    try {
      setScreen({ status: 'ready', model: buildStepsPageModel() })
    } catch {
      setScreen({ status: 'error', model: buildStepsPageModel() })
    }
  }, [])

  useEffect(() => {
    loadSaved()
    window.addEventListener('qimmah:steps-updated', loadSaved)
    return () => window.removeEventListener('qimmah:steps-updated', loadSaved)
  }, [loadSaved])

  const refresh = async () => {
    setScreen({ status: 'loading' })
    const result = await refreshHealthKitStepsIfEnabled()
    if (result && result.permission === 'authorized') {
      loadSaved()
      return
    }
    setScreen({ status: 'error', model: buildStepsPageModel() })
  }

  const model = screen.status === 'loading' ? null : screen.model
  const healthNote = health.enabled
    ? health.permission === 'authorized'
      ? copy.healthConnected
      : copy.healthUnknown
    : copy.healthNotConnected

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-[100dvh] bg-page px-4 pb-8 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <header className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-700 shadow-sm"
            aria-label={copy.back}
          >
            <Icon name={ar ? 'ChevronRight' : 'ChevronLeft'} className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-[color:var(--v2-ember-text)]">{copy.eyebrow}</p>
            <h1 className="text-2xl font-black tracking-tight">{copy.title}</h1>
          </div>
        </header>

        {screen.status === 'loading' && (
          <StateBlock
            variant="loading"
            title={copy.loadingTitle}
            body={copy.loadingBody}
            testId="steps-loading"
          />
        )}

        {screen.status === 'error' && (
          <StateBlock
            variant="error"
            title={copy.errorTitle}
            body={copy.errorBody}
            actions={[
              { label: copy.retry, onClick: () => void refresh(), primary: true },
              { label: copy.openSettings, onClick: onOpenSettings },
            ]}
            testId="steps-error"
          />
        )}

        {screen.status === 'ready' && !screen.model.hasData && (
          <StateBlock
            variant="empty"
            icon="Footprints"
            title={copy.emptyTitle}
            body={copy.emptyBody}
            actions={[{ label: copy.openSettings, onClick: onOpenSettings, primary: true }]}
            testId="steps-empty"
          />
        )}

        {model?.hasData && (
          <>
            <section className="overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card" data-testid="steps-filled">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-500">{copy.today}</p>
                  <p dir="ltr" className="mt-1 text-start font-mono text-4xl font-black tracking-tight text-[color:var(--v2-ember-text)]">
                    {number(model.today, lang)}
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={model.goalProgress}
                  aria-label={copy.ofGoal}
                  className="grid h-20 w-20 shrink-0 place-items-center rounded-full"
                  style={{ background: `conic-gradient(var(--v2-ember) ${model.goalProgress}%, rgb(var(--c-line)) 0)` }}
                >
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-surface font-mono text-sm font-black">{model.goalProgress}%</span>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-beige" aria-hidden="true">
                <div className="h-full rounded-full bg-[color:var(--v2-ember)]" style={{ width: `${model.goalProgress}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-ink-700">{model.remaining === 0 ? copy.goalReached : copy.remaining(number(model.remaining, lang))}</span>
                <span className="text-ink-500">{number(model.today, lang)} / {number(model.goal, lang)} · {copy.ofGoal}</span>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3" aria-label={copy.weeklyPattern}>
              <StatCard icon="CalendarDays" label={formatNumeralsIn(copy.week, lang)} value={number(model.weekTotal, lang)} />
              <StatCard icon="BarChart3" label={formatNumeralsIn(copy.month, lang)} value={number(model.monthTotal, lang)} />
              <StatCard
                icon="Trophy"
                label={copy.bestDay}
                value={model.best ? number(model.best.steps, lang) : '—'}
                detail={model.best ? localDate(model.best.date, lang) : undefined}
              />
              <StatCard icon="Flame" label={copy.streak} value={`${number(model.streakDays, lang)} ${copy.days}`} />
            </section>

            <section className="rounded-2xl border border-[color:var(--v2-amber)] bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-10 w-10 place-items-center rounded-xl text-ink-900"
                    style={{ background: 'color-mix(in srgb, var(--v2-amber) 16%, transparent)' }}
                  >
                    <Icon name="Ruler" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-500">{copy.distance}</p>
                    <p dir="ltr" className="font-mono text-xl font-black text-ink-900">{number(model.estimatedDistanceKm, lang, 2)} km</p>
                  </div>
                </div>
                <span className="rounded-full border border-[color:var(--v2-amber)] px-2.5 py-1 text-[11px] font-black text-ink-900">{copy.approximate}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">{formatNumeralsIn(copy.distanceBasis, lang)}</p>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
              <h2 className="text-sm font-black">{copy.weeklyPattern}</h2>
              <div className="mt-4 flex h-36 items-stretch gap-2" role="img" aria-label={`${formatNumeralsIn(copy.week, lang)}: ${number(model.weekTotal, lang)}`}>
                {model.week.map((day) => {
                  const max = Math.max(...model.week.map((item) => item.steps), 1)
                  const height = day.steps > 0 ? Math.max(8, Math.round((day.steps / max) * 100)) : 3
                  return (
                    <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <span className="text-[10px] font-bold tabular-nums text-ink-500">{day.steps > 0 ? number(day.steps, lang) : '—'}</span>
                      <span className="flex min-h-0 w-full flex-1 items-end justify-center" aria-hidden="true">
                        <span
                          className="w-full max-w-8 rounded-t-lg bg-[color:var(--v2-ember)]"
                          style={{ height: `${height}%`, opacity: day.steps > 0 ? 1 : 0.18 }}
                        />
                      </span>
                      <span className="text-[10px] font-bold text-ink-500">{localDayNumber(day.date, lang)}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {screen.status !== 'loading' && (
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-beige text-ink-700">
                <Icon name={health.enabled ? 'CheckCircle2' : 'Footprints'} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{copy.dataSource}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{healthNote}</p>
                {model?.hasData && (
                  <p className="mt-2 text-xs font-bold text-ink-700">
                    {copy.sourceLabels[model.source]}
                    {health.lastUpdate ? ` · ${copy.lastUpdated(new Date(health.lastUpdate).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en', { dateStyle: 'medium', timeStyle: 'short' }))}` : ''}
                  </p>
                )}
              </div>
            </div>
            {(model?.hasData || health.enabled) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                {health.enabled && (
                  <button type="button" onClick={() => void refresh()} data-testid="steps-refresh" className="btn-primary px-4 py-2.5 text-sm">
                    <Icon name="RefreshCw" className="h-4 w-4" />
                    {copy.refresh}
                  </button>
                )}
                <button type="button" onClick={onOpenSettings} className="btn-ghost px-4 py-2.5 text-sm">
                  <Icon name="Settings" className="h-4 w-4" />
                  {copy.openSettings}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, detail }: { icon: string; label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <Icon name={icon} className="h-4 w-4 text-[color:var(--v2-ember-text)]" />
      <p className="mt-3 text-xs font-bold text-ink-500">{label}</p>
      <p dir="ltr" className="mt-1 text-start font-mono text-lg font-black text-ink-900">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-ink-400">{detail}</p>}
    </article>
  )
}
