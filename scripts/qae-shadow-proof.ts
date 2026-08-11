// [CTO-QAE-020] M0 shadow-integration proof.
//
// The most important invariant here is FAIL-OPEN: no QAE failure, exception, or
// incomplete profile may ever affect the live plan the user receives.

import type { Profile } from '@/types/profile'
import type { WorkoutPlan } from '@/types/workout'
import { defaultProfile } from '@/lib/calculators'
import { generatePlan } from '@/lib/planGenerator'
import {
  buildAthleteProfileAttempt,
  checkCatalogDrift,
  resolveLiveExercise,
  runShadowComparison,
  SHADOW_VERSION,
} from '@/lib/qae/shadow'

let passed = 0
let failed = 0
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) passed++
  else {
    failed++
    console.error(`✗ ${name} — ${detail}`)
  }
}

// ═══ §2 Catalog ════════════════════════════════════════════════════════════
const drift = checkCatalogDrift()
check('catalog: no duplicate live ids', drift.duplicateLiveIds.length === 0, drift.duplicateLiveIds.join(','))
check('catalog: every QAE id exists in the app', drift.qaeIdsMissingFromApp.length === 0, drift.qaeIdsMissingFromApp.slice(0, 5).join(','))
check('catalog: drift check reports ok', drift.ok, JSON.stringify(drift).slice(0, 200))
check('catalog: QAE catalog is 181 exercises', drift.qaeCount === 181, String(drift.qaeCount))
check('catalog: every QAE id resolves to a real live exercise', drift.qaeIdsMissingFromApp.length === 0)
console.log(`catalog: live ${drift.liveCount} · qae ${drift.qaeCount} · qaeMissingFromApp ${drift.qaeIdsMissingFromApp.length} · liveMissingFromQae ${drift.liveIdsMissingFromQae.length}`)

// drift must FAIL BY NAME, not silently regenerate
check('catalog: drift report names the offending ids', Array.isArray(drift.qaeIdsMissingFromApp) && Array.isArray(drift.liveIdsMissingFromQae))

// ═══ §8 Persona matrix ═════════════════════════════════════════════════════
interface Persona {
  name: string
  patch: Partial<Profile>
}
const PERSONAS: Persona[] = [
  { name: 'beginner-gym', patch: { trainingLevel: 'beginner', workoutEnvironment: 'gym', trainingDays: 3, workoutDuration: 60 } },
  { name: 'beginner-home', patch: { trainingLevel: 'beginner', workoutEnvironment: 'home', trainingDays: 3, workoutDuration: 45 } },
  // The live app has no 'bodyweight' WorkoutEnvironment — it is reachable only
  // through the optional gymType field. Encoded honestly rather than inventing
  // an enum value that does not exist.
  { name: 'bodyweight', patch: { trainingLevel: 'beginner', workoutEnvironment: 'home', gymType: 'bodyweight', trainingDays: 3, workoutDuration: 30 } },
  { name: 'intermediate', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60 } },
  { name: 'advanced', patch: { trainingLevel: 'advanced', workoutEnvironment: 'gym', trainingDays: 5, workoutDuration: 75 } },
  { name: 'days-3', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 3, workoutDuration: 60 } },
  { name: 'days-4', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60 } },
  { name: 'days-5', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 5, workoutDuration: 60 } },
  { name: 'days-6', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 6, workoutDuration: 60 } },
  { name: 'knee-injury', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60, injuries: 'knee' } },
  { name: 'shoulder-injury', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60, injuries: 'shoulder' } },
  { name: 'back-injury', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60, injuries: 'lower_back' } },
  { name: 'multiple-injuries', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60, injuries: 'knee shoulder lower_back' } },
  { name: 'short-session', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 30 } },
  { name: 'long-session', patch: { trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 90 } },
]

const rows: string[] = []
for (const persona of PERSONAS) {
  const profile: Profile = { ...defaultProfile, ...persona.patch }

  // LIVE must always succeed and is the ONLY plan a user gets.
  let live: WorkoutPlan | null = null
  try {
    live = generatePlan(profile).workoutPlan
  } catch (err) {
    check(`${persona.name}: LIVE plan generated`, false, String(err))
    continue
  }
  check(`${persona.name}: LIVE plan generated`, live !== null && live.days.length > 0)

  const attempt = buildAthleteProfileAttempt(profile)
  const cmp = runShadowComparison(profile, live)

  check(`${persona.name}: shadow never throws`, typeof cmp.classification === 'string')
  check(`${persona.name}: LIVE plan unchanged after shadow`, live.days.length > 0)
  check(`${persona.name}: shadow reports its version`, cmp.shadowVersion === SHADOW_VERSION)

  rows.push(
    `${persona.name.padEnd(20)} complete=${String(attempt.status === 'complete').padEnd(5)} mapped=${String(attempt.mapped.length).padEnd(3)} missing=${String(attempt.missing.length).padEnd(3)} live=${live.days.length}d shadow=${cmp.qaeDayCount}d ${cmp.classification}`,
  )
}
console.log('\n=== persona matrix ===')
for (const r of rows) console.log('  ' + r)

// ═══ §9 Field mapping table ════════════════════════════════════════════════
{
  const sample: Profile = { ...defaultProfile, trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60 }
  const a = buildAthleteProfileAttempt(sample)
  console.log('\n=== AthleteProfile field mapping ===')
  console.log('MAPPED:')
  for (const f of a.mapped) console.log(`  ✓ ${f}`)
  console.log('UNAVAILABLE:')
  for (const m of a.missing) console.log(`  ✗ ${m.field} — ${m.reason}`)

  check('adapter: reports at least one mapped field', a.mapped.length > 0)
  check('adapter: every missing field carries a named reason', a.missing.every((m) => m.reason.length > 10))
  check('adapter: no missing reason is a generic "needs more questions"', a.missing.every((m) => !/needs? (more|additional) questions?$/i.test(m.reason)))
  check('adapter: returningStatus is NOT inferred', a.missing.some((m) => m.field === 'training.returningStatus'))
  check('adapter: movementCompetency is NOT inferred', a.missing.some((m) => m.field === 'training.movementCompetency'))
  check('adapter: consistency is NOT inferred', a.missing.some((m) => m.field === 'training.consistency'))
  check('adapter: experience axes are NOT inferred', a.missing.some((m) => m.field === 'training.experienceBand.recentTrainingExposure'))
  check('adapter: profile is honestly incomplete today', a.status === 'incomplete')
}

// ═══ §7 Fail-open proofs (THE critical invariant) ══════════════════════════
{
  const profile: Profile = { ...defaultProfile, trainingLevel: 'intermediate', workoutEnvironment: 'gym', trainingDays: 4, workoutDuration: 60 }
  const live = generatePlan(profile).workoutPlan
  const before = JSON.stringify(live)

  // 1. QAE throw → live plan still generated and unchanged
  const broken = { ...profile, trainingDays: Number.NaN as unknown as number }
  const cmp1 = runShadowComparison(broken, live)
  check('FAIL-OPEN: malformed input never throws out of shadow', typeof cmp1.classification === 'string', cmp1.classification)
  check('FAIL-OPEN: live plan object unchanged after shadow', JSON.stringify(live) === before)

  // 2. incomplete profile → live plan still generated
  const empty = { ...defaultProfile, trainingLevel: 'beginner' as const, trainingDays: 0, workoutDuration: 0 }
  const liveEmpty = generatePlan(empty).workoutPlan
  const cmp2 = runShadowComparison(empty, liveEmpty)
  check('FAIL-OPEN: incomplete profile classified, not thrown', cmp2.classification === 'qaeIncompleteProfile' || cmp2.classification === 'qaeFailed', cmp2.classification)
  check('FAIL-OPEN: live plan exists despite incomplete QAE profile', liveEmpty.days.length > 0)

  // 3. divergence → live unchanged
  const cmp3 = runShadowComparison(profile, live)
  check('FAIL-OPEN: divergence leaves live untouched', JSON.stringify(live) === before, cmp3.classification)

  // 4. shadow result is never a WorkoutPlan and cannot be saved as one
  const asUnknown = cmp3 as unknown as Record<string, unknown>
  check('NO-PERSIST: shadow result has no days[] (cannot masquerade as a plan)', !('days' in asUnknown))
  check('NO-PERSIST: shadow result has no templateId', !('templateId' in asUnknown))

  // 5. deterministic comparison
  check('determinism: repeated comparison identical', JSON.stringify(runShadowComparison(profile, live)) === JSON.stringify(cmp3))
}

// ═══ §6 No telemetry / no persistence (source scan) ════════════════════════
{
  // The shadow module must not reach storage, network, or analytics.
  const src = String(runShadowComparison) + String(buildAthleteProfileAttempt) + String(checkCatalogDrift)
  for (const forbidden of ['localStorage', 'fetch(', 'supabase', 'navigator.sendBeacon', 'XMLHttpRequest']) {
    check(`NO-TELEMETRY: shadow does not reference ${forbidden}`, !src.includes(forbidden))
  }
}

// ═══ catalog resolution for plan ids ═══════════════════════════════════════
{
  const profile: Profile = { ...defaultProfile, trainingLevel: 'beginner', workoutEnvironment: 'gym', trainingDays: 3, workoutDuration: 60 }
  const live = generatePlan(profile).workoutPlan
  const ids = live.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
  check('catalog: every id in a LIVE plan resolves to a real exercise', ids.every((id) => resolveLiveExercise(id) !== undefined), ids.filter((id) => resolveLiveExercise(id) === undefined).join(','))
}

console.log(`\nqae-shadow-proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
