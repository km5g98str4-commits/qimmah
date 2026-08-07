# QAE Vision

**Status:** Draft for founder review · Phase 0.5 · Authorized by [CTO-QAE-001]

## 1. What QAE is

The **Qimmah Adaptive Engine** is a deterministic, rule-based, fully explainable coaching brain for the individual athlete. It is the **successor-superset** of Qimmah's existing TypeScript rule engines ([CTO-QAE-001] §1): it absorbs their verified behavior where intentionally adopted, and adds the missing adaptive loop — step progression, weekly trend evaluation, and evidence-gated plan adaptation.

It is **not** a parallel personalization system, a second plan engine, or a competing runtime. There is never more than one authority for the same decision.

**Determinism contract:** same inputs + same rule version + same clock ⇒ same outputs. No LLMs, no network, no UI state, no system time, no locale.

## 2. What every user receives

1. Resistance training. 2. Daily step target. 3. Calorie target. 4. Macro targets. 5. Progressive plan evolution. 6. Weekly evaluation. 7. Explainable adaptation recommendations.

**Dosage and complexity differ per user.** Beginner: machine-dominant, stable movements, lower volume, simpler progression. Intermediate: mixed equipment, moderate volume, more progression options. Advanced: free-weight priority, RIR/RPE support, planned fatigue management. These are *priorities, not absolute rules* — an advanced user may still receive a machine because of injury, stability, fatigue cost, preference, or history. Cardio is **out of the V1 adaptation engine** ([CTO-QAE-001] §7); it is representable in the domain model for future compatibility but is never the default fat-loss lever.

## 3. Non-negotiable principles

- **Proposal, not mutation.** The engine never edits a plan. It emits `AdaptationProposal`s the user accepts or rejects; the application layer applies accepted ones as a new plan version. This mirrors the founder's locked product decision: plan changes are always suggestions in v1, every change explained, every change reversible.
- **Safety limits the decision space, silently never** ([CTO-QAE-001] §4). Safety constraints are not proposals — they bound what may be issued or applied at all, with visible reason codes.
- **Adherence is never punished.** Poor adherence never earns a calorie cut. Recovery outranks optimization. One-day data never changes anything; trends do.
- **Explainability by construction.** Every output carries reason codes (never UI strings), evidence, confidence, and the rule-set manifest that produced it.
- **Honesty about uncertainty.** `keepPlan` and `requestMoreData` are first-class, explained outcomes.
- **Evidence before thresholds.** Every numeric rule is labeled `VERIFIED_EVIDENCE / PRODUCT_POLICY / ASSUMPTION / RESEARCH_REQUIRED` in `EVIDENCE-REGISTER.md`. No invented science.

## 4. Strategy: oracle → contract → Swift

```
Existing TypeScript  →  Characterization (LEGACY-ENGINE-MAP)
                     →  Language-neutral contracts (Contracts/)
                     →  JSON golden fixtures (Fixtures/)
                     →  QAE specification (Docs/)
                     →  Future Pure Swift implementation
                     →  Parity validation against goldens
                     →  TypeScript legacy retirement
```

TypeScript is the **temporary behavioral oracle**, not the permanent architecture. The final QAE runtime target is a **Pure Swift domain** inside the future native app (`qimmah-app → native → Modules → QimmahDomain/QimmahAdaptiveEngine`). Until that foundation exists, this branch (`claude/qae-architecture-design-fhg2mh`, directory `QimmahAdaptiveEngine/`) is a specification/incubation lane: Docs, Contracts, Fixtures, Research only — no runtime production code.

## 5. V1 module set ([CTO-QAE-001] §16)

1. DataQuality · 2. IncrementalAssessment · 3. AdaptiveQuestion · 4. Safety · 5. Training · 6. Nutrition · 7. Steps · 8. Recovery · 9. WeeklyTrends · 10. Adaptation · 11. DecisionResolver · 12. ChangeBudget · 13. Explainability · 14. GoalLifecycle · 15. ReturningUserPolicy · 16. RamadanContext · 17. Versioning

Ramadan is **in** V1 as a first-class explicit context (the engine receives fasting context; it makes no religious or legal assumptions). Cardio is future-compatible only.

## 6. Out of scope for QAE V1

- Cardio programming engine (representable, not built).
- Supplements/medications logic — Qimmah tracks these for display only; QAE makes no recommendations and no medical claims, ever.
- Nutrition budget features (founder-locked out of v1).
- Automatic goal changes (transitions require explicit user confirmation unless required by a safety constraint — see GOAL-LIFECYCLE.md).
- Any UI, storage, sync, or localization concern.

## 7. Quality bar

Correctness, determinism, explainability, maintainability, safety, testability, Swift portability — in that spirit, never speed. Small composable rules; no giant switch, no giant rule file, no untraceable condition trees. Every gate that guards a behavior ships with a counter-test that attacks it (charter §4.2).
