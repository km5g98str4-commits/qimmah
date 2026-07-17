import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { LIVE_GYM_ENERGY_LEVELS, liveGymCopy } from '@/data/liveGym'
import type { HeartRateReading, LiveGymDashboardProps } from '@/types/workout'
import { formatDuration } from '@/lib/formatDuration'
import {
  elapsedWorkoutSec,
  freshHeartRate,
  heartRateProviderAvailable,
  remainingWorkoutSets,
  subscribeToHeartRate,
} from '@/lib/liveWorkoutMetrics'

/**
 * Dark focus-mode roles for the live dashboard. Momentum semantics: blue =
 * progress/data, teal = recovery + self-report accents, neutral = surfaces.
 * NOTE: ember is deliberately absent here — the single ember action per screen
 * belongs to the primary "Complete set" CTA in WorkoutV2, never to this surface.
 */
const DASH = {
  card: 'var(--v2-dark-paper)',
  cardActive: 'var(--v2-dark-paper-active)',
  line: 'var(--v2-dark-border)',
  ink: 'var(--v2-dark-ink-strong)',
  muted: 'var(--v2-dark-ink-muted)',
  faint: 'var(--v2-dark-ink-faint)',
  blue: 'var(--v2-blue)',
  teal: 'var(--v2-teal)',
} as const

function localNumber(value: number, lang: LiveGymDashboardProps['lang']): string {
  return new Intl.NumberFormat(lang === 'en' ? 'en' : 'ar-SA', { useGrouping: false }).format(value)
}

export function LiveGymDashboard(props: LiveGymDashboardProps) {
  const { lang, now } = props
  const copy = liveGymCopy(lang)
  const [latestHeartRate, setLatestHeartRate] = useState<HeartRateReading | null>(null)
  // Track provider availability honestly: seed from the bridge presence at mount,
  // and flip on the first real sample (a delivered reading proves a live source).
  // Without a provider the heart-rate tile stays hidden — see the wave6 note in
  // liveWorkoutMetrics.heartRateProviderAvailable.
  const [providerAvailable, setProviderAvailable] = useState(() => heartRateProviderAvailable())

  useEffect(
    () =>
      subscribeToHeartRate((reading) => {
        setProviderAvailable(true)
        setLatestHeartRate(reading)
      }),
    [],
  )

  const heartRate = freshHeartRate(latestHeartRate, now)
  const elapsed = elapsedWorkoutSec(props.startedAt, now)
  const remaining = remainingWorkoutSets(props.totalSets, props.completedSets)
  // No default level: null selects a neutral, un-pressed state — never a fake "3".
  const selectedEnergy = useMemo(
    () => LIVE_GYM_ENERGY_LEVELS.find((item) => item.value === props.energy) ?? null,
    [props.energy],
  )

  return (
    <section className="mx-4 mt-2 rounded-3xl p-3" style={{ background: DASH.card, border: `1px solid ${DASH.line}` }} aria-labelledby="live-gym-title" data-testid="live-gym-dashboard">
      <h2 id="live-gym-title" className="sr-only">{copy.dashboard}</h2>

      <div className={providerAvailable ? 'grid grid-cols-2 gap-2' : ''}>
        <div className="rounded-2xl p-3" style={{ background: DASH.cardActive }}>
          <span className="flex items-center gap-1.5 text-[0.7rem] font-bold" style={{ color: DASH.muted }}>
            <Icon name="Clock" className="h-3.5 w-3.5" />{copy.elapsed}
          </span>
          <time className="mt-1 block text-3xl font-black tabular-nums" dateTime={`PT${elapsed}S`} style={{ color: DASH.ink }} aria-label={`${copy.elapsed}: ${formatDuration(elapsed)}`}>
            {formatDuration(elapsed)}
          </time>
        </div>

        {providerAvailable && (
          <div className="rounded-2xl p-3" style={{ background: DASH.cardActive }}>
            <span className="flex items-center gap-1.5 text-[0.7rem] font-bold" style={{ color: DASH.muted }}>
              <Icon name="HeartPulse" className="h-3.5 w-3.5" />{copy.heartRate}
            </span>
            <div className="mt-1 flex items-end gap-1.5">
              <strong className="text-3xl font-black tabular-nums" style={{ color: heartRate ? DASH.ink : DASH.faint }}>
                {heartRate ? localNumber(heartRate.bpm, lang) : '—'}
              </strong>
              <span className="pb-1 text-[0.65rem] font-bold" style={{ color: DASH.muted }}>{heartRate ? copy.heartRateUnit : ''}</span>
            </div>
            <span className="mt-0.5 block truncate text-[0.6rem]" style={{ color: DASH.faint }} role="status" aria-live="polite">
              {heartRate ? copy.watchConnected : copy.watchUnavailable}
            </span>
          </div>
        )}
      </div>

      {/* Honest hidden-until-available note: one settings-style line, no fake tile. */}
      {!providerAvailable && (
        <p className="mt-2 flex items-center gap-1.5 rounded-2xl px-3 py-2 text-[0.65rem] font-bold" style={{ background: DASH.cardActive, color: DASH.muted }}>
          <Icon name="HeartPulse" className="h-3.5 w-3.5 shrink-0" style={{ color: DASH.faint }} />
          {copy.heartRateHidden}
        </p>
      )}

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
          {props.isResting ? formatDuration(props.restLeft) : copy.notResting}
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
            // Ember-law: the selector uses a teal/neutral accent, never ember.
            // Selected = teal text + teal ring on the neutral surface (AA-safe on
            // dark: teal #12a594 on #2c2823 ≈ 5.4:1). Unselected = muted neutral.
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => props.onEnergyChange(level.value)}
                aria-label={`${copy.energy}: ${label}`}
                aria-pressed={selected}
                className="v2-pressable grid min-h-11 place-items-center rounded-xl text-sm font-black tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: DASH.cardActive,
                  color: selected ? DASH.teal : DASH.muted,
                  boxShadow: selected ? `inset 0 0 0 2px ${DASH.teal}` : `inset 0 0 0 1px ${DASH.line}`,
                  outlineColor: DASH.teal,
                }}
              >
                {localNumber(level.value, lang)}
              </button>
            )
          })}
        </div>
        {/* Neutral until chosen; we never derive an estimate here, so nothing needs
            a «تقديري» label — the reading shown is exactly the user's own pick. */}
        <p className="mt-1.5 text-center text-[0.65rem] font-bold" style={{ color: selectedEnergy ? DASH.muted : DASH.faint }} aria-live="polite">
          {selectedEnergy ? (lang === 'en' ? selectedEnergy.en : selectedEnergy.ar) : copy.energyUnset}
        </p>
      </fieldset>
    </section>
  )
}
