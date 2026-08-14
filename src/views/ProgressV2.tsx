import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { Icon } from '@/components/Icon'
import { ScreenHeader } from '@/components/ScreenHeader'
import { StateBlock } from '@/components/StateBlock'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { useAccess } from '@/lib/access/useAccess'
import { addLog, deleteLog, loadLogs, updateLog } from '@/lib/measurementLog'
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
import { eCalcStrings } from '@/i18n/dict/eCalc'
import { measurementsScreenStrings } from '@/i18n/dict/measurementsScreen'
import type { MeasurementLog } from '@/types/progress'
// Strength system (this feature) — e1RM series + dated PR log for the detail.
import { getExercise } from '@/data/exercises'
import { e1rmSeries, currentBests, prHistory, type StrengthPR } from '@/lib/strength'
import { formatNumber } from '@/lib/numberFormat'

// محرّك المجسّم ثقيل — يبقى خارج حزمة الشاشة حتى تُفتح فعلًا.
const BodyModel3D = lazy(() => import('@/components/BodyModel3D').then((mod) => ({ default: mod.BodyModel3D })))

interface ProgressV2Props {
  lang: Lang
  onNavigate?: (route: AppRoute) => void
}

// لوحة الهوية الكلاسيكية بأدوار دلالية: الأخضر يؤكّد تقدّمًا مقاسًا، ولون الهوية
// (DATA) يحمل قصّة البيانات الأساسية، والكهرماني (ESTIMATE) يوسم التقديرات.
// الأزرق ليس لون رسم بياني — يبقى للروابط وحدها.
const SUCCESS = '#3E9E6B'
const SUCCESS_TEXT = '#2F7B53'
const DATA = 'var(--c-primary)'
const DATA_TEXT = 'var(--c-primary)'
const ESTIMATE = '#e0941f'

const TONE_TEXT: Record<RowTone, string> = { good: '', neutral: 'text-ink-500', needsData: 'text-ink-400' }

/**
 * Progress — Qimmah Design Standard v3.0, area 48–62. Three self-contained
 * screens: the honest, hedged Brief (home) → Weight detail (goal band) →
 * Strength detail (per-lift ladders). Every number comes from real local
 * history; where there is none we say so. No fake weight loss / PRs / body-fat
 * / steps.
 */
export function ProgressV2({ lang, onNavigate }: ProgressV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const num = (value: number) => formatNumber(value, lang, { maximumFractionDigits: 1 })
  const [, setRevision] = useState(0)
  // The model reads the local-first stores; rebuilding on render makes a saved
  // measurement visible immediately without introducing a second UI cache.
  const model = buildProgressV2Model(customization, lang)
  const insights = buildWeeklyInsights(ar ? 'ar' : 'en')
  const insightsCopy = insightCopy(ar ? 'ar' : 'en')
  const calcCopy = eCalcStrings[lang]
  const [screen, setScreen] = useState<ProgressScreen>('home')
  useAppScrollReset(screen)
  const go = (r: AppRoute) => onNavigate?.(r)

  if (screen === 'weight') return <WeightDetailScreen model={model.weight} lang={lang} onBack={() => setScreen('home')} onLog={() => setScreen('log')} onExplain={() => go('calc')} stale={model.stale.show ? model.stale.detailText : null} />
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
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <ScreenHeader
        icon="BarChart3"
        title={t('التقدّم', 'Progress')}
        action={
          model.goalLabel ? (
            <span className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-c">{model.goalLabel}</span>
          ) : undefined
        }
      />

      <div className="space-y-4">
        {/* عنوان محوّط — «يبدو…» دائمًا، لا حكم قاطع. */}
        <h2 className="text-base font-black leading-snug text-ink-900">{model.headline}</h2>

        {/* الملخّص — آخر ١٤ يومًا */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <span className="text-primary-c"><Icon name="Sparkles" className="h-4 w-4" /></span>
            <p className="text-xs font-bold text-ink-500">{model.period.label}</p>
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
              <span className="shrink-0 text-xs font-black text-primary-c">{model.stale.actionLabel} ›</span>
            </button>
          )}
        </section>

        {/* Training momentum — area chart of real session volumes */}
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-ink-900">{model.momentum.label}</span>
            <span className="text-[11px] font-bold text-ink-400">{model.momentum.hasData ? t(`آخر ${num(model.momentum.weeks)} جلسات`, `Last ${num(model.momentum.weeks)} sessions`) : t('لا بيانات بعد', 'No data yet')}</span>
          </div>
          {model.momentum.hasData
            ? <MomentumArea values={model.momentum.series.map((p) => p.value)} lang={lang} />
            : <NeedsData text={t('أكمل تمارينك ليظهر زخمك هنا.', 'Complete workouts to see your momentum here.')} />}
        </section>

        {/* مجسّم العضلات — أي عضلة درّبتها هذا الأسبوع تُضيء بشدّة تتناسب مع حجم
            تدريبها. يُحمَّل كسولًا: محرّك الرسم (~2.5k سطر + canvas) لا يدخل حزمة
            شاشة التقدّم ولا يُجلب إلا عند وصول المستخدم إليها. */}
        <Suspense fallback={<div className="card h-64" aria-hidden="true" />}>
          <BodyModel3D lang={lang} />
        </Suspense>

        {/* Weight + strength tiles → detail screens */}
        <section className="grid grid-cols-2 gap-3">
          <Tile
            icon="TrendingDown"
            title={t('الوزن والجسم', 'Weight & body')}
            main={model.weight.currentKg ? `${num(model.weight.currentKg)} ${t('كجم', 'kg')}` : t('غير مسجّل', 'Not logged')}
            sub={model.weight.targetKg ? t(`الهدف ${num(model.weight.targetKg)}`, `Target ${num(model.weight.targetKg)}`) : t('سجّل وزنك', 'Log weight')}
            onClick={() => setScreen('weight')}
          />
          <Tile
            icon="Dumbbell"
            title={t('القوة', 'Strength')}
            main={model.strength.hasData ? t(`${num(model.strength.lifts.length)} تمارين`, `${num(model.strength.lifts.length)} lifts`) : t('لا بيانات', 'No data')}
            sub={model.strength.improvedCount > 0 ? t(`تحسّن ${num(model.strength.improvedCount)}`, `${num(model.strength.improvedCount)} up`) : t('أكمل تمرينين', 'Do two workouts')}
            onClick={() => setScreen('strength')}
          />
        </section>

        <button
          type="button"
          onClick={() => go('measurements')}
          data-testid="progress-measurements-entry"
          className="card flex min-h-[64px] w-full items-center gap-3 p-4 text-start transition-colors hover:border-primary-soft"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Scale" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-ink-900">{measurementsScreenStrings[lang].progressEntryTitle}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{measurementsScreenStrings[lang].progressEntryBody}</span>
          </span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>

        <button
          type="button"
          onClick={() => go('calc')}
          data-testid="progress-calc-link"
          className="card flex w-full items-center gap-3 p-5 text-start transition-colors hover:border-primary-soft"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c">
            <Icon name="Calculator" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-ink-900">{calcCopy.progressLink}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{calcCopy.progressLinkDetail}</span>
          </span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>

        {/* Recovery entry (v1.1) — self-reported check-in + suggestion (screens 37–39). */}
        <button type="button" onClick={() => go('recovery')} className="card flex w-full items-center gap-3 p-5 text-start transition-colors hover:border-primary-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c"><Icon name="Activity" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-ink-900">{t('التعافي', 'Recovery')}</span>
            <span className="block text-xs leading-relaxed text-ink-500">{t('سجّل شعورك — مؤشّر ذاتي، غير طبي', 'Log how you feel — self-reported, not medical')}</span>
          </span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>

        <button type="button" onClick={() => go('steps')} className="card flex w-full items-center gap-3 p-5 text-start transition-colors hover:border-primary-soft">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-c"><Icon name="Footprints" className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-ink-900">{t('خطواتك', 'Your steps')}</span>
            <span className="block text-xs leading-relaxed text-ink-500">{t('اليوم والأسبوع والشهر من سجلك الفعلي', 'Today, week and month from your real log')}</span>
          </span>
          <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
        </button>

        <p className="mt-6 flex items-start gap-2 text-[11px] text-ink-400"><Icon name="Info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{model.disclaimer}</p>
      </div>
    </div>
  )
}

// ── Real measurement history + logging ───────────────────────────────────────

interface MeasurementsV2Props {
  lang: Lang
  onBack: () => void
}

function numericValue(log: MeasurementLog, key: string): number | null {
  const raw = log.values[key]
  if (raw === undefined || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function measurementDate(stamp: string, lang: Lang): string {
  const date = new Date(`${stamp}T00:00:00`)
  if (Number.isNaN(date.getTime())) return stamp
  return new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'ar', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/**
 * Canonical Measurements route. It reads and mutates the same historyStore used
 * by Progress and sync; no duplicate cache or backend shape is introduced.
 */
export function MeasurementsV2({ lang, onBack }: MeasurementsV2Props) {
  const { customization } = useCustomization()
  const { guard } = useAccess()
  const d = measurementsScreenStrings[lang]
  const ar = lang !== 'en'
  const num = (value: number) => formatNumber(value, lang, { maximumFractionDigits: 1 })
  const [editor, setEditor] = useState<MeasurementLog | 'new' | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setRevision] = useState(0)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)
  const logs = loadLogs().slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
  })
  const current = buildProgressV2Model(customization, lang).weight

  useAppScrollReset(editor ? 'editor' : 'history')
  useEffect(() => {
    if (deleteCandidate) cancelDeleteRef.current?.focus()
  }, [deleteCandidate])

  if (editor) {
    return (
      <WeightLogScreen
        lang={lang}
        current={current}
        editing={editor === 'new' ? undefined : editor}
        onBack={() => setEditor(null)}
        onSaved={() => {
          setRevision((value) => value + 1)
          setEditor(null)
          setError(null)
        }}
      />
    )
  }

  const confirmDelete = guard('progress.logMeasurement', () => {
    if (!deleteCandidate) return
    const outcome = deleteLog(deleteCandidate)
    if (outcome.result !== 'ok') {
      setError(outcome.result === 'error' ? d.unavailableRecord : d.storageError)
      return
    }
    setDeleteCandidate(null)
    setError(null)
    setRevision((value) => value + 1)
  })

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900" data-testid="measurements-view">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} aria-label={d.backToProgress} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface">
          <Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
        </button>
        <h1 className="text-lg font-black">{d.title}</h1>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-500">{d.intro}</p>
      <button type="button" onClick={() => setEditor('new')} className="btn-primary mt-4 min-h-[48px] w-full justify-center text-base" data-testid="measurements-add">
        <Icon name="Plus" className="h-5 w-5" />
        {d.add}
      </button>

      {error && (
        <p role="alert" data-testid="measurements-error" className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/[0.06] p-3 text-sm font-bold leading-relaxed text-danger">
          <Icon name="AlertCircle" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <section className="mt-5" aria-labelledby="measurement-history-title">
        <h2 id="measurement-history-title" className="text-base font-black">{d.historyTitle}</h2>
        {logs.length === 0 ? (
          <StateBlock
            variant="empty"
            icon="Scale"
            title={d.emptyTitle}
            body={d.emptyBody}
            className="mt-3"
            testId="measurements-empty"
            actions={[{ label: d.add, onClick: () => setEditor('new'), primary: true }]}
          />
        ) : (
          <ul className="mt-3 space-y-3" data-testid="measurements-history">
            {logs.map((log) => {
              const weight = numericValue(log, 'weightKg')
              const waist = numericValue(log, 'waistCm')
              const bodyFat = numericValue(log, 'bodyFatPercent')
              const editable = log.source !== 'health' && weight !== null
              const confirming = deleteCandidate === log.id
              return (
                <li key={log.id} className="card p-4" data-testid={`measurement-row-${log.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <time dateTime={log.date} className="text-xs font-bold text-ink-500">{measurementDate(log.date, lang)}</time>
                      {weight !== null && <p className="mt-1 font-mono text-2xl font-black tabular-nums">{num(weight)} <span className="font-sans text-xs text-ink-400">{d.kg}</span></p>}
                    </div>
                    {log.source === 'health' && <span className="rounded-full bg-beige px-2.5 py-1 text-[11px] font-bold text-ink-500">{d.healthSource}</span>}
                  </div>

                  {(waist !== null || bodyFat !== null) && (
                    <dl className="mt-3 grid grid-cols-2 gap-2">
                      {waist !== null && <div className="rounded-xl bg-page p-3"><dt className="text-[11px] font-bold text-ink-500">{d.waist}</dt><dd className="mt-0.5 font-mono text-sm font-black tabular-nums">{num(waist)} <span className="font-sans text-[10px] text-ink-400">{d.cm}</span></dd></div>}
                      {bodyFat !== null && <div className="rounded-xl bg-page p-3"><dt className="text-[11px] font-bold text-ink-500">{d.bodyFat} · {d.estimated}</dt><dd className="mt-0.5 font-mono text-sm font-black tabular-nums">~{num(bodyFat)}%</dd></div>}
                    </dl>
                  )}

                  {editable && !confirming && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
                      <button type="button" onClick={() => { setError(null); setEditor(log) }} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold text-ink-700">
                        <Icon name="Edit3" className="h-4 w-4" />{d.edit}
                      </button>
                      <button type="button" onClick={() => { setError(null); setDeleteCandidate(log.id) }} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-danger/40 text-sm font-bold text-danger">
                        <Icon name="Trash2" className="h-4 w-4" />{d.delete}
                      </button>
                    </div>
                  )}

                  {confirming && (
                    <section className="mt-3 rounded-xl border border-danger/40 bg-danger/[0.06] p-3" aria-labelledby={`delete-measurement-${log.id}`} data-testid="measurement-delete-confirm">
                      <h3 id={`delete-measurement-${log.id}`} className="text-sm font-black text-ink-900">{d.deleteQuestion}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">{d.deleteBody}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button ref={cancelDeleteRef} type="button" onClick={() => setDeleteCandidate(null)} className="min-h-[44px] rounded-xl border border-line bg-surface text-sm font-bold text-ink-700">{d.cancel}</button>
                        <button type="button" onClick={confirmDelete} className="min-h-[44px] rounded-xl border border-danger/40 bg-surface text-sm font-bold text-danger">{d.confirmDelete}</button>
                      </div>
                    </section>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function WeightLogScreen({ lang, current, editing, onBack, onSaved }: { lang: Lang; current: WeightDetail; editing?: MeasurementLog; onBack: () => void; onSaved: () => void }) {
  const ar = lang !== 'en'
  const d = measurementsScreenStrings[lang]
  const { guard } = useAccess()
  const [weight, setWeight] = useState(editing ? String(editing.values.weightKg ?? '') : current.currentKg ? String(current.currentKg) : '')
  const [waist, setWaist] = useState(editing ? String(editing.values.waistCm ?? '') : current.waistCm ? String(current.waistCm) : '')
  const [bodyFat, setBodyFat] = useState(editing ? String(editing.values.bodyFatPercent ?? '') : current.bodyFatPct ? String(current.bodyFatPct) : '')
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'weight' | 'waist' | 'bodyFat' | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const weightKg = Number(weight)
    const waistCm = waist === '' ? null : Number(waist)
    const bodyFatPercent = bodyFat === '' ? null : Number(bodyFat)
    if (!inRange(weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max)) {
      setError(d.weightRange)
      setErrorField('weight')
      return
    }
    if (waistCm !== null && !inRange(waistCm, 30, 250)) {
      setError(d.waistRange)
      setErrorField('waist')
      return
    }
    if (bodyFatPercent !== null && !inRange(bodyFatPercent, 2, 70)) {
      setError(d.bodyFatRange)
      setErrorField('bodyFat')
      return
    }

    guard('progress.logMeasurement', () => {
      const values: Record<string, string | number> = { weightKg }
      if (waistCm !== null) values.waistCm = waistCm
      if (bodyFatPercent !== null) values.bodyFatPercent = bodyFatPercent
      const id = editing?.id ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `measurement-${Date.now()}`)
      const outcome = editing
        ? updateLog({ ...editing, values })
        : addLog({ id, date: getDayStamp(), values })
      if (outcome.result !== 'ok') {
        setError(outcome.result === 'error' ? d.unavailableRecord : d.storageError)
        setErrorField(null)
        return
      }
      setError(null)
      setErrorField(null)
      onSaved()
    })()
  }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={d.back} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface">
            <Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
          </button>
          <h1 className="text-lg font-black">{editing ? d.editTitle : d.addTitle}</h1>
        </div>

        <form onSubmit={submit} className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-card" noValidate>
          <p className="text-sm leading-relaxed text-ink-500">{d.formIntro}</p>
          <div className="mt-5 space-y-4">
            <MeasurementField id="v2-weight" label={d.weight} unit={d.kg} value={weight} required error={errorField === 'weight'} onChange={(value) => setWeight(sanitizeNumericInput(value, { max: LIMITS.weightKg.max, decimal: true }))} />
            <MeasurementField id="v2-waist" label={d.waist} unit={d.cm} value={waist} error={errorField === 'waist'} onChange={(value) => setWaist(sanitizeNumericInput(value, { max: 250, decimal: true }))} />
            <MeasurementField id="v2-body-fat" label={`${d.bodyFat} · ${d.estimated}`} unit="%" value={bodyFat} error={errorField === 'bodyFat'} onChange={(value) => setBodyFat(sanitizeNumericInput(value, { max: 70, decimal: true }))} />
          </div>

          {error && (
            <p id="measurement-error" role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-danger bg-surface px-3 py-2.5 text-sm font-bold text-danger">
              <Icon name="AlertCircle" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" className="btn-primary mt-5 w-full py-4 text-[1.1875rem]">{editing ? d.update : d.save}</button>
        </form>
        <p className="mt-3 px-2 text-center text-[0.7rem] leading-relaxed text-ink-400">{d.syncNote}</p>
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
        {row.text}{row.value && <b className="ms-1 font-mono tabular-nums text-ink-900">{row.value}</b>}
      </span>
      <span className="shrink-0 text-xs font-black" style={good ? { color: SUCCESS_TEXT } : undefined}>
        <span className={good ? '' : row.tone === 'needsData' ? 'text-ink-400' : 'text-ink-500'}>{row.tag}</span>
      </span>
    </div>
  )
}

function Tile({ icon, title, main, sub, onClick }: { icon: string; title: string; main: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card min-h-28 p-4 text-start transition-colors hover:border-primary-soft">
      <span className="flex items-center gap-2 text-xs font-bold text-ink-500"><Icon name={icon} className="h-4 w-4" />{title}</span>
      <p className="mt-2 font-mono text-lg font-black tabular-nums">{main}</p>
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

function WeightDetailScreen({ model, lang, onBack, onLog, onExplain, stale }: { model: WeightDetail; lang: Lang; onBack: () => void; onLog: () => void; onExplain: () => void; stale: string | null }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const num = (value: number) => formatNumber(value, lang, { maximumFractionDigits: 1 })
  const calcCopy = eCalcStrings[lang]
  const down = model.changeKg !== null && model.changeKg < 0
  const up = model.changeKg !== null && model.changeKg > 0
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
          <h1 className="text-lg font-black">{t('الوزن والجسم', 'Weight & body')}</h1>
        </div>

        {/* current + change */}
        <div className="mt-5 flex items-end justify-between">
          <p className="font-mono text-4xl font-black tabular-nums">{model.currentKg === null ? '—' : num(model.currentKg)}<span className="ms-1 font-sans text-sm font-bold text-ink-400">{t('كجم', 'kg')}</span></p>
          <div className="text-end text-sm font-bold">
            {model.changeKg !== null && (
              <span className="inline-flex items-center gap-1" style={{ color: down ? SUCCESS_TEXT : up ? DATA_TEXT : undefined }}>
                <Icon name={down ? 'TrendingDown' : up ? 'TrendingUp' : 'Minus'} className="h-4 w-4" />
                <span className="font-mono tabular-nums">{num(Math.abs(model.changeKg))}</span>
              </span>
            )}
            {model.targetKg && <span className="ms-2 text-ink-500">{t(`الهدف ${num(model.targetKg)}`, `Target ${num(model.targetKg)}`)}</span>}
          </div>
        </div>

        {/* line chart with goal band */}
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          {model.series.length >= 2
            ? <WeightLine series={model.series.map((p) => p.kg)} band={model.band} />
            : <NeedsData text={t('سجّل وزنك مرتين على الأقل لرسم الاتجاه.', 'Log your weight at least twice to draw the trend.')} />}
          <div className="mt-2 flex items-center justify-between text-[0.7rem] font-bold text-ink-400">
            <span>{t('الآن', 'Now')}</span>
            {model.band && <span style={{ color: SUCCESS_TEXT }}>{t(`نطاق الهدف ${num(model.band[0])}–${num(model.band[1])}`, `Goal band ${num(model.band[0])}–${num(model.band[1])}`)}</span>}
          </div>
        </div>

        {/* waist + body fat */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-bold text-ink-500">{t('الخصر', 'Waist')}</p>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums">{model.waistCm === null ? '—' : num(model.waistCm)}<span className="ms-1 font-sans text-xs font-bold text-ink-400">{t('سم', 'cm')}</span></p>
            {model.waistChangeCm !== null && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold" style={{ color: model.waistChangeCm < 0 ? SUCCESS_TEXT : model.waistChangeCm > 0 ? DATA_TEXT : undefined }}>
                <Icon name={model.waistChangeCm < 0 ? 'TrendingDown' : model.waistChangeCm > 0 ? 'TrendingUp' : 'Minus'} className="h-3.5 w-3.5" />
                <span className="tabular-nums">{num(Math.abs(model.waistChangeCm))} {t('سم', 'cm')}</span>
              </p>
            )}
          </div>
          <div className="card p-4" style={{ borderColor: `color-mix(in srgb, ${ESTIMATE} 38%, transparent)` }}>
            <p className="text-xs font-bold text-ink-500">{t('نسبة الدهون', 'Body fat')}</p>
            {model.bodyFatPct !== null ? (
              <>
                <p className="mt-1 font-mono text-2xl font-black tabular-nums">~{num(model.bodyFatPct)}<span className="ms-0.5 text-xs font-bold">%</span></p>
                <p className="mt-0.5 text-xs font-bold" style={{ color: ESTIMATE }}>{t('تقديري', 'Estimated')}</p>
              </>
            ) : (
              <p className="mt-1 text-xs text-ink-400">{t('غير مسجّلة', 'Not logged')}</p>
            )}
          </div>
        </div>

        {/* stale waist callout */}
        {stale && (
          <button type="button" onClick={onLog} className="card mt-3 flex w-full items-center justify-between gap-2 px-4 py-3 text-start transition-colors hover:border-primary-soft">
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-primary-c">
              <Icon name="Clock" className="h-4 w-4 shrink-0" /><span className="min-w-0">{stale}</span>
            </span>
            <span className="shrink-0 text-xs font-black text-primary-c">{t('قِس', 'Measure')} ›</span>
          </button>
        )}

        <button type="button" onClick={onLog} className="btn-primary mt-4 w-full py-4 text-[1.1875rem]">{t('تسجيل وزن اليوم', 'Log today’s weight')}</button>
        <button
          type="button"
          onClick={onExplain}
          data-testid="weight-detail-calc-link"
          className="btn-ghost mt-2 w-full justify-center py-3 text-sm"
        >
          <Icon name="Calculator" className="h-4 w-4" />
          {calcCopy.progressLink}
        </button>
      </div>
    </div>
  )
}

// ── Strength detail ───────────────────────────────────────────────────────────

function StrengthDetailScreen({ strength, lang, onBack, onTrain }: { strength: import('@/lib/progressV2Model').StrengthDetail; lang: Lang; onBack: () => void; onTrain: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="overflow-x-hidden px-4 py-4 text-ink-900">
      <div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label={t('رجوع', 'Back')} className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
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
  const num = (value: number) => formatNumber(value, lang, { maximumFractionDigits: 1 })
  const positive = lift.status === 'pr' || lift.status === 'up'
  const statusColor = positive ? SUCCESS_TEXT : 'var(--c-ink-500)'
  const statusLabel = lift.status === 'pr'
    ? t('رقم قياسي', 'PR')
    : lift.status === 'up'
      ? `↑ ${lift.deltaKg === null ? '' : num(lift.deltaKg)}`
      : t('ثابت', 'Steady')
  const bests = currentBests(lift.exerciseId)
  const series = e1rmSeries(lift.exerciseId).map((p) => p.e1rm)
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4', lift.status === 'pr' && 'v2-earned-moment')}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-black"><bdi>{lift.name}</bdi></p>
        <p className="font-mono text-xs font-bold tabular-nums text-ink-500">
          {num(lift.bestKg)} {t('كجم', 'kg')} · <span style={{ color: statusColor }}>{statusLabel}</span>
        </p>
      </div>
      {/* per-lift ladder — the leading rung is coloured by trend, the rest are
          empty rungs (matches PDF §05: one bold block + outlined slots). */}
      <div className="mt-3 flex gap-1.5" role="img" aria-label={`${lift.name} · ${num(lift.bestKg)} ${t('كجم', 'kg')} · ${statusLabel}`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="h-8 flex-1 rounded-md border" style={{ background: i === 0 ? statusColor : 'transparent', borderColor: i === 0 ? statusColor : 'rgb(var(--c-line))' }} />
        ))}
      </div>
      {/* e1RM sparkline + estimated 1RM (hedged «تقديري»). */}
      {series.length >= 2 && (
        <div className="mt-3 flex items-center gap-3">
          <E1rmSparkline values={series} />
          {bests.e1RM != null && (
            <span className="shrink-0 font-mono text-[0.7rem] font-bold tabular-nums" style={{ color: ESTIMATE }}>
              e1RM ~{num(bests.e1RM)} {t('كجم · تقديري', 'kg · est.')}
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
      <path d={line} fill="none" stroke={ESTIMATE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(n - 1)} cy={y(values[n - 1])} r={2.5} fill={ESTIMATE} />
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
              <span className="shrink-0 font-mono font-black tabular-nums" style={{ color: SUCCESS_TEXT }}>{formatNumber(pr.valueKg, lang, { maximumFractionDigits: 1 })} {t('كجم', 'kg')} <span className="font-normal text-ink-400">· {pr.date}</span></span>
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
          <stop offset="0%" stopColor={DATA} stopOpacity="0.32" />
          <stop offset="100%" stopColor={DATA} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#momentumFill)" />
      <path d={line} fill="none" stroke={DATA} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={DATA} />)}
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
      <path d={line} fill="none" stroke={DATA} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {series.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === n - 1 ? 4 : 2.5} fill={DATA} />)}
    </svg>
  )
}
