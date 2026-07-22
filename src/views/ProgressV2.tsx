import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { StateBlock } from '@/components/StateBlock'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { addLog } from '@/lib/measurementLog'
import { getDayStamp } from '@/lib/today'
import { useAppScrollReset } from '@/lib/useAppScrollReset'
import { inRange, LIMITS, sanitizeNumericInput } from '@/lib/validation'
import {
  buildProgressV2Model,
  type LiftLadder,
  type ProgressScreen,
  type RowTone,
  type SummaryRow,
  type WeightDetail,
} from '@/lib/progressV2Model'
import { buildWeeklyInsights } from '@/lib/insights'
import { InsightCardsView } from '@/lib/insights/InsightCardsView'
import { insightCopy } from '@/data/insightCopy'
// Strength system (this feature) — e1RM series + dated PR log for the detail.
import { getExercise } from '@/data/exercises'
import { e1rmSeries, currentBests, prHistory, type StrengthPR } from '@/lib/strength'

interface ProgressV2Props {
  lang: Lang
  onNavigate?: (route: AppRoute) => void
}

// Positive-signal green (matches the workout success moment) and a data-viz blue
// for the weight line / steady lifts. Chart hues are viz decisions, not brand
// tokens — kept explicit so both read correctly in the current preview theme.
const SUCCESS = 'var(--v2-green)'
const SUCCESS_TEXT = 'var(--v2-green-text)'
const BLUE = 'var(--v2-blue)'
const BLUE_TEXT = 'var(--v2-blue-text)'

const TONE_TEXT: Record<RowTone, string> = { good: '', neutral: 'text-ink-500', needsData: 'text-ink-400' }

/**
 * Progress v2 — Qimmah v2.1 (Slice 6, PDF §05). Preview-gated (ProgressView
 * branches here under isDesignV2). Three self-contained screens: the honest,
 * hedged Brief (home) → Weight detail (goal band) → Strength detail (per-lift
 * ladders). Every number comes from real local history; where there is none we
 * say so. No fake weight loss / PRs / body-fat / steps.
 */
export function ProgressV2({ lang, onNavigate }: ProgressV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [, setRevision] = useState(0)
  // The model reads the local-first stores; rebuilding on render makes a saved
  // measurement visible immediately without introducing a second UI cache.
  const model = buildProgressV2Model(customization, lang)
  const insights = buildWeeklyInsights(ar ? 'ar' : 'en')
  const insightsCopy = insightCopy(ar ? 'ar' : 'en')
  const [screen, setScreen] = useState<ProgressScreen>('home')
  useAppScrollReset(screen)
  const go = (r: AppRoute) => onNavigate?.(r)

  if (screen === 'weight') return <WeightDetailScreen model={model.weight} lang={lang} onBack={() => setScreen('home')} onLog={() => setScreen('log')} stale={model.stale.show ? model.stale.detailText : null} />
  if (screen === 'strength') return <StrengthDetailScreen strength={model.strength} lang={lang} onBack={() => setScreen('home')} onTrain={() => go('workout')} />
  if (screen === 'log') {
    return (
      <WeightLogScreen
        lang={lang}
        current={model.weight}
        onBack={() => setScreen('weight')}
        onSaved={() => {
          setRevision((value) => value + 1)
          setScreen('weight')
        }}
      />
    )
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-6 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md space-y-5">
        <header className="pt-1">
          <div className="flex items-center justify-between">
            <p className="v2-text-blue text-xs font-black uppercase tracking-wider">{t('التقدّم', 'Progress')}</p>
            {model.goalLabel && <span className="v2-bg-blue-soft v2-text-blue rounded-full border border-[color:var(--v2-blue)] px-3 py-1 text-xs font-bold">{model.goalLabel}</span>}
          </div>
          {/* Hedged header — always «يبدو…», never a verdict. */}
          <h1 className="mt-2 text-2xl font-black leading-snug tracking-tight">{model.headline}</h1>
        </header>

        {/* Brief — last 14 days */}
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="v2-text-blue"><Icon name="Sparkles" className="h-4 w-4" /></span>
            <p className="v2-text-blue text-xs font-black uppercase tracking-wider">{model.period.label}</p>
          </div>
          <div className="mt-4 space-y-3">
            {model.summary.map((row) => <BriefRow key={row.key} row={row} />)}
          </div>
          {/* رؤى الأسبوع — بطاقات المحرّك المُحوَّطة (فعل + وجهة، أو «نحتاج المزيد»). */}
          <div className="mt-4 border-t border-line pt-4">
            <InsightCardsView cards={insights.cards} lang={ar ? 'ar' : 'en'} onNavigate={go} title={insightsCopy.progressTitle} max={1} />
          </div>
          {model.stale.show && (
            <button type="button" onClick={() => setScreen('weight')} className="mt-4 flex w-full items-center justify-between gap-2 border-t border-line pt-3 text-start">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink-500">
                <Icon name="Clock" className="h-4 w-4 shrink-0" />
                <span className="min-w-0">{model.stale.text}</span>
              </span>
              <span className="v2-text-blue shrink-0 text-xs font-black">{model.stale.actionLabel} ›</span>
            </button>
          )}
        </section>

        {/* Training momentum — area chart of real session volumes */}
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black">{model.momentum.label}</span>
            <span className="text-xs font-bold text-ink-500">{model.momentum.hasData ? t(`آخر ${model.momentum.weeks} جلسات`, `Last ${model.momentum.weeks} sessions`) : t('لا بيانات بعد', 'No data yet')}</span>
          </div>
          {model.momentum.hasData
            ? <MomentumArea values={model.momentum.series.map((p) => p.value)} lang={lang} />
            : <NeedsData text={t('أكمل تمارينك ليظهر زخمك هنا.', 'Complete workouts to see your momentum here.')} />}
        </section>

        {/* Weight + strength tiles → detail screens */}
        <section className="grid grid-cols-2 gap-3">
          <Tile
            icon="TrendingDown"
            title={t('الوزن والجسم', 'Weight & body')}
            main={model.weight.currentKg ? `${model.weight.currentKg} ${t('كجم', 'kg')}` : t('غير مسجّل', 'Not logged')}
            sub={model.weight.targetKg ? t(`الهدف ${model.weight.targetKg}`, `Target ${model.weight.targetKg}`) : t('سجّل وزنك', 'Log weight')}
            onClick={() => setScreen('weight')}
          />
          <Tile
            icon="Dumbbell"
            title={t('القوة', 'Strength')}
            main={model.strength.hasData ? t(`${model.strength.lifts.length} تمارين`, `${model.strength.lifts.length} lifts`) : t('لا بيانات', 'No data')}
            sub={model.strength.improvedCount > 0 ? t(`تحسّن ${model.strength.improvedCount}`, `${model.strength.improvedCount} up`) : t('أكمل تمرينين', 'Do two workouts')}
            onClick={() => setScreen('strength')}
          />
        </section>

        {/* Recovery entry (v1.1) — self-reported check-in + suggestion (screens 37–39). */}
        <button type="button" onClick={() => go('recovery')} className="press flex w-full items-center gap-3 rounded-2xl border bg-surface px-4 py-3 text-start" style={{ borderColor: 'var(--v2-teal)' }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--v2-teal) 14%, transparent)', color: 'var(--v2-teal-text)' }}><Icon name="Activity" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t('التعافي', 'Recovery')}</span>
            <span className="block text-xs text-ink-500">{t('سجّل شعورك — مؤشّر ذاتي، غير طبي', 'Log how you feel — self-reported, not medical')}</span>
          </span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>

        <p className="px-1 text-center text-[0.7rem] text-ink-400">{model.disclaimer}</p>
      </div>
    </div>
  )
}

// ── Real measurement logging ─────────────────────────────────────────────────

function WeightLogScreen({ lang, current, onBack, onSaved }: { lang: Lang; current: WeightDetail; onBack: () => void; onSaved: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [weight, setWeight] = useState(current.currentKg ? String(current.currentKg) : '')
  const [waist, setWaist] = useState(current.waistCm ? String(current.waistCm) : '')
  const [bodyFat, setBodyFat] = useState(current.bodyFatPct ? String(current.bodyFatPct) : '')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const weightKg = Number(weight)
    const waistCm = waist === '' ? null : Number(waist)
    const bodyFatPercent = bodyFat === '' ? null : Number(bodyFat)
    if (!inRange(weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max)) {
      setError(t('أدخل وزنًا بين 15 و250 كجم.', 'Enter a weight between 15 and 250 kg.'))
      return
    }
    if (waistCm !== null && !inRange(waistCm, 30, 250)) {
      setError(t('أدخل محيط خصر بين 30 و250 سم.', 'Enter a waist measurement between 30 and 250 cm.'))
      return
    }
    if (bodyFatPercent !== null && !inRange(bodyFatPercent, 2, 70)) {
      setError(t('أدخل نسبة دهون بين 2% و70%.', 'Enter body fat between 2% and 70%.'))
      return
    }

    const values: Record<string, string | number> = { weightKg }
    if (waistCm !== null) values.waistCm = waistCm
    if (bodyFatPercent !== null) values.bodyFatPercent = bodyFatPercent
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `measurement-${Date.now()}`
    addLog({ id, date: getDayStamp(), values })
    setError(null)
    onSaved()
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-6 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface">
            <Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <h1 className="text-lg font-black">{t('تسجيل قياسات اليوم', 'Log today’s measurements')}</h1>
        </div>

        <form onSubmit={submit} className="mt-5 rounded-3xl border border-line bg-surface p-5 shadow-card" noValidate>
          <p className="text-sm leading-relaxed text-ink-500">{t('سجّل وزنك، وأضف الخصر أو نسبة الدهون إن قستها اليوم.', 'Log your weight, and add waist or body fat if measured today.')}</p>
          <div className="mt-5 space-y-4">
            <MeasurementField id="v2-weight" label={t('الوزن', 'Weight')} unit={t('كجم', 'kg')} value={weight} required error={!!error && !inRange(Number(weight), LIMITS.weightKg.min, LIMITS.weightKg.max)} onChange={(value) => setWeight(sanitizeNumericInput(value, { max: LIMITS.weightKg.max, decimal: true }))} />
            <MeasurementField id="v2-waist" label={t('محيط الخصر', 'Waist')} unit={t('سم', 'cm')} value={waist} onChange={(value) => setWaist(sanitizeNumericInput(value, { max: 250, decimal: true }))} />
            <MeasurementField id="v2-body-fat" label={t('نسبة الدهون · تقديري', 'Body fat · estimated')} unit="%" value={bodyFat} onChange={(value) => setBodyFat(sanitizeNumericInput(value, { max: 70, decimal: true }))} />
          </div>

          {error && (
            <p id="measurement-error" role="alert" className="v2-error-panel mt-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold text-ink-900">
              <Icon name="AlertCircle" className="v2-error-icon mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" className="btn-primary mt-5 w-full py-4 text-[1.1875rem]">{t('احفظ القياسات', 'Save measurements')}</button>
        </form>
        <p className="mt-3 px-2 text-center text-[0.7rem] leading-relaxed text-ink-400">{t('تُحفظ القياسات في حسابك عند تفعيل المزامنة.', 'Measurements sync to your account when cloud sync is enabled.')}</p>
      </div>
    </div>
  )
}

function MeasurementField({ id, label, unit, value, required = false, error = false, onChange }: { id: string; label: string; unit: string; value: string; required?: boolean; error?: boolean; onChange: (value: string) => void }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="text-xs text-ink-400">{unit}</span>
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        required={required}
        aria-invalid={error || undefined}
        aria-describedby={error ? 'measurement-error' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn('input w-full text-start text-lg font-black tabular-nums', error && 'input-invalid')}
      />
    </label>
  )
}

function BriefRow({ row }: { row: SummaryRow }) {
  const good = row.tone === 'good'
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0" style={good ? { color: SUCCESS_TEXT } : undefined}>
        <Icon name={row.icon} className={cn('h-4.5 w-4.5', !good && TONE_TEXT[row.tone])} />
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold">
        {row.text}{row.value && <> <b className="tabular-nums text-ink-900">{row.value}</b></>}
      </span>
      <span className="shrink-0 text-xs font-black" style={good ? { color: SUCCESS_TEXT } : undefined}>
        <span className={good ? '' : row.tone === 'needsData' ? 'text-ink-400' : 'text-ink-500'}>{row.tag}</span>
      </span>
    </div>
  )
}

function Tile({ icon, title, main, sub, onClick }: { icon: string; title: string; main: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="v2-pressable rounded-2xl border border-line bg-surface p-4 text-start hover:border-[color:var(--v2-blue)]">
      <span className="flex items-center gap-2 text-xs font-bold text-ink-500"><Icon name={icon} className="h-4 w-4" />{title}</span>
      <p className="mt-2 text-lg font-black tabular-nums">{main}</p>
      <p className="text-xs text-ink-500">{sub}</p>
    </button>
  )
}

// Reuses the unified StateBlock (empty variant) — icon + text, never text-only,
// so "needs more data" reads consistently with every other system state.
function NeedsData({ text }: { text: string }) {
  return <StateBlock variant="empty" icon="LineChart" title={text} className="mt-3" />
}

// ── Weight detail ─────────────────────────────────────────────────────────────

function WeightDetailScreen({ model, lang, onBack, onLog, stale }: { model: WeightDetail; lang: Lang; onBack: () => void; onLog: () => void; stale: string | null }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const down = model.changeKg !== null && model.changeKg < 0
  const up = model.changeKg !== null && model.changeKg > 0
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-6 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h1 className="text-lg font-black">{t('الوزن والجسم', 'Weight & body')}</h1>
        </div>

        {/* current + change */}
        <div className="mt-5 flex items-end justify-between">
          <p className="text-4xl font-black tabular-nums">{model.currentKg ?? '—'}<span className="ms-1 text-sm font-bold text-ink-400">{t('كجم', 'kg')}</span></p>
          <div className="text-end text-sm font-bold">
            {model.changeKg !== null && (
              <span className="inline-flex items-center gap-1" style={{ color: down ? SUCCESS_TEXT : up ? BLUE_TEXT : undefined }}>
                <Icon name={down ? 'TrendingDown' : up ? 'TrendingUp' : 'Minus'} className="h-4 w-4" />
                <span className="tabular-nums">{Math.abs(model.changeKg)}</span>
              </span>
            )}
            {model.targetKg && <span className="ms-2 text-ink-500">{t(`الهدف ${model.targetKg}`, `Target ${model.targetKg}`)}</span>}
          </div>
        </div>

        {/* line chart with goal band */}
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          {model.series.length >= 2
            ? <WeightLine series={model.series.map((p) => p.kg)} band={model.band} />
            : <NeedsData text={t('سجّل وزنك مرتين على الأقل لرسم الاتجاه.', 'Log your weight at least twice to draw the trend.')} />}
          <div className="mt-2 flex items-center justify-between text-[0.7rem] font-bold text-ink-400">
            <span>{t('الآن', 'Now')}</span>
            {model.band && <span style={{ color: SUCCESS_TEXT }}>{t(`نطاق الهدف ${model.band[0]}–${model.band[1]}`, `Goal band ${model.band[0]}–${model.band[1]}`)}</span>}
          </div>
        </div>

        {/* waist + body fat */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-bold text-ink-500">{t('الخصر', 'Waist')}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{model.waistCm ?? '—'}<span className="ms-1 text-xs font-bold text-ink-400">{t('سم', 'cm')}</span></p>
            {model.waistChangeCm !== null && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold" style={{ color: model.waistChangeCm < 0 ? SUCCESS_TEXT : model.waistChangeCm > 0 ? BLUE_TEXT : undefined }}>
                <Icon name={model.waistChangeCm < 0 ? 'TrendingDown' : model.waistChangeCm > 0 ? 'TrendingUp' : 'Minus'} className="h-3.5 w-3.5" />
                <span className="tabular-nums">{Math.abs(model.waistChangeCm)} {t('سم', 'cm')}</span>
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-bold text-ink-500">{t('نسبة الدهون', 'Body fat')}</p>
            {model.bodyFatPct !== null ? (
              <>
                <p className="mt-1 text-2xl font-black tabular-nums">~{model.bodyFatPct}<span className="ms-0.5 text-xs font-bold text-ink-400">%</span></p>
                <p className="mt-0.5 text-xs font-bold text-ink-400">{t('تقديري', 'Estimated')}</p>
              </>
            ) : (
              <p className="mt-1 text-xs text-ink-400">{t('غير مسجّلة', 'Not logged')}</p>
            )}
          </div>
        </div>

        {/* stale waist callout */}
        {stale && (
          <button type="button" onClick={onLog} className="v2-info-panel v2-pressable mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-start">
            <span className="v2-text-blue flex min-w-0 items-center gap-2 text-sm font-bold">
              <Icon name="Clock" className="h-4 w-4 shrink-0" /><span className="min-w-0">{stale}</span>
            </span>
            <span className="v2-text-blue shrink-0 text-xs font-black">{t('قِس', 'Measure')} ›</span>
          </button>
        )}

        <button type="button" onClick={onLog} className="btn-primary mt-4 w-full py-4 text-[1.1875rem]">{t('تسجيل وزن اليوم', 'Log today’s weight')}</button>
      </div>
    </div>
  )
}

// ── Strength detail ───────────────────────────────────────────────────────────

function StrengthDetailScreen({ strength, lang, onBack, onTrain }: { strength: import('@/lib/progressV2Model').StrengthDetail; lang: Lang; onBack: () => void; onTrain: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-6 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h1 className="text-lg font-black">{t('تطوّر القوة', 'Strength progress')}</h1>
        </div>

        {/* hedged headline */}
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3">
          <span style={strength.improvedCount > 0 ? { color: SUCCESS_TEXT } : undefined}><Icon name="Diamond" className="h-4 w-4" /></span>
          <p className="text-sm font-bold">{strength.headline}</p>
        </div>

        {strength.hasData ? (
          <>
            <div className="mt-4 space-y-3">
              {strength.lifts.map((lift) => <LiftRow key={lift.exerciseId} lift={lift} lang={lang} />)}
            </div>
            <PRLog exerciseIds={strength.lifts.map((l) => l.exerciseId)} lang={lang} />
          </>
        ) : (
          <>
            <NeedsData text={t('أكمل تمرينين على الأقل لنعرض تطوّر قوّتك لكل تمرين.', 'Complete at least two workouts to show per-lift progress.')} />
            <button type="button" onClick={onTrain} className="btn-primary mt-4 w-full py-4 text-[1.1875rem]">{t('ابدأ تمرينًا', 'Start a workout')}</button>
          </>
        )}
      </div>
    </div>
  )
}

function LiftRow({ lift, lang }: { lift: LiftLadder; lang: Lang }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const positive = lift.status === 'pr' || lift.status === 'up'
  const statusColor = positive ? SUCCESS_TEXT : BLUE
  const statusLabel = lift.status === 'pr'
    ? t('رقم قياسي', 'PR')
    : lift.status === 'up'
      ? `↑ ${lift.deltaKg ?? ''}`
      : t('ثابت', 'Steady')
  const bests = currentBests(lift.exerciseId)
  const series = e1rmSeries(lift.exerciseId).map((p) => p.e1rm)
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4', lift.status === 'pr' && 'v2-earned-moment')}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-black"><bdi>{lift.name}</bdi></p>
        <p className="text-xs font-bold tabular-nums text-ink-500">
          {lift.bestKg} {t('كجم', 'kg')} · <span style={{ color: statusColor }}>{statusLabel}</span>
        </p>
      </div>
      {/* per-lift ladder — the leading rung is coloured by trend, the rest are
          empty rungs (matches PDF §05: one bold block + outlined slots). */}
      <div className="mt-3 flex gap-1.5" role="img" aria-label={`${lift.name} · ${lift.bestKg} ${t('كجم', 'kg')} · ${statusLabel}`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-8 flex-1 rounded-md border" style={{ background: i === 0 ? statusColor : 'transparent', borderColor: i === 0 ? statusColor : 'rgb(var(--c-line))' }} />
        ))}
      </div>
      {/* e1RM sparkline + estimated 1RM (hedged «تقديري»). */}
      {series.length >= 2 && (
        <div className="mt-3 flex items-center gap-3">
          <E1rmSparkline values={series} />
          {bests.e1RM != null && (
            <span className="shrink-0 text-[0.7rem] font-bold tabular-nums text-ink-400">
              e1RM ~{bests.e1RM} {t('كجم · تقديري', 'kg · est.')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Mini e1RM trend sparkline (static SVG — reduced-motion-safe). */
function E1rmSparkline({ values }: { values: number[] }) {
  const W = 120, H = 28, P = 3
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const n = values.length
  const x = (i: number) => (n <= 1 ? W / 2 : P + (i * (W - 2 * P)) / (n - 1))
  const y = (v: number) => H - P - ((v - min) / span) * (H - 2 * P)
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 flex-1" preserveAspectRatio="none" role="img" aria-label="e1RM trend">
      <path d={line} fill="none" stroke={SUCCESS_TEXT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(values[n - 1])} r={2.5} fill={SUCCESS_TEXT} />
    </svg>
  )
}

/** Dated PR log — merged across lifts, newest first, honest per §05. */
function PRLog({ exerciseIds, lang }: { exerciseIds: string[]; lang: Lang }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const log: StrengthPR[] = exerciseIds
    .flatMap((id) => prHistory(id))
    .sort((a, b) => Date.parse(`${b.date}T00:00:00`) - Date.parse(`${a.date}T00:00:00`))
    .slice(0, 8)
  if (log.length === 0) return null
  return (
    <section className="mt-5">
      <p className="mb-2 text-sm font-black">{t('دفتر الأرقام القياسية', 'PR log')}</p>
      <div className="space-y-1.5">
        {log.map((pr, i) => {
          const e = getExercise(pr.exerciseId)
          return (
            <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-xs">
              <span className="min-w-0 font-bold"><bdi>{ar ? e?.nameAr ?? pr.exerciseId : e?.nameEn ?? pr.exerciseId}</bdi> · <span className="text-ink-500">{pr.kind}</span></span>
              <span className="shrink-0 font-black tabular-nums" style={{ color: SUCCESS_TEXT }}>{pr.valueKg} {t('كجم', 'kg')} <span className="font-normal text-ink-400">· {pr.date}</span></span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Local SVG charts (no external libs) ───────────────────────────────────────

function MomentumArea({ values, lang }: { values: number[]; lang: Lang }) {
  const ar = lang !== 'en'
  const W = 320, H = 96, P = 4
  const n = values.length
  const min = Math.min(...values), max = Math.max(...values)
  // Baseline below the minimum so a gentle upward trend is visible (values are
  // often close together); the area still fills to the bottom edge.
  const spread = max - min || max || 1
  const lo = min - spread * 0.5, hi = max + spread * 0.1
  const x = (i: number) => (n <= 1 ? W / 2 : P + (i * (W - 2 * P)) / (n - 1))
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P)
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-24 w-full" preserveAspectRatio="none" role="img" aria-label={ar ? 'مخطّط زخم التدريب' : 'Training momentum chart'}>
      <defs>
        <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BLUE} stopOpacity="0.35" />
          <stop offset="100%" stopColor={BLUE} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#momentumFill)" />
      <path d={line} fill="none" stroke={BLUE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="v2-fill" />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={BLUE} />)}
    </svg>
  )
}

function WeightLine({ series, band }: { series: number[]; band: [number, number] | null }) {
  const W = 320, H = 120, P = 6
  const all = band ? [...series, band[0], band[1]] : series
  const min = Math.min(...all), max = Math.max(...all)
  const span = max - min || 1
  const n = series.length
  const x = (i: number) => (n <= 1 ? W / 2 : P + (i * (W - 2 * P)) / (n - 1))
  const y = (v: number) => P + (1 - (v - min) / span) * (H - 2 * P)
  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Weight trend">
      {band && (
        <>
          <rect x={0} y={y(band[1])} width={W} height={Math.max(2, y(band[0]) - y(band[1]))} fill={SUCCESS} opacity={0.12} />
          <line x1={0} y1={y((band[0] + band[1]) / 2)} x2={W} y2={y((band[0] + band[1]) / 2)} stroke={SUCCESS} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7} />
        </>
      )}
      <path d={line} fill="none" stroke={BLUE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {series.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4 : 2.5} fill={BLUE} />)}
    </svg>
  )
}
