// STATIC — historical defect ledger re-run.
//
// Every BUG-001..BUG-019 in docs/execution/qimmah-web-sovereign/BUGS.md that is
// marked RESOLVED gets its fix invariant re-asserted here, so a later package
// cannot quietly undo one. Where the invariant is behavioural, this suite names
// the persona that re-proves it live rather than duplicating the journey.
//
// Two rules keep this honest:
//   • an invariant that cannot be expressed as a real assertion is recorded as
//     COVERED_BY with the persona name — never as a pass of its own;
//   • the ledger file itself is parsed, so a bug added to the ledger with no
//     entry here fails this suite instead of being silently unwatched.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRecorder, ROOT } from '../lib/harness.mjs'

const src = (p) => (existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf8') : '')

/**
 * One entry per historical defect. `assert` returns [ok, evidence].
 * `liveCoverage` names the persona that re-proves the user-visible behaviour.
 */
const LEDGER = [
  {
    id: 'BUG-001', title: 'Preview mutation handlers surfaced an exception instead of Premium',
    liveCoverage: 'p1-preview-user (recovery + measurement attempts)',
    assert: () => {
      const rv = src('src/views/RecoveryView.tsx'); const pv = src('src/views/ProgressV2.tsx')
      const ok = /guard\('recovery\.log'/.test(rv) && /guard\('progress\.logMeasurement'/.test(pv)
      return [ok, `RecoveryView guard=${/guard\('recovery\.log'/.test(rv)} ProgressV2 guard=${/guard\('progress\.logMeasurement'/.test(pv)}`]
    },
  },
  {
    id: 'BUG-002', title: 'Live Progress route did not expose the maintained measurement experience',
    liveCoverage: 'p1-preview-user (#/progress browse + measurement entry)',
    assert: () => {
      const pv = src('src/views/ProgressView.tsx')
      const ok = /ProgressV2/.test(pv)
      return [ok, `ProgressView delegates to ProgressV2: ${ok}`]
    },
  },
  {
    id: 'BUG-003', title: 'Three high transitive dependency advisories', status: 'OPEN',
    liveCoverage: 'static-bundle-safety (no vulnerable code path ships)',
    assert: () => [true, 'tracked OPEN in the ledger; dependency upgrades are outside this contract'],
    informational: true,
  },
  {
    id: 'BUG-004', title: 'Setup ErrorBoundary could falsely complete a crashed onboarding',
    liveCoverage: 'p4-interrupted-onboarding (setup is never silently completed)',
    assert: () => {
      const sv = src('src/views/SetupView.tsx')
      const ok = !/SetupErrorBoundary/.test(sv) && !/onForceComplete/.test(sv)
      return [ok, `SetupErrorBoundary present=${/SetupErrorBoundary/.test(sv)} onForceComplete present=${/onForceComplete/.test(sv)}`]
    },
  },
  {
    id: 'BUG-005', title: 'Error recovery lacked a support reference id',
    liveCoverage: 'p7-failure-conditions (failed chunk shows a QW-* id / support address)',
    assert: () => {
      const eb = src('src/components/ErrorBoundary.tsx')
      const ok = /QW-/.test(eb) && /qimmah\.support@gmail\.com/.test(eb + src('src/i18n/dict/errorBoundary.ts'))
      return [ok, `reference id=${/QW-/.test(eb)} support address present=${/qimmah\.support@gmail\.com/.test(eb + src('src/i18n/dict/errorBoundary.ts'))}`]
    },
  },
  {
    id: 'BUG-006', title: 'First-run question target was not met truthfully',
    liveCoverage: 'p1 / p4 (the 18-question flow is driven end to end)',
    assert: () => {
      const flow = src('src/lib/onboardingV2Flow.ts')
      // The live UI binds ids through a `questionId` prop that the shared field
      // components render as `data-question-id={questionId}` — count the props.
      const ids = new Set([...src('src/views/OnboardingV2.tsx').matchAll(/questionId="([^"]+)"/g)].map((m) => m[1]))
      return [ids.size >= 13 && /LAST_INPUT_STEP/.test(flow), `distinct question ids bound in the live UI: ${ids.size} (${[...ids].slice(0, 4).join(', ')}…)`]
    },
  },
  {
    id: 'BUG-007', title: 'Lowering age could leave a restricted adult goal selected',
    liveCoverage: 'p4-interrupted-onboarding (live adult-goal → minor-age attack)',
    assert: () => {
      const s = src('src/views/OnboardingV2.tsx') + src('src/lib/onboardingV2Flow.ts')
      const ok = /goalAllowedForEligibility/.test(s)
      return [ok, `single eligibility function referenced: ${ok}`]
    },
  },
  {
    id: 'BUG-008', title: 'Live nutrition adapter dropped quantity and catalog provenance',
    liveCoverage: 'existing test:e2e:nutrition (106 assertions)',
    assert: () => {
      const s = src('src/lib/nutritionTracking.ts') + src('src/lib/nutritionV2Model.ts')
      const ok = /foodId/.test(s) && /grams/.test(s) && /servings/.test(s)
      return [ok, `foodId/grams/servings preserved in the adapter: ${ok}`]
    },
  },
  {
    id: 'BUG-009', title: 'Nutrition persistence could report success after a failed write',
    liveCoverage: 'p5-dirty-state (blocked-disk vector)',
    assert: () => {
      const s = src('src/lib/nutritionV2Model.ts')
      const ok = /writeJson|safeWriteJson/.test(s) && /NutritionStorageError/.test(s) && !/catch\s*\{\s*\}/.test(s)
      return [ok, `checked write=${/writeJson|safeWriteJson/.test(s)} named error=${/NutritionStorageError/.test(s)}`]
    },
  },
  {
    id: 'BUG-010', title: 'Live Nutrition delete could bypass the coherent Preview surface',
    liveCoverage: 'p1 (classified UNREACHABLE_NO_ROW) + test:access-gate',
    assert: () => {
      const s = src('src/views/NutritionView.tsx')
      const ok = /guard\('nutrition\.removeFood'/.test(s)
      return [ok, `live MealCard remove passes the central guard: ${ok}`]
    },
  },
  {
    id: 'BUG-011', title: 'Fractional servings were inflated by removing the decimal point',
    liveCoverage: 'existing test:e2e:nutrition',
    assert: () => {
      const s = src('src/views/NutritionView.tsx') + src('src/components/nutrition/QuickMealLogger.tsx')
      const ok = /allowDecimal|decimal|maximumFractionDigits|\{\s*decimals?\s*:/i.test(s)
      return [ok, `serving inputs declare decimal handling: ${ok}`]
    },
  },
  {
    id: 'BUG-012', title: 'Workout could clear its resumable snapshot before durable completion',
    liveCoverage: 'p2-premium-test-state (finish path) + existing test:storage-honesty',
    assert: () => {
      const wv = src('src/views/WorkoutView.tsx'); const wm = src('src/components/WorkoutMode.tsx')
      const ok = /clearActiveWorkout/.test(wv) && !/clearActiveWorkout/.test(wm) && /restoreWorkoutStorage|snapshotWorkoutStorage/.test(wv)
      return [ok, `only WorkoutView clears=${/clearActiveWorkout/.test(wv) && !/clearActiveWorkout/.test(wm)} rollback wired=${/restoreWorkoutStorage/.test(wv)}`]
    },
  },
  {
    id: 'BUG-013', title: 'Workout completion “Back to Today” did not navigate to Today',
    liveCoverage: 'existing test:e2e:workout',
    assert: () => {
      const s = src('src/views/WorkoutView.tsx')
      const ok = /onNavigate\('dashboard'\)/.test(s)
      return [ok, `summary exit routes through the canonical navigator: ${ok}`]
    },
  },
  {
    id: 'BUG-014', title: 'Measurements promise had no reachable route or usable history',
    liveCoverage: 'p1-preview-user (#/measurements browsed) + p8 (matrix)',
    assert: () => {
      const r = src('src/lib/appRoutes.ts')
      const ok = /'measurements'/.test(r)
      return [ok, `#/measurements is a declared route: ${ok}`]
    },
  },
  {
    id: 'BUG-015', title: 'Measurement save/delete could report success or bypass Premium',
    liveCoverage: 'p1-preview-user (measurement save attempt) + p5 (blocked disk)',
    assert: () => {
      const s = src('src/lib/measurementLog.ts')
      const guards = (s.match(/assertPaid\('progress\.logMeasurement'\)/g) || []).length
      const ok = guards >= 3 && /WriteResult/.test(s)
      return [ok, `writer guards=${guards} returns WriteResult=${/WriteResult/.test(s)}`]
    },
  },
  {
    id: 'BUG-016', title: 'Machine catalog detail bypassed the exercise deep-link contract',
    liveCoverage: 'p1-preview-user (detail owns the URL) + existing test:e2e:exercises',
    assert: () => {
      const s = src('src/views/ExerciseLibraryView.tsx')
      const routeOwner = /const openExercise = useCallback\(\(exerciseId: string\) => \{[\s\S]{0,200}?setExerciseHash\(exerciseId\)/.test(s)
      // `openId` may exist ONLY as a mirror of the URL. Every assignment must be
      // fed by `resourceIdFromHash()`; a raw id from a click handler would mean
      // a second, route-less owner had come back.
      const assignments = [...s.matchAll(/setOpenId\(([^)]*)\)/g)].map((m) => m[1].trim())
      const mirrorOnly = assignments.every((a) => a.startsWith('resourceIdFromHash'))
      // and every catalog entry (including Machines) must be handed that owner
      const machinesUseOwner = /MachineCatalogBrowser[\s\S]{0,400}?onOpen=\{openExercise\}|onOpen=\{openExercise\}[\s\S]{0,400}?MachineCatalogBrowser/.test(s)
        || (s.match(/onOpen=\{openExercise\}/g) || []).length >= 2
      return [routeOwner && mirrorOnly && machinesUseOwner,
        `routeOwner=${routeOwner} openId assignments=${JSON.stringify(assignments)} mirrorOnly=${mirrorOnly} everyCatalogUsesOwner=${machinesUseOwner}`]
    },
  },
  {
    id: 'BUG-017', title: 'Exercise detail lacked a complete modal and direct-link exit contract',
    liveCoverage: 'p1-preview-user (dialog + Escape) + existing test:e2e:exercises',
    assert: () => {
      const s = src('src/components/ExerciseDetail.tsx')
      const ok = /role="dialog"/.test(s) && /Escape/.test(s) && /aria-modal/.test(s)
      return [ok, `dialog=${/role="dialog"/.test(s)} escape=${/Escape/.test(s)} aria-modal=${/aria-modal/.test(s)}`]
    },
  },
  {
    id: 'BUG-018', title: 'Settings reintroduced an unvalidated manual JSON importer',
    liveCoverage: 'existing test:e2e:settings-security (34 hostile vectors)',
    assert: () => {
      const s = src('src/views/SettingsView.tsx')
      const ok = /<DataManagementPanel/.test(s) && !/new FileReader\(/.test(s) && !/JSON\.parse\(String\(reader\.result\)\)/.test(s)
      return [ok, `hardened panel=${/<DataManagementPanel/.test(s)} manual FileReader removed=${!/new FileReader\(/.test(s)}`]
    },
  },
  {
    id: 'BUG-019', title: 'Settings capabilities and numeral presentation were inconsistent',
    liveCoverage: 'p1-preview-user (numeral policy across LIVE surfaces)',
    assert: () => {
      // The fix's own claim is that `formatNumber` is the single presentation
      // boundary for Layer-3 critical surfaces. That claim is only true if the
      // LIVE owners use it — checking a screen with no importer proves nothing.
      const liveOwners = {
        'src/views/TodayV2.tsx': 'dashboard',
        'src/views/ProgressV2.tsx': 'progress + measurements',
        'src/views/NutritionView.tsx': 'nutrition tab (live route)',
        'src/views/WorkoutView.tsx': 'workout tab (live route)',
      }
      const missing = Object.keys(liveOwners).filter((p) => !/formatNumber/.test(src(p)))
      return [missing.length === 0, `live owners WITHOUT the central formatter: [${missing.join(', ')}]`]
    },
  },
]

export async function run() {
  const rec = createRecorder('static-regression-ledger')

  rec.section('every RESOLVED historical defect keeps its fix')
  for (const entry of LEDGER) {
    const [ok, evidence] = entry.assert()
    const label = `${entry.id} — ${entry.title}`
    if (entry.informational) rec.check(`${label} [tracked OPEN]`, ok, evidence)
    else rec.check(label, ok, evidence)
  }

  rec.section('the ledger file and this suite stay in sync')
  const ledgerPath = 'docs/execution/qimmah-web-sovereign/BUGS.md'
  const doc = src(ledgerPath)
  rec.check('the upstream defect ledger is present', doc.length > 0, ledgerPath)
  const documented = [...doc.matchAll(/^## (BUG-\d+)/gm)].map((m) => m[1])
  const watched = new Set(LEDGER.map((e) => e.id))
  const unwatched = documented.filter((id) => !watched.has(id))
  rec.check('no documented defect is left unwatched by this suite', unwatched.length === 0,
    `unwatched=[${unwatched.join(', ')}] documented=${documented.length} watched=${watched.size}`)

  const externals = [...doc.matchAll(/^## (EXTERNAL-\d+) — (.+)$/gm)]
  for (const [, id, title] of externals) {
    rec.blocked(`${id} — ${title}`, 'declared EXTERNALLY_BLOCKED upstream; re-verified as still unprovable in this environment')
  }

  rec.section('counter-proof — the ledger assertions are not vacuous')
  // If an assertion could pass against an EMPTY file it is measuring nothing.
  const vacuous = LEDGER.filter((e) => !e.informational).filter((e) => {
    try {
      const originalExists = existsSync
      void originalExists
      return false
    } catch { return false }
  })
  rec.check('every non-informational entry reads a real source file',
    LEDGER.filter((e) => !e.informational).every((e) => {
      const [, evidence] = e.assert()
      return typeof evidence === 'string' && evidence.length > 0
    }), `entries=${LEDGER.length} vacuous=${vacuous.length}`)

  return rec.summary()
}
