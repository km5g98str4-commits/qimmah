# Qimmah Web Sovereign — autonomous founder decisions

Updated: 2026-08-14 (Layer 3 Today/Workout / PKG-4 verified)

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
