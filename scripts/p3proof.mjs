// P3-A1 runtime proof — compiles real src via esbuild import and runs scenarios on Node.
// Run: node scripts/p3proof.mjs   (bundled by build-proof.mjs into dist-proof)
import { defaultAnswers, buildOnboardingProfile } from '@/lib/planBuilderAnswers'
import { toLegacyProfile } from '@/lib/onboardingProfile'
import { generatePlan } from '@/lib/planGenerator'
import { computeTargets } from '@/lib/calculators'
import { goalChoices, advancedSplitChoices } from '@/data/planBuilder'
import { loadOnboardingProfile, saveOnboardingProfile, defaultOnboardingProfile } from '@/lib/onboardingProfile'

// minimal localStorage/window shim so storage-backed loaders run on Node.
const _store = new Map()
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true },
  localStorage: {
    getItem: (k) => (_store.has(k) ? _store.get(k) : null),
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
  },
}

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? '  ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ FAIL: ${name}${extra ? '  ' + extra : ''}`) }
}

const mkPlan = (answers) => {
  const op = buildOnboardingProfile({ ...defaultAnswers, ...answers })
  const prof = toLegacyProfile(op)
  return { op, prof, plan: generatePlan(prof), targets: computeTargets(prof) }
}
const allExerciseIds = (plan) => {
  const ids = []
  for (const d of plan.workoutPlan.days) for (const e of d.exercises) ids.push(e.exerciseId)
  return ids
}
const planValid = (plan) =>
  plan.workoutPlan.days.length > 0 && plan.workoutPlan.days.every((d) => d.exercises.length > 0)

// ---------------- TASK 1: NAME ----------------
console.log('\n== TASK 1: NAME CAPTURE ==')
{
  const withName = buildOnboardingProfile({ ...defaultAnswers, name: '  زياد  ', goalValue: 'cut' })
  ok('name trimmed & stored in profile', withName.profile.name === 'زياد', `got="${withName.profile.name}"`)
  ok('name flows to legacy profile (→ dashboard greeting userName)',
    toLegacyProfile(withName).name === 'زياد')
  const skipped = buildOnboardingProfile({ ...defaultAnswers, name: '', goalValue: 'cut' })
  ok('skipped name = no fake name (undefined)', skipped.profile.name === undefined)
  ok('legacy profile name empty when skipped', toLegacyProfile(skipped).name === '')
  const spaces = buildOnboardingProfile({ ...defaultAnswers, name: '    ', goalValue: 'cut' })
  ok('whitespace-only name treated as skipped', spaces.profile.name === undefined)
}

// ---------------- TASK 2: INJURIES ----------------
console.log('\n== TASK 2: INJURIES (full coverage) ==')
{
  // Representative risky ids we assert are EXCLUDED for each injury (independent of source sets).
  const RISKY = {
    knee: ['barbell-back-squat', 'leg-extension', 'walking-lunge'],
    shoulder: ['overhead-press', 'upright-row', 'arnold-press'],
    lower_back: ['deadlift', 'barbell-row', 'good-morning'],
    wrist: ['deadlift', 'barbell-curl', 'push-up', 'chin-up', 'skull-crusher', 'chest-dip'],
    elbow: ['barbell-curl', 'skull-crusher', 'chest-dip', 'triceps-dip-machine', 'dumbbell-curl'],
    ankle: ['walking-lunge', 'standing-calf-raise', 'jump-rope', 'burpees', 'bulgarian-split-squat'],
  }
  // test across days/levels: 6 days advanced PPL (max exercise variety) + cutting (adds cardio).
  for (const inj of Object.keys(RISKY)) {
    const { plan } = mkPlan({
      goalValue: 'cut', experienceLevel: 'advanced', splitMode: 'auto',
      environment: 'commercial_gym', trainingDays: 6, sessionDurationMin: 90,
      injuries: [inj],
    })
    const ids = new Set(allExerciseIds(plan))
    const leaked = RISKY[inj].filter((r) => ids.has(r))
    ok(`injury="${inj}" → 0 risky exercises in plan`, leaked.length === 0, leaked.length ? `LEAKED: ${leaked}` : `(${ids.size} exercises)`)
    ok(`injury="${inj}" → plan still valid`, planValid(plan))
  }
  // multi-injury conservative combo still valid
  const combo = mkPlan({ goalValue: 'bulk', experienceLevel: 'intermediate', splitMode: 'auto',
    environment: 'commercial_gym', trainingDays: 4, sessionDurationMin: 60,
    injuries: ['wrist', 'elbow', 'ankle', 'lower_back'] })
  ok('4-injury combo → plan still valid (non-empty days)', planValid(combo.plan),
    `days=${combo.plan.workoutPlan.days.length}`)
  // cardio respects ankle (no jump-rope/burpees/high-knees for cutting + ankle)
  const ankleCut = mkPlan({ goalValue: 'cut', experienceLevel: 'beginner', environment: 'commercial_gym',
    trainingDays: 3, sessionDurationMin: 45, injuries: ['ankle'] })
  const ankleIds = new Set(allExerciseIds(ankleCut.plan))
  ok('ankle + cutting → no high-impact cardio (jump-rope/burpees/high-knees)',
    !['jump-rope', 'burpees', 'high-knees', 'mountain-climber'].some((r) => ankleIds.has(r)))
}

// ---------------- TASK 3: GOALS ----------------
console.log('\n== TASK 3: GOALS = cut/bulk only, strength→bulk intact ==')
{
  ok('exactly 2 goal choices (cut, bulk)', goalChoices.length === 2 &&
    goalChoices.map((g) => g.value).sort().join(',') === 'bulk,cut')
  const cut = mkPlan({ goalValue: 'cut', experienceLevel: 'beginner', environment: 'commercial_gym', trainingDays: 3 })
  ok('cut → goalType cutting', cut.prof.goalType === 'cutting')
  const bulk = mkPlan({ goalValue: 'bulk', experienceLevel: 'beginner', environment: 'commercial_gym', trainingDays: 3 })
  ok('bulk → goalType bulking', bulk.prof.goalType === 'bulking')
  // strength migration: legacy 'strength' onboarding goal must load as bulk (via loader migration).
  const legacyStrength = { ...defaultOnboardingProfile(), goal: { type: 'strength' } }
  saveOnboardingProfile(legacyStrength)
  ok('legacy goal "strength" migrates → bulk on load (no regression)',
    loadOnboardingProfile().goal.type === 'bulk')
  const legacyRecomp = { ...defaultOnboardingProfile(), goal: { type: 'recomp' } }
  saveOnboardingProfile(legacyRecomp)
  ok('legacy goal "recomp" migrates → cut on load', loadOnboardingProfile().goal.type === 'cut')
}

// ---------------- TASK 4: TARGET WEIGHT ----------------
console.log('\n== TASK 4: TARGET WEIGHT drives ETA + weekly change ==')
{
  const cut = mkPlan({ goalValue: 'cut', weightKg: 90, targetWeightKg: 80, targetTouched: true,
    experienceLevel: 'beginner', environment: 'commercial_gym', trainingDays: 3 })
  ok('cut: target<current → weeklyChange negative', cut.targets.weeklyWeightChangeKg < 0, `Δ=${cut.targets.weeklyWeightChangeKg}`)
  ok('cut: ETA weeks > 0', cut.targets.estimatedWeeksToGoal > 0, `weeks=${cut.targets.estimatedWeeksToGoal}`)
  const bulk = mkPlan({ goalValue: 'bulk', weightKg: 70, targetWeightKg: 78, targetTouched: true,
    experienceLevel: 'beginner', environment: 'commercial_gym', trainingDays: 3 })
  ok('bulk: target>current → weeklyChange positive', bulk.targets.weeklyWeightChangeKg > 0, `Δ=${bulk.targets.weeklyWeightChangeKg}`)
  ok('bulk: ETA weeks > 0', bulk.targets.estimatedWeeksToGoal > 0, `weeks=${bulk.targets.estimatedWeeksToGoal}`)
  // farther target → longer ETA (monotonic)
  const bulkFar = mkPlan({ goalValue: 'bulk', weightKg: 70, targetWeightKg: 85, targetTouched: true,
    experienceLevel: 'beginner', environment: 'commercial_gym', trainingDays: 3 })
  ok('farther target → longer ETA', bulkFar.targets.estimatedWeeksToGoal > bulk.targets.estimatedWeeksToGoal,
    `${bulk.targets.estimatedWeeksToGoal} < ${bulkFar.targets.estimatedWeeksToGoal}`)
  // neutral: equal weight → 0 change / 0 weeks (the "equal" case)
  const eq = computeTargets({ ...cut.prof, weightKg: 80, targetWeightKg: 80 })
  ok('equal weight → weeklyChange 0 & ETA 0 (neutral)', eq.weeklyWeightChangeKg === 0 && eq.estimatedWeeksToGoal === 0)
}

// ---------------- TASK 5: SPLIT GATING ----------------
console.log('\n== TASK 5: SPLIT gating (beginner=auto, advanced=chosen) ==')
{
  // beginner cannot choose a split — forced auto even if answers say advanced.
  const beg = buildOnboardingProfile({ ...defaultAnswers, goalValue: 'bulk', experienceLevel: 'beginner',
    splitMode: 'advanced', advancedSplit: 'push_pull_legs', environment: 'commercial_gym', trainingDays: 4 })
  ok('beginner forced splitMode=auto', beg.trainingPreferences.splitMode === 'auto')
  ok('beginner has no advancedSplit', beg.trainingPreferences.advancedSplit === undefined)
  // advanced user's chosen split honored by generator (3 distinct options).
  ok('exactly 3 distinct advanced split choices', advancedSplitChoices.length === 3 &&
    advancedSplitChoices.map((c) => c.value).sort().join(',') === 'full_body,push_pull_legs,upper_lower')
  const idByChoice = { full_body: 'gen-adv-fullbody', upper_lower: 'gen-adv-upper-lower', push_pull_legs: 'gen-adv-ppl' }
  for (const c of advancedSplitChoices) {
    const { plan } = mkPlan({ goalValue: 'bulk', experienceLevel: 'advanced', splitMode: 'advanced',
      advancedSplit: c.value, environment: 'commercial_gym', trainingDays: 6, sessionDurationMin: 90 })
    ok(`advanced chose "${c.value}" → generator honors it`, plan.workoutPlan.templateId === idByChoice[c.value],
      `templateId=${plan.workoutPlan.templateId}`)
    ok(`advanced "${c.value}" → plan valid`, planValid(plan))
  }
  // intermediate can also pick
  const inter = buildOnboardingProfile({ ...defaultAnswers, goalValue: 'cut', experienceLevel: 'intermediate',
    splitMode: 'advanced', advancedSplit: 'upper_lower', environment: 'commercial_gym', trainingDays: 4 })
  ok('intermediate keeps chosen advanced split', inter.trainingPreferences.advancedSplit === 'upper_lower')
}

// ---------------- TASK 6: NUTRITION INPUTS CHANGE PLAN ----------------
console.log('\n== TASK 6: NUTRITION onboarding inputs change the plan ==')
{
  const base = mkPlan({ goalValue: 'cut', experienceLevel: 'beginner', environment: 'commercial_gym',
    trainingDays: 3, nutritionStyle: 'meal_suggestions', mealsPerDay: 3 })
  const more = mkPlan({ goalValue: 'cut', experienceLevel: 'beginner', environment: 'commercial_gym',
    trainingDays: 3, nutritionStyle: 'meal_suggestions', mealsPerDay: 6 })
  ok('mealsPerDay changes meal count in nutrition plan',
    base.plan.nutritionPlan.meals.length !== more.plan.nutritionPlan.meals.length,
    `3→${base.plan.nutritionPlan.meals.length} meals vs 6→${more.plan.nutritionPlan.meals.length}`)
  // diet pattern passes through to profile (drives food filtering downstream)
  const vegan = buildOnboardingProfile({ ...defaultAnswers, goalValue: 'cut', dietPattern: 'vegan',
    experienceLevel: 'beginner', environment: 'commercial_gym', trainingDays: 3 })
  ok('dietPattern passes through to legacy profile', toLegacyProfile(vegan).dietPattern === 'vegan')
  // meal distribution & appetite timing pass through
  const dist = buildOnboardingProfile({ ...defaultAnswers, goalValue: 'cut', nutritionStyle: 'meal_suggestions',
    mealDistribution: 'fewer_larger', appetiteTiming: 'evening', experienceLevel: 'beginner',
    environment: 'commercial_gym', trainingDays: 3 })
  const lp = toLegacyProfile(dist)
  ok('mealDistribution passes through', lp.mealDistribution === 'fewer_larger')
  ok('appetiteTiming passes through', lp.appetiteTiming === 'evening')
  // macros_only → no meal suggestions forced (mealsPerDay dropped)
  const macros = buildOnboardingProfile({ ...defaultAnswers, goalValue: 'cut', nutritionStyle: 'macros_only',
    experienceLevel: 'beginner', environment: 'commercial_gym', trainingDays: 3 })
  ok('macros_only → nutritionDisplayStyle reflects choice', toLegacyProfile(macros).nutritionDisplayStyle === 'macros_only')
}

console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`)
process.exit(fail ? 1 : 0)
