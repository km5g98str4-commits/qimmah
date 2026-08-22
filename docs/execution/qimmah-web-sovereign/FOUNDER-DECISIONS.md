# Qimmah Web Sovereign — autonomous founder decisions

Updated: 2026-08-22 (PKG-10 concurrent-recovery convergence; final gate pending)

## Decision 001 — Use the exact Founder checkpoint

- Decision: execute from `af5274b2f8558079b43ad1d2dc2676b03db23d2b` on `codex/qimmah-web-sovereign-001` in `/private/tmp/qimmah-web-sovereign-001`.
- Why: the exact object resolved after the required fetch and is contained by the named Founder Web line.
- Alternatives rejected: current `codex/ui-polish`, arbitrary `main`, reviewed integration reference, and branch-name guessing.
- Risk: the remote may move later; all provenance is pinned by immutable SHA.
- Reversibility: delete the isolated worktree/branch only after explicit authorization; no other checkout was touched.
- Affected files: Git worktree metadata only; this execution directory thereafter.

## Decision 002 — Treat current Salla store root as a conversion limitation, not product acceptance

- Decision: keep the existing store-root CTA until a verified paid-product URL is discoverable; do not invent a URL containing `1181109938`.
- Why: the contract explicitly forbids guessing. Repository search found no approved direct product URL.
- Alternatives rejected: inferred Salla URL formats; trial id `1084925309`; fake in-app checkout.
- Risk: users may land at the store rather than the exact paid item; paid commercial GO remains NO-GO.
- Reversibility: replace the single `product.checkoutUrl` when an approved URL exists.
- Affected files: none in PKG-0.

## Decision 003 — Do not auto-fix dependency advisories

- Decision: record the three transitive high advisories and continue product work without `npm audit fix` or version changes.
- Why: dependency upgrades are a hard no-touch area tonight; the findings are in lint/build tooling and need their own authorized wave.
- Alternatives rejected: lockfile mutation, broad upgrade, suppressing the audit.
- Risk: build tooling can be DoS’d by hostile inputs in developer/CI contexts; no browser runtime path has been found.
- Reversibility: fully reversible in a dedicated dependency update.
- Affected files: none.

## Decision 004 — Reuse reviewed existing work only by immutable commit, inside this branch

- Decision: adopt the useful hunks from `71129f9c310f750cc24d1ed1fcf1a8d013f439b1` without preserving its commit, then own the result as a separately verified package.
- Why: it is the only branch advanced from the exact baseline and directly addresses discovered Preview/Measurements defects. Rebuilding the same patch would violate the project’s verify-before-build rule.
- Alternatives rejected: modifying its existing worktree; merging its moving branch name; blindly trusting its commit message.
- Risk: it includes performance/lazy-loading and route-convergence changes beyond the two guard fixes; each hunk must retain a named DoD connection.
- Reversibility: one cherry-pick/revertable package commit on this execution branch.
- Review corrections: replaced a lazy component used as its own Suspense fallback; caught deferred native-import failures; extended the canonical ErrorBoundary; removed setup false completion.
- Evidence: focused source proofs green; three real-browser suites green; fresh full gate green through its final `test:workout-day-source` step.
- Affected files: `App.tsx`, access/progress/recovery/Premium surfaces, boot imports, and their proof scripts.

## Decision 005 — Count exactly 18 only after consumer proof

- Decision: the final live inventory is exactly 18: age, sex, height, weight, intent, declared level, trained-before, total-months, last-trained, consistency, goal, days, duration, place, NEAT, diet pattern, has-injury and injury areas.
- Why: each answer now changes an observable safety, calculation, generation or presentation result and is bound once to a stable UI id. This satisfies the target without filler.
- Alternatives rejected: equipment preference (discarded/no consumer); numeric training years (duplicates canonical total-months buckets); health consent (legal/safety gateway, not personalization); account/auth fields before value; adaptive/QAE bank additions without an approved live consumer or within the hard no-touch zone.
- Risk: future UI work could accidentally add a nineteenth visible question or disconnect an answer; the exact registry and negative simulations guard both failures.
- Reversibility: all Layer 2 work is isolated in PKG-2; v5 drafts migrate additively and remain recoverable.
- Affected files: live onboarding UI/flow/adapter/profile types and their dictionaries/proofs; QAE remains untouched.

## Tests changed

PKG-1 changes tests only by strengthening named launch contracts. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `run-access-gate-proof.mjs` | writer guards and policy | also bind every live mutation handler to its central guard; attack each removal | closes exception-vs-dialog gaps | stronger |
| `e2e/preview-gate.mjs` | basic workout/nutrition Preview | 34-case Preview/activated matrix, tampering, focus/Escape, recovery, measurements, zero-write checks | prove policy in a real browser | stronger |
| `e2e/install-overlap.mjs` | selected widths | 320/360/375/390/430 in ar/en plus ≥44px nav and attack | cover narrow devices and touch targets | stronger |
| `run-activation-ui-proof.mjs` | absent | 13 structural/counter-proof checks | keep activation honest and accessible | new guard |
| `run-error-boundary-proof.mjs` | absent | 14 structural/counter-proof checks | one primitive, no false completion, one support address, support reference | new guard |
| `run-no-template-language-proof.mjs` | legitimate copy exception hard-bound to `config/strings.ts` | searches the same complete `SURFACES` set used by its forbidden-copy scan | follow canonical dictionary ownership without weakening the phrase assertion | stronger scope |

PKG-2 changes tests to match the new seven-screen flow and strengthens the behavioral contract. No product assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `onboarding-questions-proof.ts` | absent | 97 checks: exact 18 ids, one binding each, bilingual copy, validation, persistence, consumers, never semantics and bypass simulations | make “18 meaningful” mechanically auditable | new guard |
| onboarding focused unit proofs | five-screen/legacy training-years assumptions | seven screens, canonical history, v5→v6, minor eligibility and real plan effects | cover new state without invented defaults | stronger |
| shared E2E onboarding driver | repeated per-suite selectors and old final CTA | one seven-screen driver with canonical history and stable handoff CTA | keep all browser suites on the live contract | stronger/shared |
| onboarding browser matrix | goal × place × discarded equipment | goal × place × NEAT (36 cases), zero-console checks, fail/retry and four-history resume | every matrix axis now has a real consumer | stronger |
| historical journeys | obsolete five-screen/dashboard assumptions | newcomer, minor and advanced journeys assert Layer-1 Premium/Preview handoff and Layer-2 semantics | preserve user stories across both packages | stronger |
| minor journey | age starts minor | selects adult-only goal, lowers age, confirms restricted selection is cleared | attack stale conditional state | stronger counter-proof |

PKG-3 changes tests only by extending the live Nutrition contract. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `run-nutrition-live-proof.mjs` | absent | 13 runtime checks for round-trip quantity/provenance, fractional input and adversarial storage | prevent fake success and quantity loss | new guard |
| `run-access-gate-proof.mjs` | MealCard add plus other live guards | also MealCard remove and a named removal attack | keep Preview failure on the coherent Premium surface | stronger |
| `e2e/nutrition-reliability.mjs` | 91 crash/pointer/macro checks | 106 checks including all meal rows, paid add/reload/edit/delete, quota preservation and English item opening | prove the maintained route end-to-end | stronger |

PKG-4 strengthens the Workout truth contract. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `storage-honesty-proof.ts` | finished-history quota and static parent checks | 44 runtime/structural checks including active quota, last-good bytes, commit order and two bypass attacks | prevent false saved state or lost resume data | stronger |
| `e2e/workout-reliability.mjs` | absent | 31 real-browser checks from Preview through two finish classifications and Today reload | prove the maintained live route end-to-end | new guard |

PKG-5 completes the existing Progress/Measurements contract without creating a new data model. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `measurement-reliability-proof.ts` | absent | 11 runtime checks for checked add/edit/delete, quota, direct Preview denial, restore and Health isolation | prevent fake success and deletion bypass | new guard |
| `run-access-gate-proof.mjs` | measurement add only | add, edit and delete writers plus both live UI owners | enumerate every paid mutation | stronger |
| `e2e/progress-reliability.mjs` | absent | 25 browser checks across route/history/validation/Preview/Premium/quota/a11y/mobile | prove the complete maintained surface | new guard |
| `e2e/preview-gate.mjs` | six browsable routes | adds explicit `#/measurements` Preview browse assertion | keep browse-vs-mutate policy complete | stronger |
| `e2e/navigation-history.mjs` | 95 checks | 96 checks including the Measurements deep route | prevent route/promise regression | stronger |

PKG-6 completes the existing Exercise Library/detail contract without changing canonical exercise data. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `exercise-library-proof.ts` | absent | 16 behavioral/structural checks for 181 records, AR/EN search, combined filters, machine references, route modes, modal structure and two named bypass attacks | keep the catalog and route seam mechanically guarded inside `test:gate` | new guard |
| `e2e/exercise-library-reliability.mjs` | absent | 32 browser checks covering all §28 acceptance points plus keyboard, 320px and LTR | prove the complete maintained surface | new guard |
| `e2e/navigation-history.mjs` | 96 checks | unchanged 96 assertions; rerun after the new route-safe close behavior | prove no history regression without weakening the baseline | unchanged, reverified |

PKG-7 restores the existing hardened Settings data path and makes capabilities/presentation explicit. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `settings-preferences-proof.ts` | absent | 17 runtime/structural checks plus two named bypass attacks | guard the canonical panel, metric truth, touch targets and one numeral policy | new guard inside `test:gate` |
| `e2e/settings-reliability.mjs` | absent | 14 browser checks at 320px for AR/EN, lang/dir, reload, metric/no-fake rows, number samples and errors | prove the Settings contract rather than infer it from source | new guard |
| `e2e/settings-import-security.mjs` | existing 34-vector contract but disconnected from live UI | unchanged 34 assertions now execute against the restored live panel | re-establish reviewed import security | unchanged, reverified |
| `e2e/progress-reliability.mjs` | Arabic UI expected Latin `81.5` | requires Arabic `٨١٫٥`, rejects Latin form, repeats after reload | encode the deliberate numeral policy | stronger |

PKG-8 converges Profile on existing route, data and account owners. No assertion was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `profile-reliability-proof.ts` | absent | 22 structural/runtime checks plus four named bypass attacks | guard canonical data ownership, personality truth across Privacy/internal Settings, contextual Back, headings, numerals and touch targets inside `test:gate` | new guard |
| `e2e/profile-reliability.mjs` | absent | 27 browser checks for account/guest (including no guest account actions), AR/EN, 320px, contexts/routes/a11y and zero browser errors; runner requires its own child-ready signal and rejects a foreign 200 server | prove the complete maintained Profile surface without port-collision false evidence | new guard with adversarial startup proof |
| `e2e/progress-reliability.mjs` | expected the removed duplicate Arabic Profile heading | requires the single canonical route `h1` «ملفك» | preserve the existing Profile→Measurements check after heading convergence | stronger precision |
| `run-delete-account-proof.mjs` | required a historical comment string in `profileV2Model` | checks the signed-in capability, conditional UI copy and live Profile→Settings binding together | retain the App Store deletion guard after guest/account truth separation | stronger behavior binding |
| momentum/cross-system smoke locators | treated the internal reminder heading as another `h1` | require its correct `h2` level beneath the route heading | keep historical journeys aligned with one-page-one-`h1` semantics | stronger accessibility |

PKG-9/10 close Navigation/Quick Log and strengthen dirty-state/artifact truth. No product assertion
was removed or weakened.

| Test | Old contract | New contract | Why | Strength |
| --- | --- | --- | --- | --- |
| `quick-log-reliability-proof.ts` | absent at PKG-8; 27 checks at pushed PKG-9 | 31 runtime/structural checks, including acknowledged in-memory delivery, deterministic 404 replacement and named mutation attacks | guard the canonical storage owner plus the two convergence defects without relying on timing | new guard, then stronger |
| `e2e/navigation-quick-log.mjs` | uncommitted 60/65-case local recovery draft | 68 built-artifact assertions across AR/EN 320/390/430, pointer/keyboard/focus/touch/overflow, Preview no-write, all blocked-storage destinations, internal/direct 404 and no-loop recovery; script/network failures are now named | prove the real lazy-route and history behavior that static checks cannot settle | new built-browser guard |
| Quick Log seeded fixture | opened an unseeded app at `domcontentloaded`, then changed storage/hash and forced reload | seeds with `addInitScript` before the first app byte and boots directly at `#/dashboard` | the old fixture deliberately cancelled the pending Supabase dynamic import; WebKit correctly reported that artificial failure. Dirty-state owns unseeded/legacy boot | more faithful; assertions/timeouts unchanged |
| `e2e/dirty-state-recovery.mjs` | absent | 47 browser checks over eleven corrupt/legacy/fresh states plus blocked write | boot dirty state without fabricated completion or crash | new built-browser guard |
| `production-bundle-safety-proof.mjs` | source inference only | 9 two-build assertions with mock-seam visibility counter-proof and owned-endpoint attacks | prove the shipped artifact contains no test-only Premium seam or owned dev endpoint | new artifact guard |
| `e2e/profile-reliability.mjs` | printed 27/27 but could retain the Vite grandchild | assertions unchanged; detached owned process-group teardown returns exit 0 | make green evidence usable by CI without changing product expectations | infrastructure fix, assertions unchanged |
| `scripts/run-navigation-quick-log-proof.mjs` | local redundant structural draft | removed only after its unique in-memory/404 assertions migrated into canonical `test:quick-log` and were attacked there | avoid two drifting structural owners while preserving every contract | consolidated, not weakened |
| `e2e/navigation-history.mjs` | 96 assertions | unchanged; rerun after deterministic visible 404 recovery | verify the historical browser contract remains intact | unchanged, reverified in final gate |
| Quick Log / Navigation / dirty-state / Preview browser runners | Chromium-only launch | select Chromium by default or WebKit via `QIMMAH_BROWSER=webkit`; aggregate `test:e2e:webkit` runs all four | execute the same 246 critical assertions on Safari-equivalent WebKit without duplicating contracts | broader engine coverage; assertions unchanged |
| `e2e-auth/preflight.mjs` tool availability | offline preflight invoked `npx --yes supabase --version`, which could download/hang | checks the local executable path only; logical 19 assertions unchanged | keep an explicitly offline proof offline and bounded while reporting Docker/backend absence honestly | infrastructure fix; assertions unchanged |

## Decision 015 — Quick Log gets one guarded owner, and «ماء» focuses rather than writes

- Decision: move the `qimmah:quick-log-intent` key behind a single canonical owner
  (`src/lib/quickLogIntent.ts`) built on the existing `setupFocus.ts` pattern; resolve the route
  guard **before** writing an intent; scope consumption so each screen takes only the values it
  owns; and make the water intent scroll to and focus the water panel instead of logging water.
- Why: the three defects were one structural fault seen from three sides — a key with three owners
  and no single guarding discipline. The repository already had the answer in `setupFocus.ts`, so
  this routes to an existing pattern rather than inventing a mechanism (verify-before-build).
- Alternatives rejected: adding a `try/catch` at each of the three call sites (leaves three owners
  and the next consumer repeats the bug); auto-adding a default water amount on intent (invents
  user data **and** bypasses the `nutrition.water` paid gate); consuming any intent found (lets one
  screen swallow another's); keeping the write-then-navigate order and clearing stale intents on a
  timer (guesswork instead of asking the guard).
- Risk: the focus jump is a visible movement the user did not explicitly scroll to. It is bound to
  an intent the user just expressed one tap earlier, and it is one-shot — `onFocusHandled` clears
  it, so it cannot repeat on re-render.
- Reversibility: one package. The new module is additive; the three consumers are three small
  call-site changes; no stored shape, schema or key name changed.
- Affected files: `src/lib/quickLogIntent.ts` (new), `src/App.tsx`, `src/views/ProfileV2.tsx`,
  `src/views/NutritionView.tsx`, `scripts/quick-log-reliability-proof.ts` and its runner.
- Known remaining copy of the old pattern: `src/views/NutritionV2.tsx` still holds unguarded raw
  access. It is **not the live route** (canonical map: “`NutritionV2.tsx` is not the live route
  wrapper”), so it was deliberately left untouched rather than widening this package into dead code.
  Recorded here so it is a decision, not an oversight.

## Decision 016 — The production artifact is proven by a two-build counter-proof

- Decision: prove acceptance items 27 and 30 against the **built** artifact, and prove them with two
  builds — production must lack the test seam, and a mock build must **contain** it.
- Why: a scanner that greps for a string can pass because the string is absent everywhere, including
  from the scanner's own reach. Absence is only evidence once the same scanner has been shown to
  detect presence. This is the charter's “مرور غير مستحقّ ليس نجاحًا” (§4.2) applied to a bundle scan.
- Alternatives rejected: trusting the source-level `mockEnabled()` argument (it is a build-time
  decision, so only the build can settle it); scanning `dist/` as it happens to exist (previous
  steps leave mock builds there — the artifact under test must be built by the proof itself).
- Risk: the proof runs two Vite builds, so it is too slow for `test:gate`'s 100+ node proofs. It is
  registered as `test:bundle-safety` and run in the final gate, matching the existing precedent that
  build-dependent proofs (`test:e2e:*`) sit outside `test:gate`. This placement is a declared
  exclusion, not a silent one (§4).
- Reversibility: a proof script and one package.json entry; no product code involved.
- Affected files: `scripts/production-bundle-safety-proof.mjs`, `package.json`.

## Decision 017 — Cross-route intent uses acknowledged memory; 404 recovery replaces invalid history

- Decision: keep the guarded canonical Quick Log storage owner, but make `App`'s typed React state
  the guaranteed handoff across lazy route mounting and clear it only after the destination
  acknowledges consumption. For 404, retain the last valid in-app route and replace the invalid
  history entry after applying the route guard.
- Why: a zero-delay custom event is not a queue and can precede a lazy consumer's listener; guarded
  storage can legitimately be unavailable. Likewise, browser history is not an application route
  authority and may point outside Qimmah. Both defects require an owner that survives the relevant
  asynchronous/foreign boundary.
- Alternatives rejected: a longer event timeout (race disguised as timing); forcing storage
  availability; swallowing the missed action; `history.back()` for direct entrants; hash assignment
  that pushes the invalid entry underneath a valid route.
- Risk: keeping both memory and the optional storage/event bridges can deliver duplicate signals.
  Consumption is idempotent (open/focus the same surface), storage is cleared before action, and the
  App state is acknowledged once. The built suite attacks all three blocked-storage targets.
- Reversibility: no persistent schema or entitlement authority changes. The change is confined to
  route handoff props/state, 404 recovery, and their tests.
- Affected files: `src/App.tsx`, `src/views/ProfileView.tsx`, `src/views/ProfileV2.tsx`,
  `src/views/NutritionView.tsx`, `scripts/quick-log-reliability-proof.ts`,
  `scripts/e2e/navigation-quick-log.mjs` and `package.json`.

## Decision 018 — WebKit reuses the exact critical contracts; an offline preflight never installs

- Decision: add one explicit `QIMMAH_BROWSER=webkit` selection to the four critical built-browser
  runners and aggregate them as `test:e2e:webkit`; keep Chromium the default. Make Auth preflight
  inspect only locally installed tools instead of invoking a network-installing `npx --yes` probe.
- Why: engine parity is meaningful only when the assertions are identical. A duplicated Safari test
  would drift. The Auth preflight labels itself offline, so an unbounded registry download in its
  informational section violates its own contract and can freeze final gates despite 19 green checks.
- Alternatives rejected: call Chromium evidence Safari evidence; copy four WebKit-specific scripts;
  ignore WebKit because the prior container lacked it; increase a timeout around `npx`; pretend the
  backend harness ran when Docker is absent.
- Risk: Playwright WebKit is Safari-equivalent, not every physical iOS device. The 246 assertions
  cover the named launch matrix; a later device lab can add physical-device evidence without
  changing these contracts. Full Auth server lifecycle remains explicitly EXTERNAL-003.
- Reversibility: runner selection and one package script only; no product or persistent data change.
- Affected files: `package.json`, `scripts/e2e/navigation-quick-log.mjs`,
  `scripts/e2e/navigation-history.mjs`, `scripts/e2e/dirty-state-recovery.mjs`,
  `scripts/e2e/preview-gate.mjs`, `scripts/e2e-auth/preflight.mjs`.

## Decision 006 — Error recovery never means product completion

- Decision: a render failure may retry/reload/contact support, but cannot mark onboarding complete or synthesize a plan.
- Why: completion is a data fact established only after the generated plan and profile persist successfully.
- Alternatives rejected: “escape to dashboard” by writing completion; a third setup-specific boundary; displaying raw stack/message.
- Risk: a deterministic setup render bug may require reload/support instead of entering the dashboard immediately; this is honest and preserves the draft.
- Reversibility: recovery actions can be expanded inside the same primitive without changing completion semantics.
- Affected files: `src/components/ErrorBoundary.tsx`, `src/views/SetupView.tsx`, `src/i18n/dict/errorBoundary.ts`, legacy error copy in `src/config/strings.ts`.

## Decision 007 — Canonical history beats a duplicate years field

- Decision: use `trainedBefore`, `totalMonths`, `lastTrained`, and `consistency`; preserve `declaredLevel` as the user's statement; derive generator inputs through existing `classifyExperience`/`classifyTrainingStatus` behavior.
- Why: this vocabulary already exists in the repository, distinguishes a newcomer from a returning athlete, and supports conservative first-week behavior. A single numeric years field cannot express recency or consistency.
- Alternatives rejected: keep both years and months; trust declared level alone; fabricate follow-ups for `never`; modify QAE.
- Risk: declared and derived levels can differ. Both raw facts and the derived plan outcome are intentionally observable and tested.
- Reversibility: v5 remains readable; new facts are additive in v6; legacy years is only read during migration and is not shown.
- Affected files: `onboardingV2Flow`, `onboardingV2Adapter`, `planBuilderAnswers`, `onboardingProfile`, onboarding types/UI/dictionaries and proofs.

## Decision 008 — Seven dense screens, conditional facts only

- Decision: organize the 18 questions into body, intent/level, history, goal, schedule, lifestyle and limitations; show history follow-ups only when the user has trained and injury areas only when an injury exists.
- Why: the contract requires meaningful facts, not 18 forced stops. Grouping related fields keeps the flow reviewable while conditionality prevents invented answers.
- Alternatives rejected: one screen per answer; hidden defaults; counting conditional follow-ups for users to whom they do not apply.
- Risk: dense screens need narrow-device and keyboard scrutiny; existing install, onboarding and journey browser suites cover the current implementation, with broader visual/accessibility work remaining in Layer 4.
- Reversibility: screen grouping is presentation; the stable question ids and persisted facts can survive future regrouping.
- Affected files: `OnboardingV2.tsx`, flow dictionaries and shared browser driver.

## Decision 009 — Nutrition success follows the primary write, and unknown quantity stays unknown

- Decision: the `qimmah:nutrition:v2` write is the commit point. Cache, mirrors, listeners, first-win state and input clearing occur only after it succeeds. Quantity editing is offered only for entries with an actual gram/serving basis.
- Why: a success screen or cleared form after quota failure is data loss; assigning one serving to a legacy row invents a fact and makes proportional editing dishonest.
- Alternatives rejected: silent best-effort primary writes; optimistic cache update with later reconciliation; defaulting unknown rows to one serving; a duplicate Nutrition editor/history store.
- Risk: a secondary best-effort mirror can still fail after the canonical day write, but the user-visible day record is durable and no primary failure is represented as success.
- Reversibility: PKG-3 is one isolated package; the adapter fields and inline editor can be reverted without schema migration because all additions are optional.
- Affected files: live Nutrition view/logger, `nutritionTracking`, `nutritionV2Model`, bilingual Nutrition dictionary and focused proofs.

## Decision 010 — The resumable workout survives until completion is fully committed

- Decision: the parent finish owner keeps the durable active snapshot until the finished session lands and active cleanup succeeds; the child never clears it. Any failure restores the whole pre-confirm Qimmah snapshot.
- Why: clearing first turns a recoverable storage fault into lost user work. Treating history success and active cleanup independently can also create a duplicate resume prompt after a success summary.
- Alternatives rejected: optimistic child clear; a fake retry button that only dismisses; best-effort active writes; showing success after only the in-memory state changes.
- Risk: a cleanup failure rolls back an otherwise-written completion and asks the user to try again. That is deliberately conservative and preserves a single truthful state.
- Reversibility: PKG-4 is isolated; no stored shape changes, only checked return values and ordering.
- Affected files: `activeWorkout`, `WorkoutMode`, `WorkoutView`, bilingual Workout dictionary and their focused proofs.

## Decision 011 — Measurements is a route over the existing canonical store

- Decision: expose `#/measurements` through the existing `ProgressV2` module and `measurementLog`/`historyStore`; do not create a third Progress implementation or any backend schema. Use the existing `progress.logMeasurement` action for add, edit and delete because they are the same paid measurement mutation boundary.
- Why: the local model already supports stable ids, full-list replacement, LWW timestamps and tombstones. The missing capability was route/UI/checked-result ownership, not storage shape.
- Alternatives rejected: another measurements store; a fake history from profile values; promising photos; backend/Supabase changes; UI-only Premium checks; blocking restore/sync behind Premium.
- Risk: Health-imported rows are intentionally read-only here and remain owned by the Apple Health disconnect flow. A future photo feature needs its own approved model instead of reviving the removed promise.
- Reversibility: PKG-5 adds one route/adapter and checked result APIs without migrating stored records; it is one revertable package.
- Affected files: routes/App, `ProgressV2`/Profile adapters, measurement/history writers, bilingual measurement dictionary, and focused/browser proofs.

## Decision 012 — Exercise detail has one route owner; the catalog remains immutable

- Decision: keep the existing 181-record exercise catalog, media and guidance corpora unchanged. Extract only the view filter into a pure consumer, and route both the full catalog and Machines through `#/exercises/:exerciseId`. Use history push for a library-opened detail and replacement for an invalid id or direct-link UI return.
- Why: the feature already existed and the defect was ownership drift, not missing data. Rebuilding or editing the catalog would violate verify-before-build and the contract's canonical-data prohibition.
- Alternatives rejected: a second detail component; local `openId` for Machines; always calling `history.back()`; pushing the unknown id back into history; duplicating search/filter logic in the proof.
- Risk: native/browser Back from a directly entered external deep link retains ordinary browser semantics; the in-product back action deliberately remains inside Qimmah. A later router migration must preserve the same push/replace distinction.
- Reversibility: PKG-6 changes route presentation and test seams only; no user data or canonical catalog migration exists.
- Affected files: `ExerciseLibraryView`, `ExerciseDetail`, `appRoutes`, the existing library dictionary, pure filter consumer and focused/browser proofs.

## Decision 013 — Settings exposes only real preferences; numbers follow language at presentation

- Decision: Language remains the only preference control. Units are metric-only and Numbers follow the selected language; both appear as factual non-interactive rows. Arabic uses Arabic-Indic digits and English uses Latin digits through one `formatNumber` boundary. Settings import/export remains owned exclusively by `DataManagementPanel`/portability.
- Why: the product has no imperial conversion capability or independent numeral preference. Making either row clickable would create dead UI or fake support. Locale-derived digits resolve the documented `٢٥`/`25` conflict without altering numeric storage.
- Alternatives rejected: build fake imperial support; add a numerals preference with incomplete consumers; choose Latin digits for Arabic despite the existing Arabic content system; keep per-screen formatters; preserve the manual Settings JSON importer.
- Risk: older untouched surfaces can still contain hardcoded numerals inside translated prose; those are dictionary content, not stored numeric values. The shared helper is now mandatory for dynamic Layer-3 presentation and expands as later layers touch remaining surfaces.
- Reversibility: the policy is a small presentation helper and informational dictionary; no schema or stored value changes. The portability reconnection removes a duplicate unsafe path without data migration.
- Affected files: Settings/DataManagementPanel, number formatting, Layer-3 Nutrition/Today/Workout/Progress displays, dedicated dictionary and focused/browser proofs.

## Decision 014 — Profile composes canonical owners and preserves its local return context

- Decision: keep `ProfileView` → `ProfileV2` as the live Profile owner, but compose the canonical `DataManagementPanel` and canonical `#/settings` route for security-sensitive data/account/preferences work. Distinguish signed-in account deletion from guest device-data management. `MobileShell` owns the route `h1`; Profile internal screens are subordinate headings.
- Why: Profile is a summary and launch surface, not a second Settings or portability implementation. Personality-specific truth and a marker on the current Profile history entry preserve user intent without creating another persistent product model or storage key.
- Alternatives rejected: maintain two import/export state machines; expose dead language/units/numeral rows inside Profile; promise account deletion to guests; always return from Settings to Profile home; keep visually duplicated `h1` headings.
- Risk: the return marker is intentionally bound to that browser-history entry and clears after one restoration; a new independent Profile visit does not restore an old sub-screen. This is UI context, not user data.
- Reversibility: no data schema changes. The package removes duplicated code, adds dictionary copy and test seams, and can be reverted as one checkpoint.
- Affected files: `ProfileV2`, `profileV2Model`, Profile dictionary, reminder/native controls and focused/browser proofs.
