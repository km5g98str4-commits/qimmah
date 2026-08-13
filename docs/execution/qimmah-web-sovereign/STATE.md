# Qimmah Web Sovereign — execution state

Updated: 2026-08-13 (Layer 1 / PKG-1 verified)

## Provenance

- Contract: `[QIM-WEB-SOVEREIGN-ULTIMATE-001]` (`SHA-256 555221b88e93d9fc86e1dbc8134dad780253c9e195c4c74bef12283857e95336`).
- Baseline status: **VERIFIED**.
- Remote: `origin` → `https://github.com/km5g98str4-commits/qimmah.git`.
- Baseline SHA: `af5274b2f8558079b43ad1d2dc2676b03db23d2b`.
- Containing remote ref: `origin/claude/founder-ux-access-gate-0rn49k`.
- Execution branch: `codex/qimmah-web-sovereign-001`.
- Execution worktree: `/private/tmp/qimmah-web-sovereign-001`.
- Package parent/baseline: `af5274b2f8558079b43ad1d2dc2676b03db23d2b`; after the package commit, the execution branch's `HEAD` is the authoritative checkpoint pointer.
- Historical production reference: `cc60adf` (document only; no rollback performed).
- Existing checkout `codex/ui-polish` and every other worktree were treated as read-only.

Resolution evidence:

```text
git cat-file -t af5274b...                         → commit
git branch -r --contains af5274b...                → origin/claude/founder-ux-access-gate-0rn49k
git rev-parse HEAD (new worktree)                   → af5274b2f8558079b43ad1d2dc2676b03db23d2b
git status --short --branch (before PKG-0 edits)    → clean
```

`git fetch --all --tags` succeeded. A later `git ls-remote` probe hit a transient DNS failure; local object/ref provenance is exact, but push connectivity must be re-proved at the package checkpoint.

## Current package

- Package completed: `PKG-0` at `f78676e` and pushed to `origin/codex/qimmah-web-sovereign-001`.
- Package verified for checkpoint: Layer 1 survival/access convergence.
- Reused source: immutable commit `71129f9c310f750cc24d1ed1fcf1a8d013f439b1`, applied without its original commit and reviewed hunk-by-hunk inside this branch.
- Additional corrections made during independent review: a lazy `AppLoading` was removed from a `Suspense` fallback; deferred native imports now catch/report rejected chunks; the setup-only false-completion boundary was replaced by the canonical route boundary; the canonical boundary gained focus transfer, support email, and a non-sensitive error reference.
- No dependency, backend, Supabase, QAE, canonical dataset, service-worker, deployment, or Salla authority file changed.
- Next action: commit and push `[PKG-1][green]`, then begin Layer 2 from that remote checkpoint.

### PKG-1 evidence so far

| Evidence | Result |
| --- | --- |
| `npm run test:access-gate` | PASS — 72/72 including all live mutation guards and named bypass simulations |
| `npm run test:activation-ui` | PASS — 13/13 including modal semantics and fail-closed production activation |
| `npm run test:error-boundary` | PASS — 14/14 including no third primitive, no false completion, one exact support address, references, and counter-proofs |
| `npm run test:progress-v2` | PASS — 11/11 |
| `npm run test:recovery` | PASS — 15/15 |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — 2,552 modules |
| `npm run test:e2e:preview-gate` | PASS — 34/34, Preview plus activated mock personality; no unhandled page error |
| `npm run test:e2e:install-overlap` | PASS — 200/200 across 320/360/375/390/430 and ar/en |
| `npm run test:e2e:nutrition` | PASS — 91/91 across crash, quick-log, real pointer and macro matrices |
| Fresh full `npm run test:gate` attempt 1 | NAMED FAIL at `test:no-template-language`: legitimate reload copy was hard-bound to legacy `config/strings.ts` after canonical copy moved to its dict |
| Fresh full `npm run test:gate` after proof repair | PASS — exit 0 through `test:workout-day-source` 19/19 |

## Baseline gates

| Gate | Result | Notes |
| --- | --- | --- |
| `npm ci` | PASS | 361 packages installed from lockfile. |
| `npm run typecheck` | PASS | exit 0. |
| `npm run lint` | PASS | exit 0. |
| `npm run build` | PASS | exit 0; Vite built 2,549 modules. |
| `npm run test:gate` (sandbox) | ENVIRONMENT FAIL | first browser-backed proof could not bind `127.0.0.1` (`listen EPERM`). |
| `npm run test:gate` (local-listen permission) | PASS | exit 0 through final `test:workout-day-source` (19/19). |
| `npm audit --json` | 3 HIGH, 0 CRITICAL | all three are transitive build/dev-chain packages; no dependency change authorized. See BUG-003. |

## Canonical implementation map

Rule: discover canonical → route to it → isolate legacy. No third implementation is authorized.

| Concern | Canonical owner | Live consumers | Duplicate / legacy alternatives |
| --- | --- | --- | --- |
| Routes/history | `src/lib/appRoutes.ts`; composition in `src/App.tsx` | every public/auth/app hash route | `view` state inside `App` mirrors the hash; old auth-internal mode was already removed |
| First-run/onboarding UI | `src/views/OnboardingV2.tsx` + pure state in `src/lib/onboardingV2Flow.ts` | `src/views/SetupView.tsx` | adaptive bank under `src/lib/personalization/**` is implemented/tested but not the live UI; `CustomizationCenter` is post-onboarding editing |
| Onboarding persistence | `src/lib/onboarding.ts` envelope + `onboardingV2Flow` v5 draft guard | live onboarding/resume | legacy/current completed profile in `src/lib/onboardingProfile.ts` is a separate generated source |
| Profile used by plan | `OnboardingProfile` built by `src/lib/planBuilderAnswers.ts`; bridged by `src/lib/onboardingProfile.ts` | calculators, plan generator, customization | adaptive `PersonalizationProfile` is local/read-only to this program until deliberately routed |
| Plan generation | `src/lib/planGenerator.ts` and `src/lib/planRationale.ts` | onboarding handoff, customization, Today/Workout | no rewrite; QAE prescription logic is a hard no-touch zone |
| Premium/access | `src/lib/access/paidActions.ts`, `guard.ts`, `entitlementStore.ts`, `provider.tsx` | mutation handlers and writers | UI-only checks are insufficient; query/localStorage/Salla return are not authority |
| Guest Preview | entitlement status `none` plus `ALWAYS_BROWSABLE`; central `PremiumGate` | main app surfaces | `VITE_ENTITLEMENT_MODE=mock` is test-only and session-scoped |
| Current workout/day | `src/lib/workoutDaySource.ts` | `TodayV2`, `WorkoutView` | prior rotating/index logic is retained only as named fallback when no schedule exists |
| Workout persistence | `src/lib/activeWorkout.ts`, `finishWorkout.ts`, `historyStore.ts` | `WorkoutView` | legacy `activeSession.ts` is retired/dead per data registry |
| Nutrition display/persistence | `src/views/NutritionView.tsx`; `src/lib/nutritionV2Model.ts`; owner-scoped history in `nutritionHistory.ts` | Nutrition tab, Quick Log | `NutritionV2.tsx` is not the live route wrapper; do not fork a third flow |
| Measurements/progress | data: `measurementLog.ts`/`historyStore.ts`; current experience: `ProgressV2.tsx` | Progress, calculator | live wrapper still renders older `ProgressView` at baseline; this is BUG-002 |
| Exercises | `ExerciseLibraryView.tsx`; catalog `src/data/exercises.ts`; labels/media helpers | workout/library/deep link | canonical dataset is read-only |
| Auth | `authContext.tsx`, `LoginView.tsx`, route-owned `login/signup/forgot` | `App.tsx` | no local secrets; Supabase config/semantics are no-touch |
| Language | `src/i18n/LanguageContext.tsx`; persisted device preference in `appPreferences.ts` | all routes | hardcoded bilingual helpers remain historical debt and are not a new pattern |
| Number presentation | presentation helpers (`formatNumber`/screen dictionaries where present) | progress/nutrition/workout | stored numeric data must remain numeric |
| Error handling | `src/components/ErrorBoundary.tsx` (`ErrorBoundary`, `RouteErrorBoundary`) + `src/i18n/dict/errorBoundary.ts` | `main.tsx`, route shell, setup | setup reuses the canonical route primitive; prior duplicate strings in `config/strings.ts` are isolated/removed |
| Local data registry | `src/lib/userDataKeys.ts` | account wipe, portability, sync allowlists | raw key literals not registered here require investigation |

## Route inventory

Public/auth/product routes declared by `ROUTES`:

`start`, `login`, `signup`, `forgot`, `setup`, `dashboard`, `workout`, `exercises`, `nutrition`, `progress`, `steps`, `profile`, `calc`, `recovery`, `settings`, `privacy`, `terms`, `contact`, `reset`, `productReview`, `stats`.

- `notfound` and `accountRequired` are internal only.
- `#/exercises/:exerciseId` uses `resourceIdFromHash`; refresh preserves the id.
- Main tabs: `dashboard`, `workout`, `nutrition`, `progress`, `profile`.
- Existing named browser coverage: `test:e2e:navigation`, `test:e2e:onboarding`, `test:e2e:plan-handoff`.

## Paid mutation inventory

Central enum (`PAID_ACTIONS`) currently has 13 actions:

`workout.start`, `workout.startEmpty`, `workout.logSet`, `workout.finish`, `nutrition.addFood`, `nutrition.removeFood`, `nutrition.quickAdd`, `nutrition.water`, `nutrition.toggleMeal`, `progress.logWeight`, `progress.logMeasurement`, `plan.saveEdit`, `recovery.log`.

`test:access-gate` now verifies writer-level guards plus every live action guard. Recovery submit and ProgressV2 measurement save open the one coherent Premium surface before the writer, and the browser attack proves they leave storage untouched in Preview.

## Storage/schema inventory

- Canonical registry: `src/lib/userDataKeys.ts`.
- High-risk primary state confirmed: onboarding envelope/profile; active workout; workout/history logs; Nutrition V2 day/history; measurement logs; recovery logs; customization; account ownership; sync queue/backup/meta; local tracking.
- Device-only preferences confirmed: language/theme/haptics (`qimmah:prefs:v1`), UI mode, install dismissals, product caches, Supabase auth token key.
- Adaptive personalization state/profile are already owner-scoped and explicitly excluded from sync because they can contain health screening answers.
- Legacy keys are explicitly classified `retire`; no broad deletion is permitted.
- Dirty-state proof obligations remain: old onboarding draft, completed guest, invalid/truncated JSON, array-for-object, missing/unknown versions, stale conditionals, quota failure.

## Onboarding question inventory (baseline)

The live V2 UI visibly collects 14 candidate answers:

1. age
2. sex
3. height
4. weight
5. intent
6. declared level
7. training years (conditional)
8. goal
9. days/week
10. session duration
11. place
12. equipment preference
13. current-injury yes/no
14. injury areas (conditional)

Current consumer verdict:

- 13 have a safety, calculation, routing, presentation, or generation consumer.
- `equipment preference` is explicitly marked “collected for UX only” and discarded by `onboardingV2Adapter`; it does **not** qualify under the 18-question contract.
- Canonical repository vocabulary for the required training-history concepts exists on an advanced read-only QAE line: `trainedBefore`, `totalMonths`, `lastTrained`, `consistency`. That line also states the live generator does not yet consume them. QAE files remain read-only; frontend adoption must prove a real non-QAE consumer or the questions cannot be counted.
- Baseline truth: 13 proven meaningful questions, not 18. Final N remains unresolved pending Layer 2 implementation and counter-proofs; no filler will be added.

## Premium / Salla / activation truth

- Default frontend purchase destination is `https://salla.sa/Qimmahsa` from `src/config/product.ts`.
- Repository search found neither approved paid product id `1181109938` nor negative id `1084925309` in a purchase path.
- The default URL is a store root, not a provable product-specific URL. No URL format will be guessed.
- Production `redeemActivationCode` returns `offline` unless the build-only mock mode is enabled. No reviewed live redemption backend is available on this baseline.
- Consequence until external evidence changes: paid activation is `EXTERNALLY_BLOCKED`; `GO_PAID_COMMERCIAL_FUNNEL` cannot be YES. Preview readiness remains independently reachable.

## Error-boundary inventory

- App primitive: `ErrorBoundary` with reload, focus transfer, exact support email, and a client-generated non-sensitive `QW-*` reference.
- Route primitive: `RouteErrorBoundary` with retry/re-import, the same diagnostics contract, and stale-reference reset.
- Setup reuses `RouteErrorBoundary`; it cannot mark onboarding complete after a render failure.
- Console evidence includes the same reference id shown to the user; the UI exposes neither stack/message nor user data.

## Historical acceptance registry

Status here means evidence at this checkpoint, not remembered intent.

| # | Target | Layer-0 evidence status |
| ---: | --- | --- |
| 1 | Nutrition mobile crash/ejection | PASS — `test:e2e:nutrition` 91/91 |
| 2 | Preview could log food | PASS — browser attack opens Premium and storage remains unchanged |
| 3 | Preview could start/log/finish workout | PASS — browser attack rejects planted session and writes none |
| 4 | install banner covered handoff CTA | `test:bottom-overlay` green; real hit-test pending |
| 5 | Today/Workout mismatch | `test:workout-day-source` 19/19 green |
| 6 | Breakfast Add pointer miss | PASS — real pointer at 320/390 and ≥44px |
| 7 | macro clipping | PASS — ar/en at 320/390/640/768/894/1280, no clipping/overflow |
| 8 | Language row dead | runtime/settings E2E pending |
| 9 | Units row dead | active discovery pending |
| 10 | Numbers row dead | active discovery pending |
| 11 | Arabic/Western numeral inconsistency | active visual discovery pending |
| 12 | Measurements route/promise | PASS — live route converged to ProgressV2; Preview measurement attack 0 writes |
| 13 | auth route/state | named navigation E2E pending |
| 14 | onboarding reload resume | named navigation/onboarding E2E pending |
| 15 | returning guest route | named navigation E2E pending |
| 16 | exercise detail Back | named navigation E2E pending |
| 17 | exercise deep-link | named navigation E2E pending |
| 18 | deterministic 404 | named navigation E2E pending |
| 19 | whitespace-only signup name | named navigation E2E pending |
| 20 | sub-44px touch targets | PARTIAL PASS — bottom/nav 200/200 and Premium close/input corrected; full-site audit remains Layer 4 |
| 21 | silent persistence failure | `test:storage-honesty` green for covered writers; broader UI proof pending |
| 22 | malformed storage recovery | multiple unit proofs green; browser dirty pass pending |
| 23 | never-trained semantics | not collected by live V2 baseline; OPEN Layer 2 |
| 24 | minor/age eligibility | `test:age-13`, `test:minors`, `test:policy` green |
| 25 | Preview direct/back/refresh/dispatch | PASS for paid-action matrix — `test:e2e:preview-gate` 34/34; broader navigation remains Layer 3 |
| 26 | Salla id 1181109938 / reject 1084925309 | EXTERNALLY_BLOCKED: only store root found |
| 27 | no production Premium hook | source proof green; final built bundle counter-proof pending |
| 28 | install overlap real hit test | PASS — 200/200 with named synthetic regression attacks |
| 29 | old guest/draft preserved | unit coverage partial; dirty browser pass pending |
| 30 | no localhost/dev endpoint in production | final artifact scan pending |

## Current severity counts

- P0: 0 confirmed.
- P1: 0 internal open; BUG-001, BUG-002 and BUG-004 are resolved and fully gated.
- P2: 2 open (BUG-003, BUG-006); BUG-005 is resolved and fully gated.
- P3: 0.
- External blockers: product-specific Salla URL not present; live activation backend unavailable; WebKit availability not tested yet.

## Skills used at pre-implementation checkpoint

| Skill | Recommendation applied |
| --- | --- |
| senior-frontend | preserve React/Vite owners, typed boundaries, accessibility and measured bundle work |
| frontend-design | keep v3/Qimmah visual identity; copy is functional; no redesign without a defect |
| a11y-audit | AA launch floor; names, labels, focus, dialogs, 44px targets |
| playwright | real pointer/keyboard/browser evidence, snapshot after state changes |
| security-review | trace attacker-controlled data before reporting; fail closed; no fake authority |
| performance-profiler | measure before optimization; performance remains Layer 6 |
| verification-before-completion | fresh full command evidence before checkpoint/complete claims |
| code-review | standards/spec review will be applied to the execution diff before final simulation |

## Evidence map

| DoD / claim | Named evidence |
| --- | --- |
| Exact baseline | `git cat-file`, containing-ref query, execution-worktree `git rev-parse` |
| Deterministic dependencies | `npm ci` exit 0 |
| Baseline static health | `typecheck`, `lint`, production `build` exit 0 |
| Baseline repository contract | full `test:gate` exit 0 |
| Today/Workout source consistency | `test:workout-day-source` 19/19 |
| Central paid-action enum/writer guards | `test:access-gate` 42/42 at baseline |
| Salla current truth | repository search + `src/config/product.ts` |
| Storage registry | `src/lib/userDataKeys.ts`; `test:data-safety`, `test:canonical` in full gate |
| Onboarding baseline shape | `onboardingV2Flow.ts`, adapter consumer trace, full onboarding-focused unit proofs |
| Production artifact built | baseline `npm run build`; final artifact proof still pending |
