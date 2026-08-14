# Qimmah Web Sovereign — bug ledger

Updated: 2026-08-14 (Layer 3 Profile / PKG-8 recovery-reviewed and verified)

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

## BUG-016 — Machine catalog detail bypasses the exercise deep-link contract

- Severity: P2
- Surface: Exercise Library → Machines → exercise detail.
- Reproduction: open `#/exercises`, switch to Machines, and choose any machine.
- Evidence: the main catalog called `setExerciseHash`, but `MachineCatalogBrowser` received the component-local `setOpenId`; the detail appeared without changing `#/exercises`, so refresh/share/Back could not represent the selected machine.
- Root cause: two library entry paths used different owners for the same detail state.
- Status: RESOLVED — VERIFIED FOR PKG-6
- Fix: every catalog entry calls one `openExercise` route owner; a named counter-proof fails if Machines is rewired to local state.
- Evidence: `test:exercise-library` 16/16; `test:e2e:exercises` 32/32 proves the machine id in the URL; existing navigation history remains 96/96.

## BUG-017 — Exercise detail lacks a complete modal and direct-link exit contract

- Severity: P2 accessibility/navigation
- Surface: `#/exercises/:exerciseId` detail sheet.
- Reproduction: open a detail with keyboard or load its URL directly, then press Escape/Tab/the close action; also enter an unknown id and use browser history.
- Evidence: baseline sheet had no dialog semantics, focus entry/trap/return, Escape handling, or scroll lock; its 36px close target always used `history.back()`. A direct link could therefore leave Qimmah, while an unknown-id redirect pushed another history entry.
- Root cause: route state had been added after the original local sheet, but the sheet lifecycle and replace-vs-push semantics were not completed.
- Status: RESOLVED — VERIFIED FOR PKG-6
- Fix: labelled modal dialog, 44px back action, Escape/focus trap/focus return/body-scroll restoration, route-safe direct-link close, and history replacement for unknown ids.
- Evidence: `test:e2e:exercises` covers keyboard, direct URL, Back/Forward/refresh/unknown id, English/LTR and 320px with zero page errors; static bypass simulations are named.

## BUG-018 — Settings reintroduced an unvalidated manual JSON importer

- Severity: P1
- Surface: `#/settings` data import/export.
- Reproduction: import a legacy v2, unsupported version, prototype-polluting, unknown-store or cross-owner JSON file through the visible Settings import control.
- Evidence: the live page had its own `FileReader` + `JSON.parse` path even though the reviewed `DataManagementPanel` and portability pipeline still existed. The release browser contract expected the hardened panel but it was disconnected.
- Root cause: a later visual reorganization copied the old importer back instead of retaining the canonical portability owner.
- Status: RESOLVED — VERIFIED FOR PKG-7
- Fix: reconnect `DataManagementPanel`, remove the manual parser and expose the data group as an accessible disclosure.
- Evidence: `test:e2e:settings-security` 34/34; every hostile file is rejected before write, valid restore is atomic, A/B data stays isolated and no token/PII reaches console or export names.

## BUG-019 — Settings capabilities and numeral presentation are ambiguous/inconsistent

- Severity: P2
- Surface: Settings plus critical Layer-3 number displays.
- Reproduction: open Settings in Arabic, inspect language/units/numbers, then compare Nutrition/Today/Progress values such as Latin `81.5` with Arabic copy/digits on the same preference.
- Evidence: Language worked but had no complete runtime contract; Units/Numbers were absent from Settings while Profile represented them like peer rows; Nutrition/Today forced `en-US`, and Progress explicitly documented Western digits in Arabic.
- Root cause: screens independently formatted numbers and historical capability rows had no single truthful owner.
- Status: RESOLVED — VERIFIED FOR PKG-7
- Fix: keep language as the only real control; render metric units and locale-derived numeral policy as non-interactive facts; centralize dynamic Layer-3 display formatting without changing stored numbers.
- Evidence: `test:settings-preferences` 17/17, `test:e2e:settings` 14/14, Progress browser 25/25 with Arabic-only digit assertion, plus Nutrition 106/106 and Workout 31/31.

## BUG-020 — Profile forks the hardened data-transfer owner

- Severity: P1 security/data integrity
- Surface: Profile → Settings/Privacy → My data.
- Reproduction: compare import/export from `#/settings` with either Profile data entry, then feed a hostile or cross-owner bundle to the implementations.
- Evidence: Profile carried a second complete portability UI and state machine instead of rendering the reviewed `DataManagementPanel`. This duplicated security-sensitive import/export behavior and allowed future validation/undo/account-isolation drift.
- Root cause: Profile copied the portability workflow rather than composing its canonical UI owner.
- Status: RESOLVED — VERIFIED FOR PKG-8
- Fix: remove the duplicate workflow and imports; both Profile contexts render `DataManagementPanel` with the same `uid` and recovery state as Settings.
- Evidence: `test:profile-reliability` 22/22 binds Profile to the canonical owner and attacks reintroduction; the existing Settings hostile-import contract remains unchanged.

## BUG-021 — Profile conflates account deletion with guest device-data management

- Severity: P2 product truth/navigation
- Surface: Profile privacy/account rows for signed-in and guest users.
- Reproduction: browse Profile as a guest, open Privacy, and follow «حذف الحساب نهائيًا»; or leave Privacy for canonical Settings and press browser Back.
- Evidence: `deleteAccountAvailable` was always true, so guests saw an account-deletion promise despite having no account. Canonical Settings return also always reset Profile to home, losing whether the user came from Privacy or internal Settings.
- Root cause: a single unconditional capability flag and route transition represented two different personalities and discarded the originating internal state.
- Status: RESOLVED — VERIFIED FOR PKG-8
- Fix: account deletion and the internal logout/delete rows are available only when signed in; guests see device-data management without any account action. A marker on the Profile browser-history entry restores `privacy` or `settings` after canonical Settings Back without creating another storage key.
- Evidence: `test:e2e:profile` 27/27 proves both personalities, absence of guest account rows, and both return contexts in a real browser; three named static bypass attacks guard the two false-promise paths and wrong return.

## BUG-022 — Profile descendants duplicate the route heading and expose sub-44px controls

- Severity: P2 accessibility
- Surface: Profile, reminder settings and native preference controls.
- Reproduction: inspect heading hierarchy and switch/back bounding boxes at 320px.
- Evidence: `MobileShell` and Profile both rendered `h1`; internal Profile/reminder screens also emitted `h1` beneath the route shell. Back buttons measured 36/40px and switch hit areas 24px high.
- Root cause: internal panels treated themselves as standalone pages and styled the visual switch track as the interactive target.
- Status: RESOLVED — VERIFIED FOR PKG-8
- Fix: leave the sole `h1` to `MobileShell`, use `h2` for internal screens, and wrap visual switch tracks in 44×44 semantic buttons; raise back targets to 44×44.
- Evidence: the first strict browser run intentionally failed on the duplicate heading; the final recovery-reviewed run passes 27/27 and the structural proof checks every touched target.

## BUG-023 — Profile browser proof could accept a foreign process on its fixed port

- Severity: P2 test integrity
- Surface: `test:e2e:profile` preview startup.
- Reproduction: bind an unrelated HTTP 200 server to port 5328, then start the Profile journey; the first implementation ignored child output/exit and polled the URL directly.
- Evidence: a stale or parallel server could satisfy `fetch(URL).ok` after Vite `--strictPort` exited, recreating the port-collision false-evidence class observed on 5325.
- Root cause: the new runner did not prove that its own spawned Vite child reached the ready state.
- Status: RESOLVED — VERIFIED FOR PKG-8
- Fix: listen to the owned child's stdout/stderr and require its explicit local ready line before polling; reject on child error or early exit. The runner also binds and tests the explicit `127.0.0.1` host.
- Evidence: a live foreign-server counter-proof now fails by the named `profile reliability preview exited before ready` error even though the foreign URL returns 200; the clean owned-preview rerun passes 27/27.

## BUG-024 — The Quick Log path throws when storage is blocked

- Severity: P1 reliability
- Surface: the raised «تسجيل» action in `MobileShell`; `#/profile` mount.
- Reproduction: block cookies/storage (Safari private browsing is the real-world case), then press
  Quick Log, or open `#/profile` with any pending intent.
- Evidence: `src/App.tsx:388` called `window.sessionStorage.setItem(…)` and
  `src/views/ProfileV2.tsx:84/86` called `getItem`/`removeItem` with **no guard**. When storage is
  blocked, reading the `window.sessionStorage` *property itself* throws `SecurityError` — not just
  its methods. The write threw inside the click handler, so the centre action of the tab bar died;
  the read threw during the Profile mount effect, so the whole `#/profile` route fell to the error
  boundary.
- Root cause: three live consumers each owned the same key with their own guarding discipline. This
  was a **deviation from an existing repository pattern**, not a missing one — `setupFocus.ts`,
  `entitlementSource.ts`, `CustomizationCenter.tsx` and `NutritionView.tsx` all already wrapped
  every `sessionStorage` access in `try/catch`. The Quick Log path was the only unguarded one left.
- Status: RESOLVED — VERIFIED FOR PKG-9
- Fix: one canonical owner, `src/lib/quickLogIntent.ts`, modelled directly on the existing
  `setupFocus.ts`. Every access is guarded; all three live consumers route through it and no longer
  name the key or touch storage themselves.
- Evidence: `test:quick-log` 27/27, including live runtime proof that write, read and clear all
  survive **both** failure shapes — a throwing `sessionStorage` property and throwing storage
  methods — and that a blocked read returns `null` rather than an invented value.
- Residual risk, stated plainly: the *proof* of this fix is a unit-level runtime proof. The browser
  that actually exhibits the bug is Safari/WebKit, which **cannot be launched in this container**.
  Chromium cannot reproduce the original failure, so no browser evidence for this class exists here.

## BUG-025 — Quick Log «ماء» is a declared action with no consumer

- Severity: P2 product truth / dead control
- Surface: Quick Log sheet → «ماء».
- Reproduction: open the Quick Log sheet and choose «ماء».
- Evidence: `NutritionView` consumed the intent with `if (raw !== 'meal' && raw !== 'water') return`
  and then acted only `if (raw === 'meal')`. The `'water'` branch therefore cleared the intent and
  did nothing. The user landed on Nutrition with the water panel below the fold and no indication
  anything had been requested — while the neighbouring «وجبة» opened its logger directly. One of the
  sheet's three advertised actions was inert.
- Root cause: the intent vocabulary grew to three values while only one had an implemented effect.
- Status: RESOLVED — VERIFIED FOR PKG-9
- Fix: the water intent scrolls the water panel into view and moves focus to its first real action.
  Deliberately **not** an automatic write: `nutrition.water` is a paid action, so logging water on
  the user's behalf would both invent data and route around the Premium gate. Focus, not mutation.
- Evidence: `test:quick-log` 27/27 binds the intent to the panel and asserts the focus path adds
  nothing by itself; a named bypass simulation fails when the water effect is dropped.

## BUG-026 — A redirected Quick Log leaves an intent that hijacks a later visit

- Severity: P2 navigation correctness
- Surface: Quick Log pressed by a guest without an account, or before onboarding completes.
- Reproduction: press Quick Log while `guardRoute` redirects to `accountRequired`/`setup`, abandon
  the flow, then open Nutrition or Profile normally at any later point in the session.
- Evidence: `openQuickLog` wrote the intent **before** calling `navigate`. When the guard sent the
  user elsewhere, the intent stayed in `sessionStorage` with no consumer mounted — and the next
  legitimate visit to Nutrition or Profile consumed it, opening the breakfast logger or the routine
  screen unprompted.
- Root cause: intent was written on the assumption the navigation would land, without asking the
  route guard first.
- Status: RESOLVED — VERIFIED FOR PKG-9
- Fix: `openQuickLog` resolves `guardRoute` first and writes nothing when the destination differs;
  the user is simply sent where the guard requires. Consumption is additionally scoped —
  `takeQuickLogIntent(accepted)` consumes only the values its screen owns — so Nutrition can no
  longer swallow Profile's intent, or the reverse. An unrecognised value is always cleared so no
  garbage can persist.
- Evidence: `test:quick-log` 27/27, including runtime proof that a `routine` intent survives an
  attempted Nutrition consume and is still delivered to Profile; `test:e2e:navigation` 96/96
  unchanged.

## BUG-027 — The Profile browser proof prints success and then hangs forever

- Severity: P2 test integrity / CI hazard
- Surface: `npm run test:e2e:profile` teardown.
- Reproduction: run the suite to completion and watch the process. Observed live in this recovery:
  the runner printed `✅ profile-reliability — 27 passed, 0 failed` and then sat idle. `ps` showed it
  alive 2m43s later with its log unchanged since the summary line; the batch behind it never started.
- Evidence: sending `SIGTERM` to the orphaned `vite preview` on port 5328 caused the runner to exit
  **immediately** — the decisive test, since it isolates the holder of the event loop.
- Root cause: two correct decisions combining into a defect. `spawn('npx', …)` makes the real `vite`
  a **grandchild**, so `preview.kill()` signals only the `npx` wrapper. The BUG-023 hardening then
  required piped stdio to prove *our own* child reached ready — and those pipes stay attached to the
  surviving grandchild, so Node's event loop never drains. `navigation-history.mjs` uses
  `stdio: 'ignore'` and is unaffected, which is why only the newest suite hangs.
- Why it matters beyond tidiness: the suite reports success on stdout and then never returns an exit
  code. In CI that is a job that burns its full timeout and is reported as a **timeout**, not as the
  pass it actually was — a green result destroyed by its own teardown, and every step queued behind
  it silently skipped.
- Status: RESOLVED — VERIFIED FOR PKG-9
- Fix: spawn the preview `detached: true` so it owns a process group, kill the **group**
  (`process.kill(-pid)`) with the single-process kill retained as fallback, and destroy the pipes.
  No assertion, timeout or selector was touched — the 27 checks are byte-identical.
- Evidence: `EXIT_profile=0` with 27/27 after the fix, and the suite now terminates on its own.
- Note: the same pattern was copied into the new `dirty-state-recovery.mjs` while it was being
  written; it carries the same fix rather than the same defect.

## BUG-028 — A corrupt onboarding flag is read as a completed setup

- Severity: P1 data truth
- Surface: boot from `qimmah:onboarding:v1`; guest entry from the start screen.
- Reproduction: set `qimmah:onboarding:v1` to `{"completed":"yes-please"}`, load the app, and press
  «كمّل كضيف». The user lands on `#/dashboard`.
- Evidence: found by the new `test:e2e:dirty-state` suite, not by review — the seed
  `completed-not-boolean` reached `#/dashboard` while the four other corrupt shapes were correctly
  refused. `loadOnboarding` coerced with `completed: !!parsed.completed`, and `!!"yes-please"` is
  `true`.
- Root cause: a truthiness coercion standing in for a contract check. The other corrupt shapes only
  failed by accident of `JSON.parse` — an array, string or `null` has no `.completed` property, so
  the same lenient `!!` happened to yield `false`. The rejection was luck, not policy.
- Why P1: this is the failure mode that does **not** announce itself. There is no crash and no error
  boundary — the user is placed on a dashboard for an onboarding that never happened, with no
  profile behind the plan it renders. A crash is visible; a false completion is not.
- Status: RESOLVED — VERIFIED FOR PKG-9
- Fix: `completed: state.completed === true`, plus an explicit shape guard that treats a non-object
  envelope (array, string, `null`) as absent rather than relying on a thrown property access.
- No legacy cost, verified rather than assumed: this key has only ever been written as a boolean
  (`markCompleted` writes `true`, `resetOnboarding` writes `false`), and the repository's own legacy
  path in `syncService.ts:591` already compares with `=== true`. Strictness follows an existing
  precedent instead of introducing a new one.
- Evidence: `test:e2e:dirty-state` 47/47 — the same seed that reached `#/dashboard` before the fix
  is now returned to setup, while the genuine completed guest still enters the app (the positive
  control that keeps this from degrading into “reject everything”).

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
