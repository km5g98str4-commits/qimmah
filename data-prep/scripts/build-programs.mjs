#!/usr/bin/env node
// Builds DATASET B — QIM_MACHINE_WORKOUT_PROGRAMS.
//
// Every exercise id is resolved against data-prep/exercise/catalog-snapshot.json
// (extracted from src/data/exercises.ts). Unknown ids abort the build: no invented ids.
// Day order follows the Q19 ordering law (src/lib/workoutOrder.ts); where the
// requested order differs, BOTH are recorded and the deviation is reported.
//
// Re-run: node data-prep/scripts/build-programs.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const snap = JSON.parse(readFileSync(join(ROOT, 'data-prep/exercise/catalog-snapshot.json'), 'utf8'))
const byId = new Map(snap.exercises.map((e) => [e.id, e]))
const catalogIds = new Set(snap.machineCatalog.flatMap((g) => g.items.map((i) => i.exerciseId)))

const FREE_WEIGHT = new Set(['barbell', 'dumbbell', 'kettlebell', 'bench', 'band', 'bodyweight', 'rope', 'ball'])

function ex(id) {
  const e = byId.get(id)
  if (!e) throw new Error(`UNKNOWN EXERCISE ID: ${id} — refusing to invent it.`)
  return e
}

// ---------------------------------------------------------------- prescriptions
// Role is derived from the catalog (movement pattern + primary muscle), never hand-typed
// per exercise, so a catalog change flows through instead of silently drifting.
function roleOf(id, indexAmongCompounds) {
  const e = ex(id)
  if (e.orderRank === 900) return e.primaryMuscle === 'calves' ? 'finisher_calves' : 'finisher_core'
  if (e.orderRank < 500) return indexAmongCompounds === 0 ? 'primary_compound' : 'secondary_compound'
  return 'isolation'
}

const RX = {
  standard: {
    primary_compound: { sets: 3, rep_range: '8–12', rest_sec_min: 90, rest_sec_max: 120 },
    secondary_compound: { sets: 3, rep_range: '10–12', rest_sec_min: 75, rest_sec_max: 90 },
    isolation: { sets: 3, rep_range: '12–15', rest_sec_min: 45, rest_sec_max: 60 },
    finisher_calves: { sets: 3, rep_range: '12–20', rest_sec_min: 45, rest_sec_max: 60 },
    finisher_core: { sets: 2, rep_range: '12–20', rest_sec_min: 45, rest_sec_max: 45 },
  },
  beginner: {
    primary_compound: { sets: 3, rep_range: '10–12', rest_sec_min: 90, rest_sec_max: 120 },
    secondary_compound: { sets: 2, rep_range: '10–12', rest_sec_min: 75, rest_sec_max: 90 },
    isolation: { sets: 2, rep_range: '12–15', rest_sec_min: 45, rest_sec_max: 60 },
    finisher_calves: { sets: 2, rep_range: '12–20', rest_sec_min: 45, rest_sec_max: 60 },
    finisher_core: { sets: 2, rep_range: '12–20', rest_sec_min: 45, rest_sec_max: 45 },
  },
}

// ---------------------------------------------------------------- warm-ups
// A warm-up is NOT a working exercise. Every entry carries is_working_exercise:false,
// and the ramp-up set references the day's first exercise without becoming one.
const WARMUPS = {
  'warmup-upper': {
    id: 'warmup-upper', name_en: 'Upper-body warm-up', name_ar: 'إحماء الجزء العلوي',
    total_minutes_min: 8, total_minutes_max: 12,
    items: [
      { order: 1, kind: 'cardio', exercise_id: 'elliptical', alt_exercise_ids: ['stationary-bike', 'incline-treadmill-walk'], duration_min_minutes: 5, duration_max_minutes: 10, intensity: 'easy conversational pace', is_working_exercise: false },
      { order: 2, kind: 'mobility', exercise_id: 'arm-circles', duration_min_minutes: 1, duration_max_minutes: 1, reps: '10 each direction', is_working_exercise: false },
      { order: 3, kind: 'mobility', exercise_id: 'shoulder-dislocates', duration_min_minutes: 1, duration_max_minutes: 2, reps: '10–12', is_working_exercise: false },
      { order: 4, kind: 'mobility', exercise_id: 'thoracic-rotation', duration_min_minutes: 1, duration_max_minutes: 2, reps: '8 each side', is_working_exercise: false },
      { order: 5, kind: 'ramp_up_set', exercise_id: null, references_first_working_exercise: true, sets: 2, reps: '10–12', load_guidance: 'roughly 40–60% of the first working set load', is_working_exercise: false },
    ],
  },
  'warmup-lower': {
    id: 'warmup-lower', name_en: 'Lower-body warm-up', name_ar: 'إحماء الجزء السفلي',
    total_minutes_min: 8, total_minutes_max: 12,
    items: [
      { order: 1, kind: 'cardio', exercise_id: 'stationary-bike', alt_exercise_ids: ['incline-treadmill-walk', 'elliptical'], duration_min_minutes: 5, duration_max_minutes: 10, intensity: 'easy conversational pace', is_working_exercise: false },
      { order: 2, kind: 'mobility', exercise_id: 'leg-swings', duration_min_minutes: 1, duration_max_minutes: 2, reps: '10 each leg, each direction', is_working_exercise: false },
      { order: 3, kind: 'mobility', exercise_id: 'hip-flexor-stretch', duration_min_minutes: 1, duration_max_minutes: 2, reps: '30 s each side', is_working_exercise: false },
      { order: 4, kind: 'mobility', exercise_id: 'ankle-mobility', duration_min_minutes: 1, duration_max_minutes: 2, reps: '10 each side', is_working_exercise: false },
      { order: 5, kind: 'ramp_up_set', exercise_id: null, references_first_working_exercise: true, sets: 2, reps: '10–12', load_guidance: 'roughly 40–60% of the first working set load', is_working_exercise: false },
    ],
  },
  'warmup-full': {
    id: 'warmup-full', name_en: 'Full-body warm-up', name_ar: 'إحماء الجسم الكامل',
    total_minutes_min: 8, total_minutes_max: 12,
    items: [
      { order: 1, kind: 'cardio', exercise_id: 'incline-treadmill-walk', alt_exercise_ids: ['stationary-bike', 'elliptical'], duration_min_minutes: 5, duration_max_minutes: 10, intensity: 'easy conversational pace', is_working_exercise: false },
      { order: 2, kind: 'mobility', exercise_id: 'arm-circles', duration_min_minutes: 1, duration_max_minutes: 1, reps: '10 each direction', is_working_exercise: false },
      { order: 3, kind: 'mobility', exercise_id: 'leg-swings', duration_min_minutes: 1, duration_max_minutes: 2, reps: '10 each leg', is_working_exercise: false },
      { order: 4, kind: 'mobility', exercise_id: 'cat-cow', duration_min_minutes: 1, duration_max_minutes: 2, reps: '8–10', is_working_exercise: false },
      { order: 5, kind: 'ramp_up_set', exercise_id: null, references_first_working_exercise: true, sets: 2, reps: '10–12', load_guidance: 'roughly 40–60% of the first working set load', is_working_exercise: false },
    ],
  },
}

// ---------------------------------------------------------------- substitutions
// Machine/cable only. Same movement + same primary muscle function.
// Where the catalog has no same-function machine or cable alternative we say so
// (no_equivalent) instead of silently pointing at an unrelated exercise.
const SUBS = {
  'chest-press-machine': ['iso-lateral-chest-press', 'incline-chest-press-machine'],
  'incline-chest-press-machine': ['iso-lateral-incline-press', 'chest-press-machine'],
  'pec-deck-machine': ['machine-fly', 'cable-crossover'],
  'lat-pulldown-machine': ['iso-lateral-pulldown', 'wide-grip-lat-pulldown', 'neutral-grip-pulldown'],
  'seated-row-machine': ['seated-cable-row', 'iso-lateral-high-row', 'chest-supported-row-machine'],
  'chest-supported-row-machine': ['seated-row-machine', 't-bar-row-machine', 'seated-cable-row'],
  'shoulder-press-machine': ['cable-shoulder-press'],
  'lateral-raise-machine': ['cable-lateral-raise'],
  // cable-rear-delt-fly was withheld while the catalog left it on the coarse shoulders
  // fallback (side_delts+front_delts), which failed the rear-delt function match.
  // exercises.ts now maps it explicitly to rear_delts, so it is restored. See FINDINGS.md F-1.
  'reverse-pec-deck': ['rear-delt-row-machine', 'face-pull', 'cable-rear-delt-fly'],
  'preacher-curl-machine': ['cable-biceps-curl', 'machine-curl'],
  'cable-biceps-curl': ['preacher-curl-machine', 'machine-curl'],
  'triceps-extension-machine': ['cable-triceps-pushdown', 'rope-pushdown'],
  'cable-triceps-pushdown': ['rope-pushdown', 'triceps-extension-machine', 'single-arm-pushdown'],
  'hack-squat-machine': ['leg-press-machine', 'belt-squat'],
  'leg-press-machine': ['hack-squat-machine', 'leg-press-narrow', 'belt-squat'],
  'leg-extension-machine': [],
  'seated-leg-curl': ['lying-leg-curl', 'standing-leg-curl'],
  'lying-leg-curl': ['seated-leg-curl', 'standing-leg-curl'],
  'glute-machine': ['glute-kickback-machine', 'standing-hip-extension-machine', 'cable-pull-through'],
  'seated-calf-raise-machine': ['standing-calf-raise-machine', 'leg-press-calf-raise'],
  'standing-calf-raise-machine': ['seated-calf-raise-machine', 'leg-press-calf-raise'],
  'ab-crunch-machine': [],
}
const SUB_NOTES = {
  'leg-extension-machine': 'No same-function (open-chain knee-extension) machine or cable station exists in the Qimmah catalog. Left empty deliberately — a leg press is a compound and is NOT an equivalent isolation substitute.',
  'ab-crunch-machine': 'No same-function (loaded spinal-flexion) machine or cable station exists in the Qimmah catalog. cable-woodchop is rotation, not flexion, so it is NOT offered as a substitute.',
}

// ---------------------------------------------------------------- day variants
// Canonical session id per variant. Two variants sharing an id are a DECLARED ALIAS:
// the same physical workout surfaced under two program vocabularies. The exercise array
// lives once, on the canonical session — variants carry only the user-facing label.
const CANONICAL_OF = {
  'upper-a': 'cs-upper-a',
  'upper-b': 'cs-upper-b',
  'lower-a': 'cs-lower-a',   'legs-a': 'cs-lower-a',        // Upper/Lower "Lower A" === PPL "Legs A"
  'lower-b': 'cs-lower-b',   'legs-b': 'cs-lower-b',        // Upper/Lower "Lower B" === PPL "Legs B"
  'fb-a': 'cs-fullbody-a', 'fb-b': 'cs-fullbody-b', 'fb-c': 'cs-fullbody-c',
  'push-a': 'cs-push-a', 'push-b': 'cs-push-b',
  'pull-a': 'cs-pull-a', 'pull-b': 'cs-pull-b',
  'ulf-upper': 'cs-upper-compact',
  // Q19 normalisation made these two identical (their requested orders differed).
  // Declared as an alias rather than left as two arrays that can drift apart.
  'beg-fb-a': 'cs-beginner-fullbody-a', 'machines-a': 'cs-beginner-fullbody-a',
  'beg-fb-b': 'cs-beginner-fullbody-b',
  'machines-b': 'cs-beginner-machines-b',
  'machines-c': 'cs-beginner-machines-c',
}

const V = {
  'upper-a': { name_en: 'Upper A', name_ar: 'علوي أ', warmup: 'warmup-upper', tier: 'standard', requested: ['incline-chest-press-machine', 'chest-press-machine', 'pec-deck-machine', 'lat-pulldown-machine', 'seated-row-machine', 'shoulder-press-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'cable-triceps-pushdown'] },
  'lower-a': { name_en: 'Lower A', name_ar: 'سفلي أ', warmup: 'warmup-lower', tier: 'standard', requested: ['hack-squat-machine', 'leg-press-machine', 'seated-leg-curl', 'leg-extension-machine', 'seated-calf-raise-machine', 'ab-crunch-machine'] },
  'upper-b': { name_en: 'Upper B', name_ar: 'علوي ب', warmup: 'warmup-upper', tier: 'standard', requested: ['chest-press-machine', 'incline-chest-press-machine', 'lat-pulldown-machine', 'chest-supported-row-machine', 'pec-deck-machine', 'shoulder-press-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'triceps-extension-machine'] },
  'lower-b': { name_en: 'Lower B', name_ar: 'سفلي ب', warmup: 'warmup-lower', tier: 'standard', requested: ['leg-press-machine', 'hack-squat-machine', 'lying-leg-curl', 'leg-extension-machine', 'glute-machine', 'standing-calf-raise-machine'] },
  'fb-a': { name_en: 'Full Body A', name_ar: 'جسم كامل أ', warmup: 'warmup-full', tier: 'standard', requested: ['chest-press-machine', 'lat-pulldown-machine', 'leg-press-machine', 'seated-row-machine', 'seated-leg-curl', 'lateral-raise-machine', 'seated-calf-raise-machine'] },
  'fb-b': { name_en: 'Full Body B', name_ar: 'جسم كامل ب', warmup: 'warmup-full', tier: 'standard', requested: ['incline-chest-press-machine', 'hack-squat-machine', 'chest-supported-row-machine', 'shoulder-press-machine', 'leg-extension-machine', 'lat-pulldown-machine', 'preacher-curl-machine'] },
  'fb-c': { name_en: 'Full Body C', name_ar: 'جسم كامل ج', warmup: 'warmup-full', tier: 'standard', requested: ['chest-press-machine', 'leg-press-machine', 'lat-pulldown-machine', 'seated-leg-curl', 'pec-deck-machine', 'lateral-raise-machine', 'cable-triceps-pushdown'] },
  'push-a': { name_en: 'Push A', name_ar: 'دفع أ', warmup: 'warmup-upper', tier: 'standard', requested: ['incline-chest-press-machine', 'chest-press-machine', 'pec-deck-machine', 'shoulder-press-machine', 'lateral-raise-machine', 'cable-triceps-pushdown'] },
  'pull-a': { name_en: 'Pull A', name_ar: 'سحب أ', warmup: 'warmup-upper', tier: 'standard', requested: ['lat-pulldown-machine', 'seated-row-machine', 'chest-supported-row-machine', 'reverse-pec-deck', 'preacher-curl-machine', 'cable-biceps-curl'] },
  'legs-a': { name_en: 'Legs A', name_ar: 'أرجل أ', warmup: 'warmup-lower', tier: 'standard', requested: ['hack-squat-machine', 'leg-press-machine', 'seated-leg-curl', 'leg-extension-machine', 'seated-calf-raise-machine', 'ab-crunch-machine'] },
  'push-b': { name_en: 'Push B', name_ar: 'دفع ب', warmup: 'warmup-upper', tier: 'standard', requested: ['chest-press-machine', 'incline-chest-press-machine', 'shoulder-press-machine', 'pec-deck-machine', 'lateral-raise-machine', 'triceps-extension-machine'] },
  'pull-b': { name_en: 'Pull B', name_ar: 'سحب ب', warmup: 'warmup-upper', tier: 'standard', requested: ['lat-pulldown-machine', 'chest-supported-row-machine', 'seated-row-machine', 'reverse-pec-deck', 'preacher-curl-machine', 'cable-biceps-curl'] },
  'legs-b': { name_en: 'Legs B', name_ar: 'أرجل ب', warmup: 'warmup-lower', tier: 'standard', requested: ['leg-press-machine', 'hack-squat-machine', 'lying-leg-curl', 'leg-extension-machine', 'glute-machine', 'standing-calf-raise-machine'] },
  'ulf-upper': { name_en: 'Upper', name_ar: 'علوي', warmup: 'warmup-upper', tier: 'standard', requested: ['incline-chest-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'seated-row-machine', 'shoulder-press-machine', 'lateral-raise-machine', 'preacher-curl-machine', 'cable-triceps-pushdown'] },
  'beg-fb-a': { name_en: 'Full Body A', name_ar: 'جسم كامل أ', warmup: 'warmup-full', tier: 'beginner', requested: ['chest-press-machine', 'lat-pulldown-machine', 'leg-press-machine', 'seated-row-machine', 'seated-leg-curl', 'lateral-raise-machine'] },
  'beg-fb-b': { name_en: 'Full Body B', name_ar: 'جسم كامل ب', warmup: 'warmup-full', tier: 'beginner', requested: ['incline-chest-press-machine', 'hack-squat-machine', 'lat-pulldown-machine', 'shoulder-press-machine', 'leg-extension-machine', 'seated-row-machine'] },
  'machines-a': { name_en: 'Machines A', name_ar: 'أجهزة أ', warmup: 'warmup-full', tier: 'beginner', requested: ['leg-press-machine', 'chest-press-machine', 'lat-pulldown-machine', 'seated-leg-curl', 'seated-row-machine', 'lateral-raise-machine'] },
  'machines-b': { name_en: 'Machines B', name_ar: 'أجهزة ب', warmup: 'warmup-full', tier: 'beginner', requested: ['hack-squat-machine', 'incline-chest-press-machine', 'lat-pulldown-machine', 'leg-extension-machine', 'shoulder-press-machine', 'preacher-curl-machine'] },
  'machines-c': { name_en: 'Machines C', name_ar: 'أجهزة ج', warmup: 'warmup-full', tier: 'beginner', requested: ['leg-press-machine', 'chest-press-machine', 'seated-row-machine', 'seated-leg-curl', 'pec-deck-machine', 'cable-triceps-pushdown'] },
}

const R = (n) => ({ day: n, type: 'rest', variant_id: null })
const W = (n, v) => ({ day: n, type: 'workout', variant_id: v })

const PROGRAMS = [
  { id: 'ul-4day-machines', order: 1, name_en: 'Upper / Lower — 4 Days', name_ar: 'علوي / سفلي — ٤ أيام', level: 'beginner_to_intermediate', days_per_week: 4,
    schedule: [W(1, 'upper-a'), W(2, 'lower-a'), R(3), W(4, 'upper-b'), W(5, 'lower-b'), R(6), { day: 7, type: 'rest_or_light', variant_id: null, note_en: 'Rest or light activity (walk / easy cycle).' }] },
  { id: 'fullbody-3day-machines', order: 2, name_en: 'Full Body — 3 Days', name_ar: 'جسم كامل — ٣ أيام', level: 'beginner', days_per_week: 3,
    schedule: [W(1, 'fb-a'), R(2), W(3, 'fb-b'), R(4), W(5, 'fb-c'), R(6), R(7)] },
  { id: 'ppl-6day-machines', order: 3, name_en: 'Push / Pull / Legs — 6 Days', name_ar: 'دفع / سحب / أرجل — ٦ أيام', level: 'intermediate', days_per_week: 6,
    schedule: [W(1, 'push-a'), W(2, 'pull-a'), W(3, 'legs-a'), W(4, 'push-b'), W(5, 'pull-b'), W(6, 'legs-b'), R(7)] },
  { id: 'ppl-3day-machines', order: 4, name_en: 'Push / Pull / Legs — 3 Days', name_ar: 'دفع / سحب / أرجل — ٣ أيام', level: 'beginner_to_intermediate', days_per_week: 3,
    schedule: [W(1, 'push-a'), R(2), W(3, 'pull-a'), R(4), W(5, 'legs-a'), R(6), R(7)] },
  { id: 'ulf-3day-machines', order: 5, name_en: 'Upper / Lower / Full Body — 3 Days', name_ar: 'علوي / سفلي / جسم كامل — ٣ أيام', level: 'beginner_to_intermediate', days_per_week: 3,
    schedule: [W(1, 'ulf-upper'), R(2), W(3, 'lower-a'), R(4), W(5, 'fb-a'), R(6), R(7)] },
  { id: 'fullbody-2day-beginner', order: 6, name_en: 'Full Body Beginner — 2 Days', name_ar: 'جسم كامل للمبتدئ — يومان', level: 'beginner', days_per_week: 2,
    schedule: [W(1, 'beg-fb-a'), R(2), R(3), W(4, 'beg-fb-b'), R(5), R(6), R(7)] },
  { id: 'ul-rotating-3day-machines', order: 7, name_en: 'Upper / Lower Rotating — 3 Days', name_ar: 'علوي / سفلي بالتناوب — ٣ أيام', level: 'intermediate', days_per_week: 3,
    // schedule[] carries WEEK 1 with real, resolvable variant ids. There is no sentinel:
    // no import path can meet a variant id that does not exist. Subsequent weeks are
    // governed by rotation.sequence below and enumerated in weeks_preview.
    rotation: { kind: 'rotating_sequence', sequence: ['upper-a', 'lower-a', 'upper-b', 'lower-b'], cycle_weeks: 4, schedule_shows: 'week_1', note_en: 'Three sessions a week drawn in order from a repeating four-session cycle. Because 3 does not divide 4, the week pattern repeats every four weeks; weeks_preview enumerates the full cycle.' },
    schedule: [W(1, 'upper-a'), R(2), W(3, 'lower-a'), R(4), W(5, 'upper-b'), R(6), R(7)],
    weeks_preview: [
      { week: 1, variant_ids: ['upper-a', 'lower-a', 'upper-b'] },
      { week: 2, variant_ids: ['lower-b', 'upper-a', 'lower-a'] },
      { week: 3, variant_ids: ['upper-b', 'lower-b', 'upper-a'] },
      { week: 4, variant_ids: ['lower-a', 'upper-b', 'lower-b'] },
    ] },
  { id: 'beginner-machines-3day', order: 8, name_en: 'Beginner Machines — 3 Days', name_ar: 'أجهزة للمبتدئين — ٣ أيام', level: 'beginner', days_per_week: 3,
    schedule: [W(1, 'machines-a'), R(2), W(3, 'machines-b'), R(4), W(5, 'machines-c'), R(6), R(7)] },
]

// ---------------------------------------------------------------- build
const orderDeviations = []

/** Q19 canonical order for a requested list: stable sort by catalog-derived rank. */
function q19(requested) {
  return requested
    .map((id, i) => ({ id, i, rank: ex(id).orderRank }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.id)
}

function buildExercises(canonical, requested, tier) {
  let compoundSeen = 0
  return canonical.map((id, idx) => {
    const e = ex(id)
    const role = roleOf(id, e.orderRank < 500 ? compoundSeen : -1)
    if (e.orderRank < 500) compoundSeen += 1
    const rx = RX[tier][role]
    const isLast = idx === canonical.length - 1
    // Optional = end-of-day accessory a time-pressed trainee may drop without
    // gutting the session: core finishers, and the closing arm isolation on 8+ lift days.
    const optional = role === 'finisher_core' || (isLast && role === 'isolation' && canonical.length >= 8)
    return {
      order: idx + 1,
      exercise_id: id,
      catalog_name_en: e.nameEn,
      catalog_name_ar: e.nameAr,
      equipment: e.equipment,
      primary_muscle: e.primaryMuscle,
      movement_pattern: e.movementPattern,
      role,
      sets: rx.sets,
      rep_range: rx.rep_range,
      rest_sec_min: rx.rest_sec_min,
      rest_sec_max: rx.rest_sec_max,
      required: !optional,
      optional,
      // Provenance/debug only — the brief's original position. Runtime order is `order`.
      requested_order: requested.indexOf(id) + 1,
      in_approved_machine_catalog: catalogIds.has(id),
      substitutions: (SUBS[id] ?? []).map((s) => ({ exercise_id: s, name_en: ex(s).nameEn, equipment: ex(s).equipment })),
      substitution_note: SUB_NOTES[id] ?? null,
    }
  })
}

// One canonical session per unique canonical id. The exercise array lives HERE and
// nowhere else, so two programs surfacing the same workout cannot drift apart.
const canonicalSessions = {}
const variants = {}

for (const [vid, def] of Object.entries(V)) {
  const csid = CANONICAL_OF[vid]
  if (!csid) throw new Error(`variant '${vid}' has no canonical session mapping`)
  const canonical = q19(def.requested)
  const changed = canonical.some((id, i) => id !== def.requested[i])
  if (changed) {
    orderDeviations.push({
      canonical_session_id: csid,
      surfaced_as_variant: vid,
      requested_order: def.requested,
      canonical_order: canonical,
      reason: 'Q19 ordering law (src/lib/workoutOrder.ts): compounds precede isolation; calves and core close the session. Enforced by `npm run test:workout-order`.',
    })
  }

  if (!canonicalSessions[csid]) {
    canonicalSessions[csid] = {
      id: csid,
      prescription_tier: def.tier,
      warmup_id: def.warmup,
      exercise_count: canonical.length,
      order_matches_request: !changed,
      surfaced_by_variants: [vid],
      alias_requested_orders: { [vid]: def.requested },
      exercises: buildExercises(canonical, def.requested, def.tier),
    }
  } else {
    // Aliasing must never hide a real difference: assert the second variant resolves to
    // exactly the same session before letting it share the definition.
    const cs = canonicalSessions[csid]
    const same = JSON.stringify(canonical) === JSON.stringify(cs.exercises.map((e) => e.exercise_id))
    if (!same) throw new Error(`alias mismatch: '${vid}' → '${csid}' resolves to a different exercise sequence; refusing to alias`)
    if (cs.prescription_tier !== def.tier) throw new Error(`alias mismatch: '${vid}' → '${csid}' differs in prescription tier`)
    if (cs.warmup_id !== def.warmup) throw new Error(`alias mismatch: '${vid}' → '${csid}' differs in warm-up`)
    cs.surfaced_by_variants.push(vid)
    cs.alias_requested_orders[vid] = def.requested
  }

  // A variant is a LABEL + REFERENCE. It carries no exercise array of its own.
  variants[vid] = {
    id: vid,
    canonical_session_id: csid,
    name_en: def.name_en,
    name_ar: def.name_ar,
    warmup_id: def.warmup,
    prescription_tier: def.tier,
    // Echo of the canonical session's count, asserted equal by the validator — this is
    // the importer-facing "did anything collapse?" tripwire, not a second source of truth.
    exercise_count: canonical.length,
  }
}

// Mark declared aliases explicitly so the structural proof reads shared references as
// intentional rather than as duplicate-content drift.
for (const cs of Object.values(canonicalSessions)) {
  for (const vid of cs.surfaced_by_variants) {
    variants[vid].is_alias = cs.surfaced_by_variants.length > 1
    variants[vid].shares_session_with = cs.surfaced_by_variants.filter((v) => v !== vid)
  }
}

const programs = PROGRAMS.map((p) => {
  const scheduled = [...new Set(p.schedule.filter((s) => s.type === 'workout').map((s) => s.variant_id))]
  const usedIds = p.rotation ? [...new Set([...p.rotation.sequence, ...scheduled])] : scheduled
  return {
    ...p,
    workout_variant_ids: usedIds,
    workout_day_count: p.rotation ? p.rotation.sequence.length : scheduled.length,
    // Derived echo for import verification: an importer can compare what it produced
    // against this without ever becoming a second editable copy of the session.
    resolved_days: usedIds.map((vid) => {
      const cs = canonicalSessions[variants[vid].canonical_session_id]
      return {
        variant_id: vid,
        canonical_session_id: cs.id,
        exercise_count: cs.exercise_count,
        exercise_ids_in_order: cs.exercises.map((e) => e.exercise_id),
      }
    }),
  }
})

// ---------------------------------------------------------------- canonical pool + media
const pool = [...new Set(Object.values(V).flatMap((d) => d.requested))].sort()
const substitutionTargets = [...new Set(Object.values(SUBS).flat())]
const warmupIds = [...new Set(Object.values(WARMUPS).flatMap((w) => w.items.flatMap((i) => [i.exercise_id, ...(i.alt_exercise_ids ?? [])]).filter(Boolean)))]

function mediaFor(id) {
  const m = snap.mediaManifest[id] ?? null
  const e = ex(id)
  return {
    image_status: m ? m.status : 'missing',
    image_start: m?.stillStart?.path ?? null,
    image_end: m?.stillEnd?.path ?? null,
    image_source: m?.source ?? null,
    image_license: m?.license ?? null,
    image_attribution: m?.attribution ?? null,
    gif: m?.gif ?? null,
    video_asset: m?.video ?? null,
    // videoUrl on a 'youtube_search' entry is a SEARCH URL, not a verified video.
    youtube_verified: e.videoSource === 'trusted_video' || e.videoSource === 'official',
    youtube_url: (e.videoSource === 'trusted_video' || e.videoSource === 'official') ? e.videoUrl : null,
    youtube_search_url: e.videoSource === 'youtube_search' ? e.videoUrl : null,
  }
}

const canonicalExercises = [...new Set([...pool, ...substitutionTargets])].sort().map((id) => {
  const e = ex(id)
  return {
    exercise_id: id,
    name_en: e.nameEn, name_ar: e.nameAr,
    equipment: e.equipment,
    primary_muscle: e.primaryMuscle,
    secondary_muscles: e.secondaryMuscles,
    primary_muscles_detailed: e.primaryMusclesDetailed,
    secondary_muscles_detailed: e.secondaryMusclesDetailed,
    movement_pattern: e.movementPattern,
    level: e.level,
    order_rank: e.orderRank,
    in_approved_machine_catalog: catalogIds.has(id),
    used_in_programs: pool.includes(id),
    used_as_substitution_only: !pool.includes(id),
    instructions_ar: e.techniqueTipsAr,
    instructions_en: e.howToEn,
    common_mistakes_ar: e.commonMistakesAr,
    common_mistakes_en: e.commonMistakesEn,
    safety_notes_ar: e.safetyNotesAr,
    media: mediaFor(id),
  }
})

const warmupExercises = warmupIds.map((id) => {
  const e = ex(id)
  return { exercise_id: id, name_en: e.nameEn, name_ar: e.nameAr, equipment: e.equipment, movement_pattern: e.movementPattern, is_working_exercise: false, media: mediaFor(id) }
})

const dataset = {
  dataset: 'QIM_MACHINE_WORKOUT_PROGRAMS',
  version: '1.0.0-prep',
  status: 'PREPARED_FOR_REVIEW — NOT IMPORTED',
  generated_at: new Date().toISOString().slice(0, 10),
  provenance: {
    exercise_catalog_source: 'src/data/exercises.ts (via data-prep/scripts/extract-catalog.mjs)',
    approved_machine_catalog_source: 'src/data/machineCatalog.ts',
    media_source: 'src/data/exerciseMediaManifest.generated.ts',
    ordering_law_source: 'src/lib/workoutOrder.ts (Q19), enforced by npm run test:workout-order',
    catalog_exercise_total: snap.exercises.length,
    invented_ids: 0,
  },
  policy: {
    machine_only: true,
    cable_stations_allowed: true,
    free_weight_equipment_excluded: [...FREE_WEIGHT],
    warmup_is_not_a_working_exercise: true,
  },
  unresolved_catalog_ids: [
    { requested_en: 'Assisted Pull-Up Machine', reason: 'No assisted pull-up machine exists in src/data/exercises.ts. The nearest catalog entry, assisted-dip-machine, is a triceps/chest press pattern — NOT a vertical pull — so it was not substituted. Requested as "where available"; left out rather than faked.', nearest_catalog_id: null },
    { requested_en: 'Rotary Torso Machine', reason: 'No rotary torso machine exists in src/data/exercises.ts. cable-woodchop is the only loaded rotation in the catalog but is a cable movement with a different setup, so it was not silently mapped. Requested as "where appropriate"; left out.', nearest_catalog_id: 'cable-woodchop' },
    { requested_en: 'Leg Press Calf Raise', reason: 'Exists in exercises.ts as leg-press-calf-raise but is NOT in the approved machine catalog (src/data/machineCatalog.ts lists only seated and standing calf raise). Used only as a declared substitution, never as a programmed exercise.', nearest_catalog_id: 'leg-press-calf-raise' },
  ],
  order_deviations: orderDeviations,
  // Assertions an IMPORTER must run, not just this repo's validator. Each one is the
  // guard against a specific way a multi-exercise session silently becomes "1 of 1".
  import_assertions: [
    {
      id: 'SESSION_RECORD_COUNT',
      rule: 'actual_exercise_count === declared_exercise_count',
      applies_to: 'every canonical session, re-checked after EVERY normalisation, mapping, serialisation or persistence step',
      declared_field: 'canonical_sessions[<id>].exercise_count (echoed on workout_variants[<id>].exercise_count and programs[].resolved_days[].exercise_count)',
      on_failure: 'ABORT the import loudly and persist nothing. Never write a session whose record count changed.',
      rationale: 'A workout that arrives with 8 records and lands with 1 is the historical "exercise 1 of 1" failure. Counting is the only step that catches it regardless of which transform lost the records.',
    },
    {
      id: 'EXERCISE_ID_UNIQUE_WITHIN_SESSION',
      rule: 'new Set(session.exercises.map(e => e.exercise_id)).size === session.exercises.length',
      applies_to: 'every canonical session',
      on_failure: 'ABORT. A repeated id makes any keyBy(exercise_id) lossy, which is exactly how a session collapses.',
    },
    {
      id: 'ORDER_IS_1_TO_N',
      rule: 'session.exercises.map(e => e.order) deep-equals [1..N] with no gaps, duplicates or reordering',
      applies_to: 'every canonical session',
      on_failure: 'ABORT. Non-unique order makes keyBy(order) lossy and destroys the "exercise i of N" display.',
    },
    {
      id: 'SCHEDULE_VARIANT_RESOLVES',
      rule: 'for every programs[].schedule[] entry with type === "workout", variant_id MUST resolve to a real workout_variants key — zero exceptions, no sentinels',
      applies_to: 'every program schedule entry',
      on_failure: 'ABORT. A placeholder id reaching an import path is an unresolvable session.',
    },
    {
      id: 'VARIANT_RESOLVES_TO_CANONICAL_SESSION',
      rule: 'every workout_variants[<id>].canonical_session_id resolves, and its exercise_count echo equals the canonical session count',
      applies_to: 'every variant, including declared aliases',
      on_failure: 'ABORT. An alias whose echo disagrees with its session means the two have drifted.',
    },
  ],
  aliasing: {
    policy: 'Two programs may surface the same physical workout under different user-facing labels. The exercise array lives once, on the canonical session; variants carry only the label and a reference. Shared references are intentional and valid — they are NOT duplicate-content failures.',
    declared_aliases: Object.values(canonicalSessions)
      .filter((cs) => cs.surfaced_by_variants.length > 1)
      .map((cs) => ({
        canonical_session_id: cs.id,
        surfaced_by: cs.surfaced_by_variants.map((vid) => ({ variant_id: vid, name_en: variants[vid].name_en, name_ar: variants[vid].name_ar })),
        requested_orders: cs.alias_requested_orders,
      })),
  },
  warmups: WARMUPS,
  warmup_exercises: warmupExercises,
  canonical_exercises: canonicalExercises,
  canonical_sessions: canonicalSessions,
  workout_variants: variants,
  programs,
}

writeFileSync(join(ROOT, 'data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json'), JSON.stringify(dataset, null, 2))
const aliasCount = Object.values(canonicalSessions).filter((c) => c.surfaced_by_variants.length > 1).length
console.log(`programs=${programs.length} canonical_sessions=${Object.keys(canonicalSessions).length} variants=${Object.keys(variants).length} declared_aliases=${aliasCount} canonical_exercises=${canonicalExercises.length} order_deviations=${orderDeviations.length}`)
