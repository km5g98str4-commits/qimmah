import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
// Reuse the SACRED, just-shipped timestamp rest-timer helpers from the v1 active
// session engine (read-only import — the logic is never rewritten here). Basing
// the v2 rest timer on `endsAt`/`durationSec` (not a decrementing counter) keeps
// it correct after the app returns from the background, exactly like WorkoutMode.
import { restIsFinished, restRemainingSec, type RestSnapshot } from '@/lib/activeSession'
import { buildWorkoutV2Model, CATEGORY_LABEL, type ExCategory, type WorkoutV2Exercise } from '@/lib/workoutV2Model'
// Fix-forward A: finished v2 workouts persist through the canonical path so
// Progress/Today/Profile react (and sync auto-enqueues) — not just a local summary.
import { persistFinishedSession } from '@/lib/finishWorkout'
import { getDayStamp } from '@/lib/today'
import { buildV2WorkoutSession } from '@/lib/workoutV2Persist'
// Strength system (this feature) — plate math, warm-up, unified PR detection.
import { useAuth } from '@/lib/authContext'
// Owner-scoped last-workout summary (isolation finding #7): scoped storage +
// one-time migration of the legacy flat key live in a lib so the storage contract
// is unit-testable and shared with the data-export/isolation proofs.
import { saveWorkoutSummary, migrateLegacySummary } from '@/lib/workoutSummary'
// Coaching rest tips — muscle-matched, deterministic, authored in warm MSA.
// Rendered on the dark rest surface below (finding #8).
import { pickRestTip } from '@/lib/coaching'
import type { RestTip } from '@/lib/coaching/types'
import type { Muscle } from '@/types/workout'
import { getExercise } from '@/data/exercises'
import { registerWorkoutPRs } from '@/features/achievements/engine'
import { playHaptic } from '@/lib/nativeFeedback'
import {
  computeLoadout, loadPlateConfig, type PlateConfig,
  generateWarmup, loadWarmupPref, saveWarmupPref, type WarmupSet,
  detectPRsForSession, toPRCelebrations, type StrengthPR,
} from '@/lib/strength'

interface WorkoutV2Props {
  lang: Lang
  onNavigate: (route: AppRoute) => void
}

const ACTIVE_KEY_BASE = 'qimmah:active-workout:v2'
const activeKey = (ownerId: string | null) => `${ACTIVE_KEY_BASE}:${ownerId ?? 'guest'}`
const REST_DEFAULT = 90
const REST_ADD = 15

/**
 * Dedicated DARK focus roles for the active workout — the v2.1 crown jewel.
 * Values resolve through tokens.css: Ember = one primary action, blue = progress,
 * teal = recovery and green = completion.
 */
const FOCUS = {
  card: 'var(--v2-dark-paper)',
  cardActive: 'var(--v2-dark-paper-active)',
  line: 'var(--v2-dark-border)',
  ink: 'var(--v2-dark-ink-strong)',
  inkMuted: 'var(--v2-dark-ink-muted)',
  inkFaint: 'var(--v2-dark-ink-faint)',
  ember: 'var(--v2-ember)',
  onColor: 'var(--v2-on-color)',
  blue: 'var(--v2-blue)',
  teal: 'var(--v2-teal)',
  success: 'var(--v2-green)',
  error: 'var(--v2-error)',
} as const

type Screen = 'plan' | 'detail' | 'active' | 'complete'
interface SetRow { weight: number; reps: number; done: boolean }
interface ActiveState {
  startedAt: number
  exIndex: number
  setIndex: number
  rows: Record<string, SetRow[]>
  /** Rest timer as timestamps (survives refresh + background) — see activeSession.ts. */
  rest?: RestSnapshot | null
}

const parseReps = (reps: string): number => {
  const m = reps.match(/\d+/)
  return m ? Number(m[0]) : 10
}
const toAr = (n: number, lang: Lang) => (lang === 'en' ? String(n) : String(n).replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)]))
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Validate a persisted/candidate active session against the CURRENT plan.
 * localStorage is treated as hostile input: the stored session may belong to an
 * older generated workout (different/removed exercises), be malformed, or have
 * out-of-range indices. Returns true only if the session is fully usable for the
 * current plan — every current exercise has a non-empty rows array, and the
 * exIndex/setIndex are in bounds. A type guard so callers get a real ActiveState.
 */
function isUsableSession(value: unknown, exercises: WorkoutV2Exercise[]): value is ActiveState {
  if (!value || typeof value !== 'object') return false
  const s = value as Partial<ActiveState>
  if (exercises.length === 0) return false
  if (!Number.isInteger(s.exIndex) || (s.exIndex as number) < 0 || (s.exIndex as number) >= exercises.length) return false
  if (!Number.isInteger(s.setIndex) || (s.setIndex as number) < 0) return false
  if (!Number.isInteger(s.startedAt)) return false
  if (!s.rows || typeof s.rows !== 'object') return false
  const rows = s.rows as Record<string, unknown>
  // Every exercise in the CURRENT plan must have a non-empty set array (i.e. the
  // session belongs to this plan — stale ids fail here on exercise 0).
  for (const ex of exercises) {
    const r = rows[ex.id]
    if (!Array.isArray(r) || r.length === 0) return false
    for (const item of r) {
      if (!item || typeof item !== 'object') return false
      const row = item as Partial<SetRow>
      if (typeof row.weight !== 'number' || typeof row.reps !== 'number' || typeof row.done !== 'boolean') return false
    }
  }
  // Rest, when present, must be a well-formed timestamp snapshot (optional field).
  if (s.rest != null) {
    const r = s.rest as Partial<RestSnapshot>
    if (typeof r.endsAt !== 'number' || typeof r.durationSec !== 'number') return false
  }
  // Current set index must be inside the current exercise's rows.
  const curRows = rows[exercises[s.exIndex as number].id] as SetRow[]
  if ((s.setIndex as number) >= curRows.length) return false
  return true
}

/**
 * Workout v2 — Qimmah v2.1 (Slice 4, "crown jewel"). WorkoutView
 * branches here under isDesignV2). Self-contained internal navigation: Plan →
 * Exercise Detail → Active Workout (dark focus mode: set editor + rest timer) →
 * Complete. Reads the real generated plan; no fake previous weights/PRs. The
 * active session persists to localStorage (qimmah:active-workout:v2:<owner>) so a
 * refresh resumes — including the rest timer, stored as timestamps. A completed
 * summary is saved locally, owner-scoped (qimmah:workout-summary:v2:<owner>). No
 * cloud write.
 */
export function WorkoutV2({ lang, onNavigate }: WorkoutV2Props) {
  const { customization } = useCustomization()
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const model = useMemo(() => buildWorkoutV2Model(customization, lang), [customization, lang])

  const userId = useAuth().user?.id ?? null
  const ownerActiveKey = activeKey(userId)

  // One-time migration of the legacy flat summary key to the owner-scoped key
  // (ambiguous data discarded — see migrateLegacySummary). Runs once per owner.
  useEffect(() => { migrateLegacySummary(userId) }, [userId])
  const [screen, setScreen] = useState<Screen>('plan')
  const [detailIdx, setDetailIdx] = useState(0)
  const [active, setActive] = useState<ActiveState | null>(null)
  // Display clock for the timestamp-based rest timer (ticks only while resting).
  const [now, setNow] = useState(() => Date.now())
  // Strength UI: owner-scoped plate config + warm-up pref, per-set plate panel,
  // per-exercise warm-up dismissal, and PRs surfaced on the complete screen.
  const plateConfig = useMemo(() => loadPlateConfig(userId), [userId])
  const warmupPref = useMemo(() => loadWarmupPref(userId), [userId])
  const [platesOpen, setPlatesOpen] = useState(false)
  const [warmupDone, setWarmupDone] = useState<Record<string, boolean>>({})
  const [warmupOff, setWarmupOff] = useState(!warmupPref.show)
  const [sessionPRs, setSessionPRs] = useState<StrengthPR[]>([])

  // Restore an in-progress session on mount — but NEVER trust localStorage.
  // Only resume if the persisted session is fully usable for the current plan;
  // otherwise discard just our own key and stay safely on the Plan screen.
  useEffect(() => {
    let parsed: unknown = null
    try {
      const raw = localStorage.getItem(ownerActiveKey)
      if (!raw) return
      parsed = JSON.parse(raw)
    } catch {
      parsed = null // malformed JSON
    }
    if (isUsableSession(parsed, model.exercises)) {
      setActive(parsed)
      setNow(Date.now())
      setScreen('active')
    } else {
      try {
        localStorage.removeItem(ownerActiveKey)
      } catch {
        /* storage unavailable */
      }
    }
    // Mount-only restore against the plan present at mount.
  }, [model.exercises, ownerActiveKey])

  // Safety net: if we somehow end up on the active screen with an unusable
  // session (e.g. the plan regenerated mid-session), discard it and fall back to
  // Plan — from an EFFECT, so render stays pure and never dereferences undefined.
  useEffect(() => {
    if (screen === 'active' && !isUsableSession(active, model.exercises)) {
      try {
        localStorage.removeItem(ownerActiveKey)
      } catch {
        /* storage unavailable */
      }
      setActive(null)
      setScreen('plan')
    }
  }, [screen, active, model.exercises, ownerActiveKey])

  // Persist active session (rest timestamps included → refresh resumes the rest).
  useEffect(() => {
    try {
      if (active) localStorage.setItem(ownerActiveKey, JSON.stringify(active))
    } catch {
      /* storage full / unavailable — session stays in memory */
    }
  }, [active, ownerActiveKey])

  const resting = active?.rest != null
  const restDone = active?.rest ? restIsFinished(active.rest, now) : false

  // Display pulse (¼s) while a rest is running — auto-stops when the rest clears.
  useEffect(() => {
    if (!resting) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [resting])
  // Recompute the instant the app returns to the foreground — JS timers freeze in
  // the background on iOS, so we never rely on the pulse alone (same fix as v1).
  useEffect(() => {
    const sync = () => setNow(Date.now())
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])
  // Keep the "done" state visible a beat, then clear the rest bar.
  useEffect(() => {
    if (!restDone) return
    void playHaptic('rest')
    const id = window.setTimeout(() => setActive((prev) => (prev ? { ...prev, rest: null } : prev)), 2500)
    return () => window.clearTimeout(id)
  }, [restDone])

  // Coaching rest tip (finding #8): pick ONE muscle-matched tip when a rest
  // begins, avoiding tips already shown this session, and let the user dismiss it.
  // Deterministic: same (muscle, rest, shown) → same tip. Arabic-authored, so it
  // only renders in Arabic mode. The pick is intentionally keyed on the rest's
  // identity (endsAt) alone — re-running when `shownTips` grows would re-pick mid-rest.
  const [restTip, setRestTip] = useState<RestTip | null>(null)
  const [tipDismissed, setTipDismissed] = useState(false)
  const [shownTips, setShownTips] = useState<string[]>([])
  const restEndsAt = active?.rest?.endsAt ?? null
  useEffect(() => {
    if (restEndsAt == null) { setRestTip(null); setTipDismissed(false); return }
    const muscle = (model.exercises[active?.exIndex ?? 0]?.muscles[0] ?? 'chest') as Muscle
    const tip = pickRestTip(muscle, restEndsAt, shownTips)
    setRestTip(tip)
    setTipDismissed(false)
    if (tip) setShownTips((prev) => (prev.includes(tip.id) ? prev : [...prev, tip.id]))
    // Pick once per rest — `shownTips`/`active` deliberately excluded (see note above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restEndsAt])

  if (!model.available) return <MissingPlan lang={lang} onNavigate={onNavigate} />

  const startSession = () => {
    const rows: Record<string, SetRow[]> = {}
    for (const ex of model.exercises) {
      rows[ex.id] = Array.from({ length: ex.sets }, () => ({ weight: ex.targetWeightKg ?? 20, reps: parseReps(ex.reps), done: false }))
    }
    setActive({ startedAt: Date.now(), exIndex: 0, setIndex: 0, rows, rest: null })
    setScreen('active')
  }

  const clearActive = () => {
    try { localStorage.removeItem(ownerActiveKey) } catch { /* ignore */ }
    setActive(null)
  }

  const planScreen = <PlanScreen model={model} lang={lang} onExercise={(i) => { setDetailIdx(i); setScreen('detail') }} onStart={startSession} onBack={() => onNavigate('dashboard')} />
  if (screen === 'plan') return planScreen
  if (screen === 'detail') return <DetailScreen ex={model.exercises[detailIdx]} idx={detailIdx} total={model.exercises.length} lang={lang} onStart={startSession} onBack={() => setScreen('plan')} />
  if (screen === 'complete') return <CompleteScreen model={model} active={active} lang={lang} prs={sessionPRs} onDone={() => { clearActive(); onNavigate('dashboard') }} />

  // ── Active workout ── Render PURELY. If the session is not usable for the
  // current plan, render the Plan screen (the safety-net effect above resets the
  // screen state) — never call setState in render, never dereference undefined.
  if (!isUsableSession(active, model.exercises)) return planScreen
  const ex = model.exercises[active.exIndex]
  const rows = active.rows[ex.id]
  const row = rows[active.setIndex]
  const doneSets = Object.values(active.rows).flat().filter((r) => r.done).length
  const totalPlannedSets = Object.values(active.rows).flat().length

  const setRow = (patch: Partial<SetRow>) => {
    setActive((prev) => {
      if (!prev) return prev
      const next = { ...prev, rows: { ...prev.rows } }
      const arr = [...next.rows[ex.id]]
      arr[prev.setIndex] = { ...arr[prev.setIndex], ...patch }
      next.rows[ex.id] = arr
      return next
    })
  }

  const finishSet = () => {
    void playHaptic('set')
    const lastSet = active.setIndex >= rows.length - 1
    const lastEx = active.exIndex >= model.exercises.length - 1
    if (lastSet && lastEx) {
      // Final state with the last set marked done (setRow below is async).
      const finalActive = {
        ...active,
        rows: { ...active.rows, [ex.id]: rows.map((r, i) => (i === active.setIndex ? { ...r, done: true } : r)) },
      }
      try {
        const totalSets = doneSets + 1
        const volume = Object.values(active.rows).flat().reduce((v, r) => v + (r.done ? r.weight * r.reps : 0), 0) + row.weight * row.reps
        saveWorkoutSummary(userId, { date: new Date().toISOString().slice(0, 10), title: model.session.title, totalSets, volume, durationMin: Math.round((Date.now() - active.startedAt) / 60000) })
      } catch { /* ignore */ }
      // Canonical persist — feeds historyStore (auto-enqueues sync) + exercise
      // history, so Progress / Today / Profile all react to this v2 workout.
      try {
        const session = buildV2WorkoutSession(finalActive, model, { date: getDayStamp(), finishedAtMs: Date.now() })
        persistFinishedSession(session)
        // Unified PR detection (single source) — 1/3/5RM + e1RM vs prior sessions.
        // Feed the SAME session into the existing achievements sink (extend, not
        // duplicate) so prCount + the global toaster stay in sync; also show the
        // dark-surface PR moment on the complete screen.
        const prs = detectPRsForSession(session)
        if (prs.length > 0) {
          registerWorkoutPRs(toPRCelebrations(prs, (id) => { const e = getExercise(id); return { ar: e?.nameAr, en: e?.nameEn } }))
          void playHaptic('pr')
        }
        setSessionPRs(prs)
      } catch { /* local summary already saved; never trap the user on completion */ }
      setRow({ done: true })
      setScreen('complete')
      return
    }
    // Mark done, advance, and start the rest — a single atomic update.
    setActive((prev) => {
      if (!prev) return prev
      const arr = [...prev.rows[ex.id]]
      arr[prev.setIndex] = { ...arr[prev.setIndex], done: true }
      const rowsNext = { ...prev.rows, [ex.id]: arr }
      const advance = prev.setIndex < rows.length - 1
        ? { setIndex: prev.setIndex + 1 }
        : { exIndex: prev.exIndex + 1, setIndex: 0 }
      return { ...prev, ...advance, rows: rowsNext, rest: { endsAt: Date.now() + REST_DEFAULT * 1000, durationSec: REST_DEFAULT } }
    })
    setNow(Date.now())
  }

  const restLeft = active.rest ? restRemainingSec(active.rest.endsAt, now) : 0
  const addRest = () => setActive((prev) => (prev?.rest ? { ...prev, rest: { ...prev.rest, endsAt: prev.rest.endsAt + REST_ADD * 1000 } } : prev))
  const skipRest = () => setActive((prev) => (prev ? { ...prev, rest: null } : prev))

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-dark v2-screen-enter fixed inset-0 z-[60] flex flex-col bg-page text-ink-900" style={{ paddingTop: 'max(0.75rem, var(--safe-top))', paddingBottom: 'var(--safe-bottom)' }}>
      <header className="flex items-center justify-between gap-3 px-5 py-2">
        <button type="button" onClick={() => { clearActive(); onNavigate('dashboard') }} aria-label={t('إغلاق التمرين', 'Close workout')} className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}`, color: FOCUS.ink }}>
          <Icon name="X" className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold tabular-nums" style={{ color: FOCUS.inkMuted }}>{t(`التمرين ${toAr(active.exIndex + 1, lang)} من ${toAr(model.exercises.length, lang)}`, `Exercise ${active.exIndex + 1} of ${model.exercises.length}`)}</span>
        <span className="grid h-10 w-10 place-items-center rounded-xl text-xs font-black tabular-nums" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }} aria-label={t(`${toAr(doneSets, lang)} من ${toAr(totalPlannedSets, lang)} مجموعات مكتملة`, `${doneSets} of ${totalPlannedSets} sets done`)}>{toAr(doneSets, lang)}/{toAr(totalPlannedSets, lang)}</span>
      </header>
      {/* session progress (completed sets) */}
      <div className="mx-5 mb-1 h-1.5 overflow-hidden rounded-full" style={{ background: FOCUS.line }}>
        <div className="v2-fill h-full rounded-full" style={{ width: `${totalPlannedSets ? (doneSets / totalPlannedSets) * 100 : 0}%`, background: FOCUS.blue }} />
      </div>

      {resting ? (
        <RestPanel lang={lang} restLeft={restLeft} restDone={restDone} nextEx={model.exercises[active.exIndex]} setLabel={t(`المجموعة ${toAr(active.setIndex + 1, lang)}`, `Set ${active.setIndex + 1}`)} tip={restTip} tipDismissed={tipDismissed} onDismissTip={() => setTipDismissed(true)} onAdd={addRest} onSkip={skipRest} />
      ) : (
        <main className="flex flex-1 flex-col overflow-y-auto px-5 pb-6">
          <h1 className="mt-2 text-2xl font-black leading-tight">{ar ? ex.nameAr : ex.nameEn}</h1>
          <p className="mt-1 text-sm font-bold" style={{ color: FOCUS.inkMuted }}>{CATEGORY_LABEL[ex.category][ar ? 'ar' : 'en']} · {ex.sets}×{ex.reps}</p>

          {/* set list — big tabular weight × reps */}
          <div className="mt-5 space-y-2">
            {rows.map((r, i) => {
              const isCurrent = i === active.setIndex
              return (
                <div key={i} className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: isCurrent ? FOCUS.cardActive : FOCUS.card, border: `1px solid ${isCurrent ? FOCUS.blue : FOCUS.line}` }}>
                  <span className="text-sm font-bold" style={{ color: isCurrent ? FOCUS.ink : FOCUS.inkMuted }}>{t(`المجموعة ${toAr(i + 1, lang)}`, `Set ${i + 1}`)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-lg font-black tabular-nums" style={{ color: r.done ? FOCUS.success : FOCUS.ink }}>{toAr(r.weight, lang)}<span className="text-xs font-bold" style={{ color: FOCUS.inkFaint }}> {t('كجم', 'kg')} </span>×<span className="text-xs font-bold" style={{ color: FOCUS.inkFaint }}> </span>{toAr(r.reps, lang)}</span>
                    {r.done && <span style={{ color: FOCUS.success }}><Icon name="Check" className="h-4 w-4" strokeWidth={3} /></span>}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Warm-up ramp — before the first working set, dismissible, owner pref. */}
          {!warmupOff && active.setIndex === 0 && !row.done && !warmupDone[ex.id] && row.weight > plateConfig.barKg && (
            <WarmupPanel
              lang={lang}
              sets={generateWarmup(row.weight, plateConfig)}
              onDismiss={() => setWarmupDone((m) => ({ ...m, [ex.id]: true }))}
              onDisable={() => { setWarmupOff(true); saveWarmupPref(userId, { show: false }) }}
            />
          )}

          {/* current set editor — big controls */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stepper
              label={t('الوزن · كجم', 'Weight · kg')}
              value={row.weight}
              step={2.5}
              onChange={(v) => setRow({ weight: Math.max(0, v) })}
              lang={lang}
              onPlates={() => setPlatesOpen((o) => !o)}
              platesOpen={platesOpen}
            />
            <Stepper label={t('التكرار', 'Reps')} value={row.reps} step={1} onChange={(v) => setRow({ reps: Math.max(0, v) })} lang={lang} />
          </div>

          {/* Plate calculator — one tap from the weight field. */}
          {platesOpen && <PlateStackPanel lang={lang} weight={row.weight} config={plateConfig} onClose={() => setPlatesOpen(false)} />}

          {/* single ember action */}
          <button type="button" onClick={finishSet} className="v2-pressable mt-6 w-full rounded-2xl py-4 text-[1.1875rem] font-black" style={{ background: FOCUS.ember, color: FOCUS.onColor }}>{t('أنهِ المجموعة', 'Complete set')}</button>
        </main>
      )}
    </div>
  )
}

function Stepper({ label, value, step, onChange, lang, onPlates, platesOpen }: { label: string; value: number; step: number; onChange: (v: number) => void; lang: Lang; onPlates?: () => void; platesOpen?: boolean }) {
  const ar = lang !== 'en'
  return (
    <div className="rounded-2xl p-3" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}` }}>
      <div className="flex items-center justify-center gap-1.5">
        <p className="text-center text-xs font-bold" style={{ color: FOCUS.inkMuted }}>{label}</p>
        {onPlates && (
          <button type="button" onClick={onPlates} aria-label={ar ? 'حاسبة الأقراص' : 'Plate calculator'} aria-pressed={platesOpen} className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: platesOpen ? FOCUS.blue : FOCUS.cardActive, border: `1px solid ${FOCUS.line}`, color: platesOpen ? FOCUS.onColor : FOCUS.inkMuted }}>
            <Icon name="Layers" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" onClick={() => onChange(value - step)} aria-label={label + ' −'} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: FOCUS.cardActive, border: `1px solid ${FOCUS.line}`, color: FOCUS.ink }}><Icon name="Minus" className="h-6 w-6" /></button>
        <span className="text-3xl font-black tabular-nums" style={{ color: FOCUS.ink }}>{toAr(value, lang)}</span>
        <button type="button" onClick={() => onChange(value + step)} aria-label={label + ' +'} className="v2-pressable grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: FOCUS.cardActive, border: `1px solid ${FOCUS.line}`, color: FOCUS.ink }}><Icon name="Plus" className="h-6 w-6" /></button>
      </div>
    </div>
  )
}

/** Plate calculator — dark-surface per-side loadout with a visual plate stack. */
function PlateStackPanel({ lang, weight, config, onClose }: { lang: Lang; weight: number; config: PlateConfig; onClose: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const load = computeLoadout(weight, config)
  return (
    <div className="mt-3 rounded-2xl p-4" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}` }} role="group" aria-label={t('حاسبة الأقراص', 'Plate calculator')}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-black" style={{ color: FOCUS.ink }}>{t('كل جهة', 'Per side')} · {t('بار', 'Bar')} {toAr(config.barKg, lang)}</span>
        <button type="button" onClick={onClose} aria-label={t('إغلاق', 'Close')} className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: FOCUS.cardActive, color: FOCUS.inkMuted }}><Icon name="X" className="h-4 w-4" /></button>
      </div>
      {/* visual plate stack (largest → smallest, per side) */}
      <div className="mt-3 flex min-h-[4rem] items-center gap-1.5 overflow-x-auto py-1">
        <span className="h-8 w-2 shrink-0 rounded-sm" style={{ background: FOCUS.inkFaint }} aria-hidden="true" />
        {load.perSide.length === 0 && <span className="text-sm font-bold" style={{ color: FOCUS.inkMuted }}>{t('البار فقط', 'Bar only')}</span>}
        {load.perSide.flatMap((p) =>
          Array.from({ length: p.count }, (_, i) => (
            <span key={`${p.kg}-${i}`} className="grid shrink-0 place-items-center rounded-md text-[0.7rem] font-black tabular-nums"
              style={{ background: FOCUS.blue, color: FOCUS.onColor, height: `${Math.min(56, 30 + p.kg)}px`, width: '30px' }}>
              {toAr(p.kg, lang)}
            </span>
          )),
        )}
      </div>
      {load.reachable ? (
        <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: FOCUS.success }}>{t('المجموع', 'Total')}: {toAr(load.achievedKg, lang)} {t('كجم', 'kg')} ✓</p>
      ) : (
        <div className="mt-1 text-sm font-bold">
          <p className="flex items-start gap-1.5 tabular-nums" style={{ color: FOCUS.error }}>
            <Icon name="AlertCircle" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('غير قابل تمامًا — أقرب', 'Not exact — nearest')} {toAr(load.achievedKg, lang)} {t('كجم', 'kg')} ({load.deltaKg > 0 ? '+' : ''}{toAr(load.deltaKg, lang)})</span>
          </p>
          {load.suggestion && (
            <p className="mt-0.5 text-xs tabular-nums" style={{ color: FOCUS.inkMuted }}>
              {load.suggestion.downKg != null && <>↓ {toAr(load.suggestion.downKg, lang)} </>}
              {load.suggestion.upKg != null && <>↑ {toAr(load.suggestion.upKg, lang)}</>}
              {' '}{t('كجم', 'kg')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Warm-up ramp — dismissible, remembers the owner's "don't show" preference. */
function WarmupPanel({ lang, sets, onDismiss, onDisable }: { lang: Lang; sets: WarmupSet[]; onDismiss: () => void; onDisable: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  if (sets.length === 0) return null
  return (
    <div className="mt-5 rounded-2xl p-4" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}` }} role="group" aria-label={t('إحماء', 'Warm-up')}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-black" style={{ color: FOCUS.teal }}><Icon name="Flame" className="h-4 w-4" />{t('إحماء مقترح', 'Suggested warm-up')}</span>
        <button type="button" onClick={onDismiss} aria-label={t('إخفاء', 'Dismiss')} className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: FOCUS.cardActive, color: FOCUS.inkMuted }}><Icon name="X" className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 space-y-1.5">
        {sets.map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: s.isWork ? FOCUS.cardActive : 'transparent', border: `1px solid ${s.isWork ? FOCUS.line : 'transparent'}` }}>
            <span className="text-xs font-bold" style={{ color: FOCUS.inkMuted }}>{s.isWork ? t('العمل', 'Work') : s.label}</span>
            <span className="text-sm font-black tabular-nums" style={{ color: s.isWork ? FOCUS.ink : FOCUS.inkMuted }}>{toAr(s.weightKg, lang)} <span className="text-xs" style={{ color: FOCUS.inkFaint }}>{t('كجم', 'kg')}</span> × {toAr(s.reps, lang)}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onDisable} className="mt-2 text-[0.7rem] font-bold" style={{ color: FOCUS.inkFaint }}>{t('لا تُظهر الإحماء', 'Don’t show warm-ups')}</button>
    </div>
  )
}

function RestPanel({ lang, restLeft, restDone, nextEx, setLabel, tip, tipDismissed, onDismissTip, onAdd, onSkip }: { lang: Lang; restLeft: number; restDone: boolean; nextEx: WorkoutV2Exercise; setLabel: string; tip: RestTip | null; tipDismissed: boolean; onDismissTip: () => void; onAdd: () => void; onSkip: () => void }) {
  const ar = lang !== 'en'
  // Rest tips are authored in Arabic (warm MSA) — only surface them in Arabic mode.
  const showTip = ar && !restDone && tip != null && !tipDismissed
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {restDone ? (
        <>
          <span className="v2-earned-moment grid h-20 w-20 place-items-center rounded-full" style={{ background: FOCUS.success, color: FOCUS.onColor }}><Icon name="Check" className="h-10 w-10" strokeWidth={3} /></span>
          <p className="mt-5 text-xl font-black" style={{ color: FOCUS.success }}>{ar ? 'انتهت الراحة' : 'Rest done'}</p>
          <p className="mt-1 text-sm" style={{ color: FOCUS.inkMuted }}>{ar ? 'التالي' : 'Next'}: <bdi>{ar ? nextEx.nameAr : nextEx.nameEn}</bdi> · {setLabel}</p>
        </>
      ) : (
        <>
          <p className="text-sm font-bold" style={{ color: FOCUS.inkMuted }}>{ar ? 'راحة' : 'Rest'}</p>
          <p className="mt-2 text-7xl font-black tabular-nums" style={{ color: FOCUS.teal }}>{fmtTime(restLeft)}</p>
          <p className="mt-4 text-sm" style={{ color: FOCUS.inkMuted }}>{ar ? 'التالي' : 'Next'}: <bdi>{ar ? nextEx.nameAr : nextEx.nameEn}</bdi> · {setLabel}</p>
          {showTip && (
            // Subtle coaching tip — dark card, teal accent, AA-contrast muted ink.
            // `.v2-screen-enter` is reduced-motion-safe (tokens.css forces no motion).
            <div role="note" aria-live="polite" className="v2-screen-enter mt-6 flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-start" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}` }}>
              <Icon name="Lightbulb" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: FOCUS.teal }} aria-hidden />
              <p className="flex-1 text-[0.8125rem] font-medium leading-relaxed" style={{ color: FOCUS.inkMuted }}><bdi>{tip.textAr}</bdi></p>
              <button type="button" onClick={onDismissTip} aria-label="إخفاء النصيحة" className="-me-1 -mt-1 shrink-0 rounded-lg p-1.5" style={{ color: FOCUS.inkFaint }}><Icon name="X" className="h-4 w-4" /></button>
            </div>
          )}
          <div className="mt-8 flex items-center gap-3">
            <button type="button" onClick={onAdd} className="rounded-2xl px-6 py-3 font-bold" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}`, color: FOCUS.ink }}>+{toAr(REST_ADD, lang)} {ar ? 'ث' : 's'}</button>
            <button type="button" onClick={onSkip} className="v2-pressable rounded-2xl px-8 py-3 text-[1.1875rem] font-black" style={{ background: FOCUS.ember, color: FOCUS.onColor }}>{ar ? 'تخطي' : 'Skip'}</button>
          </div>
        </>
      )}
    </main>
  )
}

function PlanScreen({ model, lang, onExercise, onStart, onBack }: { model: ReturnType<typeof buildWorkoutV2Model>; lang: Lang; onExercise: (i: number) => void; onStart: () => void; onBack: () => void }) {
  const ar = lang !== 'en'
  const groups: { cat: ExCategory; items: { ex: WorkoutV2Exercise; i: number }[] }[] = []
  model.exercises.forEach((ex, i) => {
    const g = groups.find((x) => x.cat === ex.category)
    if (g) g.items.push({ ex, i })
    else groups.push({ cat: ex.category, items: [{ ex, i }] })
  })
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
        <p className="v2-text-blue mt-4 text-xs font-black uppercase tracking-wider">{ar ? model.program.titleAr : model.program.titleEn} · {ar ? model.program.contextAr : model.program.contextEn}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{model.session.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-500">
          <Chip icon="Dumbbell" text={`${model.session.exerciseCount} ${ar ? 'تمارين' : 'exercises'}`} />
          <Chip icon="Clock" text={`~${model.session.durationMin} ${ar ? 'دقيقة' : 'min'}`} />
          {model.session.muscles.slice(0, 2).map((m) => <Chip key={m} icon="Target" text={m} />)}
        </div>

        <div className="mt-6 space-y-5">
          {groups.map((g) => (
            <div key={g.cat}>
              <p className="mb-2 text-sm font-black text-ink-700">{CATEGORY_LABEL[g.cat][ar ? 'ar' : 'en']}</p>
              <div className="space-y-2">
                {g.items.map(({ ex, i }) => (
                  <button key={ex.id} type="button" onClick={() => onExercise(i)} className="v2-pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start hover:border-[color:var(--v2-blue)]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-beige text-ink-500"><Icon name="Dumbbell" className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{ar ? ex.nameAr : ex.nameEn}</span>
                      <span className="block text-xs text-ink-500">{ex.sets}×{ex.reps}{ex.equipment[0] ? ` · ${ex.equipment[0]}` : ''}</span>
                    </span>
                    <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* In-flow primary CTA — sits within the scroll (above the app tab bar,
            which a fixed footer would collide with), so it's always tappable. */}
        <button type="button" onClick={onStart} className="btn-primary mt-6 w-full py-4 text-[1.1875rem] shadow-glow">{ar ? 'ابدأ الجلسة' : 'Start session'}</button>
      </div>
    </div>
  )
}

function DetailScreen({ ex, idx, total, lang, onStart, onBack }: { ex: WorkoutV2Exercise; idx: number; total: number; lang: Lang; onStart: () => void; onBack: () => void }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light min-h-screen bg-page px-4 pb-28 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
        {/* media placeholder (no demo media in the plan template) */}
        <div className="mt-4 grid aspect-video place-items-center rounded-2xl border border-line bg-surface text-ink-400"><Icon name="Dumbbell" className="h-10 w-10" /></div>
        <p className="v2-text-blue mt-4 text-xs font-black uppercase tracking-wider">{ar ? `التمرين ${toAr(idx + 1, lang)} من ${toAr(total, lang)}` : `Exercise ${idx + 1} of ${total}`}</p>
        <h1 className="mt-1 text-2xl font-black">{ar ? ex.nameAr : ex.nameEn}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-500">
          {ex.muscles.map((m) => <Chip key={m} icon="Target" text={m} />)}
          {ex.equipment[0] && <Chip icon="Dumbbell" text={ex.equipment[0]} />}
          <Chip icon="Repeat" text={`${ex.sets}×${ex.reps}`} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat label={ar ? 'آخر أداء' : 'Last time'} value={ex.lastPerformance ?? (ar ? 'لا يوجد بعد' : 'None yet')} muted={!ex.lastPerformance} />
          <Stat label={ar ? 'هدف اليوم' : 'Target today'} value={ex.targetWeightKg ? `${ex.targetWeightKg} ${ar ? 'كجم' : 'kg'}` : (ar ? 'حسب إحساسك' : 'By feel')} muted={!ex.targetWeightKg} />
        </div>

        <p className="mt-6 mb-2 text-sm font-black text-ink-700">{ar ? 'إشارات سريعة' : 'Quick cues'}</p>
        <ul className="space-y-2">
          {ex.cues.map((c, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"><Icon name="Check" className="h-4 w-4 shrink-0 text-[color:var(--v2-green)]" strokeWidth={3} />{c}</li>
          ))}
        </ul>

        <div className="mt-6 space-y-2.5">
          <button type="button" onClick={onStart} className="btn-primary w-full py-4 text-[1.1875rem]">{ar ? 'ابدأ التمرين' : 'Start exercise'}</button>
          <button type="button" disabled aria-disabled className="w-full rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-400" title={ar ? 'الاستبدال قادم لاحقًا' : 'Replace coming later'}>{ar ? 'استبدال · لاحقًا' : 'Replace · later'}</button>
        </div>
      </div>
    </div>
  )
}

function CompleteScreen({ model, active, lang, prs, onDone }: { model: ReturnType<typeof buildWorkoutV2Model>; active: ActiveState | null; lang: Lang; prs: StrengthPR[]; onDone: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const rows = active ? Object.values(active.rows).flat() : []
  const totalSets = rows.length
  const volume = rows.reduce((v, r) => v + r.weight * r.reps, 0)
  const durationMin = active ? Math.max(1, Math.round((Date.now() - active.startedAt) / 60000)) : 0
  // One green line per lift that set a PR (kind + value), reduced-motion-safe.
  const prByLift = new Map<string, StrengthPR[]>()
  for (const pr of prs) { const a = prByLift.get(pr.exerciseId) ?? []; a.push(pr); prByLift.set(pr.exerciseId, a) }
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-dark v2-screen-enter fixed inset-0 z-[60] flex flex-col items-center justify-center bg-page px-6 text-center text-ink-900">
      {/* success moment — green */}
      <span className="v2-earned-moment grid h-16 w-16 place-items-center rounded-2xl" style={{ background: FOCUS.success, color: FOCUS.onColor }}><Icon name="Check" className="h-8 w-8" strokeWidth={3} /></span>
      <h1 className="mt-5 text-3xl font-black">{ar ? 'أنهيت الجلسة' : 'Session complete'}</h1>
      <p className="mt-1 text-sm" style={{ color: FOCUS.inkMuted }}>{model.session.title}</p>
      {/* PR moment — green, reduced-motion-safe (v2-earned-moment collapses under prefers-reduced-motion). */}
      {prByLift.size > 0 && (
        <div className="v2-earned-moment mt-5 w-full max-w-xs rounded-2xl p-3" role="status" aria-live="polite" style={{ background: 'color-mix(in srgb, var(--v2-green) 14%, transparent)', border: `1px solid ${FOCUS.success}` }}>
          <p className="flex items-center justify-center gap-1.5 text-sm font-black" style={{ color: FOCUS.success }}><Icon name="Trophy" className="h-4 w-4" />{t('رقم قياسي جديد!', 'New PR!')}</p>
          <div className="mt-2 space-y-1">
            {[...prByLift.entries()].map(([id, list]) => {
              const e = getExercise(id)
              const kinds = list.map((p) => p.kind).join(' · ')
              const top = Math.max(...list.map((p) => p.valueKg))
              return <p key={id} className="text-xs font-bold tabular-nums" style={{ color: FOCUS.ink }}><bdi>{ar ? e?.nameAr ?? id : e?.nameEn ?? id}</bdi> · {kinds} · {toAr(top, lang)} {t('كجم', 'kg')}</p>
            })}
          </div>
        </div>
      )}
      <div className="mt-6 grid w-full max-w-xs grid-cols-3 gap-3">
        <FocusStat label={ar ? 'الدقائق' : 'Minutes'} value={toAr(durationMin, lang)} />
        <FocusStat label={ar ? 'المجموعات' : 'Sets'} value={toAr(totalSets, lang)} />
        <FocusStat label={ar ? 'الحجم كجم' : 'Volume kg'} value={toAr(volume, lang)} />
      </div>
      <button type="button" onClick={onDone} className="v2-pressable mt-8 w-full max-w-xs rounded-2xl py-4 text-[1.1875rem] font-black" style={{ background: FOCUS.ember, color: FOCUS.onColor }}>{ar ? 'حفظ وإنهاء' : 'Save & finish'}</button>
      <p className="mt-3 text-[0.7rem]" style={{ color: FOCUS.inkFaint }}>{ar ? 'محفوظ على هذا الجهاز فقط.' : 'Saved on this device only.'}</p>
    </div>
  )
}

function MissingPlan({ lang, onNavigate }: { lang: Lang; onNavigate: (r: AppRoute) => void }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light v2-screen-enter flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center text-ink-900">
      <Icon name="Dumbbell" className="h-12 w-12 text-ink-400" />
      <h1 className="mt-5 text-2xl font-black">{ar ? 'أكمل إعداد خطتك' : 'Finish setting up your plan'}</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-500">{ar ? 'نحتاج هدفك وجدولك لنبني تمرينك.' : 'We need your goal and schedule to build your workout.'}</p>
      <button type="button" onClick={() => onNavigate('setup')} className="btn-primary mt-6 w-full max-w-xs py-4 text-[1.1875rem]">{ar ? 'ابدأ الإعداد' : 'Start setup'}</button>
    </div>
  )
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1"><Icon name={icon} className="h-3.5 w-3.5" />{text}</span>
}
function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return <div className="rounded-xl border border-line bg-surface px-2 py-3 text-center"><p className={cn('text-lg font-black tabular-nums', muted && 'text-ink-400')}>{value}</p><p className="mt-0.5 text-[0.65rem] font-bold text-ink-500">{label}</p></div>
}
function FocusStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl px-2 py-3 text-center" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}` }}><p className="text-lg font-black tabular-nums" style={{ color: FOCUS.ink }}>{value}</p><p className="mt-0.5 text-[0.65rem] font-bold" style={{ color: FOCUS.inkMuted }}>{label}</p></div>
}
