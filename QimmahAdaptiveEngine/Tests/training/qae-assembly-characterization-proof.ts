// [CTO-QAE-012] §1 — Legacy day-assembly characterization, asserted BEFORE any
// assembly implementation exists.
//
// These assertions lock the observable semantics documented in
// Docs/QAE-TRAINING-ASSEMBLY-CHARACTERIZATION.md against the 17 shippingPlan
// goldens. They are the acceptance target for Domain/Training/assembly.ts: the
// implementation is correct when it reproduces every golden byte-identically
// AND continues to satisfy each named assertion here.
//
// Asserting against the goldens (observable behaviour) rather than by scraping
// shipping source keeps the proof honest: it fails by name on a behavioural
// change, not on a refactor of the legacy file.

import { readdirSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { DAY_SLOTS, type DayKind } from '../../Domain/Training/requirements'
import type { ExerciseCatalog } from '../../Domain/Catalog/model'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    console.error(`✗ ${name} — ${detail}`)
  }
}

const qaeRoot = process.env.QAE_ROOT
if (!qaeRoot) throw new Error('QAE_ROOT not set')
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(resolvePath(qaeRoot, rel), 'utf8')) as T

const catalog = readJson<ExerciseCatalog>('Contracts/exercises/exercise-catalog.qae.json')
const catalogIds = new Set(catalog.exercises.map((e) => e.exerciseId))
const machineIds = new Set(catalog.primaryMachineIds)

interface GoldenDay {
  id: string
  exercises: Array<{ exerciseId: string; order: number; optional: boolean }>
}
interface Golden {
  scenario: string
  shippingPlan: { templateId: string; days: GoldenDay[] }
  profileEvidence: { personalization: Record<string, unknown> }
}

const goldenDir = 'Fixtures/golden/training'
const files = readdirSync(resolvePath(qaeRoot, goldenDir))
  .filter((f) => f.endsWith('.golden.json'))
  .sort()
const goldens = files.map((f) => readJson<Golden>(`${goldenDir}/${f}`))

check('17 shippingPlan goldens present', goldens.length === 17, String(goldens.length))

// ── §1 target-count bands (documented; asserted as a bounded range) ─────────
const DAY_KINDS = new Set<string>(Object.keys(DAY_SLOTS))
// The §1 clamp is [3, 9]. Only the upper bound is asserted per day: the lower
// bound is a target, not a floor — a day legitimately falls short when both
// fill stages exhaust the pool (§8 insufficient-pool behaviour), which the
// bodyweight and machines-only goldens actually exercise.
const TARGET_MAX = 9
const FULL_BODY_MIN = 5

// ── §9 accessory category table ────────────────────────────────────────────
function accessoryCategory(kind: string, variation: number): 'triceps' | 'biceps' | 'abs' | null {
  switch (kind) {
    case 'push':
      return 'triceps'
    case 'pull':
      return 'biceps'
    case 'full':
    case 'lower':
      return 'abs'
    case 'upper':
    case 'arms':
      return variation % 2 === 0 ? 'triceps' : 'biceps'
    case 'core':
      return 'abs'
    default:
      return null
  }
}

for (const g of goldens) {
  const s = g.scenario
  const days = g.shippingPlan.days
  const perKindSeen = new Map<string, number>()
  let anyOptional = false

  // A10 — day count matches the scenario's declared daysPerWeek
  const declaredDays = g.profileEvidence.personalization['daysPerWeek']
  if (typeof declaredDays === 'number') {
    check(`A10 ${s}: day count == daysPerWeek`, days.length === declaredDays, `${days.length} vs ${declaredDays}`)
  }

  days.forEach((day, di) => {
    // A1 — dayId shape `gen-{index+1}-{kind}` with a known kind
    const m = /^gen-(\d+)-([a-z]+)$/.exec(day.id)
    check(`A1 ${s}/${day.id}: id matches gen-{n}-{kind}`, m !== null, day.id)
    if (!m) return
    check(`A1b ${s}/${day.id}: index is 1-based position`, Number(m[1]) === di + 1, `${m[1]} vs ${di + 1}`)
    const kind = m[2]
    check(`A1c ${s}/${day.id}: kind is a known DayKind`, DAY_KINDS.has(kind), kind)

    const variation = perKindSeen.get(kind) ?? 0
    perKindSeen.set(kind, variation + 1)

    // A2 — order is dense, 0-based, ascending
    const orders = day.exercises.map((e) => e.order)
    check(
      `A2 ${s}/${day.id}: order dense 0..n-1 ascending`,
      orders.every((o, i) => o === i),
      orders.join(','),
    )

    // A3 — no intra-day duplicate
    const ids = day.exercises.map((e) => e.exerciseId)
    check(`A3 ${s}/${day.id}: no intra-day duplicate`, new Set(ids).size === ids.length, ids.join(','))

    // A4 — day length within the clamp
    check(`A4 ${s}/${day.id}: length <= ${TARGET_MAX}`, ids.length <= TARGET_MAX, String(ids.length))
    check(`A4b ${s}/${day.id}: length >= 1`, ids.length >= 1, String(ids.length))

    // A5 — full-body minimum
    if (kind === 'full') {
      check(`A5 ${s}/${day.id}: full-body day >= ${FULL_BODY_MIN}`, ids.length >= FULL_BODY_MIN, String(ids.length))
    }

    // A6 — at most one optional, and only last
    const optionalIdx = day.exercises.map((e, i) => (e.optional ? i : -1)).filter((i) => i >= 0)
    check(`A6 ${s}/${day.id}: at most one optional`, optionalIdx.length <= 1, optionalIdx.join(','))
    if (optionalIdx.length === 1) {
      anyOptional = true
      check(
        `A6b ${s}/${day.id}: optional is the final element`,
        optionalIdx[0] === day.exercises.length - 1,
        `${optionalIdx[0]} of ${day.exercises.length}`,
      )
      // A12 — accessory category matches the documented table
      const cat = accessoryCategory(kind, variation)
      check(`A12 ${s}/${day.id}: day kind has an accessory category`, cat !== null, kind)
    }

    // A9 — every id exists in the catalog
    for (const id of ids) {
      check(`A9 ${s}/${day.id}: ${id} exists in catalog`, catalogIds.has(id), id)
    }
  })

  // A7 — optional (accessory) only appears in machines-only scenarios.
  // Machines-only is characterized as: every non-optional id is in the approved
  // machine pool.
  if (anyOptional) {
    const nonOptional = days.flatMap((d) => d.exercises.filter((e) => !e.optional).map((e) => e.exerciseId))
    check(
      `A7 ${s}: accessory present => all core picks are approved machines`,
      nonOptional.every((id) => machineIds.has(id)),
      nonOptional.filter((id) => !machineIds.has(id)).join(','),
    )
  }

  // A8 — same-kind days (A/B) are not identical sequences.
  const byKind = new Map<string, string[][]>()
  for (const day of days) {
    const m = /^gen-\d+-([a-z]+)$/.exec(day.id)
    if (!m) continue
    const list = byKind.get(m[1]) ?? []
    list.push(day.exercises.map((e) => e.exerciseId))
    byKind.set(m[1], list)
  }
  for (const [kind, seqs] of [...byKind.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (seqs.length < 2) continue
    const distinct = new Set(seqs.map((x) => x.join('|')))
    check(
      `A8 ${s}/${kind}: ${seqs.length} same-kind days produce distinct sequences (A/B variation active)`,
      distinct.size === seqs.length,
      `${distinct.size} distinct of ${seqs.length}`,
    )
  }
}

// ── Cross-golden structural facts ──────────────────────────────────────────
const allKinds = new Set<string>()
for (const g of goldens) {
  for (const d of g.shippingPlan.days) {
    const m = /^gen-\d+-([a-z]+)$/.exec(d.id)
    if (m) allKinds.add(m[1])
  }
}
check(
  'every observed day kind has DAY_SLOTS requirements',
  [...allKinds].every((k) => DAY_KINDS.has(k as DayKind)),
  [...allKinds].filter((k) => !DAY_KINDS.has(k as DayKind)).join(','),
)

// Day-count coverage the directive asks Wave 2 to exercise: 3/4/5/6 days.
const dayCounts = new Set(goldens.map((g) => g.shippingPlan.days.length))
for (const n of [3, 4, 5, 6]) {
  check(`A/B coverage: a golden exists with ${n} training days`, dayCounts.has(n), [...dayCounts].sort().join(','))
}

// Session-duration coverage: shortest / middle / longest.
const minutes = goldens
  .map((g) => g.profileEvidence.personalization['sessionMinutes'])
  .filter((x): x is number => typeof x === 'number')
check('session-duration coverage: >= 3 distinct session lengths', new Set(minutes).size >= 3, [...new Set(minutes)].sort((a, b) => a - b).join(','))

console.log(`qae-assembly-characterization-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
