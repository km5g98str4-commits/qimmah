// P12 A3 PROOF — machines-only plan generation & opt-in migration.
// Pattern follows scripts/run-p10-integration-qa.mjs (build → vite preview → chromium).
//
// Checks:
//  (s) static: templates (except home-workout) use only machine-catalog ids (+cardio machines
//      in fat-loss finishers); injury ban lists contain no stale legacy ids.
//  (a) legacy fixture: old customization whose plan holds free-weight ids + history records
//      survive reload — plan intact (names still render), history byte-identical (SACRED).
//  (b) switch action («التحويل لنسخة الأجهزة») via UI → regenerated auto plan is 100% catalog
//      machines; history AND saved custom plan byte-identical before/after.
//  (c) fresh profiles matrix (tiers × goals × days × gym access × advanced splits) through the
//      real regenerate flow → every non-cardio exercise ∈ catalog, day counts match target.
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const PORT = 4533
const BASE = `http://localhost:${PORT}`
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ONB_KEY = 'qimmah:onboarding:v1'
const CUS_KEY = 'qimmah:customization:v1'
const CUSTOM_PLAN_KEY = 'qimmah:customPlan:v1'
const HISTORY_PREFIX = 'qimmah:history:'

// أجهزة كارديو خارج كتالوج المقاومة — مسموحة كخواتيم كارديو فقط (fat-loss/addCutCardio).
const CARDIO_ALLOWED = new Set(['treadmill-run', 'stationary-bike', 'rowing-machine'])

// ————— matrix output —————
const rows = []
const check = (name, expected, actual, pass) => {
  rows.push({ name, expected: String(expected), actual: String(actual), pass })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | expected: ${expected} | actual: ${actual}`)
}

// ————— static source extraction (regex on source files — robust for these data files) —————
const catalogSrc = readFileSync('src/data/machineCatalog.ts', 'utf8')
// «الأساسيات» = قائمة زياد الـ٣٢ (PRIMARY_MACHINE_IDS) — لا الكتالوج القابل للتصفّح (٣٨).
// المولّد والقوالب لا يجوز أن تختار أساسيًا خارج هذه القائمة.
const primaryBlock = catalogSrc.slice(
  catalogSrc.indexOf('PRIMARY_MACHINE_IDS'),
  catalogSrc.indexOf('primaryMachineIdSet'),
)
const catalogIds = new Set([...primaryBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]))
// الأجهزة المستبعَدة من الأساسيات (ذراعان/بطن/كيبل) — يجب ألا تظهر أساسيًا في أي قالب/خطة.
const NON_PRIMARY_MACHINES = [
  'preacher-curl-machine', 'cable-biceps-curl', 'triceps-extension-machine',
  'cable-triceps-pushdown', 'ab-crunch-machine', 'cable-crunch',
]

const exercisesSrc = readFileSync('src/data/exercises.ts', 'utf8')
const legacyBlock = exercisesSrc.match(/LEGACY_EXERCISE_ID_MAP[\s\S]*?\n\}/)?.[0] ?? ''
const legacyIds = new Set([...legacyBlock.matchAll(/'([^']+)':\s*'[^']+'/g)].map((m) => m[1]))

function staticChecks() {
  check('primary set extraction', '32 primaries', `${catalogIds.size} primaries`, catalogIds.size === 32)
  check(
    'no arm/abs/cable machine is a primary',
    'none',
    NON_PRIMARY_MACHINES.filter((id) => catalogIds.has(id)).join(',') || 'none',
    NON_PRIMARY_MACHINES.every((id) => !catalogIds.has(id)),
  )

  // — قوالب: كل قالب (عدا home-workout) أجهزة كتالوج فقط (+كارديو مسموح) —
  const tplSrc = readFileSync('src/data/workoutTemplates.ts', 'utf8')
  const tplRe = /\n  \{\n    id: '([^']+)',([\s\S]*?)\n  \},/g
  let m
  let tplCount = 0
  while ((m = tplRe.exec(tplSrc))) {
    const [, tplId, body] = m
    tplCount++
    const ids = [...body.matchAll(/exerciseIds: \[([^\]]*)\]/g)].flatMap((mm) =>
      [...mm[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
    )
    if (tplId === 'home-workout') {
      const nonCatalog = ids.filter((id) => !catalogIds.has(id))
      check(`template ${tplId} keeps home exercises (exempt)`, '>0 non-catalog', `${nonCatalog.length} non-catalog`, nonCatalog.length > 0)
      continue
    }
    const bad = ids.filter((id) => !catalogIds.has(id) && !CARDIO_ALLOWED.has(id))
    check(`template ${tplId}: only catalog machines (+cardio)`, 'no offenders', bad.length ? bad.join(',') : 'no offenders', bad.length === 0)
  }
  check('templates parsed', '11 templates', `${tplCount} templates`, tplCount === 11)

  // — قوائم الإصابات: لا معرّفات قديمة (كائنات التمارين تحمل القانوني) —
  const genSrc = readFileSync('src/lib/planGenerator.ts', 'utf8')
  const injuryBlock = genSrc.match(/INJURY_RISKY_IDS[\s\S]*?\n\}/)?.[0] ?? ''
  const injuryIds = [...injuryBlock.matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1])
  const staleLegacy = [...new Set(injuryIds.filter((id) => legacyIds.has(id)))]
  check('INJURY_RISKY_IDS: no stale legacy ids', 'none', staleLegacy.length ? staleLegacy.join(',') : 'none', staleLegacy.length === 0)
}

// ————— fixtures —————
const planEx = (dayId, exerciseId, order) => ({
  id: `${dayId}-${exerciseId}-${order}`,
  exerciseId,
  sets: 3,
  reps: '8–12',
  restSec: 90,
  startingWeight: '',
  notes: '',
  order,
})

const legacyDay = (id, nameAr, nameEn) => ({
  id,
  nameAr,
  nameEn,
  exercises: ['barbell-bench-press', 'deadlift', 'barbell-back-squat', 'barbell-row'].map((ex, i) => planEx(id, ex, i)),
})

const LEGACY_PLAN = {
  templateId: 'push-pull-legs',
  days: [legacyDay('lp-d1', 'دفع', 'Push'), legacyDay('lp-d2', 'سحب', 'Pull'), legacyDay('lp-d3', 'أرجل', 'Legs')],
}

const baseProfile = {
  name: 'Proof',
  gender: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  targetWeightKg: 80,
  activityLevel: 'moderate',
  trainingLevel: 'intermediate',
  goal: 'maintain',
  goalType: 'maintenance',
  trainingDays: 3,
  workoutDuration: 60,
  workoutEnvironment: 'gym',
  injuries: '',
  healthNotes: '',
  trackNutrition: true,
  mealsPerDay: 3,
  nutritionStyle: 'high_protein',
  dislikedFoods: '',
  consistency: 'regular',
  experienceBand: '1to2y',
  gymAccess: 'full',
}

const LEGACY_CUS = { profile: { ...baseProfile }, workoutPlan: LEGACY_PLAN }

const LEGACY_HISTORY = {
  'qimmah:history:workoutSessions:v1': JSON.stringify([
    {
      id: 'sess-1',
      dateISO: '2026-06-01T10:00:00.000Z',
      dayName: 'دفع',
      exercises: [{ exerciseId: 'barbell-bench-press', sets: [{ weight: 80, reps: 8, done: true }] }],
    },
  ]),
  'qimmah:history:exerciseHistory:v1': JSON.stringify({
    'barbell-bench-press': [{ date: '2026-06-01', weight: 80, reps: 8 }],
  }),
  'qimmah:history:migrated:v1': 'done',
}

const LEGACY_CUSTOM_PLAN = JSON.stringify({
  guest: {
    plan: {
      templateId: 'custom',
      days: [{ id: 'c1', nameAr: 'يومي', nameEn: 'My day', exercises: [planEx('c1', 'barbell-bench-press', 0)] }],
    },
    source: 'custom',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
})

// ————— fresh-profile matrix (c) —————
const TIER = { lt1m: 'beginner', '1to6m': 'beginner', '6to12m': 'novice', '1to2y': 'intermediate', gt2y: 'advanced' }
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
function expectedCount(band, minutes) {
  const base = TIER[band] === 'beginner' || TIER[band] === 'novice' ? 5 : 6
  const m = minutes > 0 ? minutes : 60
  const delta = m <= 30 ? -2 : m <= 45 ? -1 : m <= 60 ? 0 : m <= 75 ? 1 : 2
  return clamp(base + delta, 3, 9)
}

const PROFILES = [
  { tag: 'beg-cut-3d-full', experienceBand: '1to6m', trainingLevel: 'beginner', goalType: 'cutting', goal: 'cut', trainingDays: 3, gymAccess: 'full' },
  { tag: 'beg-bulk-2d-small', experienceBand: '1to6m', trainingLevel: 'beginner', goalType: 'bulking', goal: 'bulk', trainingDays: 2, gymAccess: 'small' },
  { tag: 'beg-maint-5d-full-coreFocus', experienceBand: '1to6m', trainingLevel: 'beginner', goalType: 'maintenance', goal: 'maintain', trainingDays: 5, gymAccess: 'full', muscleFocus: 'core' },
  { tag: 'beg-cut-6d-full', experienceBand: '1to6m', trainingLevel: 'beginner', goalType: 'cutting', goal: 'cut', trainingDays: 6, gymAccess: 'full' },
  { tag: 'nov-health-4d-small', experienceBand: '6to12m', trainingLevel: 'beginner', goalType: 'health', goal: 'maintain', trainingDays: 4, gymAccess: 'small' },
  { tag: 'int-cut-4d-small', experienceBand: '1to2y', trainingLevel: 'intermediate', goalType: 'cutting', goal: 'cut', trainingDays: 4, gymAccess: 'small' },
  { tag: 'int-bulk-5d-full-armsFocus', experienceBand: '1to2y', trainingLevel: 'intermediate', goalType: 'bulking', goal: 'bulk', trainingDays: 5, gymAccess: 'full', muscleFocus: 'arms' },
  { tag: 'int-maint-6d-full', experienceBand: '1to2y', trainingLevel: 'intermediate', goalType: 'maintenance', goal: 'maintain', trainingDays: 6, gymAccess: 'full' },
  { tag: 'adv-bulk-6d-full-ppl', experienceBand: 'gt2y', trainingLevel: 'advanced', goalType: 'bulking', goal: 'bulk', trainingDays: 6, gymAccess: 'full', splitMode: 'advanced', splitChoice: 'push_pull_legs' },
  { tag: 'adv-cut-6d-small-arnold', experienceBand: 'gt2y', trainingLevel: 'advanced', goalType: 'cutting', goal: 'cut', trainingDays: 6, gymAccess: 'small', splitMode: 'advanced', splitChoice: 'arnold' },
  { tag: 'adv-maint-4d-full-bro-90min', experienceBand: 'gt2y', trainingLevel: 'advanced', goalType: 'maintenance', goal: 'maintain', trainingDays: 4, gymAccess: 'full', splitMode: 'advanced', splitChoice: 'bro_split', workoutDuration: 90 },
  { tag: 'adv-recomp-5d-full-75min', experienceBand: 'gt2y', trainingLevel: 'advanced', goalType: 'recomposition', goal: 'cut', trainingDays: 5, gymAccess: 'full', workoutDuration: 75 },
  { tag: 'adv-bulk-7d-full', experienceBand: 'gt2y', trainingLevel: 'advanced', goalType: 'bulking', goal: 'bulk', trainingDays: 7, gymAccess: 'full' },
]

// ————— browser helpers —————
async function seedAndLoad(page, { cus, extra = {} }, hash = '') {
  await page.goto(BASE)
  await page.evaluate(
    ({ ONB_KEY, CUS_KEY, cus, extra }) => {
      localStorage.clear()
      localStorage.setItem(ONB_KEY, JSON.stringify({ completed: true, completedAt: '2026-01-01T00:00:00.000Z' }))
      if (cus) localStorage.setItem(CUS_KEY, JSON.stringify(cus))
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v)
    },
    { ONB_KEY, CUS_KEY, cus, extra },
  )
  await page.goto(`${BASE}/${hash}`)
  await page.reload()
}

const readKey = (page, key) => page.evaluate((k) => localStorage.getItem(k), key)

const historySnapshot = (page, prefix) =>
  page.evaluate((p) => {
    const out = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(p)) out[k] = localStorage.getItem(k)
    }
    return out
  }, prefix)

const sameSnapshot = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** يقرأ خطة التمرين من التخصيص المحفوظ ويقسم عناصرها: مقاومة (بلا لاحقة كارديو) / كارديو. */
async function readPlan(page) {
  const raw = await readKey(page, CUS_KEY)
  const cus = JSON.parse(raw ?? '{}')
  return cus.workoutPlan
}
const splitCardio = (day) => ({
  resistance: day.exercises.filter((pe) => !String(pe.id).endsWith('-cardio')),
  cardio: day.exercises.filter((pe) => String(pe.id).endsWith('-cardio')),
})

async function clickSettingsAction(page, label) {
  await page.locator(`button:has-text("${label}")`).first().click()
  await sleep(600)
}

async function main() {
  console.log('== building ==')
  execSync('npm run build', { stdio: 'pipe' })
  console.log('build OK')

  staticChecks()

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  try {
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(BASE)
        if (r.ok) break
      } catch {
        /* not up yet */
      }
      await sleep(500)
    }

    const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] })
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } })
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(String(e)))
    page.on('dialog', (d) => d.accept().catch(() => {}))

    // ———— (a) legacy fixture: reload keeps free-weight plan + history byte-identical ————
    await seedAndLoad(page, { cus: LEGACY_CUS, extra: { ...LEGACY_HISTORY, [CUSTOM_PLAN_KEY]: LEGACY_CUSTOM_PLAN } }, '#/workout')
    await sleep(1500)
    const bodyText = await page.evaluate(() => document.body.innerText)
    check('(a) legacy free-weight name renders in workout view', 'shows «بنش بريس بار»', bodyText.includes('بنش بريس بار') ? 'shown' : 'missing', bodyText.includes('بنش بريس بار'))
    const planAfterReload = await readPlan(page)
    const legacyIdsFlat = planAfterReload.days.flatMap((d) => d.exercises.map((pe) => pe.exerciseId))
    const legacyIntact = legacyIdsFlat.length === 12 && legacyIdsFlat.every((id) => ['barbell-bench-press', 'deadlift', 'barbell-back-squat', 'barbell-row'].includes(id))
    check('(a) legacy plan intact after reload (no silent rewrite)', '12 free-weight ids kept', `${legacyIdsFlat.length} ids, intact=${legacyIntact}`, legacyIntact)
    const histA = await historySnapshot(page, HISTORY_PREFIX)
    const histSeedOk = Object.entries(LEGACY_HISTORY).every(([k, v]) => histA[k] === v)
    check('(a) history byte-identical after reload', 'all seeded keys identical', histSeedOk ? 'identical' : 'MUTATED', histSeedOk)

    // ———— (b) switch action via UI ————
    const histBefore = await historySnapshot(page, HISTORY_PREFIX)
    const customBefore = await readKey(page, CUSTOM_PLAN_KEY)
    await page.goto(`${BASE}/#/settings`)
    await sleep(1200)
    await clickSettingsAction(page, 'التحويل لنسخة الأجهزة')
    const planB = await readPlan(page)
    const bIds = planB.days.flatMap((d) => splitCardio(d).resistance.map((pe) => pe.exerciseId))
    const bAccSet = new Set(NON_PRIMARY_MACHINES)
    const bBad = bIds.filter((id) => !catalogIds.has(id) && !bAccSet.has(id))
    check('(b) switch → plan = 32 primaries + accessory pool only', 'no offenders', bBad.length ? bBad.join(',') : 'no offenders', bBad.length === 0)
    check('(b) switch → day count preserved', '3 days', `${planB.days.length} days`, planB.days.length === 3)
    const histAfter = await historySnapshot(page, HISTORY_PREFIX)
    check('(b) history byte-identical across switch', 'identical', sameSnapshot(histBefore, histAfter) ? 'identical' : 'MUTATED', sameSnapshot(histBefore, histAfter))
    const customAfter = await readKey(page, CUSTOM_PLAN_KEY)
    check('(b) saved custom plan untouched by switch', 'identical', customBefore === customAfter ? 'identical' : 'MUTATED', customBefore === customAfter)

    // ———— (c) fresh profiles matrix via the real regenerate flow ————
    for (const p of PROFILES) {
      const profile = { ...baseProfile, workoutDuration: 60, ...p }
      delete profile.tag
      await seedAndLoad(page, { cus: { profile } }, '#/settings')
      await sleep(1200)
      await clickSettingsAction(page, 'إعادة توليد الخطة')
      const plan = await readPlan(page)
      const days = plan?.days ?? []
      // كل يوم: أساسيات من الـ٣٢ + إضافة واحدة اختيارية (من الستة) تُلحَق أخيرًا.
      const accSet = new Set(NON_PRIMARY_MACHINES)
      const resistancePerDay = days.map((d) => splitCardio(d).resistance.map((pe) => pe.exerciseId))
      const flat = resistancePerDay.flat()
      const bad = [...new Set(flat.filter((id) => !catalogIds.has(id) && !accSet.has(id)))]
      const target = expectedCount(profile.experienceBand, profile.workoutDuration)
      const perDay = resistancePerDay.map((day) => {
        const acc = day.filter((id) => accSet.has(id))
        const prim = day.filter((id) => !accSet.has(id))
        const accLast = acc.length === 0 || accSet.has(day[day.length - 1])
        return { prim: prim.length, acc: acc.length, accLast }
      })
      const primOk = perDay.every((x) => x.prim === target)
      const accOk = perDay.every((x) => x.acc <= 1 && x.accLast)
      check(`(c) ${p.tag}: machines-only (32 primaries + accessory pool)`, 'no offenders', bad.length ? bad.join(',') : 'no offenders', bad.length === 0)
      check(`(c) ${p.tag}: days match`, `${profile.trainingDays} days`, `${days.length} days`, days.length === profile.trainingDays)
      check(`(c) ${p.tag}: per-day primaries = target`, `${target}/day`, perDay.map((x) => x.prim).join(','), primOk)
      check(`(c) ${p.tag}: ≤1 accessory, always last`, 'yes', perDay.map((x) => `${x.acc}${x.accLast ? '✓' : '✗'}`).join(','), accOk)
      if (profile.goalType === 'cutting' || profile.goalType === 'recomposition') {
        const cardioCount = days.reduce((n, d) => n + splitCardio(d).cardio.length, 0)
        check(`(c) ${p.tag}: cut cardio appended (addCutCardio stays)`, '>=1 cardio finisher', `${cardioCount}`, cardioCount >= 1)
      }
    }

    check('no uncaught page errors', 'none', pageErrors.length ? pageErrors.slice(0, 2).join(' | ') : 'none', pageErrors.length === 0)

    await browser.close()
  } finally {
    server.kill()
  }

  // ———— matrix ————
  console.log('\ncheck | expected | actual | pass')
  console.log('----- | -------- | ------ | ----')
  for (const r of rows) console.log(`${r.name} | ${r.expected} | ${r.actual} | ${r.pass ? 'PASS' : 'FAIL'}`)
  const failed = rows.filter((r) => !r.pass)
  console.log(`\n${failed.length === 0 ? 'P12 A3 PROOF — ALL GREEN' : failed.length + ' CHECK(S) FAILED'}`)
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
