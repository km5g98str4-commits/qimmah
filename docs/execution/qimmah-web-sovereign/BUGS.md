# Qimmah Web Sovereign — bug ledger

Updated: 2026-08-14 (Layer 3 Progress/Measurements / PKG-5 verified)

## BUG-001 — Preview mutation handlers can surface an exception instead of Premium

- Severity: P1
- Surface: Recovery submit; ProgressV2 measurement save.
- Reproduction: complete guest preview, browse to the surface, invoke save while entitlement is `none`.
- Evidence: writer functions correctly throw `PaidActionDenied`, but the baseline live handlers do not call `useAccess().guard`; the central gate therefore does not open before the writer rejects.
- Root cause: writer-level policy was added without the corresponding live-handler guard on two later surfaces.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: both handlers call the central UI guard before the already-guarded writer.
- Evidence: `test:access-gate` 72/72; `test:e2e:preview-gate` proves Premium opens and both recovery/measurement stores remain unchanged.

## BUG-002 — Live Progress route does not expose the current measurement experience

- Severity: P1
- Surface: `#/progress` / Measurements.
- Reproduction: open live Progress tab and look for the current weight/body detail and logging route implemented by `ProgressV2`.
- Evidence: `App.tsx` renders `ProgressView`; baseline `ProgressView` is the older summary/reminder surface while `ProgressV2` owns the maintained measurement flow.
- Root cause: duplicate UI implementations drifted; the route wrapper was not pointed at the maintained owner.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: the stable `ProgressView` route module is now a thin owner-preserving wrapper over `ProgressV2`; Steps and Recovery remain explicit routes from that screen.
- Evidence: `test:progress-v2` 11/11 plus the browser measurement entry/save attack.

## BUG-003 — Three high transitive dependency advisories

- Severity: P2
- Surface: build/development toolchain.
- Reproduction: `npm audit --json`.
- Evidence: `brace-expansion` through TypeScript-ESLint/ESLint/glob; `js-yaml` through ESLint; `nanoid` through PostCSS. `npm ls` shows no application-runtime importer; production bundle scan still required.
- Root cause: pinned lockfile contains vulnerable transitive versions.
- Status: OPEN
- Containment: no user-controlled input is passed to these build tools in the shipped browser. The contract forbids dependency upgrades tonight; do not run `npm audit fix`. Track for an authorized dependency wave.

## BUG-004 — Setup-specific ErrorBoundary can falsely complete a crashed onboarding

- Severity: P1
- Surface: Setup/onboarding render failure.
- Reproduction: cause a child render exception; choose the escape action.
- Evidence: `SetupErrorBoundary` in `src/views/SetupView.tsx` calls `onForceComplete`, whose contract marks onboarding complete and enters the dashboard. It is also a second boundary primitive with hardcoded bilingual copy.
- Root cause: a historical “never trap the user” escape treats failure as completion rather than retry/recovery.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: remove `SetupErrorBoundary` and the `onForceComplete` path; setup reuses `RouteErrorBoundary`, so retry cannot write completion.
- Evidence: `test:error-boundary` 13/13 with a named assertion and counter-proof for the no-false-completion contract.

## BUG-005 — Error recovery lacks a support reference id

- Severity: P2
- Surface: app and route ErrorBoundary fallbacks.
- Reproduction: trigger a render or lazy-import error.
- Evidence: fallback offers reload/retry, but no non-sensitive reference id and no `qimmah.support@gmail.com`/support route.
- Root cause: pre-launch fallback predates the support-correlation contract.
- Status: RESOLVED — VERIFIED FOR PKG-1
- Fix: both canonical fallbacks display a client-generated `QW-*` id, log the same id, focus their headings, and provide `qimmah.support@gmail.com` without exposing stack/message/PII.
- Evidence: `test:error-boundary` 14/14, including the shared Contact address.

## BUG-006 — First-run question target is not met truthfully

- Severity: P2
- Surface: Onboarding personalization.
- Reproduction: inventory every visible answer and trace each into a real consumer.
- Evidence: baseline had 14 candidate answers; equipment preference was explicitly discarded, leaving 13 proven meaningful. Required history facts were absent from the live baseline.
- Root cause: V2 onboarding was intentionally a shorter adapter over defaults; the adaptive bank is not routed to the live UI.
- Status: RESOLVED — VERIFIED FOR PKG-2
- Fix: the live flow now has exactly 18 stable questions across seven screens. It replaces redundant training years and discarded equipment preference with canonical history, NEAT and diet facts, each tied to an observable safety/calculation/generation/presentation consumer. Raw history persists and uses existing canonical classifiers; QAE is untouched.
- Evidence: `test:onboarding-questions` 97/97, `test:onboarding-intent` 70/70, `test:onboarding-async` 40/40, 36-case browser matrix, and newcomer/minor/advanced journeys.

## BUG-007 — Lowering age can leave a restricted adult goal visually selected

- Severity: P2
- Surface: Onboarding basics → goal eligibility.
- Reproduction: choose an adult-only `cut` or `bulk` goal, go back, lower age to a minor, then return to goals.
- Evidence: the choice was disabled for the new age but the old React state could remain selected, creating a stale pressed value until later normalization.
- Root cause: eligibility was enforced at completion/presentation, but an age change did not synchronously reconcile the existing goal state.
- Status: RESOLVED — VERIFIED FOR PKG-2
- Fix: one canonical `goalAllowedForEligibility` function is used by both an age-change effect and the immediate age input handler; lowering age clears restricted state before advancing.
- Evidence: `test:onboarding-intent` contains the named negative proof; the minor browser journey performs the adult-cut→minor attack and confirms no selected restricted goal survives.

## BUG-008 — Live nutrition adapter drops quantity and catalog provenance

- Severity: P1
- Surface: Nutrition meal search → add → reload/edit.
- Reproduction: add a catalog food with a non-default gram amount, then inspect `qimmah:nutrition:v2` or reload the live row.
- Evidence: `QuickMealLogger` calculated grams/servings, but `nutritionTracking.addLog` rebuilt the canonical record without `foodId`, `grams`, `servings` or `unit`.
- Root cause: the compatibility adapter preserved macros but not the later quantity/provenance fields.
- Status: RESOLVED — VERIFIED FOR PKG-3
- Fix: one explicit bidirectional adapter preserves all known fields; live rows expose a proportional edit only when a real quantity basis exists. Old quantity-less records remain unknown.
- Evidence: `test:nutrition-live` 13/13 and browser add/reload/edit assertions in the 106-case Nutrition suite.

## BUG-009 — Nutrition primary persistence can report success after a failed write

- Severity: P1
- Surface: add, edit, delete and water logging under quota/blocked storage.
- Reproduction: make `Storage.setItem('qimmah:nutrition:v2', …)` throw, then invoke a live mutation.
- Evidence: baseline `persist` swallowed the exception and still updated cache, mirrors, listeners and caller success state.
- Root cause: raw `localStorage.setItem` was wrapped in a silent catch instead of the canonical `safeStorage` result contract.
- Status: RESOLVED — VERIFIED FOR PKG-3
- Fix: `persist` uses `writeJson`, throws a named `NutritionStorageError`, and advances secondary state only after `ok`; UI adapters return `false`, preserve input, and show bilingual recovery copy.
- Evidence: quota and `SecurityError` counter-proofs plus the real-browser failed-edit attack; stored bytes and cache remain unchanged.

## BUG-010 — Live Nutrition delete can bypass the coherent Preview surface

- Severity: P1
- Surface: populated Nutrition MealCard in Preview/entitlement-race states.
- Reproduction: invoke delete while entitlement is not active.
- Evidence: the writer correctly rejects, but the baseline live MealCard called the remove callback without `guard('nutrition.removeFood')`.
- Root cause: the earlier access proof covered QuickMealLogger remove, not the maintained MealCard surface.
- Status: RESOLVED — VERIFIED FOR PKG-3
- Fix: MealCard remove and edit pass through the central UI guard; writer guards remain the second defense.
- Evidence: `test:access-gate` 77/77 includes named removal and hidden-error-feedback attacks; Preview matrix remains 34/34.

## BUG-011 — Fractional servings are inflated by removing the decimal point

- Severity: P1
- Surface: add/edit quantity in servings.
- Reproduction: enter `1.5` servings; baseline sanitizer stores `15`, producing 2,250g and 3,720 calories for a 150g/248-calorie serving.
- Root cause: serving inputs used `sanitizeNumericInput` with its integer default even though their step is `0.25`.
- Status: RESOLVED — VERIFIED FOR PKG-3
- Fix: both serving add and edit explicitly allow one decimal point; grams remain integer-bounded.
- Evidence: direct 0.25/1.5 counter-proof and browser assertion that 1.5 servings persists as 225g/372 calories.

## BUG-012 — Workout can clear its resumable snapshot before durable completion succeeds

- Severity: P1
- Surface: live Workout set logging and finish under quota/blocked storage.
- Reproduction: finish a progressed session while the finished-history writer rejects; reload after the failure.
- Evidence: the child `WorkoutMode` cleared `activeWorkout` before its parent called the verified finished-session commit. The active registry writer also swallowed raw `localStorage` failures, so a completed set could flash as saved without becoming durable.
- Root cause: active-session ownership and finished-session ownership crossed component boundaries without one checked commit order.
- Status: RESOLVED — VERIFIED FOR PKG-4
- Fix: active writes return `WriteResult`; saved feedback waits for `ok`; only `WorkoutView` clears after durable history success. Any history or cleanup failure restores the exact pre-confirm snapshot and leaves the live inputs open.
- Evidence: `test:storage-honesty` 44/44 with named smuggling attacks; `test:e2e:workout` 31/31 includes active quota, byte-identical finish rollback, retry, reload/resume and completed-session persistence.

## BUG-013 — Workout completion “Back to Today” does not navigate to Today

- Severity: P2
- Surface: live Workout summary.
- Reproduction: finish a session and press «ارجع لليوم».
- Evidence: the baseline handler only cleared local summary state, revealing the Workout tab underneath.
- Root cause: the summary callback omitted the canonical route transition.
- Status: RESOLVED — VERIFIED FOR PKG-4
- Fix: clear the summary and navigate through the existing `onNavigate('dashboard')` route owner.
- Evidence: the live browser confirms the dashboard hash, correct ended-early partial state, full-session “كفو” state, and persistence after reload.

## BUG-014 — Measurements promise has no reachable route or usable history

- Severity: P1
- Surface: Progress, Profile, deep navigation.
- Reproduction: follow the Profile row «القياسات والصور» or the weight card, then refresh/back or try to review/edit an older entry.
- Evidence: baseline `AppRoute` had no `measurements`; Profile navigated to generic Progress and promised photos that do not exist; Progress exposed add-only internal state with no history/edit/delete surface.
- Root cause: the maintained measurement writer existed, but route ownership stopped at an internal `ProgressV2` screen and never completed the product surface.
- Status: RESOLVED — VERIFIED FOR PKG-5
- Fix: add the real `#/measurements` route, render the canonical store history, route Profile and Progress entries to it, remove the false photo promise, and provide empty/add/edit/delete/back states without adding a backend schema.
- Evidence: `test:e2e:progress` 25/25, `test:e2e:navigation` 96/96, `test:e2e:preview-gate` 35/35, and asset-integrity route parity 35/35.

## BUG-015 — Measurement save/delete can report success or bypass Premium

- Severity: P1
- Surface: measurement add, edit and delete under Preview or blocked/quota storage.
- Reproduction: force the canonical measurement key write to throw, or call `deleteLog` while entitlement is `none`.
- Evidence: baseline `historyStore.saveMeasurementLog` ignored its safe-write result and returned the proposed list; the UI always called `onSaved`. `deleteLog` had neither writer guard nor checked result.
- Root cause: the safe-storage primitive existed, but the measurement adapter erased its result and queued sync before proving the local commit.
- Status: RESOLVED — VERIFIED FOR PKG-5
- Fix: checked measurement commits write locally first, enqueue sync only after `ok`, and return `WriteResult`; add/update/delete share the central Premium action at UI and writer layers. Failed forms and byte-identical history remain visible for retry.
- Evidence: `test:measurement-reliability` 11/11, `test:access-gate` 84/84, and the live quota/Preview attacks in `test:e2e:progress` 25/25.

## EXTERNAL-001 — Paid Salla product binding cannot be proven

- Severity: P1 commercial blocker (does not block Preview).
- Surface: Premium purchase CTA.
- Reproduction: search `1181109938|1084925309|salla.sa`.
- Evidence: only `https://salla.sa/Qimmahsa` store root is present; neither product id exists in the frontend contract.
- Root cause: no verified product-specific public URL was supplied to this baseline.
- Status: EXTERNALLY_BLOCKED

## EXTERNAL-002 — Live activation backend is unavailable

- Severity: P1 commercial blocker (does not block Preview).
- Surface: activation code redemption.
- Reproduction: production-mode `redeemActivationCode` call.
- Evidence: `src/lib/access/entitlementSource.ts` returns `offline` unless the build-only mock seam is enabled.
- Root cause: webhook/code verification/entitlement backend is outside authorized Web scope and not present as a reviewed contract.
- Status: EXTERNALLY_BLOCKED
