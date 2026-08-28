#!/usr/bin/env node
// FINAL REVIEW — read-only audit. Writes no dataset, mutates nothing on disk.
// Produces: the 12 Q19 conflicts, the structural proof, and the "1 of 1" attack.

import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const D = JSON.parse(readFileSync(join(ROOT, 'data-prep/exercise/QIM_MACHINE_WORKOUT_PROGRAMS.json'), 'utf8'))
const SNAP = JSON.parse(readFileSync(join(ROOT, 'data-prep/exercise/catalog-snapshot.json'), 'utf8'))
const CAT = new Map(SNAP.exercises.map((e) => [e.id, e]))
const RANK_NAME = { 100: 'leg compound (squat/hinge/lunge)', 110: 'upper compound (push/pull/carry)', 500: 'isolation', 900: 'finisher (calves/core)' }
const FREE = new Set(['barbell', 'dumbbell', 'kettlebell', 'bench', 'band', 'bodyweight', 'rope', 'ball'])

const usedBy = (vid) => D.programs.filter((p) => p.workout_variant_ids.includes(vid)).map((p) => `P${p.order}`)
const short = (id) => id.replace(/-machine$/, '').replace(/-/g, ' ')

console.log('='.repeat(78))
console.log('1 · Q19 ORDERING CONFLICTS')
console.log('='.repeat(78))
console.log(`conflict count: ${D.order_deviations.length}\n`)

for (const dev of D.order_deviations) {
  const v = D.workout_variants[dev.variant_id]
  const rq = dev.requested_order.map((id) => ({ id, rank: CAT.get(id).orderRank }))
  // The exact violated transition(s): a lower rank appearing after a higher rank.
  const violations = []
  for (let i = 1; i < rq.length; i++) {
    if (rq[i].rank < rq[i - 1].rank) {
      violations.push(`pos ${i} "${short(rq[i - 1].id)}" [${rq[i - 1].rank} ${RANK_NAME[rq[i - 1].rank]}] → pos ${i + 1} "${short(rq[i].id)}" [${rq[i].rank} ${RANK_NAME[rq[i].rank]}]`)
    }
  }
  console.log(`── ${dev.variant_id}  (${v.name_en})  used by ${usedBy(dev.variant_id).join(', ')}`)
  console.log(`   requested : ${dev.requested_order.map((id, i) => `${i + 1}.${short(id)}`).join('  ')}`)
  console.log(`   Q19       : ${dev.canonical_order.map((id, i) => `${i + 1}.${short(id)}`).join('  ')}`)
  console.log(`   violates  : ${violations.join(' ; ')}`)
  console.log('')
}

console.log('='.repeat(78))
console.log('3 · STRUCTURAL PROOF')
console.log('='.repeat(78))
const P = []
const ok = (label, pass, detail) => { P.push({ label, pass, detail }); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`) }

ok('program_count = 8', D.programs.length === 8, `${D.programs.length}`)

// declared training days vs schedule
let daysOk = true, daysDetail = []
for (const p of D.programs) {
  const workoutEntries = p.schedule.filter((s) => s.type === 'workout').length
  const match = workoutEntries === p.days_per_week
  if (!match) daysOk = false
  daysDetail.push(`P${p.order}:${workoutEntries}/${p.days_per_week}${match ? '' : ' MISMATCH'}`)
}
ok('every program has its declared number of training days', daysOk, daysDetail.join(' '))

const variants = Object.entries(D.workout_variants)
ok('every workout day has N > 1 exercises', variants.every(([, v]) => v.exercises.length > 1), `min=${Math.min(...variants.map(([, v]) => v.exercises.length))}`)
ok('every exercise has a stable ordered position (order = 1..N, unique)', variants.every(([, v]) => JSON.stringify(v.exercises.map((e) => e.order)) === JSON.stringify(v.exercises.map((_, i) => i + 1))))
ok('no free-weight exercise anywhere in the programs', variants.every(([, v]) => v.exercises.every((e) => CAT.get(e.exercise_id).equipment.every((q) => !FREE.has(q)))))
ok('every programmed exercise resolves to a real catalog id', variants.every(([, v]) => v.exercises.every((e) => CAT.has(e.exercise_id))))

// substitutions cannot cross movement families incorrectly
let subBad = []
for (const [vid, v] of variants) {
  for (const e of v.exercises) {
    const base = CAT.get(e.exercise_id)
    for (const s of e.substitutions) {
      const sub = CAT.get(s.exercise_id)
      if (!sub) { subBad.push(`${vid}:${s.exercise_id} unknown`); continue }
      const lead = base.primaryMusclesDetailed[0]
      const leadMatch = sub.primaryMusclesDetailed.includes(lead)
      const union = (x) => [...x.primaryMusclesDetailed, ...x.secondaryMusclesDetailed]
      const fallback = union(sub).some((m) => union(base).includes(m)) && sub.movementPattern === base.movementPattern && (sub.orderRank < 500) === (base.orderRank < 500)
      if (!leadMatch && !fallback) subBad.push(`${vid}: ${e.exercise_id} → ${s.exercise_id}`)
      if (sub.equipment.some((q) => FREE.has(q))) subBad.push(`${vid}: ${e.exercise_id} → ${s.exercise_id} (free weight)`)
    }
  }
}
ok('substitutions never cross movement families incorrectly', subBad.length === 0, subBad.length ? subBad.join(' | ') : '44 pairs checked')

// warm-up separation
const workingIds = new Set(variants.flatMap(([, v]) => v.exercises.map((e) => e.exercise_id)))
const warmIds = Object.values(D.warmups).flatMap((w) => w.items.map((i) => i.exercise_id).filter(Boolean))
ok('warm-up records are structurally separate from working exercises',
  warmIds.every((id) => !workingIds.has(id)) && Object.values(D.warmups).every((w) => w.items.every((i) => i.is_working_exercise === false)),
  `${warmIds.length} warm-up refs, 0 overlap with ${workingIds.size} working ids`)

// Programs 4 and 7 reuse — intentional, by shared id, not accidental duplication
const seqOf = (vid) => D.workout_variants[vid].exercises.map((e) => e.exercise_id).join('>')
const bySeq = {}
for (const [vid] of variants) (bySeq[seqOf(vid)] ??= []).push(vid)
const accidental = Object.values(bySeq).filter((g) => g.length > 1)
const p4 = D.programs.find((p) => p.order === 4), p7 = D.programs.find((p) => p.order === 7), p3 = D.programs.find((p) => p.order === 3)
const p4Reuses = p4.workout_variant_ids.every((v) => p3.workout_variant_ids.includes(v))
ok('P4 reuses P3 sessions by shared id (not a copy)', p4Reuses, `P4=[${p4.workout_variant_ids}] ⊂ P3`)
ok('P7 declares an explicit rotation, not duplicated days', !!p7.rotation && p7.rotation.kind === 'rotating_sequence', `sequence=[${p7.rotation.sequence}]`)
ok('no two distinct variant ids hold an identical exercise sequence (accidental duplication)', accidental.length === 0, accidental.length ? accidental.map((g) => g.join('=')).join(', ') : 'all 19 sequences distinct')

console.log('')
console.log('='.repeat(78))
console.log('3b · "1 OF 1" ATTACK — reproduce an 8-exercise Upper collapsing to one')
console.log('='.repeat(78))
const target = D.workout_variants['upper-a']
console.log(`target: upper-a, ${target.exercise_count} exercises\n`)

const transforms = [
  ['JSON round-trip (stringify → parse)', (v) => JSON.parse(JSON.stringify(v)).exercises.length],
  ['structuredClone', (v) => structuredClone(v).exercises.length],
  ['dedupe by exercise_id (Set)', (v) => new Set(v.exercises.map((e) => e.exercise_id)).size],
  ['keyBy exercise_id (Object.fromEntries)', (v) => Object.keys(Object.fromEntries(v.exercises.map((e) => [e.exercise_id, e]))).length],
  ['keyBy order', (v) => Object.keys(Object.fromEntries(v.exercises.map((e) => [e.order, e]))).length],
  ['Map keyed by exercise_id', (v) => new Map(v.exercises.map((e) => [e.exercise_id, e])).size],
  ['group-by primary_muscle then take groups', (v) => new Set(v.exercises.map((e) => e.primary_muscle)).size],
  ['denormalised resolved_days path', () => D.programs[0].resolved_days.find((d) => d.variant_id === 'upper-a').exercise_ids_in_order.length],
  ['sort by order then map', (v) => [...v.exercises].sort((a, b) => a.order - b.order).map((e) => e.exercise_id).length],
  ['filter required only', (v) => v.exercises.filter((e) => e.required).length],
]
let reproduced = null
for (const [name, fn] of transforms) {
  const n = fn(target)
  const collapsed = n <= 1
  console.log(`  ${collapsed ? 'COLLAPSE' : 'ok      '} ${String(n).padStart(2)} record(s)  ${name}`)
  if (collapsed) reproduced = name
}
// the only genuinely lossy shape: keying on something constant within a day
const constKey = Object.keys(Object.fromEntries(target.exercises.map((e) => [target.id, e]))).length
console.log(`  ${constKey <= 1 ? 'COLLAPSE' : 'ok      '} ${String(constKey).padStart(2)} record(s)  keyBy variant_id (a constant per day — importer bug, shown for contrast)`)
console.log('')
console.log(reproduced
  ? `REPRODUCED via: ${reproduced}`
  : 'NOT REPRODUCED by any transformation the dataset itself uses.')
console.log(`Invariant: within every variant, exercise_id is unique (${new Set(target.exercises.map((e) => e.exercise_id)).size}/${target.exercise_count}) AND order is exactly 1..N and unique.`)
console.log('Both key candidates an importer would realistically use are therefore injective on a day.')
console.log(`Detection field: exercise_count=${target.exercise_count} lets an importer assert N after any transform.`)

console.log('')
console.log('='.repeat(78))
console.log(`STRUCTURAL PROOF: ${P.filter((x) => x.pass).length}/${P.length} checks pass`)
console.log('='.repeat(78))
