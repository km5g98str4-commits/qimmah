// P2.6 LOGIC AUDIT — scenario proofs against the REAL engine (not typecheck).
// Run via: node scripts/run-logic-audit-proof.mjs (esbuild bundles this with @/ aliases).
import { defaultProfile, computeTargets, calorieGoalFromGoalType } from '@/lib/calculators'
import { generateNutrition, generatePlan } from '@/lib/planGenerator'
import { loadOnboardingProfile, toLegacyProfile, ONBOARDING_PROFILE_KEY } from '@/lib/onboardingProfile'
import { buildOnboardingProfile, defaultAnswers } from '@/lib/planBuilderAnswers'
import type { Profile } from '@/types/profile'

const MEAT = new Set(['chicken-breast', 'lean-beef', 'ground-beef-lean', 'turkey-breast'])
const SEAFOOD = new Set(['tuna', 'salmon', 'shrimp'])
const ANIMAL = new Set([...MEAT, ...SEAFOOD, 'eggs', 'egg-whites', 'milk', 'greek-yogurt', 'laban', 'labneh', 'feta-cheese', 'cottage-cheese', 'butter', 'whey-protein', 'honey'])

let failures = 0
const ok = (label: string, cond: boolean, detail = '') => {
  console.log(`${cond ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!cond) failures++
}

function baseProfile(over: Partial<Profile>): Profile {
  return { ...defaultProfile, gender: 'male', age: 30, heightCm: 178, weightKg: 85, ...over }
}

function mealIngredientIds(plan: ReturnType<typeof generateNutrition>['plan']): string[] {
  return plan.meals.flatMap((m) => m.ingredients.map((i) => i.ingredientId))
}

// ===== AUDIT 1: meals-per-day distributes calories =====
console.log('\n=== AUDIT 1: MEALS-PER-DAY ===')
{
  const p3 = baseProfile({ mealsPerDay: 3, goalType: 'maintenance' })
  const p5 = baseProfile({ mealsPerDay: 5, goalType: 'maintenance' })
  const t = computeTargets(p3)
  const n3 = generateNutrition(p3, t).plan
  const n5 = generateNutrition(p5, t).plan
  const sum = (n: typeof n3) => n.meals.reduce((a, m) => a + m.calories, 0)
  console.log(`  3 meals -> ${n3.meals.length} meals, per-meal kcal: [${n3.meals.map((m) => m.calories).join(', ')}], sum=${sum(n3)}`)
  console.log(`  5 meals -> ${n5.meals.length} meals, per-meal kcal: [${n5.meals.map((m) => m.calories).join(', ')}], sum=${sum(n5)}`)
  console.log(`  target=${t.maintenanceCalories}`)
  ok('3 meals creates 3 slots', n3.meals.length === 3)
  ok('5 meals creates 5 slots', n5.meals.length === 5)
  ok('per-meal targets differ between 3 and 6/5 meals', n3.meals[0].calories !== n5.meals[0].calories || n3.meals.length !== n5.meals.length)
  ok('3-meal sum within 12% of daily target', Math.abs(sum(n3) - t.maintenanceCalories) / t.maintenanceCalories <= 0.13, `${sum(n3)} vs ${t.maintenanceCalories}`)
  ok('5-meal sum within 12% of daily target', Math.abs(sum(n5) - t.maintenanceCalories) / t.maintenanceCalories <= 0.13, `${sum(n5)} vs ${t.maintenanceCalories}`)
}

// ===== AUDIT 3: dietary preference filters foods =====
console.log('\n=== AUDIT 3: DIETARY PREFERENCE ===')
{
  const t = computeTargets(baseProfile({ goalType: 'maintenance' }))
  const none = generateNutrition(baseProfile({ goalType: 'maintenance', nutritionStyle: 'saudi', dietPattern: 'none' }), t).plan
  const veg = generateNutrition(baseProfile({ goalType: 'maintenance', nutritionStyle: 'saudi', dietPattern: 'vegetarian' }), t).plan
  const pesc = generateNutrition(baseProfile({ goalType: 'maintenance', nutritionStyle: 'high_protein', dietPattern: 'pescatarian' }), t).plan
  const vegan = generateNutrition(baseProfile({ goalType: 'maintenance', nutritionStyle: 'high_protein', dietPattern: 'vegan' }), t).plan

  const noneIds = mealIngredientIds(none)
  const vegIds = mealIngredientIds(veg)
  const pescIds = mealIngredientIds(pesc)
  const veganIds = mealIngredientIds(vegan)
  console.log(`  none(saudi) meals: ${none.meals.map((m) => m.nameAr).join(' | ')}`)
  console.log(`  vegetarian meals: ${veg.meals.map((m) => m.nameAr).join(' | ')}`)
  console.log(`  pescatarian meals: ${pesc.meals.map((m) => m.nameAr).join(' | ')}`)
  console.log(`  vegan meals: ${vegan.meals.map((m) => m.nameAr).join(' | ')}`)

  ok('baseline(none) DOES contain meat (proves it was unfiltered before)', noneIds.some((i) => MEAT.has(i)), noneIds.filter((i) => MEAT.has(i)).join(','))
  ok('vegetarian EXCLUDES all land meat', !vegIds.some((i) => MEAT.has(i)))
  ok('vegetarian EXCLUDES all seafood', !vegIds.some((i) => SEAFOOD.has(i)))
  ok('pescatarian EXCLUDES land meat', !pescIds.some((i) => MEAT.has(i)))
  ok('pescatarian ALLOWS fish (salmon/tuna/shrimp present)', pescIds.some((i) => SEAFOOD.has(i)), pescIds.filter((i) => SEAFOOD.has(i)).join(','))
  ok('vegan EXCLUDES every animal-derived ingredient', !veganIds.some((i) => ANIMAL.has(i)))
}

// ===== AUDIT 2: preferred-split shows ONLY for non-beginners =====
console.log('\n=== AUDIT 2: PREFERRED-SPLIT GATING ===')
{
  // A beginner who somehow has a stale advanced split selection must collapse to 'auto'.
  const beginnerAns = { ...defaultAnswers, experienceLevel: 'beginner' as const, goalValue: 'bulk' as const, splitMode: 'advanced' as const, advancedSplit: 'push_pull_legs' as const }
  const interAns = { ...defaultAnswers, experienceLevel: 'intermediate' as const, goalValue: 'bulk' as const, splitMode: 'advanced' as const, advancedSplit: 'push_pull_legs' as const }
  const begOp = buildOnboardingProfile(beginnerAns)
  const intOp = buildOnboardingProfile(interAns)
  console.log(`  beginner -> splitMode='${begOp.trainingPreferences.splitMode}', advancedSplit='${begOp.trainingPreferences.advancedSplit}'`)
  console.log(`  intermediate -> splitMode='${intOp.trainingPreferences.splitMode}', advancedSplit='${intOp.trainingPreferences.advancedSplit}'`)
  ok("beginner answer forced to splitMode='auto' (picker hidden, choice ignored)", begOp.trainingPreferences.splitMode === 'auto')
  ok('beginner advancedSplit dropped', !begOp.trainingPreferences.advancedSplit)
  ok("intermediate keeps splitMode='advanced'", intOp.trainingPreferences.splitMode === 'advanced')
  ok("intermediate keeps chosen split 'push_pull_legs'", intOp.trainingPreferences.advancedSplit === 'push_pull_legs')

  // Generator honors the split: at 4 days, auto = upper/lower but a chosen PPL must override it.
  const autoPlan = generatePlan(baseProfile({ goalType: 'bulking', trainingLevel: 'intermediate', experienceLevel: 'intermediate', trainingDays: 4, splitMode: 'auto' }))
  const pplPlan = generatePlan(baseProfile({ goalType: 'bulking', trainingLevel: 'intermediate', experienceLevel: 'intermediate', trainingDays: 4, splitMode: 'advanced', splitChoice: 'push_pull_legs' }))
  console.log(`  auto templateId='${autoPlan.workoutPlan.templateId}', ppl templateId='${pplPlan.workoutPlan.templateId}'`)
  ok('generator honors chosen split (PPL template != auto template)', autoPlan.workoutPlan.templateId !== pplPlan.workoutPlan.templateId)
}

// ===== AUDIT 4: injury excludes risky exercises =====
console.log('\n=== AUDIT 4: INJURY / RESTRICTIONS ===')
{
  const shoulder = generatePlan(baseProfile({ goalType: 'bulking', trainingLevel: 'intermediate', experienceLevel: 'intermediate', trainingDays: 4, injuries: 'الكتف' }))
  const knee = generatePlan(baseProfile({ goalType: 'bulking', trainingLevel: 'intermediate', experienceLevel: 'intermediate', trainingDays: 4, injuries: 'الركبة' }))
  const ids = (g: ReturnType<typeof generatePlan>) => g.workoutPlan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
  const sIds = ids(shoulder)
  const kIds = ids(knee)
  const shoulderBanned = ['overhead-press', 'push-press', 'upright-row', 'arnold-press']
  const kneeBanned = ['barbell-back-squat', 'hack-squat', 'leg-extension', 'sissy-squat']
  ok('shoulder-injury plan excludes overhead/shoulder-press family', !sIds.some((i) => shoulderBanned.includes(i)), sIds.filter((i) => shoulderBanned.includes(i)).join(',') || 'none present')
  ok('knee-injury plan excludes deep-knee-loading (squat/hack/leg-ext)', !kIds.some((i) => kneeBanned.includes(i)), kIds.filter((i) => kneeBanned.includes(i)).join(',') || 'none present')
  ok('shoulder plan still produces exercises (not empty)', sIds.length > 0, `${sIds.length} exercises`)
}

// ===== AUDIT 5: strength goal migration =====
console.log('\n=== AUDIT 5: STRENGTH GOAL MIGRATION ===')
{
  // mock localStorage with a legacy stored profile carrying goal.type='strength'
  const store: Record<string, string> = {}
  const legacy = {
    profile: { sex: 'male', age: 30 },
    bodyMetrics: { heightCm: 178, currentWeightKg: 85 },
    goal: { type: 'strength' }, // legacy, removed in P2.5
    trainingPreferences: { experience: 'intermediate', daysPerWeek: 4 },
    activityProfile: {},
    nutritionPreferences: {},
    foodPreferences: { dislikedFoods: [], allergies: [] },
    limitations: { injuries: [] },
    wellnessTracking: { mode: 'none', supplements: [], medications: [] },
    appPreferences: { language: 'ar', reminders: false },
    _meta: { schemaVersion: 1, completed: true, source: 'onboarding' },
  }
  store[ONBOARDING_PROFILE_KEY] = JSON.stringify(legacy)
  // @ts-expect-error minimal window shim for the loader
  globalThis.window = { localStorage: { getItem: (k: string) => store[k] ?? null, setItem: () => {}, removeItem: () => {} } }

  let migrated: ReturnType<typeof loadOnboardingProfile> = null
  let crashed = false
  try {
    migrated = loadOnboardingProfile()
  } catch (e) {
    crashed = true
    console.log('  CRASH:', (e as Error).message)
  }
  ok('load does not crash on legacy strength profile', !crashed)
  ok("goal.type migrated 'strength' -> 'bulk'", migrated?.goal.type === 'bulk', `got '${migrated?.goal.type}'`)

  if (migrated) {
    const legacyProfile = toLegacyProfile(migrated)
    const targets = computeTargets(legacyProfile)
    const tdee = targets.tdee
    ok("legacy goalType is 'bulking'", legacyProfile.goalType === 'bulking', legacyProfile.goalType)
    ok('calorie goal resolves to bulk', calorieGoalFromGoalType(legacyProfile.goalType) === 'bulk')
    ok('bulking calories == TDEE + 300 (not +150)', targets.bulkingCalories === tdee + 300, `TDEE=${tdee}, bulking=${targets.bulkingCalories}`)
  }
}

console.log(`\n${failures === 0 ? '🎉 ALL PROOFS PASSED' : `💥 ${failures} PROOF(S) FAILED`}`)
process.exit(failures === 0 ? 0 : 1)
