import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { inspectOfflineHarnessEnv } from './lib/offline-harness-guard.mjs'

let pass = 0
let fail = 0
const check = (label, ok) => {
  if (ok) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.error(`  ✗ FAIL: ${label}`) }
}
const PROD = 'ledlypcyrtnzvjvhykwz'
const STAGE = 'odpkvswfiihrkglgfghd'

console.log('\n① fail-closed target matrix')
check('missing explicit environment is refused', inspectOfflineHarnessEnv({}).code === 'safe_environment_required')
check('local disconnected target is allowed', inspectOfflineHarnessEnv({ QIMMAH_OFFLINE_TARGET_ENV: 'local' }).ok)
check('local with any remote URL is refused', !inspectOfflineHarnessEnv({ QIMMAH_OFFLINE_TARGET_ENV: 'local', VITE_SUPABASE_URL: `https://${STAGE}.supabase.co` }).ok)
check('allowlisted staging is allowed', inspectOfflineHarnessEnv({ QIMMAH_OFFLINE_TARGET_ENV: 'staging', VITE_SUPABASE_URL: `https://${STAGE}.supabase.co` }).ok)
check('unknown staging ref is refused', inspectOfflineHarnessEnv({ QIMMAH_OFFLINE_TARGET_ENV: 'staging', VITE_SUPABASE_URL: 'https://unknown-ref.supabase.co' }).code === 'staging_ref_not_allowlisted')
check('production URL is refused by name', inspectOfflineHarnessEnv({ QIMMAH_OFFLINE_TARGET_ENV: 'staging', VITE_SUPABASE_URL: `https://${PROD}.supabase.co` }).code === 'production_ref_denied')
check('production ref hidden in another env variable is still refused', inspectOfflineHarnessEnv({ QIMMAH_OFFLINE_TARGET_ENV: 'local', SOME_REF: PROD }).code === 'production_ref_denied')

console.log('\n② refusal precedes browser/build/network surface')
const script = resolve(import.meta.dirname, 'offline-session-e2e.mjs')
const denied = spawnSync(process.execPath, [script, '--guard-only'], {
  encoding: 'utf8',
  env: { QIMMAH_OFFLINE_TARGET_ENV: 'staging', VITE_SUPABASE_URL: `https://${PROD}.supabase.co` },
})
check('real harness exits non-zero on production ref', denied.status !== 0)
check('real harness names the refusal', /OFFLINE_HARNESS_REFUSED:production_ref_denied/.test(denied.stderr))
check('refusal produces no browser/build/server progress', !/بناء flagless|chromium|preview did not start|OFFLINE_HARNESS_GUARD_OK/.test(`${denied.stdout}${denied.stderr}`))

const accepted = spawnSync(process.execPath, [script, '--guard-only'], {
  encoding: 'utf8',
  env: { QIMMAH_OFFLINE_TARGET_ENV: 'local' },
})
check('explicit local guard-only path succeeds', accepted.status === 0 && /OFFLINE_HARNESS_GUARD_OK:local/.test(accepted.stdout))

const source = readFileSync(script, 'utf8')
check('guard executes before Playwright dynamic import', source.indexOf('assertOfflineHarnessEnv(process.env)') < source.indexOf("await import('./e2e/lib/engine.mjs')"))
check('live active-workout key is used', source.includes("localStorage.getItem('qimmah:activeWorkout:v1')") && !source.includes("startsWith('qimmah:active-workout:v2')"))
check('401 is never allowlisted as expected success', !/EXPECTED_MOCK_SESSION_401|401 متوقّع/.test(source))

// Anti-bypass: removing the production list must make the planted production
// target pass the guard, proving the negative test is meaningful.
const productionBlind = (env) => inspectOfflineHarnessEnv(Object.fromEntries(Object.entries(env).filter(([key]) => key !== 'SOME_REF')))
check('anti-bypass simulation distinguishes a hidden production ref', productionBlind({ QIMMAH_OFFLINE_TARGET_ENV: 'local', SOME_REF: PROD }).ok)

console.log(`\n${'─'.repeat(46)}`)
if (fail) { console.error(`❌ offline harness guard failed: ${fail}/${pass + fail}`); process.exit(1) }
console.log(`✅ offline harness guard passed: ${pass}/${pass + fail}`)
