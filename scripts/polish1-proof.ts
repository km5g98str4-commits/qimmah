import { strict as assert } from 'node:assert'
import { equipmentLabel } from '@/lib/exerciseLabels'
import { muscleLabel } from '@/lib/muscles'
import { V2_TAB_LABELS } from '@/design-system/v2/labels'
import { profileChoiceStrings } from '@/i18n/dict/profileChoices'

// ── Equipment labels follow language (display-layer, reused library dict) ──
assert.equal(equipmentLabel('barbell', 'ar'), 'بار')
assert.equal(equipmentLabel('barbell', 'en'), 'Barbell')
assert.equal(equipmentLabel('machine', 'ar'), 'جهاز')
assert.equal(equipmentLabel('bodyweight', 'en'), 'Bodyweight')
assert.equal(equipmentLabel('unknown-xyz', 'en'), 'unknown-xyz', 'unknown id falls back to itself, no crash')

// ── Muscle labels follow language ──
assert.equal(muscleLabel('chest', 'ar'), 'الصدر')
assert.equal(muscleLabel('chest', 'en'), 'Chest')

// ── Bottom-tab labels follow language from the central V2_TAB_LABELS dict ──
assert.equal(V2_TAB_LABELS.today.ar, 'اليوم')
assert.equal(V2_TAB_LABELS.workout.ar, 'التمارين')
assert.equal(V2_TAB_LABELS.log.ar, 'تسجيل')
assert.equal(V2_TAB_LABELS.nutrition.ar, 'التغذية')
assert.equal(V2_TAB_LABELS.progress.ar, 'التقدّم')
assert.equal(V2_TAB_LABELS.today.en, 'Today')
assert.equal(V2_TAB_LABELS.workout.en, 'Workout')
assert.equal(V2_TAB_LABELS.log.en, 'Log')
assert.equal(V2_TAB_LABELS.nutrition.en, 'Nutrition')
assert.equal(V2_TAB_LABELS.progress.en, 'Progress')

// No Arabic characters anywhere in the English tab set (leak guard).
const arabic = /[؀-ۿ]/
for (const [k, v] of Object.entries(V2_TAB_LABELS)) {
  assert.ok(!arabic.test(v.en), `EN tab "${k}" must not contain Arabic: "${v.en}"`)
}

// Advanced plan/profile editors use the same complete bilingual choice source.
const englishChoices = profileChoiceStrings.en
for (const [group, values] of Object.entries(englishChoices)) {
  if (typeof values === 'function' || typeof values === 'string') continue
  for (const [key, value] of Object.entries(values)) {
    assert.ok(!arabic.test(value), `EN profile choice "${group}.${key}" must not contain Arabic: "${value}"`)
  }
}
assert.ok(!arabic.test(englishChoices.generatedPlanReason('Full Body', 'Maintenance', 'Beginner', 3, false)))

console.log('✅ polish-1 proof: equipment/muscle/tab labels follow language, no EN Arabic leak')
