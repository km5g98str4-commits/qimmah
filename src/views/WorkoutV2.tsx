import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { cn } from '@/lib/cn'
import type { Lang } from '@/lib/appPreferences'
import { applyTheme } from '@/lib/appPreferences'
import { getStrings } from '@/config/strings'
import type { AppRoute } from '@/lib/appRoutes'
import { useCustomization } from '@/lib/customizationContext'
import { useAppScrollReset } from '@/lib/useAppScrollReset'
// Reuse the SACRED, just-shipped timestamp rest-timer helpers from the v1 active
// session engine (read-only import — the logic is never rewritten here). Basing
// the v2 rest timer on `endsAt`/`durationSec` (not a decrementing counter) keeps
// it correct after the app returns from the background, exactly like WorkoutMode.
import { restIsFinished, restRemainingSec, type RestSnapshot } from '@/lib/activeSession'
import { buildWorkoutV2Model, substituteWorkoutExercise, CATEGORY_LABEL, type ExCategory, type WorkoutV2Exercise } from '@/lib/workoutV2Model'
// Screen 31 — equipment-aware substitution engine (pure). Screen 27 — one-handed
// reach preference. Both feed the active session; neither writes the plan/history.
import { findSubstitutes, type SubReason, type SubstituteOption } from '@/lib/workoutSubstitution'
import { getHandedness, setHandedness, otherHand, type Handedness } from '@/lib/handedness'
import { muscleLabel } from '@/lib/muscles'
import { equipmentLabel } from '@/lib/exerciseLabels'
import { loadHydrationPref, saveHydrationPref, addTodayWaterMl, remindersDue, type HydrationPref } from '@/lib/workoutHydration'
// Fix-forward A: finished v2 workouts persist through the canonical path so
// Progress/Today/Profile react (and sync auto-enqueues) — not just a local summary.
// P0 — «نجاح زائف»: الحفظ يُفحص الآن بنتيجة صريحة (كتابة + قراءة تحقّق) بدل
// try/catch فارغ، فلا نمسح الجلسة الجارية ولا نعرض «أحسنت» إن لم يُحفظ شيء.
import { commitFinishedSession } from '@/lib/finishWorkout'
import { addSession } from '@/lib/workoutSessions'
import type { WriteResult } from '@/lib/safeStorage'
import { workoutScreenStrings } from '@/i18n/dict/workoutScreen'
import { getDayStamp } from '@/lib/today'
import { buildV2WorkoutSession } from '@/lib/workoutV2Persist'
import {
  abandonedSessionFrom,
  clearPersistedActiveWorkout,
  isUsableActiveWorkout,
  reconcileWorkoutColdStart,
  releaseRestEndForSession,
  scheduleRestEndNotification,
} from '@/lib/workoutSessionEngine'
// Rule D — the finish is a suggestion, not a silent save: confirm before any
// write, and keep a snapshot so the short undo window can fully reverse it.
import { snapshotWorkoutStorage, restoreWorkoutStorage, type StorageSnapshot } from '@/lib/workoutFinishUndo'
import type { WorkoutSession } from '@/lib/workoutSessions'
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
import type { Profile } from '@/types/profile'
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

/** How long the "تراجع" (undo) affordance stays live on the complete screen. */
const UNDO_WINDOW_MS = 8000

/** A finish awaiting confirmation — computed with NO writes; the sheet shows it. */
interface PendingFinish {
  session: WorkoutSession
  prs: StrengthPR[]
  stats: { exercises: number; sets: number; minutes: number; volume: number }
}

/** State captured at confirm so the undo window can reverse the committed save. */
interface UndoState {
  snapshot: StorageSnapshot
  active: ActiveState
}
interface SetRow { weight: number; reps: number; done: boolean }
interface ActiveState {
  startedAt: number
  exIndex: number
  setIndex: number
  rows: Record<string, SetRow[]>
  /** Rest timer as timestamps (survives refresh + background) — see activeSession.ts. */
  rest?: RestSnapshot | null
  /** Screen 31 — chosen substitutes, keyed by plan-slot id → catalog exercise id.
   *  Lives inside the active session so it persists offline and survives refresh,
   *  and is fully reversed by the finish-undo snapshot (it is never a plan write). */
  subs?: Record<string, string>
}

type RecoveryPrompt =
  | { kind: 'abandoned'; session: ActiveState; ageMs: number; completedSets: number; alreadySaved: boolean }
  | { kind: 'plan-changed'; completedSets: number }

/** Apply the slot→substitute map over the plan exercises (identity swap only). */
function applySubs(list: WorkoutV2Exercise[], subs: Record<string, string> | undefined, lang: Lang): WorkoutV2Exercise[] {
  if (!subs || Object.keys(subs).length === 0) return list
  return list.map((e) => (subs[e.id] ? substituteWorkoutExercise(e, subs[e.id], lang) : e))
}

const parseReps = (reps: string): number => {
  const m = reps.match(/\d+/)
  return m ? Number(m[0]) : 10
}
const toAr = (n: number, lang: Lang) => (lang === 'en' ? String(n) : String(n).replace(/\d/g, (x) => '٠١٢٣٤٥٦٧٨٩'[Number(x)]))
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

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
  const exerciseIds = useMemo(() => model.exercises.map((exercise) => exercise.id), [model.exercises])

  const userId = useAuth().user?.id ?? null
  const ownerActiveKey = activeKey(userId)

  // One-time migration of the legacy flat summary key to the owner-scoped key
  // (ambiguous data discarded — see migrateLegacySummary). Runs once per owner.
  useEffect(() => { migrateLegacySummary(userId) }, [userId])
  const [screen, setScreen] = useState<Screen>('plan')
  useAppScrollReset(screen)
  // Immersive focus: the active/complete screens are fullscreen takeovers. Signal
  // the shell to make its chrome (header + nav) inert so VoiceOver can't reach
  // the background behind the workout (screen 27 — real modal focus).
  useEffect(() => {
    const immersive = screen === 'active' || screen === 'complete'
    window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: immersive }))
    return () => { window.dispatchEvent(new CustomEvent('qimmah:immersive', { detail: false })) }
  }, [screen])
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
  // Rule D finish flow: a finish awaiting confirmation (no writes yet), the
  // committed result shown on the complete screen, and the reversal snapshot for
  // the post-save undo window.
  const [pendingFinish, setPendingFinish] = useState<PendingFinish | null>(null)
  const [completed, setCompleted] = useState<PendingFinish | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)
  // سبب فشل آخر محاولة حفظ (null = لا فشل). يُعرض داخل ورقة التأكيد نفسها،
  // فيبقى المستخدم في تمرينه بدل أن يُقذف لشاشة نجاح كاذبة.
  const [saveError, setSaveError] = useState<WriteResult | null>(null)

  // ── Screen 31 (substitution) + screen 27 (one-handed) session state ──
  const profile = customization.profile
  // Pre-session substitutions (chosen from the Detail screen before starting) —
  // folded into the active session at startSession, then the active map is source.
  const [preSubs, setPreSubs] = useState<Record<string, string>>({})
  // The open substitution sheet (which slot + the identity it's swapping from).
  const [subSheet, setSubSheet] = useState<{ planExId: string; currentExerciseId: string } | null>(null)
  // The last applied swap, so a brief "تراجع" toast can reverse it (Rule D undo).
  const [subUndo, setSubUndo] = useState<{ planExId: string; prev: string | null; toName: string; scope: 'active' | 'pre' } | null>(null)
  // One-handed reach hand (device-level pref); the active controls mirror to it.
  const [hand, setHand] = useState<Handedness>(() => getHandedness())
  // Guard the destructive top "close" (discards the in-progress session) — screen
  // 27: no critical action fires from the top without confirmation.
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [recoveryPrompt, setRecoveryPrompt] = useState<RecoveryPrompt | null>(null)

  // In-workout hydration (screen 46) — user-controlled cadence, non-intrusive.
  const [hydrationPref, setHydrationPref] = useState<HydrationPref>(loadHydrationPref)
  const [hydrationNow, setHydrationNow] = useState(() => Date.now())
  // Reminders already logged/snoozed this session; the banner shows only when a
  // new interval falls due beyond this count.
  const [hydrationActed, setHydrationActed] = useState(0)
  const [hydrationUndo, setHydrationUndo] = useState<{ ml: number } | null>(null)

  // Coarse 30s tick for the hydration cadence — only while an active session is
  // open AND reminders are enabled; never runs otherwise (no idle timers).
  useEffect(() => {
    if (screen !== 'active' || !hydrationPref.enabled) return
    const id = window.setInterval(() => setHydrationNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [screen, hydrationPref.enabled])
  // Reset the per-session reminder count whenever a new session starts.
  useEffect(() => {
    setHydrationActed(0)
    setHydrationUndo(null)
    setHydrationNow(Date.now())
  }, [active?.startedAt])

  // Reconcile persisted work and stale rest notifications on cold start. Old or
  // plan-mismatched sessions are never deleted without an explicit user choice.
  useEffect(() => {
    if (!model.available) return
    let alive = true
    void reconcileWorkoutColdStart({ ownerId: userId, exerciseIds }).then((result) => {
      if (!alive) return
      const decision = result.decision
      if (decision.action === 'resume' && decision.session) {
        setActive(decision.session as ActiveState)
        setNow(Date.now())
        setScreen('active')
      } else if (decision.action === 'abandoned' && decision.session) {
        setRecoveryPrompt({
          kind: 'abandoned',
          session: decision.session as ActiveState,
          ageMs: decision.ageMs,
          completedSets: decision.completedSets,
          alreadySaved: result.alreadySaved,
        })
      } else if (decision.action === 'discard' && decision.discardReason === 'plan-changed' && decision.completedSets > 0) {
        setRecoveryPrompt({ kind: 'plan-changed', completedSets: decision.completedSets })
      } else if (decision.action === 'discard' && decision.discardReason === 'plan-changed') {
        // No completed work exists to preserve, so the stale empty shell can be
        // removed without asking the user to decide about data that is not there.
        clearPersistedActiveWorkout(userId)
      }
    })
    return () => { alive = false }
  }, [exerciseIds, model.available, userId])

  // Safety net: if we somehow end up on the active screen with an unusable
  // session (e.g. the plan regenerated mid-session), discard it and fall back to
  // Plan — from an EFFECT, so render stays pure and never dereferences undefined.
  useEffect(() => {
    if (screen === 'active' && !isUsableActiveWorkout(active, exerciseIds)) {
      setActive(null)
      setScreen('plan')
    }
  }, [screen, active, exerciseIds])

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
    const id = window.setTimeout(() => {
      void releaseRestEndForSession(userId)
      setActive((prev) => (prev ? { ...prev, rest: null } : prev))
    }, 2500)
    return () => window.clearTimeout(id)
  }, [restDone, userId])

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

  // Active-session exercises with substitutions applied (identity swap only).
  const effExercises = useMemo(() => applySubs(model.exercises, active?.subs, lang), [model.exercises, active?.subs, lang])

  if (model.restDay) return <RestDayScreen lang={lang} onNavigate={onNavigate} />
  if (!model.available) return <MissingPlan lang={lang} onNavigate={onNavigate} />

  const startSession = () => {
    const rows: Record<string, SetRow[]> = {}
    for (const ex of model.exercises) {
      rows[ex.id] = Array.from({ length: ex.sets }, () => ({ weight: ex.targetWeightKg ?? 20, reps: parseReps(ex.reps), done: false }))
    }
    // Carry any pre-session substitutions into the session (rows are keyed by
    // slot id, unaffected by an identity swap).
    setActive({ startedAt: Date.now(), exIndex: 0, setIndex: 0, rows, rest: null, subs: Object.keys(preSubs).length ? { ...preSubs } : undefined })
    setScreen('active')
  }

  const clearActive = () => {
    try { localStorage.removeItem(ownerActiveKey) } catch { /* ignore */ }
    void releaseRestEndForSession(userId)
    setActive(null)
    // Workout ended → apply any theme change that was deferred mid-set (screen 66).
    applyTheme()
  }

  // ── Rule D finish handlers — defined before the screen returns so the complete
  //    screen can reference undo. None require an active session at declaration;
  //    each guards internally. ──

  // Open the finish confirmation sheet — computes the session + candidate PRs
  // with NO writes (detectPRsForSession is read-only), so the sheet can show
  // exactly what WILL be saved. Reachable from the last set or the explicit
  // "أنهِ التمرين" button (early finish).
  const openFinish = (fromActive: ActiveState) => {
    const session = buildV2WorkoutSession(fromActive, model, { date: getDayStamp(), finishedAtMs: Date.now() })
    const prs = detectPRsForSession(session) // read-only — no permanent PR yet
    const done = Object.values(fromActive.rows).flat().filter((r) => r.done)
    setPendingFinish({
      session,
      prs,
      stats: {
        exercises: model.exercises.length,
        sets: done.length,
        minutes: Math.max(1, Math.round((Date.now() - fromActive.startedAt) / 60000)),
        volume: done.reduce((v, r) => v + r.weight * r.reps, 0),
      },
    })
  }

  // Cancel the sheet — return to the workout with ZERO writes.
  const cancelFinish = () => { setPendingFinish(null); setSaveError(null) }

  // Confirm — the ONLY place a finished session, its PRs, and the summary are
  // written. Snapshot first so the undo window can fully reverse the save.
  const confirmFinish = () => {
    if (!pendingFinish || !active) return
    const { session, prs, stats } = pendingFinish
    const snapshot = snapshotWorkoutStorage()
    try {
      saveWorkoutSummary(userId, { date: new Date().toISOString().slice(0, 10), title: model.session.title, totalSets: stats.sets, volume: stats.volume, durationMin: stats.minutes })
    } catch { /* ignore — the canonical persist below is what Progress reads */ }
    // Canonical persist — feeds historyStore (auto-enqueues sync) + exercise
    // history, so Progress / Today / Profile all react to this v2 workout. Unlike
    // before, it reports a real result: written-and-verified, or why it failed.
    const commit = commitFinishedSession(session)
    if (!commit.ok) {
      // Honest failure. Roll the partial write back to the pre-confirm snapshot so
      // a retry starts clean, then STAY here: the active workout is NOT cleared,
      // no completion screen, and the sheet explains what actually happened.
      restoreWorkoutStorage(snapshot)
      setSaveError(commit.failure ?? 'error')
      return
    }
    setSaveError(null)
    // PRs become permanent ONLY here, inside the confirmed AND verified save.
    if (prs.length > 0) {
      try {
        registerWorkoutPRs(toPRCelebrations(prs, (id) => { const e = getExercise(id); return { ar: e?.nameAr, en: e?.nameEn } }))
        void playHaptic('pr')
      } catch { /* a PR badge is a celebration, not the record — never trap the user */ }
    }
    setUndoState({ snapshot, active })
    setCompleted(pendingFinish)
    setPendingFinish(null)
    clearActive()
    setScreen('complete')
  }

  // Undo — reverse the confirmed save (sessions, exercise history, PRs, summary,
  // sync queue) and drop the user back into the still-active workout.
  const undoFinish = () => {
    if (!undoState) return
    restoreWorkoutStorage(undoState.snapshot)
    setActive(undoState.active)
    setCompleted(null)
    setUndoState(null)
    setNow(Date.now())
    setScreen('active')
    if (undoState.active.rest?.endsAt && undoState.active.rest.endsAt > Date.now()) {
      void scheduleRestEndNotification(undoState.active.rest.endsAt, lang, Date.now(), { ownerId: userId })
    }
  }

  const saveAbandoned = () => {
    if (recoveryPrompt?.kind !== 'abandoned') return
    if (!recoveryPrompt.alreadySaved) {
      addSession(abandonedSessionFrom(recoveryPrompt.session, model, { date: getDayStamp(), nowMs: Date.now() }))
    }
    clearPersistedActiveWorkout(userId)
    void releaseRestEndForSession(userId)
    setRecoveryPrompt(null)
    setActive(null)
    setScreen('plan')
  }

  const discardRecovered = () => {
    clearPersistedActiveWorkout(userId)
    void releaseRestEndForSession(userId)
    setRecoveryPrompt(null)
    setActive(null)
    setScreen('plan')
  }

  // ── Screen 31 — substitution (Rule D: suggestion → explicit choice → undo).
  //    Choosing an option is the ONLY thing that swaps the slot; nothing is
  //    written to the plan or history. Applied to the active session's `subs`
  //    (persisted, offline) mid-workout, or to `preSubs` from the Detail screen. ──
  const applySubstitute = (planExId: string, option: SubstituteOption, toName: string) => {
    void playHaptic('set')
    if (active) {
      const prev = active.subs?.[planExId] ?? null
      setActive((p) => (p ? { ...p, subs: { ...(p.subs ?? {}), [planExId]: option.exerciseId } } : p))
      setSubUndo({ planExId, prev, toName, scope: 'active' })
    } else {
      const prev = preSubs[planExId] ?? null
      setPreSubs((m) => ({ ...m, [planExId]: option.exerciseId }))
      setSubUndo({ planExId, prev, toName, scope: 'pre' })
    }
    setSubSheet(null)
  }

  const undoSubstitute = () => {
    if (!subUndo) return
    const { planExId, prev, scope } = subUndo
    const revert = (m: Record<string, string>) => {
      const next = { ...m }
      if (prev) next[planExId] = prev
      else delete next[planExId]
      return next
    }
    if (scope === 'active') setActive((p) => (p ? { ...p, subs: revert(p.subs ?? {}) } : p))
    else setPreSubs((m) => revert(m))
    setSubUndo(null)
  }

  // Screen 27 — flip the reach hand (persisted) so the controls mirror.
  const toggleHand = () => setHand((h) => { const n = otherHand(h); setHandedness(n); return n })

  // Guarded discard — the destructive close commits only after confirmation.
  const discardWorkout = () => { setConfirmDiscard(false); clearActive(); setPreSubs({}); onNavigate('dashboard') }

  const planScreen = <PlanScreen model={model} lang={lang} onExercise={(i) => { setDetailIdx(i); setScreen('detail') }} onStart={startSession} />
  const recoverySheet = recoveryPrompt ? (
    <RecoveryDecisionSheet
      lang={lang}
      prompt={recoveryPrompt}
      onSave={saveAbandoned}
      onDiscard={discardRecovered}
      onKeep={() => setRecoveryPrompt(null)}
    />
  ) : null
  if (screen === 'plan') return <>{planScreen}{recoverySheet}</>
  if (screen === 'detail') {
    const base = model.exercises[detailIdx]
    const detailEx = base ? applySubs([base], preSubs, lang)[0] : base
    return (
      <>
        <DetailScreen
          ex={detailEx}
          idx={detailIdx}
          total={model.exercises.length}
          lang={lang}
          swapped={base ? Boolean(preSubs[base.id]) : false}
          onReplace={base ? () => setSubSheet({ planExId: base.id, currentExerciseId: detailEx.exerciseId }) : undefined}
          onStart={startSession}
          onBack={() => setScreen('plan')}
        />
        {subSheet && (
          <SubstitutionSheet
            lang={lang}
            profile={profile}
            currentExerciseId={subSheet.currentExerciseId}
            onChoose={(opt) => applySubstitute(subSheet.planExId, opt, ar ? opt.nameAr : opt.nameEn)}
            onCancel={() => setSubSheet(null)}
          />
        )}
        {subUndo && <UndoSubToast lang={lang} toName={subUndo.toName} onUndo={undoSubstitute} onClose={() => setSubUndo(null)} />}
      </>
    )
  }
  if (screen === 'complete') return (
    <CompleteScreen
      model={model}
      lang={lang}
      stats={completed?.stats ?? null}
      prs={completed?.prs ?? []}
      canUndo={undoState != null}
      onUndo={undoFinish}
      onDone={() => { setCompleted(null); setUndoState(null); clearActive(); onNavigate('dashboard') }}
    />
  )

  // ── Active workout ── Render PURELY. If the session is not usable for the
  // current plan, render the Plan screen (the safety-net effect above resets the
  // screen state) — never call setState in render, never dereference undefined.
  if (!isUsableActiveWorkout(active, exerciseIds)) {
    return <>{planScreen}{recoverySheet}</>
  }
  // Displayed exercise reflects any substitution; its slot id is unchanged, so
  // rows (keyed by slot id) and length-based navigation stay valid.
  const ex = effExercises[active.exIndex]
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
      // Rule D: the last set does NOT save silently. Mark it done and OPEN the
      // "هل انتهيت؟" confirm sheet — nothing is written until the user confirms.
      const finalActive = {
        ...active,
        rows: { ...active.rows, [ex.id]: rows.map((r, i) => (i === active.setIndex ? { ...r, done: true } : r)) },
      }
      setActive(finalActive)
      openFinish(finalActive)
      return
    }
    // Mark done, advance, and start the rest — a single atomic update.
    const endsAt = Date.now() + REST_DEFAULT * 1000
    setActive((prev) => {
      if (!prev) return prev
      const arr = [...prev.rows[ex.id]]
      arr[prev.setIndex] = { ...arr[prev.setIndex], done: true }
      const rowsNext = { ...prev.rows, [ex.id]: arr }
      const advance = prev.setIndex < rows.length - 1
        ? { setIndex: prev.setIndex + 1 }
        : { exIndex: prev.exIndex + 1, setIndex: 0 }
      return { ...prev, ...advance, rows: rowsNext, rest: { endsAt, durationSec: REST_DEFAULT } }
    })
    void scheduleRestEndNotification(endsAt, lang, Date.now(), { ownerId: userId })
    setNow(Date.now())
  }

  const restLeft = active.rest ? restRemainingSec(active.rest.endsAt, now) : 0
  const addRest = () => {
    if (!active.rest) return
    const endsAt = active.rest.endsAt + REST_ADD * 1000
    setActive({ ...active, rest: { ...active.rest, endsAt } })
    void scheduleRestEndNotification(endsAt, lang, Date.now(), { ownerId: userId })
  }
  const skipRest = () => {
    void releaseRestEndForSession(userId)
    setActive((prev) => (prev ? { ...prev, rest: null } : prev))
  }

  // Hydration reminder is "due" when a fresh interval has elapsed beyond those
  // already handled this session. Derived from real elapsed time only.
  const hydrationDue = hydrationPref.enabled && remindersDue(active.startedAt, hydrationNow, hydrationPref.intervalMin) > hydrationActed
  const logWater = (ml: number) => {
    addTodayWaterMl(ml) // writes the SAME daily waterMl the nutrition screen reads
    setHydrationUndo({ ml })
    setHydrationActed((c) => c + 1)
  }
  const undoWater = () => {
    if (!hydrationUndo) return
    addTodayWaterMl(-hydrationUndo.ml)
    setHydrationUndo(null)
  }
  const snoozeHydration = () => { setHydrationActed((c) => c + 1); setHydrationUndo(null) }
  const setHydrationInterval = (min: number) => setHydrationPref(saveHydrationPref({ ...hydrationPref, intervalMin: min }))
  const disableHydration = () => { setHydrationPref(saveHydrationPref({ ...hydrationPref, enabled: false })); setHydrationUndo(null) }

  return (
    <div role="dialog" aria-modal="true" aria-label={t('التمرين النشط', 'Active workout')} dir={ar ? 'rtl' : 'ltr'} className="v2-surface-dark v2-screen-enter fixed inset-0 z-[60] flex flex-col bg-page text-ink-900" style={{ paddingTop: 'max(0.75rem, var(--safe-top))', paddingBottom: 'var(--safe-bottom)' }}>
      <header className="flex items-center justify-between gap-3 px-5 py-2">
        <button type="button" onClick={() => setConfirmDiscard(true)} aria-label={t('إغلاق التمرين', 'Close workout')} className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}`, color: FOCUS.ink }}>
          <Icon name="X" className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold tabular-nums" style={{ color: FOCUS.inkMuted }}>{t(`التمرين ${toAr(active.exIndex + 1, lang)} من ${toAr(model.exercises.length, lang)}`, `Exercise ${active.exIndex + 1} of ${model.exercises.length}`)}</span>
        <span className="grid h-10 w-10 place-items-center rounded-xl text-xs font-black tabular-nums" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }} aria-label={t(`${toAr(doneSets, lang)} من ${toAr(totalPlannedSets, lang)} مجموعات مكتملة`, `${doneSets} of ${totalPlannedSets} sets done`)}>{toAr(doneSets, lang)}/{toAr(totalPlannedSets, lang)}</span>
      </header>
      {/* session progress (completed sets) */}
      <div className="mx-5 mb-1 h-1.5 overflow-hidden rounded-full" style={{ background: FOCUS.line }}>
        <div className="v2-fill h-full rounded-full" style={{ width: `${totalPlannedSets ? (doneSets / totalPlannedSets) * 100 : 0}%`, background: FOCUS.blue }} />
      </div>

      {/* Hydration reminder (screen 46) — slim, teal, above the editor; never
          overlays the set editor or interrupts the rest timer. */}
      {hydrationDue && (
        <HydrationReminder lang={lang} intervalMin={hydrationPref.intervalMin} onLog={logWater} onSnooze={snoozeHydration} onSetInterval={setHydrationInterval} onDisable={disableHydration} />
      )}
      {hydrationUndo && (
        <div className="mx-5 mb-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: 'color-mix(in srgb, var(--v2-teal) 14%, transparent)', border: `1px solid var(--v2-teal)`, color: 'var(--v2-teal-text)' }} role="status">
          <span>{t(`أُضيف ${toAr(hydrationUndo.ml, lang)} مل`, `Added ${hydrationUndo.ml} ml`)} 💧</span>
          <button type="button" onClick={undoWater} className="v2-pressable underline underline-offset-2">{t('تراجع', 'Undo')}</button>
        </div>
      )}

      {resting ? (
        <RestPanel lang={lang} restLeft={restLeft} restDone={restDone} nextEx={effExercises[active.exIndex]} setLabel={t(`المجموعة ${toAr(active.setIndex + 1, lang)}`, `Set ${active.setIndex + 1}`)} tip={restTip} tipDismissed={tipDismissed} onDismissTip={() => setTipDismissed(true)} onAdd={addRest} onSkip={skipRest} />
      ) : (
        <>
          <main className="flex flex-1 flex-col overflow-y-auto px-5 pb-3">
            <div className="mt-2 shrink-0 overflow-hidden rounded-2xl" aria-hidden="true">
              <ExerciseMedia exerciseId={ex.exerciseId} heightClass="h-32" hideChips />
            </div>
            <h1 className="mt-2 text-2xl font-black leading-tight">{ar ? ex.nameAr : ex.nameEn}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-bold" style={{ color: FOCUS.inkMuted }}>
              <span>{CATEGORY_LABEL[ex.category][ar ? 'ar' : 'en']} · {ex.sets}×{ex.reps}</span>
              {active.subs?.[ex.id] && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-black" style={{ background: 'color-mix(in srgb, var(--v2-blue) 16%, transparent)', color: FOCUS.blue }}>
                  <Icon name="Repeat" className="h-3 w-3" />{t('مُستبدَل', 'Swapped')}
                </span>
              )}
            </p>

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
          </main>

          {/* ── One-handed control cluster (screen 27) — anchored in the bottom
                thumb arc; the reach-hand toggle mirrors the paired controls. ── */}
          <div className="shrink-0 px-5 pt-3" style={{ borderTop: `1px solid ${FOCUS.line}` }}>
            {/* secondary row: substitute (screen 31) + reach-hand toggle */}
            <div className="mb-3 flex items-center justify-between gap-2" style={{ flexDirection: hand === 'left' ? 'row-reverse' : 'row' }}>
              <button type="button" onClick={() => setSubSheet({ planExId: ex.id, currentExerciseId: ex.exerciseId })} className="v2-pressable flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }}>
                <Icon name="Repeat" className="h-4 w-4" />{t('استبدال التمرين', 'Replace exercise')}
              </button>
              <button type="button" onClick={toggleHand} aria-pressed={hand === 'left'} aria-label={t(hand === 'left' ? 'وضع اليد اليمنى' : 'وضع اليد اليسرى', hand === 'left' ? 'Switch to right hand' : 'Switch to left hand')} className="v2-pressable flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }}>
                <Icon name="Hand" className="h-4 w-4" style={{ transform: hand === 'left' ? 'scaleX(-1)' : undefined }} />{t(hand === 'left' ? 'يسار' : 'يمين', hand === 'left' ? 'Left' : 'Right')}
              </button>
            </div>

            {/* Plate calculator — one tap from the weight field. */}
            {platesOpen && <PlateStackPanel lang={lang} weight={row.weight} config={plateConfig} onClose={() => setPlatesOpen(false)} />}

            {/* current set editor — big controls, mirrored to the reach hand */}
            <div className="mt-1 flex gap-3" style={{ flexDirection: hand === 'left' ? 'row-reverse' : 'row' }}>
              <div className="flex-1">
                <Stepper
                  label={t('الوزن · كجم', 'Weight · kg')}
                  value={row.weight}
                  step={2.5}
                  onChange={(v) => setRow({ weight: Math.max(0, v) })}
                  lang={lang}
                  mirror={hand === 'left'}
                  onPlates={() => setPlatesOpen((o) => !o)}
                  platesOpen={platesOpen}
                />
              </div>
              <div className="flex-1">
                <Stepper label={t('التكرار', 'Reps')} value={row.reps} step={1} onChange={(v) => setRow({ reps: Math.max(0, v) })} lang={lang} mirror={hand === 'left'} />
              </div>
            </div>

            {/* single ember action */}
            <button type="button" onClick={finishSet} className="v2-pressable mt-4 w-full rounded-2xl py-4 text-[1.1875rem] font-black" style={{ background: FOCUS.ember, color: FOCUS.onColor }}>{t('أنهِ المجموعة', 'Complete set')}</button>
            {/* Explicit finish — Rule D: opens the confirm sheet, never saves directly.
                Available once any set is logged, so an early finish still confirms. */}
            {doneSets >= 1 && (
              <button type="button" onClick={() => openFinish(active)} className="v2-pressable mb-2 mt-3 w-full rounded-2xl py-3 text-sm font-bold" style={{ background: 'transparent', border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }}>{t('أنهِ التمرين', 'Finish workout')}</button>
            )}
          </div>
        </>
      )}

      {/* هل انتهيت؟ — confirm sheet. NOTHING is written until "confirm". */}
      {pendingFinish && (
        <FinishConfirmSheet lang={lang} pending={pendingFinish} saveError={saveError} onConfirm={confirmFinish} onCancel={cancelFinish} />
      )}

      {/* استبدال — non-destructive suggestion sheet (screen 31, Rule D). */}
      {subSheet && (
        <SubstitutionSheet
          lang={lang}
          profile={profile}
          currentExerciseId={subSheet.currentExerciseId}
          onChoose={(opt) => applySubstitute(subSheet.planExId, opt, ar ? opt.nameAr : opt.nameEn)}
          onCancel={() => setSubSheet(null)}
        />
      )}
      {subUndo && <UndoSubToast lang={lang} toName={subUndo.toName} onUndo={undoSubstitute} onClose={() => setSubUndo(null)} />}

      {/* تجاهل التمرين؟ — guarded destructive close (screen 27). */}
      {confirmDiscard && <DiscardConfirmSheet lang={lang} onDiscard={discardWorkout} onCancel={() => setConfirmDiscard(false)} />}
    </div>
  )
}

function RecoveryDecisionSheet({
  lang,
  prompt,
  onSave,
  onDiscard,
  onKeep,
}: {
  lang: Lang
  prompt: RecoveryPrompt
  onSave: () => void
  onDiscard: () => void
  onKeep: () => void
}) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const ageHours = prompt.kind === 'abandoned' ? Math.max(1, Math.floor(prompt.ageMs / 3_600_000)) : 0
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/45 p-3" role="dialog" aria-modal="true" aria-label={t('استعادة تمرين سابق', 'Recover an earlier workout')}>
      <section className="mx-auto w-full max-w-md rounded-[1.75rem] bg-surface p-5 shadow-2xl">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-beige text-ink-700">
          <Icon name="History" className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-xl font-black text-ink-900">
          {prompt.kind === 'abandoned'
            ? t('لقينا تمرينًا قديمًا', 'We found an older workout')
            : t('تغيّرت خطتك وفيه تمرين محفوظ', 'Your plan changed with a workout still saved')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {prompt.kind === 'abandoned'
            ? t(
                `بدأ قبل ${ageHours.toLocaleString('ar-SA')} ساعة وفيه ${prompt.completedSets.toLocaleString('ar-SA')} مجموعات مسجّلة. اختر حفظ العمل الفعلي أو تجاهله.`,
                `It started ${ageHours} hours ago and contains ${prompt.completedSets} logged sets. Save the recorded work or discard it.`,
              )
            : t(
                `عندك ${prompt.completedSets.toLocaleString('ar-SA')} مجموعات من الخطة السابقة. لن نحذفها بدون قرارك.`,
                `You have ${prompt.completedSets} sets from the previous plan. We will not delete them without your choice.`,
              )}
        </p>
        <div className="mt-5 grid gap-2">
          {prompt.kind === 'abandoned' && (
            <button type="button" onClick={onSave} className="btn-primary w-full py-3">
              {prompt.alreadySaved ? t('تم الحفظ · أغلق', 'Already saved · close') : t('احفظ المجموعات المسجّلة', 'Save logged sets')}
            </button>
          )}
          <button type="button" onClick={onDiscard} className="btn-ghost w-full py-3 text-danger">
            {t('تجاهل التمرين', 'Discard workout')}
          </button>
          {prompt.kind === 'plan-changed' && (
            <button type="button" onClick={onKeep} className="btn-ghost w-full py-3">
              {t('احتفظ به الآن', 'Keep it for now')}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function Stepper({ label, value, step, onChange, lang, mirror, onPlates, platesOpen }: { label: string; value: number; step: number; onChange: (v: number) => void; lang: Lang; mirror?: boolean; onPlates?: () => void; platesOpen?: boolean }) {
  const ar = lang !== 'en'
  return (
    <div className="rounded-2xl p-3" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}` }}>
      <div className="flex items-center justify-center gap-1.5">
        <p className="text-center text-xs font-bold" style={{ color: FOCUS.inkMuted }}>{label}</p>
        {onPlates && (
          <button type="button" onClick={onPlates} aria-label={ar ? 'حاسبة الأقراص' : 'Plate calculator'} aria-pressed={platesOpen} className="relative grid h-6 w-6 place-items-center rounded-lg before:absolute before:-inset-2.5 before:content-['']" style={{ background: platesOpen ? FOCUS.blue : FOCUS.cardActive, border: `1px solid ${FOCUS.line}`, color: platesOpen ? FOCUS.onColor : FOCUS.inkMuted }}>
            <Icon name="Layers" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {/* − value + — mirrored to the reach hand so "+" lands under the thumb. */}
      <div className="mt-2 flex items-center justify-between gap-2" style={{ flexDirection: mirror ? 'row-reverse' : 'row' }}>
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
/**
 * In-workout hydration reminder (screen 46). Teal, non-intrusive: sits above the
 * set editor, never overlays it. The user logs a real amount (250/500/custom),
 * can undo (handled by the parent), tune the cadence, or turn it off entirely.
 * Basis shown ("every N min") — purely time-based, nothing invented.
 */
function HydrationReminder({ lang, intervalMin, onLog, onSnooze, onSetInterval, onDisable }: { lang: Lang; intervalMin: number; onLog: (ml: number) => void; onSnooze: () => void; onSetInterval: (min: number) => void; onDisable: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const INTERVALS = [15, 20, 30, 45, 60]
  return (
    <section
      aria-label={t('تذكير الترطيب', 'Hydration reminder')}
      className="mx-5 mb-2 rounded-2xl p-3"
      style={{ background: 'color-mix(in srgb, var(--v2-teal) 12%, transparent)', border: `1px solid var(--v2-teal)`, color: 'var(--v2-teal-text)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-black">💧 {t('وقت الترطيب', 'Hydration time')}</span>
        <button type="button" onClick={onSnooze} className="v2-pressable text-xs font-bold underline underline-offset-2">{t('لاحقًا', 'Later')}</button>
      </div>
      <p className="mt-0.5 text-[0.7rem] font-bold opacity-80">{t(`كل ${toAr(intervalMin, lang)} دقيقة أثناء الجلسة`, `Every ${intervalMin} min during your session`)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[250, 500].map((ml) => (
          <button key={ml} type="button" onClick={() => onLog(ml)} className="v2-pressable rounded-xl px-3 py-1.5 text-xs font-black" style={{ background: 'var(--v2-teal)', color: 'var(--c-white, #fff)' }}>
            {toAr(ml, lang)} {t('مل', 'ml')}
          </button>
        ))}
        <button type="button" onClick={() => setCustomOpen((o) => !o)} className="v2-pressable rounded-xl px-3 py-1.5 text-xs font-bold" style={{ border: `1px solid var(--v2-teal)` }}>{t('مخصّص', 'Custom')}</button>
      </div>
      {customOpen && (
        <div className="mt-2 flex items-center gap-2">
          <input type="number" inputMode="numeric" min={0} value={custom} onChange={(e) => setCustom(e.target.value)} aria-label={t('كمية مخصّصة بالمل', 'Custom amount in ml')} placeholder={t('مل', 'ml')} className="w-24 rounded-xl bg-transparent px-3 py-1.5 text-sm font-bold tabular-nums" style={{ border: `1px solid var(--v2-teal)`, color: 'var(--v2-teal-text)' }} />
          <button type="button" onClick={() => { const v = Number(custom); if (Number.isFinite(v) && v > 0) { onLog(v); setCustom(''); setCustomOpen(false) } }} className="v2-pressable rounded-xl px-3 py-1.5 text-xs font-black" style={{ background: 'var(--v2-teal)', color: 'var(--c-white, #fff)' }}>{t('سجّل', 'Log')}</button>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[0.7rem] font-bold opacity-80">{t('كل:', 'Every:')}</span>
        {INTERVALS.map((m) => (
          <button key={m} type="button" onClick={() => onSetInterval(m)} aria-pressed={m === intervalMin} className="v2-pressable rounded-lg px-2 py-1 text-[0.7rem] font-black" style={m === intervalMin ? { background: 'var(--v2-teal)', color: 'var(--c-white, #fff)' } : { border: `1px solid var(--v2-teal)` }}>
            {toAr(m, lang)}
          </button>
        ))}
        <button type="button" onClick={onDisable} className="v2-pressable ms-auto text-[0.7rem] font-bold underline underline-offset-2">{t('إيقاف التذكير', 'Turn off')}</button>
      </div>
    </section>
  )
}

function WarmupPanel({ lang, sets, onDismiss, onDisable }: { lang: Lang; sets: WarmupSet[]; onDismiss: () => void; onDisable: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  if (sets.length === 0) return null
  return (
    <div className="mt-5 rounded-2xl p-4" style={{ background: FOCUS.card, border: `1px solid ${FOCUS.line}` }} role="group" aria-label={t('إحماء', 'Warm-up')}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-black" style={{ color: FOCUS.teal }}><Icon name="Flame" className="h-4 w-4" />{t('إحماء مقترح', 'Suggested warm-up')}</span>
        <button type="button" onClick={onDismiss} aria-label={t('إخفاء', 'Dismiss')} className="relative grid h-7 w-7 place-items-center rounded-lg before:absolute before:-inset-2 before:content-['']" style={{ background: FOCUS.cardActive, color: FOCUS.inkMuted }}><Icon name="X" className="h-4 w-4" /></button>
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
  const showTip = !restDone && tip != null && !tipDismissed
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
              <p className="flex-1 text-[0.8125rem] font-medium leading-relaxed" style={{ color: FOCUS.inkMuted }}><bdi>{ar ? tip.textAr : tip.textEn}</bdi></p>
              <button type="button" onClick={onDismissTip} aria-label={ar ? 'إخفاء النصيحة' : 'Dismiss tip'} className="-me-1 -mt-1 shrink-0 rounded-lg p-1.5" style={{ color: FOCUS.inkFaint }}><Icon name="X" className="h-4 w-4" /></button>
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

function PlanScreen({ model, lang, onExercise, onStart }: { model: ReturnType<typeof buildWorkoutV2Model>; lang: Lang; onExercise: (i: number) => void; onStart: () => void }) {
  const ar = lang !== 'en'
  const groups: { cat: ExCategory; items: { ex: WorkoutV2Exercise; i: number }[] }[] = []
  model.exercises.forEach((ex, i) => {
    const g = groups.find((x) => x.cat === ex.category)
    if (g) g.items.push({ ex, i })
    else groups.push({ cat: ex.category, items: [{ ex, i }] })
  })
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-6 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <p className="v2-text-blue pt-1 text-xs font-black uppercase tracking-wider">{ar ? model.program.titleAr : model.program.titleEn} · {ar ? model.program.contextAr : model.program.contextEn}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{model.session.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink-500">
          <Chip icon="Dumbbell" text={`${model.session.exerciseCount} ${ar ? 'تمارين' : 'exercises'}`} />
          <Chip icon="Clock" text={`~${model.session.durationMin} ${ar ? 'دقيقة' : 'min'}`} />
          {model.session.muscles.slice(0, 2).map((m) => <Chip key={m} icon="Target" text={muscleLabel(m as Muscle, lang)} />)}
        </div>

        <button type="button" onClick={onStart} className="btn-primary mt-5 w-full py-4 text-[1.1875rem] shadow-glow">{ar ? 'ابدأ الجلسة' : 'Start session'}</button>

        <div className="mt-6 space-y-5">
          {groups.map((g) => (
            <div key={g.cat}>
              <p className="mb-2 text-sm font-black text-ink-700">{CATEGORY_LABEL[g.cat][ar ? 'ar' : 'en']}</p>
              <div className="space-y-2">
                {g.items.map(({ ex, i }) => (
                  <button key={ex.id} type="button" onClick={() => onExercise(i)} className="v2-pressable flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start hover:border-[color:var(--v2-blue)]">
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-beige">
                      <ExerciseMedia exerciseId={ex.exerciseId} heightClass="h-14" hideChips />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{ar ? ex.nameAr : ex.nameEn}</span>
                      <span className="block text-xs text-ink-500">{ex.sets}×{ex.reps}{ex.equipment[0] ? ` · ${equipmentLabel(ex.equipment[0], lang)}` : ''}</span>
                    </span>
                    <Icon name="ChevronLeft" className="h-4 w-4 shrink-0 text-ink-400 rtl:rotate-0 ltr:rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DetailScreen({ ex, idx, total, lang, swapped, onReplace, onStart, onBack }: { ex: WorkoutV2Exercise; idx: number; total: number; lang: Lang; swapped?: boolean; onReplace?: () => void; onStart: () => void; onBack: () => void }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light bg-page px-4 pb-6 pt-3 text-ink-900">
      <div className="v2-screen-enter mx-auto w-full max-w-md">
        <button type="button" onClick={onBack} aria-label={ar ? 'رجوع' : 'Back'} className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface"><Icon name="ChevronRight" className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" /></button>
        <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-line bg-surface">
          <ExerciseMedia exerciseId={ex.exerciseId} heightClass="h-full" hideChips />
        </div>
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
          <button type="button" onClick={onReplace} disabled={!onReplace} aria-disabled={!onReplace} className="v2-pressable flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 text-sm font-bold text-ink-700">
            <Icon name="Repeat" className="h-4 w-4" />{swapped ? (ar ? 'استبدال آخر' : 'Replace again') : (ar ? 'استبدال التمرين' : 'Replace exercise')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompleteScreen({ model, lang, stats, prs, canUndo, onUndo, onDone }: { model: ReturnType<typeof buildWorkoutV2Model>; lang: Lang; stats: PendingFinish['stats'] | null; prs: StrengthPR[]; canUndo: boolean; onUndo: () => void; onDone: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const totalSets = stats?.sets ?? 0
  const volume = stats?.volume ?? 0
  const durationMin = stats?.minutes ?? 0
  // Undo window: the "تراجع" affordance is live for UNDO_WINDOW_MS, then retires.
  const [undoLive, setUndoLive] = useState(canUndo)
  useEffect(() => {
    if (!canUndo) { setUndoLive(false); return }
    setUndoLive(true)
    const id = window.setTimeout(() => setUndoLive(false), UNDO_WINDOW_MS)
    return () => window.clearTimeout(id)
  }, [canUndo])
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
      <button type="button" onClick={onDone} className="v2-pressable mt-8 w-full max-w-xs rounded-2xl py-4 text-[1.1875rem] font-black" style={{ background: FOCUS.ember, color: FOCUS.onColor }}>{ar ? 'تم' : 'Done'}</button>
      {/* Undo — reverses the just-saved session/PRs while the window is live. */}
      {undoLive
        ? <button type="button" onClick={onUndo} className="mt-3 flex items-center gap-1.5 text-sm font-bold underline underline-offset-4" style={{ color: FOCUS.inkMuted }}><Icon name="RotateCcw" className="h-4 w-4" />{ar ? 'تراجع عن الحفظ' : 'Undo save'}</button>
        : <p className="mt-3 text-[0.7rem]" style={{ color: FOCUS.inkFaint }}>{ar ? 'محفوظ على هذا الجهاز فقط.' : 'Saved on this device only.'}</p>}
    </div>
  )
}

/**
 * "هل انتهيت؟" — the finish confirmation sheet (Rule D, standard screen 34).
 * Shows exactly what will be saved (exercises · sets · minutes · candidate PRs)
 * before ANY write. Cancel returns to the workout untouched; confirm commits.
 */
function FinishConfirmSheet({ lang, pending, saveError, onConfirm, onCancel }: { lang: Lang; pending: PendingFinish; saveError: WriteResult | null; onConfirm: () => void; onCancel: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const d = workoutScreenStrings[lang]
  const { stats, prs } = pending
  const prLifts = [...new Set(prs.map((p) => p.exerciseId))]
  // نصّ صادق يميّز «المساحة ممتلئة» عن «التخزين محجوب» عن خطأ غير معروف.
  const failureBody = saveError === 'quota' ? d.saveFailedQuota : saveError === 'unavailable' ? d.saveFailedBlocked : d.saveFailedGeneric
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t('تأكيد إنهاء التمرين', 'Confirm finish workout')}>
      <button type="button" aria-label={t('إلغاء', 'Cancel')} onClick={onCancel} className="absolute inset-0 h-full w-full" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-dark v2-screen-enter relative w-full max-w-md rounded-t-3xl px-6 pb-8 pt-5 text-ink-900" style={{ background: FOCUS.card, borderTop: `1px solid ${FOCUS.line}`, paddingBottom: 'calc(2rem + var(--safe-bottom))' }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: FOCUS.line }} />
        <h2 className="text-2xl font-black">{ar ? 'هل انتهيت؟' : 'Finished?'}</h2>
        <p className="mt-1 text-sm" style={{ color: FOCUS.inkMuted }}>{ar ? 'سنحفظ هذه الجلسة على جهازك.' : "We'll save this session on your device."}</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <FocusStat label={ar ? 'تمارين' : 'Exercises'} value={toAr(stats.exercises, lang)} />
          <FocusStat label={ar ? 'المجموعات' : 'Sets'} value={toAr(stats.sets, lang)} />
          <FocusStat label={ar ? 'الدقائق' : 'Minutes'} value={toAr(stats.minutes, lang)} />
        </div>
        {prLifts.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl py-2 text-xs font-bold" style={{ background: 'color-mix(in srgb, var(--v2-green) 12%, transparent)', border: `1px solid ${FOCUS.success}`, color: FOCUS.success }}>
            <Icon name="Trophy" className="h-4 w-4" />
            {t(`${toAr(prLifts.length, lang)} رقم قياسي مرشّح`, `${prLifts.length} candidate PR${prLifts.length > 1 ? 's' : ''}`)}
          </div>
        )}
        {saveError && (
          <div role="alert" aria-live="assertive" className="mt-4 rounded-2xl px-4 py-3 text-start" style={{ background: 'color-mix(in srgb, var(--v2-error) 12%, transparent)', border: `1px solid ${FOCUS.error}` }}>
            <div className="flex items-center gap-2 text-sm font-black" style={{ color: FOCUS.error }}>
              <Icon name="AlertTriangle" className="h-4 w-4 shrink-0" />
              <span>{d.saveFailedTitle}</span>
            </div>
            <p className="mt-1 text-xs font-bold leading-relaxed" style={{ color: FOCUS.inkMuted }}>{failureBody}</p>
            <p className="mt-1 text-xs font-bold leading-relaxed" style={{ color: FOCUS.inkMuted }}>{d.saveFailedKept}</p>
          </div>
        )}
        <button type="button" onClick={onConfirm} className="v2-pressable mt-5 w-full rounded-2xl py-4 text-[1.1875rem] font-black" style={{ background: FOCUS.ember, color: FOCUS.onColor }}>{saveError ? d.saveRetry : ar ? 'نعم، احفظ وأنهِ' : 'Yes, save & finish'}</button>
        <button type="button" onClick={onCancel} className="v2-pressable mt-3 w-full rounded-2xl py-3 text-sm font-bold" style={{ background: 'transparent', border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }}>{ar ? 'لا، أكمل التمرين' : 'No, keep training'}</button>
      </div>
    </div>
  )
}

/**
 * استبدال — the substitution sheet (Rule D, standard screen 31). A NON-destructive
 * suggestion: it lists equipment-aware alternatives that preserve the movement
 * pattern, and only the user's explicit tap swaps the slot (with a follow-up undo
 * toast). Cancel closes with zero writes. The reason chips reshape the equipment
 * gate + ranking for the three real cases: جهاز مشغول / غير متاح / في المنزل.
 */
function SubstitutionSheet({ lang, profile, currentExerciseId, onChoose, onCancel }: { lang: Lang; profile: Profile; currentExerciseId: string; onChoose: (opt: SubstituteOption) => void; onCancel: () => void }) {
  const ar = lang !== 'en'
  const t = (a: string, e: string) => (ar ? a : e)
  const [reason, setReason] = useState<SubReason>('busy')
  const options = useMemo(() => findSubstitutes(currentExerciseId, profile, reason), [currentExerciseId, profile, reason])
  const reasons: { id: SubReason; ar: string; en: string }[] = [
    { id: 'busy', ar: 'الجهاز مشغول', en: 'Machine busy' },
    { id: 'unavailable', ar: 'غير متاح', en: 'Unavailable' },
    { id: 'home', ar: 'في المنزل', en: 'At home' },
  ]
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t('استبدال التمرين', 'Replace exercise')}>
      <button type="button" aria-label={t('إلغاء', 'Cancel')} onClick={onCancel} className="absolute inset-0 h-full w-full" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-dark v2-screen-enter relative flex w-full max-w-md flex-col rounded-t-3xl px-6 pb-8 pt-5 text-ink-900" style={{ background: FOCUS.card, borderTop: `1px solid ${FOCUS.line}`, maxHeight: '82vh', paddingBottom: 'calc(2rem + var(--safe-bottom))' }}>
        <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full" style={{ background: FOCUS.line }} />
        <h2 className="shrink-0 text-2xl font-black">{ar ? 'استبدال التمرين' : 'Replace exercise'}</h2>
        <p className="mt-1 shrink-0 text-sm" style={{ color: FOCUS.inkMuted }}>{ar ? 'بدائل تحفظ نمط الحركة · بمعدّاتك فقط.' : 'Alternatives that keep the movement — your equipment only.'}</p>

        {/* reason chips — reshape the equipment gate + ranking */}
        <div className="mt-4 flex shrink-0 flex-wrap gap-2">
          {reasons.map((r) => {
            const on = r.id === reason
            return (
              <button key={r.id} type="button" onClick={() => setReason(r.id)} aria-pressed={on} className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: on ? FOCUS.blue : FOCUS.cardActive, border: `1px solid ${on ? FOCUS.blue : FOCUS.line}`, color: on ? FOCUS.onColor : FOCUS.inkMuted }}>
                {ar ? r.ar : r.en}
              </button>
            )
          })}
        </div>

        {/* options list */}
        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {options.length === 0 ? (
            <div className="rounded-2xl px-4 py-6 text-center" style={{ background: FOCUS.cardActive, border: `1px solid ${FOCUS.line}` }}>
              <Icon name="Search" className="mx-auto h-6 w-6" style={{ color: FOCUS.inkFaint }} />
              <p className="mt-2 text-sm font-bold" style={{ color: FOCUS.inkMuted }}>{ar ? 'لا بدائل بمعدّاتك لهذه الحالة.' : 'No alternatives for your equipment here.'}</p>
              <p className="mt-1 text-xs" style={{ color: FOCUS.inkFaint }}>{ar ? 'جرّب حالة أخرى بالأعلى.' : 'Try another case above.'}</p>
            </div>
          ) : (
            options.map((opt) => (
              <button key={opt.exerciseId} type="button" onClick={() => onChoose(opt)} className="v2-pressable flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start" style={{ background: FOCUS.cardActive, border: `1px solid ${FOCUS.line}` }}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: FOCUS.card, color: FOCUS.inkMuted }}><Icon name="Dumbbell" className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold" style={{ color: FOCUS.ink }}>{ar ? opt.nameAr : opt.nameEn}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs" style={{ color: FOCUS.inkFaint }}>{opt.equipment.join(' · ')}</span>
                    {opt.differentStation && (reason === 'busy' || reason === 'unavailable') && (
                      <span className="rounded-full px-1.5 py-0.5 text-[0.65rem] font-black" style={{ background: 'color-mix(in srgb, var(--v2-teal) 18%, transparent)', color: FOCUS.teal }}>{ar ? 'محطة مختلفة' : 'Different station'}</span>
                    )}
                    {opt.curated && (
                      <span className="rounded-full px-1.5 py-0.5 text-[0.65rem] font-black" style={{ background: 'color-mix(in srgb, var(--v2-blue) 16%, transparent)', color: FOCUS.blue }}>{ar ? 'مُوصى' : 'Recommended'}</span>
                    )}
                  </span>
                </span>
                <Icon name="Repeat" className="h-4 w-4 shrink-0" style={{ color: FOCUS.inkMuted }} />
              </button>
            ))
          )}
        </div>

        <button type="button" onClick={onCancel} className="v2-pressable mt-4 w-full shrink-0 rounded-2xl py-3 text-sm font-bold" style={{ background: 'transparent', border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }}>{ar ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </div>
  )
}

/** Undo toast for a just-applied substitution — reverses the swap in one tap. */
function UndoSubToast({ lang, toName, onUndo, onClose }: { lang: Lang; toName: string; onUndo: () => void; onClose: () => void }) {
  const ar = lang !== 'en'
  // Auto-dismiss after a short window; the swap itself stays applied.
  useEffect(() => {
    const id = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toName])
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-screen-enter fixed inset-x-4 z-[75] flex items-center justify-between gap-3 rounded-2xl px-4 py-3" role="status" aria-live="polite" style={{ bottom: 'calc(1.25rem + var(--safe-bottom))', background: FOCUS.cardActive, border: `1px solid ${FOCUS.line}`, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
      <span className="min-w-0 flex-1 text-sm font-bold" style={{ color: FOCUS.ink }}><bdi>{toName}</bdi> · {ar ? 'تم الاستبدال' : 'Swapped in'}</span>
      <button type="button" onClick={onUndo} className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-black" style={{ background: FOCUS.card, color: FOCUS.blue }}><Icon name="RotateCcw" className="h-4 w-4" />{ar ? 'تراجع' : 'Undo'}</button>
    </div>
  )
}

/** تجاهل التمرين؟ — confirm before the destructive close discards the session. */
function DiscardConfirmSheet({ lang, onDiscard, onCancel }: { lang: Lang; onDiscard: () => void; onCancel: () => void }) {
  const ar = lang !== 'en'
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={ar ? 'تأكيد تجاهل التمرين' : 'Confirm discard workout'}>
      <button type="button" aria-label={ar ? 'إلغاء' : 'Cancel'} onClick={onCancel} className="absolute inset-0 h-full w-full" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-dark v2-screen-enter relative w-full max-w-md rounded-t-3xl px-6 pb-8 pt-5 text-ink-900" style={{ background: FOCUS.card, borderTop: `1px solid ${FOCUS.line}`, paddingBottom: 'calc(2rem + var(--safe-bottom))' }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: FOCUS.line }} />
        <h2 className="text-2xl font-black">{ar ? 'تجاهل التمرين؟' : 'Discard workout?'}</h2>
        <p className="mt-1 text-sm" style={{ color: FOCUS.inkMuted }}>{ar ? 'لن يُحفظ تقدّمك في هذه الجلسة.' : "Your progress in this session won't be saved."}</p>
        <button type="button" onClick={onDiscard} className="v2-pressable mt-5 w-full rounded-2xl py-4 text-[1.1875rem] font-black" style={{ background: FOCUS.error, color: FOCUS.onColor }}>{ar ? 'نعم، تجاهل' : 'Yes, discard'}</button>
        <button type="button" onClick={onCancel} className="v2-pressable mt-3 w-full rounded-2xl py-3 text-sm font-bold" style={{ background: 'transparent', border: `1px solid ${FOCUS.line}`, color: FOCUS.inkMuted }}>{ar ? 'لا، أكمل التمرين' : 'No, keep training'}</button>
      </div>
    </div>
  )
}

function MissingPlan({ lang, onNavigate }: { lang: Lang; onNavigate: (r: AppRoute) => void }) {
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light v2-screen-enter flex min-h-full flex-col items-center justify-center bg-page px-6 py-10 text-center text-ink-900">
      <Icon name="Dumbbell" className="h-12 w-12 text-ink-400" />
      <h1 className="mt-5 text-2xl font-black">{ar ? 'أكمل إعداد خطتك' : 'Finish setting up your plan'}</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-500">{ar ? 'نحتاج هدفك وجدولك لنبني تمرينك.' : 'We need your goal and schedule to build your workout.'}</p>
      <button type="button" onClick={() => onNavigate('setup')} className="btn-primary mt-6 w-full max-w-xs py-4 text-[1.1875rem]">{ar ? 'ابدأ الإعداد' : 'Start setup'}</button>
    </div>
  )
}

function RestDayScreen({ lang, onNavigate }: { lang: Lang; onNavigate: (r: AppRoute) => void }) {
  const t = getStrings(lang).workout
  const ar = lang !== 'en'
  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="v2-surface-light v2-screen-enter flex min-h-full flex-col items-center justify-center bg-page px-6 py-10 text-center text-ink-900">
      <Icon name="Moon" className="h-12 w-12 text-primary-c" />
      <h1 className="mt-5 text-2xl font-black">{t.restDayTitle}</h1>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">{t.restDayBody}</p>
      <button type="button" onClick={() => onNavigate('dashboard')} className="btn-primary mt-6 w-full max-w-xs py-4 text-[1.1875rem]">
        {t.backToToday}
      </button>
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
