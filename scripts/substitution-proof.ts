// Substitution proof — Qimmah Design Standard v3.0, screens 31 (equipment-aware
// substitution) + 27 (one-handed reach). Exercises the exact data seams WorkoutV2
// composes, on a localStorage shim (no browser) via run-substitution-proof.mjs:
//   1) findSubstitutes preserves the movement pattern + primary muscle and is
//      filtered by the user's equipment ONLY (full gym vs home differ);
//   2) reason (busy/unavailable) floats a DIFFERENT station to the top;
//   3) applying a swap re-skins the slot (identity) but preserves the prescription
//      (id/sets/reps) — and "undo" (dropping the key) restores it exactly;
//   4) the engine is PURE — no plan/history/active-workout write (م1 intact);
//   5) one-handed reach persists + mirrors.

import type { Profile } from '@/types/profile'
import type { WorkoutV2Exercise } from '@/lib/workoutV2Model'
import { findSubstitutes } from '@/lib/workoutSubstitution'
import { substituteWorkoutExercise } from '@/lib/workoutV2Model'
import { getExercise } from '@/data/exercises'
import { getHandedness, setHandedness, otherHand } from '@/lib/handedness'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

// Environments touch ONLY the equipment-gate fields the engine reads.
const fullGym = { gymAccess: 'full' } as Profile
const homeGym = { gymAccess: 'home' } as Profile

const SRC = 'lat-pulldown-machine' // pull · back · ['machine'] · curated: dumbbell-row
const src = getExercise(SRC)!

// ── (1) Equipment-aware + movement-pattern-preserving ──
const full = findSubstitutes(SRC, fullGym, 'busy')
check('returns alternatives for a full gym', full.length > 0)
check('never suggests the exercise itself', full.every((o) => o.exerciseId !== SRC))
check('every option preserves the movement pattern (pull)', full.every((o) => o.movementPattern === src.movementPattern))
check('every option keeps the primary muscle (back)', full.every((o) => o.primaryMuscle === src.primaryMuscle))

// ── (2) Filtered by the user's equipment ONLY (home excludes machine/cable) ──
const home = findSubstitutes(SRC, homeGym, 'home')
const homeAllowed = new Set(['dumbbell', 'barbell', 'bodyweight', 'band', 'bench'])
check('home options use ONLY home-available equipment', home.length > 0 && home.every((o) => o.equipment.every((e) => homeAllowed.has(e))))
check('home options never require a machine', home.every((o) => !o.equipment.includes('machine')))
// Compare the FULL pools (uncapped) — the equipment gate must make full strictly broader.
const fullPool = findSubstitutes(SRC, fullGym, 'busy', 50)
const homePool = findSubstitutes(SRC, homeGym, 'home', 50)
check('full gym pool is strictly larger than home (equipment-aware differs)', fullPool.length > homePool.length)
check('a machine alternative exists for full but is filtered out for home', fullPool.some((o) => o.equipment.includes('machine')) && !homePool.some((o) => o.equipment.includes('machine')))

// ── (3) busy/unavailable floats a DIFFERENT station to the top ──
check('top busy option is a different station (free you from the busy machine)', full[0].differentStation === true)
const unavail = findSubstitutes(SRC, fullGym, 'unavailable')
check('unavailable also ranks a different station first', unavail[0].differentStation === true)

// ── (4) Applying a swap re-skins identity but preserves the slot; undo restores ──
const base: WorkoutV2Exercise = {
  id: 'slot-3', exerciseId: SRC, nameAr: src.nameAr, nameEn: src.nameEn, category: 'support',
  equipment: src.equipment, muscles: [src.primaryMuscle], sets: 4, reps: '10–12', restSec: 90,
  targetWeightKg: null, lastPerformance: null, cues: [], commonMistake: null, replaceable: true,
}
const pick = full[0]
const swapped = substituteWorkoutExercise(base, pick.exerciseId, 'ar')
check('swap preserves the slot id', swapped.id === base.id)
check('swap preserves the prescription (sets/reps)', swapped.sets === base.sets && swapped.reps === base.reps)
check('swap changes the exercise identity', swapped.exerciseId === pick.exerciseId && swapped.nameAr !== base.nameAr)
check('swap uses the substitute equipment', JSON.stringify(swapped.equipment) === JSON.stringify(getExercise(pick.exerciseId)!.equipment))
// "undo" is dropping the slot key → the base slot is used unchanged again.
const restored = substituteWorkoutExercise(base, base.exerciseId, 'ar')
check('undo (restore to base id) returns the original identity', restored.exerciseId === base.exerciseId)

// ── (5) PURITY — no plan/history/active-workout write happened (م1 intact) ──
let workoutKeys = 0
for (let i = 0; i < localStorage.length; i++) {
  const k = localStorage.key(i)
  if (k && (k.startsWith('qimmah:active-workout') || k.includes('workout-summary') || k.includes('history'))) workoutKeys++
}
check('substitution wrote NOTHING to workout/history/active storage', workoutKeys === 0)
check('unknown exercise id yields no options (safe)', findSubstitutes('does-not-exist', fullGym, 'busy').length === 0)

// ── (6) One-handed reach persists + mirrors (screen 27) ──
check('handedness defaults to right', getHandedness() === 'right')
setHandedness('left')
check('handedness persists after set', getHandedness() === 'left')
check('otherHand flips the reach hand', otherHand('left') === 'right' && otherHand('right') === 'left')

console.log(`\nSubstitution proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
