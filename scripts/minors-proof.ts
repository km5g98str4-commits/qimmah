// إثبات وحدة لقاعدة «القاصرون → المحافظة فقط» (Option B، قرار المالك).
// يُشغَّل عبر esbuild فوق localStorage مُحاكى (بلا متصفح) — انظر run-minors-proof.mjs.
// يغطّي: حجب الوصفة الرقمية للأعمار 12/15/17، حدّ 18، تماسك حالة التعطيل،
// هجرة حساب قاصر حالي (ذهابًا وإيابًا/idempotent)، وعزل ختم الهجرة بين مستخدمَين.

import {
  ADULT_MIN_AGE,
  computeTargets,
  defaultProfile,
  effectiveGoalTypeForAge,
  isMinorAge,
  MINOR_GOAL_RESTRICTION_NOTE,
  MINOR_PLAN_NOTE,
} from '@/lib/calculators'
import {
  getDefaultCustomization,
  loadCustomization,
  saveCustomization,
  STORAGE_KEY,
} from '@/lib/customization'
import { wipeUserData } from '@/lib/accountScope'
import type { Profile } from '@/types/profile'
import type { Customization } from '@/lib/customization'

let pass = 0
let fail = 0
const check = (label: string, cond: boolean): void => {
  if (cond) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail++
    console.log(`  ✗ FAIL: ${label}`)
  }
}
const eq = (label: string, a: unknown, b: unknown) => check(`${label} (=${String(a)})`, Object.is(a, b))
const ls = globalThis.localStorage

const minorProfile = (over: Partial<Profile>): Profile => ({
  ...defaultProfile,
  gender: 'male',
  heightCm: 165,
  weightKg: 60,
  targetWeightKg: 52, // 8كغ تحت الوزن — مسار تنشيف/تضخيم «سيتفاعل» معه لو لم يُقيَّد
  activityLevel: 'moderate',
  trainingDays: 4,
  ...over,
})

// ── (1) الأعمار 12/15/17: مخرجات محافظة فقط، والعجز مستحيل ─────────────────
console.log('\n(1) MINORS 12/15/17 — NUMERIC PRESCRIPTION SUPPRESSED')
for (const age of [12, 15, 17]) {
  for (const goalType of ['cutting', 'bulking', 'maintenance'] as const) {
    const goal = goalType === 'cutting' ? 'cut' : goalType === 'bulking' ? 'bulk' : 'maintain'
    const t = computeTargets(minorProfile({ age, goalType, goal }))
    eq(`age ${age} ${goalType}: explicit policy`, t.numericNutritionStatus, 'suppressed-under18')
    check(`age ${age} ${goalType}: all adult-derived nutrition/BMI numbers are zero`, [
      t.bmi, t.bmr, t.tdee, t.maintenanceCalories, t.cuttingCalories, t.bulkingCalories,
      t.targetCalories, t.proteinGrams, t.fatGrams, t.carbsGrams, t.waterLiters,
    ].every((value) => value === 0))
    eq(`age ${age} ${goalType}: no weekly weight change`, t.weeklyWeightChangeKg, 0)
    eq(`age ${age} ${goalType}: no ETA weeks`, t.estimatedWeeksToGoal, 0)
    check(`age ${age} ${goalType}: keeps «تقديري» specialist note`, t.notes.includes(MINOR_PLAN_NOTE))
  }
}

// ── (2) حدّ 18: كامل الأهداف يعود، والعجز يُطبَّق ──────────────────────────
console.log('\n(2) AGE-18 BOUNDARY — FULL GOALS RESTORED')
{
  const cut = computeTargets(minorProfile({ age: ADULT_MIN_AGE, goalType: 'cutting', goal: 'cut' }))
  check('age 18 cutting: target < maintenance (deficit applied)', cut.targetCalories < cut.maintenanceCalories)
  eq('age 18 cutting: target == cuttingCalories', cut.targetCalories, cut.cuttingCalories)
  check('age 18 cutting: weight-change forecast present', cut.weeklyWeightChangeKg < 0)
  const bulk = computeTargets(minorProfile({ age: ADULT_MIN_AGE, goalType: 'bulking', goal: 'bulk' }))
  check('age 18 bulking: target > maintenance (surplus applied)', bulk.targetCalories > bulk.maintenanceCalories)
}

// ── (3) تماسك حالة التعطيل والنسخة الصادقة (يقود aria-disabled/aria-describedby) ──
console.log('\n(3) DISABLED-GOAL STATE + HONEST COPY')
eq('isMinorAge(12)', isMinorAge(12), true)
eq('isMinorAge(17)', isMinorAge(17), true)
eq('isMinorAge(18)', isMinorAge(18), false)
eq('isMinorAge(0) — unset age not restricted', isMinorAge(0), false)
eq("effectiveGoalTypeForAge('cutting',15) == maintenance", effectiveGoalTypeForAge('cutting', 15), 'maintenance')
eq("effectiveGoalTypeForAge('bulking',15) == maintenance", effectiveGoalTypeForAge('bulking', 15), 'maintenance')
eq("effectiveGoalTypeForAge('cutting',18) preserved", effectiveGoalTypeForAge('cutting', 18), 'cutting')
check('restriction note mentions «18»', MINOR_GOAL_RESTRICTION_NOTE.includes('18'))
check('restriction note recommends a specialist («مختص»)', MINOR_GOAL_RESTRICTION_NOTE.includes('مختص'))

// ── (4) هجرة حساب قاصر حالي: تنشيف/تضخيم → محافظة، مع ختم، ذهابًا وإيابًا و idempotent ─
console.log('\n(4) EXISTING-MINOR MIGRATION — ROUND-TRIP + IDEMPOTENT')
function seedStoredMinor(goalType: 'cutting' | 'bulking'): void {
  ls.clear()
  const c = getDefaultCustomization()
  const stored: Customization = {
    ...c,
    profile: { ...c.profile, age: 15, goalType, goal: goalType === 'cutting' ? 'cut' : 'bulk' },
    // بصمة قديمة متعمَّدة حتى نتحقّق من إعادة الحساب بعد الهجرة
    targetsMeta: { manuallyEdited: false, lastCalculatedFromProfileHash: 'stale-hash' },
  }
  saveCustomization(stored)
}

seedStoredMinor('cutting')
const migrated = loadCustomization()
eq('migrated goalType == maintenance', migrated.profile.goalType, 'maintenance')
eq('migrated goal == maintain', migrated.profile.goal, 'maintain')
check('migration stamp set', typeof migrated.targetsMeta.minorGoalMigratedAt === 'string')
eq('migrated targets policy == suppressed-under18', migrated.targets.numericNutritionStatus, 'suppressed-under18')
eq('migrated targets contain no numeric prescription', migrated.targets.targetCalories, 0)
check('one-time notice not yet dismissed', migrated.targetsMeta.minorGoalNoticeDismissed !== true)

// ذهابًا وإيابًا: حفظ ثم تحميل ثانية — idempotent (لا يتغيّر الهدف ولا يُستبدل الختم)
const stamp1 = migrated.targetsMeta.minorGoalMigratedAt
saveCustomization(migrated)
const again = loadCustomization()
eq('round-trip still maintenance', again.profile.goalType, 'maintenance')
eq('round-trip stamp unchanged (idempotent)', again.targetsMeta.minorGoalMigratedAt, stamp1)

seedStoredMinor('bulking')
eq('bulking minor also migrates to maintenance', loadCustomization().profile.goalType, 'maintenance')

// أدلّة عدم-التراجع: بالغ (25) بتنشيف لا يُهاجَر
ls.clear()
{
  const c = getDefaultCustomization()
  saveCustomization({ ...c, profile: { ...c.profile, age: 25, goalType: 'cutting', goal: 'cut' } })
  const adult = loadCustomization()
  eq('adult 25 cutting: NOT migrated', adult.profile.goalType, 'cutting')
  check('adult 25: no migration stamp', adult.targetsMeta.minorGoalMigratedAt === undefined)
}

// ── (5) عزل مستخدمَين على ختم الهجرة (يعيش داخل تخزين يُمسح عند التبديل) ──────
console.log('\n(5) TWO-USER ISOLATION ON THE MIGRATION FLAG')
ls.clear()
// المستخدم A: قاصر يُهاجَر → ختم مضبوط
saveCustomization({
  ...getDefaultCustomization(),
  profile: { ...getDefaultCustomization().profile, age: 15, goalType: 'cutting', goal: 'cut' },
})
const a = loadCustomization()
check('user A: migration stamp present', typeof a.targetsMeta.minorGoalMigratedAt === 'string')
check('user A: customization key exists', ls.getItem(STORAGE_KEY) !== null)
// تبديل حساب: wipeUserData يمسح مفاتيح المستخدم (التخصيص ليس في قائمة السماح العامّة)
wipeUserData()
check('after switch: customization key wiped', ls.getItem(STORAGE_KEY) === null)
// المستخدم B: يبدأ نظيفًا — لا ختم هجرة مُسرَّب من A
const b = loadCustomization()
check('user B: no leaked migration stamp', b.targetsMeta.minorGoalMigratedAt === undefined)
eq('user B: default adult goal intact', b.profile.goalType, defaultProfile.goalType)

// ── النتيجة ────────────────────────────────────────────────────────────────
console.log(`\nMinors proof: ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
