import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const here = dirname(scriptPath)
const root = resolve(here, '..')
const fixtureDir = resolve(root, 'tests/fixtures/plan-engine/v1')
const casesDir = resolve(fixtureDir, 'cases')
const manifestPath = resolve(fixtureDir, 'manifest.json')
const sourceCommit = 'dd79a60f193b1163ab1ec549a35458e0d2aab1de'
const schemaVersion = 'qimmah-plan-engine-golden/v1'
const controlledEnvironmentProfiles = [
  { name: 'UTC / C', env: { TZ: 'UTC', LANG: 'C', LC_ALL: 'C' } },
  { name: 'Asia/Riyadh / ar_SA', env: { TZ: 'Asia/Riyadh', LANG: 'ar_SA.UTF-8', LC_ALL: 'ar_SA.UTF-8' } },
]

const base = {
  name: 'plan-golden-fixture',
  gender: 'male',
  age: 30,
  heightCm: 178,
  weightKg: 82,
  targetWeightKg: 76,
  activityLevel: 'moderate',
  trainingLevel: 'intermediate',
  goal: 'cut',
  goalType: 'cutting',
  trainingDays: 4,
  workoutDuration: 60,
  workoutEnvironment: 'gym',
  injuries: '',
  healthNotes: '',
  trackNutrition: true,
  mealsPerDay: 4,
  nutritionStyle: 'high_protein',
  nutritionDisplayStyle: 'meal_suggestions',
  mealDistribution: 'balanced',
  appetiteTiming: 'balanced',
  dietPattern: 'none',
  dislikedFoods: '',
  muscleFocus: 'balanced',
  consistency: 'regular',
  splitMode: 'auto',
  splitChoice: 'full_body',
  experienceBand: '1to2y',
  experienceLevel: 'intermediate',
  gymAccess: 'full',
  gymType: 'commercial',
  equipment: ['dumbbell', 'barbell', 'bench', 'machine', 'cable', 'bands'],
  schedulingStyle: 'flexible',
  preferredDays: [0, 1, 2, 3],
  remindersOptIn: false,
}

const seedCases = [
  {
    fixtureId: 'adult-beginner-cutting',
    description: 'Adult beginner cutting in a full gym.',
    classification: 'normal',
    input: { ...base, name: 'adult-beginner-cutting', age: 26, weightKg: 90, targetWeightKg: 80, trainingLevel: 'beginner', goal: 'cut', goalType: 'cutting', trainingDays: 3, workoutDuration: 45, experienceBand: 'lt1m', experienceLevel: 'beginner' },
  },
  {
    fixtureId: 'adult-advanced-bulking',
    description: 'Adult advanced bulking in a full gym.',
    classification: 'normal',
    input: { ...base, name: 'adult-advanced-bulking', age: 34, weightKg: 78, targetWeightKg: 86, activityLevel: 'active', trainingLevel: 'advanced', goal: 'bulk', goalType: 'bulking', trainingDays: 6, workoutDuration: 75, experienceBand: 'gt2y', experienceLevel: 'advanced', preferredDays: [0, 1, 2, 3, 4, 5] },
  },
  {
    fixtureId: 'adult-intermediate-maintain',
    description: 'Adult intermediate maintenance in a small gym.',
    classification: 'normal',
    input: { ...base, name: 'adult-intermediate-maintain', goal: 'maintain', goalType: 'maintenance', gymAccess: 'small', gymType: 'small', equipment: ['dumbbell', 'barbell', 'bench', 'bands'], preferredDays: [0, 1, 2, 3] },
  },
  {
    fixtureId: 'adult-beginner-health-home',
    description: 'Adult beginner health goal at home.',
    classification: 'normal',
    input: { ...base, name: 'adult-beginner-health-home', gender: 'female', age: 29, goal: 'maintain', goalType: 'health', trainingLevel: 'beginner', trainingDays: 2, workoutDuration: 30, workoutEnvironment: 'home', gymAccess: 'home', gymType: 'home', equipment: ['dumbbell', 'bench', 'bands'], experienceBand: '1to6m', experienceLevel: 'novice', preferredDays: [0, 2] },
  },
  {
    fixtureId: 'adult-advanced-recomp-bodyweight',
    description: 'Adult advanced recomposition with bodyweight access.',
    classification: 'normal',
    input: { ...base, name: 'adult-advanced-recomp-bodyweight', age: 31, goal: 'maintain', goalType: 'recomposition', trainingLevel: 'advanced', trainingDays: 5, workoutDuration: 90, gymAccess: 'bodyweight', gymType: 'bodyweight', equipment: [], experienceBand: 'gt2y', experienceLevel: 'advanced', preferredDays: [0, 1, 2, 3, 4] },
  },
  {
    fixtureId: 'minor-17-cutting',
    description: 'Minor age 17 with a cutting request; preserves the engine safety policy.',
    classification: 'normal',
    input: { ...base, name: 'minor-17-cutting', age: 17, weightKg: 72, targetWeightKg: 64, goal: 'cut', goalType: 'cutting', trainingLevel: 'beginner', trainingDays: 3, workoutDuration: 45, experienceBand: 'lt1m', experienceLevel: 'beginner' },
    knownCharacterizationNotes: ['The fixture captures the existing minor-goal restriction; it does not define a new product policy.'],
  },
  {
    fixtureId: 'minor-17-bulking',
    description: 'Minor age 17 with a bulking request; preserves the engine safety policy.',
    classification: 'normal',
    input: { ...base, name: 'minor-17-bulking', age: 17, weightKg: 60, targetWeightKg: 70, goal: 'bulk', goalType: 'bulking', trainingLevel: 'beginner', trainingDays: 3, workoutDuration: 45, experienceBand: 'lt1m', experienceLevel: 'beginner' },
    knownCharacterizationNotes: ['The fixture captures the existing minor-goal restriction; it does not define a new product policy.'],
  },
  {
    fixtureId: 'adult-boundary-age-18',
    description: 'Adult boundary at exactly age 18.',
    classification: 'boundaryCharacterization',
    input: { ...base, name: 'adult-boundary-age-18', age: 18, goal: 'cut', goalType: 'cutting' },
  },
  {
    fixtureId: 'equipment-access-precedence',
    description: 'Conflicting access fields; gymAccess is the intended precedence source.',
    classification: 'normal',
    input: { ...base, name: 'equipment-access-precedence', gymAccess: 'home', gymType: 'commercial', workoutEnvironment: 'gym', equipment: ['dumbbell', 'bench', 'bands'] },
  },
  {
    fixtureId: 'advanced-ppl-valid',
    description: 'Valid advanced push-pull-legs selection at six days.',
    classification: 'normal',
    input: { ...base, name: 'advanced-ppl-valid', trainingLevel: 'advanced', experienceBand: 'gt2y', experienceLevel: 'advanced', trainingDays: 6, splitMode: 'advanced', splitChoice: 'push_pull_legs', preferredDays: [0, 1, 2, 3, 4, 5] },
  },
  {
    fixtureId: 'advanced-ppl-invalid-fallback',
    description: 'Push-pull-legs requested with insufficient days; captures automatic fallback.',
    classification: 'boundaryCharacterization',
    input: { ...base, name: 'advanced-ppl-invalid-fallback', trainingLevel: 'advanced', experienceBand: 'gt2y', experienceLevel: 'advanced', trainingDays: 2, splitMode: 'advanced', splitChoice: 'push_pull_legs', preferredDays: [0, 2] },
    knownCharacterizationNotes: ['The fallback is captured as current behavior and is not treated as a product correction.'],
  },
  {
    fixtureId: 'legacy-goal-conflict',
    description: 'Legacy goal conflicts with the structured goalType.',
    classification: 'legacyInvalidInput',
    input: { ...base, name: 'legacy-goal-conflict', goal: 'bulk', goalType: 'cutting' },
    knownCharacterizationNotes: ['This is intentionally invalid legacy-shaped input for characterization only; goalType remains the structured source of truth.'],
  },
]

function fail(message) {
  throw new Error(message)
}

function canonicalize(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`Non-finite number encountered: ${value}`)
    return Object.is(value, -0) ? 0 : value
  }
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value))}\n`
}

function sha256(value) {
  const bytes = typeof value === 'string' ? value : canonicalJson(value)
  return createHash('sha256').update(bytes, 'utf8').digest('hex')
}

function npmVersion() {
  return execFileSync('npm', ['--version'], { cwd: root, encoding: 'utf8' }).trim()
}

function packageLockSha256() {
  return createHash('sha256').update(readFileSync(resolve(root, 'package-lock.json'))).digest('hex')
}

function generationProvenance() {
  const resolved = new Intl.DateTimeFormat().resolvedOptions()
  return {
    TZ: process.env.TZ ?? 'unset',
    LANG: process.env.LANG ?? 'unset',
    LC_ALL: process.env.LC_ALL ?? 'unset',
    locale: resolved.locale,
    timeZone: resolved.timeZone,
    nodeVersion: process.version,
    npmVersion: npmVersion(),
    packageLockSha256: packageLockSha256(),
  }
}

const CORE_ENGINE_PATHS = [
  'src/lib/planGenerator.ts',
  'src/lib/calculators.ts',
  'src/lib/equipmentAccess.ts',
  'src/types/profile.ts',
]

/**
 * [OVERNIGHT-2] كان هذا الحارس يقارن `origin/main` بـsha حرفي (dd79a60)، فسقط
 * لحظة تقدّم main إلى cc60adf — **والمحرّك لم يتغيّر بحرف واحد**. أي أنه كان
 * يقيس مرجعًا متحرّكًا بثابت، لا يقيس ما يدّعي حراسته.
 *
 * والضمان المقصود واحد: **الذهبيات وُلدت من مصدر محرّك لم يتغيّر بعدها**. فيُقاس
 * الآن مقابل `sourceCommit` نفسه — الالتزام الذي وُلدت منه، المسجَّل في البيان —
 * لا مقابل رأس فرع يتحرّك. وهذا أضيق لا أوسع: لو تحرّك main بتغيير في المحرّك
 * لسقط الفحص كما يجب، ولو لم يتحرّك المحرّك لم يسقط لسبب لا علاقة له بالخطط.
 */
function assertOfficialBaseline() {
  // ① الالتزام المرجعي جزء من تاريخنا فعلًا — لا sha أجنبي ولا مختلَق.
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', sourceCommit, 'HEAD'], { cwd: root })
  } catch {
    fail(`Golden baseline ${sourceCommit} is not an ancestor of HEAD; regenerate the fixtures.`)
  }
  // ② مصدر المحرّك لم يتغيّر منذ ذلك الالتزام — وهذا هو الضمان الحقيقي.
  const diff = execFileSync('git', ['diff', '--name-only', sourceCommit, 'HEAD', '--', ...CORE_ENGINE_PATHS], { cwd: root, encoding: 'utf8' }).trim()
  if (diff) fail(`Core plan-engine source changed since golden baseline ${sourceCommit}; regenerate the fixtures:\n${diff}`)
  // ③ ولا فروق غير مودعة في نفس الملفّات — الشجرة العاملة تُقاس كما تُقاس السجلّات.
  const dirty = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', ...CORE_ENGINE_PATHS], { cwd: root, encoding: 'utf8' }).trim()
  if (dirty) fail(`Uncommitted core plan-engine changes; regenerate the fixtures:\n${dirty}`)
}

async function loadEngine() {
  const bundle = await build({
    stdin: {
      contents: `import { generatePlan } from '@/lib/planGenerator'\nglobalThis.__qimmahGeneratePlan = generatePlan\n`,
      resolveDir: root,
      sourcefile: 'plan-golden-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    alias: { '@': resolve(root, 'src') },
    define: { 'import.meta.env': JSON.stringify({ MODE: 'test', DEV: false, PROD: false }) },
    logLevel: 'warning',
  })
  const temp = mktemp('qimmah-plan-engine-')
  const file = join(temp, 'engine.mjs')
  writeFileSync(file, bundle.outputFiles[0].contents)
  try {
    await import(`${pathToFileURL(file).href}?engine=${Date.now()}`)
    if (typeof globalThis.__qimmahGeneratePlan !== 'function') fail('Plan engine bundle did not expose generatePlan')
    return globalThis.__qimmahGeneratePlan
  } finally {
    delete globalThis.__qimmahGeneratePlan
    rmSync(temp, { recursive: true, force: true })
  }
}

function mktemp(prefix) {
  const dir = join(tmpdir(), `${prefix}${process.pid}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function freezeDate(now, fn) {
  const RealDate = globalThis.Date
  class FrozenDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [now]))
    }
    static now() { return now }
  }
  globalThis.Date = FrozenDate
  try { return fn() } finally { globalThis.Date = RealDate }
}

function runPlan(engine, input, now = 0) {
  return freezeDate(now, () => canonicalize(engine(input)))
}

function controlledOutputs(engine, cases) {
  return cases.map((item) => {
    const first = canonicalJson(runPlan(engine, item.input, 0))
    const repeated = canonicalJson(runPlan(engine, item.input, 0))
    const second = canonicalJson(runPlan(engine, item.input, 4102444800000))
    if (first !== repeated) fail(`NONDETERMINISM: ${item.fixtureId} is not byte-stable`)
    if (first !== second) fail(`NONDETERMINISM: ${item.fixtureId} changes with current time`)
    const output = JSON.parse(first)
    assertFinite(output)
    const invariantIssues = derivedInvariants(item.input, output)
    if (invariantIssues.length) fail(`${item.fixtureId} mismatch [derivedInvariants]: ${invariantIssues.join('; ')}`)
    mutationProof(output)
    return { fixtureId: item.fixtureId, output }
  })
}

function runControlledEnvironment(profile) {
  try {
    const stdout = execFileSync(process.execPath, [scriptPath, '--controlled-environment'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ...profile.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const outputs = JSON.parse(stdout)
    if (!Array.isArray(outputs)) fail(`Controlled environment ${profile.name} returned an invalid payload`)
    return outputs
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.message || String(error)
    fail(`Controlled environment ${profile.name} failed: ${detail}`)
  }
}

function assertControlledEnvironmentDeterminism() {
  const referenceProfile = controlledEnvironmentProfiles[0]
  const reference = runControlledEnvironment(referenceProfile)
  for (const profile of controlledEnvironmentProfiles.slice(1)) {
    const candidate = runControlledEnvironment(profile)
    if (canonicalJson(reference) === canonicalJson(candidate)) continue
    for (let index = 0; index < reference.length; index += 1) {
      const baseline = reference[index]
      const observed = candidate[index]
      const diff = firstDifference(baseline, observed)
      if (diff) fail(`NONDETERMINISM: ${baseline?.fixtureId ?? `case-${index}`} changes between ${referenceProfile.name} and ${profile.name} at ${diff.path}`)
    }
    fail(`NONDETERMINISM: controlled outputs differ between ${referenceProfile.name} and ${profile.name}`)
  }
  return new Map(reference.map(({ fixtureId, output }) => [fixtureId, output]))
}

const SAFETY_COPY_PATHS = new Set([
  'warningsAr',
  'warningsEn',
  'targets.notes',
  'workoutPlan.days.exercises.notes',
  'nutritionPlan.meals.notes',
  'commitmentPlan.items.notes',
])

const LOCALIZED_COPY_PATHS = new Set([
  'explanationAr',
  'explanationEn',
  'planLabelAr',
  'planLabelEn',
  'targets.bmiLabel',
  'targets.suggestedTrainingSplit',
  'weeklySchedule.day',
  'weeklySchedule.title',
  'workoutPlan.days.nameAr',
  'workoutPlan.days.nameEn',
  'workoutPlan.days.exercises.customNameAr',
  'workoutPlan.days.exercises.customNameEn',
  'nutritionPlan.meals.nameAr',
  'nutritionPlan.meals.nameEn',
  'commitmentPlan.items.customNameAr',
  'commitmentPlan.items.customNameEn',
])

function normalizePath(path) {
  const raw = path.startsWith('$.') ? path.slice(2) : path
  return raw
    .split('.')
    .map((segment) => {
      const bracket = segment.indexOf('[')
      return bracket === -1 ? segment : segment.slice(0, bracket)
    })
    .filter(Boolean)
    .join('.')
}

function classifyPath(path) {
  const normalized = normalizePath(path)
  if (SAFETY_COPY_PATHS.has(normalized)) return 'safetyCopy'
  if (LOCALIZED_COPY_PATHS.has(normalized)) return 'localizedCopy'
  return 'coreLogic'
}

function firstDifference(expected, actual, path = '$') {
  if (typeof expected !== typeof actual) return { path, class: classifyPath(path), expected, actual }
  if (typeof expected === 'number' || typeof expected === 'string' || typeof expected === 'boolean' || expected === null) {
    return Object.is(expected, actual) ? null : { path, class: classifyPath(path), expected, actual }
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return { path, class: classifyPath(path), expected, actual }
    for (let i = 0; i < expected.length; i += 1) {
      const diff = firstDifference(expected[i], actual[i], `${path}[${i}]`)
      if (diff) return diff
    }
    return null
  }
  const keys = [...new Set([...Object.keys(expected ?? {}), ...Object.keys(actual ?? {})])].sort()
  for (const key of keys) {
    const diff = firstDifference(expected?.[key], actual?.[key], `${path}.${key}`)
    if (diff) return diff
  }
  return null
}

function assertFinite(value, path = '$') {
  if (typeof value === 'number' && !Number.isFinite(value)) fail(`Non-finite output at ${path}`)
  if (Array.isArray(value)) value.forEach((item, index) => assertFinite(item, `${path}[${index}]`))
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => assertFinite(item, `${path}.${key}`))
}

function derivedInvariants(input, output) {
  const issues = []
  if (!Array.isArray(output.weeklySchedule) || output.weeklySchedule.length !== 7) issues.push('weeklySchedule must contain 7 rows')
  if (input.age < 18 && (output.targets.weeklyWeightChangeKg !== 0 || output.targets.estimatedWeeksToGoal !== 0)) issues.push('minor must not receive projected weight change')
  if (output.workoutPlan.days.length < 1 || output.workoutPlan.days.length > 7) issues.push('workoutPlan day count must be clamped to 1..7')
  return issues
}

function casePayload(item, output) {
  return {
    schemaVersion,
    fixtureId: item.fixtureId,
    sourceCommit,
    description: item.description,
    classification: item.classification,
    input: item.input,
    expected: output,
    knownCharacterizationNotes: item.knownCharacterizationNotes ?? [],
  }
}

function readCases() {
  if (!existsSync(casesDir)) return seedCases
  const files = readdirSync(casesDir).filter((file) => file.endsWith('.json')).sort()
  if (files.length !== seedCases.length) fail(`Expected exactly ${seedCases.length} cases, found ${files.length}`)
  const expectedFiles = new Set(seedCases.map((item) => `${item.fixtureId}.json`))
  for (const file of files) if (!expectedFiles.has(file)) fail(`Unexpected fixture file: ${file}`)
  return seedCases.map((seed) => JSON.parse(readFileSync(join(casesDir, `${seed.fixtureId}.json`), 'utf8')))
}

function diffText(before, after) {
  if (before === after) return '(no diff)'
  const a = before.split('\n')
  const b = after.split('\n')
  const lines = ['--- existing', '+++ generated']
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i += 1) {
    if (a[i] !== b[i]) {
      if (a[i] !== undefined) lines.push(`-${a[i]}`)
      if (b[i] !== undefined) lines.push(`+${b[i]}`)
    }
  }
  return lines.join('\n')
}

function mutationProof(expected) {
  const mutations = [
    ['calories', 'coreLogic', (copy) => { copy.targets.targetCalories += 1 }],
    ['exercise-order', 'coreLogic', (copy) => { const exercises = copy.workoutPlan.days[0]?.exercises; if (exercises?.length > 1) [exercises[0], exercises[1]] = [exercises[1], exercises[0]] }],
    ['warning', 'safetyCopy', (copy) => { copy.warningsAr = [...copy.warningsAr, 'mutation'] }],
    ['optional-field', 'coreLogic', (copy) => { const exercise = copy.workoutPlan.days[0]?.exercises[0]; if (exercise) exercise.optional = !exercise.optional }],
  ]
  for (const [name, expectedClass, mutate] of mutations) {
    const copy = structuredClone(expected)
    mutate(copy)
    const diff = firstDifference(expected, canonicalize(copy))
    if (!diff) fail(`Mutation proof did not detect ${name}`)
    if (diff.class !== expectedClass) fail(`Mutation proof classified ${name} as ${diff.class}; expected ${expectedClass} at ${diff.path}`)
  }
}

function classifierRegressionProof() {
  const exactCases = [
    ['$.targets.targetCalories', 'coreLogic'],
    ['$.warningsAr', 'safetyCopy'],
    ['$.warningsAr[0]', 'safetyCopy'],
    ['$.warningsEn', 'safetyCopy'],
    ['$.warningsEn[0]', 'safetyCopy'],
    ['$.planLabelAr', 'localizedCopy'],
  ]
  for (const [path, expectedClass] of exactCases) {
    const actualClass = classifyPath(path)
    if (actualClass !== expectedClass) fail(`Classifier regression at ${path}: got ${actualClass}; expected ${expectedClass}`)
  }
  const warningLengthDiff = firstDifference({ warningsAr: ['one'] }, { warningsAr: ['one', 'two'] })
  if (!warningLengthDiff || warningLengthDiff.class !== 'safetyCopy') fail('Classifier regression: warning array-length diff was not safetyCopy')
}

function assertManifestIntegrity(recorded, generated) {
  if (!recorded.environment || typeof recorded.environment !== 'object') fail('Golden manifest is missing generation provenance')
  const recordedFixtureContract = {
    schemaVersion: recorded.schemaVersion,
    sourceCommit: recorded.sourceCommit,
    cases: recorded.cases,
  }
  const generatedFixtureContract = {
    schemaVersion: generated.schemaVersion,
    sourceCommit: generated.sourceCommit,
    cases: generated.cases,
  }
  const diff = firstDifference(recordedFixtureContract, generatedFixtureContract)
  if (diff) fail(`Fixture manifest mismatch at ${diff.path}`)
}

function assertManifestTamperingIsRejected(recorded, generated) {
  const cases = [
    ['expected output hash', (copy) => { copy.cases[0].expectedSha256 = '0'.repeat(64) }, 'expectedSha256'],
    ['input hash', (copy) => { copy.cases[0].inputSha256 = '0'.repeat(64) }, 'inputSha256'],
  ]
  for (const [name, tamper, expectedPath] of cases) {
    const corrupted = structuredClone(recorded)
    tamper(corrupted)
    try {
      assertManifestIntegrity(corrupted, generated)
    } catch (error) {
      if (!String(error?.message ?? error).includes(expectedPath)) fail(`Regression proof did not name the ${name} mismatch`)
      continue
    }
    fail(`Regression proof did not reject a mutated ${name}`)
  }
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const update = args.has('--update')
  const confirmWrite = args.has('--confirm-write')
  const explicitCheck = args.has('--check')
  const mutationOnly = args.has('--mutation-only')
  const probeOnly = args.has('--probe-only')
  const controlledEnvironment = args.has('--controlled-environment')
  const check = explicitCheck || (!update && !probeOnly && !mutationOnly && !controlledEnvironment)
  if (update && !confirmWrite) fail('Refusing to write: --update requires --confirm-write')
  if (confirmWrite && !update) fail('--confirm-write is only valid with --update')
  if (explicitCheck && (update || probeOnly || mutationOnly || controlledEnvironment)) fail('--check cannot be combined with another mode')
  if (probeOnly && (update || confirmWrite || mutationOnly)) fail('--probe-only cannot be combined with another mode')
  if (mutationOnly && (update || confirmWrite)) fail('--mutation-only cannot be combined with write flags')
  if (controlledEnvironment && (update || confirmWrite || mutationOnly || probeOnly)) fail('--controlled-environment cannot be combined with another mode')
  if (process.argv.slice(2).some((arg) => !['--check', '--update', '--confirm-write', '--probe-only', '--mutation-only', '--controlled-environment'].includes(arg))) fail('Unknown argument')

  classifierRegressionProof()

  assertOfficialBaseline()
  const cases = readCases()
  if (mutationOnly) {
    for (const item of cases) mutationProof(item.expected)
    console.log(`Mutation suite passed: ${cases.length} cases; classifications and detections verified`)
    return
  }

  if (controlledEnvironment) {
    const engine = await loadEngine()
    process.stdout.write(canonicalJson(controlledOutputs(engine, cases)))
    return
  }

  const outputs = assertControlledEnvironmentDeterminism()
  if (probeOnly) {
    console.log(`Determinism probe passed for ${cases.length} cases across controlled timezone/locale profiles`)
    return
  }

  if (check && !existsSync(manifestPath)) fail('Golden manifest is missing; use --update --confirm-write to create it')
  const generated = []
  for (const item of cases) {
    const output = outputs.get(item.fixtureId)
    if (!output) fail(`Controlled environment did not return ${item.fixtureId}`)
    const payload = casePayload(item, output)
    generated.push({ payload, inputSha256: sha256(item.input), expectedSha256: sha256(output), canonicalFixtureSha256: sha256(payload) })
  }

  const manifest = {
    schemaVersion,
    sourceCommit,
    // Generation provenance is retained for audit, but validation below never
    // treats a different host timezone or locale as fixture drift.
    environment: generationProvenance(),
    cases: generated.map(({ payload, inputSha256, expectedSha256, canonicalFixtureSha256 }) => ({
      fixtureId: payload.fixtureId,
      file: `cases/${payload.fixtureId}.json`,
      classification: payload.classification,
      inputSha256,
      expectedSha256,
      canonicalFixtureSha256,
    })),
  }

  if (update) {
    mkdirSync(casesDir, { recursive: true })
    for (const { payload } of generated) {
      const file = join(casesDir, `${payload.fixtureId}.json`)
      const next = canonicalJson(payload)
      const before = existsSync(file) ? readFileSync(file, 'utf8') : ''
      console.log(`DIFF ${basename(file)}\n${diffText(before, next)}`)
      writeFileSync(file, next)
    }
    const nextManifest = canonicalJson(manifest)
    const beforeManifest = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : ''
    console.log(`DIFF manifest.json\n${diffText(beforeManifest, nextManifest)}`)
    writeFileSync(manifestPath, nextManifest)
    console.log(`Updated ${generated.length} golden fixtures with explicit write confirmation`)
    return
  }

  const recorded = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assertManifestIntegrity(recorded, manifest)
  assertManifestTamperingIsRejected(recorded, manifest)
  for (const { payload } of generated) {
    const file = join(casesDir, `${payload.fixtureId}.json`)
    const actual = JSON.parse(readFileSync(file, 'utf8'))
    const diff = firstDifference(canonicalize(actual), canonicalize(payload))
    if (diff) fail(`${payload.fixtureId} mismatch [${diff.class}] at ${diff.path}`)
  }
  console.log(`Plan golden check passed: ${generated.length} cases; deterministic, finite, strict, and mutation-protected`)
}

main().catch((error) => {
  console.error(error?.stack ?? error)
  process.exitCode = 1
})
