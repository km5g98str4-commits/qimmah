# QAE Phase 2 Report — Decision Pipeline Foundation

**Per [CTO-QAE-003].** Scope honored: the pipeline only — evidence ingestion, candidate rule generation, safety evaluation, conflict resolution, change budget, proposal generation, decision provenance, explainability layers. **Zero domain intelligence**: no nutrition, training, adaptation, question, or recovery logic exists anywhere in `Domain/Decisions/` — rules are declarative data, and the proof suite exercises the pipeline with synthetic rules only.

## What was built

| Component | Location | Notes |
|---|---|---|
| Model | `Domain/Decisions/model.ts` | `RuleDef` (fully declarative: predicates + evidence specs + action + class/score + cooldown), `DecisionRequest` (now/seed/oracleVersion/facts/series/history — nothing ambient), `PipelineProposal` with mandatory `DecisionProvenance`, `ReasonTrace`, `QAE_ENGINE_VERSION = 0.2.0` |
| Predicates | `Domain/Decisions/predicates.ts` | Total evaluator (unknown path ⇒ false — a rule cannot fire on absent data) |
| Manifest | `Domain/Decisions/manifest.ts` | Content-addressed rule-set identity: canonical serialization + pure SHA-256 (`Domain/Shared/sha256.ts`, FIPS vectors proven) — a matching hash IS the rule set |
| Resolver | `Domain/Decisions/resolver.ts` | The locked pipeline: evidence gates → candidates → composite safety screen → same-variable conflict resolution (class → score → ruleId ordinal) → cooldowns (accepted AND rejected) → change budget (≤1 major/composite + ≤1 minor) → sealed proposals with provenance → first-class explained `keepPlan` |
| Explainability | `Domain/Decisions/explain.ts` | Three layers, never mixed: `DeveloperReason` (mechanical SCREAMING_SNAKE), `AuditReason` (deterministic structured sentences), `UserReason` (codes only — host maps to copy) |
| Proof suite | `Tools/qae-decision-proof.ts` + runner | 38 checks, every exit criterion by name |

Supporting migrations under the Architecture Lock (all golden-neutral, harness re-run verified byte-identical): `proposal.schema` v0.2.0 (+`DecisionProvenance`), reason-codes v0.1.1 (+3 pipeline codes), `time.ts` +`daysFromCivil`/`localDateToDays` (cooldown day math). New mandated docs/sections: `DECISION_PROVENANCE.md`, explainability three-layer section, rule completeness law (RULE-MODEL §7a), float lock (NUMERIC-CONTRACT §4a), golden expansion policy (TESTING-STRATEGY §1c), Architecture Lock + migration log (roadmap + Contracts README).

## Exit criteria — all ten, proven by name (38/38 checks green)

| Criterion | Proof |
|---|---|
| 100 % determinism | byte-identical repeat runs; **rule-order permutation invariant** (canonical serialization compared) |
| Zero hidden state | interleaved evaluations independent; module source scan finds no module-level `let`/`var` |
| Zero mutable globals | same scan; `PRIORITY_CLASS_ORDER`/`CONFIDENCE_ORDER` frozen |
| Zero side effects | deep-frozen request + rules evaluated successfully (any mutation would throw) |
| Every proposal replayable | same inputs + manifest + seed + engineVersion ⇒ byte-identical proposals (the DECISION_PROVENANCE law, asserted directly) |
| Every decision explainable | trace totality: every rule lands in exactly one of fired/suppressed/notFired/insufficient; every proposal ≥1 code; keepPlan explained |
| Every rejection reason coded | named codes proven for all six rejection paths: `preconditionNotMet`, evidence gaps, `conflictResolvedByPriority`, `cooldownActive`, `proposalRejectedCooldown`, `changeBudgetExhausted`, `compositeContainsNonProtectiveAction` |
| Every rule individually testable | `evaluateRule(rule, request)` exercised standalone |
| Composite evaluation order fixed | components preserved exactly as declared; asserted |
| Decision provenance complete | all 7 fields on every proposal incl. keepPlan; provenance hash === result manifest hash; **two seal layers attacked**: forged proposal fails with `QAE-PROVENANCE-BYPASS` by name |

Rule completeness law applied to the pipeline's own behavior: each synthetic rule has its positive proof (fires), negative proof (named non-fire), and bypass attempt (the smuggled composite — your exact calories −300 + steps +3000 + volume +20 % bundle — suppressed by `QAE-SAF-COMPOSITE` with `compositeContainsNonProtectiveAction`, and never reaches proposals).

The S34 shape holds structurally with synthetic rules: a recovery-class composite and a goalProgress-class major both fire; the composite takes the single major slot; the goalProgress candidate is suppressed with a coded reason and the user-visible trace shows both facts. (The domain-specific `calorieCutSuppressedByRecovery` wording arrives when real adaptation rules are authored in Phase 11 — the *mechanism* is proven now.)

## Verification

- QAE proofs: Phase 1 suite 52/52 (still green, incl. minors matrix 15/15) · Phase 2 suite 38/38.
- Goldens: harness re-run after all Phase-2 changes — **byte-identical** (`git diff` empty), proving the migrations were golden-neutral as the lock requires.
- Repo gates: `typecheck` ✓ · `lint` ✓ (max-warnings 0) · `build` ✓ · full `test:gate` green.

## Stop

Phase 2 complete. Halting at the review point before any nutrition, training, or adaptation logic, per [CTO-QAE-003].
