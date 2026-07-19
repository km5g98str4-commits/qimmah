// Recovery check-in — Qimmah Design Standard v3.0 (screens 37–39) honesty proof.
// Verifies the recommendation is derived ONLY from self-reported signals, every
// input is optional, no-signal → re-assess (never an invented number), and the
// log persists offline. Runs on a localStorage shim (no browser).

import {
  recommendRecovery, hasSignal, saveRecoveryEntry, loadRecoveryLog, todaysRecovery,
  type RecoveryInput,
} from '@/lib/recovery'

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${label}`) }
  else { failed++; console.log(`  ✗ ${label}`) }
}

// ── every input is optional → no signal asks to re-assess (no invented value) ──
check('empty input has no signal', hasSignal({}) === false)
check('empty input → reassess (never fabricates)', recommendRecovery({}) === 'reassess')
check('effort 0 counts as unset', hasSignal({ effort: 0 }) === false)
check('any single field is enough signal', hasSignal({ sleep: 'good' }) === true)

// ── recommendation derives from self-report only ──
check('severe soreness → rest (protective)', recommendRecovery({ soreness: 'severe' }) === 'rest')
check('poor sleep + low energy + moderate soreness → rest', recommendRecovery({ sleep: 'poor', energy: 'low', soreness: 'moderate' }) === 'rest')
check('mild soreness + ok sleep → light', recommendRecovery({ soreness: 'mild', sleep: 'ok', energy: 'ok' }) === 'light')
check('all-good signals → full session', recommendRecovery({ sleep: 'good', energy: 'high', soreness: 'none' }) === 'full')
check('very hard last session nudges toward rest', recommendRecovery({ effort: 9, sleep: 'poor', energy: 'low' }) === 'rest')

// ── supplements can NOT influence the recommendation (self-report only) ──
// The function's type accepts only self-report fields; passing extras is inert.
const withExtras = { sleep: 'good', energy: 'high', soreness: 'none', supplementsTaken: 5 } as unknown as RecoveryInput
check('extra (non-self-report) fields do not change the result', recommendRecovery(withExtras) === 'full')

// ── offline log persists + replaces same-day entry ──
const uid = 'user-r'
saveRecoveryEntry(uid, { soreness: 'severe' })
check('entry saved to the offline log', loadRecoveryLog(uid).length === 1)
check("today's entry is retrievable", todaysRecovery(uid)?.rec === 'rest')
const second = saveRecoveryEntry(uid, { sleep: 'good', energy: 'high', soreness: 'none' })
check('same-day re-check replaces (no duplicate day)', loadRecoveryLog(uid).length === 1)
check('the saved entry carries its own recommendation', second.rec === 'full')
check('log is owner-scoped (other owner is empty)', loadRecoveryLog('other').length === 0)

console.log(`\nRecovery proof: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
