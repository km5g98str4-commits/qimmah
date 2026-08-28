#!/usr/bin/env node
// Validator for DATASET B. Every check is NAMED: a failure says which rule broke
// and on which record, so a failure is never a bare exception.
//
// Structure it validates:
//   canonical_sessions[]  the ONE place an exercise array lives
//   workout_variants[]    label + canonical_session_id (a shared id = a declared alias)
//   programs[].schedule[] every workout entry must resolve to a real variant
//
// Run:            node data-prep/scripts/validate-programs.mjs
// Attack mode:    node data-prep/scripts/validate-programs.mjs --attack
//   §4.2 counter-assertion — mutates the dataset in ways that MUST be rejected.

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const snap = JSON.parse(readFileSync(join(ROOT, 'data-prep/exercise/catalog-snapshot.json'), 'utf8'))
const CATALOG = new Map(snap.exercises.map((e) => [e.id, e]))
const FREE_WEIGHT = new Set(['barbell', 'dumbbell', 'kettlebell', 'bench', 'band', 'bodyweight', 'rope', 'ball'])
const ALLOWED_EQUIP = new Set(['machine', 'cable'])

const COUNT_BANDS = [
  { test: (n) => /^Upper/.test(n), min: 8, max: 9, label: 'Upper' },
  { test: (n) => /^Lower/.test(n), min: 5, max: 6, label: 'Lower' },
  { test: (n) => /^Full Body/.test(n), min: 6, max: 7, label: 'Full Body' },
  { test: (n) => /^(Push|Pull|Legs)/.test(n), min: 6, max: 6, label: 'PPL day' },
  { test: (n) => /^Machines/.test(n), min: 6, max: 6, label: 'Beginner machines day' },
]

function validate(ds) {
  const fail = []
  const F = (rule, detail) => fail.push(`${rule}: ${detail}`)
  const sessions = Object.entries(ds.canonical_sessions)
  const variants = Object.entries(ds.workout_variants)

  // --- 1. no invented ids -----------------------------------------------------
  for (const [sid, s] of sessions) {
    for (const e of s.exercises) {
      if (!CATALOG.has(e.exercise_id)) F('NO_INVENTED_IDS', `session ${sid} references '${e.exercise_id}' which is absent from src/data/exercises.ts`)
    }
  }
  for (const c of ds.canonical_exercises) {
    if (!CATALOG.has(c.exercise_id)) F('NO_INVENTED_IDS', `canonical_exercises has '${c.exercise_id}' absent from the catalog`)
  }

  // --- 2. machine-only (cable allowed), no free weights -----------------------
  for (const [sid, s] of sessions) {
    for (const e of s.exercises) {
      for (const q of CATALOG.get(e.exercise_id)?.equipment ?? []) {
        if (FREE_WEIGHT.has(q)) F('MACHINE_ONLY', `session ${sid} exercise '${e.exercise_id}' uses free-weight equipment '${q}'`)
        else if (!ALLOWED_EQUIP.has(q)) F('MACHINE_ONLY', `session ${sid} exercise '${e.exercise_id}' uses non-machine equipment '${q}'`)
      }
    }
  }

  // --- 3. substitutions are machine/cable and function-matched ----------------
  for (const [sid, s] of sessions) {
    for (const e of s.exercises) {
      const base = CATALOG.get(e.exercise_id)
      if (!base) continue // already reported by NO_INVENTED_IDS; do not crash on it
      for (const sub0 of e.substitutions) {
        const sub = CATALOG.get(sub0.exercise_id)
        if (!sub) { F('SUBSTITUTION_ID_REAL', `session ${sid}: substitution '${sub0.exercise_id}' is not a catalog exercise`); continue }
        for (const q of sub.equipment) {
          if (!ALLOWED_EQUIP.has(q)) F('SUBSTITUTION_MACHINE_ONLY', `'${e.exercise_id}' → '${sub0.exercise_id}' introduces non-machine equipment '${q}'`)
        }
        // Function match uses the catalog's DETAILED muscle map, not the coarse group.
        // Accepted when EITHER (a) the substitution trains the base's LEADING primary
        // muscle — leading, not any, because a chest press lists 'triceps' as a primary
        // and plain overlap would wave through swapping it for a triceps machine — or
        // (b) same movement pattern, same compound/isolation class, and the muscle sets
        // overlap once secondaries count (the flat-vs-incline press case).
        const lead = base.primaryMusclesDetailed[0]
        const leadingMatch = lead !== undefined && sub.primaryMusclesDetailed.includes(lead)
        const unionOf = (x) => [...x.primaryMusclesDetailed, ...x.secondaryMusclesDetailed]
        const unionOverlap = unionOf(sub).some((m) => unionOf(base).includes(m))
        const sameClass = (sub.orderRank < 500) === (base.orderRank < 500)
        const samePattern = sub.movementPattern === base.movementPattern
        if (!leadingMatch && !(unionOverlap && samePattern && sameClass)) {
          F('SUBSTITUTION_FUNCTION_MATCH', `'${e.exercise_id}' (lead ${lead}, ${base.movementPattern}) → '${sub0.exercise_id}' (${sub.primaryMusclesDetailed.join('+')}, ${sub.movementPattern}) does not train the same movement/muscle function`)
        }
      }
      if (e.substitutions.length === 0 && !e.substitution_note) {
        F('EMPTY_SUBSTITUTION_MUST_BE_EXPLAINED', `session ${sid} exercise '${e.exercise_id}' has no substitutions and no documented reason`)
      }
    }
  }

  // --- 4. session invariant: N distinct ordered records -----------------------
  for (const [sid, s] of sessions) {
    const n = s.exercises.length
    if (n < 2) F('SESSION_NOT_FLATTENED', `session ${sid} has ${n} exercise record(s) — a workout must never collapse to one`)
    if (n !== s.exercise_count) F('EXERCISE_COUNT_FIELD', `session ${sid} declares exercise_count=${s.exercise_count} but carries ${n} records`)
    const orders = s.exercises.map((e) => e.order)
    const expected = Array.from({ length: n }, (_, i) => i + 1)
    if (JSON.stringify(orders) !== JSON.stringify(expected)) F('ORDER_IS_1_TO_N', `session ${sid} order sequence is [${orders}], expected [${expected}]`)
    const ids = s.exercises.map((e) => e.exercise_id)
    if (new Set(ids).size !== ids.length) F('NO_DUPLICATE_WITHIN_SESSION', `session ${sid} repeats an exercise: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`)
  }

  // --- 5. exercise-count bands, per surfacing label ---------------------------
  // An aliased session must satisfy the band of EVERY label it appears under.
  for (const [vid, v] of variants) {
    const s = ds.canonical_sessions[v.canonical_session_id]
    if (!s) continue // reported by VARIANT_SESSION_RESOLVES
    const band = COUNT_BANDS.find((b) => b.test(v.name_en))
    if (!band) { F('COUNT_BAND_KNOWN', `variant ${vid} name '${v.name_en}' matches no documented count band`); continue }
    if (s.exercise_count < band.min || s.exercise_count > band.max) {
      F('COUNT_BAND', `variant ${vid} (${band.label}) resolves to ${s.exercise_count} exercises, expected ${band.min}–${band.max}`)
    }
  }

  // --- 6. warm-up is separate from working exercises --------------------------
  const workingIds = new Set(sessions.flatMap(([, s]) => s.exercises.map((e) => e.exercise_id)))
  for (const [wid, w] of Object.entries(ds.warmups)) {
    for (const item of w.items) {
      if (item.is_working_exercise !== false) F('WARMUP_NOT_WORKING', `${wid} item ${item.order} is not flagged is_working_exercise:false`)
      if (item.kind === 'ramp_up_set') {
        if (item.exercise_id !== null) F('RAMP_UP_IS_NOT_AN_EXERCISE', `${wid} ramp-up set carries its own exercise_id '${item.exercise_id}' instead of referencing the first working exercise`)
        if (item.references_first_working_exercise !== true) F('RAMP_UP_REFERENCE', `${wid} ramp-up set does not declare references_first_working_exercise`)
      } else {
        if (!item.exercise_id) F('WARMUP_ITEM_ID', `${wid} item ${item.order} (${item.kind}) has no exercise_id`)
        else if (!CATALOG.has(item.exercise_id)) F('WARMUP_ID_REAL', `${wid} item ${item.order} references unknown exercise '${item.exercise_id}'`)
        else if (workingIds.has(item.exercise_id)) F('WARMUP_SEPARATE', `${wid} uses '${item.exercise_id}', which is also programmed as a working exercise`)
      }
    }
  }
  for (const wid of new Set(sessions.map(([, s]) => s.warmup_id))) {
    if (!ds.warmups[wid]) F('WARMUP_EXISTS', `a session references warm-up '${wid}' which is not defined`)
  }

  // --- 7. Q19 ordering law ----------------------------------------------------
  for (const [sid, s] of sessions) {
    if (s.exercises.some((e) => !CATALOG.has(e.exercise_id))) continue // NO_INVENTED_IDS already named it
    const ranks = s.exercises.map((e) => CATALOG.get(e.exercise_id).orderRank)
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] < ranks[i - 1]) F('Q19_ORDER', `session ${sid} places rank ${ranks[i]} ('${s.exercises[i].exercise_id}') after rank ${ranks[i - 1]} ('${s.exercises[i - 1].exercise_id}')`)
    }
  }

  // --- 8. no duplicate canonical exercises ------------------------------------
  const cids = ds.canonical_exercises.map((c) => c.exercise_id)
  if (new Set(cids).size !== cids.length) F('NO_DUPLICATE_CANONICAL', `canonical_exercises repeats: ${cids.filter((x, i) => cids.indexOf(x) !== i)}`)

  // --- 9. media honesty -------------------------------------------------------
  for (const c of ds.canonical_exercises) {
    const m = c.media
    if (m.image_status === 'placeholder-only' || m.image_status === 'missing') {
      if (m.image_start || m.image_end) F('NO_WRONG_MACHINE_IMAGERY', `'${c.exercise_id}' is ${m.image_status} yet claims an image path`)
      if (m.image_source) F('NO_FAKE_PROVENANCE', `'${c.exercise_id}' is ${m.image_status} yet claims source '${m.image_source}'`)
    }
    if (m.image_status === 'stills' && !(m.image_start && m.image_source && m.image_license)) {
      F('IMAGE_PROVENANCE_REQUIRED', `'${c.exercise_id}' claims stills without a full path/source/license`)
    }
    const cat = CATALOG.get(c.exercise_id)
    if (!cat) continue // already reported by NO_INVENTED_IDS
    const claimsVerified = m.youtube_verified === true
    const actuallyVerified = cat.videoSource === 'trusted_video' || cat.videoSource === 'official'
    if (claimsVerified !== actuallyVerified) F('YOUTUBE_HONESTY', `'${c.exercise_id}' youtube_verified=${claimsVerified} but catalog videoSource='${cat.videoSource}'`)
    if (claimsVerified === false && m.youtube_url) F('YOUTUBE_HONESTY', `'${c.exercise_id}' is unverified yet carries a youtube_url`)
  }

  // --- 10. variants resolve to a canonical session, echoes agree --------------
  for (const [vid, v] of variants) {
    const s = ds.canonical_sessions[v.canonical_session_id]
    if (!s) { F('VARIANT_SESSION_RESOLVES', `variant '${vid}' points at canonical session '${v.canonical_session_id}' which does not exist`); continue }
    if (v.exercise_count !== s.exercise_count) F('VARIANT_COUNT_ECHO', `variant '${vid}' echoes exercise_count=${v.exercise_count} but session '${s.id}' holds ${s.exercise_count} — the two have drifted`)
    if (!s.surfaced_by_variants.includes(vid)) F('ALIAS_BACKREFERENCE', `session '${s.id}' does not list '${vid}' in surfaced_by_variants`)
  }

  // --- 11. aliases are declared; duplicate content otherwise is a failure -----
  // Two sessions holding an identical exercise sequence means a workout exists twice
  // as two independently editable arrays — exactly the drift the alias mechanism removes.
  const bySeq = {}
  for (const [sid, s] of sessions) (bySeq[s.exercises.map((e) => e.exercise_id).join('>')] ??= []).push(sid)
  for (const [seq, group] of Object.entries(bySeq)) {
    if (group.length > 1) F('NO_UNDECLARED_DUPLICATE_SESSION', `sessions [${group.join(', ')}] hold the identical sequence ${seq} — share one canonical session and alias the labels instead`)
  }

  // --- 12. every schedule entry resolves — ZERO exceptions, no sentinels ------
  for (const p of ds.programs) {
    for (const entry of p.schedule) {
      if (entry.type !== 'workout') {
        if (entry.variant_id !== null && entry.variant_id !== undefined) F('REST_DAY_HAS_NO_VARIANT', `program ${p.id} day ${entry.day} is '${entry.type}' but carries variant_id '${entry.variant_id}'`)
        continue
      }
      if (!entry.variant_id) { F('SCHEDULE_VARIANT_RESOLVES', `program ${p.id} day ${entry.day} is a workout with no variant_id`); continue }
      if (!ds.workout_variants[entry.variant_id]) {
        F('SCHEDULE_VARIANT_RESOLVES', `program ${p.id} day ${entry.day} references variant '${entry.variant_id}' which does not exist — no import path may meet a placeholder id`)
      }
    }
    // rotation, where declared, must also reference only real variants
    for (const vid of p.rotation?.sequence ?? []) {
      if (!ds.workout_variants[vid]) F('ROTATION_VARIANT_RESOLVES', `program ${p.id} rotation references variant '${vid}' which does not exist`)
    }
    for (const wk of p.weeks_preview ?? []) {
      for (const vid of wk.variant_ids) {
        if (!ds.workout_variants[vid]) F('ROTATION_VARIANT_RESOLVES', `program ${p.id} week ${wk.week} references variant '${vid}' which does not exist`)
      }
    }
  }

  // --- 13. programs resolve, and nothing flattens -----------------------------
  for (const p of ds.programs) {
    if (p.workout_variant_ids.length === 0) F('PROGRAM_HAS_DAYS', `program ${p.id} has no workout variants`)
    for (const vid of p.workout_variant_ids) {
      if (!ds.workout_variants[vid]) F('PROGRAM_VARIANT_EXISTS', `program ${p.id} references undefined variant '${vid}'`)
    }
    for (const d of p.resolved_days) {
      const v = ds.workout_variants[d.variant_id]
      if (!v) { F('PROGRAM_VARIANT_EXISTS', `program ${p.id} resolved_days references '${d.variant_id}'`); continue }
      const s = ds.canonical_sessions[v.canonical_session_id]
      if (!s) continue // VARIANT_SESSION_RESOLVES already named it
      if (d.exercise_ids_in_order.length !== s.exercise_count) F('RESOLVED_DAY_MATCHES', `program ${p.id} day ${d.variant_id} lists ${d.exercise_ids_in_order.length} ids but session declares ${s.exercise_count}`)
      if (JSON.stringify(d.exercise_ids_in_order) !== JSON.stringify(s.exercises.map((e) => e.exercise_id))) {
        F('RESOLVED_DAY_MATCHES', `program ${p.id} day ${d.variant_id} order disagrees with its canonical session`)
      }
    }
    const scheduled = new Set(p.schedule.map((s) => s.day))
    if (scheduled.size !== 7) F('SCHEDULE_IS_A_WEEK', `program ${p.id} covers ${scheduled.size} distinct days, expected 7`)
    const workoutDays = p.schedule.filter((s) => s.type === 'workout').length
    if (workoutDays !== p.days_per_week) F('DECLARED_TRAINING_DAYS', `program ${p.id} declares days_per_week=${p.days_per_week} but schedules ${workoutDays} workout days`)
  }

  return fail
}

const ds = JSON.parse(readFileSync(join(ROOT, 'data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json'), 'utf8'))

if (!process.argv.includes('--attack')) {
  const fails = validate(ds)
  if (fails.length) { console.error(`FAIL — ${fails.length} violation(s):`); fails.forEach((f) => console.error('  ✗ ' + f)); process.exit(1) }
  const sessions = Object.values(ds.canonical_sessions)
  const aliases = sessions.filter((s) => s.surfaced_by_variants.length > 1)
  console.log('PASS — DATASET B')
  console.log(`  programs=${ds.programs.length} canonical_sessions=${sessions.length} variants=${Object.keys(ds.workout_variants).length} declared_aliases=${aliases.length}`)
  console.log(`  exercise_records=${sessions.reduce((a, s) => a + s.exercise_count, 0)} canonical_exercises=${ds.canonical_exercises.length} warmups=${Object.keys(ds.warmups).length}`)
  process.exit(0)
}

const clone = () => JSON.parse(JSON.stringify(ds))
const attacks = [
  ['free weight smuggled into a session', 'MACHINE_ONLY', (d) => { d.canonical_sessions['cs-upper-a'].exercises[0].exercise_id = 'dumbbell-bench-press' }],
  ['invented exercise id', 'NO_INVENTED_IDS', (d) => { d.canonical_sessions['cs-lower-a'].exercises[0].exercise_id = 'super-hack-squat-3000' }],
  ['session flattened to one record', 'SESSION_NOT_FLATTENED', (d) => { const s = d.canonical_sessions['cs-fullbody-a']; s.exercises = [s.exercises[0]]; s.exercise_count = 1 }],
  ['order renumbered so 1..N breaks', 'ORDER_IS_1_TO_N', (d) => { d.canonical_sessions['cs-push-a'].exercises.forEach((e) => { e.order = 1 }) }],
  ['same exercise twice in a session', 'NO_DUPLICATE_WITHIN_SESSION', (d) => { const s = d.canonical_sessions['cs-pull-a']; s.exercises[1].exercise_id = s.exercises[0].exercise_id }],
  ['isolation placed before a compound', 'Q19_ORDER', (d) => { const s = d.canonical_sessions['cs-upper-b']; const x = s.exercises[0]; s.exercises[0] = s.exercises[5]; s.exercises[5] = x; s.exercises.forEach((e, i) => { e.order = i + 1 }) }],
  ['warm-up promoted into the working list', 'WARMUP_SEPARATE', (d) => { d.warmups['warmup-upper'].items[0].exercise_id = 'chest-press-machine'; d.warmups['warmup-upper'].items[0].kind = 'cardio' }],
  ['ramp-up set turned into a working exercise', 'RAMP_UP_IS_NOT_AN_EXERCISE', (d) => { d.warmups['warmup-lower'].items.find((i) => i.kind === 'ramp_up_set').exercise_id = 'leg-press-machine' }],
  ['unrelated substitution', 'SUBSTITUTION_FUNCTION_MATCH', (d) => { d.canonical_sessions['cs-lower-a'].exercises[0].substitutions = [{ exercise_id: 'lateral-raise-machine', name_en: 'Lateral Raise Machine', equipment: ['machine'] }] }],
  ['chest press swapped for a triceps machine (shares a non-leading primary)', 'SUBSTITUTION_FUNCTION_MATCH', (d) => { d.canonical_sessions['cs-upper-a'].exercises.find((x) => x.exercise_id === 'chest-press-machine').substitutions = [{ exercise_id: 'triceps-extension-machine', name_en: 'Triceps Extension Machine', equipment: ['machine'] }] }],
  ['free-weight substitution', 'SUBSTITUTION_MACHINE_ONLY', (d) => { d.canonical_sessions['cs-upper-a'].exercises[0].substitutions = [{ exercise_id: 'dumbbell-bench-press', name_en: 'Dumbbell Bench Press', equipment: ['dumbbell', 'bench'] }] }],
  ['image claimed for a placeholder-only machine', 'NO_WRONG_MACHINE_IMAGERY', (d) => { d.canonical_exercises.find((x) => x.media.image_status === 'placeholder-only').media.image_start = '/exercise-images/some-barbell/0.jpg' }],
  ['fabricated image provenance', 'NO_FAKE_PROVENANCE', (d) => { d.canonical_exercises.find((x) => x.media.image_status === 'placeholder-only').media.image_source = 'definitely-real-photos' }],
  ['unverified video passed off as verified', 'YOUTUBE_HONESTY', (d) => { d.canonical_exercises.find((x) => x.media.youtube_verified === false).media.youtube_verified = true }],
  ['upper day padded outside its count band', 'COUNT_BAND', (d) => { const s = d.canonical_sessions['cs-upper-a']; s.exercises = s.exercises.slice(0, 4); s.exercises.forEach((e, i) => { e.order = i + 1 }); s.exercise_count = 4 }],
  ['resolved day disagrees with its session', 'RESOLVED_DAY_MATCHES', (d) => { d.programs[0].resolved_days[0].exercise_ids_in_order = ['chest-press-machine'] }],
  ['empty substitution list with no reason', 'EMPTY_SUBSTITUTION_MUST_BE_EXPLAINED', (d) => { d.canonical_sessions['cs-lower-a'].exercises.find((x) => x.exercise_id === 'leg-extension-machine').substitution_note = null }],
  // --- guards added for this integration wave ---
  ['sentinel variant id reintroduced into a schedule', 'SCHEDULE_VARIANT_RESOLVES', (d) => { d.programs.find((p) => p.order === 7).schedule.find((s) => s.type === 'workout').variant_id = 'rotating' }],
  ['schedule points at a deleted variant', 'SCHEDULE_VARIANT_RESOLVES', (d) => { d.programs[0].schedule.find((s) => s.type === 'workout').variant_id = 'upper-z' }],
  ['rest day given a variant id', 'REST_DAY_HAS_NO_VARIANT', (d) => { d.programs[0].schedule.find((s) => s.type === 'rest').variant_id = 'upper-a' }],
  ['rotation references a fake variant', 'ROTATION_VARIANT_RESOLVES', (d) => { d.programs.find((p) => p.order === 7).rotation.sequence[0] = 'upper-zz' }],
  ['alias un-shared back into two drifting copies', 'NO_UNDECLARED_DUPLICATE_SESSION', (d) => { const src = d.canonical_sessions['cs-lower-a']; d.canonical_sessions['cs-legs-a-copy'] = JSON.parse(JSON.stringify({ ...src, id: 'cs-legs-a-copy', surfaced_by_variants: ['legs-a'] })); d.workout_variants['legs-a'].canonical_session_id = 'cs-legs-a-copy' }],
  ['variant count echo drifts from its session', 'VARIANT_COUNT_ECHO', (d) => { d.workout_variants['upper-a'].exercise_count = 1 }],
  ['variant points at a missing session', 'VARIANT_SESSION_RESOLVES', (d) => { d.workout_variants['upper-a'].canonical_session_id = 'cs-nope' }],
  ['declared training days no longer match the schedule', 'DECLARED_TRAINING_DAYS', (d) => { d.programs[0].days_per_week = 6 }],
]

let loose = 0
console.log('ATTACK MODE — every mutation below must be rejected by its named rule\n')
for (const [name, expectedRule, mutate] of attacks) {
  const d = clone()
  let fails
  try { mutate(d); fails = validate(d) } catch (err) { console.log(`  ✗ LOOSE  ${name} — validator threw ${err.constructor.name} instead of failing by name`); loose++; continue }
  if (fails.some((f) => f.startsWith(expectedRule + ':'))) console.log(`  ✓ caught by ${expectedRule.padEnd(34)} ${name}`)
  else { console.log(`  ✗ LOOSE  ${name} — expected ${expectedRule}, got: ${fails.length ? fails.slice(0, 2).join(' | ') : 'NO FAILURE AT ALL'}`); loose++ }
}
console.log(loose === 0 ? `\nPASS — ${attacks.length}/${attacks.length} bypass attempts rejected by a named check.` : `\nFAIL — ${loose} bypass attempt(s) slipped through.`)
process.exit(loose === 0 ? 0 : 1)
