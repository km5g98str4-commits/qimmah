# QAE Implementation Roadmap

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001]
Strategy per §2 of the authorization: **TypeScript is the temporary behavioral oracle; the final runtime target is Pure Swift.** No runtime implementation begins without separate founder approval ([CTO-QAE-001] §20).

## Master pipeline

```
Existing TypeScript → Characterization → Language-neutral contracts → JSON golden fixtures
→ QAE specification → Future Pure Swift implementation → Parity validation → TS legacy retirement
```

## Phase 0.5 — Specification ✅ APPROVED by [CTO-QAE-002]

Delivered: the Docs/ set · Contracts/ drafts · Fixtures/spec/ (34 scenarios, labeled) · LEGACY-ENGINE-MAP (+ LEGACY_DEFECT_REGISTER) · EVIDENCE-REGISTER · contradiction review. The architecture is now **baseline** — no further redesigns unless a critical architectural defect appears.

## The locked runtime rule ([CTO-QAE-002])

> No runtime may directly mutate a plan. Only:
> `Evidence → Candidate Rules → Candidate Decisions → Safety → Conflict Resolution → Change Budget → Proposal → User Decision → Applied Plan`
> No shortcuts. No hidden mutations.

## Locked runtime implementation order ([CTO-QAE-002])

1. Oracle Harness → 2. Canonical Domain Types → 3. SafetyPolicy → 4. Decision Pipeline → 5. Question Engine → 6. Training → 7. Nutrition → 8. Recovery → 9. Steps → 10. Weekly Trends → 11. Adaptation Engine → 12. Integration.

**Phase 1: ✅ APPROVED by [CTO-QAE-003]. Phase 2: ✅ ACCEPTED by [CTO-QAE-004]. Phase 3: ✅ APPROVED by [CTO-QAE-005] (Evidence & Question foundation locked). Phase 4 (real personalization content) delivered per [CTO-QAE-005] — see QAE-PHASE4-REPORT.md. Phase 4.5 (AthleteProfile contract freeze v1.0.0 — the single normalization boundary; downstream engines never read question ids) delivered per [CTO-QAE-006] — see QAE-PHASE4.5-REPORT.md and QAE-ATHLETE-PROFILE-CONTRACT.md.** The golden law applies from here forward: 100 % golden compatibility before any optimization.

## Architecture Lock ([CTO-QAE-003])

Locked as of Phase 1 approval ([CTO-QAE-003]): **Contracts · Canonical Types · Oracle Harness · SafetyPolicy · Integer Canonicalization · Rule Manifest · Reason Codes.**
Locked as of Phase 2 approval ([CTO-QAE-004]): **Decision Pipeline · Proposal Model · Provenance Contract · Explainability Layers · Conflict Resolver · Change Budget · Composite Evaluation Order · Pipeline Trace Model** — bound by `PIPELINE_INVARIANTS.md`; breaches are first-degree bugs.
Any future change goes through **Migration, never direct edit**: a versioned change record stating what changes, why, the golden impact (proven by re-running the harness before/after), and the compatibility path. Golden-neutral *additive* extensions (new pure functions, new codes) are migrations too — recorded with a re-verified byte-identical golden run.

**Authorized now (Phase 2, [CTO-QAE-003]): Decision Pipeline Foundation ONLY** — evidence ingestion · candidate rule generation · safety evaluation · conflict resolution · change budget · proposal generation · decision provenance · explainability layers. **Forbidden in this phase:** any nutrition, training, adaptation, question, or recovery domain logic — the pipeline is domain-agnostic and rules are declarative data. Exit criteria (all mandatory): 100 % determinism · zero hidden state · zero mutable globals · zero side effects · every proposal replayable · every decision explainable · every rejection reason coded · every rule individually testable · fixed composite evaluation order · complete decision provenance.

**Language note (Phase 1 reality):** the harness must execute the legacy TypeScript oracle, and this environment has no Swift toolchain, so Phase-1 canonical types and SafetyPolicy foundation are strict-TypeScript **contract/validation infrastructure inside `QimmahAdaptiveEngine/`** — never imported by the app (no second authority), consumed only by the harness and QAE tests. The Pure Swift runtime remains the final target; these components define and exercise the exact goldens the Swift port must reproduce.

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
