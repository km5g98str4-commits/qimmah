import { strict as assert } from 'node:assert'
import {
  remindersDue,
  addTodayWaterMl,
  getTodayWaterMl,
  loadHydrationPref,
  saveHydrationPref,
  DEFAULT_HYDRATION_PREF,
} from '@/lib/workoutHydration'
import { getWaterLogs } from '@/lib/historyStore'
import { buildNutritionV2Model } from '@/lib/nutritionV2Model'
import { getDefaultCustomization } from '@/lib/customization'
import { getDayStamp } from '@/lib/today'

// [QIM-WEB-FOUNDER-UX-003/حزمة ٢] هذا الإثبات يمارس **كتّاب حالة مدفوعة**
// (تسجيل الماء عبر addTodayWaterMl → addWaterToDay). بعد بوّابة الوصول صار
// الافتراض منعًا، فيلزم أن يعلن الإثبات شخصيته: مستخدم مُفعَّل. ليس إضعافًا —
// موضوع الإثبات سلوك الترطيب لا الاستحقاق، والبوّابة يحرسها test:access-gate
// و test:e2e:preview-gate بشخصيتَي معاينة ومُفعَّل.
import { setEntitlement } from '@/lib/access/entitlementStore'
setEntitlement({ status: 'active', source: 'mock' })

const MIN = 60_000
const start = 1_700_000_000_000

// ── Reminder cadence is derived from real elapsed time, at the user's interval ──
assert.equal(remindersDue(start, start, 20), 0, 'no nag at session start')
assert.equal(remindersDue(start, start + 19 * MIN, 20), 0, 'not due before one interval')
assert.equal(remindersDue(start, start + 20 * MIN, 20), 1, 'first reminder at the interval')
assert.equal(remindersDue(start, start + 45 * MIN, 20), 2, 'two due by 45 min at 20-min cadence')
assert.equal(remindersDue(start, start + 45 * MIN, 30), 1, 'custom 30-min cadence respected')
assert.equal(remindersDue(start, start - 10 * MIN, 20), 0, 'clock skew never yields negative')

// ── Logging writes the ONE canonical water source the Nutrition screen reads ──
const today = getDayStamp()
const custom = getDefaultCustomization()
assert.equal(getTodayWaterMl(), 0, 'starts dry')

const afterFirst = addTodayWaterMl(250)
assert.equal(afterFirst, 250)
assert.equal(getTodayWaterMl(), 250)
// The Nutrition screen model reads the SAME number (single source of truth).
assert.equal(buildNutritionV2Model(custom, 'ar').water.consumedMl, 250, 'Nutrition screen sees the in-workout water — one source')
// …and the history water-log mirror stays consistent.
assert.equal(getWaterLogs()[today]?.waterMl, 250, 'water log mirrors the same total')

addTodayWaterMl(500)
assert.equal(getTodayWaterMl(), 750, 'accumulates')

// Undo reverts exactly the last amount.
addTodayWaterMl(-500)
assert.equal(getTodayWaterMl(), 250, 'undo reverts the last add')
addTodayWaterMl(-9999)
assert.equal(getTodayWaterMl(), 0, 'never goes negative')

// ── User controls cadence/amount and can disable entirely; values clamp ──
assert.deepEqual(loadHydrationPref(), DEFAULT_HYDRATION_PREF, 'sane defaults (on · 20 min · 250 ml)')
const off = saveHydrationPref({ enabled: false, intervalMin: 30, amountMl: 500 })
assert.equal(off.enabled, false, 'reminders can be turned off')
assert.equal(loadHydrationPref().enabled, false, 'disable persists')
const clamped = saveHydrationPref({ enabled: true, intervalMin: 1, amountMl: 999_999 })
assert.equal(clamped.intervalMin, 5, 'interval clamps to a sane floor')
assert.equal(clamped.amountMl, 2000, 'amount clamps to a sane ceiling')

console.log('✅ workout hydration proof: cadence from real time, ONE canonical water source shared with Nutrition (+undo), user-controlled cadence/amount, disable')
