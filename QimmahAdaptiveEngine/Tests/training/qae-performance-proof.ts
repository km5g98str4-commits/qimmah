// [CTO-QAE-019] §10-§11 — Performance record / load / evidence proof.
// No progression decision is made or asserted anywhere in this suite.

import { canonicalSerialize } from '../../Domain/Shared/canonical'
import type { Instant } from '../../Domain/Shared/core'
import {
  toPerformanceEvidence,
  validateLoad,
  isLoadKnown,
  PERFORMANCE_SCHEMA_VERSION,
  type AcceptedProgressionPolicy,
  type CompletedExercise,
  type CompletedSession,
  type CompletedSet,
  type Load,
} from '../../Domain/Training/performance'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    console.error(`✗ ${name} — ${detail}`)
  }
}

const AT = 1785542400000 as Instant
const kg = (n: number): Load => ({ kind: 'externalGrams', grams: n * 1000 })

const set = (over: Partial<CompletedSet> & Pick<CompletedSet, 'setIndex'>): CompletedSet => ({
  exerciseId: 'ex-a',
  prescribedReps: 8,
  actualReps: 8,
  load: kg(60),
  achievedRir: 2,
  completionStatus: 'completed',
  ...over,
})

const exercise = (over: Partial<CompletedExercise> = {}): CompletedExercise => ({
  exerciseId: 'ex-a',
  prescribedSets: 3,
  prescribedRepMin: 6,
  prescribedRepMax: 10,
  prescribedRir: 2,
  sets: [set({ setIndex: 0 }), set({ setIndex: 1 }), set({ setIndex: 2 })],
  ...over,
})

const session = (ex: CompletedExercise[]): CompletedSession => ({
  planVersionId: 'pv-1',
  sessionId: 's-1',
  dayId: 'gen-1-upper',
  startedAt: AT,
  completedAt: AT,
  exercises: ex,
})

const ev = (s: CompletedSession) => toPerformanceEvidence(s).exercises[0]

// ═══ §10 fixtures A-N ══════════════════════════════════════════════════════
{
  // A — completes prescription exactly
  const a = ev(session([exercise()]))
  check('A prescribedSetsCompleted', a.prescribedSetsCompleted)
  check('A repTargetReached', a.repTargetReached)
  check('A repTopExceeded false', !a.repTopExceeded)
  check('A loadKnown', a.loadKnown)
  check('A performanceComplete', a.performanceComplete)
  check('A confidence high', a.evidenceConfidence === 'high', a.evidenceConfidence)

  // B — exceeds rep-range top with target RIR met
  const b = ev(session([exercise({ sets: [set({ setIndex: 0, actualReps: 12 }), set({ setIndex: 1, actualReps: 11 }), set({ setIndex: 2, actualReps: 11 })] })]))
  check('B repTopExceeded true', b.repTopExceeded)
  check('B repTargetReached still true', b.repTargetReached)
  check('B no progression recommendation is produced (facts only)', !('recommendation' in b))

  // C — misses minimum reps
  const c = ev(session([exercise({ sets: [set({ setIndex: 0, actualReps: 4 }), set({ setIndex: 1, actualReps: 4 }), set({ setIndex: 2, actualReps: 3 })] })]))
  check('C repTargetReached false', !c.repTargetReached)
  check('C sets still counted as completed', c.prescribedSetsCompleted)

  // D — reps completed but RIR too low
  const d = ev(session([exercise({ sets: [set({ setIndex: 0, achievedRir: 0 }), set({ setIndex: 1, achievedRir: 0 }), set({ setIndex: 2, achievedRir: 1 })] })]))
  check('D achievedRirAvailable', d.achievedRirAvailable)
  check('D minAchievedRir is 0', d.minAchievedRir === 0, String(d.minAchievedRir))
  check('D low RIR is reported, not judged', d.performanceComplete)

  // E — partial session
  const e = ev(session([exercise({ sets: [set({ setIndex: 0 }), set({ setIndex: 1, completionStatus: 'partial', actualReps: 3 })] })]))
  check('E prescribedSetsCompleted false', !e.prescribedSetsCompleted)
  check('E attempted counts partial', e.prescribedSetsAttempted === 2, String(e.prescribedSetsAttempted))
  check('E confidence low', e.evidenceConfidence === 'low', e.evidenceConfidence)

  // F — skipped exercise
  const f = ev(session([exercise({ sets: [set({ setIndex: 0, completionStatus: 'skipped' }), set({ setIndex: 1, completionStatus: 'skipped' }), set({ setIndex: 2, completionStatus: 'skipped' })] })]))
  check('F attempted zero', f.prescribedSetsAttempted === 0)
  check('F confidence none', f.evidenceConfidence === 'none', f.evidenceConfidence)
  check('F skipped is not a rep failure', !f.repTargetReached && !f.repTopExceeded)

  // G — unknown load
  const g = ev(session([exercise({ sets: [set({ setIndex: 0, load: { kind: 'unknown' } }), set({ setIndex: 1 }), set({ setIndex: 2 })] })]))
  check('G loadKnown false', !g.loadKnown)
  check('G performanceComplete false when load unknown', !g.performanceComplete)
  check('G confidence moderate', g.evidenceConfidence === 'moderate', g.evidenceConfidence)

  // H — bodyweight exercise: NOT 0 kg
  const bw: Load = { kind: 'bodyweightOnly' }
  check('H bodyweightOnly is valid', validateLoad(bw).ok)
  check('H bodyweightOnly is NOT a known comparable load', !isLoadKnown(bw))
  check('H bodyweightOnly is distinct from 0 g external', canonicalSerialize(bw) !== canonicalSerialize(kg(0)))
  check('H bodyweightPlusGrams is a known load', isLoadKnown({ kind: 'bodyweightPlusGrams', addedGrams: 10000 }))
  check('H assisted bodyweight is supported and known', isLoadKnown({ kind: 'bodyweightAssistedGrams', assistGrams: 20000 }))

  // I — dumbbell per-hand
  const db: Load = { kind: 'dumbbellPerHandGrams', perHandGrams: 22500, hands: 2 }
  check('I dumbbell per-hand valid', validateLoad(db).ok)
  check('I dumbbell encoding is explicit per-hand (no total form exists)', 'perHandGrams' in db)
  check('I ambiguous hand count rejected', !validateLoad({ kind: 'dumbbellPerHandGrams', perHandGrams: 1000, hands: 3 as 1 } as Load).ok)

  // J — machine load
  const mach: Load = { kind: 'machineStackStep', step: 7, machineExerciseId: 'chest-press-machine' }
  check('J machine stack valid', validateLoad(mach).ok)
  check('J machine stack is NOT comparable across machines', !isLoadKnown(mach))
  check('J machine stack without machine id rejected', !validateLoad({ kind: 'machineStackStep', step: 7, machineExerciseId: '' }).ok)

  // K — malformed negative load
  const neg = validateLoad(kg(-5))
  check('K negative load rejected by name', !neg.ok && neg.error === 'negativeLoad', JSON.stringify(neg))
  const nan = validateLoad({ kind: 'externalGrams', grams: Number.NaN })
  check('K non-finite load rejected by name', !nan.ok && nan.error === 'nonFiniteLoad')
  const frac = validateLoad({ kind: 'externalGrams', grams: 1.5 })
  check('K non-integer load rejected by name', !frac.ok && frac.error === 'nonIntegerLoad')

  // L — missing RIR
  const l = ev(session([exercise({ sets: [set({ setIndex: 0, achievedRir: undefined }), set({ setIndex: 1, achievedRir: undefined }), set({ setIndex: 2, achievedRir: undefined })] })]))
  check('L achievedRirAvailable false', !l.achievedRirAvailable)
  check('L minAchievedRir absent (never inferred)', l.minAchievedRir === undefined)
  check('L performanceComplete false without RIR', !l.performanceComplete)

  // M — returning conservative prescription recorded faithfully
  const m = ev(session([exercise({ prescribedSets: 2, prescribedRir: 3, sets: [set({ setIndex: 0 }), set({ setIndex: 1 })] })]))
  check('M returning lower prescribed sets recorded', m.prescribedSets === 2)
  check('M prescribedSetsCompleted', m.prescribedSetsCompleted)

  // N — minor/safety: evidence layer records, never judges
  const n = toPerformanceEvidence(session([exercise()]))
  check('N evidence exposes no recommendation field', !('recommendation' in n) && !('progression' in n))
  check('N schema version stamped', n.schemaVersion === PERFORMANCE_SCHEMA_VERSION)
}

// ═══ §11 determinism ═══════════════════════════════════════════════════════
{
  const s1 = session([exercise()])
  check('determinism: repeated calls byte-identical', canonicalSerialize(toPerformanceEvidence(s1)) === canonicalSerialize(toPerformanceEvidence(s1)))

  // set input order is semantically equivalent (setIndex carries the meaning)
  const shuffled = session([exercise({ sets: [set({ setIndex: 2 }), set({ setIndex: 0 }), set({ setIndex: 1 })] })])
  check('determinism: set input order normalized by setIndex', canonicalSerialize(toPerformanceEvidence(shuffled)) === canonicalSerialize(toPerformanceEvidence(s1)))

  // Counter-assertion: the normalization must not be so aggressive that real
  // data differences vanish. (An earlier draft asserted `... || true`, which is
  // unfalsifiable — charter §4.2. Replaced with a difference that MUST show.)
  const strong = session([exercise({ sets: [set({ setIndex: 0, actualReps: 10 }), set({ setIndex: 1, actualReps: 10 }), set({ setIndex: 2, actualReps: 10 })] })])
  const weak = session([exercise({ sets: [set({ setIndex: 0, actualReps: 4 }), set({ setIndex: 1, actualReps: 4 }), set({ setIndex: 2, actualReps: 4 })] })])
  check(
    'determinism counter-assertion: genuinely different performance yields different evidence',
    canonicalSerialize(toPerformanceEvidence(strong)) !== canonicalSerialize(toPerformanceEvidence(weak)),
  )

  // exercise order in the session is normalized ordinally
  const two = session([exercise({ exerciseId: 'ex-b' }), exercise({ exerciseId: 'ex-a' })])
  const twoRev = session([exercise({ exerciseId: 'ex-a' }), exercise({ exerciseId: 'ex-b' })])
  check('determinism: exercise order normalized ordinally', canonicalSerialize(toPerformanceEvidence(two)) === canonicalSerialize(toPerformanceEvidence(twoRev)))

  // locale + timezone
  const before = canonicalSerialize(toPerformanceEvidence(s1))
  const origTZ = process.env.TZ
  for (const tz of ['Europe/Istanbul', 'Pacific/Kiritimati', 'Asia/Riyadh']) {
    process.env.TZ = tz
    check(`determinism: TZ ${tz} identical`, canonicalSerialize(toPerformanceEvidence(s1)) === before)
  }
  process.env.TZ = origTZ
}

// ═══ §8 AcceptedProgressionPolicy contract ═════════════════════════════════
{
  const p: AcceptedProgressionPolicy = {
    method: 'double',
    policyVersion: '1.0.0',
    rulesVersion: '1.0.0',
    applicableExerciseIds: [],
    applicableEquipmentClasses: [],
  }
  check('AcceptedProgressionPolicy carries a method', p.method.length > 0)
  check('AcceptedProgressionPolicy carries both versions', p.policyVersion.length > 0 && p.rulesVersion.length > 0)
  check('AcceptedProgressionPolicy makes no decision (no thresholds/deltas)', !('increment' in p) && !('threshold' in p))
}

console.log(`qae-performance-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
