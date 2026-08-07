# QAE Phase 3 Report — Evidence & Question Engine Foundation

**Per [CTO-QAE-004].** Scope honored: evidence model · question graph · missing-evidence detection · question prioritization · dependency graph · answer normalization · question replay · evidence completeness evaluation — and nothing else. **No nutrition calculations, workout generation, adaptation rules, recovery logic, trend analysis, or personalization heuristics exist in the new code.** The core mandate is structural: **a question produces Evidence only, never a decision** — enforced by type surface (the question modules cannot express a proposal), by bank integrity (`empty_provides` is a named defect), and by a source scan that fails on any decision/domain vocabulary or decision-runtime import inside `Domain/Questions|Evidence`.

## [CTO-QAE-004] amendments landed first (all as recorded migrations, goldens re-verified byte-identical)

| Mandate | Delivery |
|---|---|
| `decisionSchemaVersion` in provenance | `DECISION_SCHEMA_VERSION = 1.0.0` versioned independently of the engine; provenance minimum now engineVersion · decisionSchemaVersion · oracleVersion · manifestHash · seed · timestamp · origin; schema migration v0.3.0 recorded; proofs assert the field |
| Registration-order independence | Already proven for rules (permutation invariance incl. manifest hash); now formalized as invariant I8 and **extended to the question bank** (reversed-bank walk produces the identical asked sequence) |
| `disabledByManifest` | Reserved in `PIPELINE_INVARIANTS.md` §Reserved — named, not implemented until a phase needs rule disabling |
| Budget blindness | Invariant I5 + new proof: renaming action kinds/variables changes nothing in budget outcomes; budget reads only class/score/magnitude |
| Single-source explainability | `explain.ts` rebuilt: `DeveloperReasonEntry[]` is the sole source; audit sentences and user codes are projections of it (proofs: lengths match, every user code exists in a developer entry, audit embeds the developer token) |
| `PIPELINE_INVARIANTS.md` | Created: I1–I9, each with named enforcement; breaches are first-degree bugs |
| Architecture lock update | Lock list extended (Decision Pipeline, Proposal Model, Provenance Contract, Explainability Layers, Conflict Resolver, Change Budget, Composite Evaluation Order, Pipeline Trace Model) |

## What was built (Phase 3)

| Component | Location | Notes |
|---|---|---|
| Evidence model | `Domain/Evidence/model.ts` | `EvidenceItem {fieldPath, value, source, confidence, recordedAtEpochMs}`; deterministic answer normalization (integer-checked numbers, declared options, multi → sorted scalar boolean facts + count); named rejections (`out_of_range`, `option_not_available`, `type_mismatch`) leave state untouched |
| Completeness + gaps | `Domain/Evidence/completeness.ts` | Generic per-domain confidence, mandatory-missing blocking, and **missing-evidence detection**: gaps with materiality, blocked domains, and candidate question ids (unfillable paths visible with empty candidates — never silent) |
| Question model | `Domain/Questions/model.ts` | Generic `QuestionDef` (declarative predicates, follow-ups, `provides` ≥1), `BankConfig` with **all constants as data** — [CTO-QAE-002] U5 budgets are the defaults (min 13 / max 16 / hardCap 20 ≈ 15 initial questions) |
| Dependency graph | `Domain/Questions/graph.ts` | Bank integrity: duplicate ids/keys, unknown follow-up/conflict refs, **follow-up cycles** (deterministic DFS), `empty_provides`, `clarify_unreachable` — structurally closing the legacy L-QST-3 defect class |
| Prioritization | `Domain/Questions/select.ts` | The characterized order as a generic engine: gate → conflict clarify (off-budget) → required (to hardCap) → safety-clear follow-ups (off-budget) → scored remainder (priority + queueBonus − satietyPenalty, exempt categories, infoGain floor past min); materiality built in (a question whose `provides` are all known is never asked); stop reasons `complete/cap_reached/exhausted/gate_pending` |
| Session + replay | `Domain/Questions/session.ts` | Pure state transitions: answer→evidence emission, follow-up queueing, conflict resolution recording, revision with **orphan pruning to fixpoint** (idempotence proven), and `replaySession` (recorded answers reproduce byte-identical facts; divergence throws `QAE-REPLAY-DIVERGENCE` by name) |
| Proof suite | `Tools/qae-question-proof.ts` + runner | 41 checks on a synthetic opaque-key bank |

## Verification

- **Phase 3 suite: 41/41** — integrity defects each flagged by name (positive/negative/bypass discipline: clean bank passes, corrupted banks fail by name, unreachable-clarify smuggling caught) · gate absolutism (refusal ⇒ `gate_pending`, no data question ever precedes it) · conflict clarify served immediately, off-budget, resolved permanently · satiety interleaving · infoGain floor · CTO budgets · determinism (identical walks; **reversed bank ⇒ identical sequence**) · replay byte-identity · normalization rejections named with state unchanged · pruning fixpoint idempotence · completeness/gap detection · scope scan (no decision imports, no domain vocabulary, no mutable state, no ambient time).
- **Prior suites still green:** Phase 1 52/52 (minors matrix 15/15) · Phase 2 **43/43** (5 new checks: provenance schema version, single-source layers ×3, I5 blindness, I7 request immutability).
- **Goldens:** harness re-run — byte-identical (`git diff` empty) after every change in this wave.
- **Repo gates:** `typecheck` ✓ · `lint` ✓ (max-warnings 0) · `build` ✓ · full `test:gate` green.

## Notes for the next checkpoint

1. The engine's selection mechanics reproduce the characterized legacy semantics with config-supplied constants; **content parity** (the real 193-question bank, its conflicts, its budgets-by-class) is deliberately NOT ported yet — that is bank *content*, scheduled with the question-engine content phase, where legacy asked-sequence goldens will be machine-generated by extending the oracle harness to `src/lib/personalization`.
2. `AssessmentCompleteness` gates + `PartialAthleteState` assembly (incremental assessment proper) sit at the boundary of this phase and the next: the completeness evaluator and gap detector are built; binding them to the real profile field map is content work.
3. Per the locked order, the next runtime phase is domain content (Training per [CTO-QAE-002] numbering, or as the founder directs) — halting here for review.

## Stop

Phase 3 complete. No domain logic entered the tree. Awaiting the next architecture checkpoint.
