// Rule D proof — the workout finish is a suggestion, not a silent save.
// Exercises the exact data seam WorkoutV2 composes:
//   1) computing candidates (build session + detect PRs) writes NOTHING
//      → "finish opened but not confirmed = no write";
//   2) the confirm commit (persist + register PRs + summary) writes the stores;
//   3) snapshot-before-commit + restore = a full undo (stores revert exactly).
//
// Runs on a localStorage shim (no browser) via run-finish-confirm-proof.mjs.

import { buildV2WorkoutSession } from '@/lib/workoutV2Persist'
import { detectPRsForSession, toPRCelebrations } from '@/lib/strength'
import { persistFinishedSession } from '@/lib/finishWorkout'
import { registerWorkoutPRs, ACHIEVEMENTS_KEY } from '@/features/achievements/engine'
import { saveWorkoutSummary, summaryKey } from '@/lib/workoutSummary'
import { snapshotWorkoutStorage, restoreWorkoutStorage } from '@/lib/workoutFinishUndo'
import { getWorkoutSessions, setWorkoutSessions } from '@/lib/historyStore'
import type { WorkoutV2Model } from '@/lib/workoutV2Model'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

// Minimal model + active snapshot (only the fields buildV2WorkoutSession reads).
const EX_ID = 'bench-press'
const model = {
  available: true,
  session: { title: 'دفع' },
  exercises: [{ id: 'row-0', exerciseId: EX_ID, nameAr: 'بنش برس', nameEn: 'Bench press', sets: 3, reps: '5', restSec: 90 }],
} as unknown as WorkoutV2Model

const activeAt = (weight: number, startedAt: number) => ({
  startedAt,
  rows: { 'row-0': [{ weight, reps: 5, done: true }, { weight, reps: 5, done: true }, { weight, reps: 5, done: true }] },
})

const prCount = () => { try { return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}').prCount || 0 } catch { return 0 } }
const sumKey = summaryKey(null)

// ── Seed prior history (a lighter bench) so the new session is a genuine PR ──
const prior = buildV2WorkoutSession(activeAt(60, 1_000), model, { date: '2026-07-10', finishedAtMs: 2_000 })
setWorkoutSessions([prior])
const baselineSessions = getWorkoutSessions().length
const baselinePRs = prCount()

// ── (1) Compute candidates — NO confirm yet → must not write anything ──
const finalActive = activeAt(80, 3_000)
const session = buildV2WorkoutSession(finalActive, model, { date: '2026-07-18', finishedAtMs: 4_000 })
const candidates = detectPRsForSession(session)
check('candidate PR(s) detected for the heavier session', candidates.length > 0)
check('opening finish (compute only) added NO session', getWorkoutSessions().length === baselineSessions)
check('opening finish registered NO permanent PR', prCount() === baselinePRs)
check('opening finish wrote NO summary', localStorage.getItem(sumKey) == null)

// ── (2) Confirm — snapshot, then the ONLY writes happen here ──
const snapshot = snapshotWorkoutStorage()
saveWorkoutSummary(null, { date: '2026-07-18', title: model.session.title, totalSets: 3, volume: 1200, durationMin: 30 })
persistFinishedSession(session)
registerWorkoutPRs(toPRCelebrations(candidates, () => ({ ar: 'بنش برس', en: 'Bench press' })))
check('confirm persisted the finished session', getWorkoutSessions().some((s) => s.id === session.id))
check('confirm registered the PR(s) permanently', prCount() > baselinePRs)
check('confirm wrote the workout summary', localStorage.getItem(sumKey) != null)

// ── (3) Undo — restore the snapshot → stores revert EXACTLY ──
restoreWorkoutStorage(snapshot)
check('undo removed the finished session', !getWorkoutSessions().some((s) => s.id === session.id))
check('undo restored the prior session count', getWorkoutSessions().length === baselineSessions)
check('undo reverted the PR count', prCount() === baselinePRs)
check('undo removed the workout summary', localStorage.getItem(sumKey) == null)

console.log(`\nFinish-confirm proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
