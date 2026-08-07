# QAE Architecture

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001]

## 1. Layering

```
┌─────────────────────────────────────────────────────────────┐
│ HOST (out of QAE)                                           │
│  React/Capacitor today → SwiftUI later                      │
│  storage · sync · i18n · notifications · HealthKit · clock  │
└──────────────────────────┬──────────────────────────────────┘
                           │  Contracts/ (the ONLY surface)
┌──────────────────────────▼──────────────────────────────────┐
│ QAE DOMAIN (pure kernel — no I/O, no time, no locale)       │
│                                                             │
│  Shared ── value objects · Clock/ReviewPeriod · Confidence  │
│  DataQuality → IncrementalAssessment ⇄ AdaptiveQuestion     │
│  Training · ExerciseSelection · Nutrition · Steps           │
│  Recovery · WeeklyTrends · GoalLifecycle · ReturningUser    │
│  RamadanContext · Adaptation → DecisionResolver             │
│  ChangeBudget · Explainability · Versioning                 │
│  SafetyPolicy  (wraps everything — see SAFETY-POLICY.md)    │
└─────────────────────────────────────────────────────────────┘
```

The domain is one pure function family behind the contracts:

```
assess(request)        → PartialAthleteState | AthleteProfile
selectQuestion(request)→ QuestionSelection
generatePlan(request)  → PlanCandidate + SafetyVerdict
evaluateWeek(request)  → TrendReport + AdaptationProposal[] + SafetyVerdicts
checkAction(request)   → SafetyVerdict            (checkpoint for user-initiated actions)
```

Every request carries `now`, all data, and the rule-set manifest; every response embeds the manifest that produced it. Nothing is read from ambient state.

## 2. Directory structure (this phase: Docs/Contracts/Fixtures/Research only)

```
QimmahAdaptiveEngine/
├── Docs/           # this specification set
├── Contracts/      # language-neutral JSON Schemas + API + reason-code registry
├── Fixtures/
│   └── spec/       # scenario SPECIFICATIONS (Phase 0.5 — expected outputs labeled,
│                   #  not invented; goldens come later from characterization/policy)
├── Research/       # research working notes feeding EVIDENCE-REGISTER.md
└── (future, after separate approval)
    Domain/ · Rules/ · Tests/ · Tools/
```

Future `Domain/` layout follows the module set of QAE-VISION §5, with `Domain/Shared` for value objects and `Contracts/` as the only surface hosts may import.

## 3. Dependency rules (to be lint-enforced in the implementation wave)

1. `Domain/*` imports `Domain/Shared` and contract types only. Never host, storage, i18n, network, or UI namespaces.
2. Engines depend on **contract types** of other engines, not their internals (e.g., Adaptation consumes `TrendReport`, not WeeklyTrends internals).
3. No adaptation rule reads raw observations — only `QualityAssessedSeries` from DataQuality ([CTO-QAE-001] §10). Enforced by type: raw observation types are not importable outside DataQuality.
4. Only SafetyPolicy can construct issuable/appliable types (see SAFETY-POLICY.md §4).
5. Rules access data only through the immutable `EvaluationContext`.

## 4. The evaluation pipeline (weekly review)

```
RawObservations ─▶ DataQuality ─▶ QualityAssessedSeries + DataQualityReport
                                    │
GoalLifecycle state ────────────────┤
RamadanContext (host-supplied) ─────┤
ReturningUser state ────────────────┤
                                    ▼
                             WeeklyTrends ─▶ TrendReport
                                    ▼
              Rules/ (Recovery · Adaptation · Steps · Nutrition · Training)
                                    ▼        CandidateProposal[]
                          SafetyPolicy.screen        (checkpoint 2a)
                                    ▼
                          DecisionResolver
                            group by TargetVariable
                            resolve by PriorityClass → score → ruleId
                            apply cooldowns
                            apply ChangeBudget (1 major | composite, ≤1 minor)
                                    ▼
                          SafetyPolicy.validateSet   (checkpoint 2b: composition)
                                    ▼
                     AdaptationProposal[] + Explainability trace
```

User accepts → host calls `checkAction` (checkpoint 3) → host applies → **new PlanVersion**. The engine never mutates.

## 5. The onboarding pipeline (incremental assessment, [CTO-QAE-001] §9)

```
KnownData ─▶ IncrementalAssessment ─▶ PartialAthleteState
                     ▲                      │
                     │                      ▼
              new evidence            QuestionNeed analysis (EvidenceGaps)
                     │                      ▼
                     └──── answer ◀── AdaptiveQuestion.selectNext
                                            │
                       completeness/confidence gates pass?
                                            ▼
                              AthleteProfile (finalized)
                                            ▼
                    Training + Nutrition + Steps → PlanCandidate
                                            ▼
                        SafetyPolicy.validatePlan (checkpoint 1)
```

The question engine never requires a finalized profile; it operates on `PartialAthleteState` + `AssessmentCompleteness`.

## 6. Versioning

- Each rule carries its own SemVer; each domain rule-pack carries a version; `RuleSetManifest = {perDomainVersions, contentHash}` (canonical hashing per NUMERIC-CONTRACT §3).
- Every response embeds the manifest. Every stored proposal/plan version records the manifest that created it. "Which rule version created this recommendation?" is always answerable from data.
- Plans are versioned aggregates: applying an accepted proposal creates `PlanVersion n+1` with `{basedOn: n, appliedProposalId, manifest}` — reversibility is structural.

## 7. Determinism requirements

See NUMERIC-CONTRACT.md — integers only, declared rounding, total ordering, explicit clock, no randomness. The determinism fuzz test (same request evaluated repeatedly and across permuted input orderings after canonicalization) is part of the future gate (TESTING-STRATEGY.md).

## 8. Swift portability mapping

| Contract concept | TypeScript (oracle) | Swift (target) |
|---|---|---|
| Closed enums | string literal unions | `enum` with raw `String` |
| ADT actions | discriminated unions (`kind`) | `enum` with associated values |
| Sealed safety types | branded/opaque types | non-public init in SafetyPolicy module |
| Canonical integers | `number` (lint-guarded ≤2^53) | `Int64` |
| Canonical JSON | custom stable serializer | custom stable serializer (no `JSONEncoder` key-order reliance) |
| Fixtures | shared `Fixtures/` JSON | identical files, conformance harness |

The goldens are the binding contract: the Swift port must reproduce every canonical value byte-for-byte.
