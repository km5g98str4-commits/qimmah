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
  // cable-rear-delt-fly is deliberately NOT listed: despite its name the catalog maps it
  // to side_delts+front_delts, so it fails the rear-delt function match. Raised as a
  // catalog finding rather than silently used. See data-prep/evidence/FINDINGS.md.
  'reverse-pec-deck': ['rear-delt-row-machine', 'face-pull'],
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
    rotation: { kind: 'rotating_sequence', sequence: ['upper-a', 'lower-a', 'upper-b', 'lower-b'], note_en: 'Three sessions per week drawn in order from a repeating four-session cycle, so week 1 runs Upper A / Lower A / Upper B and week 2 resumes at Lower B / Upper A / Lower A.' },
    schedule: [W(1, 'rotating'), R(2), W(3, 'rotating'), R(4), W(5, 'rotating'), R(6), R(7)],
    weeks_preview: [{ week: 1, variant_ids: ['upper-a', 'lower-a', 'upper-b'] }, { week: 2, variant_ids: ['lower-b', 'upper-a', 'lower-a'] }, { week: 3, variant_ids: ['upper-b', 'lower-b', 'upper-a'] }] },
  { id: 'beginner-machines-3day', order: 8, name_en: 'Beginner Machines — 3 Days', name_ar: 'أجهزة للمبتدئين — ٣ أيام', level: 'beginner', days_per_week: 3,
    schedule: [W(1, 'machines-a'), R(2), W(3, 'machines-b'), R(4), W(5, 'machines-c'), R(6), R(7)] },
]

// ---------------------------------------------------------------- build
const orderDeviations = []

function buildVariant(vid, def) {
  // Canonical Q19 order: stable sort by catalog-derived rank.
  const ranked = def.requested.map((id, i) => ({ id, i, rank: ex(id).orderRank }))
  const ordered = [...ranked].sort((a, b) => a.rank - b.rank || a.i - b.i)
  const canonical = ordered.map((x) => x.id)
  const changed = canonical.some((id, i) => id !== def.requested[i])
  if (changed) {
    orderDeviations.push({ variant_id: vid, requested_order: def.requested, canonical_order: canonical,
      reason: 'Q19 ordering law (src/lib/workoutOrder.ts): compounds precede isolation; calves and core close the session. Enforced by `npm run test:workout-order`.' })
  }

  let compoundSeen = 0
  const exercises = canonical.map((id, idx) => {
    const e = ex(id)
    const role = roleOf(id, e.orderRank < 500 ? compoundSeen : -1)
    if (e.orderRank < 500) compoundSeen += 1
    const rx = RX[def.tier][role]
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
      requested_order: def.requested.indexOf(id) + 1,
      in_approved_machine_catalog: catalogIds.has(id),
      substitutions: (SUBS[id] ?? []).map((s) => ({ exercise_id: s, name_en: ex(s).nameEn, equipment: ex(s).equipment })),
      substitution_note: SUB_NOTES[id] ?? null,
    }
  })

  return {
    id: vid, name_en: def.name_en, name_ar: def.name_ar,
    warmup_id: def.warmup,
    prescription_tier: def.tier,
    exercise_count: exercises.length,
    order_matches_request: !changed,
    exercises,
  }
}

const variants = Object.fromEntries(Object.entries(V).map(([vid, def]) => [vid, buildVariant(vid, def)]))

// Programs carry fully resolved days as well as ids, so an importer cannot collapse
// a session into a single record (the "1 of 1" failure).
const programs = PROGRAMS.map((p) => {
  const usedIds = p.rotation ? p.rotation.sequence : [...new Set(p.schedule.filter((s) => s.type === 'workout').map((s) => s.variant_id))]
  return {
    ...p,
    workout_variant_ids: usedIds,
    workout_day_count: p.rotation ? p.rotation.sequence.length : p.schedule.filter((s) => s.type === 'workout').length,
    resolved_days: usedIds.map((vid) => ({
      variant_id: vid,
      exercise_count: variants[vid].exercise_count,
      exercise_ids_in_order: variants[vid].exercises.map((e) => e.exercise_id),
    })),
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
  warmups: WARMUPS,
  warmup_exercises: warmupExercises,
  canonical_exercises: canonicalExercises,
  workout_variants: variants,
  programs,
}

writeFileSync(join(ROOT, 'data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json'), JSON.stringify(dataset, null, 2))
console.log(`programs=${programs.length} variants=${Object.keys(variants).length} canonical_exercises=${canonicalExercises.length} order_deviations=${orderDeviations.length}`)
