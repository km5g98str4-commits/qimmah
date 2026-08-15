import { strict as assert } from 'node:assert'
import {
  connectHealthKit,
  connectHealthWeight,
  disconnectHealthWeight,
  readHeartRate,
  refreshHealthKitStepsIfEnabled,
  metricState,
} from '@/lib/healthKit'
import { getSteps, getStepSource, setSteps } from '@/lib/stepCounter'
import { latestWeightImport, loadLogs } from '@/lib/measurementLog'
import { shouldPlayHaptic } from '@/lib/nativeFeedback'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تمرين/تغذية/قياسات). بعد بوّابة الوصول صار الافتراض منعًا، فيلزم أن يعلن
// الإثبات شخصيته: مستخدم مُفعَّل. هذا **ليس إضعافًا للبوّابة** — موضوع الإثبات
// سلوك التخزين لا الاستحقاق، وحارس الاستحقاق نفسه يحرسه `test:access-gate`
// و`test:e2e:preview-gate` بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })


const authorizedPlugin = {
  async isAvailable() { return { available: true } },
  async requestAuthorization() { return { permission: 'authorized' as const } },
  async getDailySteps(options: { days: number }) {
    assert.equal(options.days, 14)
    return { permission: 'authorized' as const, days: [{ date: '2026-07-16', steps: 8123 }] }
  },
  async getLatestBodyMass() { return { permission: 'authorized' as const, sample: { kg: 81.4, date: '2026-07-19T07:30:00Z' } } },
  async getLatestHeartRate() { return { permission: 'authorized' as const, sample: null } },
}

// ── Steps: connect + honest store wiring ──────────────────────────────────
const connected = await connectHealthKit(authorizedPlugin, true)
assert.equal(connected.permission, 'authorized')
assert.equal(getSteps('2026-07-16'), 8123)
assert.equal(getStepSource('2026-07-16'), 'healthkit')
assert.ok(metricState('steps').lastUpdate, 'steps lastUpdate is recorded on connect')

const denied = await connectHealthKit({
  ...authorizedPlugin,
  async requestAuthorization() { return { permission: 'denied' as const } },
}, true)
assert.equal(denied.permission, 'denied')
assert.equal((await connectHealthKit(authorizedPlugin, false)).permission, 'unavailable')

// ── On-demand only: startup refresh must never request authorization ──────
let requested = 0
const refreshOnly = {
  ...authorizedPlugin,
  async requestAuthorization() { requested += 1; return { permission: 'authorized' as const } },
}
await refreshHealthKitStepsIfEnabled(refreshOnly, true)
assert.equal(requested, 0, 'startup refresh must never request HealthKit authorization')

// ── Manual fallback survives a denied grant (no blocking) ─────────────────
setSteps(5000, '2026-07-18', 'manual')
assert.equal(getSteps('2026-07-18'), 5000)
assert.equal(getStepSource('2026-07-18'), 'manual', 'manual entry always works, even after denial')

// ── Weight import is optional and tagged as an imported (health) source ───
const weight = await connectHealthWeight(authorizedPlugin, true)
assert.equal(weight.permission, 'authorized')
assert.equal(weight.sample?.value, 81.4)
const imported = latestWeightImport()
assert.equal(imported?.source, 'health', 'imported weight is labeled source=health')
assert.equal(Number(imported?.values.weightKg), 81.4)

// Disconnect removes only the imported log, never manual measurements.
loadLogs() // touch store
disconnectHealthWeight()
assert.equal(latestWeightImport(), undefined, 'disconnect removes the imported weight log')
assert.equal(metricState('weight').enabled, false)

// Weight connect with no sample stays honest (no invented weight).
const weightNoData = await connectHealthWeight({
  ...authorizedPlugin,
  async getLatestBodyMass() { return { permission: 'authorized' as const, sample: null } },
}, true)
assert.equal(weightNoData.sample, null, 'no bodyMass reading → no imported weight')
assert.equal(latestWeightImport(), undefined)

// ── Heart rate: unavailable with no paired-device data, never fabricated ──
const hr = await readHeartRate(authorizedPlugin, true)
assert.equal(hr.sample, null, 'no HR sample → unavailable, not a fabricated number')
assert.equal(hr.lastUpdate, null)

const hrReal = await readHeartRate({
  ...authorizedPlugin,
  async getLatestHeartRate() { return { permission: 'authorized' as const, sample: { bpm: 62.7, date: '2026-07-19T08:00:00Z' } } },
}, true)
assert.equal(hrReal.sample?.value, 63, 'real HR sample is rounded and surfaced')

// ── Haptics gating (unchanged) ────────────────────────────────────────────
assert.equal(shouldPlayHaptic(false, true, false), false, 'web haptics are a no-op')
assert.equal(shouldPlayHaptic(true, false, false), false, 'settings toggle disables haptics')
assert.equal(shouldPlayHaptic(true, true, true), false, 'Reduce Motion disables haptics')
assert.equal(shouldPlayHaptic(true, true, false), true)

console.log('✅ native bridge proof: per-metric permissions (steps/weight/HR), on-demand only, manual fallback, imported-weight labeling, HR honesty, haptics')
