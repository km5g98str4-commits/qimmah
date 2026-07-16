import { strict as assert } from 'node:assert'
import { connectHealthKit, refreshHealthKitStepsIfEnabled } from '@/lib/healthKit'
import { getSteps, getStepSource } from '@/lib/stepCounter'
import { shouldPlayHaptic } from '@/lib/nativeFeedback'

const authorizedPlugin = {
  async isAvailable() { return { available: true } },
  async requestAuthorization() { return { permission: 'authorized' as const } },
  async getDailySteps(options: { days: number }) {
    assert.equal(options.days, 14)
    return { permission: 'authorized' as const, days: [{ date: '2026-07-16', steps: 8123 }] }
  },
}

const connected = await connectHealthKit(authorizedPlugin, true)
assert.equal(connected.permission, 'authorized')
assert.equal(getSteps('2026-07-16'), 8123)
assert.equal(getStepSource('2026-07-16'), 'healthkit')

const denied = await connectHealthKit({
  ...authorizedPlugin,
  async requestAuthorization() { return { permission: 'denied' as const } },
}, true)
assert.equal(denied.permission, 'denied')
assert.equal((await connectHealthKit(authorizedPlugin, false)).permission, 'unavailable')

let requested = 0
const refreshOnly = {
  ...authorizedPlugin,
  async requestAuthorization() { requested += 1; return { permission: 'authorized' as const } },
}
await refreshHealthKitStepsIfEnabled(refreshOnly, true)
assert.equal(requested, 0, 'startup refresh must never request HealthKit authorization')

assert.equal(shouldPlayHaptic(false, true, false), false, 'web haptics are a no-op')
assert.equal(shouldPlayHaptic(true, false, false), false, 'settings toggle disables haptics')
assert.equal(shouldPlayHaptic(true, true, true), false, 'Reduce Motion disables haptics')
assert.equal(shouldPlayHaptic(true, true, false), true)
console.log('✅ native bridge proof: permissions, HealthKit store wiring, startup no-request, web haptics no-op')
