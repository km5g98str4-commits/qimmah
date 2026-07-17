import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { LIVE_GYM_ENERGY_LEVELS, liveGymCopy } from '@/data/liveGym'
import type { Lang } from '@/lib/appPreferences'
import {
  elapsedWorkoutSec,
  freshHeartRate,
  remainingWorkoutSets,
  subscribeToHeartRate,
  type HeartRateReading,
} from '@/lib/liveWorkoutMetrics'

interface LiveGymDashboardProps {
  lang: Lang
  startedAt: number
  now: number
  currentExercise: string
  currentSet: number
  currentSetTotal: number
  completedSets: number
  totalSets: number
  restLeft: number
  isResting: boolean
  energy: 1 | 2 | 3 | 4 | 5
  onEnergyChange: (value: 1 | 2 | 3 | 4 | 5) => void
}

const DASH = {
  card: 'var(--v2-dark-paper)',
  cardActive: 'var(--v2-dark-paper-active)',
  line: 'var(--v2-dark-border)',
  ink: 'var(--v2-dark-ink-strong)',
  muted: 'var(--v2-dark-ink-muted)',
  faint: 'var(--v2-dark-ink-faint)',
  blue: 'var(--v2-blue)',
  teal: 'var(--v2-teal)',
  ember: 'var(--v2-ember)',
} as const

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`
}

function localNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en' : 'ar-SA', { useGrouping: false }).format(value)
}

export function LiveGymDashboard(props: LiveGymDashboardProps) {
  const { lang, now } = props
  const copy = liveGymCopy(lang)
  const [latestHeartRate, setLatestHeartRate] = useState<HeartRateReading | null>(null)

  useEffect(() => subscribeToHeartRate(setLatestHeartRate), [])

  const heartRate = freshHeartRate(latestHeartRate, now)
  const elapsed = elapsedWorkoutSec(props.startedAt, now)
  const remaining = remainingWorkoutSets(props.totalSets, props.completedSets)
  const selectedEnergy = useMemo(
    () => LIVE_GYM_ENERGY_LEVELS.find((item) => item.value === props.energy) ?? LIVE_GYM_ENERGY_LEVELS[2],
    [props.energy],
  )

  return (
    <section className="mx-4 mt-2 rounded-3xl p-3" style={{ background: DASH.card, border: `1px solid ${DASH.line}` }} aria-labelledby="live-gym-title" data-testid="live-gym-dashboard">
      <h2 id="live-gym-title" className="sr-only">{copy.dashboard}</h2>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl p-3" style={{ background: DASH.cardActive }}>
          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold" style={{ color: DASH.muted }}>
            <Icon name="Clock" className="h-3.5 w-3.5" />{copy.elapsed}
          </span>
          <time className="mt-1 block text-3xl font-black tabular-nums" dateTime={`PT${elapsed}S`} style={{ color: DASH.ink }} aria-label={`${copy.elapsed}: ${formatClock(elapsed)}`}>
            {formatClock(elapsed)}
          </time>
        </div>

        <div className="rounded-2xl p-3" style={{ background: DASH.cardActive }}>
          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold" style={{ color: DASH.muted }}>
            <Icon name="HeartPulse" className="h-3.5 w-3.5" />{copy.heartRate}
          </span>
          <div className="mt-1 flex items-end gap-1.5">
            <strong className="text-3xl font-black tabular-nums" style={{ color: heartRate ? DASH.ember : DASH.faint }}>
              {heartRate ? localNumber(heartRate.bpm, lang) : '—'}
            </strong>
            <span className="pb-1 text-[0.65rem] font-bold" style={{ color: DASH.muted }}>{heartRate ? copy.heartRateUnit : ''}</span>
          </div>
          <span className="mt-0.5 block truncate text-[0.6rem]" style={{ color: DASH.faint }} role="status" aria-live="polite">
            {heartRate ? copy.watchConnected : copy.watchUnavailable}
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] gap-2">
        <div className="min-w-0 rounded-2xl p-3" style={{ background: DASH.cardActive }}>
          <span className="text-[0.65rem] font-bold" style={{ color: DASH.muted }}>{copy.currentExercise}</span>
          <p className="mt-0.5 truncate text-sm font-black" style={{ color: DASH.ink }}><bdi>{props.currentExercise}</bdi></p>
          <p className="mt-0.5 text-[0.65rem] font-bold tabular-nums" style={{ color: DASH.blue }}>
            {copy.currentSet} {localNumber(props.currentSet, lang)} / {localNumber(props.currentSetTotal, lang)}
          </p>
        </div>
        <div className="rounded-2xl p-3 text-center" style={{ background: DASH.cardActive }}>
          <span className="block text-[0.65rem] font-bold leading-tight" style={{ color: DASH.muted }}>{copy.remainingSets}</span>
          <strong className="mt-1 block text-2xl font-black tabular-nums" style={{ color: DASH.blue }}>{localNumber(remaining, lang)}</strong>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between rounded-2xl px-3 py-2" style={{ background: DASH.cardActive }}>
        <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: DASH.muted }}>
          <Icon name="Timer" className="h-4 w-4" />{copy.restTimer}
        </span>
        <strong className="text-sm font-black tabular-nums" style={{ color: props.isResting ? DASH.teal : DASH.faint }}>
          {props.isResting ? formatClock(props.restLeft) : copy.notResting}
        </strong>
      </div>

      <fieldset className="mt-3">
        <legend className="sr-only">{copy.energy}</legend>
        <div className="flex items-end justify-between gap-2">
          <span className="text-xs font-black" style={{ color: DASH.ink }} aria-hidden="true">{copy.energy}</span>
          <span className="text-[0.6rem]" style={{ color: DASH.faint }}>{copy.energyHint}</span>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {LIVE_GYM_ENERGY_LEVELS.map((level) => {
            const selected = level.value === props.energy
            const label = lang === 'en' ? level.en : level.ar
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => props.onEnergyChange(level.value)}
                aria-label={`${copy.energy}: ${label}`}
                aria-pressed={selected}
                className="v2-pressable grid min-h-11 place-items-center rounded-xl text-sm font-black tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: selected ? DASH.ember : DASH.cardActive, color: selected ? 'var(--v2-on-color)' : DASH.muted, outlineColor: DASH.ember }}
              >
                {localNumber(level.value, lang)}
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-center text-[0.65rem] font-bold" style={{ color: DASH.muted }} aria-live="polite">{lang === 'en' ? selectedEnergy.en : selectedEnergy.ar}</p>
      </fieldset>
    </section>
  )
}
