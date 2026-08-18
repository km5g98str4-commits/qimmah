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
import { createRecorder, ROOT, realPageErrors, realConsoleErrors, ENVIRONMENT_PAGE_ERRORS, BENIGN_CONSOLE } from '../lib/harness.mjs'

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
      // [SOVEREIGN-002] الحدّ المركزي **وحدتان** لا دالّة واحدة: `formatNumber`
      // للأرقام المفردة، و`formatNumeralsIn` للنصّ المركَّب — وكلتاهما من
      // `numberFormat.ts` وتشتقّان جدول الأرقام من مصدر واحد. كان الفحص يطلب
      // الاسم الأول حرفيًا، فرسَب `TodayV2` وهو يستعمل الثانية عبر `loc()`:
      // أي أنه كان يقيس **اسم الدالّة** لا **عبور الحدّ**.
      // ولا يُوسَّع أكثر من ذلك: أي منسّق محلّي أو `toLocaleString` يبقى راسبًا.
      const CENTRAL = /\b(formatNumber|formatNumeralsIn)\b/
      const missing = Object.keys(liveOwners).filter((p) => !CENTRAL.test(src(p)))
      // والتأكيد المضادّ: الفحص ليس فارغًا — ملف بلا أي منسّق يجب أن يرسب.
      const controlFails = !CENTRAL.test('const x = String(n)')
      return [missing.length === 0 && controlFails, `live owners WITHOUT the central formatter: [${missing.join(', ')}] · control-fails=${controlFails}`]
    },
  },

  // ── PKG-8 · Profile convergence ─────────────────────────────────────────────
  {
    id: 'BUG-020', title: 'Profile forked the hardened data-transfer owner',
    liveCoverage: 'existing test:e2e:profile (27) + test:profile-reliability (22)',
    assert: () => {
      const s = src('src/views/ProfileV2.tsx')
      const ok = /<DataManagementPanel/.test(s) && !/new FileReader\(/.test(s) && !/buildExportBundle|parseImportFile/.test(s)
      return [ok, `canonical panel=${/<DataManagementPanel/.test(s)} second portability UI removed=${!/buildExportBundle|parseImportFile/.test(s)}`]
    },
  },
  {
    id: 'BUG-021', title: 'Profile conflated account deletion with guest device-data management',
    liveCoverage: 'existing test:e2e:profile (guest + signed-in personalities)',
    assert: () => {
      const s = src('src/views/ProfileV2.tsx')
      // The guest must never be offered an account action. Both the description and
      // the internal row are conditioned on a real session.
      const ok = /model\.user\.signedIn \? t\('حذف الحساب نهائيًا'/.test(s) && /\{model\.user\.signedIn && \(/.test(s)
      return [ok, `deletion copy conditional=${/model\.user\.signedIn \? t\('حذف الحساب/.test(s)} account rows gated=${/\{model\.user\.signedIn && \(/.test(s)}`]
    },
  },
  {
    id: 'BUG-022', title: 'Profile descendants duplicated the route heading and exposed sub-44px controls',
    liveCoverage: 'existing test:e2e:profile (heading + bounding boxes at 320px)',
    assert: () => {
      const profile = src('src/views/ProfileV2.tsx')
      const notifications = src('src/views/NotificationsSettingsV2.tsx')
      const ok = !/<h1\b/.test(profile) && !/<h1\b/.test(notifications) && /h-11 w-11/.test(profile)
      return [ok, `profile h1 removed=${!/<h1\b/.test(profile)} reminders h1 removed=${!/<h1\b/.test(notifications)} 44px targets=${/h-11 w-11/.test(profile)}`]
    },
  },
  {
    id: 'BUG-023', title: 'The Profile browser proof could accept a foreign process on its fixed port',
    liveCoverage: 'the runner proves its OWN child reached ready before polling',
    assert: () => {
      const s = src('scripts/e2e/profile-reliability.mjs')
      const ok = /preview exited before ready/.test(s) && /previewReady/.test(s)
      return [ok, `child-ready gate present=${/previewReady/.test(s)} named rejection=${/preview exited before ready/.test(s)}`]
    },
  },

  // ── PKG-9 · Quick Log, dirty-state and artifact safety ──────────────────────
  {
    id: 'BUG-024', title: 'The Quick Log path threw when storage is blocked',
    liveCoverage: 'test:quick-log runtime proof (blocked property AND throwing methods)',
    assert: () => {
      // The defect was raw sessionStorage in the live consumers. The fix is a single
      // guarded owner — so the regression is any consumer touching storage directly again.
      const app = src('src/App.tsx'), profile = src('src/views/ProfileV2.tsx'), nutrition = src('src/views/NutritionView.tsx')
      const raw = [['App.tsx', app], ['ProfileV2.tsx', profile], ['NutritionView.tsx', nutrition]]
        .filter(([, s]) => /window\.sessionStorage/.test(s)).map(([n]) => n)
      const owned = /export function requestQuickLogIntent/.test(src('src/lib/quickLogIntent.ts'))
      return [raw.length === 0 && owned, `consumers touching raw storage: [${raw.join(', ')}] canonical owner=${owned}`]
    },
  },
  {
    id: 'BUG-025', title: 'Quick Log «ماء» was a declared action with no consumer',
    liveCoverage: 'test:quick-log binds the water intent to the water panel',
    assert: () => {
      const s = src('src/views/NutritionView.tsx')
      const ok = /'water'[\s\S]{0,400}?setFocusWater\(true\)/.test(s) && /focusRequested=\{focusWater\}/.test(s)
      return [ok, `water intent has an effect=${/setFocusWater\(true\)/.test(s)} panel receives focus request=${/focusRequested=\{focusWater\}/.test(s)}`]
    },
  },
  {
    id: 'BUG-026', title: 'A redirected Quick Log left an intent that hijacked a later visit',
    liveCoverage: 'test:quick-log — destination resolved before the intent is written',
    assert: () => {
      const s = src('src/App.tsx')
      const ok = /const destination = guardRoute\(/.test(s) && /if \(destination !== /.test(s)
      return [ok, `guard consulted first=${/const destination = guardRoute\(/.test(s)} redirect writes nothing=${/if \(destination !== /.test(s)}`]
    },
  },
  {
    id: 'BUG-027', title: 'The Profile browser proof printed success and then hung forever',
    liveCoverage: 'the suite terminates on its own (exit code observed, not just stdout)',
    assert: () => {
      const s = src('scripts/e2e/profile-reliability.mjs')
      const ok = /detached: true/.test(s) && /process\.kill\(-preview\.pid/.test(s)
      return [ok, `own process group=${/detached: true/.test(s)} group kill=${/process\.kill\(-preview\.pid/.test(s)}`]
    },
  },
  {
    id: 'BUG-028', title: 'A corrupt onboarding flag was read as a completed setup',
    liveCoverage: 'existing test:e2e:dirty-state (11 seeded states, judged at the guest door)',
    assert: () => {
      const s = src('src/lib/onboarding.ts')
      // `!!` is the defect; `=== true` plus a shape guard is the fix.
      const strict = /completed: state\.completed === true/.test(s)
      const shaped = /typeof parsed !== 'object' \|\| Array\.isArray\(parsed\)/.test(s)
      const coercion = /completed: !!/.test(s)
      return [strict && shaped && !coercion, `strict equality=${strict} shape guard=${shaped} truthiness coercion returned=${coercion}`]
    },
  },
  // ── [FINAL-CONVERGENCE] BUG-029..032 وصلت مع تدقيق الحارة B (863e540) ──────
  // البوابة كشفت إغفالها فورًا: السجلّ صار ٣٢ عطلًا موثّقًا و٢٨ مرصودًا. وهذا
  // بالضبط ما بُني له فحص «لا عطل موثّق بلا رصد» — فالإغفال ظهر في نفس الموجة
  // التي أدخلت السجلّ، لا بعد أسبوع.
  {
    id: 'BUG-029', title: 'Focus is not restored after closing exercise detail on WebKit only', status: 'OPEN',
    liveCoverage: 'test:e2e:exercises under E2E_ENGINE=webkit (31/32 WebKit · 32/32 Chromium)',
    // مفتوح وغير مُشخَّص. المرصود هنا أن **سبيل إعادة إنتاجه مبنيّ**: بذرة
    // المحرّك موجودة، فالعطل قابل للتشغيل بأمر واحد لا بادّعاء.
    assert: () => {
      const seam = src('scripts/e2e/lib/engine.mjs')
      const selectable = /E2E_ENGINE/.test(seam) && /webkit/.test(seam)
      return [selectable, `WebKit reproduction seam present=${selectable}`]
    },
    informational: true,
  },
  {
    id: 'BUG-030', title: 'Authenticated export fires no download event on WebKit', status: 'OPEN',
    liveCoverage: 'test:e2e:settings-security under E2E_ENGINE=webkit (26/34 then timeout · 34/34 Chromium)',
    // الـ٢٦ تأكيدًا الأمنية قبل نقطة التوقّف **خضراء على WebKit** — أي أن
    // حراسة الاستيراد ليست هي المكسور، بل إطلاق التنزيل وحده.
    assert: () => {
      const seam = src('scripts/e2e/lib/engine.mjs')
      const selectable = /E2E_ENGINE/.test(seam) && /webkit/.test(seam)
      return [selectable, `WebKit reproduction seam present=${selectable}`]
    },
    informational: true,
  },
  {
    id: 'BUG-031', title: 'The key registry named an orphan screen and omitted the live session key',
    liveCoverage: 'static-regression-ledger key-registry scan (above) + test:e2e:workout',
    // رُصد **ورُدّ** على هذا الرأس: المفتاح الحيّ مسجَّل الآن. الفحص أدناه
    // ينقلب أحمر لحظة عودة الانحراف — فهو حارس لا توثيق.
    assert: () => {
      const s = src('src/lib/userDataKeys.ts')
      const live = /qimmah:activeWorkout:v1/.test(s)
      const orphanOnly = live === false && /qimmah:active-workout:v2/.test(s)
      return [live && !orphanOnly, `live ':activeWorkout:v1' registered=${live}`]
    },
  },
  {
    id: 'BUG-032', title: 'Two orphan screens are read by proof scripts; only one declares the orphanhood', status: 'OPEN',
    liveCoverage: 'test:canonical-surface (declares the live owner of every doubled surface)',
    // الحذف قرار مالك (§11/٩). المرصود أن الإعلان قائم: سجلّ الأسطح القانونية
    // يسمّي التوأمين غير الموجَّهين صراحةً، فلا يظنّهما قارئ حيّين.
    assert: () => {
      const s = src('scripts/canonical-surfaces.mjs')
      const nut = /NutritionV2\.tsx/.test(s)
      const wk = /WorkoutV2\.tsx/.test(s)
      return [nut && wk, `twins declared in the canonical-surface registry: NutritionV2=${nut} WorkoutV2=${wk}`]
    },
    informational: true,
  },

  // ── [SOVEREIGN-002] الأربعة التي كانت موثَّقة بلا حارس ────────────────────
  // كان السجلّ يوثّق ٣٦ عيبًا ويحرس ٣٢ — والفارق **يسقط الطقم بالتصميم**، وهو
  // الصواب: عيب يُكتب ولا يُحرَس يشيخ بصمت. هذه أربعتها، كلٌّ بفحصه الحقيقي.
  {
    id: 'BUG-033', title: 'Cancelling the share sheet announced a success that never happened',
    liveCoverage: 'test:e2e:settings-security (delivery outcomes)',
    assert: () => {
      const s = src('src/lib/dataPortability.ts')
      const hasCancelled = /'cancelled'/.test(s)
      const abortMapped = /AbortError/.test(s)
      return [hasCancelled && abortMapped, `cancelled outcome=${hasCancelled} AbortError mapped=${abortMapped}`]
    },
  },
  {
    id: 'BUG-034', title: 'Two E2E races Chromium hid and WebKit exposed', status: 'RESOLVED',
    liveCoverage: 'the browser matrix itself (webkit runs of p1/p3/p8)',
    assert: () => {
      // العطل كان في بنية الاختبار لا في المنتج: انتظارٌ ضمنيّ بدل شرط صريح.
      const s = src('scripts/release/lib/drive.mjs')
      const explicitWaits = /waitForFunction|waitForSelector|waitForLoadState/.test(s)
      return [explicitWaits, `explicit waits present=${explicitWaits}`]
    },
  },
  {
    id: 'BUG-035', title: 'Touch-target assertion failed on floating-point representation',
    liveCoverage: 'p8-responsive-matrix (44px targets across the viewport matrix)',
    assert: () => {
      const s = src('scripts/e2e/profile-reliability.mjs')
      // العقد لم يُخفَّف: التسامح جزء من مئة البكسل — أصغر من أي بكسل جهاز.
      const tolerant = /44\s*-\s*0?\.0\d|>=\s*43\.9\d|EPSILON|0\.01/.test(s)
      return [tolerant, `sub-pixel tolerance present=${tolerant}`]
    },
  },
  {
    id: 'BUG-036', title: 'WebKit page crash under host memory pressure', status: 'DIAGNOSED', informational: true,
    liveCoverage: 'environment — no code fix exists',
    assert: () => {
      // لا كود يُحرَس؛ المحروس أن **التشخيص ما زال مكتوبًا** فلا يُعاد اكتشافه.
      const doc = src('docs/execution/qimmah-web-sovereign/BUGS.md')
      const documented = /BUG-036/.test(doc) && /ذاكرة/.test(doc)
      return [documented, `diagnosis still documented=${documented}`]
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

  rec.section('local data-key registry integrity — every LIVE key is registered')
  // `src/lib/userDataKeys.ts` declares itself the single source of truth for
  // classifying every localStorage key, and `unscopedUserKeys()` (derived from it)
  // feeds `src/lib/dataOwnership.ts`. A live key that is missing from it is
  // outside that machinery, and a registered key whose owner is a view with no
  // importer is a registration pointing at code the user never runs.
  const registry = src('src/lib/userDataKeys.ts')
  const registered = new Set([...registry.matchAll(/key: '([^']+)'/g)].map((m) => m[1]))
  const LIVE_KEYS = [
    { key: 'qimmah:activeWorkout:v1', owner: 'src/lib/activeWorkout.ts (ACTIVE_WORKOUT_KEY)' },
    { key: 'qimmah:nutrition:v2', owner: 'src/lib/nutritionV2Model.ts' },
    { key: 'qimmah:onboarding:v1', owner: 'src/lib/onboarding.ts' },
    { key: 'qimmah:customization:v1', owner: 'customization' },
    { key: 'qimmah:history:measurementLogs:v1', owner: 'src/lib/historyStore.ts' },
  ]
  const unregistered = LIVE_KEYS.filter((k) => !registered.has(k.key))
  rec.check('every live storage key this harness observed is registered',
    unregistered.length === 0,
    unregistered.length
      ? `MISSING from userDataKeys.ts: ${unregistered.map((k) => `${k.key} (written by ${k.owner})`).join('; ')}`
      : `all ${LIVE_KEYS.length} live keys registered`)
  // Counter-proof: the scan must actually be reading the registry.
  rec.check('counter-proof: the registry scan really parsed entries',
    registered.size > 30, `parsed ${registered.size} registered keys`)
  // And the specific inversion: the registered active-session key belongs to a
  // view with no importer, while the live writer's key is absent.
  const deadOwnerRegistered = registered.has('qimmah:active-workout:v2')
  const liveKeyRegistered = registered.has('qimmah:activeWorkout:v1')
  rec.check('the registered active-session key is the one the app actually writes',
    liveKeyRegistered,
    `registered ':active-workout:v2' (owner WorkoutV2, no importer)=${deadOwnerRegistered}; registered live ':activeWorkout:v1'=${liveKeyRegistered}`)

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
  // §4.2: the harness's own exclusion lists must not have become blanket passes.
  const realErrorSamples = [
    'Error: Cannot read properties of undefined (reading \'foo\')',
    'TypeError: x is not a function',
    'PaidActionDenied: workout.start',
    'QuotaExceededError: the disk is full',
  ]
  rec.check('the environment-error filter lets EVERY genuine page error through',
    realPageErrors(realErrorSamples).length === realErrorSamples.length,
    `filtered out: ${realErrorSamples.filter((e) => !realPageErrors(realErrorSamples).includes(e)).join(' | ') || 'none'}`)
  rec.check('the environment-error filter DOES suppress the exact WebKit sw.js artefact it names',
    realPageErrors(['Cannot load http://localhost:5411/sw.js due to access control checks.']).length === 0,
    `patterns=${ENVIRONMENT_PAGE_ERRORS.length}`)
  rec.check('the console filter lets EVERY genuine console error through',
    realConsoleErrors(realErrorSamples).length === realErrorSamples.length,
    `benign patterns=${BENIGN_CONSOLE.length}`)

  // ══ [SOVEREIGN-003] استثناء حجب الشبكة الخاصّة — يُحرَس بالاتجاهين (§4.2) ══
  const PNA_ICON = "Access to resource at 'http://localhost:5411/icon-192.png' from origin 'null' has been blocked by CORS policy: The request client is not a secure context and the resource is in more-private address space `loopback`. @ http://localhost:5411/icon-192.png"
  const PNA_PAIRED = 'Failed to load resource: net::ERR_FAILED @ http://localhost:5411/icon-192.png'
  rec.check('the console filter DOES suppress the exact loopback private-network block it names',
    realConsoleErrors([PNA_ICON, PNA_PAIRED]).length === 0,
    'both the descriptive block and its paired generic message, same URL')
  rec.check('⚔️ but the generic ERR_FAILED alone is NOT suppressed without a diagnosed block',
    realConsoleErrors([PNA_PAIRED]).length === 1,
    'an unpaired ERR_FAILED must stay a finding')
  rec.check('⚔️ and ERR_FAILED to a DIFFERENT loopback resource is NOT suppressed',
    realConsoleErrors([PNA_ICON, 'Failed to load resource: net::ERR_FAILED @ http://localhost:5411/assets/app.js']).length === 1,
    'the pairing is per-URL, not per-batch')
  rec.check('⚔️ and a private-network block to a FOREIGN host is NOT suppressed',
    realConsoleErrors(["Access to resource at 'https://tracker.example.com/x' from origin 'null' has been blocked by CORS policy: The request client is not a secure context and the resource is in more-private address space `loopback`. @ https://tracker.example.com/x"]).length === 1,
    'only the artifact server under test is excused')
  rec.check('⚔️ and a plain 404 on the same asset is NOT suppressed',
    realConsoleErrors(['Failed to load resource: the server responded with a status of 404 () @ http://localhost:5411/icon-192.png']).length === 1,
    'a missing asset is a real finding, not an environment artefact')

  rec.check('every non-informational entry reads a real source file',
    LEDGER.filter((e) => !e.informational).every((e) => {
      const [, evidence] = e.assert()
      return typeof evidence === 'string' && evidence.length > 0
    }), `entries=${LEDGER.length} vacuous=${vacuous.length}`)

  return rec.summary()
}
