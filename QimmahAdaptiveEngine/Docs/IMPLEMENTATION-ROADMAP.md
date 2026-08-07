# QAE Implementation Roadmap

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001]
Strategy per §2 of the authorization: **TypeScript is the temporary behavioral oracle; the final runtime target is Pure Swift.** No runtime implementation begins without separate founder approval ([CTO-QAE-001] §20).

## Master pipeline

```
Existing TypeScript → Characterization → Language-neutral contracts → JSON golden fixtures
→ QAE specification → Future Pure Swift implementation → Parity validation → TS legacy retirement
```

## Phase 0.5 — Specification (THIS PHASE, complete on this branch)

Deliverables: the Docs/ set · Contracts/ drafts · Fixtures/spec/ (34 scenarios, labeled) · LEGACY-ENGINE-MAP · EVIDENCE-REGISTER · contradiction review. **Stop condition: no runtime code.**

## Phase 1 — Contract freeze & oracle harness *(needs approval)*

- Resolve UNRESOLVED decisions (see QAE-PHASE0.5-REPORT); freeze Contracts v1 schemas.
- Build the **oracle harness** (Tools/): runs legacy TS functions (`computeTargets`, `generatePlan`, personalization engine, recoveryEngine v2) against fixture inputs to *generate* `CHARACTERIZED_EXISTING` golden outputs. This is test tooling, not product runtime — but it is code, so it waits for approval.
- Exit: every characterized fixture has machine-generated goldens; fixture linter green.

## Phase 2 — Domain kernel + Safety *(Swift target begins here, or TS-first if founder re-scopes)*

- `Domain/Shared` value objects, canonical serialization + hashing, predicate interpreter, rule registry/manifest.
- SafetyPolicy skeleton with sealed types + the three checkpoints; minors pack (characterized).
- Exit: safety counter-tests pass (bypass unconstructible, by name); manifest hashing golden-stable cross-language.

## Phase 3 — DataQuality + IncrementalAssessment + AdaptiveQuestion

- Observation validation/normalization/quality; localDate arithmetic goldens.
- PartialAthleteState, completeness gates; question engine parity with legacy bank (characterized fixtures green).
- Exit: question-path fixtures reproduce legacy asked-sequences; DataQuality fixtures green.

## Phase 4 — Training + Nutrition + Steps (initial plan generation)

- ExerciseMetadata-driven selection (superseding id-blocklists); BMR/TDEE/macros per contract; step baseline targets.
- Parity mode vs legacy plan generator where `preserve`; documented deviations where `supersede`.
- Exit: initial-plan sections of all fixtures green; deviation list = exactly the approved supersessions.

## Phase 5 — WeeklyTrends + Recovery + Contexts

- Trend math (per contract, integer-canonical), recovery evaluation (recoveryEngine v2 is the characterized baseline), RamadanContext modifiers, GoalLifecycle state, ReturningUser ramp.
- Exit: trend/recovery/context fixtures green.

## Phase 6 — Adaptation + DecisionResolver + ChangeBudget + Explainability

- The genuinely new core. All adaptation rules (register-labeled thresholds only), resolver pipeline, budget, cooldowns, reason traces.
- Exit: adaptation sections of all fixtures green incl. S34 (recovery beats plateau); property tests 1–9 green.

## Phase 7 — Hardening

- Property-based + mutation + determinism fuzz; counter-test catalogue complete; mutation-score threshold met.

## Phase 8 — Qimmah integration plan *(document only; execution founder-gated)*

- Swift module packaging plan for `qimmah-app → native → Modules → QimmahDomain/QimmahAdaptiveEngine`.
- Host adapter specs (storage, clock, HealthKit, i18n mapping of reason codes).
- **Parity validation plan** (Swift vs goldens byte-for-byte) and **TS legacy retirement sequence** (which modules retire when, with the two-authorities rule enforced at each step: a decision moves to QAE only when its TS counterpart is disabled in the same release).

## Recommended first runtime wave (for the report's item 9)

**Phase 1 (oracle harness) + Phase 2 (kernel & safety).** Rationale: the harness converts characterization from prose to executable goldens — everything downstream depends on it; and the safety kernel is the highest-risk architecture claim (sealed non-bypassability) — proving it first, in the target language, retires the biggest unknown while touching zero product behavior. Both are small, independently reviewable waves in charter size.
