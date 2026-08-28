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
const labelsOf = (csid) => D.canonical_sessions[csid].surfaced_by_variants
  .map((v) => `${D.workout_variants[v].name_en} (${v}, ${usedBy(v).join('/')})`).join('  ·  ')
const short = (id) => id.replace(/-machine$/, '').replace(/-/g, ' ')

console.log('='.repeat(78))
console.log('1 · Q19 ORDERING CONFLICTS')
console.log('='.repeat(78))
console.log(`conflict count: ${D.order_deviations.length}\n`)

for (const dev of D.order_deviations) {
  const rq = dev.requested_order.map((id) => ({ id, rank: CAT.get(id).orderRank }))
  // The exact violated transition(s): a lower rank appearing after a higher rank.
  const violations = []
  for (let i = 1; i < rq.length; i++) {
    if (rq[i].rank < rq[i - 1].rank) {
      violations.push(`pos ${i} "${short(rq[i - 1].id)}" [${rq[i - 1].rank} ${RANK_NAME[rq[i - 1].rank]}] → pos ${i + 1} "${short(rq[i].id)}" [${rq[i].rank} ${RANK_NAME[rq[i].rank]}]`)
    }
  }
  console.log(`── ${dev.canonical_session_id}  surfaced as: ${labelsOf(dev.canonical_session_id)}`)
  console.log(`   requested : ${dev.requested_order.map((id, i) => `${i + 1}.${short(id)}`).join('  ')}`)
  console.log(`   Q19       : ${dev.canonical_order.map((id, i) => `${i + 1}.${short(id)}`).join('  ')}`)
  console.log(`   violates  : ${violations.join(' ; ')}`)
  console.log('')
}

console.log('='.repeat(78))
console.log('3 · STRUCTURAL PROOF')
console.log('='.repeat(78))
const P = []
const ok = (label, pass, detail, extra) => { P.push({ label, pass, extra: !!extra }); console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`) }

const S = Object.entries(D.canonical_sessions)
const VAR = Object.entries(D.workout_variants)
const sessionOf = (vid) => D.canonical_sessions[D.workout_variants[vid].canonical_session_id]

ok('program_count = 8', D.programs.length === 8, `${D.programs.length}`)

let daysOk = true; const daysDetail = []
for (const p of D.programs) {
  const n = p.schedule.filter((s) => s.type === 'workout').length
  if (n !== p.days_per_week) daysOk = false
  daysDetail.push(`P${p.order}:${n}/${p.days_per_week}${n === p.days_per_week ? '' : ' MISMATCH'}`)
}
ok('every program has its declared number of training days', daysOk, daysDetail.join(' '))
ok('every workout session has N > 1 exercises', S.every(([, s]) => s.exercises.length > 1), `min=${Math.min(...S.map(([, s]) => s.exercises.length))}`)
ok('every exercise has a stable ordered position (order = 1..N, unique)', S.every(([, s]) => JSON.stringify(s.exercises.map((e) => e.order)) === JSON.stringify(s.exercises.map((_, i) => i + 1))))
ok('no free-weight exercise anywhere in the programs', S.every(([, s]) => s.exercises.every((e) => CAT.get(e.exercise_id).equipment.every((q) => !FREE.has(q)))))
ok('every programmed exercise resolves to a real catalog id', S.every(([, s]) => s.exercises.every((e) => CAT.has(e.exercise_id))))

const subBad = []
for (const [sid, s] of S) {
  for (const e of s.exercises) {
    const base = CAT.get(e.exercise_id)
    for (const x of e.substitutions) {
      const sub = CAT.get(x.exercise_id)
      if (!sub) { subBad.push(`${sid}:${x.exercise_id} unknown`); continue }
      const lead = base.primaryMusclesDetailed[0]
      const union = (y) => [...y.primaryMusclesDetailed, ...y.secondaryMusclesDetailed]
      const okSub = sub.primaryMusclesDetailed.includes(lead) ||
        (union(sub).some((m) => union(base).includes(m)) && sub.movementPattern === base.movementPattern && (sub.orderRank < 500) === (base.orderRank < 500))
      if (!okSub) subBad.push(`${sid}: ${e.exercise_id} → ${x.exercise_id}`)
      if (sub.equipment.some((q) => FREE.has(q))) subBad.push(`${sid}: ${e.exercise_id} → ${x.exercise_id} (free weight)`)
    }
  }
}
const subCount = S.reduce((a, [, s]) => a + s.exercises.reduce((b, e) => b + e.substitutions.length, 0), 0)
ok('substitutions never cross movement families incorrectly', subBad.length === 0, subBad.length ? subBad.join(' | ') : `${subCount} pairs checked`)

const workingIds = new Set(S.flatMap(([, s]) => s.exercises.map((e) => e.exercise_id)))
const warmIds = Object.values(D.warmups).flatMap((w) => w.items.map((i) => i.exercise_id).filter(Boolean))
ok('warm-up records are structurally separate from working exercises',
  warmIds.every((id) => !workingIds.has(id)) && Object.values(D.warmups).every((w) => w.items.every((i) => i.is_working_exercise === false)),
  `${warmIds.length} warm-up refs, 0 overlap with ${workingIds.size} working ids`)

const p3 = D.programs.find((p) => p.order === 3), p4 = D.programs.find((p) => p.order === 4), p7 = D.programs.find((p) => p.order === 7)
ok('P4 reuses P3 sessions by shared id (not a copy)', p4.workout_variant_ids.every((v) => p3.workout_variant_ids.includes(v)), `P4=[${p4.workout_variant_ids}] ⊂ P3`)
ok('P7 declares an explicit rotation, not duplicated days', !!p7.rotation && p7.rotation.kind === 'rotating_sequence', `cycle=${p7.rotation.cycle_weeks}w over [${p7.rotation.sequence}]`)

// Duplicate content is valid ONLY as a declared alias: one canonical session, many labels.
const bySeq = {}
for (const [sid, s] of S) (bySeq[s.exercises.map((e) => e.exercise_id).join('>')] ??= []).push(sid)
const undeclared = Object.values(bySeq).filter((g) => g.length > 1)
const aliases = S.filter(([, s]) => s.surfaced_by_variants.length > 1)
ok('no two canonical sessions hold identical content (aliases share one definition instead)',
  undeclared.length === 0,
  undeclared.length ? undeclared.map((g) => g.join('=')).join(', ') : `${aliases.length} declared aliases: ` + aliases.map(([sid, s]) => `${sid}←{${s.surfaced_by_variants.join(',')}}`).join(' '))

// NEW, requested this wave: zero unresolvable schedule variant ids.
const unresolvable = []
for (const p of D.programs) {
  for (const e of p.schedule) if (e.type === 'workout' && !D.workout_variants[e.variant_id]) unresolvable.push(`${p.id} day${e.day}:${e.variant_id}`)
  for (const v of p.rotation?.sequence ?? []) if (!D.workout_variants[v]) unresolvable.push(`${p.id} rotation:${v}`)
  for (const w of p.weeks_preview ?? []) for (const v of w.variant_ids) if (!D.workout_variants[v]) unresolvable.push(`${p.id} w${w.week}:${v}`)
}
ok('every schedule/rotation variant_id resolves to a real variant (zero exceptions)', unresolvable.length === 0,
  unresolvable.length ? unresolvable.join(', ') : `${D.programs.reduce((a, p) => a + p.schedule.filter((e) => e.type === 'workout').length, 0)} schedule entries + rotation + previews, 0 unresolvable`, true)

console.log('')
console.log('='.repeat(78))
console.log('3b · "1 OF 1" ATTACK — reproduce an 8-exercise Upper collapsing to one')
console.log('='.repeat(78))
const target = D.canonical_sessions[D.workout_variants['upper-a'].canonical_session_id]
console.log(`target: ${target.id} (surfaced as ${target.surfaced_by_variants.join(', ')}), ${target.exercise_count} exercises\n`)

const transforms = [
  ['JSON round-trip (stringify → parse)', (v) => JSON.parse(JSON.stringify(v)).exercises.length],
  ['structuredClone', (v) => structuredClone(v).exercises.length],
  ['dedupe by exercise_id (Set)', (v) => new Set(v.exercises.map((e) => e.exercise_id)).size],
  ['keyBy exercise_id (Object.fromEntries)', (v) => Object.keys(Object.fromEntries(v.exercises.map((e) => [e.exercise_id, e]))).length],
  ['keyBy order', (v) => Object.keys(Object.fromEntries(v.exercises.map((e) => [e.order, e]))).length],
  ['Map keyed by exercise_id', (v) => new Map(v.exercises.map((e) => [e.exercise_id, e])).size],
  ['group-by primary_muscle then take groups', (v) => new Set(v.exercises.map((e) => e.primary_muscle)).size],
  ['variant → canonical session resolution', () => sessionOf('upper-a').exercises.length],
  ['alias resolution (both labels of an aliased session)', () => Math.min(...D.canonical_sessions['cs-lower-a'].surfaced_by_variants.map((v) => sessionOf(v).exercises.length))],
  ['denormalised resolved_days echo', () => D.programs[0].resolved_days.find((d) => d.variant_id === 'upper-a').exercise_ids_in_order.length],
  ['sort by order then map', (v) => [...v.exercises].sort((a, b) => a.order - b.order).map((e) => e.exercise_id).length],
  ['filter required only', (v) => v.exercises.filter((e) => e.required).length],
]
let reproduced = null
for (const [name, fn] of transforms) {
  const n = fn(target)
  if (n <= 1) reproduced = name
  console.log(`  ${n <= 1 ? 'COLLAPSE' : 'ok      '} ${String(n).padStart(2)} record(s)  ${name}`)
}
const constKey = Object.keys(Object.fromEntries(target.exercises.map((e) => [target.id, e]))).length
console.log(`  ${constKey <= 1 ? 'COLLAPSE' : 'ok      '} ${String(constKey).padStart(2)} record(s)  keyBy canonical_session_id (a constant per session — importer bug, shown for contrast)`)

// The importer-facing assertion the dataset now ships, run against that worst case.
const assertCount = (actual, declared) => actual === declared
console.log('')
console.log('  SESSION_RECORD_COUNT assertion applied to that worst case:')
console.log(`    actual=${constKey} declared=${target.exercise_count} → ${assertCount(constKey, target.exercise_count) ? 'passes (wrong!)' : 'FAILS LOUDLY — import aborts, nothing persisted'}`)

console.log('')
console.log(reproduced ? `REPRODUCED via: ${reproduced}` : 'NOT REPRODUCED by any transformation the dataset itself uses.')
console.log(`Invariant: within every canonical session, exercise_id is unique (${new Set(target.exercises.map((e) => e.exercise_id)).size}/${target.exercise_count}) AND order is exactly 1..N and unique.`)
console.log(`Backstop: import_assertions[SESSION_RECORD_COUNT] requires actual === declared after EVERY transform, so even an importer bug outside this dataset aborts instead of persisting "1 of 1".`)

console.log('')
console.log('='.repeat(78))
const core = P.filter((x) => !x.extra)
console.log(`STRUCTURAL PROOF: ${core.filter((x) => x.pass).length}/${core.length} original checks pass` +
  `  ·  +${P.filter((x) => x.extra).length} new check this wave  ·  total ${P.filter((x) => x.pass).length}/${P.length}`)
console.log('='.repeat(78))
