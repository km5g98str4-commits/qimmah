#!/usr/bin/env node
// Validator for DATASET B. Every check is NAMED: a failure says which rule broke
// and on which record, so a failure is never a bare exception.
//
// Run:            node data-prep/scripts/validate-programs.mjs
// Attack mode:    node data-prep/scripts/validate-programs.mjs --attack
//   §4.2 counter-assertion — mutates the dataset in ways that MUST be rejected.
//   If any mutation passes, the gate is loose and this script fails loudly.

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
  const variants = Object.entries(ds.workout_variants)

  // --- 1. no invented ids -----------------------------------------------------
  for (const [vid, v] of variants) {
    for (const e of v.exercises) {
      if (!CATALOG.has(e.exercise_id)) F('NO_INVENTED_IDS', `variant ${vid} references '${e.exercise_id}' which is absent from src/data/exercises.ts`)
    }
  }
  for (const c of ds.canonical_exercises) {
    if (!CATALOG.has(c.exercise_id)) F('NO_INVENTED_IDS', `canonical_exercises has '${c.exercise_id}' absent from the catalog`)
  }

  // --- 2. machine-only (cable allowed), no free weights -----------------------
  for (const [vid, v] of variants) {
    for (const e of v.exercises) {
      const eq = CATALOG.get(e.exercise_id)?.equipment ?? []
      for (const q of eq) {
        if (FREE_WEIGHT.has(q)) F('MACHINE_ONLY', `variant ${vid} exercise '${e.exercise_id}' uses free-weight equipment '${q}'`)
        else if (!ALLOWED_EQUIP.has(q)) F('MACHINE_ONLY', `variant ${vid} exercise '${e.exercise_id}' uses non-machine equipment '${q}'`)
      }
    }
  }

  // --- 3. substitutions are machine/cable and function-matched ----------------
  for (const [vid, v] of variants) {
    for (const e of v.exercises) {
      const base = CATALOG.get(e.exercise_id)
      if (!base) continue // already reported by NO_INVENTED_IDS; do not crash on it
      for (const s of e.substitutions) {
        const sub = CATALOG.get(s.exercise_id)
        if (!sub) { F('SUBSTITUTION_ID_REAL', `variant ${vid}: substitution '${s.exercise_id}' is not a catalog exercise`); continue }
        for (const q of sub.equipment) {
          if (!ALLOWED_EQUIP.has(q)) F('SUBSTITUTION_MACHINE_ONLY', `'${e.exercise_id}' → '${s.exercise_id}' introduces non-machine equipment '${q}'`)
        }
        // Function match uses the catalog's DETAILED muscle map, not the coarse group:
        // coarse labels split rear-delt work across 'shoulders' and 'back' though both
        // train rear_delts, while a shared coarse label can hide a real mismatch.
        //
        // Accepted when EITHER
        //   (a) the substitution trains the base's LEADING primary muscle — the head the
        //       exercise exists to train. Leading (not any) overlap matters: a chest press
        //       lists 'triceps' as a primary, so plain overlap would wave through swapping
        //       a chest press for a triceps machine.
        //   (b) it is the same movement pattern and the same compound/isolation class and
        //       the muscle sets overlap once secondaries count — this is the flat-vs-incline
        //       press case, where the angle shifts the head but not the movement.
        const lead = base.primaryMusclesDetailed[0]
        const leadingMatch = lead !== undefined && sub.primaryMusclesDetailed.includes(lead)
        const unionOf = (x) => [...x.primaryMusclesDetailed, ...x.secondaryMusclesDetailed]
        const unionOverlap = unionOf(sub).some((m) => unionOf(base).includes(m))
        const sameClass = (sub.orderRank < 500) === (base.orderRank < 500)
        const samePattern = sub.movementPattern === base.movementPattern
        if (!leadingMatch && !(unionOverlap && samePattern && sameClass)) {
          F('SUBSTITUTION_FUNCTION_MATCH', `'${e.exercise_id}' (lead ${lead}, ${base.movementPattern}) → '${s.exercise_id}' (${sub.primaryMusclesDetailed.join('+')}, ${sub.movementPattern}) does not train the same movement/muscle function`)
        }
      }
      if (e.substitutions.length === 0 && !e.substitution_note) {
        F('EMPTY_SUBSTITUTION_MUST_BE_EXPLAINED', `variant ${vid} exercise '${e.exercise_id}' has no substitutions and no documented reason`)
      }
    }
  }

  // --- 4. session invariant: N distinct ordered records -----------------------
  for (const [vid, v] of variants) {
    const n = v.exercises.length
    if (n < 2) F('SESSION_NOT_FLATTENED', `variant ${vid} has ${n} exercise record(s) — a workout must never collapse to one`)
    if (n !== v.exercise_count) F('EXERCISE_COUNT_FIELD', `variant ${vid} declares exercise_count=${v.exercise_count} but carries ${n} records`)
    const orders = v.exercises.map((e) => e.order)
    const expected = Array.from({ length: n }, (_, i) => i + 1)
    if (JSON.stringify(orders) !== JSON.stringify(expected)) F('ORDER_IS_1_TO_N', `variant ${vid} order sequence is [${orders}], expected [${expected}]`)
    const ids = v.exercises.map((e) => e.exercise_id)
    if (new Set(ids).size !== ids.length) F('NO_DUPLICATE_WITHIN_DAY', `variant ${vid} repeats an exercise: ${ids.filter((x, i) => ids.indexOf(x) !== i)}`)
  }

  // --- 5. exercise-count bands ------------------------------------------------
  for (const [vid, v] of variants) {
    const band = COUNT_BANDS.find((b) => b.test(v.name_en))
    if (!band) { F('COUNT_BAND_KNOWN', `variant ${vid} name '${v.name_en}' matches no documented count band`); continue }
    if (v.exercise_count < band.min || v.exercise_count > band.max) {
      F('COUNT_BAND', `variant ${vid} (${band.label}) has ${v.exercise_count} exercises, expected ${band.min}–${band.max}`)
    }
  }

  // --- 6. warm-up is separate from working exercises --------------------------
  const workingIds = new Set(variants.flatMap(([, v]) => v.exercises.map((e) => e.exercise_id)))
  for (const [wid, w] of Object.entries(ds.warmups)) {
    for (const item of w.items) {
      if (item.is_working_exercise !== false) F('WARMUP_NOT_WORKING', `${wid} item ${item.order} is not flagged is_working_exercise:false`)
      if (item.kind === 'ramp_up_set') {
        if (item.exercise_id !== null) F('RAMP_UP_IS_NOT_AN_EXERCISE', `${wid} ramp-up set carries its own exercise_id '${item.exercise_id}' instead of referencing the first working exercise`)
        if (item.references_first_working_exercise !== true) F('RAMP_UP_REFERENCE', `${wid} ramp-up set does not declare references_first_working_exercise`)
      } else {
        if (!item.exercise_id) F('WARMUP_ITEM_ID', `${wid} item ${item.order} (${item.kind}) has no exercise_id`)
        if (!CATALOG.has(item.exercise_id)) F('WARMUP_ID_REAL', `${wid} item ${item.order} references unknown exercise '${item.exercise_id}'`)
        if (workingIds.has(item.exercise_id)) F('WARMUP_SEPARATE', `${wid} uses '${item.exercise_id}', which is also programmed as a working exercise`)
      }
    }
  }
  for (const wid of new Set(variants.map(([, v]) => v.warmup_id))) {
    if (!ds.warmups[wid]) F('WARMUP_EXISTS', `variant references warm-up '${wid}' which is not defined`)
  }

  // --- 7. Q19 ordering law ----------------------------------------------------
  for (const [vid, v] of variants) {
    if (v.exercises.some((e) => !CATALOG.has(e.exercise_id))) continue // NO_INVENTED_IDS already named it
    const ranks = v.exercises.map((e) => CATALOG.get(e.exercise_id).orderRank)
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] < ranks[i - 1]) F('Q19_ORDER', `variant ${vid} places rank ${ranks[i]} ('${v.exercises[i].exercise_id}') after rank ${ranks[i - 1]} ('${v.exercises[i - 1].exercise_id}')`)
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

  // --- 10. programs resolve, and nothing flattens -----------------------------
  for (const p of ds.programs) {
    if (p.workout_variant_ids.length === 0) F('PROGRAM_HAS_DAYS', `program ${p.id} has no workout variants`)
    for (const vid of p.workout_variant_ids) {
      if (!ds.workout_variants[vid]) F('PROGRAM_VARIANT_EXISTS', `program ${p.id} references undefined variant '${vid}'`)
    }
    for (const d of p.resolved_days) {
      const v = ds.workout_variants[d.variant_id]
      if (!v) { F('PROGRAM_VARIANT_EXISTS', `program ${p.id} resolved_days references '${d.variant_id}'`); continue }
      if (d.exercise_ids_in_order.length !== v.exercise_count) F('RESOLVED_DAY_MATCHES', `program ${p.id} day ${d.variant_id} lists ${d.exercise_ids_in_order.length} ids but variant declares ${v.exercise_count}`)
      if (JSON.stringify(d.exercise_ids_in_order) !== JSON.stringify(v.exercises.map((e) => e.exercise_id))) {
        F('RESOLVED_DAY_MATCHES', `program ${p.id} day ${d.variant_id} order disagrees with the variant`)
      }
    }
    const scheduled = new Set(p.schedule.map((s) => s.day))
    if (scheduled.size !== 7) F('SCHEDULE_IS_A_WEEK', `program ${p.id} covers ${scheduled.size} distinct days, expected 7`)
  }

  return fail
}

const ds = JSON.parse(readFileSync(join(ROOT, 'data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json'), 'utf8'))

if (!process.argv.includes('--attack')) {
  const fails = validate(ds)
  if (fails.length) { console.error(`FAIL — ${fails.length} violation(s):`); fails.forEach((f) => console.error('  ✗ ' + f)); process.exit(1) }
  const variants = Object.values(ds.workout_variants)
  console.log('PASS — DATASET B')
  console.log(`  programs=${ds.programs.length} variants=${variants.length} exercise_records=${variants.reduce((a, v) => a + v.exercise_count, 0)}`)
  console.log(`  canonical_exercises=${ds.canonical_exercises.length} warmups=${Object.keys(ds.warmups).length}`)
  process.exit(0)
}

// --------------------------------------------------------------- attack mode
// Each mutation must be caught by the NAMED rule. A mutation that slips through,
// or one caught only by an exception, means the gate is loose.
const clone = () => JSON.parse(JSON.stringify(ds))
const attacks = [
  ['free weight smuggled into a session', 'MACHINE_ONLY', (d) => { d.workout_variants['upper-a'].exercises[0].exercise_id = 'dumbbell-bench-press' }],
  ['invented exercise id', 'NO_INVENTED_IDS', (d) => { d.workout_variants['legs-a'].exercises[0].exercise_id = 'super-hack-squat-3000' }],
  ['session flattened to one record', 'SESSION_NOT_FLATTENED', (d) => { d.workout_variants['fb-a'].exercises = [d.workout_variants['fb-a'].exercises[0]]; d.workout_variants['fb-a'].exercise_count = 1 }],
  ['order renumbered so 1..N breaks', 'ORDER_IS_1_TO_N', (d) => { d.workout_variants['push-a'].exercises.forEach((e) => { e.order = 1 }) }],
  ['same exercise twice in a day', 'NO_DUPLICATE_WITHIN_DAY', (d) => { d.workout_variants['pull-a'].exercises[1].exercise_id = d.workout_variants['pull-a'].exercises[0].exercise_id }],
  ['isolation placed before a compound', 'Q19_ORDER', (d) => { const v = d.workout_variants['upper-b']; const x = v.exercises[0]; v.exercises[0] = v.exercises[5]; v.exercises[5] = x; v.exercises.forEach((e, i) => { e.order = i + 1 }) }],
  ['warm-up promoted into the working list', 'WARMUP_SEPARATE', (d) => { d.warmups['warmup-upper'].items[0].exercise_id = 'chest-press-machine'; d.warmups['warmup-upper'].items[0].kind = 'cardio' }],
  ['ramp-up set turned into a working exercise', 'RAMP_UP_IS_NOT_AN_EXERCISE', (d) => { const it = d.warmups['warmup-lower'].items.find((i) => i.kind === 'ramp_up_set'); it.exercise_id = 'leg-press-machine' }],
  ['unrelated substitution', 'SUBSTITUTION_FUNCTION_MATCH', (d) => { d.workout_variants['legs-a'].exercises[0].substitutions = [{ exercise_id: 'lateral-raise-machine', name_en: 'Lateral Raise Machine', equipment: ['machine'] }] }],
  ['chest press swapped for a triceps machine (shares a non-leading primary)', 'SUBSTITUTION_FUNCTION_MATCH', (d) => { d.workout_variants['upper-a'].exercises.find((x) => x.exercise_id === 'chest-press-machine').substitutions = [{ exercise_id: 'triceps-extension-machine', name_en: 'Triceps Extension Machine', equipment: ['machine'] }] }],
  ['free-weight substitution', 'SUBSTITUTION_MACHINE_ONLY', (d) => { d.workout_variants['upper-a'].exercises[0].substitutions = [{ exercise_id: 'dumbbell-bench-press', name_en: 'Dumbbell Bench Press', equipment: ['dumbbell', 'bench'] }] }],
  ['image claimed for a placeholder-only machine', 'NO_WRONG_MACHINE_IMAGERY', (d) => { const c = d.canonical_exercises.find((x) => x.media.image_status === 'placeholder-only'); c.media.image_start = '/exercise-images/some-barbell/0.jpg' }],
  ['fabricated image provenance', 'NO_FAKE_PROVENANCE', (d) => { const c = d.canonical_exercises.find((x) => x.media.image_status === 'placeholder-only'); c.media.image_source = 'definitely-real-photos' }],
  ['unverified video passed off as verified', 'YOUTUBE_HONESTY', (d) => { const c = d.canonical_exercises.find((x) => x.media.youtube_verified === false); c.media.youtube_verified = true }],
  ['upper day padded outside its count band', 'COUNT_BAND', (d) => { const v = d.workout_variants['upper-a']; v.exercises = v.exercises.slice(0, 4); v.exercises.forEach((e, i) => { e.order = i + 1 }); v.exercise_count = 4 }],
  ['resolved day disagrees with its variant', 'RESOLVED_DAY_MATCHES', (d) => { d.programs[0].resolved_days[0].exercise_ids_in_order = ['chest-press-machine'] }],
  ['empty substitution list with no reason', 'EMPTY_SUBSTITUTION_MUST_BE_EXPLAINED', (d) => { const e = d.workout_variants['legs-a'].exercises.find((x) => x.exercise_id === 'leg-extension-machine'); e.substitution_note = null }],
]

let loose = 0
console.log('ATTACK MODE — every mutation below must be rejected by its named rule\n')
for (const [name, expectedRule, mutate] of attacks) {
  const d = clone()
  let fails
  try { mutate(d); fails = validate(d) } catch (err) { console.log(`  ✗ LOOSE  ${name} — validator threw ${err.constructor.name} instead of failing by name`); loose++; continue }
  const hit = fails.find((f) => f.startsWith(expectedRule + ':'))
  if (hit) console.log(`  ✓ caught by ${expectedRule.padEnd(38)} ${name}`)
  else { console.log(`  ✗ LOOSE  ${name} — expected ${expectedRule}, got: ${fails.length ? fails.slice(0, 2).join(' | ') : 'NO FAILURE AT ALL'}`); loose++ }
}
console.log(loose === 0 ? `\nPASS — ${attacks.length}/${attacks.length} bypass attempts rejected by a named check.` : `\nFAIL — ${loose} bypass attempt(s) slipped through.`)
process.exit(loose === 0 ? 0 : 1)
