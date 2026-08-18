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
import { NATIVE_SETTINGS_COPY } from '@/data/nativeSettings'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SRC = resolve(process.cwd(), 'src')

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

// ══ [SOVEREIGN-003] لوحة الصحّة على الويب: لا نداء مستحيل ولا نجاح مكذوب ══
//
// عطلان من صنف واحد في `NativeSettingsPanel` (تُركَّب على الويب عبر `ProfileV2`):
//   ١) زرّ «اربط Apple Health» يُعرض على الويب، و`connectHealthKit` يردّ
//      `unavailable` دائمًا خارج iOS — نداءٌ لا ينجح مهما ضُغط.
//   ٢) `saveManualSteps` كان يعلن «انحفظت خطواتك» من مخرَج `setSteps`، وهو
//      يعيد القيمة المطلوبة لا نتيجة الكتابة — فيكذب على قرص مرفوض.
{
  const panel = readFileSync(resolve(SRC, 'components/NativeSettingsPanel.tsx'), 'utf8')

  // النداء المستحيل محجوب خلف المنصّة، والبديل الصادق معروض.
  assert.match(panel, /healthNative \? \(/, 'connect affordance must be gated on the platform')
  assert.match(panel, /copy\.healthNativeOnly/, 'web must state where Health sync actually works')
  assert.equal(NATIVE_SETTINGS_COPY.ar.healthNativeOnly.length > 0, true)
  assert.equal(NATIVE_SETTINGS_COPY.en.healthNativeOnly.length > 0, true)

  // ⚔️ تأكيد مضادّ: نزع البوّابة يُكتشف باسمه، لا بمرور صامت.
  const ungated = panel.replace('healthNative ? (', 'true ? (')
  assert.equal(/healthNative \? \(/.test(ungated), false,
    'the counter-simulation must actually remove the gate, otherwise it proves nothing')

  // النجاح مشروط بقراءة بعد الكتابة — لا بمخرَج الكاتب.
  assert.match(panel, /const persisted = getSteps\(\)/, 'manual save must read back')
  assert.match(panel, /ok \? copy\.manualStepsSaved : copy\.manualStepsFailed/,
    'manual save must be able to announce failure')

  // والآلية نفسها تُقاس سلوكيًّا: قرص مرفوض ⇒ القراءة لا تطابق المطلوب.
  const before = getSteps()
  const realSetItem = globalThis.localStorage.setItem
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError') }
  const requested = setSteps(before + 4321, undefined, 'manual')
  globalThis.localStorage.setItem = realSetItem
  assert.notEqual(getSteps(), requested,
    'a rejected write must NOT read back as the requested value — otherwise the honest message is unreachable')
  assert.equal(getSteps(), before, 'and the previous number must survive the rejected write')
}

console.log('✅ native bridge proof: per-metric permissions (steps/weight/HR), on-demand only, manual fallback, imported-weight labeling, HR honesty, haptics, web-health honesty')
